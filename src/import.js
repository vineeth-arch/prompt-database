/**
 * import.js — bulk markdown import logic. No DOM.
 *
 * Flow the UI drives:
 *   readFiles(fileList)  -> [{ name, text }]
 *   parseFiles(files)    -> [{ title, body, preview }]   (via data.parseMarkdown)
 *   annotate(items, ai)  -> [{ title, body, type, desc }]  (AI if configured, else local)
 *
 * The UI then shows an editable preview and calls data.addPrompt(...) for each
 * selected row, into the chosen (or newly created) collection.
 */

import { parseMarkdown, localType, describe } from './data.js';

/** Read a FileList/array of File objects to text. */
export function readFiles(fileList) {
  const files = Array.from(fileList || []);
  return Promise.all(files.map((f) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve({ name: f.name, text: String(r.result || '') });
    r.onerror = () => reject(new Error('Could not read ' + f.name));
    r.readAsText(f);
  })));
}

/** Turn loaded files into prompt entries (a file may contain several). */
export function parseFiles(files) {
  const items = [];
  files.forEach((f) => {
    const parsed = parseMarkdown(f.text);
    if (parsed.length) {
      parsed.forEach((p) => items.push(p));
    } else if (f.text.trim()) {
      items.push({
        title: f.name.replace(/\.(md|markdown|txt)$/i, ''),
        body: f.text.trim(),
        preview: '',
      });
    }
  });
  return items;
}

/**
 * Annotate items with a type + description.
 * If an AI provider is configured, ask it to derive a coherent sub-category
 * scheme for the whole batch and assign each item. Throws on AI failure so the
 * UI can decide to fall back; call again with { provider: 'none' } to force local.
 */
export async function annotate(items, ai) {
  let aiMap = null;
  if (ai && ai.provider && ai.provider !== 'none') {
    aiMap = await aiAnnotate(items, ai);
  }
  return items.map((it, i) => {
    const a = aiMap && aiMap[i];
    const type = a && a.category ? a.category : localType(it.title, it.body);
    const desc = a && a.description
      ? String(a.description).slice(0, 200)
      : (it.preview || describe(it.body));
    return { title: it.title, body: it.body, type, desc };
  });
}

/**
 * Two-pass batch categorization via an OpenAI-compatible or Anthropic endpoint.
 * Returns { [index]: { category, description } }. Throws on any failure.
 */
export async function aiAnnotate(items, cfg) {
  const { provider, model, key } = cfg;
  const base = (cfg.base || '').replace(/\/$/, '');
  if (!model || !base) throw new Error('Set a model and endpoint for the AI option.');

  const list = items
    .map((it, i) => `#${i}\nTitle: ${it.title}\nPrompt:\n${it.body.slice(0, 1200)}`)
    .join('\n\n---\n\n');

  const instruction =
    'You are organizing a library of reusable prompt templates that were just uploaded together. ' +
    'Work in two steps.\n' +
    'STEP 1 — Read ALL items below as a set and infer a small, coherent scheme of sub-categories that best organizes THIS specific batch. ' +
    'Aim for roughly 3 to 8 sub-categories. Each is a one or two word lowercase slug (use hyphens for two words). ' +
    'Base them on what the prompts actually do, not on a generic list; reuse the same slug for items that belong together.\n' +
    'STEP 2 — Assign every item to exactly one of the sub-categories you defined, and write a one or two line summary for it (max 160 chars, plain text, no quotes).\n' +
    'Return ONLY a JSON array. Each element: {"i": <index number>, "category": "<slug from your scheme>", "description": "<summary>"}.\n\nItems:\n' +
    list;

  let content = '';
  if (provider === 'anthropic') {
    const res = await fetch(base + '/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model, max_tokens: 2000, messages: [{ role: 'user', content: instruction }] }),
    });
    if (!res.ok) throw new Error('AI request failed (' + res.status + ')');
    const data = await res.json();
    content = (data.content || []).map((b) => b.text || '').join('');
  } else {
    const res = await fetch(base + '/chat/completions', {
      method: 'POST',
      headers: Object.assign(
        { 'content-type': 'application/json' },
        key ? { authorization: 'Bearer ' + key } : {},
      ),
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'You output only valid JSON.' },
          { role: 'user', content: instruction },
        ],
      }),
    });
    if (!res.ok) throw new Error('AI request failed (' + res.status + ')');
    const data = await res.json();
    content = data.choices?.[0]?.message?.content || '';
  }

  const clean = String(content).replace(/```json|```/g, '').trim();
  const arr = JSON.parse(clean);
  const map = {};
  arr.forEach((o) => { if (o && o.i !== undefined) map[o.i] = o; });
  return map;
}
