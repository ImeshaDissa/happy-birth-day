//wish reveal, canvas-confetti

import { state } from './state.js';

export function triggerWish() {
  const card = document.getElementById('wish-card');
  const text = document.getElementById('wish-text');

  text.textContent = state.wishMessage;
  card.classList.remove('hidden');
  requestAnimationFrame(() => card.classList.add('visible'));

  _fireConfetti();
}

function _fireConfetti() {
  const end    = Date.now() + 3500;
  const colors = [state.cakeColor, state.frostingColor, '#FFD93D', '#FF6B9D', '#6BCB77', '#C77DFF'];

  (function frame() {
    confetti({ particleCount: 5, angle: 60,  spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}