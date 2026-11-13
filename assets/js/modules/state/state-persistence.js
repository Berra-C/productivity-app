(() => {
  'use strict';

  function semanticSnapshot(value){
    const copy={...(value||{})};
    delete copy.storageMeta;
    return JSON.stringify(copy);
  }

  function compareStorageMeta(a,b){
    const aa=a && typeof a==='object' ? a : {};
    const bb=b && typeof b==='object' ? b : {};
    const ar=Number(aa.revision)||0;
    const br=Number(bb.revision)||0;
    if(ar!==br) return ar-br;

    const at=Number(aa.updatedAt)||0;
    const bt=Number(bb.updatedAt)||0;
    if(at!==bt) return at-bt;

    return String(aa.writerId||'').localeCompare(String(bb.writerId||''));
  }

  function createRepository(options={}){
    const storage=options.storage || window.localStorage;
    const primaryKey=String(options.primaryKey||'');
    const backupKey=String(options.backupKey||'');
    const legacyKey=String(options.legacyKey||'');
    const preImportKey=String(options.preImportKey||`${primaryKey}_pre_import`);
    const mirrorSnapshot=typeof options.mirrorSnapshot==='function'
      ? options.mirrorSnapshot
      : ()=>{};
    const clearRecoverySnapshot=typeof options.clearRecoverySnapshot==='function'
      ? options.clearRecoverySnapshot
      : async()=>true;
    const readRecoverySnapshot=typeof options.readRecoverySnapshot==='function'
      ? options.readRecoverySnapshot
      : async()=>null;

    if(!primaryKey || !backupKey){
      throw new Error('StatePersistence primaryKey/backupKey gerekli');
    }

    function readRaw(key){
      try{ return storage.getItem(key); }
      catch(error){ return null; }
    }

    function readJson(key){
      const raw=readRaw(key);
      if(!raw) return null;
      try{ return JSON.parse(raw); }
      catch(error){ return null; }
    }

    function writeRaw(key,value){
      try{
        storage.setItem(key,value);
        return true;
      }catch(error){
        console.error('Yerel depolama yazımı başarısız:',error);
        return false;
      }
    }

    function remove(key){
      try{
        storage.removeItem(key);
        return true;
      }catch(error){
        return false;
      }
    }

    return Object.freeze({
      readJson,
      readRaw,
      writeRaw,
      remove,

      readPrimary(){
        return readJson(primaryKey);
      },

      readBackup(){
        return readJson(backupKey);
      },

      readLegacy(){
        return legacyKey ? readJson(legacyKey) : null;
      },

      readPrimaryMeta(){
        const raw=readJson(primaryKey);
        return raw && raw.storageMeta && typeof raw.storageMeta==='object'
          ? raw.storageMeta
          : null;
      },

      commitSnapshot(serialized,{mirror=true}={}){
        const previous=readRaw(primaryKey);

        if(previous && previous!==serialized){
          if(!writeRaw(backupKey,previous)) return false;
        }

        if(!writeRaw(primaryKey,serialized)) return false;

        if(mirror){
          try{ mirrorSnapshot(serialized); }
          catch(error){ console.warn('Snapshot mirror başlatılamadı:',error); }
        }

        return true;
      },

      savePreImport(value){
        try{
          return writeRaw(preImportKey,JSON.stringify(value));
        }catch(error){
          return false;
        }
      },

      async resetAll(){
        remove(primaryKey);
        remove(backupKey);
        remove(preImportKey);
        if(legacyKey) remove(legacyKey);
        return clearRecoverySnapshot();
      },

      readRecoverySnapshot(){
        return readRecoverySnapshot();
      },

      mirror(serialized){
        return mirrorSnapshot(serialized);
      }
    });
  }

  window.ProductivityStatePersistence={
    semanticSnapshot,
    compareStorageMeta,
    createRepository
  };
})();
