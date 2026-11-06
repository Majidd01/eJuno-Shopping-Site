document.addEventListener("DOMContentLoaded", async () => {
    function ejunoApiBase() {
        var base = window.EJUNO_API_BASE || window.EJUNO_API || 'https://ejuno-dev.skylinxtech.co/api';
        return String(base).replace(/\/$/, '');
    }

    const secretKey = getQueryParam('key');
    if (!secretKey) {
        const vendorHead = document.getElementById('vendorHead');
        const threeBody = document.querySelector('.loader-new');
        if (vendorHead) {
            vendorHead.innerHTML = 'Invalid or missing onboarding link. Please use the link from your eJuno email.';
            vendorHead.style.display = 'block';
        }
        if (threeBody) threeBody.style.display = 'none';
        return;
    }
    const contentWrapper = document.querySelector('.content-wrapper-agreement');
    const notification = document.getElementById("notification");
    const vendorHead = document.getElementById("vendorHead");
    const threeBody = document.querySelector(".loader-new");
    const passportfield = document.getElementById("passport");
    const tradefield = document.getElementById("trade-vat");
    const filesSection = document.getElementById("filesSection");
    const rqstedChanges = document.getElementById("rqstedChanges");
    const comments = document.getElementById("comments");
    const ulTaskItems = document.querySelector('ul.items');
    const submitBtn = document.getElementById('submitBtn');
    const loader = document.querySelector(".spinner-border");
    const kycContract = document.querySelector('.ejuno-kyc-contract');
    const stepsSidebar = document.querySelector('.list__items__data');
    const passportInput = document.getElementById("PASSPORT_ID");
    const tradeInput = document.getElementById("TRADE_LICENSE");

    const agreeCheckbox = document.getElementById('agreeCheckbox');
    const signatureField = document.getElementById("signatureName");
    const updateSignatureCheckbox = document.getElementById("updateSignatureCheckbox");
    const signatureChangeWrap = document.getElementById("ejunoKycSignatureChange");
    const signatureBlock = document.getElementById("ejunoKycSignatureBlock");
    let adminRequestedChanges = false;
    let applicationType = "";
    let originalSignatureName = "";

    function showApplicationStatusMessage(message) {
        if (contentWrapper) contentWrapper.style.display = "none";
        if (filesSection) filesSection.style.display = "none";
        if (rqstedChanges) rqstedChanges.style.display = "none";
        if (stepsSidebar) stepsSidebar.style.display = "none";
        if (ulTaskItems) ulTaskItems.style.display = "none";
        if (kycContract) kycContract.style.display = "none";
        if (vendorHead) {
            vendorHead.innerHTML = message;
            vendorHead.style.display = "block";
        }
    }

    // Helper function to check if file is HEIC format
    function isHeicFile(file) {
        if (!file) return false;
        const fileName = file.name.toLowerCase();
        const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
        return fileExtension === '.heic' || fileExtension === '.heif' || 
               file.type === 'image/heic' || file.type === 'image/heif' ||
               file.type === 'application/octet-stream' && (fileExtension === '.heic' || fileExtension === '.heif');
    }

    // Helper function to create file with correct content-type for HEIC
    async function prepareFileForUpload(file) {
        if (isHeicFile(file)) {
            // Create a new Blob with the correct MIME type
            const fileData = await file.arrayBuffer();
            const blob = new Blob([fileData], { type: 'image/heic' });
            // Create a new File object with the correct type
            return new File([blob], file.name, { type: 'image/heic', lastModified: file.lastModified });
        }
        return file;
    }

    try {
        const response = await fetch(ejunoApiBase() + '/vendor-applications/secret/' + encodeURIComponent(secretKey));
        const responseData = await response.json();

        if (!response.ok) {
            if (response.status == 404) {
                showApplicationStatusMessage("Vendor Application doesn't exist!");
            } else if (vendorHead) {
                showApplicationStatusMessage("We could not load your application. Please refresh or use the link from your email.");
            }
            if (threeBody) threeBody.style.display = "none";
        } else if (responseData.data && responseData.data.adminStatus === "requested_changes") {
            adminRequestedChanges = true;
            applicationType = responseData.data.applicationType || "business";

            if (contentWrapper) contentWrapper.style.display = "none";
            if (vendorHead) vendorHead.style.display = "none";
            if (threeBody) threeBody.style.display = "none";
            if (stepsSidebar) stepsSidebar.style.display = "none";
            if (filesSection) filesSection.style.display = "block";
            if (rqstedChanges) rqstedChanges.style.display = "block";
            if (comments) comments.textContent = responseData.data.comments || "";
            if (kycContract) kycContract.classList.add("ejuno-kyc--changes-mode");

            document.querySelectorAll(".ejuno-kyc-files__title--default, .ejuno-kyc-files__lead--default").forEach(function (el) {
                el.hidden = true;
            });
            document.querySelectorAll(".ejuno-kyc-files__title--resubmit, .ejuno-kyc-files__lead--resubmit").forEach(function (el) {
                el.hidden = false;
            });
            var submitLabel = document.querySelector(".ejuno-kyc-submit__label");
            if (submitLabel) submitLabel.textContent = "Submit updated documents";

            if (passportfield) passportfield.style.display = applicationType === "individual" ? "block" : "none";
            if (tradefield) tradefield.style.display = applicationType === "individual" ? "none" : "block";

            var fileElements = [];
            if (responseData.data.documents && responseData.data.documents.length) {
                responseData.data.documents.forEach(function (item) {
                    var fileInput = document.getElementById(item.name);
                    if (!fileInput || !fileInput.parentNode) return;
                    var isPending =
                        item.status === undefined ||
                        item.status === null ||
                        item.status === "pending" ||
                        item.status === "rejected";
                    fileInput.parentNode.style.display = isPending ? "block" : "none";
                    if (isPending) fileElements.push(fileInput);
                });
            }

            if (!fileElements.length) {
                if (applicationType === "individual" && passportInput) {
                    if (passportfield) passportfield.style.display = "block";
                    fileElements.push(passportInput);
                } else if (tradeInput) {
                    if (tradefield) tradefield.style.display = "block";
                    fileElements.push(tradeInput);
                }
            }

            originalSignatureName = responseData.data.signatureName || "";
            if (signatureField) {
                signatureField.value = originalSignatureName;
                signatureField.disabled = true;
            }

            if (signatureChangeWrap) signatureChangeWrap.hidden = false;
            if (signatureBlock) signatureBlock.classList.remove("is-signature-edit-open");

            if (responseData.data.agreementSigned && agreeCheckbox) {
                agreeCheckbox.checked = true;
                agreeCheckbox.disabled = true;
            }

            document.querySelectorAll(".ejuno-kyc-terms").forEach(function (el) {
                el.style.display = "none";
            });

            requestedChangesSubmitButton(fileElements, originalSignatureName);

            if (submitBtn) submitBtn.disabled = true;
            if (ulTaskItems) ulTaskItems.style.display = "none";
        } else {
            const data = responseData.data;
            threeBody.style.display = "none";

            if (data.vendorStatus == "pending" && data.adminStatus == "pending" && !data.agreementSigned) {
                contentWrapper.style.display = "block";
                vendorHead.style.display = "none";
                rqstedChanges.style.display = "none";
                filesSection.style.display = "block";
                applicationType = data.applicationType;

                if (applicationType === "individual") {
                    passportfield.style.display = "block";
                    tradefield.style.display = "none";
                } else {
                    passportfield.style.display = "none";
                    tradefield.style.display = "block ";
                }

                ulTaskItems.style.display = "flex";
                ulTaskItems.style.flexDirection = "column";
                ulTaskItems.style.gap = "12px";
                submitBtn.disabled = true;
                markTasks();
            } else if (data.vendorStatus == "accepted" && data.adminStatus == "pending" && data.agreementSigned) {
                showApplicationStatusMessage(
                    "Your application is Waiting for Approval! If you want to get any information, please contact eJuno."
                );
            } else if (data.vendorStatus == "accepted" && data.adminStatus == "accepted" && data.agreementSigned) {
                showApplicationStatusMessage(
                    "Your application is already Approved! If you want to get any information, please contact eJuno."
                );
                const encodedEmail = encodeURIComponent(data.email);
                const redirectUrl = `https://vendorejuno.web.app/vendors-signup?email=${encodedEmail}`;
                window.location.href = redirectUrl;
            } else if (data.vendorStatus == "accepted" && data.adminStatus == "rejected" && data.agreementSigned) {
                showApplicationStatusMessage(
                    "Application has been Rejected! If you want to get any information, please contact eJuno."
                );
            } else {
                showApplicationStatusMessage("");
            }
        }
    } catch (error) {
        showNotification("Network error occurred. Please try again.", true);
        if (contentWrapper) contentWrapper.style.display = "none";
        if (threeBody) threeBody.style.display = "none";
        if (vendorHead) {
            vendorHead.innerHTML = "We could not load your application. Please refresh or use the link from your email.";
            vendorHead.style.display = "block";
        }
    }

    function onCheckAgree() {
        if (!agreeCheckbox || !signatureField || !submitBtn) return;
        if (agreeCheckbox.checked && signatureField.value != '') {
            submitBtn.classList.add('is-ready');
            submitBtn.disabled = false;
        } else {
            submitBtn.classList.remove('is-ready');
            submitBtn.disabled = true;
        }
    }

    if (agreeCheckbox) agreeCheckbox.addEventListener('change', onCheckAgree);

    if (signatureField) signatureField.addEventListener('input', () => {
        if (adminRequestedChanges) return;
        if (agreeCheckbox.checked && signatureField.value != '') {
            submitBtn.classList.add('is-ready');
            submitBtn.disabled = false;
        } else {
            submitBtn.classList.remove('is-ready');
            submitBtn.disabled = true;
        }
    });

    if (updateSignatureCheckbox) {
        updateSignatureCheckbox.addEventListener("change", function () {
            if (!adminRequestedChanges) return;
            var enabled = updateSignatureCheckbox.checked;
            if (signatureBlock) {
                signatureBlock.classList.toggle("is-signature-edit-open", enabled);
            }
            if (signatureField) {
                signatureField.disabled = !enabled;
                if (!enabled) {
                    signatureField.value = originalSignatureName;
                } else {
                    signatureField.focus();
                }
            }
            if (typeof window.ejunoKycRefreshChangesSubmit === "function") {
                window.ejunoKycRefreshChangesSubmit();
            }
        });
    }

    if (submitBtn) submitBtn.addEventListener('click', async () => {
        submitBtn.classList.remove('is-ready');
        submitBtn.disabled = true;

        const signatureName = document.getElementById("signatureName").value;
        const passportID = document.getElementById("PASSPORT_ID").files[0];
        const tradeLicense = document.getElementById("TRADE_LICENSE").files[0];

        const formData = new FormData();
        formData.append('signatureName', signatureName);

        if (applicationType === "individual") {
            if (passportID) {
                const preparedFile = await prepareFileForUpload(passportID);
                formData.append('PASSPORT_ID', preparedFile);
            }
            if (!adminRequestedChanges && !passportID) {
                showNotification("Please provide Passport ID", true);
                submitBtn.classList.add('is-ready');
                submitBtn.disabled = false;
                return;
            }
        } else if (applicationType === "business") {
            if (tradeLicense) {
                const preparedFile = await prepareFileForUpload(tradeLicense);
                formData.append('TRADE_LICENSE', preparedFile);
            }
            if (!adminRequestedChanges && !tradeLicense) {
                showNotification("Please provide Trade License", true);
                submitBtn.classList.add('is-ready');
                submitBtn.disabled = false;
                return;
            }
        }

        if (adminRequestedChanges) {
            var signatureUpdating =
                updateSignatureCheckbox &&
                updateSignatureCheckbox.checked &&
                signatureField &&
                signatureField.value.trim() !== "";
            var hasFile =
                (applicationType === "individual" && passportID) ||
                (applicationType === "business" && tradeLicense);
            if (!hasFile && !signatureUpdating) {
                showNotification("Upload a corrected file or update your signature to continue.", true);
                submitBtn.classList.add("is-ready");
                submitBtn.disabled = false;
                return;
            }
            if (
                signatureUpdating &&
                signatureField.value.trim() === originalSignatureName.trim()
            ) {
                showNotification("Enter a new signature name or upload updated documents.", true);
                submitBtn.classList.add("is-ready");
                submitBtn.disabled = false;
                return;
            }
        }

        try {
            loader.classList.add("btn-loader");

            const response = await fetch(ejunoApiBase() + '/vendor-applications/secret/' + encodeURIComponent(secretKey), {
                method: 'PATCH',
                body: formData
            });

            const responseBody = await response.json();
            loader.classList.remove("btn-loader");

            if (response.ok) {
                showNotification('Files submitted successfully!');
                window.location.href = '/pages/thankyou';
                clearSessionStorageTasksCompletion();
            } else {
                showNotification(responseBody.message, true);
                submitBtn.classList.add('is-ready');
                submitBtn.disabled = false;
            }
        } catch (error) {
            showNotification('Network error occurred. Please try again.', true);
            submitBtn.classList.add('is-ready');
            submitBtn.disabled = false;
        }
    });

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function clearSessionStorageTasksCompletion() {
        sessionStorage.removeItem('read_agreement');
    }

    function showNotification(message, isError = false) {
        if (!notification) return;
        notification.textContent = message;
        notification.classList.toggle("error", isError);
        notification.style.display = "block";
        setTimeout(() => { notification.style.display = "none"; }, 3000);
    }

    function getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

   function previewImage(input, previewContainer, imageContainerHeading) {
        const file = input.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imgWrapper = document.createElement('div');
                imgWrapper.classList.add('image-preview');

                const img = document.createElement('img');

            
            if (file.type === "application/pdf") {
        img.src = "https://cdn.shopify.com/s/files/1/0814/3061/0213/files/unnamed.png?v=1756379042";
        } else if (
            file.type === "application/msword" || 
            file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {
            img.src = "https://cdn.shopify.com/s/files/1/0814/3061/0213/files/text-file-format-icon-in-color-office-report-presentation-vector.jpg?v=1762443632";
        } else {
            img.src = e.target.result;
        }


                const removeBtn = document.createElement('span');
                removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                removeBtn.classList.add('remove-btn');
                removeBtn.onclick = () => {
                    previewContainer.removeChild(imgWrapper);
                    input.value = '';
                    const event = new CustomEvent('fileCleared', { detail: { input } });
                    input.dispatchEvent(event);
                };

                const p = document.createElement('p');
                p.innerHTML = `<strong></strong>`;

                imgWrapper.appendChild(p);
                imgWrapper.appendChild(img);
                imgWrapper.appendChild(removeBtn);

                previewContainer.innerHTML = '';
                previewContainer.appendChild(imgWrapper);
            };

        
            if (file.type !== "application/pdf") {
                reader.readAsDataURL(file);
            } else {
                reader.onload({ target: { result: "" } });
            }
        }
    }

    if (passportInput) {
        passportInput.addEventListener("change", function () {
            previewImage(this, document.getElementById("passportPreview"), "Passport Document");
        });
    }

    if (tradeInput) {
        tradeInput.addEventListener("change", function () {
            previewImage(this, document.getElementById("tradePreview"), "Trade License Document");
        });
    }

    function markTasks() {
        let visibleStatus = sessionStorage.getItem('read_agreement');
        let elementToObserve = document.querySelector(".end-of-agreement");
        let taskList = document.querySelectorAll('.items > li');

        let observer = new IntersectionObserver(function (entries) {
            if (entries[0].isIntersecting) {
                sessionStorage.setItem('read_agreement', true);
                markFirstElement();
                observer.disconnect();
            }
        });

        if (!visibleStatus) {
            observer.observe(elementToObserve);
        } else {
            markFirstElement();
        }

        function markFirstElement() {
            let first = taskList[0];
            first.classList.add('done');
            first.children[0].checked = true;
        }

        let fileElements = document.querySelectorAll('.file-input');
        let files = {};

        function markSecondElement() {
            let flag = true;
            const entries = Object.entries(files);
            const itemsToCheck = applicationType === "individual" ? entries.slice(0, 1) : entries.slice(1);

            for (const [_, value] of itemsToCheck) {
                if (value <= 0) {
                    flag = false;
                }
            }

            let second = taskList[1];
            second.classList.toggle('done', flag);
            second.children[0].checked = flag;

            signatureField.disabled = !flag;
            agreeCheckbox.disabled = !flag;

            if (agreeCheckbox.checked && signatureField.value != '' && flag) {
                submitBtn.classList.add('is-ready');
                submitBtn.disabled = false;
            } else {
                submitBtn.classList.remove('is-ready');
                submitBtn.disabled = true;
            }
        }

        fileElements.forEach(function (element) {
            files[element.id] = 0;
            element.addEventListener("change", function () {
                files[this.id] = this.files.length;
                markSecondElement();
            });
            element.addEventListener("fileCleared", function () {
                files[this.id] = this.files.length;
                markSecondElement();
            });
        });

        signatureField.addEventListener('input', function () {
            let third = taskList[2];
            third.classList.toggle('done', this.value != "");
            third.children[0].checked = this.value != "";
        });

        signatureField.disabled = true;
        agreeCheckbox.disabled = true;
    }

    function requestedChangesSubmitButton(fileElements, originalSignature) {
        let files = {};
        fileElements.forEach(function (element) {
            files[element.id] = 0;
            element.addEventListener("change", function () {
                files[this.id] = this.files.length;
                checkFileStatuses();
            });
            element.addEventListener("fileCleared", function () {
                files[this.id] = this.files.length;
                checkFileStatuses();
            });
        });

        function visibleFileElements() {
            return fileElements.filter(function (el) {
                return el.parentNode && el.parentNode.style.display !== "none";
            });
        }

        function filesRequirementMet() {
            var visible = visibleFileElements();
            if (!visible.length) return false;
            for (var i = 0; i < visible.length; i += 1) {
                if (!visible[i].files || !visible[i].files.length) return false;
            }
            return true;
        }

        function signatureRequirementMet() {
            if (!updateSignatureCheckbox || !updateSignatureCheckbox.checked || !signatureField) {
                return false;
            }
            var next = signatureField.value.trim();
            var prev = String(originalSignature || "").trim();
            return next.length > 0 && next !== prev;
        }

        function checkFileStatuses() {
            var filesMet = filesRequirementMet();
            var sigMet = signatureRequirementMet();
            var ready = filesMet || sigMet;

            if (ready) {
                submitBtn.classList.add("is-ready");
                submitBtn.disabled = false;
            } else {
                submitBtn.classList.remove("is-ready");
                submitBtn.disabled = true;
            }
        }

        if (signatureField) {
            signatureField.addEventListener("input", checkFileStatuses);
        }

        window.ejunoKycRefreshChangesSubmit = checkFileStatuses;
        checkFileStatuses();
    }
});
