(() => {
    "use strict";

    const STORAGE_KEY = "lumko-staff-chat-local-preview-v1";
    const CHANNELS = {
        network: {
            label: "Network & IT",
            shortcuts: [
                ["Wi-Fi connectivity", "Network issue: Wi-Fi connectivity\nArea / access point:\nAffected device:\nWhat is happening:\nStarted at:"],
                ["Wired network port", "Network issue: wired port\nBuilding / floor / room:\nPort label (if visible):\nAffected device:\nWhat is happening:"],
                ["Workstation connection", "Network issue: workstation connection\nBuilding / floor / room:\nWorkstation asset tag:\nWhat is unavailable:\nStarted at:"],
                ["Lab equipment connectivity", "Network question for lab equipment\nBuilding / floor / room:\nEquipment asset tag:\nConnected workstation / service affected:\nObserved network symptom:"]
            ]
        },
        research: {
            label: "Research & Equipment",
            shortcuts: [
                ["MRI scanner workflow", "Research equipment issue: MRI scanner\nBuilding / floor / room:\nEquipment asset tag:\nWorkflow stage:\nObserved equipment symptom:"],
                ["Tissue slide scanner", "Research equipment issue: tissue slide scanner\nBuilding / floor / room:\nEquipment asset tag:\nWorkflow stage:\nObserved equipment symptom:"],
                ["Centrifuge run", "Research equipment update: centrifuge run\nBuilding / floor / room:\nEquipment asset tag:\nRun status / expected finish:\nAssistance needed:"],
                ["Equipment maintenance", "Research equipment maintenance\nBuilding / floor / room:\nEquipment asset tag:\nService / calibration concern:\nAvailability impact:"]
            ]
        }
    };
    const locations = new Set([
        "Main Building · Floor 1",
        "Main Building · Floor 2",
        "Main Building · Floor 3",
        "Laboratory Building · Floor 1",
        "Laboratory Building · Floor 2",
        "Laboratory Building · Floor 3",
        "Laboratory Building · Floor 4",
        "Laboratory Building · Floor 5"
    ]);
    let messages = [];
    let storageProblem = "";

    function isValidMessage(message) {
        return message && typeof message.id === "string" &&
            Number.isFinite(Date.parse(message.sentAt)) &&
            Object.hasOwn(CHANNELS, message.channel) &&
            locations.has(message.location) &&
            typeof message.text === "string" && message.text.length > 0 && message.text.length <= 500;
    }

    function readMessages() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === null) {
            localStorage.setItem(STORAGE_KEY, "[]");
            return [];
        }
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed) || !parsed.every(isValidMessage)) {
            throw new Error("Saved chat messages have an invalid format.");
        }
        return parsed;
    }

    function showFeedback(message, isError = false) {
        const feedback = document.getElementById("chat-feedback");
        feedback.textContent = message;
        feedback.classList.toggle("error", isError);
        feedback.classList.toggle("success", Boolean(message) && !isError);
    }

    function renderShortcuts() {
        const channel = document.getElementById("chat-channel").value;
        const definition = CHANNELS[channel];
        document.getElementById("chat-shortcuts-title").textContent = `${definition.label} quick messages`;
        const container = document.getElementById("chat-shortcuts");
        container.replaceChildren(...definition.shortcuts.map(([label, template]) => {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = label;
            button.dataset.template = template;
            container.append(button);
            return button;
        }));
        renderMessages();
    }

    function renderMessages() {
        const channel = document.getElementById("chat-channel").value;
        const thread = document.getElementById("chat-thread");
        const visible = messages.filter(message => message.channel === channel);
        thread.replaceChildren();
        if (visible.length === 0) {
            const empty = document.createElement("p");
            empty.className = "chat-empty";
            empty.textContent = `No ${CHANNELS[channel].label} messages are saved in this browser yet.`;
            thread.append(empty);
            return;
        }
        visible.slice(-100).forEach(message => {
            const bubble = document.createElement("article");
            bubble.className = "chat-message";
            const metadata = document.createElement("div");
            metadata.className = "chat-message-meta";
            const location = document.createElement("span");
            location.textContent = message.location;
            const sentAt = document.createElement("time");
            sentAt.dateTime = message.sentAt;
            const date = new Date(message.sentAt);
            sentAt.textContent = Number.isNaN(date.getTime())
                ? "Time unavailable"
                : new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" }).format(date);
            metadata.append(location, sentAt);
            const text = document.createElement("p");
            text.className = "chat-message-text";
            text.textContent = message.text;
            bubble.append(metadata, text);
            thread.append(bubble);
        });
        thread.scrollTop = thread.scrollHeight;
    }

    function updateCharacterCount() {
        const length = document.getElementById("chat-message-input").value.length;
        document.getElementById("chat-character-count").textContent = `${length} / 500 characters`;
    }

    function sendMessage(event) {
        event.preventDefault();
        if (storageProblem) {
            showFeedback(storageProblem, true);
            return;
        }
        const channel = document.getElementById("chat-channel").value;
        const location = document.getElementById("chat-location").value;
        const input = document.getElementById("chat-message-input");
        const text = input.value.trim();
        if (!Object.hasOwn(CHANNELS, channel) || !locations.has(location) || !text || text.length > 500) {
            showFeedback("Choose a valid channel and location, then enter a message of 1–500 characters.", true);
            return;
        }
        const message = {
            id: crypto.randomUUID(),
            channel,
            location,
            text,
            sentAt: new Date().toISOString()
        };
        const nextMessages = [...messages, message].slice(-300);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(nextMessages));
            messages = nextMessages;
            input.value = "";
            updateCharacterCount();
            renderMessages();
            showFeedback("Preview message saved in this browser only; it has not been sent to other staff.");
        } catch (error) {
            showFeedback(`Unable to save chat message in this browser: ${error.message}`, true);
        }
    }

    function useShortcut(event) {
        const button = event.target.closest("[data-template]");
        if (!button) return;
        const input = document.getElementById("chat-message-input");
        input.value = button.dataset.template;
        updateCharacterCount();
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
    }

    function clearLocalMessages() {
        if (!window.confirm("Clear all chat preview messages saved in this browser? This cannot be undone.")) return;
        try {
            localStorage.setItem(STORAGE_KEY, "[]");
            messages = [];
            renderMessages();
            showFeedback("Chat preview messages cleared from this browser.");
        } catch (error) {
            showFeedback(`Unable to clear chat messages: ${error.message}`, true);
        }
    }

    function initialize() {
        try {
            messages = readMessages();
        } catch (error) {
            storageProblem = `Chat history is read-only because local storage could not be read: ${error.message}`;
            showFeedback(storageProblem, true);
            document.querySelector("#chat-compose-form button[type='submit']").disabled = true;
            document.getElementById("chat-clear-local").disabled = true;
        }
        renderShortcuts();
        updateCharacterCount();
        document.getElementById("chat-channel").addEventListener("change", renderShortcuts);
        document.getElementById("chat-shortcuts").addEventListener("click", useShortcut);
        document.getElementById("chat-compose-form").addEventListener("submit", sendMessage);
        document.getElementById("chat-message-input").addEventListener("input", updateCharacterCount);
        document.getElementById("chat-message-input").addEventListener("keydown", event => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                document.getElementById("chat-compose-form").requestSubmit();
            }
        });
        document.getElementById("chat-clear-local").addEventListener("click", clearLocalMessages);
        window.addEventListener("storage", event => {
            if (event.key !== STORAGE_KEY || event.newValue === null) return;
            try {
                const updated = JSON.parse(event.newValue);
                if (!Array.isArray(updated) || !updated.every(isValidMessage)) {
                    throw new Error("Updated chat messages have an invalid format.");
                }
                messages = updated;
                renderMessages();
            } catch (error) {
                showFeedback(`Unable to sync chat preview from another tab: ${error.message}`, true);
            }
        });
    }

    document.addEventListener("DOMContentLoaded", initialize, { once: true });
})();
