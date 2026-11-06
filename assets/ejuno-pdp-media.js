(function () {
  function normalizeVideoUrl(video) {
    if (!video) return '';
    if (typeof video === 'string') return video.trim();
    return String(video.url || video.src || video.videoUrl || '').trim();
  }

  function normalizeImageUrl(image) {
    if (!image) return '';
    if (typeof image === 'string') return image.trim();
    return String(image.src || image.url || '').trim();
  }

  function mediaPathKey(url) {
    if (!url) return '';
    var raw = String(url).split('?')[0].split('#')[0];
    try {
      return new URL(raw, window.location.origin).pathname.toLowerCase();
    } catch (e) {
      return raw.toLowerCase();
    }
  }

  function mediaFileStem(url) {
    var path = mediaPathKey(url);
    var parts = path.split('/');
    var file = parts[parts.length - 1] || path;
    return file.replace(/\.(jpe?g|png|gif|webp|avif)$/i, '');
  }

  function mediaUrlsMatch(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    var pathA = mediaPathKey(a);
    var pathB = mediaPathKey(b);
    if (pathA === pathB) return true;
    var stemA = mediaFileStem(a);
    var stemB = mediaFileStem(b);
    return stemA.length > 2 && stemA === stemB;
  }

  /* Trello 670 #3: sharp, right-sized PDP images.
     Shopify CDN images get a srcset (400w..2400w) capped at the file's ORIGINAL width
     (from data-ejuno-media-widths, rendered by Liquid), so retina screens get ~2x the
     displayed size and we never ask for (or advertise) an upscaled version. Any old
     width/height/crop params on the URL are replaced. */
  var GALLERY_SIZES = {
    main: '(max-width: 760px) 92vw, 46vw',
    wide: '(max-width: 760px) 92vw, 46vw',
    tile: '(max-width: 760px) 92vw, 23vw'
  };
  var SRCSET_STEPS = [400, 600, 800, 1000, 1200, 1600, 2000, 2400];
  var mediaWidthsCache = null;

  function mediaFileName(url) {
    var parts = mediaPathKey(url).split('/');
    return parts[parts.length - 1] || '';
  }

  function getMediaWidths() {
    if (mediaWidthsCache) return mediaWidthsCache;
    var gallery = document.querySelector('.ejuno-pdp .pdp-gallery');
    try {
      mediaWidthsCache = JSON.parse((gallery && gallery.getAttribute('data-ejuno-media-widths')) || '{}') || {};
    } catch (e) {
      mediaWidthsCache = {};
    }
    return mediaWidthsCache;
  }

  function originalWidthFor(url) {
    var w = parseInt(getMediaWidths()[mediaFileName(url)], 10);
    return isFinite(w) && w > 0 ? w : 0;
  }

  function isShopifyCdnUrl(url) {
    return /cdn\.shopify\.com\/s\/files\/|\/cdn\/shop\/(files|products)\//i.test(String(url || ''));
  }

  function shopifySizedUrl(url, width) {
    var raw = String(url || '');
    var hashless = raw.split('#')[0];
    var qIdx = hashless.indexOf('?');
    var path = qIdx >= 0 ? hashless.slice(0, qIdx) : hashless;
    var query = qIdx >= 0 ? hashless.slice(qIdx + 1) : '';
    var params = query
      .split('&')
      .filter(function (kv) {
        return kv && !/^(width|height|crop)=/i.test(kv);
      });
    if (width) params.push('width=' + width);
    return path + (params.length ? '?' + params.join('&') : '');
  }

  function applyResponsiveImage(img, url, sizes) {
    if (!img || !url) return;
    if (!isShopifyCdnUrl(url)) {
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      img.src = url;
      return;
    }
    var orig = originalWidthFor(url);
    var widths = SRCSET_STEPS.filter(function (w) {
      return !orig || w < orig;
    });
    if (orig) widths.push(orig);
    img.sizes = sizes || GALLERY_SIZES.main;
    img.srcset = widths
      .map(function (w) {
        return shopifySizedUrl(url, w) + ' ' + w + 'w';
      })
      .join(', ');
    img.src = shopifySizedUrl(url, orig ? Math.min(orig, 1600) : 1600);
  }

  /* Trello 567: variant featured media */
  function getVariantMediaMap(gallery) {
    gallery = gallery || document.querySelector('.ejuno-pdp .pdp-gallery');
    if (!gallery) return {};
    try {
      return JSON.parse(gallery.getAttribute('data-ejuno-variant-media') || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function getVariantMediaUrl(variantId) {
    if (!variantId) return '';
    var map = getVariantMediaMap();
    return map[String(variantId)] || '';
  }

  function getPreferredMediaUrls(gallery) {
    var list = getPreferredMediaUrlsBase(gallery);
    var sel = window.ejunoSelectedVariantMediaUrl;
    if (sel) {
      list = [sel].concat(list.filter(function (u) { return !mediaUrlsMatch(u, sel); }));
    }
    return list;
  }

  function getPreferredMediaUrlsBase(gallery) {
    if (!gallery) return [];
    var raw = gallery.getAttribute('data-shopify-media-order');
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      } catch (e) { /* fall through */ }
    }
    var fromDom = [];
    gallery.querySelectorAll(':scope > img[src], .pdp-gallery__track > img[src]').forEach(function (img) {
      fromDom.push(img.currentSrc || img.src);
    });
    return fromDom;
  }

  function orderMediaItems(items, preferredUrls) {
    if (!preferredUrls.length || !items.length) return items;
    var ordered = [];
    var used = {};
    preferredUrls.forEach(function (prefUrl) {
      var match = items.find(function (item, index) {
        if (used[index]) return false;
        return mediaUrlsMatch(item.src, prefUrl);
      });
      if (match) {
        var idx = items.indexOf(match);
        used[idx] = true;
        ordered.push(match);
      }
    });
    items.forEach(function (item, index) {
      if (!used[index]) ordered.push(item);
    });
    return ordered;
  }

  function getProductMediaItems(product) {
    if (!product) return [];
    var items = [];
    var seen = {};
    var images = Array.isArray(product.images) ? product.images : [];
    var videos = Array.isArray(product.videos) ? product.videos : [];
    images.forEach(function (image) {
      var url = normalizeImageUrl(image);
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

  function renderPdpGallery(product) {
    var gallery = document.querySelector('.ejuno-pdp .pdp-gallery');
    if (!gallery || !product) return;
    var preferredUrls = getPreferredMediaUrls(gallery);
    var apiItems = getProductMediaItems(product);
    // Trello 670 #3: catalog/imported products can come back from the API with no images;
    // fall back to the Shopify media instead of a one-image gallery.
    if (!apiItems.some(function (i) { return i.type === 'image'; })) {
      getPreferredMediaUrlsBase(gallery).forEach(function (u) {
        if (u && !apiItems.some(function (i) { return mediaUrlsMatch(i.src, u); })) {
          apiItems.push({ type: 'image', src: u });
        }
      });
    }
    var items = orderMediaItems(apiItems, preferredUrls);
    var selUrl = window.ejunoSelectedVariantMediaUrl;
    if (selUrl && (!items.length || !mediaUrlsMatch(items[0].src, selUrl))) {
      items.unshift({ type: 'image', src: selUrl });
    }
    if (!items.length) return;

    var title = product.title || 'Product';
    gallery.innerHTML = '';
    gallery.classList.add('pdp-gallery--has-api-media');

    var track = document.createElement('div');
    track.className = 'pdp-gallery__track';
    gallery.appendChild(track);

    items.slice(0, 4).forEach(function (item, index) {
      var node;
      if (item.type === 'video') {
        node = document.createElement('video');
        node.src = item.src;
        node.controls = true;
        node.playsInline = true;
        node.preload = 'metadata';
        node.className = 'pdp-gallery__video';
        node.setAttribute('aria-label', title + ' video');
      } else {
        node = document.createElement('img');
        node.alt = title;
        node.loading = index === 0 ? 'eager' : 'lazy';
        node.decoding = 'async';
        applyResponsiveImage(
          node,
          item.src,
          index === 0 ? GALLERY_SIZES.main : index === 3 && items.length >= 4 ? GALLERY_SIZES.wide : GALLERY_SIZES.tile
        );
      }
      if (index === 0) node.classList.add('main');
      else if (index === 3 && items.length >= 4) node.classList.add('wide');
      track.appendChild(node);
    });

    if (items.length > 4) {
      var more = document.createElement('button');
      more.type = 'button';
      more.className = 'pdp-gallery__more btn ghost';
      more.textContent = 'View all media (' + items.length + ')';
      more.addEventListener('click', function () {
        openProductMediaGallery(product, items);
      });
      gallery.appendChild(more);
    } else if (items.length > 1) {
      gallery.style.cursor = 'pointer';
      gallery.setAttribute('role', 'button');
      gallery.setAttribute('tabindex', '0');
      gallery.setAttribute('aria-label', 'Open product media gallery');
      var openAll = function (e) {
        if (e.target.closest('video, button')) return;
        openProductMediaGallery(product, items);
      };
      gallery.onclick = openAll;
      gallery.onkeydown = function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openProductMediaGallery(product, items);
        }
      };
    }
  }

  function openProductMediaGallery(product, items) {
    var fakeAddon = {
      title: product.title || 'Product',
      images: items.filter(function (i) { return i.type === 'image'; }).map(function (i) { return i.src; }),
      videos: items.filter(function (i) { return i.type === 'video'; }).map(function (i) { return i.src; })
    };
    if (typeof window.openCdpAddonGallery === 'function') {
      window.openCdpAddonGallery(fakeAddon);
    }
  }

  window.syncEjunoPdpGallery = function syncEjunoPdpGallery(product) {
    renderPdpGallery(product || window.productDetails);
  };

  window.getEjunoProductMediaItems = getProductMediaItems;

  function swapMainImage(url) {
    var gallery = document.querySelector('.ejuno-pdp .pdp-gallery');
    if (!gallery || !url) return;
    var main = gallery.querySelector('img.main');
    if (!main) return;
    if (mediaUrlsMatch(main.currentSrc || main.src, url)) return;
    applyResponsiveImage(main, url, GALLERY_SIZES.main);
  }

  function selectEjunoVariantMedia(variantId) {
    var url = getVariantMediaUrl(variantId);
    if (!url) return false;
    window.ejunoSelectedVariantMediaUrl = url;
    if (window.productDetails && document.querySelector('.ejuno-pdp .pdp-gallery--has-api-media')) {
      renderPdpGallery(window.productDetails);
    } else {
      swapMainImage(url);
    }
    return true;
  }
  window.ejunoSelectVariantMedia = selectEjunoVariantMedia;

  function currentVariantId() {
    try {
      var q = new URL(window.location.href).searchParams.get('variant');
      if (q) return q;
    } catch (e) {}
    var el = document.getElementById('ejuno-commerce-variant-select') || document.getElementById('ejuno-variant-select');
    if (el && el.value) return el.value;
    var g = document.querySelector('.ejuno-pdp .pdp-gallery');
    return g ? g.getAttribute('data-ejuno-current-variant') : '';
  }

  (function initVariantMedia() {
    var initialUrl = getVariantMediaUrl(currentVariantId());
    if (initialUrl) window.ejunoSelectedVariantMediaUrl = initialUrl;
    document.addEventListener('change', function (e) {
      var t = e.target;
      if (!t || !t.id) return;
      if (t.id === 'ejuno-commerce-variant-select' || t.id === 'ejuno-variant-select') {
        selectEjunoVariantMedia(t.value);
      }
    });
  })();

  document.addEventListener('productDetailsLoaded', function (event) {
    renderPdpGallery(event.detail);
  });

  if (window.productDetails) {
    renderPdpGallery(window.productDetails);
  }
})();
