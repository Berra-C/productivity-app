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
13. **Analytics core** — focus, planning, productive-hour and weekly review calculations.
14. **Calendar core** — calendar time-window and work-interval projection rules.
15. **View formatters** — shared display formatting and trend markup.
16. **Summary view** — pure weekly/monthly summary HTML builder.
17. **Calendar view** — pure month/year/week/agenda HTML builders and overlap layout.
18. **Stats view** — chart, heatmap, subject and session analytics markup.
19. **Task view** — task filtering, grouping and task-card markup.
20. **Collection view** — tree progress and collection-grid markup.
21. **App main** — composition root, DOM binding and remaining feature orchestration.
22. **Cloud sync** — optional cloud transport and account synchronization.

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

- Extract session-list rendering and remaining modal/browser interaction clusters from the main composition file.

## Change log organization

Version change notes are stored under `changes/` to keep the project root clean.

## View layer rule

View modules build deterministic HTML or layout data and do not attach event listeners.
`app-main.js` owns DOM insertion, event binding, modal behavior, scrolling and browser side effects.
