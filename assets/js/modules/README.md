# Source modules

All source modules live under a responsibility folder. `app.js` is generated; never edit it directly.

```text
modules/
├── analytics/     analytics calculations and analytics/summary views
├── app/           startup, runtime-error and cross-view composition
├── calendar/      calendar/event repository, service, core and view
├── gamification/  XP/tree rules and collection view
├── sessions/      session repository, mutation service and view
├── shared/        cross-domain deterministic helpers such as recurrence
├── state/         merge, persistence, writer, migration and recovery
├── sync/          sync controller, destructive guard and external-state rules
├── tasks/         task repository, mutation/focus integration services and view
├── timer/         timer core, service and controller
└── ui/            generic UI helpers, formatters, modal/focus/work controls
```

## Rules

1. Add new module paths to `scripts/module-manifest.js`; do not edit `scripts/build-app.js` to maintain a second list.
2. A module must live in one of the responsibility folders above; root-level `.js` files under `modules/` are rejected.
3. Domain/state/timer/sync modules must not query or mutate page DOM.
4. View modules may build deterministic markup/models but browser event binding remains in the composition layer unless explicitly owned by a UI infrastructure module.
5. Run `npm run check` before release. `modules:check` verifies that every module exists, is listed exactly once, is in an approved folder, and appears in generated `app.js` in manifest order.
