//flame render, blow-out logic

import { state } from './state.js';

// ─────────────────────────────────────────────
//  Shared candle list
// ─────────────────────────────────────────────
export let candles = [];

// Called by cake.js after layout is known
export function initCandles(p, cakeX, cakeTopY, cakeWidth) {
  candles = [];
  state.candlesBlown = 0;
  state.allBlownOut  = false;

  if (state.candleMode === 'number') {
    _initNumberCandles(p, cakeX, cakeTopY, cakeWidth);
  } else {
    _initStickCandles(p, cakeX, cakeTopY, cakeWidth);
  }
}

// ─────────────────────────────────────────────
//  STICK candles
// ─────────────────────────────────────────────
function _initStickCandles(p, cakeX, cakeTopY, cakeWidth) {
  const count   = state.candleCount;
  const spacing = (cakeWidth * 0.72) / (count + 1);
  const startX  = cakeX - (cakeWidth * 0.36) + spacing;

  for (let i = 0; i < count; i++) {
    candles.push({ kind: 'stick', x: startX + i * spacing, y: cakeTopY, blown: false });
  }
}

// ─────────────────────────────────────────────
//  NUMBER candles  (Option A — drawn with p5 paths)
// ─────────────────────────────────────────────
function _initNumberCandles(p, cakeX, cakeTopY, cakeWidth) {
  const digits = String(state.ageNumber).replace(/[^0-9]/g, '').slice(0, 3) || '1';
  const dw = 38;   // digit glyph width
  const gap = 14;  // gap between digits
  const total = digits.length * dw + (digits.length - 1) * gap;
  const startX = cakeX - total / 2 + dw / 2;

  for (let i = 0; i < digits.length; i++) {
    candles.push({
      kind:  'number',
      digit: digits[i],
      x:     startX + i * (dw + gap),
      y:     cakeTopY,
      blown: false,
    });
  }
}

// ─────────────────────────────────────────────
//  DRAW dispatcher
// ─────────────────────────────────────────────
export function drawCandles(p) {
  candles.forEach(c => {
    if (c.kind === 'number') {
      _drawNumberCandle(p, c);
    } else {
      _drawStickCandle(p, c);
    }
  });
}

// ─────────────────────────────────────────────
//  Stick candle renderer
// ─────────────────────────────────────────────
function _drawStickCandle(p, c) {
  // Wax stick
  p.noStroke();
  p.fill(255, 220, 100);
  p.rect(c.x - 5, c.y - 44, 10, 44, 3);

  // Wick
  p.stroke(80, 60, 30);
  p.strokeWeight(1.5);
  p.line(c.x, c.y - 44, c.x, c.y - 50);
  p.noStroke();

  if (!c.blown) {
    _drawFlame(p, c.x, c.y - 50);
  } else {
    _drawSmoke(p, c.x, c.y - 50);
  }
}

// ─────────────────────────────────────────────
//  Number candle renderer  (7-segment style)
// ─────────────────────────────────────────────
// Digit height = 70px, width = 38px
// Segments: top, topL, topR, mid, botL, botR, bot
// Each segment is a thin rounded rectangle.
//
// Segment map per digit (true = lit):
// top  tL  tR  mid  bL  bR  bot
const SEG = {
  '0': [1, 1, 1, 0, 1, 1, 1],
  '1': [0, 0, 1, 0, 0, 1, 0],
  '2': [1, 0, 1, 1, 1, 0, 1],
  '3': [1, 0, 1, 1, 0, 1, 1],
  '4': [0, 1, 1, 1, 0, 1, 0],
  '5': [1, 1, 0, 1, 0, 1, 1],
  '6': [1, 1, 0, 1, 1, 1, 1],
  '7': [1, 0, 1, 0, 0, 1, 0],
  '8': [1, 1, 1, 1, 1, 1, 1],
  '9': [1, 1, 1, 1, 0, 1, 1],
};

function _drawNumberCandle(p, c) {
  const dw  = 34;  // glyph width
  const dh  = 68;  // glyph height
  const sw  = 7;   // segment thickness
  const sr  = 3;   // segment corner radius
  const x   = c.x - dw / 2;
  const top = c.y - dh - 20;  // top of glyph (20px stick below)

  // ── Metallic stick below digit ──
  p.noStroke();
  _metalFill(p, 'gold');
  p.rect(c.x - 4, c.y - 20, 8, 22, 3);

  // ── Tip pin ──
  p.fill(180, 160, 80);
  p.ellipse(c.x, c.y + 2, 5, 5);

  // ── Digit body background (subtle dark rounded rect) ──
  p.fill(30, 20, 40, 200);
  p.rect(x - 3, top - 3, dw + 6, dh + 6, 6);

  // ── Draw segments ──
  const segs = SEG[c.digit] || SEG['8'];

  // Segment positions (relative to glyph top-left corner x, top):
  // Horizontal segs: top, mid, bot
  // Vertical segs: topL, topR, botL, botR
  const hLen = dw - sw * 2 - 4;  // horizontal bar length
  const vLen = dh / 2 - sw - 3;  // vertical bar height

  const hx = x + sw + 2;         // horizontal bar start x
  const ty = top;                 // top horizontal y
  const my = top + dh / 2 - sw / 2;  // mid horizontal y
  const by = top + dh - sw;      // bottom horizontal y

  const lx = x;                  // left vertical x
  const rx = x + dw - sw;        // right vertical x
  const tvy = top + sw + 1;      // top vertical start y
  const bvy = my + sw + 1;       // bottom vertical start y

  // Unlit segment (dim gold, very faint)
  const unlitAlpha = 40;

  function hSeg(lit, sx, sy) {
    _metalFill(p, lit ? 'gold' : 'dim', lit ? 255 : unlitAlpha);
    p.rect(sx, sy, hLen, sw, sr);
  }

  function vSeg(lit, sx, sy) {
    _metalFill(p, lit ? 'gold' : 'dim', lit ? 255 : unlitAlpha);
    p.rect(sx, sy, sw, vLen, sr);
  }

  p.noStroke();
  hSeg(segs[0], hx, ty);          // top
  vSeg(segs[1], lx, tvy);         // top-left
  vSeg(segs[2], rx, tvy);         // top-right
  hSeg(segs[3], hx, my);          // middle
  vSeg(segs[4], lx, bvy);         // bottom-left
  vSeg(segs[5], rx, bvy);         // bottom-right
  hSeg(segs[6], hx, by);          // bottom

  // ── Gold sheen overlay (metallic highlight) ──
  p.fill(255, 245, 180, 18);
  p.rect(x, top, dw / 2, dh, 4);

  // ── Flame or smoke ──
  const flameY = top - 8;
  if (!c.blown) {
    _drawFlame(p, c.x, flameY);
  } else {
    _drawSmoke(p, c.x, flameY);
  }
}

// ─────────────────────────────────────────────
//  Metallic gold fill helper
// ─────────────────────────────────────────────
function _metalFill(p, variant = 'gold', alpha = 255) {
  if (variant === 'gold') {
    p.fill(212, 175, 55, alpha);
  } else if (variant === 'dark') {
    p.fill(160, 120, 20, alpha);
  } else {
    // dim (unlit segment)
    p.fill(80, 65, 20, alpha);
  }
}

// ─────────────────────────────────────────────
//  Flame
// ─────────────────────────────────────────────
function _drawFlame(p, x, y) {
  const t = p.frameCount * 0.2;
  const flicker = p.sin(t) * 2.5;

  // Outer glow
  p.noStroke();
  p.fill(255, 120, 0, 100);
  p.ellipse(x, y - 10 + flicker * 0.4, 18, 26);

  // Main flame body
  p.fill(255, 140, 0, 220);
  p.beginShape();
  p.vertex(x, y - 26 + flicker);
  p.bezierVertex(x + 8, y - 16, x + 9, y - 4, x, y);
  p.bezierVertex(x - 9, y - 4, x - 8, y - 16, x, y - 26 + flicker);
  p.endShape(p.CLOSE);

  // Inner flame
  p.fill(255, 220, 60, 240);
  p.beginShape();
  p.vertex(x, y - 20 + flicker * 0.6);
  p.bezierVertex(x + 5, y - 12, x + 4, y - 3, x, y - 1);
  p.bezierVertex(x - 4, y - 3, x - 5, y - 12, x, y - 20 + flicker * 0.6);
  p.endShape(p.CLOSE);

  // Core
  p.fill(255, 255, 200, 200);
  p.ellipse(x, y - 7, 5, 8);
}

// ─────────────────────────────────────────────
//  Smoke after blow-out
// ─────────────────────────────────────────────
function _drawSmoke(p, x, y) {
  const t = p.frameCount * 0.04;
  p.noFill();
  p.strokeWeight(1.5);
  for (let i = 0; i < 3; i++) {
    const offset = (i - 1) * 4;
    p.stroke(200, 200, 200, 60 - i * 15);
    p.beginShape();
    for (let j = 0; j < 12; j++) {
      const sy = y - j * 3;
      const sx = x + offset + p.sin(t + j * 0.6 + i) * (j * 0.7);
      p.curveVertex(sx, sy);
    }
    p.endShape();
  }
  p.noStroke();
}

// ─────────────────────────────────────────────
//  Blow out next candle (called by audio.js)
// ─────────────────────────────────────────────
export function blowOutNext() {
  const remaining = candles.filter(c => !c.blown);
  if (remaining.length === 0) return;

  // Pick random unblown candle
  const pick = remaining[Math.floor(Math.random() * remaining.length)];
  pick.blown = true;
  state.candlesBlown++;

  if (state.candlesBlown >= candles.length) {
    state.allBlownOut = true;
  }
}