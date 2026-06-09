/**
 * ui.js — rendering and events. Thin layer over data.js + import.js.
 * Reads through selectors, mutates through actions, then re-renders.
 */

import * as data from './data.js';
import * as imp from './import.js';

data.loadState();

let activeTag = 'all';
let searchTerm = '';
let catMenuOpen = false;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const state = data.getState();
let activeCollection = state.activeCollection || data.DEFAULT_COLLECTION;
if (!data.collections().some((c) => c.id === activeCollection)) activeCollection = data.DEFAULT_COLLECTION;

/* refs */
const topGrid = $('topGrid');
const allGrid = $('allGrid');
const topSection = $('topSection');
const allHeading = $('allHeading');
const allLabel = $('allLabel');
const empty = $('empty');
const filtersEl = $('filters');
const catsEl = $('cats');
const catName = $('catName');
const catMeta = $('catMeta');

/* ───────────────────────── category nav ───────────────────────── */

const HAMBURGER = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 4h12M2 8h12M2 12h12"/></svg>';
const inlineCap = () => (window.innerWidth >= 720 ? 3 : 2);

function renderCats() {
  const list = data.collections();
  const cap = inlineCap();
  let ordered = list.slice();
  const ai = ordered.findIndex((c) => c.id === activeCollection);
  if (ai >= cap && ai !== -1) { const [a] = ordered.splice(ai, 1); ordered.unshift(a); }
  const inline = ordered.slice(0, cap);
  const overflow = ordered.slice(cap);

  let html = inline.map((c) => `<button class="cat-tab${c.id === activeCollection ? ' active' : ''}" data-cat="${c.id}">${esc(c.label)}</button>`).join('');
  if (overflow.length) {
    html += `<button class="cat-more" id="catMore" title="More categories" aria-haspopup="true">${HAMBURGER}<span class="more-count">${overflow.length}</span></button>`;
    html += `<div class="cat-menu${catMenuOpen ? ' open' : ''}" id="catMenu">${overflow.map((c) => `<button class="mi${c.id === activeCollection ? ' active' : ''}" data-cat="${c.id}">${esc(c.label)}</button>`).join('')}</div>`;
  } else { catMenuOpen = false; }
  html += '<button class="cat-add" id="catAdd" title="New category">+</button>';
  catsEl.innerHTML = html;
}

function renderFilters() {
  const tags = data.tagsForCollection(activeCollection);
  if (activeTag !== 'all' && !tags.includes(activeTag)) activeTag = 'all';
  let html = `<button class="tag-btn${activeTag === 'all' ? ' active' : ''}" data-tag="all">All</button>`;
  tags.forEach((t) => { html += `<button class="tag-btn${activeTag === t ? ' active' : ''}" data-tag="${t}">${esc(data.tagLabel(t))}</button>`; });
  filtersEl.innerHTML = html;
}

/* ───────────────────────────── cards ──────────────────────────── */

function maxUses() { return Math.max(1, ...data.livePrompts(activeCollection).map((p) => data.useCount(p.id))); }
function idLabel(p) { return p.custom ? 'CUSTOM' : 'PROMPT ' + p.num; }

function cardHTML(p, opts = {}) {
  const uses = data.useCount(p.id);
  const pct = Math.round((uses / maxUses()) * 100);
  const feat = opts.feat ? ' feat' : '';
  const rankLine = opts.rank ? `<div class="card-rank">#${opts.rank}</div>` : `<div class="card-id">${idLabel(p)}</div>`;
  return `
  <div class="card${feat}" data-id="${p.id}">
    <div class="card-top">
      <div>${rankLine}<div class="card-title">${esc(p.title)}</div></div>
      <span class="card-tag">${esc(data.tagLabel(p.tag))}</span>
    </div>
    <div class="card-preview">${esc(p.preview || '')}</div>
    <div class="tally">
      <div class="counter">
        <button class="cbtn minus" data-act="dec" data-id="${p.id}" aria-label="Decrease">−</button>
        <span class="cval">${uses}</span>
        <button class="cbtn plus" data-act="inc" data-id="${p.id}" aria-label="Increase">+</button>
      </div>
      <span class="bar"><i style="width:${pct}%"></i></span>
    </div>
    <div class="actions">
      <button class="btn preview" data-act="preview" data-id="${p.id}"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/></svg>Preview</button>
      <button class="btn copy" data-act="copy" data-id="${p.id}"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M3 11V3a1 1 0 011-1h8"/></svg>Copy</button>
      <button class="btn edit" data-act="edit" data-id="${p.id}"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M11 2.5l2.5 2.5L6 12.5 3 13l.5-3z"/></svg>Edit</button>
      <button class="btn del" data-act="del" data-id="${p.id}" title="Delete prompt"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 4h10M6 4V2.5a1 1 0 011-1h2a1 1 0 011 1V4M5 4l.5 9a1 1 0 001 1h3a1 1 0 001-1L11 4"/></svg></button>
    </div>
  </div>`;
}

/* ──────────────────────────── render ──────────────────────────── */

function render() {
  renderCats();
  renderFilters();

  const total = data.livePrompts(activeCollection).length;
  catName.textContent = data.collectionLabel(activeCollection);
  let metaHtml = `${total} prompt${total !== 1 ? 's' : ''}`;
  if (activeTag !== 'all') metaHtml += ` <span class="del-cat" id="renameType" style="color:rgba(0,255,207,.7);">rename “${esc(data.tagLabel(activeTag))}”</span>`;
  if (activeCollection !== data.DEFAULT_COLLECTION) metaHtml += ' <span class="del-cat" id="delCat">delete category</span>';
  catMeta.innerHTML = metaHtml;

  const filtering = activeTag !== 'all' || searchTerm !== '';
  const ranked = data.ranked(activeCollection);

  if (filtering) {
    topSection.style.display = 'none';
    const q = searchTerm;
    const filtered = ranked.filter((p) => (activeTag === 'all' || p.tag === activeTag) && (!q || p.title.toLowerCase().includes(q) || (p.preview || '').toLowerCase().includes(q)));
    allHeading.innerHTML = 'Results';
    allLabel.textContent = `${filtered.length} match${filtered.length !== 1 ? 'es' : ''} · ranked by use`;
    allGrid.innerHTML = filtered.map((p, i) => cardHTML(p, { rank: i + 1 })).join('');
    empty.textContent = 'No prompts match that search.';
    empty.style.display = filtered.length === 0 ? 'block' : 'none';
  } else {
    topSection.style.display = ranked.length ? 'block' : 'none';
    topGrid.innerHTML = ranked.slice(0, 6).map((p) => cardHTML(p, { feat: true })).join('');
    allHeading.innerHTML = 'All <em>Prompts</em>';
    allLabel.textContent = `${ranked.length} total · ranked by use`;
    allGrid.innerHTML = ranked.slice(6).map((p, i) => cardHTML(p, { rank: i + 7 })).join('');
    if (ranked.length === 0) { empty.textContent = 'No prompts in this category yet. Use “Add prompt” or “Import .md” to start building it.'; empty.style.display = 'block'; }
    else empty.style.display = 'none';
  }
}

/* ─────────────────────────── clipboard ────────────────────────── */

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return; } catch { /* fall through */ }
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); } catch { /* ignore */ }
  document.body.removeChild(ta);
}
function flashCopy(btn) {
  btn.classList.add('copied');
  const orig = btn.innerHTML;
  btn.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 8l3.5 3.5L13 4.5"/></svg> Copied';
  setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = orig; }, 1700);
}
function pulsePlus(card) {
  const plus = card && card.querySelector('.cbtn.plus');
  if (!plus) return;
  plus.classList.add('pulse');
  setTimeout(() => plus.classList.remove('pulse'), 3000);
}

/* ─────────────────── confirm / name modal (async) ─────────────── */

const confirmEl = $('confirm');
const cfHead = $('cfHead'); const cfMsg = $('cfMsg'); const cfInput = $('cfInput');
const cfYes = $('cfYes'); const cfNo = $('cfNo'); const cfClose = $('cfClose');
let cfResolve = null;

function openConfirm(opts) {
  cfHead.textContent = opts.title || 'Confirm';
  cfMsg.innerHTML = opts.message || '';
  cfYes.textContent = opts.yesLabel || 'Confirm';
  cfYes.classList.toggle('danger', !!opts.danger);
  if (opts.input) { cfInput.style.display = 'block'; cfInput.placeholder = typeof opts.input === 'string' ? opts.input : ''; cfInput.value = opts.value || ''; }
  else { cfInput.style.display = 'none'; cfInput.value = ''; }
  confirmEl.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => (cfInput.style.display === 'block' ? cfInput : cfYes).focus(), 50);
  return new Promise((res) => { cfResolve = res; });
}
function closeConfirm(result) {
  confirmEl.classList.remove('open'); document.body.style.overflow = '';
  const r = cfResolve; cfResolve = null; if (r) r(result);
}
cfYes.addEventListener('click', () => closeConfirm(cfInput.style.display === 'block' ? (cfInput.value.trim() || true) : true));
cfNo.addEventListener('click', () => closeConfirm(false));
cfClose.addEventListener('click', () => closeConfirm(false));
confirmEl.addEventListener('click', (e) => { if (e.target === confirmEl) closeConfirm(false); });
cfInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') cfYes.click(); });

/* ───────────────────── global click delegation ────────────────── */

document.addEventListener('click', async (e) => {
  if (e.target.closest('#catMore')) {
    catMenuOpen = !catMenuOpen;
    const m = $('catMenu'); if (m) m.classList.toggle('open', catMenuOpen);
    return;
  }
  if (catMenuOpen && !e.target.closest('#catMenu') && !e.target.closest('#catMore')) {
    catMenuOpen = false; const m = $('catMenu'); if (m) m.classList.remove('open');
  }

  const catBtn = e.target.closest('[data-cat]');
  if (catBtn) {
    activeCollection = catBtn.dataset.cat; data.setActiveCollection(activeCollection);
    activeTag = 'all'; searchTerm = ''; catMenuOpen = false;
    const s = $('search'); if (s) s.value = '';
    render();
    return;
  }
  if (e.target.closest('#catAdd')) {
    const name = await openConfirm({ title: 'New category', message: 'Name this category (for example, Nutraceuticals, Pharma Decks).', input: 'Category name', yesLabel: 'Create' });
    if (name && typeof name === 'string') { activeCollection = data.addCollection(name); activeTag = 'all'; searchTerm = ''; render(); }
    return;
  }
  if (e.target.closest('#renameType')) {
    const oldTag = activeTag;
    const newName = await openConfirm({ title: 'Rename type', message: `Rename the type <strong>${esc(data.tagLabel(oldTag))}</strong> for every prompt under it in this category.`, input: 'New type name', value: data.tagLabel(oldTag), yesLabel: 'Rename' });
    if (newName && typeof newName === 'string') { activeTag = data.renameTag(activeCollection, oldTag, newName); render(); }
    return;
  }
  if (e.target.closest('#delCat')) {
    const label = data.collectionLabel(activeCollection);
    const n = data.livePrompts(activeCollection).length;
    const ok = await openConfirm({ title: 'Delete category', message: `Delete the <strong>${esc(label)}</strong> category${n ? ` and hide its ${n} prompt${n !== 1 ? 's' : ''}` : ''}? You can restore everything with Reset.`, danger: true, yesLabel: 'Delete category' });
    if (ok) { data.deleteCollection(activeCollection); activeCollection = data.DEFAULT_COLLECTION; render(); }
    return;
  }

  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const id = btn.dataset.id;
  const p = data.getPrompt(id);
  if (!p) return;

  switch (btn.dataset.act) {
    case 'copy': await copyText(p.body); flashCopy(btn); pulsePlus(btn.closest('.card')); break;
    case 'inc':
    case 'dec': {
      data.changeUse(id, btn.dataset.act === 'inc' ? 1 : -1);
      const card = btn.closest('.card'); const cv = card && card.querySelector('.cval'); if (cv) cv.textContent = data.useCount(id);
      clearTimeout(window.__rankT); window.__rankT = setTimeout(render, 450);
      break;
    }
    case 'preview': openModal(p); break;
    case 'edit': openEditor(p); break;
    case 'del': {
      const ok = await openConfirm({ title: 'Delete prompt', message: `Delete <strong>${esc(p.title)}</strong>? It is hidden from the library. Reset restores everything.`, danger: true, yesLabel: 'Delete' });
      if (ok) { data.deletePrompt(id); render(); }
      break;
    }
  }
});

/* ───────────────────────── preview modal ──────────────────────── */

const modal = $('modal');
const mId = $('mId'); const mTitle = $('mTitle'); const mBody = $('mBody'); const mUses = $('mUses');
const mCopy = $('mCopy'); const mClose = $('mClose'); const mInc = $('mInc'); const mDec = $('mDec'); const mEdit = $('mEdit');
let modalId = null;

function openModal(p) {
  modalId = p.id;
  mId.textContent = idLabel(p) + ' · ' + data.tagLabel(p.tag);
  mTitle.textContent = p.title; mBody.textContent = p.body; mUses.textContent = data.useCount(p.id);
  modal.classList.add('open'); document.body.style.overflow = 'hidden';
}
function closeModal() { modal.classList.remove('open'); document.body.style.overflow = ''; modalId = null; }
mClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
mCopy.addEventListener('click', async () => { const p = data.getPrompt(modalId); if (!p) return; await copyText(p.body); flashCopy(mCopy); mInc.classList.add('pulse'); setTimeout(() => mInc.classList.remove('pulse'), 3000); });
mInc.addEventListener('click', () => { if (!modalId) return; data.changeUse(modalId, 1); mUses.textContent = data.useCount(modalId); render(); });
mDec.addEventListener('click', () => { if (!modalId) return; data.changeUse(modalId, -1); mUses.textContent = data.useCount(modalId); render(); });
mEdit.addEventListener('click', () => { const p = data.getPrompt(modalId); if (!p) return; closeModal(); openEditor(p); });

/* ───────────────────────── editor modal ───────────────────────── */

const editor = $('editor');
const edHead = $('edHead'); const edName = $('edName'); const edDesc = $('edDesc');
const edCollection = $('edCollection'); const edTag = $('edTag'); const edNewTag = $('edNewTag');
const edBody = $('edBody'); const edSave = $('edSave'); const edCancel = $('edCancel'); const edClose = $('edClose'); const edMsg = $('edMsg');
let editId = null;

function fillCollectionSelect(sel) { edCollection.innerHTML = data.collections().map((c) => `<option value="${c.id}"${c.id === sel ? ' selected' : ''}>${esc(c.label)}</option>`).join(''); }
function fillTagSelect(sel, col) {
  const tags = data.tagsForCollection(col || edCollection.value || activeCollection).slice();
  if (sel && !tags.includes(sel)) tags.unshift(sel);
  if (!tags.length) tags.push(sel || 'general');
  edTag.innerHTML = tags.map((t) => `<option value="${t}"${t === sel ? ' selected' : ''}>${esc(data.tagLabel(t))}</option>`).join('');
}
edCollection.addEventListener('change', () => fillTagSelect(edTag.value, edCollection.value));

function openEditor(p) {
  editId = p ? p.id : null;
  edHead.textContent = p ? 'Edit prompt' : 'Add prompt';
  edName.value = p ? p.title : '';
  edDesc.value = p ? (p.preview || '') : '';
  edBody.value = p ? p.body : '';
  const col = p ? (p.collection || data.DEFAULT_COLLECTION) : activeCollection;
  fillCollectionSelect(col); fillTagSelect(p ? p.tag : '', col);
  edNewTag.value = ''; edMsg.textContent = '';
  editor.classList.add('open'); document.body.style.overflow = 'hidden';
  setTimeout(() => edName.focus(), 50);
}
function closeEditor() { editor.classList.remove('open'); document.body.style.overflow = ''; editId = null; }
edClose.addEventListener('click', closeEditor);
edCancel.addEventListener('click', closeEditor);
editor.addEventListener('click', (e) => { if (e.target === editor) closeEditor(); });
$('addBtn').addEventListener('click', () => openEditor(null));

edSave.addEventListener('click', () => {
  const title = edName.value.trim();
  const body = edBody.value.trim();
  if (!title || !body) { edMsg.textContent = 'Title and prompt are required.'; return; }
  const tag = edNewTag.value.trim() || edTag.value || 'general';
  const collection = edCollection.value || data.DEFAULT_COLLECTION;
  const preview = edDesc.value.trim();
  if (editId) data.updatePrompt(editId, { title, body, tag, collection, preview: preview || data.describe(body) });
  else data.addPrompt({ title, body, tag, collection, preview });
  if (data.collections().some((c) => c.id === collection)) { activeCollection = collection; data.setActiveCollection(collection); }
  closeEditor(); render();
});

/* ───────────────────────── import modal ───────────────────────── */

const importModal = $('importModal');
const imCollection = $('imCollection'); const imNewCollection = $('imNewCollection');
const imDrop = $('imDrop'); const imFiles = $('imFiles'); const imAiBox = $('imAiBox');
const aiProvider = $('aiProvider'); const aiModel = $('aiModel'); const aiBase = $('aiBase'); const aiKey = $('aiKey');
const imStatus = $('imStatus'); const imPreview = $('imPreview');
const imProcess = $('imProcess'); const imImport = $('imImport'); const imCancel = $('imCancel'); const imClose = $('imClose'); const imMsg = $('imMsg');

let imLoaded = [];   // [{name,text}]
let imParsed = [];   // [{title,body,type,desc,include}]

function loadAiCfg() {
  const a = data.getState().ai || {};
  aiProvider.value = a.provider || 'none'; aiModel.value = a.model || ''; aiBase.value = a.base || ''; aiKey.value = a.key || '';
  if (a.provider && a.provider !== 'none') imAiBox.open = true;
}
function saveAiCfg() { data.setAiConfig({ provider: aiProvider.value, model: aiModel.value.trim(), base: aiBase.value.trim(), key: aiKey.value.trim() }); }

function openImport() {
  imLoaded = []; imParsed = [];
  imCollection.innerHTML = data.collections().map((c) => `<option value="${c.id}"${c.id === activeCollection ? ' selected' : ''}>${esc(c.label)}</option>`).join('');
  imNewCollection.value = '';
  imStatus.style.display = 'none'; imStatus.textContent = '';
  imPreview.style.display = 'none'; imPreview.innerHTML = '';
  imImport.style.display = 'none'; imProcess.style.display = 'inline-flex'; imMsg.textContent = '';
  loadAiCfg();
  importModal.classList.add('open'); document.body.style.overflow = 'hidden';
}
function closeImport() { importModal.classList.remove('open'); document.body.style.overflow = ''; }
$('importBtn').addEventListener('click', openImport);
imClose.addEventListener('click', closeImport);
imCancel.addEventListener('click', closeImport);
importModal.addEventListener('click', (e) => { if (e.target === importModal) closeImport(); });

imDrop.addEventListener('click', () => imFiles.click());
imFiles.addEventListener('change', () => loadFiles(imFiles.files));
['dragenter', 'dragover'].forEach((ev) => imDrop.addEventListener(ev, (e) => { e.preventDefault(); imDrop.classList.add('drag'); }));
['dragleave', 'drop'].forEach((ev) => imDrop.addEventListener(ev, (e) => { e.preventDefault(); imDrop.classList.remove('drag'); }));
imDrop.addEventListener('drop', (e) => { if (e.dataTransfer?.files) loadFiles(e.dataTransfer.files); });

async function loadFiles(fileList) {
  try {
    imLoaded = await imp.readFiles(fileList);
    imStatus.style.display = 'block'; imStatus.classList.remove('err');
    imStatus.textContent = `${imLoaded.length} file${imLoaded.length !== 1 ? 's' : ''} loaded. Click “Process files”.`;
  } catch (err) { imStatus.style.display = 'block'; imStatus.classList.add('err'); imStatus.textContent = err.message; }
}

imProcess.addEventListener('click', async () => {
  if (!imLoaded.length) { imMsg.textContent = 'Choose at least one file first.'; return; }
  saveAiCfg();
  const items = imp.parseFiles(imLoaded);
  if (!items.length) { imMsg.textContent = 'No prompts found in those files.'; return; }

  imStatus.style.display = 'block'; imStatus.classList.remove('err');
  imStatus.textContent = `Found ${items.length} prompt${items.length !== 1 ? 's' : ''}. Annotating…`;

  let annotated;
  const ai = data.getState().ai;
  if (ai.provider !== 'none') {
    imProcess.disabled = true;
    try { annotated = await imp.annotate(items, ai); imStatus.textContent = `Annotated ${items.length} with AI.`; }
    catch (err) { imStatus.classList.add('err'); imStatus.textContent = 'AI step failed (' + err.message + '). Used local rules instead.'; annotated = await imp.annotate(items, { provider: 'none' }); }
    imProcess.disabled = false;
  } else {
    annotated = await imp.annotate(items, { provider: 'none' });
  }

  imParsed = annotated.map((a) => ({ ...a, include: true }));
  renderImportPreview();
  imProcess.style.display = 'none'; imImport.style.display = 'inline-flex';
});

function renderImportPreview() {
  imPreview.style.display = 'flex';
  imPreview.innerHTML = imParsed.map((p, i) => `
    <div class="prev-row">
      <input type="checkbox" data-im="inc" data-i="${i}" ${p.include ? 'checked' : ''}>
      <div>
        <div class="pr-title">${esc(p.title)}</div>
        <div class="pr-fields">
          <input class="pr-type" data-im="type" data-i="${i}" value="${esc(p.type)}" placeholder="type">
          <input class="pr-desc" data-im="desc" data-i="${i}" value="${esc(p.desc)}" placeholder="description">
        </div>
      </div>
    </div>`).join('');
}
imPreview.addEventListener('input', (e) => {
  const el = e.target.closest('[data-im]'); if (!el) return;
  const i = +el.dataset.i;
  if (el.dataset.im === 'inc') imParsed[i].include = el.checked;
  else if (el.dataset.im === 'type') imParsed[i].type = el.value;
  else if (el.dataset.im === 'desc') imParsed[i].desc = el.value;
});

imImport.addEventListener('click', () => {
  let colId = imCollection.value || data.DEFAULT_COLLECTION;
  const newName = imNewCollection.value.trim();
  if (newName) colId = data.addCollection(newName);

  const chosen = imParsed.filter((p) => p.include);
  if (!chosen.length) { imMsg.textContent = 'Nothing selected to import.'; return; }
  chosen.forEach((p) => data.addPrompt({ title: p.title, body: p.body, tag: p.type, collection: colId, preview: p.desc }));

  activeCollection = colId; data.setActiveCollection(colId); activeTag = 'all'; searchTerm = '';
  closeImport(); render();
});

/* ───────────────────────── toolbar ────────────────────────────── */

filtersEl.addEventListener('click', (e) => { const b = e.target.closest('.tag-btn'); if (!b) return; activeTag = b.dataset.tag; render(); });
$('search').addEventListener('input', (e) => { searchTerm = e.target.value.trim().toLowerCase(); render(); });
$('resetBtn').addEventListener('click', async () => {
  const ok = await openConfirm({ title: 'Reset counts', message: 'Reset all use counts and restore deleted prompts and categories? Your added and edited prompts are kept.', danger: true, yesLabel: 'Reset' });
  if (ok) { data.reset(); render(); }
});

/* export / restore JSON */
$('exportBtn').addEventListener('click', () => {
  const blob = new Blob([data.exportJSON()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `prompt-database-${new Date().toISOString().slice(0, 10)}.json`;
  a.click(); URL.revokeObjectURL(url);
});
$('importJsonBtn').addEventListener('click', () => $('importJsonFile').click());
$('importJsonFile').addEventListener('change', async (e) => {
  const f = e.target.files[0]; if (!f) return;
  const ok = await openConfirm({ title: 'Restore from file', message: 'Replace the current library with the contents of this file?', danger: true, yesLabel: 'Restore' });
  if (!ok) { e.target.value = ''; return; }
  try {
    const text = await f.text();
    data.importJSON(text);
    activeCollection = data.getState().activeCollection || data.DEFAULT_COLLECTION;
    activeTag = 'all'; searchTerm = ''; $('search').value = '';
    render();
  } catch (err) { await openConfirm({ title: 'Restore failed', message: esc(err.message), yesLabel: 'OK' }); }
  e.target.value = '';
});

/* ───────────────────────── global keys + resize ───────────────── */

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (modal.classList.contains('open')) closeModal();
  if (editor.classList.contains('open')) closeEditor();
  if (importModal.classList.contains('open')) closeImport();
  if (confirmEl.classList.contains('open')) closeConfirm(false);
  if (catMenuOpen) { catMenuOpen = false; const m = $('catMenu'); if (m) m.classList.remove('open'); }
});

let __resizeT; let __lastCap = inlineCap();
window.addEventListener('resize', () => {
  clearTimeout(__resizeT);
  __resizeT = setTimeout(() => { const cap = inlineCap(); if (cap !== __lastCap) { __lastCap = cap; catMenuOpen = false; renderCats(); } }, 150);
});

/* storage note */
const storeNote = $('storeNote');
storeNote.textContent = data.saveState() ? 'Saved on this device' : 'Not saved — open as a served/downloaded file';

/* go */
render();
