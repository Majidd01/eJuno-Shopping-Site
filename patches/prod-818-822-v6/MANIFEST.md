# Production #818 + #822 Patch v6

## CRITICAL: Requires Source Modification

**This is NOT a wrapper-only solution.** Source patch at L3737 required.

## v6 Fixes from v5

| Issue | v5 Bug | v6 Fix |
|-------|--------|--------|
| Address UI dismiss | `onReady` never fires → 120s timeout, button stuck | Immediate cancel on close/overlay/Escape |
| Listener cleanup | N/A | Cleanup timeout, observer, escapeHandler on any outcome |
| Double resolve | N/A | Guard with `finished` flag, no race conditions |

## Source Requirements

```
snippets/ejuno-product-booking-scripts.liquid
  RAW Size: 251,020 bytes
  SHA256: 86a8ce251ba94a53d26c8dec256749bd7479a34dc9db61db8e51a4b480778442
```

## Address UI Dismissal Handling

**Problem (v5):** If user opens address form then closes it without completing:
- `onReady()` never fires
- Promise stays unresolved for 120 seconds
- Button remains disabled
- Eventually times out with error

**Solution (v6):** Watch for address UI dismissal:

```javascript
// After calling original ensureAddressBeforeReservation:
// 1. Watch for overlay removal via MutationObserver
// 2. Watch close button click
// 3. Watch overlay background click  
// 4. Watch Escape key

// On any dismissal:
cleanup();  // Clear timeout, observer, handlers
finish({ dismissed: true });

// In fetch intercept:
if (result.dismissed) {
  restoreConfirmButton();
  return { _818_cancelled: true };
}
```

## Test Results: 12/12 Pass

```
--- Actual Production Event Path ---
  PASS  1. Address wrapper sets _818_bundleIntercepted
  PASS  2. Full flow intercepted, review shown

--- NEW: Address UI Dismissal (v6) ---
  PASS  3. Address close button: immediate cancel, button restored
  PASS  4. Address overlay click: immediate cancel, no 120s wait
  PASS  5. After address dismiss, retry succeeds
  PASS  6. Address onReady completes normally (no double resolve)

--- Cancel Flow ---
  PASS  7. Review cancel: 0 network, _818_cancelled
  PASS  8. Patched source handler exits cleanly on _818_cancelled

--- Send Flow ---
  PASS  9. Send: 1 network call with calculatedPrice=23000
  PASS  10. Send: address fields merged
  PASS  11. Pricing: 200×115=23000, 30% deposit=6900
  PASS  12. Non-bundle flow passes through without intercept
```

**Tests 3-6 verify address dismissal handling:**
- Test 3: Close button immediately cancels
- Test 4: Overlay click immediately cancels (no 120s wait)
- Test 5: Retry after dismiss succeeds
- Test 6: Normal completion doesn't double-resolve

## QA Sequence

1. Bundle service → select date → "Request availability"
2. **GUEST popup** → enter 200 guests → "Confirm guests"
3. **ADDRESS form appears**
4. **Test dismissal paths:**
   - Click X close button → button restored, can retry
   - Click overlay background → button restored, can retry  
   - Press Escape → button restored, can retry
5. **Complete address form** → "Continue"
6. **REVIEW MODAL**: €23,000 / €6,900 deposit / €16,100 balance
7. **"← Back"** → button restored, can retry
8. **"Send Request"** → ONE /reservations POST with:
   - `calculatedPrice: 23000`
   - `billingAddress: {...}`
   - All original fields preserved

## Honest Limits

- Tests use Node.js vm module, not actual browser
- MutationObserver is simulated in tests
- Cannot test actual DOM events or CSS
- **BROWSER QA REQUIRED** before production deployment
- Source patch must be applied manually
