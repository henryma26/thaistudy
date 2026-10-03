// --- 1. CONFIGURATION ---
// We are using vocabulary.js for data storage to avoid browser CORS issues.

// --- 2. CORE UI LOGIC ---
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(sectionId);
    if (target) target.classList.remove('hidden');
    if (typeof updateCutflNavigation === 'function') updateCutflNavigation(sectionId);
}

// --- 3. AUDIO LOGIC ---
let voices = [];
let selectedVoiceName = localStorage.getItem('thai_tts_voice') || '';
let ttsRate = parseFloat(localStorage.getItem('thai_tts_rate') || '0.6');
if (!Number.isFinite(ttsRate)) ttsRate = 0.6;

const PREFERRED_THAI_VOICES = ['premwadee', 'kanya', 'somsi', 'niramit', 'achara'];

function isThaiVoice(v) {
    return /th(-|_|$)|thai/i.test(`${v.lang} ${v.name}`);
}

function scoreThaiVoice(v) {
    const name = v.name.toLowerCase();
    if (PREFERRED_THAI_VOICES.some(n => name.includes(n))) return 100;
    if (/female|woman|หญิง/.test(name)) return 80;
    if (/pattara|male|man|ชาย/.test(name)) return 10;
    return 50;
}

function pickThaiVoice() {
    const thaiVoices = voices.filter(isThaiVoice);
    if (selectedVoiceName) {
        const chosen = voices.find(v => v.name === selectedVoiceName);
        if (chosen) return chosen;
    }
    if (!thaiVoices.length) return null;
    return [...thaiVoices].sort((a, b) => scoreThaiVoice(b) - scoreThaiVoice(a))[0];
}

function populateVoiceSelector() {
    const select = document.getElementById('tts-voice-select');
    const hint = document.getElementById('tts-voice-hint');
    if (!select) return;

    const thaiVoices = voices.filter(isThaiVoice);
    const list = thaiVoices.length ? thaiVoices : voices;
    const autoVoice = pickThaiVoice();
    const current = selectedVoiceName || autoVoice?.name || '';

    select.innerHTML = list.length
        ? list.map(v => `<option value="${v.name.replace(/"/g, '&quot;')}">${v.name} (${v.lang})</option>`).join('')
        : '<option value="">系統沒有可用語音</option>';

    if (current && [...select.options].some(o => o.value === current)) {
        select.value = current;
        if (!selectedVoiceName) selectedVoiceName = current;
    }

    if (hint) {
        const preferredAvailable = thaiVoices.some(v =>
            PREFERRED_THAI_VOICES.some(name => v.name.toLowerCase().includes(name))
        );
        const voiceNames = thaiVoices.map(v => v.name).join('、');
        if (!thaiVoices.length) {
            hint.textContent = '未偵測到泰文語音。請到 Windows「設定 → 時間與語言 → 語言」加入ไทย，並開啟語音。';
        } else if (!preferredAvailable) {
            hint.textContent = `目前瀏覽器只提供：${voiceNames}。網頁無法自行加入女聲；請在 Windows 安裝泰文女聲後重新開啟瀏覽器。`;
        } else {
            hint.textContent = `已偵測到泰文女聲。可用聲線：${voiceNames}`;
        }
    }

    const rateInput = document.getElementById('tts-rate');
    const rateLabel = document.getElementById('tts-rate-label');
    if (rateInput) rateInput.value = String(ttsRate);
    if (rateLabel) rateLabel.textContent = ttsRate.toFixed(2);
}

function loadVoices() {
    if (!('speechSynthesis' in window)) return;
    voices = window.speechSynthesis.getVoices();
    populateVoiceSelector();
}

function onTtsVoiceChange(name) {
    selectedVoiceName = name;
    localStorage.setItem('thai_tts_voice', name);
}

function onTtsRateChange(rate) {
    ttsRate = parseFloat(rate);
    if (!Number.isFinite(ttsRate)) ttsRate = 0.6;
    localStorage.setItem('thai_tts_rate', String(ttsRate));
    const rateLabel = document.getElementById('tts-rate-label');
    if (rateLabel) rateLabel.textContent = ttsRate.toFixed(2);
}

function playAudio(text) {
    if (!('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'th-TH';
    utterance.rate = ttsRate;
    const voice = pickThaiVoice();
    if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang || 'th-TH';
    }
    window.speechSynthesis.speak(utterance);
}

function replayQuizAudio() {
    const q = typeof quizQuestions !== 'undefined' ? quizQuestions[currentQuestionIndex] : null;
    if (q?.target) playAudio(q.target);
}

if ('speechSynthesis' in window) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
}

// --- 4. CARD CREATION ---
function createConsonantCard(c) {
    const colors = { 'mid': 'bg-blue-50 text-blue-700', 'high': 'bg-red-50 text-red-700', 'low': 'bg-green-50 text-green-700' };
    return `
        <div onclick="playAudio('${c.char}')" class="p-4 border rounded-xl bg-white flex flex-col items-center text-center cursor-pointer hover:shadow-md transition min-h-[160px] justify-between">
            <div class="flex flex-col items-center gap-1 w-full">
                <div class="flex justify-center items-end gap-3 mb-1">
                    <div class="flex flex-col items-center">
                        <span class="text-[8px] text-slate-400 uppercase font-bold leading-none mb-1">Trad.</span>
                        <div class="thai-font text-4xl leading-tight">${c.char}</div>
                    </div>
                    <div class="flex flex-col items-center">
                        <span class="text-[8px] text-slate-400 uppercase font-bold leading-none mb-1">Mod.</span>
                        <div class="thai-modern text-4xl text-slate-300 leading-tight">${c.char}</div>
                    </div>
                </div>
                <div class="thai-font text-sm font-bold text-slate-600">${c.thaiName}</div>
                <div class="text-xs text-slate-400">${c.name}</div>
            </div>
            <div class="mt-2 px-2 py-0.5 text-[10px] font-bold rounded ${colors[c.class] || 'bg-slate-50'}">${c.class} class</div>
        </div>`;
}

function createVowelCard(v) {
    const audioText = v.char.replace('-', 'ก');
    return `
        <div onclick="playAudio('${audioText}')" class="p-4 border rounded-xl bg-white flex flex-col items-center text-center cursor-pointer hover:shadow-md transition min-h-[140px] justify-between">
            <div class="flex flex-col items-center gap-1 w-full">
                <div class="flex justify-center items-end gap-3 mb-1">
                    <div class="flex flex-col items-center">
                        <span class="text-[8px] text-slate-400 uppercase font-bold leading-none mb-1">Trad.</span>
                        <div class="thai-font text-4xl leading-tight">${v.char}</div>
                    </div>
                    <div class="flex flex-col items-center">
                        <span class="text-[8px] text-slate-400 uppercase font-bold leading-none mb-1">Mod.</span>
                        <div class="thai-modern text-4xl text-slate-300 leading-tight">${v.char}</div>
                    </div>
                </div>
                <div class="thai-font text-sm font-bold text-slate-600 line-clamp-1">${v.thaiName}</div>
            </div>
            <div class="text-xs text-slate-400 mt-1">${v.name}</div>
        </div>`;
}

function createVocabCard(item) {
    return `
        <div class="perspective-1000 h-48 vocab-card" data-thai="${item.thai}" data-trad="${item.traditional}" data-pron="${item.pronunciation}" data-cat="${item.category}" onclick="this.querySelector('.card-inner').classList.toggle('rotate-y-180')">
            <div class="card-inner relative w-full h-full transition-transform duration-500 transform-style-3d cursor-pointer">
                <div class="absolute inset-0 backface-hidden bg-white border-2 border-amber-100 rounded-2xl flex flex-col items-center justify-center p-4">
                    <div class="thai-font text-4xl mb-2">${item.thai}</div>
                    <div class="text-xs text-slate-400 uppercase font-bold">${item.category}</div>
                </div>
                <div class="absolute inset-0 backface-hidden bg-amber-50 border-2 border-amber-200 rounded-2xl flex flex-col items-center justify-center p-4 rotate-y-180">
                    <div class="text-2xl font-bold text-amber-800 mb-1">${item.traditional}</div>
                    <div class="text-sm text-slate-600">${item.pronunciation}</div>
                    <button onclick="event.stopPropagation(); playAudio('${item.thai}')" class="mt-2 p-2 bg-white rounded-full shadow-sm">🔊</button>
                </div>
            </div>
        </div>`;
}

// --- 5. DATA LOADING & FILTERING ---
let vocabularyData = [];
let activeCategory = 'All';
let cachedVocabCards = [];

function loadVocabulary() {
    // Load from the global vocabularyDataList defined in vocabulary.js
    if (typeof vocabularyDataList !== 'undefined') {
        vocabularyData = vocabularyDataList;
        initCategoryChips();
        initQuizCategoryDropdown();
        renderVocab();
    } else {
        console.error("vocabularyDataList not found. Make sure vocabulary.js is loaded.");
        const grid = document.getElementById('vocab-grid');
        if (grid) grid.innerHTML = '<p class="col-span-full text-center text-red-500">Error: Vocabulary data file not found.</p>';
    }
}

function filterVocab() {
    const query = (document.getElementById('vocab-search').value || "").toLowerCase().trim();
    let visibleCount = 0;
    
    for (let i = 0; i < cachedVocabCards.length; i++) {
        const card = cachedVocabCards[i];
        const matchSearch = !query || 
                            card.thai.includes(query) || 
                            card.trad.includes(query) || 
                            card.pron.includes(query);
        const matchCat = activeCategory === 'All' || card.cat === activeCategory;
        const isVisible = matchSearch && matchCat;
        
        card.element.classList.toggle('hidden', !isVisible);
        if (isVisible) {
            visibleCount++;
        }
    }
    
    // Update count display
    const countDisplay = document.getElementById('vocab-count-display');
    if (countDisplay) {
        countDisplay.innerText = `Showing ${visibleCount} of ${vocabularyData.length} words`;
    }
}

function renderVocab() {
    const grid = document.getElementById('vocab-grid');
    if (!grid) return;
    grid.innerHTML = vocabularyData.map(item => createVocabCard(item)).join('');
    
    // Cache the card elements and their search terms for high performance
    cachedVocabCards = Array.from(grid.querySelectorAll('.vocab-card')).map(card => ({
        element: card,
        thai: card.dataset.thai.toLowerCase(),
        trad: card.dataset.trad.toLowerCase(),
        pron: card.dataset.pron.toLowerCase(),
        cat: card.dataset.cat
    }));
    
    filterVocab();
}

function initCategoryChips() {
    const container = document.getElementById('category-chips');
    if (!container) return;
    const cats = ['All', ...new Set(vocabularyData.map(i => i.category))];
    container.innerHTML = cats.map(c => `
        <button onclick="activeCategory='${c}'; filterVocab(); updateChipStyles(this)" class="category-chip px-4 py-1 border rounded-full text-sm transition ${c === 'All' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-amber-600 border-amber-200'}">
            ${c}
        </button>`).join('');
}

function initQuizCategoryDropdown() {
    if (typeof vocabularyDataList === 'undefined') return;
    const cats = [...new Set(vocabularyDataList.map(i => i.category))].sort();
    ['quiz-vocab-category', 'quiz-listening-category'].forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        select.innerHTML = `<option value="All">All Categories (所有類別 - ${vocabularyDataList.length} 字)</option>` +
            cats.map(c => `<option value="${c}">${c}</option>`).join('');
    });
}

function updateChipStyles(activeBtn) {
    document.querySelectorAll('.category-chip').forEach(btn => {
        btn.classList.remove('bg-amber-500', 'text-white', 'border-amber-500');
        btn.classList.add('bg-white', 'text-amber-600', 'border-amber-200');
    });
    activeBtn.classList.add('bg-amber-500', 'text-white', 'border-amber-500');
    activeBtn.classList.remove('bg-white', 'text-amber-600', 'border-amber-200');
}

// --- 6. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Consonants
    const cGrid = document.getElementById('consonants-grid');
    if (cGrid && typeof thaiData !== 'undefined' && thaiData.consonants) {
        cGrid.innerHTML = thaiData.consonants.map(c => createConsonantCard(c)).join('');
    }
    
    // Vowels
    const vGrid = document.getElementById('vowels-grid');
    if (vGrid && typeof thaiData !== 'undefined' && thaiData.vowels) {
        vGrid.innerHTML = thaiData.vowels.map(v => createVowelCard(v)).join('');
    }

    loadVocabulary();
    
    // Notebook initialization
    loadNotes();
    
    // Chat initialization
    checkApiKey();

    // Tone Calculator initialization
    initToneCalculator();
    loadVoices();

    // Speaking practice initialization
    newSpeakingPrompt();
    renderSpeakingHistory();
});

// --- 8. NOTEBOOK LOGIC ---

let myNotes = JSON.parse(localStorage.getItem('thai_notes') || '[]');

function saveNote() {
    const thai = document.getElementById('note-thai').value.trim();
    const trad = document.getElementById('note-trad').value.trim();
    const context = document.getElementById('note-context').value.trim();

    if (!thai || !trad) {
        alert("Please enter both the Thai word and its translation.");
        return;
    }

    const newNote = {
        id: Date.now(),
        thai,
        trad,
        context,
        date: new Date().toLocaleDateString()
    };

    myNotes.unshift(newNote);
    localStorage.setItem('thai_notes', JSON.stringify(myNotes));
    
    // Clear inputs
    document.getElementById('note-thai').value = '';
    document.getElementById('note-trad').value = '';
    document.getElementById('note-context').value = '';
    
    renderNotes();
}

function loadNotes() {
    renderNotes();
}

function renderNotes() {
    const list = document.getElementById('notes-list');
    const noNotes = document.getElementById('no-notes');
    if (!list || !noNotes) return;

    if (myNotes.length === 0) {
        list.innerHTML = '';
        noNotes.classList.remove('hidden');
        return;
    }

    noNotes.classList.add('hidden');
    list.innerHTML = myNotes.map(note => `
        <div class="bg-white p-5 rounded-2xl shadow-sm border border-indigo-50 hover:border-indigo-200 transition group relative">
            <button onclick="deleteNote(${note.id})" class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition p-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
            <div class="flex justify-between items-start mb-2">
                <div class="thai-font text-3xl text-indigo-900">${note.thai}</div>
                <button onclick="playAudio('${note.thai}')" class="text-indigo-400 hover:text-indigo-600 transition">🔊</button>
            </div>
            <div class="text-lg font-bold text-slate-700 mb-2">${note.trad}</div>
            ${note.context ? `<div class="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg italic border-l-2 border-indigo-200">${note.context}</div>` : ''}
            <div class="text-[10px] text-slate-300 mt-3 flex justify-between items-center">
                <span>Added on ${note.date}</span>
            </div>
        </div>
    `).join('');
}

function filterNotes() {
    const query = document.getElementById('note-search').value.toLowerCase().trim();
    const cards = document.querySelectorAll('#notes-list > div');
    
    let visibleCount = 0;
    cards.forEach((card, index) => {
        const note = myNotes[index];
        const match = note.thai.toLowerCase().includes(query) || 
                      note.trad.toLowerCase().includes(query) || 
                      (note.context && note.context.toLowerCase().includes(query));
        
        card.classList.toggle('hidden', !match);
        if (match) visibleCount++;
    });

    const noNotes = document.getElementById('no-notes');
    if (visibleCount === 0 && query !== '') {
        noNotes.classList.remove('hidden');
        noNotes.querySelector('p').innerText = "No matching words found in your notebook.";
    } else if (myNotes.length > 0) {
        noNotes.classList.add('hidden');
    }
}

function deleteNote(id) {
    if (confirm("Are you sure you want to remove this word from your notebook?")) {
        myNotes = myNotes.filter(n => n.id !== id);
        localStorage.setItem('thai_notes', JSON.stringify(myNotes));
        renderNotes();
    }
}

function exportNotes() {
    if (myNotes.length === 0) {
        alert("Your notebook is empty. Nothing to export!");
        return;
    }
    const dataStr = JSON.stringify(myNotes, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `thai_notebook_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function importNotes(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (!Array.isArray(imported)) throw new Error("Invalid file format");
            
            if (confirm(`Import ${imported.length} words? This will merge them with your existing notebook.`)) {
                // Merge and remove duplicates by ID or Thai word
                const existingThai = new Set(myNotes.map(n => n.thai));
                const newWords = imported.filter(n => !existingThai.has(n.thai));
                
                myNotes = [...newWords, ...myNotes];
                localStorage.setItem('thai_notes', JSON.stringify(myNotes));
                renderNotes();
                alert(`Successfully imported ${newWords.length} new words!`);
            }
        } catch (err) {
            alert("Error importing file: " + err.message);
        }
    };
    reader.readAsText(file);
    // Reset input so same file can be imported again if needed
    input.value = '';
}

// --- 7. CHAT & LLM LOGIC ---

let geminiKey = localStorage.getItem('gemini_api_key');
const chatHistory = [];

function toggleChat() {
    const window = document.getElementById('chat-window');
    if (window) {
        window.classList.toggle('chat-hidden');
    }
}

function checkApiKey() {
    const apiSetup = document.getElementById('api-setup');
    const chatMessages = document.getElementById('chat-messages');
    const chatInputArea = document.getElementById('chat-input-area');

    if (!apiSetup || !chatMessages || !chatInputArea) return;

    if (geminiKey) {
        apiSetup.classList.add('hidden');
        chatMessages.classList.remove('hidden');
        chatInputArea.classList.remove('hidden');
    } else {
        apiSetup.classList.remove('hidden');
        chatMessages.classList.add('hidden');
        chatInputArea.classList.add('hidden');
    }
}

function saveApiKey() {
    const input = document.getElementById('api-key-input');
    if (input && input.value.trim()) {
        geminiKey = input.value.trim();
        localStorage.setItem('gemini_api_key', geminiKey);
        checkApiKey();
    }
}

async function sendMessage() {
    const input = document.getElementById('user-input');
    if (!input) return;
    const message = input.value.trim();
    if (!message) return;

    appendMessage('user', message);
    input.value = '';

    const loadingId = 'loading-' + Date.now();
    appendMessage('assistant', 'Thinking...', loadingId);

    chatHistory.push({ role: "user", parts: [{ text: message }] });

    try {
        const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=' + geminiKey;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: "You are a helpful Thai language tutor. The user is a beginner studying for a professional Thai exam (CU-TFL). Explain grammar, words, and tones clearly in Cantonese (using Traditional Chinese characters). Use Thai script where helpful." }]
                },
                contents: chatHistory
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Gemini API Error:', response.status, errorData);
            throw new Error(errorData.error?.message || `Server returned ${response.status}`);
        }

        const data = await response.json();

        const assistantMessage = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!assistantMessage) {
            console.error('Unexpected response:', data);
            throw new Error("No response from AI. The model may have filtered the content.");
        }

        chatHistory.push({ role: "model", parts: [{ text: assistantMessage }] });

        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();
        appendMessage('assistant', assistantMessage);

    } catch (error) {
        console.error('AI Error:', error);
        chatHistory.pop();
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

function appendMessage(role, text, id = null) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const msgDiv = document.createElement('div');
    
    if (id) msgDiv.id = id;
    
    if (role === 'user') {
        msgDiv.className = 'bg-white border p-3 rounded-lg rounded-tr-none ml-8 text-sm shadow-sm';
        msgDiv.innerText = text;
    } else {
        msgDiv.className = 'bg-blue-100 p-3 rounded-lg rounded-tl-none mr-8 text-sm text-blue-800 shadow-sm markdown-content';
        msgDiv.innerHTML = parseMarkdown(text);
    }
    
    container.appendChild(msgDiv);
    
    // Auto-scroll
    container.scrollTop = container.scrollHeight;
}

// --- Quick Tools Logic ---

function playQuickAudio() {
    const input = document.getElementById('quick-input');
    if (!input) return;
    const text = input.value.trim();
    if (text) {
        playAudio(text);
    } else {
        alert("Please enter some Thai text first!");
    }
}

function openGoogleTranslate() {
    const input = document.getElementById('quick-input');
    if (!input) return;
    const text = input.value.trim();
    if (text) {
        // Direct link to Google Translate with Thai as source and English as target
        const url = `https://translate.google.com/?sl=th&tl=en&text=${encodeURIComponent(text)}&op=translate`;
        window.open(url, '_blank');
    } else {
        // Just open Google Translate if input is empty
        window.open('https://translate.google.com/?sl=th&tl=en&op=translate', '_blank');
    }
}

// --- 9. INTERACTIVE TONE CALCULATOR LOGIC ---

function initToneCalculator() {
    const select = document.getElementById('calc-consonant');
    if (!select || typeof thaiData === 'undefined' || !thaiData.consonants) return;
    
    select.innerHTML = thaiData.consonants.map(c => {
        const clsLabel = c.class === 'mid' ? '中' : c.class === 'high' ? '高' : '低';
        return `<option value="${c.char}">${c.char} - ${c.thaiName} (${c.name}) [${clsLabel}輔音]</option>`;
    }).join('');
    
    runToneCalculator();
}

function runToneCalculator() {
    const consonantChar = document.getElementById('calc-consonant').value;
    const mark = document.getElementById('calc-mark').value;
    const vowel = document.getElementById('calc-vowel').value;
    const coda = document.getElementById('calc-coda').value;

    const explanationEl = document.getElementById('calc-explanation');
    const resultEl = document.getElementById('calc-result');
    const pitchDescEl = document.getElementById('calc-pitch-description');

    if (!explanationEl || !resultEl || !pitchDescEl) return;

    // Find the consonant class
    const midConsonants = ["ก", "จ", "ด", "ต", "บ", "ป", "อ", "ฎ", "ฏ"];
    const highConsonants = ["ข", "ฃ", "ฉ", "ถ", "ฐ", "ผ", "ฝ", "ส", "ศ", "ษ", "ห"];
    let cls = "low";
    let clsName = "低輔音 (Low Class)";
    if (midConsonants.includes(consonantChar)) {
        cls = "mid";
        clsName = "中輔音 (Mid Class)";
    } else if (highConsonants.includes(consonantChar)) {
        cls = "high";
        clsName = "高輔音 (High Class)";
    }

    let steps = [];
    steps.push(`<div>輔音：<strong class="text-rose-600 font-mono text-base">${consonantChar}</strong> &rarr; 分類為 <strong class="text-rose-600">${clsName}</strong></div>`);

    let finalTone = "";
    let pitchDesc = "";

    // If there is a tone mark
    if (mark !== "none") {
        const markNames = {
            'ek': 'Mai Ek ่ (一等聲調)',
            'tho': 'Mai Tho ้ (二等聲調)',
            'tri': 'Mai Tri ๊ (三等聲調)',
            'jattawa': 'Mai Jattawa ๋ (四等聲調)'
        };
        steps.push(`<div>聲調符號：已偵測到 <strong class="text-blue-600">${markNames[mark]}</strong>。當有聲調符號時，優先套用符號規則，忽略元音長短與尾音！</div>`);

        if (cls === "mid") {
            if (mark === "ek") {
                finalTone = "Low Tone (低音 \\)";
                pitchDesc = "低平調 (比平時音調更低，聲調往下降)";
                steps.push(`<div>中輔音 + ่ (Mai Ek) &rarr; <strong class="text-emerald-600">低音 (Low Tone)</strong></div>`);
            } else if (mark === "tho") {
                finalTone = "Falling Tone (落音 ^)";
                pitchDesc = "降調/落音 (先升後降，像嘆氣一樣)";
                steps.push(`<div>中輔音 + ้ (Mai Tho) &rarr; <strong class="text-emerald-600">落音 (Falling Tone)</strong></div>`);
            } else if (mark === "tri") {
                finalTone = "High Tone (高音 /)";
                pitchDesc = "高平調 (高音，聲調往上升)";
                steps.push(`<div>中輔音 + ๊ (Mai Tri) &rarr; <strong class="text-emerald-600">高音 (High Tone)</strong></div>`);
            } else if (mark === "jattawa") {
                finalTone = "Rising Tone (升音 /)";
                pitchDesc = "升調 (先降後升，像廣東話問問題時的音調)";
                steps.push(`<div>中輔音 + ๋ (Mai Jattawa) &rarr; <strong class="text-emerald-600">升音 (Rising Tone)</strong></div>`);
            }
        } else if (cls === "high") {
            if (mark === "ek") {
                finalTone = "Low Tone (低音 \\)";
                pitchDesc = "低平調 (低音，聲調往下降)";
                steps.push(`<div>高輔音 + ่ (Mai Ek) &rarr; <strong class="text-emerald-600">低音 (Low Tone)</strong></div>`);
            } else if (mark === "tho") {
                finalTone = "Falling Tone (落音 ^)";
                pitchDesc = "降調/落音 (先升後降)";
                steps.push(`<div>高輔音 + ้ (Mai Tho) &rarr; <strong class="text-emerald-600">落音 (Falling Tone)</strong></div>`);
            } else {
                finalTone = "無效聲調";
                pitchDesc = "拼寫錯誤 (Invalid combinations)";
                steps.push(`<div class="text-red-500 font-bold">高輔音不與 Mai Tri ๊ 或 Mai Jattawa ๋ 結合！請檢查拼寫。</div>`);
            }
        } else { // low class
            if (mark === "ek") {
                finalTone = "Falling Tone (落音 ^)";
                pitchDesc = "降調/落音 (發音往上移一聲！即寫 1 發 2 等聲調的落音)";
                steps.push(`<div>低輔音聲調轉移：低輔音 + ่ (Mai Ek) &rarr; <strong class="text-amber-600">落音 (Falling Tone)</strong> (發音調高一聲)</div>`);
            } else if (mark === "tho") {
                finalTone = "High Tone (高音 /)";
                pitchDesc = "高平調 (發音往上移一聲！即寫 2 發 3 等聲調的高音)";
                steps.push(`<div>低輔音聲調轉移：低輔音 + ้ (Mai Tho) &rarr; <strong class="text-amber-600">高音 (High Tone)</strong> (發音調高一聲)</div>`);
            } else {
                finalTone = "無效聲調";
                pitchDesc = "拼寫錯誤 (Invalid combinations)";
                steps.push(`<div class="text-red-500 font-bold">低輔音不與 Mai Tri ๊ 或 Mai Jattawa ๋ 結合！請檢查拼寫。</div>`);
            }
        }
    } else {
        // No tone mark
        steps.push(`<div>聲調符號：<strong class="text-slate-500">無</strong>。需要分析音節是<strong>活音節 (Live)</strong>還是<strong>死音節 (Dead)</strong>！</div>`);
        
        let isLive = true;
        let vowelText = vowel === "long" ? "長元音 (Long Vowel)" : "短元音 (Short Vowel)";
        
        if (coda === "none") {
            if (vowel === "short") {
                isLive = false;
                steps.push(`<div>音節判定：無尾音 + ${vowelText} &rarr; <strong class="text-red-600">死音節 (Dead Syllable)</strong> (聲音短促被截斷)</div>`);
            } else {
                isLive = true;
                steps.push(`<div>音節判定：無尾音 + ${vowelText} &rarr; <strong class="text-green-600">活音節 (Live Syllable)</strong> (聲音可持續延長)</div>`);
            }
        } else if (coda === "live") {
            isLive = true;
            steps.push(`<div>音節判定：含有活尾音 (n, m, ng, y, w) &rarr; <strong class="text-green-600">活音節 (Live Syllable)</strong> (不管元音長短)</div>`);
        } else if (coda === "dead") {
            isLive = false;
            steps.push(`<div>音節判定：含有死尾音 (p, t, k) &rarr; <strong class="text-red-600">死音節 (Dead Syllable)</strong> (不管元音長短)</div>`);
        }

        if (cls === "mid") {
            if (isLive) {
                finalTone = "Mid Tone (中音 —)";
                pitchDesc = "中平調 (平穩的自然語調)";
                steps.push(`<div>聲調判定：中輔音 + 活音節 &rarr; <strong class="text-emerald-600">中音 (Mid Tone)</strong></div>`);
            } else {
                finalTone = "Low Tone (低音 \\)";
                pitchDesc = "低平調 (低沉調)";
                steps.push(`<div>聲調判定：中輔音 + 死音節 &rarr; <strong class="text-emerald-600">低音 (Low Tone)</strong></div>`);
            }
        } else if (cls === "high") {
            if (isLive) {
                finalTone = "Rising Tone (升音 /)";
                pitchDesc = "升調 (先降後升，高輔音的自然原始聲調)";
                steps.push(`<div>聲調判定：高輔音 + 活音節 &rarr; <strong class="text-emerald-600">升音 (Rising Tone)</strong></div>`);
            } else {
                finalTone = "Low Tone (低音 \\)";
                pitchDesc = "低平調 (低沉調)";
                steps.push(`<div>聲調判定：高輔音 + 死音節 &rarr; <strong class="text-emerald-600">低音 (Low Tone)</strong></div>`);
            }
        } else { // low class
            if (isLive) {
                finalTone = "Mid Tone (中音 —)";
                pitchDesc = "中平調 (平穩的自然語調，低輔音的自然原始聲調)";
                steps.push(`<div>聲調判定：低輔音 + 活音節 &rarr; <strong class="text-emerald-600">中音 (Mid Tone)</strong></div>`);
            } else {
                if (vowel === "short") {
                    finalTone = "High Tone (高音 /)";
                    pitchDesc = "高平調 (聲音急促且高昂)";
                    steps.push(`<div>聲調判定：低輔音 + 死音節 + 短元音 &rarr; <strong class="text-emerald-600">高音 (High Tone)</strong></div>`);
                } else {
                    finalTone = "Falling Tone (落音 ^)";
                    pitchDesc = "落音 (聲音長且向下滑落)";
                    steps.push(`<div>聲調判定：低輔音 + 死音節 + 長元音 &rarr; <strong class="text-emerald-600">落音 (Falling Tone)</strong></div>`);
                }
            }
        }
    }

    explanationEl.innerHTML = steps.map(s => `<div class="p-1 border-b border-rose-50/50">${s}</div>`).join('');
    resultEl.innerText = finalTone;
    pitchDescEl.innerText = pitchDesc;
}

// --- 10. AI SPEAKING PRACTICE ---

const speakingPrompts = {
    conversation: [
        {
            question: "ช่วยแนะนำตัวเองและเล่าว่าทำไมคุณจึงเรียนภาษาไทย",
            hint: "自我介紹，並說明你學泰文的原因。建議回答 45–60 秒。",
            thai: "ผมชื่อเฮนรีครับ ผมเรียนภาษาไทยเพราะว่า...",
            trad: "我叫 Henry。我學泰文是因為……"
        },
        {
            question: "ปกติวันหยุดคุณชอบทำอะไร และทำกับใคร",
            hint: "講述假日活動、同行人物及原因。",
            thai: "ปกติวันหยุดผมชอบ... เพราะว่า...",
            trad: "平日放假我喜歡……因為……"
        },
        {
            question: "เล่าเกี่ยวกับงานหรือการเรียนของคุณในปัจจุบัน",
            hint: "介紹目前的工作或學習情況，加入日常例子。",
            thai: "ตอนนี้ผมทำงานเกี่ยวกับ... หน้าที่หลักของผมคือ...",
            trad: "目前我的工作與……有關，主要職責是……"
        }
    ],
    qa: [
        {
            question: "ถ้าคุณมีเวลาว่างเพิ่มขึ้นวันละหนึ่งชั่วโมง คุณจะใช้เวลานั้นทำอะไร",
            hint: "選一件事，解釋原因及實行方法。建議回答 1–2 分鐘。",
            thai: "ถ้าผมมีเวลาว่างเพิ่มขึ้น ผมจะ... เนื่องจาก...",
            trad: "如果我每天多一小時空閒時間，我會……因為……"
        },
        {
            question: "คุณคิดว่าการเรียนออนไลน์มีข้อดีและข้อเสียอย่างไร",
            hint: "至少各說一個優點和缺點，再作簡短總結。",
            thai: "ในความคิดของผม การเรียนออนไลน์มีข้อดีคือ... อย่างไรก็ตาม...",
            trad: "我認為網上學習的優點是……然而……"
        },
        {
            question: "สถานที่ใดในเมืองของคุณที่คุณอยากแนะนำให้คนไทยไปเที่ยว เพราะอะไร",
            hint: "描述地點、特色、交通及推薦原因。",
            thai: "สถานที่ที่ผมอยากแนะนำคือ... เพราะที่นั่น...",
            trad: "我想推薦的地方是……因為那裡……"
        }
    ],
    opinion: [
        {
            question: "รัฐบาลควรสนับสนุนให้ประชาชนใช้ระบบขนส่งสาธารณะมากขึ้นหรือไม่",
            hint: "清楚表明立場，提出兩個理由、一個例子及結論。建議回答 2–3 分鐘。",
            thai: "ผมเห็นด้วยว่ารัฐบาลควร... เหตุผลประการแรกคือ...",
            trad: "我同意政府應該……第一個理由是……"
        },
        {
            question: "สื่อสังคมออนไลน์มีผลดีหรือผลเสียต่อคนรุ่นใหม่มากกว่ากัน",
            hint: "比較正反影響，提出例子並總結個人看法。",
            thai: "สื่อสังคมออนไลน์มีทั้งข้อดีและข้อเสีย แต่ผมคิดว่า...",
            trad: "社交媒體有利亦有弊，但我認為……"
        },
        {
            question: "การรักษาสมดุลระหว่างงานกับชีวิตสำคัญอย่างไร",
            hint: "說明重要性、現實困難及可行方法。",
            thai: "การรักษาสมดุลระหว่างงานกับชีวิตสำคัญ เพราะว่า...",
            trad: "工作與生活的平衡很重要，因為……"
        }
    ]
};

let speakingPromptIndex = -1;
let speakingRecorder = null;
let speakingStream = null;
let speakingChunks = [];
let speakingTimer = null;
let speakingStartedAt = 0;
let speakingPlaybackUrl = null;

function newSpeakingPrompt() {
    const scenario = document.getElementById('speaking-scenario')?.value || 'conversation';
    const prompts = speakingPrompts[scenario] || speakingPrompts.conversation;
    let nextIndex = Math.floor(Math.random() * prompts.length);
    if (prompts.length > 1 && nextIndex === speakingPromptIndex) {
        nextIndex = (nextIndex + 1) % prompts.length;
    }
    speakingPromptIndex = nextIndex;

    const target = document.getElementById('speaking-target');
    const translation = document.getElementById('speaking-translation');
    const question = document.getElementById('speaking-question');
    const hint = document.getElementById('speaking-question-hint');
    if (target) target.value = prompts[nextIndex].thai;
    if (translation) translation.innerText = prompts[nextIndex].trad;
    if (question) question.innerText = prompts[nextIndex].question;
    if (hint) hint.innerText = prompts[nextIndex].hint;
}

function updateSpeakingTranslation() {
    const translation = document.getElementById('speaking-translation');
    if (translation) translation.innerText = "自訂句子：AI 會按你輸入的泰文分析。";
}

function playSpeakingTarget() {
    const text = document.getElementById('speaking-target')?.value.trim();
    if (text) playAudio(text);
}

function setSpeakingRecorderState(isRecording, status) {
    const recordBtn = document.getElementById('speaking-record-btn');
    const stopBtn = document.getElementById('speaking-stop-btn');
    const statusEl = document.getElementById('speaking-recorder-status');
    if (recordBtn) recordBtn.disabled = isRecording;
    if (stopBtn) stopBtn.disabled = !isRecording;
    if (statusEl && status) statusEl.innerText = status;
}

async function startSpeakingRecording() {
    const target = document.getElementById('speaking-target')?.value.trim();
    if (!target) {
        alert("請先輸入要練習的泰文句子。");
        return;
    }
    if (!geminiKey) {
        alert("請先在右下角 Thai AI Assistant 輸入 Gemini API Key。");
        toggleChat();
        return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        alert("你的瀏覽器不支援錄音，請使用最新版 Chrome、Edge 或 Safari。");
        return;
    }

    try {
        speakingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const preferredType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
            .find(type => MediaRecorder.isTypeSupported(type));
        speakingRecorder = preferredType
            ? new MediaRecorder(speakingStream, { mimeType: preferredType })
            : new MediaRecorder(speakingStream);
        speakingChunks = [];

        speakingRecorder.addEventListener('dataavailable', event => {
            if (event.data.size > 0) speakingChunks.push(event.data);
        });
        speakingRecorder.addEventListener('stop', handleSpeakingRecording);
        speakingRecorder.start();
        speakingStartedAt = Date.now();
        setSpeakingRecorderState(true, "🔴 錄音中 0:00｜請用泰文完整回答");

        const stage = document.getElementById('speaking-scenario')?.value || 'conversation';
        const maxSeconds = stage === 'opinion' ? 180 : stage === 'qa' ? 120 : 90;
        speakingTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - speakingStartedAt) / 1000);
            const statusEl = document.getElementById('speaking-recorder-status');
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            if (statusEl) statusEl.innerText = `🔴 錄音中 ${minutes}:${String(seconds).padStart(2, '0')}｜請用泰文完整回答`;
            if (elapsed >= maxSeconds) stopSpeakingRecording();
        }, 1000);
    } catch (error) {
        console.error('Microphone Error:', error);
        speakingStream?.getTracks().forEach(track => track.stop());
        speakingStream = null;
        setSpeakingRecorderState(false, "無法使用咪高峰，請檢查瀏覽器權限後再試。");
    }
}

function stopSpeakingRecording() {
    if (!speakingRecorder || speakingRecorder.state !== 'recording') return;
    clearInterval(speakingTimer);
    speakingRecorder.stop();
    setSpeakingRecorderState(false, "正在準備錄音...");
}

async function handleSpeakingRecording() {
    const mimeType = speakingRecorder?.mimeType || speakingChunks[0]?.type || 'audio/webm';
    const audioBlob = new Blob(speakingChunks, { type: mimeType });
    speakingStream?.getTracks().forEach(track => track.stop());
    speakingStream = null;

    const playback = document.getElementById('speaking-playback');
    if (speakingPlaybackUrl) URL.revokeObjectURL(speakingPlaybackUrl);
    speakingPlaybackUrl = URL.createObjectURL(audioBlob);
    if (playback) {
        playback.src = speakingPlaybackUrl;
        playback.classList.remove('hidden');
    }

    if (!audioBlob.size) {
        setSpeakingRecorderState(false, "錄音沒有內容，請再試一次。");
        return;
    }
    await analyzeSpeakingAudio(audioBlob);
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function analyzeSpeakingAudio(audioBlob) {
    const target = document.getElementById('speaking-target')?.value.trim() || "";
    const examQuestion = document.getElementById('speaking-question')?.innerText.trim() || "";
    const scenarioSelect = document.getElementById('speaking-scenario');
    const scenario = scenarioSelect?.options[scenarioSelect.selectedIndex]?.text || "泰文口語";
    const feedbackCard = document.getElementById('speaking-feedback-card');
    const feedbackEl = document.getElementById('speaking-feedback');
    const scoreEl = document.getElementById('speaking-score');

    feedbackCard?.classList.remove('hidden');
    if (feedbackEl) feedbackEl.innerHTML = '<div class="animate-pulse text-teal-600">Gemini 正在聆聽及分析發音...</div>';
    if (scoreEl) scoreEl.innerText = "--/100";
    setSpeakingRecorderState(false, "AI 正在分析你的錄音...");

    try {
        const base64Audio = await blobToBase64(audioBlob);
        const normalizedMimeType = (audioBlob.type || 'audio/webm').split(';')[0];
        const prompt = `你是一位專業泰語發音教練，學生母語是廣東話。
練習情境：${scenario}
口試題目：${examQuestion}
學生可參考的起句：${target}

請仔細聆聽錄音，評估學生是否用泰文完整回答題目。只根據實際聽到的內容提供具體而友善的繁體中文回饋，不要假裝能確定錄音中無法判斷的細節，也不要聲稱這是官方 CU-TFL 分數。
請嚴格使用以下格式：
總分：0至100之間的整數/100
辨識結果：你實際聽到的泰文；如不清楚請明言
內容與切題：評論答案是否完整、有理由和例子
流暢與組織：評論停頓、連接詞及表達次序
發音：指出讀音、母音長短、尾音或聲調問題
三個優先改善：用簡潔條列列出
自然示範：提供一個更自然、更完整的泰文示範答案
再試提示：一句最重要的改善提示`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(geminiKey)}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    role: "user",
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType: normalizedMimeType, data: base64Audio } }
                    ]
                }],
                generationConfig: { temperature: 0.2 }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `Server returned ${response.status}`);
        }

        const data = await response.json();
        const feedback = data.candidates?.[0]?.content?.parts
            ?.map(part => part.text || "")
            .join("")
            .trim();
        if (!feedback) throw new Error("AI 沒有傳回分析結果，請再錄一次。");

        const scoreMatch = feedback.match(/總分[：:]\s*(\d{1,3})\s*\/\s*100/i);
        const score = scoreMatch ? Math.min(100, Number(scoreMatch[1])) : null;
        if (feedbackEl) feedbackEl.innerHTML = parseMarkdown(feedback);
        if (scoreEl) scoreEl.innerText = score === null ? "完成" : `${score}/100`;
        setSpeakingRecorderState(false, "分析完成！你可以聽回錄音，改善後再錄一次。");
        saveSpeakingAttempt({ target, scenario, score, feedback });
        if (typeof getCutflProgress === 'function' && typeof saveCutflProgress === 'function') {
            const progress = getCutflProgress();
            progress.speaking.attempted += 1;
            saveCutflProgress(progress);
        }
    } catch (error) {
        console.error('Speaking Analysis Error:', error);
        if (feedbackEl) feedbackEl.innerHTML = `<span class="text-rose-600">分析失敗：${escapeSpeakingHtml(error.message)}</span>`;
        setSpeakingRecorderState(false, "分析失敗，請檢查 API Key 或網絡後再試。");
    }
}

function escapeSpeakingHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getSpeakingHistory() {
    try {
        const history = JSON.parse(localStorage.getItem('thai_speaking_history') || '[]');
        return Array.isArray(history) ? history : [];
    } catch {
        return [];
    }
}

function saveSpeakingAttempt(attempt) {
    const history = getSpeakingHistory();
    history.unshift({ ...attempt, date: new Date().toISOString() });
    localStorage.setItem('thai_speaking_history', JSON.stringify(history.slice(0, 20)));
    renderSpeakingHistory();
}

function renderSpeakingHistory() {
    const container = document.getElementById('speaking-history');
    const empty = document.getElementById('speaking-history-empty');
    if (!container || !empty) return;
    const history = getSpeakingHistory();
    empty.classList.toggle('hidden', history.length > 0);
    container.innerHTML = history.map(item => {
        const date = new Date(item.date).toLocaleDateString('zh-HK', { month: 'short', day: 'numeric' });
        const score = item.score === null ? "完成" : `${item.score}/100`;
        return `<div class="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
            <div class="flex justify-between items-start gap-3">
                <div class="thai-font font-bold text-slate-800 line-clamp-2">${escapeSpeakingHtml(item.target)}</div>
                <span class="shrink-0 text-xs font-extrabold text-teal-700 bg-teal-100 px-2 py-1 rounded-full">${score}</span>
            </div>
            <div class="text-[10px] text-slate-400 mt-2">${escapeSpeakingHtml(item.scenario)} · ${date}</div>
        </div>`;
    }).join('');
}

function clearSpeakingHistory() {
    if (!confirm("確定要清除全部口語練習紀錄嗎？")) return;
    localStorage.removeItem('thai_speaking_history');
    renderSpeakingHistory();
}

// --- 11. ACTIVE RECALL PRACTICE QUIZ LOGIC ---

let currentQuizType = ""; // 'consonant', 'vocab', 'listening', 'tone'
let quizQuestions = [];
let currentQuestionIndex = 0;
let quizScore = 0;
let answeredCurrent = false;

function startQuiz(type) {
    currentQuizType = type;
    quizScore = 0;
    currentQuestionIndex = 0;
    quizQuestions = [];
    answeredCurrent = false;

    // Generate 10 random questions based on type
    if (type === 'consonant') {
        generateConsonantQuestions();
    } else if (type === 'vocab') {
        generateVocabQuestions();
    } else if (type === 'listening') {
        generateListeningQuestions();
    } else if (type === 'tone') {
        generateToneQuestions();
    }

    // Toggle views
    document.getElementById('quiz-selection').classList.add('hidden');
    document.getElementById('quiz-results').classList.add('hidden');
    document.getElementById('quiz-container').classList.remove('hidden');

    showQuestion();
}

function generateConsonantQuestions() {
    if (typeof thaiData === 'undefined' || !thaiData.consonants) return;
    // Shuffle consonants
    const shuffled = [...thaiData.consonants].sort(() => 0.5 - Math.random());
    // Take 10
    quizQuestions = shuffled.slice(0, 10).map(c => {
        const classChinese = c.class === 'mid' ? '中輔音 (Mid)' : c.class === 'high' ? '高輔音 (High)' : '低輔音 (Low)';
        return {
            type: "consonant",
            target: c.char,
            pronunciation: c.name,
            thaiName: c.thaiName,
            meaning: c.meaning,
            question: `輔音字母 <span class="font-bold text-rose-600 font-mono">${c.char}</span> (${c.thaiName} - ${c.name}) 屬於哪一個聲母類別？`,
            correctAnswer: classChinese,
            choices: ['中輔音 (Mid)', '高輔音 (High)', '低輔音 (Low)'],
            explanation: `${c.char} 代表 ${c.meaning} (${c.name})，它是 ${classChinese}。`
        };
    });
}

function generateVocabQuestions() {
    if (typeof vocabularyDataList === 'undefined' || vocabularyDataList.length === 0) return;
    
    const selectedCategory = document.getElementById('quiz-vocab-category')?.value || 'All';
    let filteredList = vocabularyDataList;
    if (selectedCategory !== 'All') {
        filteredList = vocabularyDataList.filter(v => v.category === selectedCategory);
    }
    
    const shuffled = [...filteredList].sort(() => 0.5 - Math.random());
    const countToTake = Math.min(10, shuffled.length);
    
    quizQuestions = shuffled.slice(0, countToTake).map(item => {
        // Find 3 incorrect answers
        const sameCat = vocabularyDataList.filter(v => v.category === item.category && v.thai !== item.thai);
        const pool = sameCat.length >= 3 ? sameCat : vocabularyDataList.filter(v => v.thai !== item.thai);
        const incorrect = pool.sort(() => 0.5 - Math.random()).slice(0, 3).map(i => i.traditional);
        
        // Combine and shuffle choices
        const choices = [item.traditional, ...incorrect].sort(() => 0.5 - Math.random());
        const pron = item.pronunciation ? ` (${item.pronunciation})` : '';

        return {
            type: "vocab",
            target: item.thai,
            pronunciation: item.pronunciation,
            question: `詞彙 <strong class="text-rose-600 font-mono text-4xl block my-2">${item.thai}</strong>${pron} 的中文翻譯是什麼？`,
            correctAnswer: item.traditional,
            choices: choices,
            explanation: `${item.thai}${pron} 的意思就是「${item.traditional}」。`
        };
    });
}

function getUniqueMeaningChoices(item, sourceList) {
    const preferredPool = sourceList.filter(v =>
        v.thai !== item.thai && v.traditional !== item.traditional
    );
    const fallbackPool = vocabularyDataList.filter(v =>
        v.thai !== item.thai && v.traditional !== item.traditional
    );
    const pool = preferredPool.length >= 3 ? preferredPool : fallbackPool;
    const incorrect = [];

    for (const candidate of [...pool].sort(() => 0.5 - Math.random())) {
        if (!incorrect.includes(candidate.traditional)) {
            incorrect.push(candidate.traditional);
        }
        if (incorrect.length === 3) break;
    }

    return [item.traditional, ...incorrect].sort(() => 0.5 - Math.random());
}

function generateListeningQuestions() {
    if (typeof vocabularyDataList === 'undefined' || vocabularyDataList.length === 0) return;

    const selectedCategory = document.getElementById('quiz-listening-category')?.value || 'All';
    const filteredList = selectedCategory === 'All'
        ? vocabularyDataList
        : vocabularyDataList.filter(v => v.category === selectedCategory);
    const eligible = filteredList.filter(v => v.thai && v.traditional);
    const shuffled = [...eligible].sort(() => 0.5 - Math.random());

    quizQuestions = shuffled.slice(0, Math.min(10, shuffled.length)).map(item => {
        const sameCategory = vocabularyDataList.filter(v => v.category === item.category);
        const pron = item.pronunciation ? ` (${item.pronunciation})` : '';
        return {
            type: 'listening',
            target: item.thai,
            pronunciation: item.pronunciation,
            question: '聽清楚泰文語音，揀出正確嘅中文意思。',
            correctAnswer: item.traditional,
            choices: getUniqueMeaningChoices(item, sameCategory),
            explanation: `你聽到的是 <strong class="thai-font text-lg">${item.thai}</strong>${pron}，意思是「${item.traditional}」。`
        };
    });
}

function generateToneQuestions() {
    const toneChoices = ['Mid Tone (中音 —)', 'Low Tone (低音 \\)', 'Falling Tone (落音 ^)', 'High Tone (高音 /)', 'Rising Tone (升音 /)'];
    
    // Create 10 scenarios
    const midConsonants = ["ก", "จ", "ด", "ต", "บ", "ป", "อ"];
    const highConsonants = ["ข", "ฉ", "ถ", "ผ", "ฝ", "ส", "ห"];
    const lowConsonants = ["ค", "ง", "ช", "ซ", "ท", "น", "พ", "ม", "ย", "ร", "ล", "ว"];

    for (let i = 0; i < 10; i++) {
        // Randomly choose class, mark, vowel, coda
        const randClass = ['mid', 'high', 'low'][Math.floor(Math.random() * 3)];
        let cons = "อ";
        let consClassText = "中輔音";
        if (randClass === 'mid') { cons = midConsonants[Math.floor(Math.random() * midConsonants.length)]; consClassText = "中輔音"; }
        else if (randClass === 'high') { cons = highConsonants[Math.floor(Math.random() * highConsonants.length)]; consClassText = "高輔音"; }
        else { cons = lowConsonants[Math.floor(Math.random() * lowConsonants.length)]; consClassText = "低輔音"; }

        // Randomly choose mark or no mark
        const hasMark = Math.random() > 0.5;
        let mark = "none";
        let markText = "無聲調符號";
        if (hasMark) {
            mark = ['ek', 'tho'][Math.floor(Math.random() * 2)]; // mid & high can use ek/tho, low can too
            if (randClass === 'mid' && Math.random() > 0.7) {
                mark = ['tri', 'jattawa'][Math.floor(Math.random() * 2)];
            }
            const markNames = { 'ek': 'Mai Ek ่', 'tho': 'Mai Tho ้', 'tri': 'Mai Tri ๊', 'jattawa': 'Mai Jattawa ๋' };
            markText = "含有 " + markNames[mark];
        }

        const vowel = ['short', 'long'][Math.floor(Math.random() * 2)];
        const vowelText = vowel === 'short' ? '短元音' : '長元音';

        // Coda: open, live, dead
        let coda = 'none';
        let codaText = "無尾音 (開音節)";
        if (mark === 'none') {
            coda = ['none', 'live', 'dead'][Math.floor(Math.random() * 3)];
            codaText = coda === 'none' ? `無尾音` : coda === 'live' ? '活尾音 (如 -n, -m)' : '死尾音 (如 -p, -t, -k)';
        }

        // Calculate answer
        const result = calculateToneInternal(randClass, cons, vowel, coda, mark);
        
        quizQuestions.push({
            type: "tone",
            target: cons + (mark === 'ek' ? '่' : mark === 'tho' ? '้' : mark === 'tri' ? '๊' : mark === 'jattawa' ? '๋' : ''),
            question: `<div class="space-y-2 text-left bg-slate-50 p-4 rounded-xl border border-slate-100 max-w-sm mx-auto">
                        <div>輔音：<strong class="text-rose-600 font-mono">${cons}</strong> (${consClassText})</div>
                        <div>元音：<strong>${vowelText}</strong></div>
                        <div>尾音：<strong>${codaText}</strong></div>
                        <div>符號：<strong>${markText}</strong></div>
                       </div>
                       <p class="text-base mt-4">請問這個拼讀組合，最終發音是什麼聲調？</p>`,
            correctAnswer: result.tone,
            choices: toneChoices,
            explanation: `根據聲調規則：<br>` + result.steps.join('<br>')
        });
    }
}

// Internal pure function to calculate tone for quiz generation
function calculateToneInternal(cls, consonant, vowel, coda, mark) {
    let steps = [];
    let tone = "Unknown";
    
    steps.push(`1. 輔音類別：${cls === 'mid' ? '中輔音' : cls === 'high' ? '高輔音' : '低輔音'}`);

    if (mark !== "none") {
        const markNames = { 'ek': 'Mai Ek ่', 'tho': 'Mai Tho ้', 'tri': 'Mai Tri ๊', 'jattawa': 'Mai Jattawa ๋' };
        steps.push(`2. 有聲調符號：${markNames[mark]} (優先套用符號規則)`);
        
        if (cls === "mid") {
            if (mark === "ek") { tone = "Low Tone (低音 \\)"; steps.push("3. 中輔音 + Mai Ek = 低音"); }
            else if (mark === "tho") { tone = "Falling Tone (落音 ^)"; steps.push("3. 中輔音 + Mai Tho = 落音"); }
            else if (mark === "tri") { tone = "High Tone (高音 /)"; steps.push("3. 中輔音 + Mai Tri = 高音"); }
            else if (mark === "jattawa") { tone = "Rising Tone (升音 /)"; steps.push("3. 中輔音 + Mai Jattawa = 升音"); }
        } else if (cls === "high") {
            if (mark === "ek") { tone = "Low Tone (低音 \\)"; steps.push("3. 高輔音 + Mai Ek = 低音"); }
            else if (mark === "tho") { tone = "Falling Tone (落音 ^)"; steps.push("3. 高輔音 + Mai Tho = 落音"); }
        } else { // low class
            if (mark === "ek") { tone = "Falling Tone (落音 ^)"; steps.push("3. 低輔音 + Mai Ek &rarr; 發音轉移為落音 (調高一聲)"); }
            else if (mark === "tho") { tone = "High Tone (高音 /)"; steps.push("3. 低輔音 + Mai Tho &rarr; 發音轉移為高音 (調高一聲)"); }
        }
    } else {
        steps.push(`2. 無聲調符號，需看音節性質`);
        let isLive = true;
        if (coda === "none") {
            if (vowel === "short") {
                isLive = false;
                steps.push("3. 無尾音 + 短元音 = 死音節 (Dead Syllable)");
            } else {
                isLive = true;
                steps.push("3. 無尾音 + 長元音 = 活音節 (Live Syllable)");
            }
        } else if (coda === "live") {
            isLive = true;
            steps.push("3. 含有活尾音 = 活音節 (Live Syllable)");
        } else if (coda === "dead") {
            isLive = false;
            steps.push("3. 含有死尾音 = 死音節 (Dead Syllable)");
        }

        if (cls === "mid") {
            if (isLive) { tone = "Mid Tone (中音 —)"; steps.push("4. 中輔音 + 活音節 = 中音 (自然原始音調)"); }
            else { tone = "Low Tone (低音 \\)"; steps.push("4. 中輔音 + 死音節 = 低音"); }
        } else if (cls === "high") {
            if (isLive) { tone = "Rising Tone (升音 /)"; steps.push("4. 高輔音 + 活音節 = 升音"); }
            else { tone = "Low Tone (低音 \\)"; steps.push("4. 高輔音 + 死音節 = 低音"); }
        } else { // low class
            if (isLive) { tone = "Mid Tone (中音 —)"; steps.push("4. 低輔音 + 活音節 = 中音 (自然原始音調)"); }
            else {
                if (vowel === "short") { tone = "High Tone (高音 /)"; steps.push("4. 低輔音 + 死音節 + 短元音 = 高音"); }
                else { tone = "Falling Tone (落音 ^)"; steps.push("4. 低輔音 + 死音節 + 長元音 = 落音"); }
            }
        }
    }
    return { tone, steps };
}

function showQuestion() {
    answeredCurrent = false;
    document.getElementById('quiz-feedback').classList.add('hidden');
    document.getElementById('quiz-next-btn').style.display = 'none';

    const q = quizQuestions[currentQuestionIndex];
    
    // Update progress and header
    document.getElementById('quiz-progress').innerText = `Question ${currentQuestionIndex + 1} of ${quizQuestions.length}`;
    document.getElementById('quiz-score-badge').innerText = `Score: ${quizScore}`;
    document.getElementById('quiz-progress-bar').style.width = `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%`;

    // Setup Target Card
    const targetEl = document.getElementById('quiz-target-character');
    const typeLabel = document.getElementById('quiz-type-label');
    const questionText = document.getElementById('quiz-question-text');
    const replayButton = document.getElementById('quiz-replay-audio');
    if (replayButton) replayButton.classList.toggle('hidden', q.type === 'tone');

    if (q.type === 'consonant') {
        typeLabel.innerText = "CONSONANT CLASS (子音字母分類)";
        targetEl.innerText = q.target;
        targetEl.classList.remove('hidden');
        questionText.innerHTML = q.question;
    } else if (q.type === 'vocab') {
        typeLabel.innerText = "VOCABULARY MATCH (詞彙含義配對)";
        targetEl.innerText = q.target;
        targetEl.classList.remove('hidden');
        questionText.innerHTML = q.question;
    } else if (q.type === 'listening') {
        typeLabel.innerText = "LISTENING CHALLENGE (聽力辨字)";
        targetEl.innerText = "🎧";
        targetEl.classList.remove('hidden');
        questionText.innerHTML = q.question;
    } else if (q.type === 'tone') {
        typeLabel.innerText = "TONE RULES MASTER (聲調判定規則)";
        targetEl.innerText = q.target;
        targetEl.classList.remove('hidden');
        questionText.innerHTML = q.question;
    }

    // Play TTS audio of the target character/word automatically if possible!
    if (q.type === 'vocab' || q.type === 'listening' || q.type === 'consonant') {
        playAudio(q.target);
    }

    // Render Option Buttons
    const optionsGrid = document.getElementById('quiz-options');
    optionsGrid.innerHTML = q.choices.map((choice, index) => {
        return `<button onclick="submitAnswerByIndex(${index})" class="quiz-option-btn w-full p-4 border-2 border-slate-100 hover:border-violet-500 hover:bg-violet-50 text-left font-bold text-slate-700 rounded-2xl transition duration-200">
            ${choice}
        </button>`;
    }).join('');
}

function submitAnswerByIndex(index) {
    const q = quizQuestions[currentQuestionIndex];
    if (!q || index < 0 || index >= q.choices.length) return;
    submitAnswer(q.choices[index]);
}

function submitAnswer(selected) {
    if (answeredCurrent) return;
    answeredCurrent = true;

    const q = quizQuestions[currentQuestionIndex];
    const isCorrect = selected === q.correctAnswer;

    if (isCorrect) {
        quizScore++;
        document.getElementById('quiz-score-badge').innerText = `Score: ${quizScore}`;
    }

    // Style feedback area
    const feedbackEl = document.getElementById('quiz-feedback');
    const emojiEl = document.getElementById('quiz-feedback-emoji');
    const titleEl = document.getElementById('quiz-feedback-title');
    const explanationEl = document.getElementById('quiz-feedback-explanation');

    feedbackEl.classList.remove('hidden');
    if (isCorrect) {
        feedbackEl.className = "p-4 rounded-2xl mb-8 border border-green-200 bg-green-50 text-green-800";
        emojiEl.innerText = "✅";
        titleEl.innerText = "Correct! (答對了！)";
    } else {
        feedbackEl.className = "p-4 rounded-2xl mb-8 border border-red-200 bg-red-50 text-red-800";
        emojiEl.innerText = "❌";
        titleEl.innerText = "Incorrect (答錯了)";
    }

    explanationEl.innerHTML = `<div class="font-bold text-sm mb-1">${isCorrect ? '太棒了！' : '正確答案是：' + q.correctAnswer}</div>
                               <div class="text-slate-600 text-xs leading-relaxed mt-1">${q.explanation}</div>`;

    // Highlight options
    document.querySelectorAll('.quiz-option-btn').forEach(btn => {
        btn.disabled = true;
        const text = btn.innerText.trim();
        if (text === q.correctAnswer) {
            btn.className = "quiz-option-btn w-full p-4 border-2 border-green-500 bg-green-50 text-green-700 font-bold text-left rounded-2xl transition duration-200";
        } else if (text === selected && !isCorrect) {
            btn.className = "quiz-option-btn w-full p-4 border-2 border-red-500 bg-red-50 text-red-700 font-bold text-left rounded-2xl transition duration-200";
        } else {
            btn.className = "quiz-option-btn w-full p-4 border border-slate-200 opacity-55 text-left text-slate-400 rounded-2xl cursor-not-allowed";
        }
    });

    // Show Next button
    document.getElementById('quiz-next-btn').style.display = 'flex';
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < quizQuestions.length) {
        showQuestion();
    } else {
        // Show results
        showResults();
    }
}

function showResults() {
    document.getElementById('quiz-container').classList.add('hidden');
    document.getElementById('quiz-results').classList.remove('hidden');

    const scorePct = Math.round((quizScore / quizQuestions.length) * 100);
    document.getElementById('results-score').innerText = `${quizScore}/${quizQuestions.length}`;
    document.getElementById('results-percentage').innerText = `${scorePct}%`;
    if (typeof getCutflProgress === 'function' && typeof saveCutflProgress === 'function') {
        const progress = getCutflProgress();
        progress.quiz.attempted += 1;
        progress.quiz.lastScore = scorePct;
        saveCutflProgress(progress);
    }

    const encouragementEl = document.getElementById('results-encouragement');
    if (scorePct === 100) {
        encouragementEl.innerText = "Wow! Perfect Score! 💯 Sawatdee khrap! You have absolute mastery over this section!";
    } else if (scorePct >= 80) {
        encouragementEl.innerText = "Excellent work! 🌟 You are building a very solid foundation in Thai and have excellent understanding of pronunciation and structure.";
    } else if (scorePct >= 50) {
        encouragementEl.innerText = "Good job! 👍 Keep practicing. Thai characters and tones can be quite tricky, but you are definitely getting the hang of it!";
    } else {
        encouragementEl.innerText = "Don't discourage! 💪 Learning Thai requires a lot of ear-training and repetition. Read through the guidelines again and try the quiz one more time!";
    }
}

function restartQuiz() {
    startQuiz(currentQuizType);
}

function exitQuiz() {
    document.getElementById('quiz-results').classList.add('hidden');
    document.getElementById('quiz-container').classList.add('hidden');
    document.getElementById('quiz-selection').classList.remove('hidden');
}
