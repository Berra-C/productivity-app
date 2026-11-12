const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'assets/js/app.js'), 'utf8');
const marker = '  function loadData(){';
const markerIndex = code.indexOf(marker);

if (markerIndex < 0) {
  console.error('loadData startup marker not found');
  process.exit(1);
}

// app-main is an IIFE. Cut before loadData and close the app-main IIFE.
// Bundled source modules before app-main already close their own IIFEs.
const prefix = code.slice(0, markerIndex) + '\n})();\n';

const storageMap = new Map();
const localStorage = {
  getItem:key => storageMap.has(key) ? storageMap.get(key) : null,
  setItem:(key,value) => storageMap.set(key,String(value)),
  removeItem:key => storageMap.delete(key),
  clear:() => storageMap.clear()
};

const noop = ()=>{};
const document = {
  addEventListener:noop,
  removeEventListener:noop,
  getElementById:()=>null,
  querySelector:()=>null,
  querySelectorAll:()=>[],
  createElement:()=>({
    style:{},
    classList:{add:noop,remove:noop,toggle:noop},
    setAttribute:noop,
    addEventListener:noop,
    appendChild:noop,
    remove:noop
  }),
  body:{
    appendChild:noop,
    classList:{add:noop,remove:noop,toggle:noop}
  },
  documentElement:{
    classList:{add:noop,remove:noop,toggle:noop}
  }
};

const sandbox = {
  window:null,
  self:null,
  globalThis:null,
  console,
  localStorage,
  sessionStorage:localStorage,
  document,
  navigator:{},
  location:{search:'',hash:'',pathname:'/'},
  history:{replaceState:noop,pushState:noop},
  addEventListener:noop,
  removeEventListener:noop,
  dispatchEvent:noop,
  requestAnimationFrame:()=>0,
  cancelAnimationFrame:noop,
  setTimeout:()=>0,
  clearTimeout:noop,
  setInterval:()=>0,
  clearInterval:noop,
  CustomEvent:function(type,init){this.type=type;this.detail=init?.detail;},
  Event:function(type){this.type=type;},
  MutationObserver:function(){this.observe=noop;this.disconnect=noop;},
  Date,
  Math,
  JSON,
  Object,
  Array,
  String,
  Number,
  Boolean,
  Set,
  Map,
  WeakMap,
  Promise,
  RegExp,
  Error,
  TypeError,
  Uint32Array,
  crypto:{
    randomUUID:()=> 'startup-smoke-tab',
    getRandomValues:arr => {
      for(let i=0;i<arr.length;i+=1) arr[i]=i+1;
      return arr;
    }
  },
  indexedDB:{}
};

sandbox.window=sandbox;
sandbox.self=sandbox;
sandbox.globalThis=sandbox;
sandbox.window.addEventListener=noop;
sandbox.window.removeEventListener=noop;
sandbox.window.dispatchEvent=noop;

vm.createContext(sandbox);

try {
  vm.runInContext(prefix, sandbox, {filename:'app.js'});
} catch (error) {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
}

if (!sandbox.ProductivityStatePersistence) {
  console.error('ProductivityStatePersistence was not initialized');
  process.exit(1);
}

console.log('production startup prefix smoke test passed');
