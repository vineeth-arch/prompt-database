import { describe, it, expect } from 'vitest';
import { LocalAdapter } from './local-adapter.js';

/** Minimal localStorage stand-in; no DOM needed. */
function fakeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
}

describe('LocalAdapter', () => {
  it('round-trips the whole state through save/load', () => {
    const a = new LocalAdapter(fakeStorage(), 'k');
    const state = { version: 3, uses: { x: 2 }, custom: [{ id: 'u1', title: 'hi' }], ai: { provider: 'none' } };
    expect(a.save(state)).toBe(true);
    expect(a.load()).toEqual(state);
  });

  it('load() returns null when nothing is stored', () => {
    expect(new LocalAdapter(fakeStorage(), 'k').load()).toBeNull();
  });

  it('per-entity CRUD persists the current snapshot', () => {
    const a = new LocalAdapter(fakeStorage(), 'k');
    const state = { uses: {} };
    a.bindSnapshot(() => state);
    state.uses.x = 3;            // mutate as a data.js action would
    expect(a.setUse('x', 3)).toBe(true);
    expect(a.load()).toEqual({ uses: { x: 3 } });
  });

  it('save() returns false when storage throws (quota / private mode)', () => {
    const throwing = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    expect(new LocalAdapter(throwing, 'k').save({ any: 1 })).toBe(false);
  });
});
