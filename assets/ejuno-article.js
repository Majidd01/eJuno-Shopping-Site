(function () {
  function initArticleConcierge() {
    var modal = document.getElementById('ejunoModal');
    var openBtn = document.getElementById('contactejuno');
    var form = document.getElementById('ejunoForm');
    if (!modal || !form) return;

    var closeBtn = modal.querySelector('.ejuno-article-modal__close');
    var backdrop = modal.querySelector('.ejuno-article-modal__backdrop');
    var submitBtn = form.querySelector('button[type="submit"]');
    var successMsg = document.getElementById('ejunoSuccessMsg');
    var errorMsg = document.getElementById('ejunoErrorMsg');

    function openModal() {
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(function () {
        modal.classList.add('is-open');
      });
      document.body.classList.add('ejuno-article-modal-open');
    }

    function closeModal() {
      modal.classList.remove('is-open');
      document.body.classList.remove('ejuno-article-modal-open');
      window.setTimeout(function () {
        modal.hidden = true;
        modal.setAttribute('aria-hidden', 'true');
      }, 360);
    }

    if (openBtn) {
      openBtn.addEventListener('click', function (e) {
        e.preventDefault();
        openModal();
      });
    }

    modal.querySelectorAll('[data-ejuno-modal-close]').forEach(function (el) {
      el.addEventListener('click', closeModal);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!submitBtn) return;

      submitBtn.disabled = true;
      if (successMsg) successMsg.style.display = 'none';
      if (errorMsg) errorMsg.style.display = 'none';

      var formData = new FormData(form);
      var payload = {
        name: formData.get('name'),
        email: formData.get('email'),
        whatsapp_number: (function () {
          // Trello 672: Italy (+39) is the default code; a number typed with its own + code is kept as typed.
          var num = String(formData.get('whatsapp_number') || '').trim();
          if (num.charAt(0) === '+') return num;
          return (formData.get('whatsapp_code') || '+39') + num.replace(/^0+(?=\d{6,})/, function (z) { return (formData.get('whatsapp_code') || '+39') === '+39' ? z : ''; });
        })(),
        wedding_place: formData.get('wedding_place'),
        wedding_date: formData.get('wedding_date'),
      };

      fetch('https://ejuno-dev.skylinxtech.co/api/leads-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          if (!res.ok) throw new Error('Request failed');
          if (successMsg) successMsg.style.display = 'block';
          form.reset();
          window.setTimeout(function () {
            closeModal();
            if (successMsg) successMsg.style.display = 'none';
            submitBtn.disabled = false;
          }, 2200);
        })
        .catch(function () {
          if (errorMsg) errorMsg.style.display = 'block';
          submitBtn.disabled = false;
          window.setTimeout(function () {
            if (errorMsg) errorMsg.style.display = 'none';
          }, 5000);
        });
    });
  }

  function collapseEmptyArticleSpacers() {
    var body = document.querySelector('.ejuno-article__body');
    if (!body) return;

    body.querySelectorAll('p, h2, h3, h4, div').forEach(function (el) {
      var text = (el.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
      var onlyBreak =
        el.children.length > 0 &&
        [...el.children].every(function (child) {
          return child.tagName === 'BR';
        });
      var noMedia = !el.querySelector('img, video, iframe, table, figure, .btn, button, a.btn');
      if (noMedia && (text === '' || onlyBreak)) {
        el.classList.add('is-empty-spacer');
      }
    });
  }

  function init() {
    collapseEmptyArticleSpacers();
    initArticleConcierge();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
