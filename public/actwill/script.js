/* ============================================================
   運送資金ナビ｜LP用スクリプト（必要最小限）
   1. FAQアコーディオン
   2. スマホ固定CTAの表示制御（FV内では隠す）
   3. アフィリエイトリンクのクリック計測（GA4 / Clarity）
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

  /* --- 3. アフィリエイトリンクのクリック計測 --------------- */
  /* CTA（data-cta付きのリンク）が押されたら affiliate_click を送信する。
     GA4側でこのイベントを「キーイベント」に指定するとCVとして集計できる。
     cta_position でどのCTAが押されたかを分解できる。 */
  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('a[data-cta]') : null;
    if (!link) return;

    var position = link.getAttribute('data-cta') || 'unknown';
    var label = (link.textContent || '').replace(/[›\s]+/g, ' ').trim();

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'affiliate_click', {
        cta_position: position,
        cta_label: label,
        link_url: link.href,
        advertiser: 'actwill'
      });
    }

    // Clarity側にも記録し、セッション録画をCTA別に絞り込めるようにする
    if (typeof window.clarity === 'function') {
      window.clarity('event', 'affiliate_click');
      window.clarity('set', 'cta_position', position);
    }
  }, true);
})();
