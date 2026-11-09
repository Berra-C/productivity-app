(() => {
  'use strict';

  const MODES=Object.freeze({
    IDLE:'idle',
    WORKING:'working',
    PAUSED:'paused',
    BREAK:'break'
  });

  const TRANSITIONS=Object.freeze({
    idle:new Set(['idle','working','break']),
    working:new Set(['working','paused','idle']),
    paused:new Set(['paused','working','idle']),
    break:new Set(['break','idle','working'])
  });

  function canTransition(from,to){
    return Boolean(TRANSITIONS[from]?.has(to));
  }

  function closedIntervalSeconds(intervals){
    let seconds=0;
    (Array.isArray(intervals)?intervals:[]).forEach(interval=>{
      const start=Number(interval?.start);
      const end=interval?.end==null ? null : Number(interval.end);
      if(!Number.isFinite(start) || !Number.isFinite(end) || end<=start) return;
      seconds += Math.max(0,Math.floor((end-start)/1000));
    });
    return Math.max(0,Math.round(seconds));
  }

  function nextLocalMidnightMs(ms){
    const d=new Date(Number(ms)||Date.now());
    d.setHours(24,0,0,0);
    return d.getTime();
  }

  function splitRangeAtLocalMidnights(startMs,endMs){
    const start=Number(startMs);
    const end=Number(endMs);
    if(!Number.isFinite(start) || !Number.isFinite(end) || end<=start) return [];

    const out=[];
    let cursor=start;
    while(cursor<end){
      const boundary=nextLocalMidnightMs(cursor);
      const partEnd=Math.min(boundary,end);
      out.push({start:cursor,end:partEnd});
      cursor=partEnd;
    }
    return out;
  }

  function inferMode(state){
    if(state?.breakState) return MODES.BREAK;
    if(state?.activeSessionId) return state?.isWorking ? MODES.WORKING : MODES.PAUSED;
    return MODES.IDLE;
  }

  function validateState(state){
    const mode=inferMode(state);
    if(mode===MODES.WORKING){
      return Boolean(state?.activeSessionId && Number.isFinite(Number(state?.workStart)));
    }
    if(mode===MODES.PAUSED){
      return Boolean(state?.activeSessionId && !state?.workStart);
    }
    if(mode===MODES.BREAK){
      return Boolean(state?.breakState);
    }
    return !state?.activeSessionId && !state?.isWorking;
  }

  window.ProductivityTimerCore={
    MODES,
    TRANSITIONS,
    canTransition,
    closedIntervalSeconds,
    nextLocalMidnightMs,
    splitRangeAtLocalMidnights,
    inferMode,
    validateState
  };
})();
