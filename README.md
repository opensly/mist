# Mist

This repository is an Angular workspace with two parts:

| Path | Purpose |
|------|---------|
| **`src/`** | Marketing website for the Mist Editor library (live demo, docs, getting started) |
| **`projects/mist-editor/`** | The publishable **`mist-editor`** npm package |

## Quick start

```bash
npm install
npm start          # marketing site at http://localhost:4200
ng build mist-editor   # build the library to dist/mist-editor
```

## Library

Install the editor in your own Angular app:

```bash
npm install mist-editor
```

```typescript
import { RichTextEditorComponent, EditorToolbarComponent } from 'mist-editor';
```

See [projects/mist-editor/README.md](projects/mist-editor/README.md) for the full API and integration guide.

## Workspace layout

```
mist/
├── src/                    # Marketing app (demo + docs)
├── projects/mist-editor/   # Angular library source
├── dist/mist-editor/       # Built library (after ng build mist-editor)
├── angular.json
└── package.json            # Workspace root ("mist")
```

## Development

```bash
ng serve                    # Run marketing site
ng build mist-editor        # Build library package
ng test mist-editor         # Run library unit tests
```

## Test

```bash
npm test                 # all unit tests (Vitest via ng test)
ng test mist-editor      # library only
ng test mist             # marketing app only
npm run test:watch       # watch mode
npm run test:coverage    # coverage report (see coverage/)
```
