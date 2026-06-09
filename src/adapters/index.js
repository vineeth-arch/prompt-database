/**
 * adapters/index.js — the storage-adapter registry.
 *
 * data.js never talks to localStorage (or, later, Supabase) directly; it goes
 * through whatever adapter is currently registered. Logged out, that's the
 * LocalAdapter (today's behavior). Logging in (STEP 3) will swap in a
 * SupabaseAdapter via setAdapter(), with no other change to data.js.
 *
 * The interface below is the contract both adapters honor. All methods are
 * synchronous-boolean for LocalAdapter; a future SupabaseAdapter may return
 * promises, which the callers will then await.
 *
 * @typedef {Object} StorageAdapter
 * @property {() => (object|null)} load            Read the persisted whole state.
 * @property {(state: object) => boolean} save     Persist the whole state.
 * @property {(collection: object) => boolean} upsertCollection   collections table
 * @property {(id: string) => boolean} removeCollection
 * @property {(prompt: object) => boolean} upsertPrompt           prompts table (user-created)
 * @property {(id: string, patch: object) => boolean} upsertOverride  edit to a built-in prompt
 * @property {(id: string) => boolean} removePrompt               soft delete
 * @property {(id: string, count: number) => boolean} setUse      usage table
 * @property {(id: string) => boolean} setActiveCollection        per-user setting
 * @property {(cfg: object) => boolean} setAi                     per-user setting
 * @property {() => boolean} clearCounts                          reset()
 * @property {(state: object) => boolean} replaceAll              importJSON()
 * @property {(fn: () => object) => void} [bindSnapshot]          internal: live-state getter
 */

import { LocalAdapter } from './local-adapter.js';

let _adapter = new LocalAdapter();
let _snapshot = () => ({});

/** The adapter all persistence currently flows through. */
export function getAdapter() {
  return _adapter;
}

/** Swap the active adapter (e.g. to SupabaseAdapter on login). */
export function setAdapter(adapter) {
  _adapter = adapter;
  if (typeof adapter.bindSnapshot === 'function') adapter.bindSnapshot(_snapshot);
}

/** data.js calls this once to expose its live state to whole-blob adapters. */
export function bindSnapshot(fn) {
  _snapshot = fn;
  if (typeof _adapter.bindSnapshot === 'function') _adapter.bindSnapshot(fn);
}

export { LocalAdapter };
