# Application Architecture

## Build rule

`assets/js/app.js` is a generated production bundle. Do not edit it directly.

Edit source files under `assets/js/modules/<responsibility>/` or `assets/js/app-main.js`, then run:

```bash
npm run build
npm run check
```

The generated `app.js` is committed so GitHub Pages can serve the application without a Node runtime.

## Runtime organization

Source modules are grouped by responsibility rather than kept in one flat directory:

```text
assets/js/modules/
├── analytics/
├── app/
├── calendar/
├── gamification/
├── sessions/
├── shared/
├── state/
├── sync/
├── tasks/
├── timer/
└── ui/
```

The canonical build order lives only in `scripts/module-manifest.js`. Both the production bundle and validation scripts consume this manifest.

High-level dependency direction:

```text
state / shared
      ↓
repositories + domain services
      ↓
timer / sync / analytics / calendar / gamification
      ↓
deterministic views + UI infrastructure
      ↓
app-main.js composition root
      ↓
cloud-sync.js transport/account UI
```

`assets/js/app.js` remains one generated self-contained production bundle for GitHub Pages.

## Dependency direction

Domain modules must not depend on DOM rendering or page-specific UI.

`app-main.js` may compose modules and provide UI callbacks, but timer/state/session modules should remain testable without the page DOM.

## Persistence source of truth

- Session duration is derived from `workIntervals`.
- `localStorage` is the primary local snapshot.
- IndexedDB is a recovery mirror.
- The previous local snapshot is preserved as backup before primary replacement.
- Cloud merge uses record timestamps and tombstones.

## Architecture freeze

As of v92, the major modular-refactor phase is frozen. New source modules must:
- live in an approved responsibility folder,
- be registered in `scripts/module-manifest.js`,
- respect the dependency direction,
- pass `modules:check` and the full release gate.

Further module extraction should happen only when a concrete feature or reliability boundary benefits from it; reducing `app-main.js` line count is no longer a goal by itself.

The next phase is product/UX work, starting with the Task → Focus productivity loop and rule-based insights.

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

## Composition boundary

`view-coordinator.js` owns cross-screen render coordination and expensive-view visibility rules. `startup-controller.js` owns the recovery → fallback → onboarding → ready lifecycle. `runtime-error-service.js` owns global runtime-error banner wiring.

`app-main.js` remains the browser composition root, but cross-feature lifecycle policy should move into small injected coordinators rather than accumulating inline promise chains and render fan-out.

## Browser regression gate

`npm run browser:check` launches real headless Chromium and executes the generated production `app.js`, cloud config and cloud sync code against the real Chromium DOM.

Because the current execution environment applies a managed policy that blocks localhost and `file://` navigation, the gate uses Chromium DevTools Protocol `Page.setDocumentContent` on `about:blank`, injects an in-memory Storage implementation, then executes the exact generated production JavaScript. It performs actual DOM clicks for task creation/completion and timer start/pause/resume/finish.

This is a genuine browser DOM/runtime regression test, but it does not validate service-worker registration, network transport or native browser localStorage persistence. Those remain covered separately by deployment, state-persistence and sync tests.


The browser regression gate also validates that mutations travel through the real application persistence path by checking the serialized primary state after task/session actions. The Storage object is memory-backed only to bypass the execution environment's navigation policy; StateWriter and StatePersistence are the production implementations.

## Module manifest invariant

`scripts/module-manifest.js` is the single source of truth for module files and bundle order. `npm run modules:check` rejects unlisted files, missing files, duplicate entries, root-level module JavaScript and bundle-order drift. Historical `changes/Vxx-CHANGES.txt` files retain the paths that were correct for their releases and are intentionally not rewritten.

The Chromium gate uses Chrome-assigned remote-debugging ports via `DevToolsActivePort`, avoiding fixed-port collisions and making the release gate deterministic across repeated runs.

The Chromium runner normalizes page WebSocket endpoints to `127.0.0.1` and retries CDP attachment, avoiding localhost IPv4/IPv6 races during headless startup.

The headless Chromium gate explicitly binds CDP to `127.0.0.1` and enables the DevTools WebSocket origin required by modern Chromium (`--remote-allow-origins=*`).


The Chromium release gate discovers Chrome's assigned debugging port from `DevToolsActivePort`, connects to the browser-level DevTools websocket on `127.0.0.1`, and attaches to the page using flattened `Target.attachToTarget`. This avoids fixed-port collisions and page-websocket startup races while preserving a real Chromium DOM/runtime test.

The CDP WebSocket client is readyState-aware and creates its open promise during construction, so fast loopback connections cannot lose the `open` event.


## Task → Focus integration

Task-linked focus sessions use `session.linkedTaskId` plus `session.linkedTaskText` as the durable relationship. `linkedTaskText` is a historical snapshot so session history remains understandable if the task is later deleted, while current task text is preferred whenever the task still exists.

`tasks/task-focus-service.js` is the single integration boundary for legacy link inference, session/task linking, linked-todo mirroring, per-task focus totals and task-focus analytics breakdowns. Focus time is derived from session history rather than duplicated onto task records, avoiding a second mutable source of truth.

A linked session todo mirrors the global task and does not independently grant todo XP. Completing the task therefore produces one task completion reward, not a session-todo reward plus a task reward. Session todo mutations update `session.updatedAt` so cloud LWW merge can observe them.

Midnight session continuation preserves the linked task relationship. At session finish, an open linked task can be completed or deliberately left open. The stats panel derives “Görevlere Göre Odak” from linked sessions for the selected period.


## Learning analytics (v94)

The analytics layer separates three kinds of evidence:

- **Objective:** focus duration, work intervals, target completion, distractions and task/session outcomes.
- **Subjective:** optional 1–5 `session.productivityRating` recorded after sessions of at least five minutes.
- **Context:** local hour, day, subject, task and session length.

`analytics/productivity-analytics.js` derives datasets without duplicating mutable totals. Hourly focus is calculated from `workIntervals` by splitting intervals at exact local-hour boundaries. A session's productivity rating is weighted by the amount of rated focus time that overlaps each hour.

Hourly distraction analysis is deliberately forward-only. v94 sessions store exact `distractionEvents` timestamps plus a tracking start timestamp. Legacy sessions retain their total distraction count for subject/session-level rates, but the application does **not** invent timestamps for them and therefore does not treat legacy hours as zero-distraction hours.

`analytics/insight-engine.js` may return at most three insights. It uses explicit evidence thresholds and confidence labels. A usable hourly pattern requires at least 3 sessions, 90 minutes and 2 different days; a strong hour requires at least 6 sessions, 240 minutes and 4 days. Rating-based hourly claims additionally require at least 3 rated sessions. Strong "best hour" language requires support from at least two independent signals (rating, exact timed-distraction rate, or target completion).

The primary learning window is a rolling 30 days, with the previous 30 days available for trend comparison. Insufficient data produces a transparent "learning" state rather than a fabricated recommendation. There is no opaque global productivity score in v94.

Schema version 48 adds:

- `session.productivityRating` (`1..5 | null`)
- `session.ratedAt`
- `session.distractionEvents[]`
- `session.distractionTrackingVersion`
- `session.distractionTrackingStartedAt`

Session rating changes update `session.updatedAt`, so existing record-level cloud merge semantics remain authoritative.
