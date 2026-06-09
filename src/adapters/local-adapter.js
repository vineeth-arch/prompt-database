/**
 * local-adapter.js — the default storage adapter.
 *
 * Reproduces today's persistence exactly: the whole state object is serialized
 * to a single localStorage key. The per-entity CRUD methods exist so the
 * adapter interface matches what a future SupabaseAdapter needs (row-level
 * writes), but here every one of them collapses to a whole-blob save of the
 * current in-memory state — so multi-mutation actions stay correct and the
 * on-disk shape is byte-for-byte what it was before the adapter refactor.
 *
 * `storage` is injectable (defaults to the real localStorage) purely so the
 * adapter can be unit-tested without a DOM.
 *
 * @typedef {import('./index.js').StorageAdapter} StorageAdapter
 * @implements {StorageAdapter}
 */
export class LocalAdapter {
  constructor(storage = globalThis.localStorage, key = 'di_prompt_db_v3') {
    this.storage = storage;
    this.key = key;
    /** Set by the registry to read the live state for whole-blob writes. */
    this._snapshot = () => ({});
  }

  /** Wire a getter that returns the current in-memory state object. */
  bindSnapshot(fn) {
    this._snapshot = fn;
  }

  /* ── whole-state ── */

  load() {
    try {
      const raw = this.storage.getItem(this.key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      // corrupt or unavailable storage — caller falls back to a fresh state
      return null;
    }
  }

  save(state) {
    try {
      this.storage.setItem(this.key, JSON.stringify(state));
      return true;
    } catch {
      return false; // private mode / quota / file:// restrictions
    }
  }

  /* ── per-entity writes (Local: persist the whole current snapshot) ── */

  _persist() {
    return this.save(this._snapshot());
  }

  upsertCollection(_collection) { return this._persist(); }
  removeCollection(_id) { return this._persist(); }
  upsertPrompt(_prompt) { return this._persist(); }
  upsertOverride(_id, _patch) { return this._persist(); }
  removePrompt(_id) { return this._persist(); }
  setUse(_id, _count) { return this._persist(); }
  setActiveCollection(_id) { return this._persist(); }
  setAi(_cfg) { return this._persist(); }
  clearCounts() { return this._persist(); }

  /** Full replace (import JSON): persist the passed state directly. */
  replaceAll(state) { return this.save(state); }
}
