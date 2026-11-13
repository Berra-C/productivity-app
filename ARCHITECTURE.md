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
11. **Recurrence service** — shared daily/weekly/monthly scheduling, exceptions and series scopes.
12. **Session service** — session subject/todo/group/timing mutations.
13. **Task service** — task creation, completion, recurrence spawning, edit/delete and undo mutations.
14. **Event service** — event creation, recurrence generation, edit/delete and undo mutations.
15. **Gamification core** — XP, levels, badges and streak/freeze calculations.
16. **Tree service** — tree growth, completion and rollback mutations.
17. **Analytics core** — focus, planning, productive-hour and weekly review calculations.
18. **Calendar core** — calendar time-window and work-interval projection rules.
19. **View formatters** — shared display formatting and trend markup.
20. **Summary view** — pure weekly/monthly summary HTML builder.
21. **Calendar view** — pure month/year/week/agenda HTML builders and overlap layout.
22. **Stats view** — chart, heatmap, subject and session analytics markup.
23. **Task view** — task filtering, grouping and task-card markup.
24. **Collection view** — tree progress and collection-grid markup.
25. **Session view** — session cards, todos, target progress and hidden/history markup.
26. **Focus view** — Focus Mode presentation model derived from active-session state.
27. **Work controls view** — timer/break control-button markup.
28. **Modal service** — modal stack/focus management plus reusable confirm, prompt, time, subject and duration dialog flows.
29. **App main** — composition root, DOM binding and remaining feature orchestration.
30. **Cloud sync** — optional cloud transport and account synchronization.

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

- Extract state migration/recovery and cloud sync orchestration from the main composition file.

## Change log organization

Version change notes are stored under `changes/` to keep the project root clean.

## View layer rule

View modules build deterministic HTML or layout data and do not attach event listeners.
`app-main.js` owns DOM insertion, event binding, modal behavior, scrolling and browser side effects.

## Startup ordering invariant

Runtime module aliases must be initialized before repositories or application state consume them.

`npm run check` validates generated-bundle freshness, JavaScript syntax, declaration order, and production startup execution through `AppStorageRepository` initialization. This prevents lexical TDZ regressions such as accessing `StatePersistence` before its `const` initialization.

## Modal infrastructure rule

Modal focus trapping, Escape/backdrop cancellation, listener cleanup, button-state restoration and reusable dialog lifecycles live in `modal-service.js`. Feature code should call the service through thin wrappers instead of implementing its own Promise/listener cleanup loop.


## Domain mutation rule

Session, task, event and recurrence mutation rules live in dedicated services. `app-main.js` may coordinate dialogs, toasts, undo presentation, gamification side effects and renders, but should not duplicate series/date mutation algorithms.

## Domain regression gate

`npm run domain:check` validates recurrence, session, task and event mutation behavior independently from the DOM. It is part of the standard `npm run check` release gate.

## Reliability boundary

State migration, IndexedDB recovery storage, startup recovery sequencing, destructive-sync risk calculation and device-local timer preservation are independent reliability modules.

The composition layer supplies UI callbacks; reliability modules own deterministic data rules. `npm run reliability:check` independently verifies migration, recovery sequencing, destructive-sync thresholds and active-timer preservation.

## Cloud synchronization boundary

`sync-controller.js` owns synchronization decisions: initial merge/adoption, remote-newer handling, dirty-local pushes, 409 conflict recovery and destructive-replacement confirmation.

`cloud-sync.js` now owns transport/account/UI concerns around that controller: authentication, API calls, device management, status rendering and persistence of sync metadata.

Critical invariant: when the user chooses to keep this device's data after a destructive-sync warning, the local state remains dirty and the base revision is not advanced. This prevents a protected local state from being silently marked as synchronized.

`npm run sync:check` verifies the controller decision matrix. `npm run deployment:check` verifies production script ordering, asset-version alignment and the protected-local integration contract.
