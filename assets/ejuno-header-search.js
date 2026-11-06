(function () {
  var STORAGE_KEY = 'ejuno_recent_searches';
  var MAX_RECENT = 8;
  var suggestTimer;
  var OPEN_MS = 380;
  var DEFAULT_SUGGESTIONS = [
    { title: 'Venues in Italy', url: '/collections/venues' },
    { title: 'Wedding services', url: '/pages/all-services' },
    { title: 'Plan your wedding', url: '/pages/plan-your-wedding' },
    { title: 'Shop wedding décor', url: '/collections/all' }
  ];

  function normalizeQuery(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function readRecent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) return [];
      return list
        .map(function (item) {
          return normalizeQuery(item);
        })
        .filter(Boolean);
    } catch (e) {
      return [];
    }
  }

  function writeRecent(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
    } catch (e) {}
  }

  function rememberQuery(query) {
    var q = normalizeQuery(query);
    if (!q) return;
    var list = readRecent().filter(function (item) {
      return item.toLowerCase() !== q.toLowerCase();
    });
    list.unshift(q);
    writeRecent(list);
  }

  function renderRecent(panel) {
    var wrap = panel.querySelector('[data-ejuno-header-search-recent]');
    var listEl = panel.querySelector('[data-ejuno-header-search-recent-list]');
    if (!wrap || !listEl) return;

    var recent = readRecent();
    listEl.innerHTML = '';
    if (!recent.length) {
      wrap.hidden = true;
      return;
    }

    recent.forEach(function (query) {
      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = query;
      btn.setAttribute('data-ejuno-recent-query', query);
      li.appendChild(btn);
      listEl.appendChild(li);
    });
    wrap.hidden = false;
  }

  function clearSuggest(panel) {
    var wrap = panel.querySelector('[data-ejuno-header-search-suggest]');
    var listEl = panel.querySelector('[data-ejuno-header-search-suggest-list]');
    if (wrap) wrap.hidden = true;
    if (listEl) listEl.innerHTML = '';
  }

  function renderSuggest(panel, items) {
    var wrap = panel.querySelector('[data-ejuno-header-search-suggest]');
    var listEl = panel.querySelector('[data-ejuno-header-search-suggest-list]');
    if (!wrap || !listEl) return;

    listEl.innerHTML = '';
    if (!items || !items.length) {
      wrap.hidden = true;
      return;
    }

    items.forEach(function (item) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = item.url;
      a.textContent = item.title;
      li.appendChild(a);
      listEl.appendChild(li);
    });
    wrap.hidden = false;
  }

  function renderDefaultSuggestions(panel) {
    renderSuggest(panel, DEFAULT_SUGGESTIONS);
  }

  function refreshSearchPanel(panel) {
    if (!panel) return;
    var input = panel.querySelector('[data-ejuno-header-search-input]');
    var value = input ? normalizeQuery(input.value) : '';
    renderRecent(panel);
    if (!value) {
      renderDefaultSuggestions(panel);
    } else if (value.length < 2) {
      renderDefaultSuggestions(panel);
    } else {
      fetchSuggestions(panel, value);
    }
  }

  function fetchSuggestions(panel, query) {
    var q = normalizeQuery(query);
    if (q.length < 2) {
      renderDefaultSuggestions(panel);
      return;
    }

    var url =
      '/search/suggest.json?q=' +
      encodeURIComponent(q) +
      '&resources[type]=product,collection&resources[limit]=6&resources[options][unavailable_products]=hide';

    fetch(url, { credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) throw new Error('suggest failed');
        return res.json();
      })
      .then(function (data) {
        var resources = (data && data.resources) || {};
        var results = (resources.results && resources.results.products) || [];
        var collections = (resources.results && resources.results.collections) || [];
        var pages = (resources.results && resources.results.pages) || [];
        var articles = (resources.results && resources.results.articles) || [];
        var items = []
          .concat(
            results.map(function (p) {
              return { title: p.title, url: p.url };
            })
          )
          .concat(
            collections.map(function (c) {
              return { title: c.title, url: c.url };
            })
          )
          .concat(
            pages.map(function (p) {
              return { title: p.title, url: p.url };
            })
          )
          .concat(
            articles.map(function (a) {
              return { title: a.title, url: a.url };
            })
          )
          .slice(0, 8);
        renderSuggest(panel, items);
      })
      .catch(function () {
        clearSuggest(panel);
      });
  }

  function getPanel() {
    return document.querySelector('[data-ejuno-header-search-panel]');
  }

  function getHeader() {
    return document.querySelector('.ejuno-header .header');
  }

  // Trello 670 #2: phones/tablets. The on-screen keyboard resizes the visual viewport and
  // iOS scrolls the page to reveal the focused field, so those events must never close search.
  function isTouchLayout() {
    try {
      return (
        window.matchMedia('(max-width: 760px)').matches ||
        window.matchMedia('(hover: none) and (pointer: coarse)').matches
      );
    } catch (e) {
      return false;
    }
  }

  var openedAt = 0;
  var openScrollY = 0;

  function isOpen() {
    var panel = getPanel();
    return panel && panel.classList.contains('is-open');
  }

  function setExpandedState(expanded) {
    document.querySelectorAll('[data-ejuno-header-search-toggle]').forEach(function (btn) {
      btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });
  }

  function closeSearch() {
    var panel = getPanel();
    var header = getHeader();
    if (!panel || !panel.classList.contains('is-open')) return;

    panel.classList.remove('is-open');
    if (header) header.classList.remove('ejuno-header-search-active');
    setExpandedState(false);
    clearSuggest(panel);

    var done = false;
    var finish = function () {
      if (done) return;
      done = true;
      panel.setAttribute('hidden', '');
      panel.setAttribute('aria-hidden', 'true');
      panel.removeEventListener('transitionend', onTransition);
    };

    var onTransition = function (e) {
      if (e.target !== panel) return;
      finish();
    };

    panel.addEventListener('transitionend', onTransition);
    window.setTimeout(finish, OPEN_MS + 80);
  }

  function openSearch(focusInput) {
    var panel = getPanel();
    var header = getHeader();
    if (!panel) return;

    if (typeof window.ejunoCloseHeaderAccountMenus === 'function') {
      window.ejunoCloseHeaderAccountMenus();
    }

    panel.removeAttribute('hidden');
    panel.setAttribute('aria-hidden', 'false');
    openedAt = Date.now();
    openScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;

    if (header) header.classList.add('ejuno-header-search-active');
    setExpandedState(true);
    refreshSearchPanel(panel);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        panel.classList.add('is-open');
        refreshSearchPanel(panel);
      });
    });

    if (focusInput) {
      var input = panel.querySelector('[data-ejuno-header-search-input]');
      if (input) {
        // iOS Safari only raises the keyboard for a focus() made synchronously inside the
        // tap handler, so focus now (the panel is already display:grid, just transparent).
        try {
          input.focus({ preventScroll: true });
        } catch (e) {
          input.focus();
        }
        window.setTimeout(function () {
          if (isOpen() && document.activeElement !== input) {
            try {
              input.focus({ preventScroll: true });
            } catch (e) {
              input.focus();
            }
          }
        }, 280);
      }
    }
  }

  function toggleSearch() {
    if (isOpen()) {
      closeSearch();
    } else {
      var mobileClose = document.querySelector('[data-mobile-nav-close]');
      if (mobileClose) mobileClose.click();
      openSearch(true);
    }
  }

  function init() {
    var panel = getPanel();
    if (!panel) return;

    var form = panel.querySelector('[data-ejuno-header-search-form]');
    var input = panel.querySelector('[data-ejuno-header-search-input]');

    document.querySelectorAll('[data-ejuno-header-search-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        toggleSearch();
      });
    });

    panel.querySelectorAll('[data-ejuno-header-search-close]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        closeSearch();
      });
    });

    if (form && input) {
      form.addEventListener('submit', function () {
        rememberQuery(input.value);
      });

      input.addEventListener('input', function () {
        clearTimeout(suggestTimer);
        var value = input.value;
        renderRecent(panel);
        suggestTimer = setTimeout(function () {
          fetchSuggestions(panel, value);
        }, 220);
      });

      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          rememberQuery(input.value);
        }
      });
    }

    panel.addEventListener('click', function (e) {
      var recentBtn = e.target.closest('[data-ejuno-recent-query]');
      if (recentBtn && form && input) {
        e.preventDefault();
        input.value = recentBtn.getAttribute('data-ejuno-recent-query') || '';
        rememberQuery(input.value);
        form.submit();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) {
        closeSearch();
      }
    });

    document.addEventListener(
      'pointerdown',
      function (e) {
        if (!isOpen()) return;
        if (!e.isPrimary && e.pointerType === 'touch') return;
        if (Date.now() - openedAt < 400) return;
        if (e.target.closest('[data-ejuno-header-search-panel]')) return;
        if (e.target.closest('[data-ejuno-header-search-toggle]')) return;
        if (e.target.closest('.ejuno-header-search-slot')) return;
        closeSearch();
      },
      true
    );

    // Desktop only: close after a real page scroll. Never on touch layouts (keyboard
    // open/close, iOS scroll-into-view, visualViewport resize all fire scroll events),
    // never for scrolls inside the panel or other scrollers, never while typing.
    var scrollCloseTimer = 0;
    window.addEventListener(
      'scroll',
      function (e) {
        if (!isOpen()) return;
        var t = e && e.target;
        if (t && t !== document && t !== window && t !== document.documentElement && t !== document.body) return;
        if (isTouchLayout()) return;
        if (Date.now() - openedAt < 600) return;
        if (input && document.activeElement === input && normalizeQuery(input.value)) return;
        window.clearTimeout(scrollCloseTimer);
        scrollCloseTimer = window.setTimeout(function () {
          var y = window.pageYOffset || document.documentElement.scrollTop || 0;
          if (isOpen() && Math.abs(y - openScrollY) > 120) closeSearch();
        }, 80);
      },
      { passive: true, capture: true }
    );
  }

  window.ejunoCloseHeaderSearch = closeSearch;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
