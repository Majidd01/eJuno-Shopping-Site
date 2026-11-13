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
      '#ejuno-service-registry-confirm, #ejuno-delivery-address-modal{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;background:rgba(22,18,15,.72);backdrop-filter:blur(6px);}',
      '#ejuno-service-registry-confirm .ejuno-sr-dialog, #ejuno-delivery-address-modal .ejuno-sr-dialog{width:min(480px,100%);background:var(--paper,#fffdf9);border:1px solid var(--line,#ded5ca);border-radius:20px;box-shadow:var(--shadow,0 18px 50px rgba(32,28,25,.18));overflow:hidden;font-family:inherit;color:var(--ink,#201c19);max-height:min(92vh,760px);display:flex;flex-direction:column;}',
      '#ejuno-service-registry-confirm .ejuno-sr-head, #ejuno-delivery-address-modal .ejuno-sr-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px 22px 0;}',
      '#ejuno-service-registry-confirm .ejuno-sr-kicker, #ejuno-delivery-address-modal .ejuno-sr-kicker{margin:0 0 6px;font-size:11px;letter-spacing:.18em;text-transform:uppercase;font-weight:700;color:var(--olive,#536046);}',
      '#ejuno-service-registry-confirm .ejuno-sr-title, #ejuno-delivery-address-modal .ejuno-sr-title{margin:0;font-family:var(--serif,Georgia,serif);font-size:26px;font-weight:400;line-height:1.15;color:var(--ink,#201c19);}',
      '#ejuno-service-registry-confirm .ejuno-sr-close, #ejuno-delivery-address-modal .ejuno-sr-close{width:38px;height:38px;display:grid;place-items:center;flex-shrink:0;padding:0;border:0;border-radius:50%;background:var(--soft,#ece5dd);color:var(--muted,#6d645d);font-size:26px;line-height:1;cursor:pointer;}',
      '#ejuno-service-registry-confirm .ejuno-sr-body, #ejuno-delivery-address-modal .ejuno-sr-body{padding:16px 22px 8px;overflow-y:auto;flex:1;}',
      '#ejuno-service-registry-confirm .ejuno-sr-rows{display:grid;gap:10px;margin:0 0 14px;}',
      '#ejuno-service-registry-confirm .ejuno-sr-row{display:flex;justify-content:space-between;gap:16px;padding:12px 14px;border:1px solid var(--line,#ded5ca);border-radius:14px;background:rgba(255,255,255,.72);}',
      '#ejuno-service-registry-confirm .ejuno-sr-row span{color:var(--muted,#6d645d);font-size:13px;}',
      '#ejuno-service-registry-confirm .ejuno-sr-row strong{font-size:14px;color:var(--ink,#201c19);text-align:right;}',
      '#ejuno-service-registry-confirm .ejuno-sr-note, #ejuno-delivery-address-modal .ejuno-sr-note{margin:0;font-size:13px;line-height:1.5;color:var(--muted,#6d645d);}',
      '#ejuno-service-registry-confirm .ejuno-sr-actions, #ejuno-delivery-address-modal .ejuno-sr-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:10px;padding:18px 22px 22px;border-top:1px solid var(--line,#ded5ca);background:var(--paper,#fffdf9);}',
      '#ejuno-service-registry-confirm .ejuno-sr-actions .btn, #ejuno-delivery-address-modal .ejuno-sr-actions .btn{min-height:44px;padding:0 20px;}',
      '.ejuno-addr-field{display:flex;flex-direction:column;gap:5px;margin-bottom:12px;}',
      '.ejuno-addr-field label{font-size:13px;font-weight:600;color:var(--ink,#201c19);margin:0;}',
      '.ejuno-addr-field label span{color:#b03a3a;}',
      '.ejuno-addr-input{width:100%;height:40px;padding:8px 12px;border:1px solid var(--line,#ded5ca);border-radius:10px;font-size:14px;box-sizing:border-box;background:#fff;color:var(--ink,#201c19);font-family:inherit;}',
      '.ejuno-addr-input:focus{outline:none;border-color:var(--olive,#536046);box-shadow:0 0 0 2px rgba(83,96,70,.15);}',
      '.ejuno-addr-select{appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%228%22%20viewBox%3D%220%200%2012%208%22%3E%3Cpath%20fill%3D%22%236d645d%22%20d%3D%22M1.41%200L6%204.58%2010.59%200%2012%201.41l-6%206-6-6z%22%2F%3E%3C%2Fsvg%3E");background-repeat:no-repeat;background-position:right 14px center;padding-right:36px;cursor:pointer;}',
      '.ejuno-addr-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}',
      '@media(max-width:480px){.ejuno-addr-grid-2{grid-template-columns:1fr;gap:0;}}',
      '.ejuno-addr-error{display:none;background:#fdf2f2;border:1px solid #f8b4b4;color:#b03a3a;padding:10px 14px;border-radius:10px;font-size:13px;line-height:1.4;margin:0 0 14px;}',
      '.ejuno-addr-check{display:flex;align-items:center;gap:8px;margin-top:4px;margin-bottom:8px;font-size:13px;color:var(--ink,#201c19);cursor:pointer;}',
      '.ejuno-addr-check input{width:16px;height:16px;accent-color:var(--olive,#536046);margin:0;cursor:pointer;}',
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

      var isBundle = Boolean(opts.isBundle);
      var minGuests = opts.minGuests || 1;
      var maxGuests = opts.maxGuests || null;
      var unitPrice = opts.unitPrice != null ? Number(opts.unitPrice) : null;
      var currentCapacity = minGuests;
      var currentTotalPrice = unitPrice != null ? (isBundle ? unitPrice * currentCapacity : unitPrice) : null;

      var capacityFieldHtml = '';
      if (isBundle) {
        var rangeHint = maxGuests ? 'Between ' + minGuests + ' and ' + maxGuests + ' guests' : (minGuests > 1 ? 'Minimum ' + minGuests + ' guests' : '');
        capacityFieldHtml = [
          '<div class="ejuno-sr-row ejuno-sr-row--capacity" style="display:flex;flex-direction:column;align-items:stretch;gap:6px;">',
          '<div style="display:flex;justify-content:space-between;align-items:center;">',
          '<label for="ejuno-sr-capacity" style="font-size:13px;font-weight:600;color:var(--ink,#201c19);margin:0;">Guest capacity <span style="color:#b03a3a;">*</span></label>',
          (rangeHint ? '<span style="font-size:12px;color:var(--muted,#6d645d);">' + rangeHint + '</span>' : ''),
          '</div>',
          '<input type="number" id="ejuno-sr-capacity" min="' + minGuests + '" ' + (maxGuests ? 'max="' + maxGuests + '" ' : '') + 'value="' + currentCapacity + '" style="width:100%;height:40px;padding:8px 12px;border:1px solid var(--line,#ded5ca);border-radius:10px;font-size:14px;box-sizing:border-box;" required />',
          '<p id="ejuno-sr-capacity-error" style="display:none;color:#b03a3a;font-size:12px;margin:2px 0 0;"></p>',
          '</div>',
        ].join('');
      }

      var priceRowLabel = isBundle ? 'Amount to be paid by guest' : 'Price';
      var initialPriceDisplay = currentTotalPrice != null ? (isBundle ? formatMoney(currentTotalPrice) + ' (' + currentCapacity + ' guests × ' + formatMoney(unitPrice) + ')' : formatMoney(currentTotalPrice)) : (opts.priceLabel || 'See listing');

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
        capacityFieldHtml +
        '<div class="ejuno-sr-row"><span>' + priceRowLabel + '</span><strong id="ejuno-sr-total-price">' +
        initialPriceDisplay +
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

      var capacityInput = overlay.querySelector('#ejuno-sr-capacity');
      var errorEl = overlay.querySelector('#ejuno-sr-capacity-error');
      var totalPriceEl = overlay.querySelector('#ejuno-sr-total-price');
      var confirmBtn = overlay.querySelector('[data-confirm]');

      function validateCapacity() {
        if (!isBundle || !capacityInput) return true;
        var val = parseInt(capacityInput.value, 10);
        if (isNaN(val) || val < minGuests) {
          if (errorEl) {
            errorEl.textContent = 'Minimum ' + minGuests + ' guest' + (minGuests > 1 ? 's' : '') + ' required.';
            errorEl.style.display = 'block';
          }
          if (confirmBtn) confirmBtn.disabled = true;
          return false;
        }
        if (maxGuests != null && val > maxGuests) {
          if (errorEl) {
            errorEl.textContent = 'Maximum ' + maxGuests + ' guests allowed.';
            errorEl.style.display = 'block';
          }
          if (confirmBtn) confirmBtn.disabled = true;
          return false;
        }
        if (errorEl) {
          errorEl.textContent = '';
          errorEl.style.display = 'none';
        }
        if (confirmBtn) confirmBtn.disabled = false;
        currentCapacity = val;
        if (unitPrice != null && totalPriceEl) {
          currentTotalPrice = unitPrice * val;
          totalPriceEl.textContent = formatMoney(currentTotalPrice) + ' (' + val + ' guests × ' + formatMoney(unitPrice) + ')';
        }
        return true;
      }

      if (capacityInput) {
        capacityInput.addEventListener('input', validateCapacity);
        capacityInput.addEventListener('change', validateCapacity);
      }

      function close(result) {
        overlay.remove();
        resolve(result);
      }

      overlay.querySelectorAll('[data-cancel]').forEach(function (el) {
        el.addEventListener('click', function () {
          close(null);
        });
      });
      overlay.querySelector('[data-confirm]').addEventListener('click', function () {
        if (isBundle && !validateCapacity()) return;
        close({
          confirmed: true,
          guestCapacity: isBundle ? currentCapacity : null,
          totalPrice: currentTotalPrice != null ? currentTotalPrice : unitPrice,
        });
      });
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) close(null);
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

  function escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  var COMMON_COUNTRIES = [
    'United Kingdom',
    'United States',
    'France',
    'Italy',
    'Spain',
    'Germany',
    'Ireland',
    'Canada',
    'Australia',
    'Netherlands',
    'Belgium',
    'Switzerland',
    'Portugal',
    'Austria',
    'Greece',
    'Sweden',
    'Norway',
    'Denmark',
    'Finland',
    'Poland',
    'Czech Republic',
    'Croatia',
    'Cyprus',
    'Malta',
    'United Arab Emirates',
    'India',
    'Pakistan',
    'South Africa',
    'New Zealand',
    'Singapore',
    'Japan',
    'Mexico',
    'Brazil',
    'Argentina',
    'Chile',
    'Colombia',
    'Egypt',
    'Indonesia',
    'Israel',
    'Malaysia',
    'Morocco',
    'Philippines',
    'Saudi Arabia',
    'Thailand',
    'Turkey',
    'Vietnam',
  ];

  function promptDeliveryAddressModal(opts) {
    ensureStyles();
    return new Promise(function (resolve) {
      var existing = document.getElementById('ejuno-delivery-address-modal');
      if (existing) existing.remove();

      var apiBase = opts.apiBase;
      var token = opts.token;
      var customerId = opts.customerId;
      var prefill = opts.prefill || {};

      var overlay = document.createElement('div');
      overlay.id = 'ejuno-delivery-address-modal';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');

      var defaultCountry = prefill.country || 'United Kingdom';
      var countryOptionsHtml = [
        '<option value="">Select country</option>',
        COMMON_COUNTRIES.map(function (c) {
          var isSel = c.toLowerCase() === defaultCountry.toLowerCase();
          return '<option value="' + escHtml(c) + '"' + (isSel ? ' selected' : '') + '>' + escHtml(c) + '</option>';
        }).join(''),
      ].join('');

      overlay.innerHTML =
        '<div class="ejuno-sr-dialog" role="document">' +
        '<div class="ejuno-sr-head">' +
        '<div>' +
        '<p class="ejuno-sr-kicker">Delivery Address</p>' +
        '<h3 class="ejuno-sr-title" style="font-size:24px;">Enter your delivery address</h3>' +
        '</div>' +
        '<button type="button" class="ejuno-sr-close" data-addr-cancel aria-label="Close">&times;</button>' +
        '</div>' +
        '<div class="ejuno-sr-body">' +
        '<p class="ejuno-sr-note" style="margin-bottom:14px;">Delivery address is required to continue (You can also update it later)</p>' +
        '<div id="ejuno-addr-error" class="ejuno-addr-error"></div>' +
        '<form id="ejuno-delivery-address-form" onsubmit="return false;">' +
        '<div class="ejuno-addr-field">' +
        '<label for="ejuno-addr-address1">Address <span>*</span></label>' +
        '<input type="text" id="ejuno-addr-address1" class="ejuno-addr-input" placeholder="Street address" value="' + escHtml(prefill.address1 || '') + '" required />' +
        '</div>' +
        '<div class="ejuno-addr-grid-2">' +
        '<div class="ejuno-addr-field">' +
        '<label for="ejuno-addr-city">City <span>*</span></label>' +
        '<input type="text" id="ejuno-addr-city" class="ejuno-addr-input" placeholder="City" value="' + escHtml(prefill.city || '') + '" required />' +
        '</div>' +
        '<div class="ejuno-addr-field">' +
        '<label for="ejuno-addr-province">State / Province</label>' +
        '<input type="text" id="ejuno-addr-province" class="ejuno-addr-input" placeholder="State / Province" value="' + escHtml(prefill.province || '') + '" />' +
        '</div>' +
        '</div>' +
        '<div class="ejuno-addr-grid-2">' +
        '<div class="ejuno-addr-field">' +
        '<label for="ejuno-addr-zip">Zip / Postal code <span>*</span></label>' +
        '<input type="text" id="ejuno-addr-zip" class="ejuno-addr-input" placeholder="Postal / ZIP code" value="' + escHtml(prefill.zip || '') + '" required />' +
        '</div>' +
        '<div class="ejuno-addr-field">' +
        '<label for="ejuno-addr-country">Country <span>*</span></label>' +
        '<select id="ejuno-addr-country" class="ejuno-addr-input ejuno-addr-select" required>' +
        countryOptionsHtml +
        '</select>' +
        '</div>' +
        '</div>' +
        '<label class="ejuno-addr-check">' +
        '<input type="checkbox" id="ejuno-addr-same-billing" checked />' +
        '<span>Billing address is the same as delivery</span>' +
        '</label>' +
        '</form>' +
        '</div>' +
        '<div class="ejuno-sr-actions">' +
        '<button type="button" class="btn secondary" data-addr-cancel>Cancel</button>' +
        '<button type="button" class="btn primary" id="ejuno-addr-submit-btn">Save delivery address</button>' +
        '</div>' +
        '</div>';

      document.body.appendChild(overlay);

      var close = function (result) {
        overlay.remove();
        resolve(result);
      };

      overlay.querySelectorAll('[data-addr-cancel]').forEach(function (el) {
        el.addEventListener('click', function () {
          close(null);
        });
      });

      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) close(null);
      });

      var submitBtn = overlay.querySelector('#ejuno-addr-submit-btn');
      var errEl = overlay.querySelector('#ejuno-addr-error');

      submitBtn.addEventListener('click', function () {
        var addr1 = (overlay.querySelector('#ejuno-addr-address1').value || '').trim();
        var city = (overlay.querySelector('#ejuno-addr-city').value || '').trim();
        var province = (overlay.querySelector('#ejuno-addr-province').value || '').trim();
        var zip = (overlay.querySelector('#ejuno-addr-zip').value || '').trim();
        var country = (overlay.querySelector('#ejuno-addr-country').value || '').trim();

        if (!addr1 || !city || !zip || !country) {
          errEl.textContent = 'Please complete all required fields (Address, City, Zip, Country).';
          errEl.style.display = 'block';
          return;
        }

        errEl.textContent = '';
        errEl.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving address…';

        var shippingAddress = {
          address1: addr1,
          city: city,
          province: province,
          zip: zip,
          country: country,
        };

        var coupleId = localStorage.getItem('coupleId') || localStorage.getItem('userId');
        var payload = {
          customerId: Number(customerId) || customerId,
          coupleId: coupleId || undefined,
          shipping_address: shippingAddress,
          billing_address: shippingAddress,
        };

        fetch(apiBase + '/shopify/checkout/verify-address', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token.indexOf('Bearer ') === 0 ? token : 'Bearer ' + token,
          },
          body: JSON.stringify(payload),
        })
          .then(function (res) {
            return res.json().then(function (body) {
              if (!res.ok || body.status === false) {
                throw new Error(body.message || 'Failed to save delivery address');
              }
              return body;
            });
          })
          .then(function () {
            notify('Delivery address verified successfully!', 'success');
            close({ success: true, shippingAddress: shippingAddress });
          })
          .catch(function (err) {
            errEl.textContent = err.message || 'Error saving delivery address. Please try again.';
            errEl.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save delivery address';
          });
      });
    });
  }

  function ensureDeliveryAddress(apiBase, token, customerId) {
    var url =
      apiBase +
      '/shopify/checkout/address-status?customerId=' +
      encodeURIComponent(customerId);

    return fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token.indexOf('Bearer ') === 0 ? token : 'Bearer ' + token,
      },
    })
      .then(function (res) {
        if (!res.ok) {
          throw new Error('Failed to verify delivery address status');
        }
        return res.json();
      })
      .then(function (body) {
        var data = body && body.data;
        var hasShipping = !!(
          data &&
          data.shippingAddress &&
          data.shippingAddress.address1 &&
          String(data.shippingAddress.address1).trim().length > 0
        );

        if (hasShipping) {
          return { ok: true, shippingAddress: data.shippingAddress };
        }

        notify('Delivery address is required, provide it to continue', 'info');
        return promptDeliveryAddressModal({
          apiBase: apiBase,
          token: token,
          customerId: customerId,
          prefill: (data && data.shippingAddress) || {},
        });
      })
      .catch(function (err) {
        console.warn('Address check failed, prompting address modal:', err);
        notify('Delivery address is required, provide it to continue', 'info');
        return promptDeliveryAddressModal({
          apiBase: apiBase,
          token: token,
          customerId: customerId,
          prefill: {},
        });
      });
  }

  function proceedWithAddService(btn, pd, preferredDate) {
    var variantId = getVariantId(pd);
    var price = getVariantPrice(pd, variantId);
    var shopifyProductId =
      (pd && pd.shopifyProductId) ||
      (typeof window.productId !== 'undefined' ? window.productId : null);

    var isBundle =
      String((pd && pd.priceType) || '').trim().toLowerCase() === 'bundle';
    var variants = (pd && pd.variants) || [];
    var selectedVariant =
      variants.find(function (v) {
        return String(v.id || v.variantId) === String(variantId);
      }) || variants[0];
    var minGuests =
      selectedVariant && selectedVariant.minGuests != null
        ? parseInt(selectedVariant.minGuests, 10)
        : 1;
    if (!minGuests || minGuests < 1) minGuests = 1;
    var maxGuests =
      selectedVariant && selectedVariant.maxGuests != null
        ? parseInt(selectedVariant.maxGuests, 10)
        : null;

    confirmAdd({
      dateLabel: formatDateLabel(preferredDate),
      priceLabel: price != null ? formatMoney(price) : 'See listing',
      unitPrice: price,
      isBundle: isBundle,
      minGuests: minGuests,
      maxGuests: maxGuests,
    }).then(function (res) {
      if (!res || !res.confirmed) {
        if (btn) btn.disabled = false;
        return;
      }
      var finalPrice = res.totalPrice != null ? res.totalPrice : price;
      postRegistry(
        {
          shopifyProductId: shopifyProductId,
          variantId: variantId,
          preferredDate: preferredDate,
          date: preferredDate,
          listedPrice: finalPrice,
          guestCapacity: res.guestCapacity,
          capacity: res.guestCapacity,
          offeringType: 'Service',
        },
        btn,
      );
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

    var apiBase = String(window.EJUNO_API || '').replace(/\/$/, '');
    if (!apiBase) {
      notify('API is not configured.', 'error');
      if (btn) btn.disabled = false;
      return;
    }

    ensureDeliveryAddress(apiBase, authToken, customerId).then(function (addrRes) {
      if (!addrRes) {
        if (btn) btn.disabled = false;
        return;
      }
      proceedWithAddService(btn, pd, preferredDate);
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
          window.ejunoAddProductToRegistry(triggerBtn);
        });
      }
      notify('Please sign in to use your registry.', 'error');
      return;
    }

    var apiBase = String(window.EJUNO_API || '').replace(/\/$/, '');
    if (apiBase) {
      if (triggerBtn) triggerBtn.disabled = true;
      ensureDeliveryAddress(apiBase, authToken, customerId).then(function (addrRes) {
        if (!addrRes) {
          if (triggerBtn) triggerBtn.disabled = false;
          return;
        }
        if (typeof previousAdd === 'function') {
          return previousAdd(triggerBtn);
        }
      });
      return;
    }

    if (typeof previousAdd === 'function') {
      return previousAdd(triggerBtn);
    }
  };
  window.ejunoAddServiceToRegistry = addServiceToRegistry;
  window.ejunoEnsureDeliveryAddress = ensureDeliveryAddress;

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
