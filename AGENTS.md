# Notes for coding agents

How code in Locket is structured, for AI agents and people alike. Setup, checks and PR rules are in [CONTRIBUTING.md](CONTRIBUTING.md); the folder layout is in the [README](README.md#layout).

## Reuse before writing

- Look in `src/components/`, `src/components/ui/` and the feature's folder under `src/features/` before writing a component, and in `src/utils/`, `src/state/` and `electron/` before writing a helper. Extend what exists rather than adding a near copy.
- When new code resembles existing code (JSX, styles, hooks, helpers, MCP tool handlers), extract one shared piece and use it in both places.

## Write each rule once

A business rule (what is valid, what may be deleted, where tickets go, how things are counted) lives in **one pure module** under `electron/<area>/`, free of TypeORM and Electron imports. Example: `electron/projects/icons.ts`.

- The renderer reaches it through a re-export in `src/data/` (see `src/data/projectIcons.ts`).
- The services, the browser fallback (`src/state/localData.ts`) and the UI all call that module. Never copy its logic or its error messages into another of them.
- For a rule the UI must explain, return a small code (`'default' | 'in_use'`) and let the UI translate it. The services throw from the same function.
- If you find yourself writing the same loop or condition in `electron/services/` and in `src/`, it belongs in the pure module.

## Types that cross IPC

Declare them once in `electron/db/types.ts` or the pure module. `src/types/electron-api.d.ts` imports and re-exports them; it doesn't declare them again.

## Components own their logic

- **A list renders rows; each row owns its actions.** The list works out only what needs the whole collection (usage, whether something can be deleted) and passes it in as props. The row holds its own edit dialog, confirm dialog and handlers. Example: `WorkflowsCard` → `WorkflowRow`.
- **A dialog derives its own data.** Pass ids or the entity (`project`, `toWorkflowId`) and let the dialog read the store, rather than making its parent compute counts or lookups only to hand them over.
- **Big components split by job.** Move state and its edits into a hook (`useStatusDrafts`), give each step or section its own component, and keep the parent to wiring them together. More than about 150 lines, or several unrelated `useState`s, is the signal.
- **Children handle their own DOM events.** Pass an intent API (`drag.start(key)`, `onMove(-1)`), not a bundle of `onDragStart`/`onDragOver` handlers built by the parent.
- **Reset state by remounting, not in an effect.** The lint rule forbids `setState` in effects; give a dialog a new `key` each time it opens, or mount it only while open.

## UI text

All user-visible text goes through i18next (`src/i18n/locales/en.json`). Error messages from the main process are shown as they are, so write them for users.
