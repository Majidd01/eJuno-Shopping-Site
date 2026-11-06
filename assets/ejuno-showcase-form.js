(function () {
  function apiBase() {
    return String(window.EJUNO_API_BASE || window.EJUNO_API || 'https://ejuno-dev.skylinxtech.co/api').replace(/\/$/, '');
  }

  function boot() {
    var formRoot = document.getElementById('showcaseWorkForm');
    if (!formRoot || formRoot.dataset.ejunoShowcaseBound === '1') return;
    formRoot.dataset.ejunoShowcaseBound = '1';

// Toast Notification Function
  function showToast(title, message, type = 'error') {
    // Remove any existing toast
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
      existingToast.remove();
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;

    toast.innerHTML = `
      <div class="toast-content">
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;

    document.body.appendChild(toast);

    // Show toast with animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Close button handler
    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    });

    // Auto-hide after 5 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  // File size validation function (5MB limit)
  function validateFileSize(file, maxSizeMB = 5) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Initialize Quill Rich Text Editor
  const quill = new Quill('#editor-container', {
    theme: 'snow',
    placeholder: 'Enter content description...',
    modules: {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ color: [] }, { background: [] }],
        ['link', 'image'],
        ['clean'],
      ],
    },
  });

  function placeCaretAtStart() {
    if (quill.getLength() <= 1) {
      quill.setSelection(0, 0, Quill.sources.SILENT);
    }
  }

  quill.root.addEventListener('focus', placeCaretAtStart);
  quill.on('selection-change', function (range) {
    if (range == null && quill.getLength() <= 1) {
      placeCaretAtStart();
    }
  });
  placeCaretAtStart();

  // Image URL display element
  const imageUrlDisplay = document.getElementById('image-url-display');
  let uploadedImageUrls = [];

  // Custom image handler for Quill
  quill.getModule('toolbar').addHandler('image', function () {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (file) {
        // Validate file size (5MB limit)
        if (!validateFileSize(file, 5)) {
          showFieldError('description-group');
          document.getElementById('description-error').textContent = 'Maximum 5MB File Allowed for images.';
          return;
        }

        try {
          // Show loading state
          const range = quill.getSelection(true);
          quill.insertText(range.index, 'Uploading image...');

          // Upload image
          const formData = new FormData();
          formData.append('path', 'article');
          formData.append('images', file);

          const res = await fetch('' + apiBase() + '/upload/public/images', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) throw new Error('Image upload failed');

          const data = await res.json();
          const imageUrl = data.data[0];

          // Remove loading text
          quill.deleteText(range.index, 'Uploading image...'.length);

          // Insert image into editor
          quill.insertEmbed(range.index, 'image', imageUrl);
          quill.setSelection(range.index + 1);

          // Store and display URL
          uploadedImageUrls.push(imageUrl);
          updateImageUrlDisplay();
        } catch (error) {
          console.error('Image upload error:', error);
          alert('Failed to upload image. Please try again.');
          // Remove loading text on error
          const currentContent = quill.getText();
          const loadingTextIndex = currentContent.indexOf('Uploading image...');
          if (loadingTextIndex !== -1) {
            quill.deleteText(loadingTextIndex, 'Uploading image...'.length);
          }
        }
      }
    };
  });

  // Update image URL display
  function updateImageUrlDisplay() {
    if (uploadedImageUrls.length > 0) {
      imageUrlDisplay.innerHTML = `
        <strong>Uploaded Image URLs:</strong>
        ${uploadedImageUrls.map((url) => `<div>${url}</div>`).join('')}
      `;
      imageUrlDisplay.classList.add('show');
    } else {
      imageUrlDisplay.classList.remove('show');
    }
  }

  const termcheck = document.getElementById('termcheck');
  const submitButton = formRoot.querySelector('.btn-submit');
  const loader = formRoot.querySelector('.spinner-border');
  if (!submitButton || typeof Quill === 'undefined') return;

  const photosInput = document.getElementById('photos');
  const addMoreBtn = document.getElementById('add-more-btn');
  const photosCounter = document.getElementById('photos-counter');
  const photosErrorEl = document.getElementById('photos-error');
  const photosPreview = document.getElementById('photos-preview');

  let selectedPhotos = [];

  /* Trello 798: real disabled + aria-disabled until the box is ticked; re-synced after back/refresh autofill */
  const syncSubmit = () => {
    const off = !termcheck || !termcheck.checked;
    submitButton.disabled = off;
    submitButton.setAttribute('aria-disabled', off ? 'true' : 'false');
  };
  syncSubmit();
  termcheck.addEventListener('change', syncSubmit);
  window.addEventListener('pageshow', syncSubmit);
  setTimeout(syncSubmit, 300);

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showFieldError(id) {
    document.getElementById(id)?.classList.add('error');
  }

  function hideFieldError(id) {
    document.getElementById(id)?.classList.remove('error');
  }

  function syncPhotosToInput() {
    const dt = new DataTransfer();
    selectedPhotos.forEach((f) => dt.items.add(f));
    photosInput.files = dt.files;
  }

  function renderPreviews() {
    photosPreview.innerHTML = '';

    if (!selectedPhotos.length) {
      photosPreview.style.display = 'none';
      return;
    }

    photosPreview.style.display = 'flex'; 
    selectedPhotos.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'photo-preview-item';

      const img = document.createElement('img');
      img.alt = 'preview';

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'remove-photo-btn';
      removeBtn.innerHTML = '&times;';

      removeBtn.addEventListener('click', () => {
        selectedPhotos.splice(index, 1);
        syncPhotosToInput();
        updatePhotosUI();
      });

      const reader = new FileReader();
      reader.onload = (e) => (img.src = e.target.result);
      reader.readAsDataURL(file);

      item.appendChild(img);
      item.appendChild(removeBtn);
      photosPreview.appendChild(item);
    });
  }

  function updatePhotosUI() {
    photosCounter.textContent = `${selectedPhotos.length} / 3 selected`;
    photosCounter.style.display = selectedPhotos.length ? 'block' : 'none';
    addMoreBtn.style.display = selectedPhotos.length ? 'inline-block' : 'none';
    addMoreBtn.disabled = selectedPhotos.length >= 3;
    renderPreviews();
  }

  photosInput.addEventListener('change', () => {
    const newFiles = Array.from(photosInput.files);
    const totalFiles = selectedPhotos.length + newFiles.length;
    
    // Check if adding new files would exceed the limit
    if (totalFiles > 3) {
      showFieldError('photos-group');
      photosErrorEl.textContent = 'Maximum 3 images are allowed.';
      
      // Reset the input
      photosInput.value = '';
      return;
    }
    
    // Validate file sizes (5MB limit)
    const oversizedFiles = newFiles.filter(file => !validateFileSize(file, 5));
    if (oversizedFiles.length > 0) {
      showFieldError('photos-group');
      photosErrorEl.textContent = 'Maximum 5MB file allowed per image.';
      
      // Reset the input
      photosInput.value = '';
      return;
    }
    
    // Add new files if within limit and size requirements
    hideFieldError('photos-group');
    selectedPhotos = [...selectedPhotos, ...newFiles];
    syncPhotosToInput();
    updatePhotosUI();
  });

  addMoreBtn.onclick = () => photosInput.click();

  // Clear validation errors on input
  document.getElementById('applicant-name').addEventListener('input', () => {
    hideFieldError('applicant-group');
  });

  document.getElementById('business-name').addEventListener('input', () => {
    hideFieldError('business-group');
  });

  document.getElementById('email').addEventListener('input', (e) => {
    const emailValue = e.target.value.trim();
    // Only hide error if email is valid
    if (validateEmail(emailValue)) {
      hideFieldError('email-group');
    } else if (emailValue.length > 0) {
      // Show error if user has typed something but it's not valid
      showFieldError('email-group');
    }
  });

  document.getElementById('content-title').addEventListener('input', () => {
    hideFieldError('title-group');
  });

  // Clear error when user types in the rich text editor
  quill.on('text-change', function() {
    const html = quill.root.innerHTML;
    document.getElementById('content-description').value = html;
    
    // Hide error when user starts typing
    if (quill.getText().trim().length > 0) {
      hideFieldError('description-group');
    }
  });

  // Clear error when checkbox is checked
  termcheck.addEventListener('change', () => {
    if (termcheck.checked) {
      hideFieldError('terms-group');
    }
  });

  async function uploadImages(files) {
    const formData = new FormData();
    formData.append('path', 'article');

    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }

    const res = await fetch('' + apiBase() + '/upload/public/images', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error('Image upload failed');
    const data = await res.json();
    return data.data || [];
  }

  function buildBodyHtml(descriptionHtml) {
    // Only return the rich HTML content from Quill editor
    // Uploaded photos are sent separately in the images array
    return descriptionHtml;
  }

  submitButton.addEventListener('click', async (e) => {
    e.preventDefault();

    const applicantName = document.getElementById('applicant-name').value.trim();
    const businessName = document.getElementById('business-name').value.trim();
    const email = document.getElementById('email').value.trim();
    const title = document.getElementById('content-title').value.trim();
    const description = quill.getText().trim(); // Get text from Quill editor

    let valid = true;
    let firstErrorField = null;

    if (!applicantName) {
      showFieldError('applicant-group');
      if (!firstErrorField) firstErrorField = 'applicant-group';
      valid = false;
    }
    if (!businessName) {
      showFieldError('business-group');
      if (!firstErrorField) firstErrorField = 'business-group';
      valid = false;
    }
    if (!validateEmail(email)) {
      showFieldError('email-group');
      if (!firstErrorField) firstErrorField = 'email-group';
      valid = false;
    }
    if (!title) {
      showFieldError('title-group');
      if (!firstErrorField) firstErrorField = 'title-group';
      valid = false;
    }
    if (!selectedPhotos.length) {
      photosErrorEl.textContent = 'Images are required.';
      showFieldError('photos-group');
      if (!firstErrorField) firstErrorField = 'photos-group';
      valid = false;
    }
    if (!description) {
      showFieldError('description-group');
      if (!firstErrorField) firstErrorField = 'description-group';
      valid = false;
    }
    if (!termcheck.checked) {
      showFieldError('terms-group');
      if (!firstErrorField) firstErrorField = 'terms-group';
      valid = false;
    }

    if (!valid) {
      // Scroll to the first error field
      if (firstErrorField) {
        const errorElement = document.getElementById(firstErrorField);
        if (errorElement) {
          errorElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          
          // Focus on the input field within the error group
          const inputField = errorElement.querySelector('input, textarea, select');
          if (inputField && inputField.id !== 'termcheck') {
            setTimeout(() => inputField.focus(), 500);
          }
        }
      }
      
      return;
    }

    submitButton.disabled = true;
    loader.classList.add('btn-loader');

    try {
      /*  Upload Images */
      const uploadedImages = await uploadImages(selectedPhotos);

      /*  Build HTML - Get rich HTML from Quill editor */
      const descriptionHtml = quill.root.innerHTML;
      const body_html = buildBodyHtml(descriptionHtml);

      /*  Showcase Payload */
      const payload = {
        applicantName,
        businessName,
        title,
        body_html,
        email,
        image: uploadedImages.map(url => ({ src: url })), // All images as array of objects
      };

      /* Send to Showcase API */
      const res = await fetch('' + apiBase() + '/showcase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        formRoot.querySelector('.wedding_form_content').innerHTML = `
          <div class="wedding_form_content-new">
            <h2>Thank you!</h2>
    <p>Please check your email for further instructions. If you don\u2019t see it, be sure to check your spam or junk folder.</p>         
          </div>`;
      } else {
        alert('Submission failed');
      }
    } catch (err) {
      console.error(err);
      alert('Something went wrong');
    }

    syncSubmit();
    loader.classList.remove('btn-loader');
  });

  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  document.addEventListener('shopify:section:load', boot);
})();
