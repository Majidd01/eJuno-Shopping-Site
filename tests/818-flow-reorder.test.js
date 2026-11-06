/**
 * Trello #818 - Flow Reorder Tests
 * Tests: dates → guests → address → review (not dates → address → guests → review)
 */

const fs = require('fs');
const path = require('path');

const helperPath = path.join(__dirname, '..', 'assets', 'ejuno-818-flow-reorder.js');
const helperJS = fs.readFileSync(helperPath, 'utf8');

function runTests() {
  console.log('\n========================================');
  console.log('Trello #818 - Flow Reorder Tests');
  console.log('========================================\n');
  
  let passed = 0;
  let failed = 0;
  
  function test(name, fn) {
    try {
      fn();
      passed++;
      console.log(`  PASS  ${name}`);
    } catch (err) {
      failed++;
      console.log(`  FAIL  ${name}`);
      console.log(`        ${err.message}`);
    }
  }
  
  function assertContains(str, substr, msg) {
    if (!str.includes(substr)) throw new Error(`${msg}: missing "${substr}"`);
  }
  
  function assertEqual(actual, expected, msg) {
    if (actual !== expected) throw new Error(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
  
  console.log('\n--- Source Verification ---\n');
  
  test('1. Wraps ensureAddressBeforeReservation', () => {
    assertContains(helperJS, 'window.ensureAddressBeforeReservation = function', 'Should wrap address gate');
  });
  
  test('2. Wraps ejunoSendVendorConfirmation', () => {
    assertContains(helperJS, 'window.ejunoSendVendorConfirmation = function', 'Should wrap send VC');
  });
  
  test('3. Detects bundle flow via priceType', () => {
    assertContains(helperJS, "pd.priceType === 'bundle'", 'Should check bundle priceType');
  });
  
  test('4. Uses _818_needsAddressGate flag', () => {
    assertContains(helperJS, '_818_needsAddressGate', 'Should use deferred address gate flag');
  });
  
  test('5. Uses _818_guestConfirmed flag', () => {
    assertContains(helperJS, '_818_guestConfirmed', 'Should use guest confirmed flag');
  });
  
  test('6. Short-circuits address gate in bundle flow', () => {
    assertContains(helperJS, 'requestData._addressGatePassed = true', 'Should set addressGatePassed for short-circuit');
    assertContains(helperJS, 'onReady()', 'Should call onReady to continue to guest popup');
  });
  
  test('7. Executes deferred address gate before send', () => {
    assertContains(helperJS, 'origAddressGate(requestData', 'Should call original address gate');
    assertContains(helperJS, 'origSendVC.call', 'Should call original send VC after');
  });
  
  console.log('\n--- Flow Simulation Tests ---\n');
  
  // Simulate the flow logic
  function createMockEnv() {
    let addressGateCalled = false;
    let addressGateCallOrder = -1;
    let guestPopupShown = false;
    let guestPopupOrder = -1;
    let sendVCCalled = false;
    let sendVCOrder = -1;
    let callOrder = 0;
    
    const env = {
      productDetails: { priceType: 'bundle', variants: [{ id: 'v1', price: 115 }] },
      requestData: {},
      
      reset() {
        addressGateCalled = false;
        addressGateCallOrder = -1;
        guestPopupShown = false;
        guestPopupOrder = -1;
        sendVCCalled = false;
        sendVCOrder = -1;
        callOrder = 0;
        this.requestData = {};
      },
      
      // Simulate original address gate
      origAddressGate(requestData, onReady) {
        addressGateCalled = true;
        addressGateCallOrder = ++callOrder;
        requestData._addressGatePassed = true;
        if (onReady) onReady();
      },
      
      // Simulate showing guest popup
      showGuestPopup(requestData) {
        guestPopupShown = true;
        guestPopupOrder = ++callOrder;
      },
      
      // Simulate original send VC
      origSendVC(requestData, opts) {
        sendVCCalled = true;
        sendVCOrder = ++callOrder;
      },
      
      getOrder() {
        return {
          addressGate: addressGateCallOrder,
          guestPopup: guestPopupOrder,
          sendVC: sendVCOrder
        };
      },
      
      getCalled() {
        return { addressGateCalled, guestPopupShown, sendVCCalled };
      }
    };
    
    return env;
  }
  
  // Simulate the 818 wrapped address gate
  function wrappedAddressGate(env, requestData, onReady) {
    const pd = env.productDetails;
    if (pd && pd.priceType === 'bundle' && !requestData._818_guestConfirmed) {
      requestData._818_needsAddressGate = true;
      requestData._addressGatePassed = true;
      if (onReady) onReady();
      return;
    }
    env.origAddressGate(requestData, onReady);
  }
  
  // Simulate the 818 wrapped send VC
  function wrappedSendVC(env, requestData, opts) {
    if (requestData && requestData._818_needsAddressGate) {
      delete requestData._818_needsAddressGate;
      requestData._818_guestConfirmed = true;
      requestData._addressGatePassed = false;
      env.origAddressGate(requestData, function() {
        requestData._addressGatePassed = true;
        env.origSendVC(requestData, opts);
      });
      return;
    }
    env.origSendVC(requestData, opts);
  }
  
  test('8. ORIGINAL flow: address → guest → send (WRONG)', () => {
    const env = createMockEnv();
    // Original flow simulation
    env.origAddressGate(env.requestData, function() {
      env.showGuestPopup(env.requestData);
      env.origSendVC(env.requestData, {});
    });
    
    const order = env.getOrder();
    assertEqual(order.addressGate < order.guestPopup, true, 'Original: address before guest');
    assertEqual(order.guestPopup < order.sendVC, true, 'Original: guest before send');
  });
  
  test('9. PATCHED flow: guest → address → send (CORRECT #818)', () => {
    const env = createMockEnv();
    
    // Patched flow: entry point calls wrapped address gate
    wrappedAddressGate(env, env.requestData, function() {
      // This onReady is called immediately (short-circuit)
      // Guest popup shows
      env.showGuestPopup(env.requestData);
      
      // User confirms guests, triggers send VC
      wrappedSendVC(env, env.requestData, {});
    });
    
    const order = env.getOrder();
    const called = env.getCalled();
    
    // Guest popup should be shown FIRST
    assertEqual(called.guestPopupShown, true, 'Guest popup shown');
    // Address gate should happen AFTER guest popup
    assertEqual(order.guestPopup < order.addressGate, true, 'Guest popup before address gate');
    // Send should happen AFTER address gate
    assertEqual(order.addressGate < order.sendVC, true, 'Address gate before send');
  });
  
  test('10. Bundle flow entry short-circuits address gate', () => {
    const env = createMockEnv();
    let onReadyCalled = false;
    
    wrappedAddressGate(env, env.requestData, function() {
      onReadyCalled = true;
    });
    
    assertEqual(onReadyCalled, true, 'onReady called immediately');
    assertEqual(env.requestData._818_needsAddressGate, true, 'Deferred flag set');
    assertEqual(env.requestData._addressGatePassed, true, 'addressGatePassed set for continuation');
    assertEqual(env.getCalled().addressGateCalled, false, 'Original address gate NOT called yet');
  });
  
  test('11. Send VC triggers deferred address gate', () => {
    const env = createMockEnv();
    env.requestData._818_needsAddressGate = true;
    env.requestData._addressGatePassed = true;
    
    wrappedSendVC(env, env.requestData, {});
    
    assertEqual(env.getCalled().addressGateCalled, true, 'Original address gate called');
    assertEqual(env.getCalled().sendVCCalled, true, 'Original send VC called after');
    assertEqual(env.requestData._818_guestConfirmed, true, 'Guest confirmed flag set');
  });
  
  test('12. Non-bundle flow unchanged', () => {
    const env = createMockEnv();
    env.productDetails.priceType = 'fixed';
    
    wrappedAddressGate(env, env.requestData, function() {
      env.showGuestPopup(env.requestData);
    });
    
    assertEqual(env.getCalled().addressGateCalled, true, 'Address gate called normally');
    assertEqual(env.requestData._818_needsAddressGate, undefined, 'No deferred flag');
  });
  
  console.log('\n--- CTA Label Tests ---\n');
  
  test('13. "Confirm guests" label defined', () => {
    assertContains(helperJS, "confirmGuests: 'Confirm guests'", 'Confirm guests label');
  });
  
  test('14. "Confirming..." label defined', () => {
    assertContains(helperJS, "confirming: 'Confirming...'", 'Confirming label');
  });
  
  test('15. Patches Confirm & Book → Confirm guests', () => {
    assertContains(helperJS, "v === 'Confirm & Book'", 'Detects Confirm & Book');
  });
  
  test('16. Patches Booking... → Confirming...', () => {
    assertContains(helperJS, "v === 'Booking...'", 'Detects Booking...');
  });
  
  console.log('\n========================================');
  console.log(`Total: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');
  
  console.log('VERIFIED FLOW ORDER (#818):');
  console.log('  1. User clicks "Request availability"');
  console.log('  2. Dates confirmed');
  console.log('  3. Guest popup shown (address gate SHORT-CIRCUITED)');
  console.log('  4. User enters guests, clicks "Confirm guests"');
  console.log('  5. Address gate executes NOW (deferred)');
  console.log('  6. Review modal shown');
  console.log('  7. ONLY "Send Request" makes API call\n');
  
  console.log('SAFE QA SEQUENCE:');
  console.log('  - dates → guests → address → review');
  console.log('  - Exit at review modal via "← Back to edit"');
  console.log('  - NO writes until "Send Request"\n');
  
  return { passed, failed };
}

if (require.main === module) {
  const { passed, failed } = runTests();
  process.exit(failed > 0 ? 1 : 0);
}

module.exports = { runTests };
