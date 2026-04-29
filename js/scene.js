import { state } from './state.js';
import { initCandles, candles } from './candles.js';
import { triggerWish } from './confetti.js';

// ─────────────────────────────────────────────
//  Scene handles
// ─────────────────────────────────────────────
let previewContainer, mainContainer;
let previewRenderer, mainRenderer;
let previewScene,    mainScene;
let previewCamera,   mainCamera;
let previewControls, mainControls;
let previewCakeGroup, mainCakeGroup;
let previewCandleGroup, mainCandleGroup;
let previewNameTexture, mainNameTexture;
let previewCakeMats  = [];
let previewFrostMats = [];
let mainCakeMats     = [];
let mainFrostMats    = [];

// Snapshot of candles for each scene (preview may not exist when main starts)
let previewCandles = [];
let mainCandles    = [];

// Separate state-tracking for each scene so they don't clobber each other
let prevP = {};   // preview prev-state
let prevM = {};   // main    prev-state

let wishTriggered  = false;
let previewPaused  = false;  // true once main scene takes over
let loopStarted    = false;

// ─────────────────────────────────────────────
//  PUBLIC API
// ─────────────────────────────────────────────

/** Start live-preview 3-D canvas on the design screen */
export function startPreviewScene() {
  previewContainer = document.getElementById('preview-canvas');
  if (!previewContainer) return;

  const built = _setup(previewContainer);
  previewRenderer = built.renderer;
  previewScene    = built.scene;
  previewCamera   = built.camera;
  previewControls = built.controls;

  _addLights(previewScene);

  const cake = _buildCake(previewScene);
  previewCakeGroup   = cake.cakeGroup;
  previewCandleGroup = cake.candleGroup;
  previewNameTexture = cake.nameTexture;
  previewCakeMats    = cake.cakeMats;
  previewFrostMats   = cake.frostMats;
  previewCandles     = [...candles];          // snapshot preview candles

  previewCakeGroup.visible = true;
  previewCakeGroup.scale.set(1, 1, 1);

  _addGround(previewScene);

  window.addEventListener('resize', _onResizeAll);
  _onResizeAll();

  if (!loopStarted) { loopStarted = true; _animateLoop(); }
}

/** Start the main 3-D scene on the gift / receiver screen */
export function startMainScene() {
  mainContainer = document.getElementById('cake-canvas');
  if (!mainContainer) return;

  previewPaused = true;             // stop preview rendering

  const built = _setup(mainContainer);
  mainRenderer = built.renderer;
  mainScene    = built.scene;
  mainCamera   = built.camera;
  mainControls = built.controls;

  _addLights(mainScene);

  const cake = _buildCake(mainScene);
  mainCakeGroup   = cake.cakeGroup;
  mainCandleGroup = cake.candleGroup;
  mainNameTexture = cake.nameTexture;
  mainCakeMats    = cake.cakeMats;
  mainFrostMats   = cake.frostMats;
  mainCandles     = [...candles];           // snapshot main candles

  mainCakeGroup.visible = false;
  mainCakeGroup.scale.set(0.72, 0.72, 0.72);

  _addGround(mainScene);

  window.addEventListener('resize', _onResizeAll);
  _onResizeAll();

  if (!loopStarted) { loopStarted = true; _animateLoop(); }
}

/** Reveal the main cake after gift unwrap */
export function revealCake() {
  if (!mainCakeGroup) return;
  mainCakeGroup.visible = true;
  mainCakeGroup.scale.set(0.72, 0.72, 0.72);
  _applyColors(mainCakeMats, mainFrostMats, mainNameTexture, true);

  // Re-init candles on the main scene's group and refresh our snapshot
  initCandles(mainCandleGroup);
  mainCandles = [...candles];
  wishTriggered = false;
}

/** Called from ui.js whenever a form field changes */
export function refreshPreview() {
  if (!previewCakeGroup) return;

  const s = state;

  // Candle settings changed → rebuild preview candles
  if (prevP.mode !== s.candleMode || prevP.count !== s.candleCount || prevP.age !== s.ageNumber) {
    initCandles(previewCandleGroup);
    previewCandles  = [...candles];
    prevP.mode      = s.candleMode;
    prevP.count     = s.candleCount;
    prevP.age       = s.ageNumber;
  }

  _applyColors(previewCakeMats, previewFrostMats, previewNameTexture);
}

// ─────────────────────────────────────────────
//  INTERNAL – RENDERER / SCENE SETUP
// ─────────────────────────────────────────────
function _setup(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080814);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  // Camera sits higher and back so the full round cake (incl. candles on top) is visible
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1000);
  camera.position.set(0, 75, 175);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan     = false;
  controls.minDistance   = 90;
  controls.maxDistance   = 260;
  controls.maxPolarAngle = Math.PI * 0.46;
  controls.target.set(0, 15, 0);   // orbit target slightly above cake base
  controls.update();

  return { renderer, scene, camera, controls };
}

// ─────────────────────────────────────────────
//  INTERNAL – BUILD CAKE GEOMETRY
// ─────────────────────────────────────────────
function _buildCake(scene) {
  const cakeMats  = [];
  const frostMats = [];
  const cakeGroup = new THREE.Group();

  // Lower the whole group so top of candles stays in frame
  cakeGroup.position.y = -20;
  scene.add(cakeGroup);

  // ── Cake board / plate ──
  const plateMat = new THREE.MeshStandardMaterial({ color: 0x1e1414, roughness: 0.75, metalness: 0.05 });
  const plate    = new THREE.Mesh(new THREE.CylinderGeometry(55, 55, 3, 64), plateMat);
  plate.position.y = 1.5;
  plate.receiveShadow = true;
  cakeGroup.add(plate);

  // ── Main round tier (single) ──
  const tierMat = new THREE.MeshStandardMaterial({
    color: state.cakeColor, roughness: 0.42, metalness: 0.04,
  });
  cakeMats.push(tierMat);
  const tier = new THREE.Mesh(new THREE.CylinderGeometry(46, 46, 38, 64), tierMat);
  tier.position.y = 22;
  tier.castShadow    = true;
  tier.receiveShadow = true;
  cakeGroup.add(tier);

  // ── Frosting top cap ──
  const frostCapMat = new THREE.MeshStandardMaterial({
    color: state.frostingColor, roughness: 0.32, metalness: 0.06,
  });
  frostMats.push(frostCapMat);
  const frostCap = new THREE.Mesh(new THREE.CylinderGeometry(46, 46, 5, 64), frostCapMat);
  frostCap.position.y = 43.5;
  cakeGroup.add(frostCap);

  // ── Frosting drips ──
  const dripCount = 16;
  for (let i = 0; i < dripCount; i++) {
    const angle  = (i / dripCount) * Math.PI * 2 + 0.1;
    const dripH  = 7 + Math.random() * 11;
    const dripR  = 3.5 + Math.random() * 2;
    const dripMat = new THREE.MeshStandardMaterial({
      color: state.frostingColor, roughness: 0.3, metalness: 0.06,
    });
    frostMats.push(dripMat);
    const drip = new THREE.Mesh(
      new THREE.CylinderGeometry(dripR * 0.6, dripR, dripH, 10), dripMat
    );
    drip.position.set(
      Math.cos(angle) * 44,
      41 - dripH / 2,
      Math.sin(angle) * 44
    );
    cakeGroup.add(drip);
  }

  // ── Piped frosting border ring at base of frosting cap ──
  for (let i = 0; i < 20; i++) {
    const angle   = (i / 20) * Math.PI * 2;
    const blobMat = new THREE.MeshStandardMaterial({
      color: state.frostingColor, roughness: 0.3, metalness: 0.06,
    });
    frostMats.push(blobMat);
    const blob = new THREE.Mesh(new THREE.SphereGeometry(4, 10, 10), blobMat);
    blob.position.set(Math.cos(angle) * 45, 42, Math.sin(angle) * 45);
    cakeGroup.add(blob);
  }

  // ── Colourful sprinkles on top ──
  const sprinkleColors = [0xff6b9d, 0xffd93d, 0x6bcb77, 0x4d96ff, 0xc77dff, 0xffb347, 0x00e5ff];
  for (let i = 0; i < 60; i++) {
    const angle  = Math.random() * Math.PI * 2;
    const r      = Math.random() * 36;
    const color  = sprinkleColors[i % sprinkleColors.length];
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 8, 8),
      new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.1 })
    );
    sphere.position.set(Math.cos(angle) * r, 46.5, Math.sin(angle) * r);
    cakeGroup.add(sphere);
  }

  // ── Name tag on the front ──
  const { mesh: nameTagMesh, texture: nameTexture } = _createNameTag(state.name);
  nameTagMesh.position.set(0, 24, 47);
  cakeGroup.add(nameTagMesh);

  // ── Candle group (on top of frosting cap) ──
  const candleGroup = new THREE.Group();
  cakeGroup.add(candleGroup);
  initCandles(candleGroup);

  return { cakeGroup, candleGroup, nameTexture, cakeMats, frostMats };
}

// ─────────────────────────────────────────────
//  NAME TAG
// ─────────────────────────────────────────────
function _createNameTag(name) {
  const canvas  = document.createElement('canvas');
  canvas.width  = 512;
  canvas.height = 128;
  _drawNameTag(canvas.getContext('2d'), canvas.width, canvas.height, name);

  const texture  = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshStandardMaterial({
    map: texture, transparent: true, side: THREE.DoubleSide, roughness: 0.4, depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(42, 10.5), material);
  return { mesh, texture };
}

function _drawNameTag(ctx, w, h, name) {
  ctx.clearRect(0, 0, w, h);

  // Dark rounded pill background
  const rx = 22;
  ctx.fillStyle = 'rgba(12, 6, 26, 0.9)';
  ctx.beginPath();
  ctx.moveTo(rx, 2); ctx.lineTo(w - rx, 2);
  ctx.quadraticCurveTo(w - 2, 2, w - 2, rx);
  ctx.lineTo(w - 2, h - rx);
  ctx.quadraticCurveTo(w - 2, h - 2, w - rx, h - 2);
  ctx.lineTo(rx, h - 2);
  ctx.quadraticCurveTo(2, h - 2, 2, h - rx);
  ctx.lineTo(2, rx);
  ctx.quadraticCurveTo(2, 2, rx, 2);
  ctx.closePath();
  ctx.fill();

  // Glowing pink border
  ctx.strokeStyle = 'rgba(232,121,249,0.7)';
  ctx.lineWidth   = 3.5;
  ctx.stroke();

  // Name text
  ctx.font         = 'bold 46px "Outfit", system-ui, sans-serif';
  ctx.fillStyle    = '#f5eeff';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name || 'Your Name', w / 2, h / 2);
}

function _updateNameTag(texture, name) {
  if (!texture) return;
  const canvas = texture.image;
  _drawNameTag(canvas.getContext('2d'), canvas.width, canvas.height, name);
  texture.needsUpdate = true;
}

// ─────────────────────────────────────────────
//  APPLY COLORS / NAME (no candle re-init)
// ─────────────────────────────────────────────
function _applyColors(cakeMats, frostMats, nameTexture, force = false) {
  const s = state;
  if (force || prevP.cakeColor !== s.cakeColor) {
    cakeMats.forEach(m => m.color.set(s.cakeColor));
    prevP.cakeColor = s.cakeColor;
  }
  if (force || prevP.frostColor !== s.frostingColor) {
    frostMats.forEach(m => m.color.set(s.frostingColor));
    prevP.frostColor = s.frostingColor;
  }
  if (force || prevP.name !== s.name) {
    _updateNameTag(nameTexture, s.name);
    prevP.name = s.name;
  }
}

// ─────────────────────────────────────────────
//  LIGHTS & GROUND
// ─────────────────────────────────────────────
function _addLights(scene) {
  scene.add(new THREE.HemisphereLight(0xffe0ff, 0x0a0a20, 0.7));

  const dir = new THREE.DirectionalLight(0xffffff, 1.1);
  dir.position.set(50, 110, 50);
  dir.castShadow = true;
  dir.shadow.mapSize.setScalar(2048);
  dir.shadow.camera.near   = 10;
  dir.shadow.camera.far    = 350;
  dir.shadow.camera.left   = dir.shadow.camera.bottom = -140;
  dir.shadow.camera.right  = dir.shadow.camera.top    =  140;
  scene.add(dir);

  const rim = new THREE.PointLight(0xcc44ff, 0.55, 350);
  rim.position.set(-70, 90, -70);
  scene.add(rim);

  const front = new THREE.PointLight(0xffa0d0, 0.3, 200);
  front.position.set(0, 40, 120);
  scene.add(front);
}

function _addGround(scene) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(800, 800),
    new THREE.MeshStandardMaterial({ color: 0x060610, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1;
  ground.receiveShadow = true;
  scene.add(ground);
}

// ─────────────────────────────────────────────
//  RESIZE
// ─────────────────────────────────────────────
function _onResizeAll() {
  if (previewContainer && previewRenderer && previewCamera) {
    const w = previewContainer.clientWidth  || 640;
    const h = previewContainer.clientHeight || 480;
    previewRenderer.setSize(w, h);
    previewCamera.aspect = w / h;
    previewCamera.updateProjectionMatrix();
  }
  if (mainContainer && mainRenderer && mainCamera) {
    const w = mainContainer.clientWidth  || 640;
    const h = mainContainer.clientHeight || 480;
    mainRenderer.setSize(w, h);
    mainCamera.aspect = w / h;
    mainCamera.updateProjectionMatrix();
  }
}

// ─────────────────────────────────────────────
//  ANIMATION LOOP  (single rAF loop for both)
// ─────────────────────────────────────────────
function _animateLoop() {
  requestAnimationFrame(_animateLoop);
  const t = performance.now() * 0.001;

  // ── PREVIEW scene (design screen) ────────
  if (!previewPaused && previewRenderer && previewScene && previewCamera) {
    previewCandles.forEach((c, i) => {
      if (c.flame && c.flame.visible) {
        _flickerFlame(c, t, i);
      }
    });
    previewControls.update();
    previewRenderer.render(previewScene, previewCamera);
  }

  // ── MAIN scene (gift screen) ──────────────
  if (mainRenderer && mainScene && mainCamera) {
    // Smooth scale-up after reveal
    if (mainCakeGroup && mainCakeGroup.visible && mainCakeGroup.scale.x < 0.995) {
      mainCakeGroup.scale.lerp(new THREE.Vector3(1, 1, 1), 0.055);
    }

    // Animate only main scene's own candles
    mainCandles.forEach((c, i) => {
      if (c.flame && c.flame.visible) {
        _flickerFlame(c, t, i);
      }
    });

    mainControls.update();
    mainRenderer.render(mainScene, mainCamera);

    // Trigger wish card + confetti when all candles are out
    if (state.allBlownOut && !wishTriggered) {
      wishTriggered = true;
      triggerWish();
    }
  }
}
