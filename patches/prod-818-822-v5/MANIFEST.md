# Production #818 + #822 Patch v5

## CRITICAL: Requires Source Modification

**This is NOT a wrapper-only solution.** Source patch at L3737 required.

## v5 Fixes from v4

| Issue | v4 Bug | v5 Fix |
|-------|--------|--------|
| Intercept flag | Checked `_818_guestConfirmed` (never set) | Checks `_818_bundleIntercepted` (set by wrapper) |
| Button selector | `#confirmBtn` (wrong) | `#confirmBundleGuest` (actual prod) |
| Test validity | Pre-seeded flags | Tests follow actual event path |

## Source Requirements

```
snippets/ejuno-product-booking-scripts.liquid
  RAW Size: 251,020 bytes
  SHA256: 86a8ce251ba94a53d26c8dec256749bd7479a34dc9db61db8e51a4b480778442
```

## How It Works

**Actual Production Event Path:**

1. User clicks "Request availability"
2. `ensureAddressBeforeReservation(requestData, onReady)` called
3. **Wrapper intercepts**: sets `_818_bundleIntercepted = true` + `_818_needsAddressGate = true`, calls `onReady()` immediately
4. Bundle guest popup appears
5. User enters guests, clicks `#confirmBundleGuest`
6. Original handler: `requestData.capacity = guestCount; fetch('/reservations', ...)`
7. **Fetch intercept**: sees `_818_bundleIntercepted`, intercepts the call
8. Runs deferred address gate (user enters address)
9. Shows review modal with pricing
10. **Back/Cancel**: sets `_818_cancelled: true` in response, restores button
11. **Send**: calls original fetch with corrected payload

## Patch Components

### 1. SOURCE-PATCH.diff
Adds cancellation guard at L3737:

```diff
.then(data => {
+if (data && data._818_cancelled) { if (typeof hideLoaderFull === 'function') hideLoaderFull(); window._ejuno818Restoring = false; return; }
if (data && data.data) {
```

### 2. ejuno-prod-818-822-v5.js

| Property | Value |
|----------|-------|
| Size | ~13KB |
| Flag | `_818_bundleIntercepted` |
| Button | `#confirmBundleGuest` |

### 3. venue-detail.liquid

```diff
 {% render 'ejuno-product-booking-scripts' %}
+<script src="{{ 'ejuno-prod-818-822-v5.js' | asset_url }}"></script>
```

## Test Results: 10/10 Pass

```
--- CRITICAL: Actual Production Event Path ---
  PASS  1. Address wrapper sets _818_bundleIntercepted (not pre-seeded)
  PASS  2. Full flow: addressGate → guestConfirm → fetch INTERCEPTED
  PASS  3. Without address wrapper call, fetch passes through (no intercept)

--- Cancel Flow ---
  PASS  4. Cancel: 0 network calls, _818_cancelled response
  PASS  5. Cancel: #confirmBundleGuest button restored
  PASS  6. Cancel: patched source handler exits cleanly (no error)

--- Send Flow ---
  PASS  7. Send: 1 network call with calculatedPrice=23000
  PASS  8. Send: address fields merged into payload

--- Pricing ---
  PASS  9. Review: 200×115=23000, 30% deposit=6900, balance=16100

--- Retry ---
  PASS  10. Retry after cancel: can make new request
```

**Tests 1-3 prove correct event path:**
- Test 1: Flag is set BY wrapper, not pre-seeded
- Test 2: Full flow is intercepted
- Test 3: Without wrapper call, fetch passes through correctly

## QA Sequence

1. Bundle service → select date → "Request availability"
2. **GUEST popup FIRST** (button: "Confirm guests")
3. Enter 200 guests → click
4. **ADDRESS gate NOW** (runs after guest confirm)
5. **REVIEW MODAL**: €23,000 / €6,900 deposit / €16,100 balance
6. **"← Back"** → NO fetch, NO error, `#confirmBundleGuest` restored, can retry
7. **"Send Request"** → ONE /reservations POST with:
   - `calculatedPrice: 23000`
   - `billingAddress: {...}`
   - All original fields preserved
8. Stripe modal opens normally

## Honest Limits

- Integration tests use Node.js vm module, not actual browser
- Cannot test real DOM click events or CSS
- Cannot test actual Stripe modal
- **BROWSER QA REQUIRED** before production deployment
- Source patch must be applied manually

## Files NOT Modified

- Original Stripe integration (preserved)
- Payment flow logic (preserved)  
- Any file with API keys or secrets
