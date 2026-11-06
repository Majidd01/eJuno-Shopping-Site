/**
 * Shared card price helpers for API-rendered item cards.
 * Shopify variant/product prices are treated as cents; package prices as major units.
 */
(function (window) {
  function toNumber(value) {
    if (value == null || value === '') return NaN;
    if (typeof value === 'number') return value;
    var cleaned = String(value).replace(/[^0-9.,-]/g, '');
    if (cleaned === '') return NaN;
    if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(cleaned)) return Number(cleaned.replace(/,/g, ''));
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned)) return Number(cleaned.replace(/\./g, '').replace(',', '.'));
    return Number(cleaned.replace(',', '.'));
  }

  function currencySymbol() {
    if (window.EJUNO_CURRENCY_SYMBOL) return window.EJUNO_CURRENCY_SYMBOL;
    try {
      if (window.Shopify && Shopify.currency && Shopify.currency.active) {
        var active = String(Shopify.currency.active).toUpperCase();
        if (active === 'GBP') return '£';
        if (active === 'EUR') return '€';
        if (active === 'USD') return '$';
      }
    } catch (e) {}
    return '$';
  }

  function formatMajor(amount) {
    var n = toNumber(amount);
    if (!(n > 0)) return '';
    try {
      // Trello 657 v2: euro style, e.g. 24000 -> 24.000, 13363.04 -> 13.363,04
      return currencySymbol() + (function (n) { var c = Math.round(Number(n) * 100), w = Math.floor(c / 100), r = c % 100; return String(w).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (r ? ',' + (r < 10 ? '0' : '') + r : ''); })(n);
    } catch (err) {
      return currencySymbol() + String(n);
    }
  }

  function pushMajor(amounts, value) {
    var n = toNumber(value);
    if (n > 0) amounts.push(n);
  }

  function pushShopifyPrice(amounts, value) {
    if (value == null || value === '') return;
    if (typeof value === 'string' && /\.\d/.test(value)) {
      pushMajor(amounts, value);
      return;
    }
    var n = toNumber(value);
    if (!(n > 0)) return;
    // Shopify Liquid / Ajax style: integer cents
    amounts.push(n / 100);
  }

  function collectAmounts(product) {
    var amounts = [];
    if (!product || typeof product !== 'object') return amounts;

    if (Array.isArray(product.productPackages) && product.productPackages.length) {
      product.productPackages.forEach(function (pkg) {
        if (!pkg) return;
        pushMajor(amounts, pkg.price);
        pushMajor(amounts, pkg.amount);
      });
    }

    if (Array.isArray(product.variants) && product.variants.length) {
      product.variants.forEach(function (v) {
        if (!v) return;
        pushShopifyPrice(amounts, v.price);
        pushShopifyPrice(amounts, v.price_min);
      });
    }

    pushShopifyPrice(amounts, product.price);
    pushShopifyPrice(amounts, product.price_min);
    pushMajor(amounts, product.minPrice);
    pushMajor(amounts, product.startingPrice);

    return amounts;
  }

  function isStartingFromType(product) {
    var type = String((product && product.type) || '').toLowerCase();
    if (
      type === 'venue' ||
      type === 'service' ||
      type === 'villa' ||
      type.indexOf('venue') !== -1 ||
      type.indexOf('villa') !== -1 ||
      type.indexOf('accommodation') !== -1
    ) {
      return true;
    }
    return false;
  }

  function labelPartsForProduct(product) {
    var amounts = collectAmounts(product);
    if (!amounts.length) return null;
    var min = Math.min.apply(null, amounts);
    var max = Math.max.apply(null, amounts);
    var formatted = formatMajor(min);
    if (!formatted) return null;
    var starting = min !== max || isStartingFromType(product);
    return { starting: starting, amount: formatted };
  }

  function labelForProduct(product) {
    var parts = labelPartsForProduct(product);
    if (!parts) return '';
    return parts.starting ? 'Starting from ' + parts.amount : parts.amount;
  }

  function htmlForProduct(product) {
    var parts = labelPartsForProduct(product);
    if (!parts) return '';
    if (parts.starting) {
      return (
        '<div class="ejuno-card-price">' +
        '<span class="ejuno-card-price__label">Starting from</span>' +
        '<span class="ejuno-card-price__amount">' +
        parts.amount +
        '</span></div>'
      );
    }
    return (
      '<div class="ejuno-card-price"><span class="ejuno-card-price__amount">' +
      parts.amount +
      '</span></div>'
    );
  }

  window.EjunoCardPrice = {
    formatMajor: formatMajor,
    // Trello 657 v2: number only (no symbol), euro style, for PDP price rows
    formatPlain: function (v) { var s = formatMajor(v); return s ? s.slice(currencySymbol().length) : s; },
    labelForProduct: labelForProduct,
    htmlForProduct: htmlForProduct,
  };
})(window);
