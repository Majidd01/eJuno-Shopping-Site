/**
 * Trello #822 - Bundle Pricing Fix Tests
 * Tests the ejuno-payment-review.liquid breakdown calculation
 */

const fs = require('fs');
const path = require('path');

const reviewPath = path.join(__dirname, '..', 'snippets', 'ejuno-payment-review.liquid');
const reviewLiquid = fs.readFileSync(reviewPath, 'utf8');

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
  
  function assertContains(str, substr, msg) {
    if (!str.includes(substr)) {
      throw new Error(`${msg}: missing "${substr}"`);
    }
  }
  
  console.log('\n--- ejuno-payment-review.liquid Verification ---\n');
  
  test('1. bundlePricing variable exists', () => {
    assertContains(reviewLiquid, 'var bundlePricing', 'Should define bundlePricing variable');
  });
  
  test('2. bundlePricing checks variant priceType', () => {
    assertContains(reviewLiquid, 'isBundle(v)', 'Should check isBundle(v) for variant');
  });
  
  test('3. bundlePricing checks product priceType', () => {
    assertContains(reviewLiquid, "pd.priceType === 'bundle'", 'Should check pd.priceType');
  });
  
  test('4. bundlePricing uses OR logic', () => {
    assertContains(reviewLiquid, "isBundle(v) || pd.priceType === 'bundle'", 'Should use OR logic');
  });
  
  test('5. Guest multiplication uses bundlePricing', () => {
    assertContains(reviewLiquid, 'guests > 0 && bundlePricing', 'Should check bundlePricing for guest multiplication');
  });
  
  test('6. Subtitle uses bundlePricing', () => {
    const match = reviewLiquid.match(/per guest.*bundlePricing/s);
    if (!match) {
      assertContains(reviewLiquid, "bundlePricing ? money(price) + ' per guest", 'Should use bundlePricing in subtitle');
    }
  });
  
  console.log('\n--- Calculation Logic Tests ---\n');
  
  function simulateBreakdown(rd, pd) {
    const isBundle = (a) => String((a && a.priceType) || '').toLowerCase() === 'bundle';
    const guests = Number(rd.capacity || rd.noOfGuests || 0);
    const vid = String(rd.variantId || '');
    const v = (pd.variants || []).find(x => String(x.variantId) === vid || String(x.id) === vid) || (pd.variants || [])[0];
    const price = v ? Number(v.price) : NaN;
    
    let amt = price;
    const bundlePricing = isBundle(v) || pd.priceType === 'bundle';
    if (guests > 0 && bundlePricing) {
      amt = price * guests;
    }
    
    return { total: amt, basePrice: price, guests, bundlePricing };
  }
  
  test('7. Bundle: 200 guests × €115 = €23000', () => {
    const rd = { capacity: 200, variantId: 'v1' };
    const pd = { priceType: 'bundle', variants: [{ id: 'v1', price: 115 }] };
    const result = simulateBreakdown(rd, pd);
    
    assertEqual(result.total, 23000, 'total');
    assertEqual(result.bundlePricing, true, 'bundlePricing flag');
  });
  
  test('8. Bundle: 100 guests × €50 = €5000', () => {
    const rd = { capacity: 100, variantId: 'v1' };
    const pd = { priceType: 'bundle', variants: [{ id: 'v1', price: 50 }] };
    const result = simulateBreakdown(rd, pd);
    
    assertEqual(result.total, 5000, 'total');
  });
  
  test('9. Non-bundle: 200 guests should NOT multiply', () => {
    const rd = { capacity: 200, variantId: 'v1' };
    const pd = { priceType: 'fixed', variants: [{ id: 'v1', price: 115 }] };
    const result = simulateBreakdown(rd, pd);
    
    assertEqual(result.total, 115, 'total should be unit price');
    assertEqual(result.bundlePricing, false, 'bundlePricing flag');
  });
  
  test('10. Variant-level bundle flag works', () => {
    const rd = { capacity: 50, variantId: 'v1' };
    const pd = { variants: [{ id: 'v1', price: 20, priceType: 'bundle' }] };
    const result = simulateBreakdown(rd, pd);
    
    assertEqual(result.total, 1000, 'total 50 × 20');
    assertEqual(result.bundlePricing, true, 'bundlePricing from variant');
  });
  
  test('11. Product-level bundle flag (variant has no priceType)', () => {
    const rd = { capacity: 10, variantId: 'v1' };
    const pd = { priceType: 'bundle', variants: [{ id: 'v1', price: 100 }] };
    const result = simulateBreakdown(rd, pd);
    
    assertEqual(result.total, 1000, 'total 10 × 100');
    assertEqual(result.bundlePricing, true, 'bundlePricing from product');
  });
  
  test('12. Single guest: 1 × €115 = €115', () => {
    const rd = { capacity: 1, variantId: 'v1' };
    const pd = { priceType: 'bundle', variants: [{ id: 'v1', price: 115 }] };
    const result = simulateBreakdown(rd, pd);
    
    assertEqual(result.total, 115, 'total for 1 guest');
  });
  
  test('13. Zero guests: no multiplication', () => {
    const rd = { capacity: 0, variantId: 'v1' };
    const pd = { priceType: 'bundle', variants: [{ id: 'v1', price: 115 }] };
    const result = simulateBreakdown(rd, pd);
    
    assertEqual(result.total, 115, 'total stays unit price');
  });
  
  console.log('\n========================================');
  console.log(`Total: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');
  
  console.log('FIX SUMMARY:');
  console.log('- Bug: Review modal checked variant.priceType but services set product.priceType');
  console.log('- Fix: Added "bundlePricing = isBundle(v) || pd.priceType === bundle"');
  console.log('- Location: snippets/ejuno-payment-review.liquid\n');
  
  return { passed, failed };
}

if (require.main === module) {
  const { passed, failed } = runTests();
  process.exit(failed > 0 ? 1 : 0);
}

module.exports = { runTests };
