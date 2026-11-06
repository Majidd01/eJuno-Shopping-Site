(function () {
  var DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  window.selectedAddOnIds = window.selectedAddOnIds || [];
  window.selectedAddOnGuests = window.selectedAddOnGuests || {};
  window.selectedAddOnDates = window.selectedAddOnDates || {};
  window.selectedAddOnTimeSlots = window.selectedAddOnTimeSlots || {};

  function apiOrigin() {
    if (typeof window.ejunoApiOrigin === 'function') return window.ejunoApiOrigin();
    var base = window.EJUNO_API_BASE || 'https://ejuno-dev.skylinxtech.co/api';
    return String(base).replace(/\/api\/?$/, '');
  }

  function addonCanBookSeparately(addon) {
    return !!(addon && addon.canBookSeparately !== false);
  }

  function selectedDates() {
    return typeof window.getCdpSelectedDates === 'function' ? window.getCdpSelectedDates() : (window.selectedDates || []);
  }

  function authHeader() {
    var token = localStorage.getItem('authToken') || '';
    if (!token) return null;
    return token.indexOf('Bearer ') === 0 ? token : 'Bearer ' + token;
  }

  function getInternalProductId() {
    var pd = window.productDetails || (typeof productDetails !== 'undefined' ? productDetails : null) || {};
    return pd._id || pd.productId || null;
  }

  function normalizeDateStr(value) {
    if (!value) return '';
    return String(value).slice(0, 10);
  }

  function sanitizeAddonItem(item) {
    var next = {
      addonId: String(item.addonId),
      datesOfBooking: Array.isArray(item.datesOfBooking) ? item.datesOfBooking.slice() : []
    };
    if (item.noOfPersons != null) next.noOfPersons = item.noOfPersons;
    if (item.timeSlot && item.timeSlot.startTime) {
      next.timeSlot = { startTime: item.timeSlot.startTime, endTime: item.timeSlot.endTime };
    }
    return next;
  }

  function normalizeMediaVideoUrl(video) {
    if (!video) return '';
    if (typeof video === 'string') return video.trim();
    return String(video.url || video.src || video.videoUrl || '').trim();
  }

  function getAddonMediaItems(addon) {
    if (!addon) return [];
    var items = [];
    var seen = {};
    var images = Array.isArray(addon.images) ? addon.images : [];
    var videos = Array.isArray(addon.videos) ? addon.videos : [];
    images.forEach(function (src) {
      var url = String(src || '').trim();
      if (!url || seen[url]) return;
      seen[url] = true;
      items.push({ type: 'image', src: url });
    });
    videos.forEach(function (video) {
      var url = normalizeMediaVideoUrl(video);
      if (!url || seen[url]) return;
      seen[url] = true;
      items.push({ type: 'video', src: url });
    });
    return items;
  }

  window.getCdpAddonMediaItems = window.getCdpAddonMediaItems || getAddonMediaItems;

  function escapeAttr(value) {
    return String(value || '').replace(/"/g, '&quot;');
  }

  function buildAddonCardMediaHtml(addon) {
    var items = getAddonMediaItems(addon);
    if (!items.length) {
      return '<div class="cdp-addon-media cdp-addon-media--empty">+</div>';
    }
    var first = items[0];
    var mediaInner =
      first.type === 'video'
        ? '<video src="' + escapeAttr(first.src) + '" muted playsinline preload="metadata"></video>'
        : '<img src="' + escapeAttr(first.src) + '" alt="" loading="lazy">';
    var countBadge =
      items.length > 1
        ? '<span class="cdp-addon-media__count">+' + (items.length - 1) + '</span>'
        : '';
    var hasVideo = items.some(function (item) {
      return item.type === 'video';
    });
    var typeBadge = hasVideo ? '<span class="cdp-addon-media__type-badge" aria-hidden="true">▶</span>' : '';
    return (
      '<div class="cdp-addon-media' +
      (first.type === 'video' ? ' cdp-addon-media--video' : '') +
      '">' +
      mediaInner +
      countBadge +
      typeBadge +
      '</div>'
    );
  }

  /** API field is always `selectedAddOns` (capital O). Strip legacy `selectedAddons`. */
  function getSelectedAddonsFromData(data) {
    if (!data) return [];
    return data.selectedAddOns || data.selectedAddons || [];
  }

  function ensureSelectedAddOnsApiKey(data) {
    if (!data || typeof data !== 'object') return data;
    var items = getSelectedAddonsFromData(data);
    if (items.length) data.selectedAddOns = items;
    else delete data.selectedAddOns;
    delete data.selectedAddons;
    return data;
  }

  function moneyFmt(n) {
    return typeof formatMoney === 'function' ? formatMoney(n) : (Number(n) || 0).toFixed(2);
  }

  function curSym() {
    return typeof getCurrencySymbol === 'function' ? getCurrencySymbol() : '$';
  }

  function resolveSelectedVariant(pd) {
    var details = pd || window.productDetails || (typeof productDetails !== 'undefined' ? productDetails : null);
    if (!details || !Array.isArray(details.variants) || !details.variants.length) return null;
    var variantId = null;
    try {
      var urlParams = new URLSearchParams(window.location.search);
      variantId = urlParams.get('variant');
      if (!variantId) {
        var pathParts = window.location.pathname.split('/');
        var variantIndex = pathParts.indexOf('variant');
        if (variantIndex !== -1 && pathParts[variantIndex + 1]) variantId = pathParts[variantIndex + 1];
      }
    } catch (e) {}
    if (!variantId && typeof getVariantFromUrl === 'function') variantId = getVariantFromUrl();
    return variantId
      ? details.variants.find(function (v) { return v.id == variantId || v.variantId == variantId; }) || details.variants[0]
      : details.variants[0];
  }

  function getAddonById(id) {
    var variant = resolveSelectedVariant();
    if (!variant || !Array.isArray(variant.addOns)) return null;
    return variant.addOns.find(function (a) { return String(a._id) === String(id); }) || null;
  }

  function isBundleAddOn(a) { return String((a && a.priceType) || '').toLowerCase() === 'bundle'; }
  function isFixedAddOn(a) { return String((a && a.priceType) || '').toLowerCase() === 'fixed'; }
  function addonAllowsMultipleDates(addon) { return !addon || addon.allowMultipleBookingsPerDay !== false; }
  function addonRequiresTimeSlot(addon) { return !!(addon && Array.isArray(addon.timeSlots) && addon.timeSlots.length); }

  function getUniqueAddonTimeSlots(addon) {
    if (!addon || !Array.isArray(addon.timeSlots)) return [];
    var seen = {};
    return addon.timeSlots.filter(function (slot) {
      if (!slot || !slot.startTime || !slot.endTime) return false;
      var key = slot.startTime + '|' + slot.endTime;
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function getAddonSlotKey(slot) {
    if (!slot || !slot.startTime || !slot.endTime) return '';
    return slot.startTime + '|' + slot.endTime;
  }

  function getAddonSlotCapacity(addon, slot) {
    if (slot && slot.capacity != null && !isNaN(Number(slot.capacity))) {
      var slotCap = Number(slot.capacity);
      if (slotCap >= 1) return slotCap;
    }
    if (addon && addon.maxBookingsPerSlot != null && !isNaN(Number(addon.maxBookingsPerSlot))) {
      var maxCap = Number(addon.maxBookingsPerSlot);
      if (maxCap >= 1) return maxCap;
    }
    return 1;
  }

  function getAddonPreStandaloneReservations(addon) {
    if (!addon || !Array.isArray(addon.preStandaloneReservations)) return [];
    return addon.preStandaloneReservations;
  }

  /**
   * Remaining capacity for a date (+ optional time slot) from addon.preStandaloneReservations.
   * No entry => full capacity. Entry with remainingCapacity => use that value.
   */
  function getSlotRemainingCapacity(addon, selectedDate, slot) {
    var ds = normalizeDateStr(selectedDate);
    if (!ds || !addon) return 0;
    var preReservations = getAddonPreStandaloneReservations(addon);

    if (slot && slot.startTime && slot.endTime) {
      var existingSlot = null;
      for (var i = 0; i < preReservations.length; i++) {
        var r = preReservations[i];
        if (!r || normalizeDateStr(r.date) !== ds) continue;
        var ts = r.timeSlot;
        if (ts && ts.startTime === slot.startTime && ts.endTime === slot.endTime) {
          existingSlot = r;
          break;
        }
      }
      if (existingSlot && existingSlot.remainingCapacity != null && !isNaN(Number(existingSlot.remainingCapacity))) {
        return Math.max(0, Number(existingSlot.remainingCapacity));
      }
      return getAddonSlotCapacity(addon, slot);
    }

    // Day-level add-on (no time slots): match date entry with null/missing timeSlot
    var existingDay = null;
    for (var j = 0; j < preReservations.length; j++) {
      var entry = preReservations[j];
      if (!entry || normalizeDateStr(entry.date) !== ds) continue;
      if (!entry.timeSlot || (!entry.timeSlot.startTime && !entry.timeSlot.endTime)) {
        existingDay = entry;
        break;
      }
    }
    if (existingDay && existingDay.remainingCapacity != null && !isNaN(Number(existingDay.remainingCapacity))) {
      return Math.max(0, Number(existingDay.remainingCapacity));
    }
    return getAddonSlotCapacity(addon, null);
  }

  function isAddonStandaloneSlotBooked(addon, dateStr, slot) {
    if (!addon || !slot) return false;
    return getSlotRemainingCapacity(addon, dateStr, slot) <= 0;
  }

  function isAddonStandaloneDateFullyBooked(addon, dateStr) {
    var ds = normalizeDateStr(dateStr);
    if (!ds || !addon) return false;

    if (addonRequiresTimeSlot(addon)) {
      var slots = getUniqueAddonTimeSlots(addon);
      if (!slots.length) return false;
      return slots.every(function (slot) {
        return getSlotRemainingCapacity(addon, ds, slot) <= 0;
      });
    }

    return getSlotRemainingCapacity(addon, ds) <= 0;
  }

  function isDateFullyBookedForAddon(addon, dateStr) {
    return isAddonStandaloneDateFullyBooked(addon, dateStr);
  }

  function hasAddonAvailableSlotOnDate(addon, dateStr) {
    return !isAddonStandaloneDateFullyBooked(addon, dateStr);
  }

  function isAddonStandaloneDateBooked(addon, dateStr) {
    return isAddonStandaloneDateFullyBooked(addon, dateStr);
  }

  function formatAddonSlotCapacityLabel(remaining) {
    var n = Number(remaining);
    if (isNaN(n) || n <= 0) return ' (Full)';
    if (n === 1) return ' (1 spot left)';
    return ' (' + n + ' spots left)';
  }

  function buildAddonSlotChipHtml(addon, slot, options) {
    options = options || {};
    var id = options.addonId || String(addon._id);
    var dateStr = options.dateStr || '';
    var active = !!options.active;
    var remaining = dateStr ? getSlotRemainingCapacity(addon, dateStr, slot) : getAddonSlotCapacity(addon, slot);
    var slotBooked = dateStr ? remaining <= 0 : false;
    var showCapacity = !!dateStr && remaining > 0 && remaining < getAddonSlotCapacity(addon, slot);
    var cls = 'cdp-addon-slot-chip' + (active ? ' is-active' : '') + (slotBooked ? ' is-disabled is-booked' : '');
    var attrs = options.saSlot
      ? ' data-sa-slot="' + id + '"'
      : ' data-addon-id="' + id + '"';
    var labelSuffix = '';
    if (slotBooked) labelSuffix = ' (Full)';
    else if (showCapacity) labelSuffix = formatAddonSlotCapacityLabel(remaining);
    return '<button type="button" aria-pressed="' + active + '" class="' + cls + '"' + attrs +
      ' data-start="' + slot.startTime + '" data-end="' + slot.endTime + '"' +
      (slotBooked ? ' disabled aria-disabled="true"' : '') + '>' +
      formatSlotLabel(slot) + labelSuffix + '</button>';
  }

  function pickFirstAvailableAddonSlot(addon, dateStr) {
    if (!addonRequiresTimeSlot(addon) || !dateStr) return null;
    var slots = getUniqueAddonTimeSlots(addon);
    for (var i = 0; i < slots.length; i++) {
      if (!isAddonStandaloneSlotBooked(addon, dateStr, slots[i])) return slots[i];
    }
    return null;
  }

  function ensureAddOnTimeSlotAuto(addon, addonId) {
    if (!addonRequiresTimeSlot(addon)) return;
    var primaryDate = getAddOnDatesOfBooking(addonId)[0];
    var current = getAddOnTimeSlot(addonId);
    if (current && primaryDate && !isAddonStandaloneSlotBooked(addon, primaryDate, current)) return;
    if (current && primaryDate && isAddonStandaloneSlotBooked(addon, primaryDate, current)) setAddOnTimeSlot(addonId, null);
    var next = pickFirstAvailableAddonSlot(addon, primaryDate);
    if (next) setAddOnTimeSlot(addonId, next);
  }

  function ensureStandaloneTimeSlotAuto(addon, state) {
    if (!addonRequiresTimeSlot(addon) || !state) return;
    var primaryDate = state.dates && state.dates[0];
    if (state.slot && primaryDate && !isAddonStandaloneSlotBooked(addon, primaryDate, state.slot)) return;
    if (state.slot && primaryDate && isAddonStandaloneSlotBooked(addon, primaryDate, state.slot)) state.slot = null;
    var next = pickFirstAvailableAddonSlot(addon, primaryDate);
    if (next) state.slot = { startTime: next.startTime, endTime: next.endTime };
  }

  function getAddOnPersons(id) {
    var n = parseInt((window.selectedAddOnGuests || {})[String(id)], 10);
    return n > 0 ? n : 0;
  }

  function setAddOnPersons(id, count) {
    window.selectedAddOnGuests = window.selectedAddOnGuests || {};
    var n = parseInt(count, 10);
    if (n > 0) window.selectedAddOnGuests[String(id)] = n;
    else delete window.selectedAddOnGuests[String(id)];
  }

  function getAddOnTimeSlot(id) {
    return (window.selectedAddOnTimeSlots || {})[String(id)] || null;
  }

  function setAddOnTimeSlot(id, slot) {
    window.selectedAddOnTimeSlots = window.selectedAddOnTimeSlots || {};
    if (slot && slot.startTime && slot.endTime) window.selectedAddOnTimeSlots[String(id)] = { startTime: slot.startTime, endTime: slot.endTime };
    else delete window.selectedAddOnTimeSlots[String(id)];
  }

  function expandDateRange(startStr, endStr, inclusiveEnd) {
    var out = [];
    var start = new Date(startStr);
    var end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return out;
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    if (!(start < end) && !inclusiveEnd) return out;
    if (start > end) return out;
    var cur = new Date(start);
    while (inclusiveEnd ? cur <= end : cur < end) {
      out.push(
        cur.getFullYear() +
          '-' +
          String(cur.getMonth() + 1).padStart(2, '0') +
          '-' +
          String(cur.getDate()).padStart(2, '0')
      );
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }

  function getAddOnAvailableDates() {
    var dates = selectedDates();
    if (!Array.isArray(dates) || !dates.length) return [];

    var checkInOut =
      typeof window.usesCheckInCheckOutDates === 'function' && window.usesCheckInCheckOutDates();

    // Check-in/out stays store only endpoints — expand to every night in range.
    // Also expand any 2-date range when the helper isn't on window yet.
    if (dates.length >= 2 && (checkInOut || dates.length === 2)) {
      var expanded = expandDateRange(dates[0], dates[dates.length - 1], false);
      if (expanded.length) return expanded;
      return [dates[0]];
    }
    return dates.slice();
  }

  function getAddOnAvailableDatesForAddon(addon) {
    var base = getAddOnAvailableDates();
    if (!addon || !Array.isArray(addon.availableDays) || !addon.availableDays.length) return base;
    var allowed = addon.availableDays.map(function (d) { return String(d).toLowerCase(); });
    return base.filter(function (dateStr) {
      var d = new Date(dateStr + 'T00:00:00');
      return allowed.indexOf(DAY_NAMES[d.getDay()]) !== -1;
    });
  }

  function isAddOnVenueDateSelectable(addon, dateStr) {
    if (!dateStr) return false;
    if (!isDateAllowedForAddon(addon, dateStr)) return false;
    if (isAddonStandaloneDateFullyBooked(addon, dateStr)) return false;
    return true;
  }

  function buildAddonDateChipHtml(addon, dateStr, options) {
    options = options || {};
    var id = options.addonId || String(addon._id);
    var active = !!options.active;
    var disabled = !!options.disabled;
    var cls = 'cdp-addon-date-chip' + (active ? ' is-active' : '') + (disabled ? ' is-disabled' : '');
    return '<button type="button" aria-pressed="' + active + '" class="' + cls + '" data-addon-id="' + id +
      '" data-date="' + dateStr + '"' + (disabled ? ' disabled aria-disabled="true"' : '') + '>' +
      formatAddOnChipLabel(dateStr) + '</button>';
  }

  function getAddOnDatesOfBooking(addonId) {
    var addon = getAddonById(addonId);
    var available = addon ? getAddOnAvailableDatesForAddon(addon) : getAddOnAvailableDates();
    if (!available.length) available = getAddOnAvailableDates();
    if (!available.length) return [];
    if (!addonId) return available.slice();
    var chosen = (window.selectedAddOnDates || {})[String(addonId)];
    if (!Array.isArray(chosen) || !chosen.length) return available.slice();
    var filtered = chosen.filter(function (d) { return available.indexOf(d) !== -1; });
    var hadStale = chosen.some(function (d) { return available.indexOf(d) === -1; });
    if (hadStale || !filtered.length) return available.slice();
    return filtered;
  }

  function setAddOnDates(addonId, dates) {
    window.selectedAddOnDates = window.selectedAddOnDates || {};
    var addon = getAddonById(addonId);
    var available = addon ? getAddOnAvailableDatesForAddon(addon) : getAddOnAvailableDates();
    if (!available.length) available = getAddOnAvailableDates();
    var next = (dates || []).filter(function (d) { return available.indexOf(d) !== -1; });
    if (!next.length && available.length && dates && dates.length) next = [available[0]];
    if (!addonAllowsMultipleDates(addon) && next.length > 1) next = [next[0]];
    if (next.length) window.selectedAddOnDates[String(addonId)] = next;
    else delete window.selectedAddOnDates[String(addonId)];
  }

  function ensureAddOnDates(addonId) {
    var addon = getAddonById(addonId);
    var available = addon ? getAddOnAvailableDatesForAddon(addon) : getAddOnAvailableDates();
    // If availableDays filters out the venue event date, still fall back to that date for post-booking.
    if (!available.length) available = getAddOnAvailableDates();
    var current = getAddOnDatesOfBooking(addonId);
    if (!current.length && available.length) {
      window.selectedAddOnDates = window.selectedAddOnDates || {};
      window.selectedAddOnDates[String(addonId)] = addonAllowsMultipleDates(addon) ? available.slice() : [available[0]];
    }
    return getAddOnDatesOfBooking(addonId);
  }

  function toggleAddOnDate(addonId, dateStr) {
    var addon = getAddonById(addonId);
    var available = addon ? getAddOnAvailableDatesForAddon(addon) : getAddOnAvailableDates();
    if (!available.length) available = getAddOnAvailableDates();
    if (available.indexOf(dateStr) === -1) return;
    var current = getAddOnDatesOfBooking(addonId);
    if (current.indexOf(dateStr) !== -1) {
      if (current.length === 1) return;
      current = current.filter(function (d) { return d !== dateStr; });
    } else {
      current = addonAllowsMultipleDates(addon) ? current.concat(dateStr).sort() : [dateStr];
    }
    setAddOnDates(addonId, current);
  }

  function formatAddOnChipLabel(dateStr) {
    try {
      var d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch (e) { return dateStr; }
  }

  function formatSlotLabel(slot) {
    return slot.startTime + ' \u2013 ' + slot.endTime;
  }

  function buildAddonSelectedSlotHtml(slot) {
    if (!slot || !slot.startTime) return '';
    return '<div class="cdp-addon-slots cdp-addon-slots--selected">' +
      '<span class="cdp-addon-slots-label">Selected time</span>' +
      '<div class="cdp-addon-slot-chips">' +
      '<span class="cdp-addon-slot-selected" data-addon-selected-slot>' + formatSlotLabel(slot) + '</span>' +
      '</div></div>';
  }

  function getAddOnBillingDays(id) {
    var n = id ? getAddOnDatesOfBooking(id).length : getAddOnAvailableDates().length;
    if (n > 0) return n;
    return getAddOnAvailableDates().length || 1;
  }

  function getSelectedAddOns(pd) {
    var selectedVariant = resolveSelectedVariant(pd);
    if (!selectedVariant || !Array.isArray(selectedVariant.addOns)) return [];
    var selectedIds = window.selectedAddOnIds || [];
    return selectedVariant.addOns.filter(function (addon) { return selectedIds.indexOf(String(addon._id)) !== -1; });
  }

  function getAddonLineTotal(a) {
    var p = Number(a && a.price) || 0;
    var d = getAddOnBillingDays(a && a._id);
    return p * d * (isBundleAddOn(a) ? getAddOnPersons(a._id) : 1);
  }

  function getSelectedAddOnsTotal(pd) {
    return getSelectedAddOns(pd).reduce(function (sum, a) { return sum + getAddonLineTotal(a); }, 0);
  }

  function buildSelectedAddonsPayload() {
    var addons = getSelectedAddOns();
    if (!addons.length) return [];
    return addons.map(function (addon) {
      var datesOfBooking = ensureAddOnDates(addon._id);
      var item = {
        addonId: String(addon._id),
        datesOfBooking: datesOfBooking,
        numberOfDays: datesOfBooking.length || 1
      };
      if (isBundleAddOn(addon)) item.noOfPersons = getAddOnPersons(addon._id) || 1;
      var slot = getAddOnTimeSlot(addon._id);
      if (addonRequiresTimeSlot(addon) && slot) item.timeSlot = { startTime: slot.startTime, endTime: slot.endTime };
      return item;
    });
  }

  function scrollCdpToElement(el, opts) {
    opts = opts || {};
    if (!el || typeof el.getBoundingClientRect !== 'function') return;
    var block = opts.block || 'center';
    try {
      el.scrollIntoView({ behavior: 'smooth', block: block, inline: 'nearest' });
    } catch (e) {
      try { el.scrollIntoView(true); } catch (e2) {}
    }
    if (opts.focus === false) return;
    var focusEl = opts.focusEl || el;
    if (!focusEl.matches || !focusEl.matches('input, select, textarea, button, [tabindex]')) {
      focusEl = el.querySelector('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])') || el;
    }
    if (!focusEl || typeof focusEl.focus !== 'function') return;
    setTimeout(function () {
      try { focusEl.focus({ preventScroll: true }); } catch (e3) {
        try { focusEl.focus(); } catch (e4) {}
      }
    }, opts.focusDelay != null ? opts.focusDelay : 320);
  }

  function clearCdpFieldHighlight(scope) {
    var root = scope && scope.querySelectorAll ? scope : document;
    root.querySelectorAll('.cdp-field-error').forEach(function (node) {
      node.classList.remove('cdp-field-error');
      node.removeAttribute('aria-invalid');
    });
    root.querySelectorAll('.cdp-addon-card.has-validation-error, .cdp-addon-options.has-validation-error').forEach(function (node) {
      node.classList.remove('has-validation-error');
    });
    root.querySelectorAll('.cdp-addon-field-error, .cdp-field-inline-error.is-visible').forEach(function (node) {
      node.classList.remove('is-visible');
      node.textContent = '';
    });
  }

  function showCdpInlineFieldError(fieldEl, message, opts) {
    opts = opts || {};
    if (!fieldEl) return;
    var scope = fieldEl.closest('.cdp-addon-card') || fieldEl.closest('.cdp-addr-modal') || fieldEl.closest('.cdp-standalone-dialog') || fieldEl.parentElement;
    if (scope) clearCdpFieldHighlight(scope);
    fieldEl.classList.add('cdp-field-error');
    fieldEl.setAttribute('aria-invalid', 'true');
    var host = fieldEl.parentElement;
    if (host && message) {
      var key = fieldEl.id || fieldEl.name || 'field';
      var errEl = host.querySelector('[data-cdp-field-error="' + key + '"]');
      if (!errEl) {
        errEl = document.createElement('div');
        errEl.className = 'cdp-field-inline-error';
        errEl.setAttribute('data-cdp-field-error', key);
        errEl.setAttribute('role', 'alert');
        if (fieldEl.nextSibling) host.insertBefore(errEl, fieldEl.nextSibling);
        else host.appendChild(errEl);
      }
      errEl.textContent = message;
      errEl.classList.add('is-visible');
    }
    scrollCdpToElement(opts.scrollTarget || fieldEl.closest('.cdp-addon-card') || fieldEl.closest('.cdp-addr-modal') || fieldEl.closest('.bundle-guest-popup') || fieldEl.closest('.olivers-guest-popup') || fieldEl, {
      block: opts.block || 'center',
      focusEl: fieldEl,
      focus: opts.focus !== false
    });
  }

  function paintSectionValidation(el, message, type, scrollTarget) {
    if (!el) return false;
    el.textContent = message;
    el.className = 'cdp-section-validation is-visible is-' + (type || 'error');
    el.setAttribute('role', 'alert');
    el.setAttribute('tabindex', '-1');
    window._cdpSectionValidationTimers = window._cdpSectionValidationTimers || {};
    if (window._cdpSectionValidationTimers[el.id]) clearTimeout(window._cdpSectionValidationTimers[el.id]);
    window._cdpSectionValidationTimers[el.id] = setTimeout(function () {
      el.classList.remove('is-visible');
      el.textContent = '';
      el.removeAttribute('tabindex');
    }, 8000);
    scrollCdpToElement(scrollTarget || el, { block: 'center', focus: false });
    setTimeout(function () {
      try { el.focus({ preventScroll: true }); } catch (e) {}
    }, 320);
    return true;
  }

  function showVenueValidationMessage(message, type) {
    var msgEl = document.getElementById('cdp-venue-validation-message');
    var scrollTarget = document.querySelector('.products_details_calender')
      || document.querySelector('.calendar-container')
      || document.getElementById('book-me-container')
      || msgEl;
    if (!paintSectionValidation(msgEl, message, type, scrollTarget)) {
      notify(message, type);
      scrollCdpToElement(scrollTarget, { focus: false });
    }
  }

  function showAddonsValidationMessage(message, type, scrollTarget) {
    var msgEl = document.getElementById('cdp-addons-validation-message');
    var target = scrollTarget
      || document.getElementById('cdp-addons-panel')
      || document.querySelector('.cdp-addons-section')
      || msgEl;
    if (!paintSectionValidation(msgEl, message, type, target)) {
      notify(message, type);
      scrollCdpToElement(target, { focus: false });
    }
  }

  function clearVenueValidationMessage() {
    var el = document.getElementById('cdp-venue-validation-message');
    if (!el) return;
    el.classList.remove('is-visible', 'is-error', 'is-success', 'is-warn');
    el.textContent = '';
  }

  function clearAddonsValidationMessage() {
    var el = document.getElementById('cdp-addons-validation-message');
    if (!el) return;
    el.classList.remove('is-visible', 'is-error', 'is-success', 'is-warn');
    el.textContent = '';
  }

  function venueDatesReadyForAddons() {
    if (getAddOnAvailableDates().length) {
      return { ok: true };
    }
    var dates = selectedDates();
    if (!Array.isArray(dates) || !dates.length) {
      return { ok: false, message: 'Please select your booking date before choosing add-ons.' };
    }
    if (typeof window.usesCheckInCheckOutDates === 'function' && window.usesCheckInCheckOutDates()) {
      if (dates.length < 2) {
        return { ok: false, message: 'Please select your check-out date before choosing add-ons.' };
      }
    }
    return { ok: true };
  }

  function formatAddonAvailabilityMessage(addon, bookedDates) {
    var title = (addon && addon.title) || 'Add-on';
    var labels = bookedDates.map(formatAddOnChipLabel);
    var dateText = labels.length === 1
      ? labels[0]
      : labels.slice(0, -1).join(', ') + ' and ' + labels[labels.length - 1];
    return '"' + title + '" is already booked on ' + dateText + '. Please choose another available date or remove this add-on from your booking.';
  }

  function getAddonAvailabilityIssueDetails(addon) {
    var issues = [];
    if (!addon) return issues;
    var id = String(addon._id);
    var bookingDates = getAddOnDatesOfBooking(id);
    var selectedSlot = getAddOnTimeSlot(id);
    var fullyBookedDates = bookingDates.filter(function (dateStr) {
      return isAddonStandaloneDateFullyBooked(addon, dateStr);
    });
    if (fullyBookedDates.length) {
      issues.push({
        addonId: id,
        field: 'availability',
        message: formatAddonAvailabilityMessage(addon, fullyBookedDates)
      });
    }
    if (addonRequiresTimeSlot(addon) && selectedSlot) {
      bookingDates.forEach(function (dateStr) {
        if (fullyBookedDates.indexOf(dateStr) !== -1) return;
        if (isAddonStandaloneSlotBooked(addon, dateStr, selectedSlot)) {
          issues.push({
            addonId: id,
            field: 'slot',
            message: '"' + (addon.title || 'Add-on') + '" \u2014 the ' + formatSlotLabel(selectedSlot) +
              ' slot on ' + formatAddOnChipLabel(dateStr) + ' is fully booked. Please choose another time slot or date.'
          });
        }
      });
    }
    return issues;
  }

  function getAddonValidationIssueDetails(addon) {
    var issues = [];
    var title = (addon && addon.title) || 'Add-on';
    var id = String(addon._id);
    if (isBundleAddOn(addon) && getAddOnPersons(addon._id) < 1) {
      issues.push({ addonId: id, field: 'guests', message: 'Select the number of guests for "' + title + '".' });
    }
    if (!getAddOnDatesOfBooking(addon._id).length) {
      issues.push({ addonId: id, field: 'dates', message: 'Select at least one booking date for "' + title + '".' });
    }
    if (addonRequiresTimeSlot(addon) && !getAddOnTimeSlot(addon._id)) {
      issues.push({ addonId: id, field: 'slot', message: 'Select a time slot for "' + title + '".' });
    }
    getAddonAvailabilityIssueDetails(addon).forEach(function (issue) { issues.push(issue); });
    return issues;
  }

  function getAddonValidationIssues(addon) {
    return getAddonValidationIssueDetails(addon).map(function (issue) { return issue.message; });
  }

  function collectAddonValidationMessages() {
    var messages = [];
    getSelectedAddOns().forEach(function (addon) {
      getAddonValidationIssueDetails(addon).forEach(function (issue) { messages.push(issue.message); });
    });
    return messages;
  }

  function focusAddonValidationIssue(issue) {
    if (!issue || !issue.addonId) return false;
    var id = String(issue.addonId);
    var card = document.querySelector('.cdp-addon-card[data-addon-id="' + id + '"]');
    if (!card) return false;
    document.querySelectorAll('.cdp-addon-card.has-validation-error').forEach(function (node) {
      node.classList.remove('has-validation-error');
    });
    card.classList.add('has-validation-error');
    if (!card.classList.contains('is-selected')) {
      toggleAddOnSelection(id, true);
      card = document.querySelector('.cdp-addon-card[data-addon-id="' + id + '"]') || card;
    }
    var options = card.querySelector('.cdp-addon-options');
    if (options) {
      options.hidden = false;
      options.classList.add('has-validation-error');
    }
    var fieldWrap = null;
    if (issue.field === 'guests') fieldWrap = card.querySelector('.cdp-addon-stepper');
    else if (issue.field === 'dates' || issue.field === 'availability') fieldWrap = card.querySelector('.cdp-addon-dates');
    else if (issue.field === 'slot') fieldWrap = card.querySelector('.cdp-addon-slots');
    var inlineHost = fieldWrap || options || card;
    var errEl = inlineHost.querySelector('.cdp-addon-field-error');
    if (!errEl) {
      errEl = document.createElement('div');
      errEl.className = 'cdp-addon-field-error cdp-field-inline-error';
      errEl.setAttribute('role', 'alert');
      inlineHost.appendChild(errEl);
    }
    errEl.textContent = issue.message;
    errEl.classList.add('is-visible');
    scrollCdpToElement(card, { block: 'center', focus: false });
    return true;
  }

  function showAddonValidationErrors() {
    var panel = document.getElementById('cdp-addons-panel') || document.querySelector('.cdp-addons-section');
    clearCdpFieldHighlight(panel || document);
    var messages = [];
    var firstIssue = null;
    getSelectedAddOns().forEach(function (addon) {
      getAddonValidationIssueDetails(addon).forEach(function (issue) {
        messages.push(issue.message);
        if (!firstIssue) firstIssue = issue;
      });
    });
    if (!messages.length) return false;
    if (firstIssue) focusAddonValidationIssue(firstIssue);
    showAddonsValidationMessage(messages.join(' '), 'error', panel);
    return true;
  }

  function validateSelectedBundleAddOns() {
    return getSelectedAddOns().filter(function (addon) {
      return getAddonValidationIssues(addon).length > 0;
    });
  }

  function attachSelectedAddonsToRequest(requestData) {
    var payload = buildSelectedAddonsPayload();
    if (!payload.length) {
      delete requestData.selectedAddOns;
      delete requestData.selectedAddons;
      delete requestData.addOns;
      delete requestData.addOnsTotal;
      return requestData;
    }
    requestData.selectedAddOns = payload.map(sanitizeAddonItem);
    delete requestData.selectedAddons;
    requestData.addOnsTotal = getSelectedAddOnsTotal(window.productDetails || (typeof productDetails !== 'undefined' ? productDetails : null));
    delete requestData.addOns;
    return ensureSelectedAddOnsApiKey(requestData);
  }

  function shouldShowAddOnsPanel(v) {
    v = v || resolveSelectedVariant();
    return !!(v && Array.isArray(v.addOns) && v.addOns.length);
  }

  function updateAddOnsTotalUI() {
    var totalEl = document.getElementById('cdp-addons-total');
    var valueEl = document.getElementById('cdp-addons-total-value');
    if (!totalEl || !valueEl) return;
    var selected = getSelectedAddOns();
    var total = getSelectedAddOnsTotal();
    var symbol = curSym();
    if (!selected.length || !getAddOnAvailableDates().length) { totalEl.style.display = 'none'; return; }
    totalEl.style.display = 'flex';
    valueEl.textContent = symbol + moneyFmt(total);
  }

  function resetVenueAddOnSelections() {
    window.selectedAddOnIds = [];
    window.selectedAddOnGuests = {};
    window.selectedAddOnDates = {};
    window.selectedAddOnTimeSlots = {};
    clearAddonsValidationMessage();
    document.querySelectorAll('#cdp-addons-list .cdp-addon-card').forEach(function (card) {
      card.classList.remove('has-validation-error');
      card.classList.remove('is-selected');
      card.setAttribute('aria-pressed', 'false');
      var checkbox = card.querySelector('input[type="checkbox"]');
      if (checkbox) checkbox.checked = false;
      syncAddOnIncludeButton(card, false);
      var addonId = card.getAttribute('data-addon-id');
      var addon = addonId ? getAddonById(addonId) : null;
      if (addon) syncAddOnStandaloneButton(card, addon);
      var options = card.querySelector('.cdp-addon-options');
      if (options) {
        options.hidden = true;
        options.classList.remove('has-validation-error');
      }
      card.querySelectorAll('.cdp-addon-field-error').forEach(function (errEl) {
        errEl.textContent = '';
        errEl.classList.remove('is-visible');
      });
    });
    updateAddOnsTotalUI();
    if (typeof updatePaymentSummary === 'function') updatePaymentSummary();
  }

  function addonIncludeLabel(selected) {
    return selected ? 'Included in booking' : 'Include in booking';
  }

  function hasVenueDatesSelected() {
    var dates = selectedDates();
    return Array.isArray(dates) && dates.length > 0;
  }

  function shouldHideAddonStandaloneBtn() {
    return hasVenueDatesSelected();
  }

  function syncAddOnStandaloneButton(card, addon) {
    if (!card || !addon || !addonCanBookSeparately(addon)) return;
    var actions = card.querySelector('.cdp-addon-actions');
    if (!actions) return;
    actions.hidden = shouldHideAddonStandaloneBtn();
  }

  function refreshAddonStandaloneButtons() {
    document.querySelectorAll('#cdp-addons-list .cdp-addon-card').forEach(function (card) {
      var addonId = card.getAttribute('data-addon-id');
      var addon = addonId ? getAddonById(addonId) : null;
      if (addon) syncAddOnStandaloneButton(card, addon);
    });
  }

  function syncAddOnIncludeButton(card, selected) {
    if (!card) return;
    var includeBtn = card.querySelector('.cdp-addon-include-btn');
    if (!includeBtn) return;
    includeBtn.classList.toggle('is-included', !!selected);
    includeBtn.setAttribute('aria-pressed', selected ? 'true' : 'false');
    includeBtn.textContent = addonIncludeLabel(!!selected);
  }

  function syncAddOnCardControls(card, addon, selected) {
    if (!card || !addon) return;
    var id = String(addon._id);
    syncAddOnIncludeButton(card, selected);
    syncAddOnStandaloneButton(card, addon);
    var opts = card.querySelector('.cdp-addon-options');
    if (opts) opts.hidden = !selected;
    var guestVal = card.querySelector('.cdp-addon-guest-value');
    if (guestVal) guestVal.textContent = String(getAddOnPersons(id) || 1);
    card.querySelectorAll('.cdp-addon-date-chip').forEach(function (chip) {
      var dateStr = chip.getAttribute('data-date');
      var disabled = !isAddOnVenueDateSelectable(addon, dateStr);
      var active = !disabled && getAddOnDatesOfBooking(id).indexOf(dateStr) !== -1;
      chip.classList.toggle('is-active', active);
      chip.classList.toggle('is-disabled', disabled);
      chip.disabled = disabled;
      chip.setAttribute('aria-pressed', active ? 'true' : 'false');
      if (disabled) chip.setAttribute('aria-disabled', 'true');
      else chip.removeAttribute('aria-disabled');
    });
    if (selected && addonRequiresTimeSlot(addon)) ensureAddOnTimeSlotAuto(addon, id);
    var primaryDate = getAddOnDatesOfBooking(id)[0] || '';
    card.querySelectorAll('.cdp-addon-slot-chip').forEach(function (chip) {
      var slot = { startTime: chip.getAttribute('data-start'), endTime: chip.getAttribute('data-end') };
      var selectedSlot = getAddOnTimeSlot(id);
      var active = !!(selectedSlot && selectedSlot.startTime === slot.startTime && selectedSlot.endTime === slot.endTime);
      var remaining = primaryDate ? getSlotRemainingCapacity(addon, primaryDate, slot) : getAddonSlotCapacity(addon, slot);
      var slotBooked = primaryDate && remaining <= 0;
      var showCapacity = !!primaryDate && remaining > 0 && remaining < getAddonSlotCapacity(addon, slot);
      chip.classList.toggle('is-active', active);
      chip.classList.toggle('is-disabled', !!slotBooked);
      chip.classList.toggle('is-booked', !!slotBooked);
      chip.disabled = !!slotBooked;
      chip.setAttribute('aria-pressed', active ? 'true' : 'false');
      chip.textContent = formatSlotLabel(slot) + (slotBooked ? ' (Full)' : (showCapacity ? formatAddonSlotCapacityLabel(remaining) : ''));
      if (slotBooked && active) setAddOnTimeSlot(id, null);
    });
    var slotsWrap = card.querySelector('.cdp-addon-slots:not(.cdp-addon-slots--selected)');
    var selectedSlot = getAddOnTimeSlot(id);
    var selectedSlotRow = card.querySelector('.cdp-addon-slots--selected');
    if (addonRequiresTimeSlot(addon) && selected && selectedSlot) {
      if (!selectedSlotRow && slotsWrap) {
        slotsWrap.insertAdjacentHTML('beforebegin', buildAddonSelectedSlotHtml(selectedSlot));
      } else if (selectedSlotRow) {
        var selectedEl = selectedSlotRow.querySelector('[data-addon-selected-slot]');
        if (selectedEl) selectedEl.textContent = formatSlotLabel(selectedSlot);
      }
    } else if (selectedSlotRow) selectedSlotRow.remove();
    var minus = card.querySelector('[data-addon-step="-1"]');
    if (minus) minus.disabled = getAddOnPersons(id) <= 1;
    var lineEl = card.querySelector('.cdp-addon-line-total');
    if (lineEl) {
      var symbol = curSym();
      var days = getAddOnBillingDays(id) || 1;
      var persons = getAddOnPersons(id) || 1;
      var total = getAddonLineTotal(addon);
      if (isBundleAddOn(addon)) lineEl.textContent = symbol + moneyFmt(+addon.price || 0) + ' × ' + persons + ' guest' + (persons > 1 ? 's' : '') + ' = ' + symbol + moneyFmt((+addon.price || 0) * persons) + ' × ' + days + ' day' + (days > 1 ? 's' : '') + ' = ' + symbol + moneyFmt(total);
      else if (isFixedAddOn(addon)) lineEl.textContent = days + ' days × ' + symbol + moneyFmt(Number(addon.price) || 0) + ' = ' + symbol + moneyFmt(total);
      else lineEl.textContent = days + 'd = ' + symbol + moneyFmt(total);
      lineEl.hidden = !selected;
    }
  }

  function applyAddOnSelection(id, nextState, addon) {
    window.selectedAddOnIds = window.selectedAddOnIds || [];
    var isSelected = window.selectedAddOnIds.indexOf(id) !== -1;
    if (nextState && !isSelected) {
      window.selectedAddOnIds.push(id);
      if (isBundleAddOn(addon) && getAddOnPersons(id) < 1) setAddOnPersons(id, 1);
      ensureAddOnDates(id);
      if (addon) ensureAddOnTimeSlotAuto(addon, id);
    } else if (!nextState && isSelected) {
      window.selectedAddOnIds = window.selectedAddOnIds.filter(function (x) { return x !== id; });
      setAddOnPersons(id, 0);
      delete (window.selectedAddOnDates || {})[id];
      delete (window.selectedAddOnTimeSlots || {})[id];
    }
    var card = document.querySelector('.cdp-addon-card[data-addon-id="' + id + '"]');
    if (card) {
      card.classList.toggle('is-selected', nextState);
      card.setAttribute('aria-pressed', nextState ? 'true' : 'false');
      var checkbox = card.querySelector('input[type="checkbox"]');
      if (checkbox) checkbox.checked = nextState;
      if (addon) syncAddOnCardControls(card, addon, nextState);
      else syncAddOnIncludeButton(card, nextState);
    }
    updateAddOnsTotalUI();
    if (typeof updatePaymentSummary === 'function') updatePaymentSummary();
  }

  function toggleAddOnSelection(addonId, forceState) {
    var id = String(addonId);
    window.selectedAddOnIds = window.selectedAddOnIds || [];
    var selectedVariant = resolveSelectedVariant();
    var addon = selectedVariant && Array.isArray(selectedVariant.addOns)
      ? selectedVariant.addOns.find(function (a) { return String(a._id) === id; })
      : null;
    var isSelected = window.selectedAddOnIds.indexOf(id) !== -1;
    var nextState = typeof forceState === 'boolean' ? forceState : !isSelected;
    if (nextState && !isSelected) {
      var venueCheck = venueDatesReadyForAddons();
      if (!venueCheck.ok) {
        showVenueValidationMessage(venueCheck.message, 'error');
        return;
      }
      clearVenueValidationMessage();
    }
    applyAddOnSelection(id, nextState, addon);
    if (nextState) clearAddonsValidationMessage();
  }

  function renderVariantAddOns(variantOverride) {
    var panel = document.getElementById('cdp-addons-panel');
    var list = document.getElementById('cdp-addons-list');
    var subtitle = document.getElementById('cdp-addons-subtitle');
    if (!panel || !list) return;
    var selectedVariant = variantOverride || resolveSelectedVariant();
    panel.classList.toggle('is-date-locked', !getAddOnAvailableDates().length);
    if (!shouldShowAddOnsPanel(selectedVariant)) {
      panel.classList.remove('is-visible');
      list.innerHTML = '';
      updateAddOnsTotalUI();
      if (typeof window.syncCdpAddonsLayout === 'function') window.syncCdpAddonsLayout();
      return;
    }
    var addOns = selectedVariant.addOns || [];
    var availableIds = addOns.map(function (a) { return String(a._id); });
    window.selectedAddOnIds = (window.selectedAddOnIds || []).filter(function (id) { return availableIds.indexOf(String(id)) !== -1; });
    Object.keys(window.selectedAddOnGuests || {}).forEach(function (id) { if (availableIds.indexOf(String(id)) === -1) delete window.selectedAddOnGuests[id]; });
    Object.keys(window.selectedAddOnDates || {}).forEach(function (id) { if (availableIds.indexOf(String(id)) === -1) delete window.selectedAddOnDates[id]; });
    Object.keys(window.selectedAddOnTimeSlots || {}).forEach(function (id) { if (availableIds.indexOf(String(id)) === -1) delete window.selectedAddOnTimeSlots[id]; });
    if (subtitle) subtitle.textContent = 'Personalise your booking with optional add-ons.';
    var symbol = curSym();
    list.innerHTML = addOns.map(function (addon) {
      var id = String(addon._id);
      var checked = (window.selectedAddOnIds || []).indexOf(id) !== -1;
      if (checked) {
        ensureAddOnDates(id);
        ensureAddOnTimeSlotAuto(addon, id);
      }
      var media = buildAddonCardMediaHtml(addon);
      var desc = addon.description ? String(addon.description) : '';
      var unitPrice = Number(addon.price) || 0;
      var bundle = isBundleAddOn(addon);
      var persons = getAddOnPersons(id) || 1;
      var venueDates = getAddOnAvailableDates();
      var addonDates = getAddOnAvailableDatesForAddon(addon);
      var chosenDates = getAddOnDatesOfBooking(id);
      var days = chosenDates.length || 1;
      var lineTotal = getAddonLineTotal(addon);
      var priceSuffix = bundle ? '/ person / day' : '/ day';
      var guestUI = bundle
        ? '<div class="cdp-addon-stepper"><span class="cdp-addon-stepper-label">Number of guests</span><div class="cdp-addon-stepper-controls"><button type="button" class="cdp-addon-stepper-btn" data-addon-step="-1" data-addon-id="' + id + '" aria-label="Remove guest"' + (persons <= 1 ? ' disabled' : '') + '>−</button><span class="cdp-addon-guest-value">' + persons + '</span><button type="button" class="cdp-addon-stepper-btn" data-addon-step="1" data-addon-id="' + id + '" aria-label="Add guest">+</button></div></div>'
        : '';
      var datesUI = venueDates.length > 1
        ? '<div class="cdp-addon-dates"><span class="cdp-addon-dates-label">' + (addonAllowsMultipleDates(addon) ? 'Choose add-on days' : 'Choose add-on day') + '</span><div class="cdp-addon-date-chips">' + venueDates.map(function (d) {
          var disabled = !isAddOnVenueDateSelectable(addon, d);
          var active = !disabled && chosenDates.indexOf(d) !== -1;
          return buildAddonDateChipHtml(addon, d, { addonId: id, active: active, disabled: disabled });
        }).join('') + '</div></div>'
        : '';
      var uniqueSlots = getUniqueAddonTimeSlots(addon);
      var selectedSlot = getAddOnTimeSlot(id);
      var primaryDate = chosenDates[0] || addonDates[0] || '';
      var slotsUI = uniqueSlots.length
        ? (selectedSlot ? buildAddonSelectedSlotHtml(selectedSlot) : '') +
          '<div class="cdp-addon-slots"><span class="cdp-addon-slots-label">' +
          (uniqueSlots.length > 1 ? 'Choose time slot' : 'Time slot') +
          '</span><div class="cdp-addon-slot-chips">' + uniqueSlots.map(function (slot) {
          var active = !!(selectedSlot && selectedSlot.startTime === slot.startTime && selectedSlot.endTime === slot.endTime);
          return buildAddonSlotChipHtml(addon, slot, { addonId: id, dateStr: primaryDate, active: active });
        }).join('') + '</div></div>'
        : '';
      var lineLabel = bundle
        ? symbol + moneyFmt(unitPrice) + ' × ' + persons + ' guest' + (persons > 1 ? 's' : '') + ' = ' + symbol + moneyFmt(unitPrice * persons) + ' × ' + days + ' day' + (days > 1 ? 's' : '') + ' = ' + symbol + moneyFmt(lineTotal)
        : days + ' days × ' + symbol + moneyFmt(unitPrice) + ' = ' + symbol + moneyFmt(lineTotal);
      var showStandaloneBtn = addonCanBookSeparately(addon) && !shouldHideAddonStandaloneBtn();
      var standaloneBtn = showStandaloneBtn
        ? '<button type="button" class="cdp-addon-standalone-btn ejuno-subheading-btn" data-standalone-addon-id="' + id + '" onclick="event.stopPropagation();event.preventDefault();if(typeof window.startStandaloneAddonFlow===\'function\'){window.startStandaloneAddonFlow(\'' + id.replace(/'/g, '\\\'') + '\');}">Book separately</button>'
        : '';
      var actions = standaloneBtn
        ? '<div class="cdp-addon-actions">' + standaloneBtn + '</div>'
        : '';
      var includeBtn = '<button type="button" class="cdp-addon-include-btn' + (checked ? ' is-included' : '') + '" data-addon-include-id="' + id + '" aria-pressed="' + (checked ? 'true' : 'false') + '">' + addonIncludeLabel(checked) + '</button>';
      return '<div class="cdp-addon-card' + (checked ? ' is-selected' : '') + '" data-addon-id="' + id + '" data-price-type="' + String(addon.priceType || '').toLowerCase() + '" role="button" tabindex="0" aria-pressed="' + (checked ? 'true' : 'false') + '"><span class="cdp-addon-check"><input type="checkbox" value="' + id + '" ' + (checked ? 'checked' : '') + '></span>' +
        media + '<span class="cdp-addon-body"><div class="cdp-addon-top">' + includeBtn + '<p class="cdp-addon-name">' + (addon.title || 'Add-on') + '</p>' +
        '<div class="cdp-addon-price">' + symbol + moneyFmt(unitPrice) + ' <span>' + priceSuffix + '</span></div></div>' +
        (desc ? '<p class="cdp-addon-desc">' + desc + '</p>' : '') +
        '<div class="cdp-addon-options"' + (checked ? '' : ' hidden') + '>' + guestUI + datesUI + slotsUI + '<div class="cdp-addon-line-total"' + (checked ? '' : ' hidden') + '>' + lineLabel + '</div></div>' +
        actions +
        '</span></div>';
    }).join('');
    var leftoverBar = panel.querySelector('.cdp-standalone-multi-bar');
    if (leftoverBar) leftoverBar.remove();
    panel.classList.add('is-visible');
    updateAddOnsTotalUI();
    refreshAddonStandaloneButtons();
    if (typeof window.syncCdpAddonsLayout === 'function') window.syncCdpAddonsLayout();
  }

  function clearAddonCardValidation(card) {
    if (!card) return;
    card.classList.remove('has-validation-error');
    var options = card.querySelector('.cdp-addon-options');
    if (options) options.classList.remove('has-validation-error');
    var errEl = card.querySelector('.cdp-addon-field-error');
    if (errEl) {
      errEl.textContent = '';
      errEl.classList.remove('is-visible');
    }
  }

  document.addEventListener('change', function (e) {
    var input = e.target;
    if (!input || !input.matches) return;
    if (input.matches('#cdp-addons-list input[type="checkbox"]')) toggleAddOnSelection(input.value, input.checked);
  });

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var stepBtn = t.closest('.cdp-addon-stepper-btn');
    if (stepBtn) {
      e.preventDefault();
      e.stopPropagation();
      var id = stepBtn.getAttribute('data-addon-id');
      var delta = parseInt(stepBtn.getAttribute('data-addon-step'), 10) || 0;
      var next = Math.max(1, (getAddOnPersons(id) || 1) + delta);
      setAddOnPersons(id, next);
      if ((window.selectedAddOnIds || []).indexOf(String(id)) === -1) toggleAddOnSelection(id, true);
      else {
        var card = document.querySelector('.cdp-addon-card[data-addon-id="' + id + '"]');
        var variant = resolveSelectedVariant();
        var addon = variant && variant.addOns ? variant.addOns.find(function (a) { return String(a._id) === String(id); }) : null;
        if (card && addon) syncAddOnCardControls(card, addon, true);
        clearAddonCardValidation(card);
        updateAddOnsTotalUI();
        if (typeof updatePaymentSummary === 'function') updatePaymentSummary();
      }
      return;
    }
    var slotChip = t.closest('.cdp-addon-slot-chip');
    if (slotChip) {
      e.preventDefault();
      e.stopPropagation();
      if (slotChip.disabled || slotChip.classList.contains('is-disabled')) return;
      var slotId = slotChip.getAttribute('data-addon-id');
      if ((window.selectedAddOnIds || []).indexOf(String(slotId)) === -1) toggleAddOnSelection(slotId, true);
      setAddOnTimeSlot(slotId, { startTime: slotChip.getAttribute('data-start'), endTime: slotChip.getAttribute('data-end') });
      var slotCard = document.querySelector('.cdp-addon-card[data-addon-id="' + slotId + '"]');
      var slotVariant = resolveSelectedVariant();
      var slotAddon = slotVariant && slotVariant.addOns ? slotVariant.addOns.find(function (a) { return String(a._id) === String(slotId); }) : null;
      if (slotCard && slotAddon) syncAddOnCardControls(slotCard, slotAddon, true);
      clearAddonCardValidation(slotCard);
      updateAddOnsTotalUI();
      if (typeof updatePaymentSummary === 'function') updatePaymentSummary();
      return;
    }
    var dateChip = t.closest('.cdp-addon-date-chip');
    if (dateChip) {
      e.preventDefault();
      e.stopPropagation();
      if (dateChip.disabled || dateChip.classList.contains('is-disabled')) return;
      var dateId = dateChip.getAttribute('data-addon-id');
      var dateStr = dateChip.getAttribute('data-date');
      if ((window.selectedAddOnIds || []).indexOf(String(dateId)) === -1) toggleAddOnSelection(dateId, true);
      toggleAddOnDate(dateId, dateStr);
      var dateCard = document.querySelector('.cdp-addon-card[data-addon-id="' + dateId + '"]');
      var dateVariant = resolveSelectedVariant();
      var dateAddon = dateVariant && dateVariant.addOns ? dateVariant.addOns.find(function (a) { return String(a._id) === String(dateId); }) : null;
      if (dateCard && dateAddon) syncAddOnCardControls(dateCard, dateAddon, true);
      clearAddonCardValidation(dateCard);
      updateAddOnsTotalUI();
      if (typeof updatePaymentSummary === 'function') updatePaymentSummary();
      return;
    }
    var standaloneBtn = t.closest('.cdp-addon-standalone-btn');
    if (standaloneBtn) {
      e.preventDefault();
      e.stopPropagation();
      if (shouldHideAddonStandaloneBtn()) return;
      startStandaloneAddonFlow(standaloneBtn.getAttribute('data-standalone-addon-id'));
      return;
    }
    var includeBtn = t.closest('.cdp-addon-include-btn');
    if (includeBtn) {
      e.preventDefault();
      e.stopPropagation();
      var includeId = includeBtn.getAttribute('data-addon-include-id');
      if (!includeId) return;
      var includeSelected = (window.selectedAddOnIds || []).indexOf(String(includeId)) !== -1;
      toggleAddOnSelection(includeId, !includeSelected);
      return;
    }
    if (t.closest('.cdp-addon-options, .cdp-addon-stepper, .cdp-addon-dates, .cdp-addon-slots, .cdp-addon-standalone-btn, .cdp-addon-include-btn, .cdp-addon-actions')) return;
    var card = t.closest('#cdp-addons-list .cdp-addon-card');
    if (!card) return;
    if (t.matches && t.matches('input[type="checkbox"]')) return;
    var addonsPanel = document.getElementById('cdp-addons-panel');
    if (addonsPanel && addonsPanel.classList.contains('is-date-locked')) {
      var venueCheck = venueDatesReadyForAddons();
      if (!venueCheck.ok) showVenueValidationMessage(venueCheck.message, 'error');
      return;
    }
    e.preventDefault();
    var cardId = card.getAttribute('data-addon-id');
    if (cardId) toggleAddOnSelection(cardId);
  });

  function notify(message, type) {
    if (typeof window.showNotification === 'function') window.showNotification(message, type || 'error');
    else if (typeof showNotification === 'function') showNotification(message, type || 'error');
  }

  function isDateAllowedForAddon(addon, dateStr) {
    if (!dateStr) return false;
    if (!addon || !Array.isArray(addon.availableDays) || !addon.availableDays.length) return true;
    var allowed = addon.availableDays.map(function (d) { return String(d).toLowerCase(); });
    var d = new Date(dateStr + 'T00:00:00');
    return allowed.indexOf(DAY_NAMES[d.getDay()]) !== -1;
  }

  function getAddonFirstBookableDate() {
    if (typeof window.getFirstBookableDate === 'function') return window.getFirstBookableDate();
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var pd = window.productDetails || {};
    var minDays = pd.minimumAdvanceBookingDays;
    minDays = minDays !== undefined && minDays !== null && !isNaN(Number(minDays)) ? Number(minDays) : 0;
    var first = new Date(today);
    if (minDays > 0) first.setDate(today.getDate() + minDays);
    else first.setDate(today.getDate() + 1);
    first.setHours(0, 0, 0, 0);
    return first;
  }

  function isBeforeAddonFirstBookable(dateStr) {
    if (!dateStr) return true;
    var dateObj = new Date(dateStr + 'T00:00:00');
    dateObj.setHours(0, 0, 0, 0);
    return dateObj < getAddonFirstBookableDate();
  }

  function isAddonCalendarDateDisabled(addon, dateStr) {
    if (!dateStr) return true;
    if (isBeforeAddonFirstBookable(dateStr)) return true;
    if (!isDateAllowedForAddon(addon, dateStr)) return true;
    if (!hasAddonAvailableSlotOnDate(addon, dateStr)) return true;
    return false;
  }

  function standaloneLineTotal(addon, dates, persons) {
    var price = Number(addon.price) || 0;
    var days = (dates && dates.length) ? dates.length : 0;
    var count = isBundleAddOn(addon) ? (persons || 1) : 1;
    return price * days * count;
  }

  function standaloneDepositAmount(addon, total) {
    var pd = window.productDetails || {};
    var pct = (addon && addon.depositPercentage != null)
      ? Number(addon.depositPercentage)
      : (pd.paymentPolicy && pd.paymentPolicy.depositPercentage != null ? Number(pd.paymentPolicy.depositPercentage) : 40);
    return { percent: pct, amount: (total * pct) / 100 };
  }

  function buildStandaloneAddonItem(addon, state) {
    var dates = (state.dates || []).slice().sort();
    var item = {
      addonId: String(addon._id),
      datesOfBooking: dates,
      numberOfDays: dates.length || 1
    };
    if (isBundleAddOn(addon)) item.noOfPersons = state.persons || 1;
    if (addonRequiresTimeSlot(addon) && state.slot) {
      item.timeSlot = { startTime: state.slot.startTime, endTime: state.slot.endTime };
    }
    return item;
  }

  function listStandaloneAddons() {
    var variant = resolveSelectedVariant();
    if (!variant || !Array.isArray(variant.addOns)) return [];
    return variant.addOns.filter(addonCanBookSeparately);
  }

  function getStandaloneProductIds() {
    var pd = window.productDetails || {};
    var variant = resolveSelectedVariant();
    var shopifyProductId = pd.shopifyProductId || (typeof window.getCdpProductId === 'function' ? window.getCdpProductId() : null);
    var productId = pd._id || pd.productId || shopifyProductId;
    var variantId = variant ? (variant.variantId || variant.id) : null;
    var productPackageId = variant ? (variant._id || variant.packageId || variantId) : null;
    return {
      shopifyProductId: shopifyProductId,
      productId: productId,
      productPackageId: productPackageId,
      variantId: variantId
    };
  }

  function resolveStandaloneSeedIds(seedAddonId) {
    var all = listStandaloneAddons();
    if (!all.length) return [];
    if (seedAddonId) {
      var one = all.find(function (a) { return String(a._id) === String(seedAddonId); });
      if (one) return [String(one._id)];
      var seed = getAddonById(seedAddonId);
      return seed && addonCanBookSeparately(seed) ? [String(seed._id)] : [];
    }
    var checked = (window.selectedAddOnIds || []).map(String).filter(function (id) {
      return all.some(function (a) { return String(a._id) === id; });
    });
    if (checked.length) return checked;
    return [String(all[0]._id)];
  }

  function nextAllowedDateForAddon(addon) {
    var base = getAddonFirstBookableDate();
    for (var i = 0; i < 60; i++) {
      var cand = new Date(base);
      cand.setDate(cand.getDate() + i);
      var candStr = cand.getFullYear() + '-' + String(cand.getMonth() + 1).padStart(2, '0') + '-' + String(cand.getDate()).padStart(2, '0');
      if (!isAddonCalendarDateDisabled(addon, candStr)) return candStr;
    }
    var fallback = new Date(base);
    fallback.setDate(fallback.getDate() + 1);
    return fallback.getFullYear() + '-' + String(fallback.getMonth() + 1).padStart(2, '0') + '-' + String(fallback.getDate()).padStart(2, '0');
  }

  function createStandaloneAddonState(addon) {
    var id = String(addon._id);
    return {
      selected: false,
      dates: [],
      persons: Math.max(1, getAddOnPersons(id) || 1),
      slot: null
    };
  }

  function resolveBookingOrderId(bookingData, paymentResponse) {
    if (bookingData) {
      var fromBooking = bookingData.orderRefId || bookingData.orderId || bookingData.orderRef;
      if (fromBooking) return fromBooking;
    }
    var payData = paymentResponse && paymentResponse.data;
    if (payData) return payData.orderRefId || payData.orderId || null;
    return null;
  }

  function openStandaloneBookingModal(seedAddonId) {
    var all = listStandaloneAddons();
    if (!all.length && seedAddonId) {
      all = [getAddonById(seedAddonId)].filter(addonCanBookSeparately);
    }
    if (!all.length) {
      notify('No add-ons can be booked separately on this package.', 'error');
      return;
    }
    if (seedAddonId) {
      var addon = getAddonById(seedAddonId);
      if (!addonCanBookSeparately(addon)) {
        notify('This add-on cannot be booked separately.', 'error');
        return;
      }
    }
    var seedIds = resolveStandaloneSeedIds(seedAddonId);
    var authToken = localStorage.getItem('authToken');
    var customerId = localStorage.getItem('customerId');
    if (!authToken || !customerId) {
      window.requestData = {
        _standaloneAddon: true,
        _standaloneAddonId: seedAddonId ? String(seedAddonId) : (seedIds[0] || null),
        _standaloneAddonIds: seedIds
      };
      if (typeof window.showLoginPopups === 'function') window.showLoginPopups(window.requestData);
      else if (typeof showLoginPopups === 'function') showLoginPopups(window.requestData);
      else notify('Please log in to continue.', 'error');
      return;
    }
    if (typeof hideLoaderFull === 'function') hideLoaderFull();
    openStandaloneAddonModal(seedAddonId, window._standaloneAddressContext || null, seedIds);
  }

  function startStandaloneAddonFlow(seedAddonId) {
    openStandaloneBookingModal(seedAddonId);
  }

  function normalizeStandaloneBillingAddress(billing, phone) {
    if (!billing) return null;
    var next = {
      address1: billing.address1 || '',
      city: billing.city || '',
      country: billing.country || '',
      province: billing.province || '',
      zip: billing.zip || '',
      contactNumber: billing.contactNumber || phone || ''
    };
    return next.address1 ? next : null;
  }

  function normalizeStandaloneShippingAddress(shipping, phone) {
    if (!shipping) return null;
    var next = {
      address1: shipping.address1 || '',
      city: shipping.city || '',
      country: shipping.country || '',
      province: shipping.province || '',
      zip: shipping.zip || '',
      contactNumber: shipping.contactNumber || phone || ''
    };
    return next.address1 ? next : null;
  }

  function normalizeWeddingId(value) {
    if (value == null) return null;
    var s = String(value).trim();
    if (!s || s.toLowerCase() === 'n/a' || s.toLowerCase() === 'nan') return null;
    return s;
  }

  function getStoredWeddingId() {
    try {
      var params = new URLSearchParams(window.location.search);
      var fromUrl = normalizeWeddingId(params.get('weddingRefId') || params.get('weddingId'));
      if (fromUrl) return fromUrl;
    } catch (e) { /* ignore */ }
    return normalizeWeddingId(localStorage.getItem('weddingRefId') || localStorage.getItem('weddingId'));
  }

  function resolveStandaloneWeddingId(bookingData) {
    if (bookingData) {
      var fromBooking = normalizeWeddingId(
        bookingData.weddingRefId || bookingData.weddingId || bookingData.weddingRef ||
        (bookingData.wedding && (bookingData.wedding.weddingRefId || bookingData.wedding._id))
      );
      if (fromBooking) return fromBooking;
      var payment = bookingData.payment || {};
      var fromPayment = normalizeWeddingId(
        (payment.couple && (payment.couple.weddingRefId || payment.couple.weddingId)) ||
        (payment.guest && (payment.guest.weddingRefId || payment.guest.weddingId))
      );
      if (fromPayment) return fromPayment;
    }
    return getStoredWeddingId();
  }

  function rememberWeddingId(weddingId) {
    var id = normalizeWeddingId(weddingId);
    if (id) localStorage.setItem('weddingRefId', id);
  }

  function calcStandaloneSelectionTotals(selectedPairs) {
    var symbol = curSym();
    var total = 0;
    var deposit = 0;
    var titles = [];
    selectedPairs.forEach(function (pair) {
      var line = standaloneLineTotal(pair.addon, pair.state.dates, pair.state.persons);
      var dep = standaloneDepositAmount(pair.addon, line);
      total += line;
      deposit += dep.amount;
      titles.push(pair.addon.title || 'Add-on');
    });
    return {
      total: total,
      deposit: deposit,
      depositLabel: symbol + moneyFmt(deposit),
      depositDisplay: symbol + moneyFmt(deposit) + (selectedPairs.length > 1 ? ' (combined)' : ''),
      titles: titles,
      titleLabel: titles.length === 1 ? titles[0] : (titles.length + ' add-ons')
    };
  }

  function buildStandaloneRequestData(selectedPairs, contact, addressContext) {
    var items = selectedPairs.map(function (pair) {
      return sanitizeAddonItem(buildStandaloneAddonItem(pair.addon, pair.state));
    });
    var first = items[0] || {};
    var totals = calcStandaloneSelectionTotals(selectedPairs);
    var ids = getStandaloneProductIds();
    var customerType = localStorage.getItem('customerType') === 'couple' ? 'couple' : 'guest';
    var requestData = {
      _standaloneAddon: true,
      productId: ids.productId,
      productPackageId: ids.productPackageId,
      selectedAddOns: items,
      payment: {},
      addOnsTotal: totals.total,
      _standaloneDepositLabel: totals.depositLabel,
      _standaloneInitialDepositDisplay: totals.depositDisplay,
      _standaloneAddonTitle: totals.titleLabel,
      _standaloneContact: contact
    };
    if (first.noOfPersons) requestData.noOfPersons = first.noOfPersons;
    if (first.timeSlot) requestData.timeSlot = first.timeSlot;
    requestData.payment[customerType] = contact;
    if (addressContext) {
      if (addressContext.billingAddress) {
        requestData.billingAddress = normalizeStandaloneBillingAddress(addressContext.billingAddress, contact.phone);
      }
      if (addressContext.shippingAddress) {
        requestData.shippingAddress = normalizeStandaloneShippingAddress(addressContext.shippingAddress, contact.phone);
      }
      if (requestData.billingAddress && requestData.shippingAddress) {
        requestData._addressGatePassed = true;
      }
    }
    return requestData;
  }

  function buildStandaloneApiPayload(requestData) {
    var items = getSelectedAddonsFromData(requestData).map(sanitizeAddonItem);
    var customerType = localStorage.getItem('customerType') === 'couple' ? 'couple' : 'guest';
    var contact = requestData._standaloneContact || {};
    var billing = normalizeStandaloneBillingAddress(
      requestData.billingAddress || (window._standaloneAddressContext && window._standaloneAddressContext.billingAddress),
      contact.phone
    );
    var shipping = normalizeStandaloneShippingAddress(
      requestData.shippingAddress || (window._standaloneAddressContext && window._standaloneAddressContext.shippingAddress),
      contact.phone
    );
    var ids = getStandaloneProductIds();
    var payload = {
      productPackageId: requestData.productPackageId || ids.productPackageId,
      selectedAddOns: items
    };
    if (billing) payload.billingAddress = billing;
    if (shipping) payload.shippingAddress = shipping;
    if (requestData.payment) payload.payment = requestData.payment;
    if (!payload.payment) payload.payment = {};
    if (!payload.payment[customerType] && requestData._standaloneContact) {
      payload.payment[customerType] = requestData._standaloneContact;
    }
    var weddingId = resolveStandaloneWeddingId(null);
    if (weddingId) payload.weddingRefId = weddingId;
    return ensureSelectedAddOnsApiKey(payload);
  }

  var SA_MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function saMonthKeyFromDate(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function shiftSaMonthKey(key, delta) {
    var parts = key.split('-');
    var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1 + delta, 1);
    return saMonthKeyFromDate(d);
  }

  function getAddonDepositPercent(addon) {
    return standaloneDepositAmount(addon, 100).percent;
  }

  function getStandaloneContactFromStorage() {
    return {
      firstName: localStorage.getItem('customerFirstName') || '',
      lastName: localStorage.getItem('customerLastName') || '',
      email: localStorage.getItem('customerEmail') || '',
      phone: localStorage.getItem('customerPhone') || ''
    };
  }

  function renderSaCalendarHtml(addon, state, monthKey) {
    var id = String(addon._id);
    var parts = monthKey.split('-');
    var year = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10) - 1;
    var first = new Date(year, month, 1);
    var startDow = first.getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var html = '<div class="cdp-sa-calendar" data-sa-calendar="' + id + '">' +
      '<div class="cdp-sa-cal-nav">' +
        '<button type="button" class="cdp-sa-cal-nav-btn" data-sa-cal-prev="' + id + '" aria-label="Previous month">&lsaquo;</button>' +
        '<span class="cdp-sa-cal-title">' + SA_MONTH_NAMES[month] + ' ' + year + '</span>' +
        '<button type="button" class="cdp-sa-cal-nav-btn" data-sa-cal-next="' + id + '" aria-label="Next month">&rsaquo;</button>' +
      '</div>' +
      '<div class="cdp-sa-cal-weekdays">' +
        ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(function (d) { return '<span>' + d + '</span>'; }).join('') +
      '</div><div class="cdp-sa-cal-grid">';
    var i;
    for (i = 0; i < startDow; i++) html += '<span class="cdp-sa-cal-empty" aria-hidden="true"></span>';
    for (var day = 1; day <= daysInMonth; day++) {
      var dateObj = new Date(year, month, day);
      var ds = dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + String(dateObj.getDate()).padStart(2, '0');
      var booked = isAddonStandaloneDateFullyBooked(addon, ds);
      var disabled = isAddonCalendarDateDisabled(addon, ds);
      var selected = !disabled && state.dates.indexOf(ds) !== -1;
      var dayLabel = booked ? 'Booked' : (disabled ? 'Unavailable' : formatAddOnChipLabel(ds));
      html += '<button type="button" class="cdp-sa-cal-day' + (disabled ? ' is-disabled' : '') + (booked ? ' is-booked' : '') + (selected ? ' is-selected' : '') +
        '" data-sa-cal-day="' + id + '" data-date="' + ds + '"' + (disabled ? ' disabled' : '') +
        ' aria-label="' + dayLabel + '">' + day + '</button>';
    }
    html += '</div></div>';
    return html;
  }

  function normalizeSaVideoUrl(video) {
    if (!video) return '';
    if (typeof video === 'string') return video.trim();
    return String(video.url || video.src || video.videoUrl || '').trim();
  }

  function getSaAddonMediaItems(addon) {
    if (typeof window.getCdpAddonMediaItems === 'function') {
      return window.getCdpAddonMediaItems(addon) || [];
    }
    var items = [];
    var seen = {};
    var images = Array.isArray(addon.images) ? addon.images.filter(Boolean) : [];
    var videos = Array.isArray(addon.videos) ? addon.videos : [];
    images.forEach(function (src) {
      var url = String(src || '').trim();
      if (!url || seen[url]) return;
      seen[url] = true;
      items.push({ type: 'image', src: url });
    });
    videos.forEach(function (video) {
      var url = normalizeSaVideoUrl(video);
      if (!url || seen[url]) return;
      seen[url] = true;
      items.push({ type: 'video', src: url });
    });
    return items;
  }

  function renderSaAddonMedia(addon) {
    var mediaItems = getSaAddonMediaItems(addon);
    if (!mediaItems.length) {
      return '<div class="cdp-sa-addon-media cdp-addon-media cdp-addon-media--empty" aria-hidden="true">+</div>';
    }
    var first = mediaItems[0];
    var mainInner = first.type === 'video'
      ? '<video src="' + first.src + '" muted playsinline preload="metadata" data-sa-main-media="' + String(addon._id) + '" data-sa-media-type="video"></video>'
      : '<img src="' + first.src + '" alt="" loading="lazy" data-sa-main-media="' + String(addon._id) + '" data-sa-media-type="image">';
    var thumbs = mediaItems.length > 1
      ? '<div class="cdp-sa-addon-thumbs">' + mediaItems.slice(0, 4).map(function (item, idx) {
        var thumbInner = item.type === 'video'
          ? '<video src="' + item.src + '" muted playsinline preload="metadata" aria-hidden="true"></video>'
          : '<img src="' + item.src + '" alt="" loading="lazy">';
        return '<button type="button" class="cdp-sa-addon-thumb' + (item.type === 'video' ? ' is-video' : '') + (idx === 0 ? ' is-active' : '') +
          '" data-sa-thumb-src="' + item.src + '" data-sa-thumb-type="' + item.type + '" aria-label="View ' + item.type + ' ' + (idx + 1) + '">' +
          thumbInner + '</button>';
      }).join('') + (mediaItems.length > 4 ? '<span class="cdp-sa-thumb-more">+' + (mediaItems.length - 4) + '</span>' : '') + '</div>'
      : '';
    return '<div class="cdp-sa-addon-media-wrap">' +
      '<button type="button" class="cdp-sa-addon-media cdp-addon-media' + (first.type === 'video' ? ' cdp-addon-media--video' : '') + '" data-sa-gallery="' + String(addon._id) + '" aria-label="View media">' +
        mainInner +
      '</button>' + thumbs + '</div>';
  }

  function openStandaloneAddonModal(seedAddonId, addressContext, seedIds) {
    if (typeof hideLoaderFull === 'function') hideLoaderFull();
    addressContext = addressContext || window._standaloneAddressContext || null;
    var catalog = listStandaloneAddons();
    if (!catalog.length) {
      notify('No add-ons can be booked separately on this package.', 'error');
      return;
    }
    seedIds = (seedIds && seedIds.length ? seedIds : resolveStandaloneSeedIds(seedAddonId)).map(String);
    var existing = document.getElementById('cdp-standalone-modal');
    if (existing) existing.remove();

    var states = {};
    catalog.forEach(function (addon) {
      var id = String(addon._id);
      states[id] = createStandaloneAddonState(addon);
      states[id].selected = seedIds.indexOf(id) !== -1;
      ensureStandaloneTimeSlotAuto(addon, states[id]);
    });
    if (!Object.keys(states).some(function (id) { return states[id].selected; })) {
      states[String(catalog[0]._id)].selected = true;
    }

    var singleMode = catalog.length === 1;
    if (singleMode) states[String(catalog[0]._id)].selected = true;

    var symbol = curSym();
    var modal = document.createElement('div');
    modal.id = 'cdp-standalone-modal';
    modal.className = 'cdp-standalone-modal';
    var saCalendarMonths = {};

    modal.innerHTML =
      '<div class="cdp-standalone-dialog cdp-standalone-dialog--multi" role="dialog" aria-modal="true" aria-labelledby="cdp-standalone-title">' +
        '<div class="cdp-standalone-head">' +
          '<div class="cdp-standalone-head-text">' +
            '<span class="cdp-standalone-kicker">Book separately</span>' +
            '<h2 id="cdp-standalone-title">' + (singleMode ? 'Book this add-on' : 'Book add-ons separately') + '</h2>' +
            '<p class="cdp-standalone-sub">' +
              (singleMode
                ? 'Choose your date, time slot, and guests \u2014 then request availability.'
                : 'Select add-ons and configure each one, then request availability.') +
            '</p>' +
            '<ol class="cdp-sa-steps" aria-hidden="true">' +
              '<li class="is-active"><span>1</span> Configure booking</li>' +
              '<li><span>2</span> Request availability</li>' +
            '</ol>' +
          '</div>' +
          '<button type="button" class="cdp-standalone-close" aria-label="Close">&times;</button>' +
        '</div>' +
        '<div class="cdp-standalone-body">' +
          '<div class="cdp-standalone-col cdp-standalone-col--booking">' +
            '<div class="cdp-sa-col-head">' +
              '<h3 class="cdp-standalone-section-title">Add-on details</h3>' +
              '<p class="cdp-sa-col-help" id="cdp-sa-count-help"></p>' +
            '</div>' +
            '<div class="cdp-standalone-addon-list"></div>' +
            '<div class="cdp-standalone-inline-error" id="cdp-sa-selection-error"></div>' +
          '</div>' +
          '<div class="cdp-standalone-col cdp-standalone-col--summary">' +
            '<div class="cdp-sa-col-head cdp-sa-col-head--summary">' +
              '<h3 class="cdp-standalone-section-title">Order summary</h3>' +
              '<p class="cdp-sa-col-help">We confirm your contact and address details before sending your request.</p>' +
            '</div>' +
            '<div class="cdp-standalone-summary"></div>' +
          '</div>' +
        '</div>' +
        '<div class="cdp-standalone-foot">' +
          '<div class="cdp-sa-foot-meta" id="cdp-sa-foot-meta"></div>' +
          '<button type="button" class="cdp-standalone-submit">Request Availability</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(modal);

    var listEl = modal.querySelector('.cdp-standalone-addon-list');
    var summary = modal.querySelector('.cdp-standalone-summary');
    var countHelp = modal.querySelector('#cdp-sa-count-help');
    var footMeta = modal.querySelector('#cdp-sa-foot-meta');
    var submitBtn = modal.querySelector('.cdp-standalone-submit');
    var selectionErrorEl = modal.querySelector('#cdp-sa-selection-error');

    function selectedPairs() {
      return catalog.filter(function (addon) {
        return states[String(addon._id)] && states[String(addon._id)].selected;
      }).map(function (addon) {
        return { addon: addon, state: states[String(addon._id)] };
      });
    }

    function setInlineError(el, msg) {
      if (!el) return;
      el.textContent = msg || '';
      el.classList.toggle('is-visible', !!msg);
      if (!msg) return;
      var scrollTarget = el.closest('.cdp-sa-addon-block')
        || el.closest('.cdp-standalone-col')
        || el.closest('.cdp-standalone-body')
        || el;
      scrollCdpToElement(scrollTarget, { block: 'center', focus: false });
    }

    function addonReadyState(addon, state) {
      if (!state.selected) return { key: 'off', label: 'Not included' };
      if (!state.dates || !state.dates.length) return { key: 'need', label: 'Needs a date' };
      if (addonRequiresTimeSlot(addon) && !state.slot) return { key: 'need', label: 'Needs a time' };
      if (isBundleAddOn(addon) && state.persons < 1) return { key: 'need', label: 'Needs guests' };
      return { key: 'ready', label: 'Ready' };
    }

    function refreshSummary() {
      var pairs = selectedPairs();
      var n = pairs.length;
      if (countHelp) {
        countHelp.textContent = singleMode
          ? 'Only this add-on can be booked alone here.'
          : (n === 0
            ? 'Tick an add-on below to include it.'
            : n + ' of ' + catalog.length + ' add-on' + (n === 1 ? '' : 's') + ' included');
      }

      if (!pairs.length) {
        summary.innerHTML =
          '<div class="cdp-sa-summary-empty">' +
            '<strong>Nothing selected yet</strong>' +
            '<p>Include at least one add-on on the left to see pricing.</p>' +
          '</div>';
        if (footMeta) footMeta.textContent = 'Select an add-on to continue';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Select an add-on first';
        }
        return;
      }

      var totals = calcStandaloneSelectionTotals(pairs);
      var lines = pairs.map(function (pair) {
        var line = standaloneLineTotal(pair.addon, pair.state.dates, pair.state.persons);
        var dep = standaloneDepositAmount(pair.addon, line);
        var ready = addonReadyState(pair.addon, pair.state);
        var dateBit = pair.state.dates && pair.state.dates.length
          ? pair.state.dates.map(formatAddOnChipLabel).join(', ')
          : 'No date yet';
        return '<div class="cdp-sa-summary-item">' +
          '<div class="cdp-sa-summary-item-top">' +
            '<span class="cdp-sa-summary-item-name">' + (pair.addon.title || 'Add-on') + '</span>' +
            '<strong>' + symbol + moneyFmt(line) + '</strong>' +
          '</div>' +
          '<div class="cdp-sa-summary-item-meta">' + dateBit +
            (pair.state.slot ? ' · ' + formatSlotLabel(pair.state.slot) : '') +
            (isBundleAddOn(pair.addon) ? ' · ' + pair.state.persons + ' guest' + (pair.state.persons > 1 ? 's' : '') : '') +
            ' · Deposit ' + dep.percent + '% (' + symbol + moneyFmt(dep.amount) + ')' +
            ' · <em class="cdp-sa-status cdp-sa-status--' + ready.key + '">' + ready.label + '</em>' +
          '</div>' +
        '</div>';
      }).join('');

      var avgDepositPct = pairs.length === 1
        ? getAddonDepositPercent(pairs[0].addon)
        : (totals.total > 0 ? Math.round((totals.deposit / totals.total) * 100) : getAddonDepositPercent(pairs[0].addon));

      summary.innerHTML =
        '<div class="cdp-sa-summary-list">' + lines + '</div>' +
        '<div class="cdp-sa-summary-row"><span>Booking total</span><strong>' + symbol + moneyFmt(totals.total) + '</strong></div>' +
        '<div class="cdp-sa-summary-row cdp-sa-summary-row--deposit"><span>Deposit (' + avgDepositPct + '%)</span><strong>' + symbol + moneyFmt(totals.deposit) + '</strong></div>' +
        '<p class="cdp-sa-summary-note">Nothing is charged now. The vendor confirms availability first; the deposit and remaining balance are handled after that.</p>';

      if (footMeta) {
        footMeta.innerHTML = '<strong>' + n + ' add-on' + (n === 1 ? '' : 's') + '</strong>' +
          '<span>Deposit due: ' + symbol + moneyFmt(totals.deposit) + '</span>';
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Request Availability'; /* Trello 776 */
      }
    }

    function renderAddonBlock(addon) {
      var id = String(addon._id);
      var state = states[id];
      var multiDates = addonAllowsMultipleDates(addon);
      var ready = addonReadyState(addon, state);
      var lineTotal = standaloneLineTotal(addon, state.dates, state.persons);
      var dep = standaloneDepositAmount(addon, lineTotal);
      var depositPct = getAddonDepositPercent(addon);
      var desc = addon.description ? String(addon.description) : '';
      if (!saCalendarMonths[id]) {
        saCalendarMonths[id] = state.dates[0]
          ? state.dates[0].slice(0, 7)
          : nextAllowedDateForAddon(addon).slice(0, 7);
      }
      var selectedChips = state.dates.length
        ? '<div class="cdp-addon-dates"><span class="cdp-addon-dates-label">' + (multiDates ? 'Selected days' : 'Selected day') + '</span><div class="cdp-addon-date-chips">' +
          state.dates.map(function (d) {
            return '<button type="button" class="cdp-addon-date-chip is-active" data-sa-remove-date="' + id + '" data-date="' + d + '" aria-label="Remove ' + formatAddOnChipLabel(d) + '">' +
              formatAddOnChipLabel(d) + (multiDates ? ' ×' : '') + '</button>';
          }).join('') + '</div></div>'
        : '';
      var daysHint = Array.isArray(addon.availableDays) && addon.availableDays.length
        ? '<p class="cdp-standalone-hint">Available on: ' + addon.availableDays.map(function (d) { return d.charAt(0).toUpperCase() + d.slice(1); }).join(', ') + '</p>'
        : '';
      var slotsHtml = '';
      if (addonRequiresTimeSlot(addon)) {
        var saPrimaryDate = state.dates[0] || '';
        var saUniqueSlots = getUniqueAddonTimeSlots(addon);
        var saSelectedSlot = state.slot && state.slot.startTime ? state.slot : null;
        slotsHtml = (saSelectedSlot ? buildAddonSelectedSlotHtml(saSelectedSlot) : '') +
          '<div class="cdp-addon-slots"><span class="cdp-addon-slots-label">' +
          (saUniqueSlots.length > 1 ? 'Choose time slot' : 'Time slot') +
          '</span><div class="cdp-addon-slot-chips">' +
          saUniqueSlots.map(function (slot) {
            var active = state.slot && state.slot.startTime === slot.startTime && state.slot.endTime === slot.endTime;
            return buildAddonSlotChipHtml(addon, slot, { addonId: id, dateStr: saPrimaryDate, active: active, saSlot: true });
          }).join('') +
          '</div><div class="cdp-standalone-inline-error" data-sa-slot-error="' + id + '"></div></div>';
      }
      var guestsHtml = isBundleAddOn(addon)
        ? '<div class="cdp-addon-stepper"><span class="cdp-addon-stepper-label">Number of guests</span><div class="cdp-addon-stepper-controls">' +
            '<button type="button" class="cdp-addon-stepper-btn" data-sa-step="' + id + '" data-delta="-1" aria-label="Remove guest"' + (state.persons <= 1 ? ' disabled' : '') + '>−</button>' +
            '<span class="cdp-addon-guest-value" data-sa-guests="' + id + '">' + state.persons + '</span>' +
            '<button type="button" class="cdp-addon-stepper-btn" data-sa-step="' + id + '" data-delta="1" aria-label="Add guest">+</button>' +
          '</div><div class="cdp-standalone-inline-error" data-sa-guests-error="' + id + '"></div></div>'
        : '';
      var unit = Number(addon.price) || 0;
      var priceLabel = symbol + moneyFmt(unit) + (isBundleAddOn(addon) ? ' / person / day' : ' / day');
      var includeLabel = addonIncludeLabel(!!state.selected);
      var includeToggle = singleMode
        ? ''
        : '<label class="cdp-sa-include-toggle' + (state.selected ? ' is-included' : '') + '"><input type="checkbox" data-sa-toggle="' + id + '"' + (state.selected ? ' checked' : '') + '><span data-sa-include-label="' + id + '">' + includeLabel + '</span></label>';

      return '<div class="cdp-sa-addon-block' + (state.selected ? ' is-selected' : '') + '" data-sa-block="' + id + '">' +
        '<div class="cdp-sa-addon-card">' +
          renderSaAddonMedia(addon) +
          '<div class="cdp-sa-addon-body">' +
            '<div class="cdp-sa-addon-head">' +
              '<div class="cdp-sa-addon-head-text">' +
                '<p class="cdp-sa-addon-name">' + (addon.title || 'Add-on') +
                  '<span class="cdp-sa-deposit-badge">' + depositPct + '% deposit</span>' +
                  '<span class="cdp-sa-status cdp-sa-status--' + ready.key + '">' + ready.label + '</span>' +
                '</p>' +
                '<div class="cdp-sa-addon-price">' + priceLabel + '</div>' +
              '</div>' +
              includeToggle +
            '</div>' +
            (desc ? '<p class="cdp-sa-addon-desc">' + desc + '</p>' : '') +
          '</div>' +
        '</div>' +
        '<div class="cdp-sa-addon-options"' + (state.selected ? '' : ' hidden') + '>' +
          '<div class="cdp-sa-options-lead">Choose your booking date' + (multiDates ? 's' : '') + '</div>' +
          renderSaCalendarHtml(addon, state, saCalendarMonths[id]) +
          selectedChips +
          daysHint +
          '<div class="cdp-standalone-inline-error" data-sa-date-error="' + id + '"></div>' +
          slotsHtml +
          guestsHtml +
          '<div class="cdp-sa-addon-line">' +
            '<span>Subtotal · Deposit ' + dep.percent + '% (' + symbol + moneyFmt(dep.amount) + ')</span>' +
            '<strong>' + symbol + moneyFmt(lineTotal) + '</strong>' +
          '</div>' +
        '</div></div>';
    }

    function syncSaIncludeToggle(id) {
      var state = states[id];
      if (!state) return;
      var block = listEl.querySelector('[data-sa-block="' + id + '"]');
      if (!block) return;
      block.classList.toggle('is-selected', !!state.selected);
      var toggle = block.querySelector('.cdp-sa-include-toggle');
      if (toggle) {
        toggle.classList.toggle('is-included', !!state.selected);
        var label = toggle.querySelector('[data-sa-include-label="' + id + '"]') || toggle.querySelector('span');
        if (label) label.textContent = addonIncludeLabel(!!state.selected);
        var input = toggle.querySelector('[data-sa-toggle="' + id + '"]');
        if (input) input.checked = !!state.selected;
      }
      var opts = block.querySelector('.cdp-sa-addon-options');
      if (opts) opts.hidden = !state.selected;
    }

    function renderList() {
      listEl.innerHTML = catalog.map(renderAddonBlock).join('');
      refreshSummary();
    }

    function toggleSaDate(addon, state, dateStr) {
      var id = String(addon._id);
      var err = modal.querySelector('[data-sa-date-error="' + id + '"]');
      if (!dateStr) return;
      if (isAddonStandaloneDateFullyBooked(addon, dateStr)) {
        setInlineError(err, 'All time slots are fully booked on this date.');
        return;
      }
      if (isBeforeAddonFirstBookable(dateStr)) {
        setInlineError(err, 'This date is not available for booking yet.');
        return;
      }
      if (!isDateAllowedForAddon(addon, dateStr)) {
        setInlineError(err, 'That weekday is not available for this add-on.');
        return;
      }
      if (addonAllowsMultipleDates(addon)) {
        if (state.dates.indexOf(dateStr) === -1) state.dates = state.dates.concat(dateStr).sort();
        else state.dates = state.dates.filter(function (d) { return d !== dateStr; });
      } else if (state.dates[0] === dateStr) {
        state.dates = [];
      } else {
        state.dates = [dateStr];
      }
      saCalendarMonths[id] = dateStr.slice(0, 7);
      setInlineError(err, '');
      ensureStandaloneTimeSlotAuto(addon, state);
      renderList();
    }

    function addDateToAddon(id, dateStr) {
      var addon = getAddonById(id);
      var state = states[id];
      if (!addon || !state || !dateStr) return;
      toggleSaDate(addon, state, dateStr);
    }

    var previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function close() {
      document.removeEventListener('keydown', onStandaloneEsc);
      document.body.style.overflow = previousOverflow || '';
      if (typeof hideLoaderFull === 'function') hideLoaderFull();
      modal.remove();
    }

    function onStandaloneEsc(e) {
      if (e.key === 'Escape') close();
    }

    modal.querySelector('.cdp-standalone-close').onclick = close;
    modal.onclick = function (ev) {
      if (ev.target === modal) close();
    };
    document.addEventListener('keydown', onStandaloneEsc);

    listEl.addEventListener('change', function (ev) {
      var toggle = ev.target.closest('[data-sa-toggle]');
      if (toggle) {
        var id = toggle.getAttribute('data-sa-toggle');
        if (!states[id]) return;
        states[id].selected = !!toggle.checked;
        if (states[id].selected) ensureStandaloneTimeSlotAuto(getAddonById(id), states[id]);
        setInlineError(selectionErrorEl, '');
        syncSaIncludeToggle(id);
        refreshSummary();
      }
    });

    listEl.addEventListener('click', function (ev) {
      var galleryBtn = ev.target.closest('[data-sa-gallery]');
      if (galleryBtn) {
        ev.preventDefault();
        var gId = galleryBtn.getAttribute('data-sa-gallery');
        var gAddon = getAddonById(gId);
        if (gAddon && typeof window.openCdpAddonGallery === 'function') window.openCdpAddonGallery(gAddon);
        return;
      }
      var thumbBtn = ev.target.closest('.cdp-sa-addon-thumb');
      if (thumbBtn) {
        var src = thumbBtn.getAttribute('data-sa-thumb-src');
        var thumbType = thumbBtn.getAttribute('data-sa-thumb-type') || 'image';
        var block = thumbBtn.closest('[data-sa-block]');
        if (block && src) {
          block.querySelectorAll('.cdp-sa-addon-thumb').forEach(function (t) { t.classList.remove('is-active'); });
          thumbBtn.classList.add('is-active');
          var mainBtn = block.querySelector('.cdp-sa-addon-media[data-sa-gallery]');
          var mainMedia = block.querySelector('[data-sa-main-media]');
          if (mainBtn) {
            var addonId = mainBtn.getAttribute('data-sa-gallery') || '';
            if (thumbType === 'video') {
              mainBtn.classList.add('cdp-addon-media--video');
              mainBtn.innerHTML = '<video src="' + src + '" muted playsinline preload="metadata" data-sa-main-media="' + addonId + '" data-sa-media-type="video"></video>';
            } else {
              mainBtn.classList.remove('cdp-addon-media--video');
              mainBtn.innerHTML = '<img src="' + src + '" alt="" loading="lazy" data-sa-main-media="' + addonId + '" data-sa-media-type="image">';
            }
          } else if (mainMedia) {
            mainMedia.src = src;
          }
        }
        return;
      }
      var calPrev = ev.target.closest('[data-sa-cal-prev]');
      if (calPrev) {
        var prevId = calPrev.getAttribute('data-sa-cal-prev');
        saCalendarMonths[prevId] = shiftSaMonthKey(saCalendarMonths[prevId] || saMonthKeyFromDate(new Date()), -1);
        renderList();
        return;
      }
      var calNext = ev.target.closest('[data-sa-cal-next]');
      if (calNext) {
        var nextId = calNext.getAttribute('data-sa-cal-next');
        saCalendarMonths[nextId] = shiftSaMonthKey(saCalendarMonths[nextId] || saMonthKeyFromDate(new Date()), 1);
        renderList();
        return;
      }
      var calDay = ev.target.closest('[data-sa-cal-day]');
      if (calDay && !calDay.disabled) {
        var dayId = calDay.getAttribute('data-sa-cal-day');
        var dayDate = calDay.getAttribute('data-date');
        var dayAddon = getAddonById(dayId);
        if (dayAddon && states[dayId]) toggleSaDate(dayAddon, states[dayId], dayDate);
        return;
      }
      var removeBtn = ev.target.closest('[data-sa-remove-date]');
      if (removeBtn) {
        var remId = removeBtn.getAttribute('data-sa-remove-date');
        var remDate = removeBtn.getAttribute('data-date');
        var remAddon = getAddonById(remId);
        if (remAddon && states[remId] && addonAllowsMultipleDates(remAddon)) {
          states[remId].dates = states[remId].dates.filter(function (d) { return d !== remDate; });
          renderList();
        }
        return;
      }
      var slotBtn = ev.target.closest('[data-sa-slot]');
      if (slotBtn) {
        if (slotBtn.disabled || slotBtn.classList.contains('is-disabled')) return;
        var slotId = slotBtn.getAttribute('data-sa-slot');
        states[slotId].slot = { startTime: slotBtn.getAttribute('data-start'), endTime: slotBtn.getAttribute('data-end') };
        setInlineError(modal.querySelector('[data-sa-slot-error="' + slotId + '"]'), '');
        renderList();
        return;
      }
      var stepBtn = ev.target.closest('[data-sa-step]');
      if (stepBtn) {
        var stepId = stepBtn.getAttribute('data-sa-step');
        var delta = parseInt(stepBtn.getAttribute('data-delta'), 10) || 0;
        states[stepId].persons = Math.max(1, states[stepId].persons + delta);
        setInlineError(modal.querySelector('[data-sa-guests-error="' + stepId + '"]'), '');
        renderList();
      }
    });

    submitBtn.onclick = function () {
      setInlineError(selectionErrorEl, '');
      var pairs = selectedPairs();
      if (!pairs.length) {
        setInlineError(selectionErrorEl, 'Please include at least one add-on.');
        return;
      }
      var invalid = false;
      pairs.forEach(function (pair) {
        var id = String(pair.addon._id);
        if (!pair.state.dates.length) {
          setInlineError(modal.querySelector('[data-sa-date-error="' + id + '"]'), 'Please choose a booking date on the calendar.');
          invalid = true;
        }
        if (isBundleAddOn(pair.addon) && pair.state.persons < 1) {
          setInlineError(modal.querySelector('[data-sa-guests-error="' + id + '"]'), 'Please set the number of guests.');
          invalid = true;
        }
        if (addonRequiresTimeSlot(pair.addon) && !pair.state.slot) {
          setInlineError(modal.querySelector('[data-sa-slot-error="' + id + '"]'), 'Please choose a time slot.');
          invalid = true;
        }
        if (addonRequiresTimeSlot(pair.addon) && pair.state.slot && pair.state.dates.length) {
          var slotTaken = pair.state.dates.some(function (d) {
            return isAddonStandaloneSlotBooked(pair.addon, d, pair.state.slot);
          });
          if (slotTaken) {
            setInlineError(modal.querySelector('[data-sa-slot-error="' + id + '"]'),
              'The selected time slot is fully booked on your chosen date. Please pick another slot or date.');
            invalid = true;
          }
        }
        if (pair.state.dates.some(function (d) { return isAddonStandaloneDateFullyBooked(pair.addon, d); })) {
          setInlineError(modal.querySelector('[data-sa-date-error="' + id + '"]'),
            'All time slots are fully booked on one of your selected dates.');
          invalid = true;
        }
      });
      if (invalid) {
        setInlineError(selectionErrorEl, 'Finish the highlighted details for each included add-on.');
        var firstBad = modal.querySelector('.cdp-standalone-inline-error:not(:empty)');
        if (firstBad) scrollCdpToElement(firstBad.closest('.cdp-sa-addon-block') || firstBad, { block: 'center', focus: false });
        return;
      }

      var contact = getStandaloneContactFromStorage();
      var requestData = buildStandaloneRequestData(pairs, contact, addressContext);
      if (!requestData.billingAddress || !requestData.shippingAddress) {
        delete requestData._addressGatePassed;
      }
      window.requestData = requestData;
      close();
      function proceedStandaloneCheckout() {
        if (typeof window.bookVenueOrService === 'function') window.bookVenueOrService(requestData);
        else if (typeof window.submitStandaloneAddonReservation === 'function') window.submitStandaloneAddonReservation(requestData);
        else submitStandaloneAddonReservation(requestData);
      }
      var needsAddress = !requestData._addressGatePassed || !requestData.billingAddress || !requestData.shippingAddress;
      if (needsAddress && typeof window.ensureAddressBeforeReservation === 'function') {
        window.ensureAddressBeforeReservation(requestData, function () {
          requestData._addressGatePassed = true;
          window.requestData = requestData;
          proceedStandaloneCheckout();
        });
        return;
      }
      proceedStandaloneCheckout();
    };

    renderList();
  }

  function submitStandaloneAddonReservation(requestData) {
    if (!requestData || !requestData._standaloneAddon) return;
    var contactPhone = (requestData._standaloneContact && requestData._standaloneContact.phone) || localStorage.getItem('customerPhone');
    var billing = normalizeStandaloneBillingAddress(
      requestData.billingAddress || (window._standaloneAddressContext && window._standaloneAddressContext.billingAddress),
      contactPhone
    );
    var venueShip = null;
    try {
      var pd = window.productDetails || {};
      var vl = pd.venueLocation || pd.location || null;
      if (vl && (vl.address || vl.address1)) {
        venueShip = {
          address1: vl.address || vl.address1 || '',
          city: vl.city || '',
          country: vl.country || '',
          province: vl.province || vl.region || '',
          zip: vl.zip || ''
        };
      }
    } catch (e) {}
    if ((!requestData.shippingAddress || !requestData.shippingAddress.address1) && venueShip) {
      requestData.shippingAddress = venueShip;
    }
    var shipping = normalizeStandaloneShippingAddress(
      requestData.shippingAddress || venueShip || (window._standaloneAddressContext && window._standaloneAddressContext.shippingAddress),
      contactPhone
    );
    if (!billing || !shipping) {
      delete requestData._addressGatePassed;
      window.requestData = requestData;
      if (typeof window.ensureAddressBeforeReservation === 'function') {
        window.ensureAddressBeforeReservation(requestData, function () {
          requestData._addressGatePassed = true;
          submitStandaloneAddonReservation(requestData);
        });
        return;
      }
      notify('Shipping and billing addresses are required for standalone add-on bookings.', 'error');
      return;
    }
    requestData.billingAddress = billing;
    requestData.shippingAddress = shipping;
    requestData._addressGatePassed = true;

    var authToken = localStorage.getItem('authToken') || '';
    var customerId = localStorage.getItem('customerId') || '';
    var contact = requestData._standaloneContact || {};
    var firstName = contact.firstName || localStorage.getItem('customerFirstName') || '';
    var lastName = contact.lastName || localStorage.getItem('customerLastName') || '';
    var email = contact.email || localStorage.getItem('customerEmail') || '';
    var phone = contact.phone || localStorage.getItem('customerPhone') || '';
    if (email) localStorage.setItem('customerEmail', email);
    if (firstName) localStorage.setItem('customerFirstName', firstName);
    if (lastName) localStorage.setItem('customerLastName', lastName);
    if (phone) localStorage.setItem('customerPhone', phone);

    /* 2026-10-30 vendor-confirmation: standalone add-ons are sent for vendor confirmation instead of reserving directly */
    if (typeof window.ejunoSendVendorConfirmation === 'function') {
      var ids0 = getStandaloneProductIds();
      requestData.kind = 'standalone_addon';
      if (!requestData.shopifyProductId) requestData.shopifyProductId = ids0.shopifyProductId;
      if (!requestData.variantId) requestData.variantId = ids0.variantId;
      window.ejunoSendVendorConfirmation(requestData);
      return;
    }
    var payload = buildStandaloneApiPayload(requestData);
    var url = apiOrigin() + '/api/reservations/standalone-addon';
    var body = ensureSelectedAddOnsApiKey(payload);

    if (typeof showLoaderFull === 'function') showLoaderFull();
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken.indexOf('Bearer ') === 0 ? authToken : 'Bearer ' + authToken
      },
      body: JSON.stringify(body)
    })
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok) throw new Error((data && data.message) || 'Unable to create standalone add-on reservation.');
          return data;
        });
      })
      .then(function (data) {
        if (!data || !data.data) throw new Error('Invalid response from server. Please try again.');
        var bookingId = data.data._id;
        var bookingData = data.data;
        var weddingRefId = normalizeWeddingId(bookingData.weddingRefId);
        var weddingInternalId = normalizeWeddingId(bookingData.weddingId);
        var weddingIdForDisplay = weddingRefId || weddingInternalId || resolveStandaloneWeddingId(bookingData);
        rememberWeddingId(weddingRefId || weddingIdForDisplay);
        var paymentIntentBody = {
          reservationId: bookingId,
          customerId: customerId,
          payerEmail: email,
          payerName: (firstName + ' ' + lastName).trim(),
          type: 'reservation'
        };
        if (weddingInternalId) paymentIntentBody.weddingId = weddingInternalId;
        else if (weddingRefId) paymentIntentBody.weddingId = weddingRefId;
        return fetch(apiOrigin() + '/api/payments/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken.indexOf('Bearer ') === 0 ? authToken : 'Bearer ' + authToken
          },
          body: JSON.stringify(paymentIntentBody)
        }).then(function (res) { return res.json(); }).then(function (paymentResponse) {
          var clientSecret = paymentResponse && paymentResponse.data && paymentResponse.data.clientSecret;
          if (!clientSecret || typeof initStripePaymentModal !== 'function') {
            notify('Payment could not be started. Please try again.', 'error');
            return;
          }
          initStripePaymentModal({
            clientSecret: clientSecret,
            prefill: { firstName: firstName, lastName: lastName, email: email },
            submitLabel: 'Pay ' + (requestData._standaloneDepositLabel || ''),
            hideSummary: false,
            standaloneRequestData: requestData,
            onSuccess: function () {
              if (typeof showPaymentSuccessPopup === 'function') {
                showPaymentSuccessPopup({
                  venueName: requestData._standaloneAddonTitle || (bookingData && bookingData.venueName) || (addonTitleFromPayload(payload)) || 'Add-on',
                  amount: requestData._standaloneDepositLabel || 'N/A',
                  initialDepositDisplay: requestData._standaloneInitialDepositDisplay || null,
                  currency: typeof getSelectedCurrency === 'function' ? getSelectedCurrency() : 'USD',
                  bookingId: bookingId || 'N/A',
                  orderId: resolveBookingOrderId(bookingData, paymentResponse) || bookingData.orderRefId || bookingId,
                  weddingRefId: weddingRefId || weddingIdForDisplay,
                  weddingId: weddingRefId || weddingIdForDisplay,
                  Bdate: ((bookingData.selectedStandaloneAddons || bookingData.selectedAddOns || bookingData.selectedAddons) && (bookingData.selectedStandaloneAddons || bookingData.selectedAddOns || bookingData.selectedAddons)[0] && ((bookingData.selectedStandaloneAddons || bookingData.selectedAddOns || bookingData.selectedAddons)[0].datesOfBooking && (bookingData.selectedStandaloneAddons || bookingData.selectedAddOns || bookingData.selectedAddons)[0].datesOfBooking[0])) || bookingData.date,
                  paymentDate: new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }),
                  date: ((bookingData.selectedStandaloneAddons || bookingData.selectedAddOns || bookingData.selectedAddons) && (bookingData.selectedStandaloneAddons || bookingData.selectedAddOns || bookingData.selectedAddons)[0] && ((bookingData.selectedStandaloneAddons || bookingData.selectedAddOns || bookingData.selectedAddons)[0].datesOfBooking && (bookingData.selectedStandaloneAddons || bookingData.selectedAddOns || bookingData.selectedAddons)[0].datesOfBooking[0])) || bookingData.date
                });
              } else {
                notify('Payment successful.', 'success');
              }
            }
          });
        });
      })
      .catch(function (err) {
        if (typeof hideLoaderFull === 'function') hideLoaderFull();
        notify(err.message || 'Standalone booking failed.', 'error');
      });
  }

  function renderStandalonePaymentSummary(requestData) {
    var summaryContainer = document.getElementById('payment-summary');
    if (!summaryContainer || !requestData) return;
    var items = getSelectedAddonsFromData(requestData);
    var total = Number(requestData.addOnsTotal) || 0;
    var depositAmount = 0;
    var lines = [];
    var formatAmount = function (amount) { return curSym() + moneyFmt(amount); };

    items.forEach(function (item) {
      var addon = getAddonById(item.addonId);
      if (!addon) return;
      var dates = item.datesOfBooking || [];
      var persons = item.noOfPersons || 1;
      var lineTotal = standaloneLineTotal(addon, dates, persons);
      if (!total) total += lineTotal;
      depositAmount += standaloneDepositAmount(addon, lineTotal).amount;
      var unit = Number(addon.price) || 0;
      var days = dates.length || 1;
      var title = addon.title || 'Add-on';
      if (isBundleAddOn(addon)) {
        lines.push(title + ': ' + formatAmount(unit) + ' × ' + persons + ' guest' + (persons > 1 ? 's' : '') + ' × ' + days + ' day' + (days > 1 ? 's' : '') + ' = ' + formatAmount(lineTotal));
      } else {
        lines.push(title + ': ' + formatAmount(unit) + ' × ' + days + ' day' + (days > 1 ? 's' : '') + ' = ' + formatAmount(lineTotal));
      }
    });

    if (!depositAmount && total) {
      var firstAddon = getAddonById(requestData.addonId || (items[0] && items[0].addonId));
      depositAmount = standaloneDepositAmount(firstAddon || {}, total).amount;
    }
    var remainingAmount = Math.max(0, total - depositAmount);

    var totalPriceEl = document.getElementById('summary-total-price');
    var payingNowEl = document.getElementById('summary-paying-now');
    var remainingAmountEl = document.getElementById('summary-remaining-amount');
    var pricePerNightRow = document.getElementById('summary-price-per-night-row');
    var addOnsRow = document.getElementById('summary-addons-row');
    var addOnsAmountEl = document.getElementById('summary-addons-amount');
    var addOnsInfo = document.getElementById('summary-addons-info');
    var nightsInfo = document.getElementById('summary-nights-info');
    var depositInfo = document.getElementById('summary-deposit-info');
    var installmentInfo = document.getElementById('summary-installment-info');
    var summaryTitle = summaryContainer.querySelector('h3');
    var summarySubtitle = summaryContainer.querySelector('h4');

    if (summaryTitle) summaryTitle.textContent = 'Complete your payment';
    if (summarySubtitle) summarySubtitle.textContent = items.length > 1 ? 'Standalone add-ons summary' : 'Standalone add-on summary';
    if (totalPriceEl) totalPriceEl.textContent = formatAmount(total);
    if (payingNowEl) payingNowEl.textContent = formatAmount(depositAmount);
    if (remainingAmountEl) remainingAmountEl.textContent = formatAmount(remainingAmount);
    if (pricePerNightRow) pricePerNightRow.style.display = 'none';
    if (addOnsRow && addOnsAmountEl) {
      addOnsRow.style.display = 'flex';
      addOnsRow.firstElementChild.textContent = items.length > 1 ? 'Add-ons total:' : 'Add-on total:';
      addOnsAmountEl.textContent = formatAmount(total);
    }
    if (addOnsInfo) addOnsInfo.textContent = lines.length ? ('\u2022 ' + lines.join('\n\u2022 ')) : '';
    if (nightsInfo) {
      var bits = items.map(function (item) {
        var addon = getAddonById(item.addonId);
        var label = (addon && addon.title) || 'Add-on';
        var dates = item.datesOfBooking || [];
        var part = label + ': ' + (dates.length ? dates.map(formatAddOnChipLabel).join(', ') : '\u2014');
        if (item.timeSlot && item.timeSlot.startTime) part += ' · ' + formatSlotLabel(item.timeSlot);
        return part;
      });
      nightsInfo.textContent = bits.join(' | ');
    }
    if (depositInfo) depositInfo.textContent = 'Initial deposit due now: ' + formatAmount(depositAmount);
    if (installmentInfo) installmentInfo.textContent = 'Remaining balance due before your event.';
    summaryContainer.style.display = 'block';
    summaryContainer.classList.add('cdp-standalone-payment-summary');
  }

  function addonTitleFromPayload(payload) {
    try {
      var items = (payload && (payload.selectedAddOns || payload.selectedAddons)) || [];
      if (!items.length) return '';
      if (items.length === 1) {
        var one = getAddonById(items[0].addonId);
        return one && one.title;
      }
      return items.length + ' add-ons';
    } catch (e) { return ''; }
  }

  window.getAddonById = getAddonById;
  window.resolveSelectedVariant = resolveSelectedVariant;
  window.renderVariantAddOns = renderVariantAddOns;
  window.getSlotRemainingCapacity = getSlotRemainingCapacity;
  window.isDateFullyBookedForAddon = isDateFullyBookedForAddon;
  window.refreshAddonStandaloneButtons = refreshAddonStandaloneButtons;
  window.resetVenueAddOnSelections = resetVenueAddOnSelections;
  window.getSelectedAddOns = getSelectedAddOns;
  window.getSelectedAddOnsTotal = getSelectedAddOnsTotal;
  window.getAddOnBillingDays = getAddOnBillingDays;
  window.buildSelectedAddonsPayload = buildSelectedAddonsPayload;
  window.attachSelectedAddonsToRequest = attachSelectedAddonsToRequest;
  window.ensureSelectedAddOnsApiKey = ensureSelectedAddOnsApiKey;
  window.validateSelectedBundleAddOns = validateSelectedBundleAddOns;
  window.collectAddonValidationMessages = collectAddonValidationMessages;
  window.showAddonValidationErrors = showAddonValidationErrors;
  window.scrollCdpToElement = scrollCdpToElement;
  window.showCdpInlineFieldError = showCdpInlineFieldError;
  window.clearCdpFieldHighlight = clearCdpFieldHighlight;
  window.focusAddonValidationIssue = focusAddonValidationIssue;
  window.showVenueValidationMessage = showVenueValidationMessage;
  window.showAddonsValidationMessage = showAddonsValidationMessage;
  window.clearVenueValidationMessage = clearVenueValidationMessage;
  window.clearAddonsValidationMessage = clearAddonsValidationMessage;
  window.venueDatesReadyForAddons = venueDatesReadyForAddons;
  window.getAddOnPersons = getAddOnPersons;
  window.openStandaloneAddonModal = openStandaloneAddonModal;
  window.startStandaloneAddonFlow = startStandaloneAddonFlow;
  window.renderStandalonePaymentSummary = renderStandalonePaymentSummary;
  window.submitStandaloneAddonReservation = submitStandaloneAddonReservation;
})();
