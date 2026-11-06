(function () {
  function updateNav(track, nav, prev, next) {
    if (!track || !nav || !prev || !next) return;
    var cards = track.querySelectorAll('.result-card');
    if (cards.length < 2) {
      nav.hidden = true;
      return;
    }
    nav.hidden = false;
    var maxScroll = track.scrollWidth - track.clientWidth - 2;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= maxScroll;
  }

  function scrollTrack(track, delta) {
    if (!track) return;
    track.scrollBy({ left: delta, behavior: 'smooth' });
  }

  function equalizeRecCardHeights(track) {
    if (!track) return;
    var cards = track.querySelectorAll('.result-card');
    if (cards.length < 2) return;

    cards.forEach(function (card) {
      card.style.minHeight = '';
    });

    var maxH = 0;
    cards.forEach(function (card) {
      maxH = Math.max(maxH, card.getBoundingClientRect().height);
    });
    if (maxH <= 0) return;

    var px = Math.ceil(maxH) + 'px';
    cards.forEach(function (card) {
      card.style.minHeight = px;
    });
  }

  function bindSlider(root) {
    var track = root.querySelector('[data-rec-track]');
    var nav = root.querySelector('[data-rec-nav]');
    var prev = root.querySelector('[data-rec-prev]');
    var next = root.querySelector('[data-rec-next]');
    if (!track) return;

    var scrollAmount = function () {
      var card = track.querySelector('.result-card');
      return card ? card.offsetWidth + 16 : 320;
    };

    prev?.addEventListener('click', function () {
      scrollTrack(track, -scrollAmount());
    });
    next?.addEventListener('click', function () {
      scrollTrack(track, scrollAmount());
    });

    track.addEventListener('scroll', function () {
      updateNav(track, nav, prev, next);
    }, { passive: true });

    window.addEventListener('resize', function () {
      equalizeRecCardHeights(track);
      updateNav(track, nav, prev, next);
    });

    equalizeRecCardHeights(track);
    updateNav(track, nav, prev, next);

    track.querySelectorAll('.result-card img').forEach(function (img) {
      if (img.complete) return;
      img.addEventListener('load', function () {
        equalizeRecCardHeights(track);
      }, { once: true });
    });
  }

  function fetchRecommendations(root) {
    var url = root.getAttribute('data-rec-url');
    var track = root.querySelector('[data-rec-track]');
    if (!url || !track || track.querySelector('.result-card')) return;

    fetch(url)
      .then(function (res) {
        return res.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var freshTrack = doc.querySelector('[data-rec-track]');
        if (!freshTrack) return;
        var cards = freshTrack.querySelectorAll('.result-card');
        if (!cards.length) return;
        track.innerHTML = '';
        cards.forEach(function (card) {
          track.appendChild(card);
        });
        bindSlider(root);
        equalizeRecCardHeights(track);
      })
      .catch(function () {});
  }

  function init() {
    document.querySelectorAll('[data-ejuno-pdp-rec]').forEach(function (root) {
      bindSlider(root);
      fetchRecommendations(root);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', function (e) {
    var root = e.target.querySelector('[data-ejuno-pdp-rec]') || e.target.closest('[data-ejuno-pdp-rec]');
    if (root) {
      bindSlider(root);
      fetchRecommendations(root);
    }
  });
})();
