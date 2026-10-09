const TEMPLATE_VERSION = "1.0";

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


/* =========================================================
   MAIN EXPORT
   ========================================================= */

export function downloadExcelTemplate(context, profile) {
  if (!window.XLSX) {
    throw new Error(
      "Excel library is not available. Please reload the page."
    );
  }

  validateTemplateContext(context, profile);

  const workbook = window.XLSX.utils.book_new();

  /*
   * Keep the Instructions sheet simple.
   * No ULB metadata is displayed here.
   */
  addInstructionsSheet(workbook);

  /*
   * Create only the facility-category sheets
   * that have at least one facility.
   */
  FACILITY_TYPES.forEach((facilityType) => {
    const count = getFacilityCount(
      profile,
      facilityType.key
    );

    if (count > 0) {
      addFacilityCategorySheet(
        workbook,
        context,
        facilityType,
        count
      );
    }
  });

  const filename =
    `CWEP_${safeFilename(context.ulbId)}_${safeFilename(context.year)}_Energy_Template.xlsx`;

  window.XLSX.writeFile(
    workbook,
    filename,
    {
      compression: true
    }
  );
}


/* =========================================================
   INSTRUCTIONS SHEET
   ========================================================= */

function addInstructionsSheet(workbook) {
  const XLSX = window.XLSX;

  const rows = [
    ["CITY WASH & ENERGY PORTAL"],
    ["Energy Consumption Data Collection Template"],
    [],
    ["GENERAL INSTRUCTIONS"],
    [],
    [
      "1.",
      "Complete all applicable facility information."
    ],
    [
      "2.",
      "Do not modify Facility IDs."
    ],
    [
      "3.",
      "Enter NA only where specifically permitted."
    ],
    [
      "4.",
      "Enter numerical values as numbers."
    ],
    [
      "5.",
      "Electricity bills are uploaded separately through the portal."
    ],
    [
      "6.",
      "Do not rename worksheets."
    ],
    [
      "7.",
      "Do not add or remove facility columns."
    ],
    [
      "8.",
      "Average monthly electricity values should be calculated from the last 12 months of electricity bills."
    ]
  ];

  const worksheet =
    XLSX.utils.aoa_to_sheet(rows);

  worksheet["!cols"] = [
    { wch: 8 },
    { wch: 110 }
  ];

  /*
   * Merge the two title rows.
   */
  worksheet["!merges"] = [
    {
      s: { r: 0, c: 0 },
      e: { r: 0, c: 1 }
    },
    {
      s: { r: 1, c: 0 },
      e: { r: 1, c: 1 }
    },
    {
      s: { r: 3, c: 0 },
      e: { r: 3, c: 1 }
    }
  ];

  worksheet["!rows"] = [
    { hpt: 30 },
    { hpt: 24 },
    { hpt: 10 },
    { hpt: 24 }
  ];

  applyCellStyles(
    worksheet,
    {
      title: {
        font: {
          bold: true,
          sz: 16,
          color: "FFFFFF"
        },
        fill: "0F4C5C",
        alignment: {
          horizontal: "center",
          vertical: "center"
        }
      },
      subtitle: {
        font: {
          bold: true,
          sz: 12,
          color: "0F4C5C"
        },
        alignment: {
          horizontal: "center",
          vertical: "center"
        }
      },
      section: {
        font: {
          bold: true,
          sz: 12,
          color: "FFFFFF"
        },
        fill: "0F4C5C",
        alignment: {
          horizontal: "left",
          vertical: "center"
        }
      }
    }
  );

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Instructions"
  );
}


/* =========================================================
   FACILITY CATEGORY SHEET
   ========================================================= */

function addFacilityCategorySheet(
  workbook,
  context,
  facilityType,
  facilityCount
) {
  const XLSX = window.XLSX;

  const rows = [];

  /*
   * -------------------------------------------------------
   * ROW 1
   * Sheet title
   * -------------------------------------------------------
   */
  rows.push([
    facilityType.label
  ]);

  /*
   * -------------------------------------------------------
   * ROW 2
   * Blank spacing row
   * -------------------------------------------------------
   */
  rows.push([]);

  /*
   * -------------------------------------------------------
   * ROW 3
   * Main table header
   *
   * QUESTION | INSTRUCTION | FACILITY 01 | FACILITY 02...
   * -------------------------------------------------------
   */
  const headerRow = [
    "QUESTION",
    "INSTRUCTION"
  ];

  for (
    let facilityNumber = 1;
    facilityNumber <= facilityCount;
    facilityNumber++
  ) {
    headerRow.push(
      `${facilityType.sheetName} ${String(facilityNumber).padStart(2, "0")}`
    );
  }

  rows.push(headerRow);

  /*
   * -------------------------------------------------------
   * FACILITY ID
   * -------------------------------------------------------
   */

  const facilityIdRow = [
    "Facility ID",
    "System-generated ID. Do not modify."
  ];

  for (
    let facilityNumber = 1;
    facilityNumber <= facilityCount;
    facilityNumber++
  ) {
    facilityIdRow.push(
      buildFacilityId(
        context,
        facilityType,
        facilityNumber
      )
    );
  }

  rows.push(facilityIdRow);

  /*
   * -------------------------------------------------------
   * FACILITY TYPE
   * -------------------------------------------------------
   */

  const facilityTypeRow = [
    "Facility Type",
    "System-generated. Do not modify."
  ];

  for (
    let facilityNumber = 1;
    facilityNumber <= facilityCount;
    facilityNumber++
  ) {
    facilityTypeRow.push(
      facilityType.label
    );
  }

  rows.push(facilityTypeRow);

  /*
   * -------------------------------------------------------
   * QUESTIONNAIRE
   * -------------------------------------------------------
   *
   * Each question is added ONLY ONCE.
   * Each facility gets one corresponding column.
   */

  const questions = getQuestionnaire();

  questions.forEach((question) => {
    const row = [
      question.question,
      question.instruction
    ];

    for (
      let facilityNumber = 1;
      facilityNumber <= facilityCount;
      facilityNumber++
    ) {
      row.push("");
    }

    rows.push(row);
  });

  /*
   * -------------------------------------------------------
   * CREATE WORKSHEET
   * -------------------------------------------------------
   */

  const worksheet =
    XLSX.utils.aoa_to_sheet(rows);

  /*
   * -------------------------------------------------------
   * COLUMN WIDTHS
   * -------------------------------------------------------
   */

  const columnWidths = [
    /*
     * Question
     */
    {
      wch: 42
    },

    /*
     * Instruction
     */
    {
      wch: 65
    }
  ];

  /*
   * Facility entry columns
   */
  for (
    let facilityNumber = 1;
    facilityNumber <= facilityCount;
    facilityNumber++
  ) {
    columnWidths.push({
      wch: 25
    });
  }

  worksheet["!cols"] = columnWidths;

  /*
   * -------------------------------------------------------
   * MERGE TITLE
   * -------------------------------------------------------
   */

  worksheet["!merges"] = [
    {
      s: {
        r: 0,
        c: 0
      },
      e: {
        r: 0,
        c: facilityCount + 1
      }
    }
  ];

  /*
   * -------------------------------------------------------
   * FREEZE PANES
   * -------------------------------------------------------
   *
   * Freeze:
   * - Question column
   * - Instruction column
   * - Header/title area
   */

  worksheet["!freeze"] = {
    xSplit: 2,
    ySplit: 3
  };

  /*
   * -------------------------------------------------------
   * ROW HEIGHTS
   * -------------------------------------------------------
   */

  const rowHeights = [];

  rows.forEach((row, index) => {
    if (index === 0) {
      rowHeights[index] = {
        hpt: 30
      };
    } else if (index === 2) {
      rowHeights[index] = {
        hpt: 28
      };
    } else {
      rowHeights[index] = {
        hpt: 36
      };
    }
  });

  worksheet["!rows"] = rowHeights;

  /*
   * -------------------------------------------------------
   * STYLING
   * -------------------------------------------------------
   */

  styleFacilitySheet(
    worksheet,
    rows,
    facilityCount
  );

  /*
   * -------------------------------------------------------
   * APPEND SHEET
   * -------------------------------------------------------
   */

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    safeSheetName(facilityType.sheetName)
  );
}


/* =========================================================
   QUESTIONNAIRE
   ========================================================= */

function getQuestionnaire() {
  return [
    {
      question: "Name of WASH Facility",
      instruction:
        "Enter the official name of the WASH facility."
    },

    {
      question: "Consumer Number (MSEDCL)",
      instruction:
        "Enter the electricity consumer number."
    },

    {
      question: "Capacity of the WASH Facility",
      instruction:
        "Enter the facility capacity in MLD."
    },

    {
      question: "DISCOM Region",
      instruction:
        "Enter the applicable DISCOM region."
    },

    {
      question: "Unit electricity rate",
      instruction:
        "Enter the applicable electricity rate in ₹/KVAH."
    },

    {
      question: "Connection Type",
      instruction:
        "Enter Urban or Rural."
    },

    {
      question: "Capacity of Solar Installation",
      instruction:
        "Enter installed solar capacity in KW. Enter NA if there is no solar installation."
    },

    {
      question: "Year of Solar Installation",
      instruction:
        "Enter the solar installation year. Enter NA if there is no solar installation."
    },

    {
      question: "Connected Load",
      instruction:
        "Enter connected load in KW."
    },

    {
      question: "Contract Demand",
      instruction:
        "Enter contract demand in KVA."
    },

    {
      question: "Average Monthly Maximum Demand",
      instruction:
        "Enter the average monthly maximum demand in KVA, calculated from the last 12 months of electricity bills."
    },

    {
      question: "Average Monthly Consumption Units",
      instruction:
        "Enter the average monthly consumption in KVAH, calculated from the last 12 months of electricity bills."
    },

    {
      question: "Average Monthly Billed Amount",
      instruction:
        "Enter the average monthly billed amount in ₹, calculated from the last 12 months of electricity bills."
    },

    {
      question: "Average Monthly Billed Power Factor",
      instruction:
        "Enter the average monthly billed power factor calculated from the last 12 months of electricity bills."
    },

    {
      question: "Principal Arrears",
      instruction:
        "Enter principal electricity arrears in ₹."
    },

    {
      question: "00:00–06:00",
      instruction:
        "Enter operating hours for this time slab. Enter NA if the facility is not operational."
    },

    {
      question: "06:00–12:00",
      instruction:
        "Enter operating hours for this time slab. Enter NA if the facility is not operational."
    },

    {
      question: "12:00–18:00",
      instruction:
        "Enter operating hours for this time slab. Enter NA if the facility is not operational."
    },

    {
      question: "18:00–00:00",
      instruction:
        "Enter operating hours for this time slab. Enter NA if the facility is not operational."
    }
  ];
}


/* =========================================================
   FACILITY ID
   ========================================================= */

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


function facilityCode(facilityType) {
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

  return codes[facilityType.key] || "FACILITY";
}


/* =========================================================
   TEMPLATE VALIDATION
   ========================================================= */

function validateTemplateContext(
  context,
  profile
) {
  if (!context) {
    throw new Error(
      "Verified ULB context is required."
    );
  }

  if (!profile) {
    throw new Error(
      "City Profile is required before generating the template."
    );
  }

  if (!context.ulbId) {
    throw new Error(
      "ULB ID is missing."
    );
  }

  if (!Number.isInteger(Number(context.year))) {
    throw new Error(
      "Assessment year is invalid."
    );
  }

  if (!profile.counts) {
    throw new Error(
      "City Profile facility counts are missing."
    );
  }

  FACILITY_TYPES.forEach((facilityType) => {
    const count = getFacilityCount(
      profile,
      facilityType.key
    );

    if (
      !Number.isInteger(count) ||
      count < 0
    ) {
      throw new Error(
        `Invalid facility count for ${facilityType.label}.`
      );
    }

    if (count > 9999) {
      throw new Error(
        `Facility count for ${facilityType.label} is too large.`
      );
    }
  });
}


/* =========================================================
   FACILITY COUNT
   ========================================================= */

function getFacilityCount(
  profile,
  key
) {
  const value = Number(
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


/* =========================================================
   EXCEL STYLING
   ========================================================= */

function styleFacilitySheet(
  worksheet,
  rows,
  facilityCount
) {
  /*
   * SheetJS Community Edition does not provide a full
   * Excel styling API in the same way as Excel itself.
   *
   * These styles are assigned to cells so that the workbook
   * remains clean where the XLSX writer supports them.
   */

  const maxColumn =
    facilityCount + 1;

  /*
   * Title
   */
  applyRangeStyle(
    worksheet,
    0,
    0,
    0,
    maxColumn,
    {
      font: {
        bold: true,
        sz: 16,
        color: "FFFFFF"
      },
      fill: "0F4C5C",
      alignment: {
        horizontal: "center",
        vertical: "center"
      }
    }
  );

  /*
   * Table header
   */
  applyRangeStyle(
    worksheet,
    2,
    0,
    2,
    maxColumn,
    {
      font: {
        bold: true,
        sz: 11,
        color: "FFFFFF"
      },
      fill: "0F4C5C",
      alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true
      },
      border: createBorder()
    }
  );

  /*
   * Data rows.
   *
   * Row 3 = Facility ID
   * Row 4 = Facility Type
   * Row 5 onward = questionnaire
   */
  for (
    let rowIndex = 3;
    rowIndex < rows.length;
    rowIndex++
  ) {
    const isSystemRow =
      rowIndex === 3 ||
      rowIndex === 4;

    const isAlternate =
      (rowIndex - 5) % 2 === 1;

    for (
      let columnIndex = 0;
      columnIndex <= maxColumn;
      columnIndex++
    ) {
      const cellAddress =
        window.XLSX.utils.encode_cell({
          r: rowIndex,
          c: columnIndex
        });

      if (!worksheet[cellAddress]) {
        worksheet[cellAddress] = {
          t: "s",
          v: ""
        };
      }

      worksheet[cellAddress].s = {
        font: {
          bold:
            columnIndex === 0 ||
            isSystemRow,
          color:
            isSystemRow &&
            columnIndex >= 2
              ? "666666"
              : "000000"
        },

        fill:
          isSystemRow
            ? "E2E8F0"
            : isAlternate
              ? "F8FAFC"
              : "FFFFFF",

        alignment: {
          vertical: "top",
          horizontal:
            columnIndex === 0
              ? "left"
              : "left",
          wrapText: true
        },

        border: createBorder()
      };
    }
  }

  /*
   * Make the question/instruction columns visually distinct.
   */
  for (
    let rowIndex = 3;
    rowIndex < rows.length;
    rowIndex++
  ) {
    const questionCell =
      window.XLSX.utils.encode_cell({
        r: rowIndex,
        c: 0
      });

    const instructionCell =
      window.XLSX.utils.encode_cell({
        r: rowIndex,
        c: 1
      });

    if (worksheet[questionCell]) {
      worksheet[questionCell].s = {
        ...(worksheet[questionCell].s || {}),
        font: {
          bold: true,
          color: "1E293B"
        }
      };
    }

    if (worksheet[instructionCell]) {
      worksheet[instructionCell].s = {
        ...(worksheet[instructionCell].s || {}),
        font: {
          italic: true,
          color: "475569"
        }
      };
    }
  }
}


/* =========================================================
   INSTRUCTION SHEET STYLES
   ========================================================= */

function applyCellStyles(
  worksheet,
  styles
) {
  const XLSX = window.XLSX;

  if (styles.title && worksheet["A1"]) {
    worksheet["A1"].s = styles.title;
  }

  if (styles.subtitle && worksheet["A2"]) {
    worksheet["A2"].s = styles.subtitle;
  }

  if (styles.section && worksheet["A4"]) {
    worksheet["A4"].s = styles.section;
  }
}


/* =========================================================
   RANGE STYLE HELPER
   ========================================================= */

function applyRangeStyle(
  worksheet,
  startRow,
  startColumn,
  endRow,
  endColumn,
  style
) {
  const XLSX = window.XLSX;

  for (
    let row = startRow;
    row <= endRow;
    row++
  ) {
    for (
      let column = startColumn;
      column <= endColumn;
      column++
    ) {
      const address =
        XLSX.utils.encode_cell({
          r: row,
          c: column
        });

      if (!worksheet[address]) {
        worksheet[address] = {
          t: "s",
          v: ""
        };
      }

      worksheet[address].s = {
        ...(worksheet[address].s || {}),
        ...style
      };
    }
  }
}


/* =========================================================
   BORDER
   ========================================================= */

function createBorder() {
  return {
    top: {
      style: "thin",
      color: "CBD5E1"
    },
    bottom: {
      style: "thin",
      color: "CBD5E1"
    },
    left: {
      style: "thin",
      color: "CBD5E1"
    },
    right: {
      style: "thin",
      color: "CBD5E1"
    }
  };
}


/* =========================================================
   SAFE SHEET NAME
   ========================================================= */

function safeSheetName(value) {
  const cleaned = String(value)
    .replace(/[\\/?*[\]:]/g, "-")
    .trim();

  return (
    cleaned.slice(0, 31) ||
    "Facility"
  );
}


/* =========================================================
   SAFE FILE NAME
   ========================================================= */

function safeFilename(value) {
  return String(value)
    .trim()
    .replace(
      /[^A-Za-z0-9_-]/g,
      "_"
    );
}


/* =========================================================
   FACILITY ID SANITIZATION
   ========================================================= */

function sanitizeIdPart(value) {
  return String(value)
    .trim()
    .replace(
      /[^A-Za-z0-9_-]/g,
      ""
    );
}