(function () {
  var AUTH_KEYS = [
    'authToken',
    'customerId',
    'customerEmail',
    'customerFirstName',
    'customerLastName',
    'customerName',
    'customerRole',
    'customerType',
    'customerPhone'
  ];

  function readSession() {
    var customerId = localStorage.getItem('customerId');
    var authToken = localStorage.getItem('authToken');
    var role = String(localStorage.getItem('customerRole') || localStorage.getItem('customerType') || '')
      .toLowerCase()
      .trim();
    var name =
      localStorage.getItem('customerName') ||
      [localStorage.getItem('customerFirstName'), localStorage.getItem('customerLastName')]
        .filter(Boolean)
        .join(' ')
        .trim();
    return {
      loggedIn: !!(customerId && authToken),
      role: role,
      name: name,
      email: localStorage.getItem('customerEmail') || ''
    };
  }

  function dashboardUrlForRole(role, root) {
    var couple = root.getAttribute('data-url-couple') || 'https://ejuno-staging.web.app/couple-dashboard';
    var vendor = root.getAttribute('data-url-vendor') || 'https://vendor-staging-ejuno.web.app/';
    var guest = root.getAttribute('data-url-guest') || 'https://ejuno-staging.web.app/guest/login';
    if (role === 'vendor') return vendor;
    if (role === 'guest') return guest;
    return couple;
  }

  function syncAccountMenus() {
    var session = readSession();
    document.querySelectorAll('[data-header-account]').forEach(function (root) {
      var greeting = root.querySelector('[data-header-account-greeting]');
      var signedOut = root.querySelector('[data-header-account-signed-out]');
      var signedIn = root.querySelector('[data-header-account-signed-in]');
      var dashboard = root.querySelector('[data-header-account-dashboard]');
      var toggle = root.querySelector('[data-header-account-toggle]');

      if (session.loggedIn) {
        if (signedOut) signedOut.hidden = true;
        if (signedIn) signedIn.hidden = false;
        if (greeting) {
          greeting.hidden = false;
          greeting.textContent = session.name
            ? 'Signed in as ' + session.name
            : session.email
              ? 'Signed in as ' + session.email
              : 'You are signed in';
        }
        if (dashboard) {
          dashboard.href = dashboardUrlForRole(session.role, root);
          if (session.role === 'vendor') {
            dashboard.textContent = 'Open vendor portal';
          } else if (session.role === 'guest') {
            dashboard.textContent = 'Open guest account';
          } else {
            dashboard.textContent = 'Open couple dashboard';
          }
        }
        if (toggle) toggle.setAttribute('aria-label', 'Account menu — signed in');
      } else {
        if (signedOut) signedOut.hidden = false;
        if (signedIn) signedIn.hidden = true;
        if (greeting) greeting.hidden = true;
        if (toggle) toggle.setAttribute('aria-label', 'Account — log in');
      }
    });

    document.querySelectorAll('[data-mobile-account]').forEach(function (block) {
      var session = readSession();
      var loggedOut = block.querySelector('[data-mobile-account-logged-out]');
      var loggedIn = block.querySelector('[data-mobile-account-logged-in]');
      var label = block.querySelector('[data-mobile-account-label]');
      var head = block.querySelector('[data-mobile-account-head]');
      var nameEl = block.querySelector('[data-mobile-account-name]');
      var roleEl = block.querySelector('[data-mobile-account-role]');
      var dash = block.querySelector('[data-mobile-account-dashboard]');
      if (session.loggedIn) {
        if (loggedOut) loggedOut.hidden = true;
        if (loggedIn) loggedIn.hidden = false;
        if (head) head.hidden = true;
        if (nameEl) {
          nameEl.textContent = session.name || session.email || 'Your account';
        }
        if (roleEl) {
          if (session.role === 'vendor') {
            roleEl.textContent = 'Vendor account';
          } else if (session.role === 'guest') {
            roleEl.textContent = 'Guest account';
          } else {
            roleEl.textContent = 'Couple account';
          }
        }
        if (dash) {
          dash.href = dashboardUrlForRole(session.role, block);
          if (session.role === 'vendor') {
            dash.textContent = 'Open vendor portal';
          } else if (session.role === 'guest') {
            dash.textContent = 'Open guest account';
          } else {
            dash.textContent = 'Open couple dashboard';
          }
        }
      } else {
        if (loggedOut) loggedOut.hidden = false;
        if (loggedIn) loggedIn.hidden = true;
        if (head) head.hidden = false;
        if (label) label.textContent = 'Account';
      }
    });
  }

  function closeAllAccountMenus() {
    document.querySelectorAll('[data-header-account-menu]').forEach(function (menu) {
      menu.hidden = true;
    });
    document.querySelectorAll('[data-header-account-toggle]').forEach(function (btn) {
      btn.setAttribute('aria-expanded', 'false');
    });
    document.querySelectorAll('[data-header-account]').forEach(function (root) {
      root.classList.remove('is-open');
    });
  }

  function initDesktopAccount() {
    document.querySelectorAll('[data-header-account]').forEach(function (root) {
      var toggle = root.querySelector('[data-header-account-toggle]');
      var menu = root.querySelector('[data-header-account-menu]');
      if (!toggle || !menu) return;

      toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        var willOpen = menu.hidden;
        if (willOpen && typeof window.ejunoCloseHeaderSearch === 'function') {
          window.ejunoCloseHeaderSearch();
        }
        closeAllAccountMenus();
        if (willOpen) {
          menu.hidden = false;
          toggle.setAttribute('aria-expanded', 'true');
          root.classList.add('is-open');
        }
      });
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('[data-header-account]')) closeAllAccountMenus();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAllAccountMenus();
    });
  }

  function initSignOut() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-header-account-signout], [data-mobile-account-signout]');
      if (!btn) return;
      AUTH_KEYS.forEach(function (key) {
        localStorage.removeItem(key);
      });
      try {
        document.dispatchEvent(new CustomEvent('cdpAuthChanged'));
      } catch (err) {}
      if (typeof window.syncCdpRegistryButtonVisibility === 'function') {
        window.syncCdpRegistryButtonVisibility();
      }
      closeAllAccountMenus();
      syncAccountMenus();
    });
  }

  function initStorefrontLoginLinks() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('[data-ejuno-storefront-login]');
      if (!link || typeof window.showLoginPopups !== 'function') return;
      e.preventDefault();
      var role = link.getAttribute('data-ejuno-storefront-login');
      closeAllAccountMenus();
      window.showLoginPopups(null);
      if (!role) return;
      setTimeout(function () {
        var tabId = role === 'guest' ? 'guestTab' : 'coupleTab';
        var popup = document.querySelector('.ejuno-login-popup');
        if (!popup) return;
        var tabBtn = popup.querySelector('.tab-btn[data-tab="' + tabId + '"]');
        if (tabBtn) tabBtn.click();
      }, 50);
    });
  }

  function init() {
    syncAccountMenus();
    initDesktopAccount();
    initSignOut();
    initStorefrontLoginLinks();
    document.addEventListener('cdpAuthChanged', syncAccountMenus);
    window.addEventListener('storage', function (e) {
      if (AUTH_KEYS.indexOf(e.key) !== -1) syncAccountMenus();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.ejunoSyncHeaderAccount = syncAccountMenus;
  window.ejunoCloseHeaderAccountMenus = closeAllAccountMenus;
})();
