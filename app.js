
let currentTopic = 'all';
let deck = [];
let currentIndex = 0;
let isFlipped = false;
let status = {}; // index -> 'know' | 'review'

function getFilteredDeck() {
  if (currentTopic === 'all') return [...WORDS];
  return WORDS.filter(w => w.t === currentTopic);
}

function buildTopics() {
  const grid = document.getElementById('topics-grid');
  TOPICS.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'topic-btn' + (t.id === 'all' ? ' active' : '');
    btn.textContent = t.label;
    btn.onclick = () => selectTopic(t.id);
    grid.appendChild(btn);
  });
}

function selectTopic(id) {
  currentTopic = id;
  document.querySelectorAll('.topic-btn').forEach((b,i) => {
    b.classList.toggle('active', TOPICS[i].id === id);
  });
  status = {};
  deck = getFilteredDeck();
  currentIndex = 0;
  isFlipped = false;
  document.getElementById('flashcard').classList.remove('flipped');
  renderCard();
  renderWordGrid();
  updateStats();
}

function renderCard() {
  if (!deck.length) return;
  const w = deck[currentIndex];
  const n = `${currentIndex + 1} / ${deck.length}`;
  const posText = w.pos ? ` <span class="word-pos">(${w.pos})</span>` : '';
  document.getElementById('card-word').innerHTML = w.en + posText;
  
  const ipaEl = document.getElementById('card-ipa');
  if(ipaEl) ipaEl.textContent = w.ipa || '';
  
  const ipaBackEl = document.getElementById('card-ipa-back');
  if(ipaBackEl) ipaBackEl.textContent = w.ipa || '';
  
  document.getElementById('card-meaning').textContent = w.vi;
  document.getElementById('card-english-sub').innerHTML = w.en + posText;
  document.getElementById('card-topic-tag').textContent = TOPIC_NAMES[w.t] || '';
  document.getElementById('card-topic-tag-back').textContent = TOPIC_NAMES[w.t] || '';
  document.getElementById('card-number').textContent = n;
  document.getElementById('card-number-back').textContent = n;

  const pct = deck.length > 1 ? (currentIndex / (deck.length - 1)) * 100 : 100;
  document.getElementById('progress-bar').style.width = pct + '%';
  document.getElementById('progress-text').textContent = n;

  document.getElementById('result-row').classList.remove('visible');
}

function flipCard() {
  isFlipped = !isFlipped;
  document.getElementById('flashcard').classList.toggle('flipped', isFlipped);
  if (isFlipped) {
    document.getElementById('result-row').classList.add('visible');
    if (autoSpeak) setTimeout(() => speakCurrent(), 200);
  } else {
    if (autoSpeak) setTimeout(() => speakCurrent(), 100);
  }
}

function nextCard() {
  if (currentIndex < deck.length - 1) {
    currentIndex++;
    isFlipped = false;
    document.getElementById('flashcard').classList.remove('flipped');
    renderCard();
    if (autoSpeak) setTimeout(() => speakCurrent(), 150);
  }
}

function prevCard() {
  if (currentIndex > 0) {
    currentIndex--;
    isFlipped = false;
    document.getElementById('flashcard').classList.remove('flipped');
    renderCard();
    if (autoSpeak) setTimeout(() => speakCurrent(), 150);
  }
}

function shuffleCards() {
  deck = deck.sort(() => Math.random() - 0.5);
  currentIndex = 0;
  isFlipped = false;
  document.getElementById('flashcard').classList.remove('flipped');
  renderCard();
  if (autoSpeak) setTimeout(() => speakCurrent(), 150);
}

function markCard(type) {
  const word = deck[currentIndex];
  const key = WORDS.indexOf(word);
  status[key] = type;
  updateStats();
  renderWordGrid();
  setTimeout(() => nextCard(), 300);
}

function updateStats() {
  const all = WORDS.length;
  let known = 0, review = 0;
  Object.values(status).forEach(v => { if(v==='know') known++; else review++; });
  document.getElementById('total-count').textContent = deck.length;
  document.getElementById('known-count').textContent = known;
  document.getElementById('review-count').textContent = review;
}

function renderWordGrid() {
  const q = document.getElementById('search-input').value.toLowerCase();
  const grid = document.getElementById('word-grid');
  const source = currentTopic === 'all' ? WORDS : WORDS.filter(w => w.t === currentTopic);
  const filtered = source.filter(w => w.en.toLowerCase().includes(q) || w.vi.toLowerCase().includes(q));
  grid.innerHTML = '';
  if (!filtered.length) {
    grid.innerHTML = '<div class="empty">Không tìm thấy từ nào.</div>';
    return;
  }
  filtered.forEach(w => {
    const idx = WORDS.indexOf(w);
    const s = status[idx];
    const div = document.createElement('div');
    div.className = 'word-item' + (s === 'know' ? ' known' : s === 'review' ? ' needs-review' : '');
    const gridPosText = w.pos ? ` <span class="grid-pos">(${w.pos})</span>` : '';
    div.innerHTML = `
      <div class="word-details">
        <div class="word-en-wrap">
          <span class="word-en">${w.en}</span>${gridPosText}
        </div>
        <span class="word-ipa">${w.ipa||''}</span>
        <span class="word-vi">${w.vi}</span>
      </div>
      <button class="speak-mini" title="Phát âm">🔊</button>
    `;
    div.querySelector('.speak-mini').onclick = (e) => { e.stopPropagation(); speak(w.en); };
    div.onclick = () => jumpToWord(w);
    grid.appendChild(div);
  });
}

function jumpToWord(w) {
  const idx = deck.indexOf(w);
  if (idx >= 0) {
    currentIndex = idx;
    isFlipped = false;
    document.getElementById('flashcard').classList.remove('flipped');
    renderCard();
    window.scrollTo({top: 0, behavior: 'smooth'});
  }
}

function filterWords() { renderWordGrid(); }

// keyboard nav
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') nextCard();
  else if (e.key === 'ArrowLeft') prevCard();
  else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flipCard(); }
  else if (e.key === 'k' || e.key === 'K') markCard('know');
  else if (e.key === 'r' || e.key === 'R') markCard('review');
  else if (e.key === 's' || e.key === 'S') speakCurrent();
});

// ── TOUCH SWIPE (mobile) ────────────────────────────────
(function() {
  const card = document.getElementById('flashcard');
  let startX = 0, startY = 0, dragging = false;
  const SWIPE_THRESHOLD = 50;

  card.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    dragging = true;
  }, { passive: true });

  card.addEventListener('touchend', e => {
    if (!dragging) return;
    dragging = false;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dy) > Math.abs(dx)) return;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    e.preventDefault();
    if (dx < 0) nextCard();
    else         prevCard();
  }, { passive: true });
})();

// ── TTS ENGINE ──────────────────────────────────────────
let voices = [];
let selectedVoice = null;
let autoSpeak = true;
let ttsUnlocked = false;

// Unlock audio on mobile devices on first touch
document.addEventListener('touchstart', unlockTTS, { once: true, passive: true });
document.addEventListener('click', unlockTTS, { once: true, passive: true });

function unlockTTS() {
  if (ttsUnlocked || !window.speechSynthesis) return;
  const utt = new SpeechSynthesisUtterance('');
  window.speechSynthesis.speak(utt);
  ttsUnlocked = true;
  // Try loading voices again after unlocking
  setTimeout(loadVoices, 500);
}

function loadVoices() {
  voices = window.speechSynthesis.getVoices();
  const sel = document.getElementById('voice-select');
  const enVoices = voices.filter(v => v.lang.startsWith('en'));
  
  if (!enVoices.length) {
    sel.innerHTML = '<option value="">Giọng Tiếng Anh (Hệ thống)</option>';
    sel._voices = [];
    selectedVoice = null;
    return;
  }
  
  sel.innerHTML = '';
  const preferred = ['Google US English','Google UK English Female','Microsoft Zira','Microsoft David','Samantha','Karen','Daniel'];
  const sorted = [
    ...enVoices.filter(v => preferred.some(p => v.name.includes(p.split(' ')[1] || p))),
    ...enVoices.filter(v => !preferred.some(p => v.name.includes(p.split(' ')[1] || p)))
  ];
  sorted.forEach((v, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${v.name} (${v.lang})`;
    sel.appendChild(opt);
  });
  const def = sorted.find(v => v.lang === 'en-US') || sorted.find(v => v.lang === 'en-GB') || sorted[0];
  selectedVoice = def;
  sel._voices = sorted;
  sel.value = sorted.indexOf(def);
}

function onVoiceChange() {
  const sel = document.getElementById('voice-select');
  if (sel._voices && sel._voices.length > 0) {
    selectedVoice = sel._voices[parseInt(sel.value)];
  } else {
    selectedVoice = null;
  }
}

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  if (selectedVoice) utt.voice = selectedVoice;
  utt.lang = selectedVoice ? selectedVoice.lang : 'en-US';
  utt.rate = 0.88;
  utt.pitch = 1;

  const btns = document.querySelectorAll('.speak-btn');
  btns.forEach(b => b.classList.add('speaking'));
  utt.onend = () => btns.forEach(b => b.classList.remove('speaking'));
  utt.onerror = () => btns.forEach(b => b.classList.remove('speaking'));

  window.speechSynthesis.speak(utt);
}

function speakCurrent() {
  if (!deck.length) return;
  speak(deck[currentIndex].en);
}

function toggleAutoSpeak() {
  autoSpeak = !autoSpeak;
  document.getElementById('auto-toggle').classList.toggle('on', autoSpeak);
}

if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();
}

// Init
buildTopics();
deck = [...WORDS];
renderCard();
renderWordGrid();
updateStats();
