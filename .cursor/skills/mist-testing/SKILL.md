---
name: mist-testing
description: Run and write unit tests for the Mist Angular workspace using Vitest via ng test. Use when adding or fixing tests, checking coverage, or debugging test setup in src/ or projects/mist-editor/.
---

# Mist Testing

## Runner

- **Vitest only** — via Angular `@angular/build:unit-test` (`ng test`). Do not add Jest.
- Globals: `describe`, `it`, `expect`, `vi` from `vitest/globals` in `tsconfig.spec.json` (no `import` from `vitest` needed).
- Coverage provider: `@vitest/coverage-v8` (required for `--coverage`).

## Commands

```bash
npm test                      # all projects
ng test mist-editor           # library
ng test mist                  # marketing app
npm run test:watch
npm run test:coverage         # reports in coverage/mist-editor/ and coverage/mist/
```

## Projects

| Location | Specs | Notes |
|----------|-------|-------|
| `src/` | `*.spec.ts` | Angular component tests; use `TestBed` + `provideRouter([])` when components use `RouterLink` |
| `projects/mist-editor/src/lib/services/` | `*.spec.ts` | Service unit tests; instantiate with `new Service(...)` and mocked deps |

## Mocking

```typescript
const mockSanitizer = {
  sanitizeEditorContent: vi.fn().mockReturnValue('<p>safe</p>'),
};
```

## DOM / selection tests

- Append `contenteditable` elements to `document.body`; clean up in `afterEach`.
- Methods using `setTimeout(() => selection.collapseToEnd(), 0)` need `await flushPendingTimers()` before teardown:

```typescript
async function flushPendingTimers(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
```

## Coverage expectations

- Target **>85%** lines/branches on library services.
- Focus on security logic (`SanitizationService`), formatting/tables/utils — not trivial getters or Angular lifecycle.
- Run `ng test mist-editor --no-watch --coverage` to verify.

## Library service specs

- `sanitization.service.spec.ts` — XSS, allowlists, custom validators
- `editor-utils.service.spec.ts` — selection, colors, block detection
- `table.service.spec.ts` — CRUD, cell styling
- `editor-formatting.service.spec.ts` — formatting, lists, code blocks, insertion
