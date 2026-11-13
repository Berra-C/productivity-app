const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  PRODUCTION_RUNTIME_FILES
} = require('./module-manifest');

const root = path.resolve(__dirname, '..');

const scriptFiles = fs
  .readdirSync(path.join(root, 'scripts'), {
    withFileTypes: true
  })
  .filter(entry =>
    entry.isFile() &&
    entry.name.endsWith('.js')
  )
  .map(entry => `scripts/${entry.name}`);

const files = [
  ...new Set([
    ...PRODUCTION_RUNTIME_FILES,
    ...scriptFiles
  ])
];

let failed = false;

for (const relativePath of files) {
  const fullPath = path.join(root, relativePath);

  if (!fs.existsSync(fullPath)) {
    console.error(`missing: ${relativePath}`);
    failed = true;
    continue;
  }

  const result = spawnSync(
    process.execPath,
    ['--check', fullPath],
    { encoding: 'utf8' }
  );

  if (result.status !== 0) {
    failed = true;
    console.error(`syntax failed: ${relativePath}`);
    process.stderr.write(result.stderr || '');
  }
}

if (failed) process.exit(1);

console.log(
  `syntax checks passed (${files.length} files)`
);
