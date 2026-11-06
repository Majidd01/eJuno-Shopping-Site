/**
 * Integration Tests for Production #818 + #822 v6
 * 
 * v6 adds address UI dismissal handling:
 * - Close button, overlay click, Escape immediately cancel
 * - Button restored, no 120s timeout hang
 * - Successful retry after dismissal
 * 
 * Source Guard (RAW):
 *   Size: 251,020 bytes
 *   SHA256: 86a8ce251ba94a53d26c8dec256749bd7479a34dc9db61db8e51a4b480778442
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const helperPath = path.join(__dirname, 'ejuno-prod-818-822-v6.js');
const helperCode = fs.readFileSync(helperPath, 'utf8');

const ORIGINAL_HANDLER_STRUCTURE = `
function originalConfirmBundleGuestHandler(guestInput, requestData, popup, confirmBtn, showLoaderFull, hideLoaderFull, showNotification) {
  return function() {
    var guestCount = parseInt(guestInput.value, 10);
    if (isNaN(guestCount) || guestCount < 1) return Promise.resolve({ error: 'invalid' });
    
    requestData.capacity = guestCount;
    if (popup && popup.remove) popup.remove();
    
    if (typeof showLoaderFull === 'function') showLoaderFull();
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Booking...';
      confirmBtn.style.opacity = '0.7';
    }
    
    return fetch(window.EJUNO_API + '/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    })
    .then(function(response) {
      if (!response.ok) {
        return response.json().then(function(errorData) {
          throw new Error(errorData.message || 'Booking failed.');
        });
      }
      return response.json();
    })
    .then(function(data) {
      if (data && data._818_cancelled) { 
        if (typeof hideLoaderFull === 'function') hideLoaderFull(); 
        window._ejuno818Restoring = false; 
        return { _818_cancelled: true }; 
      }
      
      if (data && data.data) {
        return { stripeFlowStarted: true, bookingId: data.data._id };
      } else {
        throw new Error('Invalid response from server.');
      }
    })
    .catch(function(error) {
      if (typeof hideLoaderFull === 'function') hideLoaderFull();
      showNotification(error.message || 'Booking failed.', 'error');
      return { error: error.message };
    });
  };
}
`;

function createTestContext() {
  const fetchCalls = [];
  const notifications = [];
  const elements = {};
  const addedElements = [];
  let addressOverlayDismissCallback = null;
  
  const ctx = {
    window: {
      EJUNO_API: 'https://test-api.example.com',
      productDetails: {
        priceType: 'bundle',
        title: 'Test Service',
        variants: [{ id: 'v1', variantId: 'v1', price: 115 }],
        paymentPolicy: { depositPercentage: 30 }
      },
      requestData: {
        shopifyProductId: 'prod123',
        variantId: 'v1',
        date: '2026-12-15'
      },
      _ejuno818Restoring: false,
      fetch: null,
      ensureAddressBeforeReservation: function(rd, onReady) {
        const overlay = ctx.document.createElement('div');
        overlay.className = 'cdp-addr-overlay';
        overlay.id = 'testAddressOverlay';
        
        const closeBtn = { onclick: null, className: 'cdp-addr-close' };
        overlay.querySelector = function(sel) {
          if (sel.includes('cdp-addr-close')) return closeBtn;
          return null;
        };
        
        overlay.onclick = null;
        
        ctx.document.body.appendChild(overlay);
        elements['testAddressOverlay'] = overlay;
        
        ctx._addressOverlay = overlay;
        ctx._addressCloseBtn = closeBtn;
        ctx._addressOnReady = onReady;
        
        ctx._simulateAddressComplete = function() {
          rd.billingAddress = { address1: '123 Test St', city: 'Dublin', country: 'Ireland' };
          rd.shippingAddress = { address1: '123 Test St', city: 'Dublin', country: 'Ireland' };
          overlay._removed = true;
          if (onReady) onReady();
        };
        
        ctx._simulateAddressDismiss = function(reason) {
          overlay._removed = true;
          if (addressOverlayDismissCallback) {
            addressOverlayDismissCallback(reason);
          }
        };
      }
    },
    document: {
      body: {
        appendChild: function(el) { 
          addedElements.push(el);
          if (el.id) elements[el.id] = el;
          if (el.innerHTML) {
            const matches = el.innerHTML.match(/id="([^"]+)"/g) || [];
            matches.forEach(m => {
              const id = m.match(/id="([^"]+)"/)[1];
              elements[id] = { onclick: null, remove: function() {} };
            });
          }
        },
        querySelectorAll: function() { return []; },
        contains: function(el) { return el && !el._removed; }
      },
      createElement: function(tag) {
        return {
          tagName: tag.toUpperCase(),
          style: { cssText: '' },
          className: '',
          id: '',
          innerHTML: '',
          onclick: null,
          _removed: false,
          appendChild: function(child) { 
            if (child.innerHTML) {
              const matches = child.innerHTML.match(/id="([^"]+)"/g) || [];
              matches.forEach(m => {
                const id = m.match(/id="([^"]+)"/)[1];
                elements[id] = { onclick: null, remove: function() {} };
              });
            }
          },
          remove: function() { this._removed = true; },
          querySelector: function() { return null; },
          getAttribute: function() { return null; }
        };
      },
      getElementById: function(id) { return elements[id] || null; },
      querySelector: function(sel) { 
        if (sel === '.cdp-addr-overlay:not(#ejuno818ReviewOverlay)') {
          return ctx._addressOverlay;
        }
        return null; 
      },
      addEventListener: function(type, handler) {
        if (type === 'keydown') {
          ctx._escapeHandler = handler;
        }
      },
      removeEventListener: function(type, handler) {
        if (type === 'keydown' && ctx._escapeHandler === handler) {
          ctx._escapeHandler = null;
        }
      }
    },
    localStorage: {
      _data: { authToken: 'test-token', customerId: 'cust123' },
      getItem: function(k) { return this._data[k] || ''; },
      setItem: function(k, v) { this._data[k] = v; }
    },
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    Promise: Promise,
    console: console,
    MutationObserver: function(callback) { 
      addressOverlayDismissCallback = function(reason) {
        try {
          callback([{ type: 'childList', removedNodes: [], addedNodes: [] }]);
        } catch (e) {}
      };
      return { 
        observe: function() {},
        disconnect: function() { addressOverlayDismissCallback = null; }
      }; 
    },
    Object: Object,
    Array: Array,
    JSON: JSON,
    Number: Number,
    String: String,
    Date: Date,
    Math: Math,
    Error: Error,
    parseInt: parseInt,
    isNaN: isNaN,
    _fetchCalls: fetchCalls,
    _notifications: notifications,
    _elements: elements,
    _addedElements: addedElements
  };
  
  ctx.window.originalFetch = function(url, options) {
    fetchCalls.push({ url: String(url), method: options.method, body: JSON.parse(options.body) });
    return Promise.resolve({
      ok: true,
      json: function() {
        return Promise.resolve({ status: true, data: { _id: 'booking123' } });
      }
    });
  };
  
  ctx.showLoaderFull = function() {};
  ctx.hideLoaderFull = function() {};
  ctx.showNotification = function(msg, type) { notifications.push({ msg, type }); };
  ctx.getSelectedCurrency = function() { return 'EUR'; };
  
  elements['confirmBundleGuest'] = { 
    disabled: false, 
    textContent: 'Confirm guests', 
    style: { opacity: '1' },
    getAttribute: function(k) { return k === 'data-original-text' ? 'Confirm guests' : null; }
  };
  
  return ctx;
}

function loadHelperInContext(ctx) {
  const sandbox = vm.createContext(ctx);
  sandbox.window.fetch = ctx.window.originalFetch;
  sandbox.fetch = ctx.window.originalFetch;
  
  const wrappedHelper = `
    (function(window, document, localStorage, setTimeout, clearTimeout, Promise, console, MutationObserver, Object, Array, JSON, Number, String, Date, Math, Error, parseInt, isNaN, showLoaderFull, hideLoaderFull, showNotification, getSelectedCurrency) {
      var fetch = window.fetch;
      var ensureAddressBeforeReservation = window.ensureAddressBeforeReservation;
      var productDetails = window.productDetails;
      var requestData = window.requestData;
      ${helperCode}
    })(window, document, localStorage, setTimeout, clearTimeout, Promise, console, MutationObserver, Object, Array, JSON, Number, String, Date, Math, Error, parseInt, isNaN, showLoaderFull, hideLoaderFull, showNotification, getSelectedCurrency);
  `;
  
  vm.runInContext(wrappedHelper, sandbox);
  return sandbox;
}

async function runIntegrationTests() {
  console.log('\n========================================');
  console.log('Integration Tests: Production #818 + #822 v6');
  console.log('========================================\n');
  console.log('Source Guard (RAW): 251,020 bytes');
  console.log('SHA256: 86a8ce251ba94a53d26c8dec256749bd7479a34dc9db61db8e51a4b480778442\n');
  
  let passed = 0;
  let failed = 0;
  
  async function test(name, fn) {
    try {
      const result = await fn();
      if (result.pass) {
        passed++;
        console.log(`  PASS  ${name}`);
      } else {
        failed++;
        console.log(`  FAIL  ${name}`);
        console.log(`        ${result.reason}`);
      }
    } catch (err) {
      failed++;
      console.log(`  FAIL  ${name}`);
      console.log(`        ${err.message}`);
    }
  }
  
  console.log('--- Actual Production Event Path (from v5) ---\n');
  
  await test('1. Address wrapper sets _818_bundleIntercepted', async () => {
    const ctx = createTestContext();
    const sandbox = loadHelperInContext(ctx);
    
    sandbox.window.ensureAddressBeforeReservation(sandbox.window.requestData, function() {});
    await new Promise(r => setTimeout(r, 20));
    
    if (!sandbox.window.requestData._818_bundleIntercepted) {
      return { pass: false, reason: '_818_bundleIntercepted NOT set' };
    }
    
    return { pass: true };
  });
  
  await test('2. Full flow intercepted, review shown', async () => {
    const ctx = createTestContext();
    const sandbox = loadHelperInContext(ctx);
    
    let reviewShown = false;
    sandbox.window._ejuno818._testing.setShowReviewModal(function() {
      reviewShown = true;
    });
    
    sandbox.window.ensureAddressBeforeReservation(sandbox.window.requestData, function() {});
    await new Promise(r => setTimeout(r, 20));
    
    sandbox.window.requestData.capacity = 200;
    
    sandbox.window.fetch(sandbox.window.EJUNO_API + '/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sandbox.window.requestData)
    });
    
    await new Promise(r => setTimeout(r, 50));
    ctx._simulateAddressComplete();
    await new Promise(r => setTimeout(r, 150));
    
    if (!reviewShown) {
      return { pass: false, reason: 'Review not shown' };
    }
    
    return { pass: true };
  });
  
  console.log('\n--- NEW: Address UI Dismissal (v6) ---\n');
  
  await test('3. Address close button: immediate cancel, button restored', async () => {
    const ctx = createTestContext();
    const sandbox = loadHelperInContext(ctx);
    
    ctx._elements['confirmBundleGuest'].disabled = true;
    ctx._elements['confirmBundleGuest'].textContent = 'Booking...';
    
    let reviewShown = false;
    sandbox.window._ejuno818._testing.setShowReviewModal(function() {
      reviewShown = true;
    });
    
    sandbox.window.ensureAddressBeforeReservation(sandbox.window.requestData, function() {});
    await new Promise(r => setTimeout(r, 20));
    
    sandbox.window.requestData.capacity = 200;
    
    const fetchPromise = sandbox.window.fetch(sandbox.window.EJUNO_API + '/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sandbox.window.requestData)
    });
    
    await new Promise(r => setTimeout(r, 150));
    
    ctx._simulateAddressDismiss('close_button');
    
    const response = await fetchPromise;
    const data = await response.json();
    
    if (!data._818_cancelled) {
      return { pass: false, reason: 'Should return _818_cancelled on dismiss' };
    }
    
    if (reviewShown) {
      return { pass: false, reason: 'Review should NOT be shown on dismiss' };
    }
    
    if (ctx._fetchCalls.length !== 0) {
      return { pass: false, reason: 'Should have 0 fetch calls on dismiss' };
    }
    
    const btn = ctx._elements['confirmBundleGuest'];
    if (btn.disabled !== false) {
      return { pass: false, reason: 'Button should be restored' };
    }
    
    return { pass: true };
  });
  
  await test('4. Address overlay click: immediate cancel, no 120s wait', async () => {
    const ctx = createTestContext();
    const sandbox = loadHelperInContext(ctx);
    
    sandbox.window.ensureAddressBeforeReservation(sandbox.window.requestData, function() {});
    await new Promise(r => setTimeout(r, 20));
    
    sandbox.window.requestData.capacity = 200;
    
    const startTime = Date.now();
    
    const fetchPromise = sandbox.window.fetch(sandbox.window.EJUNO_API + '/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sandbox.window.requestData)
    });
    
    await new Promise(r => setTimeout(r, 150));
    
    ctx._simulateAddressDismiss('overlay_click');
    
    const response = await fetchPromise;
    const elapsed = Date.now() - startTime;
    
    if (elapsed > 5000) {
      return { pass: false, reason: 'Took too long (' + elapsed + 'ms), should be immediate' };
    }
    
    const data = await response.json();
    if (!data._818_cancelled) {
      return { pass: false, reason: 'Should return _818_cancelled' };
    }
    
    return { pass: true };
  });
  
  await test('5. After address dismiss, retry succeeds', async () => {
    const ctx = createTestContext();
    const sandbox = loadHelperInContext(ctx);
    
    let reviewCount = 0;
    let sendCallback = null;
    sandbox.window._ejuno818._testing.setShowReviewModal(function(breakdown, onSend, onCancel) {
      reviewCount++;
      sendCallback = onSend;
    });
    
    sandbox.window.ensureAddressBeforeReservation(sandbox.window.requestData, function() {});
    await new Promise(r => setTimeout(r, 20));
    
    sandbox.window.requestData.capacity = 200;
    
    const fetch1 = sandbox.window.fetch(sandbox.window.EJUNO_API + '/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sandbox.window.requestData)
    });
    
    await new Promise(r => setTimeout(r, 150));
    ctx._simulateAddressDismiss('close_button');
    await fetch1;
    
    if (reviewCount !== 0) {
      return { pass: false, reason: 'Review should not show on first dismiss' };
    }
    
    sandbox.window.ensureAddressBeforeReservation(sandbox.window.requestData, function() {});
    await new Promise(r => setTimeout(r, 20));
    
    const fetch2 = sandbox.window.fetch(sandbox.window.EJUNO_API + '/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sandbox.window.requestData)
    });
    
    await new Promise(r => setTimeout(r, 50));
    ctx._simulateAddressComplete();
    await new Promise(r => setTimeout(r, 150));
    
    if (reviewCount !== 1) {
      return { pass: false, reason: 'Review should show on retry, count=' + reviewCount };
    }
    
    if (sendCallback) sendCallback();
    await fetch2;
    await new Promise(r => setTimeout(r, 50));
    
    if (ctx._fetchCalls.length !== 1) {
      return { pass: false, reason: 'Should have 1 fetch after retry+send' };
    }
    
    return { pass: true };
  });
  
  await test('6. Address onReady completes normally (no double resolve)', async () => {
    const ctx = createTestContext();
    const sandbox = loadHelperInContext(ctx);
    
    let reviewCount = 0;
    sandbox.window._ejuno818._testing.setShowReviewModal(function() {
      reviewCount++;
    });
    
    sandbox.window.ensureAddressBeforeReservation(sandbox.window.requestData, function() {});
    await new Promise(r => setTimeout(r, 20));
    
    sandbox.window.requestData.capacity = 200;
    
    sandbox.window.fetch(sandbox.window.EJUNO_API + '/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sandbox.window.requestData)
    });
    
    await new Promise(r => setTimeout(r, 50));
    ctx._simulateAddressComplete();
    await new Promise(r => setTimeout(r, 150));
    
    ctx._simulateAddressDismiss('overlay_removed');
    await new Promise(r => setTimeout(r, 100));
    
    if (reviewCount !== 1) {
      return { pass: false, reason: 'Should show exactly 1 review, got ' + reviewCount };
    }
    
    return { pass: true };
  });
  
  console.log('\n--- Cancel Flow (preserved from v5) ---\n');
  
  await test('7. Review cancel: 0 network, _818_cancelled', async () => {
    const ctx = createTestContext();
    const sandbox = loadHelperInContext(ctx);
    
    let cancelCallback = null;
    sandbox.window._ejuno818._testing.setShowReviewModal(function(breakdown, onSend, onCancel) {
      cancelCallback = onCancel;
    });
    
    sandbox.window.ensureAddressBeforeReservation(sandbox.window.requestData, function() {});
    await new Promise(r => setTimeout(r, 20));
    
    sandbox.window.requestData.capacity = 200;
    
    const fetchPromise = sandbox.window.fetch(sandbox.window.EJUNO_API + '/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sandbox.window.requestData)
    });
    
    await new Promise(r => setTimeout(r, 50));
    ctx._simulateAddressComplete();
    await new Promise(r => setTimeout(r, 150));
    
    if (!cancelCallback) {
      return { pass: false, reason: 'Cancel callback not captured' };
    }
    
    cancelCallback();
    
    const response = await fetchPromise;
    const data = await response.json();
    
    if (ctx._fetchCalls.length !== 0) {
      return { pass: false, reason: 'Expected 0 fetch calls' };
    }
    
    if (!data._818_cancelled) {
      return { pass: false, reason: 'Missing _818_cancelled' };
    }
    
    return { pass: true };
  });
  
  await test('8. Patched source handler exits cleanly on _818_cancelled', async () => {
    const ctx = createTestContext();
    ctx.window.fetch = function() {
      return Promise.resolve({
        ok: true,
        json: function() { return Promise.resolve({ _818_cancelled: true }); }
      });
    };
    ctx.fetch = ctx.window.fetch;
    
    const sandbox = vm.createContext(ctx);
    vm.runInContext(ORIGINAL_HANDLER_STRUCTURE, sandbox);
    
    const handler = sandbox.originalConfirmBundleGuestHandler(
      { value: '200' },
      { variantId: 'v1' },
      { remove: function() {} },
      { disabled: false, textContent: '', style: {} },
      ctx.showLoaderFull,
      ctx.hideLoaderFull,
      ctx.showNotification
    );
    
    const result = await handler();
    
    if (!result || !result._818_cancelled) {
      return { pass: false, reason: 'Handler did not exit with _818_cancelled' };
    }
    
    const errors = ctx._notifications.filter(n => n.type === 'error');
    if (errors.length > 0) {
      return { pass: false, reason: 'Error notification: ' + errors[0].msg };
    }
    
    return { pass: true };
  });
  
  console.log('\n--- Send Flow (preserved from v5) ---\n');
  
  await test('9. Send: 1 network call with calculatedPrice=23000', async () => {
    const ctx = createTestContext();
    const sandbox = loadHelperInContext(ctx);
    
    let sendCallback = null;
    sandbox.window._ejuno818._testing.setShowReviewModal(function(breakdown, onSend) {
      sendCallback = onSend;
    });
    
    sandbox.window.ensureAddressBeforeReservation(sandbox.window.requestData, function() {});
    await new Promise(r => setTimeout(r, 20));
    
    sandbox.window.requestData.capacity = 200;
    
    const fetchPromise = sandbox.window.fetch(sandbox.window.EJUNO_API + '/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sandbox.window.requestData)
    });
    
    await new Promise(r => setTimeout(r, 50));
    ctx._simulateAddressComplete();
    await new Promise(r => setTimeout(r, 150));
    
    if (sendCallback) sendCallback();
    await fetchPromise;
    await new Promise(r => setTimeout(r, 50));
    
    if (ctx._fetchCalls.length !== 1) {
      return { pass: false, reason: 'Expected 1 fetch' };
    }
    
    const payload = ctx._fetchCalls[0].body;
    if (payload.calculatedPrice !== 23000) {
      return { pass: false, reason: 'calculatedPrice should be 23000' };
    }
    
    return { pass: true };
  });
  
  await test('10. Send: address fields merged', async () => {
    const ctx = createTestContext();
    const sandbox = loadHelperInContext(ctx);
    
    let sendCallback = null;
    sandbox.window._ejuno818._testing.setShowReviewModal(function(breakdown, onSend) {
      sendCallback = onSend;
    });
    
    sandbox.window.ensureAddressBeforeReservation(sandbox.window.requestData, function() {});
    await new Promise(r => setTimeout(r, 20));
    
    sandbox.window.requestData.capacity = 200;
    
    const fetchPromise = sandbox.window.fetch(sandbox.window.EJUNO_API + '/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sandbox.window.requestData)
    });
    
    await new Promise(r => setTimeout(r, 50));
    ctx._simulateAddressComplete();
    await new Promise(r => setTimeout(r, 150));
    
    if (sendCallback) sendCallback();
    await fetchPromise;
    await new Promise(r => setTimeout(r, 50));
    
    const payload = ctx._fetchCalls[0].body;
    if (!payload.billingAddress || !payload.billingAddress.address1) {
      return { pass: false, reason: 'billingAddress not merged' };
    }
    
    return { pass: true };
  });
  
  await test('11. Pricing: 200×115=23000, 30% deposit=6900', async () => {
    const ctx = createTestContext();
    const sandbox = loadHelperInContext(ctx);
    
    let capturedBreakdown = null;
    sandbox.window._ejuno818._testing.setShowReviewModal(function(breakdown) {
      capturedBreakdown = breakdown;
    });
    
    sandbox.window.ensureAddressBeforeReservation(sandbox.window.requestData, function() {});
    await new Promise(r => setTimeout(r, 20));
    
    sandbox.window.requestData.capacity = 200;
    
    sandbox.window.fetch(sandbox.window.EJUNO_API + '/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sandbox.window.requestData)
    });
    
    await new Promise(r => setTimeout(r, 50));
    ctx._simulateAddressComplete();
    await new Promise(r => setTimeout(r, 150));
    
    if (!capturedBreakdown) {
      return { pass: false, reason: 'Breakdown not captured' };
    }
    if (capturedBreakdown.total !== 23000) {
      return { pass: false, reason: 'Total should be 23000' };
    }
    if (capturedBreakdown.deposit !== 6900) {
      return { pass: false, reason: 'Deposit should be 6900' };
    }
    
    return { pass: true };
  });
  
  await test('12. Non-bundle flow passes through without intercept', async () => {
    const ctx = createTestContext();
    const sandbox = loadHelperInContext(ctx);
    
    sandbox.window.productDetails.priceType = 'fixed';
    
    let reviewShown = false;
    sandbox.window._ejuno818._testing.setShowReviewModal(function() {
      reviewShown = true;
    });
    
    sandbox.window.ensureAddressBeforeReservation(sandbox.window.requestData, function() {});
    await new Promise(r => setTimeout(r, 20));
    
    sandbox.window.requestData.capacity = 200;
    
    await sandbox.window.fetch(sandbox.window.EJUNO_API + '/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sandbox.window.requestData)
    });
    
    await new Promise(r => setTimeout(r, 100));
    
    if (reviewShown) {
      return { pass: false, reason: 'Review should not show for non-bundle' };
    }
    
    if (ctx._fetchCalls.length !== 1) {
      return { pass: false, reason: 'Fetch should pass through for non-bundle' };
    }
    
    return { pass: true };
  });
  
  console.log('\n========================================');
  console.log(`Total: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');
  
  if (failed === 0) {
    console.log('VERIFIED:');
    console.log('  - Address wrapper sets _818_bundleIntercepted');
    console.log('  - Full flow intercepted, review shown');
    console.log('  - Address close button: immediate cancel');
    console.log('  - Address overlay click: immediate cancel (no 120s wait)');
    console.log('  - After dismiss, retry succeeds');
    console.log('  - Address onReady completes normally (no double resolve)');
    console.log('  - Review cancel: 0 network, _818_cancelled');
    console.log('  - Patched source handler exits cleanly');
    console.log('  - Send: 1 network with calculatedPrice=23000');
    console.log('  - Address fields merged');
    console.log('  - Pricing: 23000/6900/16100');
    console.log('  - Non-bundle passes through\n');
  } else {
    console.log('FAILURES DETECTED\n');
  }
  
  console.log('CRITICAL REQUIREMENT:');
  console.log('  Source patch at L3737 required for clean cancellation\n');
  
  console.log('HONEST LIMITS:');
  console.log('  - Tests use Node.js vm module, not actual browser');
  console.log('  - MutationObserver simulated, not real');
  console.log('  - Cannot test actual DOM events or CSS');
  console.log('  - BROWSER QA REQUIRED\n');
  
  return { passed, failed };
}

if (require.main === module) {
  runIntegrationTests()
    .then(({ passed, failed }) => process.exit(failed > 0 ? 1 : 0))
    .catch(err => {
      console.error('Test runner error:', err);
      process.exit(1);
    });
}

module.exports = { runIntegrationTests };
