// ==========================================================
// EduTutor AI - Advanced Interactive Client Logic & Themes
// ==========================================================

let conversationHistory = [];
let isGenerating = false;
let currentMode = "default";
let currentLevel = "balanced";
let recognition = null;
let isRecording = false;

// Audio / Speech Synthesis State
let currentlySpeakingBtn = null;
let currentUtterance = null;
let systemVoices = [];

// DOM Elements
const chatViewport = document.getElementById("chat-viewport");
const messagesWrapper = document.getElementById("messages-wrapper");
const welcomeScreen = document.getElementById("welcome-screen");
const typingIndicator = document.getElementById("typing-indicator");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const voiceBtn = document.getElementById("voice-btn");
const clearHistoryBtn = document.getElementById("clear-history-btn");
const exportChatBtn = document.getElementById("export-chat-btn");
const newChatBtn = document.getElementById("new-chat-btn");
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const sidebar = document.getElementById("sidebar");
const statusPill = document.getElementById("status-pill");
const themeBtn = document.getElementById("theme-btn");
const themeMenu = document.getElementById("theme-menu");
const themeNameDisplay = document.getElementById("theme-name-display");

// Theme Names Mapping
const THEME_NAMES = {
    cyber: "Midnight Cyber",
    onyx: "Onyx Emerald",
    synthwave: "Synthwave",
    ocean: "Ocean Glacier",
    light: "Daylight Clean"
};

// Initialize system voices
function loadVoices() {
    if ('speechSynthesis' in window) {
        systemVoices = window.speechSynthesis.getVoices() || [];
    }
}
loadVoices();
if ('speechSynthesis' in window && window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
}

// Configure Marked.js with custom code block renderer & Highlight.js
marked.setOptions({
    highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(code, { language: lang }).value;
            } catch (err) {
                console.error(err);
            }
        }
        return hljs.highlightAuto(code).value;
    },
    breaks: true,
    gfm: true
});

// Custom renderer for code blocks to add header and copy button
const renderer = new marked.Renderer();
renderer.code = function(code, language) {
    const validLang = language || 'code';
    return `
    <div class="code-block-container">
        <div class="code-header">
            <span>${validLang}</span>
            <button type="button" class="copy-code-btn" title="Copy code snippet">Copy Code</button>
        </div>
        <pre><code class="hljs ${validLang}">${code}</code></pre>
    </div>`;
};
marked.use({ renderer });

// Robust clipboard copy with fallback
async function copyTextToClipboard(text) {
    if (!text) return false;
    
    // Modern Clipboard API
    if (navigator.clipboard) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (e) {
            console.warn("navigator.clipboard error, using fallback:", e);
        }
    }

    // Fallback for non-https or restricted environments
    try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.top = "-9999px";
        textArea.style.left = "-9999px";
        textArea.setAttribute("readonly", "");
        document.body.appendChild(textArea);
        textArea.select();
        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);
        return successful;
    } catch (err) {
        console.error("Fallback clipboard copy failed:", err);
        return false;
    }
}

// Show temporary Toast Notification
function showToast(message) {
    const existing = document.querySelector(".toast-notice");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "toast-notice";
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast && toast.parentNode) {
            toast.remove();
        }
    }, 3000);
}

// Stop any active speech cleanly
function stopSpeech() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    if (currentlySpeakingBtn) {
        currentlySpeakingBtn.classList.remove("speaking");
        currentlySpeakingBtn.innerHTML = `🔊 Read Aloud`;
        currentlySpeakingBtn = null;
    }
    currentUtterance = null;
}

// Extract clean, natural plain text directly from the rendered bubble DOM
function extractSpeechText(bubbleElement) {
    if (!bubbleElement) return "";
    
    const clone = bubbleElement.cloneNode(true);
    
    // Strip out all code blocks, tables, and nested UI buttons
    clone.querySelectorAll("pre, code, table, .code-block-container, button, .message-actions, .follow-up-group").forEach(el => el.remove());
    
    let text = clone.innerText || clone.textContent || "";
    
    // Clean remaining artifacts and emoji noise
    text = text
        .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, " ")
        .replace(/[-—_]{2,}/g, " ")
        .replace(/https?:\/\/\S+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
        
    return text;
}

// Text-to-Speech (Read Aloud) Handler
function toggleReadAloud(button, bubbleElement) {
    if (!('speechSynthesis' in window)) {
        showToast("Speech synthesis is not supported in this browser.");
        return;
    }

    // If currently speaking this exact button, stop
    if (window.speechSynthesis.speaking && currentlySpeakingBtn === button) {
        stopSpeech();
        return;
    }

    // Cancel any previous speech playback
    stopSpeech();

    const speechText = extractSpeechText(bubbleElement);
    if (!speechText) {
        showToast("No readable text found.");
        return;
    }

    currentUtterance = new SpeechSynthesisUtterance(speechText);
    currentUtterance.rate = 1.0;
    currentUtterance.pitch = 1.0;

    // Pick natural English voice if available
    if (systemVoices.length === 0) {
        loadVoices();
    }
    const preferredVoice = systemVoices.find(v => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Jenny") || v.name.includes("David") || v.name.includes("Zira")))
        || systemVoices.find(v => v.lang.startsWith("en"))
        || systemVoices[0];

    if (preferredVoice) {
        currentUtterance.voice = preferredVoice;
    }

    currentlySpeakingBtn = button;
    button.classList.add("speaking");
    button.innerHTML = `⏹️ Stop`;

    currentUtterance.onend = () => {
        stopSpeech();
    };

    currentUtterance.onerror = (e) => {
        console.warn("Speech synthesis error/interruption:", e);
        stopSpeech();
    };

    window.speechSynthesis.speak(currentUtterance);
}

// Global Event Delegation for Dynamic Buttons inside Messages
messagesWrapper.addEventListener("click", async (e) => {
    // 1. Copy Code Button
    const copyCodeBtn = e.target.closest(".copy-code-btn");
    if (copyCodeBtn) {
        e.preventDefault();
        const codeContainer = copyCodeBtn.closest(".code-block-container");
        const codeElement = codeContainer ? codeContainer.querySelector("code") : null;
        if (codeElement) {
            const textToCopy = codeElement.innerText || codeElement.textContent;
            const ok = await copyTextToClipboard(textToCopy);
            if (ok) {
                const prev = copyCodeBtn.textContent;
                copyCodeBtn.textContent = "Copied! ✓";
                copyCodeBtn.style.color = "var(--primary)";
                setTimeout(() => {
                    copyCodeBtn.textContent = prev;
                    copyCodeBtn.style.color = "";
                }, 2000);
            } else {
                showToast("Failed to copy code.");
            }
        }
        return;
    }

    // 2. Copy Full Message Button
    const copyMsgBtn = e.target.closest(".copy-msg-btn");
    if (copyMsgBtn) {
        e.preventDefault();
        const bodyContainer = copyMsgBtn.closest(".message-body-container");
        const bubble = bodyContainer ? bodyContainer.querySelector(".message-bubble") : null;
        const textToCopy = (bodyContainer && bodyContainer.dataset.raw) ? bodyContainer.dataset.raw : (bubble ? (bubble.innerText || bubble.textContent) : "");
        
        const ok = await copyTextToClipboard(textToCopy);
        if (ok) {
            const prev = copyMsgBtn.innerHTML;
            copyMsgBtn.innerHTML = `<span>Copied! ✓</span>`;
            copyMsgBtn.style.color = "var(--primary)";
            setTimeout(() => {
                copyMsgBtn.innerHTML = prev;
                copyMsgBtn.style.color = "";
            }, 2000);
        } else {
            showToast("Failed to copy message.");
        }
        return;
    }

    // 3. Read Aloud Button
    const readAloudBtn = e.target.closest(".read-aloud-btn");
    if (readAloudBtn) {
        e.preventDefault();
        const bodyContainer = readAloudBtn.closest(".message-body-container");
        const bubble = bodyContainer ? bodyContainer.querySelector(".message-bubble") : null;
        toggleReadAloud(readAloudBtn, bubble);
        return;
    }

    // 4. Follow-up Question Chips
    const followUpChip = e.target.closest(".follow-up-chip");
    if (followUpChip) {
        e.preventDefault();
        const prompt = followUpChip.getAttribute("data-prompt") || followUpChip.textContent.trim();
        if (prompt && !isGenerating) {
            userInput.value = prompt;
            sendMessage();
        }
        return;
    }
});

// Setup Theme Manager
function setupThemeManager() {
    const savedTheme = localStorage.getItem("edututor_theme") || "cyber";
    setTheme(savedTheme);

    // Toggle menu
    themeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        themeMenu.classList.toggle("show");
    });

    // Close on click outside
    document.addEventListener("click", (e) => {
        if (!themeBtn.contains(e.target) && !themeMenu.contains(e.target)) {
            themeMenu.classList.remove("show");
        }
    });

    // Theme options
    document.querySelectorAll(".theme-option").forEach(opt => {
        opt.addEventListener("click", () => {
            const theme = opt.getAttribute("data-theme");
            setTheme(theme);
            themeMenu.classList.remove("show");
            showToast(`Theme switched to: ${THEME_NAMES[theme] || theme}`);
        });
    });
}

function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("edututor_theme", theme);

    if (themeNameDisplay) {
        themeNameDisplay.textContent = THEME_NAMES[theme] || "Theme";
    }

    document.querySelectorAll(".theme-option").forEach(opt => {
        if (opt.getAttribute("data-theme") === theme) {
            opt.classList.add("active");
        } else {
            opt.classList.remove("active");
        }
    });
}

// Initialize Speech Recognition
function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        voiceBtn.style.display = "none";
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
        isRecording = true;
        voiceBtn.classList.add("listening");
        voiceBtn.setAttribute("title", "Listening... Speak now");
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
            userInput.value = userInput.value ? (userInput.value + " " + transcript) : transcript;
            userInput.dispatchEvent(new Event("input"));
            userInput.focus();
        }
    };

    recognition.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        voiceBtn.classList.remove("listening");
        isRecording = false;
    };

    recognition.onend = () => {
        voiceBtn.classList.remove("listening");
        voiceBtn.setAttribute("title", "Voice Input (Speech-to-Text)");
        isRecording = false;
    };

    voiceBtn.addEventListener("click", () => {
        if (isRecording) {
            recognition.stop();
        } else {
            recognition.start();
        }
    });
}

// Initialize UI events
document.addEventListener("DOMContentLoaded", () => {
    setupThemeManager();
    setupSpeechRecognition();
    loadVoices();

    // Auto-adjust textarea height on input
    userInput.addEventListener("input", () => {
        userInput.style.height = "auto";
        userInput.style.height = Math.min(userInput.scrollHeight, 140) + "px";
        sendBtn.disabled = !userInput.value.trim() || isGenerating;
    });

    // Enter key sends message, Shift+Enter for new line
    userInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!isGenerating && userInput.value.trim()) {
                sendMessage();
            }
        }
    });

    // Send button click
    sendBtn.addEventListener("click", () => {
        if (!isGenerating && userInput.value.trim()) {
            sendMessage();
        }
    });

    // Complexity / Depth Selector
    document.querySelectorAll(".depth-pill").forEach(pill => {
        pill.addEventListener("click", () => {
            document.querySelectorAll(".depth-pill").forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            currentLevel = pill.getAttribute("data-level") || "balanced";
            showToast(`Depth set to: ${pill.textContent.trim()}`);
        });
    });

    // Persona Mode Switcher
    document.querySelectorAll(".mode-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentMode = btn.getAttribute("data-mode") || "default";
            const title = btn.querySelector(".mode-title").textContent;
            showToast(`Persona: ${title}`);
        });
    });

    // Clear and New Session
    clearHistoryBtn.addEventListener("click", resetChat);
    newChatBtn.addEventListener("click", () => {
        resetChat();
        if (window.innerWidth <= 768) {
            sidebar.classList.remove("open");
        }
    });

    // Export conversation as Markdown
    exportChatBtn.addEventListener("click", exportConversation);

    // Suggestion Cards click
    document.querySelectorAll(".suggestion-card").forEach(card => {
        card.addEventListener("click", () => {
            const prompt = card.getAttribute("data-prompt");
            if (prompt && !isGenerating) {
                userInput.value = prompt;
                sendMessage();
            }
        });
    });

    // Topic Chips click
    document.querySelectorAll(".topic-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            const prompt = chip.getAttribute("data-prompt");
            if (prompt && !isGenerating) {
                userInput.value = prompt;
                sendMessage();
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove("open");
                }
            }
        });
    });

    // Mobile drawer toggle
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            sidebar.classList.toggle("open");
        });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener("click", (e) => {
        if (window.innerWidth <= 768 && sidebar.classList.contains("open") && !sidebar.contains(e.target)) {
            sidebar.classList.remove("open");
        }
    });

    // Focus input on start
    userInput.focus();
});

// Send Message Flow
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text || isGenerating) return;

    // Stop any speech playing
    stopSpeech();

    // Hide welcome screen
    if (welcomeScreen.style.display !== "none") {
        welcomeScreen.style.display = "none";
    }

    // Add user message to UI & history
    addMessageToUI(text, "user");
    conversationHistory.push({ role: "user", content: text });

    // Clear input & reset height
    userInput.value = "";
    userInput.style.height = "auto";
    sendBtn.disabled = true;
    isGenerating = true;

    // Show typing indicator & scroll
    typingIndicator.style.display = "flex";
    scrollToBottom();

    const startTime = performance.now();

    try {
        const response = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                messages: conversationHistory,
                mode: currentMode,
                level: currentLevel
            })
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();
        const botReply = data.reply || "I apologize, but I could not generate a response. Please try again.";
        const durationSec = ((performance.now() - startTime) / 1000).toFixed(1);

        // Add bot message to UI & history
        addMessageToUI(botReply, "bot", { duration: durationSec });
        conversationHistory.push({ role: "assistant", content: botReply });

    } catch (error) {
        console.error("Chat Error:", error);
        addMessageToUI("⚠️ **Network Error**: Unable to reach EduTutor server. Please check your connection and try again.", "bot");
    } finally {
        typingIndicator.style.display = "none";
        isGenerating = false;
        sendBtn.disabled = false;
        userInput.focus();
        scrollToBottom();
    }
}

// Append message row to DOM
function addMessageToUI(content, sender, meta = {}) {
    const row = document.createElement("div");
    row.className = `message-row ${sender}`;

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = sender === "user" ? "👤" : "🎓";

    const bodyContainer = document.createElement("div");
    bodyContainer.className = "message-body-container";
    // Store raw text content cleanly on dataset
    bodyContainer.dataset.raw = content;

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";

    if (sender === "bot") {
        // Parse markdown content safely
        bubble.innerHTML = marked.parse(content);
        
        // Add action bar below bot message
        const actions = document.createElement("div");
        actions.className = "message-actions";

        const metaInfo = meta.duration ? `⚡ ${meta.duration}s • GPT-OSS 120B` : "GPT-OSS 120B";

        actions.innerHTML = `
            <button type="button" class="msg-action-btn copy-msg-btn" title="Copy response text">
                📋 Copy Text
            </button>
            <button type="button" class="msg-action-btn read-aloud-btn" title="Read explanation aloud">
                🔊 Read Aloud
            </button>
            <span class="msg-meta-tag">${metaInfo}</span>
        `;

        // Smart Follow-up Suggestion Chips
        const followUpGroup = document.createElement("div");
        followUpGroup.className = "follow-up-group";
        
        const suggestions = [
            "💡 Give a practical code example",
            "🧪 Quiz me on this concept",
            "🔍 Explain line-by-line"
        ];

        suggestions.forEach(s => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "follow-up-chip";
            chip.setAttribute("data-prompt", s);
            chip.textContent = s;
            followUpGroup.appendChild(chip);
        });

        bodyContainer.appendChild(bubble);
        bodyContainer.appendChild(followUpGroup);
        bodyContainer.appendChild(actions);
    } else {
        bubble.textContent = content;
        bodyContainer.appendChild(bubble);
    }

    row.appendChild(avatar);
    row.appendChild(bodyContainer);
    messagesWrapper.appendChild(row);

    scrollToBottom();
}

// Export conversation as Markdown file
function exportConversation() {
    if (conversationHistory.length === 0) {
        showToast("No conversation messages to export yet.");
        return;
    }

    let mdText = `# 🎓 EduTutor AI Learning Session\nExported: ${new Date().toLocaleString()}\nPersona: ${currentMode} | Depth: ${currentLevel}\n\n---\n\n`;

    conversationHistory.forEach((msg, idx) => {
        if (msg.role === "user") {
            mdText += `### 👤 Student Question:\n${msg.content}\n\n`;
        } else {
            mdText += `### 🤖 EduTutor Response:\n${msg.content}\n\n---\n\n`;
        }
    });

    const blob = new Blob([mdText], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `EduTutor-Session-${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Session exported as Markdown! 📥");
}

// Scroll viewport to latest message
function scrollToBottom() {
    chatViewport.scrollTop = chatViewport.scrollHeight;
}

// Reset chat conversation
function resetChat() {
    stopSpeech();
    conversationHistory = [];
    messagesWrapper.innerHTML = "";
    welcomeScreen.style.display = "block";
    typingIndicator.style.display = "none";
    userInput.value = "";
    userInput.style.height = "auto";
    sendBtn.disabled = false;
    isGenerating = false;
    userInput.focus();
    showToast("Started a new session 🎓");
}
