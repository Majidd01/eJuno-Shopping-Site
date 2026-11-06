/**
 * Service-only "Add to Registry" — small standalone asset.
 * Do not put this logic in ejuno-product-booking-scripts.liquid (file is near Shopify's 256KB limit).
 */
(function () {
  'use strict';

  function notify(message, type) {
    if (typeof window.showNotification === 'function') {
      window.showNotification(message, type || 'info');
      return;
    }
    window.alert(message);
  }

  function isServiceContext(btn) {
    if (btn && btn.getAttribute('data-ejuno-service-registry') === '1') return true;
    if (typeof window.ejunoBookingIsService === 'function' && window.ejunoBookingIsService()) {
      return true;
    }
    var pdp = document.querySelector('.ejuno-pdp');
    if (pdp && (pdp.classList.contains('ejuno-pdp--service') || pdp.getAttribute('data-ejuno-service-hint') === '1')) {
      return true;
    }
    var vt = String(window.ejunoVendorType || '').toLowerCase();
    return vt === 'service';
  }

  function getSelectedDates() {
    if (typeof window.getCdpSelectedDates === 'function') {
      try {
        var dates = window.getCdpSelectedDates();
        if (Array.isArray(dates) && dates.length) return dates.slice();
      } catch (e) {}
    }
    if (Array.isArray(window.selectedDates) && window.selectedDates.length) {
      return window.selectedDates.slice();
    }
    if (Array.isArray(window.ejunoStayDates) && window.ejunoStayDates.length) {
      return window.ejunoStayDates.slice();
    }
    return [];
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
    return new Promise(function (resolve) {
      var existing = document.getElementById('ejuno-service-registry-confirm');
      if (existing) existing.remove();

      var overlay = document.createElement('div');
      overlay.id = 'ejuno-service-registry-confirm';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.style.cssText =
        'position:fixed;inset:0;background:rgba(17,17,17,.45);display:flex;align-items:center;justify-content:center;z-index:100000;padding:16px;';

      var box = document.createElement('div');
      box.style.cssText =
        'background:#fff;border-radius:14px;max-width:420px;width:100%;padding:22px;box-shadow:0 18px 50px rgba(0,0,0,.2);font-family:inherit;';
      box.innerHTML =
        '<p style="margin:0 0 6px;font-size:12px;letter-spacing:.04em;text-transform:uppercase;opacity:.6;">Add to registry</p>' +
        '<h3 style="margin:0 0 12px;font-size:20px;line-height:1.3;">Confirm service</h3>' +
        '<p style="margin:0 0 8px;font-size:14px;"><strong>Preferred date:</strong> ' +
        (opts.dateLabel || '') +
        '</p>' +
        '<p style="margin:0 0 8px;font-size:14px;"><strong>Price:</strong> ' +
        (opts.priceLabel || '') +
        '</p>' +
        '<p style="margin:0 0 16px;font-size:13px;line-height:1.45;opacity:.75;">This date is a preference for guests only. It does not reserve the vendor calendar.</p>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
        '<button type="button" data-cancel style="min-width:96px;padding:10px 14px;border-radius:8px;border:1px solid rgba(0,0,0,.15);background:#fff;cursor:pointer;">Cancel</button>' +
        '<button type="button" data-confirm style="min-width:96px;padding:10px 14px;border-radius:8px;border:0;background:#111;color:#fff;cursor:pointer;">Add to registry</button>' +
        '</div>';

      overlay.appendChild(box);
      document.body.appendChild(overlay);

      function close(result) {
        overlay.remove();
        resolve(result);
      }

      box.querySelector('[data-cancel]').addEventListener('click', function () {
        close(false);
      });
      box.querySelector('[data-confirm]').addEventListener('click', function () {
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
    var dates = getSelectedDates();
    if (!dates.length) {
      notify('Please select a date first, then confirm it before adding to registry.', 'error');
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

    var preferredDate = dates[dates.length - 1];
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
        },
        btn,
      );
    });
  }

  function bindServiceRegistryButtons() {
    document.querySelectorAll('[data-ejuno-service-registry="1"]').forEach(function (btn) {
      if (btn.dataset.ejunoServiceRegistryBound === '1') return;
      btn.dataset.ejunoServiceRegistryBound = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        addServiceToRegistry(btn);
      });
    });
  }

  // Prefer our service handler when V5/catalog path calls the shared helper.
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
