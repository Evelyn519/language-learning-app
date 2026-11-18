'use strict';

const app = document.querySelector('#app');
const levelSelect = document.querySelector('#level');
const status = document.querySelector('#status');
const levels = ['B1', 'B2', 'C1', 'C2'];
const words = Object.entries(window.wordLevels);
const readings = window.readings;
const perPage = 12;
const storageKey = 'wordwell-v1';

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || {};
  } catch {
    return {};
  }
}

const saved = loadProgress();
let level = levels.includes(saved.level) ? saved.level : 'B2';
const mastered = new Set(Array.isArray(saved.mastered)
  ? saved.mastered.filter(word => Object.hasOwn(window.wordLevels, word)) : []);
let latest = saved.latest || null;
let filter = 'academic';
let search = '';
let onlyLevel = false;
let page = 0;
let activeReading = null;
let quiz = null;
let currentView = '';

function saveProgress() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({level, mastered: [...mastered], latest}));
  } catch {
    status.textContent = 'Progress could not be saved in this browser.';
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function heading(category, title, subtitle) {
  return `<div class="page-head"><div class="eyebrow">${category}</div>
    <h1 tabindex="-1">${title}</h1><p class="subtitle">${subtitle}</p></div>`;
}

function home() {
  return `<section class="hero">
    <div><span class="eyebrow">ENGLISH STUDY CLUB</span>
      <h1 tabindex="-1">Make English<br>a daily habit.</h1>
      <p>Start with academic vocabulary, read a short passage, and test your understanding.</p>
      <a class="button primary" href="#words" data-action="start-words">Start learning <span aria-hidden="true">→</span></a>
    </div>
    <div class="art" aria-hidden="true"><div class="art-card"><span class="eyebrow">ACADEMIC WORD</span>
      <strong>evidence</strong><small>noun · support for a claim</small></div>
      <div class="art-card secondary"><strong>draw a conclusion</strong><small>reach a judgment based on evidence</small></div></div>
  </section>
  <div class="section-heading"><h2>Choose a practice activity</h2><span class="pill">Your level ${level}</span></div>
  <div class="cards">
    <a class="card" href="#words"><span class="card-icon" aria-hidden="true">Aa</span><h3>Vocabulary practice</h3><p>Find words, listen to pronunciations, and keep track of the words you know.</p></a>
    <a class="card" href="#reading"><span class="card-icon" aria-hidden="true">▤</span><h3>Short readings</h3><p>Read short B2–C1 passages and identify their main arguments.</p></a>
    <a class="card" href="#quiz"><span class="card-icon" aria-hidden="true">✓</span><h3>Advanced quizzes</h3><p>Draw inferences, identify the author’s stance, and evaluate evidence.</p></a>
  </div>
  <div class="stats" aria-label="Learning statistics">
    <div class="stat"><strong>7,000</strong>English words</div>
    <div class="stat"><strong>200</strong>Priority academic words</div>
    <div class="stat"><strong>${mastered.size.toLocaleString()}</strong>Mastered</div>
  </div>
  ${latest ? '<div class="section-heading"><h2>Latest quiz</h2><a href="#results">View score →</a></div>' : ''}`;
}

function vocabulary() {
  return heading('VOCABULARY', 'Vocabulary practice', 'Start with priority academic words. Filter by level or search the full library.') + `
    <div class="toolbar">
      <label class="sr-only" for="search">Search vocabulary</label>
      <input id="search" type="search" placeholder="Search for a word, e.g. evidence" value="${escapeHtml(search)}">
      <label><input id="only-level" type="checkbox" ${onlyLevel ? 'checked' : ''}>Show only ${level}</label>
    </div>
    <div class="toolbar" aria-label="Vocabulary filters">
      ${[['academic','Academic words'],['all','All words'],['mastered','Mastered']].map(([key,label]) =>
        `<button class="seg" data-action="filter" data-key="${key}" aria-pressed="${filter === key}">${label}</button>`).join('')}
    </div>
    <p id="word-count" class="muted" aria-live="polite"></p>
    <div id="word-list" class="word-list"></div>
    <div id="pagination" class="pagination"></div>`;
}

function renderWords() {
  const query = search.trim().toLowerCase();
  const matching = words.filter(([word, [band, academic]]) =>
    (!onlyLevel || band === level) &&
    (query || filter !== 'academic' || academic) &&
    (filter !== 'mastered' || mastered.has(word)) &&
    (!query || word.includes(query)));
  matching.sort(([a, [bandA, academicA]], [b, [bandB, academicB]]) =>
    Number(b === query) - Number(a === query) ||
    Number(mastered.has(a)) - Number(mastered.has(b)) ||
    academicB - academicA ||
    Number(bandB === level) - Number(bandA === level));
  const totalPages = Math.max(1, Math.ceil(matching.length / perPage));
  page = Math.min(page, totalPages - 1);
  document.querySelector('#word-count').textContent = `${matching.length.toLocaleString()} ${matching.length === 1 ? 'word' : 'words'}`;
  document.querySelector('#word-list').innerHTML = matching.slice(page * perPage, (page + 1) * perPage)
    .map(([word, [band, academic]]) => {
      const [part, definition, example] = window.dictionary[word];
      const known = mastered.has(word);
      return `<article class="panel word">
        <div><div class="pills"><span class="pill">${band}</span>
          ${academic ? '<span class="pill academic">Academic words</span>' : ''}</div>
          <h2 lang="en">${word}</h2>
          <p lang="en"><em class="muted">${escapeHtml(part)}</em> ${escapeHtml(definition)}</p>
          ${example ? `<p class="muted" lang="en">${escapeHtml(example)}</p>` : ''}
        </div>
        <div class="word-actions">
          <button data-action="speak" data-key="${word}" aria-label="Play pronunciation for ${word}"><span aria-hidden="true">◖))</span> Listen</button>
          <button class="${known ? 'checked' : ''}" data-action="master" data-key="${word}" aria-pressed="${known}">
            ${known ? '✓ Mastered' : 'Mark as mastered'}</button>
        </div>
      </article>`;
    }).join('') || '<p class="panel">No words match your filters.</p>';
  document.querySelector('#pagination').innerHTML = totalPages > 1 ? `
    <button data-action="page" data-key="-1" ${page === 0 ? 'disabled' : ''}>Previous page</button>
    <span>Page ${page + 1} of ${totalPages}</span>
    <button data-action="page" data-key="1" ${page + 1 >= totalPages ? 'disabled' : ''}>Next page</button>` : '';
}

function preferredReadings() {
  const preferred = levels.indexOf(level) < 2 ? 'B2' : 'C1';
  return [...readings].sort((a,b) => Number(b.level === preferred) - Number(a.level === preferred));
}

function passage(article, includeAction) {
  return `<article class="panel article">
    <div class="pills"><span class="pill">${article.level}</span><span class="pill academic">${article.topic}</span></div>
    <h2 lang="en">${article.title}</h2>
    <div lang="en">${article.paragraphs.map(p => `<p>${p}</p>`).join('')}</div>
    ${includeAction ? `<div class="actions"><a class="button primary" href="#quiz/${article.id}">Take this quiz →</a></div>` : ''}
  </article>`;
}

function reading() {
  const list = preferredReadings();
  const article = list.find(item => item.id === activeReading) || list[0];
  return heading('READING', 'Short readings', 'Choose a B2 or C1 passage and practise interpreting its ideas and arguments.') +
    `<div class="read-layout"><div class="read-list" aria-label="Choose a passage">
    ${list.map(item => `<button data-action="read" data-key="${item.id}" aria-pressed="${item === article}">
      <span class="pill">${item.level}</span> <strong lang="en">${item.title}</strong>
      <small class="muted">${item.summary}</small>
    </button>`).join('')}</div>${passage(article,true)}</div>`;
}

function quizList() {
  return heading('ASSESSMENT','Advanced quizzes','Each quiz has four questions on skills such as inference, author’s stance, and critical thinking. Submit to review each answer.') +
    `<div class="cards">${preferredReadings().map(article => `
    <a class="card" href="#quiz/${article.id}">
      <span class="pill">${article.level}</span><h3 lang="en">${article.title}</h3>
      <p>${article.summary} <span aria-hidden="true">→</span></p>
    </a>`).join('')}</div>
    ${latest ? '<div class="section-heading"><a class="button" href="#results">View latest score</a></div>' : ''}`;
}

function quizView(article) {
  if (!quiz || quiz.id !== article.id) {
    quiz = {id: article.id, index: 0, answers: Array(article.questions.length).fill(null)};
  }
  const {index, answers} = quiz;
  const [type, prompt, options] = article.questions[index];
  const last = index === article.questions.length - 1;
  return heading('ASSESSMENT','Reading quiz',`${article.level} · Refer to the passage as you answer.`) +
    `<div class="quiz-layout">
      <form id="quiz-form" class="panel quiz-panel">
        <span class="pill">${type}</span>
        <h2>Question ${index + 1} of ${article.questions.length}</h2>
        <progress aria-label="Quiz progress" value="${index + 1}" max="${article.questions.length}"></progress>
        <fieldset><legend id="question-title" lang="en" tabindex="-1">${prompt}</legend>
          ${options.map((option,i) => `<label class="option" lang="en">
            <input type="radio" name="answer" value="${i}" ${answers[index] === i ? 'checked' : ''}>
            <span>${option}</span></label>`).join('')}
        </fieldset>
        <div class="actions">
          <button type="button" data-action="previous" ${index ? '' : 'disabled'}>Previous</button>
          <button type="submit" class="primary" ${answers[index] === null ? 'disabled' : ''}>${last ? 'Submit and view score' : 'Next question →'}</button>
        </div>
      </form>
      ${passage(article,false)}
    </div>`;
}

function results() {
  const article = readings.find(item => item.id === latest?.id);
  if (!article || !Array.isArray(latest.answers)) {
    return heading('RESULTS','Quiz results','Complete a quiz to see your score and answer explanations.') +
      '<a class="button primary" href="#quiz">Choose a quiz</a>';
  }
  const correct = article.questions.filter((question,i) => question[3] === latest.answers[i]).length;
  const total = article.questions.length;
  return heading('RESULTS','Quiz results',`${article.level} · ${article.title}`) + `
    <div class="panel result">
      <p>Your score</p><strong>${Math.round(100 * correct / total)}%</strong><p>${correct} of ${total} correct</p>
    </div>
    <div class="actions"><a class="button primary" href="#quiz/${article.id}" data-action="restart">Try again</a>
      <a class="button" href="#quiz">Choose another quiz</a></div>
    <div class="section-heading"><h2>Answer review</h2></div>
    <div class="review">${article.questions.map(([type,prompt,options,answer,why],i) => {
      const selection = latest.answers[i];
      return `<article class="panel">
        <div class="pills"><span class="pill">${type}</span>
        <span class="${selection === answer ? 'correct' : 'incorrect'}">${selection === answer ? 'Correct' : 'Incorrect'}</span></div>
        <h3 lang="en">${i + 1}. ${prompt}</h3>
        <p>Your answer: <span lang="en">${options[selection] ?? '—'}</span></p>
        <p>Correct answer: <span lang="en">${options[answer]}</span></p><p class="muted">${why}</p></article>`;
    }).join('')}</div>`;
}

function credits() {
  return heading('CREDITS','Learning resources','Vocabulary levels are study recommendations.') + `
    <div class="panel article">
      <h2>Vocabulary and reading</h2>
      <p>Vocabulary levels draw on <a href="https://cental.uclouvain.be/cefrlex/efllex/">EFLLex</a> (UCLouvain CENTAL, <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>), with additional level assignments and C2 challenge words.</p>
      <p>English definitions are adapted from <a href="https://github.com/wordset/wordset-dictionary">Wordset</a> (CC BY-SA 4.0, including WordNet 3.0). <a href="data/WORDSET-LICENSE.txt">Full licence notice</a>.</p>
      <p>The readings and quizzes are original. Pronunciation uses your browser’s speech synthesis.</p>
    </div>`;
}

function route(focus = false) {
  const [view, id] = (location.hash.slice(1) || 'home').split('/');
  const article = readings.find(item => item.id === id);
  const views = {
    home, words: vocabulary, reading, quiz: article ? () => quizView(article) : quizList,
    results, credits
  };
  currentView = Object.hasOwn(views, view) ? view : 'home';
  app.innerHTML = views[currentView]();
  if (currentView === 'words') renderWords();
  document.querySelectorAll('[data-tab]').forEach(tab => {
    const selected = tab.dataset.tab === currentView || (currentView === 'results' && tab.dataset.tab === 'quiz');
    if (selected) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  });
  if (focus) {
    app.querySelector('h1').focus({preventScroll: true});
    window.scrollTo(0, 0);
  }
}

levelSelect.value = level;
levelSelect.addEventListener('change', () => {
  level = levelSelect.value;
  page = 0;
  onlyLevel = true;
  activeReading = null;
  saveProgress();
  route();
});

app.addEventListener('input', event => {
  if (event.target.id === 'search') {
    search = event.target.value;
    page = 0;
    renderWords();
  }
});

app.addEventListener('change', event => {
  if (event.target.id === 'only-level') {
    onlyLevel = event.target.checked;
    page = 0;
    renderWords();
  }
  if (event.target.name === 'answer' && quiz) {
    quiz.answers[quiz.index] = Number(event.target.value);
    document.querySelector('#quiz-form [type=submit]').disabled = false;
  }
});

function focusQuestion() {
  document.querySelector('#question-title')?.focus();
}

app.addEventListener('submit', event => {
  if (event.target.id !== 'quiz-form') return;
  event.preventDefault();
  if (quiz.answers[quiz.index] === null) return;
  if (quiz.index + 1 < quiz.answers.length) {
    quiz.index += 1;
    route();
    focusQuestion();
  } else {
    latest = {id: quiz.id, answers: [...quiz.answers]};
    quiz = null;
    saveProgress();
    location.hash = 'results';
  }
});

app.addEventListener('click', event => {
  const control = event.target.closest('[data-action]');
  if (!control) return;
  const {action, key} = control.dataset;
  if (action === 'start-words') {
    filter = 'academic';
    search = '';
    page = 0;
  }
  if (action === 'filter') {
    filter = key;
    search = '';
    document.querySelector('#search').value = '';
    page = 0;
    document.querySelectorAll('[data-action=filter]').forEach(button =>
      button.setAttribute('aria-pressed', String(button === control)));
    renderWords();
  }
  if (action === 'page') {
    page += Number(key);
    renderWords();
    document.querySelector('#word-count').scrollIntoView({block:'start'});
    (document.querySelector(`[data-action=page][data-key="${key}"]:enabled`) ||
      document.querySelector('[data-action=page]:enabled'))?.focus({preventScroll:true});
  }
  if (action === 'master') {
    if (mastered.has(key)) mastered.delete(key);
    else mastered.add(key);
    status.textContent = mastered.has(key) ? `Marked ${key} as mastered` : `Removed ${key} from mastered words`;
    saveProgress();
    renderWords();
    (document.querySelector(`[data-action=master][data-key="${key}"]`) ||
      document.querySelector('#search')).focus({preventScroll:true});
  }
  if (action === 'speak') {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      status.textContent = 'Pronunciation is unavailable in this browser.';
      control.textContent = 'Audio unavailable';
      return;
    }
    const utterance = new SpeechSynthesisUtterance(key);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    utterance.onerror = ({error}) => {
      if (error === 'interrupted' || error === 'canceled') return;
      status.textContent = 'Check your browser’s English voice settings to play pronunciations.';
      control.textContent = 'Audio unavailable';
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
  if (action === 'read') {
    activeReading = key;
    route();
    document.querySelector(`[data-action=read][data-key="${key}"]`)?.focus();
  }
  if (action === 'previous') {
    quiz.index -= 1;
    route();
    focusQuestion();
  }
  if (action === 'restart') quiz = null;
});

window.addEventListener('hashchange', () => route(true));
route();
