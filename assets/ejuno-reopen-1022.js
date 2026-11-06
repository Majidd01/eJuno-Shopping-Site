/* eJuno reopen fixes, 22 Oct 2026 */
(function () {
  function ready(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  ready(function () {
    // 670: place the open filter panel / account menu below its trigger on mobile
    document.addEventListener('toggle', function (e) {
      var d = e.target;
      if (!d || !d.matches || !d.matches('.ejuno-vendor-filters [data-facet-pill]') || !d.open) return;
      var s = d.querySelector('summary');
      if (s) document.documentElement.style.setProperty('--ej-pill-top', Math.round(s.getBoundingClientRect().bottom + 8) + 'px');
    }, true);
    window.addEventListener('scroll', function () {
      var open = document.querySelector('.ejuno-vendor-filters [data-facet-pill][open]');
      if (open && window.innerWidth < 750) open.open = false;
    }, { passive: true });
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-header-account-toggle]');
      if (!t) return;
      document.documentElement.style.setProperty('--ej-acct-top', Math.round(t.getBoundingClientRect().bottom + 10) + 'px');
    }, true);

    // 656: wedding month from the home search travels to each venue and is shown on the results
    try {
      var qs = new URLSearchParams(location.search);
      var date = qs.get('date');
      var grid = document.querySelector('[data-collection-grid]');
      if (date && /^\d{4}-\d{2}$/.test(date) && grid) {
        var d = new Date(date + '-01T00:00:00');
        var label = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        var note = document.createElement('p');
        note.className = 'ej-date-note';
        note.textContent = 'Wedding month: ' + label + '. Check live availability on each venue\u2019s calendar.';
        grid.parentNode.insertBefore(note, grid);
        var tag = function () {
          grid.querySelectorAll('a.result-card[href*="/products/"]').forEach(function (a) {
            if (a.dataset.ejDate) return;
            var u = new URL(a.href, location.origin); u.searchParams.set('date', date); a.href = u.pathname + u.search; a.dataset.ejDate = '1';
          });
        };
        tag();
        if (window.MutationObserver) new MutationObserver(tag).observe(grid, { childList: true });
      }
    } catch (err) {}
  });
})();
