let cols = 2, rows = 2;
let scaleCols = [], scaleRows = [];
let letters = [];

let activeColCell = null;
let activeRowCell = null;
let colSumBefore, colGroupSum, totalColSum;
let rowSumBefore, rowGroupSum, totalRowSum;
let shuffleBtn;

const PANEL_H = 50;
const MIN_FACTOR = 0.1;

let canvasElem;
let colSlider, rowSlider, colValLabel, rowValLabel;

function setup() {
  // 1) create the canvas
  canvasElem = createCanvas(windowWidth, windowHeight);
  noStroke();

  // 2) grab the HTML controls
  colSlider   = document.getElementById('colSlider');
  rowSlider   = document.getElementById('rowSlider');
  colValLabel = document.getElementById('colVal');
  rowValLabel = document.getElementById('rowVal');

  // 3) initialize labels to match the starting values
  cols = +colSlider.value;
  rows = +rowSlider.value;
  colValLabel.textContent = cols;
  rowValLabel.textContent = rows;

  // 4) listen for slider changes
  colSlider.addEventListener('input', () => {
    cols = +colSlider.value;
    colValLabel.textContent = cols;
    initScales();
  });
  rowSlider.addEventListener('input', () => {
    rows = +rowSlider.value;
    rowValLabel.textContent = rows;
    initScales();
  });

  // 5) set up your data
  initScales();

  // 6) disable default touch gestures on the canvas
  canvasElem.elt.style.touchAction = 'none';

  // 7) pointer event wiring
  canvasElem.elt.addEventListener('pointerdown', e => {
    const { x, y } = toCanvasCoords(e);
    handlePress(x, y);
    e.preventDefault();
  }, { passive: false });
  canvasElem.elt.addEventListener('pointermove', e => {
    const { x, y } = toCanvasCoords(e);
    handleCursor(x, y);
    if (activeColCell !== null || activeRowCell !== null) {
      handleDrag(x, y);
      e.preventDefault();
    }
  }, { passive: false });
  canvasElem.elt.addEventListener('pointerup', e => {
    activeColCell = activeRowCell = null;
    e.preventDefault();
  }, { passive: false });

  // 8) shuffle button (mobile only)
  const shuffleBtn = document.getElementById('shuffleBtn');
  if (shuffleBtn) {
    shuffleBtn.addEventListener('click', shuffleLetters);
  }
}


function toCanvasCoords(e) {
  const rect = canvasElem.elt.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function shuffleLetters() {
  // cycle every cell’s letter by +1 (A→B→C…→Z→A)
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      let code = letters[i][j].charCodeAt(0);
      // shift within 65–90 (A–Z):
      code = (code - 65 + 1) % 26 + 65;
      letters[i][j] = char(code);
    }
  }
}


function initScales() {
  // initialize grid state
  scaleCols = Array(cols).fill(1);
  scaleRows = Array(rows).fill(1);

  letters = [];
  let code = 65;
  for (let i = 0; i < cols; i++) {
    letters[i] = [];
    for (let j = 0; j < rows; j++) {
      letters[i][j] = char(code);
      code = code < 90 ? code + 1 : 65;
    }
  }
}

function draw() {
  background(255);
  let gridW = width;
  let gridH = height - PANEL_H;

  // update sums
  totalColSum = scaleCols.reduce((a, b) => a + b, 0);
  totalRowSum = scaleRows.reduce((a, b) => a + b, 0);

  // compute grid positions
  let xCum = 0, yCum = 0;
  let xPos = [], yPos = [];
  for (let i = 0; i < cols; i++) {
    xPos[i] = xCum / totalColSum * gridW;
    xCum += scaleCols[i];
  }
  xPos[cols] = gridW;
  for (let j = 0; j < rows; j++) {
    yPos[j] = yCum / totalRowSum * gridH;
    yCum += scaleRows[j];
  }
  yPos[rows] = gridH;

  // draw cells
  fill(0);
  for (let i = 0; i < cols; i++){
    for (let j = 0; j < rows; j++){
      rect(xPos[i], yPos[j],
           xPos[i+1] - xPos[i],
           yPos[j+1] - yPos[j]);
    }
  }

  // draw letters stretched to fill cell
  textFont('Helvetica');
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  fill(255);
  const BASE = 100;
  textSize(BASE);
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      let x = xPos[i], y = yPos[j];
      let w = xPos[i+1] - x,
          h = yPos[j+1] - y;
  
      // your base character (e.g. 'a'…'z' or whatever)
      //let base = letters[i][j];      
  
      // randomly choose upper or lower
      //let ch = (random() < 1)
        //? base.toLowerCase()
       // : base.toUpperCase();

        let ch = letters[i][j];
  
      let glyphW = textWidth(ch),
          glyphH = textAscent() + textDescent();
  
      let sx = w / glyphW,
          sy = h / glyphH;
  
      push();
        translate(x + w/2, y + h/2);
        scale(sx, sy);
        text(ch, 0, 0);
      pop();
    }
  }
  

  // bottom panel (just for context—Col/Row labels are in HTML now)
  fill(0);
  noStroke();
  rect(0, gridH, width, PANEL_H);
}

function mouseWheel(event) {
  // cycle every cell’s letter on scroll
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      let code = letters[i][j].charCodeAt(0);
      code = (code - 65 + 1) % 26 + 65;
      letters[i][j] = char(code);
    }
  }
  return false; // prevent page scroll
}

function handleCursor(mx, my) {
  let gridW = width, gridH = height - PANEL_H;
  let xCum = 0, yCum = 0;
  let xPos = [], yPos = [];
  for (let i = 0; i < cols; i++){
    xPos[i] = xCum / totalColSum * gridW; xCum += scaleCols[i];
  }
  xPos[cols] = gridW;
  for (let j = 0; j < rows; j++){
    yPos[j] = yCum / totalRowSum * gridH; yCum += scaleRows[j];
  }
  yPos[rows] = gridH;

  let iHit = -1, jHit = -1;
  if (my < gridH) {
    for (let i = 0; i < cols; i++) if (mx >= xPos[i] && mx < xPos[i+1]) iHit = i;
    for (let j = 0; j < rows; j++) if (my >= yPos[j] && my < yPos[j+1]) jHit = j;
  }

  if ((iHit >= 0 && iHit < cols-1) || (jHit >= 0 && jHit < rows-1)) {
    canvasElem.style('cursor', 'pointer');
  } else {
    canvasElem.style('cursor', 'default');
  }
}

function handlePress(mx, my) {
  let gridW = width, gridH = height - PANEL_H;
  let xCum = 0, yCum = 0;
  let xPos = [], yPos = [];
  for (let i = 0; i < cols; i++){
    xPos[i] = xCum / totalColSum * gridW; xCum += scaleCols[i];
  }
  xPos[cols] = gridW;
  for (let j = 0; j < rows; j++){
    yPos[j] = yCum / totalRowSum * gridH; yCum += scaleRows[j];
  }
  yPos[rows] = gridH;

  let iHit = -1, jHit = -1;
  for (let i = 0; i < cols; i++){
    if (mx >= xPos[i] && mx < xPos[i+1]) iHit = i;
  }
  for (let j = 0; j < rows; j++){
    if (my >= yPos[j] && my < yPos[j+1]) jHit = j;
  }

  activeColCell = (iHit >= 0 && iHit < cols-1) ? iHit : null;
  if (activeColCell !== null) {
    colSumBefore = scaleCols.slice(0, activeColCell).reduce((a,b)=>a+b,0);
    colGroupSum = scaleCols[activeColCell] + scaleCols[activeColCell+1];
    totalColSum = scaleCols.reduce((a,b)=>a+b,0);
  }

  activeRowCell = (jHit >= 0 && jHit < rows-1) ? jHit : null;
  if (activeRowCell !== null) {
    rowSumBefore = scaleRows.slice(0, activeRowCell).reduce((a,b)=>a+b,0);
    rowGroupSum = scaleRows[activeRowCell] + scaleRows[activeRowCell+1];
    totalRowSum = scaleRows.reduce((a,b)=>a+b,0);
  }
}

function handleDrag(mx, my) {
  let gridW = width, gridH = height - PANEL_H;
  if (activeColCell !== null) {
    let desired = constrain(
      (mx / gridW) * totalColSum,
      colSumBefore + MIN_FACTOR,
      colSumBefore + colGroupSum - MIN_FACTOR
    );
    let newA = desired - colSumBefore;
    scaleCols[activeColCell]   = newA;
    scaleCols[activeColCell+1] = colGroupSum - newA;
  }
  if (activeRowCell !== null) {
    let desired = constrain(
      (my / gridH) * totalRowSum,
      rowSumBefore + MIN_FACTOR,
      rowSumBefore + rowGroupSum - MIN_FACTOR
    );
    let newA = desired - rowSumBefore;
    scaleRows[activeRowCell]   = newA;
    scaleRows[activeRowCell+1] = rowGroupSum - newA;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
