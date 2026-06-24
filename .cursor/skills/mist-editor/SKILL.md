---
name: mist-editor
description: Develop the Mist Editor Angular library and marketing workspace. Use when changing projects/mist-editor, rich-text editing logic, sanitization, toolbar/table UX, or integrating the mist-editor package.
---

# Mist Editor Development

## Workspace

| Path | Purpose |
|------|---------|
| `src/` | Marketing site (demo, docs) |
| `projects/mist-editor/` | Publishable `mist-editor` npm library |
| `dist/mist-editor/` | Built library (`ng build mist-editor`) |

```bash
npm start                 # marketing site :4200
ng build mist-editor      # build library
ng test mist-editor       # library tests
```

## Architecture

Built **from scratch** — no ProseMirror/TipTap. Core model:

- Single `contenteditable` surface
- **HTML strings** as contract: `content` in → `contentChange` out (sanitized `innerHTML`)
- Browser Selection/Range + imperative DOM (not `document.execCommand`)
- Angular **signals** for overlays (slash menu, table toolbar)

### Key modules

```
projects/mist-editor/src/lib/
├── components/
│   ├── rich-text-editor/    # Main editor
│   ├── editor-toolbar/
│   └── table-options/
└── services/
    ├── sanitization.service.ts
    ├── editor-formatting.service.ts
    ├── editor-utils.service.ts
    └── table.service.ts
```

### Sanitization

- `sanitizeEditorContent` — strict path for user HTML (DOMParser + allowlists)
- `sanitizeTrustedHtml` — app-generated panels/tables
- `SANITIZATION_CONFIG` injection token for custom validators
- `cleanNode` must traverse `html`/`body` without removing them

### Formatting services

- `EditorFormattingService` — inline/block format, lists, images, code blocks, HTML insertion
- `insertBlock(editor, html, trusted?)` — pass `trusted: true` only for app-generated panels/tables
- `EditorUtilsService` — format detection, colors, alignment, selection save/restore
- `TableService` — table HTML generation and row/column manipulation

## Conventions

- Standalone Angular components; peers are Angular 21+ only
- Public API: `projects/mist-editor/src/public-api.ts`
- Library README (`projects/mist-editor/README.md`) is the user-facing API doc — keep it accurate when changing exports
- Comparison with TipTap/ProseMirror: `projects/mist-editor/docs/MIST_VS_TIPTAP_PROSEMIRROR.md`

## Change guidelines

- Minimize scope; match existing service/DOM patterns
- Security changes need tests in `sanitization.service.spec.ts`
- Selection/async code: guard `collapseToEnd` when `rangeCount === 0`, or flush timers in specs
