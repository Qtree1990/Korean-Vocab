'use strict';

/* ============================================================
   Koreanisch-Karten – Vokabeltrainer mit Spaced Repetition (SM-2)
   Alles läuft lokal im Browser; Fortschritt liegt in localStorage.
   ============================================================ */

const STORE_KEY = 'koreanisch-karten.v1';
const OWN_DECK = 'Eigene Karten';
const ROLLOVER_HOURS = 4; // neuer Lerntag beginnt um 4 Uhr nachts
const DAY_MS = 86400000;

const $app = document.getElementById('app');
const $tabs = document.getElementById('tabs');
const $toast = document.getElementById('toast');

let builtinDecks = [];      // [{name, cards:[{ko,rom,de}]}]
let state = loadState();
let session = null;         // aktive Lernsitzung
let view = 'home';

/* ---------------- Zeit ---------------- */

function today() {
  const d = new Date(Date.now() - ROLLOVER_HOURS * 3600000);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
}

/* ---------------- Speicher ---------------- */

function defaultState() {
  return {
    version: 1,
    settings: { newPerDay: 15, direction: 'both', autoSpeak: true, showRom: true, disabledDecks: [] },
    progress: {},   // "deck::ko|kd" -> {ease, ivl, reps, lapses, due, last}
    own: [],        // eigene Karten {id, ko, rom, de}
    log: {},        // Tag -> {reviews, learnedNew}
    library: { installed: {}, done: {}, last: {}, maps: {}, stage: 1 }
  };
}

function loadState() {
  const base = defaultState();
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return base;
    const s = JSON.parse(raw);
    return { ...base, ...s, settings: { ...base.settings, ...(s.settings || {}) }, library: { ...base.library, ...(s.library || {}) } };
  } catch (e) {
    return base;
  }
}

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch (e) { toast('Speichern fehlgeschlagen – bitte Backup exportieren.'); }
}

/* ---------------- Karten ---------------- */

function allDecks() {
  const decks = builtinDecks.map(d => ({ name: d.name, cards: d.cards.map(c => ({ ...c, deck: d.name, id: d.name + '::' + c.ko })) }));
  // eigene Karten nach Stapel gruppieren (z. B. „Eigene Karten“, „My First 500 Korean Words“)
  const groups = new Map();
  for (const c of state.own) {
    const name = c.deck || OWN_DECK;
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push({ ...c, deck: name });
  }
  for (const [name, cards] of groups) {
    const existing = decks.find(d => d.name === name);
    if (existing) existing.cards.push(...cards);
    else decks.push({ name, cards });
  }
  return decks;
}

function enabledCards() {
  const off = new Set(state.settings.disabledDecks);
  return allDecks().filter(d => !off.has(d.name)).flatMap(d => d.cards);
}

function directions() {
  const d = state.settings.direction;
  return d === 'both' ? ['kd', 'dk'] : [d];
}

const keyOf = (card, dir) => card.id + '|' + dir;

function dayLog(t = today()) {
  if (!state.log[t]) state.log[t] = { reviews: 0, learnedNew: 0 };
  return state.log[t];
}

/* ---------------- SM-2 Planung ----------------
   Bewertungen: 1 = Nochmal, 2 = Schwer, 3 = Gut, 4 = Leicht           */

function schedule(prev, grade) {
  const p = prev ? { ...prev } : { ease: 2.5, ivl: 0, reps: 0, lapses: 0 };
  const t = today();
  if (grade === 1) {
    if (p.reps > 0) p.lapses++;
    p.reps = 0;
    p.ivl = 0;
    p.ease = Math.max(1.3, p.ease - 0.2);
    p.due = t;
  } else {
    let ivl;
    if (p.reps === 0) ivl = grade === 4 ? 3 : 1;
    else if (p.reps === 1) ivl = grade === 2 ? 2 : grade === 3 ? 4 : 6;
    else {
      const f = grade === 2 ? 1.2 : grade === 3 ? p.ease : p.ease * 1.3;
      ivl = Math.max(p.ivl + 1, Math.round(p.ivl * f));
    }
    if (grade === 2) p.ease = Math.max(1.3, p.ease - 0.15);
    if (grade === 4) p.ease = p.ease + 0.15;
    p.reps++;
    p.ivl = Math.min(ivl, 3650);
    p.due = t + p.ivl;
  }
  p.last = t;
  return p;
}

function fmtIvl(days) {
  if (days <= 0) return 'gleich';
  if (days === 1) return '1 Tag';
  if (days < 30) return days + ' Tage';
  if (days < 365) { const m = Math.round(days / 30); return m + (m === 1 ? ' Monat' : ' Monate'); }
  const y = Math.round(days / 36.5) / 10;
  return String(y).replace('.', ',') + ' J.';
}

/* ---------------- Warteschlange ---------------- */

function buildQueue() {
  const t = today();
  const dirs = directions();
  const cards = enabledCards();
  const due = [];
  const fresh = [];

  for (const card of cards) {
    for (const dir of dirs) {
      const k = keyOf(card, dir);
      const p = state.progress[k];
      if (p) {
        if (p.due <= t) due.push({ card, dir, key: k, due: p.due });
      } else {
        // Deutsch → Koreanisch erst, wenn die Karte in Richtung Koreanisch → Deutsch schon einmal gekonnt war
        if (dir === 'dk' && dirs.includes('kd')) {
          const pk = state.progress[keyOf(card, 'kd')];
          if (!pk || pk.reps < 1 || pk.last === t) continue;
        }
        fresh.push({ card, dir, key: k, isNew: true });
      }
    }
  }

  shuffle(due);
  due.sort((a, b) => a.due - b.due);
  const remainingNew = Math.max(0, state.settings.newPerDay - dayLog().learnedNew);
  const newItems = fresh.slice(0, remainingNew);

  // Neue Karten gleichmäßig zwischen Wiederholungen verteilen
  const queue = [];
  const step = newItems.length ? Math.max(1, Math.floor(due.length / newItems.length)) : 0;
  let ni = 0;
  due.forEach((item, i) => {
    queue.push(item);
    if (step && (i + 1) % step === 0 && ni < newItems.length) queue.push(newItems[ni++]);
  });
  while (ni < newItems.length) queue.push(newItems[ni++]);
  return { queue, dueCount: due.length, newCount: newItems.length };
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------------- Sprachausgabe ---------------- */

let koVoice = null;
function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const voices = speechSynthesis.getVoices();
  koVoice = voices.find(v => v.lang === 'ko-KR' && /yuna|premium|enhanced/i.test(v.name))
         || voices.find(v => v.lang && v.lang.toLowerCase().startsWith('ko'))
         || null;
}
if ('speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}

function speak(text) {
  if (!('speechSynthesis' in window) || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/\(.*?\)/g, ''));
  u.lang = 'ko-KR';
  if (koVoice) u.voice = koVoice;
  u.rate = 0.85;
  speechSynthesis.speak(u);
}

/* ---------------- Hilfsfunktionen ---------------- */

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let toastTimer;
function toast(msg) {
  $toast.textContent = msg;
  $toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $toast.classList.remove('show'), 2400);
}

const ICON_SPEAK = '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
const ICON_CLOSE = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>';
const ICON_TRASH = '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>';

function streak() {
  let s = 0;
  let t = today();
  if (!state.log[t] || !state.log[t].reviews) t--; // heute noch nicht gelernt zählt nicht als Bruch
  while (state.log[t] && state.log[t].reviews > 0) { s++; t--; }
  return s;
}

/* ---------------- Ansichten ---------------- */

function setView(v) {
  view = v;
  document.body.classList.toggle('studying', v === 'study' || v === 'reader');
  document.body.classList.toggle('reading', v === 'reader');
  $tabs.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  render();
  window.scrollTo(0, 0);
}

function render() {
  if (view === 'home') renderHome();
  else if (view === 'study') renderStudy();
  else if (view === 'cards') renderCards();
  else if (view === 'settings') renderSettings();
  else if (view === 'library') renderLibrary();
  else if (view === 'reader') renderReader();
}

/* ----- Startseite ----- */

function renderHome() {
  const { dueCount, newCount } = buildQueue();
  const log = dayLog();
  const st = streak();
  const off = new Set(state.settings.disabledDecks);
  const dirs = directions();

  const deckRows = allDecks().map(d => {
    const total = d.cards.length * dirs.length;
    let seen = 0;
    for (const c of d.cards) for (const dir of dirs) if (state.progress[keyOf(c, dir)]) seen++;
    const pct = total ? Math.round(seen / total * 100) : 0;
    const on = !off.has(d.name);
    return `
      <button class="deck ${on ? 'on' : ''}" data-deck="${esc(d.name)}" aria-pressed="${on}">
        <span class="check"></span>
        <span class="name">${esc(d.name)}<div class="bar"><i style="width:${pct}%"></i></div></span>
        <span class="meta">${d.cards.length} Wörter</span>
      </button>`;
  }).join('');

  const nothing = dueCount + newCount === 0;
  $app.innerHTML = `
    <div class="hero">
      <div>
        <p class="sub">${st > 0 ? `${st} ${st === 1 ? 'Tag' : 'Tage'} am Stück` : 'Schön, dass du da bist'}</p>
        <h1>Koreanisch lernen</h1>
      </div>
      <div class="seal ko" aria-hidden="true">한</div>
    </div>

    <div class="stats">
      <div class="stat due"><b>${dueCount}</b><span>fällig</span></div>
      <div class="stat new"><b>${newCount}</b><span>neu</span></div>
      <div class="stat"><b>${log.reviews}</b><span>heute gelernt</span></div>
    </div>

    ${nothing
      ? `<div class="done-note">Für heute ist alles erledigt. 잘했어요! <br><small>Unter Einstellungen kannst du das Limit für neue Karten erhöhen.</small></div>`
      : `<button class="btn primary" id="start">Lernen starten · ${dueCount + newCount} Karten</button>`}

    <h2>Stapel</h2>
    <div class="decks">${deckRows}</div>
    <p class="hint">Antippen, um einen Stapel ein- oder auszuschalten.</p>
  `;

  const start = document.getElementById('start');
  if (start) start.onclick = startSession;
  $app.querySelectorAll('.deck').forEach(b => b.onclick = () => {
    const name = b.dataset.deck;
    const s = new Set(state.settings.disabledDecks);
    s.has(name) ? s.delete(name) : s.add(name);
    state.settings.disabledDecks = [...s];
    save();
    renderHome();
  });
}

/* ----- Lernen ----- */

function startSession() {
  const { queue } = buildQueue();
  if (!queue.length) return;
  session = { queue, total: queue.length, done: 0, revealed: false, again: new Set() };
  setView('study');
}

function renderStudy() {
  if (!session) return setView('home');
  const item = session.queue[0];
  if (!item) return renderFinish();

  const { card, dir } = item;
  const showRom = state.settings.showRom && card.rom;
  const isKo = dir === 'kd';
  const prompt = isKo ? card.ko : card.de;
  const answer = isKo ? card.de : card.ko;
  const longKo = card.ko.length > 5;
  const pct = Math.round(session.done / Math.max(session.total, 1) * 100);
  const p = state.progress[item.key];
  const relearn = session.again.has(item.key);

  let body = `<div class="prompt ${isKo ? 'ko' : ''} ${isKo && longKo ? 'long' : ''}">${esc(prompt)}</div>`;
  if (session.revealed) {
    body += `<hr>`;
    body += `<div class="answer ${isKo ? '' : 'ko'}">${esc(answer)}</div>`;
    if (showRom) body += `<div class="rom">${esc(card.rom)}</div>`;
  }
  if (isKo || session.revealed) {
    body += `<button class="icon-btn speak" id="speak" aria-label="Vorlesen">${ICON_SPEAK}</button>`;
  }

  let controls;
  if (!session.revealed) {
    controls = `<button class="btn reveal" id="reveal">Antwort zeigen</button>`;
  } else {
    const labels = ['Nochmal', 'Schwer', 'Gut', 'Leicht'];
    controls = `<div class="grades">${[1, 2, 3, 4].map(g => {
      const next = schedule(p, g);
      return `<button class="grade g${g}" data-g="${g}">${labels[g - 1]}<small>${fmtIvl(next.due - today())}</small></button>`;
    }).join('')}</div>`;
  }

  $app.innerHTML = `
    <div class="study-top">
      <button class="icon-btn" id="quit" aria-label="Beenden">${ICON_CLOSE}</button>
      <div class="progress"><i style="width:${pct}%"></i></div>
      <span class="count">${session.queue.length}</span>
    </div>
    <div class="card">
      <span class="tag">${esc(card.deck)} · ${isKo ? 'Koreanisch → Deutsch' : 'Deutsch → Koreanisch'}</span>
      ${item.isNew && !p ? '<span class="badge">neu</span>' : relearn ? '<span class="badge relearn">nochmal</span>' : ''}
      ${body}
    </div>
    ${controls}
  `;

  document.getElementById('quit').onclick = () => { session = null; setView('home'); };
  const sp = document.getElementById('speak');
  if (sp) sp.onclick = () => speak(card.ko);
  const rv = document.getElementById('reveal');
  if (rv) rv.onclick = reveal;
  $app.querySelectorAll('.grade').forEach(b => b.onclick = () => answerCard(+b.dataset.g));

  if (state.settings.autoSpeak && !session.spoken) {
    if ((isKo && !session.revealed) || (!isKo && session.revealed)) { speak(card.ko); session.spoken = true; }
  }
}

function reveal() {
  if (!session || session.revealed) return;
  session.revealed = true;
  renderStudy();
}

function answerCard(grade) {
  if (!session || !session.revealed) return;
  const item = session.queue.shift();
  const wasNew = !state.progress[item.key];
  state.progress[item.key] = schedule(state.progress[item.key], grade);
  const log = dayLog();
  log.reviews++;
  if (wasNew) log.learnedNew++;

  if (grade === 1) {
    // später in dieser Sitzung noch einmal zeigen
    session.again.add(item.key);
    const pos = Math.min(session.queue.length, 4);
    session.queue.splice(pos, 0, { ...item, isNew: false });
    session.total++;
  } else {
    session.again.delete(item.key);
  }
  session.done++;
  session.revealed = false;
  session.spoken = false;
  save();
  renderStudy();
}

function renderFinish() {
  const n = session.done;
  session = null;
  $app.innerHTML = `
    <div class="finish">
      <div class="big">수고했어요</div>
      <h1>Geschafft!</h1>
      <p class="sub">${n} ${n === 1 ? 'Karte' : 'Karten'} wiederholt. Bis morgen!</p>
      <button class="btn" id="back">Zur Übersicht</button>
    </div>`;
  document.getElementById('back').onclick = () => setView('home');
}

/* ----- Kartenliste ----- */

let cardFilter = '';

function renderCards() {
  $app.innerHTML = `
    <h1>Karten</h1>
    <h2>Neue Karte</h2>
    <form class="group" id="add">
      <div class="field stack"><label for="f-ko">Koreanisch</label><input id="f-ko" type="text" class="ko" lang="ko" autocomplete="off" required></div>
      <div class="field stack"><label for="f-rom">Lautschrift (optional)</label><input id="f-rom" type="text" autocomplete="off" autocapitalize="off"></div>
      <div class="field stack"><label for="f-de">Deutsch</label><input id="f-de" type="text" autocomplete="off" required></div>
      <div class="field"><button class="btn small" type="submit">Hinzufügen</button></div>
    </form>

    <h2>Alle Karten</h2>
    <input class="search" id="q" type="search" placeholder="Suchen (Hangul, Lautschrift oder Deutsch)" value="${esc(cardFilter)}">
    <div id="list"></div>
  `;

  document.getElementById('add').onsubmit = e => {
    e.preventDefault();
    const ko = document.getElementById('f-ko').value.trim();
    const rom = document.getElementById('f-rom').value.trim();
    const de = document.getElementById('f-de').value.trim();
    if (!ko || !de) return;
    addOwnCards([{ ko, rom, de }]);
    toast('Karte hinzugefügt');
    renderCards();
  };
  const q = document.getElementById('q');
  q.oninput = () => { cardFilter = q.value; renderList(); };
  renderList();
}

function addOwnCards(list, deck = OWN_DECK) {
  const existing = new Set(state.own.map(c => c.ko + '|' + c.de));
  let added = 0;
  for (const c of list) {
    if (!c.ko || !c.de || existing.has(c.ko + '|' + c.de)) continue;
    const card = { id: 'own::' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ko: c.ko, rom: c.rom || '', de: c.de };
    if (deck && deck !== OWN_DECK) card.deck = deck;
    state.own.push(card);
    existing.add(c.ko + '|' + c.de);
    added++;
  }
  save();
  return added;
}

function renderList() {
  const t = today();
  const q = cardFilter.trim().toLowerCase();
  const cards = allDecks().flatMap(d => d.cards).filter(c =>
    !q || c.ko.includes(q) || (c.rom || '').toLowerCase().includes(q) || c.de.toLowerCase().includes(q));
  const limit = 200;

  const rows = cards.slice(0, limit).map(c => {
    const ps = ['kd', 'dk'].map(d => state.progress[keyOf(c, d)]).filter(Boolean);
    let status = 'neu', cls = '';
    if (ps.length) {
      const nextDue = Math.min(...ps.map(p => p.due));
      if (nextDue <= t) { status = 'fällig'; cls = 'due'; }
      else status = 'in ' + fmtIvl(nextDue - t);
    }
    const own = state.own.some(x => x.id === c.id);
    return `
      <div class="row">
        <div class="w">
          <div><span class="k">${esc(c.ko)}</span>${c.rom ? `<span class="r">${esc(c.rom)}</span>` : ''}</div>
          <div class="d">${esc(c.de)}</div>
        </div>
        <div class="st ${cls}">${status}</div>
        <button class="icon-btn" data-speak="${esc(c.ko)}" aria-label="Vorlesen">${ICON_SPEAK}</button>
        ${own ? `<button class="icon-btn" data-del="${esc(c.id)}" aria-label="Löschen">${ICON_TRASH}</button>` : ''}
      </div>`;
  }).join('');

  const $list = document.getElementById('list');
  $list.innerHTML = cards.length
    ? `<div class="list">${rows}${cards.length > limit ? `<div class="more">… und ${cards.length - limit} weitere – Suche verfeinern</div>` : ''}</div>`
    : `<p class="hint">Keine Treffer.</p>`;

  $list.querySelectorAll('[data-speak]').forEach(b => b.onclick = () => speak(b.dataset.speak));
  $list.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
    const id = b.dataset.del;
    const c = state.own.find(x => x.id === id);
    if (!c || !confirm(`„${c.ko}“ löschen?`)) return;
    state.own = state.own.filter(x => x.id !== id);
    for (const d of ['kd', 'dk']) delete state.progress[id + '|' + d];
    save();
    renderList();
  });
}

/* ----- Einstellungen ----- */

function renderSettings() {
  const s = state.settings;
  const learned = Object.keys(state.progress).length;
  $app.innerHTML = `
    <h1>Einstellungen</h1>

    <h2>Lernen</h2>
    <div class="group">
      <div class="field">
        <label for="s-new">Neue Karten pro Tag</label>
        <input id="s-new" type="number" min="0" max="200" inputmode="numeric" value="${s.newPerDay}">
      </div>
      <div class="field">
        <label for="s-dir">Abfragerichtung</label>
        <select id="s-dir">
          <option value="both" ${s.direction === 'both' ? 'selected' : ''}>Beide</option>
          <option value="kd" ${s.direction === 'kd' ? 'selected' : ''}>Koreanisch → Deutsch</option>
          <option value="dk" ${s.direction === 'dk' ? 'selected' : ''}>Deutsch → Koreanisch</option>
        </select>
      </div>
      <div class="field">
        <label for="s-rom">Lautschrift anzeigen<small>Auf der Rückseite der Karte</small></label>
        <span class="switch"><input id="s-rom" type="checkbox" ${s.showRom ? 'checked' : ''}><span></span></span>
      </div>
      <div class="field">
        <label for="s-speak">Automatisch vorlesen</label>
        <span class="switch"><input id="s-speak" type="checkbox" ${s.autoSpeak ? 'checked' : ''}><span></span></span>
      </div>
      <div class="field">
        <label>Stimme testen<small id="voice-info">${koVoice ? esc(koVoice.name) : 'Systemstimme (ko-KR)'}</small></label>
        <button class="btn small ghost" id="s-test">안녕하세요</button>
      </div>
    </div>
    <p class="hint">Keine koreanische Stimme zu hören? Auf dem iPhone unter Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen → Koreanisch eine Stimme laden.</p>

    <h2>Daten</h2>
    <div class="actions">
      <button class="btn ghost" id="exp">Backup exportieren</button>
      <button class="btn ghost" id="imp">Backup importieren</button>
      <button class="btn ghost" id="csv">Vokabeln aus CSV importieren</button>
      <input type="file" id="file-backup" accept=".json,application/json" hidden>
      <input type="file" id="file-csv" accept=".csv,.txt,text/csv,text/plain" hidden>
    </div>
    <p class="hint">CSV-Format: eine Karte pro Zeile, <code>Koreanisch;Lautschrift;Deutsch</code> oder <code>Koreanisch;Deutsch</code>. Trennzeichen Semikolon, Komma oder Tab.</p>

    <h2>Zurücksetzen</h2>
    <div class="actions">
      <button class="btn ghost danger" id="reset">Lernfortschritt löschen (${learned})</button>
    </div>
    <p class="hint">Alles wird nur auf diesem Gerät gespeichert. Das Backup enthält Vokabel-Fortschritt, abgehakte Lektionen, Stift-Einträge und Antworten – aber nicht die PDFs selbst.</p>
  `;

  const bind = (id, fn) => { document.getElementById(id).onchange = fn; };
  bind('s-new', e => { s.newPerDay = Math.max(0, Math.min(200, parseInt(e.target.value, 10) || 0)); save(); });
  bind('s-dir', e => { s.direction = e.target.value; save(); });
  bind('s-rom', e => { s.showRom = e.target.checked; save(); });
  bind('s-speak', e => { s.autoSpeak = e.target.checked; save(); });
  document.getElementById('s-test').onclick = () => speak('안녕하세요');

  document.getElementById('exp').onclick = exportBackup;
  document.getElementById('imp').onclick = () => document.getElementById('file-backup').click();
  document.getElementById('csv').onclick = () => document.getElementById('file-csv').click();
  document.getElementById('file-backup').onchange = e => importBackup(e.target.files[0]);
  document.getElementById('file-csv').onchange = e => importCsv(e.target.files[0]);
  document.getElementById('reset').onclick = () => {
    if (!confirm('Wirklich den gesamten Lernfortschritt löschen? Eigene Karten bleiben erhalten.')) return;
    state.progress = {};
    state.log = {};
    save();
    toast('Fortschritt gelöscht');
    renderSettings();
  };
}

async function exportBackup() {
  const d = new Date();
  const name = `koreanisch-backup-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;
  const extra = typeof libraryBackupData === 'function' ? await libraryBackupData() : null;
  const blob = new Blob([JSON.stringify({ ...state, libraryData: extra }, null, 1)], { type: 'application/json' });
  try {
    const file = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Koreanisch-Backup' });
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

function readFile(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsText(file, 'utf-8');
  });
}

async function importBackup(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await readFile(file));
    if (!data || typeof data.progress !== 'object') throw new Error('kein Backup');
    if (!confirm('Backup laden? Der aktuelle Stand auf diesem Gerät wird ersetzt.')) return;
    const base = defaultState();
    const { libraryData, ...rest } = data;
    const installed = state.library ? state.library.installed : {};
    state = { ...base, ...rest, settings: { ...base.settings, ...(rest.settings || {}) }, library: { ...base.library, ...(rest.library || {}), installed } };
    if (libraryData && typeof libraryRestoreData === 'function') await libraryRestoreData(libraryData);
    save();
    toast('Backup geladen');
    renderSettings();
  } catch (e) {
    toast('Datei ist kein gültiges Backup');
  }
}

async function importCsv(file) {
  if (!file) return;
  try {
    const text = (await readFile(file)).replace(/^﻿/, '');
    const rows = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const out = [];
    for (const line of rows) {
      const sep = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
      const parts = line.split(sep).map(x => x.trim().replace(/^"(.*)"$/, '$1'));
      if (parts.length < 2) continue;
      const [ko, a, b] = parts;
      if (!/[ᄀ-ᇿ㄰-㆏가-힯]/.test(ko)) continue; // Kopfzeile o. Ä. überspringen
      out.push(parts.length >= 3 ? { ko, rom: a, de: b } : { ko, rom: '', de: a });
    }
    const n = addOwnCards(out);
    toast(n ? `${n} Karten importiert` : 'Keine neuen Karten gefunden');
  } catch (e) {
    toast('CSV konnte nicht gelesen werden');
  }
}

/* ---------------- Tastatur (Desktop) ---------------- */

document.addEventListener('keydown', e => {
  if (view !== 'study' || !session) return;
  if (e.target.matches('input, textarea, select')) return;
  if (!session.revealed && (e.code === 'Space' || e.key === 'Enter')) { e.preventDefault(); reveal(); }
  else if (session.revealed && ['1', '2', '3', '4'].includes(e.key)) answerCard(+e.key);
  else if (session.revealed && (e.code === 'Space' || e.key === 'Enter')) { e.preventDefault(); answerCard(3); }
  else if (e.key === 'Escape') { session = null; setView('home'); }
});

/* ---------------- Start ---------------- */

$tabs.querySelectorAll('button').forEach(b => b.onclick = () => { session = null; setView(b.dataset.view); });

// Neuer Tag während die App offen ist → Startseite aktualisieren
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && view === 'home') renderHome();
});

async function init() {
  try {
    const res = await fetch('vocab.json', { cache: 'no-cache' });
    const data = await res.json();
    builtinDecks = data.decks || [];
  } catch (e) {
    builtinDecks = [];
    toast('Vokabeln konnten nicht geladen werden');
  }
  render();

  if (navigator.storage && navigator.storage.persist) {
    try { await navigator.storage.persist(); } catch (e) { /* egal */ }
  }
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();
