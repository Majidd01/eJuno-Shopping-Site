(function () {
  function formatEjunoBrand(text) {
    if (text == null) return '';
    // Trello 675: e-mail addresses and web addresses keep their lower-case spelling (support@ejuno.io).
    return String(text).split(/([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/).map(function (part, i) {
      if (i % 2 === 1) return part;
      return part
        .replace(/\bEJUNO\b/g, 'eJuno')
        .replace(/\bEjuno\b/g, 'eJuno')
        .replace(/\bejuno\b/g, 'eJuno');
    }).join('');
  }

  function getToastHost() {
    var host = document.getElementById('ejuno-toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'ejuno-toast-host';
      host.className = 'ejuno-toast-host';
      host.setAttribute('aria-live', 'polite');
      host.setAttribute('aria-relevant', 'additions');
      document.body.appendChild(host);
    }
    return host;
  }

  function getCartNoticesHost() {
    var drawer = document.getElementById('ejuno-cart-drawer');
    if (!drawer || !drawer.classList.contains('is-open')) return null;
    return drawer.querySelector('[data-ejuno-cart-notices]');
  }

  function dismissToast(node) {
    if (!node || !node.parentNode) return;
    node.classList.add('ejuno-toast--out');
    setTimeout(function () {
      node.remove();
    }, 220);
  }

  function findDuplicateToast(host, text) {
    if (!host) return null;
    var nodes = host.querySelectorAll('.ejuno-toast, .ejuno-cart-notice');
    for (var i = 0; i < nodes.length; i += 1) {
      var body = nodes[i].querySelector('.ejuno-toast__body, .ejuno-cart-notice__body');
      if (body && body.textContent === text) return nodes[i];
    }
    return null;
  }

  function ejunoShowNotification(message, type) {
    var text = formatEjunoBrand(message);
    if (!text) return;
    var kind = type === 'error' || type === 'warn' || type === 'success' ? type : 'success';
    var cartHost = getCartNoticesHost();
    var host = cartHost || getToastHost();

    var existing = findDuplicateToast(host, text);
    if (existing) {
      existing.classList.remove('ejuno-toast--out');
      return;
    }

    var toast = document.createElement('div');
    toast.className = cartHost
      ? 'ejuno-cart-notice ejuno-cart-notice--' + kind
      : 'ejuno-toast ejuno-toast--' + kind;
    toast.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    toast.setAttribute('data-toast-text', text);

    var body = document.createElement('div');
    body.className = cartHost ? 'ejuno-cart-notice__body' : 'ejuno-toast__body';
    body.textContent = text;

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = cartHost ? 'ejuno-cart-notice__close' : 'ejuno-toast__close';
    closeBtn.setAttribute('aria-label', 'Dismiss notification');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', function () {
      dismissToast(toast);
    });

    toast.appendChild(body);
    toast.appendChild(closeBtn);
    host.appendChild(toast);

    var timer = setTimeout(function () {
      dismissToast(toast);
    }, cartHost ? 7000 : 6000);
    toast.addEventListener('mouseenter', function () {
      clearTimeout(timer);
    });
    toast.addEventListener('mouseleave', function () {
      timer = setTimeout(function () {
        dismissToast(toast);
      }, 3200);
    });
  }

  function shouldSkipBrandNode(node) {
    var parent = node.parentElement;
    if (!parent) return true;
    var tag = parent.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEXTAREA') return true;
    if (parent.closest('[data-skip-ejuno-brand]')) return true;
    if (parent.closest('.logo, .footer-logo, .logo-mark')) return true;
    return false;
  }

  function normalizeEjunoEyebrows(root) {
    var base = root || document.body;
    if (!base || !base.querySelectorAll) return;
    base.querySelectorAll('.eyebrow').forEach(function (eyebrow) {
      if (eyebrow.querySelector('.ejuno-brand-word')) return;
      var raw = (eyebrow.textContent || '').replace(/\s+/g, ' ').trim();
      if (!raw || !/\bejuno\b/i.test(raw)) return;
      var sepIdx = raw.indexOf(' · ');
      var vendorPart = (sepIdx >= 0 ? raw.slice(0, sepIdx) : raw).trim();
      if (vendorPart.toLowerCase() !== 'ejuno') return;
      var rest = sepIdx >= 0 ? raw.slice(sepIdx) : '';
      eyebrow.textContent = '';
      var span = document.createElement('span');
      span.className = 'ejuno-brand-word';
      span.textContent = 'eJuno';
      eyebrow.appendChild(span);
      if (rest) eyebrow.appendChild(document.createTextNode(rest));
    });
  }

  function applyEjunoBrandToPage(root) {
    var base = root || document.body;
    if (!base) return;
    var walker = document.createTreeWalker(base, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (shouldSkipBrandNode(node)) return NodeFilter.FILTER_REJECT;
        var value = node.nodeValue;
        if (!value || !/\bejuno\b/i.test(value)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    var batch = [];
    while (walker.nextNode()) {
      batch.push(walker.currentNode);
    }
    batch.forEach(function (node) {
      var next = formatEjunoBrand(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
    });
  }

  window.formatEjunoBrand = formatEjunoBrand;
  window.ejunoShowNotification = ejunoShowNotification;
  window.showNotification = ejunoShowNotification;

  function initBrand() {
    applyEjunoBrandToPage(document.body);
    normalizeEjunoEyebrows(document.body);
    if (document.body && !document.body.dataset.ejunoBrandWatch) {
      document.body.dataset.ejunoBrandWatch = '1';
      var scheduled = false;
      new MutationObserver(function () {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(function () {
          scheduled = false;
          applyEjunoBrandToPage(document.body);
          normalizeEjunoEyebrows(document.body);
        });
      }).observe(document.body, { childList: true, subtree: true, characterData: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBrand);
  } else {
    initBrand();
  }
})();
