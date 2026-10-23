(function () {
    "use strict";

    const STATUS_LABELS = {
        SAVED: "Saved",
        APPLIED: "Applied",
        ASSESSMENT: "Assessment",
        INTERVIEWING: "Interviewing",
        OFFERED: "Offered",
        REJECTED: "Rejected",
        WITHDRAWN: "Withdrawn"
    };
    const AVATAR_COLORS = [
        ["#eeeaff", "#6859c9"], ["#e8f3ff", "#4171b7"], ["#e8f7ef", "#25825b"],
        ["#fff1e6", "#bb7039"], ["#fcebf1", "#b94f72"], ["#e9f5f4", "#357f79"]
    ];

    const elements = {
        sidebar: document.querySelector("#sidebar"),
        mobileMenu: document.querySelector("#mobile-menu"),
        mobileCloseMenu: document.querySelector("#mobile-close-menu"),
        mobileScrim: document.querySelector("#mobile-scrim"),
        dashboardView: document.querySelector("#dashboard-view"),
        applicationsView: document.querySelector("#applications-view"),
        pageTitle: document.querySelector("#page-title"),
        pageSubtitle: document.querySelector("#page-subtitle"),
        headerDate: document.querySelector("#header-date"),
        todayLabel: document.querySelector("#today-label"),
        backendError: document.querySelector("#backend-error"),
        backendErrorMessage: document.querySelector("#backend-error-message"),
        recentBody: document.querySelector("#recent-table-body"),
        recentState: document.querySelector("#recent-state"),
        applicationsBody: document.querySelector("#applications-table-body"),
        applicationsState: document.querySelector("#applications-state"),
        resultsCount: document.querySelector("#results-count"),
        navCount: document.querySelector("#nav-count"),
        search: document.querySelector("#search-input"),
        statusFilter: document.querySelector("#status-filter"),
        sortFilter: document.querySelector("#sort-filter"),
        clearFilters: document.querySelector("#clear-filters"),
        applicationDialog: document.querySelector("#application-dialog"),
        applicationForm: document.querySelector("#application-form"),
        formTitle: document.querySelector("#form-title"),
        formError: document.querySelector("#form-api-error"),
        saveButton: document.querySelector("#save-button"),
        saveLabel: document.querySelector(".save-label"),
        saveSpinner: document.querySelector(".save-spinner"),
        detailsDialog: document.querySelector("#details-dialog"),
        detailsTitle: document.querySelector("#details-title"),
        detailsCompany: document.querySelector("#details-company"),
        detailsContent: document.querySelector("#details-content"),
        toastRegion: document.querySelector("#toast-region"),
        refreshButton: document.querySelector("#refresh-button")
    };

    const state = {
        applications: [],
        currentView: "dashboard",
        editingId: null,
        loading: false,
        loadError: false,
        submitting: false,
        detailsApplication: null,
        toastTimer: null
    };

    function localDateString(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function formatDate(value) {
        if (!value) {
            return "—";
        }
        const date = new Date(`${value}T00:00:00`);
        if (Number.isNaN(date.getTime())) {
            return "—";
        }
        return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
    }

    function friendlyStatus(status) {
        return STATUS_LABELS[status] || "Unknown";
    }

    function element(tag, className, text) {
        const node = document.createElement(tag);
        if (className) {
            node.className = className;
        }
        if (text !== undefined && text !== null) {
            node.textContent = text;
        }
        return node;
    }

    function setText(selector, value) {
        const target = document.querySelector(selector);
        if (target) {
            target.textContent = value;
        }
    }

    function showToast(message, type = "success") {
        window.clearTimeout(state.toastTimer);
        elements.toastRegion.replaceChildren();
        const toast = element("div", `toast${type === "error" ? " toast-error" : ""}`);
        toast.setAttribute("role", type === "error" ? "alert" : "status");
        toast.append(element("span", "toast-symbol", type === "error" ? "!" : "✓"));
        toast.append(element("span", "", message));
        elements.toastRegion.append(toast);
        state.toastTimer = window.setTimeout(() => toast.remove(), 4200);
    }

    function setLoading(loading) {
        state.loading = loading;
        elements.refreshButton.classList.toggle("is-loading", loading);
        elements.refreshButton.disabled = loading;
        elements.refreshButton.setAttribute("aria-busy", String(loading));
    }

    async function loadApplications({ quiet = false } = {}) {
        setLoading(true);
        state.loadError = false;
        if (!quiet) {
            elements.backendError.hidden = true;
        }
        render();
        try {
            const records = await window.JobTrackerApi.list();
            if (!Array.isArray(records)) {
                throw new Error("The server returned an unexpected response. Try refreshing the page.");
            }
            state.applications = records;
            state.loadError = false;
            elements.backendError.hidden = true;
        } catch (error) {
            elements.backendErrorMessage.textContent = error.message;
            elements.backendError.hidden = false;
            state.applications = [];
            state.loadError = true;
        } finally {
            setLoading(false);
            render();
        }
    }

    function applicationInitials(companyName) {
        const initials = (companyName || "?")
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((word) => word.charAt(0))
            .join("");
        return initials || "?";
    }

    function companyColor(companyName) {
        const seed = Array.from(companyName || "").reduce((total, character) => total + character.charCodeAt(0), 0);
        return AVATAR_COLORS[seed % AVATAR_COLORS.length];
    }

    function safeJobUrl(value) {
        if (!value) {
            return null;
        }
        try {
            const url = new URL(value);
            return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
        } catch {
            return null;
        }
    }

    function createStatusBadge(status) {
        const badge = element("span", `status-badge status-${String(status || "").toLowerCase()}`);
        badge.append(element("span", "status-dot"));
        badge.append(element("span", "", friendlyStatus(status)));
        return badge;
    }

    function createActionButton(label, action, id, className = "") {
        const button = element("button", `row-action ${className}`.trim(), label);
        button.type = "button";
        button.dataset.action = action;
        button.dataset.id = String(id);
        button.setAttribute("aria-label", `${label} application`);
        return button;
    }

    function createApplicationRow(application) {
        const row = document.createElement("tr");
        const companyCell = element("td");
        const company = element("div", "company-cell");
        const [background, foreground] = companyColor(application.companyName);
        const avatar = element("span", "company-avatar", applicationInitials(application.companyName));
        avatar.style.backgroundColor = background;
        avatar.style.color = foreground;
        avatar.setAttribute("aria-hidden", "true");
        const companyName = element("span", "company-name", application.companyName || "Unnamed company");
        const jobUrl = safeJobUrl(application.jobUrl);
        if (jobUrl) {
            const link = element("a", "company-name", application.companyName || "Unnamed company");
            link.href = jobUrl;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.title = "Open job posting in a new tab";
            company.append(avatar, link);
        } else {
            company.append(avatar, companyName);
        }
        companyCell.append(company);

        const titleCell = element("td");
        titleCell.append(element("span", "job-title-cell", application.jobTitle || "Untitled role"));
        const dateCell = element("td", "date-cell", formatDate(application.applicationDate));
        const locationCell = element("td", "location-cell", application.jobLocation || "—");
        const statusCell = element("td");
        statusCell.append(createStatusBadge(application.status));
        const actionCell = element("td");
        const actions = element("div", "row-actions");
        actions.append(
            createActionButton("View", "view", application.id),
            createActionButton("Edit", "edit", application.id),
            createActionButton("Delete", "delete", application.id, "delete-action")
        );
        actionCell.append(actions);
        row.append(companyCell, titleCell, dateCell, locationCell, statusCell, actionCell);
        return row;
    }

    function sortedApplications(applications) {
        const sortOrder = elements.sortFilter.value;
        return [...applications].sort((first, second) => {
            if (sortOrder.startsWith("company")) {
                const comparison = (first.companyName || "").localeCompare(second.companyName || "", undefined, { sensitivity: "base" });
                return sortOrder.endsWith("desc") ? -comparison : comparison;
            }
            const comparison = (first.applicationDate || "").localeCompare(second.applicationDate || "");
            return sortOrder === "date-asc" ? comparison : -comparison;
        });
    }

    function filteredApplications() {
        const searchTerm = elements.search.value.trim().toLocaleLowerCase();
        const selectedStatus = elements.statusFilter.value;
        return sortedApplications(state.applications.filter((application) => {
            const matchesSearch = !searchTerm
                || (application.companyName || "").toLocaleLowerCase().includes(searchTerm)
                || (application.jobTitle || "").toLocaleLowerCase().includes(searchTerm);
            return matchesSearch && (!selectedStatus || application.status === selectedStatus);
        }));
    }

    function renderTable(body, statePanel, applications, emptyTitle, emptyMessage, noResults = false) {
        body.replaceChildren();
        if (applications.length) {
            statePanel.hidden = true;
            applications.forEach((application) => body.append(createApplicationRow(application)));
            return;
        }

        statePanel.hidden = false;
        if (state.loading) {
            statePanel.replaceChildren(element("span", "loading-state", "Loading applications…"));
            return;
        }
        const content = element("div", "empty-state-content");
        content.append(element("span", "empty-illustration", noResults ? "⌕" : "✦"));
        content.append(element("h3", "", state.loadError ? "Applications are unavailable" : emptyTitle));
        content.append(element("p", "", state.loadError
            ? "Reconnect to the backend to load your saved applications."
            : emptyMessage));
        if (!noResults && !state.loadError && state.applications.length === 0) {
            const addButton = element("button", "button button-primary", "Add your first application");
            addButton.type = "button";
            addButton.dataset.action = "add";
            content.append(addButton);
        }
        statePanel.replaceChildren(content);
    }

    function renderStats() {
        const counts = {
            total: state.applications.length,
            applied: state.applications.filter((application) => application.status === "APPLIED").length,
            interviewing: state.applications.filter((application) => application.status === "INTERVIEWING").length,
            offers: state.applications.filter((application) => application.status === "OFFERED").length,
            rejected: state.applications.filter((application) => application.status === "REJECTED").length
        };
        Object.entries(counts).forEach(([key, value]) =>
            setText(`[data-stat="${key}"]`, state.loading && state.applications.length === 0 ? "—" : String(value)));
        elements.navCount.textContent = String(state.applications.length);
    }

    function render() {
        renderStats();
        const newestFirst = [...state.applications].sort((first, second) =>
            (second.applicationDate || "").localeCompare(first.applicationDate || ""));
        renderTable(
            elements.recentBody,
            elements.recentState,
            newestFirst.slice(0, 5),
            "Your next chapter starts here",
            "Add your first opportunity and keep every step of your search in one place."
        );
        const results = filteredApplications();
        renderTable(
            elements.applicationsBody,
            elements.applicationsState,
            results,
            state.applications.length ? "No matching applications" : "No applications yet",
            state.applications.length
                ? "Try a different search or clear the filters to see all your applications."
                : "When you find a role you like, add it here to start tracking your progress.",
            state.applications.length > 0
        );
        elements.resultsCount.textContent = `${results.length} ${results.length === 1 ? "result" : "results"}`;
    }

    function setView(view) {
        state.currentView = view === "applications" ? "applications" : "dashboard";
        const applicationsView = state.currentView === "applications";
        elements.dashboardView.hidden = applicationsView;
        elements.applicationsView.hidden = !applicationsView;
        elements.pageTitle.textContent = applicationsView ? "My applications" : "Dashboard";
        elements.pageSubtitle.textContent = applicationsView
            ? "Every opportunity, organized in one place."
            : "A little progress each day adds up to big results.";
        document.querySelectorAll("[data-view]").forEach((button) => {
            const active = button.dataset.view === state.currentView;
            if (button.classList.contains("nav-link")) {
                button.classList.toggle("is-active", active);
                if (active) {
                    button.setAttribute("aria-current", "page");
                } else {
                    button.removeAttribute("aria-current");
                }
            }
        });
        closeMobileMenu();
        window.history.replaceState(null, "", `#${state.currentView}`);
    }

    function openMobileMenu() {
        elements.sidebar.classList.add("is-open");
        elements.mobileScrim.hidden = false;
        elements.mobileMenu.setAttribute("aria-expanded", "true");
        elements.mobileMenu.setAttribute("aria-label", "Close navigation");
    }

    function closeMobileMenu() {
        elements.sidebar.classList.remove("is-open");
        elements.mobileScrim.hidden = true;
        elements.mobileMenu.setAttribute("aria-expanded", "false");
        elements.mobileMenu.setAttribute("aria-label", "Open navigation");
    }

    function clearFieldErrors() {
        elements.applicationForm.querySelectorAll(".field-error").forEach((error) => {
            error.textContent = "";
        });
        elements.applicationForm.querySelectorAll("[aria-invalid='true']").forEach((field) => {
            field.removeAttribute("aria-invalid");
        });
        elements.formError.hidden = true;
        elements.formError.textContent = "";
    }

    function setFormValue(name, value) {
        const field = elements.applicationForm.elements.namedItem(name);
        if (field) {
            field.value = value || "";
        }
    }

    function openCreateForm() {
        state.editingId = null;
        elements.applicationForm.reset();
        clearFieldErrors();
        elements.formTitle.textContent = "Add application";
        elements.saveLabel.textContent = "Save application";
        setFormValue("applicationDate", localDateString());
        setFormValue("status", "APPLIED");
        elements.applicationDialog.showModal();
        elements.applicationForm.elements.companyName.focus();
    }

    async function openEditForm(id) {
        clearFieldErrors();
        elements.saveButton.disabled = true;
        try {
            const application = await window.JobTrackerApi.get(id);
            state.editingId = application.id;
            elements.applicationForm.reset();
            elements.formTitle.textContent = "Edit application";
            elements.saveLabel.textContent = "Save changes";
            setFormValue("companyName", application.companyName);
            setFormValue("jobTitle", application.jobTitle);
            setFormValue("jobDescription", application.jobDescription);
            setFormValue("applicationDate", application.applicationDate);
            setFormValue("status", application.status);
            setFormValue("jobLocation", application.jobLocation);
            setFormValue("jobUrl", application.jobUrl);
            setFormValue("notes", application.notes);
            elements.applicationDialog.showModal();
            elements.applicationForm.elements.companyName.focus();
        } catch (error) {
            showToast(error.message, "error");
        } finally {
            elements.saveButton.disabled = false;
        }
    }

    function addDetail(label, value, fullWidth = false) {
        const item = element("div", `detail-item${fullWidth ? " detail-item-full" : ""}`);
        item.append(element("span", "detail-label", label));
        const valueElement = element("div", "detail-value");
        if (value instanceof Node) {
            valueElement.append(value);
        } else {
            valueElement.textContent = value || "—";
        }
        item.append(valueElement);
        elements.detailsContent.append(item);
    }

    function openDetails(application) {
        state.detailsApplication = application;
        elements.detailsTitle.textContent = application.jobTitle || "Untitled role";
        elements.detailsCompany.textContent = application.companyName || "Unnamed company";
        elements.detailsContent.replaceChildren();
        addDetail("Status", "");
        elements.detailsContent.lastElementChild.querySelector(".detail-value")
            .append(createStatusBadge(application.status));
        addDetail("Application date", formatDate(application.applicationDate));
        addDetail("Location", application.jobLocation);
        const safeUrl = safeJobUrl(application.jobUrl);
        if (safeUrl) {
            const link = element("a", "", application.jobUrl);
            link.href = safeUrl;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            addDetail("Job posting", link, true);
        } else {
            addDetail("Job posting", application.jobUrl ? "Invalid URL" : "—", true);
        }
        addDetail("Job description", application.jobDescription, true);
        addDetail("Notes", application.notes, true);
        elements.detailsDialog.showModal();
    }

    function showClientError(fieldName, message) {
        const field = elements.applicationForm.elements.namedItem(fieldName);
        const error = elements.applicationForm.querySelector(`[data-error-for="${fieldName}"]`);
        if (field) {
            field.setAttribute("aria-invalid", "true");
        }
        if (error) {
            error.textContent = message;
        }
    }

    function validateForm() {
        clearFieldErrors();
        const companyName = elements.applicationForm.elements.companyName.value.trim();
        const jobTitle = elements.applicationForm.elements.jobTitle.value.trim();
        const jobUrl = elements.applicationForm.elements.jobUrl.value.trim();
        let valid = true;
        if (!companyName) {
            showClientError("companyName", "Enter a company name.");
            valid = false;
        }
        if (!jobTitle) {
            showClientError("jobTitle", "Enter a job title.");
            valid = false;
        }
        if (jobUrl) {
            try {
                const parsed = new URL(jobUrl);
                if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
                    throw new Error("Unsupported URL protocol");
                }
            } catch {
                showClientError("jobUrl", "Enter a valid URL starting with http:// or https://.");
                valid = false;
            }
        }
        if (!elements.applicationForm.reportValidity()) {
            valid = false;
        }
        return valid;
    }

    function requestBody() {
        const value = (name) => elements.applicationForm.elements[name].value.trim();
        const application = {
            companyName: value("companyName"),
            jobTitle: value("jobTitle"),
            jobDescription: value("jobDescription") || null,
            applicationDate: value("applicationDate"),
            status: value("status"),
            jobLocation: value("jobLocation") || null,
            jobUrl: value("jobUrl") || null,
            notes: value("notes") || null
        };
        if (state.editingId !== null) {
            application.id = state.editingId;
        }
        return application;
    }

    function showServerValidation(error) {
        let mapped = false;
        if (error.fieldErrors) {
            Object.entries(error.fieldErrors).forEach(([field, message]) => {
                if (elements.applicationForm.elements.namedItem(field)) {
                    showClientError(field, message);
                    mapped = true;
                }
            });
        }
        if (!mapped && error.message) {
            const fieldNames = ["companyName", "jobTitle", "jobDescription", "applicationDate", "status", "jobLocation", "jobUrl", "notes"];
            fieldNames.forEach((field) => {
                const prefix = `${field}:`;
                const start = error.message.indexOf(prefix);
                if (start !== -1) {
                    const nextField = fieldNames
                        .map((name) => error.message.indexOf(`${name}:`, start + prefix.length))
                        .filter((index) => index !== -1)
                        .sort((first, second) => first - second)[0];
                    const end = nextField === undefined ? error.message.length : nextField;
                    showClientError(field, error.message.slice(start + prefix.length, end).trim());
                    mapped = true;
                }
            });
        }
        elements.formError.textContent = mapped
            ? "Please review the highlighted fields."
            : error.message;
        elements.formError.hidden = false;
    }

    async function submitForm(event) {
        event.preventDefault();
        if (state.submitting || !validateForm()) {
            return;
        }

        state.submitting = true;
        elements.saveButton.disabled = true;
        elements.saveLabel.textContent = state.editingId === null ? "Saving…" : "Updating…";
        elements.saveSpinner.hidden = false;
        const isEditing = state.editingId !== null;
        try {
            const application = requestBody();
            if (isEditing) {
                await window.JobTrackerApi.update(state.editingId, application);
            } else {
                await window.JobTrackerApi.create(application);
            }
            elements.applicationDialog.close();
            elements.applicationForm.reset();
            await loadApplications({ quiet: true });
            showToast(isEditing ? "Application updated successfully." : "Application created successfully.");
        } catch (error) {
            showServerValidation(error);
        } finally {
            state.submitting = false;
            elements.saveButton.disabled = false;
            elements.saveSpinner.hidden = true;
            elements.saveLabel.textContent = state.editingId === null ? "Save application" : "Save changes";
        }
    }

    async function deleteApplication(id) {
        const application = state.applications.find((item) => String(item.id) === String(id));
        const company = application?.companyName || "this application";
        if (!window.confirm(`Delete the application for ${company}? This cannot be undone.`)) {
            return;
        }
        try {
            await window.JobTrackerApi.remove(id);
            state.applications = state.applications.filter((item) => String(item.id) !== String(id));
            render();
            showToast("Application deleted.");
        } catch (error) {
            showToast(error.message, "error");
            if (error.status === 404) {
                await loadApplications({ quiet: true });
            }
        }
    }

    function closeForm() {
        if (state.submitting) {
            return;
        }
        elements.applicationDialog.close();
        elements.applicationForm.reset();
        clearFieldErrors();
        state.editingId = null;
    }

    function bindEvents() {
        document.querySelectorAll("[data-view]").forEach((button) => {
            button.addEventListener("click", () => setView(button.dataset.view));
        });
        document.querySelectorAll("#sidebar-add, #topbar-add, #list-add").forEach((button) => {
            button.addEventListener("click", openCreateForm);
        });
        document.querySelectorAll("[data-action]").forEach((button) => {
            button.addEventListener("click", () => handleAction(button));
        });
        elements.recentBody.addEventListener("click", (event) => handleDelegatedAction(event));
        elements.applicationsBody.addEventListener("click", (event) => handleDelegatedAction(event));
        elements.recentState.addEventListener("click", (event) => handleDelegatedAction(event));
        elements.applicationsState.addEventListener("click", (event) => handleDelegatedAction(event));
        elements.search.addEventListener("input", render);
        elements.statusFilter.addEventListener("change", render);
        elements.sortFilter.addEventListener("change", render);
        elements.clearFilters.addEventListener("click", () => {
            elements.search.value = "";
            elements.statusFilter.value = "";
            elements.sortFilter.value = "date-desc";
            render();
            elements.search.focus();
        });
        elements.refreshButton.addEventListener("click", () => loadApplications());
        document.querySelector("#retry-button").addEventListener("click", () => loadApplications());
        elements.applicationForm.addEventListener("submit", submitForm);
        document.querySelector("#cancel-form").addEventListener("click", closeForm);
        document.querySelector("#close-form").addEventListener("click", closeForm);
        elements.applicationDialog.addEventListener("cancel", (event) => {
            if (state.submitting) {
                event.preventDefault();
            }
        });
        document.querySelector("#close-details").addEventListener("click", () => elements.detailsDialog.close());
        document.querySelector("#details-close-button").addEventListener("click", () => elements.detailsDialog.close());
        document.querySelector("#details-edit-button").addEventListener("click", () => {
            const id = state.detailsApplication?.id;
            elements.detailsDialog.close();
            if (id !== undefined && id !== null) {
                openEditForm(id);
            }
        });
        elements.mobileMenu.addEventListener("click", () => {
            if (elements.mobileMenu.getAttribute("aria-expanded") === "true") {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });
        elements.mobileCloseMenu.addEventListener("click", closeMobileMenu);
        elements.mobileScrim.addEventListener("click", closeMobileMenu);
        window.addEventListener("hashchange", () => {
            setView(window.location.hash.slice(1) || "dashboard");
        });
    }

    function handleDelegatedAction(event) {
        const button = event.target.closest("[data-action]");
        if (button) {
            handleAction(button);
        }
    }

    function handleAction(button) {
        const action = button.dataset.action;
        const id = button.dataset.id;
        if (action === "add") {
            openCreateForm();
        } else if (action === "view") {
            const application = state.applications.find((item) => String(item.id) === String(id));
            if (application) {
                openDetails(application);
            }
        } else if (action === "edit") {
            openEditForm(id);
        } else if (action === "delete") {
            deleteApplication(id);
        }
    }

    function initializeDates() {
        const now = new Date();
        elements.todayLabel.textContent = new Intl.DateTimeFormat(undefined, {
            weekday: "short", month: "short", day: "numeric"
        }).format(now);
        elements.headerDate.textContent = new Intl.DateTimeFormat(undefined, {
            weekday: "long", month: "long", day: "numeric", year: "numeric"
        }).format(now);
    }

    function initialize() {
        initializeDates();
        bindEvents();
        render();
        setView(window.location.hash.slice(1) || "dashboard");
        loadApplications();
    }

    initialize();
}());
