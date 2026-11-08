(() => {
  'use strict';

  const clone = value => JSON.parse(JSON.stringify(value ?? null));

  function itemKey(item,index){
    return item?.id || item?.key || `${item?.name || item?.species || 'item'}:${item?.date || item?.completedAt || index}`;
  }

  function timestamp(value){
    if(Number.isFinite(Number(value))) return Number(value);
    const parsed=Date.parse(value||'');
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function freshness(item){
    return Math.max(
      timestamp(item?.updatedAt),
      timestamp(item?.completedAt),
      timestamp(item?.endedAt),
      timestamp(item?.doneAt),
      timestamp(item?.createdAt),
      timestamp(item?.startedAt)
    );
  }

  function stateFreshness(state){
    return Number(state?.storageMeta?.updatedAt || state?.updatedAt || 0);
  }

  function mergeTombstoneKind(remote={},local={}){
    const out={};
    const ids=new Set([...Object.keys(remote||{}),...Object.keys(local||{})]);
    ids.forEach(id=>{
      const ts=Math.max(Number(remote?.[id])||0,Number(local?.[id])||0);
      if(ts>0) out[id]=ts;
    });
    return out;
  }

  function mergeTombstones(remote={},local={}){
    return {
      sessions:mergeTombstoneKind(remote?.sessions,local?.sessions),
      tasks:mergeTombstoneKind(remote?.tasks,local?.tasks),
      events:mergeTombstoneKind(remote?.events,local?.events)
    };
  }

  function mergeArray(remote=[],local=[],tombstones={}){
    const map=new Map();
    [...(remote||[]),...(local||[])].forEach((item,index)=>{
      const key=itemKey(item,index);
      const deletedAt=Number(tombstones?.[key])||0;
      const itemTs=freshness(item);
      if(deletedAt && deletedAt>=itemTs) return;
      const existing=map.get(key);
      if(!existing){
        map.set(key,clone(item));
        return;
      }
      const a=freshness(existing), b=itemTs;
      if(b>a) map.set(key,clone(item));
      else if(b===a) map.set(key,clone({...existing,...item}));
    });
    return [...map.values()].filter(item=>{
      const id=itemKey(item,0);
      const deletedAt=Number(tombstones?.[id])||0;
      return !deletedAt || deletedAt<freshness(item);
    });
  }

  function mergeSessionLog(remote={},local={},sessionTombstones={}){
    const out={};
    const dates=new Set([...Object.keys(remote||{}),...Object.keys(local||{})]);
    dates.forEach(date=>{
      out[date]=mergeArray(remote?.[date]||[],local?.[date]||[],sessionTombstones);
    });
    return out;
  }

  function sessionDuration(session){
    const intervals=Array.isArray(session?.workIntervals) ? session.workIntervals : [];
    let hasClosed=false;
    let seconds=0;
    intervals.forEach(interval=>{
      const start=Number(interval?.start);
      const end=interval?.end==null ? null : Number(interval.end);
      if(!Number.isFinite(start) || !Number.isFinite(end) || end<=start) return;
      hasClosed=true;
      seconds+=Math.max(0,Math.floor((end-start)/1000));
    });
    return hasClosed ? Math.max(0,Math.round(seconds)) : Math.max(0,Math.round(Number(session?.duration)||0));
  }

  function validGoal(value){
    const n=Number(value);
    return Number.isFinite(n) && n>0 ? n : null;
  }

  function mergedDayFromSessions(remoteDay={},localDay={},sessions=[],fallbackGoal=60,preferLocal=true){
    const newer=preferLocal ? localDay : remoteDay;
    const older=preferLocal ? remoteDay : localDay;
    const source={...clone(older||{}),...clone(newer||{})};

    const workSeconds=Math.max(0,Math.round(
      (sessions||[]).reduce((sum,s)=>sum+sessionDuration(s),0)
    ));

    const distractionCategories={};
    let distraction=0;
    (sessions||[]).forEach(s=>{
      distraction+=Math.max(0,Number(s?.distractions||0));
      Object.entries(s?.distractionCategories||{}).forEach(([key,value])=>{
        distractionCategories[key]=(distractionCategories[key]||0)+Math.max(0,Number(value||0));
      });
    });

    const goalMinutes=
      validGoal(newer?.goalMinutes) ??
      validGoal(older?.goalMinutes) ??
      validGoal(fallbackGoal) ??
      60;

    return {
      ...source,
      workSeconds,
      sessions:(sessions||[]).length,
      distraction,
      distractionCategories,
      goalMinutes,
      goalCelebrated:Boolean(source.goalCelebrated && workSeconds>=goalMinutes*60)
    };
  }

  function rebuildDays(remoteDays={},localDays={},sessionLog={},fallbackGoal=60,preferLocal=true){
    const out={};
    const keys=new Set([
      ...Object.keys(remoteDays||{}),
      ...Object.keys(localDays||{}),
      ...Object.keys(sessionLog||{})
    ]);
    keys.forEach(date=>{
      // Preserve legacy aggregate-only days that predate session history.
      const hasSessionBucket=Object.prototype.hasOwnProperty.call(sessionLog,date);
      if(!hasSessionBucket){
        const newer=preferLocal ? localDays?.[date] : remoteDays?.[date];
        const older=preferLocal ? remoteDays?.[date] : localDays?.[date];
        out[date]={...clone(older||{}),...clone(newer||{})};
        return;
      }
      out[date]=mergedDayFromSessions(
        remoteDays?.[date]||{},
        localDays?.[date]||{},
        Array.isArray(sessionLog?.[date]) ? sessionLog[date] : [],
        fallbackGoal,
        preferLocal
      );
    });
    return out;
  }

  function mergeStates(remote={},local={}){
    const localIsNewest=stateFreshness(local)>=stateFreshness(remote);
    const newest=localIsNewest ? local : remote;
    const older=localIsNewest ? remote : local;
    const out={...clone(older||{}),...clone(newest||{})};

    out.tombstones=mergeTombstones(remote.tombstones,local.tombstones);
    out.tasks=mergeArray(remote.tasks,local.tasks,out.tombstones.tasks);
    out.events=mergeArray(remote.events,local.events,out.tombstones.events);
    out.taskTags=mergeArray(remote.taskTags,local.taskTags,{});
    out.collection=mergeArray(remote.collection,local.collection,{});
    out.badgeUnlockLog=mergeArray(remote.badgeUnlockLog,local.badgeUnlockLog,{});
    out.sessionLog=mergeSessionLog(remote.sessionLog,local.sessionLog,out.tombstones.sessions);

    // Ensure interval-derived duration is canonical in the merged history.
    Object.values(out.sessionLog||{}).forEach(list=>{
      if(!Array.isArray(list)) return;
      list.forEach(session=>{ session.duration=sessionDuration(session); });
    });

    const fallbackGoal=
      validGoal(newest.dailyGoalMinutes) ??
      validGoal(older.dailyGoalMinutes) ??
      60;

    out.days=rebuildDays(
      remote.days||{},
      local.days||{},
      out.sessionLog,
      fallbackGoal,
      localIsNewest
    );

    out.totalResists=Number(newest.totalResists)||0;
    out.totalTodosCompleted=Number(newest.totalTodosCompleted)||0;
    out.treeProgress=Number(newest.treeProgress)||0;
    out.treeNumber=Math.max(1,Number(newest.treeNumber)||1);
    out.speciesDeck=clone(newest.speciesDeck||[]);
    out.bestGoalStreak=Math.max(Number(remote.bestGoalStreak)||0,Number(local.bestGoalStreak)||0);

    out.streakFreezes=Math.max(0,Math.min(2,Number(newest.streakFreezes)||0));
    out.streakGoalDaysTowardFreeze=Math.max(0,Math.min(6,Number(newest.streakGoalDaysTowardFreeze)||0));
    out.frozenDays=[...new Set([...(remote.frozenDays||[]),...(local.frozenDays||[])])].sort();

    // Live timer is strictly device-local: remote activity can never start/stop this device's timer.
    out.activeSessionId=local.activeSessionId ?? null;
    out.activeSessionDate=local.activeSessionDate ?? null;
    out.isWorking=!!local.isWorking;
    out.workStart=local.workStart ?? null;
    out.breakState=clone(local.breakState ?? null);
    out.activeTimerOwnerId=local.activeTimerOwnerId ?? null;
    out.timerState=clone(local.timerState ?? {
      mode:out.isWorking ? 'working' : (out.breakState ? 'break' : (out.activeSessionId ? 'paused' : 'idle')),
      sessionId:out.activeSessionId,
      runningSince:out.workStart,
      ownerId:out.activeTimerOwnerId
    });

    return out;
  }

  window.ProductivityStateMerge={
    mergeArray,
    mergeSessionLog,
    rebuildDays,
    mergeStates,
    __test:{freshness,stateFreshness,mergeTombstones}
  };
})();
