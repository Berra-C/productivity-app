const fs = require('fs');
const path = require('path');
const {
  MODULE_SOURCES,
  APP_ENTRY,
  BUNDLE_SOURCES,
  MODULE_DIRECTORIES
} = require('./module-manifest');

const root = path.resolve(__dirname, '..');
const modulesRoot = path.join(root, 'assets/js/modules');

function normalize(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function walk(directory) {
  const result = [];

  for (const entry of fs.readdirSync(directory, {
    withFileTypes: true
  })) {
    const full = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      result.push(...walk(full));
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.js')
    ) {
      result.push(full);
    }
  }

  return result;
}

let failed = false;

function fail(message) {
  console.error(message);
  failed = true;
}

const duplicates = MODULE_SOURCES.filter(
  (item,index,array)=>
    array.indexOf(item)!==index
);

if (duplicates.length) {
  fail(
    'duplicate module manifest entries: '+
    [...new Set(duplicates)].join(', ')
  );
}

const actualFiles = walk(modulesRoot)
  .map(file=>
    normalize(path.relative(root,file))
  )
  .sort();

const expectedFiles = [...MODULE_SOURCES].sort();

const unlisted = actualFiles.filter(
  file=>!expectedFiles.includes(file)
);

const missing = expectedFiles.filter(
  file=>!actualFiles.includes(file)
);

if (unlisted.length) {
  fail(
    'module files missing from manifest: '+
    unlisted.join(', ')
  );
}

if (missing.length) {
  fail(
    'manifest entries missing on disk: '+
    missing.join(', ')
  );
}

for (const relativePath of MODULE_SOURCES) {
  const fromModules=relativePath.replace(
    /^assets\/js\/modules\//,
    ''
  );

  const pieces=fromModules.split('/');

  if (pieces.length<2) {
    fail(
      `module must live in a responsibility folder: ${relativePath}`
    );
    continue;
  }

  const folder=pieces[0];

  if (!MODULE_DIRECTORIES.includes(folder)) {
    fail(
      `unapproved module folder "${folder}": ${relativePath}`
    );
  }
}

const actualDirectories = fs
  .readdirSync(modulesRoot,{
    withFileTypes:true
  })
  .filter(entry=>entry.isDirectory())
  .map(entry=>entry.name)
  .sort();

const expectedDirectories=[...MODULE_DIRECTORIES].sort();

if (
  JSON.stringify(actualDirectories)!==
  JSON.stringify(expectedDirectories)
) {
  fail(
    'module directory set differs from manifest. expected: '+
    expectedDirectories.join(', ')+
    ' actual: '+
    actualDirectories.join(', ')
  );
}

const rootLevelJs=fs
  .readdirSync(modulesRoot,{
    withFileTypes:true
  })
  .filter(entry=>
    entry.isFile() &&
    entry.name.endsWith('.js')
  )
  .map(entry=>entry.name);

if (rootLevelJs.length) {
  fail(
    'root-level module files are forbidden: '+
    rootLevelJs.join(', ')
  );
}

if (
  BUNDLE_SOURCES[BUNDLE_SOURCES.length-1]!==APP_ENTRY
) {
  fail('app-main.js must be the final bundle source');
}

if (
  BUNDLE_SOURCES.length !==
  MODULE_SOURCES.length+1
) {
  fail('bundle source list has an unexpected size');
}

// The generated bundle must expose section headers in manifest order.
const bundlePath=path.join(root,'assets/js/app.js');

if (fs.existsSync(bundlePath)) {
  const bundle=fs.readFileSync(bundlePath,'utf8');
  let previous=-1;

  for (const source of BUNDLE_SOURCES) {
    const marker=`/* ===== ${source} ===== */`;
    const index=bundle.indexOf(marker);

    if (index<0) {
      fail(`generated bundle missing section: ${source}`);
      continue;
    }

    if (index<=previous) {
      fail(`generated bundle order mismatch at: ${source}`);
    }

    previous=index;
  }
}

if (failed) process.exit(1);

console.log(
  `module manifest checks passed (`+
  `${MODULE_SOURCES.length} modules / `+
  `${MODULE_DIRECTORIES.length} folders)`
);
