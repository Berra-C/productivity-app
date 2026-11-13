(() => {
  'use strict';

  const Core=window.ProductivityTimerCore;
  const Service=window.ProductivityTimerService;

  if(!Core) throw new Error('ProductivityTimerCore gerekli');
  if(!Service) throw new Error('ProductivityTimerService gerekli');

  function requireFn(deps,name){
    if(typeof deps?.[name]!=='function'){
      throw new Error(`TimerController dependency eksik: ${name}`);
    }
    return deps[name];
  }

  function create(deps={}){
    const now=typeof deps.now==='function' ? deps.now : ()=>Date.now();

    const todayKey=requireFn(deps,'todayKey');
    const getTodaySessionCount=requireFn(deps,'getTodaySessionCount');
    const addSession=requireFn(deps,'addSession');
    const getActiveSession=requireFn(deps,'getActiveSession');
    const getSessionDateKey=requireFn(deps,'getSessionDateKey');
    const recomputeSessionDay=requireFn(deps,'recomputeSessionDay');
    const transitionMode=requireFn(deps,'transitionMode');
    const persist=requireFn(deps,'persist');

    function start({subject='',targetMinutes=null,seedTodoText=null,linkedTaskId=null,linkedTaskText=null}={}){
      deps.ensureReady?.();
      if(deps.isBreakActive?.()) deps.stopBreak?.();

      const startedAt=now();
      const cleanSubject=String(subject||'').trim();
      if(cleanSubject) deps.rememberSubject?.(cleanSubject);

      const session=Service.createSession({
        now:startedAt,
        name:'Oturum ' + (Number(getTodaySessionCount())+1),
        subject:cleanSubject || 'Genel',
        targetSeconds:Number(targetMinutes)>0 ? Number(targetMinutes)*60 : null,
        seedTodoText,
        linkedTaskId,
        linkedTaskText
      });

      const sessionDate=todayKey();
      addSession(sessionDate,session);
      recomputeSessionDay(sessionDate);

      const transitioned=transitionMode(Core.MODES.WORKING,{
        sessionId:session.id,
        sessionDate,
        runningSince:startedAt,
        ownerId:deps.ownerId?.() || null
      });

      if(!transitioned){
        throw new Error('Timer WORKING durumuna geçirilemedi');
      }

      deps.touchHeartbeat?.();
      persist({force:true});

      return {session,sessionDate,startedAt};
    }

    function pause(){
      const completedList=deps.beforePause?.() || [];
      const session=getActiveSession();

      if(!session){
        return {session:null,completedList,pausedAt:null};
      }

      const pausedAt=now();
      Service.pauseSession(session,pausedAt);
      recomputeSessionDay(getSessionDateKey(session.id) || todayKey());

      const transitioned=transitionMode(Core.MODES.PAUSED,{
        sessionId:session.id
      });

      if(!transitioned){
        throw new Error('Timer PAUSED durumuna geçirilemedi');
      }

      persist();
      return {session,completedList,pausedAt};
    }

    function resume(){
      deps.ensureReady?.();
      const session=getActiveSession();
      if(!session) return {session:null,resumedAt:null};

      const resumedAt=now();
      Service.resumeSession(session,resumedAt);

      const transitioned=transitionMode(Core.MODES.WORKING,{
        sessionId:session.id,
        runningSince:resumedAt,
        ownerId:deps.ownerId?.() || null
      });

      if(!transitioned){
        throw new Error('Timer WORKING durumuna geri geçirilemedi');
      }

      deps.touchHeartbeat?.();
      persist();

      return {session,resumedAt};
    }

    function finish(){
      const wasWorking=Boolean(deps.isWorking?.());
      const completedList=wasWorking ? (deps.beforeFinish?.() || []) : [];
      const session=getActiveSession();
      let endedAt=null;

      if(session){
        endedAt=now();
        Service.finishSession(session,endedAt);
        recomputeSessionDay(getSessionDateKey(session.id) || todayKey());
      }

      const transitioned=transitionMode(Core.MODES.IDLE);
      if(!transitioned){
        throw new Error('Timer IDLE durumuna geçirilemedi');
      }

      persist();
      return {session,completedList,endedAt};
    }

    return Object.freeze({
      start,
      pause,
      resume,
      finish
    });
  }

  window.ProductivityTimerController={create};
})();
