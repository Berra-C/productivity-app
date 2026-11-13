const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(
  path.join(root,'assets/js/app-main.js'),
  'utf8'
);
const index=fs.readFileSync(
  path.join(root,'index.html'),
  'utf8'
);

function fail(message){
  console.error(message);
  process.exitCode=1;
}

const requiredIds=new Set(
  [...app.matchAll(
    /document\.getElementById\(['"]([^'"]+)['"]\)/g
  )].map(match=>match[1])
);

const htmlIds=[
  ...index.matchAll(/\bid=["']([^"']+)["']/g)
].map(match=>match[1]);

const htmlIdSet=new Set(htmlIds);

// Some elements are intentionally created by view/test modules at runtime.
// Detect those IDs from all JavaScript sources instead of maintaining a
// fragile manual allowlist.
const jsFiles=[];

function collectJs(directory){
  for(const entry of fs.readdirSync(directory,{
    withFileTypes:true
  })){
    const full=path.join(directory,entry.name);

    if(entry.isDirectory()){
      collectJs(full);
    }else if(
      entry.isFile() &&
      entry.name.endsWith('.js')
    ){
      jsFiles.push(full);
    }
  }
}

collectJs(path.join(root,'assets/js'));

const runtimeCreatedIds=new Set();

for(const file of jsFiles){
  const source=fs.readFileSync(file,'utf8');

  for(const match of source.matchAll(
    /\bid=["']([^"']+)["']/g
  )){
    runtimeCreatedIds.add(match[1]);
  }

  for(const match of source.matchAll(
    /\.id\s*=\s*["']([^"']+)["']/g
  )){
    runtimeCreatedIds.add(match[1]);
  }
}

for(const id of [...requiredIds].sort()){
  if(
    !htmlIdSet.has(id) &&
    !runtimeCreatedIds.has(id)
  ){
    fail(
      `missing DOM id required by app-main.js: ${id}`
    );
  }
}

const duplicates=htmlIds.filter(
  (id,index,array)=>array.indexOf(id)!==index
);

if(duplicates.length){
  fail(
    'duplicate DOM ids: '+
    [...new Set(duplicates)].join(', ')
  );
}

const referencedAssets=[
  ...index.matchAll(
    /(?:src|href)=["']([^"']+\.(?:js|css))(?:\?[^"']*)?["']/g
  )
].map(match=>match[1]);

for(const asset of referencedAssets){
  // CDN/remote assets are not local filesystem contracts.
  if(/^[a-z]+:\/\//i.test(asset)) continue;

  const file=path.join(root,asset);

  if(!fs.existsSync(file)){
    fail(`missing production asset: ${asset}`);
  }
}

if(process.exitCode){
  process.exit(process.exitCode);
}

console.log(
  `DOM contract checks passed (`+
  `${requiredIds.size} required ids, `+
  `${runtimeCreatedIds.size} runtime-created ids)`
);
