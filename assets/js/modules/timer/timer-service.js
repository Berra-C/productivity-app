(() => {
  'use strict';

  const Core=window.ProductivityTimerCore;
  if(!Core) throw new Error('ProductivityTimerCore gerekli');

  function makeId(prefix='s',now=Date.now()){
    return prefix+now+'_'+Math.random().toString(36).slice(2,7);
  }

  function createSession({
    now=Date.now(),
    name='Oturum',
    subject='Genel',
    targetSeconds=null,
    seedTodoText=null,
    linkedTaskId=null,
    linkedTaskText=null
  }={}){
    return {
      id:makeId('s',now),
      name,
      subject:(subject||'Genel').trim() || 'Genel',
      createdAt:now,
      startedAt:now,
      endedAt:null,
      workIntervals:[{start:now,end:null}],
      hidden:false,
      duration:0,
      distractions:0,
      distractionCategories:{},
      linkedTaskId:linkedTaskId ? String(linkedTaskId) : null,
      linkedTaskText:linkedTaskText
        ? String(linkedTaskText).trim().slice(0,120)
        : (seedTodoText ? String(seedTodoText).trim().slice(0,120) : null),
      todos:seedTodoText
        ? [{
            id:'t'+now+'seed',
            text:String(seedTodoText).trim().slice(0,80),
            done:false,
            linkedTaskId:linkedTaskId ? String(linkedTaskId) : null
          }]
        : [],
      targetSeconds:Number(targetSeconds)>0 ? Number(targetSeconds) : null,
      targetReached:false,
      breakNotified:false,
      updatedAt:now,
      milestonesHit:[]
    };
  }

  function hasOpenInterval(session){
    const list=Array.isArray(session?.workIntervals) ? session.workIntervals : [];
    return list.some(x=>Number.isFinite(Number(x?.start)) && x?.end==null);
  }

  function closeOpenInterval(session,at=Date.now()){
    if(!session) return false;
    if(!Array.isArray(session.workIntervals)) session.workIntervals=[];
    let changed=false;
    for(let i=session.workIntervals.length-1;i>=0;i--){
      const interval=session.workIntervals[i];
      if(interval?.end==null && Number.isFinite(Number(interval?.start))){
        interval.end=Math.max(Number(interval.start),Number(at)||Date.now());
        changed=true;
        break;
      }
    }
    if(changed){
      session.duration=Core.closedIntervalSeconds(session.workIntervals);
      session.updatedAt=Number(at)||Date.now();
    }
    return changed;
  }

  function openInterval(session,at=Date.now()){
    if(!session) return false;
    if(!Array.isArray(session.workIntervals)) session.workIntervals=[];
    if(hasOpenInterval(session)) return false;
    const start=Number(at)||Date.now();
    session.workIntervals.push({start,end:null});
    session.updatedAt=start;
    return true;
  }

  function pauseSession(session,at=Date.now()){
    if(!session) return null;
    closeOpenInterval(session,at);
    session.duration=Core.closedIntervalSeconds(session.workIntervals);
    session.updatedAt=Number(at)||Date.now();
    return session;
  }

  function resumeSession(session,at=Date.now()){
    if(!session) return null;
    openInterval(session,at);
    session.updatedAt=Number(at)||Date.now();
    return session;
  }

  function finishSession(session,at=Date.now()){
    if(!session) return null;
    closeOpenInterval(session,at);
    session.duration=Core.closedIntervalSeconds(session.workIntervals);
    if(!session.endedAt) session.endedAt=Number(at)||Date.now();
    session.updatedAt=Number(at)||Date.now();
    return session;
  }

  function createMidnightContinuation(previous,startMs){
    const session=createSession({
      now:startMs,
      name:previous?.name || 'Oturum',
      subject:previous?.subject || 'Genel',
      targetSeconds:previous?.targetSeconds || null,
      linkedTaskId:previous?.linkedTaskId || null,
      linkedTaskText:previous?.linkedTaskText || null
    });
    session.continuedFromMidnight=true;
    return session;
  }

  window.ProductivityTimerService={
    createSession,
    createMidnightContinuation,
    hasOpenInterval,
    openInterval,
    closeOpenInterval,
    pauseSession,
    resumeSession,
    finishSession
  };
})();
