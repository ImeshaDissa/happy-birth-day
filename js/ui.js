import { state } from './state.js';
import { startListening, stopListening } from './audio.js';
import { generateShareURL, loadFromURL } from './share.js';
import { initGift } from './gift.js';
import { initScene } from './scene.js';

function $(id) { return document.getElementById(id); }

const isViewMode = loadFromURL();

function _setCandleMode(mode) {
  state.candleMode = mode;
  $('btn-mode-stick').classList.toggle('active',  mode === 'stick');
  $('btn-mode-number').classList.toggle('active', mode === 'number');
  $('stick-controls').classList.toggle('hidden',  mode === 'number');
  $('number-controls').classList.toggle('hidden', mode === 'stick');
  _resetBlow();
}

function init() {
  if (isViewMode) {
    _viewMode();
  } else {
    _creatorMode();
  }
}

// ── VIEW MODE ────────────────────────────────────────────────
function _viewMode() {
  $('creator-panel').classList.add('hidden');

  // Gift intro → scene
  initGift(() => {
    $('scene-wrapper').classList.remove('hidden');
    initScene();
    $('view-only-banner').classList.remove('hidden');

    // Move blow button into canvas area
    const vc = $('view-controls');
    vc.classList.remove('hidden');
    vc.appendChild($('btn-blow'));
    vc.appendChild($('mic-status'));
    $('btn-blow').disabled = false;
    _setupBlow();
  });
}

// ── CREATOR MODE ─────────────────────────────────────────────
function _creatorMode() {
  // Gift intro → scene + form
  initGift(() => {
    $('scene-wrapper').classList.remove('hidden');
    initScene();
    setTimeout(() => { $('btn-blow').disabled = false; }, 800);
    _setupBlow();
  });

  $('btn-mode-stick').addEventListener('click',  () => _setCandleMode('stick'));
  $('btn-mode-number').addEventListener('click', () => _setCandleMode('number'));

  $('input-name').addEventListener('input', e => {
    state.name = e.target.value.trim() || 'Your Name';
  });

  $('input-candles').addEventListener('input', e => {
    state.candleCount = parseInt(e.target.value);
    $('candle-count-display').textContent = state.candleCount;
    _resetBlow();
  });

  $('input-age').addEventListener('input', e => {
    state.ageNumber = e.target.value.replace(/[^0-9]/g,'').slice(0,3) || '1';
    e.target.value  = state.ageNumber;
  });

  $('input-cake-color').addEventListener('input', e => { state.cakeColor = e.target.value; });
  $('input-frosting-color').addEventListener('input', e => { state.frostingColor = e.target.value; });
  $('input-wish').addEventListener('input', e => { state.wishMessage = e.target.value; });

  $('btn-share').addEventListener('click', () => {
    const url = generateShareURL();
    navigator.clipboard.writeText(url).then(() => {
      $('share-status').textContent = '✅ Link copied!';
      setTimeout(() => ($('share-status').textContent = ''), 3000);
    }).catch(() => prompt('Copy this link:', url));
  });
}

// ── Blow button ───────────────────────────────────────────────
function _setupBlow() {
  $('btn-blow').addEventListener('click', async () => {
    if (state.isListening) { stopListening(); _resetBlow(); return; }

    $('btn-blow').disabled = true;
    $('mic-status').textContent = 'Requesting mic…';

    state.candlesBlown = 0;
    state.allBlownOut  = false;
    $('wish-card').classList.add('hidden');
    $('wish-card').classList.remove('visible');

    const ok = await startListening();
    if (ok) {
      $('btn-blow').disabled    = false;
      $('btn-blow').textContent = '🛑 Stop';
    } else {
      _resetBlow();
    }
  });
}

function _resetBlow() {
  $('btn-blow').textContent = '🎤 Ready to Blow?';
  $('btn-blow').disabled    = false;
  $('btn-blow').classList.remove('listening');
  $('mic-status').textContent = '';
}

init();