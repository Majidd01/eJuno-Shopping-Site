(function () {
  document.addEventListener(
    'wheel',
    function (e) {
      if (document.activeElement && document.activeElement.type === 'number') {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  function boot() {
    var formRoot = document.getElementById('vendorForm');
    if (!formRoot) return;

    var termcheck = document.getElementById('termcheck');
    var submitButton = document.querySelector('#vendorForm .btn-submit');
    var loader = document.querySelector('#vendorForm .spinner-border');
    var phoneInput = document.getElementById('phone');
    if (!termcheck || !submitButton || !loader || !phoneInput) return;

    var tagify = null;
    var MIN_LENGTH = 7;
    var MAX_LENGTH = 15;

    function showFieldError(fieldId, errorId) {
      var field = document.getElementById(fieldId);
      var error = document.getElementById(errorId);
      if (field) field.classList.add('input-error');
      if (error) error.classList.add('visible');
    }

    function hideFieldError(fieldId, errorId) {
      var field = document.getElementById(fieldId);
      var error = document.getElementById(errorId);
      if (field) field.classList.remove('input-error');
      if (error) error.classList.remove('visible');
    }

    function showFormError(message) {
      var formError = document.getElementById('form-error');
      formError.textContent = message;
      formError.classList.add('visible');
    }

    function hideFormError() {
      var formError = document.getElementById('form-error');
      formError.textContent = '';
      formError.classList.remove('visible');
    }

    function clearAllErrors() {
      formRoot.querySelectorAll('.field-error').forEach(function (el) {
        el.classList.remove('visible');
      });
      formRoot.querySelectorAll('.input-error').forEach(function (el) {
        el.classList.remove('input-error');
      });
      hideFormError();
    }

    function validateEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function validateName(value) {
      return /^[A-Za-z0-9]+$/.test(value);
    }

    window.toggleFields = function () {
      var vendorType = document.getElementById('vendor-type').value;
      document.getElementById('service-category-group').style.display =
        vendorType === 'Service' ? 'block' : 'none';
      document.getElementById('product-category-group').style.display =
        vendorType === 'Product Vendor' ? 'block' : 'none';
      document.getElementById('venue-services-group').style.display =
        vendorType === 'Venue' ? 'block' : 'none';

      if (vendorType === 'Venue') {
        var inputField = document.getElementById('venue-services');
        if (typeof Tagify !== 'undefined' && inputField && !tagify) {
          tagify = new Tagify(inputField, {
            originalInputValueFormat: function (valuesArr) {
              return valuesArr.map(function (item) {
                return item.value;
              }).join(', ');
            },
          });
        }
      } else if (tagify) {
        tagify.destroy();
        tagify.removeAllTags();
        tagify = null;
      }
    };

    window.toggleBusinessField = function () {
      var applicationType = document.getElementById('application-type').value;
      document.querySelector('#business-name').closest('.form-group').style.display =
        applicationType === 'business' ? 'block' : 'none';
    };

    phoneInput.addEventListener('input', function () {
      var value = this.value.toString().replace(/\D/g, '');
      if (value.length > MAX_LENGTH) value = value.slice(0, MAX_LENGTH);
      this.value = value;
      if (value.length < MIN_LENGTH) {
        showFieldError('phone', 'phone-error');
        document.getElementById('phone-error').textContent =
          'Phone must be at least ' + MIN_LENGTH + ' digits';
      } else {
        hideFieldError('phone', 'phone-error');
      }
    });

    phoneInput.addEventListener('blur', function () {
      var value = this.value.toString();
      if (!value) {
        showFieldError('phone', 'phone-error');
        document.getElementById('phone-error').textContent = 'Phone number is required';
        return;
      }
      if (value.length < MIN_LENGTH || value.length > MAX_LENGTH) {
        showFieldError('phone', 'phone-error');
        document.getElementById('phone-error').textContent =
          'Phone must be ' + MIN_LENGTH + '-' + MAX_LENGTH + ' digits';
      }
    });

    /* Trello 798: Register stays disabled (attribute + aria) until the Terms box is ticked */
    function syncSubmit() {
      var off = !termcheck.checked;
      submitButton.disabled = off;
      submitButton.setAttribute('aria-disabled', off ? 'true' : 'false');
    }
    syncSubmit();
    termcheck.addEventListener('change', syncSubmit);
    window.addEventListener('pageshow', syncSubmit);
    setTimeout(syncSubmit, 300);

    ['first-name', 'last-name', 'email', 'phone'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', function () {
        hideFieldError(id, id + '-error');
        hideFormError();
      });
    });

    ['first-name', 'last-name'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', function () {
        this.value = this.value.replace(/[^A-Za-z0-9]/g, '');
      });
    });

    ['vendor-type', 'application-type'].forEach(function (id) {
      document.getElementById(id).addEventListener('change', function () {
        hideFieldError(id, id + '-error');
        hideFormError();
      });
    });

    document.getElementById('email').addEventListener('blur', function () {
      var email = this.value;
      if (email && !validateEmail(email)) {
        showFieldError('email', 'email-error');
      } else {
        hideFieldError('email', 'email-error');
      }
    });

    termcheck.addEventListener('change', function () {
      if (termcheck.checked) hideFieldError('termcheck', 'termcheck-error');
    });

    submitButton.addEventListener('click', async function (e) {
      e.preventDefault();
      clearAllErrors();

      var firstName = document.getElementById('first-name').value.trim();
      var lastName = document.getElementById('last-name').value.trim();
      var email = document.getElementById('email').value.trim();
      var countryCode = document.getElementById('country-code').value;
      var phone = document.getElementById('phone').value.trim();
      var businessName = document.getElementById('business-name').value;
      var vendorType = document.getElementById('vendor-type').value;
      var applicationType = document.getElementById('application-type').value;
      var hasError = false;

      if (!firstName || !validateName(firstName)) {
        showFieldError('first-name', 'first-name-error');
        document.getElementById('first-name-error').textContent =
          'Only letters and numbers are allowed';
        hasError = true;
      }
      if (!lastName || !validateName(lastName)) {
        showFieldError('last-name', 'last-name-error');
        document.getElementById('last-name-error').textContent =
          'Only letters and numbers are allowed';
        hasError = true;
      }
      if (!email || !validateEmail(email)) {
        showFieldError('email', 'email-error');
        hasError = true;
      }
      if (!phone || phone.length < 7 || phone.length > 15) {
        showFieldError('phone', 'phone-error');
        document.getElementById('phone-error').textContent =
          'Phone must be between 7 and 15 digits';
        hasError = true;
      }
      if (!vendorType) {
        showFieldError('vendor-type', 'vendor-type-error');
        hasError = true;
      }
      if (!applicationType) {
        showFieldError('application-type', 'application-type-error');
        hasError = true;
      }
      if (!termcheck.checked) {
        showFieldError('termcheck', 'termcheck-error');
        hasError = true;
      }

      if (hasError) {
        showFormError('Please fix the errors above and try again.');
        return;
      }

      var data = {
        type: vendorType,
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: countryCode + phone,
        businessName: businessName,
        applicationType: applicationType,
      };

      if (vendorType === 'Service') {
        var serviceCategory = document.getElementById('service-category').value;
        if (serviceCategory) data.serviceType = serviceCategory;
      } else if (vendorType === 'Product Vendor') {
        var productCategory = document.getElementById('product-category').value;
        if (productCategory) data.mainProductCategory = productCategory;
      } else if (vendorType === 'Venue') {
        var services = document
          .getElementById('venue-services')
          .value.split(',')
          .map(function (s) {
            return s.trim();
          })
          .filter(function (s) {
            return s;
          });
        if (services.length > 0) data.services = services;
      }

      try {
        submitButton.disabled = true;
        loader.classList.add('btn-loader');

        var apiBase = String(window.EJUNO_API_BASE || window.EJUNO_API || 'https://ejuno-dev.skylinxtech.co/api').replace(/\/$/, '');
        var response = await fetch(apiBase + '/vendor-applications/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        var responseBody = await response.json();
        syncSubmit();
        loader.classList.remove('btn-loader');

        if (response.ok) {
          document.querySelector('.wedding_form_content').innerHTML =
            '<div class="wedding_form_content-new">' +
            '<div class="icon-animated icon-animated-tick" tabindex="-1" aria-hidden="true">' +
            '<svg class="circle" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"/></svg>' +
            '<div class="tick">' +
            '<svg class="tick-leg1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 52"><polygon points="1,41 0,48 25,52 25,45" /></svg>' +
            '<svg class="tick-leg2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 52"><polygon points="18,45 25,47 25,0 18,0" /></svg>' +
            '</div></div>' +
            '<h2>Thank you for showing your interest!</h2>' +
            '<p>Please check your email for further instructions. If you don’t see it, be sure to check your spam or junk folder.</p>' +
            '</div>';
        } else if (response.status === 409 || response.status === 400) {
          showFormError(responseBody.message);
        } else {
          showFormError('Failed to register. Please try again.');
        }
      } catch (err) {
        syncSubmit();
        loader.classList.remove('btn-loader');
        showFormError('An error occurred. Please try again later.');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('shopify:section:load', boot);
})();
