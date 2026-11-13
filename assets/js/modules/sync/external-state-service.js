(() => {
  'use strict';

  function clone(value){
    return value==null ? value : JSON.parse(JSON.stringify(value));
  }

  function captureDeviceLocalTimerState(state,options={}){
    const tabId=options.tabId;
    const findSession=options.findSession || (()=>null);
    const isBreakActive=options.isBreakActive || (()=>false);

    const ownsTimer=!state?.activeTimerOwnerId || state.activeTimerOwnerId===tabId;
    const active=state?.activeSessionId ? findSession(state.activeSessionId) : null;

    if(!ownsTimer || (!state?.isWorking && !active && !isBreakActive())){
      return null;
    }

    return {
      activeSessionId:state.activeSessionId || null,
      activeSessionDate:state.activeSessionDate || null,
      isWorking:Boolean(state.isWorking),
      workStart:state.workStart || null,
      activeTimerOwnerId:state.activeTimerOwnerId || (state.isWorking?tabId:null),
      timerState:clone(state.timerState),
      breakState:clone(state.breakState),
      activeSession:clone(active)
    };
  }

  function restoreDeviceLocalTimerState(incoming,snapshot,options={}){
    if(!snapshot) return incoming;

    const findSessionDateKey=options.findSessionDateKey || (()=>null);
    const todayKey=options.todayKey || (()=>null);

    if(snapshot.activeSession && snapshot.activeSessionId){
      const key=snapshot.activeSessionDate
        || findSessionDateKey(snapshot.activeSessionId)
        || todayKey();

      if(!incoming.sessionLog || typeof incoming.sessionLog!=='object'){
        incoming.sessionLog={};
      }
      if(!Array.isArray(incoming.sessionLog[key])) incoming.sessionLog[key]=[];

      const sessions=incoming.sessionLog[key];
      const index=sessions.findIndex(s=>s?.id===snapshot.activeSessionId);
      if(index>=0) sessions[index]=clone(snapshot.activeSession);
      else sessions.push(clone(snapshot.activeSession));
    }

    incoming.activeSessionId=snapshot.activeSessionId;
    incoming.activeSessionDate=snapshot.activeSessionDate;
    incoming.isWorking=snapshot.isWorking;
    incoming.workStart=snapshot.workStart;
    incoming.activeTimerOwnerId=snapshot.activeTimerOwnerId;
    incoming.breakState=clone(snapshot.breakState);
    incoming.timerState=clone(snapshot.timerState) || {
      mode:snapshot.isWorking
        ? 'working'
        : (snapshot.breakState
          ? 'break'
          : (snapshot.activeSessionId?'paused':'idle')),
      sessionId:snapshot.activeSessionId,
      runningSince:snapshot.workStart,
      ownerId:snapshot.activeTimerOwnerId
    };

    return incoming;
  }

  window.ProductivityExternalStateService={
    captureDeviceLocalTimerState,
    restoreDeviceLocalTimerState
  };
})();
