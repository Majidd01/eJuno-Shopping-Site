# Trello #827 - Incorrect Range Order Fix

## Card
- **URL:** https://trello.com/c/nu4X5W2o/827-title-incorrect-range-order-displayed-in-checklist-budget
- **Title:** Incorrect Range Order Displayed in Checklist & Budget
- **Description:** All budget ranges should be displayed in ascending order (low to high).

## Scope Determination

### Investigated
1. **`sections/checklist-2.liquid`** - Dynamic checklist with timeframe picker
2. **`sections/checklist-content.liquid`** - Static checklist HTML
3. **`sections/home-hero.liquid`** - Budget filter dropdown

### Findings

| Component | Status | Issue |
|-----------|--------|-------|
| Checklist dynamic labels | **NEEDS FIX** | `build()` emits "24–12 months" (descending) |
| Checklist static HTML | OK | Already shows "9–12 months" (ascending) |
| Budget dropdown | OK | Already ascending (`< €30.000` → `> €200.000`) |

## The Bug

In `checklist-2.liquid`, the `build()` function at lines 47-50:

```javascript
var from = Math.min(s.from, total);
var label = s.label || (fmt(from) + '\u2013' + fmt(s.to) + ' months');
```

For stage `{from: 24, to: 12}`, this creates:
- **Broken:** `"24–12 months"` (high to low)
- **Expected:** `"12–24 months"` or `"12+ months"` (low to high)

## The Fix

```javascript
var from = Math.min(s.from, total);
var lo = Math.min(from, s.to), hi = Math.max(from, s.to);
var label = s.label || (fmt(lo) + '\u2013' + fmt(hi) + ' months');
if (!s.label && s.from === 24) label = (total >= 12 ? '12' : fmt(lo)) + '+ months';
```

## Test Results: 13/13 Pass

```
--- Original (BROKEN) behavior ---
  PASS  1. Original: 24→12 emits "24–12" (DESCENDING - BUG)
  PASS  2. Original: 12→9 emits "12–9" (DESCENDING - BUG)

--- Fixed behavior (ASCENDING) ---
  PASS  3. Fixed: 24→12 emits "12+ months" (first stage format)
  PASS  4. Fixed: 12→9 emits "9–12 months" (ASCENDING)
  PASS  5. Fixed: 9→6 emits "6–9 months" (ASCENDING)
  PASS  6. Fixed: 6→3 emits "3–6 months" (ASCENDING)
  PASS  7. Fixed: 3→1 emits "1–3 months" (ASCENDING)

--- Special labels preserved ---
  PASS  8. "Final month" label preserved
  PASS  9. "Wedding week" label preserved

--- Edge cases ---
  PASS  10. Equal endpoints handled
  PASS  11. Already ascending inputs unchanged
  PASS  12. Short timeframe (6 months) works
  PASS  13. All stages have ascending range labels
```

## Labels After Fix

| Stage | Before (Bug) | After (Fix) |
|-------|--------------|-------------|
| 1st | 24–12 months | 12+ months |
| 2nd | 12–9 months | 9–12 months |
| 3rd | 9–6 months | 6–9 months |
| 4th | 6–3 months | 3–6 months |
| 5th | 3–1 months | 1–3 months |
| 6th | Final month | Final month |
| 7th | Wedding week | Wedding week |

## Source Guard

```
sections/checklist-2.liquid
  Size: 6344 bytes
  SHA256: a5cee2673f6d85ebfa4dfebf74aa170bfb23016ade91ae24b40b0126c7bff32f
```

**Important:** Source is from local backup (Nov 5), not fresh CLI pull. Verify against LIVE MAIN `193677164837` before deployment.

## What Is NOT Changed

- Stage list order (farther-from-wedding first)
- Date window meaning (stages still cover same periods)
- Special labels ("Final month", "Wedding week")
- Budget dropdown (already ascending)
- Static HTML (already ascending)
- #812 deferred real data (not touched)

## Ambiguity

The ticket screenshot (attachment `image.png`) returned 401 without Trello session. This fix is based on:
1. Ticket description: "ascending order (low to high)"
2. Source code analysis showing descending output
3. Static HTML showing intended ascending format

If screenshot shows different requirement, fix may need adjustment.
