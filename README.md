# Prompt Database

A personal, reusable prompt library. Top-level **categories** hold prompts; each prompt carries a **type** (sub-category) that is scoped to its category. Tracks how often you use each prompt, surfaces the most-used, and lets you bulk-import prompts from markdown files with auto-generated types and descriptions (local rules, or an optional local/remote LLM).

Built originally as a single HTML file; this repo is the restructured, maintainable version.

## Status

- `src/data.js` — the data model and storage layer. No DOM. This is the source of truth. **Done.**
- `src/seed.json` — the built-in prompts (35 packaging prompts under "Toy Redesign"). **Done.**
- UI layer (`index.html`, `styles.css`, `src/ui.js`, `src/import.js`) — **to build in Claude Code.**

The original working prototype (one big `index.html`) is the visual and behavioural reference. The job is to reproduce it on top of `data.js`, not to redesign it.

## Architecture

```
prompt-database/
├─ index.html          # app shell, mounts the UI
├─ styles.css          # design tokens + components
├─ src/
│  ├─ data.js          # model + storage + import/export + markdown parse  ← single source of truth
│  ├─ seed.json        # built-in prompts (replaceable data, not hardcoded)
│  ├─ ui.js            # render + events (reads selectors, calls actions)
│  └─ import.js        # bulk .md import + AI annotation (uses data.parseMarkdown)
├─ package.json
└─ vite.config.js
```

**Principle:** `data.js` owns all state. The UI never touches `localStorage` directly — it calls actions (`addPrompt`, `changeUse`, `renameTag`, …) and reads selectors (`ranked`, `tagsForCollection`, …), then re-renders. This keeps the data layer testable and the UI thin.

### Data model

- **Collection** = top-level category (`{ id, label }`). `toy-redesign` is the built-in default.
- **Prompt** = `{ id, num, title, preview, body, tag, collection, custom? }`. `tag` is the sub-category; it is scoped per collection (a collection only shows the tags its own prompts use).
- Built-in prompts come from `seed.json` and are never mutated; edits are stored as **partial overrides** keyed by id. User prompts live in `custom`. Deletions are **soft** (an id list) so Reset restores everything. User edits and additions survive a Reset.
- Use counts, deletions, overrides, custom prompts, collections, and AI config all live in one state object persisted under `localStorage["di_prompt_db_v3"]`.

### Portability

`exportJSON()` / `importJSON()` serialise the entire state. This is how the library is backed up and moved between machines — git versions the *code*; the JSON export is your *data* history.

## Bulk markdown import

`parseMarkdown(text)` turns a file into one or more entries (`# heading` → title, fenced block → body, leading prose → draft description). Multiple files are parsed, then annotated:

- **Local rules** (default, always works): `localType()` keyword-matches a type; `describe()` writes a one-line summary from the body.
- **AI (optional):** send the whole batch to an OpenAI-compatible or Anthropic endpoint and ask it to (1) infer a coherent set of sub-categories for *this* batch, then (2) assign each prompt and write its description. The top category name is the user's input; the sub-categories are self-generated. Falls back to local rules on any failure.

Local model endpoints are the reliable path from a static page (Ollama `http://localhost:11434/v1`, LM Studio `http://localhost:1234/v1`). External APIs may hit CORS depending on host; handle the error and fall back.

## Setup

```bash
npm install
npm run dev      # local dev server
npm run build    # static build into dist/
npm run preview  # serve the build
```

Deploy `dist/` to GitHub Pages or Netlify. No backend.

## Design tokens

- Base `#0D0035` canvas with Electric Indigo `#2C0098`; cards `#1A0060`.
- Accent Cyan Mint `#00FFCF`.
- Type: Playfair Display *italic* (display headings), Space Grotesk (labels, counters, slugs), Inter (body).

## License

Personal project. Add a license before making the repo public.
