/* Trello 666 / 668 (reopen): make support@ejuno.io work everywhere on the web.
 * 1. Plain-text addresses inside page content become mailto links (a trailing "." stays outside the link).
 * 2. mailto addresses are lower-cased (support@eJuno.io -> support@ejuno.io).
 * 3. On desktop, a mailto click often does nothing when no mail app is set up, so a small card offers
 *    "Open in Gmail", "Open in Outlook" and "Copy address" next to the link. The normal mailto still fires.
 */
(function () {
  'use strict';
  var EMAIL_RE = /([A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})/g;
  var SCOPE = 'main, #MainContent, .article-body, .ejuno-policy-content__body, .rte, .contact-layout';

  function linkify(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || n.nodeValue.indexOf('@') === -1) return NodeFilter.FILTER_REJECT;
        var p = n.parentNode;
        while (p && p !== root) {
          var tag = p.nodeName;
          if (tag === 'A' || tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'BUTTON' || tag === 'OPTION') return NodeFilter.FILTER_REJECT;
          p = p.parentNode;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (n) {
      var text = n.nodeValue;
      EMAIL_RE.lastIndex = 0;
      if (!EMAIL_RE.test(text)) return;
      EMAIL_RE.lastIndex = 0;
      var frag = document.createDocumentFragment();
      var last = 0, m;
      while ((m = EMAIL_RE.exec(text))) {
        var addr = m[1].replace(/\.+$/, '');
        frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        var a = document.createElement('a');
        a.href = 'mailto:' + addr.toLowerCase();
        a.textContent = addr.toLowerCase();
        frag.appendChild(a);
        last = m.index + addr.length;
      }
      frag.appendChild(document.createTextNode(text.slice(last)));
      n.parentNode.replaceChild(frag, n);
    });
  }

  function normalise() {
    document.querySelectorAll('a[href^="mailto:" i]').forEach(function (a) {
      var href = a.getAttribute('href');
      var addr = href.replace(/^mailto:/i, '').split('?')[0];
      var rest = href.indexOf('?') > -1 ? href.slice(href.indexOf('?')) : '';
      if (addr !== addr.toLowerCase()) a.setAttribute('href', 'mailto:' + addr.toLowerCase() + rest);
      if (/@/.test(a.textContent) && a.textContent.trim() !== a.textContent.trim().toLowerCase() && a.children.length === 0) {
        a.textContent = a.textContent.trim().toLowerCase();
      }
      if (a.title && /^mailto:/i.test(a.title)) a.removeAttribute('title');
    });
  }

  var card;
  function closeCard() { if (card) { card.remove(); card = null; } }
  function showCard(a, addr) {
    closeCard();
    card = document.createElement('div');
    card.className = 'ej-mailto-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', 'Email ' + addr);
    card.innerHTML =
      '<p class="ej-mailto-card__addr"></p>' +
      '<div class="ej-mailto-card__actions">' +
      '<a class="ej-mailto-card__btn" target="_blank" rel="noopener" data-gmail>Open in Gmail</a>' +
      '<a class="ej-mailto-card__btn" target="_blank" rel="noopener" data-outlook>Open in Outlook</a>' +
      '<button type="button" class="ej-mailto-card__btn" data-copy>Copy address</button>' +
      '</div>';
    card.querySelector('.ej-mailto-card__addr').textContent = addr;
    card.querySelector('[data-gmail]').href = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(addr);
    card.querySelector('[data-outlook]').href = 'https://outlook.live.com/mail/0/deeplink/compose?to=' + encodeURIComponent(addr);
    card.querySelector('[data-copy]').addEventListener('click', function (e) {
      var btn = e.currentTarget;
      var done = function () { btn.textContent = 'Copied'; setTimeout(closeCard, 1200); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(addr).then(done, done);
      else { var t = document.createElement('textarea'); t.value = addr; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (x) {} t.remove(); done(); }
    });
    document.body.appendChild(card);
    var r = a.getBoundingClientRect();
    var left = Math.min(Math.max(12, r.left + window.scrollX), window.scrollX + document.documentElement.clientWidth - card.offsetWidth - 12);
    card.style.left = left + 'px';
    card.style.top = (r.bottom + window.scrollY + 8) + 'px';
  }

  function onClick(e) {
    var a = e.target.closest && e.target.closest('a[href^="mailto:" i]');
    if (!a) { if (card && !card.contains(e.target)) closeCard(); return; }
    var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!fine) return;
    var addr = a.getAttribute('href').replace(/^mailto:/i, '').split('?')[0].toLowerCase();
    setTimeout(function () { showCard(a, addr); }, 0);
  }

  function init() {
    document.querySelectorAll(SCOPE).forEach(function (root) { linkify(root); });
    normalise();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.addEventListener('load', function () { setTimeout(init, 300); });
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeCard(); });
  window.addEventListener('resize', closeCard);
})();
