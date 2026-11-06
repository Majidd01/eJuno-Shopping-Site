/**
 * Production #818 + #822 Patch v4
 * 
 * REQUIRES SOURCE TRANSFORM - see SOURCE-PATCH.diff
 * This helper alone is insufficient; the source must be patched to check _818_cancelled.
 * 
 * Source Guard (RAW):
 *   Size: 251,020 bytes
 *   SHA256: 86a8ce251ba94a53d26c8dec256749bd7479a34dc9db61db8e51a4b480778442
 */
(function() {
  'use strict';
  
  var RAW_SOURCE_SIZE = 251020;
  var RAW_SOURCE_HASH = '86a8ce251ba94a53d26c8dec256749bd7479a34dc9db61db8e51a4b480778442';
  
  var testLog = [];
  function log(msg) { testLog.push({ ts: Date.now(), msg: msg }); }
  
  var originalFetch = window.fetch;
  var addressGateRunCount = 0;
  
  function getProductDetails() {
    return window.productDetails || null;
  }
  
  function getRequestData() {
    return window.requestData || null;
  }
  
  function calculateBreakdown(body, pd) {
    pd = pd || {};
    var guests = Number(body.capacity || 0);
    var vid = String(body.variantId || '');
    var variants = pd.variants || [];
    var v = variants.find(function(x) { return String(x.variantId) === vid || String(x.id) === vid; }) || variants[0] || null;
    var unitPrice = v ? Number(v.price) || 0 : 0;
    
    var isBundle = pd.priceType === 'bundle';
    var baseTotal = (guests > 0 && isBundle) ? unitPrice * guests : unitPrice;
    
    var addOnsTotal = 0;
    if (body.selectedAddons && Array.isArray(body.selectedAddons)) {
      body.selectedAddons.forEach(function(addon) {
        var p = Number(addon.price) || 0;
        var d = Number(addon.numberOfDays) || 1;
        var n = Number(addon.noOfPersons) || 1;
        addOnsTotal += p * d * n;
      });
    }
    
    var total = baseTotal + addOnsTotal;
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
      balance: balance
    };
  }
  
  function formatCurrency(n) {
    var curr = (typeof getSelectedCurrency === 'function' ? getSelectedCurrency() : null) || 'EUR';
    var sym = { EUR: '€', USD: '$', GBP: '£' }[curr] || curr + ' ';
    return sym + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  
  function restoreConfirmButton() {
    var confirmBtn = document.getElementById('confirmBtn') || document.querySelector('.confirm-booking-btn');
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Request availability';
      confirmBtn.style.opacity = '1';
    }
    if (typeof hideLoaderFull === 'function') hideLoaderFull();
    window._ejuno818Restoring = false;
    log('restoreConfirmButton: done');
  }
  
  function showReviewModal(breakdown, onSend, onCancel) {
    log('showReviewModal: total=' + breakdown.total + ' deposit=' + breakdown.deposit);
    
    var overlay = document.createElement('div');
    overlay.className = 'cdp-addr-overlay';
    overlay.id = 'ejuno818ReviewOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(17,17,17,.5);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:99999;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;padding:16px;box-sizing:border-box;';
    
    var modal = document.createElement('div');
    modal.style.cssText = 'background:#fff;border-radius:16px;max-width:420px;width:100%;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.18);position:relative;';
    
    modal.innerHTML = '<button id="ejuno818ReviewClose" style="position:absolute;top:14px;right:14px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:#f3f4f6;border:none;border-radius:50%;font-size:20px;cursor:pointer;color:#6b7280;">&times;</button>' +
      '<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Review Your Request</h2>' +
      '<p style="margin:0 0 20px;color:#6b7280;font-size:14px;">Please confirm the details below before sending.</p>' +
      '<div style="background:#fafafa;border-radius:12px;padding:18px;margin-bottom:20px;">' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:12px;"><span style="color:#6b7280;font-size:14px;">Guests</span><span style="font-weight:600;color:#111827;">' + breakdown.guests + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:12px;"><span style="color:#6b7280;font-size:14px;">Unit Price</span><span style="font-weight:600;color:#111827;">' + formatCurrency(breakdown.unitPrice) + '</span></div>' +
        (breakdown.addOnsTotal > 0 ? '<div style="display:flex;justify-content:space-between;margin-bottom:12px;"><span style="color:#6b7280;font-size:14px;">Add-ons</span><span style="font-weight:600;color:#111827;">' + formatCurrency(breakdown.addOnsTotal) + '</span></div>' : '') +
        '<div style="border-top:1px solid #e5e7eb;padding-top:12px;margin-top:12px;">' +
          '<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#111827;font-size:15px;font-weight:600;">Total</span><span style="font-weight:700;color:#e02f8a;font-size:18px;">' + formatCurrency(breakdown.total) + '</span></div>' +
          '<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:#6b7280;font-size:13px;">Deposit (' + breakdown.depositPct + '%)</span><span style="font-weight:600;color:#111827;">' + formatCurrency(breakdown.deposit) + '</span></div>' +
          '<div style="display:flex;justify-content:space-between;"><span style="color:#6b7280;font-size:13px;">Balance due</span><span style="font-weight:600;color:#111827;">' + formatCurrency(breakdown.balance) + '</span></div>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:12px;">' +
        '<button id="ejuno818ReviewBack" style="flex:1;padding:14px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;color:#374151;font-size:15px;font-weight:600;cursor:pointer;">← Back</button>' +
        '<button id="ejuno818ReviewSend" style="flex:1;padding:14px;border:none;border-radius:10px;background:#e02f8a;color:#fff;font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(224,47,138,.22);">Send Request</button>' +
      '</div>';
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    if (typeof hideLoaderFull === 'function') hideLoaderFull();
    
    var closed = false;
    function close() {
      if (closed) return;
      closed = true;
      overlay.remove();
    }
    
    document.getElementById('ejuno818ReviewClose').onclick = function() {
      log('reviewModal: close clicked');
      close();
      onCancel();
    };
    document.getElementById('ejuno818ReviewBack').onclick = function() {
      log('reviewModal: back clicked');
      close();
      onCancel();
    };
    document.getElementById('ejuno818ReviewSend').onclick = function() {
      log('reviewModal: send clicked');
      close();
      onSend();
    };
    overlay.onclick = function(e) {
      if (e.target === overlay) {
        log('reviewModal: overlay clicked');
        close();
        onCancel();
      }
    };
  }
  
  function runDeferredAddressGate(rd) {
    return new Promise(function(resolve, reject) {
      if (!rd._818_needsAddressGate) {
        log('runDeferredAddressGate: not needed');
        resolve();
        return;
      }
      
      addressGateRunCount++;
      log('runDeferredAddressGate: starting (count=' + addressGateRunCount + ')');
      delete rd._818_needsAddressGate;
      rd._818_guestConfirmed = true;
      
      var customerId = localStorage.getItem('customerId') || '';
      if (!customerId) {
        log('runDeferredAddressGate: no customerId, skipping');
        resolve();
        return;
      }
      
      var timeout = setTimeout(function() {
        log('runDeferredAddressGate: timeout after 120s');
        reject(new Error('Address entry timed out'));
      }, 120000);
      
      var gateFunc = window.ensureAddressBeforeReservation;
      if (typeof gateFunc === 'function') {
        gateFunc(rd, function() {
          clearTimeout(timeout);
          log('runDeferredAddressGate: completed');
          resolve();
        });
      } else {
        clearTimeout(timeout);
        log('runDeferredAddressGate: ensureAddressBeforeReservation not found');
        resolve();
      }
    });
  }
  
  window.fetch = function(url, options) {
    var urlStr = String(url);
    
    if (urlStr.indexOf('/reservations') === -1 || !options || options.method !== 'POST') {
      return originalFetch.apply(this, arguments);
    }
    
    var rd = getRequestData();
    var pd = getProductDetails();
    
    if (!rd || !rd._818_guestConfirmed) {
      log('fetch intercept: not a bundle guest flow, pass through');
      return originalFetch.apply(this, arguments);
    }
    
    log('fetch intercept: bundle guest flow detected');
    
    var body;
    try {
      body = JSON.parse(options.body);
    } catch (e) {
      log('fetch intercept: body parse failed, pass through');
      return originalFetch.apply(this, arguments);
    }
    
    return new Promise(function(resolve, reject) {
      function afterAddressGate() {
        log('afterAddressGate: merging fields');
        
        if (rd.billingAddress) body.billingAddress = rd.billingAddress;
        if (rd.shippingAddress) body.shippingAddress = rd.shippingAddress;
        
        var breakdown = calculateBreakdown(body, pd);
        body.calculatedPrice = breakdown.calculatedPrice;
        
        log('afterAddressGate: calculatedPrice=' + body.calculatedPrice);
        
        var reviewFn = (window._ejuno818 && window._ejuno818._testing && window._ejuno818._testing.showReviewModal) || showReviewModal;
        reviewFn(breakdown, 
          function onSend() {
            log('onSend: calling original fetch');
            window._ejuno818Restoring = false;
            delete rd._818_guestConfirmed;
            
            var newOptions = Object.assign({}, options, {
              body: JSON.stringify(body)
            });
            
            originalFetch(url, newOptions).then(resolve).catch(reject);
          },
          function onCancel() {
            log('onCancel: returning cancelled response');
            window._ejuno818Restoring = true;
            restoreConfirmButton();
            delete rd._818_guestConfirmed;
            
            resolve({
              ok: true,
              json: function() { 
                return Promise.resolve({ _818_cancelled: true }); 
              }
            });
          }
        );
      }
      
      if (rd._818_needsAddressGate) {
        runDeferredAddressGate(rd).then(afterAddressGate).catch(function(err) {
          log('addressGate error: ' + err.message);
          restoreConfirmButton();
          reject(err);
        });
      } else {
        afterAddressGate();
      }
    });
  };
  
  var originalEnsureAddress = window.ensureAddressBeforeReservation;
  if (typeof originalEnsureAddress === 'function') {
    window.ensureAddressBeforeReservation = function(rd, onReady) {
      var pd = getProductDetails();
      if (pd && pd.priceType === 'bundle' && !rd._818_guestConfirmed) {
        log('ensureAddressBeforeReservation: deferred for bundle flow');
        rd._818_needsAddressGate = true;
        if (onReady) onReady();
        return;
      }
      log('ensureAddressBeforeReservation: running original');
      return originalEnsureAddress.apply(this, arguments);
    };
  }
  
  function observeCTALabels() {
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(m) {
        m.addedNodes.forEach(function(node) {
          if (node.nodeType !== 1) return;
          var el = node.id === 'confirmBundleGuest' ? node : node.querySelector && node.querySelector('#confirmBundleGuest');
          if (el && el.textContent.toLowerCase().indexOf('book') !== -1) {
            el.textContent = 'Confirm guests';
            log('CTA renamed: Confirm guests');
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  observeCTALabels();
  
  window._ejuno818 = {
    version: 'v4',
    sourceGuard: { size: RAW_SOURCE_SIZE, hash: RAW_SOURCE_HASH },
    requiresSourcePatch: true,
    _testing: {
      getLog: function() { return testLog.slice(); },
      clearLog: function() { testLog.length = 0; },
      getAddressGateRunCount: function() { return addressGateRunCount; },
      resetAddressGateRunCount: function() { addressGateRunCount = 0; },
      calculateBreakdown: calculateBreakdown,
      restoreConfirmButton: restoreConfirmButton,
      showReviewModal: null,
      runDeferredAddressGate: runDeferredAddressGate,
      originalFetch: originalFetch,
      setShowReviewModal: function(fn) { 
        window._ejuno818._testing.showReviewModal = fn; 
      }
    }
  };
  
  log('ejuno-prod-818-822-v4 loaded');
})();
