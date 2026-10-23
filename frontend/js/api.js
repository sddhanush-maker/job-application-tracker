(function () {
    "use strict";

    const configuredBaseUrl = window.JOBTRACKER_API_BASE_URL || "http://localhost:8080/api/applications";
    const baseUrl = configuredBaseUrl.replace(/\/+$/, "");

    function validationMessage(errors) {
        if (!errors || typeof errors !== "object") {
            return "";
        }

        return Object.entries(errors)
            .map(([field, message]) => `${field}: ${message}`)
            .join(" ");
    }

    async function request(path, options = {}) {
        let response;
        try {
            response = await fetch(`${baseUrl}${path}`, {
                ...options,
                headers: {
                    Accept: "application/json",
                    ...(options.body ? { "Content-Type": "application/json" } : {}),
                    ...options.headers
                }
            });
        } catch {
            throw new Error("Could not reach the backend. Check that Spring Boot is running at http://localhost:8080.");
        }

        if (response.status === 204) {
            return null;
        }

        const contentType = response.headers.get("content-type") || "";
        let payload = null;
        if (contentType.includes("application/json")) {
            try {
                payload = await response.json();
            } catch {
                payload = null;
            }
        }

        if (!response.ok) {
            let message;
            if (response.status === 404) {
                message = payload?.message || "That application could not be found. It may have been removed.";
            } else if (response.status === 400) {
                message = validationMessage(payload?.errors) || payload?.message || "Please check the information and try again.";
            } else {
                message = "The server could not complete that request. Please try again.";
            }
            const error = new Error(message);
            error.status = response.status;
            error.fieldErrors = payload?.errors || null;
            throw error;
        }

        return payload;
    }

    function jsonRequest(method, body) {
        return {
            method,
            body: JSON.stringify(body)
        };
    }

    window.JobTrackerApi = Object.freeze({
        list: () => request("", { method: "GET" }),
        get: (id) => request(`/${encodeURIComponent(id)}`, { method: "GET" }),
        create: (application) => request("", jsonRequest("POST", application)),
        update: (id, application) => request(`/${encodeURIComponent(id)}`, jsonRequest("PUT", application)),
        remove: (id) => request(`/${encodeURIComponent(id)}`, { method: "DELETE" })
    });
}());
