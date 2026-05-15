const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212",
  "221213", "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221",
  "223211", "221132", "221231", "213212", "223112", "312131", "311222", "321122", "321221",
  "312212", "322112", "322211", "212123", "212321", "232121", "111323", "131123", "131321",
  "112313", "132113", "132311", "211313", "231113", "231311", "112133", "112331", "132131",
  "113123", "113321", "133121", "313121", "211331", "231131", "213113", "213311", "213131",
  "311123", "311321", "331121", "312113", "312311", "332111", "314111", "221411", "431111",
  "111224", "111422", "121124", "121421", "141122", "141221", "112214", "112412", "122114",
  "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", "111242",
  "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311",
  "113141", "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

const TOOL_DEFAULTS = {
  format: "upc",
  moduleWidth: 2.2,
  barcodeHeight: 88,
  fontSize: 16,
  showText: true,
  exampleData: {
    upc: "12345678901\n123456789012",
    gtin13: "123456789012\n400638133393",
    gtin14: "1234567890123\n01234567890123",
    gs1datamatrix: {
      productCode: "00063691029279",
      expiry: "2028-05",
      lot: "AD95561",
    },
  },
};

const GS1_LABEL_AI_MAP = {
  "01": { key: "gtin", label: "GTIN", fixedLength: 14 },
  "10": { key: "lot", label: "LOT", variableLength: true },
  "17": { key: "exp", label: "EXP", fixedLength: 6 },
};

const refs = {
  form: document.getElementById("barcode-tool-form"),
  data: document.getElementById("barcode-data"),
  format: document.getElementById("barcode-format"),
  gs1Fields: document.getElementById("gs1-datamatrix-fields"),
  gs1ProductCode: document.getElementById("gs1-product-code"),
  gs1Expiry: document.getElementById("gs1-expiry"),
  gs1Lot: document.getElementById("gs1-lot"),
  moduleWidth: document.getElementById("barcode-module-width"),
  barcodeHeight: document.getElementById("barcode-height"),
  fontSize: document.getElementById("barcode-font-size"),
  showText: document.getElementById("barcode-show-text"),
  formatHint: document.getElementById("barcode-format-hint"),
  toolNote: document.getElementById("barcode-tool-note"),
  generateButton: document.getElementById("barcode-generate-button"),
  loadExampleButton: document.getElementById("barcode-load-example-button"),
  clearButton: document.getElementById("barcode-clear-button"),
  printButton: document.getElementById("barcode-print-button"),
  status: document.getElementById("barcode-status"),
  previewCard: document.getElementById("barcode-preview-card"),
  previewGrid: document.getElementById("barcode-preview-grid"),
  summary: document.getElementById("barcode-summary"),
};

function getFormatConfig(format) {
  const configs = {
    upc: { label: "UPC-A", length: 12, baseLength: 11 },
    gtin13: { label: "GTIN-13", length: 13, baseLength: 12 },
    gtin14: { label: "GTIN-14", length: 14, baseLength: 13 },
    gs1datamatrix: { label: "GS1 DataMatrix (Square)" },
  };

  return configs[format] || configs.upc;
}

function computeGtInCheckDigit(baseDigits) {
  let sum = 0;

  for (let index = baseDigits.length - 1, position = 0; index >= 0; index -= 1, position += 1) {
    const digit = Number(baseDigits[index]);
    sum += digit * (position % 2 === 0 ? 3 : 1);
  }

  return String((10 - (sum % 10)) % 10);
}

function normalizeDigits(rawValue) {
  return String(rawValue || "").replace(/\D/g, "");
}

function normalizeBarcodeEntry(rawValue, format) {
  const digits = normalizeDigits(rawValue);
  const config = getFormatConfig(format);

  if (!digits) {
    return {
      valid: false,
      message: `Enter ${config.label} data using digits only.`,
    };
  }

  if (digits.length === config.baseLength) {
    const checkDigit = computeGtInCheckDigit(digits);
    return {
      valid: true,
      inputDigits: digits,
      normalizedDigits: `${digits}${checkDigit}`,
      formatLabel: config.label,
      note: "Check digit added automatically.",
    };
  }

  if (digits.length === config.length) {
    const baseDigits = digits.slice(0, -1);
    const expectedCheckDigit = computeGtInCheckDigit(baseDigits);
    const providedCheckDigit = digits.slice(-1);

    if (expectedCheckDigit !== providedCheckDigit) {
      return {
        valid: false,
        message: `${config.label} check digit should be ${expectedCheckDigit}, not ${providedCheckDigit}.`,
      };
    }

    return {
      valid: true,
      inputDigits: digits,
      normalizedDigits: digits,
      formatLabel: config.label,
      note: "Check digit verified.",
    };
  }

  return {
    valid: false,
    message: `${config.label} requires ${config.baseLength} digits to calculate a check digit or ${config.length} digits to validate one.`,
  };
}

function normalizeGs1DataMatrixEntry(rawValue) {
  const text = String(rawValue || "").trim();

  if (!text) {
    return {
      valid: false,
      message: "Enter GS1 DataMatrix content using GS1 AI notation.",
    };
  }

  if (!/\(\d{2,4}\)/.test(text)) {
    return {
      valid: false,
      message: "Use bracketed GS1 AI notation such as (01)00012345678905(17)270101.",
    };
  }

  const fields = parseGs1AiFields(text.replace(/\s+/g, ""));
  const requiredKeys = ["gtin"];
  const missingKeys = requiredKeys.filter((key) => !fields[key]);

  if (missingKeys.length > 0) {
    return {
      valid: false,
      message: "Include at least a GTIN using AI (01) in each GS1 row.",
    };
  }

  return {
    valid: true,
    normalizedText: text.replace(/\s+/g, ""),
    formatLabel: "GS1 DataMatrix",
    note: "Square GS1 DataMatrix preview.",
    fields,
  };
}

function normalizeGs1ProductCode(rawValue) {
  const digits = normalizeDigits(rawValue);

  if (!digits) {
    return {
      valid: false,
      message: "Enter a DIN, UPC, or GTIN value.",
    };
  }

  if (![8, 12, 13, 14].includes(digits.length)) {
    return {
      valid: false,
      message: "DIN / UPC / GTIN should be 8, 12, 13, or 14 digits.",
    };
  }

  return {
    valid: true,
    gtin14: digits.padStart(14, "0"),
    displayCode: digits,
  };
}

function normalizeGs1Expiry(rawValue) {
  const value = String(rawValue || "").trim();

  if (!value) {
    return {
      valid: false,
      message: "Enter an expiry month for GS1 DataMatrix.",
    };
  }

  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return {
      valid: false,
      message: "Expiry should use a valid year-month value.",
    };
  }

  return {
    valid: true,
    aiValue: `${match[1].slice(2)}${match[2]}00`,
    displayValue: value,
  };
}

function normalizeGs1Lot(rawValue) {
  const value = String(rawValue || "").trim();

  if (!value) {
    return {
      valid: false,
      message: "Enter a lot value for GS1 DataMatrix.",
    };
  }

  return {
    valid: true,
    aiValue: value,
  };
}

function buildGs1EntryFromFields() {
  const product = normalizeGs1ProductCode(refs.gs1ProductCode.value);
  if (!product.valid) {
    return product;
  }

  const expiry = normalizeGs1Expiry(refs.gs1Expiry.value);
  if (!expiry.valid) {
    return expiry;
  }

  const lot = normalizeGs1Lot(refs.gs1Lot.value);
  if (!lot.valid) {
    return lot;
  }

  const normalizedText = `(01)${product.gtin14}(17)${expiry.aiValue}(10)${lot.aiValue}`;
  return {
    valid: true,
    kind: "gs1datamatrix",
    normalizedText,
    formatLabel: "GS1 DataMatrix",
    note: "Square GS1 DataMatrix preview.",
    fields: {
      gtin: product.gtin14,
      exp: expiry.aiValue,
      lot: lot.aiValue,
    },
    displayText: `${product.displayCode} • ${expiry.displayValue} • ${lot.aiValue}`,
  };
}

function parseGs1AiFields(gs1Text) {
  const matches = [...gs1Text.matchAll(/\((\d{2,4})\)/g)];
  const result = {};

  matches.forEach((match, index) => {
    const ai = match[1];
    const nextMatch = matches[index + 1];
    const start = match.index + match[0].length;
    const end = nextMatch ? nextMatch.index : gs1Text.length;
    const value = gs1Text.slice(start, end);
    const spec = GS1_LABEL_AI_MAP[ai];

    if (!spec || !value) {
      return;
    }

    result[spec.key] = value;
  });

  return result;
}

function formatGs1Expiry(value) {
  if (!value || value.length < 4) {
    return value || "";
  }

  const year = `20${value.slice(0, 2)}`;
  const month = value.slice(2, 4);
  const day = value.slice(4, 6);

  if (!day || day === "00") {
    return `${year}-${month}`;
  }

  return `${year}-${month}-${day}`;
}

function escapeMarkup(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function encodeCode128Numeric(value) {
  const codes = [];
  let index = 0;

  if (value.length % 2 === 1) {
    codes.push(104);
    codes.push(value.charCodeAt(0) - 32);
    codes.push(99);
    index = 1;
  } else {
    codes.push(105);
  }

  for (; index < value.length; index += 2) {
    codes.push(Number(value.slice(index, index + 2)));
  }

  let checksum = codes[0];
  for (let position = 1; position < codes.length; position += 1) {
    checksum += codes[position] * position;
  }

  codes.push(checksum % 103);
  codes.push(106);

  return codes;
}

function buildSvgMarkup(entry, options) {
  if (entry.kind === "gs1datamatrix") {
    if (!window.bwipjs || typeof window.bwipjs.toSVG !== "function") {
      throw new Error("GS1 DataMatrix rendering is not available yet. Refresh and try again.");
    }

    const scale = Math.max(1, Math.round(Number(options.moduleWidth) || 2));
    return window.bwipjs.toSVG({
      bcid: "gs1datamatrix",
      text: entry.normalizedText,
      parsefnc: true,
      format: "square",
      scaleX: scale,
      scaleY: scale,
      includetext: Boolean(options.showText),
      textsize: Number(options.fontSize) || 16,
      paddingwidth: 8,
      paddingheight: 8,
    });
  }

  const codes = encodeCode128Numeric(entry.normalizedDigits);
  const quietZoneModules = 10;
  const moduleWidth = Number(options.moduleWidth);
  const barcodeHeight = Number(options.barcodeHeight);
  const fontSize = Number(options.fontSize);
  const showText = Boolean(options.showText);

  const totalPatternModules = codes.reduce((sum, code) => {
    return sum + CODE128_PATTERNS[code].split("").reduce((inner, value) => inner + Number(value), 0);
  }, 0);

  const totalModules = totalPatternModules + quietZoneModules * 2;
  const width = totalModules * moduleWidth;
  const textBlockHeight = showText ? fontSize + 18 : 0;
  const height = barcodeHeight + textBlockHeight + 16;

  let x = quietZoneModules * moduleWidth;
  let barsMarkup = "";

  codes.forEach((code) => {
    const pattern = CODE128_PATTERNS[code];
    let isBar = true;

    pattern.split("").forEach((value) => {
      const segmentWidth = Number(value) * moduleWidth;
      if (isBar) {
        barsMarkup += `<rect x="${x}" y="10" width="${segmentWidth}" height="${barcodeHeight}" rx="0" ry="0"></rect>`;
      }
      x += segmentWidth;
      isBar = !isBar;
    });
  });

  const textMarkup = showText
    ? `<text x="${width / 2}" y="${barcodeHeight + fontSize + 12}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" fill="#16303b">${entry.normalizedDigits}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${entry.formatLabel} barcode for ${entry.normalizedDigits}">
  <rect width="${width}" height="${height}" fill="#ffffff"></rect>
  <g fill="#111111">
    ${barsMarkup}
  </g>
  ${textMarkup}
</svg>`;
}

function buildGs1LabelAssets(entry, options) {
  const matrixSvg = buildSvgMarkup(entry, {
    ...options,
    showText: false,
  });

  const fields = entry.fields || {};
  const exp = fields.exp ? formatGs1Expiry(fields.exp) : "-";
  const lot = fields.lot || "-";
  const gtin = fields.gtin || "-";

  const previewMarkup = `
    <div class="gs1-label-preview">
      <div class="gs1-label-middle">
        <div class="gs1-label-matrix">${matrixSvg}</div>
        <div class="gs1-label-side">
          <div class="gs1-label-line"><strong>DIN/UPC/GTIN:</strong> ${escapeMarkup(gtin)}</div>
          <div class="gs1-label-line"><strong>EXP:</strong> ${escapeMarkup(exp)}</div>
          <div class="gs1-label-line"><strong>LOT:</strong> ${escapeMarkup(lot)}</div>
        </div>
      </div>
    </div>
  `;

  const parser = new DOMParser();
  const matrixDoc = parser.parseFromString(matrixSvg, "image/svg+xml");
  const svgRoot = matrixDoc.documentElement;
  const viewBox = (svgRoot.getAttribute("viewBox") || "0 0 180 180").split(/\s+/).map(Number);
  const matrixWidth = viewBox[2] || 180;
  const matrixHeight = viewBox[3] || 180;
  const matrixInner = svgRoot.innerHTML;

  const labelWidth = 460;
  const labelHeight = 220;
  const labelSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${labelWidth} ${labelHeight}" width="${labelWidth}" height="${labelHeight}" role="img" aria-label="GS1 DataMatrix label for ${escapeMarkup(gtin)}">
    <rect width="${labelWidth}" height="${labelHeight}" fill="#ffffff"></rect>
    <g transform="translate(20,34)">
      <svg viewBox="0 0 ${matrixWidth} ${matrixHeight}" width="150" height="150" aria-hidden="true">
        ${matrixInner}
      </svg>
    </g>
    <text x="190" y="74" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#16303b">DIN/UPC/GTIN:</text>
    <text x="190" y="102" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#16303b">${escapeMarkup(gtin)}</text>
    <text x="190" y="138" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#16303b">EXP: ${escapeMarkup(exp)}</text>
    <text x="190" y="176" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#16303b">LOT: ${escapeMarkup(lot)}</text>
  </svg>`;

  return {
    previewMarkup,
    downloadSvg: labelSvg,
  };
}

function createDownloadButton(entry, svgMarkup) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "button button-secondary barcode-download-button";
  button.textContent = "Download SVG";
  button.addEventListener("click", () => {
    const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${entry.normalizedDigits || entry.normalizedText}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
  return button;
}

function renderResults(entries, options) {
  refs.previewGrid.innerHTML = "";

  entries.forEach((entry) => {
    const svgMarkup = buildSvgMarkup(entry, options);
    const card = document.createElement("article");
    card.className = `barcode-result-card${entry.kind === "gs1datamatrix" ? " is-gs1-label" : ""}`;

    const meta = document.createElement("div");
    meta.className = "barcode-result-meta";
    meta.innerHTML = `
      <div>
        <h3>${entry.formatLabel}</h3>
        <p>${entry.displayText || entry.normalizedDigits || entry.normalizedText}</p>
      </div>
      <span class="status-pill status-pill-soft">${entry.note}</span>
    `;

    const artboard = document.createElement("div");
    artboard.className = "barcode-artboard";
    let downloadMarkup = svgMarkup;
    if (entry.kind === "gs1datamatrix") {
      const labelAssets = buildGs1LabelAssets(entry, options);
      artboard.innerHTML = labelAssets.previewMarkup;
      downloadMarkup = labelAssets.downloadSvg;
    } else {
      artboard.innerHTML = svgMarkup;
    }

    const actions = document.createElement("div");
    actions.className = "barcode-card-actions";
    actions.appendChild(createDownloadButton(entry, downloadMarkup));

    card.appendChild(meta);
    card.appendChild(artboard);
    card.appendChild(actions);
    refs.previewGrid.appendChild(card);
  });

  refs.previewCard.hidden = false;
  refs.summary.textContent = `${entries.length} barcode${entries.length === 1 ? "" : "s"} ready for review.`;
}

function setStatus(message, tone = "info") {
  refs.status.textContent = message;
  refs.status.className = `barcode-status${tone ? ` is-${tone}` : ""}`;
}

function clearResults() {
  refs.previewGrid.innerHTML = "";
  refs.previewCard.hidden = true;
  refs.summary.textContent = "Generated previews will appear here.";
}

function getRenderOptions() {
  return {
    moduleWidth: Number(refs.moduleWidth.value || TOOL_DEFAULTS.moduleWidth),
    barcodeHeight: Number(refs.barcodeHeight.value || TOOL_DEFAULTS.barcodeHeight),
    fontSize: Number(refs.fontSize.value || TOOL_DEFAULTS.fontSize),
    showText: refs.showText.checked,
  };
}

function generateBarcodes(event) {
  if (event) {
    event.preventDefault();
  }

  const rawLines = refs.data.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (refs.format.value === "gs1datamatrix") {
    const gs1Entry = buildGs1EntryFromFields();
    if (!gs1Entry.valid) {
      clearResults();
      setStatus(gs1Entry.message, "error");
      return;
    }

    try {
      renderResults([gs1Entry], getRenderOptions());
    } catch (error) {
      clearResults();
      setStatus(error instanceof Error ? error.message : "Unable to generate the selected barcode format.", "error");
      return;
    }

    setStatus("Generated 1 barcode preview.", "success");
    return;
  }

  if (rawLines.length === 0) {
    clearResults();
    setStatus("Add at least one UPC or GTIN value before generating barcodes.", "error");
    return;
  }

  const format = refs.format.value;
  const errors = [];
  const entries = rawLines.map((line, index) => {
    const normalized =
      format === "gs1datamatrix"
        ? normalizeGs1DataMatrixEntry(line)
        : normalizeBarcodeEntry(line, format);
    if (!normalized.valid) {
      errors.push(`Row ${index + 1}: ${normalized.message}`);
    }
    return {
      ...normalized,
      kind: format === "gs1datamatrix" ? "gs1datamatrix" : "linear",
    };
  });

  if (errors.length > 0) {
    clearResults();
    setStatus(errors.join(" "), "error");
    return;
  }

  try {
    renderResults(entries, getRenderOptions());
  } catch (error) {
    clearResults();
    setStatus(error instanceof Error ? error.message : "Unable to generate the selected barcode format.", "error");
    return;
  }
  setStatus(`Generated ${entries.length} barcode preview${entries.length === 1 ? "" : "s"}.`, "success");
}

function loadExample() {
  const format = refs.format.value || TOOL_DEFAULTS.format;
  if (format === "gs1datamatrix") {
    refs.data.value = "";
    refs.gs1ProductCode.value = TOOL_DEFAULTS.exampleData.gs1datamatrix.productCode;
    refs.gs1Expiry.value = TOOL_DEFAULTS.exampleData.gs1datamatrix.expiry;
    refs.gs1Lot.value = TOOL_DEFAULTS.exampleData.gs1datamatrix.lot;
  } else {
    refs.data.value = TOOL_DEFAULTS.exampleData[format];
    refs.gs1ProductCode.value = "";
    refs.gs1Expiry.value = "";
    refs.gs1Lot.value = "";
  }
  refs.moduleWidth.value = TOOL_DEFAULTS.moduleWidth;
  refs.barcodeHeight.value = TOOL_DEFAULTS.barcodeHeight;
  refs.fontSize.value = TOOL_DEFAULTS.fontSize;
  refs.showText.checked = TOOL_DEFAULTS.showText;
  generateBarcodes();
}

function clearTool() {
  refs.data.value = "";
  refs.gs1ProductCode.value = "";
  refs.gs1Expiry.value = "";
  refs.gs1Lot.value = "";
  refs.format.value = TOOL_DEFAULTS.format;
  refs.moduleWidth.value = TOOL_DEFAULTS.moduleWidth;
  refs.barcodeHeight.value = TOOL_DEFAULTS.barcodeHeight;
  refs.fontSize.value = TOOL_DEFAULTS.fontSize;
  refs.showText.checked = TOOL_DEFAULTS.showText;
  syncExampleDataHint();
  clearResults();
  setStatus("", "");
}

function syncExampleDataHint() {
  const format = refs.format.value;
  refs.data.placeholder = TOOL_DEFAULTS.exampleData[format];

  if (format === "gs1datamatrix") {
    refs.gs1Fields.hidden = false;
    refs.data.parentElement.hidden = true;
    refs.formatHint.textContent =
      "Enter a DIN, UPC, or GTIN together with expiry and lot. The GS1 DataMatrix payload will be built automatically.";
    refs.toolNote.textContent =
      "This option renders a square GS1 DataMatrix symbol in the browser using product code, expiry, and lot values. Serial number is not used in this mode.";
    refs.showText.checked = false;
    refs.showText.parentElement.hidden = true;
  } else {
    refs.gs1Fields.hidden = true;
    refs.data.parentElement.hidden = false;
    refs.formatHint.textContent =
      "Enter one UPC / GTIN value per line. You can paste either the base digits or the full code with check digit.";
    refs.toolNote.textContent =
      "Rendering uses a numeric Code 128 barcode preview so the tool can handle bulk UPC and GTIN values in one workflow. Check digits are still validated according to the selected UPC / GTIN format.";
    refs.showText.parentElement.hidden = false;
  }
}

function printSheet() {
  if (refs.previewCard.hidden) {
    setStatus("Generate barcodes before printing the sheet.", "error");
    return;
  }
  window.print();
}

function initialize() {
  refs.form.addEventListener("submit", generateBarcodes);
  refs.loadExampleButton.addEventListener("click", loadExample);
  refs.clearButton.addEventListener("click", clearTool);
  refs.printButton.addEventListener("click", printSheet);
  refs.format.addEventListener("change", syncExampleDataHint);
  syncExampleDataHint();
}

initialize();
