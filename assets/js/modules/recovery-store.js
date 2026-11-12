(() => {
  'use strict';

  function create(options={}){
    const indexedDBProvider=options.indexedDBProvider || (()=>globalThis.indexedDB);
    const dbName=String(options.dbName||'productivity_app_storage');
    const dbVersion=Math.max(1,Number(options.dbVersion)||1);
    const storeName=String(options.storeName||'snapshots');
    const primaryKey=String(options.primaryKey||'app-data');
    const schemaVersion=Math.max(1,Number(options.schemaVersion)||1);
    const now=options.now || (()=>Date.now());
    const logger=options.logger || console;

    let openPromise=null;
    let mirrorQueue=Promise.resolve();

    function open(){
      const indexedDB=indexedDBProvider();
      if(!indexedDB || typeof indexedDB.open!=='function') return Promise.resolve(null);
      if(openPromise) return openPromise;

      openPromise=new Promise(resolve=>{
        let request;
        try{
          request=indexedDB.open(dbName,dbVersion);
        }catch(error){
          logger.warn?.('IndexedDB açılamadı:',error);
          resolve(null);
          return;
        }

        request.onupgradeneeded=()=>{
          const db=request.result;
          if(!db.objectStoreNames.contains(storeName)){
            db.createObjectStore(storeName,{keyPath:'key'});
          }
        };
        request.onsuccess=()=>resolve(request.result);
        request.onerror=()=>{
          logger.warn?.('IndexedDB açılamadı:',request.error);
          resolve(null);
        };
        request.onblocked=()=>logger.warn?.(
          'IndexedDB yükseltmesi başka bir sekme tarafından engelleniyor.'
        );
      });

      return openPromise;
    }

    async function write(serializedData){
      const db=await open();
      if(!db) return false;

      return new Promise(resolve=>{
        let tx;
        try{
          tx=db.transaction(storeName,'readwrite');
          tx.objectStore(storeName).put({
            key:primaryKey,
            schemaVersion,
            savedAt:now(),
            payload:serializedData
          });
        }catch(error){
          logger.warn?.('IndexedDB kaydı başlatılamadı:',error);
          resolve(false);
          return;
        }

        tx.oncomplete=()=>resolve(true);
        tx.onerror=()=>{
          logger.warn?.('IndexedDB kaydı başarısız:',tx.error);
          resolve(false);
        };
        tx.onabort=()=>resolve(false);
      });
    }

    function mirror(serializedData){
      mirrorQueue=mirrorQueue
        .catch(()=>false)
        .then(()=>write(serializedData));
      return mirrorQueue;
    }

    async function readRaw(){
      const db=await open();
      if(!db) return null;

      return new Promise(resolve=>{
        try{
          const tx=db.transaction(storeName,'readonly');
          const request=tx.objectStore(storeName).get(primaryKey);
          request.onsuccess=()=>resolve(request.result || null);
          request.onerror=()=>resolve(null);
        }catch(error){
          resolve(null);
        }
      });
    }

    async function clear(){
      const db=await open();
      if(!db) return false;

      return new Promise(resolve=>{
        let tx;
        try{
          tx=db.transaction(storeName,'readwrite');
          tx.objectStore(storeName).delete(primaryKey);
        }catch(error){
          resolve(false);
          return;
        }
        tx.oncomplete=()=>resolve(true);
        tx.onerror=()=>resolve(false);
        tx.onabort=()=>resolve(false);
      });
    }

    function parse(snapshot,validate){
      try{
        const parsed=snapshot && typeof snapshot.payload==='string'
          ? JSON.parse(snapshot.payload)
          : null;
        return parsed && (!validate || validate(parsed)) ? parsed : null;
      }catch(error){
        return null;
      }
    }

    async function readParsed(validate){
      return parse(await readRaw(),validate);
    }

    return Object.freeze({open,write,mirror,readRaw,clear,parse,readParsed});
  }

  window.ProductivityRecoveryStore={create};
})();
