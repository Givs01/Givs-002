const MAX_FILE_SIZE = 10 * 1024 * 1024;

const FACILITY_TYPES = [
  {
    key: "jackwell",
    label: "Jackwell / Main Source",
    sheetName: "Jackwell"
  },
  {
    key: "groundwaterTubewell",
    label: "Groundwater Tubewell / Borewell",
    sheetName: "Groundwater"
  },
  {
    key: "wtp",
    label: "Water Treatment Plant (WTP)",
    sheetName: "WTP"
  },
  {
    key: "filterHouse",
    label: "Filter House",
    sheetName: "Filter House"
  },
  {
    key: "esr",
    label: "Elevated Storage Reservoirs (ESR)",
    sheetName: "ESR"
  },
  {
    key: "sump",
    label: "Sump / Ground Water Storage Reservoirs",
    sheetName: "Sump"
  },
  {
    key: "sps",
    label: "Sewage Pumping Station",
    sheetName: "SPS"
  },
  {
    key: "stp",
    label: "Sewage Treatment Plant (STP)",
    sheetName: "STP"
  },
  {
    key: "swpfFstp",
    label: "Solid Waste Processing Facility / FSTP",
    sheetName: "SWPF-FSTP"
  }
];

const EXPECTED_SHEETS = [
  "Instructions",
  ...FACILITY_TYPES.map((item) => item.sheetName)
];


/**
 * Read and inspect an uploaded Excel file.
 *
 * This is intentionally a client-side first pass.
 * Final validation must later happen on the backend.
 */
export async function readExcelFile(
  file,
  context,
  profile
) {
  if (!window.XLSX) {
    throw new Error(
      "Excel library is not available. Please reload the page."
    );
  }

  validateFile(file);

  const arrayBuffer = await file.arrayBuffer();

  let workbook;

  try {
    workbook = window.XLSX.read(
      arrayBuffer,
      {
        type: "array",
        cellDates: false
      }
    );
  } catch (error) {
    console.error(
      "Excel parsing error:",
      error
    );

    throw new Error(
      "The uploaded file could not be read as a valid Excel workbook."
    );
  }

  const result = inspectWorkbook(
    workbook,
    context,
    profile
  );

  return {
    fileName: file.name,
    fileSize: file.size,
    workbook,
    ...result
  };
}


/**
 * Basic file checks.
 */
function validateFile(file) {
  if (!file) {
    throw new Error(
      "Please select an Excel file."
    );
  }

  if (!(file instanceof File)) {
    throw new Error(
      "Invalid file."
    );
  }

  if (file.size === 0) {
    throw new Error(
      "The selected file is empty."
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      "The Excel file must not exceed 10 MB."
    );
  }

  const fileName =
    String(file.name || "")
      .trim()
      .toLowerCase();

  if (!fileName.endsWith(".xlsx")) {
    throw new Error(
      "Only .xlsx Excel files are accepted."
    );
  }
}


/**
 * Inspect workbook structure.
 */
function inspectWorkbook(
  workbook,
  context,
  profile
) {
  const errors = [];
  const warnings = [];

  const sheetNames =
    workbook.SheetNames || [];

  if (sheetNames.length === 0) {
    errors.push(
      "The workbook does not contain any worksheets."
    );

    return {
      valid: false,
      errors,
      warnings,
      facilities: [],
      sheets: []
    };
  }

  /*
   * Instructions is expected.
   */
  if (!sheetNames.includes("Instructions")) {
    warnings.push(
      "Instructions worksheet is missing."
    );
  }

  /*
   * Check expected facility sheets.
   */
  FACILITY_TYPES.forEach(
    (facilityType) => {
      const expectedCount =
        getFacilityCount(
          profile,
          facilityType.key
        );

      const exists =
        sheetNames.includes(
          facilityType.sheetName
        );

      if (
        expectedCount > 0 &&
        !exists
      ) {
        errors.push(
          `${facilityType.label}: expected worksheet "${facilityType.sheetName}" is missing.`
        );
      }

      if (
        expectedCount === 0 &&
        exists
      ) {
        errors.push(
          `${facilityType.label}: worksheet "${facilityType.sheetName}" should not be present because the City Profile count is 0.`
        );
      }
    }
  );

  /*
   * Detect unexpected worksheets.
   */
  sheetNames.forEach((sheetName) => {
    if (
      !EXPECTED_SHEETS.includes(
        sheetName
      )
    ) {
      errors.push(
        `Unexpected worksheet "${sheetName}" was found.`
      );
    }
  });

  /*
   * Inspect facility worksheets.
   */
  const facilities = [];

  FACILITY_TYPES.forEach(
    (facilityType) => {
      if (
        !sheetNames.includes(
          facilityType.sheetName
        )
      ) {
        return;
      }

      const worksheet =
        workbook.Sheets[
          facilityType.sheetName
        ];

      const facilityResult =
        inspectFacilitySheet(
          worksheet,
          facilityType,
          context,
          profile
        );

      errors.push(
        ...facilityResult.errors
      );

      warnings.push(
        ...facilityResult.warnings
      );

      facilities.push(
        ...facilityResult.facilities
      );
    }
  );

  /*
   * Duplicate Facility IDs.
   */
  const facilityIds =
    new Map();

  facilities.forEach(
    (facility) => {
      if (!facility.facilityId) {
        return;
      }

      if (
        facilityIds.has(
          facility.facilityId
        )
      ) {
        errors.push(
          `Duplicate Facility ID "${facility.facilityId}" found.`
        );
      } else {
        facilityIds.set(
          facility.facilityId,
          true
        );
      }
    }
  );

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    facilities,
    sheets: sheetNames
  };
}


/**
 * Inspect one facility-category worksheet.
 *
 * Structure:
 *
 * QUESTION | INSTRUCTION | FACILITY 01 | FACILITY 02...
 */
function inspectFacilitySheet(
  worksheet,
  facilityType,
  context,
  profile
) {
  const errors = [];
  const warnings = [];
  const facilities = [];

  if (!worksheet) {
    errors.push(
      `${facilityType.label}: worksheet could not be read.`
    );

    return {
      errors,
      warnings,
      facilities
    };
  }

  const rows =
    window.XLSX.utils.sheet_to_json(
      worksheet,
      {
        header: 1,
        defval: "",
        raw: false
      }
    );

  if (
    !Array.isArray(rows) ||
    rows.length < 5
  ) {
    errors.push(
      `${facilityType.label}: worksheet does not contain the expected table.`
    );

    return {
      errors,
      warnings,
      facilities
    };
  }

  /*
   * Header is row index 2.
   */
  const header =
    rows[2] || [];

  if (
    String(header[0] || "")
      .trim()
      .toUpperCase() !== "QUESTION"
  ) {
    errors.push(
      `${facilityType.label}: first table column must be QUESTION.`
    );
  }

  if (
    String(header[1] || "")
      .trim()
      .toUpperCase() !== "INSTRUCTION"
  ) {
    errors.push(
      `${facilityType.label}: second table column must be INSTRUCTION.`
    );
  }

  /*
   * Number of facility columns.
   */
  const actualFacilityCount =
    Math.max(
      0,
      header.length - 2
    );

  const expectedFacilityCount =
    getFacilityCount(
      profile,
      facilityType.key
    );

  if (
    actualFacilityCount !==
    expectedFacilityCount
  ) {
    errors.push(
      `${facilityType.label}: expected ${expectedFacilityCount} facility columns, but found ${actualFacilityCount}.`
    );
  }

  /*
   * Facility ID row = row index 3.
   */
  const facilityIdRow =
    rows[3] || [];

  /*
   * Facility Type row = row index 4.
   */
  const facilityTypeRow =
    rows[4] || [];

  for (
    let column = 2;
    column < header.length;
    column++
  ) {
    const facilityNumber =
      column - 1;

    const facilityColumnName =
      String(
        header[column] || ""
      ).trim();

    const facilityId =
      String(
        facilityIdRow[column] || ""
      ).trim();

    const facilityTypeValue =
      String(
        facilityTypeRow[column] || ""
      ).trim();

    /*
     * Check facility column name.
     */
    const expectedColumnName =
      `${facilityType.sheetName} ${String(facilityNumber).padStart(2, "0")}`;

    if (
      facilityColumnName !==
      expectedColumnName
    ) {
      errors.push(
        `${facilityType.label}: expected facility column "${expectedColumnName}" but found "${facilityColumnName || "(blank)"}".`
      );
    }

    /*
     * Check Facility ID.
     */
    const expectedFacilityId =
      buildFacilityId(
        context,
        facilityType,
        facilityNumber
      );

    if (!facilityId) {
      errors.push(
        `${facilityType.label} Facility ${String(facilityNumber).padStart(2, "0")}: Facility ID is missing.`
      );
    } else if (
      facilityId !==
      expectedFacilityId
    ) {
      errors.push(
        `${facilityType.label} Facility ${String(facilityNumber).padStart(2, "0")}: invalid Facility ID "${facilityId}". Expected "${expectedFacilityId}".`
      );
    }

    /*
     * Check Facility Type.
     */
    if (
      facilityTypeValue !==
      facilityType.label
    ) {
      errors.push(
        `${facilityType.label} Facility ${String(facilityNumber).padStart(2, "0")}: Facility Type is incorrect.`
      );
    }

    facilities.push({
      facilityId,
      facilityType: facilityType.key,
      facilityTypeLabel:
        facilityType.label,
      facilityNumber,
      column,
      sheetName:
        facilityType.sheetName
    });
  }

  return {
    errors,
    warnings,
    facilities
  };
}


/**
 * Convert facility count safely.
 */
function getFacilityCount(
  profile,
  key
) {
  const value =
    Number(
      profile?.counts?.[key] ?? 0
    );

  if (
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    return 0;
  }

  return value;
}


/**
 * Generate expected Facility ID.
 */
function buildFacilityId(
  context,
  facilityType,
  sequence
) {
  return [
    sanitizeIdPart(context.ulbId),
    String(context.year),
    facilityCode(facilityType),
    String(sequence).padStart(3, "0")
  ].join("-");
}


function facilityCode(
  facilityType
) {
  const codes = {
    jackwell: "JACKWELL",
    groundwaterTubewell: "GTW",
    wtp: "WTP",
    filterHouse: "FH",
    esr: "ESR",
    sump: "SUMP",
    sps: "SPS",
    stp: "STP",
    swpfFstp: "SWPF-FSTP"
  };

  return (
    codes[facilityType.key] ||
    "FACILITY"
  );
}


function sanitizeIdPart(value) {
  return String(value)
    .trim()
    .replace(
      /[^A-Za-z0-9_-]/g,
      ""
    );
}


/**
 * Format file size for display.
 */
export function formatFileSize(
  bytes
) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(2)} MB`;
}


/**
 * Maximum accepted upload size.
 */
export function getMaxFileSize() {
  return MAX_FILE_SIZE;
}
```

### 2. Replace `assets/js/pages/energy.js`

This version connects the upload button to the new Excel reader.

```javascript
import {
  getVerifiedContext
} from "../app/session.js";

import {
  navigate
} from "../app/main.js";

import {
  downloadExcelTemplate
} from "../app/excel-template.js";

import {
  readExcelFile,
  formatFileSize
} from "../app/excel-upload.js";


const CITY_PROFILE_KEY =
  "cwep.cityProfile";


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
  const context =
    getVerifiedContext();

  if (!context) {
    navigate("/");

    return;
  }

  const profile =
    loadCityProfile(
      context
    );

  if (!profile) {
    renderProfileRequired(
      root
    );

    return;
  }

  root.innerHTML =
    buildEnergyPage(
      context,
      profile
    );

  attachEvents(
    root,
    context,
    profile
  );
}


/* =========================================================
   LOAD CITY PROFILE
   ========================================================= */

function loadCityProfile(
  context
) {
  const raw =
    sessionStorage.getItem(
      CITY_PROFILE_KEY
    );

  if (!raw) {
    return null;
  }

  try {
    const profile =
      JSON.parse(raw);

    if (
      !profile ||
      typeof profile !== "object"
    ) {
      return null;
    }

    if (
      String(profile.ulbId) !==
      String(context.ulbId)
    ) {
      return null;
    }

    if (
      Number(profile.year) !==
      Number(context.year)
    ) {
      return null;
    }

    return profile;

  } catch (error) {
    console.error(
      "Unable to load City Profile:",
      error
    );

    return null;
  }
}


/* =========================================================
   PAGE
   ========================================================= */

function buildEnergyPage(
  context,
  profile
) {
  const facilitySummary =
    buildFacilitySummary(
      profile
    );

  return `
    <div class="space-y-6">

      <!-- PAGE HEADER -->
      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

          <div>
            <div class="mb-2 text-sm font-medium text-portal-600">
              Energy Consumption
            </div>

            <h2 class="text-2xl font-bold tracking-tight text-slate-900">
              WASH Facility Energy Data
            </h2>

            <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Download the Excel template, complete the facility-level
              information, and upload the completed workbook for processing.
            </p>
          </div>

          <div class="rounded-xl bg-slate-50 px-4 py-3 text-sm">
            <div class="font-semibold text-slate-900">
              ${escapeHtml(context.ulbName)}
            </div>

            <div class="mt-1 text-slate-500">
              ULB ID: ${escapeHtml(context.ulbId)}
              · Year: ${escapeHtml(context.year)}
            </div>
          </div>

        </div>
      </section>


      <!-- WORKFLOW -->
      <section>
        <div class="mb-3">
          <h3 class="text-lg font-bold text-slate-900">
            Energy Data Workflow
          </h3>

          <p class="text-sm text-slate-500">
            Complete the steps in order.
          </p>
        </div>

        <div class="grid gap-4 md:grid-cols-3">

          <!-- STEP 1 -->
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex items-start gap-4">

              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-portal-100 font-bold text-portal-700">
                1
              </div>

              <div class="min-w-0">
                <h4 class="font-semibold text-slate-900">
                  Download Template
                </h4>

                <p class="mt-1 text-sm leading-5 text-slate-500">
                  Download the Excel workbook generated for the facilities
                  in your City Profile.
                </p>
              </div>

            </div>

            <button
              id="download-template"
              type="button"
              class="mt-5 w-full rounded-xl bg-portal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-portal-700 focus:outline-none focus:ring-2 focus:ring-portal-500 focus:ring-offset-2"
            >
              Download Excel Template
            </button>
          </div>


          <!-- STEP 2 -->
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex items-start gap-4">

              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-700">
                2
              </div>

              <div class="min-w-0">
                <h4 class="font-semibold text-slate-900">
                  Complete Excel
                </h4>

                <p class="mt-1 text-sm leading-5 text-slate-500">
                  Enter the information for every facility in the
                  corresponding facility column.
                </p>
              </div>

            </div>

            <div class="mt-5 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
              Each facility category has one worksheet.
              Questions appear once, with separate columns for each facility.
            </div>
          </div>


          <!-- STEP 3 -->
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex items-start gap-4">

              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-700">
                3
              </div>

              <div class="min-w-0">
                <h4 class="font-semibold text-slate-900">
                  Upload Excel
                </h4>

                <p class="mt-1 text-sm leading-5 text-slate-500">
                  Select your completed Excel workbook for processing.
                </p>
              </div>

            </div>

            <label
              for="energy-excel-upload"
              class="mt-5 flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center text-sm font-semibold text-slate-700 transition hover:border-portal-400 hover:bg-portal-50"
            >
              Select Completed Excel
            </label>

            <input
              id="energy-excel-upload"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              class="sr-only"
            />

            <div
              id="upload-file-name"
              class="mt-2 text-center text-xs text-slate-500"
            >
              No file selected
            </div>
          </div>

        </div>
      </section>


      <!-- UPLOAD RESULT -->
      <section
        id="upload-result"
        class="hidden"
      ></section>


      <!-- FACILITY SUMMARY -->
      <section class="rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div class="border-b border-slate-200 px-5 py-4">
          <h3 class="font-bold text-slate-900">
            Facility Summary
          </h3>

          <p class="mt-1 text-sm text-slate-500">
            Facilities included in the Excel template.
          </p>
        </div>

        <div class="overflow-x-auto">
          ${facilitySummary}
        </div>

      </section>


      <!-- NOTES -->
      <section class="rounded-2xl border border-amber-200 bg-amber-50 p-5">

        <h3 class="font-semibold text-amber-900">
          Important
        </h3>

        <ul class="mt-2 space-y-1 text-sm leading-6 text-amber-800">
          <li>• Maximum Excel file size: 10 MB.</li>
          <li>• Upload only the completed .xlsx template.</li>
          <li>• Do not rename worksheets or change Facility IDs.</li>
          <li>• Electricity bills are uploaded separately.</li>
        </ul>

      </section>


      <!-- NAVIGATION -->
      <div class="flex flex-wrap gap-3">
        <button
          type="button"
          data-nav="/city-profile"
          class="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to City Profile
        </button>

        <button
          type="button"
          data-nav="/home"
          class="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to Dashboard
        </button>
      </div>

    </div>
  `;
}


/* =========================================================
   FACILITY SUMMARY
   ========================================================= */

function buildFacilitySummary(
  profile
) {
  const rows = [];

  FACILITY_TYPES.forEach(
    (facilityType) => {
      const count =
        getFacilityCount(
          profile,
          facilityType.key
        );

      if (count === 0) {
        return;
      }

      for (
        let i = 1;
        i <= count;
        i++
      ) {
        rows.push(`
          <tr class="border-b border-slate-100 last:border-0">
            <td class="px-5 py-4 text-sm font-medium text-slate-900">
              ${escapeHtml(facilityType.label)}
            </td>

            <td class="px-5 py-4 text-sm text-slate-600">
              Facility ${String(i).padStart(2, "0")}
            </td>

            <td class="px-5 py-4 font-mono text-xs text-slate-500">
              ${escapeHtml(
                buildFacilityId(
                  profile,
                  facilityType,
                  i
                )
              )}
            </td>

            <td class="px-5 py-4">
              <span class="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                Excel pending
              </span>
            </td>

            <td class="px-5 py-4">
              <span class="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                Bill pending
              </span>
            </td>
          </tr>
        `);
      }
    }
  );

  if (rows.length === 0) {
    return `
      <div class="p-6 text-sm text-slate-500">
        No facilities have been configured.
      </div>
    `;
  }

  return `
    <table class="min-w-full">
      <thead class="bg-slate-50">
        <tr>
          <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            Facility Category
          </th>

          <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            Facility
          </th>

          <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            Facility ID
          </th>

          <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            Excel Data
          </th>

          <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            Electricity Bill
          </th>
        </tr>
      </thead>

      <tbody>
        ${rows.join("")}
      </tbody>
    </table>
  `;
}


/* =========================================================
   EVENTS
   ========================================================= */

function attachEvents(
  root,
  context,
  profile
) {
  const downloadButton =
    root.querySelector(
      "#download-template"
    );

  if (downloadButton) {
    downloadButton.addEventListener(
      "click",
      () => {
        try {
          downloadExcelTemplate(
            context,
            profile
          );
        } catch (error) {
          console.error(error);

          showUploadResult(
            root,
            "error",
            "Unable to generate the Excel template.",
            [error.message]
          );
        }
      }
    );
  }

  const uploadInput =
    root.querySelector(
      "#energy-excel-upload"
    );

  if (uploadInput) {
    uploadInput.addEventListener(
      "change",
      async (event) => {
        const file =
          event.target.files?.[0];

        await handleExcelUpload(
          root,
          context,
          profile,
          file
        );
      }
    );
  }

  /*
   * Navigation buttons.
   */
  root
    .querySelectorAll(
      "[data-nav]"
    )
    .forEach((element) => {
      element.addEventListener(
        "click",
        () => {
          const path =
            element.dataset.nav;

          if (path) {
            navigate(path);
          }
        }
      );
    });
}


/* =========================================================
   UPLOAD HANDLER
   ========================================================= */

async function handleExcelUpload(
  root,
  context,
  profile,
  file
) {
  const fileName =
    root.querySelector(
      "#upload-file-name"
    );

  if (fileName) {
    fileName.textContent =
      file
        ? `${file.name} (${formatFileSize(file.size)})`
        : "No file selected";
  }

  if (!file) {
    return;
  }

  showUploadProcessing(
    root,
    file
  );

  try {
    const result =
      await readExcelFile(
        file,
        context,
        profile
      );

    if (result.valid) {
      showUploadResult(
        root,
        "success",
        "Excel workbook is ready for submission.",
        [
          `File: ${result.fileName}`,
          `Size: ${formatFileSize(result.fileSize)}`,
          `Worksheets found: ${result.sheets.length}`,
          `Facilities identified: ${result.facilities.length}`
        ],
        result
      );
    } else {
      showUploadResult(
        root,
        "error",
        "The Excel workbook has structural errors.",
        result.errors,
        result
      );
    }

  } catch (error) {
    console.error(
      "Excel upload error:",
      error
    );

    showUploadResult(
      root,
      "error",
      "The Excel file could not be processed.",
      [
        error.message ||
        "Unknown Excel processing error."
      ]
    );
  }
}


/* =========================================================
   PROCESSING STATE
   ========================================================= */

function showUploadProcessing(
  root,
  file
) {
  const result =
    root.querySelector(
      "#upload-result"
    );

  if (!result) {
    return;
  }

  result.className =
    "rounded-2xl border border-portal-200 bg-portal-50 p-5";

  result.innerHTML = `
    <div class="flex items-start gap-3">

      <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-portal-100 text-portal-700">
        ...
      </div>

      <div>
        <h3 class="font-semibold text-portal-900">
          Processing Excel workbook
        </h3>

        <p class="mt-1 text-sm text-portal-800">
          Reading ${escapeHtml(file.name)}...
        </p>
      </div>

    </div>
  `;
}


/* =========================================================
   RESULT
   ========================================================= */

function showUploadResult(
  root,
  type,
  title,
  messages,
  result = null
) {
  const container =
    root.querySelector(
      "#upload-result"
    );

  if (!container) {
    return;
  }

  const isSuccess =
    type === "success";

  container.className =
    isSuccess
      ? "rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
      : "rounded-2xl border border-red-200 bg-red-50 p-5";

  const titleClass =
    isSuccess
      ? "text-emerald-900"
      : "text-red-900";

  const textClass =
    isSuccess
      ? "text-emerald-800"
      : "text-red-800";

  const iconClass =
    isSuccess
      ? "bg-emerald-100 text-emerald-700"
      : "bg-red-100 text-red-700";

  const icon =
    isSuccess
      ? "✓"
      : "!";

  const messageItems =
    (messages || [])
      .map(
        (message) => `
          <li>
            ${escapeHtml(message)}
          </li>
        `
      )
      .join("");

  container.innerHTML = `
    <div class="flex items-start gap-3">

      <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconClass} font-bold">
        ${icon}
      </div>

      <div class="min-w-0 flex-1">

        <h3 class="font-semibold ${titleClass}">
          ${escapeHtml(title)}
        </h3>

        ${
          messageItems
            ? `
              <ul class="mt-2 space-y-1 text-sm ${textClass}">
                ${messageItems}
              </ul>
            `
            : ""
        }

        ${
          isSuccess && result
            ? `
              <div class="mt-4 rounded-xl border border-emerald-200 bg-white/70 p-4">

                <p class="text-sm font-semibold text-slate-900">
                  Workbook summary
                </p>

                <div class="mt-3 grid gap-3 sm:grid-cols-3">

                  <div>
                    <div class="text-xs text-slate-500">
                      File
                    </div>
                    <div class="mt-1 text-sm font-medium text-slate-900">
                      ${escapeHtml(result.fileName)}
                    </div>
                  </div>

                  <div>
                    <div class="text-xs text-slate-500">
                      Worksheets
                    </div>
                    <div class="mt-1 text-sm font-medium text-slate-900">
                      ${result.sheets.length}
                    </div>
                  </div>

                  <div>
                    <div class="text-xs text-slate-500">
                      Facilities
                    </div>
                    <div class="mt-1 text-sm font-medium text-slate-900">
                      ${result.facilities.length}
                    </div>
                  </div>

                </div>

                <div class="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                  This is a preliminary browser-side check.
                  Final submission and server-side validation will be added next.
                </div>

              </div>
            `
            : ""
        }

      </div>

    </div>
  `;

  container.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });
}


/* =========================================================
   PROFILE REQUIRED
   ========================================================= */

function renderProfileRequired(
  root
) {
  root.innerHTML = `
    <div class="mx-auto max-w-2xl py-12">

      <div class="rounded-2xl border border-amber-200 bg-amber-50 p-6">

        <h2 class="text-xl font-bold text-amber-900">
          City Profile Required
        </h2>

        <p class="mt-2 text-sm leading-6 text-amber-800">
          Complete the City Profile before generating or uploading
          the Energy Consumption Excel template.
        </p>

        <button
          type="button"
          data-nav="/city-profile"
          class="mt-5 rounded-xl bg-amber-700 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-800"
        >
          Complete City Profile
        </button>

      </div>

    </div>
  `;

  const button =
    root.querySelector(
      "[data-nav]"
    );

  if (button) {
    button.addEventListener(
      "click",
      () => {
        navigate(
          button.dataset.nav
        );
      }
    );
  }
}


/* =========================================================
   HELPERS
   ========================================================= */

function getFacilityCount(
  profile,
  key
) {
  const value =
    Number(
      profile?.counts?.[key] ?? 0
    );

  if (
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    return 0;
  }

  return value;
}


function buildFacilityId(
  profile,
  facilityType,
  sequence
) {
  return [
    sanitizeIdPart(
      profile.ulbId
    ),
    String(profile.year),
    facilityType.code,
    String(sequence).padStart(3, "0")
  ].join("-");
}


function sanitizeIdPart(
  value
) {
  return String(value)
    .trim()
    .replace(
      /[^A-Za-z0-9_-]/g,
      ""
    );
}


function escapeHtml(value) {
  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}
