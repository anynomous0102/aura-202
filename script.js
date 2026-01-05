// ===== CONFIG =====
const aiModels = {
    gemini:   { name: "Gemini Pro" },
    Chatgpt:  { name: "ChatGPT" },
    deepseek: { name: "DeepSeek" },
    claude: { name: "claude" }
};

let attachedImage = null; 
const USER_STORAGE_KEY = "app_user_logged_in";

// --- AUTH LOGIC ---
function isUserLoggedIn() {
    return localStorage.getItem(USER_STORAGE_KEY) === "true";
}

function loginUser() {
    localStorage.setItem(USER_STORAGE_KEY, "true");
    updateLoginUI();
    closeLoginModal();
}

function logoutUser() {
    // Clear the storage and reload to reset the view
    localStorage.removeItem(USER_STORAGE_KEY);
    window.location.reload();
}

function updateLoginUI() {
    const loginOrb = document.getElementById("loginOrb");
    if (!loginOrb) return;

    if (isUserLoggedIn()) {
        loginOrb.classList.add("logged-in");
        loginOrb.title = "Log Out";
        // Visual indicator that user is logged in
        loginOrb.style.boxShadow = "0 0 15px #4CAF50"; 
        loginOrb.style.border = "2px solid #4CAF50";
    } else {
        loginOrb.classList.remove("logged-in");
        loginOrb.title = "Log In";
        loginOrb.style.boxShadow = "";
        loginOrb.style.border = "";
    }
}

// --- MODAL LOGIC ---
function showLoginModal() {
    // If logged in, clicking the orb logs you out
    if (isUserLoggedIn()) {
        if(confirm("You are already logged in. Log out?")) {
            logoutUser();
        }
        return;
    }

    const overlay = document.getElementById('login-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        // Reset to step 1 every time we open it
        document.getElementById('login-step-1').classList.remove('hidden');
        document.getElementById('login-step-2').classList.add('hidden');
    } else {
        console.error("Login Overlay ID not found in HTML");
        alert("Error: Login HTML missing");
    }
}

function closeLoginModal(event) {
    if (event) event.preventDefault();
    const overlay = document.getElementById('login-overlay');
    if (overlay) overlay.classList.add('hidden');
}

function showLoginStep(step) {
    document.getElementById('login-step-1').classList.toggle('hidden', step !== 1);
    document.getElementById('login-step-2').classList.toggle('hidden', step !== 2);
}

// --- GEMINI CALL (Backend Proxy) ---
async function callGemini(prompt, aiName, options = {}) {
    const { imageData } = options;
    const body = { prompt, aiName, imageData };

    const res = await fetch('/api/gemini', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        const errData = await res.json();
        // Parse the error clearly
        let msg = errData.error;
        if(typeof msg === 'object') msg = JSON.stringify(msg);
        throw new Error(msg || "Server Error");
    }

    const data = await res.json();
    return data.text;
}

// --- UI HELPERS ---
function typewriter(element, text, speed = 15) {
    let i = 0;
    element.innerHTML = "";
    const cursor = document.createElement('span');
    cursor.className = 'blinking-cursor';
    cursor.innerHTML = '▋';
    element.appendChild(cursor);
    function type() {
        if (i < text.length) {
            element.insertBefore(document.createTextNode(text.charAt(i)), cursor);
            i++;
            setTimeout(type, speed);
        } else {
            cursor.style.display = 'none';
        }
    }
    type();
}

function setActiveTab(aiId) {
    document.querySelectorAll(".results-tab").forEach(tab => tab.classList.toggle("active", tab.dataset.aiId === aiId));
    document.querySelectorAll(".results-pane").forEach(pane => pane.classList.toggle("active", pane.dataset.aiId === aiId));
}

function createResultTab(aiId, aiName) {
    const tabs = document.getElementById("resultsTabs");
    const tab = document.createElement("button");
    tab.className = "results-tab";
    tab.dataset.aiId = aiId;
    tab.textContent = aiName;
    tab.onclick = () => setActiveTab(aiId);
    tabs.appendChild(tab);
}

function createResultPane(aiId, aiName) {
    const container = document.getElementById("resultsPaneContainer");
    const pane = document.createElement("div");
    pane.className = "results-pane";
    pane.dataset.aiId = aiId;
    pane.innerHTML = `<div class="ai-result-card"><div class="ai-name">${aiName}</div><div class="response-content"><em>Thinking...</em></div></div>`;
    container.appendChild(pane);
}

// --- MAIN SUBMIT ---
async function submitPrompt() {
    const input = document.getElementById("promptInput");
    if (!input.value.trim()) return;
    
    document.body.classList.remove("initial-mode");
    const submitBtn = document.getElementById("submitBtn");
    const resultsSection = document.getElementById("resultsSection");
    
    // UI Updates
    document.getElementById("header").classList.add("has-results");
    document.querySelector(".content-wrapper").classList.add("has-results");
    resultsSection.style.display = "flex";
    
    // Get Selected AIs
    const selectedAIs = Array.from(document.querySelectorAll(".ai-checkbox input:checked")).map(cb => cb.id);
    const tabs = document.getElementById("resultsTabs");
    const panes = document.getElementById("resultsPaneContainer");
    
    if (selectedAIs.length === 0) {
        panes.innerHTML = "<p style='text-align:center'>Please select an AI.</p>";
        return;
    }

    tabs.innerHTML = "";
    panes.innerHTML = "";
    submitBtn.disabled = true;

    selectedAIs.forEach(id => {
        createResultTab(id, aiModels[id].name);
        createResultPane(id, aiModels[id].name);
    });
    setActiveTab(selectedAIs[0]);

    await Promise.all(selectedAIs.map(async (id) => {
        const pane = document.querySelector(`.results-pane[data-ai-id="${id}"] .response-content`);
        try {
            const text = await callGemini(input.value, aiModels[id].name, { imageData: attachedImage });
            typewriter(pane, text);
        } catch (err) {
            pane.innerHTML = `<span style="color:red">Error: ${err.message}</span>`;
        }
    }));

    submitBtn.disabled = false;
    input.value = "";
}

// --- INIT ---
document.addEventListener("DOMContentLoaded", () => {
    updateLoginUI();

    // Check for cookie consent first
    if (!localStorage.getItem("cookieConsent")) {
        const cookie = document.getElementById("cookie-consent-overlay");
        if(cookie) cookie.classList.remove("hidden");
    } else {
        // If not logged in, show login modal (Optional: Remove this if you don't want auto-popup)
        if (!isUserLoggedIn()) showLoginModal();
    }

    // AI Checkboxes
    const container = document.querySelector(".ai-selection-container");
    if (container) {
        Object.keys(aiModels).forEach(id => {
            const div = document.createElement("div");
            div.className = "ai-checkbox";
            div.innerHTML = `<input type="checkbox" id="${id}" checked><label for="${id}">${aiModels[id].name}</label>`;
            container.appendChild(div);
        });
    }

    // Event Listeners
    document.getElementById("promptInput")?.addEventListener("keypress", (e) => { if (e.key === "Enter") submitPrompt(); });
    document.getElementById("loginOrb")?.addEventListener("click", showLoginModal);
    
    // Login Modal Steps
    document.getElementById("loginHeroOrb")?.addEventListener("click", () => showLoginStep(2));
    
    // Login Submit
    const loginBtn = document.querySelector("#login-step-2 button");
    if(loginBtn) loginBtn.addEventListener("click", (e) => { e.preventDefault(); loginUser(); });

    // File Uploads
    const imgInput = document.getElementById("imageInput");
    if(imgInput) imgInput.addEventListener("change", () => {
        const file = imgInput.files[0];
        if(file) {
            const reader = new FileReader();
            reader.onload = () => {
                attachedImage = { base64: reader.result.split(",")[1], mimeType: file.type };
                document.getElementById("imagePreview").querySelector("img").src = reader.result;
                document.getElementById("imagePreview").classList.add("visible");
            };
            reader.readAsDataURL(file);
        }
    });

    document.getElementById("uploadImageBtn")?.addEventListener("click", () => imgInput.click());
    document.getElementById("removeImageBtn")?.addEventListener("click", () => {
        attachedImage = null;
        imgInput.value = "";
        document.getElementById("imagePreview").classList.remove("visible");
    });
    
    // Menu
    document.getElementById("attachmentBtn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        document.getElementById("upload-menu").classList.toggle("hidden");
    });
    window.addEventListener("click", () => document.getElementById("upload-menu")?.classList.add("hidden"));
    
    // Hero Click
    document.getElementById("auraOrb")?.addEventListener("click", () => {
        document.body.classList.remove("initial-mode");
        document.getElementById("promptInput").focus();
    });
});
