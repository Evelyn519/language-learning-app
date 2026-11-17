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
    status.textContent = '目前無法在此瀏覽器保存進度。';
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
      <h1 tabindex="-1">讓英語成為<br>每天的習慣。</h1>
      <p>從學術單字開始，讀一篇英文短文，再用進階測驗檢查理解。</p>
      <a class="button primary" href="#words" data-action="start-words">開始學習 <span aria-hidden="true">→</span></a>
    </div>
    <div class="art" aria-hidden="true"><div class="art-card"><span class="eyebrow">ACADEMIC WORD</span>
      <strong>evidence</strong><small>noun · 證據</small></div>
      <div class="art-card secondary"><strong>draw a conclusion</strong><small>從線索得出結論</small></div></div>
  </section>
  <div class="section-heading"><h2>選擇練習</h2><span class="pill">目前程度 ${level}</span></div>
  <div class="cards">
    <a class="card" href="#words"><span class="card-icon" aria-hidden="true">Aa</span><h3>單字練習</h3><p>搜尋、聽發音，累積你已掌握的單字。</p></a>
    <a class="card" href="#reading"><span class="card-icon" aria-hidden="true">▤</span><h3>短文閱讀</h3><p>探索 B2–C1 英文短文，練習掌握論點。</p></a>
    <a class="card" href="#quiz"><span class="card-icon" aria-hidden="true">✓</span><h3>進階測驗</h3><p>練習推論、辨識作者立場與評估證據。</p></a>
  </div>
  <div class="stats" aria-label="學習統計">
    <div class="stat"><strong>7,000</strong>英文單字</div>
    <div class="stat"><strong>200</strong>學術重點字</div>
    <div class="stat"><strong>${mastered.size.toLocaleString()}</strong>已掌握</div>
  </div>
  ${latest ? '<div class="section-heading"><h2>最近一次測驗</h2><a href="#results">查看分數 →</a></div>' : ''}`;
}

function vocabulary() {
  return heading('VOCABULARY', '單字練習', '預設先練學術重點字。你可以依程度篩選，或直接搜尋全部單字。') + `
    <div class="toolbar">
      <label class="sr-only" for="search">搜尋單字</label>
      <input id="search" type="search" placeholder="搜尋英文單字，例如 evidence" value="${escapeHtml(search)}">
      <label><input id="only-level" type="checkbox" ${onlyLevel ? 'checked' : ''}>只顯示 ${level}</label>
    </div>
    <div class="toolbar" aria-label="單字篩選">
      ${[['academic','學術重點'],['all','全部單字'],['mastered','已掌握']].map(([key,label]) =>
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
  document.querySelector('#word-count').textContent = `共 ${matching.length.toLocaleString()} 個單字`;
  document.querySelector('#word-list').innerHTML = matching.slice(page * perPage, (page + 1) * perPage)
    .map(([word, [band, academic]]) => {
      const [part, definition, example] = window.dictionary[word];
      const known = mastered.has(word);
      return `<article class="panel word">
        <div><div class="pills"><span class="pill">${band}</span>
          ${academic ? '<span class="pill academic">學術重點</span>' : ''}</div>
          <h2 lang="en">${word}</h2>
          <p lang="en"><em class="muted">${escapeHtml(part)}</em> ${escapeHtml(definition)}</p>
          ${example ? `<p class="muted" lang="en">${escapeHtml(example)}</p>` : ''}
        </div>
        <div class="word-actions">
          <button data-action="speak" data-key="${word}" aria-label="播放 ${word} 的發音"><span aria-hidden="true">◖))</span> 發音</button>
          <button class="${known ? 'checked' : ''}" data-action="master" data-key="${word}" aria-pressed="${known}">
            ${known ? '✓ 已掌握' : '標記已掌握'}</button>
        </div>
      </article>`;
    }).join('') || '<p class="panel">沒有符合條件的單字。</p>';
  document.querySelector('#pagination').innerHTML = totalPages > 1 ? `
    <button data-action="page" data-key="-1" ${page === 0 ? 'disabled' : ''}>上一頁</button>
    <span>第 ${page + 1} / ${totalPages} 頁</span>
    <button data-action="page" data-key="1" ${page + 1 >= totalPages ? 'disabled' : ''}>下一頁</button>` : '';
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
    ${includeAction ? `<div class="actions"><a class="button primary" href="#quiz/${article.id}">做這篇測驗 →</a></div>` : ''}
  </article>`;
}

function reading() {
  const list = preferredReadings();
  const article = list.find(item => item.id === activeReading) || list[0];
  return heading('READING', '短文閱讀', '選一篇 B2 或 C1 短文，讀完後練習理解和分析。') +
    `<div class="read-layout"><div class="read-list" aria-label="選擇文章">
    ${list.map(item => `<button data-action="read" data-key="${item.id}" aria-pressed="${item === article}">
      <span class="pill">${item.level}</span> <strong lang="en">${item.title}</strong>
      <small class="muted">${item.summary}</small>
    </button>`).join('')}</div>${passage(article,true)}</div>`;
}

function quizList() {
  return heading('ASSESSMENT','進階測驗','每篇 4 題，包含推論、作者立場與批判思考。交卷後即可查看逐題解析。') +
    `<div class="cards">${preferredReadings().map(article => `
    <a class="card" href="#quiz/${article.id}">
      <span class="pill">${article.level}</span><h3 lang="en">${article.title}</h3>
      <p>${article.summary} <span aria-hidden="true">→</span></p>
    </a>`).join('')}</div>
    ${latest ? '<div class="section-heading"><a class="button" href="#results">查看最近分數</a></div>' : ''}`;
}

function quizView(article) {
  if (!quiz || quiz.id !== article.id) {
    quiz = {id: article.id, index: 0, answers: Array(article.questions.length).fill(null)};
  }
  const {index, answers} = quiz;
  const [type, prompt, options] = article.questions[index];
  const last = index === article.questions.length - 1;
  return heading('ASSESSMENT','閱讀測驗',`${article.level} · 可邊讀文章邊作答。`) +
    `<div class="quiz-layout">
      <form id="quiz-form" class="panel quiz-panel">
        <span class="pill">${type}</span>
        <h2>第 ${index + 1} / ${article.questions.length} 題</h2>
        <progress aria-label="測驗進度" value="${index + 1}" max="${article.questions.length}"></progress>
        <fieldset><legend id="question-title" lang="en" tabindex="-1">${prompt}</legend>
          ${options.map((option,i) => `<label class="option" lang="en">
            <input type="radio" name="answer" value="${i}" ${answers[index] === i ? 'checked' : ''}>
            <span>${option}</span></label>`).join('')}
        </fieldset>
        <div class="actions">
          <button type="button" data-action="previous" ${index ? '' : 'disabled'}>上一題</button>
          <button type="submit" class="primary" ${answers[index] === null ? 'disabled' : ''}>${last ? '交卷並看分數' : '下一題 →'}</button>
        </div>
      </form>
      ${passage(article,false)}
    </div>`;
}

function results() {
  const article = readings.find(item => item.id === latest?.id);
  if (!article || !Array.isArray(latest.answers)) {
    return heading('RESULTS','測驗結果','完成一篇測驗後，這裡會顯示分數與解析。') +
      '<a class="button primary" href="#quiz">選擇測驗</a>';
  }
  const correct = article.questions.filter((question,i) => question[3] === latest.answers[i]).length;
  const total = article.questions.length;
  return heading('RESULTS','測驗結果',`${article.level} · ${article.title}`) + `
    <div class="panel result">
      <p>本次成績</p><strong>${Math.round(100 * correct / total)} 分</strong><p>答對 ${correct}／${total} 題</p>
    </div>
    <div class="actions"><a class="button primary" href="#quiz/${article.id}" data-action="restart">再做一次</a>
      <a class="button" href="#quiz">選其他測驗</a></div>
    <div class="section-heading"><h2>逐題解析</h2></div>
    <div class="review">${article.questions.map(([type,prompt,options,answer,why],i) => {
      const selection = latest.answers[i];
      return `<article class="panel">
        <div class="pills"><span class="pill">${type}</span>
        <span class="${selection === answer ? 'correct' : 'incorrect'}">${selection === answer ? '答對' : '答錯'}</span></div>
        <h3 lang="en">${i + 1}. ${prompt}</h3>
        <p>你的答案 <span lang="en">${options[selection] ?? '—'}</span></p>
        <p>正確答案 <span lang="en">${options[answer]}</span></p><p class="muted">${why}</p></article>`;
    }).join('')}</div>`;
}

function credits() {
  return heading('CREDITS','教材來源','單字難度為本 app 的練習分級。') + `
    <div class="panel article">
      <h2>單字與閱讀</h2>
      <p>語料分級參考 <a href="https://cental.uclouvain.be/cefrlex/efllex/">EFLLex</a>（UCLouvain CENTAL，<a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>），並由本 app 補充分級與 C2 挑戰字。</p>
      <p>英語釋義節選自 <a href="https://github.com/wordset/wordset-dictionary">Wordset</a>（CC BY-SA 4.0，內含 WordNet 3.0。<a href="data/WORDSET-LICENSE.txt">授權全文</a>）。</p>
      <p>閱讀與測驗為原創教材。發音使用瀏覽器語音合成功能。</p>
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
    status.textContent = mastered.has(key) ? `已標記 ${key}` : `已取消標記 ${key}`;
    saveProgress();
    renderWords();
    (document.querySelector(`[data-action=master][data-key="${key}"]`) ||
      document.querySelector('#search')).focus({preventScroll:true});
  }
  if (action === 'speak') {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      status.textContent = '此瀏覽器無法播放發音。';
      control.textContent = '發音無法使用';
      return;
    }
    const utterance = new SpeechSynthesisUtterance(key);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    utterance.onerror = ({error}) => {
      if (error === 'interrupted' || error === 'canceled') return;
      status.textContent = '無法播放發音，請檢查瀏覽器的英語語音設定。';
      control.textContent = '發音無法使用';
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
