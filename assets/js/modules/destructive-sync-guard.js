(() => {
  'use strict';

  function counts(state){
    return {
      sessions:Object.values(state?.sessionLog||{})
        .reduce((sum,list)=>sum+(Array.isArray(list)?list.length:0),0),
      tasks:Array.isArray(state?.tasks)?state.tasks.length:0,
      events:Array.isArray(state?.events)?state.events.length:0,
      days:Object.keys(state?.days||{}).length
    };
  }

  function risk(localState,remoteState){
    const local=counts(localState);
    const remote=counts(remoteState);
    const ratio=(remoteValue,localValue)=>localValue>0?remoteValue/localValue:1;
    const ratios={
      sessions:ratio(remote.sessions,local.sessions),
      tasks:ratio(remote.tasks,local.tasks),
      events:ratio(remote.events,local.events),
      days:ratio(remote.days,local.days)
    };

    const risky=
      (local.sessions>=10 && ratios.sessions<0.55) ||
      (local.tasks>=10 && ratios.tasks<0.50) ||
      (local.days>=14 && ratios.days<0.55) ||
      (local.sessions>=20 && ratios.sessions<0.30) ||
      (local.tasks>=20 && ratios.tasks<0.30);

    return {risky:Boolean(risky),local,remote,ratios};
  }

  window.ProductivityDestructiveSyncGuard={counts,risk};
})();
