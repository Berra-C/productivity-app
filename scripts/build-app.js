const fs = require('fs');
const path = require('path');
const {
  BUNDLE_SOURCES
} = require('./module-manifest');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'assets/js/app.js');

function buildText() {
  const header = [
    '/*',
    ' * GENERATED FILE — DO NOT EDIT assets/js/app.js DIRECTLY.',
    ' * Edit assets/js/modules/** or assets/js/app-main.js, then run: npm run build',
    ' */',
    ''
  ].join('\n');

  const body = BUNDLE_SOURCES.map(relativePath => {
    const fullPath = path.join(root, relativePath);
    const content = fs.readFileSync(fullPath, 'utf8').trimEnd();
    return `/* ===== ${relativePath} ===== */\n${content}`;
  }).join('\n\n');

  return `${header}${body}\n`;
}

const expected = buildText();
const checkOnly = process.argv.includes('--check');

if (checkOnly) {
  const current = fs.existsSync(output)
    ? fs.readFileSync(output, 'utf8')
    : '';

  if (current !== expected) {
    console.error(
      'assets/js/app.js is out of date. Run: npm run build'
    );
    process.exit(1);
  }

  console.log('app bundle is up to date');
  process.exit(0);
}

fs.writeFileSync(output, expected);
console.log('built assets/js/app.js');
