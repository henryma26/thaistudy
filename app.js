// --- Quick Tools Logic ---

function playQuickAudio() {
    const text = document.getElementById('quick-input').value.trim();
    if (text) {
        playAudio(text);
    } else {
        alert("Please enter some Thai text first!");
    }
}

function openGoogleTranslate() {
    const text = document.getElementById('quick-input').value.trim();
    if (text) {
        // Direct link to Google Translate with Thai as source and English as target
        const url = `https://translate.google.com/?sl=th&tl=en&text=${encodeURIComponent(text)}&op=translate`;
        window.open(url, '_blank');
    } else {
        // Just open Google Translate if input is empty
        window.open('https://translate.google.com/?sl=th&tl=en&op=translate', '_blank');
    }
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById(sectionId).classList.remove('hidden');
}

let voices = [];

function loadVoices() {
    voices = window.speechSynthesis.getVoices();
}

// Chrome loads voices asynchronously
if ('speechSynthesis' in window) {
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }
}

function playAudio(text) {
    if ('speechSynthesis' in window) {
        // Chrome fix: sometimes the speech engine gets stuck
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'th-TH';
        utterance.rate = 0.8;
        
        // Find a Thai voice
        if (voices.length === 0) {
            loadVoices();
        }
        
        const thaiVoice = voices.find(voice => voice.lang === 'th-TH' || voice.lang.includes('TH'));
        if (thaiVoice) {
            utterance.voice = thaiVoice;
        }

        // Error handling for Chrome
        utterance.onerror = (event) => {
            console.error('SpeechSynthesisUtterance error', event);
        };

        window.speechSynthesis.speak(utterance);
    } else {
        alert("Sorry, your browser does not support text-to-speech.");
    }
}

function createConsonantCard(consonant) {
    const colorClass = {
        'mid': 'bg-blue-50 border-blue-200 text-blue-700',
        'high': 'bg-red-50 border-red-200 text-red-700',
        'low': 'bg-green-50 border-green-200 text-green-700'
    }[consonant.class];

    return `
        <div onclick="playAudio('${consonant.char}')" class="p-4 border rounded-xl shadow-sm hover:shadow-md transition bg-white flex flex-col items-center text-center cursor-pointer group">
            <div class="flex gap-4 mb-2">
                <div class="flex flex-col items-center">
                    <span class="text-[10px] text-slate-400 uppercase font-bold">Traditional</span>
                    <div class="thai-font text-5xl group-hover:scale-110 transition-transform">${consonant.char}</div>
                </div>
                <div class="flex flex-col items-center">
                    <span class="text-[10px] text-slate-400 uppercase font-bold">Modern</span>
                    <div class="thai-modern text-5xl group-hover:scale-110 transition-transform">${consonant.char}</div>
                </div>
            </div>
            <div class="thai-font text-lg text-slate-600 mb-1 font-bold">${consonant.thaiName}</div>
            <div class="font-bold text-slate-400 text-xs mb-1">${consonant.name}</div>
            <div class="text-sm text-slate-500 italic">"${consonant.meaning}"</div>
            <div class="mt-2 px-2 py-0.5 text-[10px] uppercase font-bold rounded ${colorClass}">
                ${consonant.class} class
            </div>
        </div>
    `;
}

function createVowelCard(vowel) {
    const typeColor = {
        'short': 'bg-orange-50 text-orange-600 border-orange-100',
        'long': 'bg-purple-50 text-purple-600 border-purple-100',
        'special': 'bg-pink-50 text-pink-600 border-pink-100'
    }[vowel.type];

    // For vowels with placeholders (like เ-ะ), we might want to play just the sound
    // but for now, we'll send the whole string to the TTS
    const audioText = vowel.char.replace('-', 'ก'); // Replace placeholder with a consonant to make it pronounceable

    return `
        <div onclick="playAudio('${audioText}')" class="p-4 border rounded-xl shadow-sm hover:shadow-md transition bg-white flex flex-col items-center text-center cursor-pointer group">
            <div class="flex gap-4 mb-2">
                <div class="flex flex-col items-center">
                    <span class="text-[10px] text-slate-400 uppercase font-bold">Trad.</span>
                    <div class="thai-font text-5xl group-hover:scale-110 transition-transform">${vowel.char}</div>
                </div>
                <div class="flex flex-col items-center">
                    <span class="text-[10px] text-slate-400 uppercase font-bold">Mod.</span>
                    <div class="thai-modern text-5xl group-hover:scale-110 transition-transform">${vowel.char}</div>
                </div>
            </div>
            <div class="thai-font text-lg text-slate-600 mb-1 font-bold">${vowel.thaiName}</div>
            <div class="font-bold text-slate-400 text-xs mb-1">${vowel.name}</div>
            <div class="mt-2 px-2 py-0.5 text-[10px] uppercase font-bold rounded border ${typeColor}">
                ${vowel.type}
            </div>
        </div>
    `;
}

function createVocabCard(item) {
    return `
        <div class="perspective-1000 h-48 group cursor-pointer" onclick="this.querySelector('.card-inner').classList.toggle('rotate-y-180')">
            <div class="card-inner relative w-full h-full transition-transform duration-500 transform-style-3d">
                <!-- Front: Thai -->
                <div class="absolute inset-0 backface-hidden bg-white border-2 border-amber-100 rounded-2xl shadow-sm flex flex-col items-center justify-center p-4">
                    <div class="thai-font text-4xl mb-2 text-slate-800">${item.thai}</div>
                    <div class="text-xs text-slate-400 uppercase font-bold">${item.category}</div>
                    <div class="mt-4 text-[10px] text-amber-400 font-bold">CLICK TO FLIP</div>
                </div>
                <!-- Back: Chinese & Pronunciation -->
                <div class="absolute inset-0 backface-hidden bg-amber-50 border-2 border-amber-200 rounded-2xl shadow-sm flex flex-col items-center justify-center p-4 rotate-y-180">
                    <div class="text-3xl font-bold text-amber-800 mb-1">${item.traditional}</div>
                    <div class="text-slate-600 font-medium">${item.pronunciation}</div>
                    <button onclick="event.stopPropagation(); playAudio('${item.thai}')" class="mt-3 p-2 bg-white rounded-full shadow-sm hover:bg-amber-100 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', () => {
    const consonantsGrid = document.getElementById('consonants-grid');
    const vowelsGrid = document.getElementById('vowels-grid');
    const vocabGrid = document.getElementById('vocab-grid');

    thaiData.consonants.forEach(c => {
        consonantsGrid.innerHTML += createConsonantCard(c);
    });

    thaiData.vowels.forEach(v => {
        vowelsGrid.innerHTML += createVowelCard(v);
    });

    if (thaiData.vocabulary) {
        thaiData.vocabulary.forEach(item => {
            vocabGrid.innerHTML += createVocabCard(item);
        });
    }

    // Chat initialization
    checkApiKey();
});

// --- Chat & LLM Logic ---

let deepseekKey = localStorage.getItem('deepseek_api_key');

function toggleChat() {
    const window = document.getElementById('chat-window');
    window.classList.toggle('chat-hidden');
}

function checkApiKey() {
    const apiSetup = document.getElementById('api-setup');
    const chatMessages = document.getElementById('chat-messages');
    const chatInputArea = document.getElementById('chat-input-area');

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
    if (input.value.trim()) {
        deepseekKey = input.value.trim();
        localStorage.setItem('deepseek_api_key', deepseekKey);
        checkApiKey();
    }
}

async function sendMessage() {
    const input = document.getElementById('user-input');
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
        document.getElementById(loadingId).remove();
        appendMessage('assistant', assistantMessage);

    } catch (error) {
        console.error('AI Error:', error);
        document.getElementById(loadingId).innerText = "Error: " + error.message;
    }
}

function appendMessage(role, text, id = null) {
    const container = document.getElementById('chat-messages');
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
