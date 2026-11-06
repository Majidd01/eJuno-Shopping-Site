/**
 * Tests for Trello #827 - Range Order Fix
 * 
 * Verifies:
 * - Descending inputs become ascending labels
 * - Already ascending inputs unchanged
 * - Equal endpoints (edge case)
 * - Open-ended formats ("12+ months")
 * - Special labels preserved ("Final month", "Wedding week")
 */

const { formatRange, formatRangeOriginal } = require('./checklist-range-fix.js');

function runTests() {
  console.log('\n========================================');
  console.log('Tests: Trello #827 - Range Order Fix');
  console.log('========================================\n');
  
  let passed = 0;
  let failed = 0;
  
  function test(name, fn) {
    try {
      const result = fn();
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
  
  const STAGES = [
    { from: 24, to: 12 },
    { from: 12, to: 9 },
    { from: 9, to: 6 },
    { from: 6, to: 3 },
    { from: 3, to: 1 },
    { from: 1, to: 0.25, label: 'Final month' },
    { from: 0.25, to: 0, label: 'Wedding week' }
  ];
  
  console.log('--- Original (BROKEN) behavior ---\n');
  
  test('1. Original: 24→12 emits "24–12" (DESCENDING - BUG)', () => {
    const result = formatRangeOriginal(24, 12, false, true, 24);
    if (result === '24–12 months') {
      return { pass: true };
    }
    return { pass: false, reason: `Expected "24–12 months", got "${result}"` };
  });
  
  test('2. Original: 12→9 emits "12–9" (DESCENDING - BUG)', () => {
    const result = formatRangeOriginal(12, 9, false, false, 24);
    if (result === '12–9 months') {
      return { pass: true };
    }
    return { pass: false, reason: `Expected "12–9 months", got "${result}"` };
  });
  
  console.log('\n--- Fixed behavior (ASCENDING) ---\n');
  
  test('3. Fixed: 24→12 emits "12+ months" (first stage format)', () => {
    const result = formatRange(24, 12, false, true, 24);
    if (result === '12+ months') {
      return { pass: true };
    }
    return { pass: false, reason: `Expected "12+ months", got "${result}"` };
  });
  
  test('4. Fixed: 12→9 emits "9–12 months" (ASCENDING)', () => {
    const result = formatRange(12, 9, false, false, 24);
    if (result === '9–12 months') {
      return { pass: true };
    }
    return { pass: false, reason: `Expected "9–12 months", got "${result}"` };
  });
  
  test('5. Fixed: 9→6 emits "6–9 months" (ASCENDING)', () => {
    const result = formatRange(9, 6, false, false, 24);
    if (result === '6–9 months') {
      return { pass: true };
    }
    return { pass: false, reason: `Expected "6–9 months", got "${result}"` };
  });
  
  test('6. Fixed: 6→3 emits "3–6 months" (ASCENDING)', () => {
    const result = formatRange(6, 3, false, false, 24);
    if (result === '3–6 months') {
      return { pass: true };
    }
    return { pass: false, reason: `Expected "3–6 months", got "${result}"` };
  });
  
  test('7. Fixed: 3→1 emits "1–3 months" (ASCENDING)', () => {
    const result = formatRange(3, 1, false, false, 24);
    if (result === '1–3 months') {
      return { pass: true };
    }
    return { pass: false, reason: `Expected "1–3 months", got "${result}"` };
  });
  
  console.log('\n--- Special labels preserved ---\n');
  
  test('8. "Final month" label preserved (not reformatted)', () => {
    const result = formatRange(1, 0.25, true, false, 24);
    if (result === null) {
      return { pass: true };
    }
    return { pass: false, reason: `Should return null for labeled stage, got "${result}"` };
  });
  
  test('9. "Wedding week" label preserved (not reformatted)', () => {
    const result = formatRange(0.25, 0, true, false, 24);
    if (result === null) {
      return { pass: true };
    }
    return { pass: false, reason: `Should return null for labeled stage, got "${result}"` };
  });
  
  console.log('\n--- Edge cases ---\n');
  
  test('10. Equal endpoints: 6→6 emits "6–6 months"', () => {
    const result = formatRange(6, 6, false, false, 24);
    if (result === '6–6 months') {
      return { pass: true };
    }
    return { pass: false, reason: `Expected "6–6 months", got "${result}"` };
  });
  
  test('11. Already ascending input: 3→6 stays "3–6 months"', () => {
    const result = formatRange(3, 6, false, false, 24);
    if (result === '3–6 months') {
      return { pass: true };
    }
    return { pass: false, reason: `Expected "3–6 months", got "${result}"` };
  });
  
  test('12. Short timeframe (6 months): first stage "6+ months"', () => {
    const result = formatRange(24, 12, false, true, 6);
    if (result === '6+ months') {
      return { pass: true };
    }
    return { pass: false, reason: `Expected "6+ months", got "${result}"` };
  });
  
  console.log('\n--- Full stage list (24 months) ---\n');
  
  test('13. All stages have ascending range labels', () => {
    const labels = [];
    STAGES.forEach((s, i) => {
      if (s.label) {
        labels.push(s.label);
      } else {
        const label = formatRange(s.from, s.to, false, i === 0, 24);
        labels.push(label);
      }
    });
    
    console.log('        Labels: ' + labels.join(', '));
    
    const expected = ['12+ months', '9–12 months', '6–9 months', '3–6 months', '1–3 months', 'Final month', 'Wedding week'];
    
    for (let i = 0; i < expected.length; i++) {
      if (labels[i] !== expected[i]) {
        return { pass: false, reason: `Stage ${i}: expected "${expected[i]}", got "${labels[i]}"` };
      }
    }
    
    return { pass: true };
  });
  
  console.log('\n========================================');
  console.log(`Total: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');
  
  if (failed === 0) {
    console.log('VERIFIED:');
    console.log('  - Descending inputs (24→12) become ascending labels (12–24)');
    console.log('  - First stage uses "12+ months" format');
    console.log('  - Special labels preserved (Final month, Wedding week)');
    console.log('  - Already ascending inputs unchanged');
    console.log('  - Equal endpoints handled');
    console.log('  - Short timeframes (6 months) work correctly\n');
  }
  
  console.log('SOURCE PATCH LOCATION:');
  console.log('  File: sections/checklist-2.liquid');
  console.log('  Lines: 47-50 (inside build() function)');
  console.log('  Guard: SHA256 a5cee2673f6d85ebfa4dfebf74aa170bfb23016ade91ae24b40b0126c7bff32f\n');
  
  return { passed, failed };
}

if (require.main === module) {
  const { passed, failed } = runTests();
  process.exit(failed > 0 ? 1 : 0);
}

module.exports = { runTests };
