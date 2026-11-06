(function () {
  function setPanelHeight(item, panel, open) {
    if (!panel) return;
    if (open) {
      panel.hidden = false;
      panel.style.maxHeight = panel.scrollHeight + 'px';
    } else {
      panel.style.maxHeight = '0px';
    }
  }

  function closeItem(item) {
    if (!item) return;
    item.classList.remove('open');
    var btn = item.querySelector('.faq-q');
    var panel = item.querySelector('.faq-a');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    setPanelHeight(item, panel, false);
    if (panel) {
      panel.addEventListener(
        'transitionend',
        function te(e) {
          if (e.propertyName === 'max-height' && !item.classList.contains('open')) {
            panel.hidden = true;
          }
          panel.removeEventListener('transitionend', te);
        },
        { once: true }
      );
    }
  }

  function bindAccordion(scope) {
    if (!scope) return;
    scope.querySelectorAll('.faq-item').forEach(function (item) {
      if (item.dataset.ejunoFaqBound) return;
      item.dataset.ejunoFaqBound = '1';
      var btn = item.querySelector('.faq-q');
      var panel = item.querySelector('.faq-a');
      if (!btn || !panel) return;

      btn.setAttribute('aria-expanded', 'false');
      panel.hidden = true;
      panel.style.maxHeight = '0px';

      btn.addEventListener('click', function () {
        var willOpen = !item.classList.contains('open');
        var root = item.closest('[data-ejuno-faq]') || scope;
        root.querySelectorAll('.faq-item.open').forEach(function (other) {
          if (other !== item) closeItem(other);
        });
        item.classList.toggle('open', willOpen);
        btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        setPanelHeight(item, panel, willOpen);
        if (!willOpen) closeItem(item);
      });
    });
  }

  function bindTabs(root) {
    var tabs = root.querySelectorAll('[data-faq-tab]');
    if (!tabs.length) return;

    tabs.forEach(function (tab) {
      if (tab.dataset.ejunoFaqTabBound) return;
      tab.dataset.ejunoFaqTabBound = '1';
      tab.addEventListener('click', function () {
        var key = tab.getAttribute('data-faq-tab');
        tabs.forEach(function (btn) {
          var active = btn === tab;
          btn.classList.toggle('is-active', active);
          btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        root.querySelectorAll('[data-faq-panel]').forEach(function (panel) {
          var match = panel.getAttribute('data-faq-panel') === key;
          panel.classList.toggle('is-hidden', !match);
          if (match) {
            panel.removeAttribute('hidden');
          } else {
            panel.setAttribute('hidden', 'hidden');
            panel.querySelectorAll('.faq-item.open').forEach(closeItem);
          }
        });
      });
    });
  }

  function initEjunoFaq(root) {
    if (!root) return;
    bindTabs(root);
    bindAccordion(root);
  }

  function initAll() {
    document.querySelectorAll('.ejuno-faq, [data-ejuno-faq]').forEach(initEjunoFaq);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  window.initEjunoFaq = initEjunoFaq;
})();
