(function () {
  function initVendorMarketplace(root) {
    if (!root || root.dataset.bound === '1') return;
    root.dataset.bound = '1';

    var grid = root.querySelector('[data-vendor-grid]');
    var tabs = root.querySelector('[data-vendor-tabs]');
    var searchInput = root.querySelector('[data-vendor-search]');
    var searchBtn = root.querySelector('[data-vendor-search-btn]');
    var loadingEl = root.querySelector('[data-vendor-loading]');
    var categoryPill = root.querySelector('[data-vendor-category-pill]');
    var categoryList = root.querySelector('[data-vendor-category-list]');
    var categoryLabel = root.querySelector('[data-vendor-category-label]');
    var regionPill = root.querySelector('[data-vendor-region-pill]');
    var regionList = root.querySelector('[data-vendor-region-list]');
    var regionLabel = root.querySelector('[data-vendor-region-label]');
    var currentRegion = 'all';
    var loadWrap = root.querySelector('[data-vendor-load-wrap]');
    var loadBtn = root.querySelector('[data-vendor-load-more]');
    var loadMeta = root.querySelector('[data-vendor-load-meta]');

    if (!grid || !tabs) return;

    var BASE_URL = root.getAttribute('data-api-base') || 'https://ejuno-dev.skylinxtech.co/api/vendors';
    var detailBase = root.getAttribute('data-detail-url') || '/pages/vendor-detail?id=';
    var featuredVendorId =
      root.getAttribute('data-featured-vendor-id') || '69e9087bed415e607ba5961c';
    var autoLoadAll = root.getAttribute('data-auto-load-all') !== 'false';
    var PAGE_LIMIT = 20;

    var blockedNames = [
      "oliver's travels",
      'ejuno developers',
      'ejuno',
      'tst memoona ramzan',
      'tst-john doe',
      'tst memoona',
    ];

    function freshState() {
      return {
        page: 0,
        nextPage: 1,
        vendors: [],
        loaded: false,
        fullyLoaded: false,
        loading: false,
        hasMore: true,
        totalVendors: null,
        error: null,
      };
    }

    var tabState = {
      all: freshState(),
      Service: freshState(),
      Venue: freshState(),
      'Product Vendor': freshState(),
    };

    var currentTab = 'all';
    var currentSubfilter = 'all';
    var currentSearch = '';

    function buildUrl(type, page, limit) {
      var params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (type !== 'all') params.set('type', type);
      return BASE_URL + '?' + params.toString();
    }

    function filterVendor(vendor) {
      var vendorName = (vendor.name || '').trim().toLowerCase();
      return blockedNames.indexOf(vendorName) === -1;
    }

    // Trello 665: one spelling per category (display only; source data unchanged).
    var CATEGORY_ALIASES = {
      'gifts & flavors': 'Gifts & Flavours',
      'gifts & flavours': 'Gifts & Flavours',
      'party decors and supplies': 'Party Décor & Supplies',
      'party decor and supplies': 'Party Décor & Supplies'
    };
    // Trello 675: spelling fixes from the client review (display only; please also correct them in the eJuno backend).
    var NAME_FIXES = [
      [/\bProvate Chef\b/i, 'Private Chef'],
      [/\bMua &/g, 'MUA &'],
      [/^['\u2018\u2019`]+/, '']
    ];
    function fixVendorName(str) {
      var s = String(str || '');
      NAME_FIXES.forEach(function (f) { s = s.replace(f[0], f[1]); });
      return s;
    }
    function normalizeCategory(label) {
      var key = String(label || '').trim();
      return CATEGORY_ALIASES[key.toLowerCase()] || key;
    }

    // Trello 665: show names consistently capitalised when the source is all lower/upper case.
    function displayName(str) {
      var s = String(str || '').trim();
      if (!s) return s;
      return s.split(/(\s+)/).map(function (w) {
        if (!/[a-z\u00e0-\u00ff]/i.test(w)) return w;
        if (w === w.toUpperCase() || w === w.toLowerCase()) {
          w = w.toLowerCase();
          return w.charAt(0).toUpperCase() + w.slice(1);
        }
        return w;
      }).join('');
    }

    function getVendorSubcategory(vendor) {
      var type = vendor.type || '';
      if (type === 'Service') return normalizeCategory(vendor.serviceType || '');
      if (type === 'Product Vendor') return normalizeCategory(vendor.mainProductCategory || '');
      return '';
    }

    // Trello 665: regions come from the vendor's city / service-area list ("Tuscany,Rome,...").
    // Only known Italian regions/destinations are offered; spelling variants map to one label.
    var REGION_MAP = {
      abruzzo: 'Abruzzo', amalficoast: 'Amalfi Coast', aostavalley: 'Aosta Valley', apulia: 'Puglia', puglia: 'Puglia',
      basilicata: 'Basilicata', calabria: 'Calabria', campania: 'Campania', cinqueterre: 'Cinque Terre',
      'dolomites&alps': 'Dolomites & Alps', dolomites: 'Dolomites & Alps', emiliaromagna: 'Emilia Romagna',
      firenze: 'Florence', florence: 'Florence', friuli: 'Friuli', lakecomo: 'Lake Como', lakegarda: 'Lake Garda',
      lakemaggiore: 'Lake Maggiore', lazio: 'Lazio', lemarche: 'Marche', marche: 'Marche', liguria: 'Liguria',
      lombardy: 'Lombardy', milano: 'Milan', milan: 'Milan', molise: 'Molise', piedmont: 'Piedmont', rimini: 'Rimini',
      rome: 'Rome', roma: 'Rome', sardinia: 'Sardinia', sardinien: 'Sardinia', sicily: 'Sicily', trentino: 'Trentino',
      tuscany: 'Tuscany', umbria: 'Umbria', veneto: 'Veneto', venice: 'Venice', venezia: 'Venice',
      somewhereelseinitaly: 'Elsewhere in Italy'
    };
    function getVendorRegions(vendor) {
      var raw = [];
      if (vendor.city) raw = raw.concat(String(vendor.city).split(','));
      if (Array.isArray(vendor.serviceAreas)) {
        vendor.serviceAreas.forEach(function (a) {
          if (typeof a === 'string') raw = raw.concat(a.split(','));
          else if (a && (a.name || a.region || a.city)) raw.push(a.name || a.region || a.city);
        });
      }
      var out = [];
      raw.forEach(function (r) {
        var key = String(r || '').toLowerCase().replace(/\s+/g, '');
        var label = REGION_MAP[key];
        if (label && out.indexOf(label) === -1) out.push(label);
      });
      return out;
    }

    function escapeHtml(str) {
      var div = document.createElement('div');
      div.textContent = str == null ? '' : String(str);
      return div.innerHTML;
    }

    function placeholderImage() {
      return root.getAttribute('data-placeholder-image') || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop&crop=center';
    }

    function mergeVendors(state, incoming) {
      var seen = {};
      state.vendors.forEach(function (v) {
        seen[v._id] = true;
      });
      incoming.filter(filterVendor).forEach(function (v) {
        if (!v._id || seen[v._id]) return;
        state.vendors.push(v);
        seen[v._id] = true;
      });
    }

    function canFeatureFirst() {
      return (
        currentTab === 'all' &&
        currentSubfilter === 'all' &&
        !currentSearch.trim()
      );
    }

    function vendorApiRoot() {
      return BASE_URL.replace(/\/vendors\/?$/, '');
    }

    function orderedVendors(vendors) {
      if (!canFeatureFirst() || !featuredVendorId) return vendors;
      var list = vendors.slice();
      var idx = -1;
      for (var i = 0; i < list.length; i += 1) {
        if (list[i]._id === featuredVendorId) {
          idx = i;
          break;
        }
      }
      if (idx > 0) {
        list.unshift(list.splice(idx, 1)[0]);
      }
      return list;
    }

    async function ensureFeaturedVendor(state) {
      if (!featuredVendorId || root.dataset.featuredVendorFail === '1') return;
      for (var i = 0; i < state.vendors.length; i += 1) {
        if (state.vendors[i]._id === featuredVendorId) return;
      }
      try {
        var res = await fetch(
          vendorApiRoot() + '/vendors/' + encodeURIComponent(featuredVendorId)
        );
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var payload = await res.json();
        var data = payload && payload.data;
        if (!data || !data._id || !filterVendor(data)) return;
        state.vendors.unshift(data);
      } catch (err) {
        root.dataset.featuredVendorFail = '1';
      }
    }

    function createVendorCard(vendor, featured) {
      var name = fixVendorName(displayName(vendor.name)) || 'Unnamed Vendor';
      var companyName = fixVendorName(displayName(vendor.companyName)) || name;
      var type = vendor.type || 'Service';
      var typeLabel = type === 'Product Vendor' ? 'Product vendor' : type;
      // Trello 665: the large first card leads with the wider cover photo instead of a close-up portrait.
      var image = featured
        ? vendor.coverPhoto || vendor.profilePhoto || placeholderImage()
        : vendor.profilePhoto || vendor.coverPhoto || placeholderImage();
      var id = vendor._id;
      var subcategory = getVendorSubcategory(vendor);

      var link = document.createElement('a');
      link.href = detailBase + encodeURIComponent(id);
      link.className = 'result-card' + (featured ? ' featured-result' : '');
      link.dataset.vendorType = type;
      link.dataset.vendorSubcategory = subcategory;
      link.dataset.vendorRegions = '|' + getVendorRegions(vendor).join('|') + '|';
      link.dataset.vendorName = (name + ' ' + companyName).toLowerCase();

      // Review p12: business name large, the person's name small.
      var metaParts = [];
      if (subcategory) metaParts.push(subcategory);
      if (type !== 'Product Vendor') metaParts.push(typeLabel);
      var personHtml =
        companyName && companyName !== name
          ? '<div class="result-card__person">' + escapeHtml(name) + '</div>'
          : '';

      var tagsHtml = '';
      // Trello 675: the category is already in the meta line, so no second tag.

      link.innerHTML =
        '<img src="' +
        escapeHtml(image) +
        '" alt="' +
        escapeHtml(companyName) +
        '" loading="' +
        (featured ? 'eager' : 'lazy') +
        '">' +
        '<div class="result-body">' +
        '<h3 class="result-card__title">' +
        escapeHtml(companyName) +
        '</h3>' +
        personHtml +
        '<div class="result-meta">' +
        escapeHtml(metaParts.join(' · ').replace(/\bJewelry\b/g, 'Jewellery')) +
        '</div>' +
        tagsHtml +
        '</div>';

      var img = link.querySelector('img');
      if (img) {
        img.onerror = function () {
          img.src = placeholderImage();
        };
      }
      return link;
    }

    function setLoadingVisible(state) {
      if (!loadingEl) return;
      loadingEl.hidden = !(state.loading && state.vendors.length === 0);
    }

    function clearGrid() {
      grid.innerHTML = '';
    }

    async function fetchPage(type) {
      var state = tabState[type];
      if (state.loading || !state.hasMore) return false;
      state.loading = true;
      setLoadingVisible(state);
      state.error = null;
      var page = state.nextPage;
      try {
        var res = await fetch(buildUrl(type, page, PAGE_LIMIT));
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var result = await res.json();
        if (!result.status || !result.data || !Array.isArray(result.data.vendors)) {
          throw new Error('Invalid response');
        }
        if (result.data.totalVendors != null) {
          state.totalVendors = result.data.totalVendors;
        }
        mergeVendors(state, result.data.vendors);
        state.page = page;
        var totalPages = result.data.totalPages || 1;
        state.nextPage = page + 1;
        state.hasMore = page < totalPages;
        return true;
      } catch (e) {
        console.error('Vendor fetch error:', e);
        state.error = e.message || 'Failed to load vendors';
        state.hasMore = false;
        return false;
      } finally {
        state.loading = false;
        setLoadingVisible(state);
      }
    }

    async function loadTab(type, loadAll) {
      var state = tabState[type];
      if (state.fullyLoaded) {
        renderTab();
        return;
      }

      if (!state.loaded) {
        if (type === 'all') await ensureFeaturedVendor(state);
        await fetchPage(type);
        if (type === 'all') await ensureFeaturedVendor(state);
        state.loaded = true;
        renderTab();
      }

      if (loadAll && autoLoadAll) {
        while (state.hasMore) {
          await fetchPage(type);
          renderTab();
        }
        state.fullyLoaded = true;
      }

      setLoadingVisible(state);
      renderTab();
    }

    function setCategoryLabel(text) {
      if (categoryLabel) categoryLabel.textContent = text || 'Category';
    }

    function buildSubfilters() {
      currentSubfilter = 'all';
      setCategoryLabel('Category');
      if (categoryPill) categoryPill.classList.remove('is-active');

      if (!categoryPill || !categoryList) return;
      if (currentTab === 'all') {
        categoryPill.hidden = true;
        categoryList.innerHTML = '';
        return;
      }

      var subcategories = {};
      tabState[currentTab].vendors.forEach(function (v) {
        var sub = getVendorSubcategory(v);
        if (sub) subcategories[sub] = true;
      });
      var keys = Object.keys(subcategories).sort();
      if (keys.length <= 1) {
        categoryPill.hidden = true;
        categoryList.innerHTML = '';
        return;
      }

      categoryList.innerHTML = '';
      var allBtn = document.createElement('button');
      allBtn.type = 'button';
      allBtn.className = 'ejuno-facet-pill__option is-selected';
      allBtn.dataset.value = 'all';
      allBtn.textContent = 'All categories';
      categoryList.appendChild(allBtn);

      keys.forEach(function (sub) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ejuno-facet-pill__option';
        btn.dataset.value = sub;
        btn.textContent = sub;
        categoryList.appendChild(btn);
      });

      categoryPill.hidden = false;
    }

    function buildRegionFilter() {
      if (!regionPill || !regionList) return;
      var counts = {};
      tabState[currentTab].vendors.forEach(function (v) {
        getVendorRegions(v).forEach(function (r) { counts[r] = (counts[r] || 0) + 1; });
      });
      var keys = Object.keys(counts).sort(function (a, b) {
        if (a === 'Elsewhere in Italy') return 1;
        if (b === 'Elsewhere in Italy') return -1;
        return a.localeCompare(b);
      });
      if (!keys.length) {
        regionPill.hidden = true;
        regionList.innerHTML = '';
        currentRegion = 'all';
        return;
      }
      if (currentRegion !== 'all' && !counts[currentRegion]) currentRegion = 'all';
      regionList.innerHTML = '';
      var allBtn = document.createElement('button');
      allBtn.type = 'button';
      allBtn.className = 'ejuno-facet-pill__option' + (currentRegion === 'all' ? ' is-selected' : '');
      allBtn.dataset.value = 'all';
      allBtn.textContent = 'All regions';
      regionList.appendChild(allBtn);
      keys.forEach(function (r) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ejuno-facet-pill__option' + (currentRegion === r ? ' is-selected' : '');
        btn.dataset.value = r;
        btn.textContent = r;
        regionList.appendChild(btn);
      });
      if (regionLabel) regionLabel.textContent = currentRegion === 'all' ? 'Region' : currentRegion;
      regionPill.classList.toggle('is-active', currentRegion !== 'all');
      regionPill.hidden = false;
    }

    function initVendorFacetPills() {
      var pills = root.querySelectorAll('[data-facet-pill]');
      pills.forEach(function (pill) {
        pill.addEventListener('toggle', function () {
          if (!pill.open) return;
          pills.forEach(function (other) {
            if (other !== pill) other.open = false;
          });
        });
      });

      if (categoryList) {
        categoryList.addEventListener('click', function (e) {
          var btn = e.target.closest('.ejuno-facet-pill__option');
          if (!btn) return;
          currentSubfilter = btn.dataset.value || 'all';
          categoryList.querySelectorAll('.ejuno-facet-pill__option').forEach(function (el) {
            el.classList.toggle('is-selected', el === btn);
          });
          if (currentSubfilter === 'all') {
            setCategoryLabel('Category');
            if (categoryPill) categoryPill.classList.remove('is-active');
          } else {
            setCategoryLabel(currentSubfilter);
            if (categoryPill) categoryPill.classList.add('is-active');
          }
          if (categoryPill) categoryPill.open = false;
          applyFilters();
        });
      }

      if (regionList) {
        regionList.addEventListener('click', function (e) {
          var btn = e.target.closest('.ejuno-facet-pill__option');
          if (!btn) return;
          currentRegion = btn.dataset.value || 'all';
          regionList.querySelectorAll('.ejuno-facet-pill__option').forEach(function (el) {
            el.classList.toggle('is-selected', el === btn);
          });
          if (regionLabel) regionLabel.textContent = currentRegion === 'all' ? 'Region' : currentRegion;
          if (regionPill) {
            regionPill.classList.toggle('is-active', currentRegion !== 'all');
            regionPill.open = false;
          }
          applyFilters();
        });
      }

      document.addEventListener('click', function (e) {
        if (!root.contains(e.target)) return;
        if (e.target.closest('[data-facet-pill]')) return;
        pills.forEach(function (pill) {
          pill.open = false;
        });
      });
    }

    function applyFilters() {
      var cards = grid.querySelectorAll('.result-card');
      var visibleCount = 0;
      var searchTerm = currentSearch.trim().toLowerCase();
      cards.forEach(function (link) {
        var sub = link.dataset.vendorSubcategory || '';
        var vendorName = link.dataset.vendorName || '';
        var matchesSub = currentSubfilter === 'all' || sub === currentSubfilter;
        var matchesSearch = !searchTerm || vendorName.indexOf(searchTerm) !== -1;
        var regions = link.dataset.vendorRegions || '';
        var matchesRegion = currentRegion === 'all' || regions.indexOf('|' + currentRegion + '|') !== -1;
        var visible = matchesSub && matchesSearch && matchesRegion;
        link.classList.toggle('is-filtered-out', !visible);
        if (visible) visibleCount += 1;
      });

      var noResults = grid.querySelector('[data-vendor-no-results]');
      if (visibleCount === 0 && cards.length > 0) {
        if (!noResults) {
          noResults = document.createElement('p');
          noResults.className = 'ejuno-vendor-marketplace__state';
          noResults.dataset.vendorNoResults = '';
          grid.appendChild(noResults);
        }
        noResults.textContent = searchTerm
          ? 'No vendors match “' + searchTerm + '”.'
          : 'No vendors match this filter.';
        noResults.hidden = false;
      } else if (noResults) {
        noResults.remove();
      }

      if (loadWrap) loadWrap.hidden = !!searchTerm;
      // Trello 665: the "Showing N vendors" line follows the filtered cards.
      updateLoadMore();
    }

    function updateLoadMore() {
      if (loadBtn) loadBtn.hidden = true;
      if (!loadWrap || !loadMeta) return;
      var state = tabState[currentTab];
      var shown = state.vendors.length;
      var total = state.totalVendors != null ? state.totalVendors : shown;
      var ejFiltered = currentSubfilter !== 'all' || currentRegion !== 'all' || !!currentSearch.trim();
      if (ejFiltered) {
        var ejVisible = grid.querySelectorAll('.result-card:not(.is-filtered-out)').length;
        var ejSfx = state.loading && shown ? ' · loading more…' : '';
        loadMeta.textContent = 'Showing ' + ejVisible + ' ' + (ejVisible === 1 ? 'vendor' : 'vendors') + ejSfx;
        loadWrap.hidden = !shown;
        return;
      }
      var suffix = state.loading && shown ? ' · loading more…' : '';
      var canLoadMore = autoLoadAll ? false : state.hasMore && !state.fullyLoaded;
      if (!canLoadMore && total > shown) {
        total = shown;
      }
      loadMeta.textContent =
        'Showing ' + shown + (canLoadMore && total > shown ? ' of ' + total : '') + ' vendors' + suffix;
      loadWrap.hidden = !shown || !!currentSearch.trim();
    }

    function renderTab() {
      var state = tabState[currentTab];
      setLoadingVisible(state);

      if (state.error && !state.vendors.length) {
        clearGrid();
        grid.innerHTML =
          '<p class="ejuno-vendor-marketplace__state">Could not load vendors. Please refresh the page.</p>';
        if (loadWrap) loadWrap.hidden = true;
        return;
      }

      if (!state.loaded || (state.loading && !state.vendors.length)) {
        clearGrid();
        return;
      }

      clearGrid();

      if (state.vendors.length === 0) {
        grid.innerHTML = '<p class="ejuno-vendor-marketplace__state">No vendors found.</p>';
        if (loadWrap) loadWrap.hidden = true;
        return;
      }

      var featureFirst = canFeatureFirst();
      var vendorsToShow = orderedVendors(state.vendors);
      vendorsToShow.forEach(function (vendor, index) {
        var isFeatured =
          featureFirst &&
          index === 0 &&
          (!featuredVendorId || vendor._id === featuredVendorId);
        grid.appendChild(createVendorCard(vendor, isFeatured));
      });
      buildSubfilters();
      buildRegionFilter();
      applyFilters();
      updateLoadMore();
    }

    tabs.addEventListener('click', function (e) {
      var tab = e.target.closest('[data-vendor-tab]');
      if (!tab) return;
      tabs.querySelectorAll('[data-vendor-tab]').forEach(function (t) {
        t.classList.remove('is-active');
      });
      tab.classList.add('is-active');
      if (categoryPill) categoryPill.open = false;
      currentTab = tab.getAttribute('data-vendor-tab') || 'all';
      currentSubfilter = 'all';
      currentSearch = '';
      if (searchInput) searchInput.value = '';
      loadTab(currentTab, true);
    });

    initVendorFacetPills();

    function runSearchFromInput() {
      if (!searchInput) return;
      currentSearch = searchInput.value;
      applyFilters();
      updateLoadMore();
    }

    if (searchInput) {
      searchInput.addEventListener('input', runSearchFromInput);
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          runSearchFromInput();
        }
      });
    }

    if (searchBtn) {
      searchBtn.addEventListener('click', runSearchFromInput);
    }

    if (loadBtn) {
      loadBtn.addEventListener('click', async function () {
        await fetchPage(currentTab);
        if (!tabState[currentTab].hasMore) {
          tabState[currentTab].fullyLoaded = true;
        }
        renderTab();
      });
    }

    loadingEl && (loadingEl.hidden = false);
    loadTab('all', true);
  }

  function boot() {
    document.querySelectorAll('[data-ejuno-vendor-marketplace]').forEach(initVendorMarketplace);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('shopify:section:load', boot);
})();
