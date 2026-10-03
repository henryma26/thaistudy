// --- 1. CONFIGURATION ---
const SYSTEM_PROMPT = "You are a helpful Thai language tutor. The user is a beginner studying for a professional Thai exam (CU-TFL). Explain grammar, words, and tones clearly in Cantonese (using Traditional Chinese characters). Use Thai script where helpful.";

let deepseekKey = localStorage.getItem('deepseek_api_key');
let geminiKey = localStorage.getItem('gemini_api_key');

// Chat histories for context
let deepseekHistory = [{ role: "system", content: SYSTEM_PROMPT }];
let geminiHistory = []; // Gemini uses a different history structure

// --- 2. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    checkKeys();
});

function checkKeys() {
    const setup = document.getElementById('api-setup-container');
    const input = document.getElementById('chat-input-container');
    const dsInput = document.getElementById('deepseek-key-input');
    const gmInput = document.getElementById('gemini-key-input');

    if (deepseekKey) dsInput.value = deepseekKey;
    if (geminiKey) gmInput.value = geminiKey;

    if (deepseekKey && geminiKey) {
        setup.classList.add('hidden');
        input.classList.remove('hidden');
    } else {
        setup.classList.remove('hidden');
        input.classList.add('hidden');
    }
}

function saveApiKeys() {
    const ds = document.getElementById('deepseek-key-input').value.trim();
    const gm = document.getElementById('gemini-key-input').value.trim();

    if (ds) {
        deepseekKey = ds;
        localStorage.setItem('deepseek_api_key', ds);
    }
    if (gm) {
        geminiKey = gm;
        localStorage.setItem('gemini_api_key', gm);
    }

    checkKeys();
    alert("API Keys saved successfully!");
}

// --- 3. CHAT LOGIC ---

async function sendToBoth() {
    const input = document.getElementById('shared-input');
    const message = input.value.trim();
    if (!message) return;

    // Clear input
    input.value = '';

    // Add user message to both windows
    appendMessage('deepseek', 'user', message);
    appendMessage('gemini', 'user', message);

    // Add loading indicators
    const dsLoadingId = 'ds-loading-' + Date.now();
    const gmLoadingId = 'gm-loading-' + Date.now();
    appendMessage('deepseek', 'assistant', 'Thinking...', dsLoadingId);
    appendMessage('gemini', 'assistant', 'Thinking...', gmLoadingId);

    // Call both APIs in parallel
    Promise.all([
        callDeepSeek(message, dsLoadingId),
        callGemini(message, gmLoadingId)
    ]);
}

async function callDeepSeek(message, loadingId) {
    deepseekHistory.push({ role: "user", content: message });

    try {
        // Using DeepSeek's current OpenAI-compatible endpoint
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${deepseekKey}`
            },
            body: JSON.stringify({
                model: "deepseek-flash",
                messages: deepseekHistory
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `Server error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        deepseekHistory.push({ role: "assistant", content: content });
        
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();
        appendMessage('deepseek', 'assistant', content);

    } catch (error) {
        console.error('DeepSeek Error:', error);
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) {
            loadingEl.innerText = "Error: " + error.message;
            loadingEl.classList.add('bg-red-100', 'text-red-800');
        }
    }
}

async function callGemini(message, loadingId) {
    geminiHistory.push({ role: "user", parts: [{ text: message }] });

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: SYSTEM_PROMPT }]
                },
                contents: geminiHistory
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `Server error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!content) throw new Error("No response from AI.");

        geminiHistory.push({ role: "model", parts: [{ text: content }] });

        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();
        appendMessage('gemini', 'assistant', content);

    } catch (error) {
        console.error('Gemini Error:', error);
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) {
            loadingEl.innerText = "Error: " + error.message;
            loadingEl.classList.add('bg-red-100', 'text-red-800');
        }
    }
}

function parseMarkdown(text) {
    if (!text) return "";
    // Escape HTML first to prevent XSS (except for our own generated tags later)
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // 1. Triple backtick code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-800 text-slate-100 p-3 rounded-xl my-2 overflow-x-auto text-xs font-mono"><code>$1</code></pre>');

    // 2. Inline code backticks
    html = html.replace(/`([^`\n]+)`/g, '<code class="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono text-rose-600">$1</code>');

    // 3. Bold-italic (***text***)
    html = html.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');

    // 4. Bold (**text**)
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // 5. Italic (*text*)
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // 6. Headings (###, ##, #)
    html = html.replace(/^### (.*$)/gim, '<h4 class="text-sm font-bold mt-3 mb-1 text-slate-800">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 class="text-base font-bold mt-4 mb-2 text-slate-800">$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h2 class="text-lg font-bold mt-4 mb-2 text-slate-800">$1</h2>');

    // 7. Bullet Lists (split by newline and wrap)
    const lines = html.split('\n');
    let inList = false;
    const processedLines = lines.map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            const content = trimmed.substring(2);
            if (!inList) {
                inList = true;
                return '<ul class="list-disc pl-5 my-1.5 space-y-1">' + `<li>${content}</li>`;
            }
            return `<li>${content}</li>`;
        } else {
            if (inList) {
                inList = false;
                return '</ul>' + line;
            }
            return line;
        }
    });
    if (inList) {
        processedLines.push('</ul>');
    }
    html = processedLines.join('\n');

    // 8. Convert newlines to breaks
    html = html.replace(/\n/g, '<br>');

    return html;
}

function appendMessage(target, role, text, id = null) {
    const container = document.getElementById(`${target}-messages`);
    if (!container) return;
    
    const msgDiv = document.createElement('div');
    if (id) msgDiv.id = id;
    
    if (role === 'user') {
        msgDiv.className = 'bg-white border p-3 rounded-lg rounded-tr-none ml-8 text-sm shadow-sm';
        msgDiv.innerText = text;
    } else {
        const bgColor = target === 'deepseek' ? 'bg-slate-200 text-slate-800' : 'bg-blue-100 text-blue-800';
        msgDiv.className = `${bgColor} p-3 rounded-lg rounded-tl-none mr-8 text-sm shadow-sm markdown-content`;
        msgDiv.innerHTML = parseMarkdown(text);
    }
    
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}