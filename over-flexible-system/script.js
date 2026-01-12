// sketch.js (updated)
// ------------------------------------
// Global state
// ------------------------------------

let bgColor = '#000000';
let numCols = 3;
let numRows = 1;
let cellGap = 0;

// Alternating row counts per column
let useAlternatingRows = false;
let numRowsCol1 = 20;
let numRowsCol2 = 10;

// Auto row count settings
let useAutoRowCount = false;
let autoRowPattern = "radial";  // "radial" | "radialInverse" | "animatedRadial"
let autoRowMin = 3;
let autoRowMax = 3;

// --- Export frames controls ---
let exportFps = 30;
let exportDurationSec = 5;

let isExportingFrames = false;
let exportTimeOverride = null; // when exporting, we render at an exact t

let p5canvas; // store the p5 canvas object created in setup()

// ------------------------------------
// CANVAS SIZE CONTROLS
// ------------------------------------
let canvasSizeMode = "auto"; // "auto" | "16:9" | "9:16" | "4:5" | "1:1" | "custom"

// Keep both: draft (what user types) + last good numeric values
let customWidthDraft = "1920";
let customHeightDraft = "1080";
let customCanvasWidth = 1920;
let customCanvasHeight = 1080;

function clamp(n, minV, maxV) {
  return Math.max(minV, Math.min(maxV, n));
}

function parsePositiveIntOrNull(str) {
  if (str === null || str === undefined) return null;
  const s = String(str).trim();
  if (s === "") return null;          // allow empty while typing
  if (!/^\d+$/.test(s)) return null;  // digits only
  const n = parseInt(s, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

// Fit an aspect ratio inside the current viewport (windowWidth/windowHeight)
function fitAspectToViewport(aspectWoverH) {
  const maxW = Math.max(1, windowWidth);
  const maxH = Math.max(1, windowHeight);

  let w = maxW;
  let h = Math.round(w / aspectWoverH);

  if (h > maxH) {
    h = maxH;
    w = Math.round(h * aspectWoverH);
  }

  w = Math.max(1, Math.round(w));
  h = Math.max(1, Math.round(h));
  return { w, h };
}

function getCanvasSizeForMode(mode) {
  const bounds = getCanvasContainerInnerSize();

  switch (mode) {
    case "16:9":
      return fitAspectToBounds(16 / 9, bounds.w, bounds.h);
    case "9:16":
      return fitAspectToBounds(9 / 16, bounds.w, bounds.h);
    case "4:5":
      return fitAspectToBounds(4 / 5, bounds.w, bounds.h);
    case "1:1":
      return fitAspectToBounds(1, bounds.w, bounds.h);
    case "custom":
      return { w: Math.max(1, customCanvasWidth), h: Math.max(1, customCanvasHeight) };
    case "auto":
    default:
      return { w: bounds.w, h: bounds.h };
  }
}

function updateCustomSizeVisibility() {
  const wrap = document.getElementById("customSizeInputs");
  if (!wrap) return;

  wrap.style.display = (canvasSizeMode === "custom") ? "block" : "none";
  refreshOpenAccordionHeightFrom(wrap);
}

function syncCanvasControlsFromDOM({ normalizeCustom = false } = {}) {
  const modeSel = document.getElementById("canvasSizeModeSelect");
  if (modeSel) canvasSizeMode = modeSel.value || "auto";

  const wEl = document.getElementById("customWidthInput");
  const hEl = document.getElementById("customHeightInput");

  if (wEl) customWidthDraft = wEl.value;
  if (hEl) customHeightDraft = hEl.value;

  const wMaybe = parsePositiveIntOrNull(customWidthDraft);
  const hMaybe = parsePositiveIntOrNull(customHeightDraft);
  if (wMaybe !== null) customCanvasWidth = wMaybe;
  if (hMaybe !== null) customCanvasHeight = hMaybe;

  if (normalizeCustom && canvasSizeMode === "custom") {
    customCanvasWidth = clamp(customCanvasWidth, 100, 7680);
    customCanvasHeight = clamp(customCanvasHeight, 100, 4320);

    if (wEl) wEl.value = String(customCanvasWidth);
    if (hEl) hEl.value = String(customCanvasHeight);

    customWidthDraft = String(customCanvasWidth);
    customHeightDraft = String(customCanvasHeight);
  }

  updateCustomSizeVisibility();
}

function applyCanvasSize() {
  syncCanvasControlsFromDOM({ normalizeCustom: false });

  const { w, h } = getCanvasSizeForMode(canvasSizeMode);
  if (!p5canvas) return;

  if (width !== w || height !== h) resizeCanvas(w, h);
}

function getCanvasContainerInnerSize() {
  const el = document.querySelector(".canvas-container");
  if (!el) return { w: Math.max(1, windowWidth), h: Math.max(1, windowHeight) };

  const cs = getComputedStyle(el);
  const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
  const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);

  const w = Math.max(1, Math.round(el.clientWidth - padX));
  const h = Math.max(1, Math.round(el.clientHeight - padY));
  return { w, h };
}

function fitAspectToBounds(aspectWoverH, maxW, maxH) {
  let w = Math.max(1, maxW);
  let h = Math.round(w / aspectWoverH);
  if (h > maxH) {
    h = Math.max(1, maxH);
    w = Math.round(h * aspectWoverH);
  }
  return { w: Math.max(1, w), h: Math.max(1, h) };
}

function timeSeconds() {
  return (exportTimeOverride !== null) ? exportTimeOverride : (millis() / 1000.0);
}

// ------------------------------------
// TEXT INPUT MODE (2 options)
// ------------------------------------
let textMode = "lists"; // "lists" or "symbol"
let symbolChar1 = "A";
let symbolChar2 = "B";
let symbolChar3 = "C";

function sanitizeOneSymbol(str) {
  const arr = Array.from(str || "");
  const one = arr[0] || "";
  return one.toUpperCase(); // force uppercase
}


function bindSymbolInput(inputId, setter) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener("input", (e) => {
    const one = sanitizeOneSymbol(e.target.value);
    e.target.value = one;
    setter(one);
  });
}

function applyTextModeUI() {
  const listsEl = document.getElementById("wordListControls");
  const symEl = document.getElementById("symbolControls");
  if (!listsEl || !symEl) return;

  if (textMode === "symbol") {
    listsEl.style.display = "none";
    symEl.style.display = "block";
  } else {
    listsEl.style.display = "block";
    symEl.style.display = "none";
  }
}

// ------------------------------------
// Word system
// ------------------------------------
const LINE1_PREFIXES = [
  "X","over", "un", "in", "dis", "de", "mis", "re", "under",
  "hyper", "hypo", "sub", "super", "inter", "intra", "pre",
  "post", "trans", "tele", "uni", "bi", "multi", "co", "pro",
  "auto", "bio", "geo", "pseudo"
];

const LINE2_WORD = "flexible";

const LINE3_WORDS = [
  "Y","Systems", "Capitalism", "Commons", "Communication", "Contracts", "Creativity",
  "Culture", "Data", "Democracy", "Density", "Design", "Development",
  "Dynamics", "Emotional", "Employee", "Employer", "Employment", "Energy",
  "Enforcement", "Ethics", "Family", "Flexibility", "Freedom", "Governance",
  "Growth", "Identity", "Insurance", "Job", "Law", "Love", "Management",
  "Markets", "Manufacturing", "Meaning", "Networks", "Outcomes", "Patterns",
  "People", "Person", "Policies", "Privacy", "Relationships", "Resources",
  "Roles", "Security", "Society", "Supply", "Sustainability",
  "Team", "Transportation", "Transparency", "Trust", "User", "Values", "War"
];

let selectedPrefix = "over";
let selectedLine3Word = "Systems";

let WORDS = ["OVER", "FLEXIBLE", "SYSTEMS"];
let WORD_DATA = {};
const BASE_SIZE = 200;

// ------------------------------------
// Stretch controls
// ------------------------------------
let rowStretchMode = "animated";
let rowStretchManual = 2.0;
let ROW_ANIM_SPEED = 0.25;
const ROW_STRETCH_AMOUNT = 2.3;   // fixed
let ROW_RADIAL_POW = 1;

let colStretchMode = "animated";
let colStretchManual = 0.0;
const COL_STRETCH_AMOUNT = 2.3;   // fixed
let COL_MAP_SPEED = 0.2;

// ------------------------------------
// Inner line stretch (within cells)
// ------------------------------------
const INNER_LINE_STRETCH_AMOUNT = 1.8;

// manual vs animated toggle for INNER map timing
let innerStretchMode = "manual"; // "manual" | "animated"
let innerStretchManual = 0.0;    // seconds used when manual mode is selected

let currentMap = "spiral";       // fixed
let mapSpeed = 0.2;              // speed used when animated

// ------------------------------------
// COLOR POOLS & PALETTES
// ------------------------------------
const COLOR_POOL = [
  "#000000",
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFFFFF"
];

const BW_POOL = [
  "#000000",
  "#FFFFFF"
];

// NOTE: keep your luminance list as-is (your original project used a longer palette)
// This is only used for contrast picking, and will still work.
const COLOR_POOL_LUM = [
  0.0,
  0.366,
  0.716,
  0.213,
  0.285,
  0.364,
  0.927
];

// Color control
let colorMode = "random";        // "random" | "bwRandom" | "fixed"
let textVisibility = "contrast"; // "contrast" | "hidden" | "partial"
let bgColorChoice = "#000000";   // fixed mode bg
let fontColorChoice = "#FFFFFF"; // fixed mode font

// Pattern for color bands
let colorPattern = "radial";
let COLOR_SCALE_FACTOR = 2;
let COLOR_BANDS = 6;

// ------------------------------------
// COLOR HELPER FUNCTIONS
// ------------------------------------
function getContrastColorFromPool(bgLum) {
  let bestIdx = 0;
  let bestContrast = 0;

  for (let i = 0; i < COLOR_POOL.length; i++) {
    let diff = abs(COLOR_POOL_LUM[i] - bgLum);
    if (diff > bestContrast) {
      bestContrast = diff;
      bestIdx = i;
    }
  }
  return color(COLOR_POOL[bestIdx]);
}

// ------------------------------------
// PATTERN COORD (0..1) FOR COLOR BANDS
// ------------------------------------
function patternCoord(u, v) {
  switch (colorPattern) {
    case "angle": {
      let dx = u - 0.5;
      let dy = v - 0.5;
      let ang = atan2(dy, dx);
      let ang01 = (ang + PI) / TWO_PI;
      let beams = 6.0;
      let sectorIndex = floor(ang01 * beams);
      return sectorIndex % 2;
    }

    case "checker": {
      let cellsX = 10.0;
      let cellsY = 10.0;
      let cx = floor(u * cellsX);
      let cy = floor(v * cellsY);
      return (cx + cy) % 2;
    }

    case "ellipticalRadial": {
      let centers = [
        { x: 0.0, y: 0.5 },
        { x: 1.0, y: 0.5 },
        { x: 0.5, y: 0.0 },
        { x: 0.5, y: 1.0 }
      ];

      let dMin = 999.0;
      for (let k = 0; k < centers.length; k++) {
        let dx = u - centers[k].x;
        let dy = v - centers[k].y;
        let d = sqrt(dx * dx + dy * dy);
        if (d < dMin) dMin = d;
      }

      return constrain(dMin / 0.75, 0, 1);
    }

    case "cross": {
      let dx = abs(u - 0.5);
      let dy = abs(v - 0.5);
      let d = min(dx, dy);
      return constrain(d * 4.0, 0, 1);
    }

    case "squareRings": {
      let dx = u - 0.5;
      let dy = v - 0.5;
      let d = max(abs(dx), abs(dy));
      return constrain(d * 2.0, 0, 1);
    }

    case "radial":
    default: {
      let dx = u - 0.5;
      let dy = v - 0.5;
      let r = sqrt(dx * dx + dy * dy);
      return constrain(r / 0.7071, 0, 1);
    }
  }
}

// ------------------------------------
// Font preload
// ------------------------------------
let myFont;

function preload() {
  myFont = loadFont("neuehaasgrotdispround-95black-trial.otf");
}

function prepareWordData() {
  WORD_DATA = {};
  if (!myFont || !myFont.font || !myFont.font.getPath) {
    console.warn("myFont.font.getPath not available – fallback to text()");
    return;
  }

  for (let w of LINE1_PREFIXES) {
    let word = w.toUpperCase();
    let bb = myFont.textBounds(word, 0, 0, BASE_SIZE);
    let path = myFont.font.getPath(word, 0, 0, BASE_SIZE);
    WORD_DATA[word] = { bb, path };
  }

  let fixedWord = LINE2_WORD.toUpperCase();
  let bb2 = myFont.textBounds(fixedWord, 0, 0, BASE_SIZE);
  let path2 = myFont.font.getPath(fixedWord, 0, 0, BASE_SIZE);
  WORD_DATA[fixedWord] = { bb: bb2, path: path2 };

  for (let w of LINE3_WORDS) {
    let word = w.toUpperCase();
    let bb = myFont.textBounds(word, 0, 0, BASE_SIZE);
    let path = myFont.font.getPath(word, 0, 0, BASE_SIZE);
    WORD_DATA[word] = { bb, path };
  }
}

function ensureWordData(txt) {
  if (!txt) return;
  if (WORD_DATA[txt]) return;
  if (!myFont || !myFont.font || !myFont.font.getPath) return;

  let bb = myFont.textBounds(txt, 0, 0, BASE_SIZE);
  let path = myFont.font.getPath(txt, 0, 0, BASE_SIZE);
  WORD_DATA[txt] = { bb, path };
}

function getWordsForCell(colIndex, rowIndex) {
  if (textMode === "symbol") {
    return [symbolChar1, symbolChar2, symbolChar3];
  }
  return [
    selectedPrefix.toUpperCase(),
    LINE2_WORD.toUpperCase(),
    selectedLine3Word.toUpperCase()
  ];
}

// ------------------------------------
// p5.js setup
// ------------------------------------
function setup() {
  pixelDensity(2);

  // read canvas UI before creating canvas
  syncCanvasControlsFromDOM();
  const { w, h } = getCanvasSizeForMode(canvasSizeMode);

  p5canvas = createCanvas(w, h);
  p5canvas.parent('canvas-wrapper');

  prepareWordData();
  updatePaletteDisplay();
  updateFixedModeColorsVisibility();
  applyTextModeUI();

  bindSymbolInput("symbolInput1", (v) => { symbolChar1 = v; });
  bindSymbolInput("symbolInput2", (v) => { symbolChar2 = v; });
  bindSymbolInput("symbolInput3", (v) => { symbolChar3 = v; });
}

// ------------------------------------
// Export Frames
// ------------------------------------
async function exportFramesAsZip() {
  if (isExportingFrames) return;
  if (!window.JSZip) {
    alert("JSZip not found. Make sure you added the JSZip <script> tag.");
    return;
  }

  const fps = Math.max(1, Math.round(exportFps));
  const duration = Math.max(1, Math.round(exportDurationSec));
  const totalFrames = Math.max(1, Math.round(fps * duration));

  const MAX_FRAMES = 1200;
  if (totalFrames > MAX_FRAMES) {
    alert(`Too many frames (${totalFrames}). Lower duration/FPS (max ${MAX_FRAMES} frames).`);
    return;
  }

  isExportingFrames = true;

  const btn = document.getElementById("exportFramesBtn");
  const oldText = btn ? btn.textContent : "";
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Exporting…";
  }

  const wasLooping = isLooping();
  noLoop();

  try {
    const zip = new JSZip();
    const folderName = `modulo_frames_${fps}fps_${duration}s`;
    const folder = zip.folder(folderName);

    for (let i = 0; i < totalFrames; i++) {
      exportTimeOverride = i / fps;

      draw();

      const blob = await new Promise((resolve) => {
        p5canvas.elt.toBlob(resolve, "image/png");
      });

      const filename = `frame_${String(i).padStart(4, "0")}.png`;
      folder.file(filename, blob);
    }

    exportTimeOverride = null;

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${folderName}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert("Export failed. See console for details.");
  } finally {
    exportTimeOverride = null;
    if (wasLooping) loop();

    isExportingFrames = false;
    if (btn) {
      btn.disabled = false;
      btn.textContent = oldText || "↓ Export Frames (ZIP)";
    }
  }
}

function windowResized() {
  if (canvasSizeMode === "custom") return;
  applyCanvasSize();
}

// ------------------------------------
// Row count helpers
// ------------------------------------
function getRowCountForColumn(colIndex) {
  if (useAutoRowCount) return calculateAutoRowCount(colIndex);
  if (useAlternatingRows) return (colIndex % 2 === 0) ? numRowsCol1 : numRowsCol2;
  return numRows;
}

function calculateAutoRowCount(colIndex) {
  let cols = max(1, numCols);
  let u = (colIndex + 0.5) / cols;

  let t = (autoRowPattern === "animatedRadial") ? timeSeconds() : 0;
  let factor = 0.5;

  switch (autoRowPattern) {
    case "radial":
      factor = 1.0 - abs(u - 0.5) * 2.0;
      break;

    case "radialInverse":
      factor = abs(u - 0.5) * 2.0;
      break;

    case "animatedRadial": {
      let base = 1.0 - abs(u - 0.5) * 2.0;
      let breath = 0.5 + 0.5 * sin(TWO_PI * t * 0.15);
      factor = lerp(1.0 - base, base, breath);
      break;
    }

    default:
      factor = 0.5;
  }

  let rowCount = round(lerp(autoRowMin, autoRowMax, factor));
  return max(1, rowCount);
}

// ------------------------------------
// Main draw
// ------------------------------------
function draw() {
  background(bgColor);
  let t = timeSeconds();

  // 1) Column widths (animated / manual)
  let cols = max(1, numCols);
  let colWeights = new Array(cols);
  let sumColW = 0;

  let colOsc;
  if (colStretchMode === "animated") {
    colOsc = sin(TWO_PI * t * COL_MAP_SPEED);
  } else if (colStretchMode === "manual") {
    colOsc = colStretchManual;
  } else {
    colOsc = 0.0;
  }

  for (let c = 0; c < cols; c++) {
    let uCol = (c + 0.5) / cols;
    let spatial = 1.0 - abs(uCol - 0.5) * 2.0;
    let centerBias = spatial - 0.5;
    let w = 1.0 - COL_STRETCH_AMOUNT * centerBias * colOsc;
    colWeights[c] = max(0.01, w);
    sumColW += colWeights[c];
  }

  let totalGapWidth = (cols + 1) * cellGap;
  let availableWidth = width - totalGapWidth;
  let colWidths = new Array(cols);
  for (let c = 0; c < cols; c++) {
    colWidths[c] = (colWeights[c] / sumColW) * availableWidth;
  }

  // 2) Rows per column (radial row stretch)
  let maxDist = dist(0, 0, width / 2, height / 2);
  let xAccum = cellGap;

  for (let c = 0; c < cols; c++) {
    let colW = colWidths[c];
    let rows = max(1, getRowCountForColumn(c));

    let totalGapHeight = (rows + 1) * cellGap;
    let availableHeight = height - totalGapHeight;

    let rowWeights = new Array(rows);
    let sumRowW = 0;

    let uCol = (c + 0.5) / cols;

    let stretchAmt;
    if (rowStretchMode === "animated") {
      let oscRow = sin(TWO_PI * t * ROW_ANIM_SPEED);
      stretchAmt = ROW_STRETCH_AMOUNT * oscRow;
    } else if (rowStretchMode === "manual") {
      stretchAmt = rowStretchManual;
    } else {
      stretchAmt = ROW_STRETCH_AMOUNT;
    }

    for (let r = 0; r < rows; r++) {
      let vRow = (r + 0.5) / rows;

      let cxLogic = uCol * width;
      let cyLogic = vRow * height;

      let d = dist(cxLogic, cyLogic, width / 2, height / 2);
      let nd = constrain(d / maxDist, 0, 1);

      let radial = 1.0 - nd;
      let s = pow(radial, ROW_RADIAL_POW);

      let wgt = 1 + (s - 0.5) * stretchAmt;
      rowWeights[r] = max(0.01, wgt);
      sumRowW += rowWeights[r];
    }

    let rowHeights = new Array(rows);
    for (let r = 0; r < rows; r++) {
      rowHeights[r] = (rowWeights[r] / sumRowW) * availableHeight;
    }

    let yAccum = cellGap;
    for (let r = 0; r < rows; r++) {
      let rowH = rowHeights[r];
      displayCell(xAccum, yAccum, colW, rowH, c, r, cols, rows, t);
      yAccum += rowH + cellGap;
    }

    xAccum += colW + cellGap;
  }
}

// ------------------------------------
// Single cell display
// ------------------------------------
function displayCell(x, y, w, h, cIndex, rIndex, cols, rows, t) {
  push();
  noStroke();

  if (colorMode === "random" || colorMode === "bwRandom") {
    let pool = (colorMode === "bwRandom") ? BW_POOL : COLOR_POOL;

    let u = (cIndex + 0.5) / cols;
    let v = (rIndex + 0.5) / rows;

    let coord = patternCoord(u, v);
    let shaped = pow(coord, COLOR_SCALE_FACTOR);
    let bandValue = shaped * COLOR_BANDS;
    let idx = floor(bandValue) % pool.length;
    if (idx < 0) idx += pool.length;

    let bgCol = color(pool[idx]);

    let rr = red(bgCol);
    let gg = green(bgCol);
    let bb = blue(bgCol);
    let lum = (0.2126 * rr + 0.7152 * gg + 0.0722 * bb) / 255.0;

    let fontCol;
    if (textVisibility === "hidden") {
      fontCol = bgCol;
    } else if (textVisibility === "partial") {
      let bandIndex = floor(bandValue) % pool.length;
      if (bandIndex % 2 === 1) {
        fontCol = bgCol;
      } else {
        if (colorMode === "random") {
          fontCol = getContrastColorFromPool(lum);
        } else {
          fontCol = lum < 0.25 ? color("#FFFFFF") : color("#000000");
        }
      }
    } else {
      // contrast
      if (colorMode === "random") {
        fontCol = getContrastColorFromPool(lum);
      } else {
        fontCol = lum < 0.25 ? color("#FFFFFF") : color("#000000");
      }
    }

    fill(bgCol);
    rect(x, y, w, h);
    drawWordsInCell(x, y, w, h, fontCol, t, cIndex, rIndex);

  } else {
    // Fixed color mode
    fill(bgColorChoice);
    rect(x, y, w, h);
    drawWordsInCell(x, y, w, h, color(fontColorChoice), t, cIndex, rIndex);
  }

  pop();
}

function updateFixedModeColorsVisibility() {
  const wrap = document.getElementById("fixedModeColorsWrap");
  if (!wrap) return;

  wrap.style.display = (colorMode === "fixed") ? "block" : "none";
  refreshOpenAccordionHeightFrom(wrap);
}

// ------------------------------------
// MAP SUPPORT (for inner word lines)
// ------------------------------------
function computeNormForMap(mapType, x, y, w, h) {
  let cx = x + w / 2;
  let cy = y + h / 2;

  // currentMap is fixed to "spiral", but keep logic generic
  if (mapType === "radial" || mapType === "spiral") {
    let dx = (cx - width / 2) / (width / 2);
    let dy = (cy - height / 2) / (height / 2);
    let r = sqrt(dx * dx + dy * dy);
    return constrain(r, 0, 1);
  } else {
    let ny = cy / height;
    return constrain(ny, 0, 1);
  }
}

function computeMapValue(mapType, norm, t) {
  const speed = mapSpeed;

  switch (mapType) {
    case "linear": {
      const freq = 1;
      let phase = freq * norm - t * speed;
      let wave = Math.cos(TWO_PI * phase);
      return constrain(0.5 + 0.5 * wave, 0, 1);
    }

    case "radial": {
      let wave = Math.cos(TWO_PI * 2 * norm);
      let base = 0.5 + 0.5 * wave;
      let strength = Math.sin(TWO_PI * t * speed * 3.0);
      return constrain(0.5 + strength * (base - 0.5), 0, 1);
    }

    case "spiral":
    default: {
      let turns = 2.0;
      let phase = turns * norm + t * speed;
      let v = Math.sin(TWO_PI * phase);
      return 0.5 + 0.5 * v;
    }
  }
}

// Draw 3 stacked words with animated/static vertical line heights
function drawWordsInCell(x, y, w, h, textCol, t, colIndex, rowIndex) {
  let cellWords = getWordsForCell(colIndex, rowIndex);

  for (let j = 0; j < cellWords.length; j++) {
    if (cellWords[j] && cellWords[j].length > 0) ensureWordData(cellWords[j]);
  }

  let rows = cellWords.length;
  let baseRowH = h / rows;

  let weights = new Array(rows);
  let sumW = 0;

  const innerT = (innerStretchMode === "animated") ? t : innerStretchManual;

  for (let j = 0; j < rows; j++) {
    let y0 = y + j * baseRowH;
    let norm = computeNormForMap(currentMap, x, y0, w, baseRowH);
    let s = computeMapValue(currentMap, norm, innerT);
    let wgt = 1 + (s - 0.5) * INNER_LINE_STRETCH_AMOUNT;
    weights[j] = max(0.01, wgt);
    sumW += wgt;
  }

  let lineHeights = new Array(rows);
  for (let j = 0; j < rows; j++) {
    lineHeights[j] = (weights[j] / sumW) * h;
  }

  let havePaths = Object.keys(WORD_DATA).length > 0;

  if (!havePaths) {
    push();
    fill(textCol);
    noStroke();
    textAlign(CENTER, CENTER);

    let yAccum = y;
    for (let j = 0; j < rows; j++) {
      let txt = cellWords[j];
      let lineH = lineHeights[j];

      if (!txt || txt.length === 0) {
        yAccum += lineH;
        continue;
      }

      let cxCell = x + w / 2;
      let cyCell = yAccum + lineH / 2;
      let ts = lineH * 0.6;
      textSize(ts);
      text(txt, cxCell, cyCell);
      yAccum += lineH;
    }
    pop();
    return;
  }

  fill(textCol);
  noStroke();

  let yAccum = y;
  for (let j = 0; j < rows; j++) {
    let txt = cellWords[j];
    let lineH = lineHeights[j];

    if (!txt || txt.length === 0) {
      yAccum += lineH;
      continue;
    }

    let data = WORD_DATA[txt];
    if (!data) {
      yAccum += lineH;
      continue;
    }

    let bb = data.bb;
    let path = data.path;

    let sy = (bb.h !== 0) ? (lineH / bb.h) : 1;
    let targetWidth = max(1, w);
    let sx = (bb.w !== 0) ? (targetWidth / bb.w) : 1;

    let cxGlyph = bb.x + bb.w / 2;
    let cyGlyph = bb.y + bb.h / 2;
    let cxCell = x + w / 2;
    let cyCell = yAccum + lineH / 2;

    push();
    translate(cxCell, cyCell);
    scale(sx, sy);
    drawPathContours(path, cxGlyph, cyGlyph);
    pop();

    yAccum += lineH;
  }
}

function drawPathContours(path, cx, cy) {
  let contours = [];
  let current = [];

  for (let cmd of path.commands) {
    if (cmd.type === "M") {
      if (current.length) contours.push(current);
      current = [cmd];
    } else {
      current.push(cmd);
    }
    if (cmd.type === "Z") {
      contours.push(current);
      current = [];
    }
  }
  if (current.length) contours.push(current);

  beginShape();
  for (let c = 0; c < contours.length; c++) {
    let cmds = contours[c];
    let isHole = (c > 0);
    if (isHole) beginContour();

    for (let cmd of cmds) {
      switch (cmd.type) {
        case "M":
        case "L":
          vertex(cmd.x - cx, cmd.y - cy);
          break;
        case "C":
          bezierVertex(
            cmd.x1 - cx, cmd.y1 - cy,
            cmd.x2 - cx, cmd.y2 - cy,
            cmd.x - cx, cmd.y - cy
          );
          break;
        case "Q":
          quadraticVertex(
            cmd.x1 - cx, cmd.y1 - cy,
            cmd.x - cx, cmd.y - cy
          );
          break;
      }
    }
    if (isHole) endContour();
  }
  endShape(CLOSE);
}

function updatePaletteDisplay() {
  let pool = (colorMode === "bwRandom") ? BW_POOL : COLOR_POOL;
  let paletteGrid = document.getElementById('paletteGrid');
  if (!paletteGrid) return;

  paletteGrid.innerHTML = '';
  pool.forEach(c => {
    let div = document.createElement('div');
    div.className = 'palette-color';
    div.style.background = c;
    paletteGrid.appendChild(div);
  });
}

// ------------------------------------
// EVENT LISTENERS
// ------------------------------------

// Canvas size controls
const canvasSizeModeSelect = document.getElementById("canvasSizeModeSelect");
if (canvasSizeModeSelect) {
  canvasSizeModeSelect.addEventListener("change", () => {
    syncCanvasControlsFromDOM({ normalizeCustom: true });
    applyCanvasSize();
  });
}

const customWidthInputEl = document.getElementById("customWidthInput");
if (customWidthInputEl) {
  customWidthInputEl.addEventListener("input", (e) => {
    customWidthDraft = e.target.value;
    const wMaybe = parsePositiveIntOrNull(customWidthDraft);
    if (wMaybe !== null) customCanvasWidth = wMaybe;
    if (canvasSizeMode === "custom" && wMaybe !== null) applyCanvasSize();
  });

  customWidthInputEl.addEventListener("change", () => {
    syncCanvasControlsFromDOM({ normalizeCustom: true });
    if (canvasSizeMode === "custom") applyCanvasSize();
  });
}

const customHeightInputEl = document.getElementById("customHeightInput");
if (customHeightInputEl) {
  customHeightInputEl.addEventListener("input", (e) => {
    customHeightDraft = e.target.value;
    const hMaybe = parsePositiveIntOrNull(customHeightDraft);
    if (hMaybe !== null) customCanvasHeight = hMaybe;
    if (canvasSizeMode === "custom" && hMaybe !== null) applyCanvasSize();
  });

  customHeightInputEl.addEventListener("change", () => {
    syncCanvasControlsFromDOM({ normalizeCustom: true });
    if (canvasSizeMode === "custom") applyCanvasSize();
  });
}

// Grid sliders
const colSliderEl = document.getElementById('colSlider');
if (colSliderEl) {
  colSliderEl.addEventListener('input', (e) => {
    numCols = parseInt(e.target.value, 10);
    const v = document.getElementById('colValue');
    if (v) v.textContent = numCols;
  });
}

const rowSliderEl = document.getElementById('rowSlider');
if (rowSliderEl) {
  rowSliderEl.addEventListener('input', (e) => {
    numRows = parseInt(e.target.value, 10);
    const v = document.getElementById('rowValue');
    if (v) v.textContent = numRows;
  });
}

// Alternating rows controls
const alternatingRowsCheckbox = document.getElementById('alternatingRowsCheckbox');
if (alternatingRowsCheckbox) {
  alternatingRowsCheckbox.addEventListener('change', (e) => {
    useAlternatingRows = e.target.checked;
    if (e.target.checked) {
      useAutoRowCount = false;
      const autoCb = document.getElementById('autoRowCountCheckbox');
      if (autoCb) autoCb.checked = false;
    }
  });
}

const rowsCol1Slider = document.getElementById('rowsCol1Slider');
if (rowsCol1Slider) {
  rowsCol1Slider.addEventListener('input', (e) => {
    numRowsCol1 = parseInt(e.target.value, 10);
    const v = document.getElementById('rowsCol1Value');
    if (v) v.textContent = numRowsCol1;
  });
}

const rowsCol2Slider = document.getElementById('rowsCol2Slider');
if (rowsCol2Slider) {
  rowsCol2Slider.addEventListener('input', (e) => {
    numRowsCol2 = parseInt(e.target.value, 10);
    const v = document.getElementById('rowsCol2Value');
    if (v) v.textContent = numRowsCol2;
  });
}

// Auto row count controls
const autoRowCountCheckbox = document.getElementById('autoRowCountCheckbox');
if (autoRowCountCheckbox) {
  autoRowCountCheckbox.addEventListener('change', (e) => {
    useAutoRowCount = e.target.checked;
    if (e.target.checked) {
      useAlternatingRows = false;
      const altCb = document.getElementById('alternatingRowsCheckbox');
      if (altCb) altCb.checked = false;
    }
  });
}

const autoRowPatternSelect = document.getElementById('autoRowPatternSelect');
if (autoRowPatternSelect) {
  autoRowPatternSelect.addEventListener('change', (e) => {
    autoRowPattern = e.target.value;
  });
}

const autoRowMinSlider = document.getElementById('autoRowMinSlider');
if (autoRowMinSlider) {
  autoRowMinSlider.addEventListener('input', (e) => {
    autoRowMin = parseInt(e.target.value, 10);
    const v = document.getElementById('autoRowMinValue');
    if (v) v.textContent = autoRowMin;
  });
}

const autoRowMaxSlider = document.getElementById('autoRowMaxSlider');
if (autoRowMaxSlider) {
  autoRowMaxSlider.addEventListener('input', (e) => {
    autoRowMax = parseInt(e.target.value, 10);
    const v = document.getElementById('autoRowMaxValue');
    if (v) v.textContent = autoRowMax;
  });
}

// Color mode
const colorModeSelect = document.getElementById('colorModeSelect');
if (colorModeSelect) {
  colorModeSelect.addEventListener('change', (e) => {
    colorMode = e.target.value;
    updatePaletteDisplay();
    updateFixedModeColorsVisibility();
  });
}

// Text visibility
const textVisibilitySelect = document.getElementById('textVisibilitySelect');
if (textVisibilitySelect) {
  textVisibilitySelect.addEventListener('change', (e) => {
    textVisibility = e.target.value;
  });
}

// Color pattern
const patternSelect = document.getElementById('patternSelect');
if (patternSelect) {
  patternSelect.addEventListener('change', (e) => {
    colorPattern = e.target.value;
  });
}

// Color scale factor
const scaleFactorSlider = document.getElementById('scaleFactorSlider');
if (scaleFactorSlider) {
  scaleFactorSlider.addEventListener('input', (e) => {
    COLOR_SCALE_FACTOR = parseFloat(e.target.value);
    const v = document.getElementById('scaleFactorValue');
    if (v) v.textContent = COLOR_SCALE_FACTOR.toFixed(1);
  });
}

// Color bands
const bandsSlider = document.getElementById('bandsSlider');
if (bandsSlider) {
  bandsSlider.addEventListener('input', (e) => {
    COLOR_BANDS = parseInt(e.target.value, 10);
    const v = document.getElementById('bandsValue');
    if (v) v.textContent = COLOR_BANDS;
  });
}

// Fixed mode colors
const fixedBgColor = document.getElementById('fixedBgColor');
if (fixedBgColor) {
  fixedBgColor.addEventListener('input', (e) => {
    bgColorChoice = e.target.value;
    const v = document.getElementById('fixedBgColorValue');
    if (v) v.textContent = e.target.value.toUpperCase();
  });
}

const fixedFontColor = document.getElementById('fixedFontColor');
if (fixedFontColor) {
  fixedFontColor.addEventListener('input', (e) => {
    fontColorChoice = e.target.value;
    const v = document.getElementById('fixedFontColorValue');
    if (v) v.textContent = e.target.value.toUpperCase();
  });
}

// Column stretch controls
const colStretchModeEl = document.getElementById('colStretchMode');
if (colStretchModeEl) {
  colStretchModeEl.addEventListener('change', (e) => {
    colStretchMode = e.target.value;
  });
}

const colStretchSlider = document.getElementById('colStretchSlider');
if (colStretchSlider) {
  colStretchSlider.addEventListener('input', (e) => {
    colStretchManual = parseFloat(e.target.value);
    const v = document.getElementById('colStretchValue');
    if (v) v.textContent = colStretchManual.toFixed(2);
  });
}

// Row stretch controls
const rowStretchModeEl = document.getElementById('rowStretchMode');
if (rowStretchModeEl) {
  rowStretchModeEl.addEventListener('change', (e) => {
    rowStretchMode = e.target.value;
  });
}

const rowStretchSlider = document.getElementById('rowStretchSlider');
if (rowStretchSlider) {
  rowStretchSlider.addEventListener('input', (e) => {
    rowStretchManual = parseFloat(e.target.value);
    const v = document.getElementById('rowStretchValue');
    if (v) v.textContent = rowStretchManual.toFixed(2);
  });
}

// Inner line stretch controls
const innerStretchModeEl = document.getElementById('innerStretchMode');
if (innerStretchModeEl) {
  innerStretchModeEl.addEventListener('change', (e) => {
    innerStretchMode = e.target.value; // "animated" | "manual"
  });
}

// This slider controls the MANUAL "phase/time" used to freeze the inner animation.
const innerStretchSlider = document.getElementById('innerStretchSlider');
if (innerStretchSlider) {
  innerStretchSlider.addEventListener('input', (e) => {
    innerStretchManual = parseFloat(e.target.value);
    const v = document.getElementById('innerStretchValue');
    if (v) v.textContent = innerStretchManual.toFixed(2);
  });
}

// Export FPS slider
const exportFpsSlider = document.getElementById("exportFpsSlider");
if (exportFpsSlider) {
  exportFpsSlider.addEventListener("input", (e) => {
    exportFps = parseInt(e.target.value, 10);
    const v = document.getElementById("exportFpsValue");
    if (v) v.textContent = exportFps;
  });
}

// Export Duration slider
const exportDurSlider = document.getElementById("exportDurSlider");
if (exportDurSlider) {
  exportDurSlider.addEventListener("input", (e) => {
    exportDurationSec = parseInt(e.target.value, 10);
    const v = document.getElementById("exportDurValue");
    if (v) v.textContent = exportDurationSec;
  });
}

// Export button
const exportFramesBtn = document.getElementById("exportFramesBtn");
if (exportFramesBtn) {
  exportFramesBtn.addEventListener("click", () => {
    exportFramesAsZip();
  });
}

// Save button
const saveBtn = document.getElementById('saveBtn');
if (saveBtn) {
  saveBtn.addEventListener('click', () => {
    saveCanvas('modulo-pattern', 'png');
  });
}

// Word selection dropdowns
const prefixSelect = document.getElementById('prefixSelect');
if (prefixSelect) {
  prefixSelect.addEventListener('change', (e) => {
    selectedPrefix = e.target.value;
  });
}

const line3Select = document.getElementById('line3Select');
if (line3Select) {
  line3Select.addEventListener('change', (e) => {
    selectedLine3Word = e.target.value;
  });
}

// Text mode select (lists vs symbol)
const textModeSelect = document.getElementById("textModeSelect");
if (textModeSelect) {
  textModeSelect.addEventListener("change", (e) => {
    textMode = e.target.value;
    applyTextModeUI();
  });
}

// Toggle panel
const toggleBtn = document.getElementById('toggleBtn');
if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    const panel = document.getElementById('sidePanel');
    const btn = document.getElementById('toggleBtn');
    if (panel) panel.classList.toggle('collapsed');
    if (btn) btn.classList.toggle('active');
  });
}

function initPanelAccordions(panelId, maxOpen = 2) {
  const panel = document.getElementById(panelId);
  if (!panel) return;

  const groups = Array.from(panel.querySelectorAll(".panel-group"));

  // Track open order (oldest -> newest)
  const openOrder = [];

  function closeGroup(g) {
    const c = g.querySelector(":scope > .panel-content");
    if (!c) return;
    g.classList.remove("is-open");
    c.style.maxHeight = "0px";

    const idx = openOrder.indexOf(g);
    if (idx !== -1) openOrder.splice(idx, 1);
  }

  function openGroup(g) {
    const c = g.querySelector(":scope > .panel-content");
    if (!c) return;

    g.classList.add("is-open");
    c.style.maxHeight = c.scrollHeight + "px";

    // refresh order
    const idx = openOrder.indexOf(g);
    if (idx !== -1) openOrder.splice(idx, 1);
    openOrder.push(g);

    // enforce max open
    while (openOrder.length > maxOpen) {
      closeGroup(openOrder[0]); // close oldest
    }
  }

  groups.forEach((group) => {
    const title = group.querySelector(":scope > .group-title");
    if (!title) return;

    // Create content wrapper if not already created
    let content = group.querySelector(":scope > .panel-content");
    if (!content) {
      content = document.createElement("div");
      content.className = "panel-content";

      // Move everything except the title into the content wrapper
      const kids = Array.from(group.children);
      kids.forEach((el) => {
        if (el !== title) content.appendChild(el);
      });
      group.appendChild(content);
    }

    // default closed
    group.classList.remove("is-open");
    content.style.maxHeight = "0px";

    title.addEventListener("click", () => {
      const isOpen = group.classList.contains("is-open");
      if (isOpen) {
        closeGroup(group);
      } else {
        openGroup(group);
      }
    });
  });

  // Keep heights correct if content changes (e.g. fixed colors block shows/hides)
  const ro = new ResizeObserver(() => {
    groups.forEach((g) => {
      if (!g.classList.contains("is-open")) return;
      const c = g.querySelector(":scope > .panel-content");
      if (!c) return;
      c.style.maxHeight = c.scrollHeight + "px";
    });
  });
  ro.observe(panel);
}

function refreshOpenAccordionHeightFrom(el) {
  const content = el?.closest(".panel-content");
  const group = content?.closest(".panel-group");
  if (!content || !group) return;

  if (group.classList.contains("is-open")) {
    // Wait a frame so layout recalculates after display change
    requestAnimationFrame(() => {
      content.style.maxHeight = content.scrollHeight + "px";
    });
  }
}


// Init for both panels
window.addEventListener("DOMContentLoaded", () => {
  initPanelAccordions("sidePanel", 2);
  initPanelAccordions("sidePanelRight", 2);
});



