(function () {
  var QTY_SYNC_DEBOUNCE_MS = 450;
  var cartState = null;
  var qtySyncTimers = {};
  var qtySyncPending = {};

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function getDrawer() {
    return document.getElementById('ejuno-cart-drawer');
  }

  function getMoneyContext() {
    var drawer = getDrawer();
    var fallbackCurrency =
      (window.EJUNO_CURRENCY && String(window.EJUNO_CURRENCY).toUpperCase()) || 'USD';
    var fallbackFormat = window.EJUNO_MONEY_FORMAT || '${{amount}}';
    if (!drawer) return { format: fallbackFormat, currency: fallbackCurrency };
    return {
      format: drawer.getAttribute('data-money-format') || fallbackFormat,
      currency: drawer.getAttribute('data-currency') || fallbackCurrency,
    };
  }

  function cartImageUrl(url, size) {
    if (!url) return '';
    var px = (Number(size) || 72) * 2;
    return url.indexOf('?') >= 0 ? url + '&width=' + px + '&height=' + px + '&crop=center' : url + '?width=' + px + '&height=' + px + '&crop=center';
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatMoney(cents, currencyOverride) {
    var ctx = getMoneyContext();
    var currency = currencyOverride || ctx.currency || window.EJUNO_CURRENCY || 'USD';
    var centsNum = Number(cents) || 0;

    if (window.Shopify && typeof Shopify.formatMoney === 'function' && ctx.format) {
      return Shopify.formatMoney(centsNum, ctx.format);
    }

    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(centsNum / 100);
    } catch (e) {
      return (window.EJUNO_CURRENCY_SYMBOL || '$') + (centsNum / 100).toFixed(2);
    }
  }

  function openDrawer() {
    var drawer = getDrawer();
    if (!drawer || drawer.classList.contains('is-open')) return;
    drawer.hidden = false;
    drawer.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        drawer.classList.add('is-open');
      });
    });
    document.body.classList.add('ejuno-cart-open');
  }

  function closeDrawer() {
    var drawer = getDrawer();
    if (!drawer || !drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    document.body.classList.remove('ejuno-cart-open');

    var panel = drawer.querySelector('.ejuno-cart-drawer__panel');
    var done = false;
    function finishClose() {
      if (done) return;
      done = true;
      drawer.hidden = true;
      drawer.setAttribute('aria-hidden', 'true');
      panel.removeEventListener('transitionend', onTransitionEnd);
    }

    function onTransitionEnd(e) {
      if (e.target !== panel || e.propertyName !== 'transform') return;
      finishClose();
    }

    panel.addEventListener('transitionend', onTransitionEnd);
    window.setTimeout(finishClose, 480);
  }

  function updateCartCount(cart) {
    document.querySelectorAll('[data-ejuno-cart-count]').forEach(function (countEl) {
      var n = cart && cart.item_count ? cart.item_count : 0;
      countEl.textContent = String(n);
      countEl.hidden = n <= 0;
    });
  }

  function cloneCart(cart) {
    if (!cart) return null;
    try {
      return JSON.parse(JSON.stringify(cart));
    } catch (e) {
      return cart;
    }
  }

  function findCartItem(lineKey) {
    if (!cartState || !cartState.items) return null;
    var key = String(lineKey);
    return cartState.items.find(function (item) {
      return String(item.key) === key || String(item.id) === key;
    });
  }

  function findLineElement(lineKey) {
    var key = String(lineKey);
    var nodes = document.querySelectorAll('[data-line-key]');
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].getAttribute('data-line-key') === key) return nodes[i];
    }
    return null;
  }

  function ensureCartState() {
    if (cartState && cartState.items) {
      return Promise.resolve(cartState);
    }
    return fetch('/cart.js', { credentials: 'same-origin' })
      .then(function (res) {
        return res.json();
      })
      .then(function (cart) {
        cartState = cloneCart(cart);
        return cartState;
      });
  }

  function bootstrapCartItemFromLine(line, lineKey) {
    if (!cartState) cartState = { items: [], items_subtotal_price: 0, item_count: 0 };
    if (!cartState.items) cartState.items = [];
    var existing = findCartItem(lineKey);
    if (existing) return existing;
    var input = line.querySelector('.ejuno-cart-qty__input');
    var unitCents = parseInt(line.getAttribute('data-unit-price-cents'), 10);
    if (isNaN(unitCents)) unitCents = 0;
    var qty = parseInt(input && input.value, 10);
    if (isNaN(qty)) qty = 0;
    var item = {
      key: String(lineKey),
      id: line.getAttribute('data-variant-id') || lineKey,
      quantity: qty,
      final_price: unitCents,
      final_line_price: unitCents * qty,
    };
    cartState.items.push(item);
    if (!cartState.currency) {
      var drawer = getDrawer();
      cartState.currency =
        (drawer && drawer.getAttribute('data-currency')) || getMoneyContext().currency;
    }
    recalcCartTotals(cartState);
    return item;
  }

  function recalcCartTotals(state) {
    if (!state || !state.items) return;
    var subtotal = 0;
    var count = 0;
    state.items.forEach(function (item) {
      var q = Math.max(0, Number(item.quantity) || 0);
      if (q <= 0) return;
      var unit = Number(item.final_price) || 0;
      item.final_line_price = unit * q;
      subtotal += item.final_line_price;
      count += q;
    });
    state.items_subtotal_price = subtotal;
    state.item_count = count;
  }

  function updateDrawerTotalsFromState() {
    if (!cartState) return;
    var subtotalEl = qs('[data-ejuno-cart-subtotal]');
    var currency = cartState.currency || getMoneyContext().currency;
    if (subtotalEl) subtotalEl.textContent = formatMoney(cartState.items_subtotal_price, currency);
    updateCartCount(cartState);
  }

  function updateLineDomFromItem(line, item) {
    if (!line || !item) return;
    var currency = (cartState && cartState.currency) || getMoneyContext().currency;
    var input = line.querySelector('[data-drawer-qty-input]');
    var linePrice = line.querySelector('.ejuno-cart-line__line-price');
    if (input) input.value = String(item.quantity);
    if (linePrice) linePrice.textContent = formatMoney(item.final_line_price, currency);
  }

  function updateCartPageDom(cart) {
    var form = document.getElementById('ejuno-cart-form');
    if (!form || !cart) return;
    var currency = cart.currency || getMoneyContext().currency;
    var items = cart.items || [];

    items.forEach(function (item) {
      var line = findLineElement(item.key || String(item.id));
      if (!line) return;
      var input = line.querySelector('.ejuno-cart-qty__input');
      var total = line.querySelector('.ejuno-cart-page__line-total');
      if (input) input.value = String(item.quantity);
      if (total) total.textContent = formatMoney(item.final_line_price, currency);
    });

    var subtotal = form.querySelector('.ejuno-cart-page__summary-row strong');
    if (subtotal) {
      subtotal.textContent = formatMoney(cart.items_subtotal_price != null ? cart.items_subtotal_price : cart.total_price, currency);
    }

    var lead = document.querySelector('.ejuno-cart-page__lead');
    if (lead) {
      var lineCount = items.length;
      lead.textContent = lineCount + ' item' + (lineCount === 1 ? '' : 's') + ' ready for checkout';
    }

    updateCartCount(cart);
  }

  function applyLocalLineQuantity(lineKey, nextQty) {
    var line = findLineElement(lineKey);
    var body = qs('[data-ejuno-cart-body]');
    if (!cartState) cartState = { items: [], items_subtotal_price: 0, item_count: 0 };
    var item = findCartItem(lineKey);
    if (!item && line) item = bootstrapCartItemFromLine(line, lineKey);
    if (!item) return;

    nextQty = Math.max(0, Number(nextQty) || 0);
    item.quantity = nextQty;
    recalcCartTotals(cartState);
    updateDrawerTotalsFromState();

    if (nextQty === 0) {
      var wasCartPageLine = line && line.classList.contains('ejuno-cart-page__line');
      if (line) line.remove();
      cartState.items = cartState.items.filter(function (it) {
        return String(it.key || it.id) !== String(lineKey);
      });
      recalcCartTotals(cartState);
      updateDrawerTotalsFromState();
      if (body && !body.querySelector('[data-line-key]')) {
        body.innerHTML = '<p class="ejuno-cart-drawer__empty">Your cart is empty. Explore venues and registry picks to begin.</p>';
      }
      if (wasCartPageLine) {
        var form = document.getElementById('ejuno-cart-form');
        var currency = cartState.currency || getMoneyContext().currency;
        var subtotal = form && form.querySelector('.ejuno-cart-page__summary-row strong');
        if (subtotal) subtotal.textContent = formatMoney(cartState.items_subtotal_price, currency);
        var lead = document.querySelector('.ejuno-cart-page__lead');
        if (lead) {
          var lineCount = cartState.items.length;
          lead.textContent = lineCount + ' item' + (lineCount === 1 ? '' : 's') + ' ready for checkout';
        }
      }
      return;
    }

    if (line) {
      if (line.classList.contains('ejuno-cart-line')) {
        updateLineDomFromItem(line, item);
      } else if (line.classList.contains('ejuno-cart-page__line')) {
        var currency = (cartState && cartState.currency) || getMoneyContext().currency;
        var input = line.querySelector('.ejuno-cart-qty__input');
        var total = line.querySelector('.ejuno-cart-page__line-total');
        if (input) input.value = String(item.quantity);
        if (total) total.textContent = formatMoney(item.final_line_price, currency);
        updateDrawerTotalsFromState();
        var lead = document.querySelector('.ejuno-cart-page__lead');
        if (lead && cartState && cartState.items) {
          var lineCount = cartState.items.filter(function (it) {
            return (Number(it.quantity) || 0) > 0;
          }).length;
          lead.textContent = lineCount + ' item' + (lineCount === 1 ? '' : 's') + ' ready for checkout';
        }
        var form = document.getElementById('ejuno-cart-form');
        var subtotal = form && form.querySelector('.ejuno-cart-page__summary-row strong');
        if (subtotal) subtotal.textContent = formatMoney(cartState.items_subtotal_price, currency);
      }
    }
  }

  function scheduleDebouncedQtySync(lineKey, quantity) {
    qtySyncPending[lineKey] = quantity;
    if (qtySyncTimers[lineKey]) {
      clearTimeout(qtySyncTimers[lineKey]);
    }
    qtySyncTimers[lineKey] = window.setTimeout(function () {
      var q = qtySyncPending[lineKey];
      delete qtySyncPending[lineKey];
      delete qtySyncTimers[lineKey];
      var line = findLineElement(lineKey);
      if (line) line.classList.add('is-syncing');
      changeLineQuantity(lineKey, q)
        .then(function (serverCart) {
          cartState = cloneCart(serverCart);
          renderCart(cartState);
          updateCartPageDom(serverCart);
          if (document.getElementById('ejuno-cart-form') && (!serverCart.items || !serverCart.items.length)) {
            window.location.reload();
          }
        })
        .catch(function (err) {
          if (typeof showNotification === 'function') {
            showNotification(err.message || 'Could not update cart', 'error');
          }
          return refreshCart();
        })
        .finally(function () {
          if (line) line.classList.remove('is-syncing');
        });
    }, QTY_SYNC_DEBOUNCE_MS);
  }

  function renderCart(cart) {
    var body = qs('[data-ejuno-cart-body]');
    var subtotalEl = qs('[data-ejuno-cart-subtotal]');
    var checkout = qs('[data-ejuno-cart-checkout]');
    var drawer = getDrawer();
    cartState = cloneCart(cart);
    updateCartCount(cart);
    if (!body) return;

    var currency = (cart && cart.currency) || getMoneyContext().currency;
    if (drawer && cart && cart.currency) {
      drawer.setAttribute('data-currency', window.EJUNO_CURRENCY || 'USD');
      if (window.EJUNO_MONEY_FORMAT) {
        drawer.setAttribute('data-money-format', window.EJUNO_MONEY_FORMAT);
      }
    }

    if (!cart || !cart.items || !cart.items.length) {
      body.innerHTML = '<p class="ejuno-cart-drawer__empty">Your cart is empty. Explore venues and registry picks to begin.</p>';
      if (subtotalEl) subtotalEl.textContent = formatMoney(0, currency);
      if (checkout) checkout.setAttribute('href', '/checkout');
      return;
    }

    body.innerHTML = cart.items
      .map(function (item) {
        var lineKey = item.key || String(item.id);
        var imgBlock = item.image
          ? '<a class="ejuno-cart-line__media" href="' +
            escapeHtml(item.url) +
            '"><img class="ejuno-cart-line__img" src="' +
            escapeHtml(cartImageUrl(item.image, 72)) +
            '" alt="" width="72" height="72" loading="lazy"></a>'
          : '';
        return (
          '<div class="ejuno-cart-line" data-line-key="' +
          escapeHtml(lineKey) +
          '">' +
          imgBlock +
          '<div class="ejuno-cart-line__main">' +
          '<div class="ejuno-cart-line__copy">' +
          '<a class="ejuno-cart-line__title" href="' +
          escapeHtml(item.url) +
          '">' +
          escapeHtml(item.product_title) +
          '</a>' +
          (item.variant_title && item.variant_title !== 'Default Title'
            ? '<span class="ejuno-cart-line__variant">' + escapeHtml(item.variant_title) + '</span>'
            : '') +
          (function () {
            var pType = String(item.product_type || '').toLowerCase();
            var starting =
              pType === 'venue' ||
              pType === 'service' ||
              pType.indexOf('venue') !== -1 ||
              pType.indexOf('accommodation') !== -1;
            if (starting) {
              return (
                '<span class="ejuno-cart-line__price ejuno-card-price">' +
                '<span class="ejuno-card-price__label">Starting from</span>' +
                '<span class="ejuno-card-price__amount">' +
                formatMoney(item.final_price, currency) +
                '</span></span>'
              );
            }
            return (
              '<span class="ejuno-cart-line__price ejuno-card-price">' +
              '<span class="ejuno-card-price__amount">' +
              formatMoney(item.final_price, currency) +
              '</span>' +
              '<span class="ejuno-card-price__label" style="text-transform:none;letter-spacing:0;font-weight:500">each</span></span>'
            );
          })() +
          '</div>' +
          '<div class="ejuno-cart-line__row">' +
          '<div class="ejuno-cart-line__controls">' +
          '<div class="ejuno-cart-qty ejuno-cart-qty--drawer" data-ejuno-drawer-qty>' +
          '<button type="button" class="ejuno-cart-qty__btn" data-drawer-qty-minus aria-label="Decrease quantity">−</button>' +
          '<input class="ejuno-cart-qty__input" type="number" data-drawer-qty-input value="' +
          item.quantity +
          '" min="0" inputmode="numeric" aria-label="Quantity">' +
          '<button type="button" class="ejuno-cart-qty__btn" data-drawer-qty-plus aria-label="Increase quantity">+</button>' +
          '</div>' +
          '<button type="button" class="ejuno-cart-line__remove" data-ejuno-cart-remove>Remove</button>' +
          '</div>' +
          '<span class="ejuno-cart-line__line-price">' +
          formatMoney(item.final_line_price, currency) +
          '</span>' +
          '</div>' +
          '</div></div>'
        );
      })
      .join('');

    if (subtotalEl) subtotalEl.textContent = formatMoney(cart.items_subtotal_price, currency);
    if (checkout) checkout.setAttribute('href', '/checkout');
  }

  function refreshCart() {
    return fetch('/cart.js', { credentials: 'same-origin' })
      .then(function (res) {
        return res.json();
      })
      .then(renderCart);
  }

  function changeLineQuantity(lineKey, quantity) {
    return fetch('/cart/change.js', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id: lineKey, quantity: Math.max(0, Number(quantity) || 0) }),
    }).then(function (res) {
      if (!res.ok) {
        return res.json().then(function (err) {
          throw new Error(err.description || 'Could not update cart');
        });
      }
      return res.json();
    });
  }

  function bindDrawerLineActions() {
    var body = qs('[data-ejuno-cart-body]');
    if (!body || body.dataset.ejunoDrawerActionsBound) return;
    body.dataset.ejunoDrawerActionsBound = '1';

    body.addEventListener('click', function (e) {
      var line = e.target.closest('[data-line-key]');
      if (!line) return;
      var lineKey = line.getAttribute('data-line-key');
      var input = line.querySelector('[data-drawer-qty-input]');
      if (!lineKey || !input) return;

      var minus = e.target.closest('[data-drawer-qty-minus]');
      var plus = e.target.closest('[data-drawer-qty-plus]');
      var removeBtn = e.target.closest('[data-ejuno-cart-remove]');
      var nextQty = null;

      if (minus) nextQty = (parseInt(input.value, 10) || 0) - 1;
      if (plus) nextQty = (parseInt(input.value, 10) || 0) + 1;
      if (removeBtn) nextQty = 0;
      if (nextQty === null) return;

      e.preventDefault();
      applyLocalLineQuantity(lineKey, nextQty);
      scheduleDebouncedQtySync(lineKey, nextQty);
    });

    body.addEventListener('change', function (e) {
      var input = e.target.closest('[data-drawer-qty-input]');
      if (!input) return;
      var line = input.closest('[data-line-key]');
      if (!line) return;
      var lineKey = line.getAttribute('data-line-key');
      var nextQty = parseInt(input.value, 10);
      if (isNaN(nextQty)) return;
      applyLocalLineQuantity(lineKey, nextQty);
      scheduleDebouncedQtySync(lineKey, nextQty);
    });
  }

  function addToCart(variantId, quantity) {
    return fetch('/cart/add.js', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id: Number(variantId), quantity: quantity || 1 }),
    }).then(function (res) {
      if (!res.ok) {
        return res.json().then(function (err) {
          throw new Error(err.description || 'Could not add to cart');
        });
      }
      return res.json();
    });
  }

  function bindOpen() {
    document.querySelectorAll('[data-ejuno-cart-open]').forEach(function (el) {
      if (el.dataset.ejunoCartOpenBound) return;
      el.dataset.ejunoCartOpenBound = '1';
      el.addEventListener('click', function (e) {
        e.preventDefault();
        refreshCart().then(openDrawer);
      });
    });
  }

  function bindClose() {
    document.querySelectorAll('[data-ejuno-cart-close]').forEach(function (el) {
      if (el.dataset.ejunoCartCloseBound) return;
      el.dataset.ejunoCartCloseBound = '1';
      el.addEventListener('click', closeDrawer);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawer();
    });
  }

  function bindCartPageQty() {
    var form = document.getElementById('ejuno-cart-form');
    if (!form || form.dataset.ejunoCartQtyBound) return;
    form.dataset.ejunoCartQtyBound = '1';

    function handleCartPageQtyChange(line, nextQty) {
      if (!line) return;
      var lineKey = line.getAttribute('data-line-key');
      if (!lineKey) return;
      ensureCartState()
        .then(function () {
          applyLocalLineQuantity(lineKey, nextQty);
          scheduleDebouncedQtySync(lineKey, nextQty);
        })
        .catch(function (err) {
          if (typeof showNotification === 'function') {
            showNotification(err.message || 'Could not update cart', 'error');
          }
        });
    }

    form.addEventListener('click', function (e) {
      var line = e.target.closest('[data-line-key]');
      if (!line || !form.contains(line)) return;
      var input = line.querySelector('.ejuno-cart-qty__input');
      if (!input) return;

      var minus = e.target.closest('[data-qty-minus]');
      var plus = e.target.closest('[data-qty-plus]');
      var nextQty = null;
      if (minus) nextQty = (parseInt(input.value, 10) || 0) - 1;
      if (plus) nextQty = (parseInt(input.value, 10) || 0) + 1;
      if (nextQty === null) return;

      e.preventDefault();
      e.stopPropagation();
      handleCartPageQtyChange(line, nextQty);
    });

    form.addEventListener('change', function (e) {
      var input = e.target.closest('.ejuno-cart-qty__input');
      if (!input || !form.contains(input)) return;
      var line = input.closest('[data-line-key]');
      if (!line) return;
      var nextQty = parseInt(input.value, 10);
      if (isNaN(nextQty)) return;
      e.preventDefault();
      handleCartPageQtyChange(line, nextQty);
    });

    form.querySelectorAll('[data-ejuno-cart-qty]').forEach(function (wrap) {
      var input = wrap.querySelector('.ejuno-cart-qty__input');
      var minus = wrap.querySelector('[data-qty-minus]');
      if (!input || !minus) return;
      function syncButtons() {
        var val = parseInt(input.value, 10);
        if (isNaN(val)) val = 0;
        minus.disabled = val <= 0;
      }
      input.addEventListener('input', syncButtons);
      syncButtons();
    });
  }

  function bindCartPageRefresh() {
    document.querySelectorAll('[data-ejuno-cart-page-refresh]').forEach(function (btn) {
      if (btn.dataset.ejunoCartRefreshBound) return;
      btn.dataset.ejunoCartRefreshBound = '1';
      btn.addEventListener('click', function () {
        window.location.reload();
      });
    });
  }

  function getApiBase() {
    return String(window.EJUNO_API_BASE || window.EJUNO_API || 'https://ejuno-dev.skylinxtech.co/api').replace(
      /\/$/,
      ''
    );
  }

  function getCheckoutSession() {
    return {
      email: (localStorage.getItem('customerEmail') || '').trim(),
      customerId: localStorage.getItem('customerId') || '',
      authToken: localStorage.getItem('authToken') || '',
    };
  }

  function canUseProductCheckoutApi(session) {
    return !!(session && session.email && session.customerId && session.authToken);
  }

  function normalizeAuthHeader(token) {
    if (!token) return '';
    return token.indexOf('Bearer ') === 0 ? token : 'Bearer ' + token;
  }

  function decodeCheckoutUrl(raw) {
    var url = String(raw || '').trim();
    for (var i = 0; i < 2; i++) {
      if (!url || url.indexOf('%') === -1) break;
      try {
        var next = decodeURIComponent(url);
        if (next === url) break;
        url = next;
      } catch (e) {
        break;
      }
    }
    return url;
  }

  function buildCheckoutItems(cart) {
    return (cart.items || [])
      .filter(function (item) {
        return (Number(item.quantity) || 0) > 0;
      })
      .map(function (item) {
        return {
          variantId: item.variant_id != null ? item.variant_id : item.id,
          quantity: item.quantity,
        };
      });
  }

  function setCheckoutControlBusy(control, busy) {
    if (!control) return;
    if (busy) {
      control.dataset.ejunoCheckoutLabel = control.dataset.ejunoCheckoutLabel || control.textContent;
      control.setAttribute('aria-busy', 'true');
      control.classList.add('is-checkout-loading');
      control.textContent = 'Loading…';
      if ('disabled' in control) control.disabled = true;
      else control.setAttribute('aria-disabled', 'true');
      return;
    }
    if ('disabled' in control) control.disabled = false;
    control.removeAttribute('aria-disabled');
    control.removeAttribute('aria-busy');
    control.classList.remove('is-checkout-loading');
    control.textContent = control.dataset.ejunoCheckoutLabel || 'Checkout';
  }

  function startProductCheckout(control) {
    var session = getCheckoutSession();
    if (!canUseProductCheckoutApi(session)) {
      window.location.href = '/checkout';
      return Promise.resolve();
    }

    setCheckoutControlBusy(control, true);

    return ensureCartState()
      .then(function (cart) {
        var items = buildCheckoutItems(cart);
        if (!items.length) throw new Error('Your cart is empty.');
        var customerIdNum = Number(session.customerId);
        return fetch(getApiBase() + '/shopify/product-checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: normalizeAuthHeader(session.authToken),
          },
          body: JSON.stringify({
            customerId: isNaN(customerIdNum) ? session.customerId : customerIdNum,
            items: items,
            email: session.email,
          }),
        }).then(function (res) {
          return res.json().then(function (body) {
            if (!res.ok || !body || body.status !== true) {
              throw new Error((body && body.message) || 'Could not start checkout.');
            }
            return body;
          });
        });
      })
      .then(function (body) {
        var checkoutUrl = decodeCheckoutUrl(body.data);
        if (!checkoutUrl) throw new Error('Checkout link was missing from the server.');
        window.location.assign(checkoutUrl);
      })
      .catch(function (err) {
        setCheckoutControlBusy(control, false);
        if (typeof showNotification === 'function') {
          showNotification(err.message || 'Could not start checkout.', 'error');
        }
      });
  }

  function bindProductCheckout() {
    document.querySelectorAll('[data-ejuno-cart-checkout]').forEach(function (el) {
      if (el.dataset.ejunoProductCheckoutBound) return;
      el.dataset.ejunoProductCheckoutBound = '1';
      el.addEventListener('click', function (e) {
        var session = getCheckoutSession();
        if (!canUseProductCheckoutApi(session)) return;
        e.preventDefault();
        startProductCheckout(el);
      });
    });

    var cartForm = document.getElementById('ejuno-cart-form');
    if (cartForm && !cartForm.dataset.ejunoProductCheckoutBound) {
      cartForm.dataset.ejunoProductCheckoutBound = '1';
      cartForm.addEventListener('submit', function (e) {
        var sub = e.submitter;
        if (!sub || sub.name !== 'checkout') return;
        var session = getCheckoutSession();
        if (!canUseProductCheckoutApi(session)) return;
        e.preventDefault();
        startProductCheckout(sub);
      });
    }
  }

  function bindProductForms() {
    document.querySelectorAll('form.ejuno-product-form').forEach(function (form) {
      if (form.dataset.ejunoCartBound) return;
      form.dataset.ejunoCartBound = '1';
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var idInput = form.querySelector('[name="id"]');
        var submitter = e.submitter;
        var btns = document.querySelectorAll(
          'form.ejuno-product-form [type="submit"], [data-ejuno-add-to-cart], .ejuno-add-to-cart'
        );
        if (!idInput || !idInput.value) return;

        if (
          (submitter && (submitter.disabled || submitter.getAttribute('aria-disabled') === 'true')) ||
          isSelectedVariantSoldOut(form)
        ) {
          if (typeof showNotification === 'function') {
            showNotification('This product is sold out.', 'error');
          }
          return;
        }

        var busyBtns = [];
        var seen = new Set();
        btns.forEach(function (btn) {
          if (seen.has(btn)) return;
          seen.add(btn);
          if (btn.disabled || btn.getAttribute('aria-disabled') === 'true' || btn.dataset.soldOutLocked === '1') {
            return;
          }
          busyBtns.push({
            el: btn,
            wasDisabled: false,
            label: btn.textContent,
          });
          btn.disabled = true;
          btn.dataset.defaultLabel = btn.dataset.defaultLabel || btn.dataset.addLabel || btn.textContent;
          btn.textContent = 'Adding…';
        });

        addToCart(idInput.value, 1)
          .then(function () {
            return refreshCart();
          })
          .then(openDrawer)
          .catch(function (err) {
            if (typeof showNotification === 'function') {
              showNotification(err.message || 'Could not add to cart', 'error');
            }
          })
          .finally(function () {
            busyBtns.forEach(function (item) {
              var btn = item.el;
              btn.disabled = false;
              btn.removeAttribute('aria-disabled');
              btn.textContent = btn.dataset.defaultLabel || btn.dataset.addLabel || 'Add to cart';
            });
            if (typeof window.ejunoSyncCommerceAvailability === 'function') {
              window.ejunoSyncCommerceAvailability();
            }
          });
      });
    });

    document.querySelectorAll('[data-ejuno-add-to-cart]').forEach(function (btn) {
      if (btn.dataset.ejunoCartBound) return;
      btn.dataset.ejunoCartBound = '1';
      btn.addEventListener('click', function (e) {
        if (btn.disabled || btn.getAttribute('aria-disabled') === 'true' || btn.dataset.soldOutLocked === '1') {
          e.preventDefault();
          e.stopPropagation();
          if (typeof showNotification === 'function') {
            showNotification('This product is sold out.', 'error');
          }
          return;
        }
        var form = document.getElementById(btn.getAttribute('form') || 'ejuno-product-form');
        if (!form) return;
        if (isSelectedVariantSoldOut(form)) {
          e.preventDefault();
          e.stopPropagation();
          if (typeof showNotification === 'function') {
            showNotification('This product is sold out.', 'error');
          }
          return;
        }
        e.preventDefault();
        if (typeof form.requestSubmit === 'function') {
          try {
            form.requestSubmit(btn);
          } catch (err) {
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }
        } else {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      });
    });
  }

  function isSelectedVariantSoldOut(form) {
    var select = document.getElementById('ejuno-commerce-variant-select');
    if (select && select.selectedOptions && select.selectedOptions[0]) {
      return select.selectedOptions[0].getAttribute('data-available') === 'false';
    }
    var submitBtn = form && form.querySelector('[type="submit"]');
    if (submitBtn && (submitBtn.disabled || submitBtn.getAttribute('aria-disabled') === 'true' || submitBtn.dataset.soldOutLocked === '1')) {
      return true;
    }
    var anySoldOut = document.querySelector('[data-ejuno-add-to-cart][data-sold-out-locked="1"], [data-ejuno-add-to-cart][aria-disabled="true"]');
    return !!anySoldOut;
  }

  window.ejunoCart = {
    open: openDrawer,
    close: closeDrawer,
    refresh: refreshCart,
    startCheckout: startProductCheckout,
  };

  function init() {
    bindOpen();
    bindClose();
    bindDrawerLineActions();
    bindCartPageQty();
    bindCartPageRefresh();
    bindProductCheckout();
    bindProductForms();
    var cartPage = document.getElementById('ejuno-cart-form');
    refreshCart().then(function (cart) {
      if (cartPage && cart) {
        cartState = cloneCart(cart);
        updateCartPageDom(cart);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
