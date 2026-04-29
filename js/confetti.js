// confetti.js – wish card reveal + canvas-confetti burst
import { state } from './state.js';

export function triggerWish() {
  const card = document.getElementById('wish-card');
  const text = document.getElementById('wish-text');
  if (!card || !text) return;

  text.textContent = state.wishMessage;
  card.classList.remove('hidden');
  requestAnimationFrame(() => card.classList.add('visible'));

  // Give the animation a tick to start, then fire confetti
  setTimeout(_fireConfetti, 300);
}

function _fireConfetti() {
  const end    = Date.now() + 4000;
  const colors = [
    state.cakeColor,
    state.frostingColor,
    '#FFD93D', '#FF6B9D', '#6BCB77', '#C77DFF', '#4D96FF',
  ];

  // Initial burst
  confetti({ particleCount: 120, spread: 100, origin: { y: 0.6 }, colors, startVelocity: 35 });

  // Sustained stream from sides
  (function frame() {
    confetti({ particleCount: 6, angle: 60,  spread: 55, origin: { x: 0,   y: 0.7 }, colors });
    confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1,   y: 0.7 }, colors });
    confetti({ particleCount: 3, angle: 90,  spread: 80, origin: { x: 0.5, y: 0.9 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}