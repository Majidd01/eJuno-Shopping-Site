/* eJuno Production Patches v3 - Trello #818 + #822
   RAW Source: MAIN 193676542245
   - Size: 251,020 bytes  
   - SHA256: 86a8ce251ba94a53d26c8dec256749bd7479a34dc9db61db8e51a4b480778442
   
   CRITICAL FIXES from v2:
   1. Address gate runs BEFORE payload serialization (v2 ran after - too late)
   2. calculatedPrice added to payload (original confirmBundleGuest omits it)
   3. Cancel returns no-op response (v2 rejected causing error toast)
   
   APPROACH: Fetch interception with payload modification
   - Original handler runs unchanged (sets capacity, serializes)
   - Intercept fetch, parse body, add missing fields
   - Run deferred address gate, wait for completion
   - Add address fields + calculatedPrice to parsed body
   - Show review modal
   - On Send: call original fetch with corrected body
   - On Cancel: return no-op response, restore UI, allow retry
*/
(function(){
  'use strict';
  
  var LABELS = { confirmGuests: 'Confirm guests', confirming: 'Confirming...' };
  var RAW_SOURCE_HASH = '86a8ce251ba94a53d26c8dec256749bd7479a34dc9db61db8e51a4b480778442';
  var RAW_SOURCE_SIZE = 251020;
  
  /* State */
  var reviewModalOpen = false;
  var pendingResolve = null;
  var testLog = []; /* For testing */
  
  /* ========== Utilities ========== */
  function num(x) {
    if (x == null || x === '') return NaN;
    if (typeof x === 'number') return x;
    var t = String(x).replace(/[^\d.,-]/g, '');
    if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
    else t = t.replace(/,/g, '');
    return parseFloat(t);
  }
  
  function getCurrSym() {
    try { if (typeof getCurrencySymbol === 'function') return getCurrencySymbol() || '€'; } catch(e) {}
    return '€';
  }
  
  function money(n) {
    n = Math.round((Number(n) || 0) * 100) / 100;
    var whole = Math.abs(n % 1) < 0.005;
    return getCurrSym() + n.toLocaleString('de-DE', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 });
  }
  
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  
  function fmtDate(d) {
    if (!d) return '';
    var x = new Date(String(d).slice(0,10) + 'T00:00:00');
    return isNaN(x) ? String(d) : x.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
  }
  
  /* ========== #822: Calculate breakdown ========== */
  function calculateBreakdown(body, pd) {
    pd = pd || window.productDetails || {};
    var guests = Number(body.capacity || body.noOfGuests || body.numberOfGuests || 0);
    var vid = String(body.variantId || '');
    var variants = pd.variants || [];
    var v = variants.find(function(x) { return String(x.variantId) === vid || String(x.id) === vid; }) || variants[0] || null;
    var unitPrice = v ? num(v.price) : 0;
    
    var isBundle = pd.priceType === 'bundle';
    var baseTotal = (guests > 0 && isBundle) ? unitPrice * guests : unitPrice;
    
    /* Add-ons from requestData or global function */
    var addOnsTotal = 0;
    if (body.selectedAddons && Array.isArray(body.selectedAddons)) {
      body.selectedAddons.forEach(function(addon) {
        var p = num(addon.price) || 0;
        var d = Number(addon.numberOfDays) || 1;
        var n = Number(addon.noOfPersons) || 1;
        addOnsTotal += p * d * n;
      });
    }
    if (addOnsTotal === 0) {
      try { if (typeof getSelectedAddOnsTotal === 'function') addOnsTotal = getSelectedAddOnsTotal(pd) || 0; } catch(e) {}
    }
    
    var total = baseTotal + addOnsTotal;
    
    /* Deposit from paymentPolicy - default 30% */
    var depPct = 30;
    if (pd.paymentPolicy && pd.paymentPolicy.depositPercentage != null) {
      depPct = Number(pd.paymentPolicy.depositPercentage);
    }
    var deposit = Math.round(total * depPct) / 100;
    var balance = Math.round((total - deposit) * 100) / 100;
    
    return {
      guests: guests,
      unitPrice: unitPrice,
      isBundle: isBundle,
      baseTotal: baseTotal,
      addOnsTotal: addOnsTotal,
      total: total,
      calculatedPrice: total,
      depositPct: depPct,
      deposit: deposit,
      balance: balance,
      date: body.date || body.checkInDate || ''
    };
  }
  
  /* ========== #822: Review Modal ========== */
  function injectStyles() {
    if (document.getElementById('ejuno-pr-styles')) return;
    var s = document.createElement('style');
    s.id = 'ejuno-pr-styles';
    s.textContent = '.ejuno-pr-overlay{position:fixed;inset:0;background:rgba(17,17,17,.55);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:100000;padding:16px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}' +
      '.ejuno-pr-dialog{background:#fff;border-radius:16px;max-width:520px;width:100%;max-height:90vh;overflow:auto;position:relative;box-shadow:0 20px 60px rgba(0,0,0,.2);padding:24px 28px 28px}' +
      '.ejuno-pr-close{position:absolute;top:12px;right:12px;width:32px;height:32px;border:none;background:transparent;font-size:24px;cursor:pointer;color:#666}.ejuno-pr-close:hover{color:#000}' +
      '.ejuno-pr-title{margin:0 0 20px;font-size:20px;font-weight:600;color:#201c19}' +
      '.ejuno-pr-summary{display:flex;gap:24px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #e5e0db}' +
      '.ejuno-pr-section{flex:1}.ejuno-pr-label{font-size:12px;color:#7a7068;margin-bottom:4px}.ejuno-pr-value{font-size:15px;font-weight:500;color:#201c19}' +
      '.ejuno-pr-breakdown{margin-bottom:16px}.ejuno-pr-breakdown-title{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#201c19;margin-bottom:12px}' +
      '.ejuno-pr-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;font-size:14px;color:#5a524b}.ejuno-pr-row strong{font-weight:600;color:#201c19}' +
      '.ejuno-pr-total{border-top:2px solid #b9aa9b;margin-top:8px;padding-top:12px;font-size:15px}.ejuno-pr-total span,.ejuno-pr-total strong{color:#201c19;font-weight:600}' +
      '.ejuno-pr-note{margin:12px 0 0;font-size:13px;color:#7a7068;line-height:1.5}' +
      '.ejuno-pr-actions{display:flex;gap:12px;margin-top:20px}' +
      '.ejuno-pr-back{flex:0 0 auto;padding:12px 18px;border:1px solid #7a3f52;border-radius:999px;background:#fff;color:#7a3f52;font-size:15px;font-weight:600;cursor:pointer}.ejuno-pr-back:hover{background:#f6eef1}' +
      '.ejuno-pr-send{flex:1;padding:12px 18px;border:none;border-radius:999px;background:#7a3f52;color:#fff;font-size:15px;font-weight:600;cursor:pointer}.ejuno-pr-send:hover{background:#5e3040}' +
      '@media(max-width:500px){.ejuno-pr-actions{flex-direction:column-reverse}.ejuno-pr-back,.ejuno-pr-send{width:100%}}';
    document.head.appendChild(s);
  }
  
  function showReviewModal(breakdown, onSend, onCancel) {
    if (reviewModalOpen) return;
    reviewModalOpen = true;
    testLog.push({ event: 'reviewModalOpened', breakdown: breakdown });
    
    var b = breakdown;
    var pd = window.productDetails || {};
    var name = pd.title || (document.querySelector('h1') ? document.querySelector('h1').textContent.trim() : 'Service');
    
    var priceRows = '';
    if (b.guests > 0 && b.isBundle) {
      priceRows += '<div class="ejuno-pr-row"><span>' + esc(name) + '</span><span>' + money(b.unitPrice) + ' × ' + b.guests + ' guests</span><strong>' + money(b.baseTotal) + '</strong></div>';
    } else {
      priceRows += '<div class="ejuno-pr-row"><span>' + esc(name) + '</span><strong>' + money(b.baseTotal) + '</strong></div>';
    }
    if (b.addOnsTotal > 0) {
      priceRows += '<div class="ejuno-pr-row"><span>Add-ons</span><strong>' + money(b.addOnsTotal) + '</strong></div>';
    }
    
    var html = '<div class="ejuno-pr-summary">' +
      '<div class="ejuno-pr-section"><div class="ejuno-pr-label">Date</div><div class="ejuno-pr-value">' + fmtDate(b.date) + '</div></div>' +
      (b.guests > 0 ? '<div class="ejuno-pr-section"><div class="ejuno-pr-label">Guests</div><div class="ejuno-pr-value">' + b.guests + '</div></div>' : '') +
      '</div><div class="ejuno-pr-breakdown"><div class="ejuno-pr-breakdown-title">Payment breakdown</div>' + priceRows +
      '<div class="ejuno-pr-row ejuno-pr-total"><span>Total payable</span><strong>' + money(b.total) + '</strong></div>' +
      '<div class="ejuno-pr-row"><span>Initial deposit (' + b.depositPct + '%)</span><strong>' + money(b.deposit) + '</strong></div>' +
      '<div class="ejuno-pr-row"><span>Balance (final payment)</span><strong>' + money(b.balance) + '</strong></div>' +
      '</div><p class="ejuno-pr-note">Nothing is charged now. The vendor confirms availability first, then you pay the initial deposit.</p>';
    
    var m = document.createElement('div');
    m.id = 'ejuno-pr-modal';
    m.className = 'ejuno-pr-overlay';
    m.innerHTML = '<div class="ejuno-pr-dialog" role="dialog" aria-modal="true"><button type="button" class="ejuno-pr-close" aria-label="Close">&times;</button>' +
      '<h2 class="ejuno-pr-title">Review &amp; send request</h2>' + html +
      '<div class="ejuno-pr-actions"><button type="button" class="ejuno-pr-back">&#8592; Back to edit</button><button type="button" class="ejuno-pr-send">Send Request</button></div></div>';
    
    function close() { reviewModalOpen = false; if (m.parentNode) m.remove(); }
    var done = false;
    
    function doCancel() {
      if (done) return;
      done = true;
      close();
      testLog.push({ event: 'reviewCancelled' });
      onCancel();
    }
    function doSend() {
      if (done) return;
      done = true;
      close();
      testLog.push({ event: 'reviewConfirmed' });
      onSend();
    }
    
    m.addEventListener('click', function(e) {
      if (e.target.closest('.ejuno-pr-send')) { doSend(); return; }
      if (e.target === m || e.target.closest('.ejuno-pr-close, .ejuno-pr-back')) { doCancel(); return; }
    });
    function onKey(e) { if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); doCancel(); } }
    document.addEventListener('keydown', onKey);
    
    document.body.appendChild(m);
    var sendBtn = m.querySelector('.ejuno-pr-send');
    if (sendBtn) sendBtn.focus();
  }
  
  /* ========== Restore UI on cancel ========== */
  function restoreConfirmButton() {
    var btn = document.getElementById('confirmBundleGuest');
    if (btn) {
      btn.disabled = false;
      btn.textContent = LABELS.confirmGuests;
      btn.style.opacity = '1';
    }
    if (typeof hideLoaderFull === 'function') hideLoaderFull();
  }
  
  /* ========== #818: Address Gate Wrapping ========== */
  var origAddressGate = null;
  var currentRequestData = null;
  
  function hookAddressGate() {
    if (typeof window.ensureAddressBeforeReservation !== 'function') return false;
    origAddressGate = window.ensureAddressBeforeReservation;
    
    window.ensureAddressBeforeReservation = function(requestData, onReady) {
      currentRequestData = requestData;
      var pd = window.productDetails;
      
      /* #818: Short-circuit on bundle entry to show guest popup first */
      if (pd && pd.priceType === 'bundle' && requestData && !requestData._818_guestConfirmed) {
        requestData._818_needsAddressGate = true;
        requestData._addressGatePassed = true; /* Lie to let code continue to guest popup */
        testLog.push({ event: 'addressGateDeferred' });
        if (typeof onReady === 'function') onReady();
        return;
      }
      
      testLog.push({ event: 'addressGateCalled' });
      return origAddressGate.call(this, requestData, onReady);
    };
    return true;
  }
  
  /* Run the real address gate and wait for completion */
  function runDeferredAddressGate(requestData) {
    return new Promise(function(resolve) {
      if (!requestData._818_needsAddressGate || !origAddressGate) {
        resolve();
        return;
      }
      
      delete requestData._818_needsAddressGate;
      requestData._818_guestConfirmed = true;
      requestData._addressGatePassed = false;
      
      testLog.push({ event: 'addressGateExecuting' });
      origAddressGate(requestData, function() {
        requestData._addressGatePassed = true;
        testLog.push({ event: 'addressGateCompleted', hasAddress: !!requestData.billingAddress });
        resolve();
      });
    });
  }
  
  /* ========== Fetch Interception ========== */
  var originalFetch = window.fetch;
  var intercepting = true;
  
  window.fetch = function(url, options) {
    var urlStr = String(url);
    
    /* Only intercept /reservations POST for bundle bookings */
    if (!intercepting || !urlStr.includes('/reservations') || urlStr.includes('/reservations/') ||
        !options || options.method !== 'POST') {
      return originalFetch.apply(this, arguments);
    }
    
    /* Parse body */
    var body;
    try { body = JSON.parse(options.body); } catch(e) { return originalFetch.apply(this, arguments); }
    
    /* Only intercept bundle bookings with capacity */
    var pd = window.productDetails || {};
    if (pd.priceType !== 'bundle' || !body.capacity) {
      return originalFetch.apply(this, arguments);
    }
    
    testLog.push({ event: 'fetchIntercepted', originalBody: JSON.parse(JSON.stringify(body)) });
    
    var fetchThis = this;
    var fetchUrl = url;
    var fetchHeaders = options.headers;
    
    return new Promise(function(resolve, reject) {
      /* Step 1: Run deferred address gate if needed */
      var rd = currentRequestData || {};
      var needsAddressGate = rd._818_needsAddressGate;
      
      function afterAddressGate() {
        /* Step 2: Merge address fields from requestData into body */
        if (rd.billingAddress) body.billingAddress = rd.billingAddress;
        if (rd.shippingAddress) body.shippingAddress = rd.shippingAddress;
        
        /* Step 3: Calculate and add calculatedPrice */
        var breakdown = calculateBreakdown(body, pd);
        body.calculatedPrice = breakdown.calculatedPrice;
        if (breakdown.unitPrice) body.basePrice = breakdown.unitPrice;
        
        testLog.push({ event: 'payloadCorrected', body: JSON.parse(JSON.stringify(body)), breakdown: breakdown });
        
        /* Step 4: Hide loader, show review modal */
        if (typeof hideLoaderFull === 'function') hideLoaderFull();
        
        showReviewModal(breakdown,
          function onSend() {
            /* User confirmed - call original fetch with corrected body */
            testLog.push({ event: 'fetchExecuted', finalBody: JSON.parse(JSON.stringify(body)) });
            if (typeof showLoaderFull === 'function') showLoaderFull();
            
            var correctedOptions = {
              method: 'POST',
              headers: fetchHeaders,
              body: JSON.stringify(body)
            };
            originalFetch.call(fetchThis, fetchUrl, correctedOptions).then(resolve).catch(reject);
          },
          function onCancel() {
            /* User cancelled - restore UI, return no-op response */
            restoreConfirmButton();
            testLog.push({ event: 'fetchCancelled' });
            
            /* Return fake response that doesn't trigger payment flow */
            /* Original code checks: if (data && data.data) - we return null data */
            resolve({
              ok: true,
              json: function() { return Promise.resolve({ status: false, data: null, _cancelled: true }); }
            });
          }
        );
      }
      
      if (needsAddressGate) {
        runDeferredAddressGate(rd).then(afterAddressGate);
      } else {
        afterAddressGate();
      }
    });
  };
  
  /* ========== CTA Label Patching ========== */
  function hookBundleGuestModal() {
    var obs = new MutationObserver(function(muts) {
      muts.forEach(function(m) {
        m.addedNodes.forEach(function(n) {
          if (n.nodeType !== 1) return;
          var modal = n.classList && n.classList.contains('bundle-guest-modal') ? n :
                     (n.querySelector ? n.querySelector('.bundle-guest-modal') : null);
          if (!modal) return;
          var btn = modal.querySelector('#confirmBundleGuest, .bundle-guest-modal__confirm');
          if (btn && /Confirm\s*&\s*Book/i.test(btn.textContent)) {
            btn.textContent = LABELS.confirmGuests;
          }
        });
      });
    });
    if (document.body) obs.observe(document.body, { childList: true, subtree: true });
  }
  
  function patchLoadingText() {
    var origSet = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'textContent');
    if (!origSet || !origSet.set) return;
    Object.defineProperty(HTMLElement.prototype, 'textContent', {
      set: function(v) {
        if (this.id === 'confirmBundleGuest' || this.classList.contains('bundle-guest-modal__confirm')) {
          if (v === 'Booking...') v = LABELS.confirming;
          else if (v === 'Confirm & Book') v = LABELS.confirmGuests;
        }
        return origSet.set.call(this, v);
      },
      get: origSet.get,
      configurable: true
    });
  }
  
  /* ========== Initialize ========== */
  function init() {
    injectStyles();
    hookAddressGate();
    hookBundleGuestModal();
    patchLoadingText();
    testLog.push({ event: 'initialized' });
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  /* Export for testing */
  window._ejunoProd818822 = {
    version: '3.0.0',
    rawSourceHash: RAW_SOURCE_HASH,
    rawSourceSize: RAW_SOURCE_SIZE,
    labels: LABELS,
    calculateBreakdown: calculateBreakdown,
    _testing: {
      getLog: function() { return testLog; },
      clearLog: function() { testLog = []; },
      setIntercepting: function(v) { intercepting = !!v; },
      getOriginalFetch: function() { return originalFetch; },
      getCurrentRequestData: function() { return currentRequestData; },
      setCurrentRequestData: function(rd) { currentRequestData = rd; },
      runDeferredAddressGate: runDeferredAddressGate,
      restoreConfirmButton: restoreConfirmButton
    }
  };
})();
