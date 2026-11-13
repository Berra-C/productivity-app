const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const cloud=fs.readFileSync(path.join(root,'assets/js/cloud-sync.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');

function assert(condition,message){
  if(!condition){
    console.error(message);
    process.exit(1);
  }
}

const versionMatch=index.match(/assets\/js\/app\.js\?v=(\d+)/);
assert(versionMatch,'app.js asset version missing');
const version=versionMatch[1];

for(const asset of [
  'assets/js/app.js',
  'assets/js/cloud-config.js',
  'assets/js/cloud-sync.js',
  'assets/js/pwa-register.js'
]){
  assert(
    index.includes(`${asset}?v=${version}`),
    `${asset} version must match app.js version`
  );
}

const appPos=index.indexOf(`assets/js/app.js?v=${version}`);
const cloudPos=index.indexOf(`assets/js/cloud-sync.js?v=${version}`);
assert(appPos>=0 && cloudPos>appPos,'app.js must load before cloud-sync.js');

assert(
  cloud.includes('window.ProductivitySyncController'),
  'cloud-sync.js must use ProductivitySyncController'
);

assert(
  cloud.includes("localStorage.setItem(LS.dirty,'1');") &&
  cloud.includes("if(result.protectedLocal)"),
  'protected-local sync path must keep dirty flag'
);

assert(
  !index.includes('assets/js/modules/'),
  'production index must not load internal source modules directly'
);

assert(
  /const CACHE_VERSION = 'v\d+';/.test(sw),
  'service worker cache version missing'
);

console.log('deployment contract checks passed');
