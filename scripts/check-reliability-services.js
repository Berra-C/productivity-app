const path = require('path');

global.window=global;
require(path.resolve(__dirname,'../assets/js/modules/state-migration.js'));
require(path.resolve(__dirname,'../assets/js/modules/recovery-store.js'));
require(path.resolve(__dirname,'../assets/js/modules/state-recovery-service.js'));
require(path.resolve(__dirname,'../assets/js/modules/destructive-sync-guard.js'));
require(path.resolve(__dirname,'../assets/js/modules/external-state-service.js'));

function assert(condition,message){
  if(!condition) throw new Error(message);
}

function closedIntervalSeconds(session,{fallbackToDuration=false}={}){
  const intervals=Array.isArray(session?.workIntervals)?session.workIntervals:[];
  const total=intervals.reduce((sum,interval)=>{
    const start=Number(interval?.start);
    const end=Number(interval?.end);
    return Number.isFinite(start)&&Number.isFinite(end)&&end>start
      ? sum+(end-start)/1000
      : sum;
  },0);
  return total>0?Math.round(total):(fallbackToDuration?Math.max(0,Number(session?.duration)||0):0);
}

(async()=>{
  const migration=global.ProductivityStateMigration.create({
    schemaVersion:46,
    closedIntervalSeconds,
    logger:{error:()=>{}}
  });

  const legacy={
    totalResists:0,
    treeProgress:0,
    days:{'2026-01-01':{workSeconds:0,distraction:0,resist:0,sessions:0}},
    sessionLog:{'2026-01-01':[{
      id:'s1',
      duration:600,
      startedAt:1000,
      endedAt:601000,
      distractions:0
    }]},
    tasks:[{id:'t1',text:'Monthly',dueDate:'2026-01-31',repeat:'monthly'}],
    events:[{id:'e1',title:'Monthly event',date:'2026-01-31',repeat:'monthly'}],
    collection:[]
  };

  assert(migration.validate(legacy),'legacy state should validate');
  const migrated=migration.migrate(JSON.parse(JSON.stringify(legacy)));
  assert(migrated.schemaVersion===46,'schema version');
  assert(migrated.tasks[0].repeatAnchorDay===31,'task monthly anchor');
  assert(migrated.events[0].repeatAnchorDay===31,'event monthly anchor');
  assert(Array.isArray(migrated.sessionLog['2026-01-01'][0].workIntervals),'work interval migration');
  assert(migrated.sessionLog['2026-01-01'][0].duration===600,'duration preserved');
  assert(migrated.timerState?.mode==='idle','timer state migration');
  assert(!migration.validate({treeProgress:0,days:{}}),'invalid state rejected');

  const store=global.ProductivityRecoveryStore.create({
    indexedDBProvider:()=>null,
    schemaVersion:46,
    logger:{warn:()=>{}}
  });
  assert(store.parse({payload:JSON.stringify(migrated)},value=>migration.validate(value))?.schemaVersion===46,'valid recovery parse');
  assert(store.parse({payload:'{broken'},()=>true)===null,'invalid JSON rejected');
  assert(await store.readRaw()===null,'missing IDB read');
  assert(await store.clear()===false,'missing IDB clear');

  const events=[];
  let needs=true;
  let recovered=null;
  const recovery=global.ProductivityStateRecoveryService.create({
    getNeedsRecovery:()=>needs,
    setNeedsRecovery:value=>{needs=value;events.push('needs:'+value);},
    readRecoverySnapshot:async()=>migrated,
    migrate:value=>value,
    setState:value=>{recovered=value;events.push('set');},
    normalizeRecoveredState:()=>events.push('normalize'),
    prepareRecoveredState:()=>events.push('prepare'),
    saveCurrent:options=>events.push(options?.force?'save-force':'save'),
    scheduleReview:()=>events.push('schedule'),
    renderRecovered:()=>events.push('render'),
    notifyRecovered:()=>events.push('notify'),
    logger:{warn:()=>{}}
  });
  assert(await recovery.recoverIfNeeded()===true,'recovery success');
  assert(recovered===migrated,'recovered state set');
  assert(events.join('|')==='needs:false|set|normalize|prepare|save-force|schedule|render|notify','recovery sequence');

  let emptyNeeds=true;
  let fallbackSaves=0;
  const emptyRecovery=global.ProductivityStateRecoveryService.create({
    getNeedsRecovery:()=>emptyNeeds,
    setNeedsRecovery:value=>{emptyNeeds=value;},
    readRecoverySnapshot:async()=>null,
    migrate:()=>null,
    saveCurrent:()=>{fallbackSaves++;},
    logger:{warn:()=>{}}
  });
  assert(await emptyRecovery.recoverIfNeeded()===false,'empty recovery false');
  assert(emptyNeeds===false,'recovery flag cleared');
  assert(fallbackSaves===1,'fresh state mirrored after empty recovery');

  const rich={
    sessionLog:{a:Array.from({length:40},(_,i)=>({id:'s'+i}))},
    tasks:Array.from({length:30},(_,i)=>({id:'t'+i})),
    events:[],
    days:Object.fromEntries(Array.from({length:20},(_,i)=>['d'+i,{}]))
  };
  const sparse={
    sessionLog:{a:Array.from({length:5},(_,i)=>({id:'r'+i}))},
    tasks:Array.from({length:4},(_,i)=>({id:'q'+i})),
    events:[],
    days:{d1:{}}
  };
  const danger=global.ProductivityDestructiveSyncGuard.risk(rich,sparse);
  assert(danger.risky===true,'destructive sync risky');
  assert(danger.local.sessions===40 && danger.remote.sessions===5,'sync counts');

  const external=global.ProductivityExternalStateService;
  const activeSession={
    id:'active',
    duration:100,
    workIntervals:[{start:1000,end:null}],
    name:'Local active'
  };
  const localState={
    activeSessionId:'active',
    activeSessionDate:'2026-11-12',
    isWorking:true,
    workStart:1000,
    activeTimerOwnerId:'tab-a',
    timerState:{mode:'working',sessionId:'active',runningSince:1000,ownerId:'tab-a'},
    breakState:null
  };
  const snapshot=external.captureDeviceLocalTimerState(localState,{
    tabId:'tab-a',
    findSession:id=>id==='active'?activeSession:null,
    isBreakActive:()=>false
  });
  assert(snapshot?.activeSession?.name==='Local active','capture active session');

  const incoming={
    sessionLog:{'2026-11-12':[{id:'active',duration:10,name:'Remote old'}]},
    activeSessionId:null,
    activeSessionDate:null,
    isWorking:false,
    workStart:null,
    activeTimerOwnerId:null,
    timerState:{mode:'idle'},
    breakState:null
  };
  const restored=external.restoreDeviceLocalTimerState(incoming,snapshot,{
    findSessionDateKey:()=>null,
    todayKey:()=> '2026-11-12'
  });
  assert(restored.isWorking===true,'local working timer preserved');
  assert(restored.sessionLog['2026-11-12'][0].name==='Local active','active session object preserved');
  assert(restored.timerState.ownerId==='tab-a','timer owner preserved');

  console.log('reliability service checks passed');
})().catch(error=>{
  console.error(error);
  process.exit(1);
});
