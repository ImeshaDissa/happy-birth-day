import { playBirthday } from './music.js';

export function initGift(onOpened) {
  const overlay = document.getElementById('gift-overlay');
  const box     = document.getElementById('gift-box');
  const hint    = document.getElementById('gift-hint');

  // Idle float animation
  let floatAngle = 0;
  let floatRaf;
  function floatBox() {
    floatAngle += 0.02;
    const y = Math.sin(floatAngle) * 6;
    box.style.transform = `translateY(${y}px)`;
    floatRaf = requestAnimationFrame(floatBox);
  }
  floatBox();

  function openGift() {
    cancelAnimationFrame(floatRaf);
    box.style.transform = '';
    hint.style.opacity  = '0';
    box.classList.add('opening');

    // Play music on user gesture (required by browsers)
    playBirthday();

    setTimeout(() => {
      overlay.classList.add('fade-out');
      setTimeout(() => {
        overlay.style.display = 'none';
        onOpened();
      }, 800);
    }, 1200);
  }

  overlay.addEventListener('click',     openGift, { once: true });
  overlay.addEventListener('touchstart', openGift, { once: true, passive: true });
}