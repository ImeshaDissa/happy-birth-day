// candles.js – stick candles + realistic 3-D number candles
import { state } from './state.js';

export let candles = [];
let candleParent = null;

// ── Materials / colours ──────────────────────────────────────
const STICK_WAX_COLORS = [0xff6b9d, 0xffd93d, 0x6bcb77, 0x4d96ff, 0xc77dff, 0xffb347, 0x00d2ff];

// Candles sit on top of the frosting cap (y ≈ 46 in cakeGroup space)
const CANDLE_BASE_Y = 46;

// ── Font loading ─────────────────────────────────────────────
let _font = null;
let _fontPromise = null;

function _loadFont() {
  if (_fontPromise) return _fontPromise;
  _fontPromise = new Promise((resolve) => {
    new THREE.FontLoader().load(
      'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/helvetiker_bold.typeface.json',
      font => { _font = font; resolve(font); },
      undefined,
      () => { console.warn('Font load failed – falling back to stick candles'); resolve(null); }
    );
  });
  return _fontPromise;
}
// Kick off font load immediately so it's ready when needed
_loadFont();

// ── Public API ───────────────────────────────────────────────
export function initCandles(parentGroup) {
  candleParent = parentGroup;
  _clearCandles();
  state.candlesBlown = 0;
  state.allBlownOut  = false;

  if (state.candleMode === 'number') {
    if (_font) {
      _buildNumberCandles();
    } else {
      // Font still loading – build them once it arrives
      _loadFont().then(font => {
        if (!font || candleParent !== parentGroup) return; // stale call
        _clearCandles();
        state.candlesBlown = 0;
        state.allBlownOut  = false;
        _buildNumberCandles();
      });
    }
  } else {
    _buildStickCandles();
  }
}

export function blowOutNext() {
  const remaining = candles.filter(c => !c.blown);
  if (remaining.length === 0) return;

  const pick = remaining[Math.floor(Math.random() * remaining.length)];
  pick.blown = true;
  if (pick.flame) pick.flame.visible = false;
  if (pick.light) pick.light.intensity = 0;

  state.candlesBlown++;
  if (state.candlesBlown >= candles.length) state.allBlownOut = true;
}

// ── Clear ────────────────────────────────────────────────────
function _clearCandles() {
  if (!candleParent) return;
  candles.forEach(c => candleParent.remove(c.group));
  candles = [];
}

// ════════════════════════════════════════════════════════════
//  STICK CANDLES
// ════════════════════════════════════════════════════════════
function _buildStickCandles() {
  const count = Math.max(1, Math.min(12, state.candleCount));

  // Arrange in a circle / line on top of cake
  const spread  = 44;
  const gap     = spread / (count + 1);

  for (let i = 0; i < count; i++) {
    const angle  = (i / count) * Math.PI * 2;
    const radius = count === 1 ? 0 : Math.min(22, gap * count * 0.3);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    candles.push(_makeStickCandle(x, z, i));
  }
}

function _makeStickCandle(x, z, index) {
  const group = new THREE.Group();
  group.position.set(x, CANDLE_BASE_Y, z);

  const waxColor  = STICK_WAX_COLORS[index % STICK_WAX_COLORS.length];
  const waxMat    = new THREE.MeshStandardMaterial({ color: waxColor, roughness: 0.55, metalness: 0.02 });
  const goldMat   = new THREE.MeshStandardMaterial({ color: 0xD4AF37, metalness: 0.92, roughness: 0.12 });

  // Wax stick
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 16, 14), waxMat);
  stick.position.y = 8;
  stick.castShadow = true;
  group.add(stick);

  // Gold holder ring
  const holder = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 2.5, 14), goldMat);
  holder.position.y = 1.2;
  group.add(holder);

  // Wick
  const wickMat = new THREE.MeshStandardMaterial({ color: 0x221100, roughness: 0.9 });
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 3, 8), wickMat);
  wick.position.y = 18;
  group.add(wick);

  // Flame + glow
  const { flame, light } = _makeFlame(20, 1);
  group.add(flame);
  group.add(light);

  candleParent.add(group);
  return { kind: 'stick', group, flame, light, flameBaseY: 20, blown: false, index };
}

// ════════════════════════════════════════════════════════════
//  NUMBER CANDLES  (font-based extruded 3-D digits)
// ════════════════════════════════════════════════════════════
function _buildNumberCandles() {
  const digits = String(state.ageNumber).replace(/[^0-9]/g, '').slice(0, 3) || '1';

  // --- Measure each digit's bounding box to position precisely ---
  const FONT_SIZE    = 26;
  const EXTRUDE_D    = 11;
  const GAP          = 10;

  // Collect widths for centering
  const digitWidths = digits.split('').map(d => {
    const shapes = _font.generateShapes(d, FONT_SIZE);
    const geo    = new THREE.ShapeGeometry(shapes);
    geo.computeBoundingBox();
    const w = geo.boundingBox.max.x - geo.boundingBox.min.x;
    geo.dispose();
    return w;
  });

  const totalW = digitWidths.reduce((s, w) => s + w, 0) + (digits.length - 1) * GAP;
  let curX = -totalW / 2;

  digits.split('').forEach((digit, i) => {
    const digitW = digitWidths[i];
    // centre of this digit
    const cx = curX + digitW / 2;
    candles.push(_makeNumberCandle(digit, cx, 0, i, FONT_SIZE, EXTRUDE_D));
    curX += digitW + GAP;
  });
}

function _makeNumberCandle(digit, cx, cz, index, fontSize, extrudeDepth) {
  const group = new THREE.Group();
  group.position.set(cx, CANDLE_BASE_Y, cz);

  // ── Gold metallic material ──
  const goldMat = new THREE.MeshStandardMaterial({
    color:     0xD4AF37,
    metalness: 0.95,
    roughness: 0.06,
  });
  // Slightly darker gold for the back face / depth
  const goldDarkMat = new THREE.MeshStandardMaterial({
    color:     0xB8930A,
    metalness: 0.92,
    roughness: 0.12,
  });

  // ── Extruded digit geometry ──
  const shapes = _font.generateShapes(digit, fontSize);

  // Compute the 2-D bounding box to centre the shape
  const tmpGeo = new THREE.ShapeGeometry(shapes);
  tmpGeo.computeBoundingBox();
  const bb   = tmpGeo.boundingBox;
  const offX = -(bb.min.x + bb.max.x) / 2;
  const offY = -(bb.min.y + bb.max.y) / 2;
  tmpGeo.dispose();

  const extrudeGeo = new THREE.ExtrudeGeometry(shapes, {
    depth:          extrudeDepth,
    bevelEnabled:   true,
    bevelThickness: 1.6,
    bevelSize:      1.2,
    bevelSegments:  6,
    curveSegments:  18,
  });

  // Centre + rotate so front face looks toward camera (camera is at +z)
  extrudeGeo.translate(offX, offY, -extrudeDepth / 2);

  // Use two materials: gold for face/bevel, darker for the depth sides
  const mesh = new THREE.Mesh(extrudeGeo, [goldMat, goldDarkMat]);
  mesh.castShadow    = true;
  mesh.receiveShadow = false;
  group.add(mesh);

  // ── Thin pick / stick at the bottom ──
  const digitH   = (tmpGeo.boundingBox?.max.y ?? fontSize) - (tmpGeo.boundingBox?.min.y ?? 0);
  const stickLen  = 18;
  const stickMat  = new THREE.MeshStandardMaterial({ color: 0xC09818, metalness: 0.85, roughness: 0.18 });
  const stick     = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.8, stickLen, 10), stickMat);
  // position so top of stick meets bottom-centre of digit (offY applied, digit centred at 0)
  stick.position.y = -fontSize / 2 - stickLen / 2;
  group.add(stick);

  // ── Flame on top ──
  const flameY = fontSize / 2 + 4;             // just above top of digit
  const { flame, light } = _makeFlame(flameY, 1.3);
  group.add(flame);
  group.add(light);

  candleParent.add(group);
  return { kind: 'number', group, flame, light, flameBaseY: flameY, blown: false, index };
}

// ════════════════════════════════════════════════════════════
//  SHARED – FLAME FACTORY
//  Creates a realistic teardrop flame using LatheGeometry
// ════════════════════════════════════════════════════════════
function _makeFlame(baseY, scale = 1) {
  const flameGroup = new THREE.Group();
  flameGroup.position.y = baseY;
  flameGroup.scale.setScalar(scale);

  // Outer flame – orange / amber
  const outerMat = new THREE.MeshStandardMaterial({
    color:             0xff7700,
    emissive:          0xff5500,
    emissiveIntensity: 1.8,
    transparent:       true,
    opacity:           0.88,
    side:              THREE.DoubleSide,
    depthWrite:        false,
  });

  // Teardrop profile using LatheGeometry
  const outerPts = [
    new THREE.Vector2(0,    0),
    new THREE.Vector2(2.0,  2.5),
    new THREE.Vector2(2.3,  5.5),
    new THREE.Vector2(1.6,  9.0),
    new THREE.Vector2(0.6, 12.5),
    new THREE.Vector2(0,   14.5),
  ];
  const outerFlame = new THREE.Mesh(new THREE.LatheGeometry(outerPts, 14), outerMat);
  outerFlame.position.y = 1;
  flameGroup.add(outerFlame);

  // Inner core – bright yellow-white
  const innerMat = new THREE.MeshStandardMaterial({
    color:             0xffee88,
    emissive:          0xffdd00,
    emissiveIntensity: 3.0,
    transparent:       true,
    opacity:           0.96,
    side:              THREE.DoubleSide,
    depthWrite:        false,
  });
  const innerPts = [
    new THREE.Vector2(0,    0),
    new THREE.Vector2(1.0,  2.0),
    new THREE.Vector2(1.0,  5.0),
    new THREE.Vector2(0.5,  8.0),
    new THREE.Vector2(0,    9.5),
  ];
  const innerFlame = new THREE.Mesh(new THREE.LatheGeometry(innerPts, 14), innerMat);
  innerFlame.position.y = 2;
  flameGroup.add(innerFlame);

  // Point light for warm glow
  const light = new THREE.PointLight(0xffaa33, 0.7, 45);
  light.position.y = baseY + 8 * scale;

  return { flame: flameGroup, light };
}