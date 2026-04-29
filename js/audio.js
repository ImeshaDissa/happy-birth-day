// audio.js – Web Audio API blow detection
import { state } from './state.js';
import { blowOutNext } from './candles.js';

let audioCtx  = null;
let analyser  = null;
let dataArray = null;
let stream    = null;
let animFrame = null;

// ── Tuning ───────────────────────────────────
const BLOW_THRESHOLD = 26;   // avg low-freq amplitude (0–255)
const LOW_FREQ_MAX   = 600;  // Hz — blowing is low-frequency noise
const COOLDOWN_MS    = 500;  // min ms between candle blow-outs
let lastBlow = 0;

export async function startListening() {
  try {
    stream   = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.65;

    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    dataArray = new Uint8Array(analyser.frequencyBinCount);
    state.isListening = true;

    _detectBlow();
    return true;
  } catch (err) {
    console.error('Mic error:', err);
    state.isListening = false;
    return false;
  }
}

export function stopListening() {
  if (animFrame) cancelAnimationFrame(animFrame);
  if (stream)    stream.getTracks().forEach(t => t.stop());
  if (audioCtx)  audioCtx.close();
  audioCtx = analyser = stream = animFrame = null;
  state.isListening = false;
}

function _detectBlow() {
  animFrame = requestAnimationFrame(_detectBlow);
  if (!analyser) return;

  analyser.getByteFrequencyData(dataArray);

  // Sample only low-frequency bins (characteristic of blowing air)
  const binHz  = audioCtx.sampleRate / analyser.fftSize;
  const maxBin = Math.max(1, Math.floor(LOW_FREQ_MAX / binHz));
  let sum = 0;
  for (let i = 0; i < maxBin; i++) sum += dataArray[i];
  const avg = sum / maxBin;

  if (avg > BLOW_THRESHOLD) {
    const now = Date.now();
    if (now - lastBlow > COOLDOWN_MS) {
      lastBlow = now;
      blowOutNext();

      if (state.allBlownOut) {
        stopListening();
        // Update the blow button UI
        const btn    = document.getElementById('btn-blow');
        const status = document.getElementById('mic-status');
        if (btn) {
          btn.textContent = '🎉 All blown out!';
          btn.disabled    = true;
          btn.classList.remove('listening');
        }
        if (status) status.textContent = '🎊 Make a wish!';
      }
    }
  }
}