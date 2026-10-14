(() => {
    "use strict";

    const STORAGE_KEY = "lumko-equipment-operations-v1";
    const assets = [
        { id: "LMR-EQ-001", name: "MRI Scanner", category: "Diagnostic imaging", location: "Main Building · Floor 1 · Imaging suite", floor: "main1", status: "Needs verification" },
        { id: "LMR-EQ-002", name: "Blood Chemistry Analyzer", category: "Blood analysis", location: "Laboratory Building · Floor 1 · Central laboratory", floor: "lab1", status: "Needs verification" },
        { id: "LMR-EQ-003", name: "Tissue Slide Scanner", category: "Histology", location: "Laboratory Building · Floor 1 · Tissue laboratory", floor: "lab1", status: "Needs verification" },
        { id: "LMR-EQ-004", name: "Refrigerated Centrifuge", category: "Sample processing", location: "Laboratory Building · Floor 1 · Sample preparation", floor: "lab1", status: "Needs verification" },
        { id: "LMR-EQ-005", name: "Serum Centrifuge", category: "Sample processing", location: "Laboratory Building · Floor 1 · Sample preparation", floor: "lab1", status: "Needs verification" },
        { id: "LMR-EQ-006", name: "Research Microscope", category: "Microscopy", location: "Laboratory Building · Floor 2", floor: "lab25", status: "Needs verification" }
    ];
    const floorPlans = {
        main1: { label: "Main Building · Floor 1", href: "Diagrams/Main%20Building%20-%20Floor%201.png" },
        main23: { label: "Main Building · Floors 2–3", href: "Diagrams/Main%20Building%20-%20Floor%202-3.png" },
        lab1: { label: "Laboratory Building · Floor 1 & Server Room", href: "Diagrams/Labratory%20Bulding%20-%20Floor%201%20and%20Server%20Room.png" },
        lab25: { label: "Laboratory Building · Floors 2–5", href: "Diagrams/Labratory%20Bulding%20-%20Floor%202-5.png" }
    };
    const emptyState = { alerts: [], maintenance: [], activity: [], assetOverrides: [] };
    let state = emptyState;
    let storageProblem = "";
    let cameraStream = null;
    let scannerActive = false;
    let alertTimer = null;

    function loadState() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === null) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(emptyState));
            return emptyState;
        }
        const parsed = JSON.parse(saved);
        if (!parsed || !Array.isArray(parsed.alerts) ||
            !Array.isArray(parsed.maintenance) || !Array.isArray(parsed.activity) ||
            (parsed.assetOverrides !== undefined && !Array.isArray(parsed.assetOverrides))) {
            throw new Error("Saved equipment records have an invalid format.");
        }
        return { ...parsed, assetOverrides: parsed.assetOverrides || [] };
    }

    function persist(nextState) {
        if (storageProblem) throw new Error(storageProblem);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
        state = nextState;
        renderAll();
    }

    function setMessage(id, message, isError = false) {
        const element = document.getElementById(id);
        if (!element) return;
        element.textContent = message;
        element.classList.toggle("error", isError);
        element.classList.toggle("success", Boolean(message) && !isError);
    }

    function createActivity(message, when = new Date().toISOString()) {
        return { id: crypto.randomUUID(), message, when };
    }

    function escapeText(value) {
        return String(value ?? "");
    }

    function getInventory() {
        return assets.map(asset => ({
            ...asset,
            ...(state.assetOverrides.find(override => override.id === asset.id) || {})
        }));
    }

    function findAsset(id) {
        const normalized = String(id || "").trim().toUpperCase();
        return getInventory().find(asset => normalized === asset.id || normalized.includes(asset.id));
    }

    function fillAssetSelectors() {
        ["equipment-process-asset", "equipment-maintenance-asset", "equipment-edit-asset"].forEach(id => {
            const select = document.getElementById(id);
            select.replaceChildren(...getInventory().map(asset => {
                const option = document.createElement("option");
                option.value = asset.id;
                option.textContent = `${asset.id} · ${asset.name}`;
                return option;
            }));
        });
        loadAssetEditor();
    }

    function renderAssets() {
        const list = document.getElementById("equipment-results");
        const query = document.getElementById("equipment-search").value.trim().toLowerCase();
        const matches = getInventory().filter(asset =>
            [asset.id, asset.name, asset.category, asset.location].some(value => value.toLowerCase().includes(query))
        );
        list.replaceChildren();
        if (!matches.length) {
            const empty = document.createElement("p");
            empty.className = "equipment-empty";
            empty.textContent = "No equipment matches that search. Check the tag or try another name.";
            list.append(empty);
            return;
        }
        matches.forEach(asset => {
            const serviceBooked = state.maintenance.some(entry =>
                entry.assetId === asset.id && entry.status === "Scheduled"
            );
            const status = serviceBooked && asset.status === "Available" ? "Service scheduled" : asset.status;
            const card = document.createElement("article");
            card.className = "equipment-card";
            card.innerHTML = `<span class="equipment-id">${escapeText(asset.id)}</span><h3>${escapeText(asset.name)}</h3><p><strong>${escapeText(asset.category)}</strong></p><p>${escapeText(asset.location)}</p><span class="equipment-status${serviceBooked ? " maintenance" : ""}">${escapeText(status)}</span><div class="equipment-actions"><button class="btn-blue" type="button" data-equipment-action="floor" data-floor="${escapeText(asset.floor)}">View floor plan</button><button class="btn-orange" type="button" data-equipment-action="complete" data-asset="${escapeText(asset.id)}">Log run complete</button></div>`;
            list.append(card);
        });
    }

    function formatDate(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "Date unavailable";
        return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
    }

    function renderEvents(containerId, items, emptyMessage, messageFor, dateFor) {
        const container = document.getElementById(containerId);
        container.replaceChildren();
        if (!items.length) {
            const empty = document.createElement("p");
            empty.className = "equipment-empty";
            empty.textContent = emptyMessage;
            container.append(empty);
            return;
        }
        items.forEach(item => {
            const row = document.createElement("div");
            row.className = "equipment-event";
            const title = document.createElement("strong");
            title.textContent = messageFor(item);
            const date = document.createElement("span");
            date.textContent = formatDate(dateFor(item));
            row.append(title, date);
            container.append(row);
        });
    }

    function renderAlerts() {
        const pending = state.alerts.filter(alert => alert.status === "Scheduled").sort((a, b) => a.dueAt.localeCompare(b.dueAt));
        renderEvents(
            "equipment-alert-list",
            pending,
            "No completion reminders are scheduled.",
            alert => `${alert.assetName} · ${alert.process}`,
            alert => alert.dueAt
        );
        renderEvents(
            "equipment-activity-list",
            [...state.activity].sort((a, b) => b.when.localeCompare(a.when)).slice(0, 12),
            "No equipment activity has been recorded.",
            entry => entry.message,
            entry => entry.when
        );
    }

    function renderMaintenance() {
        const body = document.getElementById("equipment-maintenance-body");
        body.replaceChildren();
        const entries = [...state.maintenance].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        if (!entries.length) {
            const row = body.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 5;
            cell.className = "empty-state";
            cell.textContent = "No maintenance entries have been recorded.";
            return;
        }
        entries.forEach(entry => {
            const row = body.insertRow();
            [entry.assetName, entry.type, entry.scheduledDate, entry.notes || "—", entry.status].forEach(value => {
                row.insertCell().textContent = value;
            });
            if (entry.status === "Scheduled") {
                const actionRow = body.insertRow();
                const cell = actionRow.insertCell();
                cell.colSpan = 5;
                const button = document.createElement("button");
                button.type = "button";
                button.className = "btn-blue";
                button.textContent = "Mark maintenance complete";
                button.dataset.maintenanceComplete = entry.id;
                cell.append(button);
            }
        });
    }

    function renderAll() {
        renderAssets();
        renderAlerts();
        renderMaintenance();
    }

    function loadAssetEditor() {
        const asset = findAsset(document.getElementById("equipment-edit-asset").value) || getInventory()[0];
        if (!asset) return;
        document.getElementById("equipment-edit-location").value = asset.location;
        document.getElementById("equipment-edit-floor").value = asset.floor;
        document.getElementById("equipment-edit-status").value = asset.status;
    }

    function saveAssetRecord() {
        const asset = findAsset(document.getElementById("equipment-edit-asset").value);
        const location = document.getElementById("equipment-edit-location").value.trim();
        const floor = document.getElementById("equipment-edit-floor").value;
        const status = document.getElementById("equipment-edit-status").value;
        if (!asset || !location || !floorPlans[floor] ||
            !["Needs verification", "Available", "In maintenance", "Out of service"].includes(status)) {
            setMessage("equipment-edit-feedback", "Choose an asset, enter a verified location, and select a valid floor plan and status.", true);
            return;
        }
        const update = { id: asset.id, location, floor, status };
        try {
            persist({
                ...state,
                assetOverrides: [...state.assetOverrides.filter(item => item.id !== asset.id), update],
                activity: [createActivity(`Asset record updated: ${asset.id} · ${location} · ${status}`), ...state.activity].slice(0, 50)
            });
            loadAssetEditor();
            setMessage("equipment-edit-feedback", `${asset.id} asset record updated in this browser.`);
        } catch (error) {
            setMessage("equipment-edit-feedback", `Unable to update asset record: ${error.message}`, true);
        }
    }

    function addActivity(message) {
        const next = {
            ...state,
            activity: [createActivity(message), ...state.activity].slice(0, 50)
        };
        persist(next);
    }

    function sendNotification(title, body) {
        if (!("Notification" in window) || Notification.permission !== "granted") return;
        try {
            new Notification(title, { body, tag: "lumko-equipment-" + Date.now() });
        } catch (error) {
            setMessage("equipment-notifications-feedback", `Browser notification could not be shown: ${error.message}`, true);
        }
    }

    function processDueAlerts() {
        const now = Date.now();
        const due = state.alerts.filter(alert => alert.status === "Scheduled" && Date.parse(alert.dueAt) <= now);
        if (!due.length) return;
        const dueIds = new Set(due.map(alert => alert.id));
        const activity = due.map(alert => createActivity(`Reminder due: ${alert.assetName} · ${alert.process}`));
        try {
            persist({
                ...state,
                alerts: state.alerts.map(alert => dueIds.has(alert.id) ? { ...alert, status: "Reminder sent" } : alert),
                activity: [...activity, ...state.activity].slice(0, 50)
            });
            due.forEach(alert => sendNotification(
                "Equipment completion reminder",
                `${alert.assetName}: ${alert.process} is due. Confirm completion with the equipment operator.`
            ));
        } catch (error) {
            setMessage("equipment-alert-feedback", `Unable to update due reminders: ${error.message}`, true);
        }
    }

    function scheduleReminder() {
        const asset = assets.find(item => item.id === document.getElementById("equipment-process-asset").value);
        const process = document.getElementById("equipment-process-name").value.trim();
        const finish = document.getElementById("equipment-process-finish").value;
        const dueAt = finish ? new Date(finish).toISOString() : "";
        if (!asset || !process || !finish || !Number.isFinite(Date.parse(dueAt)) || Date.parse(dueAt) <= Date.now()) {
            setMessage("equipment-alert-feedback", "Choose equipment, enter a run name, and set a future completion time.", true);
            return;
        }
        const alert = {
            id: crypto.randomUUID(),
            assetId: asset.id,
            assetName: asset.name,
            process,
            dueAt,
            status: "Scheduled",
            createdAt: new Date().toISOString()
        };
        try {
            persist({
                ...state,
                alerts: [alert, ...state.alerts].slice(0, 100),
                activity: [createActivity(`Completion reminder scheduled: ${asset.name} · ${process}`), ...state.activity].slice(0, 50)
            });
            document.getElementById("equipment-process-name").value = "";
            document.getElementById("equipment-process-finish").value = "";
            setMessage("equipment-alert-feedback", "Reminder scheduled. It will be checked while this app is open; enable browser notifications for an additional alert.");
        } catch (error) {
            setMessage("equipment-alert-feedback", `Unable to save the reminder: ${error.message}`, true);
        }
    }

    function saveMaintenance() {
        const asset = assets.find(item => item.id === document.getElementById("equipment-maintenance-asset").value);
        const type = document.getElementById("equipment-maintenance-type").value;
        const scheduledDate = document.getElementById("equipment-maintenance-date").value;
        const notes = document.getElementById("equipment-maintenance-notes").value.trim();
        if (!asset || !scheduledDate) {
            setMessage("equipment-maintenance-feedback", "Select an asset and scheduled maintenance date.", true);
            return;
        }
        const entry = {
            id: crypto.randomUUID(),
            assetId: asset.id,
            assetName: asset.name,
            type,
            scheduledDate,
            notes,
            status: "Scheduled",
            createdAt: new Date().toISOString()
        };
        try {
            persist({
                ...state,
                maintenance: [entry, ...state.maintenance].slice(0, 100),
                activity: [createActivity(`Maintenance scheduled: ${asset.name} · ${type} · ${scheduledDate}`), ...state.activity].slice(0, 50)
            });
            document.getElementById("equipment-maintenance-notes").value = "";
            setMessage("equipment-maintenance-feedback", "Maintenance entry saved in this browser.");
        } catch (error) {
            setMessage("equipment-maintenance-feedback", `Unable to save maintenance: ${error.message}`, true);
        }
    }

    function completeMaintenance(id) {
        const entry = state.maintenance.find(item => item.id === id);
        if (!entry || entry.status !== "Scheduled") return;
        try {
            persist({
                ...state,
                maintenance: state.maintenance.map(item => item.id === id ? { ...item, status: "Completed" } : item),
                activity: [createActivity(`Maintenance marked complete: ${entry.assetName} · ${entry.type}`), ...state.activity].slice(0, 50)
            });
            setMessage("equipment-maintenance-feedback", `${entry.type} marked complete for ${entry.assetName}.`);
        } catch (error) {
            setMessage("equipment-maintenance-feedback", `Unable to update maintenance: ${error.message}`, true);
        }
    }

    function logCompletion(assetId) {
        const asset = findAsset(assetId);
        if (!asset) return;
        const process = window.prompt(`Enter the completed run for ${asset.name}:`);
        if (process === null) return;
        if (!process.trim()) {
            setMessage("equipment-feedback", "Enter a run name to record its completion.", true);
            return;
        }
        const message = `Operator reported complete: ${asset.name} · ${process.trim()}`;
        try {
            addActivity(message);
            sendNotification("Equipment completion reported", message);
            setMessage("equipment-feedback", message);
        } catch (error) {
            setMessage("equipment-feedback", `Unable to record completion: ${error.message}`, true);
        }
    }

    function openFloorPlan(key) {
        const plan = floorPlans[key];
        if (!plan) return;
        const navButton = document.querySelector('.nav-btn[onclick*="floors-tab"]');
        if (typeof window.switchTab === "function") window.switchTab("floors-tab", navButton);
        const link = [...document.querySelectorAll(".floor-plan-card a")].find(item => item.getAttribute("href") === plan.href);
        if (link) link.click();
    }

    async function enableNotifications() {
        if (!("Notification" in window)) {
            setMessage("equipment-notifications-feedback", "This browser does not support notifications. In-app reminders remain available.", true);
            return;
        }
        if (!window.isSecureContext) {
            setMessage("equipment-notifications-feedback", "Browser notifications require HTTPS or localhost. In-app reminders remain available.", true);
            return;
        }
        try {
            const permission = await Notification.requestPermission();
            if (permission === "granted") {
                setMessage("equipment-notifications-feedback", "Browser notifications enabled for scheduled reminders and operator-reported completions.");
                sendNotification("Equipment notifications enabled", "Reminders are checked while the app is open.");
            } else {
                setMessage("equipment-notifications-feedback", `Notification permission ${permission}. In-app reminders remain available.`, true);
            }
        } catch (error) {
            setMessage("equipment-notifications-feedback", `Unable to request notification permission: ${error.message}`, true);
        }
    }

    function stopScanner() {
        scannerActive = false;
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
        const video = document.getElementById("equipment-scan-video");
        if (video) video.srcObject = null;
        const dialog = document.getElementById("equipment-scan-dialog");
        if (dialog?.open) dialog.close();
    }

    async function scanQrTag() {
        if (!("BarcodeDetector" in window)) {
            setMessage("equipment-feedback", "QR scanning is not supported by this browser. Enter the printed asset ID in the search field instead.", true);
            return;
        }
        if (!navigator.mediaDevices?.getUserMedia) {
            setMessage("equipment-feedback", "Camera access is unavailable. Enter the printed asset ID in the search field instead.", true);
            return;
        }
        const video = document.getElementById("equipment-scan-video");
        const dialog = document.getElementById("equipment-scan-dialog");
        try {
            const detector = new BarcodeDetector({ formats: ["qr_code"] });
            cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
            video.srcObject = cameraStream;
            dialog.showModal();
            await video.play();
            scannerActive = true;
            setMessage("equipment-feedback", "Point the camera at an equipment QR tag.");
            const scanFrame = async () => {
                if (!scannerActive) return;
                try {
                    const codes = await detector.detect(video);
                    const match = codes.find(code => findAsset(code.rawValue));
                    if (match) {
                        const asset = findAsset(match.rawValue);
                        document.getElementById("equipment-search").value = asset.id;
                        renderAssets();
                        setMessage("equipment-feedback", `Located ${asset.name} (${asset.id}).`);
                        stopScanner();
                        return;
                    }
                } catch (error) {
                    setMessage("equipment-feedback", `QR scan failed: ${error.message}`, true);
                    stopScanner();
                    return;
                }
                window.setTimeout(scanFrame, 350);
            };
            scanFrame();
        } catch (error) {
            stopScanner();
            setMessage("equipment-feedback", `Unable to start QR scanning: ${error.message}. Enter the printed asset ID in the search field instead.`, true);
        }
    }

    function initialize() {
        try {
            state = loadState();
        } catch (error) {
            state = emptyState;
            storageProblem = `Equipment records are read-only because local storage could not be read: ${error.message}`;
            setMessage("equipment-feedback", storageProblem, true);
        }
        fillAssetSelectors();
        renderAll();
        if (storageProblem) {
            ["equipment-alert-schedule", "equipment-maintenance-save", "equipment-edit-save"].forEach(id => {
                document.getElementById(id).disabled = true;
            });
        }
        document.getElementById("equipment-search").addEventListener("input", renderAssets);
        document.getElementById("equipment-search").addEventListener("keydown", event => {
            if (event.key === "Enter") {
                event.preventDefault();
                const asset = findAsset(event.currentTarget.value);
                if (asset) {
                    event.currentTarget.value = asset.id;
                    renderAssets();
                    setMessage("equipment-feedback", `Located ${asset.name} (${asset.id}).`);
                } else if (event.currentTarget.value.trim()) {
                    setMessage("equipment-feedback", "No asset tag matched. Check the ID or search by name.", true);
                }
            }
        });
        document.getElementById("equipment-search-clear").addEventListener("click", () => {
            document.getElementById("equipment-search").value = "";
            setMessage("equipment-feedback", "");
            renderAssets();
        });
        document.getElementById("equipment-results").addEventListener("click", event => {
            const button = event.target.closest("[data-equipment-action]");
            if (!button) return;
            if (button.dataset.equipmentAction === "floor") openFloorPlan(button.dataset.floor);
            if (button.dataset.equipmentAction === "complete") logCompletion(button.dataset.asset);
        });
        document.getElementById("equipment-maintenance-body").addEventListener("click", event => {
            const button = event.target.closest("[data-maintenance-complete]");
            if (button) completeMaintenance(button.dataset.maintenanceComplete);
        });
        document.getElementById("equipment-alert-schedule").addEventListener("click", scheduleReminder);
        document.getElementById("equipment-maintenance-save").addEventListener("click", saveMaintenance);
        document.getElementById("equipment-edit-asset").addEventListener("change", loadAssetEditor);
        document.getElementById("equipment-edit-save").addEventListener("click", saveAssetRecord);
        document.getElementById("equipment-notifications-enable").addEventListener("click", enableNotifications);
        document.getElementById("equipment-scan-open").addEventListener("click", scanQrTag);
        document.getElementById("equipment-scan-close").addEventListener("click", stopScanner);
        document.getElementById("equipment-scan-dialog").addEventListener("cancel", stopScanner);
        document.getElementById("equipment-scan-dialog").addEventListener("close", stopScanner);
        window.addEventListener("storage", event => {
            if (event.key !== STORAGE_KEY || event.newValue === null) return;
            try {
                const updated = JSON.parse(event.newValue);
                if (!updated || !Array.isArray(updated.alerts) ||
                    !Array.isArray(updated.maintenance) || !Array.isArray(updated.activity) ||
                    (updated.assetOverrides !== undefined && !Array.isArray(updated.assetOverrides))) {
                    throw new Error("Updated equipment records have an invalid format.");
                }
                state = { ...updated, assetOverrides: updated.assetOverrides || [] };
                fillAssetSelectors();
                renderAll();
            } catch (error) {
                setMessage("equipment-feedback", `Unable to sync equipment records from another tab: ${error.message}`, true);
            }
        });
        processDueAlerts();
        alertTimer = window.setInterval(processDueAlerts, 15000);
        window.addEventListener("pagehide", () => {
            if (alertTimer !== null) window.clearInterval(alertTimer);
            stopScanner();
        }, { once: true });
    }

    document.addEventListener("DOMContentLoaded", initialize, { once: true });
})();
