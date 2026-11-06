# Production #818 + #822 Patch v4

## CRITICAL: This Patch Requires Source Modification

**This is NOT a wrapper-only solution.** The helper alone is insufficient because:

1. Original `confirmBundleGuest` handler at L3737-3815 checks `if (data && data.data)` 
2. On cancel, helper returns `{ _818_cancelled: true }` (no `data.data`)
3. Original code falls to `throw new Error('Invalid response from server.')`
4. `.catch()` at L3812 shows error notification

**The source patch adds a cancellation guard at L3737** that checks for `_818_cancelled` and exits cleanly.

## Source Requirements

```
snippets/ejuno-product-booking-scripts.liquid
  RAW Size: 251,020 bytes
  SHA256: 86a8ce251ba94a53d26c8dec256749bd7479a34dc9db61db8e51a4b480778442
```

## Patch Components

### 1. SOURCE-PATCH.diff
Contains the exact source transform needed:

```diff
// At L3737, find:
.then(data => {
if (data && data.data) {

// Replace with:
.then(data => {
if (data && data._818_cancelled) { if (typeof hideLoaderFull === 'function') hideLoaderFull(); window._ejuno818Restoring = false; return; }
if (data && data.data) {
```

This is a **narrow, deterministic guard** that:
- Only activates when helper explicitly sets `_818_cancelled: true`
- Hides loader, clears restoring flag, returns early
- No error thrown, no Stripe, no notification

### 2. ejuno-prod-818-822-v4.js (Helper)
| Property | Value |
|----------|-------|
| Size | ~12KB |
| SHA256 | (regenerate after any edit) |

**What it does:**
- Intercepts `/reservations` POST for bundle guest flow
- Parses body, runs deferred address gate, merges fields
- Calculates `calculatedPrice = unitPrice × guests + addOns`
- Shows review modal before final submission
- On Send: calls original fetch with corrected payload
- On Cancel: sets `_818_cancelled: true` in response, restores button

### 3. sections/venue-detail.liquid patch
```diff
 {% render 'ejuno-product-booking-scripts' %}
+<script src="{{ 'ejuno-prod-818-822-v4.js' | asset_url }}"></script>
```

## Test Results: 10/10 Pass

```
--- Source Patch Verification ---
  PASS  1. Patched handler exits cleanly on _818_cancelled (no error)
  PASS  2. Unpatched flow (data.data=null) would throw error
  PASS  3. Valid response (data.data exists) starts Stripe flow

--- Helper Integration Tests ---
  PASS  4. Helper sets _818_cancelled on cancel response
  PASS  5. Zero fetch calls on cancel
  PASS  6. One fetch call on Send with calculatedPrice
  PASS  7. Address fields merged into payload
  PASS  8. Review breakdown: 200×115 = 23000, 30% deposit = 6900
  PASS  9. No duplicate address gate on retry
  PASS  10. Original fields preserved in payload
```

**Test 2 proves the patch is necessary:** Without the guard, `data.data=null` causes "Invalid response" error.

## Why Source Patch, Not Just Helper

| Approach | Problem |
|----------|---------|
| Helper returns fake success `{data:{}}` | Enters Stripe flow without valid booking |
| Helper returns never-resolving Promise | Loader stuck forever |
| Helper returns reject() | Caught by `.catch()`, shows error toast |
| Helper returns `{_818_cancelled:true}` only | Original throws "Invalid response" |
| **Source patch + helper** | Clean cancellation, no error, button restored |

## Application Steps

1. **Verify source hash** before patching
2. **Apply Transform 1** to `snippets/ejuno-product-booking-scripts.liquid`
3. **Copy helper** to `assets/`
4. **Apply Transform 2** to `sections/venue-detail.liquid`
5. **Test on unpublished theme copy**

## QA Sequence

1. Bundle service → select date → "Request availability"
2. **GUEST popup FIRST** (button: "Confirm guests")
3. Enter 200 guests → click
4. **ADDRESS gate NOW** (runs in fetch intercept)
5. **REVIEW MODAL**: €23,000 / €6,900 deposit / €16,100 balance
6. **"← Back"** → NO fetch, NO error notification, button restored
7. Can retry: click button again
8. **"Send Request"** → ONE /reservations POST with:
   - `calculatedPrice: 23000`
   - `billingAddress: {...}`
   - All original fields preserved
9. Stripe modal opens normally

## Honest Limits

- Integration tests use Node.js vm module, not actual browser
- Cannot test real DOM events, CSS, or Stripe modal
- **BROWSER QA REQUIRED** before production deployment
- Source patch must be applied manually; no automated transform

## Files NOT Modified

- Original Stripe integration (preserved)
- Payment flow logic (preserved)
- Any file with API keys or secrets
