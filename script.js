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
    alert("Logged In Successfully!");
}

function logoutUser() {
    localStorage.removeItem(USER_STORAGE_KEY);
    window.location.reload();
}

function updateLoginUI() {
    const loginOrb = document.getElementById("loginOrb");
    if (!loginOrb) return;

    if (isUserLoggedIn()) {
        // If logged in, turn the orb Green
        loginOrb.classList.add("logged-in");
        loginOrb.title = "Log Out";
        loginOrb.style.background = "#4CAF50"; 
        loginOrb.style.boxShadow = "0 0 15px #4CAF50";
    } else {
        // If logged out, turn it back to normal
        loginOrb.classList.remove("logged-in");
        loginOrb.title = "Log In";
        loginOrb.style.background = ""; 
        loginOrb.style.boxShadow = "";
        
        // Force show modal if not logged in (Optional)
        // showLoginModal(); 
    }
}

// --- MODAL LOGIC ---
function showLoginModal() {
    // If user is logged in, clicking the orb asks to Logout
    if (isUserLoggedIn()) {
        if(confirm("You are currently logged in. Do you want to Log Out?")) {
            logoutUser();
        }
        return;
    }

    const overlay = document.getElementById('login-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        showLoginStep(1);
    } else {
        alert("Login Overlay HTML is missing from index.html");
    }
}

function closeLoginModal(event) {
    if (event) event.preventDefault();
    document.getElementById('login-overlay').classList.add('hidden');
}

function showLoginStep(step) {
    const s1 = document.getElementById('login-step-1');
    const s2 = document.getElementById('login-step-2');
    if(s1) s1.classList.toggle('hidden', step !== 1);
    if(s2) s2.classList.toggle('hidden', step !== 2);
}

// --- GEMINI CALL (Backend) ---
async function callGemini(prompt, aiName, options = {}) {
    const { imageData } = options;
    
    // Call your Vercel API
    const res = await fetch('/api/gemini', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, aiName, imageData })
    });

    if (!res.ok) {
        const errData = await res.json();
        let errMsg = errData.error;
        if (typeof errMsg === 'object') errMsg = JSON.stringify(errMsg);
        throw new Error(errMsg || "Server Error");
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

// --- SUBMIT ---
async function submitPrompt() {
    const input = document.getElementById("promptInput");
    if (!input.value.trim()) return;

    // Check login before allowing generation
    if (!isUserLoggedIn()) {
        alert("Please Log In first.");
        showLoginModal();
        return;
    }
    
    document.body.classList.remove("initial-mode");
    const submitBtn = document.getElementById("submitBtn");
    
    // UI Updates
    document.getElementById("header").classList.add("has-results");
    document.querySelector(".content-wrapper").classList.add("has-results");
    document.getElementById("resultsSection").style.display = "flex";
    
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
    // 1. Check Login State
    updateLoginUI();

    // 2. Setup AI Checkboxes
    const container = document.querySelector(".ai-selection-container");
    if (container) {
        Object.keys(aiModels).forEach(id => {
            const div = document.createElement("div");
            div.className = "ai-checkbox";
            div.innerHTML = `<input type="checkbox" id="${id}" checked><label for="${id}">${aiModels[id].name}</label>`;
            container.appendChild(div);
        });
    }

    // 3. Setup Listeners
    document.getElementById("promptInput")?.addEventListener("keypress", (e) => { if (e.key === "Enter") submitPrompt(); });
    
    // Login Orb Click
    const loginOrb = document.getElementById("loginOrb");
    if(loginOrb) loginOrb.addEventListener("click", showLoginModal);

    // Step 1 Orb Click
    const heroOrb = document.getElementById("loginHeroOrb");
    if(heroOrb) heroOrb.addEventListener("click", () => showLoginStep(2));
    
    // Step 2 Button Click
    const step2Btn = document.querySelector("#login-step-2 button");
    if(step2Btn) step2Btn.addEventListener("click", (e) => {
        e.preventDefault();
        loginUser();
    });

    // Image Upload
    const imgInput = document.getElementById("imageInput");
    if(imgInput) {
        imgInput.addEventListener("change", () => {
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
    }
    document.getElementById("uploadImageBtn")?.addEventListener("click", () => imgInput.click());
    document.getElementById("removeImageBtn")?.addEventListener("click", () => {
        attachedImage = null;
        imgInput.value = "";
        document.getElementById("imagePreview").classList.remove("visible");
    });
    
    // Menu Toggles
    document.getElementById("attachmentBtn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        document.getElementById("upload-menu").classList.toggle("hidden");
    });
    window.addEventListener("click", () => document.getElementById("upload-menu")?.classList.add("hidden"));
    
    // Initial Hero Orb
    document.getElementById("auraOrb")?.addEventListener("click", () => {
        document.body.classList.remove("initial-mode");
        document.getElementById("promptInput").focus();
    });
});
