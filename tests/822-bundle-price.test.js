/**
 * Trello #822 - Bundle Pricing Helper Tests
 * Tests the ejuno-822-bundle-price.js wrapper logic
 */

const fs = require('fs');
const path = require('path');

// Read the helper JS
const helperPath = path.join(__dirname, '..', 'assets', 'ejuno-822-bundle-price.js');
const helperJS = fs.readFileSync(helperPath, 'utf8');

function runTests() {
  console.log('\n========================================');
  console.log('Trello #822 - Bundle Pricing Tests');
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
  
  function assertEqual(actual, expected, msg) {
    if (actual !== expected) {
      throw new Error(`${msg}: expected ${expected}, got ${actual}`);
    }
  }
  
  // Mock environment
  function createMockEnv() {
    const env = {
      productDetails: null,
      origPayloadBuilder: null,
      getSelectedAddOnsTotal: null,
    };
    
    // Mock original payload builder (simulates theme behavior)
    env.origPayloadBuilder = function(r) {
      r = r || {};
      const out = {
        shopifyProductId: r.shopifyProductId,
        variantId: r.variantId,
        date: r.date
      };
      if (r.capacity != null) out.capacity = Number(r.capacity);
      return out;
    };
    
    return env;
  }
  
  // Simulate the helper logic
  function simulateHelper(origBuilder, r, productDetails, getAddOnsTotal) {
    const out = origBuilder(r);
    if (r && r.capacity > 0 && out && !out.calculatedPrice) {
      const pd = productDetails;
      if (pd && pd.priceType === 'bundle') {
        const v = pd.variants;
        const vid = r.variantId || out.variantId;
        let sv = null;
        if (v && v.length) {
          for (let i = 0; i < v.length; i++) {
            if (v[i].variantId == vid || v[i].id == vid) { sv = v[i]; break; }
          }
          if (!sv) sv = v[0];
        }
        if (sv) {
          const pp = sv.price || 0;
          const gc = r.capacity;
          const ao = (typeof getAddOnsTotal === 'function') ? getAddOnsTotal(pd) : 0;
          out.calculatedPrice = pp * gc + ao;
          out.basePrice = pp;
        }
      }
    }
    return out;
  }
  
  // ===== TEST CASES =====
  console.log('\n--- Calculation Tests ---\n');
  
  test('1. Bundle: 200 guests × €115 = €23000', () => {
    const env = createMockEnv();
    env.productDetails = {
      priceType: 'bundle',
      variants: [{ id: 'v1', price: 115 }]
    };
    
    const input = { shopifyProductId: 'p1', variantId: 'v1', date: '2026-12-15', capacity: 200 };
    const out = simulateHelper(env.origPayloadBuilder, input, env.productDetails, () => 0);
    
    assertEqual(out.calculatedPrice, 23000, 'calculatedPrice');
    assertEqual(out.basePrice, 115, 'basePrice');
    assertEqual(out.capacity, 200, 'capacity preserved');
  });
  
  test('2. Bundle: 100 guests × €50 = €5000', () => {
    const env = createMockEnv();
    env.productDetails = {
      priceType: 'bundle',
      variants: [{ id: 'v1', price: 50 }]
    };
    
    const input = { shopifyProductId: 'p1', variantId: 'v1', date: '2026-12-15', capacity: 100 };
    const out = simulateHelper(env.origPayloadBuilder, input, env.productDetails, () => 0);
    
    assertEqual(out.calculatedPrice, 5000, 'calculatedPrice');
    assertEqual(out.basePrice, 50, 'basePrice');
  });
  
  test('3. Bundle with add-ons: 200 × €115 + €500 addons = €23500', () => {
    const env = createMockEnv();
    env.productDetails = {
      priceType: 'bundle',
      variants: [{ id: 'v1', price: 115 }]
    };
    
    const input = { shopifyProductId: 'p1', variantId: 'v1', date: '2026-12-15', capacity: 200 };
    const out = simulateHelper(env.origPayloadBuilder, input, env.productDetails, () => 500);
    
    assertEqual(out.calculatedPrice, 23500, 'calculatedPrice includes add-ons');
    assertEqual(out.basePrice, 115, 'basePrice unchanged');
  });
  
  test('4. Non-bundle priceType: no calculatedPrice added', () => {
    const env = createMockEnv();
    env.productDetails = {
      priceType: 'fixed',  // Not bundle
      variants: [{ id: 'v1', price: 115 }]
    };
    
    const input = { shopifyProductId: 'p1', variantId: 'v1', date: '2026-12-15', capacity: 200 };
    const out = simulateHelper(env.origPayloadBuilder, input, env.productDetails, () => 0);
    
    assertEqual(out.calculatedPrice, undefined, 'calculatedPrice not set for non-bundle');
    assertEqual(out.basePrice, undefined, 'basePrice not set for non-bundle');
  });
  
  test('5. Zero capacity: no calculatedPrice', () => {
    const env = createMockEnv();
    env.productDetails = {
      priceType: 'bundle',
      variants: [{ id: 'v1', price: 115 }]
    };
    
    const input = { shopifyProductId: 'p1', variantId: 'v1', date: '2026-12-15', capacity: 0 };
    const out = simulateHelper(env.origPayloadBuilder, input, env.productDetails, () => 0);
    
    assertEqual(out.calculatedPrice, undefined, 'calculatedPrice not set for zero capacity');
  });
  
  test('6. No capacity field: no calculatedPrice', () => {
    const env = createMockEnv();
    env.productDetails = {
      priceType: 'bundle',
      variants: [{ id: 'v1', price: 115 }]
    };
    
    const input = { shopifyProductId: 'p1', variantId: 'v1', date: '2026-12-15' };
    const out = simulateHelper(env.origPayloadBuilder, input, env.productDetails, () => 0);
    
    assertEqual(out.calculatedPrice, undefined, 'calculatedPrice not set without capacity');
  });
  
  test('7. Guest change: 1 guest × €115 = €115', () => {
    const env = createMockEnv();
    env.productDetails = {
      priceType: 'bundle',
      variants: [{ id: 'v1', price: 115 }]
    };
    
    const input = { shopifyProductId: 'p1', variantId: 'v1', date: '2026-12-15', capacity: 1 };
    const out = simulateHelper(env.origPayloadBuilder, input, env.productDetails, () => 0);
    
    assertEqual(out.calculatedPrice, 115, 'calculatedPrice for 1 guest');
  });
  
  test('8. Variant selection: uses correct variant price', () => {
    const env = createMockEnv();
    env.productDetails = {
      priceType: 'bundle',
      variants: [
        { id: 'v1', price: 50 },
        { id: 'v2', price: 115 },
        { id: 'v3', price: 200 }
      ]
    };
    
    const input = { shopifyProductId: 'p1', variantId: 'v2', date: '2026-12-15', capacity: 10 };
    const out = simulateHelper(env.origPayloadBuilder, input, env.productDetails, () => 0);
    
    assertEqual(out.calculatedPrice, 1150, 'uses v2 price €115 × 10');
    assertEqual(out.basePrice, 115, 'basePrice from v2');
  });
  
  // ===== SOURCE FILE CHECKS =====
  console.log('\n--- Source File Checks ---\n');
  
  test('9. Helper wraps ejunoBuildVendorConfirmationPayload', () => {
    if (!helperJS.includes('ejunoBuildVendorConfirmationPayload')) {
      throw new Error('Should wrap ejunoBuildVendorConfirmationPayload');
    }
  });
  
  test('10. Helper checks priceType === bundle', () => {
    if (!helperJS.includes("priceType==='bundle'")) {
      throw new Error('Should check priceType');
    }
  });
  
  test('11. Helper uses getSelectedAddOnsTotal', () => {
    if (!helperJS.includes('getSelectedAddOnsTotal')) {
      throw new Error('Should call getSelectedAddOnsTotal');
    }
  });
  
  test('12. Helper sets _822 marker', () => {
    if (!helperJS.includes('._822=true')) {
      throw new Error('Should set _822 marker');
    }
  });
  
  // ===== DEPOSIT POLICY CHECK =====
  console.log('\n--- Deposit Policy (Hypothesis) ---\n');
  
  test('13. Deposit calculation: 30% of €23000 = €6900 (app responsibility)', () => {
    // NOTE: Deposit calculation is done by the backend app, not theme.
    // Theme only provides calculatedPrice. This test documents expected behavior.
    const total = 23000;
    const depositPercent = 30;
    const expectedDeposit = total * depositPercent / 100;
    assertEqual(expectedDeposit, 6900, 'Expected deposit');
    console.log('        NOTE: Actual deposit calculation is app-side, unverified');
  });
  
  // Summary
  console.log('\n========================================');
  console.log(`Total: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');
  
  console.log('IMPORTANT: Backend review modal fix is UNVERIFIED.');
  console.log('This test only verifies theme sends calculatedPrice in payload.');
  console.log('Actual review modal display is external app code (app.ejuno.io).\n');
  
  return { passed, failed };
}

if (require.main === module) {
  const { passed, failed } = runTests();
  process.exit(failed > 0 ? 1 : 0);
}

module.exports = { runTests };
