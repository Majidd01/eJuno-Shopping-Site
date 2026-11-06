(function () {
  function placeAddonsSection() {
    var panel = document.getElementById('cdp-addons-panel');
    if (!panel) return;
    // Don't relocate while add-ons are shown inside the open dates modal.
    if (
      document.body.classList.contains('ejuno-dates-open') &&
      panel.classList.contains('cdp-addons-in-modal')
    ) {
      return;
    }
    var pdpMount = document.getElementById('ejuno-addons-mount');
    if (pdpMount && panel.parentNode === pdpMount) {
      panel.dataset.ejunoAddonsPlaced = '1';
      panel.classList.add('cdp-addons-section');
      return;
    }
    var productView = panel.closest('.productView');
    var calendar = panel.closest('.products_details_calender');
    panel.classList.add('cdp-addons-section');
    panel.classList.remove('cdp-addons-in-modal');
    var titleEl = panel.querySelector('.cdp-addons-title');
    if (titleEl) titleEl.textContent = 'Add-ons';
    if (pdpMount) {
      pdpMount.appendChild(panel);
      panel.dataset.ejunoAddonsPlaced = '1';
    } else if (productView) {
      productView.insertAdjacentElement('afterend', panel);
      panel.dataset.ejunoAddonsPlaced = '1';
    } else if (calendar) {
      calendar.insertAdjacentElement('afterend', panel);
      panel.dataset.ejunoAddonsPlaced = '1';
    } else {
      return;
    }
    var anchor = panel;
    var reserve = document.getElementById('book-me-container');
    var highlights = document.getElementById('highlights-section');
    if (reserve && !document.querySelector('.ejuno-pdp')) {
      reserve.classList.add('cdp-reserve-after-addons');
      anchor.insertAdjacentElement('afterend', reserve);
      anchor = reserve;
    }
    if (highlights) {
      highlights.classList.add('cdp-highlights-after-addons');
      anchor.insertAdjacentElement('afterend', highlights);
    }
  }

  var descriptionTooltip;
  function showDescriptionTooltip(element) {
    if (descriptionTooltip) descriptionTooltip.remove();
    descriptionTooltip = document.createElement('div');
    descriptionTooltip.className = 'cdp-addon-description-tooltip';
    descriptionTooltip.textContent = element.textContent.trim();
    document.body.appendChild(descriptionTooltip);
    var rect = element.getBoundingClientRect();
    var tipRect = descriptionTooltip.getBoundingClientRect();
    var left = Math.max(12, Math.min(rect.left, window.innerWidth - tipRect.width - 12));
    var top = rect.top - tipRect.height - 9;
    if (top < 12) top = rect.bottom + 9;
    descriptionTooltip.style.left = left + 'px';
    descriptionTooltip.style.top = top + 'px';
  }

  function hideDescriptionTooltip() {
    if (descriptionTooltip) descriptionTooltip.remove();
    descriptionTooltip = null;
  }

  function selectedVariant() {
    if (typeof window.resolveSelectedVariant === 'function') return window.resolveSelectedVariant();
    var details = window.productDetails;
    if (!details || !Array.isArray(details.variants)) return null;
    var id = new URLSearchParams(location.search).get('variant');
    return details.variants.find(function (v) { return v.id == id || v.variantId == id; }) || details.variants[0];
  }

  function normalizeVideoUrl(video) {
    if (!video) return '';
    if (typeof video === 'string') return video.trim();
    return String(video.url || video.src || video.videoUrl || '').trim();
  }

  function getCdpAddonMediaItems(addon) {
    if (!addon) return [];
    var items = [];
    var seen = {};
    var images = Array.isArray(addon.images) ? addon.images.filter(Boolean) : [];
    var videos = Array.isArray(addon.videos) ? addon.videos : [];
    images.forEach(function (src) {
      var url = String(src || '').trim();
      if (!url || seen[url]) return;
      seen[url] = true;
      items.push({ type: 'image', src: url });
    });
    videos.forEach(function (video) {
      var url = normalizeVideoUrl(video);
      if (!url || seen[url]) return;
      seen[url] = true;
      items.push({ type: 'video', src: url });
    });
    return items;
  }

  function pauseStageVideo(stageMedia) {
    if (!stageMedia) return;
    var video = stageMedia.querySelector('video');
    if (video) {
      try { video.pause(); } catch (e) { /* ignore */ }
    }
  }

  function openGallery(addon) {
    var items = getCdpAddonMediaItems(addon);
    if (!items.length) return;

    var index = 0;
    var previousOverflow = document.body.style.overflow;
    var modal = document.createElement('div');
    modal.className = 'cdp-addon-gallery';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', (addon.title || 'Add-on') + ' media');
    modal.innerHTML =
      '<div class="cdp-addon-gallery__dialog">' +
        '<div class="cdp-addon-gallery__header">' +
          '<div><strong class="cdp-addon-gallery__title"></strong><span class="cdp-addon-gallery__counter"></span></div>' +
          '<button type="button" class="cdp-addon-gallery__close" aria-label="Close gallery">&times;</button>' +
        '</div>' +
        '<div class="cdp-addon-gallery__stage">' +
          '<button type="button" class="cdp-addon-gallery__arrow cdp-addon-gallery__prev" aria-label="Previous">&lsaquo;</button>' +
          '<div class="cdp-addon-gallery__media"></div>' +
          '<button type="button" class="cdp-addon-gallery__arrow cdp-addon-gallery__next" aria-label="Next">&rsaquo;</button>' +
        '</div>' +
        '<div class="cdp-addon-gallery__thumbs"></div>' +
      '</div>';

    var stageMedia = modal.querySelector('.cdp-addon-gallery__media');
    var counter = modal.querySelector('.cdp-addon-gallery__counter');
    var thumbs = modal.querySelector('.cdp-addon-gallery__thumbs');
    var prev = modal.querySelector('.cdp-addon-gallery__prev');
    var next = modal.querySelector('.cdp-addon-gallery__next');
    modal.querySelector('.cdp-addon-gallery__title').textContent = addon.title || 'Add-on';

    items.forEach(function (item, i) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'cdp-addon-gallery__thumb' + (item.type === 'video' ? ' is-video' : '');
      button.setAttribute('aria-label', 'View ' + item.type + ' ' + (i + 1));
      if (item.type === 'video') {
        var thumbVideo = document.createElement('video');
        thumbVideo.src = item.src;
        thumbVideo.muted = true;
        thumbVideo.playsInline = true;
        thumbVideo.preload = 'metadata';
        thumbVideo.setAttribute('aria-hidden', 'true');
        button.appendChild(thumbVideo);
        var badge = document.createElement('span');
        badge.className = 'cdp-addon-gallery__thumb-badge';
        badge.textContent = 'Video';
        button.appendChild(badge);
      } else {
        var image = document.createElement('img');
        image.src = item.src;
        image.alt = '';
        image.loading = 'lazy';
        button.appendChild(image);
      }
      button.onclick = function () { index = i; render(); };
      thumbs.appendChild(button);
    });

    function renderStage(item) {
      pauseStageVideo(stageMedia);
      stageMedia.innerHTML = '';
      if (item.type === 'video') {
        var video = document.createElement('video');
        video.className = 'cdp-addon-gallery__video';
        video.src = item.src;
        video.controls = true;
        video.playsInline = true;
        video.preload = 'metadata';
        video.setAttribute('aria-label', (addon.title || 'Add-on') + ' video');
        stageMedia.appendChild(video);
        try { video.play(); } catch (e) { /* autoplay may be blocked until user gesture */ }
      } else {
        var img = document.createElement('img');
        img.className = 'cdp-addon-gallery__image';
        img.src = item.src;
        img.alt = (addon.title || 'Add-on') + ' photo ' + (index + 1);
        stageMedia.appendChild(img);
      }
    }

    function render() {
      var item = items[index];
      renderStage(item);
      var typeLabel = item.type === 'video' ? 'Video' : 'Photo';
      counter.textContent = typeLabel + ' ' + (index + 1) + ' / ' + items.length;
      thumbs.querySelectorAll('.cdp-addon-gallery__thumb').forEach(function (button, i) {
        button.classList.toggle('is-active', i === index);
        button.setAttribute('aria-current', i === index ? 'true' : 'false');
      });
      var active = thumbs.children[index];
      if (active) active.scrollIntoView({ block: 'nearest', inline: 'center' });
    }

    function move(delta) {
      index = (index + delta + items.length) % items.length;
      render();
    }

    function close() {
      pauseStageVideo(stageMedia);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      modal.remove();
    }

    function onKey(event) {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowLeft') move(-1);
      if (event.key === 'ArrowRight') move(1);
    }

    prev.onclick = function () { move(-1); };
    next.onclick = function () { move(1); };
    modal.querySelector('.cdp-addon-gallery__close').onclick = close;
    modal.onclick = function (event) { if (event.target === modal) close(); };
    if (items.length === 1) {
      prev.hidden = true;
      next.hidden = true;
      thumbs.hidden = true;
    }

    var touchStart = 0;
    stageMedia.addEventListener('touchstart', function (event) {
      touchStart = event.changedTouches[0].clientX;
    }, { passive: true });
    stageMedia.addEventListener('touchend', function (event) {
      var distance = event.changedTouches[0].clientX - touchStart;
      if (Math.abs(distance) > 45) move(distance > 0 ? -1 : 1);
    }, { passive: true });

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    render();
    modal.querySelector('.cdp-addon-gallery__close').focus();
  }

  window.getCdpAddonMediaItems = getCdpAddonMediaItems;
  window.openCdpAddonGallery = openGallery;

  placeAddonsSection();
  document.addEventListener('mouseover', function (event) {
    var description = event.target.closest && event.target.closest('#cdp-addons-list .cdp-addon-desc');
    if (description) showDescriptionTooltip(description);
  });
  document.addEventListener('mouseout', function (event) {
    var description = event.target.closest && event.target.closest('#cdp-addons-list .cdp-addon-desc');
    if (description && !description.contains(event.relatedTarget)) hideDescriptionTooltip();
  });
  document.addEventListener('click', function (event) {
    var media = event.target.closest && event.target.closest('#cdp-addons-list .cdp-addon-media, #cdp-addons-list .cdp-sa-addon-media[data-sa-gallery]');
    if (media) {
      var card = media.closest('.cdp-addon-card') || media.closest('[data-sa-block]');
      var addon = null;
      if (media.getAttribute('data-sa-gallery')) {
        var saId = media.getAttribute('data-sa-gallery');
        if (typeof window.getAddonById === 'function') addon = window.getAddonById(saId);
      } else if (card) {
        var variant = selectedVariant();
        addon = variant && Array.isArray(variant.addOns)
          ? variant.addOns.find(function (item) { return String(item._id) === card.getAttribute('data-addon-id'); })
          : null;
      }
      var items = addon ? getCdpAddonMediaItems(addon) : [];
      if (items.length) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        openGallery(addon);
        return;
      }
    }
    var addOnCard = event.target.closest && event.target.closest('#cdp-addons-list .cdp-addon-card');
    if (addOnCard && typeof window.getAddOnBillingDays === 'function' && window.getAddOnBillingDays() < 1) {
      if (event.target.closest('.cdp-addon-media')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (typeof window.showNotification === 'function') {
        var checkoutNeeded = typeof window.usesCheckInCheckOutDates === 'function' && window.usesCheckInCheckOutDates();
        window.showNotification(checkoutNeeded ? 'Please select your check-out date before choosing add-ons.' : 'Please select your booking date before choosing add-ons.', 'error');
      }
    }
  }, true);
})();
