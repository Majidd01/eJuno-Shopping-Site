/* Trello 818: Reorder service booking flow - guests BEFORE address.
   Current: dates → address → guests → review
   Required: dates → guests → address → review
   
   Also fixes CTA labels: "Confirm & Book" → "Confirm guests" */
(function(){
  var LABELS = { confirmGuests: 'Confirm guests', confirming: 'Confirming...' };
  
  function hookWhenReady() {
    if (typeof window.ensureAddressBeforeReservation !== 'function' ||
        typeof window.ejunoSendVendorConfirmation !== 'function') {
      return setTimeout(hookWhenReady, 20);
    }
    
    var origAddressGate = window.ensureAddressBeforeReservation;
    var origSendVC = window.ejunoSendVendorConfirmation;
    
    /* Wrap address gate: skip in bundle flow entry, execute later after guest confirm */
    window.ensureAddressBeforeReservation = function(requestData, onReady) {
      var pd = window.productDetails;
      /* Detect bundle flow entry: bundle priceType AND guests not yet confirmed */
      if (pd && pd.priceType === 'bundle' && requestData && !requestData._818_guestConfirmed) {
        /* Short-circuit: show guest popup first, defer address gate */
        requestData._818_needsAddressGate = true;
        requestData._addressGatePassed = true;
        if (typeof onReady === 'function') onReady();
        return;
      }
      return origAddressGate.call(this, requestData, onReady);
    };
    
    /* Wrap send VC: if address gate was deferred, run it now before proceeding */
    window.ejunoSendVendorConfirmation = function(requestData, opts) {
      if (requestData && requestData._818_needsAddressGate) {
        delete requestData._818_needsAddressGate;
        requestData._818_guestConfirmed = true;
        requestData._addressGatePassed = false;
        if (typeof window.hideLoaderFull === 'function') window.hideLoaderFull();
        origAddressGate(requestData, function() {
          requestData._addressGatePassed = true;
          origSendVC.call(window, requestData, opts);
        });
        return;
      }
      return origSendVC.call(this, requestData, opts);
    };
    
    window._ejuno818 = { hooked: true, labels: LABELS };
  }
  
  /* CTA label patching via MutationObserver + textContent intercept */
  function patchButtonText(btn) {
    if (!btn) return;
    var txt = btn.textContent || '';
    if (/Confirm\s*&\s*Book/i.test(txt)) btn.textContent = LABELS.confirmGuests;
    else if (/Confirm\s*booking/i.test(txt)) btn.textContent = LABELS.confirmGuests;
  }
  
  var origSetText = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'textContent');
  if (origSetText && origSetText.set) {
    Object.defineProperty(HTMLElement.prototype, 'textContent', {
      set: function(v) {
        if (this.id === 'confirmBundleGuest' || this.classList.contains('bundle-guest-modal__confirm') ||
            this.id === 'confirmOliversGuestBooking' || this.classList.contains('olivers-guest-modal__submit')) {
          if (v === 'Booking...') v = LABELS.confirming;
          else if (v === 'Confirm & Book' || /^Confirm\s*booking$/i.test(v)) v = LABELS.confirmGuests;
        }
        return origSetText.set.call(this, v);
      },
      get: origSetText.get,
      configurable: true
    });
  }
  
  var obs = new MutationObserver(function(muts) {
    muts.forEach(function(m) {
      m.addedNodes.forEach(function(n) {
        if (n.nodeType !== 1) return;
        var modal = n.classList && n.classList.contains('bundle-guest-modal') ? n :
                   (n.querySelector ? n.querySelector('.bundle-guest-modal') : null);
        if (modal) patchButtonText(modal.querySelector('#confirmBundleGuest, .bundle-guest-modal__confirm'));
        var oModal = n.classList && n.classList.contains('olivers-guest-modal') ? n :
                    (n.querySelector ? n.querySelector('.olivers-guest-modal') : null);
        if (oModal) patchButtonText(oModal.querySelector('#confirmOliversGuestBooking, .olivers-guest-modal__submit'));
      });
    });
  });
  if (document.body) obs.observe(document.body, { childList: true, subtree: true });
  else document.addEventListener('DOMContentLoaded', function() { obs.observe(document.body, { childList: true, subtree: true }); });
  
  hookWhenReady();
})();
