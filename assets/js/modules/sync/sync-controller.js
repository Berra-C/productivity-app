(() => {
  'use strict';

  function hasMeaningfulData(state){
    if(!state) return false;

    const sessionCount=Object.values(state.sessionLog||{})
      .reduce(
        (sum,list)=>sum+(Array.isArray(list)?list.length:0),
        0
      );

    return (
      (state.tasks?.length||0) +
      (state.events?.length||0) +
      (state.collection?.length||0) +
      sessionCount
    )>0;
  }

  function create(options={}){
    const pull=options.pull;
    const push=options.push;
    const exportState=options.exportState;
    const replaceState=options.replaceState;
    const mergeStates=options.mergeStates;
    const stateRisk=options.stateRisk || (()=>({risky:false}));
    const confirmDestructive=options.confirmDestructive || (async()=>false);
    const onRemote=options.onRemote || (()=>{});

    if(typeof pull!=='function') throw new Error('SyncController pull gerekli');
    if(typeof push!=='function') throw new Error('SyncController push gerekli');
    if(typeof exportState!=='function') throw new Error('SyncController exportState gerekli');
    if(typeof replaceState!=='function') throw new Error('SyncController replaceState gerekli');
    if(typeof mergeStates!=='function') throw new Error('SyncController mergeStates gerekli');

    async function allowReplacement(localState,candidateState){
      const risk=stateRisk(localState,candidateState);
      if(!risk?.risky) return true;
      return Boolean(await confirmDestructive(risk));
    }

    async function run({
      initial=false,
      baseRevision=0,
      dirty=false
    }={}){
      const remote=await pull();
      onRemote(remote);

      let base=Math.max(0,Number(baseRevision)||0);
      const remoteRevision=Math.max(0,Number(remote?.revision)||0);
      const local=exportState();
      const remoteState=remote?.state || null;
      let finalState=local;
      let action='noop';

      if(!remoteState){
        const saved=await push(local,remoteRevision);
        base=Math.max(0,Number(saved?.revision)||0);
        action='push-local-empty-remote';
      }else if(initial && base===0){
        if(hasMeaningfulData(local)){
          finalState=mergeStates(remoteState,local);
          const saved=await push(finalState,remoteRevision);
          base=Math.max(0,Number(saved?.revision)||0);
          replaceState(finalState);
          action='initial-merge-push';
        }else{
          const allowed=await allowReplacement(local,remoteState);
          if(!allowed){
            return {
              ok:false,
              protectedLocal:true,
              action:'protect-local',
              baseRevision:base,
              remote,
              finalState:local
            };
          }

          replaceState(remoteState);
          base=remoteRevision;
          finalState=remoteState;
          action='initial-adopt-remote';
        }
      }else if(remoteRevision>base){
        if(dirty){
          finalState=mergeStates(remoteState,local);
          const saved=await push(finalState,remoteRevision);
          base=Math.max(0,Number(saved?.revision)||0);
          replaceState(finalState);
          action='remote-newer-merge-push';
        }else{
          const allowed=await allowReplacement(local,remoteState);
          if(!allowed){
            return {
              ok:false,
              protectedLocal:true,
              action:'protect-local',
              baseRevision:base,
              remote,
              finalState:local
            };
          }

          replaceState(remoteState);
          base=remoteRevision;
          finalState=remoteState;
          action='remote-newer-adopt';
        }
      }else if(dirty){
        try{
          const saved=await push(local,remoteRevision||base);
          base=Math.max(0,Number(saved?.revision)||0);
          action='push-dirty-local';
        }catch(error){
          if(error?.status!==409 || !error?.body?.state){
            throw error;
          }

          finalState=mergeStates(error.body.state,local);

          const allowed=await allowReplacement(local,finalState);
          if(!allowed){
            return {
              ok:false,
              protectedLocal:true,
              action:'protect-local-conflict',
              baseRevision:base,
              remote,
              finalState:local,
              conflictRevision:Math.max(
                0,
                Number(error.body.revision)||0
              )
            };
          }

          const saved=await push(
            finalState,
            Math.max(0,Number(error.body.revision)||0)
          );

          base=Math.max(0,Number(saved?.revision)||0);
          replaceState(finalState);
          action='conflict-merge-push';
        }
      }

      return {
        ok:true,
        protectedLocal:false,
        action,
        baseRevision:base,
        remote,
        finalState
      };
    }

    return Object.freeze({
      run,
      allowReplacement
    });
  }

  window.ProductivitySyncController={
    create,
    hasMeaningfulData
  };
})();
