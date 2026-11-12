const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'assets/js/app.js');

const sources = [
  'assets/js/modules/ui-helpers.js',
  'assets/js/modules/state-merge.js',
  'assets/js/modules/state-persistence.js',
  'assets/js/modules/state-writer.js',
  'assets/js/modules/timer-core.js',
  'assets/js/modules/timer-service.js',
  'assets/js/modules/timer-controller.js',
  'assets/js/modules/session-repository.js',
  'assets/js/modules/task-repository.js',
  'assets/js/modules/event-repository.js',
  'assets/js/modules/gamification-core.js',
  'assets/js/modules/tree-service.js',
  'assets/js/modules/analytics-core.js',
  'assets/js/modules/calendar-core.js',
  'assets/js/modules/view-formatters.js',
  'assets/js/modules/summary-view.js',
  'assets/js/modules/calendar-view.js',
  'assets/js/modules/stats-view.js',
  'assets/js/modules/task-view.js',
  'assets/js/modules/collection-view.js',
  'assets/js/modules/session-view.js',
  'assets/js/modules/focus-view.js',
  'assets/js/modules/work-controls-view.js',
  'assets/js/modules/modal-service.js',
  'assets/js/app-main.js'
];

function buildText() {
  const header = [
    '/*',
    ' * GENERATED FILE — DO NOT EDIT assets/js/app.js DIRECTLY.',
    ' * Edit modules/*.js or assets/js/app-main.js, then run: npm run build',
    ' */',
    ''
  ].join('\n');

  const body = sources.map(relativePath => {
    const fullPath = path.join(root, relativePath);
    const content = fs.readFileSync(fullPath, 'utf8').trimEnd();
    return `/* ===== ${relativePath} ===== */\n${content}`;
  }).join('\n\n');

  return `${header}${body}\n`;
}

const expected = buildText();
const checkOnly = process.argv.includes('--check');

if (checkOnly) {
  const current = fs.existsSync(output) ? fs.readFileSync(output, 'utf8') : '';
  if (current !== expected) {
    console.error('assets/js/app.js is out of date. Run: npm run build');
    process.exit(1);
  }
  console.log('app bundle is up to date');
  process.exit(0);
}

fs.writeFileSync(output, expected);
console.log('built assets/js/app.js');
