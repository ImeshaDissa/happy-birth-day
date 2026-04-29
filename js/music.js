// music.js – synthesised Happy Birthday melody via Web Audio API

const NOTE_FREQUENCIES = {
  G4: 392.0,  A4: 440.0,  B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25,
  F5: 698.46, G5: 783.99,
};

// Happy Birthday to You – full tune
const HAPPY_BIRTHDAY = [
  ['G4', 0.28], ['G4', 0.28], ['A4', 0.56], ['G4', 0.56], ['C5', 0.56], ['B4', 1.10],
  ['G4', 0.28], ['G4', 0.28], ['A4', 0.56], ['G4', 0.56], ['D5', 0.56], ['C5', 1.10],
  ['G4', 0.28], ['G4', 0.28], ['G5', 0.56], ['E5', 0.56], ['C5', 0.56], ['B4', 0.56], ['A4', 1.10],
  ['F5', 0.28], ['F5', 0.28], ['E5', 0.56], ['C5', 0.56], ['D5', 0.56], ['C5', 1.20],
];

let audioCtx = null;

export function playHappyBirthday() {
  if (!window.AudioContext && !window.webkitAudioContext) return;

  // Resume or create context (needed for browsers that require user gesture)
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
  gain.connect(audioCtx.destination);

  // Use two oscillators for a richer tone (triangle + sine)
  ['triangle', 'sine'].forEach((type, layerIdx) => {
    const osc = audioCtx.createOscillator();
    osc.type  = type;
    osc.connect(gain);

    const startTime = audioCtx.currentTime + 0.05;
    let time = startTime;
    const vol = layerIdx === 0 ? 0.16 : 0.07;

    HAPPY_BIRTHDAY.forEach(([note, duration]) => {
      const freq = NOTE_FREQUENCIES[note] || 440;
      // Detune second layer slightly for chorus effect
      osc.frequency.setValueAtTime(freq * (layerIdx === 1 ? 1.005 : 1), time);
      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.88);
      time += duration;
    });

    osc.start(startTime);
    osc.stop(time + 0.1);
    osc.onended = () => { try { gain.disconnect(); } catch (_) {} };
  });
}
