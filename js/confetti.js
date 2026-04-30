import { state } from './state.js';

export function triggerWish() {
  const card = document.getElementById('wish-card');
  const text = document.getElementById('wish-text');
  if (!card || !text) return;

  text.textContent = state.wishMessage;
  card.classList.remove('hidden');
  requestAnimationFrame(() => card.classList.add('visible'));

  _fireConfetti();
}

function _fireConfetti() {
  if (typeof confetti === 'undefined') return;
  const end    = Date.now() + 4000;
  const colors = [state.cakeColor, state.frostingColor, '#FFD93D', '#FF6B9D', '#6BCB77', '#C77DFF'];

  (function frame() {
    confetti({ particleCount: 6, angle: 60,  spread: 60, origin: { x: 0 }, colors });
    confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}