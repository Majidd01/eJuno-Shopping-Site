(function () {
  if (window.__ejunoCdpExtrasLoaded) return;
  window.__ejunoCdpExtrasLoaded = true;

  window.scrollCdpToElement = window.scrollCdpToElement || function (el, opts) {
    if (!el) return;
    try {
      el.scrollIntoView({ behavior: 'smooth', block: (opts && opts.block) || 'center' });
      if (opts && opts.focus !== false) {
        setTimeout(function () {
          try {
            el.focus({ preventScroll: true });
          } catch (e) {}
        }, 320);
      }
    } catch (e) {}
  };

  function showInlineMessage(message, type) {
    var msgEl = document.getElementById('booking-inline-message');
    if (!msgEl) {
      if (typeof window.showNotification === 'function') window.showNotification(message, type || 'error');
      return;
    }
    msgEl.textContent = message;
    if (type === 'success') {
      msgEl.style.color = '#2e7d32';
      msgEl.style.background = '#e8f5e9';
      msgEl.style.border = '1px solid #a5d6a7';
    } else {
      msgEl.style.color = '#f57c00';
      msgEl.style.background = '#fff3e0';
      msgEl.style.border = '1px solid #ffcc80';
    }
    msgEl.style.display = 'block';
    msgEl.setAttribute('role', 'alert');
    window.scrollCdpToElement(msgEl, { block: 'center', focus: false });
    if (window._inlineMsgTimer) clearTimeout(window._inlineMsgTimer);
    window._inlineMsgTimer = setTimeout(function () {
      msgEl.style.display = 'none';
    }, 5000);
  }

  window.showVenueValidationMessage = function (message, type) {
    var msgEl = document.getElementById('cdp-venue-validation-message');
    var scrollTarget =
      document.querySelector('.products_details_calender') ||
      document.getElementById('ejuno-dates-modal') ||
      document.getElementById('book-me-container') ||
      msgEl;
    if (!msgEl) {
      showInlineMessage(message, type);
      return;
    }
    msgEl.textContent = message;
    msgEl.className = 'cdp-section-validation is-visible is-' + (type || 'error');
    msgEl.setAttribute('role', 'alert');
    window.scrollCdpToElement(scrollTarget || msgEl, { block: 'center', focus: false });
  };

  window.showAddonsValidationMessage = function (message, type) {
    var msgEl = document.getElementById('cdp-addons-validation-message');
    var scrollTarget =
      document.getElementById('cdp-addons-panel') ||
      document.querySelector('.cdp-addons-section') ||
      document.getElementById('ejuno-addons-mount') ||
      msgEl;
    if (!msgEl) {
      showInlineMessage(message, type);
      return;
    }
    msgEl.textContent = message;
    msgEl.className = 'cdp-section-validation is-visible is-' + (type || 'error');
    msgEl.setAttribute('role', 'alert');
    window.scrollCdpToElement(scrollTarget || msgEl, { block: 'center', focus: false });
  };

  window.persistCdpLoginSession = window.persistCdpLoginSession || function persistCdpLoginSession(payload, fallbackRole) {
    var root = payload && payload.data ? payload.data : payload || {};
    var user = root.user || {};
    var customerId = root.customerId || user.customerId || user._id || '';
    var authToken = root.authToken || root.token || user.authToken || user.token || '';
    var contactEmail = root.contactEmail || user.contactEmail || root.email || user.email || '';
    var firstName = root.firstName || user.firstName || '';
    var lastName = root.lastName || user.lastName || '';
    var role = String(
      root.role ||
        root.customerRole ||
        root.userRole ||
        user.role ||
        user.customerRole ||
        root.customerType ||
        user.customerType ||
        ''
    ).toLowerCase();
    if (!role && fallbackRole) {
      role = String(fallbackRole).toLowerCase();
    }
    if (customerId) localStorage.setItem('customerId', String(customerId));
    if (authToken) localStorage.setItem('authToken', authToken);
    if (contactEmail) localStorage.setItem('customerEmail', contactEmail);
    if (firstName) localStorage.setItem('customerFirstName', firstName);
    if (lastName) localStorage.setItem('customerLastName', lastName);
    if (role) {
      localStorage.setItem('customerRole', role);
      localStorage.setItem(
        'customerType',
        role === 'guest' ? 'guest' : role === 'couple' ? 'couple' : role
      );
    }
    try {
      document.dispatchEvent(new CustomEvent('cdpAuthChanged'));
    } catch (e) {}
    if (typeof window.syncCdpRegistryButtonVisibility === 'function') window.syncCdpRegistryButtonVisibility();
    return { customerId: customerId, authToken: authToken, role: role };
  };

  function getStoredCustomerRole() {
    return String(localStorage.getItem('customerRole') || localStorage.getItem('customerType') || '')
      .toLowerCase()
      .trim();
  }

  function isCoupleCustomerRole(role) {
    var r = String(role || '').toLowerCase().trim();
    return !r || r === 'couple' || r === 'customer';
  }

  function isCatalogRegistryContext() {
    var pdp = document.querySelector('.ejuno-pdp');
    if (pdp) {
      if (pdp.classList.contains('ejuno-pdp--catalog')) return true;
      if (pdp.classList.contains('ejuno-pdp--service') || pdp.classList.contains('ejuno-pdp--venue')) {
        return false;
      }
    }
    if (typeof window.ejunoIsCatalogProduct === 'function') {
      var pd = window.productDetails || window.productData;
      if (pd) return window.ejunoIsCatalogProduct(pd);
    }
    var vt = String(window.ejunoVendorType || '').toLowerCase();
    if (vt === 'venue' || vt === 'service') return false;
    if (vt === 'product') return true;
    return !!document.querySelector('.ejuno-pdp--catalog, .ejuno-pdp-commerce-ui');
  }

  function setCommerceActionVisible(el, show) {
    if (!el) return;
    if (show) {
      el.removeAttribute('hidden');
      el.style.removeProperty('display');
    } else {
      el.setAttribute('hidden', 'hidden');
      el.style.display = 'none';
    }
  }

  function isServiceRegistryContext() {
    // Canonical: product API { type: "Service" }.
    var pd = window.productDetails;
    if (pd && String(pd.type || '').trim().toLowerCase() === 'service') return true;
    if (pd && pd.vendor && String(pd.vendor.type || '').trim().toLowerCase() === 'service') {
      return true;
    }
    if (typeof window.ejunoBookingIsService === 'function' && window.ejunoBookingIsService()) {
      return true;
    }
    var pdp = document.querySelector('.ejuno-pdp');
    if (pdp && pdp.classList.contains('ejuno-pdp--service')) return true;
    if (pdp && pdp.getAttribute('data-ejuno-service-hint') === '1') return true;
    return String(window.ejunoVendorType || window.vendorType || '')
      .trim()
      .toLowerCase() === 'service';
  }

  window.syncCdpRegistryButtonVisibility = function syncCdpRegistryButtonVisibility() {
    var role = getStoredCustomerRole();
    var hideForGuest = role === 'guest';
    var isCatalog = isCatalogRegistryContext();
    var isService = isServiceRegistryContext();
    // Catalog products + Service offerings. Guests never see these.
    // Venues do not get Add to Registry in this phase.
    var showRegistry = (isCatalog || isService) && !hideForGuest;
    var showPlan = isCatalog && !hideForGuest && isCoupleCustomerRole(role);

    document.querySelectorAll('[data-ejuno-registry-trigger]').forEach(function (btn) {
      var isServiceTrigger = btn.getAttribute('data-ejuno-service-registry') === '1';
      if (isServiceTrigger) {
        setCommerceActionVisible(btn, isService && !hideForGuest);
        return;
      }
      setCommerceActionVisible(btn, isCatalog && !hideForGuest);
    });

    document.querySelectorAll('[data-ejuno-plan-trigger]').forEach(function (btn) {
      setCommerceActionVisible(btn, showPlan);
    });

    document.querySelectorAll('[data-ejuno-plan-action]').forEach(function (wrap) {
      setCommerceActionVisible(wrap, showPlan);
    });

    var legacyRegistry = document.getElementById('registry-btn');
    if (legacyRegistry) {
      // Legacy button: catalog on non-V5; Service can use it as fallback on non-V5 PDPs.
      if (document.querySelector('.ejuno-pdp')) {
        legacyRegistry.style.display = 'none';
      } else if (showRegistry) {
        legacyRegistry.style.display = 'block';
      } else {
        legacyRegistry.style.display = 'none';
      }
    }

    var legacyPlan = document.getElementById('add-to-plan');
    if (legacyPlan) {
      // Keep legacy control for JS handlers; hide the old registry-button stack on V5 PDP.
      if (document.querySelector('.ejuno-pdp')) {
        legacyPlan.style.display = 'none';
        var wrap = legacyPlan.closest('.registry-button');
        if (wrap) wrap.style.display = 'none';
      } else if (showPlan) {
        legacyPlan.style.display = 'block';
      } else {
        legacyPlan.style.display = 'none';
      }
    }
  };

  function initRegistryVisibilityListeners() {
    window.syncCdpRegistryButtonVisibility();
    document.addEventListener('cdpAuthChanged', function () {
      window.syncCdpRegistryButtonVisibility();
    });
    window.addEventListener('storage', function (e) {
      if (e.key === 'customerRole' || e.key === 'customerType') {
        window.syncCdpRegistryButtonVisibility();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRegistryVisibilityListeners);
  } else {
    initRegistryVisibilityListeners();
  }

  if (typeof window.applyEjunoAuthFromUrl === 'function') {
    window.applyEjunoAuthFromUrl();
  }
})();
