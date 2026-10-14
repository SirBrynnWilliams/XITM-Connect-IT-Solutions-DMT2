const publicLinks = [
    ["index.html", "Home"],
    ["about.html", "About"],
    ["gallery.html", "Gallery"],
    ["departments.html", "Departments"],
    ["services.html", "Services"],
    ["appointments.html", "Appointments"],
    ["contact.html", "Contact"]
];

const staffLinks = [
    ["staff-dashboard.html", "Dashboard"],
    ["it-portal.html", "IT operations"],
    ["it-structure.html", "IT structure"],
    ["policies.html", "Policies"],
    ["database.html", "Database explorer"],
    ["sops.html", "SOPs"],
    ["acquisition.html", "Acquisition"],
    ["drp.html", "Disaster recovery"],
    ["helpdesk.html", "Help desk"]
];

function makeLink([href, label], activePage) {
    const active = activePage === href.replace(".html", "") || (href === "index.html" && activePage === "home");
    return `<li><a class="nav-item${active ? " active" : ""}" href="${href}"${active ? ' aria-current="page"' : ""}>${label}</a></li>`;
}

function renderSiteChrome() {
    const page = document.body.dataset.page || "home";
    const isStaff = document.body.dataset.staffPage === "true";
    const permittedStaffLinks = staffLinks;
    const navigation = publicLinks.map(link => makeLink(link, page)).join("");
    const brand = `<a class="brand-lockup" href="index.html" aria-label="Lumko Medical Research Institute"><img src="Images/lumko_medical_research_logo_cropped.png" alt="Lumko Medical Research Institute logo"><span><strong>Lumko Medical Research Institute</strong><small>Research · Diagnostics · Discovery</small></span></a>`;
    const portalLinks = `<a class="portal-link" href="customer-signup.html">Customer sign up</a><a class="portal-link" href="customer-signin.html">Customer sign in</a><a class="portal-link" href="signin.html">Staff portal</a>`;
    const staffNavigation = isStaff
        ? `<nav class="staff-subnav" aria-label="Staff tools"><ul>${permittedStaffLinks.map(link => makeLink(link, page)).join("")}</ul></nav>`
        : "";
    const header = document.getElementById("site-header");
    if (header) {
        header.innerHTML = `<header class="navbar"><div class="nav-container"><div class="brand-logo">${brand}</div><div class="header-tools"><span class="header-clock" id="live-clock" aria-live="off"></span>${portalLinks}</div><button class="nav-toggle" id="navToggle" type="button" aria-label="Open navigation" aria-expanded="false"><i class="fa-solid fa-bars"></i></button><nav class="nav-menu" id="navMenu" aria-label="Main navigation"><ul class="nav-links">${navigation}</ul></nav></div>${staffNavigation}</header>`;
        const toggle = document.getElementById("navToggle");
        toggle.addEventListener("click", () => {
            const open = document.getElementById("navMenu").classList.toggle("active");
            toggle.setAttribute("aria-expanded", String(open));
            toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
        });
    }
    const footer = document.getElementById("site-footer");
    if (footer) {
        footer.innerHTML = `<footer class="site-footer"><div class="footer-inner"><div class="footer-brand"><strong>Lumko Medical Research Institute</strong><p>Medical research and diagnostic services</p><small>IT services provided by Connect IT Solutions</small></div><div class="footer-contact"><a href="tel:0642845992"><i class="fa-solid fa-phone"></i> 064 284 5992</a><span><i class="fa-solid fa-location-dot"></i> Walmer, Gqeberha (Port Elizabeth)</span></div><nav aria-label="Footer navigation"><a href="about.html">About</a><a href="gallery.html">Gallery</a><a href="contact.html">Contact</a><a href="customer-signin.html">Customer portal</a><a href="signin.html">Staff portal</a></nav></div></footer>`;
    }
}

function updateClock() {
    const clocks = document.querySelectorAll("#live-clock");
    if (!clocks.length) return;
    const currentTime = new Intl.DateTimeFormat(undefined, {
        dateStyle: window.matchMedia("(max-width: 560px)").matches ? "short" : "medium",
        timeStyle: window.matchMedia("(max-width: 560px)").matches ? "short" : "medium",
        timeZone: "Africa/Johannesburg"
    }).format(new Date());
    clocks.forEach(clock => {
        clock.textContent = currentTime;
    });
}

function makeReference(prefix) {
    const year = new Date().getFullYear();
    const key = `lumko-reference-${prefix}-${year}`;
    const storedSequence = localStorage.getItem(key);
    const sequence = storedSequence === null ? 1 : Number(storedSequence) + 1;
    if (!Number.isInteger(sequence) || sequence < 1 || sequence > 9999) {
        throw new Error("No further four-digit references are available for this year.");
    }
    localStorage.setItem(key, String(sequence));
    return `${prefix}-${year}-${String(sequence).padStart(4, "0")}`;
}

function getRequestFormRules(formId) {
    const rules = {
        "appointment-form": {
            "appointment-name": value => {
                if (!value.trim()) return "Enter your full name.";
                if (value.length > 100) return "Your name must be 100 characters or fewer.";
                if (!/^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u.test(value.trim())) return "Use letters, spaces, hyphens, apostrophes or periods in your name.";
                return "";
            },
            "appointment-contact": value => {
                const contact = value.trim();
                if (!contact) return "Enter an email address or phone number.";
                if (contact.length > 120) return "Contact information must be 120 characters or fewer.";
                const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
                const digits = contact.replace(/\D/g, "").length;
                const isPhone = /^\+?[\d\s().-]+$/.test(contact) && digits >= 7 && digits <= 15;
                return isEmail || isPhone ? "" : "Enter a valid email address or phone number.";
            },
            "appointment-service": value => value ? "" : "Choose a service.",
            "appointment-date": value => {
                if (!value) return "Choose a preferred date.";
                const today = new Date();
                today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
                return value < today.toISOString().split("T")[0] ? "Choose today or a future date." : "";
            }
        },
        "contact-form": {
            "contact-name": value => {
                if (!value.trim()) return "Enter your name.";
                if (value.length > 100) return "Your name must be 100 characters or fewer.";
                if (!/^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u.test(value.trim())) return "Use letters, spaces, hyphens, apostrophes or periods in your name.";
                return "";
            },
            "contact-email": value => {
                const email = value.trim();
                if (!email) return "Enter your email address.";
                if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
                return "";
            },
            "contact-subject": value => {
                if (!value.trim()) return "Enter a subject.";
                return value.length > 120 ? "The subject must be 120 characters or fewer." : "";
            },
            "contact-message": value => {
                if (!value.trim()) return "Enter your message.";
                return value.length > 1500 ? "Your message must be 1,500 characters or fewer." : "";
            }
        }
    };
    return rules[formId] || null;
}

function initializeReferenceForm(formId, feedbackId, prefix, message) {
    const form = document.getElementById(formId);
    if (!form) return;
    const feedback = document.getElementById(feedbackId);
    const rules = getRequestFormRules(formId);
    let attemptedSubmit = false;

    function updateFieldError(field) {
        const errorMessage = rules[field.id](field.value);
        const group = field.closest(".form-group");
        let errorElement = group.querySelector(".field-validation-message");
        if (errorMessage) {
            if (!errorElement) {
                errorElement = document.createElement("small");
                errorElement.className = "field-validation-message";
                errorElement.id = `${field.id}-error`;
                group.appendChild(errorElement);
            }
            errorElement.textContent = errorMessage;
            field.setAttribute("aria-invalid", "true");
            field.setAttribute("aria-describedby", errorElement.id);
        } else {
            if (errorElement) errorElement.remove();
            field.removeAttribute("aria-invalid");
            field.removeAttribute("aria-describedby");
        }
        return errorMessage;
    }

    if (rules) {
        const fields = Object.keys(rules).map(id => document.getElementById(id));
        fields.forEach(field => {
            const validateWhileEditing = () => {
                if (attemptedSubmit) {
                    const invalidFields = fields.filter(updateFieldError);
                    if (invalidFields.length) {
                        feedback.textContent = "Please correct the highlighted fields before submitting.";
                        feedback.classList.add("is-visible", "is-error");
                    } else {
                        feedback.textContent = "";
                        feedback.classList.remove("is-visible", "is-error");
                    }
                } else if (field.value.trim()) {
                    updateFieldError(field);
                } else {
                    const group = field.closest(".form-group");
                    const errorElement = group.querySelector(".field-validation-message");
                    if (errorElement) errorElement.remove();
                    field.removeAttribute("aria-invalid");
                    field.removeAttribute("aria-describedby");
                }
            };
            field.addEventListener("input", validateWhileEditing);
            field.addEventListener("change", validateWhileEditing);
            field.addEventListener("blur", () => {
                if (attemptedSubmit || field.value.trim()) updateFieldError(field);
            });
        });
    }

    form.addEventListener("submit", event => {
        event.preventDefault();
        if (rules) {
            attemptedSubmit = true;
            const invalidFields = Object.keys(rules)
                .map(id => document.getElementById(id))
                .filter(field => updateFieldError(field));
            if (invalidFields.length) {
                feedback.textContent = "Please correct the highlighted fields before submitting.";
                feedback.classList.add("is-visible", "is-error");
                invalidFields[0].focus();
                return;
            }
        } else if (!form.reportValidity()) {
            return;
        }
        feedback.classList.remove("is-error");
        let reference;
        try {
            reference = makeReference(prefix);
        } catch (error) {
            console.error("Unable to create a reference number.", error);
            feedback.textContent = "A reference number could not be generated. Please retry or contact the facility directly.";
            feedback.classList.add("is-visible", "is-error");
            return;
        }
        feedback.textContent = `${message} ${reference}. Please contact the facility if you need to follow up.`;
        feedback.classList.add("is-visible");
        form.reset();
        if (rules) {
            attemptedSubmit = false;
            Object.keys(rules).forEach(id => {
                const field = document.getElementById(id);
                const errorElement = field.closest(".form-group").querySelector(".field-validation-message");
                if (errorElement) errorElement.remove();
                field.removeAttribute("aria-invalid");
                field.removeAttribute("aria-describedby");
            });
        }
    });
}

function initializeStaffGateway() {
    const form = document.getElementById("staff-demo-signin-form");
    if (!form) return;
    form.addEventListener("submit", event => {
        event.preventDefault();
        const username = document.getElementById("staff-demo-username").value.trim();
        try {
            sessionStorage.setItem("lumko-staff-display-name", username);
        } catch (error) {
            console.error("Unable to save the staff display name for this session.", error);
        }
        window.location.href = "staff-dashboard.html";
    });
}

async function initializeStaffPage() {
    if (document.body.dataset.staffPage !== "true") return;
    const name = document.getElementById("staff-profile-name");
    let displayName = "Staff member";
    try {
        displayName = sessionStorage.getItem("lumko-staff-display-name") || displayName;
    } catch (error) {
        console.error("Unable to read the staff display name for this session.", error);
    }
    if (name) name.textContent = displayName;
    const role = document.getElementById("staff-profile-role");
    if (role) role.textContent = "Department: IT Services · Position: Staff member";
    const permissions = document.getElementById("staff-profile-permissions");
    if (permissions) permissions.textContent = "Campus IT operations, research systems and staff support.";
}

function validateMinimumLengthFields(fieldIds, feedback) {
    const invalidFields = fieldIds
        .map(id => document.getElementById(id))
        .filter(field => {
            const invalid = field.value.trim().length < 2;
            const group = field.closest(".form-group");
            let errorElement = group.querySelector(".field-validation-message");
            if (invalid) {
                if (!errorElement) {
                    errorElement = document.createElement("small");
                    errorElement.className = "field-validation-message";
                    errorElement.id = `${field.id}-error`;
                    group.appendChild(errorElement);
                }
                errorElement.textContent = "Enter at least 2 characters.";
                field.setAttribute("aria-invalid", "true");
                field.setAttribute("aria-describedby", errorElement.id);
            } else {
                if (errorElement) errorElement.remove();
                field.removeAttribute("aria-invalid");
                field.removeAttribute("aria-describedby");
            }
            return invalid;
        });
    if (invalidFields.length) {
        feedback.textContent = "Please enter at least 2 characters in each highlighted field.";
        feedback.classList.add("is-visible", "is-error");
        invalidFields[0].focus();
        return false;
    }
    feedback.textContent = "";
    feedback.classList.remove("is-visible", "is-error");
    return true;
}

function initializeMinimumLengthValidation(form, fieldIds, feedback) {
    let attemptedSubmit = false;
    form.addEventListener("submit", () => {
        attemptedSubmit = true;
    }, true);
    fieldIds.forEach(id => {
        const field = document.getElementById(id);
        const updateField = () => {
            const tooShort = field.value.trim().length < 2;
            const shouldShowError = tooShort && (attemptedSubmit || field.value.length > 0);
            const group = field.closest(".form-group");
            let errorElement = group.querySelector(".field-validation-message");
            if (shouldShowError) {
                if (!errorElement) {
                    errorElement = document.createElement("small");
                    errorElement.className = "field-validation-message";
                    errorElement.id = `${field.id}-error`;
                    group.appendChild(errorElement);
                }
                errorElement.textContent = "Enter at least 2 characters.";
                field.setAttribute("aria-invalid", "true");
                field.setAttribute("aria-describedby", errorElement.id);
            } else if (!tooShort) {
                if (errorElement) errorElement.remove();
                field.removeAttribute("aria-invalid");
                field.removeAttribute("aria-describedby");
            }
            if (attemptedSubmit && !form.querySelector('[aria-invalid="true"]')) {
                feedback.textContent = "";
                feedback.classList.remove("is-visible", "is-error");
            }
        };
        field.addEventListener("input", updateField);
        field.addEventListener("blur", updateField);
    });
}

function initializeCustomerPortal() {
    const signupForm = document.getElementById("customer-signup-form");
    if (signupForm) {
        const signupFields = ["customer-name", "customer-email", "customer-phone"];
        const signupFeedback = document.getElementById("customer-signup-feedback");
        initializeMinimumLengthValidation(signupForm, signupFields, signupFeedback);
        signupForm.addEventListener("submit", event => {
            event.preventDefault();
            if (!validateMinimumLengthFields(signupFields, signupFeedback)) return;
            const profile = {
                name: document.getElementById("customer-name").value.trim(),
                email: document.getElementById("customer-email").value.trim(),
                phone: document.getElementById("customer-phone").value.trim()
            };
            sessionStorage.setItem("lumko-customer-account", JSON.stringify(profile));
            window.location.href = "customer-signin.html";
        });
    }

    const signinForm = document.getElementById("customer-signin-form");
    if (signinForm) {
        const storedAccount = sessionStorage.getItem("lumko-customer-account");
        if (storedAccount) {
            try {
                const profile = JSON.parse(storedAccount);
                if (typeof profile.name === "string" && typeof profile.email === "string") {
                    document.getElementById("customer-signin-name").value = profile.name;
                    document.getElementById("customer-signin-contact").value = profile.email;
                }
            } catch (error) {
                console.error("Unable to read the customer account.", error);
            }
        }
        const signinFields = ["customer-signin-name", "customer-signin-contact"];
        const signinFeedback = document.getElementById("customer-signin-feedback");
        initializeMinimumLengthValidation(signinForm, signinFields, signinFeedback);
        signinForm.addEventListener("submit", event => {
            event.preventDefault();
            if (!validateMinimumLengthFields(signinFields, signinFeedback)) return;
            const enteredName = document.getElementById("customer-signin-name").value.trim();
            const enteredContact = document.getElementById("customer-signin-contact").value.trim();
            sessionStorage.setItem("lumko-customer-account", JSON.stringify({
                name: enteredName,
                email: enteredContact,
                phone: ""
            }));
            window.location.href = "customer-portal.html";
        });
    }

    if (document.body.dataset.customerPage === "true") {
        const storedProfile = sessionStorage.getItem("lumko-customer-account");
        let profile = null;
        try {
            profile = storedProfile ? JSON.parse(storedProfile) : null;
        } catch (error) {
            console.error("Unable to read the customer account.", error);
        }
        document.getElementById("customer-profile-name").textContent = profile && typeof profile.name === "string" ? profile.name : "Portal demonstration";
        document.getElementById("customer-profile-email").textContent = profile && typeof profile.email === "string" ? profile.email : "";
        document.getElementById("customer-profile-phone").textContent = profile && typeof profile.phone === "string" ? profile.phone : "";
        document.getElementById("customer-signout-button").addEventListener("click", () => {
            sessionStorage.removeItem("lumko-customer-account");
            window.location.href = "customer-signin.html";
        });
    }
}

function initializeSampleStatement() {
    const generateButton = document.getElementById("generate-sample-statement");
    if (!generateButton) return;
    const statement = document.getElementById("sample-bank-statement");
    const printButton = document.getElementById("print-sample-statement");
    generateButton.addEventListener("click", () => {
        const today = new Date();
        const periodStart = new Date(today);
        periodStart.setDate(periodStart.getDate() - 29);
        const account = (() => {
            try {
                const savedProfile = sessionStorage.getItem("lumko-customer-account");
                return savedProfile ? JSON.parse(savedProfile) : null;
            } catch (error) {
                console.error("Unable to read the customer account for the sample statement.", error);
                return null;
            }
        })();
        document.getElementById("sample-statement-name").textContent =
            account && typeof account.name === "string" ? account.name : "Sample customer";
        const formatDate = date => new Intl.DateTimeFormat("en-ZA", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }).format(date);
        document.getElementById("sample-statement-period").textContent = `${formatDate(periodStart)} – ${formatDate(today)}`;
        const movements = [
            { daysAgo: 26, description: "Sample credit", amount: 4500 },
            { daysAgo: 21, description: "Illustrative service charge", amount: -380 },
            { daysAgo: 16, description: "Example appointment payment", amount: -1250 },
            { daysAgo: 9, description: "Sample credit", amount: 900 },
            { daysAgo: 4, description: "Illustrative account fee", amount: -45 }
        ];
        let balance = 12500;
        const transactionBody = document.getElementById("sample-statement-transactions");
        transactionBody.replaceChildren();
        movements.forEach(movement => {
            const date = new Date(today);
            date.setDate(date.getDate() - movement.daysAgo);
            balance += movement.amount;
            const row = document.createElement("tr");
            [formatDate(date), movement.description, `${movement.amount < 0 ? "−" : "+"} R ${Math.abs(movement.amount).toFixed(2)}`, `R ${balance.toFixed(2)}`]
                .forEach(value => {
                    const cell = document.createElement("td");
                    cell.textContent = value;
                    row.appendChild(cell);
                });
            transactionBody.appendChild(row);
        });
        document.getElementById("sample-statement-closing-balance").textContent = `R ${balance.toFixed(2)}`;
        statement.hidden = false;
        printButton.hidden = false;
    });
    printButton.addEventListener("click", () => window.print());
}

function initializeDocumentRegister() {
    const form = document.getElementById("document-upload-form");
    if (!form) return;
    form.addEventListener("submit", event => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const fileInput = document.getElementById("staff-document");
        const file = fileInput.files[0];
        const feedback = document.getElementById("document-upload-feedback");
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            feedback.textContent = "Choose a file smaller than 10 MB.";
            feedback.classList.add("is-visible");
            return;
        }
        const list = document.getElementById("document-upload-list");
        const emptyMessage = list.querySelector("li");
        if (emptyMessage && emptyMessage.textContent === "No documents added in this session.") emptyMessage.remove();
        const item = document.createElement("li");
        item.textContent = `${file.name} · selected on this device`;
        list.appendChild(item);
        feedback.textContent = "File selected. It remains on this device and has not been uploaded.";
        feedback.classList.add("is-visible");
        form.reset();
    });
}

function initializeItFieldNotes() {
    const form = document.getElementById("it-note-form");
    const list = document.getElementById("it-note-list");
    if (!form || !list) return;

    const feedback = document.getElementById("it-note-feedback");
    const storageKey = "lumko-it-field-notes";
    let notes;
    try {
        const storedNotes = localStorage.getItem(storageKey);
        notes = storedNotes ? JSON.parse(storedNotes) : [];
        if (!Array.isArray(notes) || !notes.every(note =>
            note && typeof note.category === "string" &&
            typeof note.location === "string" &&
            typeof note.assetTag === "string" &&
            typeof note.details === "string" &&
            typeof note.createdAt === "string" &&
            !Number.isNaN(Date.parse(note.createdAt))
        )) {
            throw new Error("Stored IT field notes have an invalid format.");
        }
    } catch (error) {
        console.error("Unable to load IT field notes.", error);
        feedback.textContent = "Saved notes could not be loaded from this browser. Check browser storage before adding notes.";
        feedback.classList.add("is-visible");
        form.querySelector("button[type='submit']").disabled = true;
        return;
    }

    const renderNotes = () => {
        list.replaceChildren();
        if (!notes.length) {
            const empty = document.createElement("li");
            empty.textContent = "No field notes saved in this browser.";
            list.appendChild(empty);
            return;
        }
        [...notes].reverse().forEach((note, index) => {
            const item = document.createElement("li");
            item.className = "it-note-item";
            const content = document.createElement("div");
            const heading = document.createElement("strong");
            heading.textContent = `${note.category} · ${note.location}${note.assetTag ? ` · ${note.assetTag}` : ""}`;
            const details = document.createElement("p");
            details.textContent = note.details;
            const timestamp = document.createElement("small");
            timestamp.textContent = new Date(note.createdAt).toLocaleString();
            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "button secondary-button";
            remove.textContent = "Delete";
            remove.setAttribute("aria-label", `Delete note: ${note.category} at ${note.location}`);
            remove.addEventListener("click", () => {
                const noteIndex = notes.length - 1 - index;
                const updatedNotes = notes.filter((_, currentIndex) => currentIndex !== noteIndex);
                try {
                    localStorage.setItem(storageKey, JSON.stringify(updatedNotes));
                } catch (error) {
                    console.error("Unable to delete IT field note.", error);
                    feedback.textContent = "The note could not be deleted from browser storage. Please retry.";
                    feedback.classList.add("is-visible");
                    return;
                }
                notes = updatedNotes;
                feedback.textContent = "Field note deleted.";
                feedback.classList.add("is-visible");
                renderNotes();
            });
            content.append(heading, details, timestamp);
            item.append(content, remove);
            list.appendChild(item);
        });
    };
    renderNotes();

    form.addEventListener("submit", event => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        if (notes.length >= 100) {
            feedback.textContent = "This browser has reached the 100-note limit. Delete an older note before adding another.";
            feedback.classList.add("is-visible");
            return;
        }
        const note = {
            category: document.getElementById("it-note-category").value,
            location: document.getElementById("it-note-location").value.trim(),
            assetTag: document.getElementById("it-note-asset").value.trim(),
            details: document.getElementById("it-note-details").value.trim(),
            createdAt: new Date().toISOString()
        };
        const updatedNotes = [...notes, note];
        try {
            localStorage.setItem(storageKey, JSON.stringify(updatedNotes));
        } catch (error) {
            console.error("Unable to save IT field note.", error);
            feedback.textContent = "The note could not be saved in this browser. Check available browser storage and retry.";
            feedback.classList.add("is-visible");
            return;
        }
        notes = updatedNotes;
        renderNotes();
        form.reset();
        feedback.textContent = "Field note saved in this browser.";
        feedback.classList.add("is-visible");
    });
}

const researchResources = [
    {
        title: "MRI: preparation, screening and safety",
        category: "Imaging",
        keywords: "MRI magnetic resonance imaging scan screening safety preparation implant contrast",
        summary: "Staff reference covering referral checks, MRI safety screening, implant and device declarations, patient preparation, contrast considerations, and the importance of following the imaging provider's approved protocol."
    },
    {
        title: "Blood specimen collection and handling",
        category: "Laboratory",
        keywords: "blood sample specimen collection labeling transport handling tube",
        summary: "Reference overview for specimen identification, correct labelling, collection documentation, transport conditions, chain of custody and escalation of damaged or unsuitable samples. Follow current laboratory SOPs for operational steps."
    },
    {
        title: "Tissue specimens and pathology workflows",
        category: "Laboratory",
        keywords: "tissue biopsy histology pathology specimen storage preservation",
        summary: "Overview of tissue specimen receipt, identification, preservation, tracking and hand-off to the relevant laboratory team. Research use requires appropriate approvals, consent and documented handling procedures."
    },
    {
        title: "Blood transfusion research: governance and records",
        category: "Research",
        keywords: "blood transfusion transfusion research blood products consent traceability records",
        summary: "Research staff reference on study approvals, participant consent, product traceability, adverse-event escalation and complete source documentation. It is not a clinical transfusion protocol."
    },
    {
        title: "Clinical research data transcription",
        category: "Records",
        keywords: "transcription transcribe data entry records source documents verification",
        summary: "Guidance on transcribing approved study data accurately, documenting corrections, checking source references and limiting access to authorised study personnel."
    },
    {
        title: "Research records and specimen traceability",
        category: "Records",
        keywords: "records database data quality audit trail source documentation specimen tracking sample",
        summary: "Reference for consistent record identifiers, access control, version history, correction tracking, retention review and linking specimen movements to approved study records."
    },
    {
        title: "Academic collaboration and study setup",
        category: "Academics",
        keywords: "academic university collaboration partner study protocol research ethics publication",
        summary: "Starting point for academic partners planning a collaboration: define roles, agree the research question, document responsibilities and data access, and confirm required ethics and institutional approvals before work begins."
    },
    {
        title: "Laboratory quality and equipment records",
        category: "Laboratory",
        keywords: "quality microscope analyzer analyser calibration maintenance equipment log",
        summary: "Overview of equipment inventory, maintenance schedules, calibration evidence, training records and reporting of instrument faults to support reliable laboratory operations."
    }
];

function initializeResearchLibrary() {
    const input = document.getElementById("research-library-search");
    const results = document.getElementById("research-library-results");
    const count = document.getElementById("research-library-count");
    if (!input || !results || !count) return;

    const render = () => {
        const query = input.value.trim().toLowerCase();
        const matches = researchResources.filter(resource =>
            `${resource.title} ${resource.category} ${resource.keywords} ${resource.summary}`.toLowerCase().includes(query)
        );
        results.replaceChildren();
        count.textContent = `${matches.length} ${matches.length === 1 ? "resource" : "resources"} found`;
        if (!matches.length) {
            const empty = document.createElement("p");
            empty.className = "resource-empty";
            empty.textContent = "No resources matched your search. Try a broader topic.";
            results.appendChild(empty);
            return;
        }
        matches.forEach(resource => {
            const article = document.createElement("article");
            article.className = "resource-result";
            const category = document.createElement("span");
            category.className = "resource-category";
            category.textContent = resource.category;
            const title = document.createElement("h3");
            title.textContent = resource.title;
            const summary = document.createElement("p");
            summary.textContent = resource.summary;
            article.append(category, title, summary);
            results.appendChild(article);
        });
    };

    input.addEventListener("input", render);
    render();
}

const databaseTables = {
    employees: {
        label: "Staff Registry",
        headers: ["Staff ID", "Department", "Location", "Access profile"],
        rows: Array.from({ length: 200 }, (_, index) => {
            const number = String(index + 1).padStart(3, "0");
            if (index < 10) return [`ST-${number}`, "Accounting", "Main Block · Ground floor", "Finance staff"];
            if (index < 50) return [`ST-${number}`, "Research Administration", `Main Block · Floor ${index < 30 ? 2 : 3}`, "Research administration"];
            const building = Math.floor((index - 50) / 50) + 2;
            const floor = Math.floor(((index - 50) % 50) / 10) + 1;
            return [`ST-${number}`, "Clinical Laboratory Science", `Laboratory ${building} · Floor ${floor}`, "Laboratory staff"];
        })
    },
    assets: {
        label: "Full Asset Inventory",
        headers: ["Asset ID", "Equipment", "Location", "Network / status"],
        rows: [
            ...Array.from({ length: 200 }, (_, index) => [`PC-${String(index + 1).padStart(3, "0")}`, "Lenovo ThinkCentre Neo 50a · Ultra 5 · 16 GB", index < 10 ? "Main Block · Accounting" : index < 50 ? `Main Block · Floor ${index < 30 ? 2 : 3}` : `Laboratory ${Math.floor((index - 50) / 50) + 2} · Floor ${Math.floor(((index - 50) % 50) / 10) + 1}`, "Managed workstation"]),
            ...Array.from({ length: 15 }, (_, index) => [`PRN-${String(index + 1).padStart(2, "0")}`, "HP LaserJet Enterprise M611dn", `Laboratory ${Math.floor(index / 5) + 2} · Floor ${(index % 5) + 1}`, "Network printer"]),
            ...Array.from({ length: 18 }, (_, index) => [`SW-${String(index + 1).padStart(2, "0")}`, "TP-Link Jetstream 24-Port PoE+ L2+", index === 0 ? "Main Block · MDF" : `Campus floor ${index}`, "Managed switch"]),
            ...Array.from({ length: 18 }, (_, index) => [`AP-${String(index + 1).padStart(2, "0")}`, "Ubiquiti UniFi Wi-Fi 7 Pro Max", `Campus zone ${index + 1}`, "Wireless access point"]),
            ...Array.from({ length: 4 }, (_, index) => [`RACK-${String(index + 1).padStart(2, "0")}`, "Linkbasic 42U cabinet", index === 0 ? "Main Block · MDF" : `Laboratory ${index + 1} · IDF`, "Infrastructure"]),
            ...Array.from({ length: 20 }, (_, index) => [`SRV-${String(index + 1).padStart(2, "0")}`, "Dell PowerEdge R360 / local backup server", index < 8 ? "Main Block · MDF" : `Laboratory ${Math.ceil((index - 7) / 4)} · IDF`, "Server · monitored"])
        ]
    },
    network: {
        label: "Network Devices",
        headers: ["Device ID", "Device", "Location", "Address / status"],
        rows: [
            ["RTR-MDF-01", "Core Router", "Main Block · MDF", "156.10.10.1 · Operational"],
            ["SQL-MDF-01", "Primary SQL Node", "Main Block · MDF", "156.10.10.13 · Operational"],
            ["SW-CORE-01", "Core managed switch", "Main Block · MDF", "Backbone · Operational"],
            ["FIBRE-CORE", "RS PRO OM3 multimode fibre", "Underground campus backbone", "Four buildings · Operational"],
            ...Array.from({ length: 18 }, (_, index) => [`SW-${String(index + 1).padStart(2, "0")}`, "TP-Link Jetstream managed switch", `Campus floor ${index + 1}`, "Online"]),
            ...Array.from({ length: 18 }, (_, index) => [`AP-${String(index + 1).padStart(2, "0")}`, "Ubiquiti UniFi Wi-Fi 7 Pro Max", `Campus zone ${index + 1}`, "Online"])
        ]
    },
    research: {
        label: "research registry demonstration",
        headers: ["Record", "Participant ID", "Study / specimen", "Status"],
        rows: [
            ["TR-0101", "P-8842", "CC-101 · Respiratory outcomes", "Screening"],
            ["TR-0102", "P-2217", "CC-101 · Respiratory outcomes", "Active"],
            ["TR-0204", "P-7309", "CC-204 · Community wellness", "Follow-up"]
        ]
    },
    specimens: {
        label: "shared LIMS specimen",
        headers: ["Specimen Code", "Sample Type", "Participant / Study", "Collection Date", "Status"],
        rows: []
    }
};

let currentDatabaseTable = "employees";
let sharedSpecimens = [];

function getSharedSpecimenTableRows() {
    return sharedSpecimens.map(record => [
        record.specimen_code,
        record.sample_type,
        record.participant_study_ref,
        record.collection_date,
        record.status
    ]);
}

function renderDatabaseTable(query = "") {
    const table = document.getElementById("dbDisplayTable");
    if (!table) return;
    const data = databaseTables[currentDatabaseTable];
    const normalizedQuery = query.trim().toLowerCase();
    const allRows = currentDatabaseTable === "research"
        ? data.rows
        : currentDatabaseTable === "specimens"
            ? getSharedSpecimenTableRows()
            : data.rows;
    const visibleRows = allRows
        .map(row => row.map(value => /^P-\d+/.test(value) ? `${value} (Anonymized - POPIA)` : value))
        .filter(row => !normalizedQuery || row.some(value => value.toLowerCase().includes(normalizedQuery)));
    const visibleSpecimens = currentDatabaseTable === "specimens"
        ? sharedSpecimens.filter(record => !normalizedQuery || [
            record.specimen_code,
            record.sample_type,
            record.participant_study_ref,
            record.collection_date,
            record.status
        ].some(value => value.toLowerCase().includes(normalizedQuery)))
        : [];
    const canManageSpecimens = currentDatabaseTable === "specimens";
    [table, document.getElementById("dbFullscreenTable")].filter(Boolean).forEach(target => {
        const head = document.createElement("thead");
        const headerRow = document.createElement("tr");
        data.headers.forEach(label => {
            const cell = document.createElement("th");
            cell.scope = "col";
            cell.textContent = label;
            headerRow.appendChild(cell);
        });
        if (canManageSpecimens) {
            const cell = document.createElement("th");
            cell.scope = "col";
            cell.textContent = "Manage status";
            headerRow.appendChild(cell);
        }
        head.appendChild(headerRow);
        const body = document.createElement("tbody");
        visibleRows.forEach((row, rowIndex) => {
            const tableRow = document.createElement("tr");
            row.forEach(value => {
                const cell = document.createElement("td");
                cell.textContent = value;
                tableRow.appendChild(cell);
            });
            if (canManageSpecimens) {
                const cell = document.createElement("td");
                const select = document.createElement("select");
                select.setAttribute("aria-label", `Status for specimen ${visibleSpecimens[rowIndex].specimen_code}`);
                ["Received", "Processing", "Stored", "Archived"].forEach(status => {
                    const option = document.createElement("option");
                    option.value = status;
                    option.textContent = status;
                    option.selected = status === visibleSpecimens[rowIndex].status;
                    select.appendChild(option);
                });
                const button = document.createElement("button");
                button.type = "button";
                button.className = "button secondary-button";
                button.textContent = "Update";
                button.addEventListener("click", async () => {
                    button.disabled = true;
                    try {
                        await window.LumkoData.updateSpecimenStatus(visibleSpecimens[rowIndex].id, select.value);
                        sharedSpecimens = await window.LumkoData.listSpecimens();
                        renderDatabaseTable(document.getElementById("dbSearchInput").value);
                        const status = document.getElementById("shared-specimen-status");
                        if (status) status.textContent = "Specimen status updated.";
                    } catch (error) {
                        const status = document.getElementById("shared-specimen-status");
                        if (status) status.textContent = error instanceof Error ? error.message : "Unable to update specimen status.";
                    } finally {
                        button.disabled = false;
                    }
                });
                cell.append(select, button);
                tableRow.appendChild(cell);
            }
            body.appendChild(tableRow);
        });
        if (!visibleRows.length) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = data.headers.length + (canManageSpecimens ? 1 : 0);
            cell.className = "db-empty-state";
            cell.textContent = "No records match your search.";
            row.appendChild(cell);
            body.appendChild(row);
        }
        target.replaceChildren(head, body);
    });
    const summary = `Showing ${visibleRows.length} of ${allRows.length} ${data.label.toLowerCase()} records`;
    document.getElementById("dbResultsSummary").textContent = summary;
    document.getElementById("dbFullscreenResultsSummary").textContent = summary;
    document.getElementById("dbFullscreenTitle").textContent = data.label;
}

function switchDatabaseTable(name) {
    if (!Object.hasOwn(databaseTables, name)) return;
    currentDatabaseTable = name;
    document.querySelectorAll("[data-db-category]").forEach(button => {
        const selected = button.dataset.dbCategory === name;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-pressed", String(selected));
    });
    renderDatabaseTable(document.getElementById("dbSearchInput").value);
}

function initializeDatabaseExplorer() {
    const controls = document.getElementById("dbControls");
    if (!controls) return;
    controls.addEventListener("click", event => {
        const button = event.target.closest("[data-db-category]");
        if (button) switchDatabaseTable(button.dataset.dbCategory);
    });
    document.getElementById("dbSearchInput").addEventListener("input", event => renderDatabaseTable(event.target.value));
    document.getElementById("dbFullscreenOpen").addEventListener("click", () => {
        const dialog = document.getElementById("dbFullscreenDialog");
        document.getElementById("dbFullscreenSearchInput").value = document.getElementById("dbSearchInput").value;
        renderDatabaseTable(document.getElementById("dbSearchInput").value);
        dialog.showModal();
    });
    document.getElementById("dbFullscreenSearchInput").addEventListener("input", event => {
        document.getElementById("dbSearchInput").value = event.target.value;
        renderDatabaseTable(event.target.value);
    });
    document.getElementById("dbFullscreenClose").addEventListener("click", () => document.getElementById("dbFullscreenDialog").close());
    document.getElementById("dbFullscreenDialog").addEventListener("click", event => {
        if (event.target === event.currentTarget) event.currentTarget.close();
    });
    const specimenForm = document.getElementById("staff-specimen-form");
    if (specimenForm) {
        specimenForm.addEventListener("submit", async event => {
            event.preventDefault();
            const feedback = document.getElementById("staff-specimen-feedback");
            const submit = specimenForm.querySelector('button[type="submit"]');
            submit.disabled = true;
            try {
                await window.LumkoData.createSpecimen(
                    document.getElementById("staff-specimen-type").value,
                    document.getElementById("staff-specimen-study").value.trim()
                );
                sharedSpecimens = await window.LumkoData.listSpecimens();
                renderDatabaseTable(document.getElementById("dbSearchInput").value);
                feedback.textContent = "Specimen saved to the shared database.";
                feedback.classList.add("is-visible");
                feedback.classList.remove("is-error");
                specimenForm.reset();
            } catch (error) {
                feedback.textContent = error instanceof Error ? error.message : "The specimen could not be saved.";
                feedback.classList.add("is-visible", "is-error");
            } finally {
                submit.disabled = false;
            }
        });
    }
    renderDatabaseTable();
    import("./shared-api.js").then(async () => {
        try {
            sharedSpecimens = await window.LumkoData.listSpecimens();
            const status = document.getElementById("shared-specimen-status");
            if (status) status.textContent = "Connected to the shared specimen database.";
            renderDatabaseTable(document.getElementById("dbSearchInput").value);
        } catch (error) {
            const status = document.getElementById("shared-specimen-status");
            if (status) status.textContent = error instanceof Error ? error.message : "Unable to load shared specimens.";
        }
        window.setInterval(async () => {
            try {
                sharedSpecimens = await window.LumkoData.listSpecimens();
                renderDatabaseTable(document.getElementById("dbSearchInput").value);
            } catch (error) {
                const status = document.getElementById("shared-specimen-status");
                if (status) status.textContent = error instanceof Error ? error.message : "Unable to refresh shared specimens.";
            }
        }, 30000);
    }).catch(error => {
        const status = document.getElementById("shared-specimen-status");
        if (status) status.textContent = error instanceof Error ? error.message : "Unable to initialize staff services.";
    });
}

function initializeGalleryViewer() {
    const dialog = document.getElementById("gallery-lightbox");
    if (!dialog) return;
    const image = document.getElementById("gallery-lightbox-image");
    const caption = document.getElementById("gallery-lightbox-caption");
    const closeButton = document.getElementById("gallery-lightbox-close");

    document.querySelectorAll("[data-gallery-image]").forEach(button => {
        button.addEventListener("click", () => {
            const preview = button.querySelector("img");
            image.src = preview.src;
            image.alt = preview.alt;
            caption.textContent = button.dataset.caption;
            dialog.showModal();
            closeButton.focus();
        });
    });

    closeButton.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", event => {
        if (event.target === dialog) dialog.close();
    });
}

document.addEventListener("DOMContentLoaded", () => {
    renderSiteChrome();
    updateClock();
    window.setInterval(updateClock, 1000);
    initializeStaffGateway();
    initializeStaffPage();
    initializeCustomerPortal();
    initializeSampleStatement();
    initializeDocumentRegister();
    initializeItFieldNotes();
    initializeResearchLibrary();
    initializeReferenceForm("appointment-form", "appointment-feedback", "APP", "Appointment reference:");
    initializeReferenceForm("contact-form", "contact-feedback", "ENQ", "Enquiry reference:");
    initializeReferenceForm("helpdesk-form", "helpdesk-feedback", "HD", "Service request reference:");
    const dateInput = document.getElementById("appointment-date");
    if (dateInput) {
        const localToday = new Date();
        localToday.setMinutes(localToday.getMinutes() - localToday.getTimezoneOffset());
        dateInput.min = localToday.toISOString().split("T")[0];
    }
    initializeDatabaseExplorer();
    initializeGalleryViewer();
});
