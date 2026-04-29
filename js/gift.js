// gift.js – handles the gift-unwrap screen interaction
import { revealCake } from './scene.js';
import { playHappyBirthday } from './music.js';

export function initGiftScreen() {
  const btnUnwrap  = document.getElementById('btn-unwrap');
  const giftWrap   = document.getElementById('gift-wrap');
  const cakeReveal = document.getElementById('cake-reveal');
  const blowCtrl   = document.getElementById('blow-controls');
  const giftLid    = document.querySelector('.gift-lid');

  if (!btnUnwrap) return;

  btnUnwrap.addEventListener('click', () => {
    // 1) Animate lid lifting
    if (giftLid) giftLid.classList.add('lifting');

    // 2) After brief delay, swap screens
    setTimeout(() => {
      giftWrap.classList.add('hidden');
      cakeReveal.classList.remove('hidden');

      // 3) Start the 3-D cake
      revealCake();
      playHappyBirthday();

      // 4) Show the blow controls after the scale-in animation settles
      setTimeout(() => {
        blowCtrl.classList.remove('hidden');
      }, 1800);
    }, 600);
  });
}
