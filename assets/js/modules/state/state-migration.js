(() => {
  'use strict';

  function create(options={}){
    const schemaVersion=Math.max(1,Number(options.schemaVersion)||1);
    const closedIntervalSeconds=typeof options.closedIntervalSeconds==='function'
      ? options.closedIntervalSeconds
      : session=>Math.max(0,Number(session?.duration)||0);
    const logger=options.logger || console;

    function validate(raw){
      if(!raw || typeof raw!=='object' || Array.isArray(raw)) return false;
      if(typeof raw.totalResists!=='number' || typeof raw.treeProgress!=='number') return false;
      if(!raw.days || typeof raw.days!=='object' || Array.isArray(raw.days)) return false;
      if(raw.tasks !== undefined && !Array.isArray(raw.tasks)) return false;
      if(raw.events !== undefined && !Array.isArray(raw.events)) return false;
      if(raw.taskTags !== undefined && !Array.isArray(raw.taskTags)) return false;
      if(raw.collection !== undefined && !Array.isArray(raw.collection)) return false;
      if(raw.sessionLog !== undefined && (!raw.sessionLog || typeof raw.sessionLog!=='object' || Array.isArray(raw.sessionLog))) return false;
      return true;
    }

    function migrate(raw){

    if(raw.schemaVersion === undefined){
      // v1/v2 (sürüm alanı yoktu) -> eksik alanları doldur
      if(raw.muted === undefined) raw.muted = false;
      if(!raw.sessionLog) raw.sessionLog = {};
      if(raw.activeSessionId === undefined) raw.activeSessionId = null;
      if(raw.breakState === undefined) raw.breakState = null;
      if(raw.totalTodosCompleted === undefined) raw.totalTodosCompleted = 0;
      if(raw.notificationsEnabled === undefined) raw.notificationsEnabled = false;
      if(!raw.badgeUnlockLog) raw.badgeUnlockLog = [];
      if(!raw.dailyGoalMinutes) raw.dailyGoalMinutes = 60;
      if(!raw.subjects) raw.subjects = [];
    }
    if(raw.bestGoalStreak === undefined) raw.bestGoalStreak = 0;
    if(raw.streakFreezes === undefined) raw.streakFreezes = 0;
    raw.streakFreezes = Math.max(0,Math.min(2,Number(raw.streakFreezes)||0));
    if(raw.streakFreezeAwardedAt === undefined) raw.streakFreezeAwardedAt = 0;
    if(!Array.isArray(raw.streakRewardKeys)) raw.streakRewardKeys = [];
    if(!Array.isArray(raw.frozenDays)) raw.frozenDays = [];
    if(raw.streakGoalDaysTowardFreeze === undefined) raw.streakGoalDaysTowardFreeze = 0;
    raw.streakGoalDaysTowardFreeze = Math.max(0,Math.min(6,Number(raw.streakGoalDaysTowardFreeze)||0));
    if(raw.activeSessionDate === undefined) raw.activeSessionDate = null;
    if(raw.activeTimerOwnerId === undefined) raw.activeTimerOwnerId = null;
    if(!raw.storageMeta || typeof raw.storageMeta!=='object' || Array.isArray(raw.storageMeta)){
      raw.storageMeta = {revision:0, updatedAt:0, writerId:null};
    }else{
      raw.storageMeta.revision = Math.max(0, Number(raw.storageMeta.revision)||0);
      raw.storageMeta.updatedAt = Math.max(0, Number(raw.storageMeta.updatedAt)||0);
      raw.storageMeta.writerId = raw.storageMeta.writerId ? String(raw.storageMeta.writerId) : null;
    }
    if(!raw.tombstones || typeof raw.tombstones!=='object' || Array.isArray(raw.tombstones)){
      raw.tombstones={sessions:{},tasks:{},events:{}};
    }
    ['sessions','tasks','events'].forEach(kind=>{
      if(!raw.tombstones[kind] || typeof raw.tombstones[kind]!=='object' || Array.isArray(raw.tombstones[kind])) raw.tombstones[kind]={};
      Object.keys(raw.tombstones[kind]).forEach(id=>{
        const ts=Number(raw.tombstones[kind][id]);
        if(!Number.isFinite(ts) || ts<=0) delete raw.tombstones[kind][id];
        else raw.tombstones[kind][id]=ts;
      });
    });
    if(raw.onboarded === undefined) raw.onboarded = true; // önceden veri varsa zaten tanışmış demektir
    if(raw.calendarActivityColors === undefined) raw.calendarActivityColors = true;
    if(raw.calendarWorkIntervals === undefined) raw.calendarWorkIntervals = true;
    if(!Number.isFinite(Number(raw.soundVolume))) raw.soundVolume = 70;
    raw.soundVolume = Math.max(0, Math.min(100, Number(raw.soundVolume)));
    if(!raw.soundCategories || typeof raw.soundCategories!=='object'){
      raw.soundCategories = {interface:true, achievement:true, alarm:true};
    }else{
      if(raw.soundCategories.interface === undefined) raw.soundCategories.interface = true;
      if(raw.soundCategories.achievement === undefined) raw.soundCategories.achievement = true;
      if(raw.soundCategories.alarm === undefined) raw.soundCategories.alarm = true;
    }
    if(!Array.isArray(raw.subjects)) raw.subjects = [];
    if(!raw.notificationCategories || typeof raw.notificationCategories!=='object'){
      raw.notificationCategories = {sessionTarget:true, breakReminder:true, dailyGoal:true};
    }else{
      if(raw.notificationCategories.sessionTarget === undefined) raw.notificationCategories.sessionTarget = true;
      if(raw.notificationCategories.breakReminder === undefined) raw.notificationCategories.breakReminder = true;
      if(raw.notificationCategories.dailyGoal === undefined) raw.notificationCategories.dailyGoal = true;
    }
    if(raw.totalResists === undefined) raw.totalResists = 0;
    if(raw.treeProgress === undefined) raw.treeProgress = 0;
    if(raw.treeNumber === undefined) raw.treeNumber = 1;
    if(!Array.isArray(raw.speciesDeck)) raw.speciesDeck = [];
    if(!Array.isArray(raw.collection)) raw.collection = [];
    if(!Array.isArray(raw.badgeUnlockLog)) raw.badgeUnlockLog = [];
    if(!raw.days || typeof raw.days!=='object' || Array.isArray(raw.days)) raw.days = {};
    if(!raw.sessionLog || typeof raw.sessionLog!=='object' || Array.isArray(raw.sessionLog)) raw.sessionLog = {};
    Object.keys(raw.sessionLog).forEach(key=>{
      if(!Array.isArray(raw.sessionLog[key])) raw.sessionLog[key]=[];
    });
    const legacyGoalMinutes = Number(raw.dailyGoalMinutes) || 60;
    Object.keys(raw.days).forEach(k=>{
      const d = raw.days[k];
      if(!d || typeof d !== 'object') return;
      if(!Number.isFinite(Number(d.goalMinutes)) || Number(d.goalMinutes) <= 0){
        d.goalMinutes = legacyGoalMinutes;
      }
      if(!d.distractionCategories || typeof d.distractionCategories !== 'object' || Array.isArray(d.distractionCategories)){
        d.distractionCategories = {};
      }
    });
    if(!raw.recurrenceExceptions || typeof raw.recurrenceExceptions!=='object' || Array.isArray(raw.recurrenceExceptions)){
      raw.recurrenceExceptions = {tasks:{}, events:{}};
    }
    if(!raw.recurrenceExceptions.tasks || typeof raw.recurrenceExceptions.tasks!=='object' || Array.isArray(raw.recurrenceExceptions.tasks)){
      raw.recurrenceExceptions.tasks = {};
    }
    if(!raw.recurrenceExceptions.events || typeof raw.recurrenceExceptions.events!=='object' || Array.isArray(raw.recurrenceExceptions.events)){
      raw.recurrenceExceptions.events = {};
    }
    ['tasks','events'].forEach(kind=>{
      Object.keys(raw.recurrenceExceptions[kind]).forEach(sourceId=>{
        const list=raw.recurrenceExceptions[kind][sourceId];
        if(!Array.isArray(list)){
          delete raw.recurrenceExceptions[kind][sourceId];
          return;
        }
        raw.recurrenceExceptions[kind][sourceId]=[...new Set(list.filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(String(x))))].sort();
        if(raw.recurrenceExceptions[kind][sourceId].length===0) delete raw.recurrenceExceptions[kind][sourceId];
      });
    });

    if(!Array.isArray(raw.tasks)) raw.tasks = [];
    if(!Array.isArray(raw.taskTags)){
      raw.taskTags = [
        {id:'tag_is', name:'İş', color:'#7aa2f7'},
        {id:'tag_kisisel', name:'Kişisel', color:'#74d99f'}
      ];
      const legacyMap = {'İş':'tag_is','Kişisel':'tag_kisisel'};
      raw.tasks.forEach(t=>{ t.tagId = legacyMap[t.tag] || null; });
    } else {
      raw.tasks.forEach(t=>{ if(t.tagId === undefined) t.tagId = null; });
    }
    raw.taskTags.forEach(tag=>{ if('labels' in tag) delete tag.labels; });
    raw.tasks.forEach((t,index)=>{
      if(!Number.isFinite(Number(t.sortOrder))) t.sortOrder=index;
      if(t.createdAt===undefined) t.createdAt=null;
      if(!Number.isFinite(Number(t.updatedAt))){
        const parsedCreated=Date.parse(t.createdAt||'');
        const parsedDone=Date.parse(t.doneAt||'');
        t.updatedAt=Number.isFinite(parsedDone)?parsedDone:(Number.isFinite(parsedCreated)?parsedCreated:0);
      }
      if('subtag' in t) delete t.subtag;
      if(t.repeat === undefined) t.repeat = 'none';
      if(t.repeatSourceId === undefined) t.repeatSourceId = null;
      if(!Array.isArray(t.repeatDays)) t.repeatDays = [];
      if(t.repeatAnchorDay === undefined) t.repeatAnchorDay = null;
      if(t.repeatUntil === undefined) t.repeatUntil = null;
    });
    const monthlyTaskAnchorBySource = {};
    raw.tasks.forEach(t=>{
      if(t.repeat!=='monthly' || !t.dueDate) return;
      const source=t.repeatSourceId || t.id;
      const day=Number(String(t.dueDate).slice(-2));
      if(Number.isFinite(day)){
        monthlyTaskAnchorBySource[source]=Math.max(monthlyTaskAnchorBySource[source]||0,day);
      }
    });
    raw.tasks.forEach(t=>{
      if(t.repeat==='monthly'){
        const source=t.repeatSourceId || t.id;
        const inferred=monthlyTaskAnchorBySource[source] || Number(String(t.dueDate||'').slice(-2)) || null;
        if(!Number.isFinite(Number(t.repeatAnchorDay)) || Number(t.repeatAnchorDay)<1 || Number(t.repeatAnchorDay)>31){
          t.repeatAnchorDay=inferred;
        }
      }else{
        t.repeatAnchorDay=null;
      }
    });

    if(!Array.isArray(raw.events)) raw.events = [];
    raw.events.forEach(ev=>{
      if(typeof ev.description!=='string') ev.description='';
      if(ev.createdAt===undefined) ev.createdAt=null;
      if(!Number.isFinite(Number(ev.updatedAt))){
        const parsedCreated=Date.parse(ev.createdAt||'');
        ev.updatedAt=Number.isFinite(parsedCreated)?parsedCreated:0;
      }
      ev.description=ev.description.slice(0,600);
      if(ev.repeat === undefined) ev.repeat = 'none';
      if(!Array.isArray(ev.repeatDays)) ev.repeatDays = [];
      if(ev.repeatSourceId === undefined) ev.repeatSourceId = null;
      if(ev.endTime === undefined) ev.endTime = null;
      if(ev.repeatAnchorDay === undefined) ev.repeatAnchorDay = null;
      if(ev.repeatUntil === undefined) ev.repeatUntil = null;
    });
    const monthlyEventAnchorBySource = {};
    raw.events.forEach(ev=>{
      if(ev.repeat!=='monthly' || !ev.date) return;
      const source=ev.repeatSourceId || ev.id;
      const day=Number(String(ev.date).slice(-2));
      if(Number.isFinite(day)){
        monthlyEventAnchorBySource[source]=Math.max(monthlyEventAnchorBySource[source]||0,day);
      }
    });
    raw.events.forEach(ev=>{
      if(ev.repeat==='monthly'){
        const source=ev.repeatSourceId || ev.id;
        const inferred=monthlyEventAnchorBySource[source] || Number(String(ev.date||'').slice(-2)) || null;
        if(!Number.isFinite(Number(ev.repeatAnchorDay)) || Number(ev.repeatAnchorDay)<1 || Number(ev.repeatAnchorDay)>31){
          ev.repeatAnchorDay=inferred;
        }
      }else{
        ev.repeatAnchorDay=null;
      }
    });

    // v4: oturum zaman damgaları ve tekil timer state uyumluluk katmanı.
    // Eski oturumlarda kesin saat bilgisi yoksa veri uydurmak yerine null bırakılır.
    Object.values(raw.sessionLog || {}).forEach(sessions=>{
      if(!Array.isArray(sessions)) return;
      sessions.forEach(session=>{
        if(session.startedAt === undefined) session.startedAt = null;
        if(session.endedAt === undefined) session.endedAt = null;
        if(!Array.isArray(session.workIntervals)){
          session.workIntervals = [];
          const started = Number(session.startedAt);
          const durationMs = Math.max(0, Number(session.duration||0))*1000;
          if(Number.isFinite(started) && durationMs>0){
            session.workIntervals.push({start:started,end:started+durationMs,legacyApprox:true});
          }
          if(session.id===raw.activeSessionId && raw.isWorking && Number(raw.workStart)){
            session.workIntervals.push({start:Number(raw.workStart),end:null});
          }
        }else{
          session.workIntervals = session.workIntervals.map(interval=>({
            start:Number(interval?.start)||null,
            end:interval?.end==null?null:(Number(interval.end)||null),
            legacyApprox:!!interval?.legacyApprox
          })).filter(interval=>interval.start);
        }
        if(session.linkedTaskId === undefined || session.linkedTaskId === null){
          const linkedTodo=Array.isArray(session.todos)
            ? session.todos.find(todo=>String(todo?.linkedTaskId||'').trim())
            : null;
          session.linkedTaskId=linkedTodo?.linkedTaskId
            ? String(linkedTodo.linkedTaskId)
            : null;
        }else{
          session.linkedTaskId=String(session.linkedTaskId||'').trim() || null;
        }
        if(session.linkedTaskText === undefined || session.linkedTaskText === null){
          const linkedTodo=Array.isArray(session.todos)
            ? session.todos.find(todo=>String(todo?.linkedTaskId||'').trim()===String(session.linkedTaskId||''))
            : null;
          const linkedTask=Array.isArray(raw.tasks)
            ? raw.tasks.find(task=>String(task?.id||'')===String(session.linkedTaskId||''))
            : null;
          session.linkedTaskText=String(linkedTask?.text||linkedTodo?.text||'').trim().slice(0,120) || null;
        }else{
          session.linkedTaskText=String(session.linkedTaskText||'').trim().slice(0,120) || null;
        }
        const productivityRating=Number(session.productivityRating);
        session.productivityRating=(
          Number.isInteger(productivityRating) &&
          productivityRating>=1 &&
          productivityRating<=5
        ) ? productivityRating : null;
        session.ratedAt=session.productivityRating===null
          ? null
          : (Number.isFinite(Number(session.ratedAt)) ? Number(session.ratedAt) : Number(session.endedAt)||Number(session.updatedAt)||null);

        const trackingVersion=Number(session.distractionTrackingVersion);
        session.distractionTrackingVersion=(trackingVersion>=1) ? 1 : 0;
        session.distractionTrackingStartedAt=session.distractionTrackingVersion>=1
          ? (Number.isFinite(Number(session.distractionTrackingStartedAt))
            ? Number(session.distractionTrackingStartedAt)
            : (Number(session.startedAt)||null))
          : null;
        session.distractionEvents=(Array.isArray(session.distractionEvents)?session.distractionEvents:[])
          .map(event=>({
            at:Number(event?.at)||null,
            category:String(event?.category||'').trim().slice(0,40) || null
          }))
          .filter(event=>Number.isFinite(event.at));
        if(session.hidden === undefined) session.hidden = false;
        if(session.createdAt===undefined) session.createdAt=Number(session.startedAt)||null;
        if(!Number.isFinite(Number(session.updatedAt))){
          session.updatedAt=Number(session.endedAt)||Number(session.startedAt)||Number(session.createdAt)||0;
        }
        const closedDuration=closedIntervalSeconds(session,{fallbackToDuration:true});
        if(Number.isFinite(closedDuration)) session.duration=closedDuration;
        if(!session.distractionCategories || typeof session.distractionCategories !== 'object' || Array.isArray(session.distractionCategories)){
          session.distractionCategories = {};
        }
      });
    });
    if(raw.activeSessionId){
      const activeSessions = Object.values(raw.sessionLog || {}).flatMap(v=>Array.isArray(v)?v:[]);
      const active = activeSessions.find(session=>session.id===raw.activeSessionId);
      if(active && !active.startedAt && raw.workStart){
        active.startedAt = Math.max(0, Number(raw.workStart) - Number(active.duration || 0)*1000);
      }
    }
    if(!raw.timerState || typeof raw.timerState !== 'object'){
      const mode = raw.breakState ? 'break' : (raw.activeSessionId ? (raw.isWorking ? 'working' : 'paused') : 'idle');
      raw.timerState = {
        mode,
        sessionId: raw.activeSessionId || null,
        runningSince: raw.isWorking ? (raw.workStart || null) : null,
        ownerId: raw.activeTimerOwnerId || null
      };
    }else if(raw.timerState.ownerId === undefined){
      raw.timerState.ownerId = raw.activeTimerOwnerId || null;
    }

    raw.schemaVersion = schemaVersion;
    return raw;
  
    }

    function tryMigrate(raw,sourceLabel='stored state'){
      if(!raw || !validate(raw)) return null;
      try{
        return migrate(raw);
      }catch(error){
        logger.error?.(sourceLabel+' verisi migrate edilemedi:',error);
        return null;
      }
    }

    return Object.freeze({validate,migrate,tryMigrate});
  }

  window.ProductivityStateMigration={create};
})();
