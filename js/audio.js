import { state } from './state.js';
import { blowOutNext } from './scene.js';

let audioCtx  = null;
let analyser  = null;
let dataArray = null;
let stream    = null;
let animFrame = null;

const BLOW_THRESHOLD = 28;
const LOW_FREQ_MAX   = 600;
const COOLDOWN_MS    = 550;
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

    _setStatus('🎤 Listening… blow at your screen!');
    document.getElementById('btn-blow')?.classList.add('listening');

    _detect();
    return true;
  } catch (err) {
    console.error('Mic error:', err);
    _setStatus('❌ Mic access denied.');
    return false;
  }
}

export function stopListening() {
  if (animFrame) cancelAnimationFrame(animFrame);
  if (stream)    stream.getTracks().forEach(t => t.stop());
  if (audioCtx)  audioCtx.close();
  audioCtx = analyser = stream = animFrame = null;
  state.isListening = false;
  document.getElementById('btn-blow')?.classList.remove('listening');
  _setStatus('');
}

function _detect() {
  animFrame = requestAnimationFrame(_detect);
  analyser.getByteFrequencyData(dataArray);

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
        const btn = document.getElementById('btn-blow');
        if (btn) { btn.textContent = '🎉 All blown out!'; btn.disabled = true; }
      }
    }
  }
}

function _setStatus(msg) {
  const el = document.getElementById('mic-status');
  if (el) el.textContent = msg;
}