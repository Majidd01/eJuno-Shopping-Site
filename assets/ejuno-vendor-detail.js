(function () {
  function stars(n) {
    var rounded = Math.round(Number(n) || 0);
    var out = '';
    for (var i = 0; i < 5; i += 1) out += i < rounded ? '★' : '☆';
    return out;
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function stripHtml(html) {
    var tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return (tmp.textContent || tmp.innerText || '').trim();
  }

  function truncate(text, max) {
    if (!text || text.length <= max) return text;
    return text.slice(0, max).trim() + '…';
  }

  function initVendorDetail(root) {
    if (!root || root.dataset.bound === '1') return;
    var params = new URLSearchParams(window.location.search);
    var vendorId = params.get('id');
    var missing = root.querySelector('[data-vendor-missing]');
    var content = root.querySelector('[data-vendor-content]');
    function hideLoaderNow() {
      root.classList.remove('is-loading');
    }

    if (!vendorId) {
      hideLoaderNow();
      if (content) content.setAttribute('hidden', '');
      if (missing) missing.removeAttribute('hidden');
      return;
    }

    root.dataset.bound = '1';
    var apiBase = root.getAttribute('data-api-base') || 'https://ejuno-dev.skylinxtech.co/api';
    var gallery = root.querySelector('[data-vendor-gallery]');
    var profile = root.querySelector('[data-vendor-profile]');
    var productsEl = root.querySelector('[data-vendor-products]');
    var reviewsEl = root.querySelector('[data-vendor-reviews]');
    var reviewsHeading = root.querySelector('[data-vendor-reviews-heading]');

    var vendorLoaded = false;
    var productsLoaded = false;

    function showContent() {
      if (content) content.removeAttribute('hidden');
      if (missing) missing.setAttribute('hidden', '');
    }

    function checkDone() {
      if (!vendorLoaded) return;
      showContent();
      if (productsLoaded) hideLoaderNow();
    }

    function renderGallery(images) {
      if (!gallery) return;
      gallery.innerHTML = '';
      if (!images.length) {
        gallery.hidden = true;
        return;
      }
      gallery.hidden = false;
      gallery.classList.toggle('is-single', images.length === 1);
      var shown = images.slice(0, 5);
      shown.forEach(function (src, index) {
        var item = document.createElement('div');
        item.className = 'ejuno-vendor-detail__gallery-item';
        if (index === 0 && images.length > 1) item.classList.add('ejuno-vendor-detail__gallery-item--main');
        var img = document.createElement('img');
        img.src = src;
        img.alt = 'Vendor gallery image';
        img.loading = index === 0 ? 'eager' : 'lazy';
        item.appendChild(img);
        if (index === 4 && images.length > 5) {
          var overlay = document.createElement('div');
          overlay.className = 'ejuno-vendor-detail__gallery-more';
          overlay.innerHTML = '<span>+' + (images.length - 5) + '</span><span style="font-size:13px;margin-top:4px;">more photos</span>';
          item.appendChild(overlay);
        }
        gallery.appendChild(item);
      });
    }

    var vendorUrl =
      apiBase.replace(/\/$/, '') + '/vendors/' + encodeURIComponent(vendorId);
    var productsUrl = vendorUrl + '/products';

    fetch(vendorUrl)
      .then(function (res) {
        if (!res.ok) throw new Error('Vendor HTTP ' + res.status);
        return res.json();
      })
      .then(function (payload) {
        var data = payload && (payload.data || payload.vendor);
        if (!data && payload && payload._id) data = payload;
        if (!data) throw new Error('No vendor');
        document.title = (data.companyName || data.name || 'Vendor') + ' · eJuno';

        var images = [];
        if (Array.isArray(data.businessImages) && data.businessImages.length) {
          images = data.businessImages.slice();
        } else if (data.coverPhoto) {
          images.push(data.coverPhoto);
        } else if (data.profilePhoto) {
          images.push(data.profilePhoto);
        }
        renderGallery(images);

        var sub =
          data.serviceType ||
          data.mainProductCategory ||
          (Array.isArray(data.venueTypes) && data.venueTypes[0]) ||
          '';
        var typeLabel = data.type === 'Product Vendor' ? 'Product vendor' : data.type || 'Vendor';

        if (profile) {
          profile.innerHTML =
            (data.profilePhoto
              ? '<img class="ejuno-vendor-detail__avatar" src="' +
                escapeHtml(data.profilePhoto) +
                '" alt="">'
              : '') +
            '<p class="ejuno-vendor-detail__badge">' +
            escapeHtml(typeLabel) +
            '</p>' +
            '<h1>' +
            escapeHtml(data.companyName || data.name) +
            '</h1>' +
            (sub ? '<p style="color:var(--berry);font-weight:600;margin:0 0 14px;">' + escapeHtml(sub) + '</p>' : '') +
            '<div class="ejuno-vendor-detail__meta">' +
            (data.city || data.country
              ? '<p><strong>Location</strong><br>' +
                escapeHtml([data.city, data.country].filter(Boolean).join(', ')) +
                '</p>'
              : '') +
            (data.businessInfo
              ? '<p><strong>About</strong><br>' + escapeHtml(data.businessInfo) + '</p>'
              : '') +
            '</div>' +
            '<div class="ejuno-vendor-detail__links">' +
            (data.companyWebsite
              ? '<a href="' +
                escapeHtml(data.companyWebsite) +
                '" target="_blank" rel="noopener">Website</a>'
              : '') +
            (data.instagram
              ? '<a href="' + escapeHtml(data.instagram) + '" target="_blank" rel="noopener">Instagram</a>'
              : '') +
            (data.youtube
              ? '<a href="' + escapeHtml(data.youtube) + '" target="_blank" rel="noopener">YouTube</a>'
              : '') +
            '</div>';
        }

        var ratings = data.coupleRatings || [];
        var stats = data.overallRatingStats;
        if (reviewsEl) {
          if (!ratings.length) {
            reviewsEl.innerHTML = '<p class="ejuno-vendor-detail__empty">No ratings and reviews yet.</p>';
            if (reviewsHeading) reviewsHeading.hidden = true;
          } else {
            if (reviewsHeading) reviewsHeading.hidden = false;
            var summary = '';
            if (stats) {
              summary =
                '<div class="ejuno-vendor-detail__review-head"><span class="ejuno-vendor-detail__stars">' +
                stars(stats.averageOverallExperience) +
                '</span><strong>' +
                Number(stats.averageOverallExperience || 0).toFixed(1) +
                '</strong><span style="color:var(--muted);font-size:14px;">(' +
                (stats.totalRatings || ratings.length) +
                ' reviews)</span></div>';
            }
            var cards = ratings
              .map(function (r) {
                var name = r.couple
                  ? (r.couple.firstName || '') + ' ' + (r.couple.lastName || '')
                  : 'Guest';
                name = name.trim() || 'Guest';
                var comment = r.comment || '';
                var date = r.reviewedAt
                  ? new Date(r.reviewedAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '';
                return (
                  '<article class="ejuno-vendor-detail__review">' +
                  '<div class="ejuno-vendor-detail__review-head"><strong>' +
                  escapeHtml(name) +
                  '</strong><span class="ejuno-vendor-detail__stars">' +
                  stars(r.ratings && r.ratings.overallExperience) +
                  '</span>' +
                  (date ? '<span style="color:var(--muted);font-size:13px;margin-left:auto;">' + date + '</span>' : '') +
                  '</div>' +
                  (comment ? '<p style="margin:0;color:#4d4540;line-height:1.6;">' + escapeHtml(comment) + '</p>' : '') +
                  '</article>'
                );
              })
              .join('');
            reviewsEl.innerHTML = summary + cards;
          }
        }
        vendorLoaded = true;
        checkDone();
      })
      .catch(function () {
        if (profile) {
          profile.innerHTML =
            '<p class="ejuno-vendor-detail__empty">Unable to load this vendor. <a href="/pages/vendor-marketplace">Back to marketplace</a></p>';
        }
        vendorLoaded = true;
        productsLoaded = true;
        checkDone();
      });

    fetch(productsUrl)
      .then(function (res) {
        if (!res.ok) throw new Error('Products HTTP ' + res.status);
        return res.json();
      })
      .then(function (payload) {
        var list = (payload && payload.data) || [];
        if (!productsEl) {
          productsLoaded = true;
          checkDone();
          return;
        }
        var active = list.filter(function (p) {
          return p.status === 'active';
        });
        if (!active.length) {
          productsEl.innerHTML = '<p class="ejuno-vendor-detail__empty">No active listings yet.</p>';
          productsLoaded = true;
          checkDone();
          return;
        }
        productsEl.innerHTML = active
          .slice(0, 12)
          .map(function (product) {
            var image =
              (product.images && product.images[0] && product.images[0].src) ||
              'https://cdn.shopify.com/s/files/1/0814/3061/0213/files/61889128724be9b53a7d9893de2e8d0c_07aeaf89-fc48-4f2d-bb73-8fc7fd1eb50d';
            var desc = truncate(stripHtml(product.body_html), 120);
            var href = product.handle ? '/products/' + product.handle : '#';
            var priceHtml =
              window.EjunoCardPrice && typeof window.EjunoCardPrice.htmlForProduct === 'function'
                ? window.EjunoCardPrice.htmlForProduct(product)
                : '';
            var cta =
              ['service', 'venue'].indexOf(String(product.type || '').toLowerCase()) !== -1
                ? '<a class="btn primary" href="' + href + '">View & book</a>'
                : '<a class="btn primary" href="' + href + '">View product</a>';
            return (
              '<article class="ejuno-vendor-detail__product">' +
              '<img src="' +
              escapeHtml(image) +
              '" alt="' +
              escapeHtml(product.title) +
              '">' +
              '<div class="ejuno-vendor-detail__product-body">' +
              '<h3>' +
              escapeHtml(product.title) +
              '</h3>' +
              (desc ? '<p>' + escapeHtml(desc) + '</p>' : '') +
              priceHtml +
              cta +
              '</div></article>'
            );
          })
          .join('');
        productsLoaded = true;
        checkDone();
      })
      .catch(function () {
        if (productsEl) productsEl.innerHTML = '<p class="ejuno-vendor-detail__empty">Unable to load listings.</p>';
        productsLoaded = true;
        checkDone();
      });
  }

  function boot() {
    document.querySelectorAll('[data-ejuno-vendor-detail]').forEach(initVendorDetail);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
