'use strict';

const app = document.querySelector('#app');
const levelSelect = document.querySelector('#level');
const languageSelect = document.querySelector('#language');
const status = document.querySelector('#status');
const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
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
let language = saved.language === 'zh-Hant' ? 'zh-Hant' : 'en';

function t(english, chinese) {
  return language === 'zh-Hant' ? chinese : english;
}

function updateLanguage() {
  document.documentElement.lang = language;
  languageSelect.value = language;
  document.title = t('Wordwell · English Learning', 'Wordwell · 英語學習');
  document.querySelector('meta[name="description"]').content = t(
    'Build your English skills with academic vocabulary, short readings, and advanced quizzes.',
    '透過學術單字、英文短文與進階測驗，建立自己的英語學習進度。'
  );
  const labels = {
    '.brand-caption': t('English Learning', '英語學習'),
    '[data-tab="home"]': t('Home', '首頁'),
    '[data-tab="words"]': t('Vocabulary', '單字'),
    '[data-tab="reading"]': t('Reading', '閱讀'),
    '[data-tab="quiz"]': t('Quizzes', '測驗'),
    '#level-label': t('Study level', '學習程度'),
    '#language-label': t('Language', '介面語言'),
    'footer a': t('Learning resources', '教材來源')
  };
  for (const [selector, label] of Object.entries(labels)) {
    document.querySelector(selector).textContent = label;
  }
  document.querySelector('nav').setAttribute('aria-label', t('Main navigation', '主要導覽'));
}

const questionTypes = {
  Inference: '推論',
  'Author’s stance': '作者立場',
  'Critical thinking': '批判思考',
  'Reading for detail': '細節理解',
  'Argument structure': '論證結構'
};

let level = levels.includes(saved.level) ? saved.level : 'B2';
const mastered = new Set(Array.isArray(saved.mastered)
  ? saved.mastered.filter(word => Object.hasOwn(window.wordLevels, word)) : []);
let latest = saved.latest || null;
let filter = defaultWordFilter();
let search = '';
let onlyLevel = isBeginner();
let page = 0;
let activeReading = null;
let quiz = null;
let currentView = '';
const warmupAnswers = new Map();
const warmups = {
  A1: {
    text: 'Ben has a dog. Its name is Max. On Sunday, Ben and Max go to the park.',
    question: 'Where do Ben and Max go on Sunday?',
    options: ['To school.', 'To the park.', 'To the shop.'],
    answer: 1,
    explanation: ['The last sentence says they go to the park.', '最後一句說他們去公園。']
  },
  A2: {
    text: 'Emma usually walks to work. This morning it was raining, so she took the bus. She got to work ten minutes earlier than usual.',
    question: 'Why did Emma take the bus this morning?',
    options: ['She had a new job.', 'Her bus was early.', 'It was raining.'],
    answer: 2,
    explanation: ['The passage gives the rain as the reason she took the bus.', '文章說，下雨是她今天搭公車的原因。']
  },
  B2: {
    text: 'A bakery began selling unsold bread in mixed bags at the end of the day. Customers could not choose what went into each bag, but the bags cost less than buying the bread separately. After a month, the bakery was throwing away much less bread.',
    question: 'What can you infer about customers who bought the mixed bags?',
    options: ['They needed the same kind of bread each day.', 'They accepted less choice in exchange for a lower price.', 'They paid extra to choose their bread.'],
    answer: 1,
    explanation: ['Customers could not choose the contents, but the bags were cheaper. The price gave them a reason to accept less choice.', '顧客不能挑選袋中的麵包，但可以用更低的價格購買，因此願意接受較少的選擇。']
  },
  C1: {
    text: 'An office reported a 30% reduction in printing after it began charging for each page. In the same month, two large teams moved to another building. The report described the fee as the cause of the entire reduction.',
    question: 'Which comparison would best test the report’s claim?',
    options: ['Compare the prices of different printers.', 'Ask the departing teams which paper they preferred.', 'Compare printing per employee among the teams that stayed, before and after the fee.'],
    answer: 2,
    explanation: ['Looking at the same teams over time helps separate a change in printing habits from the effect of having fewer people in the office.', '前後比較同一批員工的人均列印量，有助於區分列印習慣的改變，以及辦公室人數減少的影響。']
  }
};

function saveProgress() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({language, level, mastered: [...mastered], latest}));
  } catch {
    status.textContent = t("Progress could not be saved in this browser.", "目前無法在此瀏覽器保存進度。");
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
    <div><span class="eyebrow">${t("ENGLISH STUDY CLUB", "英語學習")}</span>
      <h1 tabindex="-1">${t("Make English<br>a daily habit.", "讓英語成為<br>每天的習慣。")}</h1>
      <p>${t("Practise vocabulary, read a short passage, and test your understanding.", "練習單字、讀一篇英文短文，再做測驗檢查理解。")}</p>
      <a class="button primary" href="#words" data-action="start-words">${t("Start learning", "開始學習")} <span aria-hidden="true">→</span></a>
    </div>
    <div class="art" aria-hidden="true"><div class="art-card"><span class="eyebrow">${t("ACADEMIC WORD", "學術單字")}</span>
      <strong>evidence</strong><small>noun · ${t("support for a claim", "證據")}</small></div>
      <div class="art-card secondary"><strong>draw a conclusion</strong><small>${t("reach a judgment based on evidence", "從線索得出結論")}</small></div></div>
  </section>
  ${homeReadingPractice()}
  <div class="section-heading"><h2>${t("Choose a practice activity", "選擇練習")}</h2><span class="pill">${t("Your level", "目前程度")} ${level}</span></div>
  <div class="cards">
    <a class="card" href="#words"><span class="card-icon" aria-hidden="true">Aa</span><h3>${t("Vocabulary practice", "單字練習")}</h3><p>${t("Find words, listen to pronunciations, and keep track of the words you know.", "搜尋、聽發音，累積你已掌握的單字。")}</p></a>
    <a class="card" href="#reading"><span class="card-icon" aria-hidden="true">▤</span><h3>${t("Short readings", "短文閱讀")}</h3><p>${t("Read short A1–C1 passages and check your understanding.", "探索 A1–C1 英文短文，練習閱讀理解。")}</p></a>
    <a class="card" href="#quiz"><span class="card-icon" aria-hidden="true">✓</span><h3>${t("Reading quizzes", "閱讀測驗")}</h3><p>${t("Practise finding details, drawing inferences, and evaluating evidence.", "練習找細節、做推論和評估證據。")}</p></a>
  </div>
  <div class="stats" aria-label="${t("Learning statistics", "學習統計")}">
    <div class="stat"><strong>7,000</strong>${t("English words", "英文單字")}</div>
    <div class="stat"><strong>200</strong>${t("Priority academic words", "學術重點字")}</div>
    <div class="stat"><strong>${mastered.size.toLocaleString()}</strong>${t("Mastered", "已掌握")}</div>
  </div>
  ${latest ? `<div class="section-heading"><h2>${t("Latest quiz", "最近一次測驗")}</h2><a href="#results">${t("View score", "查看分數")} →</a></div>` : ''}`;
}

function homeReadingPractice() {
  const band = recommendedReadingLevel();
  const warmup = warmups[band];
  const selection = warmupAnswers.get(band);
  const companion = {A1: 'A2', A2: 'A1', B2: 'C1', C1: 'B2'};
  const featured = [band, companion[band]].map(
    readingLevel => readings.findLast(article => article.level === readingLevel)
  );
  return `
  <section aria-labelledby="featured-heading">
    <div class="section-heading">
      <h2 id="featured-heading">${t('Featured readings', '推薦短文')}</h2>
      <a href="#reading">${t('All readings', '查看全部短文')} →</a>
    </div>
    <div class="featured-grid">
      ${featured.map(article => `
        <article class="panel featured-reading">
          <div class="pills"><span class="pill">${article.level}</span><span class="pill academic">${t(article.topic, article.zh.topic)}</span></div>
          <h3 lang="en">${article.title}</h3>
          <p class="muted">${t(article.summary, article.zh.summary)}</p>
          <div class="actions">
            <a class="button" href="#reading/${article.id}" aria-label="${t('Read', '閱讀')} · ${article.title}">${t('Read passage', '閱讀短文')} →</a>
            <a class="button" href="#quiz/${article.id}" aria-label="${t('Take quiz', '開始測驗')} · ${article.title}">${t('Take quiz', '開始測驗')}</a>
          </div>
        </article>`).join('')}
    </div>
  </section>
  <section aria-labelledby="warmup-heading">
    <div class="section-heading">
      <h2 id="warmup-heading">${t('Quick reading practice', '快速閱讀練習')}</h2>
      <span class="pill">${band} · ${t('1 question', '1 題')}</span>
    </div>
    <div class="panel warmup">
      <div class="warmup-passage">
        <p class="eyebrow">${t('Read the passage', '閱讀短文')}</p>
        <p lang="en">${warmup.text}</p>
      </div>
      <form id="warmup-form">
        <fieldset ${selection === undefined ? '' : 'disabled'}>
          <legend lang="en">${warmup.question}</legend>
          ${warmup.options.map((option, i) => `<label class="option" lang="en">
            <input type="radio" name="warmup-answer" value="${i}" required ${selection === i ? 'checked' : ''}>
            <span>${option}</span></label>`).join('')}
        </fieldset>
        ${selection === undefined
          ? `<button class="primary" type="submit">${t('Check answer', '檢查答案')}</button>`
          : `<div id="warmup-feedback" tabindex="-1">
              <p class="${selection === warmup.answer ? 'correct' : 'incorrect'}">${selection === warmup.answer ? t('Correct', '答對了') : t('Incorrect', '答錯了')}</p>
              <p class="muted">${t(...warmup.explanation)}</p>
            </div>
            <button type="button" data-action="retry-warmup">${t('Try again', '再試一次')}</button>`}
      </form>
    </div>
  </section>`;
}

function vocabulary() {
  return heading(t('VOCABULARY', '單字'), t("Vocabulary practice", "單字練習"), isBeginner() ? t("Start with everyday words at your level. Turn off the level filter to search the full library.", "從符合你程度的生活單字開始。取消程度篩選後，就能搜尋全部單字。") : t("Practise academic words or filter the full library by level.", "練習學術重點字，或依程度篩選完整單字庫。")) + `
    <div class="toolbar">
      <label class="sr-only" for="search">${t("Search vocabulary", "搜尋單字")}</label>
      <input id="search" type="search" placeholder="${t("Search for a word, e.g. evidence", "搜尋英文單字，例如 evidence")}" value="${escapeHtml(search)}">
      <label><input id="only-level" type="checkbox" ${onlyLevel ? 'checked' : ''}>${t("Show only", "只顯示")} ${level}</label>
    </div>
    <div class="toolbar" aria-label="${t("Vocabulary filters", "單字篩選")}">
      ${[['academic',t("Academic words", "學術重點")],['all',t("All words", "全部單字")],['mastered',t("Mastered", "已掌握")]].map(([key,label]) =>
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
  document.querySelector('#word-count').textContent = t(
    `${matching.length.toLocaleString('en')} ${matching.length === 1 ? 'word' : 'words'}`,
    `共 ${matching.length.toLocaleString('zh-Hant')} 個單字`
  );
  document.querySelector('#word-list').innerHTML = matching.slice(page * perPage, (page + 1) * perPage)
    .map(([word, [band, academic]]) => {
      const [part, definition, example] = window.dictionary[word];
      const known = mastered.has(word);
      return `<article class="panel word">
        <div><div class="pills"><span class="pill">${band}</span>
          ${academic ? `<span class="pill academic">${t("Academic words", "學術重點")}</span>` : ''}</div>
          <h2 lang="en">${word}</h2>
          <p lang="en"><em class="muted">${escapeHtml(part)}</em> ${escapeHtml(definition)}</p>
          ${example ? `<p class="muted" lang="en">${escapeHtml(example)}</p>` : ''}
        </div>
        <div class="word-actions">
          <button data-action="speak" data-key="${word}" aria-label="${t(`Play pronunciation for ${word}`, `播放 ${word} 的發音`)}"><span aria-hidden="true">◖))</span> ${t("Listen", "發音")}</button>
          <button class="${known ? 'checked' : ''}" data-action="master" data-key="${word}" aria-pressed="${known}">
            ${known ? t("✓ Mastered", "✓ 已掌握") : t("Mark as mastered", "標記已掌握")}</button>
        </div>
      </article>`;
    }).join('') || `<p class="panel">${t("No words match your filters.", "沒有符合條件的單字。")}</p>`;
  document.querySelector('#pagination').innerHTML = totalPages > 1 ? `
    <button data-action="page" data-key="-1" ${page === 0 ? 'disabled' : ''}>${t("Previous page", "上一頁")}</button>
    <span>${t(`Page ${page + 1} of ${totalPages}`, `第 ${page + 1} / ${totalPages} 頁`)}</span>
    <button data-action="page" data-key="1" ${page + 1 >= totalPages ? 'disabled' : ''}>${t("Next page", "下一頁")}</button>` : '';
}

function isBeginner() {
  return level === 'A1' || level === 'A2';
}

function defaultWordFilter() {
  return level === 'B2' || level === 'C1' ? 'academic' : 'all';
}

function recommendedReadingLevel() {
  if (isBeginner()) return level;
  return level === 'B1' || level === 'B2' ? 'B2' : 'C1';
}

function preferredReadings() {
  const preferred = recommendedReadingLevel();
  return [...readings].sort((a,b) => Number(b.level === preferred) - Number(a.level === preferred));
}

function passage(article, includeAction) {
  return `<article class="panel article">
    <div class="pills"><span class="pill">${article.level}</span><span class="pill academic">${t(article.topic, article.zh.topic)}</span></div>
    <h2 lang="en">${article.title}</h2>
    <div lang="en">${article.paragraphs.map(p => `<p>${p}</p>`).join('')}</div>
    ${includeAction && language === 'zh-Hant' ? `<details>
      <summary>查看繁體中文翻譯</summary>
      ${article.zh.paragraphs.map(paragraph => `<p>${paragraph}</p>`).join('')}
    </details>` : ''}
    ${includeAction ? `<div class="actions"><a class="button primary" href="#quiz/${article.id}">${t("Take this quiz", "做這篇測驗")} →</a></div>` : ''}
  </article>`;
}

function reading(linkedArticle) {
  const list = preferredReadings();
  const article = linkedArticle || list.find(item => item.id === activeReading) || list[0];
  return heading(t('READING', '閱讀'), t("Short readings", "短文閱讀"), t("Choose a passage from A1 to C1. Read it, then take a quiz.", "選一篇 A1 至 C1 的短文，讀完後做測驗。")) +
    `<div class="read-layout"><div class="read-list" aria-label="${t("Choose a passage", "選擇文章")}">
    ${list.map(item => `<button data-action="read" data-key="${item.id}" aria-pressed="${item === article}">
      <span class="pill">${item.level}</span> <strong lang="en">${item.title}</strong>
      <small class="muted">${t(item.summary, item.zh.summary)}</small>
    </button>`).join('')}</div>${passage(article,true)}</div>`;
}

function quizList() {
  return heading(t('ASSESSMENT', '測驗'),t("Reading quizzes", "閱讀測驗"),t("Each quiz has four questions. Beginner quizzes focus on understanding details. Advanced quizzes ask you to analyse the text. Submit to see the explanations.", "每篇 4 題。初階測驗著重理解細節，進階測驗著重分析文章。交卷後可查看解析。")) +
    `<div class="cards">${preferredReadings().map(article => `
    <a class="card" href="#quiz/${article.id}">
      <span class="pill">${article.level}</span><h3 lang="en">${article.title}</h3>
      <p>${t(article.summary, article.zh.summary)} <span aria-hidden="true">→</span></p>
    </a>`).join('')}</div>
    ${latest ? `<div class="section-heading"><a class="button" href="#results">${t("View latest score", "查看最近分數")}</a></div>` : ''}`;
}

function quizView(article) {
  if (!quiz || quiz.id !== article.id) {
    quiz = {id: article.id, index: 0, answers: Array(article.questions.length).fill(null)};
  }
  const {index, answers} = quiz;
  const [type, prompt, options] = article.questions[index];
  const last = index === article.questions.length - 1;
  return heading(t('ASSESSMENT', '測驗'),t("Reading quiz", "閱讀測驗"),`${article.level} · ${t("Refer to the passage as you answer.", "可邊讀文章邊作答。")}`) +
    `<div class="quiz-layout">
      <form id="quiz-form" class="panel quiz-panel">
        <span class="pill">${t(type, questionTypes[type])}</span>
        <h2>${t(`Question ${index + 1} of ${article.questions.length}`, `第 ${index + 1} / ${article.questions.length} 題`)}</h2>
        <progress aria-label="${t("Quiz progress", "測驗進度")}" value="${index + 1}" max="${article.questions.length}"></progress>
        <fieldset><legend id="question-title" lang="en" tabindex="-1">${prompt}</legend>
          ${options.map((option,i) => `<label class="option" lang="en">
            <input type="radio" name="answer" value="${i}" ${answers[index] === i ? 'checked' : ''}>
            <span>${option}</span></label>`).join('')}
        </fieldset>
        <div class="actions">
          <button type="button" data-action="previous" ${index ? '' : 'disabled'}>${t("Previous", "上一題")}</button>
          <button type="submit" class="primary" ${answers[index] === null ? 'disabled' : ''}>${last ? t("Submit and view score", "交卷並看分數") : t("Next question →", "下一題 →")}</button>
        </div>
      </form>
      ${passage(article,false)}
    </div>`;
}

function results() {
  const article = readings.find(item => item.id === latest?.id);
  if (!article || !Array.isArray(latest.answers)) {
    return heading(t('RESULTS', '成績'),t("Quiz results", "測驗結果"),t("Complete a quiz to see your score and answer explanations.", "完成一篇測驗後，這裡會顯示分數與解析。")) +
      `<a class="button primary" href="#quiz">${t("Choose a quiz", "選擇測驗")}</a>`;
  }
  const correct = article.questions.filter((question,i) => question[3] === latest.answers[i]).length;
  const total = article.questions.length;
  return heading(t('RESULTS', '成績'),t("Quiz results", "測驗結果"),`${article.level} · ${article.title}`) + `
    <div class="panel result">
      <p>${t("Your score", "本次成績")}</p><strong>${Math.round(100 * correct / total)}%</strong><p>${t(`${correct} of ${total} correct`, `答對 ${correct}／${total} 題`)}</p>
    </div>
    <div class="actions"><a class="button primary" href="#quiz/${article.id}" data-action="restart">${t("Try again", "再做一次")}</a>
      <a class="button" href="#quiz">${t("Choose another quiz", "選其他測驗")}</a></div>
    <div class="section-heading"><h2>${t("Answer review", "逐題解析")}</h2></div>
    <div class="review">${article.questions.map(([type,prompt,options,answer,why],i) => {
      const selection = latest.answers[i];
      return `<article class="panel">
        <div class="pills"><span class="pill">${t(type, questionTypes[type])}</span>
        <span class="${selection === answer ? 'correct' : 'incorrect'}">${selection === answer ? t("Correct", "答對") : t("Incorrect", "答錯")}</span></div>
        <h3 lang="en">${i + 1}. ${prompt}</h3>
        <p>${t("Your answer", "你的答案")} <span lang="en">${options[selection] ?? '—'}</span></p>
        <p>${t("Correct answer", "正確答案")} <span lang="en">${options[answer]}</span></p><p class="muted">${t(why, article.zh.explanations[i])}</p></article>`;
    }).join('')}</div>`;
}

function credits() {
  return heading(t('CREDITS', '教材來源'),t("Learning resources", "教材來源"),t("Vocabulary levels are study recommendations.", "單字難度為本 app 的練習分級。")) + `
    <div class="panel article">
      <h2>${t("Vocabulary and reading", "單字與閱讀")}</h2>
      <p>${t("Vocabulary levels draw on", "單字分級參考")} <a href="https://cental.uclouvain.be/cefrlex/efllex/">EFLLex</a> (UCLouvain CENTAL, <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>)${t(", with additional level assignments and C2 challenge words.", "，另補充建議分級與 C2 挑戰字。")}</p>
      <p>${t("English definitions are adapted from", "英文釋義節選自")} <a href="https://github.com/wordset/wordset-dictionary">Wordset</a> ${t("(CC BY-SA 4.0, including WordNet 3.0).", "（CC BY-SA 4.0，內含 WordNet 3.0）。")} <a href="data/WORDSET-LICENSE.txt">${t("Full licence notice", "授權全文")}</a>.</p>
      <p>${t("The readings and quizzes are original. Pronunciation uses your browser’s speech synthesis.", "閱讀與測驗為原創教材。發音使用瀏覽器語音合成功能。")}</p>
    </div>`;
}

function route(focus = false) {
  const [view, id] = (location.hash.slice(1) || 'home').split('/');
  const article = readings.find(item => item.id === id);
  const views = {
    home, words: vocabulary, reading: () => reading(article), quiz: article ? () => quizView(article) : quizList,
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

updateLanguage();
languageSelect.addEventListener('change', () => {
  language = languageSelect.value === 'zh-Hant' ? 'zh-Hant' : 'en';
  updateLanguage();
  status.textContent = '';
  saveProgress();
  route();
});

levelSelect.value = level;
levelSelect.addEventListener('change', () => {
  level = levelSelect.value;
  if (filter !== 'mastered') filter = defaultWordFilter();
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
  if (event.target.id === 'warmup-form') {
    event.preventDefault();
    const choice = new FormData(event.target).get('warmup-answer');
    if (choice === null) return;
    warmupAnswers.set(recommendedReadingLevel(), Number(choice));
    route();
    document.querySelector('#warmup-feedback').focus({preventScroll: true});
    return;
  }
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
    filter = defaultWordFilter();
    onlyLevel = isBeginner();
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
    status.textContent = mastered.has(key)
      ? t(`Marked ${key} as mastered`, `已標記 ${key} 為已掌握`)
      : t(`Removed ${key} from mastered words`, `已取消 ${key} 的掌握標記`);
    saveProgress();
    renderWords();
    (document.querySelector(`[data-action=master][data-key="${key}"]`) ||
      document.querySelector('#search')).focus({preventScroll:true});
  }
  if (action === 'speak') {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      status.textContent = t("Pronunciation is unavailable in this browser.", "此瀏覽器無法播放發音。");
      control.textContent = t("Audio unavailable", "發音無法使用");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(key);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    utterance.onerror = ({error}) => {
      if (error === 'interrupted' || error === 'canceled') return;
      status.textContent = t("Check your browser’s English voice settings to play pronunciations.", "無法播放發音，請檢查瀏覽器的英語語音設定。");
      control.textContent = t("Audio unavailable", "發音無法使用");
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
  if (action === 'retry-warmup') {
    warmupAnswers.delete(recommendedReadingLevel());
    route();
    document.querySelector('#warmup-form input').focus({preventScroll: true});
  }
  if (action === 'read') {
    activeReading = key;
    if (location.hash.startsWith('#reading/')) history.replaceState(null, '', `#reading/${key}`);
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
