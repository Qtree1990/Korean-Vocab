'use strict';

/* ============================================================
   Bibliothek: eigene PDFs (bleiben nur auf diesem Gerät),
   Lernpfad Lehrbuch ↔ Workbook, PDF-Leser mit Stift und Antworten.
   Im Repository liegen KEINE Buchinhalte – nur Dateinamen-Muster
   und Seitenzahlen, damit die App deine PDFs zuordnen kann.
   ============================================================ */

const STAGES = [
  { id: 1, name: 'Einstieg', levels: [1, 2] },
  { id: 2, name: 'Grundlagen', levels: [3, 4] },
  { id: 3, name: 'Mittelstufe', levels: [5, 6, 7] },
  { id: 4, name: 'Fortgeschritten', levels: [8, 9, 10] }
];

const BOOKS = [
  { id: 'tb-1-9', title: 'Lehrbuch Level 1–9', kind: 'textbook', match: /level\s*1\s*-\s*9\s*text/i },
  { id: 'tb-10', title: 'Lehrbuch Level 10', kind: 'textbook', level: 10, stage: 4, match: /level\s*10\s*text/i },
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => ({
    id: 'wb-' + n, title: 'Workbook Level ' + n, kind: 'workbook', level: n,
    match: new RegExp('level\\s*' + n + '\\s*work', 'i')
  })),
  { id: 'x-500', title: 'My First 500 Korean Words', stage: 1, match: /first\s*500/i, hint: 'Grundwortschatz – passt zu Level 1' },
  { id: 'x-reading', title: 'Easy Korean Reading for Beginners', stage: 1, match: /easy\s*korean\s*reading/i, hint: 'Lesen üben – ab Level 1' },
  { id: 'x-conv-beg', title: 'Real-Life Conversations: Beginners', stage: 1, match: /conversations.*beginner/i, hint: 'Dialoge – ab Level 2' },
  { id: 'x-survival', title: 'Survival Korean for Travelers', stage: 1, match: /survival/i, hint: 'Reisesätze – jederzeit' },
  { id: 'x-720', title: '720 Everyday Words in 31 Days', stage: 1, match: /720/i, hint: 'Wortschatz-Programm – ab Level 2' },
  { id: 'x-weekly-1', title: 'My Weekly Vocab Book 1', stage: 1, match: /weekly\s*vocab\s*book\s*1/i, hint: 'Wochen-Vokabeln' },
  { id: 'x-weekly-2', title: 'My Weekly Vocab Book 2', stage: 2, match: /weekly\s*vocab\s*book\s*2/i },
  { id: 'x-routine', title: 'My Daily Routine in Korean', stage: 2, match: /daily\s*routine/i },
  { id: 'x-verbs-1', title: 'The Korean Verbs Guide 1', stage: 2, match: /verbs\s*guide\s*vol\s*1/i },
  { id: 'x-verbs-2', title: 'The Korean Verbs Guide 2', stage: 3, match: /verbs\s*guide\s*vol\s*2/i },
  { id: 'x-conv-int', title: 'Real-Life Conversations: Intermediate', stage: 3, match: /conversations.*intermediate/i },
  { id: 'x-mistakes', title: 'Common Mistakes Korean Learners Make', stage: 3, match: /common\s*mistakes/i },
  { id: 'x-hanja', title: 'Your First Hanja Guide', stage: 3, match: /hanja/i },
  { id: 'x-aesop', title: "Aesop's Fables", stage: 3, match: /aesop/i },
  { id: 'x-slang', title: 'Korean Slang Expressions', stage: 4, match: /slang/i },
  { id: 'x-news', title: 'News in Korean', stage: 4, match: /news\s*in\s*korean/i }
];

// Startseiten der Lektionen im Lehrbuch Level 1–9 (Ausgabe mit 938 Seiten)
const TB19_PAGES = 938;
const TB19_MAP = {
  1: [10, 11, 15, 17, 19, 22, 24, 26, 28, 33, 36, 39, 42, 45, 47, 49, 54, 58, 63, 65, 70, 73, 75, 77, 79],
  2: [121, 124, 128, 132, 135, 137, 141, 144, 149, 154, 158, 161, 163, 165, 168, 170, 174, 177, 180, 183, 186, 189, 193, 197, 201, 205, 208, 211, 214, 218],
  3: [255, 258, 263, 266, 270, 273, 278, 283, 286, 291, 294, 298, 300, 304, 308, 310, 312, 315, 318, 320, 322, 326, 328, 330, 332, 334, 337, 341, 343, 345],
  4: [384, 388, 390, 393, 395, 398, 400, 402, 404, 406, 408, 410, 412, 414, 416, 418, 420, 422, 424, 426, 430, 432, 433, 436, 438, 441, 443, 445, 447, 450],
  5: [454, 456, 460, 462, 465, 468, 470, 473, 476, 479, 482, 486, 488, 490, 493, 496, 500, 505, 509, 511, 514, 517, 519, 522, 525, 529, 532, 536, 539, 543],
  6: [547, 550, 554, 559, 564, 567, 570, 573, 577, 580, 583, 587, 590, 592, 595, 598, 602, 605, 609, 612, 616, 622, 624, 630, 633, 636, 640, 644, 647, 650],
  7: [654, 658, 661, 663, 666, 669, 671, 674, 677, 680, 684, 689, 692, 694, 698, 702, 706, 710, 714, 717, 721, 724, 726, 728, 731, 734, 737, 740, 743, 746],
  8: [750, 753, 757, 759, 761, 763, 765, 767, 770, 775, 779, 783, 789, 791, 793, 797, 802, 805, 809, 811, 815, 820, 822, 826, 828, 831, 835, 838, 840, 843],
  9: [847, 851, 854, 856, 860, 861, 866, 868, 870, 876, 880, 885, 888, 890, 892, 897, 900, 903, 906, 908, 912, 917, 919, 922, 924, 926, 928, 931, 933, 935]
};
const lessonCount = level => (level === 1 ? 25 : 30);

/* ---------------- Zustand ---------------- */

state.library = Object.assign({ installed: {}, done: {}, last: {}, maps: {}, stage: 1, split: true }, state.library || {});
const lib = () => state.library;

function bookById(id) {
  return BOOKS.find(b => b.id === id) || (lib().installed[id] && { id, title: lib().installed[id].title, stage: 0 });
}

/* ---------------- IndexedDB ---------------- */

const idb = (() => {
  let dbp;
  function open() {
    if (!dbp) {
      dbp = new Promise((res, rej) => {
        const r = indexedDB.open('koreanisch-bibliothek', 1);
        r.onupgradeneeded = () => {
          for (const s of ['files', 'ink', 'notes']) if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s);
        };
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    }
    return dbp;
  }
  async function run(store, mode, fn) {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction(store, mode);
      const req = fn(t.objectStore(store));
      t.oncomplete = () => res(req ? req.result : undefined);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    });
  }
  async function entries(store) {
    const db = await open();
    return new Promise((res, rej) => {
      const out = [];
      const t = db.transaction(store, 'readonly');
      t.objectStore(store).openCursor().onsuccess = e => {
        const c = e.target.result;
        if (c) { out.push([c.key, c.value]); c.continue(); }
      };
      t.oncomplete = () => res(out);
      t.onerror = () => rej(t.error);
    });
  }
  return {
    get: (s, k) => run(s, 'readonly', st => st.get(k)),
    put: (s, k, v) => run(s, 'readwrite', st => st.put(v, k)),
    del: (s, k) => run(s, 'readwrite', st => st.delete(k)),
    entries
  };
})();

/* ---------------- pdf.js (wird erst bei Bedarf geladen) ---------------- */

let pdfjsReady;
function loadPdfJs() {
  if (!pdfjsReady) {
    pdfjsReady = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'vendor/pdfjs/pdf.min.js';
      s.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdfjs/pdf.worker.min.js';
        res(window.pdfjsLib);
      };
      s.onerror = () => { pdfjsReady = null; rej(new Error('pdf.js nicht geladen')); };
      document.head.appendChild(s);
    });
  }
  return pdfjsReady;
}

async function openPdf(buf) {
  const pdfjs = await loadPdfJs();
  return pdfjs.getDocument({
    data: new Uint8Array(buf),
    cMapUrl: 'vendor/pdfjs/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: 'vendor/pdfjs/standard_fonts/',
    isEvalSupported: false
  }).promise;
}

/* ---------------- Lektionen ↔ Seiten ---------------- */

function fillGaps(found, n, maxPage) {
  const raw = [];
  for (let i = 1; i <= n; i++) raw.push(found[i] || null);
  // Ausreißer verwerfen (z. B. falsch gelesene Lektionsnummern): Seiten müssen aufsteigen
  const known = raw.map((p, i) => {
    if (!p) return null;
    const before = raw.slice(0, i).filter(Boolean);
    const after = raw.slice(i + 1).filter(Boolean);
    const okBefore = before.filter(x => x > p).length <= before.length / 2;
    const okAfter = after.filter(x => x < p).length <= after.length / 2;
    return okBefore && okAfter ? p : null;
  });
  // fehlende Lektionen zwischen bekannten Nachbarn einschätzen
  return known.map((p, i) => {
    if (p) return p;
    let a = i - 1; while (a >= 0 && !known[a]) a--;
    let b = i + 1; while (b < n && !known[b]) b++;
    const pa = a >= 0 ? known[a] : 1;
    const pb = b < n ? known[b] : maxPage;
    return Math.round(pa + (pb - pa) * (i - a) / (b - a));
  });
}

async function scanLessons(doc, onProgress) {
  const found = {}; // level -> {lesson: page}
  const re = /L\s*E\s*V\s*E\s*L\s*(\d+)\s*L\s*E\s*S\s*S\s*O\s*N\s*(\d+)/gi;
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    const text = tc.items.map(it => it.str).join(' ').slice(0, 600);
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(text))) {
      const lv = +m[1], ls = +m[2];
      if (lv < 1 || lv > 10 || ls < 1 || ls > 30) continue;
      found[lv] = found[lv] || {};
      if (!found[lv][ls]) found[lv][ls] = i;
    }
    page.cleanup();
    if (onProgress && i % 4 === 0) onProgress(i / doc.numPages);
  }
  return found;
}

// Seite → {level, lesson}
function lessonAt(bookId, page) {
  const maps = lessonMapsFor(bookId);
  let best = null;
  for (const [lv, arr] of Object.entries(maps)) {
    arr.forEach((p, i) => { if (p <= page && (!best || p > best.p)) best = { level: +lv, lesson: i + 1, p }; });
  }
  return best;
}

function lessonMapsFor(bookId) {
  if (bookId === 'tb-1-9') {
    const inst = lib().installed['tb-1-9'];
    if (inst && inst.pages === TB19_PAGES) return TB19_MAP;
    return lib().maps['tb-1-9'] || {};
  }
  return lib().maps[bookId] || {};
}

function lessonPage(kind, level, lesson) {
  const id = kind === 'textbook' ? (level === 10 ? 'tb-10' : 'tb-1-9') : 'wb-' + level;
  if (!lib().installed[id]) return null;
  const arr = lessonMapsFor(id)[level];
  return arr && arr[lesson - 1] ? { id, page: arr[lesson - 1] } : null;
}

/* ---------------- Import ---------------- */

function matchBook(name) {
  return BOOKS.find(b => b.match.test(name));
}

async function importPdfs(files) {
  const list = [...files].filter(f => /\.pdf$/i.test(f.name) || f.type === 'application/pdf');
  if (!list.length) return;
  let done = 0;
  for (const file of list) {
    const book = matchBook(file.name);
    const id = book ? book.id : 'own-' + file.name.replace(/\.pdf$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
    const title = book ? book.title : file.name.replace(/\.pdf$/i, '').replace(/^ttmik\s*/i, '');
    setBusy(`${title} wird eingelesen …`);
    try {
      const buf = await file.arrayBuffer();
      const doc = await openPdf(buf.slice(0));
      const pages = doc.numPages;

      // Lektionen finden (Workbooks immer, Lehrbuch nur bei unbekannter Ausgabe)
      if (book && (book.kind === 'workbook' || (book.id === 'tb-1-9' && pages !== TB19_PAGES))) {
        const found = await scanLessons(doc, p => setBusy(`${title}: Lektionen werden gesucht … ${Math.round(p * 100)} %`));
        const maps = {};
        const levels = book.kind === 'workbook' ? [book.level] : Object.keys(found).map(Number);
        for (const lv of levels) {
          if (found[lv] && Object.keys(found[lv]).length >= 3) maps[lv] = fillGaps(found[lv], lessonCount(lv), pages);
        }
        lib().maps[id] = maps;
      }
      doc.destroy();

      await idb.put('files', id, new Blob([buf], { type: 'application/pdf' }));
      lib().installed[id] = { title, name: file.name, size: file.size, pages, added: Date.now() };
      save();
      done++;
    } catch (e) {
      console.error(e);
      toast(`„${file.name}“ konnte nicht gelesen werden`);
    }
  }
  setBusy(null);
  if (done) toast(done === 1 ? '1 Buch hinzugefügt' : `${done} Bücher hinzugefügt`);
  renderLibrary();
}

async function removeBook(id) {
  const inst = lib().installed[id];
  if (!inst || !confirm(`„${inst.title}“ vom Gerät entfernen? Deine Notizen und Stift-Einträge bleiben erhalten.`)) return;
  await idb.del('files', id);
  delete lib().installed[id];
  save();
  renderLibrary();
}

let busyEl = null;
function setBusy(msg) {
  if (!msg) { if (busyEl) busyEl.remove(); busyEl = null; return; }
  if (!busyEl) {
    busyEl = document.createElement('div');
    busyEl.className = 'busy';
    document.body.appendChild(busyEl);
  }
  busyEl.innerHTML = `<div><span class="spinner"></span><p>${esc(msg)}</p></div>`;
}

/* ---------------- Bibliotheksansicht ---------------- */

const ICON_BOOK = '<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg>';
const ICON_PEN = '<svg viewBox="0 0 24 24"><path d="M4 20l4-1L19 8a2.1 2.1 0 0 0-3-3L5 16z"/><path d="M14 7l3 3"/></svg>';
const ICON_CHAT = '<svg viewBox="0 0 24 24"><path d="M5 5h14v10H9l-4 4z"/><path d="M9 9h6M9 12h4"/></svg>';

let openLevel = null;

function renderLibrary() {
  const L = lib();
  const stage = STAGES.find(s => s.id === L.stage) || STAGES[0];
  const installedCount = Object.keys(L.installed).length;
  const totalBytes = Object.values(L.installed).reduce((a, b) => a + (b.size || 0), 0);

  const chips = STAGES.map(s => `<button class="chip ${s.id === stage.id ? 'on' : ''}" data-stage="${s.id}">${s.name}</button>`).join('');

  // Level-Karten
  const levels = stage.levels.filter(lv => lv <= 9).map(lv => {
    const n = lessonCount(lv);
    const tbOk = !!lessonPage('textbook', lv, 1);
    const wbOk = !!lessonPage('workbook', lv, 1);
    let doneCount = 0, next = null;
    for (let i = 1; i <= n; i++) {
      if (L.done[`L${lv}-${i}`]) doneCount++;
      else if (!next) next = i;
    }
    const isOpen = openLevel === lv || (openLevel === null && next !== null && stage.levels.find(x => {
      for (let i = 1; i <= lessonCount(x); i++) if (!L.done[`L${x}-${i}`]) return true;
      return false;
    }) === lv);

    const rows = [];
    for (let i = 1; i <= n; i++) {
      const tb = lessonPage('textbook', lv, i);
      const wb = lessonPage('workbook', lv, i);
      const key = `L${lv}-${i}`;
      rows.push(`
        <div class="lesson ${L.done[key] ? 'done' : ''} ${i === next ? 'next' : ''}">
          <button class="tick" data-done="${key}" aria-label="Lektion ${i} erledigt" aria-pressed="${!!L.done[key]}"></button>
          <span class="ln">Lektion ${i}</span>
          <button class="pg" ${tb ? `data-open="${tb.id}" data-page="${tb.page}"` : 'disabled'}>Lehrbuch${tb ? ` <small>S. ${tb.page}</small>` : ''}</button>
          <button class="pg" ${wb ? `data-open="${wb.id}" data-page="${wb.page}"` : 'disabled'}>Workbook${wb ? ` <small>S. ${wb.page}</small>` : ''}</button>
        </div>`);
    }
    const missing = [!tbOk && 'Lehrbuch Level 1–9', !wbOk && `Workbook Level ${lv}`].filter(Boolean);
    const nextTb = next && lessonPage('textbook', lv, next);
    return `
      <details class="level" data-level="${lv}" ${isOpen ? 'open' : ''}>
        <summary>
          <span class="lv">Level ${lv}</span>
          <span class="lvmeta">${doneCount}/${n} Lektionen</span>
          <div class="bar"><i style="width:${Math.round(doneCount / n * 100)}%"></i></div>
        </summary>
        ${missing.length ? `<p class="hint">Noch nicht hinzugefügt: ${missing.join(', ')}</p>` : ''}
        ${next && nextTb ? `<button class="btn small primary-soft" data-open="${nextTb.id}" data-page="${nextTb.page}">Weiter mit Lektion ${next}</button>` : ''}
        <div class="lessons">${rows.join('')}</div>
      </details>`;
  }).join('');

  // Begleitbücher dieser Stufe
  const extras = BOOKS.filter(b => b.stage === stage.id);
  const extraRows = extras.map(b => bookRow(b.id, b.title, b.hint)).join('');

  // Eigene, nicht erkannte PDFs
  const own = Object.keys(L.installed).filter(id => !BOOKS.find(b => b.id === id));
  const ownRows = own.map(id => bookRow(id, L.installed[id].title)).join('');

  $app.innerHTML = `
    <h1>Bibliothek</h1>
    <p class="sub">Deine Bücher bleiben nur auf diesem Gerät.</p>
    <button class="btn primary" id="add-pdf">PDFs hinzufügen</button>
    <input type="file" id="pdf-input" accept="application/pdf,.pdf" multiple hidden>

    <div class="chips">${chips}</div>

    ${levels ? `<h2>Lehrbuch &amp; Workbook</h2>${levels}` : ''}
    ${stage.levels.includes(10) ? `<h2>Level 10</h2><div class="list">${bookRow('tb-10', 'Lehrbuch Level 10')}</div>` : ''}

    <h2>Begleitbücher · ${stage.name}</h2>
    <div class="list">${extraRows}</div>
    <p class="hint">Die Einordnung in die Stufen ist ein Vorschlag – öffnen kannst du jedes Buch jederzeit.</p>

    ${own.length ? `<h2>Weitere PDFs</h2><div class="list">${ownRows}</div>` : ''}

    ${installedCount ? `<p class="hint" style="margin-top:20px">${installedCount} ${installedCount === 1 ? 'Buch' : 'Bücher'} gespeichert · ${(totalBytes / 1048576).toFixed(0)} MB</p>` : ''}
  `;

  const input = document.getElementById('pdf-input');
  document.getElementById('add-pdf').onclick = () => input.click();
  input.onchange = () => { importPdfs(input.files); input.value = ''; };

  $app.querySelectorAll('[data-stage]').forEach(b => b.onclick = () => { L.stage = +b.dataset.stage; openLevel = null; save(); renderLibrary(); });
  $app.querySelectorAll('details.level').forEach(d => d.addEventListener('toggle', () => { if (d.open) openLevel = +d.dataset.level; }));
  $app.querySelectorAll('[data-done]').forEach(b => b.onclick = () => {
    const k = b.dataset.done;
    L.done[k] ? delete L.done[k] : (L.done[k] = today());
    save();
    renderLibrary();
  });
  $app.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openReader(b.dataset.open, b.dataset.page ? +b.dataset.page : null));
  $app.querySelectorAll('[data-remove]').forEach(b => b.onclick = () => removeBook(b.dataset.remove));
}

function bookRow(id, title, hint) {
  const inst = lib().installed[id];
  const last = lib().last[id];
  let status;
  if (inst) status = last ? `S. ${last} von ${inst.pages}` : `${inst.pages} Seiten`;
  else status = 'nicht hinzugefügt';
  return `
    <div class="row book ${inst ? '' : 'missing'}">
      <div class="w">
        <div class="t">${esc(title)}</div>
        <div class="d">${hint ? esc(hint) + ' · ' : ''}${status}</div>
        ${inst && last ? `<div class="bar"><i style="width:${Math.round(last / inst.pages * 100)}%"></i></div>` : ''}
      </div>
      ${inst ? `<button class="icon-btn" data-remove="${esc(id)}" aria-label="Entfernen">${ICON_TRASH}</button>
                <button class="btn small" data-open="${esc(id)}">Öffnen</button>` : ''}
    </div>`;
}

/* ---------------- Leser ----------------
   Ein Leser hat ein oder zwei „Panes“. Im Nebeneinander-Modus zeigt
   das zweite Pane das passende Gegenstück (Workbook ↔ Lehrbuch) und
   folgt automatisch, wenn im ersten Pane eine neue Lektion beginnt.   */

const SPLIT_MIN_WIDTH = 900;
let reader = null;

const canSplitScreen = () => window.innerWidth >= SPLIT_MIN_WIDTH;
const activePane = () => reader && reader.panes[reader.active];

async function loadPane(id, page) {
  const inst = lib().installed[id];
  if (!inst) throw new Error('nicht installiert');
  const blob = await idb.get('files', id);
  if (!blob) throw new Error('Datei fehlt');
  const doc = await openPdf(await blob.arrayBuffer());
  return {
    id, doc, title: inst.title,
    page: Math.min(Math.max(1, page || lib().last[id] || 1), doc.numPages),
    zoom: 1, strokes: [], history: [], note: '', renderTask: null, lessonKey: null
  };
}

async function openReader(id, page, opts = {}) {
  if (!lib().installed[id]) return;
  setBusy('Buch wird geöffnet …');
  try {
    const main = await loadPane(id, page);
    reader = { panes: [main], active: 0, mode: 'read', color: '#1e1b17', tool: 'pen', notesOpen: false };
    const wantSplit = opts.split ?? (lib().split !== false);
    if (wantSplit && canSplitScreen()) await addPairPane();
    setBusy(null);
    setView('reader');
  } catch (e) {
    console.error(e);
    setBusy(null);
    reader = null;
    toast('Buch konnte nicht geöffnet werden');
  }
}

async function addPairPane() {
  const main = reader.panes[0];
  const t = pairTargetFor(main);
  if (!t) return false;
  const pane = await loadPane(t.id, t.page);
  pane.lessonKey = lessonKeyOf(pane);
  main.lessonKey = lessonKeyOf(main);
  reader.panes[1] = pane;
  return true;
}

function closeReader() {
  if (reader) {
    saveNoteNow();
    reader.panes.forEach(p => { lib().last[p.id] = p.page; p.doc.destroy(); });
    save();
  }
  reader = null;
  setView('library');
}

const PANE_HTML = i => `
  <section class="r-pane" data-i="${i}">
    <div class="r-phead">
      <span class="r-ptitle"></span>
      <button class="r-pnav" data-nav="-1" aria-label="Vorherige Seite"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
      <button class="r-pageno r-pno"></button>
      <button class="r-pnav" data-nav="1" aria-label="Nächste Seite"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>
    </div>
    <div class="r-stage">
      <div class="r-page"><canvas class="c-pdf"></canvas><canvas class="c-ink"></canvas></div>
    </div>
  </section>`;

function renderReader() {
  if (!reader) return setView('library');
  const r = reader;
  const split = r.panes.length > 1;

  $app.innerHTML = `
    <div class="reader ${split ? 'split' : ''}">
      <div class="r-top">
        <button class="icon-btn" id="r-close" aria-label="Schließen">${ICON_CLOSE}</button>
        <div class="r-title"><b id="r-title"></b><span id="r-lesson"></span></div>
        <button class="r-split" id="r-split" hidden>
          <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 5v14"/></svg>
          <span>Nebeneinander</span>
        </button>
        <button class="r-pageno" id="r-pageno"></button>
      </div>
      <div class="r-panes">${r.panes.map((_, i) => PANE_HTML(i)).join('')}</div>
      <div class="r-pentools" id="r-pentools">
        ${['#1e1b17', '#b2382b', '#2f5d9a'].map(c => `<button class="swatch" data-color="${c}" style="--c:${c}" aria-label="Farbe"></button>`).join('')}
        <button class="tool" data-tool="eraser">Radierer</button>
        <button class="tool" id="r-undo">Zurück</button>
        <button class="tool" id="r-clear">Seite leeren</button>
      </div>
      <div class="r-notes" id="r-notes">
        <label for="r-note">Antworten zu <span id="r-note-page"></span></label>
        <textarea id="r-note" lang="ko" placeholder="Hier kannst du deine Antworten tippen …"></textarea>
      </div>
      <div class="r-bottom">
        <button class="icon-btn" id="r-prev" aria-label="Vorherige Seite"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
        <button class="r-tab" id="r-pen">${ICON_PEN}<span>Stift</span></button>
        <button class="r-tab" id="r-ans">${ICON_CHAT}<span>Antworten</span></button>
        <button class="r-tab" id="r-pair"><svg viewBox="0 0 24 24"><path d="M7 7h11l-3-3M17 17H6l3 3"/></svg><span id="r-pair-l">Workbook</span></button>
        <button class="r-tab" id="r-zoom"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5M8.5 11h5M11 8.5v5"/></svg><span id="r-zoom-l">Zoom</span></button>
        <button class="icon-btn" id="r-next" aria-label="Nächste Seite"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>
      </div>
    </div>`;

  document.getElementById('r-close').onclick = closeReader;
  document.getElementById('r-prev').onclick = () => goPage(activePane(), activePane().page - 1);
  document.getElementById('r-next').onclick = () => goPage(activePane(), activePane().page + 1);
  document.getElementById('r-pageno').onclick = () => askPage(activePane());
  document.getElementById('r-pen').onclick = () => { r.mode = r.mode === 'pen' ? 'read' : 'pen'; updateReaderChrome(); };
  document.getElementById('r-ans').onclick = () => {
    r.notesOpen = !r.notesOpen;
    updateReaderChrome();
    renderAllPanes(false); // nur neu einpassen, Inhalte bleiben
    if (r.notesOpen) document.getElementById('r-note').focus();
  };
  document.getElementById('r-zoom').onclick = () => {
    const p = activePane();
    p.zoom = p.zoom === 1 ? 1.5 : p.zoom === 1.5 ? 2.2 : 1;
    renderPane(p, false);
  };
  document.getElementById('r-pair').onclick = jumpToPair;
  document.getElementById('r-split').onclick = toggleSplit;
  document.getElementById('r-undo').onclick = () => undoInk(activePane());
  document.getElementById('r-clear').onclick = () => {
    const p = activePane();
    if (p.strokes.length && confirm('Alle Stift-Einträge auf dieser Seite löschen?')) {
      pushHistory(p); p.strokes = []; drawInk(p); saveInk(p);
    }
  };
  $app.querySelectorAll('.swatch').forEach(b => b.onclick = () => { r.color = b.dataset.color; r.tool = 'pen'; updateReaderChrome(); });
  $app.querySelector('[data-tool=eraser]').onclick = () => { r.tool = 'eraser'; updateReaderChrome(); };
  document.getElementById('r-note').oninput = scheduleNoteSave;

  r.panes.forEach((p, i) => {
    const el = $app.querySelector(`.r-pane[data-i="${i}"]`);
    p.el = el;
    p.stage = el.querySelector('.r-stage');
    p.pdfC = el.querySelector('.c-pdf');
    p.inkC = el.querySelector('.c-ink');
    p.wrap = el.querySelector('.r-page');
    el.addEventListener('pointerdown', () => setActive(i), true);
    el.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => goPage(p, p.page + +b.dataset.nav));
    el.querySelector('.r-pno').onclick = () => askPage(p);
    setupInk(p);
    setupSwipe(p);
  });

  updateReaderChrome();
  renderAllPanes();
  loadNoteField();
}

function setActive(i) {
  const r = reader;
  if (!r || r.active === i || !r.panes[i]) return;
  saveNoteNow();
  r.active = i;
  updateReaderChrome();
  loadNoteField();
}

function askPage(p) {
  const v = prompt(`Zu Seite (1–${p.doc.numPages}):`, p.page);
  if (v) goPage(p, parseInt(v, 10));
}

function updateReaderChrome() {
  const r = reader;
  if (!r || !document.querySelector('.reader')) return;
  const p = activePane();
  const split = r.panes.length > 1;
  const root = $app.querySelector('.reader');
  root.classList.toggle('pen', r.mode === 'pen');
  root.classList.toggle('notes', r.notesOpen);
  root.classList.toggle('split', split);

  document.getElementById('r-pen').classList.toggle('on', r.mode === 'pen');
  document.getElementById('r-ans').classList.toggle('on', r.notesOpen);
  $app.querySelectorAll('.swatch').forEach(b => b.classList.toggle('on', r.tool === 'pen' && b.dataset.color === r.color));
  $app.querySelector('[data-tool=eraser]').classList.toggle('on', r.tool === 'eraser');

  // Kopfzeile
  const at = lessonAt(p.id, p.page);
  document.getElementById('r-title').textContent = split ? `${r.panes[0].title} · ${r.panes[1].title}` : p.title;
  const at0 = lessonAt(r.panes[0].id, r.panes[0].page);
  document.getElementById('r-lesson').textContent = (split ? at0 : at) ? `Level ${(split ? at0 : at).level} · Lektion ${(split ? at0 : at).lesson}` : '';
  document.getElementById('r-pageno').textContent = `${p.page} / ${p.doc.numPages}`;
  document.getElementById('r-pageno').hidden = split;
  document.getElementById('r-note-page').textContent = `${p.title}, S. ${p.page}`;

  // Pane-Köpfe
  r.panes.forEach((q, i) => {
    if (!q.el) return;
    q.el.classList.toggle('active', split && i === r.active);
    q.el.querySelector('.r-ptitle').textContent = q.title;
    q.el.querySelector('.r-pno').textContent = `${q.page} / ${q.doc.numPages}`;
  });

  // Gegenstück / Nebeneinander
  const pair = pairTargetFor(r.panes[0]);
  const sb = document.getElementById('r-split');
  sb.hidden = !(canSplitScreen() && (pair || split));
  sb.classList.toggle('on', split);
  const pb = document.getElementById('r-pair');
  pb.hidden = split;
  const single = pairTargetFor(p);
  pb.disabled = !single;
  document.getElementById('r-pair-l').textContent = single ? (single.kind === 'workbook' ? 'Workbook' : 'Lehrbuch') : 'Gegenstück';
  document.getElementById('r-zoom-l').textContent = p.zoom === 1 ? 'Zoom' : `${p.zoom}×`;
}

function lessonKeyOf(p) {
  const at = lessonAt(p.id, p.page);
  return at ? `${at.level}-${at.lesson}` : null;
}

function pairTargetFor(p) {
  if (!p) return null;
  const at = lessonAt(p.id, p.page);
  if (!at) return null;
  const kind = p.id.startsWith('wb-') ? 'textbook' : 'workbook';
  const t = lessonPage(kind, at.level, at.lesson);
  return t ? { ...t, kind } : null;
}

async function jumpToPair() {
  const p = activePane();
  const t = pairTargetFor(p);
  if (!t) return;
  saveNoteNow();
  lib().last[p.id] = p.page;
  save();
  reader.panes.forEach(q => q.doc.destroy());
  reader = null;
  await openReader(t.id, t.page, { split: false });
}

async function toggleSplit() {
  const r = reader;
  saveNoteNow();
  if (r.panes.length > 1) {
    const second = r.panes.pop();
    lib().last[second.id] = second.page;
    second.doc.destroy();
    r.active = 0;
    lib().split = false;
  } else {
    setBusy('Gegenstück wird geöffnet …');
    try {
      if (!(await addPairPane())) { setBusy(null); return; }
    } catch (e) { setBusy(null); toast('Gegenstück konnte nicht geöffnet werden'); return; }
    setBusy(null);
    lib().split = true;
  }
  save();
  renderReader();
}

async function goPage(p, n) {
  if (!reader || !p || isNaN(n)) return;
  n = Math.min(Math.max(1, n), p.doc.numPages);
  if (n === p.page) return;
  if (p === activePane()) saveNoteNow();
  p.page = n;
  lib().last[p.id] = n;
  save();
  await renderPane(p);
  p.stage.scrollTo(0, 0);

  // Erstes Pane gibt die Lektion vor: beginnt eine neue, folgt das zweite
  const r = reader;
  if (r && r.panes.length > 1 && p === r.panes[0]) {
    const key = lessonKeyOf(p);
    if (key && key !== p.lessonKey) {
      p.lessonKey = key;
      const t = pairTargetFor(p);
      const other = r.panes[1];
      if (t && t.id === other.id && lessonKeyOf(other) !== key) {
        other.page = t.page;
        lib().last[other.id] = t.page;
        save();
        await renderPane(other);
        other.stage.scrollTo(0, 0);
      }
    }
  }
}

function renderAllPanes(reload = true) {
  if (!reader) return;
  reader.panes.forEach(p => renderPane(p, reload && !p.loadedKey));
}

// reload = false: nur neu zeichnen (Zoom, Drehen, Antwortfeld) – Stift und Antworten bleiben unangetastet
async function renderPane(p, reload = true) {
  const r = reader;
  if (!r || !p.stage) return;
  updateReaderChrome();
  const pageNo = p.page;
  if (p.renderTask) { try { p.renderTask.cancel(); } catch (e) { /* egal */ } }
  const page = await p.doc.getPage(pageNo);
  if (!reader || p.page !== pageNo) return;

  // Größe: im Hochformat auf Breite, im Querformat bzw. nebeneinander ganze Seite einpassen
  const base = page.getViewport({ scale: 1 });
  const availW = Math.max(100, p.stage.clientWidth - 16);
  const availH = Math.max(100, p.stage.clientHeight - 16);
  const fitW = availW / base.width;
  const fitPage = Math.min(fitW, availH / base.height);
  const wide = availW > availH || r.panes.length > 1;
  const scale = (wide ? fitPage : fitW) * p.zoom;
  const vp = page.getViewport({ scale });

  let dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const maxPixels = 14e6; // Grenze für iOS-Canvas
  if (vp.width * vp.height * dpr * dpr > maxPixels) dpr = Math.sqrt(maxPixels / (vp.width * vp.height));
  for (const c of [p.pdfC, p.inkC]) {
    c.width = Math.floor(vp.width * dpr);
    c.height = Math.floor(vp.height * dpr);
    c.style.width = Math.floor(vp.width) + 'px';
    c.style.height = Math.floor(vp.height) + 'px';
  }
  p.wrap.style.width = Math.floor(vp.width) + 'px';
  p.wrap.style.height = Math.floor(vp.height) + 'px';

  const ctx = p.pdfC.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, p.pdfC.width, p.pdfC.height);
  p.renderTask = page.render({ canvasContext: ctx, viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null });
  try { await p.renderTask.promise; } catch (e) { if (e && e.name === 'RenderingCancelledException') return; }

  const key = `${p.id}:${pageNo}`;
  if (!reload && p.loadedKey === key) { drawInk(p); return; }
  const [ink, note] = await Promise.all([idb.get('ink', key), idb.get('notes', key)]);
  if (!reader || p.page !== pageNo) return;
  p.strokes = ink || [];
  p.history = [];
  p.note = note || '';
  p.loadedKey = key;
  drawInk(p);
  if (p === activePane()) loadNoteField();
}

function loadNoteField() {
  const p = activePane();
  const ta = document.getElementById('r-note');
  if (!p || !ta) return;
  ta.value = p.note || '';
  document.getElementById('r-ans').classList.toggle('has', !!(p.note || '').trim());
}

/* ----- Stift ----- */

let penSeen = false;

function setupInk(p) {
  const c = p.inkC;
  let cur = null;
  const pos = e => {
    const b = c.getBoundingClientRect();
    return [(e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height];
  };
  c.addEventListener('pointerdown', e => {
    if (!reader || reader.mode !== 'pen') return;
    if (e.pointerType === 'pen') penSeen = true;
    if (penSeen && e.pointerType === 'touch') return; // Handballen ignorieren, sobald ein Pencil benutzt wurde
    e.preventDefault();
    c.setPointerCapture(e.pointerId);
    pushHistory(p);
    if (reader.tool === 'eraser') { cur = { erase: true }; eraseAt(p, pos(e)); return; }
    cur = { c: reader.color, w: 0.0035, p: [pos(e)] };
    p.strokes.push(cur);
  });
  c.addEventListener('pointermove', e => {
    if (!cur) return;
    e.preventDefault();
    if (cur.erase) { eraseAt(p, pos(e)); return; }
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of evs) cur.p.push(pos(ev));
    drawInk(p);
  });
  const end = () => {
    if (!cur) return;
    if (!cur.erase && cur.p.length === 1) cur.p.push([cur.p[0][0] + 0.0005, cur.p[0][1]]);
    cur = null;
    drawInk(p);
    saveInk(p);
  };
  c.addEventListener('pointerup', end);
  c.addEventListener('pointercancel', end);
}

function eraseAt(p, [x, y]) {
  const ratio = p.inkC.height / p.inkC.width;
  const before = p.strokes.length;
  p.strokes = p.strokes.filter(s => !s.p.some(([px, py]) => Math.hypot(px - x, (py - y) * ratio) < 0.02));
  if (p.strokes.length !== before) drawInk(p);
}

function drawInk(p) {
  const c = p.inkC;
  if (!c) return;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const s of p.strokes) {
    ctx.strokeStyle = s.c;
    ctx.lineWidth = Math.max(1, s.w * c.width);
    ctx.beginPath();
    const pts = s.p.map(([x, y]) => [x * c.width, y * c.height]);
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const l = pts[pts.length - 1];
    ctx.lineTo(l[0], l[1]);
    ctx.stroke();
  }
}

function pushHistory(p) {
  p.history.push(JSON.stringify(p.strokes));
  if (p.history.length > 40) p.history.shift();
}

function undoInk(p) {
  if (!p || !p.history.length) return;
  p.strokes = JSON.parse(p.history.pop());
  drawInk(p);
  saveInk(p);
}

function saveInk(p) {
  const key = `${p.id}:${p.page}`;
  (p.strokes.length ? idb.put('ink', key, p.strokes) : idb.del('ink', key))
    .catch(() => toast('Stift-Einträge konnten nicht gespeichert werden'));
}

/* ----- Antworten ----- */

let noteTimer = null;
function scheduleNoteSave() {
  clearTimeout(noteTimer);
  noteTimer = setTimeout(saveNoteNow, 400);
}
function saveNoteNow() {
  clearTimeout(noteTimer);
  const p = activePane();
  const ta = document.getElementById('r-note');
  if (!p || !ta) return;
  const v = ta.value;
  if (v === (p.note || '')) return;
  p.note = v;
  const key = `${p.id}:${p.page}`;
  (v.trim() ? idb.put('notes', key, v) : idb.del('notes', key)).catch(() => {});
  const b = document.getElementById('r-ans');
  if (b) b.classList.toggle('has', !!v.trim());
}

/* ----- Wischen zum Blättern ----- */

function setupSwipe(p) {
  let sx = 0, sy = 0, t0 = 0;
  p.stage.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) { t0 = 0; return; }
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; t0 = Date.now();
  }, { passive: true });
  p.stage.addEventListener('touchend', e => {
    if (!reader || reader.mode === 'pen' || p.zoom !== 1 || !t0) return;
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if (Date.now() - t0 < 600 && Math.abs(dx) > 60 && Math.abs(dy) < 50) goPage(p, p.page + (dx < 0 ? 1 : -1));
  }, { passive: true });
}

document.addEventListener('keydown', e => {
  if (view !== 'reader' || !reader || e.target.matches('input, textarea, select')) return;
  if (e.key === 'ArrowRight') goPage(activePane(), activePane().page + 1);
  else if (e.key === 'ArrowLeft') goPage(activePane(), activePane().page - 1);
  else if (e.key === 'Escape') closeReader();
});

// Drehen / Größe ändern: neu einpassen, zu schmal für zwei Bücher → eins schließen
let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (view !== 'reader' || !reader) return;
    if (reader.panes.length > 1 && !canSplitScreen()) {
      saveNoteNow();
      const second = reader.panes.pop();
      lib().last[second.id] = second.page;
      second.doc.destroy();
      reader.active = 0;
      save();
      renderReader();
      return;
    }
    updateReaderChrome();
    renderAllPanes(false);
  }, 150);
});

/* ---------------- Backup-Erweiterung ---------------- */

async function libraryBackupData() {
  try {
    const [ink, notes] = await Promise.all([idb.entries('ink'), idb.entries('notes')]);
    return { ink, notes };
  } catch (e) { return null; }
}

async function libraryRestoreData(data) {
  if (!data) return;
  for (const [k, v] of data.ink || []) await idb.put('ink', k, v);
  for (const [k, v] of data.notes || []) await idb.put('notes', k, v);
}
