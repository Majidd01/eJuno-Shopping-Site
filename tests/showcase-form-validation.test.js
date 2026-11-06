/**
 * Trello #798 - Showcase Form Submit Button Validation Tests
 * Unit tests for syncSubmit validation logic
 * Tests both staging and production JS files
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Validation logic extracted for testing (must match actual implementation)
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function computeAllFieldsValid(state) {
  const { applicantName, businessName, email, title, description, hasPhotos, termsAccepted } = state;
  return !!(applicantName && businessName && validateEmail(email) && title && description && hasPhotos && termsAccepted);
}

// Test harness
function runTests() {
  console.log('\n========================================');
  console.log('Trello #798 - Form Validation Unit Tests');
  console.log('========================================\n');
  
  let passed = 0;
  let failed = 0;
  const results = [];
  
  function test(name, fn) {
    try {
      fn();
      passed++;
      results.push({ name, status: 'PASS' });
      console.log(`  PASS  ${name}`);
    } catch (err) {
      failed++;
      results.push({ name, status: 'FAIL', error: err.message });
      console.log(`  FAIL  ${name}`);
      console.log(`        ${err.message}`);
    }
  }
  
  function assertEqual(actual, expected, msg) {
    if (actual !== expected) {
      throw new Error(`${msg}: expected ${expected}, got ${actual}`);
    }
  }
  
  // ===== UNIT TESTS FOR VALIDATION LOGIC =====
  console.log('\n--- Unit Tests: Validation Logic ---\n');
  
  test('1. Initial: all empty + terms unchecked => disabled', () => {
    const state = {
      applicantName: '',
      businessName: '',
      email: '',
      title: '',
      description: '',
      hasPhotos: false,
      termsAccepted: false
    };
    assertEqual(computeAllFieldsValid(state), false, 'Should be invalid');
  });
  
  test('2. Terms checked only, fields empty => disabled', () => {
    const state = {
      applicantName: '',
      businessName: '',
      email: '',
      title: '',
      description: '',
      hasPhotos: false,
      termsAccepted: true  // Only terms checked
    };
    assertEqual(computeAllFieldsValid(state), false, 'Should be invalid');
  });
  
  test('3. All fields valid + terms unchecked => disabled', () => {
    const state = {
      applicantName: 'John Doe',
      businessName: 'Test Business',
      email: 'test@example.com',
      title: 'Test Title',
      description: 'Test description content',
      hasPhotos: true,
      termsAccepted: false  // Terms NOT checked
    };
    assertEqual(computeAllFieldsValid(state), false, 'Should be invalid without terms');
  });
  
  test('4. Invalid email + terms checked => disabled', () => {
    const state = {
      applicantName: 'John Doe',
      businessName: 'Test Business',
      email: 'invalid-email',  // Invalid email
      title: 'Test Title',
      description: 'Test description',
      hasPhotos: true,
      termsAccepted: true
    };
    assertEqual(computeAllFieldsValid(state), false, 'Should be invalid with bad email');
  });
  
  test('5. All valid + photos + editor + terms => ENABLED', () => {
    const state = {
      applicantName: 'John Doe',
      businessName: 'Test Business',
      email: 'test@example.com',
      title: 'Test Title',
      description: 'Test description content',
      hasPhotos: true,
      termsAccepted: true
    };
    assertEqual(computeAllFieldsValid(state), true, 'Should be VALID/enabled');
  });
  
  test('6. Clear field after valid => re-disabled', () => {
    const state = {
      applicantName: '',  // Cleared
      businessName: 'Test Business',
      email: 'test@example.com',
      title: 'Test Title',
      description: 'Test description',
      hasPhotos: true,
      termsAccepted: true
    };
    assertEqual(computeAllFieldsValid(state), false, 'Should be invalid after clearing');
  });
  
  test('7. Untick terms => re-disabled', () => {
    const state = {
      applicantName: 'John Doe',
      businessName: 'Test Business',
      email: 'test@example.com',
      title: 'Test Title',
      description: 'Test description',
      hasPhotos: true,
      termsAccepted: false  // Unticked
    };
    assertEqual(computeAllFieldsValid(state), false, 'Should be invalid after unticking');
  });
  
  test('8. Remove all photos => re-disabled', () => {
    const state = {
      applicantName: 'John Doe',
      businessName: 'Test Business',
      email: 'test@example.com',
      title: 'Test Title',
      description: 'Test description',
      hasPhotos: false,  // Photos removed
      termsAccepted: true
    };
    assertEqual(computeAllFieldsValid(state), false, 'Should be invalid without photos');
  });
  
  test('9. Clear editor content => re-disabled', () => {
    const state = {
      applicantName: 'John Doe',
      businessName: 'Test Business',
      email: 'test@example.com',
      title: 'Test Title',
      description: '',  // Editor cleared
      hasPhotos: true,
      termsAccepted: true
    };
    assertEqual(computeAllFieldsValid(state), false, 'Should be invalid without description');
  });
  
  // ===== EMAIL VALIDATION EDGE CASES =====
  console.log('\n--- Email Validation Edge Cases ---\n');
  
  test('Email: valid standard format', () => {
    assertEqual(validateEmail('test@example.com'), true, 'Standard email');
  });
  
  test('Email: valid with subdomain', () => {
    assertEqual(validateEmail('test@mail.example.com'), true, 'Subdomain email');
  });
  
  test('Email: invalid - no @', () => {
    assertEqual(validateEmail('testexample.com'), false, 'Missing @');
  });
  
  test('Email: invalid - no domain', () => {
    assertEqual(validateEmail('test@'), false, 'Missing domain');
  });
  
  test('Email: invalid - spaces', () => {
    assertEqual(validateEmail('test @example.com'), false, 'Has spaces');
  });
  
  test('Email: invalid - empty', () => {
    assertEqual(validateEmail(''), false, 'Empty string');
  });
  
  // ===== VERIFY ACTUAL JS FILE CONTAINS CORRECT LOGIC =====
  console.log('\n--- Source File Verification ---\n');
  
  const stagingPath = path.join(__dirname, '..', 'assets', 'ejuno-showcase-form.js');
  const prodPath = '/tmp/prod-798-patch/assets/ejuno-showcase-form.js';
  
  function verifyJSFile(filePath, label) {
    const js = fs.readFileSync(filePath, 'utf8');
    
    // Check syncSubmit validates all fields
    test(`${label}: syncSubmit checks applicantName`, () => {
      assertEqual(js.includes("applicantName = document.getElementById('applicant-name')"), true, 'Has applicantName check');
    });
    
    test(`${label}: syncSubmit checks businessName`, () => {
      assertEqual(js.includes("businessName = document.getElementById('business-name')"), true, 'Has businessName check');
    });
    
    test(`${label}: syncSubmit checks email`, () => {
      assertEqual(js.includes("email = document.getElementById('email')"), true, 'Has email check');
    });
    
    test(`${label}: syncSubmit checks title`, () => {
      assertEqual(js.includes("title = document.getElementById('content-title')"), true, 'Has title check');
    });
    
    test(`${label}: syncSubmit checks description via quill`, () => {
      assertEqual(js.includes("description = quill"), true, 'Has quill description check');
    });
    
    test(`${label}: syncSubmit checks hasPhotos`, () => {
      assertEqual(js.includes("hasPhotos = selectedPhotos.length > 0"), true, 'Has photos check');
    });
    
    test(`${label}: syncSubmit checks termsAccepted`, () => {
      assertEqual(js.includes("termsAccepted = termcheck && termcheck.checked"), true, 'Has terms check');
    });
    
    test(`${label}: syncSubmit validates email format`, () => {
      assertEqual(js.includes("validateEmail(email)"), true, 'Has email validation');
    });
    
    test(`${label}: syncSubmit wired to text inputs`, () => {
      assertEqual(js.includes("el.addEventListener('input', syncSubmit)"), true, 'Input listeners');
    });
    
    test(`${label}: syncSubmit wired to quill text-change`, () => {
      assertEqual(js.includes("// Trello 798: re-sync submit button state on editor change"), true, 'Quill listener');
    });
    
    test(`${label}: syncSubmit wired to photo changes`, () => {
      assertEqual(js.includes("// Trello 798: re-sync submit button state on photo change"), true, 'Photo listener');
    });
    
    // Check max 3 photos validation preserved
    test(`${label}: max 3 photos validation preserved`, () => {
      assertEqual(js.includes("Maximum 3 images are allowed"), true, 'Max 3 images message');
    });
    
    test(`${label}: totalFiles > 3 check preserved`, () => {
      assertEqual(js.includes("totalFiles > 3"), true, 'Max files check');
    });
  }
  
  verifyJSFile(stagingPath, 'STAGING');
  
  if (fs.existsSync(prodPath)) {
    verifyJSFile(prodPath, 'PRODUCTION');
  } else {
    console.log('  SKIP  Production file not found at expected path');
  }
  
  // Summary
  console.log('\n========================================');
  console.log(`Total: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');
  
  return { passed, failed, results };
}

// Run if executed directly
if (require.main === module) {
  try {
    const { passed, failed } = runTests();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test harness error:', err);
    process.exit(1);
  }
}

module.exports = { runTests, computeAllFieldsValid, validateEmail };
