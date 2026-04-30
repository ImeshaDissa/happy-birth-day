import { state } from './state.js';
import { triggerWish } from './confetti.js';
import { fadeOutMusic } from './music.js';

// ── Three.js globals ─────────────────────────────────────────
let renderer, scene, camera, controls;
let cakeMeshes   = [];
let candleObjs   = []; // { group, flame, blown, flickerOffset }
let rafId        = null;
let wishDone     = false;

// Track last config to rebuild when form changes
let _lastConfig  = '';

// ── Boot ─────────────────────────────────────────────────────
export function initScene() {
  const THREE   = window.THREE;
  const container = document.getElementById('cake-canvas');

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  _resize();
  container.appendChild(renderer.domElement);

  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera(45, _aspect(), 0.1, 100);
  camera.position.set(0, 3.5, 7);

  // OrbitControls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping    = true;
  controls.dampingFactor    = 0.08;
  controls.minDistance      = 4;
  controls.maxDistance      = 14;
  controls.maxPolarAngle    = Math.PI / 1.8;
  controls.target.set(0, 1, 0);
  controls.update();

  // Lights
  _setupLights(THREE);

  // Build cake
  _buildCake(THREE);

  // Resize handler
  window.addEventListener('resize', () => {
    _resize();
    camera.aspect = _aspect();
    camera.updateProjectionMatrix();
  });

  // Start render loop
  _loop(THREE);
}

// ── Resize helpers ────────────────────────────────────────────
function _resize() {
  const c = document.getElementById('cake-canvas');
  renderer.setSize(c.clientWidth, c.clientHeight);
}
function _aspect() {
  const c = document.getElementById('cake-canvas');
  return c.clientWidth / c.clientHeight;
}

// ── Lighting ─────────────────────────────────────────────────
function _setupLights(THREE) {
  // Ambient
  scene.add(new THREE.AmbientLight(0xfff0f5, 0.7));

  // Key light
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(5, 8, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);

  // Fill light (warm pink from below)
  const fill = new THREE.DirectionalLight(0xffb3d9, 0.4);
  fill.position.set(-4, 2, -3);
  scene.add(fill);

  // Rim light
  const rim = new THREE.DirectionalLight(0xd0b0ff, 0.3);
  rim.position.set(0, 6, -6);
  scene.add(rim);
}

// ── Cake builder ─────────────────────────────────────────────
export function _buildCake(THREE) {
  // Clear old meshes
  cakeMeshes.forEach(m => scene.remove(m));
  candleObjs.forEach(c => scene.remove(c.group));
  cakeMeshes  = [];
  candleObjs  = [];
  wishDone    = false;

  state.candlesBlown = 0;
  state.allBlownOut  = false;

  const cakeCol   = new THREE.Color(state.cakeColor);
  const frostCol  = new THREE.Color(state.frostingColor);

  // Tiers: [radiusTop, radiusBottom, height, y]
  const tiers = [
    { r: 2.2, h: 1.1, y: 0.55 },
    { r: 1.6, h: 1.0, y: 1.65 },
    { r: 1.1, h: 0.9, y: 2.60 },
  ];

  tiers.forEach((t, i) => {
    // Cake body
    const geo  = new THREE.CylinderGeometry(t.r, t.r, t.h, 48);
    const mat  = new THREE.MeshStandardMaterial({
      color:     cakeCol,
      roughness: 0.85,
      metalness: 0.05,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = t.y;
    mesh.castShadow    = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    cakeMeshes.push(mesh);

    // Frosting disc on top
    const fGeo = new THREE.CylinderGeometry(t.r + 0.04, t.r + 0.04, 0.12, 48);
    const fMat = new THREE.MeshStandardMaterial({
      color:     frostCol,
      roughness: 0.6,
      metalness: 0.0,
    });
    const fMesh = new THREE.Mesh(fGeo, fMat);
    fMesh.position.y = t.y + t.h / 2 + 0.06;
    scene.add(fMesh);
    cakeMeshes.push(fMesh);

    // Frosting drip ring
    _addDrips(THREE, t.r, t.y + t.h / 2 + 0.10, frostCol);
  });

  // Name plate
  _addNameTag(THREE, tiers[0]);

  // Sprinkles
  _addSprinkles(THREE, tiers);

  // Plate
  const plateGeo = new THREE.CylinderGeometry(2.6, 2.6, 0.08, 64);
  const plateMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.4 });
  const plate    = new THREE.Mesh(plateGeo, plateMat);
  plate.position.y = -0.04;
  plate.receiveShadow = true;
  scene.add(plate);
  cakeMeshes.push(plate);

  // Candles on top tier
  const topTier = tiers[2];
  _buildCandles(THREE, topTier);

  state.totalCandles = candleObjs.length;
}

// ── Drips ─────────────────────────────────────────────────────
function _addDrips(THREE, r, y, color) {
  const count = 10;
  for (let i = 0; i < count; i++) {
    const angle   = (i / count) * Math.PI * 2;
    const dripLen = 0.1 + Math.random() * 0.18;
    const geo     = new THREE.CylinderGeometry(0.06, 0.03, dripLen, 8);
    const mat     = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
    const mesh    = new THREE.Mesh(geo, mat);
    mesh.position.set(
      Math.cos(angle) * r * 0.9,
      y - dripLen / 2,
      Math.sin(angle) * r * 0.9
    );
    scene.add(mesh);
    cakeMeshes.push(mesh);
  }
}

// ── Name tag ──────────────────────────────────────────────────
function _addNameTag(THREE, tier) {
  // Simple white plane with canvas texture
  const canvas  = document.createElement('canvas');
  canvas.width  = 512;
  canvas.height = 128;
  const ctx     = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(255,255,255,0)';
  ctx.fillRect(0, 0, 512, 128);

  ctx.font      = 'bold 64px system-ui, sans-serif';
  ctx.fillStyle = '#7c2d67';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.name.slice(0, 14), 256, 64);

  const tex  = new THREE.CanvasTexture(canvas);
  const geo  = new THREE.PlaneGeometry(tier.r * 1.4, 0.45);
  const mat  = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, tier.y, tier.r + 0.01);
  scene.add(mesh);
  cakeMeshes.push(mesh);
}

// ── Sprinkles ─────────────────────────────────────────────────
function _addSprinkles(THREE, tiers) {
  const colors = [0xff6b9d, 0xffd93d, 0x6bcb77, 0x4d96ff, 0xff6b6b, 0xc77dff];
  tiers.forEach(t => {
    for (let i = 0; i < 30; i++) {
      const angle  = Math.random() * Math.PI * 2;
      const radius = Math.random() * t.r * 0.85;
      const geo    = new THREE.CylinderGeometry(0.04, 0.04, 0.2, 6);
      const mat    = new THREE.MeshStandardMaterial({
        color:     colors[Math.floor(Math.random() * colors.length)],
        roughness: 0.6,
      });
      const mesh   = new THREE.Mesh(geo, mat);
      mesh.position.set(
        Math.cos(angle) * radius,
        t.y + t.h / 2 + 0.18,
        Math.sin(angle) * radius
      );
      mesh.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
      scene.add(mesh);
      cakeMeshes.push(mesh);
    }
  });
}

// ── Candle builder ────────────────────────────────────────────
function _buildCandles(THREE, topTier) {
  if (state.candleMode === 'number') {
    _buildNumberCandles(THREE, topTier);
  } else {
    _buildStickCandles(THREE, topTier);
  }
}

// ── Stick candles ─────────────────────────────────────────────
function _buildStickCandles(THREE, topTier) {
  const count  = state.candleCount;
  const r      = topTier.r * 0.72;
  const topY   = topTier.y + topTier.h / 2 + 0.18;
  const colors = [0xff6b9d, 0xffd93d, 0x6bcb77, 0x4d96ff, 0xff6b6b, 0xc77dff, 0xffa07a];

  for (let i = 0; i < count; i++) {
    const angle  = (i / count) * Math.PI * 2;
    const cx     = Math.cos(angle) * r * 0.6;
    const cz     = Math.sin(angle) * r * 0.6;
    const col    = colors[i % colors.length];
    const group  = _makeStickCandle(THREE, col, topY);
    group.position.set(cx, 0, cz);
    scene.add(group);
    candleObjs.push({ group, blown: false, flickerOffset: Math.random() * Math.PI * 2 });
  }
}

function _makeStickCandle(THREE, color, baseY) {
  const group = new THREE.Group();

  // Wax stick
  const wax = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 0.7, 12),
    new THREE.MeshStandardMaterial({ color, roughness: 0.7 })
  );
  wax.position.y = baseY + 0.35;
  group.add(wax);

  // Wick
  const wick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6),
    new THREE.MeshStandardMaterial({ color: 0x222222 })
  );
  wick.position.y = baseY + 0.76;
  group.add(wick);

  // Flame
  const flame = _makeFlame(THREE, baseY + 0.88);
  group.add(flame);
  group.userData.flame   = flame;
  group.userData.baseY   = baseY;

  return group;
}

// ── Number candles (7-segment extruded) ──────────────────────
const SEG_DEFS = {
  '0': [1,1,1,0,1,1,1],
  '1': [0,0,1,0,0,1,0],
  '2': [1,0,1,1,1,0,1],
  '3': [1,0,1,1,0,1,1],
  '4': [0,1,1,1,0,1,0],
  '5': [1,1,0,1,0,1,1],
  '6': [1,1,0,1,1,1,1],
  '7': [1,0,1,0,0,1,0],
  '8': [1,1,1,1,1,1,1],
  '9': [1,1,1,1,0,1,1],
};

function _buildNumberCandles(THREE, topTier) {
  const digits  = String(state.ageNumber).replace(/[^0-9]/g,'').slice(0,3) || '1';
  const topY    = topTier.y + topTier.h / 2 + 0.18;
  const spacing = 0.9;
  const startX  = -(digits.length - 1) * spacing / 2;

  for (let i = 0; i < digits.length; i++) {
    const group = _makeNumberCandle(THREE, digits[i], topY);
    group.position.set(startX + i * spacing, 0, 0);
    scene.add(group);
    candleObjs.push({ group, blown: false, flickerOffset: Math.random() * Math.PI * 2 });
  }
}

function _makeNumberCandle(THREE, digit, baseY) {
  const group   = new THREE.Group();
  const segs    = SEG_DEFS[digit] || SEG_DEFS['8'];
  const goldMat = new THREE.MeshStandardMaterial({
    color:     0xd4af37,
    roughness: 0.25,
    metalness: 0.85,
  });
  const dimMat  = new THREE.MeshStandardMaterial({
    color:     0x4a3a10,
    roughness: 0.8,
    metalness: 0.1,
  });

  const dw  = 0.38;   // digit width
  const dh  = 0.72;   // digit height
  const sw  = 0.08;   // segment thickness
  const sd  = 0.06;   // extrude depth
  const hL  = dw - sw * 2;
  const vL  = dh / 2 - sw;

  // Segment positions: [x, y, w, h, isHoriz]
  const segDefs = [
    [sw,    dh - sw, hL,  sw,  true ],  // top
    [0,     dh/2,    sw,  vL,  false],  // top-left
    [dw-sw, dh/2,    sw,  vL,  false],  // top-right
    [sw,    dh/2-sw/2, hL, sw, true ],  // middle
    [0,     0,       sw,  vL,  false],  // bottom-left
    [dw-sw, 0,       sw,  vL,  false],  // bottom-right
    [sw,    0,       hL,  sw,  true ],  // bottom
  ];

  segDefs.forEach(([sx, sy, sw2, sh, _], idx) => {
    const shape = new THREE.Shape();
    const r     = 0.02;
    shape.moveTo(sx + r, sy);
    shape.lineTo(sx + sw2 - r, sy);
    shape.quadraticCurveTo(sx + sw2, sy, sx + sw2, sy + r);
    shape.lineTo(sx + sw2, sy + sh - r);
    shape.quadraticCurveTo(sx + sw2, sy + sh, sx + sw2 - r, sy + sh);
    shape.lineTo(sx + r, sy + sh);
    shape.quadraticCurveTo(sx, sy + sh, sx, sy + sh - r);
    shape.lineTo(sx, sy + r);
    shape.quadraticCurveTo(sx, sy, sx + r, sy);

    const geo  = new THREE.ExtrudeGeometry(shape, { depth: sd, bevelEnabled: false });
    const mat  = segs[idx] ? goldMat : dimMat;
    const mesh = new THREE.Mesh(geo, mat);

    // Center the digit
    mesh.position.set(-dw/2, baseY, -sd/2);
    mesh.castShadow = true;
    group.add(mesh);
  });

  // Stick below
  const stick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8),
    new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.8 })
  );
  stick.position.y = baseY - 0.175;
  group.add(stick);

  // Flame on top
  const flameY = baseY + dh + 0.15;
  const flame  = _makeFlame(THREE, flameY);
  group.add(flame);
  group.userData.flame = flame;
  group.userData.baseY = baseY;

  return group;
}

// ── Flame sprite ──────────────────────────────────────────────
function _makeFlame(THREE, y) {
  const group = new THREE.Group();
  group.position.y = y;

  // Outer glow (orange)
  const outerGeo = new THREE.ConeGeometry(0.12, 0.35, 8);
  const outerMat = new THREE.MeshBasicMaterial({ color: 0xff8c00, transparent: true, opacity: 0.7, depthWrite: false });
  const outer    = new THREE.Mesh(outerGeo, outerMat);
  outer.position.y = 0.175;
  group.add(outer);

  // Inner flame (yellow)
  const innerGeo = new THREE.ConeGeometry(0.07, 0.25, 8);
  const innerMat = new THREE.MeshBasicMaterial({ color: 0xffee44, transparent: true, opacity: 0.9, depthWrite: false });
  const inner    = new THREE.Mesh(innerGeo, innerMat);
  inner.position.y = 0.15;
  group.add(inner);

  // Core glow (white)
  const coreGeo = new THREE.SphereGeometry(0.04, 6, 6);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xfffde8, transparent: true, opacity: 0.95, depthWrite: false });
  const core    = new THREE.Mesh(coreGeo, coreMat);
  core.position.y = 0.06;
  group.add(core);

  // Point light for glow
  const light = new THREE.PointLight(0xff9900, 0.6, 2.0);
  light.position.y = 0.2;
  group.add(light);

  group.userData.isFlame = true;
  return group;
}

// ── Blow out logic ────────────────────────────────────────────
export function blowOutNext() {
  const remaining = candleObjs.filter(c => !c.blown);
  if (!remaining.length) return;

  const pick = remaining[Math.floor(Math.random() * remaining.length)];
  pick.blown = true;

  // Hide flame
  const flame = pick.group.userData.flame;
  if (flame) {
    flame.visible = false;
    // Kill point light
    flame.children.forEach(c => { if (c.isLight) c.intensity = 0; });
  }

  state.candlesBlown++;
  if (state.candlesBlown >= candleObjs.length) {
    state.allBlownOut = true;
  }
}

// ── Render loop ───────────────────────────────────────────────
function _loop(THREE) {
  rafId = requestAnimationFrame(() => _loop(THREE));

  const t = performance.now() * 0.001;

  // Rebuild cake if config changed
  const cfg = `${state.name}|${state.candleCount}|${state.cakeColor}|${state.frostingColor}|${state.candleMode}|${state.ageNumber}`;
  if (cfg !== _lastConfig) {
    _lastConfig = cfg;
    _buildCake(THREE);
  }

  // Animate flames
  candleObjs.forEach((c, i) => {
    if (c.blown) return;
    const flame = c.group.userData.flame;
    if (!flame) return;
    const flicker   = Math.sin(t * 8 + c.flickerOffset) * 0.04;
    flame.scale.x   = 1 + flicker;
    flame.scale.z   = 1 - flicker;
    flame.position.y = Math.sin(t * 5 + c.flickerOffset) * 0.015;

    // Flicker light
    const light = flame.children.find(ch => ch.isLight);
    if (light) light.intensity = 0.5 + Math.sin(t * 12 + c.flickerOffset) * 0.15;
  });

  // Wish trigger
  if (state.allBlownOut && !wishDone) {
    wishDone = true;
    fadeOutMusic();
    setTimeout(() => triggerWish(), 600);
  }

  controls.update();
  renderer.render(scene, camera);
}

export function stopScene() {
  if (rafId) cancelAnimationFrame(rafId);
}