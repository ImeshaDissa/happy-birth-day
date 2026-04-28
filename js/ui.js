//form inputs, state, events
import { state } from './state.js';
import { startListening, stopListening } from './audio.js';
import { generateShareURL, loadFromURL } from './share.js';

function $(id) { return document.getElementById(id); }

const isViewMode = loadFromURL();

function _setCandleMode(mode) {
  state.candleMode = mode;
  
  const isStick = mode === 'stick';
  const isNumber = mode === 'number';
  
  // Update button styles
  $('btn-mode-stick').classList[isStick ? 'add' : 'remove']('active');
  $('btn-mode-number').classList[isNumber ? 'add' : 'remove']('active');
  
  // Show/hide control panels
  $('stick-controls').classList[isStick ? 'remove' : 'add']('hidden');
  $('number-controls').classList[isNumber ? 'remove' : 'add']('hidden');
  
  _resetBlowButton();
}

function init() {
  if (isViewMode) {
    _enterViewMode();
  } else {
    _enterCreatorMode();
  }
}

// ── VIEW MODE ────────────────────────────────────────────────
function _enterViewMode() {
  $('creator-panel').classList.add('hidden');
  $('view-only-banner').classList.remove('hidden');

  const vc = $('view-controls');
  vc.classList.remove('hidden');
  vc.appendChild($('btn-blow'));
  vc.appendChild($('mic-status'));

  $('btn-blow').disabled = false;
  _setupBlowButton();
}

// ── CREATOR MODE ─────────────────────────────────────────────
function _enterCreatorMode() {
  // Candle mode toggle buttons
  $('btn-mode-stick').addEventListener('click',  () => _setCandleMode('stick'));
  $('btn-mode-number').addEventListener('click', () => _setCandleMode('number'));

  $('input-name').addEventListener('input', e => {
    state.name = e.target.value.trim() || 'Your Name';
  });

  $('input-candles').addEventListener('input', e => {
    state.candleCount = parseInt(e.target.value);
    $('candle-count-display').textContent = state.candleCount;
    _resetBlowButton();
  });

  $('input-age').addEventListener('input', e => {
    state.ageNumber = e.target.value.replace(/[^0-9]/g, '').slice(0, 3) || '1';
    e.target.value  = state.ageNumber;
  });

  $('input-cake-color').addEventListener('input', e => {
    state.cakeColor = e.target.value;
  });

  $('input-frosting-color').addEventListener('input', e => {
    state.frostingColor = e.target.value;
  });

  $('input-wish').addEventListener('input', e => {
    state.wishMessage = e.target.value;
  });

  $('btn-share').addEventListener('click', () => {
    const url = generateShareURL();
    navigator.clipboard.writeText(url).then(() => {
      $('share-status').textContent = '✅ Link copied!';
      setTimeout(() => ($('share-status').textContent = ''), 3000);
    }).catch(() => {
      prompt('Copy this share link:', url);
    });
  });

  _setupBlowButton();
  setTimeout(() => { $('btn-blow').disabled = false; }, 900);
}

// ── Blow button ───────────────────────────────────────────────
function _setupBlowButton() {
  $('btn-blow').addEventListener('click', async () => {
    if (state.isListening) {
      stopListening();
      _resetBlowButton();
      return;
    }

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
      _resetBlowButton();
    }
  });
}

function _resetBlowButton() {
  $('btn-blow').textContent = '🎤 Ready to Blow?';
  $('btn-blow').disabled    = false;
  $('btn-blow').classList.remove('listening');
  $('mic-status').textContent = '';
}

init();