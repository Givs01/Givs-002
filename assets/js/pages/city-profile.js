/*
|--------------------------------------------------------------------------
| City Profile
|--------------------------------------------------------------------------
|
| Responsibilities:
| - Load verified ULB context
| - Load existing City Profile
| - Render facility-count form
| - Render City Profile CSS locally
| - Validate facility counts
| - Save Draft
| - Submit City Profile
| - Lock submitted profiles
| - Correctly handle an empty City_Profile table
|
|--------------------------------------------------------------------------
*/

import {
  getCityProfile as getCityProfileApi,
  saveCityProfile as saveCityProfileApi
} from "../api/client.js";

import {
  getVerifiedContext
} from "../app/session.js";

import {
  navigate
} from "../app/main.js";


/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const PROFILE_STORAGE_KEY = "cwep.cityProfile";

const CITY_PROFILE_STYLE_ID = "cwep-city-profile-styles";

const FACILITY_FIELDS = [
  {
    key: "jackwell",
    label: "Jackwell / Main Source",
    backendKey: "Jackwell_Main_Source"
  },
  {
    key: "groundwaterTubewell",
    label: "Groundwater Tubewell / Borewell",
    backendKey: "Groundwater_Tubewell_Borewell"
  },
  {
    key: "wtp",
    label: "Water Treatment Plant (WTP)",
    backendKey: "WTP"
  },
  {
    key: "filterHouse",
    label: "Filter House",
    backendKey: "Filter_House"
  },
  {
    key: "esr",
    label: "Elevated Service Reservoir (ESR)",
    backendKey: "ESR"
  },
  {
    key: "sump",
    label: "Sump",
    backendKey: "Sump"
  },
  {
    key: "sps",
    label: "Sewage Pumping Station (SPS)",
    backendKey: "SPS"
  },
  {
    key: "stp",
    label: "Sewage Treatment Plant (STP)",
    backendKey: "STP"
  },
  {
    key: "swpfFstp",
    label: "SWPF / FSTP",
    backendKey: "SWPF_FSTP"
  }
];


/*
|--------------------------------------------------------------------------
| Main Page Renderer
|--------------------------------------------------------------------------
*/

export async function renderCityProfile(root) {
  if (!root) {
    throw new Error(
      "City Profile root element was not found."
    );
  }

  injectCityProfileStyles();

  root.innerHTML = `
    <section class="page city-profile-page">

      <div class="cp-page-header">
        <div class="cp-header-content">
          <div class="cp-eyebrow">
            CITY PROFILE
          </div>

          <h1 class="cp-page-title">
            City Profile
          </h1>

          <p class="cp-page-subtitle">
            Enter the number of WASH facilities available in the ULB.
          </p>
        </div>

        <div
          id="cityProfileStatus"
          class="cp-status-badge cp-status-loading"
        >
          Loading...
        </div>
      </div>

      <div id="cityProfileMessage"></div>

      <div id="cityProfileContainer">
        <div class="cp-loading-card">
          <div class="cp-spinner"></div>
          <div>
            <strong>Loading City Profile</strong>
            <p>Please wait while the profile is retrieved.</p>
          </div>
        </div>
      </div>

    </section>
  `;

  try {
    const context = getVerifiedContext();

    if (!context) {
      renderVerificationRequired(root);
      return;
    }

    const profile = await loadCityProfile(context);

    renderProfileForm(
      root,
      context,
      profile
    );

    attachCityProfileEvents(
      root,
      context,
      profile
    );

  } catch (error) {
    console.error(
      "City Profile load error:",
      error
    );

    showMessage(
      root,
      error?.message ||
      "Unable to load City Profile.",
      "error"
    );

    const container =
      root.querySelector(
        "#cityProfileContainer"
      );

    if (container) {
      container.innerHTML = `
        <div class="cp-error-card">
          <div class="cp-error-icon">!</div>

          <div>
            <h2>Unable to Load City Profile</h2>

            <p>
              ${escapeHtml(
                error?.message ||
                "An unexpected error occurred."
              )}
            </p>

            <button
              id="retryCityProfile"
              type="button"
              class="cp-btn cp-btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      `;

      const retryButton =
        container.querySelector(
          "#retryCityProfile"
        );

      if (retryButton) {
        retryButton.addEventListener(
          "click",
          () => renderCityProfile(root)
        );
      }
    }

    updateStatusBadge(
      root,
      "Error",
      "error"
    );
  }
}


/*
|--------------------------------------------------------------------------
| Verification Required
|--------------------------------------------------------------------------
*/

function renderVerificationRequired(root) {
  const container =
    root.querySelector(
      "#cityProfileContainer"
    );

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="cp-verification-card">

      <div class="cp-verification-icon">
        ✓
      </div>

      <h2>Verification Required</h2>

      <p>
        Please verify the ULB before accessing the City Profile.
      </p>

      <button
        id="goToVerification"
        type="button"
        class="cp-btn cp-btn-primary"
      >
        Go to Verification
      </button>

    </div>
  `;

  updateStatusBadge(
    root,
    "Not Verified",
    "error"
  );

  const button =
    container.querySelector(
      "#goToVerification"
    );

  if (button) {
    button.addEventListener(
      "click",
      () => navigate("/")
    );
  }
}


/*
|--------------------------------------------------------------------------
| Load City Profile
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| Backend:
|
|   data: null
|
| means:
|
|   No City Profile exists.
|
| It is NOT a Draft.
|
|--------------------------------------------------------------------------
*/

async function loadCityProfile(context) {
  const response =
    await getCityProfileApi(
      context.ulbId,
      context.year
    );

  if (!response?.success) {
    throw new Error(
      response?.message ||
      "Unable to load City Profile."
    );
  }

  /*
   * No actual City_Profile row exists.
   *
   * Return an explicit NOT_STARTED profile.
   *
   * Do not call it Draft.
   */
  if (!response.data) {
    const emptyProfile =
      buildEmptyProfile(context);

    sessionStorage.setItem(
      PROFILE_STORAGE_KEY,
      JSON.stringify(emptyProfile)
    );

    return emptyProfile;
  }

  const record =
    response.data;

  const profile = {
    exists: true,

    ulbId: String(
      record.ULB_ID ??
      context.ulbId
    ),

    ulbName: String(
      record.ULB_Name ??
      context.ulbName
    ),

    ulbClass:
      record.ULB_Class ??
      context.ulbClass ??
      null,

    year: Number(
      record.Year ??
      context.year
    ),

    profileVersion: Number(
      record.Profile_Version ??
      1
    ),

    status:
      normalizeStatus(
        record.Status
      ) || "draft",

    counts: {
      jackwell:
        toSafeNumber(
          record.Jackwell_Main_Source
        ),

      groundwaterTubewell:
        toSafeNumber(
          record.Groundwater_Tubewell_Borewell
        ),

      wtp:
        toSafeNumber(
          record.WTP
        ),

      filterHouse:
        toSafeNumber(
          record.Filter_House
        ),

      esr:
        toSafeNumber(
          record.ESR
        ),

      sump:
        toSafeNumber(
          record.Sump
        ),

      sps:
        toSafeNumber(
          record.SPS
        ),

      stp:
        toSafeNumber(
          record.STP
        ),

      swpfFstp:
        toSafeNumber(
          record.SWPF_FSTP
        )
    },

    totalFacilities:
      toSafeNumber(
        record.Total_Facilities
      ),

    updatedAt:
      record.Updated_At ||
      null
  };

  sessionStorage.setItem(
    PROFILE_STORAGE_KEY,
    JSON.stringify(profile)
  );

  return profile;
}


/*
|--------------------------------------------------------------------------
| Build Empty Profile
|--------------------------------------------------------------------------
|
| This is a UI model only.
|
| exists = false
| status = not_started
|
| It must NEVER be sent to the backend as an
| existing Draft merely because all values are 0.
|
|--------------------------------------------------------------------------
*/

function buildEmptyProfile(context) {
  return {
    exists: false,

    ulbId:
      String(context.ulbId),

    ulbName:
      String(context.ulbName),

    ulbClass:
      context.ulbClass
        ? String(context.ulbClass)
        : null,

    year:
      Number(context.year),

    profileVersion: 0,

    status: "not_started",

    counts:
      createEmptyCounts(),

    totalFacilities: 0,

    updatedAt: null
  };
}


/*
|--------------------------------------------------------------------------
| Create Empty Counts
|--------------------------------------------------------------------------
*/

function createEmptyCounts() {
  return {
    jackwell: 0,
    groundwaterTubewell: 0,
    wtp: 0,
    filterHouse: 0,
    esr: 0,
    sump: 0,
    sps: 0,
    stp: 0,
    swpfFstp: 0
  };
}


/*
|--------------------------------------------------------------------------
| Render Form
|--------------------------------------------------------------------------
*/

function renderProfileForm(
  root,
  context,
  profile
) {
  const container =
    root.querySelector(
      "#cityProfileContainer"
    );

  if (!container) {
    return;
  }

  const status =
    normalizeStatus(
      profile.status
    );

  const isSubmitted =
    status === "submitted";

  const isDraft =
    status === "draft";

  const isNotStarted =
    status === "not_started" ||
    profile.exists === false;

  const counts =
    profile.counts ||
    createEmptyCounts();

  const totalFacilities =
    calculateTotalFacilities(
      counts
    );

  let statusLabel = "Not Started";
  let statusClass = "not-started";

  if (isSubmitted) {
    statusLabel = "Submitted";
    statusClass = "submitted";
  } else if (isDraft) {
    statusLabel = "Draft";
    statusClass = "draft";
  }

  const fieldsHtml =
    FACILITY_FIELDS
      .map((field) => {
        const value =
          toSafeNumber(
            counts[field.key]
          );

        return `
          <div class="cp-form-field">

            <label
              class="cp-field-label"
              for="facility-${escapeHtml(field.key)}"
            >
              ${escapeHtml(field.label)}
            </label>

            <div class="cp-input-wrapper">

              <input
                id="facility-${escapeHtml(field.key)}"
                name="${escapeHtml(field.key)}"
                class="cp-number-input"
                type="number"
                min="0"
                max="9999"
                step="1"
                inputmode="numeric"
                value="${value}"
                ${isSubmitted ? "disabled" : ""}
                aria-label="${escapeHtml(field.label)}"
              />

            </div>

            <small class="cp-field-help">
              Enter a whole number from 0 to 9999.
            </small>

            <div
              class="cp-field-error"
              data-error-for="${escapeHtml(field.key)}"
            ></div>

          </div>
        `;
      })
      .join("");

  container.innerHTML = `
    <div class="cp-profile-card">

      <!-- Profile Identity -->

      <div class="cp-identity-section">

        <div class="cp-identity-heading">
          <div>
            <div class="cp-section-eyebrow">
              ULB INFORMATION
            </div>

            <h2>
              ${escapeHtml(String(context.ulbName))}
            </h2>
          </div>

          <div class="cp-profile-year">
            <span>Reporting Year</span>
            <strong>
              ${escapeHtml(String(profile.year))}
            </strong>
          </div>
        </div>

        <div class="cp-summary-grid">

          <div class="cp-summary-item">
            <span class="cp-summary-label">
              ULB ID
            </span>

            <strong>
              ${escapeHtml(
                String(context.ulbId)
              )}
            </strong>
          </div>

          <div class="cp-summary-item">
            <span class="cp-summary-label">
              ULB Name
            </span>

            <strong>
              ${escapeHtml(
                String(context.ulbName)
              )}
            </strong>
          </div>

          <div class="cp-summary-item">
            <span class="cp-summary-label">
              ULB Class
            </span>

            <strong>
              ${escapeHtml(
                String(
                  context.ulbClass ||
                  profile.ulbClass ||
                  "—"
                )
              )}
            </strong>
          </div>

          <div class="cp-summary-item">
            <span class="cp-summary-label">
              Profile Status
            </span>

            <strong class="cp-inline-status ${statusClass}">
              ${statusLabel}
            </strong>
          </div>

        </div>

      </div>


      <!-- Empty Profile Notice -->

      ${
        isNotStarted
          ? `
            <div class="cp-start-notice">

              <div class="cp-start-icon">
                +
              </div>

              <div>
                <strong>
                  City Profile not started
                </strong>

                <p>
                  No City Profile has been saved for
                  ${escapeHtml(String(context.ulbName))}
                  for the ${escapeHtml(String(profile.year))}
                  reporting year. Enter the facility counts
                  below and save a draft or submit the profile.
                </p>
              </div>

            </div>
          `
          : ""
      }


      <!-- Facility Section -->

      <div class="cp-facility-section">

        <div class="cp-section-header">

          <div>
            <div class="cp-section-eyebrow">
              WASH FACILITIES
            </div>

            <h2>
              Facility Inventory
            </h2>

            <p>
              Enter the number of facilities available
              in this ULB.
            </p>
          </div>

          <div class="cp-facility-count">
            <span>Total Facilities</span>
            <strong id="totalFacilities">
              ${totalFacilities}
            </strong>
          </div>

        </div>

        <div class="cp-facility-grid">
          ${fieldsHtml}
        </div>

      </div>


      <!-- Total -->

      <div class="cp-total-card">

        <div>
          <span class="cp-total-label">
            Total WASH Facilities
          </span>

          <span class="cp-total-description">
            Sum of all facility categories
          </span>
        </div>

        <strong id="totalFacilitiesBottom">
          ${totalFacilities}
        </strong>

      </div>


      ${
        isSubmitted
          ? `
            <div class="cp-submitted-notice">

              <div class="cp-submitted-icon">
                ✓
              </div>

              <div>
                <strong>
                  City Profile Submitted
                </strong>

                <p>
                  This City Profile has been submitted
                  and is now read-only.
                </p>
              </div>

            </div>
          `
          : `
            <div class="cp-form-actions">

              <button
                id="saveCityProfileDraft"
                type="button"
                class="cp-btn cp-btn-secondary"
              >
                <span class="cp-btn-icon">↗</span>
                Save Draft
              </button>

              <button
                id="submitCityProfile"
                type="button"
                class="cp-btn cp-btn-primary"
              >
                Submit City Profile
                <span class="cp-btn-arrow">→</span>
              </button>

            </div>

            <p class="cp-action-note">
              You can save a draft and continue editing later.
              Once submitted, the profile becomes read-only.
            </p>
          `
      }

    </div>
  `;

  updateStatusBadge(
    root,
    statusLabel,
    statusClass
  );
}


/*
|--------------------------------------------------------------------------
| Attach Events
|--------------------------------------------------------------------------
*/

function attachCityProfileEvents(
  root,
  context,
  profile
) {
  const isSubmitted =
    normalizeStatus(profile?.status) ===
    "submitted";

  if (isSubmitted) {
    return;
  }

  const inputs =
    root.querySelectorAll(
      'input[type="number"]'
    );

  inputs.forEach((input) => {
    input.addEventListener(
      "input",
      () => {
        updateTotalFacilities(root);

        clearFieldError(
          root,
          input.name
        );
      }
    );

    input.addEventListener(
      "blur",
      () => {
        validateCountField(
          root,
          input.name
        );
      }
    );

    input.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "e" ||
          event.key === "E" ||
          event.key === "+" ||
          event.key === "-" ||
          event.key === "."
        ) {
          event.preventDefault();
        }
      }
    );
  });


  /*
   * Save Draft
   */

  const saveButton =
    root.querySelector(
      "#saveCityProfileDraft"
    );

  if (saveButton) {
    saveButton.addEventListener(
      "click",
      async () => {
        await handleSave(
          root,
          context,
          "Draft"
        );
      }
    );
  }


  /*
   * Submit
   */

  const submitButton =
    root.querySelector(
      "#submitCityProfile"
    );

  if (submitButton) {
    submitButton.addEventListener(
      "click",
      async () => {
        await handleSave(
          root,
          context,
          "Submitted"
        );
      }
    );
  }
}


/*
|--------------------------------------------------------------------------
| Handle Save / Submit
|--------------------------------------------------------------------------
*/

async function handleSave(
  root,
  context,
  status
) {
  clearAllFieldErrors(root);

  const counts =
    collectAndValidateCounts(root);

  if (!counts) {
    showMessage(
      root,
      "Please correct the highlighted facility counts.",
      "error"
    );

    return;
  }

  const totalFacilities =
    calculateTotalFacilities(
      counts
    );

  const profile =
    buildProfile(
      context,
      counts,
      status
    );

  profile.totalFacilities =
    totalFacilities;


  /*
   * Confirmation before submission.
   */

  if (status === "Submitted") {
    const confirmed =
      window.confirm(
        "Are you sure you want to submit the City Profile? " +
        "After submission, the profile will become read-only."
      );

    if (!confirmed) {
      return;
    }
  }


  const button =
    status === "Submitted"
      ? root.querySelector(
          "#submitCityProfile"
        )
      : root.querySelector(
          "#saveCityProfileDraft"
        );

  setButtonLoading(
    button,
    true,
    status === "Submitted"
      ? "Submitting..."
      : "Saving..."
  );

  try {
    const response =
      await saveCityProfileApi(
        profile
      );

    if (!response?.success) {
      throw new Error(
        response?.message ||
        "Unable to save City Profile."
      );
    }


    /*
     * Always prefer backend's authoritative record.
     */

    const savedRecord =
      response.data;

    if (savedRecord) {
      const normalizedProfile =
        mapBackendRecordToProfile(
          savedRecord,
          context
        );

      normalizedProfile.exists = true;

      sessionStorage.setItem(
        PROFILE_STORAGE_KEY,
        JSON.stringify(
          normalizedProfile
        )
      );
    } else {
      profile.exists = true;

      sessionStorage.setItem(
        PROFILE_STORAGE_KEY,
        JSON.stringify(profile)
      );
    }


    /*
     * Draft
     */

    if (status === "Draft") {
      showMessage(
        root,
        "City Profile draft saved successfully.",
        "success"
      );

      updateStatusBadge(
        root,
        "Draft",
        "draft"
      );

      /*
       * Do NOT reload the page.
       * The form stays available for continued editing.
       */

      return;
    }


    /*
     * Submitted
     */

    showMessage(
      root,
      "City Profile submitted successfully.",
      "success"
    );

    updateStatusBadge(
      root,
      "Submitted",
      "submitted"
    );

    /*
     * Disable fields immediately.
     */

    root
      .querySelectorAll(
        'input[type="number"]'
      )
      .forEach((input) => {
        input.disabled = true;
      });

    const saveDraftButton =
      root.querySelector(
        "#saveCityProfileDraft"
      );

    const submitButton =
      root.querySelector(
        "#submitCityProfile"
      );

    if (saveDraftButton) {
      saveDraftButton.remove();
    }

    if (submitButton) {
      submitButton.remove();
    }

    const actions =
      root.querySelector(
        ".cp-form-actions"
      );

    if (actions) {
      actions.innerHTML = `
        <div class="cp-submitted-actions">
          City Profile submitted successfully.
          Redirecting to Energy Consumption...
        </div>
      `;
    }

    setTimeout(() => {
      navigate("/energy");
    }, 700);

  } catch (error) {
    console.error(
      "City Profile save error:",
      error
    );

    showMessage(
      root,
      error?.message ||
      "Unable to save City Profile.",
      "error"
    );

  } finally {
    setButtonLoading(
      button,
      false
    );
  }
}


/*
|--------------------------------------------------------------------------
| Build Profile
|--------------------------------------------------------------------------
*/

function buildProfile(
  context,
  counts,
  status
) {
  return {
    /*
     * This is now a real profile because this
     * object is being sent for creation.
     */
    exists: true,

    ulbId:
      String(context.ulbId),

    ulbName:
      String(context.ulbName),

    ulbClass:
      context.ulbClass
        ? String(context.ulbClass)
        : null,

    year:
      Number(context.year),

    profileVersion: 1,

    status:
      normalizeStatus(status) ===
      "submitted"
        ? "Submitted"
        : "Draft",

    counts: {
      jackwell:
        Number(counts.jackwell),

      groundwaterTubewell:
        Number(
          counts.groundwaterTubewell
        ),

      wtp:
        Number(counts.wtp),

      filterHouse:
        Number(counts.filterHouse),

      esr:
        Number(counts.esr),

      sump:
        Number(counts.sump),

      sps:
        Number(counts.sps),

      stp:
        Number(counts.stp),

      swpfFstp:
        Number(counts.swpfFstp)
    },

    totalFacilities:
      Object.values(counts)
        .reduce(
          (total, count) =>
            total +
            Number(count),
          0
        ),

    updatedAt:
      new Date().toISOString()
  };
}


/*
|--------------------------------------------------------------------------
| Collect + Validate Counts
|--------------------------------------------------------------------------
*/

function collectAndValidateCounts(root) {
  const counts = {};

  for (const field of FACILITY_FIELDS) {
    const input =
      root.querySelector(
        `input[name="${field.key}"]`
      );

    if (!input) {
      return null;
    }

    const value =
      validateCountField(
        root,
        field.key
      );

    if (value === null) {
      return null;
    }

    counts[field.key] =
      value;
  }

  return counts;
}


/*
|--------------------------------------------------------------------------
| Validate Individual Count
|--------------------------------------------------------------------------
|
| 0 IS VALID.
|--------------------------------------------------------------------------
*/

function validateCountField(
  root,
  fieldKey
) {
  const input =
    root.querySelector(
      `input[name="${fieldKey}"]`
    );

  if (!input) {
    return null;
  }

  const rawValue =
    String(
      input.value ?? ""
    ).trim();


  /*
   * Blank
   */

  if (rawValue === "") {
    setFieldError(
      root,
      fieldKey,
      "This field is required."
    );

    return null;
  }


  /*
   * Whole number only
   */

  if (!/^\d+$/.test(rawValue)) {
    setFieldError(
      root,
      fieldKey,
      "Enter a whole number greater than or equal to 0."
    );

    return null;
  }

  const number =
    Number(rawValue);


  /*
   * Safe integer
   */

  if (!Number.isSafeInteger(number)) {
    setFieldError(
      root,
      fieldKey,
      "Enter a valid whole number."
    );

    return null;
  }


  /*
   * Maximum
   */

  if (number > 9999) {
    setFieldError(
      root,
      fieldKey,
      "Maximum allowed value is 9999."
    );

    return null;
  }


  /*
   * Zero is explicitly valid.
   */

  clearFieldError(
    root,
    fieldKey
  );

  return number;
}


/*
|--------------------------------------------------------------------------
| Calculate Total
|--------------------------------------------------------------------------
*/

function calculateTotalFacilities(
  counts
) {
  return Object.values(
    counts || {}
  ).reduce(
    (total, value) =>
      total +
      Number(value || 0),
    0
  );
}


/*
|--------------------------------------------------------------------------
| Update Total
|--------------------------------------------------------------------------
*/

function updateTotalFacilities(root) {
  const counts = {};

  FACILITY_FIELDS.forEach(
    (field) => {
      const input =
        root.querySelector(
          `input[name="${field.key}"]`
        );

      counts[field.key] =
        input
          ? Number(
              input.value || 0
            )
          : 0;
    }
  );

  const total =
    calculateTotalFacilities(
      counts
    );

  const totalElement =
    root.querySelector(
      "#totalFacilities"
    );

  if (totalElement) {
    totalElement.textContent =
      String(total);
  }

  const bottomTotalElement =
    root.querySelector(
      "#totalFacilitiesBottom"
    );

  if (bottomTotalElement) {
    bottomTotalElement.textContent =
      String(total);
  }

  const headerTotal =
    root.querySelector(
      ".cp-facility-count strong"
    );

  if (headerTotal) {
    headerTotal.textContent =
      String(total);
  }
}


/*
|--------------------------------------------------------------------------
| Map Backend Record
|--------------------------------------------------------------------------
*/

function mapBackendRecordToProfile(
  record,
  context
) {
  return {
    exists: true,

    ulbId: String(
      record.ULB_ID ??
      context.ulbId
    ),

    ulbName: String(
      record.ULB_Name ??
      context.ulbName
    ),

    ulbClass:
      record.ULB_Class ??
      context.ulbClass ??
      null,

    year: Number(
      record.Year ??
      context.year
    ),

    profileVersion: Number(
      record.Profile_Version ??
      1
    ),

    status:
      normalizeStatus(
        record.Status
      ) || "draft",

    counts: {
      jackwell:
        toSafeNumber(
          record.Jackwell_Main_Source
        ),

      groundwaterTubewell:
        toSafeNumber(
          record.Groundwater_Tubewell_Borewell
        ),

      wtp:
        toSafeNumber(
          record.WTP
        ),

      filterHouse:
        toSafeNumber(
          record.Filter_House
        ),

      esr:
        toSafeNumber(
          record.ESR
        ),

      sump:
        toSafeNumber(
          record.Sump
        ),

      sps:
        toSafeNumber(
          record.SPS
        ),

      stp:
        toSafeNumber(
          record.STP
        ),

      swpfFstp:
        toSafeNumber(
          record.SWPF_FSTP
        )
    },

    totalFacilities:
      toSafeNumber(
        record.Total_Facilities
      ),

    updatedAt:
      record.Updated_At ||
      null
  };
}


/*
|--------------------------------------------------------------------------
| Status Normalization
|--------------------------------------------------------------------------
*/

function normalizeStatus(value) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}


/*
|--------------------------------------------------------------------------
| Number Helper
|--------------------------------------------------------------------------
*/

function toSafeNumber(value) {
  const number =
    Number(value);

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    return 0;
  }

  return Math.floor(number);
}


/*
|--------------------------------------------------------------------------
| Status Badge
|--------------------------------------------------------------------------
*/

function updateStatusBadge(
  root,
  label,
  className
) {
  const statusElement =
    root.querySelector(
      "#cityProfileStatus"
    );

  if (!statusElement) {
    return;
  }

  statusElement.textContent =
    label;

  statusElement.className =
    `cp-status-badge cp-status-${escapeHtml(
      className
    )}`;
}


/*
|--------------------------------------------------------------------------
| Field Error Helpers
|--------------------------------------------------------------------------
*/

function setFieldError(
  root,
  fieldKey,
  message
) {
  const error =
    root.querySelector(
      `[data-error-for="${fieldKey}"]`
    );

  if (error) {
    error.textContent =
      message;
  }

  const input =
    root.querySelector(
      `input[name="${fieldKey}"]`
    );

  if (input) {
    input.classList.add(
      "cp-input-error"
    );

    input.setAttribute(
      "aria-invalid",
      "true"
    );
  }
}


function clearFieldError(
  root,
  fieldKey
) {
  const error =
    root.querySelector(
      `[data-error-for="${fieldKey}"]`
    );

  if (error) {
    error.textContent =
      "";
  }

  const input =
    root.querySelector(
      `input[name="${fieldKey}"]`
    );

  if (input) {
    input.classList.remove(
      "cp-input-error"
    );

    input.removeAttribute(
      "aria-invalid"
    );
  }
}


function clearAllFieldErrors(root) {
  FACILITY_FIELDS.forEach(
    (field) => {
      clearFieldError(
        root,
        field.key
      );
    }
  );
}


/*
|--------------------------------------------------------------------------
| Button Loading
|--------------------------------------------------------------------------
*/

function setButtonLoading(
  button,
  loading,
  loadingText = "Saving..."
) {
  if (!button) {
    return;
  }

  if (loading) {
    button.dataset.originalText =
      button.textContent;

    button.disabled = true;

    button.classList.add(
      "cp-btn-loading"
    );

    button.textContent =
      loadingText;

  } else {
    button.disabled = false;

    button.classList.remove(
      "cp-btn-loading"
    );

    button.textContent =
      button.dataset.originalText ||
      button.textContent;
  }
}


/*
|--------------------------------------------------------------------------
| Messages
|--------------------------------------------------------------------------
*/

function showMessage(
  root,
  message,
  type
) {
  const element =
    root.querySelector(
      "#cityProfileMessage"
    );

  if (!element) {
    return;
  }

  element.innerHTML = `
    <div class="cp-message cp-message-${escapeHtml(type)}">

      <span class="cp-message-icon">
        ${
          type === "success"
            ? "✓"
            : "!"
        }
      </span>

      <span>
        ${escapeHtml(message)}
      </span>

    </div>
  `;
}


/*
|--------------------------------------------------------------------------
| HTML Escape
|--------------------------------------------------------------------------
*/

function escapeHtml(value) {
  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}


/*
|--------------------------------------------------------------------------
| Self-contained CSS
|--------------------------------------------------------------------------
|
| Injected once into <head>.
|--------------------------------------------------------------------------
*/

function injectCityProfileStyles() {
  if (
    document.getElementById(
      CITY_PROFILE_STYLE_ID
    )
  ) {
    return;
  }

  const style =
    document.createElement(
      "style"
    );

  style.id =
    CITY_PROFILE_STYLE_ID;

  style.textContent = `
    /* ================================================================
       CITY PROFILE
       ================================================================ */

    .city-profile-page {
      width: 100%;
      max-width: 1440px;
      margin: 0 auto;
      padding: 28px 32px 48px;
      box-sizing: border-box;
    }

    .city-profile-page *,
    .city-profile-page *::before,
    .city-profile-page *::after {
      box-sizing: border-box;
    }


    /* ---------------------------------------------------------------
       Header
       --------------------------------------------------------------- */

    .cp-page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 26px;
    }

    .cp-header-content {
      min-width: 0;
    }

    .cp-eyebrow,
    .cp-section-eyebrow {
      font-size: 11px;
      line-height: 1.4;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 7px;
    }

    .cp-page-title {
      margin: 0;
      font-size: 30px;
      line-height: 1.2;
      font-weight: 750;
      letter-spacing: -0.02em;
      color: #0f172a;
    }

    .cp-page-subtitle {
      margin: 8px 0 0;
      font-size: 14px;
      line-height: 1.6;
      color: #64748b;
    }


    /* ---------------------------------------------------------------
       Status
       --------------------------------------------------------------- */

    .cp-status-badge {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 34px;
      padding: 7px 13px;
      border-radius: 999px;
      border: 1px solid transparent;
      font-size: 12px;
      line-height: 1;
      font-weight: 700;
      white-space: nowrap;
    }

    .cp-status-loading {
      color: #475569;
      background: #f1f5f9;
      border-color: #e2e8f0;
    }

    .cp-status-not-started {
      color: #475569;
      background: #f8fafc;
      border-color: #cbd5e1;
    }

    .cp-status-draft {
      color: #92400e;
      background: #fffbeb;
      border-color: #fde68a;
    }

    .cp-status-submitted {
      color: #166534;
      background: #f0fdf4;
      border-color: #bbf7d0;
    }

    .cp-status-error {
      color: #991b1b;
      background: #fef2f2;
      border-color: #fecaca;
    }


    /* ---------------------------------------------------------------
       Messages
       --------------------------------------------------------------- */

    #cityProfileMessage {
      margin-bottom: 18px;
    }

    .cp-message {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 13px 16px;
      border-radius: 10px;
      border: 1px solid;
      font-size: 14px;
      line-height: 1.5;
    }

    .cp-message-success {
      color: #166534;
      background: #f0fdf4;
      border-color: #bbf7d0;
    }

    .cp-message-error {
      color: #991b1b;
      background: #fef2f2;
      border-color: #fecaca;
    }

    .cp-message-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      flex: 0 0 22px;
      border-radius: 50%;
      font-size: 12px;
      font-weight: 800;
      background: currentColor;
      color: white;
    }


    /* ---------------------------------------------------------------
       Main Card
       --------------------------------------------------------------- */

    .cp-profile-card {
      width: 100%;
      overflow: hidden;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow:
        0 1px 2px rgba(15, 23, 42, 0.04),
        0 8px 30px rgba(15, 23, 42, 0.04);
    }


    /* ---------------------------------------------------------------
       Identity
       --------------------------------------------------------------- */

    .cp-identity-section {
      padding: 25px 26px 23px;
      border-bottom: 1px solid #e2e8f0;
      background: #ffffff;
    }

    .cp-identity-heading {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 22px;
    }

    .cp-identity-heading h2 {
      margin: 0;
      color: #0f172a;
      font-size: 21px;
      line-height: 1.3;
      font-weight: 700;
    }

    .cp-profile-year {
      flex: 0 0 auto;
      min-width: 120px;
      text-align: right;
    }

    .cp-profile-year span {
      display: block;
      margin-bottom: 4px;
      color: #64748b;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .cp-profile-year strong {
      color: #0f172a;
      font-size: 18px;
      font-weight: 750;
    }

    .cp-summary-grid {
      display: grid;
      grid-template-columns:
        repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .cp-summary-item {
      min-width: 0;
      padding: 13px 15px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #f8fafc;
    }

    .cp-summary-label {
      display: block;
      margin-bottom: 5px;
      color: #64748b;
      font-size: 11px;
      line-height: 1.4;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .cp-summary-item strong {
      display: block;
      overflow: hidden;
      color: #0f172a;
      font-size: 14px;
      line-height: 1.4;
      font-weight: 700;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .cp-inline-status.draft {
      color: #b45309;
    }

    .cp-inline-status.submitted {
      color: #15803d;
    }

    .cp-inline-status.not-started {
      color: #64748b;
    }


    /* ---------------------------------------------------------------
       Start Notice
       --------------------------------------------------------------- */

    .cp-start-notice {
      display: flex;
      align-items: flex-start;
      gap: 13px;
      margin: 20px 26px 0;
      padding: 15px 17px;
      border: 1px solid #dbeafe;
      border-radius: 11px;
      background: #eff6ff;
    }

    .cp-start-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      flex: 0 0 30px;
      border-radius: 50%;
      background: #dbeafe;
      color: #1d4ed8;
      font-size: 19px;
      line-height: 1;
      font-weight: 500;
    }

    .cp-start-notice strong {
      display: block;
      margin-bottom: 3px;
      color: #1e3a8a;
      font-size: 14px;
    }

    .cp-start-notice p {
      margin: 0;
      color: #1e40af;
      font-size: 13px;
      line-height: 1.55;
    }


    /* ---------------------------------------------------------------
       Facility Section
       --------------------------------------------------------------- */

    .cp-facility-section {
      padding: 28px 26px;
    }

    .cp-section-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 21px;
    }

    .cp-section-header h2 {
      margin: 0;
      color: #0f172a;
      font-size: 19px;
      line-height: 1.35;
      font-weight: 700;
    }

    .cp-section-header p {
      margin: 5px 0 0;
      color: #64748b;
      font-size: 13px;
      line-height: 1.5;
    }

    .cp-facility-count {
      flex: 0 0 auto;
      text-align: right;
    }

    .cp-facility-count span {
      display: block;
      margin-bottom: 3px;
      color: #64748b;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .cp-facility-count strong {
      color: #0f172a;
      font-size: 21px;
      line-height: 1;
      font-weight: 750;
    }


    /* ---------------------------------------------------------------
       Facility Grid
       --------------------------------------------------------------- */

    .cp-facility-grid {
      display: grid;
      grid-template-columns:
        repeat(3, minmax(0, 1fr));
      gap: 15px;
    }

    .cp-form-field {
      min-width: 0;
      padding: 17px;
      border: 1px solid #e2e8f0;
      border-radius: 11px;
      background: #ffffff;
      transition:
        border-color 0.15s ease,
        box-shadow 0.15s ease,
        background 0.15s ease;
    }

    .cp-form-field:focus-within {
      border-color: #93c5fd;
      box-shadow:
        0 0 0 3px rgba(59, 130, 246, 0.08);
      background: #fcfdff;
    }

    .cp-field-label {
      display: block;
      min-height: 38px;
      margin-bottom: 9px;
      color: #334155;
      font-size: 13px;
      line-height: 1.45;
      font-weight: 650;
      cursor: pointer;
    }

    .cp-input-wrapper {
      position: relative;
    }

    .cp-number-input {
      display: block;
      width: 100%;
      height: 44px;
      margin: 0;
      padding: 0 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      outline: none;
      background: #ffffff;
      color: #0f172a;
      font-family: inherit;
      font-size: 15px;
      font-weight: 650;
      line-height: 44px;
      transition:
        border-color 0.15s ease,
        box-shadow 0.15s ease;
    }

    .cp-number-input:hover {
      border-color: #94a3b8;
    }

    .cp-number-input:focus {
      border-color: #3b82f6;
      box-shadow:
        0 0 0 3px rgba(59, 130, 246, 0.10);
    }

    .cp-number-input:disabled {
      cursor: not-allowed;
      background: #f8fafc;
      color: #64748b;
      border-color: #e2e8f0;
    }

    .cp-number-input.cp-input-error {
      border-color: #ef4444;
      background: #fffafa;
    }

    .cp-number-input.cp-input-error:focus {
      border-color: #ef4444;
      box-shadow:
        0 0 0 3px rgba(239, 68, 68, 0.10);
    }

    .cp-field-help {
      display: block;
      margin-top: 7px;
      color: #94a3b8;
      font-size: 11px;
      line-height: 1.4;
    }

    .cp-field-error {
      min-height: 18px;
      margin-top: 4px;
      color: #dc2626;
      font-size: 11px;
      line-height: 1.45;
    }


    /* ---------------------------------------------------------------
       Total
       --------------------------------------------------------------- */

    .cp-total-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      margin: 0 26px 26px;
      padding: 18px 20px;
      border: 1px solid #dbeafe;
      border-radius: 11px;
      background: #eff6ff;
    }

    .cp-total-label {
      display: block;
      color: #1e3a8a;
      font-size: 14px;
      line-height: 1.4;
      font-weight: 700;
    }

    .cp-total-description {
      display: block;
      margin-top: 3px;
      color: #3b82f6;
      font-size: 11px;
      line-height: 1.4;
    }

    .cp-total-card > strong {
      color: #1d4ed8;
      font-size: 28px;
      line-height: 1;
      font-weight: 800;
    }


    /* ---------------------------------------------------------------
       Actions
       --------------------------------------------------------------- */

    .cp-form-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 20px 26px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    .cp-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 42px;
      padding: 0 17px;
      border: 1px solid transparent;
      border-radius: 8px;
      outline: none;
      font-family: inherit;
      font-size: 13px;
      font-weight: 700;
      line-height: 1;
      cursor: pointer;
      transition:
        background 0.15s ease,
        border-color 0.15s ease,
        box-shadow 0.15s ease,
        transform 0.05s ease,
        opacity 0.15s ease;
    }

    .cp-btn:active:not(:disabled) {
      transform: translateY(1px);
    }

    .cp-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .cp-btn-primary {
      color: #ffffff;
      background: #2563eb;
      border-color: #2563eb;
    }

    .cp-btn-primary:hover:not(:disabled) {
      background: #1d4ed8;
      border-color: #1d4ed8;
      box-shadow:
        0 4px 10px rgba(37, 99, 235, 0.18);
    }

    .cp-btn-secondary {
      color: #334155;
      background: #ffffff;
      border-color: #cbd5e1;
    }

    .cp-btn-secondary:hover:not(:disabled) {
      background: #f8fafc;
      border-color: #94a3b8;
    }

    .cp-btn-icon {
      font-size: 15px;
    }

    .cp-btn-arrow {
      font-size: 16px;
    }

    .cp-btn-loading {
      min-width: 130px;
    }

    .cp-action-note {
      margin: 0;
      padding: 0 26px 20px;
      color: #94a3b8;
      background: #f8fafc;
      font-size: 11px;
      line-height: 1.5;
      text-align: right;
    }


    /* ---------------------------------------------------------------
       Submitted
       --------------------------------------------------------------- */

    .cp-submitted-notice {
      display: flex;
      align-items: flex-start;
      gap: 13px;
      margin: 0 26px 26px;
      padding: 16px 18px;
      border: 1px solid #bbf7d0;
      border-radius: 11px;
      background: #f0fdf4;
    }

    .cp-submitted-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      flex: 0 0 30px;
      border-radius: 50%;
      background: #dcfce7;
      color: #15803d;
      font-size: 15px;
      font-weight: 800;
    }

    .cp-submitted-notice strong {
      display: block;
      margin-bottom: 3px;
      color: #166534;
      font-size: 14px;
    }

    .cp-submitted-notice p {
      margin: 0;
      color: #15803d;
      font-size: 13px;
      line-height: 1.5;
    }

    .cp-submitted-actions {
      width: 100%;
      color: #166534;
      font-size: 13px;
      font-weight: 650;
      text-align: center;
    }


    /* ---------------------------------------------------------------
       Loading
       --------------------------------------------------------------- */

    .cp-loading-card {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      min-height: 180px;
      padding: 30px;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      background: #ffffff;
    }

    .cp-loading-card strong {
      display: block;
      color: #334155;
      font-size: 14px;
    }

    .cp-loading-card p {
      margin: 4px 0 0;
      color: #94a3b8;
      font-size: 12px;
    }

    .cp-spinner {
      width: 26px;
      height: 26px;
      border: 3px solid #dbeafe;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation:
        cp-spin 0.8s linear infinite;
    }

    @keyframes cp-spin {
      to {
        transform: rotate(360deg);
      }
    }


    /* ---------------------------------------------------------------
       Verification / Error
       --------------------------------------------------------------- */

    .cp-verification-card,
    .cp-error-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 320px;
      padding: 40px;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      background: #ffffff;
      text-align: center;
    }

    .cp-verification-icon,
    .cp-error-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      margin-bottom: 15px;
      border-radius: 50%;
      font-size: 20px;
      font-weight: 800;
    }

    .cp-verification-icon {
      color: #1d4ed8;
      background: #dbeafe;
    }

    .cp-error-icon {
      color: #b91c1c;
      background: #fee2e2;
    }

    .cp-verification-card h2,
    .cp-error-card h2 {
      margin: 0;
      color: #0f172a;
      font-size: 19px;
      line-height: 1.35;
    }

    .cp-verification-card p,
    .cp-error-card p {
      max-width: 520px;
      margin: 8px 0 20px;
      color: #64748b;
      font-size: 13px;
      line-height: 1.6;
    }


    /* ---------------------------------------------------------------
       Responsive
       --------------------------------------------------------------- */

    @media (max-width: 1100px) {
      .cp-facility-grid {
        grid-template-columns:
          repeat(2, minmax(0, 1fr));
      }

      .cp-summary-grid {
        grid-template-columns:
          repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 760px) {
      .city-profile-page {
        padding: 20px 16px 36px;
      }

      .cp-page-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .cp-page-title {
        font-size: 26px;
      }

      .cp-profile-card {
        border-radius: 12px;
      }

      .cp-identity-section,
      .cp-facility-section {
        padding: 20px 16px;
      }

      .cp-identity-heading,
      .cp-section-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .cp-profile-year,
      .cp-facility-count {
        text-align: left;
      }

      .cp-summary-grid {
        grid-template-columns: 1fr;
      }

      .cp-facility-grid {
        grid-template-columns: 1fr;
      }

      .cp-start-notice {
        margin-left: 16px;
        margin-right: 16px;
      }

      .cp-total-card {
        margin-left: 16px;
        margin-right: 16px;
      }

      .cp-form-actions {
        flex-direction: column-reverse;
        align-items: stretch;
        padding: 16px;
      }

      .cp-btn {
        width: 100%;
      }

      .cp-action-note {
        padding-left: 16px;
        padding-right: 16px;
        text-align: left;
      }

      .cp-submitted-notice {
        margin-left: 16px;
        margin-right: 16px;
      }
    }

    @media (max-width: 420px) {
      .cp-page-title {
        font-size: 23px;
      }

      .cp-facility-section {
        padding-top: 18px;
      }

      .cp-form-field {
        padding: 14px;
      }

      .cp-total-card {
        align-items: flex-start;
      }

      .cp-total-card > strong {
        font-size: 24px;
      }
    }
  `;

  document.head.appendChild(
    style
  );
}
