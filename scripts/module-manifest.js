const MODULE_SOURCES = Object.freeze([
  "assets/js/modules/ui/ui-helpers.js",
  "assets/js/modules/state/state-merge.js",
  "assets/js/modules/state/state-persistence.js",
  "assets/js/modules/state/state-writer.js",
  "assets/js/modules/state/state-migration.js",
  "assets/js/modules/state/recovery-store.js",
  "assets/js/modules/state/state-recovery-service.js",
  "assets/js/modules/sync/destructive-sync-guard.js",
  "assets/js/modules/sync/external-state-service.js",
  "assets/js/modules/sync/sync-controller.js",
  "assets/js/modules/app/runtime-error-service.js",
  "assets/js/modules/app/view-coordinator.js",
  "assets/js/modules/app/startup-controller.js",
  "assets/js/modules/timer/timer-core.js",
  "assets/js/modules/timer/timer-service.js",
  "assets/js/modules/timer/timer-controller.js",
  "assets/js/modules/sessions/session-repository.js",
  "assets/js/modules/tasks/task-repository.js",
  "assets/js/modules/calendar/event-repository.js",
  "assets/js/modules/shared/recurrence-service.js",
  "assets/js/modules/sessions/session-service.js",
  "assets/js/modules/tasks/task-service.js",
  "assets/js/modules/tasks/task-focus-service.js",
  "assets/js/modules/calendar/event-service.js",
  "assets/js/modules/gamification/gamification-core.js",
  "assets/js/modules/gamification/tree-service.js",
  "assets/js/modules/analytics/analytics-core.js",
  "assets/js/modules/calendar/calendar-core.js",
  "assets/js/modules/ui/view-formatters.js",
  "assets/js/modules/analytics/summary-view.js",
  "assets/js/modules/calendar/calendar-view.js",
  "assets/js/modules/analytics/stats-view.js",
  "assets/js/modules/tasks/task-view.js",
  "assets/js/modules/gamification/collection-view.js",
  "assets/js/modules/sessions/session-view.js",
  "assets/js/modules/ui/focus-view.js",
  "assets/js/modules/ui/work-controls-view.js",
  "assets/js/modules/ui/modal-service.js"
]);

const APP_ENTRY = 'assets/js/app-main.js';

const BUNDLE_SOURCES = Object.freeze([
  ...MODULE_SOURCES,
  APP_ENTRY
]);

const PRODUCTION_RUNTIME_FILES = Object.freeze([
  ...BUNDLE_SOURCES,
  'assets/js/cloud-config.js',
  'assets/js/cloud-sync.js',
  'assets/js/pwa-register.js',
  'sw.js'
]);

const MODULE_DIRECTORIES = Object.freeze([
  'analytics',
  'app',
  'calendar',
  'gamification',
  'sessions',
  'shared',
  'state',
  'sync',
  'tasks',
  'timer',
  'ui'
]);

module.exports = {
  MODULE_SOURCES,
  APP_ENTRY,
  BUNDLE_SOURCES,
  PRODUCTION_RUNTIME_FILES,
  MODULE_DIRECTORIES
};
