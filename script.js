// ===== CONFIG: GEMINI API =====
// 1. Get a new key here: https://aistudio.google.com/
// 2. Paste it below inside the quotes.
const GEMINI_API_KEY = "INSERT_YOUR_NEW_KEY_HERE"; 

// Note: "gemini-1.5-flash" is the current standard stable version.
const GEMINI_MODEL_TEXT = "gemini-1.5-flash"; 
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Logical AIs, all powered by Gemini
const aiModels = {
    gemini:   { name: "Gemini Pro" },
    Chatgpt:  { name: "ChatGPT" },
    deepseek: { name: "DeepSeek" },
    claude: { name: "claude" }
};

let attachedImage = null; // { base64, mimeType }
const USER_STORAGE_KEY = "app_user_logged_in";

// --- AUTHENTICATION LOGIC (SIMULATED) ---
function isUserLoggedIn() {
    return localStorage.getItem(USER_STORAGE_KEY) === "true";
}

function loginUser() {
    localStorage.setItem(USER_STORAGE_KEY, "true");
    updateLoginUI();
    closeLoginModal();
    // Optional: Greeting
    const notification = document.createElement("div");
    notification.textContent = "Welcome back!";
    notification.style.cssText = "position:fixed; top:20px; right:20px; background:#4CAF50; color:white; padding:10px 20px; border-radius:5px; z-index:10000; animation: fadeOut 3s forwards;";
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function logoutUser() {
    localStorage.removeItem(USER_STORAGE_KEY);
    updateLoginUI();
    window.location.reload(); // Refresh to reset state
}

function updateLoginUI() {
    const loginOrb = document.getElementById("loginOrb");
    if (!loginOrb) return;

    if (isUserLoggedIn()) {
        loginOrb.classList.add("logged-in");
        loginOrb.title = "Click to Log Out";
        // You can change the innerHTML here to show an avatar if you want
        // loginOrb.innerHTML = '<img src="avatar.png" />'; 
    } else {
        loginOrb.classList.remove("logged-in");
        loginOrb.title = "Log In";
    }
}

// --- MODAL LOGIC ---
function showLoginStep(step) {
    const step1 = document.getElementById('login-step-1');
    const step2 = document.getElementById('login-step-2');
    if (step1) step1.classList.toggle('hidden', step !== 1);
    if (step2) step2.classList.toggle('hidden', step !== 2);
}

function showLoginModal() {
    // If already logged in, show logout confirmation instead of modal
    if (isUserLoggedIn()) {
        if (confirm("You are already logged in. Do you want to log out?")) {
            logoutUser();
        }
        return;
    }

    const overlay = document.getElementById('login-overlay');
    if(overlay) {
        overlay.classList.remove('hidden');
        showLoginStep(1);
    }
}

function closeLoginModal(event) {
    if (event) event.preventDefault();
    document.getElementById('login-overlay').classList.add('hidden');
}

function closeCookieModal(choice) {
    localStorage.setItem('cookieConsent', choice);
    document.getElementById('cookie-consent-overlay').classList.add('hidden');
    // If they accept cookies, maybe show login, or just let them use the app
    // showLoginModal(); // Optional: Auto-open login after cookie consent
}

// --- SIDEBAR & MENU LOGIC ---
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
}
function toggleUploadMenu() {
    document.getElementById('upload-menu').classList.toggle('hidden');
}

// --- TYPEWRITER ---
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

// --- GEMINI CALL (TEXT ONLY) ---
// --- GEMINI CALL (SECURE MODE) ---
async function callGemini(prompt, aiName, options = {}) {
    const { imageData } = options;

    // We send the data to YOUR OWN backend (/api/gemini)
    // The backend handles the API Key, so it's safe.
    
    const body = {
        prompt: prompt,
        aiName: aiName,
        imageData: imageData
    };

    const res = await fetch('/api/gemini', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        const errData = await res.json();
        const errMsg = errData.error || "Unknown Error";
        throw new Error(`Server Error: ${errMsg}`);
    }

    const data = await res.json();
    return data.text;
}
// --- TABS ---
function setActiveTab(aiId) {
    document.querySelectorAll(".results-tab").forEach(tab => {
        tab.classList.toggle("active", tab.dataset.aiId === aiId);
    });
    document.querySelectorAll(".results-pane").forEach(pane => {
        pane.classList.toggle("active", pane.dataset.aiId === aiId);
    });
}

function createResultTab(aiId, aiName) {
    const tabsContainer = document.getElementById("resultsTabs");
    const tab = document.createElement("button");
    tab.className = "results-tab";
    tab.dataset.aiId = aiId;
    tab.textContent = aiName;
    tab.addEventListener("click", () => setActiveTab(aiId));
    tabsContainer.appendChild(tab);
}

function createResultPane(aiId, aiName) {
    const paneContainer = document.getElementById("resultsPaneContainer");
    const pane = document.createElement("div");
    pane.className = "results-pane";
    pane.dataset.aiId = aiId;
    pane.innerHTML = `
        <div class="ai-result-card">
            <div class="ai-name">${aiName}</div>
            <div class="response-content"><em>Thinking...</em></div>
        </div>
    `;
    paneContainer.appendChild(pane);
    return pane;
}

// --- CORE APP LOGIC ---
async function submitPrompt() {
    const input = document.getElementById("promptInput");
    const prompt = input.value;
    if (!prompt.trim()) return;

    activateApp();

    const submitBtn = document.getElementById("submitBtn");
    const resultsSection = document.getElementById("resultsSection");
    const header = document.getElementById("header");
    const contentWrapper = document.querySelector(".content-wrapper");

    const selectedAIs = Array.from(
        document.querySelectorAll(".ai-checkbox input:checked")
    ).map(cb => cb.id);

    const tabs = document.getElementById("resultsTabs");
    const paneContainer = document.getElementById("resultsPaneContainer");

    if (selectedAIs.length === 0) {
        tabs.innerHTML = "";
        paneContainer.innerHTML = "<p style='text-align:center;'>Please select at least one AI model.</p>";
        return;
    }

    tabs.innerHTML = "";
    paneContainer.innerHTML = "";
    header.classList.add("has-results");
    contentWrapper.classList.add("has-results");
    resultsSection.style.display = "flex";

    submitBtn.disabled = true;

    const imageData = attachedImage;

    selectedAIs.forEach(id => {
        const ai = aiModels[id];
        if (!ai) return;
        createResultTab(id, ai.name);
        createResultPane(id, ai.name);
    });

    setActiveTab(selectedAIs[0]);

    await Promise.all(
        selectedAIs.map(async (id) => {
            const ai = aiModels[id];
            if (!ai) return;
            const pane = document.querySelector(
                `.results-pane[data-ai-id="${id}"] .response-content`
            );
            try {
                const text = await callGemini(prompt, ai.name, { imageData });
                typewriter(pane, text);
            } catch (err) {
                pane.innerHTML = `<span style="color:red;">${err.message}</span>`;
            }
        })
    );

    submitBtn.disabled = false;
    input.value = "";
}

// --- IMAGE UPLOAD ---
function handleImageFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
        const dataUrl = reader.result;
        const base64 = dataUrl.split(",")[1];
        attachedImage = {
            base64,
            mimeType: file.type || "image/png"
        };

        const preview = document.getElementById("imagePreview");
        const img = preview.querySelector("img");
        img.src = dataUrl;
        preview.classList.add("visible");
    };
    reader.readAsDataURL(file);
}
function clearAttachedImage() {
    attachedImage = null;
    const imageInput = document.getElementById("imageInput");
    imageInput.value = "";
    const preview = document.getElementById("imagePreview");
    preview.classList.remove("visible");
}

// --- HERO ORB & GREETING ---
function setGreetingByTime() {
    const span = document.getElementById("greetingText");
    if (!span) return;
    const hour = new Date().getHours();
    let text = "Good Evening";
    if (hour < 12) text = "Good Morning";
    else if (hour < 17) text = "Good Afternoon";
    span.textContent = text;
}

function activateApp() {
    document.body.classList.remove("initial-mode");
    const input = document.getElementById("promptInput");
    if (input) input.focus();
}

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    setGreetingByTime();
    updateLoginUI(); // Check initial state

    // Cookie Consent
    if (!localStorage.getItem("cookieConsent")) {
        const cookieOverlay = document.getElementById("cookie-consent-overlay");
        if(cookieOverlay) cookieOverlay.classList.remove("hidden");
    }

    // AI Checkboxes
    const container = document.querySelector(".ai-selection-container");
    if(container) {
        Object.keys(aiModels).forEach(id => {
            const model = aiModels[id];
            const div = document.createElement("div");
            div.className = "ai-checkbox";
            div.innerHTML = `
                <input type="checkbox" id="${id}" checked>
                <label for="${id}">${model.name}</label>
            `;
            container.appendChild(div);
        });
    }

    // Input Handling
    const promptInput = document.getElementById("promptInput");
    if(promptInput) {
        promptInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") submitPrompt();
        });
    }

    // Attachment Menu
    const attachmentBtn = document.getElementById("attachmentBtn");
    const uploadMenu = document.getElementById("upload-menu");
    if (attachmentBtn && uploadMenu) {
        attachmentBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleUploadMenu();
        });
        uploadMenu.addEventListener("click", (event) => {
            event.stopPropagation();
        });
        window.addEventListener("click", () => {
            if (!uploadMenu.classList.contains("hidden")) {
                uploadMenu.classList.add("hidden");
            }
        });
    }

    // Image Upload Buttons
    const uploadImageBtn = document.getElementById("uploadImageBtn");
    const imageInput = document.getElementById("imageInput");
    const removeImageBtn = document.getElementById("removeImageBtn");

    if (uploadImageBtn && imageInput) {
        uploadImageBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            imageInput.click();
        });
    }
    if (imageInput) {
        imageInput.addEventListener("change", () => {
            const file = imageInput.files[0];
            if (file) handleImageFile(file);
        });
    }
    if (removeImageBtn) {
        removeImageBtn.addEventListener("click", () => {
            clearAttachedImage();
        });
    }

    // Hero Orb (Click to Activate)
    const auraOrb = document.getElementById("auraOrb");
    if (auraOrb) {
        const triggerHero = (e) => {
            if (e.type === "click" || e.key === "Enter" || e.key === " ") {
                if (e.type === "keypress") e.preventDefault();
                activateApp();
            }
        };
        auraOrb.addEventListener("click", triggerHero);
        auraOrb.addEventListener("keypress", triggerHero);
    }

    // Login Orb (Top Right or Input Bar)
    const loginOrb = document.getElementById("loginOrb");
    if (loginOrb) {
        loginOrb.addEventListener("click", showLoginModal);
    }

    // Login Modal: Step 1 -> Step 2 Orb
    const loginHeroOrb = document.getElementById("loginHeroOrb");
    if (loginHeroOrb) {
        const triggerModalOrb = (e) => {
            if (e.type === "click" || e.key === "Enter" || e.key === " ") {
                if (e.type === "keypress") e.preventDefault();
                showLoginStep(2);
            }
        };
        loginHeroOrb.addEventListener("click", triggerModalOrb);
        loginHeroOrb.addEventListener("keypress", triggerModalOrb);
    }

    // Login Modal: Final Submit Logic
    // Try to find a specific button ID, or fallback to any button in Step 2
    const loginSubmitBtn = document.getElementById("loginSubmitBtn") || document.querySelector("#login-step-2 button");
    if (loginSubmitBtn) {
        loginSubmitBtn.addEventListener("click", (e) => {
            e.preventDefault();
            // You can add validation here (e.g., check if email input is empty)
            const emailInput = document.querySelector("#login-step-2 input[type='email']");
            if (emailInput && !emailInput.value) {
                alert("Please enter an email address.");
                return;
            }
            loginUser();
        });
    }
});
