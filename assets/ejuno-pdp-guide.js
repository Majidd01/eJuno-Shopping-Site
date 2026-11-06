(function () {
  function isOliversTravelProduct() {
    var pd = window.productDetails;
    if (pd && String(pd.source || '').toLowerCase() === 'olivers_travel') return true;
    var pdp = document.querySelector('.ejuno-pdp');
    return !!(pdp && pdp.classList.contains('ejuno-pdp--olivers'));
  }

  function syncGuideMode(root) {
    var pdp = document.querySelector('.ejuno-pdp');
    if (!pdp) return;
    var mode = 'venue';
    if (pdp.classList.contains('ejuno-pdp--catalog')) mode = 'product';
    else if (pdp.classList.contains('ejuno-pdp--service')) mode = 'service';
    else if (isOliversTravelProduct()) mode = 'olivers';
    root.setAttribute('data-guide-mode', mode);
    root.querySelectorAll('[data-guide-panel]').forEach(function (panel) {
      panel.hidden = panel.getAttribute('data-guide-panel') !== mode;
    });
    var titleEl = root.querySelector('#EjunoPdpGuideTitle');
    if (titleEl) {
      var oliversTitle = root.getAttribute('data-guide-title-olivers');
      var defaultTitle = root.getAttribute('data-guide-title-default');
      if (mode === 'olivers' && oliversTitle) titleEl.textContent = oliversTitle;
      else if (defaultTitle) titleEl.textContent = defaultTitle;
    }
  }

  function scrollToBooking() {
    var target = document.getElementById('ejuno-request-availability');
    if (!target) return;
    var offset = window.matchMedia('(max-width: 760px)').matches ? 88 : 96;
    var top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  function scrollToCommerce() {
    var form = document.getElementById('ejuno-product-form') || document.querySelector('.ejuno-pdp-commerce-ui');
    var target = form || document.getElementById('ejuno-request-availability');
    if (!target) return;
    var offset = 96;
    var top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  function triggerRegistry() {
    var btn =
      document.querySelector('[data-ejuno-registry-trigger]') ||
      document.getElementById('registry-btn');
    if (btn) btn.click();
    else scrollToCommerce();
  }

  function initGuide(root) {
    var fab = root.querySelector('[data-guide-open]');
    var dialog = root.querySelector('.ejuno-pdp-guide__dialog');
    var backdrop = root.querySelector('.ejuno-pdp-guide__backdrop');
    if (!fab || !dialog) return;

    function openGuide() {
      syncGuideMode(root);
      root.classList.add('is-open');
      dialog.removeAttribute('hidden');
      if (backdrop) backdrop.removeAttribute('hidden');
      fab.setAttribute('aria-expanded', 'true');
      document.body.classList.add('ejuno-pdp-guide-open');
      var closeBtn = root.querySelector('.ejuno-pdp-guide__close');
      if (closeBtn) closeBtn.focus();
    }

    function closeGuide(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      root.classList.remove('is-open');
      dialog.setAttribute('hidden', '');
      if (backdrop) backdrop.setAttribute('hidden', '');
      fab.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('ejuno-pdp-guide-open');
    }

    closeGuide();

    fab.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      openGuide();
    });
    root.querySelectorAll('[data-guide-close]').forEach(function (el) {
      el.addEventListener('click', closeGuide);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('is-open')) closeGuide();
    });

    root.querySelectorAll('[data-guide-scroll="booking"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        closeGuide();
        scrollToBooking();
      });
    });

    root.querySelectorAll('[data-guide-scroll="commerce"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        closeGuide();
        scrollToCommerce();
      });
    });

    root.querySelectorAll('[data-guide-trigger="registry"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        closeGuide();
        triggerRegistry();
      });
    });

    syncGuideMode(root);
    window.addEventListener('productDetailsLoaded', function () {
      syncGuideMode(root);
    });
  }

  function init() {
    document.querySelectorAll('[data-ejuno-pdp-guide]').forEach(initGuide);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
