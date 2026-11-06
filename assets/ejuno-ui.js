/* eJuno UI helpers (client review, Oct 2026): fade-in on scroll, region photo zoom, planning-app note. */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function appNotes() {
    // Trello 677 removed the note; Trello 670 keeps it under Open Checklist and Open Guest List only.
    var links = Array.prototype.filter.call(document.querySelectorAll('#MainContent a.btn[href*="/couple-dashboard"]'), function (a) {
      return /^\s*Open (Checklist|Guest List)\s*$/i.test(a.textContent);
    });
    Array.prototype.forEach.call(links, function (a, i) {
      if (a.dataset.ejAppNote) return;
      a.dataset.ejAppNote = '1';
      var note = document.createElement('span');
      note.className = 'ej-app-note ej-app-note--keep';
      note.id = 'ej-app-note-' + i;
      note.textContent = 'Opens the eJuno planning app, where you sign in or create your account.';
      var bg = window.getComputedStyle(a.parentElement).color;
      if (/rgb\(2[2-5]\d, 2[2-5]\d, 2[2-5]\d\)/.test(bg)) note.className += ' ej-app-note--light';
      a.setAttribute('aria-describedby', note.id);
      // Trello 670: in a flex header row keep the button and its note together so the row stays aligned.
      var pcs = window.getComputedStyle(a.parentElement);
      if (pcs.display.indexOf('flex') !== -1 && pcs.flexDirection.indexOf('row') === 0) {
        var wrap = document.createElement('span');
        wrap.className = 'ej-app-cta';
        a.parentElement.insertBefore(wrap, a);
        wrap.appendChild(a);
      }
      a.insertAdjacentElement('afterend', note);
    });
  }

  function reveal() {
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-inview');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    // Region tiles: slow zoom when they come into view (CSS handles reduced motion).
    document.querySelectorAll('.homepage-regions--tiles .region-card').forEach(function (el) { io.observe(el); });

    if (reduce) return;
    document.documentElement.classList.add('ej-motion');
    var vh = window.innerHeight || 800;
    var sel = '#MainContent .section-head, #MainContent .region-row, #MainContent .tools-grid, #MainContent .journal-row, #MainContent .full-banner, #MainContent .plan-tools';
    /* Trello 790 (5 Nov): result grids are no longer faded in. A tall grid (e.g. 39 venues) can never be 12% on screen, so it stayed at opacity 0 and showed no cards. */
    document.querySelectorAll(sel).forEach(function (el) {
      if (el.closest('.home-hero-live')) return;
      if (el.getBoundingClientRect().top < vh) return; // already visible on load: never hide it
      el.classList.add('ej-reveal');
      io.observe(el);
    });
  }

  // Trello 660: iOS ignores :active on links without a touch listener; mirror the pressed state with a class.
  function tapStates() {
    document.addEventListener('touchstart', function (e) {
      var b = e.target.closest && e.target.closest('.btn');
      if (b) b.classList.add('is-pressed');
    }, { passive: true });
    ['touchend', 'touchcancel'].forEach(function (ev) {
      document.addEventListener(ev, function () {
        document.querySelectorAll('.btn.is-pressed').forEach(function (b) {
          setTimeout(function () { b.classList.remove('is-pressed'); }, 150);
        });
      }, { passive: true });
    });
  }

  function boot() { appNotes(); reveal(); tapStates(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
