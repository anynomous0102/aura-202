// ===== CONFIG: GEMINI API =====
const GEMINI_API_KEY = "AIzaSyBMv18vmxxJkwGrBwTJUWzX7ta04S3UKus";
const GEMINI_MODEL_TEXT = "gemini-1.5-flash";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// ===== AI MODELS =====
const aiModels = {
    gemini: { name: "Gemini Pro" },
    Chatgpt: { name: "ChatGPT" },
    deepseek: { name: "DeepSeek" },
    claude: { name: "claude" }
};

// ===== LOGIN STATE =====
const USER_STORAGE_KEY = "app_user_logged_in";

function isUserLoggedIn() {
    return localStorage.getItem(USER_STORAGE_KEY) === "true";
}

function handleLoginOption(provider) {
    localStorage.setItem(USER_STORAGE_KEY, "true");
    console.log("Logged in via:", provider);
}

function logoutUser() {
    localStorage.removeItem(USER_STORAGE_KEY);
    window.location.reload();
}

// ===== MODALS =====
function showLoginStep(step) {
    const step1 = document.getElementById("login-step-1");
    const step2 = document.getElementById("login-step-2");
    if (step1) step1.classList.toggle("hidden", step !== 1);
    if (step2) step2.classList.toggle("hidden", step !== 2);
}

function closeLoginModal(event) {
    if (event) event.preventDefault();
    const overlay = document.getElementById("login-overlay");
    if (overlay) overlay.classList.add("hidden");
}

function closeCookieModal(choice) {
    localStorage.setItem("cookieConsent", choice);
    const overlay = document.getElementById("cookie-consent-overlay");
    if (overlay) overlay.classList.add("hidden");
}

// ===== SIDEBAR =====
function toggleSidebar() {
    document.getElementById("sidebar")?.classList.toggle("collapsed");
}

// ===== TYPEWRITER =====
function typewriter(element, text, speed = 15) {
    let i = 0;
    element.innerHTML = "";
    const cursor = document.createElement("span");
    cursor.className = "blinking-cursor";
    cursor.textContent = "▋";
    element.appendChild(cursor);

    (function type() {
        if (i < text.length) {
            element.insertBefore(document.createTextNode(text[i++]), cursor);
            setTimeout(type, speed);
        } else {
            cursor.remove();
        }
    })();
}

// ===== GEMINI CALL (BACKEND) =====
async function callGemini(prompt, aiName, options = {}) {
    const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            prompt,
            aiName,
            imageData: options.imageData || null
        })
    });

    if (!res.ok) throw new Error("Server error");
    const data = await res.json();
    return data.text;
}

// ===== RESULTS TABS =====
function setActiveTab(aiId) {
    document.querySelectorAll(".results-tab").forEach(tab =>
        tab.classList.toggle("active", tab.dataset.aiId === aiId)
    );
    document.querySelectorAll(".results-pane").forEach(pane =>
        pane.classList.toggle("active", pane.dataset.aiId === aiId)
    );
}

function createResultTab(aiId, aiName) {
    const tab = document.createElement("button");
    tab.className = "results-tab";
    tab.dataset.aiId = aiId;
    tab.textContent = aiName;
    tab.onclick = () => setActiveTab(aiId);
    document.getElementById("resultsTabs").appendChild(tab);
}

function createResultPane(aiId, aiName) {
    const pane = document.createElement("div");
    pane.className = "results-pane";
    pane.dataset.aiId = aiId;
    pane.innerHTML = `
        <div class="ai-result-card">
            <div class="ai-name">${aiName}</div>
            <div class="response-content"><em>Thinking...</em></div>
        </div>`;
    document.getElementById("resultsPaneContainer").appendChild(pane);
}

// ===== CORE PROMPT =====
async function submitPrompt() {
    const input = document.getElementById("promptInput");
    const prompt = input.value.trim();
    if (!prompt) return;

    document.body.classList.remove("initial-mode");

    const selected = [...document.querySelectorAll(".ai-checkbox input:checked")]
        .map(cb => cb.id);

    if (!selected.length) return;

    const tabs = document.getElementById("resultsTabs");
    const panes = document.getElementById("resultsPaneContainer");
    tabs.innerHTML = "";
    panes.innerHTML = "";

    selected.forEach(id => {
        createResultTab(id, aiModels[id].name);
        createResultPane(id, aiModels[id].name);
    });

    setActiveTab(selected[0]);

    for (const id of selected) {
        const pane = document.querySelector(
            `.results-pane[data-ai-id="${id}"] .response-content`
        );
        try {
            const text = await callGemini(prompt, aiModels[id].name);
            typewriter(pane, text);
        } catch {
            pane.textContent = "Error generating response.";
        }
    }

    input.value = "";
}

// ===== IMAGE UPLOAD =====
let attachedImage = null;

function handleImageFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
        attachedImage = {
            base64: reader.result.split(",")[1],
            mimeType: file.type
        };
        const preview = document.getElementById("imagePreview");
        preview.querySelector("img").src = reader.result;
        preview.classList.add("visible");
    };
    reader.readAsDataURL(file);
}

function clearAttachedImage() {
    attachedImage = null;
    document.getElementById("imagePreview").classList.remove("visible");
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {

    // Cookie consent
    if (!localStorage.getItem("cookieConsent")) {
        document.getElementById("cookie-consent-overlay")?.classList.remove("hidden");
    }

    // LOGIN POPUP ON LOAD
    if (!isUserLoggedIn()) {
        const overlay = document.getElementById("login-overlay");
        if (overlay) {
            overlay.classList.remove("hidden");
            showLoginStep(1);
        }
    }

    // STEP 1 ORB → STEP 2
    const orb = document.getElementById("loginHeroOrb");
    if (orb) {
        orb.addEventListener("click", () => showLoginStep(2));
        orb.addEventListener("keypress", e => {
            if (e.key === "Enter") showLoginStep(2);
        });
    }

    // LOGIN OPTIONS (WORKING, SAFE)
    document.querySelectorAll("#login-step-2 .modal-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const text = btn.textContent.toLowerCase();

            if (text.includes("google")) handleLoginOption("Google");
            else if (text.includes("microsoft")) handleLoginOption("Microsoft");
            else if (text.includes("github")) handleLoginOption("GitHub");
            else handleLoginOption("AURA");
        });
    });

    // AI MODEL CHECKBOXES
    const container = document.querySelector(".ai-selection-container");
    if (container) {
        Object.keys(aiModels).forEach(id => {
            const div = document.createElement("div");
            div.className = "ai-checkbox";
            div.innerHTML = `
                <input type="checkbox" id="${id}" checked>
                <label for="${id}">${aiModels[id].name}</label>`;
            container.appendChild(div);
        });
    }

    // ENTER TO SUBMIT
    document.getElementById("promptInput")?.addEventListener("keypress", e => {
        if (e.key === "Enter") submitPrompt();
    });

    // IMAGE UPLOAD
    document.getElementById("uploadImageBtn")?.addEventListener("click", () =>
        document.getElementById("imageInput").click()
    );
    document.getElementById("imageInput")?.addEventListener("change", e =>
        handleImageFile(e.target.files[0])
    );
    document.getElementById("removeImageBtn")?.addEventListener("click", clearAttachedImage);
});
