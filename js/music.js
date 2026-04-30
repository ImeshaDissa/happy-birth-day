let audioCtx = null;
let playing   = false;
let stopFlag  = false;

// Happy Birthday note frequencies (Hz)
const NOTES = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
  G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46,
  G5: 783.99, A5: 880.00,
};

// Happy Birthday to You — [note, duration_beats]
const MELODY = [
  ['G4',0.75],['G4',0.25],['A4',1],  ['G4',1],  ['C5',1],  ['B4',2],
  ['G4',0.75],['G4',0.25],['A4',1],  ['G4',1],  ['D5',1],  ['C5',2],
  ['G4',0.75],['G4',0.25],['G5',1],  ['E5',1],  ['C5',1],  ['B4',1],['A4',2],
  ['F5',0.75],['F5',0.25],['E5',1],  ['C5',1],  ['D5',1],  ['C5',2],
];

const BPM       = 100;
const BEAT_SEC  = 60 / BPM;

function _ensureCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function _playNote(freq, startTime, duration, vol = 0.18) {
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startTime);

  // Soft attack / release envelope
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(vol, startTime + 0.04);
  gain.gain.setValueAtTime(vol, startTime + duration - 0.06);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
}

export async function playBirthday() {
  if (playing) return;
  _ensureCtx();
  playing  = true;
  stopFlag = false;

  let t = audioCtx.currentTime + 0.1;

  for (const [note, beats] of MELODY) {
    if (stopFlag) break;
    const freq = NOTES[note];
    const dur  = beats * BEAT_SEC * 0.88; // slight staccato
    _playNote(freq, t, dur);
    t += beats * BEAT_SEC;
  }

  // Wait until melody finishes, then loop
  const totalDur = MELODY.reduce((s, [, b]) => s + b, 0) * BEAT_SEC * 1000;
  await new Promise(r => setTimeout(r, totalDur + 200));

  playing = false;
  if (!stopFlag) playBirthday(); // loop
}

export function stopMusic() {
  stopFlag = true;
  playing  = false;
  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
  }
}

export function fadeOutMusic() {
  stopFlag = true;
  playing  = false;
  // Gentle close after current note finishes
  setTimeout(() => {
    if (audioCtx) { audioCtx.close(); audioCtx = null; }
  }, 600);
}