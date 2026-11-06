/**
 * Couple dashboard → storefront redirects pass auth in query string.
 * Persist to localStorage (same keys as OTP login) and strip sensitive params from the URL.
 */
(function () {
  var AUTH_QUERY_KEYS = [
    'authToken',
    'customerId',
    'customerEmail',
    'customerName',
    'userRole',
    'customerRole',
    'customerType',
    'role',
    'firstName',
    'lastName'
  ];

  function normalizeAuthToken(token) {
    if (!token) return '';
    var t = String(token).trim();
    return t.indexOf('Bearer ') === 0 ? t : 'Bearer ' + t;
  }

  if (typeof window.persistCdpLoginSession !== 'function') {
    window.persistCdpLoginSession = function persistCdpLoginSession(payload, fallbackRole) {
      var root = payload && payload.data ? payload.data : payload || {};
      var user = root.user || {};
      var customerId = root.customerId || user.customerId || user._id || '';
      var authToken = root.authToken || root.token || user.authToken || user.token || '';
      var contactEmail =
        root.contactEmail || user.contactEmail || root.email || user.email || root.customerEmail || '';
      var firstName = root.firstName || user.firstName || '';
      var lastName = root.lastName || user.lastName || '';
      var role = String(
        root.role ||
          root.customerRole ||
          root.userRole ||
          user.role ||
          user.customerRole ||
          root.customerType ||
          user.customerType ||
          ''
      ).toLowerCase();
      if (!role && fallbackRole) {
        role = String(fallbackRole).toLowerCase();
      }
      if (customerId) localStorage.setItem('customerId', String(customerId));
      if (authToken) localStorage.setItem('authToken', normalizeAuthToken(authToken));
      if (contactEmail) localStorage.setItem('customerEmail', contactEmail);
      if (firstName) localStorage.setItem('customerFirstName', firstName);
      if (lastName) localStorage.setItem('customerLastName', lastName);
      if (role) {
        localStorage.setItem('customerRole', role);
        localStorage.setItem(
          'customerType',
          role === 'guest' ? 'guest' : role === 'couple' ? 'couple' : role
        );
      }
      try {
        document.dispatchEvent(new CustomEvent('cdpAuthChanged'));
      } catch (e) {}
      if (typeof window.syncCdpRegistryButtonVisibility === 'function') {
        window.syncCdpRegistryButtonVisibility();
      }
      return { customerId: customerId, authToken: authToken, role: role };
    };
  }

  function stripAuthParamsFromUrl() {
    try {
      var url = new URL(window.location.href);
      var stripped = false;
      AUTH_QUERY_KEYS.forEach(function (key) {
        if (url.searchParams.has(key)) {
          url.searchParams.delete(key);
          stripped = true;
        }
      });
      if (stripped) {
        var next = url.pathname + url.search + url.hash;
        window.history.replaceState({}, '', next);
      }
    } catch (e) {}
  }

  function applyEjunoAuthFromUrl() {
    try {
      var urlParams = new URLSearchParams(window.location.search);
      var authToken = urlParams.get('authToken');
      var customerId = urlParams.get('customerId');
      if (!authToken && !customerId) {
        return false;
      }

      var payload = {
        authToken: authToken || undefined,
        customerId: customerId || undefined,
        contactEmail: urlParams.get('customerEmail') || undefined,
        firstName: urlParams.get('firstName') || undefined,
        lastName: urlParams.get('lastName') || undefined,
        customerRole:
          urlParams.get('userRole') ||
          urlParams.get('customerRole') ||
          urlParams.get('role') ||
          undefined,
        customerType: urlParams.get('customerType') || undefined
      };

      var customerName = urlParams.get('customerName');
      if (customerName) {
        var decodedName = decodeURIComponent(customerName.replace(/\+/g, ' ')).trim();
        if (decodedName) {
          localStorage.setItem('customerName', decodedName);
          if (!payload.firstName) {
            var nameParts = decodedName.split(/\s+/);
            payload.firstName = nameParts[0] || '';
            payload.lastName = nameParts.slice(1).join(' ') || '';
          }
        }
      }

      window.persistCdpLoginSession(payload);
      stripAuthParamsFromUrl();
      return true;
    } catch (e) {
      return false;
    }
  }

  window.applyEjunoAuthFromUrl = applyEjunoAuthFromUrl;
  applyEjunoAuthFromUrl();
})();
