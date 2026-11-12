(() => {
  'use strict';

  function create(options={}){
    const getState=options.getState;
    const persistence=options.persistence;
    const semanticSnapshot=options.semanticSnapshot;
    const now=typeof options.now==='function' ? options.now : ()=>Date.now();
    const writerId=typeof options.writerId==='function'
      ? options.writerId
      : ()=>options.writerId || null;
    const syncBeforeSave=typeof options.syncBeforeSave==='function'
      ? options.syncBeforeSave
      : ()=>{};
    const shouldMirror=typeof options.shouldMirror==='function'
      ? options.shouldMirror
      : ()=>true;
    const onSaved=typeof options.onSaved==='function'
      ? options.onSaved
      : ()=>{};

    if(typeof getState!=='function') throw new Error('StateWriter getState gerekli');
    if(!persistence || typeof persistence.commitSnapshot!=='function'){
      throw new Error('StateWriter persistence gerekli');
    }
    if(typeof semanticSnapshot!=='function'){
      throw new Error('StateWriter semanticSnapshot gerekli');
    }

    let lastSemanticSnapshot=null;
    let lastSaveAt=0;

    function acceptCurrentState(){
      const state=getState();
      lastSemanticSnapshot=semanticSnapshot(state);
      return lastSemanticSnapshot;
    }

    function save(options={}){
      syncBeforeSave();

      const state=getState();
      if(!state || typeof state!=='object'){
        throw new Error('StateWriter geçerli state bulamadı');
      }

      const semantic=semanticSnapshot(state);
      if(
        !options.force &&
        lastSemanticSnapshot!==null &&
        semantic===lastSemanticSnapshot
      ){
        return {
          ok:true,
          skipped:true,
          meta:state.storageMeta || null
        };
      }

      const previousMeta=state.storageMeta
        ? {...state.storageMeta}
        : null;
      const storedMeta=typeof persistence.readPrimaryMeta==='function'
        ? persistence.readPrimaryMeta()
        : null;
      const localMeta=state.storageMeta || {};
      const timestamp=Number(now()) || Date.now();

      state.storageMeta={
        revision:Math.max(
          Number(localMeta.revision)||0,
          Number(storedMeta?.revision)||0
        )+1,
        updatedAt:timestamp,
        writerId:writerId()
      };

      const serialized=JSON.stringify(state);
      const committed=persistence.commitSnapshot(serialized,{
        mirror:Boolean(shouldMirror())
      });

      if(!committed){
        if(previousMeta) state.storageMeta=previousMeta;
        else delete state.storageMeta;

        return {
          ok:false,
          skipped:false,
          meta:state.storageMeta || null
        };
      }

      lastSemanticSnapshot=semantic;
      lastSaveAt=timestamp;

      const detail={
        revision:Number(state.storageMeta?.revision)||0,
        updatedAt:Number(state.storageMeta?.updatedAt)||timestamp
      };

      if(!options.suppressCloud) onSaved(detail);

      return {
        ok:true,
        skipped:false,
        meta:{...state.storageMeta}
      };
    }

    function getLastSaveAt(){
      return lastSaveAt;
    }

    function hasBaseline(){
      return lastSemanticSnapshot!==null;
    }

    return Object.freeze({
      save,
      acceptCurrentState,
      getLastSaveAt,
      hasBaseline
    });
  }

  window.ProductivityStateWriter={create};
})();
