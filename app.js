// --- 1. CONFIGURATION ---
let GOOGLE_SHEET_CSV_URL = ''; // Paste your link here later

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
                    <div class="thai-font text-4xl mb-2 text-slate-800">${item.thai}</div>
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

async function loadVocabulary() {
    if (GOOGLE_SHEET_CSV_URL) {
        try {
            const res = await fetch(GOOGLE_SHEET_CSV_URL);
            const csv = await res.text();
            vocabularyData = csv.split('\n').slice(1).map(row => {
                const cols = row.split(',');
                return cols.length >= 4 ? { thai: cols[0].trim(), traditional: cols[1].trim(), pronunciation: cols[2].trim(), category: cols[3].trim() } : null;
            }).filter(i => i && i.thai);
        } catch (e) { 
            console.error("Sheet load failed", e); 
        }
    }
    
    // Fallback to local data if sheet empty or failed
    if (vocabularyData.length === 0 && typeof vocabularyDataList !== 'undefined') {
        vocabularyData = vocabularyDataList;
    }

    initCategoryChips();
    renderVocab();
}

function filterVocab() {
    const query = (document.getElementById('vocab-search').value || "").toLowerCase();
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
});
