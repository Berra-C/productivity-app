# Application Architecture

## Build rule

`assets/js/app.js` is a generated production bundle. Do not edit it directly.

Edit source files under `assets/js/modules/` or `assets/js/app-main.js`, then run:

```bash
npm run build
npm run check
```

The generated `app.js` is committed so GitHub Pages can serve the application without a Node runtime.

## Runtime layers

1. **UI helpers** — presentation-only utilities.
2. **State merge** — deterministic local/cloud merge rules and tombstones.
3. **State persistence** — local primary/backup storage and storage metadata helpers.
4. **State writer** — semantic change detection, revision generation and commit orchestration.
5. **Timer core** — timer modes, transitions and pure time calculations.
6. **Timer service** — session/interval lifecycle mutation.
7. **Timer controller** — start/pause/resume/finish orchestration.
8. **Session repository** — session lookup and date-bucket access.
9. **Task repository** — task lookup, collection mutation and task-specific queries.
10. **Event repository** — event lookup, collection mutation and event-specific queries.
11. **Gamification core** — XP, levels, badges and streak/freeze calculations.
12. **Tree service** — tree growth, completion and rollback mutations.
13. **App main** — composition root, UI rendering and remaining feature orchestration.
14. **Cloud sync** — optional cloud transport and account synchronization.

## Dependency direction

Domain modules must not depend on DOM rendering or page-specific UI.

`app-main.js` may compose modules and provide UI callbacks, but timer/state/session modules should remain testable without the page DOM.

## Persistence source of truth

- Session duration is derived from `workIntervals`.
- `localStorage` is the primary local snapshot.
- IndexedDB is a recovery mirror.
- The previous local snapshot is preserved as backup before primary replacement.
- Cloud merge uses record timestamps and tombstones.

## Next refactor targets

- Split calendar and analytics rendering from the main composition file.
