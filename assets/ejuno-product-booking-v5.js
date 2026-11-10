(function () {
  try {
    var p = new URLSearchParams(window.location.search);
    if (p.get('source') === 'oliverTravels' && (p.get('reservationid') || p.get('reservationId'))) {
      window.ejunoOliversPaymentLink = true;
    }
  } catch (e) {}

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function restoreAddonsToPageMount() {
    var panel = document.getElementById('cdp-addons-panel');
    var mount = document.getElementById('ejuno-addons-mount');
    if (!panel) return;
    panel.classList.remove('cdp-addons-in-modal');
    if (mount && panel.parentNode !== mount) {
      mount.appendChild(panel);
      panel.dataset.ejunoAddonsPlaced = '1';
      panel.classList.add('cdp-addons-section');
    }
  }

  function refreshDatesModalCalendar() {
    ['calendar', 'calendar-next'].forEach(function (id) {
      var grid = document.getElementById(id);
      if (grid) grid.style.removeProperty('display');
    });
    if (typeof window.ejunoRefreshCalendar === 'function') {
      try {
        window.ejunoRefreshCalendar();
      } catch (err) {}
    }
  }

  function mountCalendarInModal() {
    var body = document.getElementById('ejuno-dates-modal-body');
    var cal = document.getElementById('calendarcontainerid');
    if (!body || !cal) return;

    var row = body.querySelector('.cdp-calendar-addons-row');
    if (!row) {
      row = document.createElement('div');
      row.className = 'cdp-calendar-addons-row';
      body.appendChild(row);
    }
    if (cal.parentNode !== row) row.appendChild(cal);
    cal.style.display = 'block';
    cal.dataset.ejunoMoved = '1';
    refreshDatesModalCalendar();
  }

  function mountAddonsInModal() {
    var body = document.getElementById('ejuno-dates-modal-body');
    var panel = document.getElementById('cdp-addons-panel');
    if (!body || !panel) return;
    var row = body.querySelector('.cdp-calendar-addons-row');
    if (!row) {
      mountCalendarInModal();
      row = body.querySelector('.cdp-calendar-addons-row');
    }
    if (row && panel.parentNode !== row) row.appendChild(panel);
    panel.classList.add('cdp-addons-section', 'cdp-addons-in-modal');
  }

  function initDatesModal() {
    var modal = document.getElementById('ejuno-dates-modal');
    var body = document.getElementById('ejuno-dates-modal-body');
    var cal = document.getElementById('calendarcontainerid');
    if (!modal || !body || !cal) return;

    // Calendar only in modal on init — add-ons stay on the page until the modal opens.
    mountCalendarInModal();
    restoreAddonsToPageMount();

    function openModal() {
      mountCalendarInModal();
      mountAddonsInModal();
      modal.hidden = false;
      document.body.classList.add('ejuno-dates-open');
      cal.style.display = 'block';
      if (typeof window.renderVariantAddOns === 'function') {
        try {
          window.renderVariantAddOns();
        } catch (err) {}
      }
      initDateModalSelects();
    }

    function closeModal() {
      window.ejunoDatesModalAwaitingContinue = false;
      modal.hidden = true;
      document.body.classList.remove('ejuno-dates-open');
      restoreAddonsToPageMount();
      if (typeof window.renderVariantAddOns === 'function') {
        try {
          window.renderVariantAddOns();
        } catch (err) {}
      }
    }

    window.ejunoMountAddonsInDatesModal = mountAddonsInModal;
    window.ejunoRestoreAddonsToPage = restoreAddonsToPageMount;

    document.querySelectorAll('[data-ejuno-open-dates]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        openModal();
      });
    });

    modal.querySelectorAll('[data-ejuno-dates-close]').forEach(function (el) {
      el.addEventListener('click', function () {
        window.ejunoPendingBookingAfterDates = false;
        window.ejunoDatesModalAwaitingContinue = false;
        try {
          sessionStorage.removeItem('ejunoPendingBookingAfterDates');
        } catch (err) {}
        closeModal();
      });
    });

    window.addEventListener('ejuno:datesConfirmed', function (evt) {
      syncDateSummary();
      // Keep modal open when user must pick add-ons before continuing booking.
      if (window.ejunoDatesModalAwaitingContinue) return;
      // OT approval payment links only sync dates — don't fight the Stripe modal.
      if (evt && evt.detail && evt.detail.fromPaymentLink) return;
      if (window.ejunoOliversPaymentLink) return;
      closeModal();
    });


    var selectedDiv = document.getElementById('selected-date-div');
    function syncDateSummary() {
      var field = document.querySelector('[data-ejuno-date-summary]');
      var valueEl = field && field.querySelector('.ejuno-booking-field__value');
      if (!valueEl || !selectedDiv) return;
      var text = (selectedDiv.innerText || selectedDiv.textContent || '').replace(/\s+/g, ' ').trim();
      var hasDates = !!text;
      var emptyLabel =
        (field && field.getAttribute('data-ejuno-date-empty-label')) || 'Select dates';
      valueEl.textContent = text || emptyLabel;
      field.classList.toggle('has-dates', hasDates);
      field.setAttribute('data-has-dates', hasDates ? '1' : '0');
    }
    if (selectedDiv) {
      var observer = new MutationObserver(syncDateSummary);
      observer.observe(selectedDiv, { childList: true, subtree: true, characterData: true });
      syncDateSummary();
    }
    document.addEventListener('ejuno:datesConfirmed', syncDateSummary);
  }

  function markPendingBookingAfterDates() {
    window.ejunoPendingBookingAfterDates = true;
    try {
      sessionStorage.setItem('ejunoPendingBookingAfterDates', '1');
    } catch (err) {}
  }

  function openDatesModalForBooking() {
    if (window.ejunoOliversPaymentLink || (typeof window.isOliversTravelPaymentLink === 'function' && window.isOliversTravelPaymentLink())) {
      return;
    }
    var modal = document.getElementById('ejuno-dates-modal');
    var cal = document.getElementById('calendarcontainerid');
    if (!modal) return;
    markPendingBookingAfterDates();
    mountCalendarInModal();
    mountAddonsInModal();
    modal.hidden = false;
    document.body.classList.add('ejuno-dates-open');
    if (cal) cal.style.display = 'block';
    if (typeof window.renderVariantAddOns === 'function') {
      try {
        window.renderVariantAddOns();
      } catch (err) {}
    }
  }

  function isMobileBookingViewport() {
    return window.matchMedia('(max-width: 760px)').matches;
  }

  function scrollToRequestAvailabilityBlock() {
    var target = document.getElementById('ejuno-request-availability');
    if (!target) return;
    var headerOffset = 76;
    var top = target.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  function initBookingButtons() {
    var bookMe = document.getElementById('book-me-button');
    document.querySelectorAll('[data-ejuno-request-booking]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        if (btn.hasAttribute('data-ejuno-scroll-booking') && isMobileBookingViewport()) {
          scrollToRequestAvailabilityBlock();
        }
        if (typeof window.ejunoValidateBookingDates === 'function') {
          if (window.ejunoOliversPaymentLink || (typeof window.isOliversTravelPaymentLink === 'function' && window.isOliversTravelPaymentLink())) {
            return;
          }
          var check = window.ejunoValidateBookingDates();
          if (!check.ok) {
            markPendingBookingAfterDates();
            openDatesModalForBooking();
            return;
          }
        }
        if (bookMe) bookMe.click();
      });
    });
  }

  function initPlanDropdownMount() {
    // Custom plan menu is rendered in #ejuno-plan-menu — keep legacy select out of the way.
    var dropdown = document.getElementById('plan-dropdown');
    if (dropdown) {
      dropdown.hidden = true;
      dropdown.setAttribute('hidden', 'hidden');
      dropdown.style.setProperty('display', 'none', 'important');
    }
  }
  window.initPlanDropdownMount = initPlanDropdownMount;

  function getPlanVariantId() {
    if (typeof window.getVariantId === 'function') {
      try {
        var fromFn = window.getVariantId();
        if (fromFn) return String(fromFn);
      } catch (e) {}
    }
    var commerce = document.getElementById('ejuno-commerce-variant-select');
    if (commerce && commerce.value) return String(commerce.value);
    var hidden = document.getElementById('ejuno-product-variant-id');
    if (hidden && hidden.value) return String(hidden.value);
    var params = new URLSearchParams(window.location.search);
    return params.get('variant') || '';
  }

  function notifyPlan(message, type) {
    if (typeof window.showNotification === 'function') window.showNotification(message, type || 'error');
    else if (typeof window.ejunoShowNotification === 'function') window.ejunoShowNotification(message, type || 'error');
  }

  function authHeader(token) {
    var t = String(token || '').trim();
    if (!t) return '';
    return t.indexOf('Bearer ') === 0 ? t : 'Bearer ' + t;
  }

  async function resolvePlanAuthToken(customerId) {
    var stored = localStorage.getItem('authToken');
    if (stored) return stored;
    var api = String(window.EJUNO_API || '').replace(/\/$/, '');
    if (!api || !customerId) return '';
    try {
      var res = await fetch(api + '/shopify/customer/' + encodeURIComponent(customerId) + '/metafield');
      var json = await res.json();
      var fields = (json && json.data && json.data.metafields) || [];
      var match = fields.find(function (m) {
        return m && m.namespace === 'customer_info' && m.key === 'authToken';
      });
      return (match && match.value) || '';
    } catch (e) {
      return '';
    }
  }

  function setPlanMenuOpen(open) {
    var mount = document.getElementById('ejuno-plan-dropdown-mount');
    var trigger = document.querySelector('[data-ejuno-plan-trigger]');
    if (mount) {
      if (open) {
        mount.hidden = false;
        mount.removeAttribute('hidden');
      } else {
        mount.hidden = true;
        mount.setAttribute('hidden', 'hidden');
      }
    }
    if (trigger) {
      trigger.classList.toggle('is-open', !!open);
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      var label = trigger.querySelector('.ejuno-plan-trigger__label');
      if (label) label.textContent = open ? 'Choose wedding plan' : 'Add to Wedding Plan';
    }
  }

  window.ejunoHidePlanDropdown = function () {
    setPlanMenuOpen(false);
    var menu = document.getElementById('ejuno-plan-menu');
    if (menu) menu.innerHTML = '';
  };

  window.ejunoRevealPlanDropdown = function () {
    setPlanMenuOpen(true);
  };

  async function postPlanItem(planId, variantId, token) {
    var api = String(window.EJUNO_API || '').replace(/\/$/, '');
    var postRes = await fetch(api + '/wedding-plan-items', {
      method: 'POST',
      headers: {
        Authorization: authHeader(token),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ weddingPlan: planId, variant: String(variantId) })
    });
    var resData = await postRes.json().catch(function () {
      return {};
    });
    if (!postRes.ok) throw new Error(resData.message || 'Failed to add to wedding plan');
    notifyPlan('Item successfully added to the plan!', 'success');
    window.ejunoHidePlanDropdown();
  }

  function openCreatePlanModal(variantId, token) {
    var modal = document.getElementById('create-plan-modal');
    if (!modal) {
      notifyPlan('Create plan form not found.', 'error');
      return;
    }
    modal.classList.remove('hidden');
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');

    var cancel = document.getElementById('cancel-create-plan');
    var close = document.getElementById('close-create-plan');
    var submit = document.getElementById('submit-create-plan');

    function closeModal() {
      modal.classList.add('hidden');
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
    }

    if (cancel) cancel.onclick = closeModal;
    if (close) close.onclick = closeModal;
    if (submit) {
      submit.onclick = async function () {
        var title = (document.getElementById('new-plan-title') || {}).value;
        title = String(title || '').trim();
        var description = (document.getElementById('new-plan-description') || {}).value;
        description = String(description || '').trim();
        if (!title) return notifyPlan('Please enter a title.', 'error');
        try {
          var api = String(window.EJUNO_API || '').replace(/\/$/, '');
          var createRes = await fetch(api + '/wedding-plans', {
            method: 'POST',
            headers: {
              Authorization: authHeader(token),
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title: title, description: description, variantId: Number(variantId) })
          });
          var resData = await createRes.json().catch(function () {
            return {};
          });
          if (!createRes.ok) throw new Error(resData.message || 'Failed to create plan');
          notifyPlan('Wedding plan created!', 'success');
          closeModal();
          window.ejunoAddToWeddingPlan();
        } catch (err) {
          closeModal();
          notifyPlan((err && err.message) || 'Failed to create plan', 'error');
        }
      };
    }
  }

  function renderPlanMenu(plans, variantId, token) {
    var menu = document.getElementById('ejuno-plan-menu');
    if (!menu) return;
    menu.innerHTML = '';

    if (!plans.length) {
      var empty = document.createElement('div');
      empty.className = 'ejuno-plan-menu__empty';
      empty.textContent = 'No plans yet — create one below.';
      menu.appendChild(empty);
    }

    plans.forEach(function (plan) {
      var id = plan && (plan._id || plan.id);
      if (!id) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ejuno-plan-menu__item';
      btn.setAttribute('role', 'option');
      btn.textContent = plan.title || plan.name || 'Plan ' + id;
      btn.addEventListener('click', async function () {
        try {
          var ok = true;
          if (typeof window.showCustomConfirm === 'function') {
            ok = await window.showCustomConfirm();
          }
          if (!ok) return;
          await postPlanItem(id, variantId, token);
        } catch (err) {
          notifyPlan((err && err.message) || 'Failed to add item', 'error');
        }
      });
      menu.appendChild(btn);
    });

    var createBtn = document.createElement('button');
    createBtn.type = 'button';
    createBtn.className = 'ejuno-plan-menu__item is-create';
    createBtn.setAttribute('role', 'option');
    createBtn.textContent = '+ Create new plan';
    createBtn.addEventListener('click', function () {
      openCreatePlanModal(variantId, token);
    });
    menu.appendChild(createBtn);
    setPlanMenuOpen(true);
  }

  window.ejunoAddToWeddingPlan = async function ejunoAddToWeddingPlan() {
    var trigger = document.querySelector('[data-ejuno-plan-trigger]');
    var role = String(
      localStorage.getItem('customerRole') || localStorage.getItem('customerType') || ''
    ).toLowerCase();
    if (role === 'guest') {
      notifyPlan('Wedding plans are available for couples only.', 'warn');
      return;
    }

    var customerId = localStorage.getItem('customerId');
    if (!customerId) {
      if (typeof window.showLoginPopups === 'function') {
        return window.showLoginPopups(function () {
          window.ejunoAddToWeddingPlan();
        });
      }
      notifyPlan('Please log in to add this to a wedding plan.', 'warn');
      return;
    }

    var variantId = getPlanVariantId();
    if (!variantId) {
      notifyPlan('Variant ID not found.', 'warn');
      return;
    }

    if (trigger) trigger.classList.add('is-loading');
    try {
      var token = await resolvePlanAuthToken(customerId);
      if (!token) {
        notifyPlan('Auth token not found. Please log in again.', 'error');
        return;
      }
      var api = String(window.EJUNO_API || '').replace(/\/$/, '');
      var plansRes = await fetch(api + '/wedding-plans/customer/' + encodeURIComponent(customerId), {
        headers: {
          Authorization: authHeader(token),
          'Content-Type': 'application/json'
        }
      });
      if (!plansRes.ok) {
        var errJson = await plansRes.json().catch(function () {
          return {};
        });
        throw new Error(errJson.message || 'Failed to fetch wedding plans.');
      }
      var result = await plansRes.json();
      var plans = Array.isArray(result && result.data)
        ? result.data
        : Array.isArray(result && result.data && result.data.plans)
          ? result.data.plans
          : [];
      renderPlanMenu(plans, variantId, token);
    } catch (err) {
      notifyPlan((err && err.message) || 'An unexpected error occurred.', 'error');
      window.ejunoHidePlanDropdown();
    } finally {
      if (trigger) trigger.classList.remove('is-loading');
    }
  };

  function bindContainedListSelect(select) {
    if (!select || select.dataset.containedList === '1') return;
    if (select.id === 'month-select' || select.id === 'year-select') return;

    var wrap =
      select.closest('.ejuno-commerce-select-wrap') ||
      select.closest('.ejuno-booking-select-wrap') ||
      select.closest('.ejuno-select-wrap');

    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'ejuno-select-wrap';
      if (!select.parentNode) return;
      select.parentNode.insertBefore(wrap, select);
      wrap.appendChild(select);
    }

    select.dataset.containedList = '1';

    function isListOpen() {
      return select.classList.contains('is-list-open') || select.size > 1;
    }

    function closeList() {
      select.size = 1;
      select.classList.remove('is-list-open');
      select.removeAttribute('data-fit-list');
      wrap.classList.remove('is-list-open');
      var card = select.closest('.ejuno-booking-card');
      if (card) card.classList.remove('ejuno-booking-card--select-open');
    }

    function openList() {
      var count = select.options.length;
      if (count <= 1) return;
      var visible = Math.min(count, 8);
      select.size = visible;
      select.classList.add('is-list-open');
      if (count <= 8) {
        select.setAttribute('data-fit-list', '1');
      } else {
        select.removeAttribute('data-fit-list');
      }
      wrap.classList.add('is-list-open');
      var card = select.closest('.ejuno-booking-card');
      if (card) card.classList.add('ejuno-booking-card--select-open');
      requestAnimationFrame(function () {
        select.scrollTop = 0;
      });
    }

    function toggleList(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (isListOpen()) {
        closeList();
      } else {
        openList();
        select.focus();
      }
    }

    function isChevronClick(e) {
      var rect = wrap.getBoundingClientRect();
      return e.clientX >= rect.right - 44;
    }

    closeList();

    if (!wrap.querySelector('.ejuno-select-chevron-hit')) {
      var chevronHit = document.createElement('button');
      chevronHit.type = 'button';
      chevronHit.className = 'ejuno-select-chevron-hit';
      chevronHit.setAttribute('aria-label', 'Toggle package options');
      chevronHit.tabIndex = -1;
      chevronHit.addEventListener('mousedown', function (e) {
        toggleList(e);
      });
      wrap.appendChild(chevronHit);
    }

    select.addEventListener('mousedown', function (e) {
      if (!isListOpen()) {
        e.preventDefault();
        openList();
        select.focus();
        return;
      }
      // Open list: chevron / right edge toggles closed
      if (isChevronClick(e)) {
        e.preventDefault();
        closeList();
      }
    });

    select.addEventListener('keydown', function (e) {
      if (!isListOpen() && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
        e.preventDefault();
        openList();
      }
      if (isListOpen() && e.key === 'Escape') {
        e.preventDefault();
        closeList();
      }
    });

    select.addEventListener('blur', function () {
      setTimeout(function () {
        if (!wrap.contains(document.activeElement)) closeList();
      }, 120);
    });

    select.addEventListener('change', function () {
      closeList();
    });

    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) closeList();
    });
  }

  function initDateModalSelects() {
    ['month-select', 'year-select'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) bindContainedListSelect(el);
    });
  }

  function initVariantSelect() {
    var select = document.getElementById('ejuno-variant-select');
    if (select) {
      bindContainedListSelect(select);
      select.addEventListener('change', function () {
        var url = new URL(window.location.href);
        url.searchParams.set('variant', select.value);
        window.location.href = url.toString();
      });
    }

    var commerceSelect = document.getElementById('ejuno-commerce-variant-select');
    var commerceId = document.getElementById('ejuno-product-variant-id');
    if (commerceSelect && commerceId) {
      bindContainedListSelect(commerceSelect);
      commerceSelect.addEventListener('change', function () {
        commerceId.value = commerceSelect.value;
        syncCommerceAvailability();
      });
      syncCommerceAvailability();
    }

    initDateModalSelects();
  }

  function syncCommerceAvailability() {
    var select = document.getElementById('ejuno-commerce-variant-select');
    var available = true;
    if (select && select.selectedOptions && select.selectedOptions[0]) {
      available = select.selectedOptions[0].getAttribute('data-available') !== 'false';
    } else {
      var formBtn = document.querySelector('#ejuno-product-form [type="submit"].ejuno-add-to-cart, #ejuno-product-form [type="submit"]');
      if (formBtn && (formBtn.disabled || formBtn.getAttribute('aria-disabled') === 'true' || formBtn.dataset.soldOutLocked === '1')) {
        available = false;
      }
    }

    document.querySelectorAll(
      '#ejuno-product-form [type="submit"], [data-ejuno-add-to-cart], .ejuno-pdp-sticky-cta.ejuno-pdp-commerce-ui .ejuno-add-to-cart'
    ).forEach(function (btn) {
      var addLabel = btn.dataset.addLabel || 'Add to cart';
      var soldLabel = btn.dataset.soldOutLabel || 'Sold out';
      if (available) {
        btn.disabled = false;
        btn.removeAttribute('aria-disabled');
        btn.dataset.soldOutLocked = '0';
        if (btn.textContent !== 'Adding…') btn.textContent = addLabel;
      } else {
        btn.disabled = true;
        btn.setAttribute('aria-disabled', 'true');
        btn.dataset.soldOutLocked = '1';
        btn.textContent = soldLabel;
      }
    });
  }
  window.ejunoSyncCommerceAvailability = syncCommerceAvailability;

  /** Canonical service signal from product API: type === "Service". */
  function isApiServiceType(value) {
    return String(value || '').trim().toLowerCase() === 'service';
  }

  function isServiceProduct(pd) {
    // Prefer live API payload: { type: "Service" }.
    if (pd && isApiServiceType(pd.type)) return true;
    if (pd && pd.vendor && isApiServiceType(pd.vendor.type)) return true;
    if (isApiServiceType(window.ejunoVendorType) || isApiServiceType(window.vendorType)) {
      return true;
    }
    // Pre-API Liquid hint only (before productDetails arrives).
    var pdp = document.querySelector('.ejuno-pdp');
    if (!pd) {
      return (
        pdp?.classList.contains('ejuno-pdp--service') ||
        pdp?.getAttribute('data-ejuno-service-hint') === '1' ||
        false
      );
    }
    return false;
  }

  function syncPdpGuideMode() {
    var pdp = document.querySelector('.ejuno-pdp');
    if (!pdp) return;
    var pd = window.productDetails;
    var isOlivers = !!(pd && String(pd.source || '').toLowerCase() === 'olivers_travel');
    pdp.classList.toggle('ejuno-pdp--olivers', isOlivers);
    var mode = 'venue';
    if (pdp.classList.contains('ejuno-pdp--catalog')) mode = 'product';
    else if (pdp.classList.contains('ejuno-pdp--service')) mode = 'service';
    else if (isOlivers) mode = 'olivers';
    document.querySelectorAll('[data-ejuno-pdp-guide]').forEach(function (guide) {
      guide.setAttribute('data-guide-mode', mode);
      guide.querySelectorAll('[data-guide-panel]').forEach(function (panel) {
        panel.hidden = panel.getAttribute('data-guide-panel') !== mode;
      });
      var titleEl = guide.querySelector('#EjunoPdpGuideTitle');
      if (titleEl) {
        var oliversTitle = guide.getAttribute('data-guide-title-olivers');
        var defaultTitle = guide.getAttribute('data-guide-title-default');
        if (mode === 'olivers' && oliversTitle) titleEl.textContent = oliversTitle;
        else if (defaultTitle) titleEl.textContent = defaultTitle;
      }
    });
  }

  function setServiceBookingCtaLabel() {
    var label = 'Request availability';
    var bookMe = document.getElementById('book-me-button');
    if (bookMe) bookMe.textContent = label;
    document.querySelectorAll('[data-ejuno-request-booking]').forEach(function (btn) {
      btn.textContent = label;
    });
  }
  window.ejunoSetServiceBookingCtaLabel = setServiceBookingCtaLabel;

  function setVenueBookingCtaLabel(label) {
    if (!label) return;
    var bookMe = document.getElementById('book-me-button');
    if (bookMe) bookMe.textContent = label;
    document.querySelectorAll('[data-ejuno-request-booking]').forEach(function (btn) {
      btn.textContent = label;
    });
  }
  window.ejunoSetVenueBookingCtaLabel = setVenueBookingCtaLabel;

  function applyVenueBookingCtaFromProduct(pd) {
    if (!pd || document.querySelector('.ejuno-pdp--catalog') || document.querySelector('.ejuno-pdp--service')) {
      return;
    }
    var vendorType = pd.vendorType || window.vendorType || '';
    if (String(vendorType).toLowerCase() === 'service') return;
    var source = String(pd.source || window.productSource || '').toLowerCase();
    if (source === 'olivers_travel') {
      setVenueBookingCtaLabel('Request availability');
    } else if (source === 'internal') {
      setVenueBookingCtaLabel('Request availability');
    }
  }
  window.ejunoApplyVenueBookingCtaFromProduct = applyVenueBookingCtaFromProduct;

  function ensureServiceRegistryTriggers() {
    var label =
      (document.querySelector('[data-ejuno-service-registry="1"]') || {}).textContent ||
      'Add to registry';
    label = String(label).trim() || 'Add to registry';

    function makeBtn(extraAttrs) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'btn secondary ejuno-registry-trigger ejuno-service-registry-trigger';
      btn.setAttribute('data-ejuno-registry-trigger', '');
      btn.setAttribute('data-ejuno-service-registry', '1');
      if (extraAttrs) {
        Object.keys(extraAttrs).forEach(function (key) {
          btn.setAttribute(key, extraAttrs[key]);
        });
      }
      btn.style.width = '100%';
      btn.style.marginTop = '10px';
      btn.textContent = label;
      return btn;
    }

    var cardSubmit = document.querySelector(
      '#ejuno-request-availability .ejuno-booking-submit[data-ejuno-request-booking]',
    );
    if (
      cardSubmit &&
      !document.querySelector(
        '#ejuno-request-availability [data-ejuno-service-registry="1"]',
      )
    ) {
      cardSubmit.insertAdjacentElement('afterend', makeBtn());
    }

    var sticky = document.querySelector('.ejuno-pdp-sticky-cta.ejuno-pdp-booking-ui');
    if (
      sticky &&
      !sticky.querySelector('[data-ejuno-service-registry="1"]')
    ) {
      var stickyBtn = makeBtn({ 'data-ejuno-scroll-booking': '' });
      stickyBtn.style.marginTop = '8px';
      sticky.appendChild(stickyBtn);
    }

    if (typeof window.ejunoAddServiceToRegistry === 'function') {
      // Re-bind delegated handlers from the standalone service-registry asset.
      try {
        document.dispatchEvent(new Event('productDetailsLoaded'));
      } catch (e) {}
    }
    if (typeof window.syncCdpRegistryButtonVisibility === 'function') {
      window.syncCdpRegistryButtonVisibility();
    }
  }

  function applyServiceProductMode(isService) {
    var pdp = document.querySelector('.ejuno-pdp');
    if (!pdp) return;
    pdp.classList.toggle('ejuno-pdp--service', !!isService);
    if (isService) {
      pdp.classList.remove('ejuno-pdp--catalog');
      pdp.setAttribute('data-ejuno-service-hint', '1');
      pdp.setAttribute('data-ejuno-catalog-hint', '0');
      // Catalog CSS hides booking CTAs — force booking UI back on for services.
      applyCatalogProductMode(false);
      setServiceBookingCtaLabel();
      ensureServiceRegistryTriggers();
      document.querySelectorAll('[data-ejuno-request-booking]').forEach(function (btn) {
        btn.removeAttribute('hidden');
        btn.style.removeProperty('display');
      });
      document.querySelectorAll('.ejuno-pdp-booking-ui').forEach(function (el) {
        el.removeAttribute('hidden');
        el.style.removeProperty('display');
      });
    }

    document.querySelectorAll('.ejuno-booking-field--guests').forEach(function (el) {
      if (isService) {
        el.setAttribute('hidden', 'hidden');
      } else {
        el.removeAttribute('hidden');
      }
    });

    var perNight = document.getElementById('perNightPrice');
    if (perNight && isService) {
      perNight.style.setProperty('display', 'none', 'important');
    }

    if (isService) {
      mountBookingSidebarDetails();
    }
    syncPdpGuideMode();
    if (typeof window.applyEjunoCalProductRules === 'function') {
      window.applyEjunoCalProductRules();
    }
  }

  window.ejunoApplyServiceMode = applyServiceProductMode;

  function normalizeCatalogType(value) {
    return String(value || '')
      .toLowerCase()
      .trim();
  }

  function isCatalogVendorType(value) {
    var vt = normalizeCatalogType(value);
    if (!vt) return false;
    if (vt === 'product' || vt === 'product vendor') return true;
    if (vt.indexOf('product vendor') !== -1) return true;
    return vt.indexOf('product') === 0;
  }

  function isCatalogProduct(pd) {
    // Service offerings keep booking CTAs (Request availability + Add to registry).
    // Never treat them as catalog/gift commerce even if Shopify tags say "registry product".
    if (isServiceProduct(pd)) return false;

    var pdp = document.querySelector('.ejuno-pdp');
    var catalogHint = pdp ? pdp.getAttribute('data-ejuno-catalog-hint') : null;
    if (catalogHint === '1') return true;

    if (!pd) {
      return pdp?.classList.contains('ejuno-pdp--catalog') || false;
    }

    var apiType = normalizeCatalogType(pd.type);
    if (isCatalogVendorType(apiType)) return true;
    if (pd.vendor && isCatalogVendorType(pd.vendor.type)) return true;
    if (isCatalogVendorType(pd.vendorType)) return true;
    if (isCatalogVendorType(window.ejunoVendorType)) return true;

    if (apiType === 'venue' || apiType === 'service') return false;
    if (apiType === 'product') return true;

    var bookingVendorType = normalizeCatalogType(window.vendorType);
    if (bookingVendorType === 'venue' || bookingVendorType === 'service') return false;

    if (pd.source === 'olivers_travel') return false;
    if (pd.venueType === 'accommodation') return false;

    if (catalogHint === '0') return false;

    return false;
  }

  function cleanCatalogDescription() {
    var desc = document.querySelector('.ejuno-pdp-description--lead');
    if (!desc || desc.dataset.catalogCleaned === '1') return;
    desc.dataset.catalogCleaned = '1';
    desc.querySelectorAll('p, li, div').forEach(function (el) {
      var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (/^brand name\s*:/i.test(t)) {
        el.remove();
      }
    });
    var html = desc.innerHTML;
    if (html) {
      desc.innerHTML = html.replace(/<(p|div|li)[^>]*>\s*brand name[^<]*<\/\1>/gi, '');
    }
  }

  function initCatalogRegistry() {
    document.querySelectorAll('[data-ejuno-registry-trigger]').forEach(function (btn) {
      if (btn.dataset.ejunoRegistryBound) return;
      btn.dataset.ejunoRegistryBound = '1';
      btn.addEventListener('click', function () {
        if (typeof window.ejunoAddProductToRegistry === 'function') {
          window.ejunoAddProductToRegistry(btn);
          return;
        }
        var legacy = document.getElementById('registry-btn');
        if (legacy) legacy.click();
      });
    });

    document.querySelectorAll('[data-ejuno-plan-trigger]').forEach(function (btn) {
      if (btn.dataset.ejunoPlanBound) return;
      btn.dataset.ejunoPlanBound = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var mount = document.getElementById('ejuno-plan-dropdown-mount');
        var alreadyOpen = mount && !mount.hidden && mount.getAttribute('hidden') == null;
        if (alreadyOpen && btn.classList.contains('is-open')) {
          window.ejunoHidePlanDropdown();
          return;
        }
        if (typeof window.ejunoAddToWeddingPlan === 'function') {
          window.ejunoAddToWeddingPlan();
          return;
        }
        var legacy = document.getElementById('add-to-plan');
        if (legacy) legacy.click();
      });
    });
  }

  function getAboutPropertySection() {
    var about = document.getElementById('ejuno-about-property');
    if (!about) return null;
    var body = about.querySelector('.olivers-dwelling-description') || about;
    var copy = (body.textContent || '').replace(/\s+/g, ' ').trim();
    if (copy.length < 20) return null;
    return about;
  }

  function expandDwellingDescriptionBlock(descEl) {
    if (!descEl) return;
    descEl.classList.add('ejuno-collapsible--expanded');
    descEl.classList.remove('ejuno-collapsible--collapsed');
    var toggleBtn = descEl.nextElementSibling;
    if (
      toggleBtn &&
      toggleBtn.classList.contains('ejuno-show-more-btn') &&
      !toggleBtn.classList.contains('ejuno-desc-read-more')
    ) {
      toggleBtn.textContent = 'Show less';
    }
  }

  function openAboutPropertySection() {
    initDwellingShowMore();
    var about = getAboutPropertySection();
    if (!about) return null;
    expandDwellingDescriptionBlock(about.querySelector('.olivers-dwelling-description'));
    return about;
  }

  function scrollToAboutProperty() {
    var target = openAboutPropertySection();
    if (!target) return;
    window.requestAnimationFrame(function () {
      var headerOffset = 88;
      var top = target.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    });
  }

  function initPdpLeadDescription() {
    if (document.querySelector('.ejuno-pdp--catalog')) return;
    var desc = document.querySelector('.ejuno-pdp-description--lead');
    if (!desc) return;
    var existingBtn =
      desc.nextElementSibling && desc.nextElementSibling.classList.contains('ejuno-desc-read-more')
        ? desc.nextElementSibling
        : null;
    var aboutTarget = getAboutPropertySection();

    if (!aboutTarget) {
      desc.classList.remove('ejuno-desc-collapsed', 'ejuno-desc-expanded');
      delete desc.dataset.leadReadMoreReady;
      if (existingBtn) existingBtn.remove();
      return;
    }

    if (desc.dataset.leadReadMoreReady === '1' && existingBtn) return;

    var text = (desc.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text) return;

    desc.classList.remove('ejuno-desc-expanded');
    desc.classList.add('ejuno-desc-collapsed');
    if (desc.scrollHeight <= desc.clientHeight + 8) {
      desc.classList.remove('ejuno-desc-collapsed');
      return;
    }

    if (existingBtn) existingBtn.remove();
    desc.dataset.leadReadMoreReady = '1';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ejuno-show-more-btn ejuno-desc-toggle ejuno-desc-read-more';
    btn.textContent = 'Read more';
    btn.addEventListener('click', function () {
      scrollToAboutProperty();
    });
    desc.insertAdjacentElement('afterend', btn);
  }

  function initCatalogDescription() {
    cleanCatalogDescription();
    var desc = document.querySelector('.ejuno-pdp-description--lead');
    if (!desc || desc.dataset.descToggleReady === '1') return;
    desc.classList.remove('ejuno-desc-expanded');
    desc.classList.add('ejuno-desc-collapsed');
    if (desc.scrollHeight <= desc.clientHeight + 8) {
      desc.classList.remove('ejuno-desc-collapsed');
      return;
    }
    desc.dataset.descToggleReady = '1';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ejuno-show-more-btn ejuno-desc-toggle';
    btn.textContent = 'Show more';
    btn.addEventListener('click', function () {
      var expanded = desc.classList.toggle('ejuno-desc-expanded');
      desc.classList.toggle('ejuno-desc-collapsed', !expanded);
      btn.textContent = expanded ? 'Show less' : 'Show more';
    });
    desc.insertAdjacentElement('afterend', btn);
  }

  function syncStickyCommerceCta(isCatalog) {
    var stickyBooking = document.querySelector('.ejuno-pdp-sticky-cta.ejuno-pdp-booking-ui');
    var stickyCommerce = document.querySelector('.ejuno-pdp-sticky-cta.ejuno-pdp-commerce-ui');
    if (isCatalog) {
      if (stickyBooking) stickyBooking.setAttribute('hidden', 'hidden');
      if (stickyCommerce) stickyCommerce.removeAttribute('hidden');
    } else {
      if (stickyBooking) stickyBooking.removeAttribute('hidden');
      if (stickyCommerce) stickyCommerce.setAttribute('hidden', 'hidden');
    }
  }

  function applyCatalogProductMode(isCatalog) {
    var pdp = document.querySelector('.ejuno-pdp');
    if (!pdp) return;
    pdp.classList.toggle('ejuno-pdp--catalog', !!isCatalog);
    syncStickyCommerceCta(!!isCatalog);
    syncPdpGuideMode();

    document.querySelectorAll('.ejuno-pdp-booking-ui').forEach(function (el) {
      if (isCatalog) el.setAttribute('hidden', '');
      else el.removeAttribute('hidden');
    });
    document.querySelectorAll('.ejuno-pdp-commerce-ui').forEach(function (el) {
      if (isCatalog) el.removeAttribute('hidden');
      else el.setAttribute('hidden', '');
    });

    if (isCatalog) {
      initCatalogDescription();
      initCatalogRegistry();
      if (typeof window.syncCdpRegistryButtonVisibility === 'function') {
        window.syncCdpRegistryButtonVisibility();
      }
      document.querySelectorAll('[data-ejuno-request-booking]').forEach(function (btn) {
        btn.setAttribute('hidden', 'hidden');
      });
      if (window.ejunoCart && typeof window.ejunoCart.refresh === 'function') {
        window.ejunoCart.refresh();
      }
      syncCommerceAvailability();
    } else {
      document.querySelectorAll('[data-ejuno-request-booking]').forEach(function (btn) {
        btn.removeAttribute('hidden');
      });
    }
  }

  window.ejunoIsCatalogProduct = isCatalogProduct;
  window.ejunoApplyCatalogMode = applyCatalogProductMode;

  function bootstrapProductApiFetch() {
    if (window.productDetails || window.__ejunoBootstrapFetchDone) return;
    if (typeof window.fetchProductData === 'function') {
      window.__ejunoBootstrapFetchDone = true;
      window.fetchProductData();
      return;
    }
    var pdp = document.querySelector('.ejuno-pdp[data-product-id]');
    if (!pdp) return;
    var pid = pdp.getAttribute('data-product-id');
    if (!pid) return;
    window.__ejunoBootstrapFetchDone = true;
    fetch((window.EJUNO_API_BASE || 'https://ejuno-dev.skylinxtech.co/api').replace(/\/$/, '') + '/products/shopify-product/' + pid)
      .then(function (r) {
        return r.json();
      })
      .then(function (payload) {
        if (!payload || !payload.data) return;
        window.productDetails = payload.data;
        window.dispatchEvent(new CustomEvent('productDetailsLoaded', { detail: payload.data }));
      })
      .catch(function (err) {
        window.__ejunoBootstrapFetchDone = false;
        console.error('eJuno product fetch failed', err);
      });
  }

  function hideLegacyReserveButton() {
    if (!document.querySelector('.ejuno-pdp')) return;
    var container = document.getElementById('book-me-container');
    if (!container) return;
    container.style.setProperty('display', 'none', 'important');
    container.setAttribute('aria-hidden', 'true');
  }

  function syncGuestHint() {
    var hint = document.getElementById('ejuno-guest-capacity-hint');
    var room = document.getElementById('roomdetails');
    if (!hint || !room) return;
    room.querySelectorAll('.roomdetail-item span').forEach(function (span) {
      if (/sleeps/i.test(span.textContent)) {
        hint.textContent = span.textContent.replace(/\s+/g, ' ').trim();
      }
    });
  }

  function initDwellingShowMore() {
    var container = document.getElementById('olivers-dwelling-info');
    if (!container || !container.querySelector('.olivers-dwelling-section')) return;
    if (container.dataset.showMoreReady === '1') return;
    container.dataset.showMoreReady = '1';

    container.querySelectorAll('.olivers-dwelling-description').forEach(function (el) {
      if (el.dataset.collapsible === '1') return;
      var text = (el.textContent || '').trim();
      if (text.length < 280) return;
      el.dataset.collapsible = '1';
      el.classList.add('ejuno-collapsible', 'ejuno-collapsible--collapsed');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ejuno-show-more-btn';
      btn.textContent = 'Show more';
      btn.addEventListener('click', function () {
        var expanded = el.classList.toggle('ejuno-collapsible--expanded');
        el.classList.toggle('ejuno-collapsible--collapsed', !expanded);
        btn.textContent = expanded ? 'Show less' : 'Show more';
      });
      el.insertAdjacentElement('afterend', btn);
    });

    var termsGrid = container.querySelector('.olivers-dwelling-terms-grid');
    if (termsGrid && !termsGrid.dataset.collapsible) {
      var cards = termsGrid.querySelectorAll('.olivers-dwelling-term-card');
      if (cards.length > 3) {
        termsGrid.dataset.collapsible = '1';
        var hiddenCount = cards.length - 3;
        cards.forEach(function (card, i) {
          if (i >= 3) card.classList.add('ejuno-term-card--hidden');
        });
        var tbtn = document.createElement('button');
        tbtn.type = 'button';
        tbtn.className = 'ejuno-show-more-btn ejuno-dwelling-terms-toggle';
        tbtn.textContent = 'Show more terms (' + hiddenCount + ')';
        tbtn.addEventListener('click', function () {
          var expanded = tbtn.getAttribute('data-expanded') === '1';
          expanded = !expanded;
          tbtn.setAttribute('data-expanded', expanded ? '1' : '0');
          cards.forEach(function (card, i) {
            if (i >= 3) card.classList.toggle('ejuno-term-card--hidden', !expanded);
          });
          tbtn.textContent = expanded ? 'Show less' : 'Show more terms (' + hiddenCount + ')';
        });
        termsGrid.insertAdjacentElement('afterend', tbtn);
      }
    }
  }

  function mountDwellingInfo() {
    var container = document.getElementById('olivers-dwelling-info');
    var mount = document.getElementById('ejuno-dwelling-mount');
    if (!container || !mount || container.dataset.ejunoMounted === '1') return;
    mount.appendChild(container);
    container.dataset.ejunoMounted = '1';
    initDwellingShowMore();
    initPdpLeadDescription();
  }

  function injectFactIcon(wrap, label) {
    if (!wrap) return;
    var key =
      window.ejunoPdpFactIcons && window.ejunoPdpFactIcons.keyFromLabel
        ? window.ejunoPdpFactIcons.keyFromLabel(label)
        : 'detail';
    wrap.setAttribute('data-ejuno-fact', key);
    var iconWrap = wrap.querySelector('.ejuno-pdp-fact__icon');
    if (!iconWrap) {
      iconWrap = document.createElement('span');
      iconWrap.className = 'ejuno-pdp-fact__icon';
      iconWrap.setAttribute('aria-hidden', 'true');
      wrap.insertBefore(iconWrap, wrap.firstChild);
    }
    iconWrap.innerHTML = '';
    if (window.ejunoPdpFactIcons && window.ejunoPdpFactIcons.getIcon) {
      iconWrap.appendChild(window.ejunoPdpFactIcons.getIcon(key));
    }
  }

  function createFactBlock(label, value) {
    var div = document.createElement('div');
    div.className = 'fact ejuno-pdp-fact fact--api';
    var iconWrap = document.createElement('span');
    iconWrap.className = 'ejuno-pdp-fact__icon';
    iconWrap.setAttribute('aria-hidden', 'true');
    var copy = document.createElement('div');
    copy.className = 'ejuno-pdp-fact__copy';
    var small = document.createElement('small');
    small.textContent = label;
    var strong = document.createElement('strong');
    strong.textContent = value;
    copy.appendChild(small);
    copy.appendChild(strong);
    div.appendChild(iconWrap);
    div.appendChild(copy);
    injectFactIcon(div, label);
    return div;
  }

  function initStaticPdpFactIcons() {
    document.querySelectorAll('.ejuno-pdp-fact:not(.fact--api)').forEach(function (fact) {
      var labelEl = fact.querySelector('.ejuno-pdp-fact__copy small');
      injectFactIcon(fact, labelEl ? labelEl.textContent : '');
    });
  }

  function parseRoomDetail(text) {
    var t = (text || '').replace(/\s+/g, ' ').trim();
    if (!t) return null;
    if (/sleeps/i.test(t)) {
      var num = t.match(/(\d+)/);
      return { label: 'Guests', value: num ? 'Sleeps ' + num[1] : t };
    }
    if (/bedroom/i.test(t)) {
      var beds = t.match(/(\d+)/);
      return { label: 'Bedrooms', value: beds ? beds[1] : t };
    }
    if (/bath/i.test(t)) {
      var baths = t.match(/(\d+)/);
      return { label: 'Bathrooms', value: baths ? baths[1] : t };
    }
    return { label: 'Detail', value: t };
  }

  function listFactValues(val) {
    if (val == null || val === '') return [];
    if (Array.isArray(val)) {
      return val
        .map(function (item) {
          if (item == null || item === '') return '';
          if (typeof item === 'string' || typeof item === 'number') return String(item).trim();
          if (typeof item === 'object') {
            return String(item.name || item.label || item.value || item.title || '').trim();
          }
          return String(item).trim();
        })
        .filter(Boolean);
    }
    if (typeof val === 'string') {
      return val
        .split(/[,|]/)
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);
    }
    return [String(val).trim()].filter(Boolean);
  }

  function prettyFactValue(value) {
    return String(value || '')
      .replace(/LGBTQplus/gi, 'LGBTQ+')
      .replace(/_/g, ' ')
      .replace(/([a-z])-([a-z])/gi, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function shopifyProductTags() {
    var pdp = document.querySelector('.ejuno-pdp');
    var fromDom = pdp ? String(pdp.getAttribute('data-product-tags') || '') : '';
    var fromApi = window.productDetails && window.productDetails.tags;
    var tags = [];
    if (fromDom) tags = tags.concat(fromDom.split('|'));
    tags = tags.concat(listFactValues(fromApi));
    return tags
      .map(function (t) {
        return String(t || '').trim();
      })
      .filter(Boolean);
  }

  function findTag(tags, pattern) {
    for (var i = 0; i < tags.length; i++) {
      if (pattern.test(tags[i])) return tags[i];
    }
    return '';
  }

  function collectVendorFacts(pd) {
    var facts = [];
    var seen = {};
    function addFact(label, value) {
      var val = prettyFactValue(value);
      if (!label || !val) return;
      var key = label.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      facts.push({ label: label, value: val });
    }

    var tags = shopifyProductTags();
    var guestCapacity = listFactValues(pd && pd.guestCapacity);
    var variant = pd && pd.variants && pd.variants[0];
    var guests =
      guestCapacity[0] ||
      (variant && (variant.maximum_capacity || variant.base_capacity)) ||
      findTag(tags, /\d.*guest|guest.*\d/i);
    if (guests && !/guest/i.test(String(guests))) guests = 'Up to ' + guests;
    addFact('Guests', guests);

    var setting =
      listFactValues(pd && pd.propertyStyles).slice(0, 2).join(', ') ||
      (pd && pd.venueLocation && (pd.venueLocation.region || pd.venueLocation.city)) ||
      tags
        .filter(function (t) {
          return /countryside|garden|lake|beach|vineyard|hill|city|coast|sea|mountain/i.test(t);
        })
        .slice(0, 2)
        .join(', ');
    addFact('Setting', setting);

    var style =
      listFactValues(pd && pd.weddingStyle)[0] ||
      listFactValues(pd && pd.venueCategory)[0] ||
      findTag(tags, /luxe|classic|rustic|boho|glam|modern|romantic|historic|elegant/i);
    addFact('Style', style);

    var indoor = tags.some(function (t) {
      return /^indoor$/i.test(t) || /\bindoor\b/i.test(t);
    });
    var outdoor = tags.some(function (t) {
      return /^outdoor$/i.test(t) || /\boutdoor\b/i.test(t);
    });
    if (indoor && outdoor) addFact('Reception', 'Indoor & outdoor');
    else if (outdoor) addFact('Reception', 'Outdoor');
    else if (indoor) addFact('Reception', 'Indoor');

    var stay =
      listFactValues(pd && pd.accommodationCategories)[0] ||
      (pd && pd.guestAccommodation && !/^no$/i.test(String(pd.guestAccommodation))
        ? pd.guestAccommodation
        : '') ||
      findTag(tags, /hotel|villa|accommodation|private room|stay/i);
    addFact('Stay', stay);

    var amenities = listFactValues(pd && pd.amenitiesAndServices)
      .concat(listFactValues(pd && pd.amenities))
      .filter(function (item, idx, arr) {
        return arr.indexOf(item) === idx;
      });
    if (amenities.length) addFact('Amenities', amenities.slice(0, 3).join(', '));

    if (pd && pd.type && String(pd.type).toLowerCase() === 'service') {
      addFact('Type', pd.product_type || pd.type);
    }

    return facts.slice(0, 6);
  }

  function syncDynamicFacts() {
    var mount = document.getElementById('ejuno-dynamic-facts-mount');
    var factsGrid = document.querySelector('.ejuno-pdp-facts');
    if (!mount) return;
    var vendorFacts = collectVendorFacts(window.productDetails);
    var room = document.getElementById('roomdetails');
    var roomFacts = [];
    if (room) {
      room.querySelectorAll('.roomdetail-item span').forEach(function (span) {
        var parsed = parseRoomDetail(span.textContent);
        if (parsed) roomFacts.push(parsed);
      });
    }
    var used = {};
    var combined = [];
    vendorFacts.concat(roomFacts).forEach(function (fact) {
      var key = String(fact.label || '').toLowerCase();
      if (!key || used[key]) return;
      used[key] = true;
      combined.push(fact);
    });
    var signature = combined
      .map(function (f) {
        return f.label + ':' + f.value;
      })
      .join('|');
    if (mount.dataset.signature === signature) return;
    mount.dataset.signature = signature;
    mount.innerHTML = '';
    var hasGuests = false;
    combined.forEach(function (fact) {
      if (fact.label === 'Guests') hasGuests = true;
      mount.appendChild(createFactBlock(fact.label, fact.value));
    });
    if (factsGrid) {
      factsGrid.classList.toggle('ejuno-pdp-facts--api-guests', hasGuests);
      factsGrid.classList.toggle('ejuno-pdp-facts--vendor', combined.length > 0);
    }
    if (typeof syncGuestHint === 'function') syncGuestHint();
  }

  function hideApiMetaBlocks() {
    ['md', 'ph', 'fdaw', 'dw'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.setProperty('display', 'none', 'important');
    });
  }

  function bookingDetailHasContent(el) {
    if (!el) return false;
    if (el.id === 'perNightPrice') {
      var nightVal = el.querySelector('#perNightPriceValue');
      return !!(nightVal && (nightVal.textContent || '').trim());
    }
    if (el.id === 'ejunoVendorName') {
      var vendorVal = el.querySelector('#ejunoVendorNameValue');
      return !!(vendorVal && (vendorVal.textContent || '').trim());
    }
    var valueEl = el.querySelector('#venueLocationValue, #depositPackage, #perNightPriceValue, #ejunoVendorNameValue');
    if (valueEl && (valueEl.textContent || '').trim()) return true;
    var text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    return text.length > 12;
  }

  function syncVendorNameFromProductDetails() {
    var vendorNameEl = document.getElementById('ejunoVendorName');
    var vendorNameValue = document.getElementById('ejunoVendorNameValue');
    if (!vendorNameEl || !vendorNameValue) return;
    var pd = window.productDetails;
    var name = '';
    if (pd && pd.vendor) {
      name = pd.vendor.name || ((pd.vendor.firstName || '') + ' ' + (pd.vendor.lastName || '')).trim() || pd.vendor.companyName || pd.vendor.businessName || '';
    }
    if (!name && pd && pd.companyName) name = pd.companyName;
    name = String(name || vendorNameValue.textContent || '').trim();
    if (!name) return;
    vendorNameValue.textContent = name;
    vendorNameEl.style.setProperty('display', 'block', 'important');
  }

  function clipBookingCardToPriceDetails() {
    var card = document.querySelector('.ejuno-booking-card');
    var mount = document.getElementById('ejuno-booking-details-mount');
    if (!card || !mount) return;

    var vendorRow = mount.querySelector('#ejunoVendorName');
    var spacer = mount.querySelector('.ejuno-booking-vendor-spacer');
    if (!vendorRow || !bookingDetailHasContent(vendorRow)) {
      card.style.removeProperty('max-height');
      card.classList.remove('ejuno-booking-card--vendor-clip');
      return;
    }

    var prevVendorDisplay = vendorRow.style.display;
    var prevSpacerDisplay = spacer ? spacer.style.display : '';
    vendorRow.style.setProperty('display', 'none', 'important');
    if (spacer) spacer.style.setProperty('display', 'none', 'important');

    card.style.removeProperty('max-height');
    card.classList.remove('ejuno-booking-card--vendor-clip');

    // Height through Price per Week (and other visible details), before vendor.
    var clipHeight = Math.ceil(card.scrollHeight);
    var viewportCap = Math.max(280, window.innerHeight - 108);
    clipHeight = Math.min(clipHeight, viewportCap);

    vendorRow.style.display = prevVendorDisplay || '';
    vendorRow.style.setProperty('display', 'block', 'important');
    if (spacer) {
      spacer.style.display = prevSpacerDisplay || '';
      spacer.style.removeProperty('display');
      // Small scroll distance so vendor is just below the fold (no huge empty gap).
      spacer.style.height = '28px';
    }

    card.classList.add('ejuno-booking-card--vendor-clip');
    card.style.maxHeight = clipHeight + 'px';
    card.scrollTop = 0;
  }

  function mountBookingSidebarDetails() {
    var mount = document.getElementById('ejuno-booking-details-mount');
    if (!mount) return;
    syncVendorNameFromProductDetails();
    var isService = document.querySelector('.ejuno-pdp--service');
    ['venueLocation', 'da', 'perNightPrice', 'ejunoVendorName'].forEach(function (id) {
      if (isService && id === 'perNightPrice') return;
      var el = document.getElementById(id);
      if (!el || !bookingDetailHasContent(el)) return;
      if (el.parentNode !== mount) {
        mount.appendChild(el);
      }
      el.classList.add('ejuno-booking-detail-row');
      if (id === 'ejunoVendorName') {
        el.classList.add('ejuno-booking-vendor-row');
      }
      el.style.setProperty('display', 'block', 'important');
    });

    var vendorRow = mount.querySelector('#ejunoVendorName');
    if (vendorRow && vendorRow.parentNode === mount) {
      var spacer = mount.querySelector('.ejuno-booking-vendor-spacer');
      if (!spacer) {
        spacer = document.createElement('div');
        spacer.className = 'ejuno-booking-vendor-spacer';
        spacer.setAttribute('aria-hidden', 'true');
      }
      mount.insertBefore(spacer, vendorRow);
      mount.appendChild(vendorRow);
    }

    mount.hidden = mount.querySelectorAll('.ejuno-booking-detail-row').length === 0;

    requestAnimationFrame(function () {
      clipBookingCardToPriceDetails();
      requestAnimationFrame(clipBookingCardToPriceDetails);
    });
  }

  window.ejunoMountBookingSidebarDetails = mountBookingSidebarDetails;
  window.ejunoClipBookingCardToPriceDetails = clipBookingCardToPriceDetails;

  window.addEventListener(
    'resize',
    function () {
      if (document.querySelector('.ejuno-booking-card--vendor-clip')) {
        clipBookingCardToPriceDetails();
      }
    },
    { passive: true }
  );

  function setPdpApiLoading(loading) {
    var pdp = document.querySelector('.ejuno-pdp');
    if (!pdp) return;
    pdp.classList.toggle('ejuno-pdp--api-loading', !!loading);
    if (loading) {
      pdp.setAttribute('aria-busy', 'true');
    } else {
      pdp.removeAttribute('aria-busy');
    }
  }

  var pdpLoadingDone = false;
  var pdpScreenLoaderStart = 0;
  var pdpScreenLoaderMinMs = 700;
  var pdpScreenLoaderHideScheduled = false;

  function initPdpScreenLoader() {
    var pdp = document.querySelector('.ejuno-pdp');
    if (pdp) {
      pdp.classList.add('ejuno-pdp--gate', 'ejuno-pdp--api-loading');
      pdp.classList.remove('ejuno-pdp--revealed');
      pdp.setAttribute('aria-busy', 'true');
    }
    var el = document.getElementById('ejuno-pdp-screen-loader');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ejuno-pdp-screen-loader';
      el.className = 'ejuno-pdp-screen-loader';
      el.setAttribute('aria-live', 'polite');
      el.setAttribute('aria-busy', 'true');
      el.innerHTML = '<div class="ejuno-pdp-screen-loader__spinner" role="status" aria-label="Loading venue"></div>';
      document.body.appendChild(el);
    } else {
      el.classList.remove('is-hidden');
      el.setAttribute('aria-busy', 'true');
    }
    pdpScreenLoaderStart = Date.now();
    pdpScreenLoaderHideScheduled = false;
  }

  function forceRevealPdp() {
    var pdp = document.querySelector('.ejuno-pdp');
    if (pdp) {
      pdp.classList.add('ejuno-pdp--revealed');
      pdp.classList.remove('ejuno-pdp--gate');
      pdp.removeAttribute('aria-busy');
    }
    var el = document.getElementById('ejuno-pdp-screen-loader');
    if (el) {
      el.classList.add('is-hidden');
      el.setAttribute('aria-busy', 'false');
      window.setTimeout(function () {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }, 400);
    }
  }

  function hidePdpScreenLoader() {
    if (pdpScreenLoaderHideScheduled) return;
    pdpScreenLoaderHideScheduled = true;
    var elapsed = Date.now() - (pdpScreenLoaderStart || Date.now());
    var wait = Math.max(0, pdpScreenLoaderMinMs - elapsed);
    window.setTimeout(forceRevealPdp, wait);
  }

  function finishPdpApiLoading() {
    if (pdpLoadingDone) return;
    pdpLoadingDone = true;
    setPdpApiLoading(false);
    hidePdpScreenLoader();
    cleanupStaleBookingOverlays(true);
    var pd = window.productDetails;
    if (pd) {
      applyCatalogProductMode(isCatalogProduct(pd));
      if (!isCatalogProduct(pd)) {
        applyServiceProductMode(isServiceProduct(pd));
      }
    }
    initPdpLeadDescription();
  }

  function cleanupStaleBookingOverlays(skipScreenLoader) {
    if (!skipScreenLoader) {
      // Keep PDP screen loader intact during init; only clear booking overlays.
    }
    if (typeof window.hideLoaderFull === 'function') {
      window.hideLoaderFull();
    }
    document.body.classList.remove('ejuno-dates-open');
    var datesModal = document.getElementById('ejuno-dates-modal');
    if (datesModal) datesModal.hidden = true;
    document.querySelectorAll('.loader-wrapper').forEach(function (wrapper) {
      wrapper.classList.remove('is-active');
      wrapper.style.display = 'none';
    });
    var stepLoader = document.getElementById('ejuno-booking-step-loader');
    if (stepLoader) {
      stepLoader.hidden = true;
      stepLoader.classList.remove('is-active');
      stepLoader.style.display = 'none';
      stepLoader.setAttribute('aria-busy', 'false');
    }
  }

  window.ejunoFinishPdpLoading = finishPdpApiLoading;
  window.ejunoCleanupBookingOverlays = cleanupStaleBookingOverlays;
  window.ejunoForceRevealPdp = forceRevealPdp;

  function pdpMountPassComplete() {
    mountApiMeta();
    mountBookingSidebarDetails();
    if (typeof syncDynamicFacts === 'function') syncDynamicFacts();
    if (typeof mountDwellingInfo === 'function') mountDwellingInfo();
    if (typeof initDwellingShowMore === 'function') initDwellingShowMore();
  }

  function pdpSecondaryReady() {
    var pd = window.productDetails;
    if (!pd) return false;
    if (isCatalogProduct(pd) || isServiceProduct(pd)) return true;

    var hlMount = document.getElementById('ejuno-highlights-mount');
    var hlSource = document.getElementById('highlights-section');
    var highlightsPending =
      hlSource && hlSource.innerHTML.trim() && hlMount && !hlMount.children.length;

    var dwMount = document.getElementById('ejuno-dwelling-mount');
    var dwPending =
      pd.externalId &&
      dwMount &&
      !dwMount.children.length &&
      !document.getElementById('olivers-dwelling-container');

    return !highlightsPending && !dwPending;
  }

  function waitForPdpApiComplete() {
    var attempts = 0;
    var poll = window.setInterval(function () {
      attempts += 1;
      pdpMountPassComplete();
      if (pdpSecondaryReady() || attempts >= 30) {
        window.clearInterval(poll);
        finishPdpApiLoading();
      }
    }, 300);
    window.setTimeout(function () {
      window.clearInterval(poll);
      finishPdpApiLoading();
    }, 12000);
  }

  function initPdpApiSkeleton() {
    var pdp = document.querySelector('.ejuno-pdp');
    if (!pdp) return;
    initPdpScreenLoader();
    setPdpApiLoading(true);
    cleanupStaleBookingOverlays(true);
    waitForPdpApiComplete();
    window.setTimeout(function () {
      finishPdpApiLoading();
    }, 10000);
  }

  window.ejunoSetPdpApiLoading = setPdpApiLoading;

  function onProductDetailsReady() {
    var pd = window.productDetails;
    if (pd && pd.vendor && pd.vendor.type) {
      window.ejunoVendorType = pd.vendor.type;
    }
    var catalog = isCatalogProduct(pd);
    applyCatalogProductMode(catalog);
    if (!catalog) {
      applyServiceProductMode(isServiceProduct(pd));
      applyVenueBookingCtaFromProduct(pd);
    } else {
      applyServiceProductMode(false);
    }
    injectModalThemeOverrides(false);
    if (!catalog) {
      mountBookingSidebarDetails();
      if (typeof window.updatePerNightPrice === 'function') {
        window.updatePerNightPrice();
      }
      setTimeout(mountBookingSidebarDetails, 400);
      setTimeout(mountBookingSidebarDetails, 2000);
      initPdpLeadDescription();
      [400, 1200, 2500].forEach(function (delay) {
        setTimeout(initPdpLeadDescription, delay);
      });
    } else {
      [200, 800, 2000].forEach(function (delay) {
        setTimeout(initCatalogDescription, delay);
      });
    }
    waitForPdpApiComplete();
    if (typeof window.syncEjunoPdpGallery === 'function') {
      window.syncEjunoPdpGallery(pd);
    }
    if (typeof window.renderVariantAddOns === 'function') {
      window.renderVariantAddOns();
    }
  }

  function mountApiMeta() {
    hideApiMetaBlocks();
    mountBookingSidebarDetails();
    var isService = isServiceProduct(window.productDetails);
    var room = document.getElementById('roomdetails');
    if (!isService && room && room.innerHTML.trim()) {
      var roomMount = document.getElementById('ejuno-roomdetails-mount');
      if (roomMount && room.parentNode !== roomMount) roomMount.appendChild(room);
      syncDynamicFacts();
    }
    var highlights = document.getElementById('highlights-section');
    if (highlights && highlights.style.display !== 'none') {
      var hlMount = document.getElementById('ejuno-highlights-mount');
      if (hlMount) hlMount.appendChild(highlights);
    }

    var descMount = document.getElementById('ejuno-variant-description-mount');
    if (descMount) descMount.innerHTML = '';

    if (!document.querySelector('.ejuno-pdp--catalog')) {
      if (document.querySelector('.ejuno-pdp--service')) {
        setServiceBookingCtaLabel();
      } else {
        var bookMe = document.getElementById('book-me-button');
        document.querySelectorAll('[data-ejuno-request-booking]').forEach(function (btn) {
          if (bookMe && bookMe.textContent.trim()) {
            btn.textContent = bookMe.textContent.trim();
          }
        });
      }
    }
  }

  function measureTitleLines(titleEl) {
    var style = window.getComputedStyle(titleEl);
    var lineHeight = parseFloat(style.lineHeight);
    if (!lineHeight || Number.isNaN(lineHeight)) {
      lineHeight = parseFloat(style.fontSize) * 1.08;
    }
    return Math.max(1, Math.round(titleEl.getBoundingClientRect().height / lineHeight));
  }

  function applyPdpTitleScale(titleEl) {
    titleEl.classList.remove(
      'ejuno-pdp-title--lines-2',
      'ejuno-pdp-title--lines-3',
      'ejuno-pdp-title--lines-4'
    );
    var lines = measureTitleLines(titleEl);
    if (lines <= 1) return;
    if (lines >= 4) {
      titleEl.classList.add('ejuno-pdp-title--lines-4');
    } else if (lines === 3) {
      titleEl.classList.add('ejuno-pdp-title--lines-3');
    } else {
      titleEl.classList.add('ejuno-pdp-title--lines-2');
    }
  }

  function initPdpTitleScale() {
    var titles = document.querySelectorAll('.ejuno-pdp .ejuno-pdp-title');
    if (!titles.length) return;
    titles.forEach(function (titleEl) {
      applyPdpTitleScale(titleEl);
    });
    if (window.__ejunoPdpTitleResizeBound) return;
    window.__ejunoPdpTitleResizeBound = true;
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        document.querySelectorAll('.ejuno-pdp .ejuno-pdp-title').forEach(applyPdpTitleScale);
      }, 120);
    });
  }

  function initModalA11y() {
    ['confirm-modal', 'create-plan-modal'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var sync = function () {
        var hidden = el.classList.contains('hidden');
        el.setAttribute('aria-hidden', hidden ? 'true' : 'false');
      };
      sync();
      new MutationObserver(sync).observe(el, { attributes: true, attributeFilter: ['class'] });
    });
  }

  function injectModalThemeOverrides(moveToEnd) {
    var id = 'ejuno-modal-theme-overrides';
    var node = document.getElementById(id);
    if (!node) {
      node = document.createElement('style');
      node.id = id;
      document.head.appendChild(node);
    }
    node.textContent =
      '.cdp-addr-accent,.cdp-addr-link,.cdp-addr-back{color:#9b5068!important}' +
      '.cdp-addr-btn,#cdpAddrConfirm,#cdpAddrSubmit{background:#9b5068!important;border-radius:999px!important;box-shadow:none!important}' +
      '.cdp-addr-btn:hover,#cdpAddrConfirm:hover,#cdpAddrSubmit:hover{background:#7e3d55!important}' +
      '.cdp-addr-select-card--on,.cdp-addr-venue-panel--active,.cdp-addr-venue-dd--open{border-color:#9b5068!important}' +
      '.cdp-addr-col-badge{color:#9b5068!important;background:rgba(155,80,104,.08)!important;border-color:rgba(155,80,104,.25)!important}' +
      '.cdp-addr-field input:focus{outline:none;border-color:#9b5068!important;box-shadow:0 0 0 2px rgba(155,80,104,.15)!important}';
    if (moveToEnd && node.parentNode === document.head) {
      document.head.appendChild(node);
    }
  }

  function init() {
    injectModalThemeOverrides(false);
    if (document.head && !document.head.dataset.ejunoAddrStyleWatch) {
      document.head.dataset.ejunoAddrStyleWatch = '1';
      new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var added = mutations[i].addedNodes;
          for (var j = 0; j < added.length; j++) {
            if (added[j].nodeType === 1 && added[j].id === 'cdp-addr-styles') {
              injectModalThemeOverrides(true);
              return;
            }
          }
        }
      }).observe(document.head, { childList: true });
    }
    initModalA11y();
    initDatesModal();
    initBookingButtons();
    initPlanDropdownMount();
    initVariantSelect();
    initPdpTitleScale();
    initPdpLeadDescription();
    initStaticPdpFactIcons();
    hideLegacyReserveButton();
    cleanupStaleBookingOverlays();
    initPdpApiSkeleton();
    bootstrapProductApiFetch();
    window.addEventListener('pageshow', function (ev) {
      if (ev.persisted) cleanupStaleBookingOverlays();
    });
    var pdpRoot = document.querySelector('.ejuno-pdp');
    if (pdpRoot && pdpRoot.getAttribute('data-ejuno-catalog-hint') === '1') {
      applyCatalogProductMode(true);
    } else {
      syncStickyCommerceCta(false);
    }
    window.addEventListener('productDetailsLoaded', onProductDetailsReady);
    if (window.productDetails) onProductDetailsReady();
    document.addEventListener('shopify:section:load', onProductDetailsReady);
    document.addEventListener('shopify:section:load', initPdpTitleScale);
    setTimeout(function () {
      hideLegacyReserveButton();
      hideApiMetaBlocks();
      mountApiMeta();
      mountBookingSidebarDetails();
      syncDynamicFacts();
      mountDwellingInfo();
      initDwellingShowMore();
    }, 1200);
    setInterval(function () {
      hideLegacyReserveButton();
      hideApiMetaBlocks();
      mountApiMeta();
      mountBookingSidebarDetails();
      syncDynamicFacts();
      mountDwellingInfo();
      initDwellingShowMore();
    }, 2500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
