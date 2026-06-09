/**
 * data.js — the single source of truth for the prompt library.
 *
 * No DOM in here. The UI layer imports this module, reads through the
 * selectors, mutates through the actions, and re-renders. Everything is
 * persisted to localStorage and is exportable/importable as JSON so the
 * library is portable between machines and independent of the code.
 *
 * Data model
 * ----------
 * A "collection" is a top-level category (e.g. Toy Redesign). Each prompt
 * belongs to exactly one collection and carries a "tag" (the sub-category
 * / type, e.g. graphic, copy, mockup). Tags are scoped per collection: the
 * chips a collection shows are derived from the prompts actually in it.
 *
 * Built-in prompts come from seed.json and are treated as read-only base
 * records. User edits to a built-in are stored as a partial override keyed
 * by id; user-created prompts live in `custom`; deletions are soft (an id
 * list) so Reset can restore them. This keeps the seed a clean, replaceable
 * artifact while still letting the user change anything.
 */

import SEED from './seed.json';

export const STORE_KEY = 'di_prompt_db_v3';
export const DEFAULT_COLLECTION = 'toy-redesign';
export const BASE_COLLECTIONS = [{ id: DEFAULT_COLLECTION, label: 'Toy Redesign' }];

// Used only to order tag chips nicely; tags are otherwise free-form.
export const BASE_TAG_ORDER = [
  'master', 'workflow', 'strategy', 'graphic', 'panel',
  'compliance', 'copy', 'naming', 'mockup', 'correction',
];

const FRESH = () => ({
  version: 3,
  uses: {},          // { [id]: number }
  deleted: [],       // [id]
  overrides: {},     // { [id]: Partial<Prompt> }  (built-in edits)
  custom: [],        // [Prompt]                   (user-created)
  collections: [],   // [{ id, label }]            (user-created top categories)
  activeCollection: DEFAULT_COLLECTION,
  ai: { provider: 'none', base: '', model: '', key: '' },
});

let state = FRESH();

/* ─────────────────────────── persistence ─────────────────────────── */

export function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) state = Object.assign(FRESH(), JSON.parse(raw));
  } catch {
    /* corrupt or unavailable storage — fall back to a fresh in-memory state */
  }
  return state;
}

export function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false; // private mode / quota / file:// restrictions
  }
}

export function getState() { return state; }

/* ───────────────────────────── helpers ───────────────────────────── */

export function slug(s) {
  return String(s || '')
    .toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '') || 'general';
}

export function tagLabel(t) {
  const known = {
    master: 'Master', workflow: 'Workflow', strategy: 'Strategy', graphic: 'Graphic',
    panel: 'Panel', compliance: 'Compliance', copy: 'Copy', naming: 'Naming',
    mockup: 'Mockup', correction: 'Correction', custom: 'Custom', general: 'General',
  };
  return known[t] || t.charAt(0).toUpperCase() + t.slice(1).replace(/-/g, ' ');
}

function newId() {
  return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* ─────────────────────────── selectors ───────────────────────────── */

/** Built-in + overrides + custom, before any deletion filter. */
export function allPrompts() {
  const builtins = SEED.map((p) => {
    const base = Object.assign({ collection: DEFAULT_COLLECTION }, p);
    const o = state.overrides[p.id];
    return o ? Object.assign(base, o) : base;
  });
  return builtins.concat(state.custom);
}

/** Everything not deleted (across all collections). */
export function liveAll() {
  return allPrompts().filter((p) => !state.deleted.includes(p.id));
}

/** Not-deleted prompts in one collection (defaults to the active one). */
export function livePrompts(collectionId = state.activeCollection) {
  return liveAll().filter((p) => (p.collection || DEFAULT_COLLECTION) === collectionId);
}

export function getPrompt(id) {
  return allPrompts().find((p) => p.id === id);
}

export function collections() {
  return BASE_COLLECTIONS.concat(state.collections);
}

export function collectionLabel(id) {
  const c = collections().find((c) => c.id === id);
  return c ? c.label : id;
}

/** Tags actually used by a collection, ordered by BASE_TAG_ORDER then A–Z. */
export function tagsForCollection(collectionId = state.activeCollection) {
  const seen = new Set();
  const out = [];
  livePrompts(collectionId).forEach((p) => {
    if (p.tag && !seen.has(p.tag)) { seen.add(p.tag); out.push(p.tag); }
  });
  return out.sort((a, b) => {
    const ia = BASE_TAG_ORDER.indexOf(a);
    const ib = BASE_TAG_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });
}

export function useCount(id) { return state.uses[id] || 0; }

/** Prompts in a collection ranked by use (desc), ties broken by num. */
export function ranked(collectionId = state.activeCollection) {
  return livePrompts(collectionId).slice().sort((a, b) => {
    const d = useCount(b.id) - useCount(a.id);
    return d !== 0 ? d : String(a.num).localeCompare(String(b.num));
  });
}

/* ──────────────────────────── actions ────────────────────────────── */

export function setActiveCollection(id) {
  state.activeCollection = id;
  saveState();
}

export function changeUse(id, delta) {
  state.uses[id] = Math.max(0, useCount(id) + delta);
  saveState();
  return state.uses[id];
}

/**
 * Create a prompt. `tag` and `collection` are slugged; missing preview is
 * derived from the first meaningful line of the body.
 */
export function addPrompt({ title, body, tag, collection, preview }) {
  const p = {
    id: newId(),
    num: '+',
    custom: true,
    collection: collection || state.activeCollection,
    tag: slug(tag || 'general'),
    title: (title || '').trim(),
    body: (body || '').trim(),
    preview: (preview || '').trim() || describe(body),
  };
  state.custom.push(p);
  saveState();
  return p;
}

/** Patch any prompt; built-ins are patched via overrides, custom in place. */
export function updatePrompt(id, patch) {
  const clean = { ...patch };
  if (clean.tag) clean.tag = slug(clean.tag);
  const isCustom = state.custom.some((c) => c.id === id);
  if (isCustom) {
    Object.assign(state.custom.find((c) => c.id === id), clean);
  } else {
    state.overrides[id] = Object.assign({}, state.overrides[id], clean);
  }
  saveState();
}

/** Soft delete (restorable via reset()). */
export function deletePrompt(id) {
  if (!state.deleted.includes(id)) state.deleted.push(id);
  saveState();
}

export function addCollection(name) {
  const id = slug(name) || ('cat' + Date.now().toString(36));
  if (!collections().some((c) => c.id === id)) {
    state.collections.push({ id, label: name.trim() });
  }
  state.activeCollection = id;
  saveState();
  return id;
}

/** Remove a user collection and soft-delete its prompts. */
export function deleteCollection(id) {
  if (id === DEFAULT_COLLECTION) return;
  livePrompts(id).forEach((p) => deletePrompt(p.id));
  state.collections = state.collections.filter((c) => c.id !== id);
  if (state.activeCollection === id) state.activeCollection = DEFAULT_COLLECTION;
  saveState();
}

/** Rename a sub-category everywhere within one collection. */
export function renameTag(collectionId, oldTag, newName) {
  const newTag = slug(newName);
  if (!newTag || newTag === oldTag) return oldTag;
  liveAll()
    .filter((p) => (p.collection || DEFAULT_COLLECTION) === collectionId && p.tag === oldTag)
    .forEach((p) => updatePrompt(p.id, { tag: newTag }));
  return newTag;
}

/** Reset counts and restore deletions. Keeps user-added and edited prompts. */
export function reset() {
  state.uses = {};
  state.deleted = [];
  saveState();
}

export function setAiConfig(cfg) {
  state.ai = Object.assign({}, state.ai, cfg);
  saveState();
}

/* ────────────────────── descriptions (local fallback) ────────────── */

const TYPE_RULES = [
  [/mock\s?up|3d\b|render/i, 'mockup'],
  [/\bnam(e|ing)\b|shortlist/i, 'naming'],
  [/copy|tagline|humani[sz]e|wording|descriptor/i, 'copy'],
  [/extract|isolat|background|cleanup|graphic/i, 'graphic'],
  [/complian|warning|battery|prepress|legal|hazard|safety|barcode/i, 'compliance'],
  [/review|critique|strateg|plan|variant|deconstruct|presentation|before.?after|audit/i, 'strategy'],
  [/side panel|back panel|\bpanel\b|flap/i, 'panel'],
  [/correct|fix|revise|adjust/i, 'correction'],
  [/master|final|workflow|reusable|universal/i, 'master'],
];

/** Keyword-based type guess used when AI is off or unavailable. */
export function localType(title, body) {
  const hay = (title + ' ' + body).slice(0, 600);
  for (const [re, t] of TYPE_RULES) if (re.test(hay)) return t;
  return 'general';
}

/** One-line summary from the first meaningful body line. */
export function describe(body) {
  const lines = String(body || '').split('\n').map((l) => l.trim()).filter(Boolean);
  let c = lines.find((l) => !/^take on the role|^you are|^act as/i.test(l)) || lines[0] || '';
  c = c.replace(/^[-*\d.\s]+/, '');
  if (c.length > 160) c = c.slice(0, 157).replace(/\s+\S*$/, '') + '…';
  return c;
}

/* ──────────────────── markdown parse (bulk import) ───────────────── */

/**
 * Parse markdown into prompt entries. Each top-level `# heading` starts a new
 * entry; the fenced code block (or the remaining prose) becomes the body, and
 * the first prose line before the fence becomes a draft description.
 * One file can yield many entries.
 */
export function parseMarkdown(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const entries = [];
  let cur = null;
  for (const line of lines) {
    const h = line.match(/^#\s+(.+)$/);
    if (h) { if (cur) entries.push(cur); cur = { title: h[1].trim(), raw: [] }; }
    else if (cur) cur.raw.push(line);
  }
  if (cur) entries.push(cur);

  return entries.map((en) => {
    const raw = en.raw;
    let body = '';
    let desc = '';
    const fs = raw.findIndex((l) => l.trim().startsWith('```'));
    if (fs !== -1) {
      const after = raw.slice(fs + 1);
      const fe = after.findIndex((l) => l.trim().startsWith('```'));
      const code = fe !== -1 ? after.slice(0, fe) : after;
      body = code.join('\n').trim();
      desc = raw.slice(0, fs).map((l) => l.trim()).filter(Boolean)[0] || '';
    } else {
      const ne = raw.filter((l) => l.trim() !== '');
      desc = (ne[0] || '').trim();
      body = ne.slice(1).join('\n').trim() || desc;
    }
    if (!desc) desc = describe(body);
    return { title: en.title, body, preview: desc };
  }).filter((e) => e.title && e.body);
}

/* ─────────────────────── export / import (portability) ───────────── */

export function exportJSON() {
  return JSON.stringify({ kind: 'prompt-database', exportedAt: new Date().toISOString(), state }, null, 2);
}

/** Replace the whole state from a previously exported blob (object or string). */
export function importJSON(input) {
  const obj = typeof input === 'string' ? JSON.parse(input) : input;
  const incoming = obj && obj.state ? obj.state : obj;
  state = Object.assign(FRESH(), incoming);
  saveState();
  return state;
}
