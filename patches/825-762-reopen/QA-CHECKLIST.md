# QA Checklist for #825 + #762 (Nov 10 Reopen)

## File Manifest

| File | SHA256 | Size |
|------|--------|------|
| `sections/services-categories.liquid` | `dbfd1053f63335fe8f7692326fd3b1b5b0a31e450cd448c32e8b4a3c7acc2fdd` | 11264 B |
| `sections/result-grid.liquid` | `602df0a5e2d1c2a0869e27ab284b29f8f43f2d46aadf424ad60cc9db413ba745` | 28946 B |
| `snippets/ejuno-venue-tabs.liquid` | `a40db2b21d0a3d7e8f3ed621d0720da1cfb40bda0a693a16235ceba02edcac36` | 2551 B |

## Ticket #825: Gastronomy & Bar Blurry Image

### Changes Made
- `services-categories.liquid` lines 77-82: added `use_gastro_srcset = true` branch for `gastronomy-bar`
- Lines 93-103: new `<img>` block with `srcset` serving 900w/1440w/2880w and proper `sizes` attribute

### Test Steps
1. Open **/pages/services** (the Services Hub page)
2. Locate the Gastronomy & Bar card
3. Inspect the image element in DevTools
4. **Expected**: `srcset` attribute present with `…_900x… 900w, …_1440x… 1440w, …_2880x… 2880w`
5. **Expected**: image is sharp on high-DPI displays (compare with Design & Artistry card)
6. Resize viewport between mobile (< 640px) and desktop (> 1100px)
7. **Expected**: browser picks appropriate size per `sizes` attribute; no pixelation

## Ticket #762: Venue Category Tabs

### Changes Made
- **New file** `snippets/ejuno-venue-tabs.liquid`: implements horizontal scrollable tabs (same UX as accommodation tabs)
- `sections/result-grid.liquid` lines 113-118: renders venue tabs when `collection.handle == 'venues'` (or 'venue')

### Test Steps
1. Open **/collections/venues**
2. **Expected**: Chip tabs appear above the grid: "All", "Castle / Historic Property", "Restaurant", "Event Space", "Other"
3. Click each tab
   - **Expected**: URL becomes `/collections/venues/<tag-handle>` (e.g. `/collections/venues/restaurant`)
   - **Expected**: Grid filters to show only venues tagged with that type
4. Scroll horizontally on mobile (< 400px viewport)
   - **Expected**: Tabs scroll smoothly with no visible scrollbar
5. Check that tabs **only appear for present tags**
   - If no product has the `event-space` tag, the "Event Space" chip should not render
6. Ensure Accommodation tabs still work on **/collections/accommodation**

## Regression Checks
- [ ] Other Services Hub cards still display their existing hero assets (Design & Artistry, Entertainment, etc.)
- [ ] Accommodation tabs not broken
- [ ] No console errors on Services Hub or Venues collection

---
Artifact: `/opt/cursor/artifacts/ejuno-reopen-825-762.zip`
