(function () {
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function formatDate(dateString) {
    if (!dateString) return 'Date not set';
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch (e) {
      return 'Date not set';
    }
  }

  function coupleDisplayName(couple) {
    var a =
      [couple.firstName, couple.lastName].filter(Boolean).join(' ').trim() || 'Couple';
    var b =
      [couple.partnerFirstName, couple.partnerLastName].filter(Boolean).join(' ').trim() ||
      'Partner';
    return a + ' & ' + b;
  }

  function coupleInitials(couple) {
    var letters =
      ((couple.firstName && couple.firstName.charAt(0)) || '') +
      ((couple.partnerFirstName && couple.partnerFirstName.charAt(0)) || '');
    return (letters || '?').toUpperCase();
  }

  function weddingDate(couple) {
    if (couple.events && couple.events[0] && couple.events[0].dates && couple.events[0].dates[0]) {
      return couple.events[0].dates[0];
    }
    return couple.wedding && couple.wedding.weddingDate;
  }

  function initCoupleSearch(root) {
    if (!root || root.dataset.bound === '1') return;
    root.dataset.bound = '1';

    var input = root.querySelector('[data-couple-search-input]');
    var btn = root.querySelector('[data-couple-search-btn]');
    var results = root.querySelector('[data-couple-search-results]');
    var status = root.querySelector('[data-couple-search-status]');
    if (!input || !results) return;

    var apiBase =
      root.getAttribute('data-api-base') || 'https://ejuno-dev.skylinxtech.co/api/couples/public';
    var websiteBase =
      root.getAttribute('data-website-base') || 'https://ejuno-staging.web.app/wedding-planning/';
    var minLen = parseInt(root.getAttribute('data-min-chars') || '2', 10);
    var debounceMs = parseInt(root.getAttribute('data-debounce') || '400', 10);
    var debounceTimer;

    function setStatus(message, visible) {
      if (!status) return;
      status.textContent = message || '';
      status.hidden = !visible;
    }

    function clearResults() {
      results.innerHTML = '';
      results.hidden = true;
      setStatus('', false);
    }

    function hasPublicWebsite(couple) {
      var slug = couple.wedding && couple.wedding.url;
      return !!(slug && String(slug).trim());
    }

    function filterCouplesWithWebsite(couples) {
      return couples.filter(hasPublicWebsite);
    }

    function renderResults(couples, total) {
      couples = filterCouplesWithWebsite(couples);
      if (!couples.length) {
        results.innerHTML =
          '<p class="ejuno-couple-search__empty">No couples matched that name. Try another spelling.</p>';
        results.hidden = false;
        setStatus('', false);
        return;
      }

      var meta =
        total != null && total !== couples.length
          ? 'Showing ' + couples.length + ' of ' + total + ' matches'
          : couples.length === 1
            ? '1 match'
            : couples.length + ' matches';

      results.innerHTML =
        '<p class="ejuno-couple-search__meta">' +
        escapeHtml(meta) +
        '</p>' +
        couples
          .map(function (couple) {
            var slug = couple.wedding && couple.wedding.url;
            var websiteUrl = websiteBase.replace(/\/?$/, '/') + encodeURIComponent(slug);
            var photo = couple.profilePhoto || couple.coverPhoto;
            var initials = coupleInitials(couple);

            var action =
              '<a class="btn primary ejuno-couple-search__cta" href="' +
              escapeHtml(websiteUrl) +
              '" target="_blank" rel="noopener">View website & registry</a>';

            return (
              '<article class="ejuno-couple-search__card">' +
              '<div class="ejuno-couple-search__avatar">' +
              (photo
                ? '<img src="' +
                  escapeHtml(photo) +
                  '" alt="" loading="lazy" width="64" height="64">'
                : '<span aria-hidden="true">' +
                  escapeHtml(initials) +
                  '</span>') +
              '</div>' +
              '<div class="ejuno-couple-search__body">' +
              '<h3 class="ejuno-couple-search__name">' +
              escapeHtml(coupleDisplayName(couple)) +
              '</h3>' +
              '<p class="ejuno-couple-search__date"><strong>Wedding date</strong> ' +
              escapeHtml(formatDate(weddingDate(couple))) +
              '</p>' +
              '</div>' +
              '<div class="ejuno-couple-search__action">' +
              action +
              '</div>' +
              '</article>'
            );
          })
          .join('');

      results.hidden = false;
      setStatus('', false);
    }

    function runSearch() {
      var query = input.value.trim();
      if (query.length < minLen) {
        clearResults();
        if (query.length) {
          setStatus('Type at least ' + minLen + ' characters to search.', true);
        }
        return;
      }

      setStatus('Searching…', true);
      results.hidden = false;
      results.innerHTML = '<p class="ejuno-couple-search__loading">Searching couples…</p>';

      var url =
        apiBase.replace(/\/?$/, '') +
        (apiBase.indexOf('?') === -1 ? '?q=' : '&q=') +
        encodeURIComponent(query);

      fetch(url)
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function (payload) {
          var data = payload && payload.data;
          var list = (data && data.couples) || [];
          var total = data && data.totalCouples;
          renderResults(list, total);
        })
        .catch(function () {
          results.innerHTML =
            '<p class="ejuno-couple-search__empty">Could not load results. Please try again.</p>';
          results.hidden = false;
          setStatus('', false);
        });
    }

    function scheduleSearch() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(runSearch, debounceMs);
    }

    input.addEventListener('input', scheduleSearch);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(debounceTimer);
        runSearch();
      }
    });
    if (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        clearTimeout(debounceTimer);
        runSearch();
      });
    }

    var params = new URLSearchParams(window.location.search);
    var initial = params.get('q');
    if (initial) {
      input.value = initial;
      runSearch();
    }
  }

  function boot() {
    document.querySelectorAll('[data-ejuno-couple-search]').forEach(initCoupleSearch);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('shopify:section:load', boot);
})();
