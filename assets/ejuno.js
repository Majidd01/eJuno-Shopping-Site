(function () {
  let closeMobileNav = function () {};

  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-action]');
    if (a) {
      e.preventDefault();
      const m = document.getElementById('modal');
      m.querySelector('.modal-title').textContent = a.dataset.title || 'Prototype interaction';
      m.querySelector('.modal-body').textContent = a.dataset.action;
      m.classList.add('open');
      return;
    }
    const q = e.target.closest('.faq-q');
    if (q && !q.closest('.ejuno-faq')) {
      q.parentElement.classList.toggle('open');
      return;
    }
    const c = e.target.closest('[data-close]');
    if (c) {
      document.getElementById('modal').classList.remove('open');
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.getElementById('modal')?.classList.remove('open');
      closeMobileNav();
    }
  });

  const toggle = document.querySelector('[data-mobile-nav-toggle]');
  const panel = document.getElementById('ejuno-mobile-nav');
  const backdrop = document.querySelector('[data-mobile-nav-backdrop]');
  const closeBtn = document.querySelector('[data-mobile-nav-close]');
  if (!toggle || !panel) return;

  function setMobileNavOpen(open) {
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    panel.hidden = !open;
    if (backdrop) backdrop.hidden = !open;
    document.body.classList.toggle('ejuno-mobile-nav-open', open);
    if (open) {
      document.querySelectorAll('.ejuno-pdp-guide.is-open').forEach((guide) => {
        guide.classList.remove('is-open');
        guide.querySelector('.ejuno-pdp-guide__dialog')?.setAttribute('hidden', '');
        guide.querySelector('.ejuno-pdp-guide__backdrop')?.setAttribute('hidden', '');
        guide.querySelector('[data-guide-open]')?.setAttribute('aria-expanded', 'false');
      });
      document.body.classList.remove('ejuno-pdp-guide-open');
    }
  }

  closeMobileNav = () => {
    if (!panel.hidden) setMobileNavOpen(false);
  };

  toggle.addEventListener('click', () => {
    setMobileNavOpen(panel.hidden);
  });

  closeBtn?.addEventListener('click', () => setMobileNavOpen(false));
  backdrop?.addEventListener('click', () => setMobileNavOpen(false));

  panel.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setMobileNavOpen(false));
  });
})();
