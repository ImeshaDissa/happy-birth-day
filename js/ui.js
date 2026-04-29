// ui.js – orchestrates all screens, form events, and flow
import { state } from './state.js';
import { startPreviewScene, startMainScene, refreshPreview } from './scene.js';
import { startListening, stopListening } from './audio.js';
import { generateShareURL, loadFromURL } from './share.js';
import { initGiftScreen } from './gift.js';

function $(id) { return document.getElementById(id); }

// ── Detect mode ──────────────────────────────────────────────
const isViewMode = loadFromURL();

// ── Screen switcher ──────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.classList.add('hidden');
  });
  const target = $(id);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('active');
  }
}

// ─────────────────────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────────────────────
function init() {
  if (isViewMode) {
    // Receiver flow: skip design, jump straight to gift screen
    showScreen('screen-gift');
    startMainScene();
    initGiftScreen();
    _setupBlowButton();
  } else {
    // Creator flow: start on design screen
    showScreen('screen-design');
    startPreviewScene();
    _enterCreatorMode();
  }
}

// ─────────────────────────────────────────────────────────────
//  CREATOR MODE
// ─────────────────────────────────────────────────────────────
function _enterCreatorMode() {

  // ── Candle mode toggle ──
  $('btn-mode-stick').addEventListener('click', () => {
    _setCandleMode('stick');
  });
  $('btn-mode-number').addEventListener('click', () => {
    _setCandleMode('number');
  });

  // ── Name ──
  $('input-name').addEventListener('input', e => {
    state.name = e.target.value.trim() || 'Your Name';
    refreshPreview();
  });

  // ── Candle count ──
  $('input-candles').addEventListener('input', e => {
    state.candleCount = parseInt(e.target.value) || 1;
    $('candle-count-display').textContent = state.candleCount;
    refreshPreview();
  });

  // ── Age / number candles ──
  $('input-age').addEventListener('input', e => {
    state.ageNumber = e.target.value.replace(/[^0-9]/g, '').slice(0, 3) || '1';
    e.target.value  = state.ageNumber;
    refreshPreview();
  });

  // ── Cake color ──
  $('input-cake-color').addEventListener('input', e => {
    state.cakeColor = e.target.value;
    $('cake-color-swatch').style.background = e.target.value;
    refreshPreview();
  });

  // ── Frosting color ──
  $('input-frosting-color').addEventListener('input', e => {
    state.frostingColor = e.target.value;
    $('frosting-color-swatch').style.background = e.target.value;
    refreshPreview();
  });

  // ── Wish message ──
  $('input-wish').addEventListener('input', e => {
    state.wishMessage = e.target.value;
  });

  // ── Finalize button → go to send screen ──
  $('btn-finalize').addEventListener('click', () => {
    // Grab latest wish message
    state.wishMessage = $('input-wish').value;

    const url = generateShareURL();
    $('share-url-text').textContent = url;

    showScreen('screen-send');
  });

  // ── Send screen buttons ──
  $('btn-copy-link').addEventListener('click', () => {
    const url = $('share-url-text').textContent;
    navigator.clipboard.writeText(url).then(() => {
      $('share-status').textContent = '✅ Link copied to clipboard!';
      setTimeout(() => ($('share-status').textContent = ''), 3000);
    }).catch(() => {
      prompt('Copy this share link:', url);
    });
  });

  $('btn-preview-gift').addEventListener('click', () => {
    showScreen('screen-gift');
    startMainScene();
    initGiftScreen();
    _setupBlowButton();
  });

  $('btn-edit-back').addEventListener('click', () => {
    showScreen('screen-design');
  });

  // Set initial mode
  _setCandleMode(state.candleMode);
}

// ─────────────────────────────────────────────────────────────
//  CANDLE MODE TOGGLE
// ─────────────────────────────────────────────────────────────
function _setCandleMode(mode) {
  state.candleMode = mode;
  const isStick  = mode === 'stick';

  $('btn-mode-stick').classList.toggle('active', isStick);
  $('btn-mode-number').classList.toggle('active', !isStick);
  $('stick-controls').classList.toggle('hidden', !isStick);
  $('number-controls').classList.toggle('hidden', isStick);

  refreshPreview();
}

// ─────────────────────────────────────────────────────────────
//  BLOW BUTTON (receiver screen)
// ─────────────────────────────────────────────────────────────
function _setupBlowButton() {
  const btn    = $('btn-blow');
  const status = $('mic-status');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    if (state.isListening) {
      stopListening();
      _resetBlowButton();
      return;
    }

    btn.disabled        = true;
    status.textContent  = 'Requesting microphone access…';

    // Reset blow state
    state.candlesBlown = 0;
    state.allBlownOut  = false;

    // Hide the wish card if shown previously
    const card = $('wish-card');
    if (card) {
      card.classList.add('hidden');
      card.classList.remove('visible');
    }

    const ok = await startListening();
    if (ok) {
      btn.disabled       = false;
      btn.textContent    = '🛑 Stop listening';
      btn.classList.add('listening');
      status.textContent = '🎤 Listening… blow into your mic!';
    } else {
      status.textContent = '❌ Microphone access denied.';
      _resetBlowButton();
    }
  });
}

function _resetBlowButton() {
  const btn    = $('btn-blow');
  const status = $('mic-status');
  if (!btn) return;

  btn.textContent = '🎤 Ready to Blow?';
  btn.disabled    = false;
  btn.classList.remove('listening');
  if (status) status.textContent = '';
}

init();