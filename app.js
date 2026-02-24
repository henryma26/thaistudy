// --- 1. CONFIGURATION ---
// We are using vocabulary.js for data storage to avoid browser CORS issues.

// --- 2. CORE UI LOGIC ---
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(sectionId);
    if (target) target.classList.remove('hidden');
}

// --- 3. AUDIO LOGIC ---
let voices = [];
function loadVoices() { 
    voices = window.speechSynthesis.getVoices(); 
}
if ('speechSynthesis' in window) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
}

function playAudio(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'th-TH';
    utterance.rate = 0.8;
    const thaiVoice = voices.find(v => v.lang.includes('TH'));
    if (thaiVoice) utterance.voice = thaiVoice;
    window.speechSynthesis.speak(utterance);
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

function loadVocabulary() {
    // Load from the global vocabularyDataList defined in vocabulary.js
    if (typeof vocabularyDataList !== 'undefined') {
        vocabularyData = vocabularyDataList;
        initCategoryChips();
        renderVocab();
    } else {
        console.error("vocabularyDataList not found. Make sure vocabulary.js is loaded.");
        const grid = document.getElementById('vocab-grid');
        if (grid) grid.innerHTML = '<p class="col-span-full text-center text-red-500">Error: Vocabulary data file not found.</p>';
    }
}

function filterVocab() {
    const query = (document.getElementById('vocab-search').value || "").toLowerCase().trim();
    document.querySelectorAll('.vocab-card').forEach(card => {
        const matchSearch = card.dataset.thai.toLowerCase().includes(query) || 
                          card.dataset.trad.toLowerCase().includes(query) || 
                          card.dataset.pron.toLowerCase().includes(query);
        const matchCat = activeCategory === 'All' || card.dataset.cat === activeCategory;
        card.classList.toggle('hidden', !(matchSearch && matchCat));
    });
    
    // Update count display
    const visibleCount = document.querySelectorAll('.vocab-card:not(.hidden)').length;
    const countDisplay = document.getElementById('vocab-count-display');
    if (countDisplay) {
        countDisplay.innerText = `Showing ${visibleCount} of ${vocabularyData.length} words`;
    }
}

function renderVocab() {
    const grid = document.getElementById('vocab-grid');
    if (!grid) return;
    grid.innerHTML = vocabularyData.map(item => createVocabCard(item)).join('');
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

let deepseekKey = localStorage.getItem('deepseek_api_key');

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

    if (deepseekKey) {
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
        deepseekKey = input.value.trim();
        localStorage.setItem('deepseek_api_key', deepseekKey);
        checkApiKey();
    }
}

async function sendMessage() {
    const input = document.getElementById('user-input');
    if (!input) return;
    const message = input.value.trim();
    if (!message) return;

    // Add user message to UI
    appendMessage('user', message);
    input.value = '';

    // Add loading indicator
    const loadingId = 'loading-' + Date.now();
    appendMessage('assistant', 'Thinking...', loadingId);

    try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${deepseekKey}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system", 
                        content: "You are a helpful Thai language tutor. The user is a beginner studying for a professional Thai exam. Explain grammar, words, and tones clearly in Cantonese (using Traditional Chinese characters). Use Thai script where helpful."
                    },
                    { role: "user", content: message }
                ]
            })
        });

        const data = await response.json();
        
        if (data.error) throw new Error(data.error.message);
        
        const assistantMessage = data.choices[0].message.content;
        
        // Remove loading and add response
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();
        appendMessage('assistant', assistantMessage);

    } catch (error) {
        console.error('AI Error:', error);
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.innerText = "Error: " + error.message;
    }
}

function appendMessage(role, text, id = null) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const msgDiv = document.createElement('div');
    
    if (id) msgDiv.id = id;
    
    if (role === 'user') {
        msgDiv.className = 'bg-white border p-3 rounded-lg rounded-tr-none ml-8 text-sm shadow-sm';
    } else {
        msgDiv.className = 'bg-blue-100 p-3 rounded-lg rounded-tl-none mr-8 text-sm text-blue-800 shadow-sm markdown-content';
    }
    
    msgDiv.innerText = text;
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
