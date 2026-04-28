//p5.js sketch, draws cake
import { state } from './state.js';
import { initCandles, drawCandles, candles } from './candles.js';
import { triggerWish } from './confetti.js';

let cakeX, cakeTopY, cakeWidth;
let wishTriggered = false;
let prevMode = null;
let prevCount = null;
let prevAge = null;

function _canvasWidth() {
  // On mobile fill the container; on desktop cap at 540
  const container = document.getElementById('cake-canvas');
  const available = container ? container.offsetWidth : window.innerWidth;
  return Math.min(540, available || 540);
}

const sketch = (p) => {
  p.setup = () => {
    const w = _canvasWidth();
    const h = Math.round(w * (500 / 540));
    const canvas = p.createCanvas(w, h);
    canvas.parent('cake-canvas');
    _setupLayout(p);
  };

  p.windowResized = () => {
    const w = _canvasWidth();
    const h = Math.round(w * (500 / 540));
    p.resizeCanvas(w, h);
    _setupLayout(p);
  };

  p.draw = () => {
    p.background(15, 15, 26);

    // Re-init candles if config changed
    const modeChanged  = state.candleMode !== prevMode;
    const countChanged = state.candleCount !== prevCount;
    const ageChanged   = state.ageNumber !== prevAge;

    if (modeChanged || countChanged || ageChanged) {
      prevMode  = state.candleMode;
      prevCount = state.candleCount;
      prevAge   = state.ageNumber;
      wishTriggered = false;
      initCandles(p, cakeX, cakeTopY, cakeWidth);
    }

    _drawTable(p);
    _drawCakeTiers(p);
    drawCandles(p);
    _drawNameTag(p);
    _drawSprinkles(p);

    if (state.allBlownOut && !wishTriggered) {
      wishTriggered = true;
      triggerWish();
    }
  };
};

function _setupLayout(p) {
  cakeX     = p.width / 2;
  cakeWidth = 300;
  cakeTopY  = Math.round(p.height * 0.35);
  initCandles(p, cakeX, cakeTopY, cakeWidth);
}

function _drawTable(p) {
  p.fill(40, 30, 55, 120);
  p.noStroke();
  p.ellipse(cakeX, p.height * 0.8, cakeWidth + 80, 22);
}

function _drawCakeTiers(p) {
  const base  = Math.round(p.height * 0.78);
  const col   = p.color(state.cakeColor);
  const frost = p.color(state.frostingColor);

  _drawTier(p, cakeX, base,       cakeWidth,        88,  col, frost);
  _drawTier(p, cakeX, base - 88,  cakeWidth * 0.72, 72,  col, frost);
  _drawTier(p, cakeX, base - 160, cakeWidth * 0.46, 58,  col, frost);
}

function _drawTier(p, x, baseY, w, h, col, frost) {
  const half = w / 2;

  // Cake body
  p.fill(col);
  p.noStroke();
  p.rect(x - half, baseY - h, w, h, 5);

  // Side shadow for depth
  p.fill(0, 0, 0, 40);
  p.rect(x + half - 14, baseY - h + 6, 12, h - 12, 3);

  // Frosting layer
  p.fill(frost);
  p.rect(x - half, baseY - h - 10, w, 18, 8);

  // Frosting drips
  const dripCount = Math.max(3, Math.floor(w / 30));
  for (let i = 0; i < dripCount; i++) {
    const dx = x - half + 18 + i * ((w - 30) / (dripCount - 1));
    const dripH = 10 + ((i * 3) % 11);
    p.fill(frost);
    p.ellipse(dx, baseY - h + 9, 11, dripH);
  }

  // Highlight
  p.fill(255, 255, 255, 22);
  p.rect(x - half + 4, baseY - h + 4, 14, h - 8, 3);
}

function _drawNameTag(p) {
  const base = Math.round(p.height * 0.78);
  const tagY = base - 50;

  p.textAlign(p.CENTER, p.CENTER);
  p.textStyle(p.BOLD);
  p.textSize(17);

  // Shadow
  p.fill(0, 0, 0, 100);
  p.text(state.name, cakeX + 1, tagY + 1);

  // Text
  p.fill(255, 240, 255);
  p.text(state.name, cakeX, tagY);
  p.textStyle(p.NORMAL);
}

function _drawSprinkles(p) {
  p.randomSeed(99);
  const base = Math.round(p.height * 0.78);
  const colors = ['#FF6B9D','#FFD93D','#6BCB77','#4D96FF','#FF6B6B','#C77DFF'];

  for (let i = 0; i < 48; i++) {
    const sx = cakeX + p.random(-138, 138);
    const sy = base  - p.random(12, 248);
    const c  = colors[Math.floor(p.random(colors.length))];
    p.fill(c);
    p.noStroke();
    p.push();
    p.translate(sx, sy);
    p.rotate(p.random(p.TWO_PI));
    p.rect(-3, -1.5, 7, 3, 2);
    p.pop();
  }
}

// Boot p5
new p5(sketch);