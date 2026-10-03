const CUTFL_PROGRESS_KEY = 'cutfl_exam_progress';
const CUTFL_TARGET_DATE_KEY = 'cutfl_target_date';

let listeningIndex = 0;
let listeningAnswered = false;
let listeningPlayed = false;
let listeningSessionCorrect = 0;
let listeningSessionAnswered = 0;
let readingIndex = 0;
let readingAnswered = false;
let readingSessionCorrect = 0;
let readingSessionAnswered = 0;
let writingPromptIndex = -1;
let writingTimerSeconds = 3600;
let writingTimerHandle = null;

function getCutflProgress() {
    const fallback = {
        listening: { correct: 0, attempted: 0 },
        reading: { correct: 0, attempted: 0 },
        speaking: { attempted: 0 },
        writing: { attempted: 0, lastScore: null },
        quiz: { attempted: 0, lastScore: null }
    };
    try {
        const saved = JSON.parse(localStorage.getItem(CUTFL_PROGRESS_KEY) || '{}');
        return {
            listening: { ...fallback.listening, ...saved.listening },
            reading: { ...fallback.reading, ...saved.reading },
            speaking: { ...fallback.speaking, ...saved.speaking },
            writing: { ...fallback.writing, ...saved.writing },
            quiz: { ...fallback.quiz, ...saved.quiz }
        };
    } catch {
        return fallback;
    }
}

function saveCutflProgress(progress) {
    localStorage.setItem(CUTFL_PROGRESS_KEY, JSON.stringify(progress));
    updateCutflDashboard();
}

function recordCutflMultipleChoice(skill, isCorrect) {
    const progress = getCutflProgress();
    progress[skill].attempted += 1;
    if (isCorrect) progress[skill].correct += 1;
    saveCutflProgress(progress);
}

function accuracyText(skill) {
    if (!skill.attempted) return '尚未練習';
    return `${skill.correct}/${skill.attempted} · ${Math.round(skill.correct / skill.attempted * 100)}%`;
}

function updateCutflDashboard() {
    const progress = getCutflProgress();
    const listening = document.getElementById('dashboard-listening');
    const reading = document.getElementById('dashboard-reading');
    const speaking = document.getElementById('dashboard-speaking');
    const writing = document.getElementById('dashboard-writing');
    const writingAttempts = document.getElementById('writing-attempts');
    if (listening) listening.innerText = accuracyText(progress.listening);
    if (reading) reading.innerText = accuracyText(progress.reading);
    if (speaking) speaking.innerText = progress.speaking.attempted ? `已完成 ${progress.speaking.attempted} 次錄音` : '尚未練習';
    if (writing) {
        writing.innerText = progress.writing.attempted
            ? `已評改 ${progress.writing.attempted} 篇 · 最近 ${progress.writing.lastScore ?? '--'}分`
            : '尚未練習';
    }
    if (writingAttempts) writingAttempts.innerText = `${progress.writing.attempted} 次`;
}

function initializeCutflTargetDate() {
    const input = document.getElementById('cutfl-target-date');
    if (!input) return;
    input.value = localStorage.getItem(CUTFL_TARGET_DATE_KEY) || '2027-06-01';
    updateCutflDaysLeft();
}

function saveCutflTargetDate() {
    const value = document.getElementById('cutfl-target-date')?.value;
    if (value) localStorage.setItem(CUTFL_TARGET_DATE_KEY, value);
    updateCutflDaysLeft();
}

function updateCutflDaysLeft() {
    const value = document.getElementById('cutfl-target-date')?.value;
    const output = document.getElementById('cutfl-days-left');
    if (!value || !output) return;
    const target = new Date(`${value}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.ceil((target - today) / 86400000);
    output.innerText = days >= 0 ? `${days} 日` : '已到期';
}

function updateCutflNavigation(sectionId) {
    document.querySelectorAll('.cutfl-nav').forEach(button => {
        const active = button.dataset.section === sectionId;
        button.classList.remove('bg-slate-900', 'text-white', 'bg-violet-50', 'text-violet-700');
        button.classList.toggle('text-slate-600', !active);
        if (active) button.classList.add('bg-slate-900', 'text-white');
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function createAnswerButtons(container, options, onSelect) {
    if (!container) return;
    container.innerHTML = '';
    options.forEach((option, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'cutfl-answer w-full p-4 border-2 border-slate-100 hover:border-cyan-500 hover:bg-cyan-50 text-left rounded-2xl transition thai-font';
        button.innerText = `${index + 1}. ${option}`;
        button.addEventListener('click', () => onSelect(index, button));
        container.appendChild(button);
    });
}

function renderListeningQuestion() {
    const item = cutflListeningQuestions[listeningIndex];
    listeningAnswered = false;
    listeningPlayed = false;
    document.getElementById('listening-type').innerText = item.type;
    document.getElementById('listening-progress').innerText = `${listeningIndex + 1} / ${cutflListeningQuestions.length}`;
    document.getElementById('listening-question').innerText = item.question;
    document.getElementById('listening-play-status').innerText = '按下播放，然後回答問題';
    const playButton = document.getElementById('listening-play-btn');
    playButton.disabled = false;
    playButton.classList.remove('opacity-40');
    document.getElementById('listening-feedback').classList.add('hidden');
    document.getElementById('listening-next-btn').classList.add('hidden');
    createAnswerButtons(document.getElementById('listening-options'), item.options, answerListeningQuestion);
}

function playListeningAudio() {
    const item = cutflListeningQuestions[listeningIndex];
    const examMode = document.getElementById('listening-exam-mode')?.checked;
    if (examMode && listeningPlayed) return;
    listeningPlayed = true;
    playAudio(item.audio);
    document.getElementById('listening-play-status').innerText = examMode
        ? '播放中｜考試模式不可重播'
        : '播放中｜可按播放鍵重聽';
    if (examMode) {
        const button = document.getElementById('listening-play-btn');
        button.disabled = true;
        button.classList.add('opacity-40');
    }
}

function answerListeningQuestion(selected, selectedButton) {
    if (listeningAnswered) return;
    listeningAnswered = true;
    const item = cutflListeningQuestions[listeningIndex];
    const correct = selected === item.answer;
    listeningSessionAnswered += 1;
    if (correct) listeningSessionCorrect += 1;
    recordCutflMultipleChoice('listening', correct);
    showCutflAnswerResult('listening', item, selected, selectedButton, correct);
    document.getElementById('listening-session-score').innerText = `${listeningSessionCorrect} / ${listeningSessionAnswered}`;
}

function showCutflAnswerResult(prefix, item, selected, selectedButton, correct) {
    document.querySelectorAll(`#${prefix}-options .cutfl-answer`).forEach((button, index) => {
        button.disabled = true;
        if (index === item.answer) {
            button.className = 'cutfl-answer w-full p-4 border-2 border-emerald-500 bg-emerald-50 text-emerald-800 text-left rounded-2xl thai-font';
        } else if (button === selectedButton) {
            button.className = 'cutfl-answer w-full p-4 border-2 border-rose-500 bg-rose-50 text-rose-800 text-left rounded-2xl thai-font';
        } else {
            button.classList.add('opacity-40');
        }
    });
    const feedback = document.getElementById(`${prefix}-feedback`);
    feedback.className = `mt-5 p-4 rounded-2xl text-sm ${correct ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`;
    feedback.innerHTML = `<strong>${correct ? '答對了' : '答案不正確'}</strong><div class="mt-1">${item.explanation}</div>`;
    document.getElementById(`${prefix}-next-btn`).classList.remove('hidden');
}

function nextListeningQuestion() {
    listeningIndex = (listeningIndex + 1) % cutflListeningQuestions.length;
    renderListeningQuestion();
}

function resetListeningExercise() {
    window.speechSynthesis?.cancel();
    renderListeningQuestion();
}

function renderReadingQuestion() {
    const item = cutflReadingQuestions[readingIndex];
    readingAnswered = false;
    document.getElementById('reading-type').innerText = item.type;
    document.getElementById('reading-progress').innerText = `${readingIndex + 1} / ${cutflReadingQuestions.length}`;
    document.getElementById('reading-passage').innerText = item.passage;
    document.getElementById('reading-question').innerText = item.question;
    document.getElementById('reading-feedback').classList.add('hidden');
    document.getElementById('reading-next-btn').classList.add('hidden');
    createAnswerButtons(document.getElementById('reading-options'), item.options, answerReadingQuestion);
}

function answerReadingQuestion(selected, selectedButton) {
    if (readingAnswered) return;
    readingAnswered = true;
    const item = cutflReadingQuestions[readingIndex];
    const correct = selected === item.answer;
    readingSessionAnswered += 1;
    if (correct) readingSessionCorrect += 1;
    recordCutflMultipleChoice('reading', correct);
    showCutflAnswerResult('reading', item, selected, selectedButton, correct);
    document.getElementById('reading-session-score').innerText = `${readingSessionCorrect} / ${readingSessionAnswered}`;
}

function nextReadingQuestion() {
    readingIndex = (readingIndex + 1) % cutflReadingQuestions.length;
    renderReadingQuestion();
}

function newWritingPrompt() {
    const level = document.getElementById('writing-level')?.value || 'short';
    const prompts = cutflWritingPrompts[level];
    let next = Math.floor(Math.random() * prompts.length);
    if (prompts.length > 1 && next === writingPromptIndex) next = (next + 1) % prompts.length;
    writingPromptIndex = next;
    document.getElementById('writing-prompt').innerText = prompts[next].prompt;
    document.getElementById('writing-hint').innerText = prompts[next].hint;
}

function updateWritingCount() {
    const text = document.getElementById('writing-answer')?.value || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    document.getElementById('writing-count').innerText = `${text.length} 字元 · 約 ${words} 詞`;
}

function renderWritingTimer() {
    const minutes = Math.floor(writingTimerSeconds / 60);
    const seconds = writingTimerSeconds % 60;
    document.getElementById('writing-timer').innerText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function toggleWritingTimer() {
    const button = document.getElementById('writing-timer-btn');
    if (writingTimerHandle) {
        clearInterval(writingTimerHandle);
        writingTimerHandle = null;
        button.innerText = '繼續計時';
        return;
    }
    if (writingTimerSeconds <= 0) writingTimerSeconds = 3600;
    button.innerText = '暫停';
    writingTimerHandle = setInterval(() => {
        writingTimerSeconds -= 1;
        renderWritingTimer();
        if (writingTimerSeconds <= 0) {
            clearInterval(writingTimerHandle);
            writingTimerHandle = null;
            button.innerText = '重新計時';
            alert('60 分鐘寫作時間完結。');
        }
    }, 1000);
}

async function evaluateWriting() {
    const answer = document.getElementById('writing-answer')?.value.trim();
    const promptText = document.getElementById('writing-prompt')?.innerText || '';
    if (!answer || answer.length < 30) {
        alert('請先寫至少 30 個字元的泰文答案。');
        return;
    }
    if (!geminiKey) {
        alert('請先在右下角 Thai AI Assistant 輸入 Gemini API Key。');
        toggleChat();
        return;
    }

    const card = document.getElementById('writing-feedback-card');
    const feedbackElement = document.getElementById('writing-feedback');
    const scoreElement = document.getElementById('writing-score');
    const submitButton = document.getElementById('writing-submit-btn');
    card.classList.remove('hidden');
    feedbackElement.innerHTML = '<div class="animate-pulse text-rose-600">Gemini 正在按 CU-TFL 能力要求評改...</div>';
    scoreElement.innerText = '--/100';
    submitButton.disabled = true;
    submitButton.classList.add('opacity-50');

    const instruction = `你是泰語能力測驗寫作評核員。學生母語是廣東話。
題目：${promptText}
學生答案：
${answer}

請以繁體中文提供嚴謹但具體的回饋。不要聲稱這是官方 CU-TFL 分數。
嚴格使用以下格式：
練習分數：0至100的整數/100
切題與內容：評論立場、理由和例子
組織：評論段落及連接詞
語言：指出文法、拼字和用詞問題
三個優先改正：列出最重要的三項
修訂示例：保留原意，提供一個更自然的泰文版本
下一步：給一項可立即練習的任務`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(geminiKey)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: instruction }] }],
                generationConfig: { temperature: 0.2 }
            })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `Server returned ${response.status}`);
        }
        const data = await response.json();
        const feedback = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
        if (!feedback) throw new Error('AI 沒有傳回評語。');
        const scoreMatch = feedback.match(/練習分數[：:]\s*(\d{1,3})\s*\/\s*100/);
        const score = scoreMatch ? Math.min(100, Number(scoreMatch[1])) : null;
        feedbackElement.innerHTML = parseMarkdown(feedback);
        scoreElement.innerText = score === null ? '完成' : `${score}/100`;
        const progress = getCutflProgress();
        progress.writing.attempted += 1;
        progress.writing.lastScore = score;
        saveCutflProgress(progress);
    } catch (error) {
        feedbackElement.innerText = `評改失敗：${error.message}`;
        feedbackElement.classList.add('text-rose-600');
    } finally {
        submitButton.disabled = false;
        submitButton.classList.remove('opacity-50');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeCutflTargetDate();
    updateCutflDashboard();
    renderListeningQuestion();
    renderReadingQuestion();
    newWritingPrompt();
    renderWritingTimer();
});
