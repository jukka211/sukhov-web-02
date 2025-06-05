// sketch.js

let myFont;
let cols = 2, rows = 2;
let scaleCols = [], scaleRows = [];
let letters = [];

let activeColCell = null, activeRowCell = null;
let colSumBefore, colGroupSum, totalColSum;
let rowSumBefore, rowGroupSum, totalRowSum;

const PANEL_H = 50;
const MIN_FACTOR = 0.1;

let canvasElem;
let colSlider, rowSlider, colValLabel, rowValLabel;

function preload() {
  // Load a TTF/OTF so that myFont.font is an opentype.js Font
  // Put your font under assets/, e.g. assets/Helvetica.ttf
  myFont = loadFont('Arial Bold.ttf');
}

function setup() {
  canvasElem = createCanvas(windowWidth, windowHeight);
  noFill();
  stroke(255);

  // Grab the HTML controls (make sure these exist in your HTML)
  colSlider   = document.getElementById('colSlider');
  rowSlider   = document.getElementById('rowSlider');
  colValLabel = document.getElementById('colVal');
  rowValLabel = document.getElementById('rowVal');

  cols = +colSlider.value;
  rows = +rowSlider.value;
  colValLabel.textContent = cols;
  rowValLabel.textContent = rows;

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

  initScales();

  canvasElem.elt.style.touchAction = 'none';
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

  const shuffleBtn = document.getElementById('shuffleBtn');
  if (shuffleBtn) {
    shuffleBtn.addEventListener('click', shuffleLetters);
  }
}

function initScales() {
  scaleCols = Array(cols).fill(1);
  scaleRows = Array(rows).fill(1);

  letters = [];
  let code = 65; // 'A'
  for (let i = 0; i < cols; i++) {
    letters[i] = [];
    for (let j = 0; j < rows; j++) {
      letters[i][j] = char(code);
      code = (code < 90) ? code + 1 : 65;
    }
  }
}

function draw() {
  background(0);
  let gridW = width;
  let gridH = height - PANEL_H;

  totalColSum = scaleCols.reduce((a, b) => a + b, 0);
  totalRowSum = scaleRows.reduce((a, b) => a + b, 0);

  // Compute column x‐positions and row y‐positions
  let xCum = 0, yCum = 0;
  let xPos = [], yPos = [];
  for (let i = 0; i < cols; i++) {
    xPos[i] = (xCum / totalColSum) * gridW;
    xCum += scaleCols[i];
  }
  xPos[cols] = gridW;
  for (let j = 0; j < rows; j++) {
    yPos[j] = (yCum / totalRowSum) * gridH;
    yCum += scaleRows[j];
  }
  yPos[rows] = gridH;

  // Draw each cell’s black background
  noStroke();
  fill(0);
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      rect(
        xPos[i],
        yPos[j],
        xPos[i + 1] - xPos[i],
        yPos[j + 1] - yPos[j]
      );
    }
  }

  // Draw each letter as a filled vector with 10px padding (white fill on black)
  noStroke();
  fill(255);

  const PADDING = 5; // 10px padding around each letter

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      let ch = letters[i][j];

      // 1) Compute bounding box at a base size
      const baseSize = 200;
      let bb = myFont.textBounds(ch, 0, 0, baseSize);
      //    bb.x, bb.y = top-left of glyph box relative to baseline origin
      //    bb.w, bb.h = width & height of glyph (no extra padding)

      // 2) Grab the raw Bézier-path commands from opentype.js
      let path = myFont.font.getPath(ch, 0, 0, baseSize);
      //    path.commands is an array of {type, x, y, x1, y1, x2, y2}

      // 3) Compute this cell’s rectangle in screen coordinates
      let x0 = xPos[i];
      let y0 = yPos[j];
      let w  = xPos[i + 1] - x0;
      let h  = yPos[j + 1] - y0;

      // 4) Adjust for padding: inset the rectangle by PADDING on all sides
      let wInner = max(0, w  - 2 * PADDING);
      let hInner = max(0, h  - 2 * PADDING);

      // 5) Figure scale so that bb.w → wInner and bb.h → hInner
      let sx = wInner / bb.w;
      let sy = hInner / bb.h;

      // 6) Glyph’s center, and adjusted cell center (same center)
      let cxGlyph = bb.x + bb.w / 2;
      let cyGlyph = bb.y + bb.h / 2;
      let cxCell  = x0 + w / 2;
      let cyCell  = y0 + h / 2;

      push();
        translate(cxCell, cyCell);
        scale(sx, sy);

        // 7) Split path.commands into contours
        let contours = [];
        let current = [];
        for (let cmd of path.commands) {
          if (cmd.type === 'M') {
            if (current.length) {
              contours.push(current);
            }
            current = [cmd];
          } else {
            current.push(cmd);
          }
          if (cmd.type === 'Z') {
            contours.push(current);
            current = [];
          }
        }
        if (current.length) {
          contours.push(current);
        }

        // 8) Draw all contours in one beginShape/endShape,
        //    wrapping inner ones in beginContour()/endContour()
        beginShape();
        for (let c = 0; c < contours.length; c++) {
          let cmds = contours[c];
          let isHole = (c > 0);

          if (isHole) beginContour();

          for (let cmd of cmds) {
            switch (cmd.type) {
              case 'M':
                vertex(cmd.x - cxGlyph, cmd.y - cyGlyph);
                break;
              case 'L':
                vertex(cmd.x - cxGlyph, cmd.y - cyGlyph);
                break;
              case 'C':
                bezierVertex(
                  cmd.x1 - cxGlyph, cmd.y1 - cyGlyph,
                  cmd.x2 - cxGlyph, cmd.y2 - cyGlyph,
                  cmd.x  - cxGlyph, cmd.y  - cyGlyph
                );
                break;
              case 'Q':
                quadraticVertex(
                  cmd.x1 - cxGlyph, cmd.y1 - cyGlyph,
                  cmd.x  - cxGlyph, cmd.y  - cyGlyph
                );
                break;
              case 'Z':
                // closePath: handled by endContour/endShape below
                break;
            }
          }

          if (isHole) endContour();
        }
        endShape(CLOSE);

      pop();
    }
  }

  // Draw bottom panel (for context—HTML controls are above)
  noStroke();
  fill(0);
  rect(0, gridH, width, PANEL_H);
}

function shuffleLetters() {
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      let code = letters[i][j].charCodeAt(0);
      letters[i][j] = char((code - 65 + 1) % 26 + 65);
    }
  }
}

function mouseWheel(event) {
  shuffleLetters();
  return false; // prevent page scroll
}

function handleCursor(mx, my) {
  let gridW = width, gridH = height - PANEL_H;
  let xCum = 0, yCum = 0;
  let xPos = [], yPos = [];
  for (let i = 0; i < cols; i++) {
    xPos[i] = (xCum / totalColSum) * gridW;
    xCum += scaleCols[i];
  }
  xPos[cols] = gridW;
  for (let j = 0; j < rows; j++) {
    yPos[j] = (yCum / totalRowSum) * gridH;
    yCum += scaleRows[j];
  }
  yPos[rows] = gridH;

  let iHit = -1, jHit = -1;
  if (my < gridH) {
    for (let i = 0; i < cols; i++) {
      if (mx >= xPos[i] && mx < xPos[i + 1]) iHit = i;
    }
    for (let j = 0; j < rows; j++) {
      if (my >= yPos[j] && my < yPos[j + 1]) jHit = j;
    }
  }

  if ((iHit >= 0 && iHit < cols - 1) || (jHit >= 0 && jHit < rows - 1)) {
    canvasElem.style('cursor', 'pointer');
  } else {
    canvasElem.style('cursor', 'default');
  }
}

function handlePress(mx, my) {
  let gridW = width, gridH = height - PANEL_H;
  let xCum = 0, yCum = 0;
  let xPos = [], yPos = [];
  for (let i = 0; i < cols; i++) {
    xPos[i] = (xCum / totalColSum) * gridW;
    xCum += scaleCols[i];
  }
  xPos[cols] = gridW;
  for (let j = 0; j < rows; j++) {
    yPos[j] = (yCum / totalRowSum) * gridH;
    yCum += scaleRows[j];
  }
  yPos[rows] = gridH;

  let iHit = -1, jHit = -1;
  for (let i = 0; i < cols; i++) {
    if (mx >= xPos[i] && mx < xPos[i + 1]) iHit = i;
  }
  for (let j = 0; j < rows; j++) {
    if (my >= yPos[j] && my < yPos[j + 1]) jHit = j;
  }

  activeColCell = (iHit >= 0 && iHit < cols - 1) ? iHit : null;
  if (activeColCell !== null) {
    colSumBefore = scaleCols.slice(0, activeColCell).reduce((a, b) => a + b, 0);
    colGroupSum  = scaleCols[activeColCell] + scaleCols[activeColCell + 1];
    totalColSum  = scaleCols.reduce((a, b) => a + b, 0);
  }

  activeRowCell = (jHit >= 0 && jHit < rows - 1) ? jHit : null;
  if (activeRowCell !== null) {
    rowSumBefore = scaleRows.slice(0, activeRowCell).reduce((a, b) => a + b, 0);
    rowGroupSum  = scaleRows[activeRowCell] + scaleRows[activeRowCell + 1];
    totalRowSum  = scaleRows.reduce((a, b) => a + b, 0);
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
    scaleCols[activeColCell + 1] = colGroupSum - newA;
  }
  if (activeRowCell !== null) {
    let desired = constrain(
      (my / gridH) * totalRowSum,
      rowSumBefore + MIN_FACTOR,
      rowSumBefore + rowGroupSum - MIN_FACTOR
    );
    let newA = desired - rowSumBefore;
    scaleRows[activeRowCell]   = newA;
    scaleRows[activeRowCell + 1] = rowGroupSum - newA;
  }
}

function toCanvasCoords(e) {
  const rect = canvasElem.elt.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
