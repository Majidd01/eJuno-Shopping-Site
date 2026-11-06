(function () {
  var STORAGE_KEY = 'ejuno_cookie_consent_v1';
  var SUPPRESS_SELECTORS = [
    '#shopify-pc__banner',
    '.shopify-pc__banner__dialog',
    '#shopify-privacy-banner',
    'shopify-privacy-banner',
    'shopify-cookie-banner'
  ];

  function getBar() {
    return document.getElementById('ejuno-cookie-consent');
  }

  function hasLocalChoice() {
    try {
      return !!localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return false;
    }
  }

  function suppressShopifyBanner() {
    SUPPRESS_SELECTORS.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (node) {
        if (node.id === 'ejuno-cookie-consent') return;
        node.setAttribute('hidden', '');
        node.setAttribute('aria-hidden', 'true');
        node.style.setProperty('display', 'none', 'important');
      });
    });
  }

  function loadCustomerPrivacy(callback) {
    if (!window.Shopify || typeof window.Shopify.loadFeatures !== 'function') {
      callback(null);
      return;
    }
    if (window.Shopify.customerPrivacy) {
      callback(window.Shopify.customerPrivacy);
      return;
    }
    window.Shopify.loadFeatures(
      [{ name: 'consent-tracking-api', version: '0.1' }],
      function (error) {
        callback(error ? null : window.Shopify.customerPrivacy || null);
      }
    );
  }

  function persistLocalChoice(choice) {
    try {
      localStorage.setItem(STORAGE_KEY, choice || 'accepted');
    } catch (e) {}
  }

  function hideBar(choice) {
    var bar = getBar();
    if (!bar) return;
    if (choice === 'accepted' || choice === 'essential') {
      persistLocalChoice(choice);
    }
    bar.classList.remove('is-visible');
    document.body.classList.remove('ejuno-cookie-visible');
    window.setTimeout(function () {
      bar.setAttribute('hidden', '');
    }, 400);
  }

  function showBar() {
    var bar = getBar();
    if (!bar) return;
    bar.removeAttribute('hidden');
    bar.style.removeProperty('display');
    document.body.classList.add('ejuno-cookie-visible');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        bar.classList.add('is-visible');
      });
    });
  }

  function applyShopifyConsent(choice, done) {
    loadCustomerPrivacy(function (customerPrivacy) {
      if (!customerPrivacy || typeof customerPrivacy.setTrackingConsent !== 'function') {
        done();
        return;
      }
      if (choice === 'accepted') {
        customerPrivacy.setTrackingConsent(
          { analytics: true, marketing: true, preferences: true },
          done
        );
        return;
      }
      customerPrivacy.setTrackingConsent(
        { analytics: false, marketing: false, preferences: false },
        done
      );
    });
  }

  function watchShopifyBanner() {
    suppressShopifyBanner();
    if (!window.MutationObserver) return;
    var observer = new MutationObserver(function () {
      suppressShopifyBanner();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function init() {
    var bar = getBar();
    if (!bar) return;

    watchShopifyBanner();

    bar.querySelector('[data-ejuno-cookie-accept]')?.addEventListener('click', function () {
      applyShopifyConsent('accepted', function () {
        hideBar('accepted');
        suppressShopifyBanner();
      });
    });
    bar.querySelector('[data-ejuno-cookie-decline]')?.addEventListener('click', function () {
      applyShopifyConsent('essential', function () {
        hideBar('essential');
        suppressShopifyBanner();
      });
    });

    loadCustomerPrivacy(function () {
      suppressShopifyBanner();
    });

    if (hasLocalChoice()) {
      hideBar();
    } else {
      showBar();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
