/**
 * Service-only "Add to Registry" — small standalone asset.
 * Keep this out of ejuno-product-booking-scripts.liquid (near Shopify's 256KB limit).
 */
(function () {
  'use strict';

  var STYLE_ID = 'ejuno-service-registry-styles';

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '#ejuno-service-registry-confirm{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;background:rgba(22,18,15,.72);backdrop-filter:blur(6px);}',
      '#ejuno-service-registry-confirm .ejuno-sr-dialog{width:min(440px,100%);background:var(--paper,#fffdf9);border:1px solid var(--line,#ded5ca);border-radius:20px;box-shadow:var(--shadow,0 18px 50px rgba(32,28,25,.18));overflow:hidden;font-family:inherit;color:var(--ink,#201c19);}',
      '#ejuno-service-registry-confirm .ejuno-sr-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px 22px 0;}',
      '#ejuno-service-registry-confirm .ejuno-sr-kicker{margin:0 0 6px;font-size:11px;letter-spacing:.18em;text-transform:uppercase;font-weight:700;color:var(--olive,#536046);}',
      '#ejuno-service-registry-confirm .ejuno-sr-title{margin:0;font-family:var(--serif,Georgia,serif);font-size:28px;font-weight:400;line-height:1.15;color:var(--ink,#201c19);}',
      '#ejuno-service-registry-confirm .ejuno-sr-close{width:38px;height:38px;display:grid;place-items:center;flex-shrink:0;padding:0;border:0;border-radius:50%;background:var(--soft,#ece5dd);color:var(--muted,#6d645d);font-size:26px;line-height:1;cursor:pointer;}',
      '#ejuno-service-registry-confirm .ejuno-sr-body{padding:16px 22px 8px;}',
      '#ejuno-service-registry-confirm .ejuno-sr-rows{display:grid;gap:10px;margin:0 0 14px;}',
      '#ejuno-service-registry-confirm .ejuno-sr-row{display:flex;justify-content:space-between;gap:16px;padding:12px 14px;border:1px solid var(--line,#ded5ca);border-radius:14px;background:rgba(255,255,255,.72);}',
      '#ejuno-service-registry-confirm .ejuno-sr-row span{color:var(--muted,#6d645d);font-size:13px;}',
      '#ejuno-service-registry-confirm .ejuno-sr-row strong{font-size:14px;color:var(--ink,#201c19);text-align:right;}',
      '#ejuno-service-registry-confirm .ejuno-sr-note{margin:0;font-size:13px;line-height:1.5;color:var(--muted,#6d645d);}',
      '#ejuno-service-registry-confirm .ejuno-sr-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:10px;padding:18px 22px 22px;}',
      '#ejuno-service-registry-confirm .ejuno-sr-actions .btn{min-height:44px;padding:0 20px;}',
    ].join('');
    document.head.appendChild(style);
  }

  function notify(message, type) {
    if (typeof window.showNotification === 'function') {
      window.showNotification(message, type || 'info');
      return;
    }
    window.alert(message);
  }

  function isServiceContext(btn) {
    if (btn && btn.getAttribute('data-ejuno-service-registry') === '1') return true;
    // Canonical: product API { type: "Service" }.
    var pd = window.productDetails || window.productData;
    if (pd && String(pd.type || '').trim().toLowerCase() === 'service') return true;
    if (pd && pd.vendor && String(pd.vendor.type || '').trim().toLowerCase() === 'service') {
      return true;
    }
    if (typeof window.ejunoBookingIsService === 'function' && window.ejunoBookingIsService()) {
      return true;
    }
    var pdp = document.querySelector('.ejuno-pdp');
    if (
      pdp &&
      (pdp.classList.contains('ejuno-pdp--service') ||
        pdp.getAttribute('data-ejuno-service-hint') === '1')
    ) {
      return true;
    }
    return String(window.ejunoVendorType || '').trim().toLowerCase() === 'service';
  }

  /** Services are single-day only — take exactly one preferred date. */
  function getPreferredServiceDate() {
    var dates = [];
    if (typeof window.getCdpSelectedDates === 'function') {
      try {
        var fromGetter = window.getCdpSelectedDates();
        if (Array.isArray(fromGetter) && fromGetter.length) dates = fromGetter.slice();
      } catch (e) {}
    }
    if (!dates.length && Array.isArray(window.selectedDates) && window.selectedDates.length) {
      dates = window.selectedDates.slice();
    }
    if (!dates.length && Array.isArray(window.ejunoStayDates) && window.ejunoStayDates.length) {
      dates = window.ejunoStayDates.slice();
    }
    if (!dates.length) return null;
    // One day only for services.
    return String(dates[0]);
  }

  function getVariantId(pd) {
    var input = document.getElementById('ejuno-product-variant-id');
    if (input && input.value) return input.value;
    var fromUrl = new URLSearchParams(window.location.search).get('variant');
    if (fromUrl) return fromUrl;
    if (pd && pd.variants && pd.variants.length) {
      return pd.variants[0].id || pd.variants[0].variantId;
    }
    return null;
  }

  function getVariantPrice(pd, variantId) {
    var variants = (pd && pd.variants) || [];
    var match =
      variants.find(function (v) {
        return String(v.id || v.variantId) === String(variantId);
      }) || variants[0];
    if (!match) return null;
    var n = Number(match.price != null ? match.price : match.price_amount);
    return Number.isFinite(n) ? n : null;
  }

  function formatMoney(amount) {
    var n = Number(amount);
    if (!Number.isFinite(n)) return '';
    try {
      var currency =
        (window.Shopify && Shopify.currency && Shopify.currency.active) || 'GBP';
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency,
      }).format(n);
    } catch (e) {
      return String(n);
    }
  }

  function formatDateLabel(dateString) {
    if (typeof window.formatDateDisplay === 'function') {
      try {
        return window.formatDateDisplay(dateString);
      } catch (e) {}
    }
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (e2) {
      return String(dateString);
    }
  }

  function confirmAdd(opts) {
    ensureStyles();
    return new Promise(function (resolve) {
      var existing = document.getElementById('ejuno-service-registry-confirm');
      if (existing) existing.remove();

      var overlay = document.createElement('div');
      overlay.id = 'ejuno-service-registry-confirm';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.innerHTML =
        '<div class="ejuno-sr-dialog" role="document">' +
        '<div class="ejuno-sr-head">' +
        '<div>' +
        '<p class="ejuno-sr-kicker">Add to registry</p>' +
        '<h3 class="ejuno-sr-title">Confirm service</h3>' +
        '</div>' +
        '<button type="button" class="ejuno-sr-close" data-cancel aria-label="Close">&times;</button>' +
        '</div>' +
        '<div class="ejuno-sr-body">' +
        '<div class="ejuno-sr-rows">' +
        '<div class="ejuno-sr-row"><span>Preferred date</span><strong>' +
        (opts.dateLabel || '') +
        '</strong></div>' +
        '<div class="ejuno-sr-row"><span>Price</span><strong>' +
        (opts.priceLabel || '') +
        '</strong></div>' +
        '</div>' +
        '<p class="ejuno-sr-note">Services are for one day only. This date is a preference for guests — it does not reserve the vendor calendar. You can add the same service again for a different date.</p>' +
        '</div>' +
        '<div class="ejuno-sr-actions">' +
        '<button type="button" class="btn secondary" data-cancel>Cancel</button>' +
        '<button type="button" class="btn primary" data-confirm>Add to registry</button>' +
        '</div>' +
        '</div>';

      document.body.appendChild(overlay);

      function close(result) {
        overlay.remove();
        resolve(result);
      }

      overlay.querySelectorAll('[data-cancel]').forEach(function (el) {
        el.addEventListener('click', function () {
          close(false);
        });
      });
      overlay.querySelector('[data-confirm]').addEventListener('click', function () {
        close(true);
      });
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) close(false);
      });
    });
  }

  function postRegistry(payload, button) {
    var apiBase = String(window.EJUNO_API || '').replace(/\/$/, '');
    if (!apiBase) {
      notify('API is not configured.', 'error');
      if (button) button.disabled = false;
      return;
    }
    var token = localStorage.getItem('authToken');
    if (!token) {
      notify('Please sign in to use your registry.', 'error');
      if (button) button.disabled = false;
      return;
    }

    fetch(apiBase + '/registry-products/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token.indexOf('Bearer ') === 0 ? token : 'Bearer ' + token,
      },
      body: JSON.stringify(payload),
    })
      .then(function (response) {
        return response.json().then(function (body) {
          if (!response.ok) {
            throw new Error(body.message || 'Failed to add to registry');
          }
          return body;
        });
      })
      .then(function () {
        notify('Service added to registry successfully!', 'success');
      })
      .catch(function (err) {
        notify(err.message || 'Error adding service to registry.', 'error');
      })
      .finally(function () {
        if (button) button.disabled = false;
      });
  }

  function addServiceToRegistry(triggerBtn) {
    var btn = triggerBtn || document.querySelector('[data-ejuno-service-registry="1"]');
    var role = String(
      localStorage.getItem('customerRole') || localStorage.getItem('customerType') || '',
    ).toLowerCase();
    if (role === 'guest') {
      notify('Add to registry is available for couples. Sign in with a couple account.', 'warn');
      return;
    }

    var customerId = localStorage.getItem('customerId');
    var authToken = localStorage.getItem('authToken');
    if (!customerId || !authToken) {
      if (typeof window.showLoginPopups === 'function') {
        return window.showLoginPopups(function () {
          addServiceToRegistry(btn);
        });
      }
      notify('Please sign in to use your registry.', 'error');
      return;
    }

    if (btn) btn.disabled = true;

    var pd = window.productDetails || window.productData || {};
    var preferredDate = getPreferredServiceDate();
    if (!preferredDate) {
      notify('Please select one preferred date, then confirm it before adding to registry.', 'error');
      if (btn) btn.disabled = false;
      var openDates = document.querySelector(
        '[data-ejuno-open-dates], #selected-date-div, .ejuno-booking-field--dates button, .ejuno-booking-field--dates',
      );
      if (openDates && typeof openDates.click === 'function') {
        try {
          openDates.click();
        } catch (e) {}
      }
      return;
    }

    var variantId = getVariantId(pd);
    var price = getVariantPrice(pd, variantId);
    var shopifyProductId =
      (pd && pd.shopifyProductId) ||
      (typeof window.productId !== 'undefined' ? window.productId : null);

    confirmAdd({
      dateLabel: formatDateLabel(preferredDate),
      priceLabel: price != null ? formatMoney(price) : 'See listing',
    }).then(function (ok) {
      if (!ok) {
        if (btn) btn.disabled = false;
        return;
      }
      postRegistry(
        {
          shopifyProductId: shopifyProductId,
          variantId: variantId,
          preferredDate: preferredDate,
          date: preferredDate,
          listedPrice: price,
          offeringType: 'Service',
        },
        btn,
      );
    });
  }

  function bindServiceRegistryButtons() {
    document.querySelectorAll('[data-ejuno-service-registry="1"]').forEach(function (btn) {
      if (btn.dataset.ejunoServiceRegistryBound === '1') return;
      btn.dataset.ejunoServiceRegistryBound = '1';
      btn.addEventListener(
        'click',
        function (e) {
          e.preventDefault();
          e.stopImmediatePropagation();
          addServiceToRegistry(btn);
        },
        true,
      );
    });
  }

  var previousAdd = window.ejunoAddProductToRegistry;
  window.ejunoAddProductToRegistry = function (triggerBtn) {
    if (isServiceContext(triggerBtn)) {
      return addServiceToRegistry(triggerBtn);
    }
    if (typeof previousAdd === 'function') {
      return previousAdd(triggerBtn);
    }
  };
  window.ejunoAddServiceToRegistry = addServiceToRegistry;

  function boot() {
    bindServiceRegistryButtons();
    if (typeof window.syncCdpRegistryButtonVisibility === 'function') {
      window.syncCdpRegistryButtonVisibility();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  document.addEventListener('productDetailsLoaded', boot);
})();
