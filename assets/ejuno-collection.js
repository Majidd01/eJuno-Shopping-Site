(function () {
  function resetFacetPanel(pill) {
    var panel = pill && pill.querySelector('.ejuno-facet-pill__panel');
    if (!panel) return;
    panel.classList.remove('ejuno-facet-pill__panel--fixed');
    panel.style.position = '';
    panel.style.top = '';
    panel.style.left = '';
    panel.style.right = '';
    panel.style.width = '';
    panel.style.maxWidth = '';
    panel.style.zIndex = '';
  }

  function positionFacetPanel(pill) {
    if (window.matchMedia('(max-width: 760px)').matches) return;
    var panel = pill.querySelector('.ejuno-facet-pill__panel');
    if (!panel) return;
    if (!pill.open) {
      resetFacetPanel(pill);
      return;
    }
    var rect = pill.getBoundingClientRect();
    var gutter = 18;
    var maxW = Math.min(340, Math.max(260, window.innerWidth - gutter * 2));
    var left = rect.left;
    if (left + maxW > window.innerWidth - gutter) {
      left = window.innerWidth - gutter - maxW;
    }
    if (left < gutter) left = gutter;
    panel.classList.add('ejuno-facet-pill__panel--fixed');
    panel.style.position = 'fixed';
    panel.style.top = Math.round(rect.bottom + 8) + 'px';
    panel.style.left = Math.round(left) + 'px';
    panel.style.right = 'auto';
    panel.style.width = maxW + 'px';
    panel.style.maxWidth = maxW + 'px';
    panel.style.zIndex = '250';
  }

  function closeAllFacetPills(pills) {
    pills.forEach(function (pill) {
      pill.open = false;
      resetFacetPanel(pill);
    });
  }

  function getFacetForm(root) {
    return (root && root.closest('form')) || document.getElementById('FacetFiltersForm');
  }

  function associateInputsWithForm(scope, form) {
    if (!scope || !form) return;
    if (!form.id) form.id = 'FacetFiltersForm';
    scope.querySelectorAll('input, select, textarea').forEach(function (el) {
      el.setAttribute('form', form.id);
    });
  }

  function normalizePriceFilterValue(value) {
    var raw = String(value == null ? '' : value).trim();
    if (!raw) return '';
    // Trello 793: scientific notation (1e3) means 1000; negatives are never applied.
    if (/^\+?(\d+\.?\d*|\.\d+)e[+-]?\d+$/i.test(raw)) { var sci = Number(raw); return isFinite(sci) && sci >= 0 ? String(sci) : ''; }
    if (/^-/.test(raw)) return '';
    // Allow "1,200.50" / "1200,50" / "$1,200" → major currency units for Shopify.
    var cleaned = raw.replace(/[^\d.,-]/g, '');
    if (!cleaned) return '';
    if (cleaned.indexOf(',') >= 0 && cleaned.indexOf('.') >= 0) {
      cleaned = cleaned.replace(/,/g, '');
    } else if (cleaned.indexOf(',') >= 0 && cleaned.indexOf('.') < 0) {
      var parts = cleaned.split(',');
      cleaned =
        parts.length === 2 && parts[1].length <= 2
          ? parts[0] + '.' + parts[1]
          : cleaned.replace(/,/g, '');
    }
    var num = parseFloat(cleaned);
    if (!isFinite(num) || num < 0) return '';
    return String(num);
  }

  function isPriceFilterParam(name) {
    return (
      name === 'filter.v.price.gte' ||
      name === 'filter.v.price.lte' ||
      /\.price\.(gte|lte)$/.test(name)
    );
  }

  function syncFacetRowEnabledState(root) {
    var desktopRow = root.querySelector('.ejuno-facets__scroll--desktop [data-facets-row]');
    var mobileRow = root.querySelector('[data-facets-mobile-body] [data-facets-row]');
    if (!desktopRow || !mobileRow) return;
    // Desktop pill row is always CSS-hidden; the Filter sheet is the only UI.
    // Keep sheet inputs enabled so min/max price actually submit on Mac/desktop.
    desktopRow.querySelectorAll('[data-facet-input]').forEach(function (input) {
      input.disabled = true;
    });
    mobileRow.querySelectorAll('[data-facet-input]').forEach(function (input) {
      input.disabled = false;
    });
  }

  function collectFacetParams(form, root) {
    var params = new URLSearchParams();
    var multiValues = {};
    var singleValues = {};
    var seenEls = typeof WeakSet !== 'undefined' ? new WeakSet() : null;
    var scopes = [];
    // Prefer the visible Filter sheet row first so price min/max win over hidden duplicates.
    var sheet = document.querySelector('[data-facets-mobile-sheet]');
    if (sheet) scopes.push(sheet);
    if (root) scopes.push(root);
    if (form) scopes.push(form);

    function remember(name, value, allowMulti) {
      if (!name) return;
      var val = String(value == null ? '' : value).trim();
      if (isPriceFilterParam(name)) {
        val = normalizePriceFilterValue(val);
      }
      if (name === 'q' && !val) return;
      if (val === '' && name !== 'q') return;
      if (allowMulti) {
        if (!multiValues[name]) multiValues[name] = [];
        if (multiValues[name].indexOf(val) === -1) multiValues[name].push(val);
        return;
      }
      singleValues[name] = val;
    }

    scopes.forEach(function (scope) {
      if (!scope) return;
      scope.querySelectorAll('input, select, textarea').forEach(function (el) {
        if (!el.name || el.disabled) return;
        if (seenEls) {
          if (seenEls.has(el)) return;
          seenEls.add(el);
        }
        if (el.type === 'search' && el.hasAttribute('data-facet-search')) return;
        if (el.type === 'checkbox' || el.type === 'radio') {
          if (!el.checked) return;
          remember(el.name, el.value, el.type === 'checkbox');
          return;
        }
        remember(el.name, el.value, false);
      });
    });

    // Trello 732 reopen 3 Nov: never swap Min/Max. submitFacetForm() refuses an invalid range instead.
    Object.keys(singleValues).forEach(function (name) {
      params.append(name, singleValues[name]);
    });
    Object.keys(multiValues).forEach(function (name) {
      multiValues[name].forEach(function (val) {
        params.append(name, val);
      });
    });

    return params;
  }

  function submitFacetForm(root) {
    var form = getFacetForm(root);
    if (!form) return;
    var sheet = document.querySelector('[data-facets-mobile-sheet]');
    syncFacetRowEnabledState(root || document);
    associateInputsWithForm(sheet, form);
    associateInputsWithForm(root, form);

    var action = form.getAttribute('action') || window.location.pathname;
    var url = new URL(action, window.location.origin);
    var params = collectFacetParams(form, root);
    // Trello 732 reopen 3 Nov: Min >= Max is never applied (no silent swap); the guard in collection-facets shows why.
    var pg = parseFloat(params.get('filter.v.price.gte')), pl = parseFloat(params.get('filter.v.price.lte'));
    if ((isFinite(pg) && isFinite(pl) && pg >= pl) || (typeof window.ejunoPriceGuardSync === 'function' && window.ejunoPriceGuardSync())) {
      if (typeof window.ejunoPriceGuardSync === 'function') window.ejunoPriceGuardSync();
      return;
    }
    var qs = params.toString();
    window.location.assign(url.pathname + (qs ? '?' + qs : ''));
  }

  function enforcePriceFilterFromUrl(grid) {
    var rootGrid = grid || document.querySelector('[data-collection-grid]');
    if (!rootGrid) return;
    var params = new URLSearchParams(window.location.search);
    var gteRaw = params.get('filter.v.price.gte');
    var lteRaw = params.get('filter.v.price.lte');
    var gte = gteRaw != null && String(gteRaw).trim() !== '' ? Number(normalizePriceFilterValue(gteRaw) || NaN) : NaN;
    var lte = lteRaw != null && String(lteRaw).trim() !== '' ? Number(normalizePriceFilterValue(lteRaw) || NaN) : NaN;
    var hasGte = isFinite(gte);
    var hasLte = isFinite(lte);
    rootGrid.querySelectorAll('.result-card[data-price-cents]').forEach(function (card) {
      if (card.matches('[data-collection-search-empty]')) return;
      var cents = parseInt(card.getAttribute('data-price-cents'), 10);
      if (!isFinite(cents)) {
        card.classList.remove('is-price-filtered-out');
        return;
      }
      var amount = cents / 100;
      var hide =
        (hasGte && amount < gte - 0.0001) || (hasLte && amount > lte + 0.0001);
      card.classList.toggle('is-price-filtered-out', !!hide);
    });
    updateResultsCount(rootGrid);
  }

  function updateResultsCount(grid) {
    var wrap = document.querySelector('[data-results-count-wrap]');
    if (!wrap) return;
    var rootGrid = grid || document.querySelector('[data-collection-grid]');
    if (!rootGrid) return;
    var numEl = wrap.querySelector('[data-results-count]');
    var labelEl = wrap.querySelector('[data-results-label]');
    var more = document.querySelector('[data-load-more-wrap] [data-load-more]');
    var visible = 0;
    var searching = rootGrid.getAttribute('data-ejuno-search-active') === '1';
    rootGrid.querySelectorAll('.result-card').forEach(function (card) {
      if (card.matches('[data-collection-search-empty]')) return;
      if (card.classList.contains('is-price-filtered-out')) return;
      if (searching && card.classList.contains('is-filtered-out')) return;
      visible += 1;
    });
    var count = visible;
    if (more && !searching) {
      var server = parseInt(wrap.getAttribute('data-server-count'), 10);
      if (isFinite(server)) count = Math.max(server, visible);
    }
    if (numEl) numEl.textContent = String(count);
    if (labelEl) labelEl.textContent = count === 1 ? 'result' : 'results';
  }

  window.ejunoUpdateResultsCount = updateResultsCount;

  window.ejunoEnforcePriceFilterFromUrl = enforcePriceFilterFromUrl;

  function isHiddenFacetPill(pill) {
    if (!pill || pill.hasAttribute('data-facet-sort-only')) return true;
    var label = String(pill.getAttribute('data-facet-label') || '').toLowerCase();
    return label === 'availability' || label.indexOf('availability') !== -1 || label === 'out of stock';
  }

  function getPillsToCount(root) {
    // Filter sheet row is the only interactive UI (desktop pill row is CSS-hidden).
    var row =
      root.querySelector('[data-facets-context="mobile"]') ||
      document.querySelector('[data-facets-mobile-sheet] [data-facets-context="mobile"]');
    if (!row) {
      row = root.querySelector('[data-facets-context="desktop"]');
    }
    if (row) return row.querySelectorAll('[data-facet-pill]');
    return root.querySelectorAll('[data-facet-pill]');
  }

  function countPendingSelections(root) {
    var count = 0;
    getPillsToCount(root).forEach(function (pill) {
      if (isHiddenFacetPill(pill)) return;
      var enabledInputs = pill.querySelectorAll('[data-facet-input]:not([data-facet-sort]):not(:disabled)');
      if (!enabledInputs.length) return;
      var checked = pill.querySelectorAll(
        '[data-facet-input]:checked:not([data-facet-sort]):not(:disabled)'
      ).length;
      var hasPriceValue = false;
      pill.querySelectorAll('[data-facet-input][type="number"]:not(:disabled)').forEach(function (input) {
        if (String(input.value || '').trim() !== '') hasPriceValue = true;
      });
      if (checked > 0) {
        count += checked;
      } else if (hasPriceValue) {
        count += 1;
      }
    });
    return count;
  }

  // Trello 670 #1: while open, the Filter sheet is re-parented to <body>; include it so the
  // staged state (pill highlight, "Apply all (n)") is visible before Apply.
  function facetScopeAll(root, selector) {
    var list = Array.prototype.slice.call(root.querySelectorAll(selector));
    var sheet = document.querySelector('[data-facets-mobile-sheet]');
    if (sheet && !root.contains(sheet)) {
      list = list.concat(Array.prototype.slice.call(sheet.querySelectorAll(selector)));
    }
    return list;
  }

  function syncFacetUiState(root) {
    var pills = facetScopeAll(root, '[data-facet-pill]');
    pills.forEach(function (pill) {
      if (pill.hasAttribute('data-facet-sort-only')) return;
      var checked = pill.querySelectorAll('[data-facet-input]:checked:not([data-facet-sort])').length;
      var numbers = pill.querySelectorAll('[data-facet-input][type="number"]');
      var hasPrice = false;
      numbers.forEach(function (n) {
        if (String(n.value || '').trim() !== '') hasPrice = true;
      });
      var pending = checked > 0 || hasPrice;
      pill.classList.toggle('is-pending', pending && !pill.classList.contains('is-active'));
      var badge = pill.querySelector('.ejuno-facet-pill__badge');
      if (badge && checked > 0) badge.textContent = String(checked);
    });

    var mobileCount = root.querySelector('[data-facet-mobile-count]');
    if (mobileCount) {
      var n = countPendingSelections(root);
      var serverAttr = root.getAttribute('data-active-count');
      var serverN = serverAttr != null && serverAttr !== '' ? parseInt(serverAttr, 10) : NaN;
      if (!isNaN(serverN) && !root.classList.contains('has-mobile-drawer-open')) {
        n = serverN;
      }
      mobileCount.textContent = n > 0 ? String(n) : '';
      mobileCount.setAttribute('data-count', String(n));
    }

    facetScopeAll(root, '[data-facets-apply-label]').forEach(function (label) {
      var base = label.getAttribute('data-base-label') || label.textContent.trim() || 'Apply all';
      if (!label.getAttribute('data-base-label')) label.setAttribute('data-base-label', base);
      var n = countPendingSelections(root);
      label.textContent = n > 0 ? base + ' (' + n + ')' : base;
    });
  }

  function initFacetListSearch(root) {
    root.querySelectorAll('[data-facet-search]').forEach(function (input) {
      if (input.dataset.bound) return;
      input.dataset.bound = '1';
      var panel = input.closest('.ejuno-facet-pill__panel');
      var list = panel && panel.querySelector('[data-facet-list]');
      var empty = panel && panel.querySelector('[data-facet-empty-search]');
      if (!list) return;

      input.addEventListener('input', function () {
        var q = String(input.value || '')
          .toLowerCase()
          .trim();
        var visible = 0;
        list.querySelectorAll('[data-facet-list-item]').forEach(function (item) {
          var text = (item.textContent || '').toLowerCase();
          var match = !q || text.indexOf(q) !== -1;
          item.classList.toggle('is-hidden-by-search', !match);
          if (match) visible += 1;
        });
        if (empty) empty.hidden = visible > 0 || !q;
      });
    });
  }

  function clearFacetPanel(pill) {
    pill.querySelectorAll('[data-facet-input]').forEach(function (input) {
      if (input.type === 'checkbox' || input.type === 'radio') {
        input.checked = false;
      } else if (input.type === 'number') {
        input.value = '';
      }
    });
    var sortDefault = pill.closest('[data-facets]');
    if (sortDefault) {
      var defaultRadio = pill.querySelector('[data-facet-sort][value]');
      /* keep sort — reset only clears non-sort in panel via inputs above */
    }
    pill.classList.remove('is-pending');
    // Trello 670 #1: the mobile sheet lives under <body> while open, so closest() can be
    // null; syncing against `document` threw (root.getAttribute is not a function).
    var facetsRoot = pill.closest('[data-facets]') || document.querySelector('[data-facets]');
    if (facetsRoot) syncFacetUiState(facetsRoot);
  }

  function initFacetPanelActions(root) {
    root.querySelectorAll('[data-facet-clear-panel]').forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        var pill = btn.closest('[data-facet-pill]');
        if (!pill) return;
        clearFacetPanel(pill);
        syncFacetUiState(root);
      });
    });

    root.querySelectorAll('[data-facet-apply-panel]').forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        submitFacetForm(root);
      });
    });
  }

  // Trello 670 #1: sort is staged like every other filter; results only change on Apply.
  // (Previously picking a sort option submitted the form immediately, which also applied
  // any half-entered price / unchecked filters.)
  function initSortAutoApply(root) {
    root.querySelectorAll('[data-facet-sort]').forEach(function (radio) {
      if (radio.dataset.bound) return;
      radio.dataset.bound = '1';
      radio.addEventListener('change', function () {
        var pill = radio.closest('[data-facet-pill]');
        if (pill) pill.classList.toggle('is-pending', radio.checked && !pill.classList.contains('is-active'));
        syncFacetUiState(root);
      });
    });
  }

  // Trello 670 #1: Enter / mobile "Go" inside a filter field must not submit the form
  // (that applied filters before Apply). Native submits are swallowed; Apply buttons call
  // submitFacetForm() themselves.
  var stagedSubmitBound = false;
  function initStagedFacetSubmit() {
    // Document-level: the mobile sheet is re-parented to <body> while open.
    if (stagedSubmitBound) return;
    stagedSubmitBound = true;
    function isFacetField(el) {
      return !!(el && el.closest && el.matches && el.matches('[data-facet-input], [data-facet-search]'));
    }
    function onKey(e) {
      if (e.key !== 'Enter' || !isFacetField(e.target)) return;
      e.preventDefault();
      if (e.target.type === 'number' || e.target.type === 'search') e.target.blur();
    }
    document.addEventListener('keydown', onKey, true);
  }

  function initFacetPills(root) {
    var pills = root.querySelectorAll('[data-facet-pill]');
    pills.forEach(function (pill) {
      pill.addEventListener('toggle', function () {
        if (pill.open) {
          pills.forEach(function (other) {
            if (other !== pill && other.open) {
              other.open = false;
              resetFacetPanel(other);
            }
          });
        }
        positionFacetPanel(pill);
      });
    });

    function syncOpenPanels() {
      pills.forEach(function (pill) {
        if (pill.open) positionFacetPanel(pill);
      });
    }

    window.addEventListener('resize', syncOpenPanels);
    window.addEventListener('scroll', syncOpenPanels, true);

    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-facet-pill]')) return;
      if (e.target.closest('[data-facets-mobile-sheet]')) return;
      closeAllFacetPills(pills);
    });

    root.querySelectorAll('.ejuno-facets__apply-all, [data-facets-apply]').forEach(function (applyBtn) {
      applyBtn.addEventListener('click', function (e) {
        e.preventDefault();
        closeAllFacetPills(pills);
        submitFacetForm(root);
      });
    });

    root.querySelectorAll('[data-facet-input]').forEach(function (input) {
      input.addEventListener('change', function () {
        syncFacetUiState(root);
      });
      input.addEventListener('input', function () {
        syncFacetUiState(root);
      });
    });

    syncFacetUiState(root);
  }

  function initMobileFacetDrawer(root) {
    var scroll = root.querySelector('.ejuno-facets__scroll--desktop');
    var body = root.querySelector('[data-facets-mobile-body]');
    var sheet = root.querySelector('[data-facets-mobile-sheet]');
    var backdrop = root.querySelector('[data-facets-mobile-backdrop]');
    var openBtn = root.querySelector('[data-facets-mobile-open]');
    var closeBtn = root.querySelector('[data-facets-mobile-close]');
    var clearBtn = root.querySelector('[data-facets-mobile-clear]');
    var desktopRow = scroll && scroll.querySelector('[data-facets-row]');
    var mobileRow = body && body.querySelector('[data-facets-row]');
    if (!body || !sheet || !openBtn) return;

    // Prefer the row rendered inside the mobile sheet; fall back to moving desktop row.
    var row = mobileRow || desktopRow;
    if (!row) return;

    var sheetHome = sheet.parentNode;
    var backdropHome = backdrop && backdrop.parentNode;
    var usedDesktopMove = !mobileRow && !!desktopRow && !!scroll;

    function closeDrawer() {
      if (usedDesktopMove && desktopRow && scroll && desktopRow.parentNode !== scroll) {
        scroll.appendChild(desktopRow);
      }
      root.classList.remove('has-mobile-drawer-open');
      sheet.hidden = true;
      if (backdrop) backdrop.hidden = true;
      if (sheetHome && sheet.parentNode !== sheetHome) sheetHome.appendChild(sheet);
      if (backdrop && backdropHome && backdrop.parentNode !== backdropHome) {
        backdropHome.appendChild(backdrop);
      }
      openBtn.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('ejuno-facets-open');
      closeAllFacetPills(root.querySelectorAll('[data-facet-pill]'));
    }

    function openDrawer() {
      if (usedDesktopMove && desktopRow && body && desktopRow.parentNode !== body) {
        body.appendChild(desktopRow);
      }
      if (backdrop && backdrop.parentNode !== document.body) document.body.appendChild(backdrop);
      if (sheet.parentNode !== document.body) document.body.appendChild(sheet);
      associateInputsWithForm(sheet, getFacetForm(root));
      syncFacetRowEnabledState(root);
      root.classList.add('has-mobile-drawer-open');
      document.body.classList.add('ejuno-facets-open');
      sheet.hidden = false;
      if (backdrop) backdrop.hidden = false;
      openBtn.setAttribute('aria-expanded', 'true');
      syncFacetUiState(root);
    }

    // Trello 670: delegated open/close so the sheet opens on every tap, even after it was moved or the page came back from cache.
    root.__ejFacetOpen = openDrawer;
    root.__ejFacetClose = closeDrawer;
    if (!window.__ejFacetDrawerBound) {
      window.__ejFacetDrawerBound = true;
      document.addEventListener('click', function (e) {
        var t = e.target && e.target.closest ? e.target : null;
        if (!t) return;
        var o = t.closest('[data-facets-mobile-open]');
        if (o) {
          var r = o.closest('[data-facets]') || document.querySelector('[data-facets]');
          if (r && r.__ejFacetOpen) { e.preventDefault(); r.__ejFacetOpen(); }
          return;
        }
        if (t.closest('[data-facets-mobile-close]') || t.closest('[data-facets-mobile-backdrop]')) {
          e.preventDefault();
          document.querySelectorAll('[data-facets]').forEach(function (r) { if (r.__ejFacetClose && r.classList.contains('has-mobile-drawer-open')) r.__ejFacetClose(); });
        }
      }, true);
      window.addEventListener('pageshow', function (ev) {
        if (!ev.persisted) return;
        document.querySelectorAll('[data-facets]').forEach(function (r) { if (r.__ejFacetClose) r.__ejFacetClose(); });
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        var form = getFacetForm(root);
        var base = form && form.getAttribute('action');
        if (base) window.location.href = base.split('?')[0];
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('has-mobile-drawer-open')) {
        closeDrawer();
      }
    });
  }

  function normalizeSearchText(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function searchTokens(query) {
    var normalized = normalizeSearchText(query);
    if (!normalized) return [];
    return normalized.split(' ').filter(Boolean);
  }

  function initCollectionSearch(toolbar) {
    var grid = document.querySelector('[data-collection-grid]');
    var input = toolbar.querySelector('[data-collection-search-input]');
    if (!grid || !input) return;

    var emptyEl = grid.querySelector('[data-collection-search-empty]');
    var debounceTimer;

    function syncLoadMoreForGrid(visibleCount, tokens, productCardCount) {
      var loadMoreWrap = document.querySelector('[data-load-more-wrap]');
      if (!loadMoreWrap) return;

      var productCards = productCardCount;
      if (typeof productCards !== 'number') {
        productCards = 0;
        grid.querySelectorAll('.result-card').forEach(function (card) {
          if (!card.matches('[data-collection-search-empty]')) productCards += 1;
        });
      }

      var emptyVisible = emptyEl && !emptyEl.hidden;
      var hideLoadMore =
        emptyVisible ||
        (productCards > 0 && visibleCount === 0) ||
        (productCards === 0 && tokens.length > 0);
      loadMoreWrap.hidden = hideLoadMore;
      if (hideLoadMore) {
        loadMoreWrap.style.display = 'none';
      } else {
        loadMoreWrap.style.removeProperty('display');
      }
    }

    var statusEl = toolbar.querySelector('[data-collection-search-status]');
    var noun = /venue/i.test(input.getAttribute('placeholder') || '') ? 'venues' : 'results';
    var nounOne = noun === 'venues' ? 'venue' : 'result';
    var loadingAll = false;

    function setSearchStatus(text) {
      if (!statusEl) return;
      statusEl.textContent = text || '';
      statusEl.hidden = !text;
    }

    /* Trello 656: ?loc= (home hero Location) matches the venue's location field only, not tags like 'lake-view'. */
    var ejLoc = '';
    try { ejLoc = normalizeSearchText(new URLSearchParams(window.location.search).get('loc') || ''); } catch (e) {}
    function ejCardInLocation(card, loc) {
      var raw = card.getAttribute('data-locations');
      if (raw == null || raw === '') {
        return normalizeSearchText(card.getAttribute('data-search-keys') || '').indexOf(loc) !== -1;
      }
      var parts = raw.split('|').map(normalizeSearchText);
      return parts.some(function (l) {
        if (loc === 'italian lakes' || loc === 'lake como') return l.indexOf('lake') !== -1 || l.indexOf('como') !== -1;
        return l === loc || l.indexOf(loc) !== -1;
      });
    }

    function filterCards(tokens) {
      var visible = 0;
      var productCardCount = 0;
      grid.querySelectorAll('.result-card').forEach(function (card) {
        if (card.matches('[data-collection-search-empty]')) return;
        productCardCount += 1;
        var haystack = normalizeSearchText(
          card.getAttribute('data-search-keys') || card.textContent
        );
        var match =
          tokens.length === 0 ||
          tokens.every(function (token) {
            return haystack.indexOf(token) !== -1;
          });
        if (match && ejLoc) match = ejCardInLocation(card, ejLoc);
        card.classList.toggle('is-filtered-out', !match);
        if (match && !card.classList.contains('is-price-filtered-out')) visible += 1;
      });
      return { visible: visible, productCardCount: productCardCount };
    }

    /* QA 19 Oct: newly fetched pages are filtered as they arrive, so unmatched cards never flash. */
    window.ejunoFilterCollectionCards = function () {
      filterCards(searchTokens(input.value));
    };

    function applyCollectionSearch() {
      var tokens = searchTokens(input.value);
      grid.setAttribute('data-ejuno-search-active', tokens.length || ejLoc ? '1' : '');
      var res = filterCards(tokens);
      var needAll =
        (tokens.length || ejLoc) &&
        !grid.dataset.ejunoAllLoaded &&
        !grid.dataset.ejunoAllLoadFailed &&
        document.querySelector('[data-load-more-wrap] [data-load-more]');

      if (needAll || loadingAll) {
        if (emptyEl) emptyEl.hidden = true;
        setSearchStatus('Searching all ' + noun + '\u2026');
        if (!loadingAll) {
          loadingAll = true;
          grid.classList.add('is-searching-all');
          grid.setAttribute('aria-busy', 'true');
          loadAllCollectionPages().then(function (ok) {
            loadingAll = false;
            grid.classList.remove('is-searching-all');
            grid.removeAttribute('aria-busy');
            if (ok) grid.dataset.ejunoAllLoaded = '1';
            else grid.dataset.ejunoAllLoadFailed = '1';
            applyCollectionSearch();
          });
        }
        return;
      }

      if (emptyEl) {
        var showEmpty = (tokens.length > 0 || !!ejLoc) && res.visible === 0 && res.productCardCount > 0;
        emptyEl.hidden = !showEmpty;
      }
      if (tokens.length && res.visible > 0) {
        setSearchStatus(
          res.visible + ' ' + (res.visible === 1 ? nounOne : noun) + ' match \u201c' + input.value.trim() + '\u201d'
        );
      } else if (ejLoc && res.visible > 0) {
        var locLabel = new URLSearchParams(window.location.search).get('loc');
        if (/italian lakes/i.test(locLabel)) locLabel = 'Lake Como';
        setSearchStatus(res.visible + ' ' + (res.visible === 1 ? nounOne : noun) + ' in ' + locLabel);
      } else {
        setSearchStatus('');
      }

      syncLoadMoreForGrid(res.visible, ejLoc ? [ejLoc].concat(tokens) : tokens, res.productCardCount);
      updateResultsCount(grid);
    }

    window.ejunoApplyCollectionSearch = applyCollectionSearch;

    // Trello 656: prefill from ?q= (home hero location filter) and apply it.
    try {
      var urlQ = new URLSearchParams(window.location.search).get('q');
      if (urlQ && !input.value.trim()) {
        input.value = urlQ;
        applyCollectionSearch();
      }
    } catch (err) {}

    input.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(applyCollectionSearch, 120);
    });

    // Trello 793: an empty search explains what to type instead of doing nothing.
    function submitSearch() {
      applyCollectionSearch();
      if (!input.value.trim() && !ejLoc) setSearchStatus('Type a venue, service or location in the search box, e.g. \u201cTuscany\u201d or \u201cvilla\u201d.');
    }
    toolbar.querySelectorAll('[data-collection-search-btn]').forEach(function (searchBtn) {
      searchBtn.addEventListener('click', submitSearch);
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitSearch();
      }
    });

    applyCollectionSearch();
  }

  function bindCollectionLoadMore(btn) {
    if (!btn || btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      if (btn.getAttribute('aria-busy') === 'true') return;
      var href = btn.getAttribute('data-href') || btn.getAttribute('href');
      if (!href) return;
      var root = btn.closest('.ejuno-collection-toolbar') || btn.closest('.container') || document;
      var grid = root.querySelector('[data-collection-grid]');
      var wrap = btn.closest('[data-load-more-wrap]');
      if (!grid || !wrap) return;
      var loading = btn.getAttribute('data-loading-more') || 'Loading…';
      var defaultLabel = btn.getAttribute('data-load-more') || btn.textContent;
      btn.textContent = loading;
      btn.setAttribute('aria-busy', 'true');
      btn.disabled = true;
      fetch(href, { credentials: 'same-origin' })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.text();
        })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var seenKeys = {};
          grid.querySelectorAll('.result-card').forEach(function (c) {
            var k = resultCardKey(c);
            if (k) seenKeys[k] = true;
          });
          var cards = doc.querySelectorAll('[data-collection-grid] .result-card');
          cards.forEach(function (card) {
            if (card.matches('[data-collection-search-empty]')) return;
            var k = resultCardKey(card);
            if (k && seenKeys[k]) return;
            if (k) seenKeys[k] = true;
            grid.appendChild(card);
          });
          enforcePriceFilterFromUrl(grid);
          if (typeof window.ejunoApplyCollectionSearch === 'function') {
            window.ejunoApplyCollectionSearch();
          }
          var nextBtn = doc.querySelector('[data-load-more]');
          updateSearchShowingRange(grid, !nextBtn);
          var nextHref =
            nextBtn && (nextBtn.getAttribute('data-href') || nextBtn.getAttribute('href'));
          if (nextHref) {
            btn.setAttribute('data-href', nextHref);
            btn.textContent = defaultLabel;
            btn.disabled = false;
            btn.removeAttribute('aria-busy');
          } else {
            wrap.remove();
          }
        })
        .catch(function () {
          btn.textContent = defaultLabel;
          btn.disabled = false;
          btn.removeAttribute('aria-busy');
        });
    });
  }

  /* Trello 567: keep "Showing 1–N" in sync as Show more appends results */
  function updateSearchShowingRange(grid, done) {
    var el = document.querySelector('[data-search-showing]');
    if (!el || !grid) return;
    var endEl = el.querySelector('[data-search-showing-end]');
    if (!endEl) return;
    var start = parseInt(el.getAttribute('data-start'), 10) || 1;
    var total = parseInt(el.getAttribute('data-total'), 10) || 0;
    var cards = 0;
    grid.querySelectorAll('.result-card').forEach(function (card) {
      if (!card.matches('[data-collection-search-empty]')) cards += 1;
    });
    var end = start - 1 + cards;
    if (done || (total && end > total)) end = total || end;
    endEl.textContent = String(end);
  }

  /* Trello 567: collection search must cover the whole collection, not only loaded cards.
     Loads remaining pages (same paginated collection URL) once, then filters client-side. */
  var loadAllPromise = null;

  function resultCardKey(card) {
    var href = card.getAttribute('href');
    if (!href) {
      var a = card.querySelector('a[href]');
      href = a ? a.getAttribute('href') : '';
    }
    return String(href || '').split('?')[0];
  }

  function loadAllCollectionPages() {
    if (loadAllPromise) return loadAllPromise;
    var btn = document.querySelector('[data-load-more-wrap] [data-load-more]');
    var grid = document.querySelector('[data-collection-grid]');
    if (!btn || !grid) return Promise.resolve(false);
    var wrap = btn.closest('[data-load-more-wrap]');
    var href = btn.getAttribute('data-href') || btn.getAttribute('href');
    var seen = {};
    grid.querySelectorAll('.result-card').forEach(function (card) {
      var k = resultCardKey(card);
      if (k) seen[k] = true;
    });
    btn.setAttribute('aria-busy', 'true');
    btn.disabled = true;

    function appendFrom(doc) {
      doc.querySelectorAll('[data-collection-grid] .result-card').forEach(function (card) {
        if (card.matches('[data-collection-search-empty]')) return;
        var key = resultCardKey(card);
        if (key && seen[key]) return;
        if (key) seen[key] = true;
        grid.appendChild(card);
      });
    }
    function afterBatch() {
      enforcePriceFilterFromUrl(grid);
      if (typeof window.ejunoFilterCollectionCards === 'function') window.ejunoFilterCollectionCards();
    }
    function fetchDoc(url) {
      return fetch(url, { credentials: 'same-origin' })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.text();
        })
        .then(function (html) {
          return new DOMParser().parseFromString(html, 'text/html');
        });
    }
    function sequential(url, guard) {
      if (!url || guard > 60) return Promise.resolve(true);
      return fetchDoc(url).then(function (doc) {
        appendFrom(doc);
        afterBatch();
        var nextBtn = doc.querySelector('[data-load-more]');
        var nextHref = nextBtn && (nextBtn.getAttribute('data-href') || nextBtn.getAttribute('href'));
        return sequential(nextHref, guard + 1);
      });
    }
    /* QA 19 Oct: fetch the remaining pages in parallel through the Section Rendering API
       (only the grid section's HTML), keeping filters/sort from the next-page URL. */
    function parallel() {
      var sid = grid.getAttribute('data-section-id');
      var total = parseInt(grid.getAttribute('data-total-pages'), 10) || 0;
      var cur = parseInt(grid.getAttribute('data-current-page'), 10) || 1;
      if (!sid || !href || total <= cur) return sequential(href, 0);
      var pages = [];
      for (var n = cur + 1; n <= total && n <= cur + 60; n++) pages.push(n);
      var docs = [];
      var done = [];
      var flushed = 0;
      var next = 0;
      function urlFor(page) {
        var u = new URL(href, window.location.origin);
        u.searchParams.set('page', String(page));
        u.searchParams.set('section_id', sid);
        return u.pathname + u.search;
      }
      function flush() {
        while (flushed < pages.length && done[flushed]) {
          appendFrom(docs[flushed]);
          docs[flushed] = null;
          flushed += 1;
        }
        afterBatch();
      }
      function worker() {
        if (next >= pages.length) return Promise.resolve();
        var i = next++;
        return fetchDoc(urlFor(pages[i])).then(function (doc) {
          docs[i] = doc;
          done[i] = true;
          flush();
          return worker();
        });
      }
      var workers = [];
      for (var w = 0; w < Math.min(4, pages.length); w++) workers.push(worker());
      return Promise.all(workers).then(function () {
        return true;
      }).catch(function () {
        return sequential(href, 0);
      });
    }

    loadAllPromise = parallel()
      .then(function () {
        if (wrap) wrap.remove();
        afterBatch();
        updateResultsCount(grid);
        return true;
      })
      .catch(function () {
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
        return false;
      });
    return loadAllPromise;
  }
  window.ejunoLoadAllCollectionPages = loadAllCollectionPages;

  function initCollectionLoadMore() {
    document.querySelectorAll('[data-load-more]').forEach(bindCollectionLoadMore);
  }

  function initFacetsRoot(root) {
    initFacetPills(root);
    initFacetListSearch(root);
    initFacetPanelActions(root);
    initSortAutoApply(root);
    initStagedFacetSubmit(root);
    initMobileFacetDrawer(root);

    syncFacetRowEnabledState(root);

    var form = getFacetForm(root);
    if (form && !form.dataset.ejunoFacetSubmitBound) {
      form.dataset.ejunoFacetSubmitBound = '1';
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        // Trello 670 #1: only an explicit Apply submits; implicit submits (Enter in a
        // price field, mobile keyboard "Go") keep the selection staged.
        var by = e.submitter;
        if (by && by.matches && by.matches('[data-facet-apply-panel], [data-facets-apply], .ejuno-facets__apply-all')) {
          submitFacetForm(root);
        }
      });
    }
  }

  /* Trello 793 #4: Shopify's price filter matches any variant, the cards show the "from" price.
     With a price filter on, load every page, drop the cards outside the range, then show them
     page by page so the count and the cards always agree. */
  function initPriceFilterPaging() {
    var grid = document.querySelector('.ejuno-collection-toolbar [data-collection-grid]');
    var btn = document.querySelector('[data-load-more-wrap] [data-load-more]');
    if (!grid || !btn) return;
    var p = new URLSearchParams(window.location.search);
    if (!normalizePriceFilterValue(p.get('filter.v.price.gte')) && !normalizePriceFilterValue(p.get('filter.v.price.lte'))) return;
    var per = parseInt(grid.getAttribute('data-per-page'), 10) || 12;
    var label = btn.getAttribute('data-load-more') || 'Show more';
    var shown = per;
    function cards() {
      return Array.prototype.filter.call(grid.querySelectorAll('.result-card'), function (c) {
        return !c.matches('[data-collection-search-empty]') && !c.classList.contains('is-price-filtered-out') && !c.classList.contains('is-filtered-out');
      });
    }
    function paint() {
      var list = cards();
      list.forEach(function (c, i) { c.classList.toggle('is-page-hidden', i >= shown); });
      var more = grid.parentNode.querySelector('[data-ej-price-more]');
      if (list.length > shown) {
        if (!more) {
          more = document.createElement('div');
          more.className = 'ejuno-load-more'; more.setAttribute('data-ej-price-more', '');
          more.innerHTML = '<button type="button" class="btn secondary ejuno-load-more__btn"></button>';
          more.firstChild.textContent = label;
          more.firstChild.addEventListener('click', function () { shown += per; paint(); });
          grid.parentNode.insertBefore(more, grid.nextSibling);
        }
      } else if (more) { more.remove(); }
      updateResultsCount(grid);
    }
    grid.classList.add('is-searching-all');
    if (btn.closest('[data-load-more-wrap]')) btn.closest('[data-load-more-wrap]').hidden = true;
    loadAllCollectionPages().then(function () {
      grid.classList.remove('is-searching-all');
      if (grid.getAttribute('data-ejuno-search-active') === '1') { grid.querySelectorAll('.is-page-hidden').forEach(function (c) { c.classList.remove('is-page-hidden'); }); return; }
      paint();
    });
  }

  function init() {
    var toolbar = document.querySelector('.ejuno-collection-toolbar');
    if (toolbar) {
      toolbar.querySelectorAll('[data-facets]').forEach(initFacetsRoot);
      initCollectionSearch(toolbar);
    }
    initCollectionLoadMore();
    enforcePriceFilterFromUrl();
    initPriceFilterPaging();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', init);
})();
