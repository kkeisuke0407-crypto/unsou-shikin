/* ============================================================
   運送資金ナビ｜LP用スクリプト（必要最小限）
   1. FAQアコーディオン
   2. スマホ固定CTAの表示制御（FV内では隠す）
   ============================================================ */
(function () {
  'use strict';

  /* --- 1. FAQアコーディオン ------------------------------- */
  var faqButtons = document.querySelectorAll('.faq-q');
  Array.prototype.forEach.call(faqButtons, function (btn) {
    var item = btn.closest('.faq-item');
    var panel = item.querySelector('.faq-a');
    var open = false;

    btn.setAttribute('aria-expanded', 'false');
    panel.setAttribute('aria-hidden', 'true');

    btn.addEventListener('click', function () {
      open = !open;
      item.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      panel.setAttribute('aria-hidden', String(!open));
    });
  });

  /* --- 2. スマホ固定CTAの表示制御 ------------------------- */
  var fixedCta = document.querySelector('.fixed-cta');
  var hero = document.querySelector('.hero');
  if (fixedCta && hero && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        // FVが大きく見えている間は固定CTAを隠す
        fixedCta.style.opacity = entry.intersectionRatio > 0.5 ? '0' : '1';
        fixedCta.style.pointerEvents = entry.intersectionRatio > 0.5 ? 'none' : 'auto';
      });
    }, { threshold: [0, 0.5, 1] });
    io.observe(hero);
    fixedCta.style.transition = 'opacity .25s ease';
  }
})();
