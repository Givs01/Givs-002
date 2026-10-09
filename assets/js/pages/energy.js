import { getVerifiedContext } from "../app/session.js";
import { navigate } from "../app/main.js";
import { downloadExcelTemplate } from "../app/excel-template.js";


const PROFILE_STORAGE_KEY = "cwep.cityProfile";

const FACILITY_TYPES = [
  {
    key: "jackwell",
    label: "Jackwell / Main Source",
    code: "JACKWELL"
  },
  {
    key: "groundwaterTubewell",
    label: "Groundwater Tubewell / Borewell",
    code: "GTW"
  },
  {
    key: "wtp",
    label: "Water Treatment Plant (WTP)",
    code: "WTP"
  },
  {
    key: "filterHouse",
    label: "Filter House",
    code: "FH"
  },
  {
    key: "esr",
    label: "Elevated Storage Reservoirs (ESR)",
    code: "ESR"
  },
  {
    key: "sump",
    label: "Sump / Ground Water Storage Reservoirs",
    code: "SUMP"
  },
  {
    key: "sps",
    label: "Sewage Pumping Station",
    code: "SPS"
  },
  {
    key: "stp",
    label: "Sewage Treatment Plant (STP)",
    code: "STP"
  },
  {
    key: "swpfFstp",
    label: "Solid Waste Processing Facility / FSTP",
    code: "SWPF-FSTP"
  }
];


export async function renderEnergy(root) {
  const context = getVerifiedContext();

  if (!context) {
    redirectToVerification();
    return;
  }

  const profile = loadCityProfile(context);

  if (!profile) {
    renderProfileRequired(root);
    return;
  }

  const facilitySummary = buildFacilitySummary(
    context,
    profile
  );

  root.innerHTML = `
    <section class="space-y-6">

      <!-- Header -->
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

        <div>
          <p class="text-sm font-medium text-portal-600">
            Energy Consumption
          </p>

          <h2 class="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            WASH Facility Energy Data
          </h2>

          <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Download the facility-level Excel template, complete the
            required energy information, and upload the completed
            workbook for validation.
          </p>
        </div>

        <button
          type="button"
          data-nav="/home"
          class="inline-flex w-fit items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-portal-500 focus:ring-offset-2"
        >
          ← Back to Dashboard
        </button>

      </div>


      <!-- Assessment context -->
      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div class="border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
          <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h3 class="text-base font-semibold text-slate-900">
                Assessment Details
              </h3>

              <p class="text-sm text-slate-500">
                Template will be generated specifically for this assessment.
              </p>
            </div>

            <span class="inline-flex w-fit items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              ${escapeHtml(profile.status)}
            </span>

          </div>
        </div>

        <div class="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">

          ${summaryItem(
            "ULB Name",
            escapeHtml(context.ulbName)
          )}

          ${summaryItem(
            "ULB ID / Code",
            escapeHtml(context.ulbId)
          )}

          ${summaryItem(
            "ULB Class",
            context.ulbClass
              ? escapeHtml(context.ulbClass)
              : "Pending verification"
          )}

          ${summaryItem(
            "Assessment Year",
            escapeHtml(String(context.year))
          )}

        </div>
      </div>


      <!-- Workflow -->
      <div class="grid gap-5 lg:grid-cols-3">

        ${workflowCard(
          "01",
          "Download Template",
          "Generate the Excel workbook based on the facility counts in your City Profile.",
          "Available after profile submission",
          "blue"
        )}

        ${workflowCard(
          "02",
          "Complete Excel",
          "Enter the required electricity, solar, demand, consumption, billing and operating-hour information.",
          "Excel workbook",
          "slate"
        )}

        ${workflowCard(
          "03",
          "Upload & Validate",
          "Upload the completed workbook. The system will validate the structure and data before accepting it.",
          "Validation required",
          "slate"
        )}

      </div>


      <!-- Template section -->
      <div class="rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div class="border-b border-slate-200 px-5 py-5 sm:px-6">

          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

            <div>
              <h3 class="text-base font-semibold text-slate-900">
                Excel Template
              </h3>

              <p class="mt-1 text-sm leading-6 text-slate-600">
                The workbook structure below will be generated from your
                submitted City Profile.
              </p>
            </div>

            <span class="inline-flex w-fit items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Template Version 1
            </span>

          </div>

        </div>


        <!-- Template preview -->
        <div class="px-5 py-5 sm:px-6">

          <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">

            <div class="flex items-start gap-3">

              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <svg
                  class="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  aria-hidden="true"
                >
                  <path d="M6 3h9l3 3v15H6z" />
                  <path d="M15 3v4h4" />
                  <path d="M9 12h6" />
                  <path d="M9 16h6" />
                </svg>
              </div>

              <div>
                <h4 class="text-sm font-semibold text-slate-900">
                  Facility-specific workbook
                </h4>

                <p class="mt-1 text-sm leading-6 text-slate-600">
                  Your workbook will contain the applicable facility
                  category worksheets and repeated questionnaire blocks
                  for each facility.
                </p>
              </div>

            </div>

          </div>


          <!-- Worksheet structure -->
          <div class="mt-5">

            <div class="flex items-center justify-between gap-3">
              <h4 class="text-sm font-semibold text-slate-900">
                Worksheet Structure
              </h4>

              <span class="text-xs font-medium text-slate-500">
                ${facilitySummary.activeCategories} applicable categories
              </span>
            </div>

            <div class="mt-3 overflow-hidden rounded-xl border border-slate-200">

              <div class="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>Facility category</span>
                <span class="text-right">Facilities</span>
                <span class="text-right">Worksheet</span>
              </div>

              ${facilitySummary.rows}

            </div>

          </div>

        </div>


        <!-- Template actions -->
        <div class="border-t border-slate-200 bg-slate-50 px-5 py-5 sm:px-6">

          <div
            id="energy-message"
            class="mb-4 hidden rounded-xl px-4 py-3 text-sm"
            role="alert"
            aria-live="polite"
          ></div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p class="text-sm font-semibold text-slate-900">
                Ready to generate your template?
              </p>

              <p class="mt-1 text-xs text-slate-500">
                The actual Excel generation endpoint will be connected next.
              </p>
            </div>

            <button
              type="button"
              id="download-template-button"
              class="inline-flex items-center justify-center rounded-xl bg-portal-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-portal-700 focus:outline-none focus:ring-2 focus:ring-portal-500 focus:ring-offset-2"
            >
              <svg
                class="mr-2 h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                aria-hidden="true"
              >
                <path d="M12 3v12" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 21h14" />
              </svg>

              Download Excel Template
            </button>

          </div>

        </div>

      </div>


      <!-- Upload -->
      <div class="rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div class="border-b border-slate-200 px-5 py-5 sm:px-6">

          <h3 class="text-base font-semibold text-slate-900">
            Upload Completed Template
          </h3>

          <p class="mt-1 text-sm leading-6 text-slate-600">
            Upload the completed Excel workbook after filling all required
            facility information.
          </p>

        </div>


        <div class="px-5 py-5 sm:px-6">

          <div
            id="upload-zone"
            class="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-portal-400 hover:bg-portal-50"
          >

            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">

              <svg
                class="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                aria-hidden="true"
              >
                <path d="M12 16V4" />
                <path d="m7 9 5-5 5 5" />
                <path d="M5 20h14" />
              </svg>

            </div>

            <h4 class="mt-4 text-sm font-semibold text-slate-900">
              Upload completed Excel workbook
            </h4>

            <p class="mt-1 text-sm text-slate-500">
              Accepted format: .xlsx
            </p>

            <input
              id="excel-file-input"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              class="sr-only"
            />

            <label
              for="excel-file-input"
              class="mt-4 inline-flex cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-within:ring-2 focus-within:ring-portal-500 focus-within:ring-offset-2"
            >
              Choose Excel File
            </label>

            <p
              id="selected-file-name"
              class="mt-3 hidden text-sm font-medium text-slate-700"
            ></p>

          </div>

        </div>

      </div>


      <!-- Facility data -->
      <div class="rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div class="border-b border-slate-200 px-5 py-5 sm:px-6">

          <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h3 class="text-base font-semibold text-slate-900">
                Facility Data Status
              </h3>

              <p class="text-sm text-slate-500">
                Each facility will receive a unique Facility ID.
              </p>
            </div>

            <span class="text-sm font-semibold text-slate-700">
              ${facilitySummary.totalFacilities} facilities
            </span>

          </div>

        </div>


        <div class="divide-y divide-slate-200">

          ${facilitySummary.facilityRows}

        </div>

      </div>


      <!-- Important rules -->
      <div class="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">

        <h3 class="text-sm font-semibold text-amber-900">
          Important Excel rules
        </h3>

        <ul class="mt-3 space-y-2 text-sm leading-6 text-amber-900/80">

          <li class="flex gap-2">
            <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600"></span>
            <span>
              There will be <strong>one worksheet per facility category</strong>,
              not one worksheet per individual facility.
            </span>
          </li>

          <li class="flex gap-2">
            <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600"></span>
            <span>
              For example, 3 WTPs will be represented by one WTP worksheet
              containing 3 facility questionnaire blocks.
            </span>
          </li>

          <li class="flex gap-2">
            <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600"></span>
            <span>
              Electricity bills are uploaded separately through the portal;
              they are not embedded in the Excel workbook.
            </span>
          </li>

          <li class="flex gap-2">
            <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600"></span>
            <span>
              Facility IDs must remain unchanged once the template is generated.
            </span>
          </li>

        </ul>

      </div>

    </section>
  `;

  attachEnergyEvents(root, context, profile);
}


/* ------------------------------------------------------------------
   Event handling
------------------------------------------------------------------- */

function attachEnergyEvents(root, context, profile) {
  const downloadButton = root.querySelector(
    "#download-template-button"
  );

  const fileInput = root.querySelector(
    "#excel-file-input"
  );

  const selectedFileName = root.querySelector(
    "#selected-file-name"
  );

  const message = root.querySelector(
    "#energy-message"
  );

    downloadButton.addEventListener("click", () => {
    try {
        downloadExcelTemplate(
        context,
        profile
        );

        showMessage(
        message,
        "Excel template generated successfully. Please save the downloaded workbook and complete it without changing the worksheet structure or Facility IDs.",
        "success"
        );

    } catch (error) {
        console.error(
        "Excel template generation failed:",
        error
        );

        showMessage(
        message,
        error.message ||
            "Unable to generate the Excel template.",
        "error"
        );
    }
    });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];

    if (!file) {
      selectedFileName.classList.add("hidden");
      selectedFileName.textContent = "";
      return;
    }

    const validation = validateExcelFile(file);

    if (!validation.valid) {
      fileInput.value = "";

      selectedFileName.classList.add("hidden");
      selectedFileName.textContent = "";

      showMessage(
        message,
        validation.message,
        "error"
      );

      return;
    }

    selectedFileName.textContent =
      `${file.name} (${formatFileSize(file.size)})`;

    selectedFileName.classList.remove("hidden");

    showMessage(
      message,
      "File selected. Upload validation will be connected next.",
      "info"
    );
  });

  root.querySelectorAll("[data-nav]").forEach((element) => {
    element.addEventListener("click", () => {
      const path = element.dataset.nav;

      if (path) {
        navigate(path);
      }
    });
  });
}


/* ------------------------------------------------------------------
   City Profile loading
------------------------------------------------------------------- */

function loadCityProfile(context) {
  const raw = sessionStorage.getItem(
    PROFILE_STORAGE_KEY
  );

  if (!raw) {
    return null;
  }

  try {
    const profile = JSON.parse(raw);

    /*
     * Never use a profile belonging to another ULB
     * or assessment year.
     */
    if (
      String(profile.ulbId) !== String(context.ulbId) ||
      Number(profile.year) !== Number(context.year)
    ) {
      return null;
    }

    if (!profile.counts) {
      return null;
    }

    return {
      ...profile,
      counts: {
        ...createEmptyCounts(),
        ...profile.counts
      }
    };

  } catch (error) {
    console.error(
      "Unable to load City Profile:",
      error
    );

    return null;
  }
}


/* ------------------------------------------------------------------
   Facility structure
------------------------------------------------------------------- */

function buildFacilitySummary(context, profile) {
  const activeCategories = FACILITY_TYPES.filter(
    (facility) => getFacilityCount(profile, facility.key) > 0
  );

  const totalFacilities = activeCategories.reduce(
    (total, facility) =>
      total + getFacilityCount(profile, facility.key),
    0
  );

  const rows = activeCategories.length
    ? activeCategories
        .map((facility) =>
          worksheetRow(
            facility,
            getFacilityCount(profile, facility.key)
          )
        )
        .join("")
    : emptyWorksheetRow();

  const facilityRows = activeCategories.length
    ? activeCategories
        .flatMap((facility) => {
          const count = getFacilityCount(
            profile,
            facility.key
          );

          return Array.from(
            { length: count },
            (_, index) =>
              facilityStatusRow(
                context,
                facility,
                index + 1
              )
          );
        })
        .join("")
    : emptyFacilityRow();

  return {
    activeCategories: activeCategories.length,
    totalFacilities,
    rows,
    facilityRows
  };
}


function getFacilityCount(profile, key) {
  const value = Number(
    profile?.counts?.[key] ?? 0
  );

  if (!Number.isSafeInteger(value) || value < 0) {
    return 0;
  }

  return value;
}


function buildFacilityId(context, facility, sequence) {
  /*
   * Example:
   *
   * 3011-2027-WTP-001
   *
   * This ID will eventually be persisted by the backend
   * and must not be changed after creation.
   */
  return [
    sanitizeIdPart(context.ulbId),
    String(context.year),
    facility.code,
    String(sequence).padStart(3, "0")
  ].join("-");
}


function sanitizeIdPart(value) {
  return String(value)
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, "");
}


/* ------------------------------------------------------------------
   Excel file validation
------------------------------------------------------------------- */

function validateExcelFile(file) {
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  if (!file) {
    return {
      valid: false,
      message: "Please select an Excel file."
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      message: "The Excel file must not exceed 10 MB."
    };
  }

  const filename = file.name || "";

  if (!filename.toLowerCase().endsWith(".xlsx")) {
    return {
      valid: false,
      message: "Only .xlsx Excel workbooks are accepted."
    };
  }

  return {
    valid: true
  };
}


function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}


/* ------------------------------------------------------------------
   UI
------------------------------------------------------------------- */

function summaryItem(label, value) {
  return `
    <div class="border-b border-slate-200 px-5 py-4 last:border-b-0 sm:px-6 lg:border-b-0 lg:border-r lg:last:border-r-0">
      <p class="text-xs font-medium uppercase tracking-wide text-slate-500">
        ${label}
      </p>

      <p class="mt-1 text-sm font-semibold text-slate-900">
        ${value}
      </p>
    </div>
  `;
}


function workflowCard(
  number,
  title,
  description,
  status,
  color
) {
  const iconClasses = {
    blue: "bg-portal-50 text-portal-700",
    slate: "bg-slate-100 text-slate-600"
  };

  return `
    <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

      <div class="flex items-center justify-between gap-3">

        <div class="flex h-10 w-10 items-center justify-center rounded-xl ${
          iconClasses[color] || iconClasses.slate
        }">
          <span class="text-sm font-bold">
            ${number}
          </span>
        </div>

        <span class="text-xs font-medium text-slate-500">
          ${escapeHtml(status)}
        </span>

      </div>

      <h3 class="mt-5 text-base font-semibold text-slate-900">
        ${escapeHtml(title)}
      </h3>

      <p class="mt-2 text-sm leading-6 text-slate-600">
        ${escapeHtml(description)}
      </p>

    </article>
  `;
}


function worksheetRow(facility, count) {
  return `
    <div class="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 text-sm">

      <div class="font-medium text-slate-900">
        ${escapeHtml(facility.label)}
      </div>

      <div class="text-right font-semibold text-slate-700">
        ${count}
      </div>

      <div class="text-right font-mono text-xs font-semibold text-portal-700">
        ${escapeHtml(facility.code)}
      </div>

    </div>
  `;
}


function emptyWorksheetRow() {
  return `
    <div class="px-4 py-5 text-center text-sm text-slate-500">
      No facility categories have a count greater than zero.
    </div>
  `;
}


function facilityStatusRow(
  context,
  facility,
  sequence
) {
  const facilityId = buildFacilityId(
    context,
    facility,
    sequence
  );

  return `
    <div class="px-5 py-4 sm:px-6">

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        <div class="min-w-0">

          <div class="flex flex-wrap items-center gap-2">

            <span class="text-sm font-semibold text-slate-900">
              ${escapeHtml(facility.label)}
            </span>

            <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              Facility ${String(sequence).padStart(2, "0")}
            </span>

          </div>

          <p class="mt-1 font-mono text-xs text-slate-500">
            ${escapeHtml(facilityId)}
          </p>

        </div>

        <div class="flex shrink-0 items-center gap-2">

          <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            Data: Not Started
          </span>

          <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            Bill: Not Uploaded
          </span>

        </div>

      </div>

    </div>
  `;
}


function emptyFacilityRow() {
  return `
    <div class="px-5 py-8 text-center">

      <p class="text-sm font-semibold text-slate-900">
        No facilities configured
      </p>

      <p class="mt-1 text-sm text-slate-500">
        Return to City Profile and enter the applicable facility counts.
      </p>

    </div>
  `;
}


function renderProfileRequired(root) {
  root.innerHTML = `
    <section class="flex min-h-[60vh] items-center justify-center">

      <div class="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">

        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
          !
        </div>

        <h2 class="mt-5 text-xl font-bold text-slate-900">
          City Profile Required
        </h2>

        <p class="mt-2 text-sm leading-6 text-slate-600">
          Complete the City Profile before accessing the Energy Consumption
          template.
        </p>

        <button
          type="button"
          id="go-to-city-profile"
          class="mt-6 inline-flex items-center rounded-xl bg-portal-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-portal-700 focus:outline-none focus:ring-2 focus:ring-portal-500 focus:ring-offset-2"
        >
          Open City Profile
          <span class="ml-2" aria-hidden="true">→</span>
        </button>

      </div>

    </section>
  `;

  root
    .querySelector("#go-to-city-profile")
    .addEventListener("click", () => {
      navigate("/city-profile");
    });
}


function showMessage(element, message, type) {
  if (!element) {
    return;
  }

  const classes = {
    info: "border border-portal-200 bg-portal-50 text-portal-800",
    success: "border border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border border-red-200 bg-red-50 text-red-800"
  };

  element.className = `
    mb-4 rounded-xl px-4 py-3 text-sm
    ${classes[type] || classes.info}
  `;

  element.textContent = message;
}


/* ------------------------------------------------------------------
   Defaults
------------------------------------------------------------------- */

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


/* ------------------------------------------------------------------
   Navigation
------------------------------------------------------------------- */

function redirectToVerification() {
  const basePath = getApplicationBasePath();

  navigate(`${basePath}/`);
}


function getApplicationBasePath() {
  const pathname = window.location.pathname;

  if (
    pathname === "/ea" ||
    pathname.startsWith("/ea/")
  ) {
    return "/ea";
  }

  return "";
}


/* ------------------------------------------------------------------
   Security helper
------------------------------------------------------------------- */

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}