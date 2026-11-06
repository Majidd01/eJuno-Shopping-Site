/**
 * Trello #827 - Incorrect Range Order Displayed in Checklist
 * 
 * Problem: Dynamic checklist rebuild emits "24–12 months" (descending)
 *          but should emit "12–24 months" (ascending per ticket)
 * 
 * Scope: sections/checklist-2.liquid build() function labels only
 *        - Does NOT change stage list order (farther-from-wedding first)
 *        - Does NOT change date window meaning
 *        - Preserves special labels ("Final month", "Wedding week")
 *        - Preserves "12+ months" style for first stage
 * 
 * Source Guard:
 *   sections/checklist-2.liquid
 *   Size: 6344 bytes
 *   SHA256: a5cee2673f6d85ebfa4dfebf74aa170bfb23016ade91ae24b40b0126c7bff32f
 */

/**
 * ORIGINAL CODE (lines 47-50):
 * 
 *   var from = Math.min(s.from, total);
 *   var label = s.label || (fmt(from) + '\u2013' + fmt(s.to) + ' months');
 *   if (!s.label && s.from === 24) label = (total >= 12 ? fmt(total) : fmt(from)) + '\u201312 months';
 * 
 * ISSUE: from > to (e.g., 24 > 12), so label is "24–12" (descending)
 */

/**
 * FIXED CODE:
 * 
 *   var from = Math.min(s.from, total);
 *   var lo = Math.min(from, s.to), hi = Math.max(from, s.to);
 *   var label = s.label || (fmt(lo) + '\u2013' + fmt(hi) + ' months');
 *   if (!s.label && s.from === 24) label = (total >= 12 ? '12' : fmt(lo)) + '+' + ' months';
 * 
 * CHANGES:
 *   1. Compute lo/hi to ensure ascending order
 *   2. First stage shows "12+ months" format (matches static HTML)
 */

const ORIGINAL_BUILD_LABEL = `var from = Math.min(s.from, total);
      var label = s.label || (fmt(from) + '\\u2013' + fmt(s.to) + ' months');
      if (!s.label && s.from === 24) label = (total >= 12 ? fmt(total) : fmt(from)) + '\\u201312 months';`;

const FIXED_BUILD_LABEL = `var from = Math.min(s.from, total);
      var lo = Math.min(from, s.to), hi = Math.max(from, s.to);
      var label = s.label || (fmt(lo) + '\\u2013' + fmt(hi) + ' months');
      if (!s.label && s.from === 24) label = (total >= 12 ? '12' : fmt(lo)) + '+ months';`;

function formatRange(from, to, hasLabel, isFirst, total) {
  if (hasLabel) return null;
  
  var adjustedFrom = Math.min(from, total);
  var lo = Math.min(adjustedFrom, to);
  var hi = Math.max(adjustedFrom, to);
  
  if (isFirst && from === 24) {
    return (total >= 12 ? '12' : lo.toString()) + '+ months';
  }
  
  return lo + '–' + hi + ' months';
}

function formatRangeOriginal(from, to, hasLabel, isFirst, total) {
  if (hasLabel) return null;
  
  var adjustedFrom = Math.min(from, total);
  
  if (isFirst && from === 24) {
    return (total >= 12 ? total : adjustedFrom) + '–12 months';
  }
  
  return adjustedFrom + '–' + to + ' months';
}

module.exports = {
  ORIGINAL_BUILD_LABEL,
  FIXED_BUILD_LABEL,
  formatRange,
  formatRangeOriginal
};
