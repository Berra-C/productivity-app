(() => {
  'use strict';

  function planningStats(sessions=[],sessionSeconds=()=>0){
    const plannedSessions=(Array.isArray(sessions)?sessions:[])
      .filter(session=>Number(session?.targetSeconds)>0);

    if(!plannedSessions.length){
      return {
        count:0,
        reached:0,
        completionRate:null,
        planned:0,
        actual:0,
        delta:0,
        avgDelta:0,
        avgOvertime:0,
        overtimeCount:0
      };
    }

    let reached=0;
    let planned=0;
    let actual=0;
    let overtimeTotal=0;
    let overtimeCount=0;

    plannedSessions.forEach(session=>{
      const target=Number(session.targetSeconds)||0;
      const seconds=Math.max(0,Number(sessionSeconds(session))||0);
      planned+=target;
      actual+=seconds;
      if(seconds>=target) reached+=1;
      if(seconds>target){
        overtimeTotal+=seconds-target;
        overtimeCount+=1;
      }
    });

    const delta=actual-planned;

    return {
      count:plannedSessions.length,
      reached,
      completionRate:Math.round(reached/plannedSessions.length*100),
      planned,
      actual,
      delta,
      avgDelta:Math.round(delta/plannedSessions.length),
      avgOvertime:overtimeCount?Math.round(overtimeTotal/overtimeCount):0,
      overtimeCount
    };
  }

  function productiveHourStats(keys=[],entries=[],options={}){
    const keySet=new Set(keys);
    const sessionIntervals=options.sessionIntervals || (()=>[]);
    const sessionSeconds=options.sessionSeconds || (()=>0);
    const dateKey=options.dateKey || (date=>date.toISOString().slice(0,10));
    const buckets=Array.from({length:24},()=>0);

    (Array.isArray(entries)?entries:[]).forEach(({session})=>{
      if(!session) return;
      const intervals=sessionIntervals(session);

      if(!intervals.length && session.startedAt){
        const date=new Date(session.startedAt);
        if(!Number.isNaN(date.getTime())){
          buckets[date.getHours()]+=Math.max(0,Number(sessionSeconds(session))||0);
        }
        return;
      }

      intervals.forEach(interval=>{
        let cursor=Number(interval?.start);
        const intervalEnd=Number(interval?.end);
        if(!Number.isFinite(cursor) || !Number.isFinite(intervalEnd) || intervalEnd<=cursor) return;

        while(cursor<intervalEnd){
          const date=new Date(cursor);
          const key=dateKey(date);
          const nextHour=new Date(date);
          nextHour.setMinutes(60,0,0);
          const end=Math.min(intervalEnd,nextHour.getTime());

          if(keySet.has(key)){
            buckets[date.getHours()]+=Math.max(0,(end-cursor)/1000);
          }

          cursor=end;
        }
      });
    });

    let bestHour=-1;
    let bestSeconds=0;

    buckets.forEach((seconds,hour)=>{
      if(seconds>bestSeconds){
        bestSeconds=seconds;
        bestHour=hour;
      }
    });

    return bestHour>=0
      ? {
          hour:bestHour,
          seconds:Math.round(bestSeconds),
          buckets:buckets.map(Math.round)
        }
      : null;
  }

  function sessionFocusScore(session,options={}){
    const sessionSeconds=options.sessionSeconds || (()=>0);
    const sessionIntervals=options.sessionIntervals || (()=>[]);
    const duration=Math.max(1,Number(sessionSeconds(session))||0);
    const distractions=Math.max(0,Number(session?.distractions||0));
    const intervals=sessionIntervals(session);
    const interruptions=Math.max(0,intervals.length-1);
    const todos=Array.isArray(session?.todos)?session.todos:[];
    const done=todos.filter(todo=>todo?.done).length;

    let score=100;
    score-=Math.min(42,distractions*12);
    score-=Math.min(20,interruptions*5);

    if(Number(session?.targetSeconds)>0){
      const ratio=duration/Number(session.targetSeconds);
      if(ratio>=1) score+=8;
      else if(ratio<0.6) score-=10;
      else if(ratio<0.85) score-=5;
    }

    if(todos.length){
      score+=Math.round((done/todos.length)*10);
    }

    if(duration<10*60) score-=5;

    return Math.max(0,Math.min(100,Math.round(score)));
  }

  function focusScoreStats(entries=[],options={}){
    const sessionSeconds=options.sessionSeconds || (()=>0);
    const sessionIntervals=options.sessionIntervals || (()=>[]);
    const rows=(Array.isArray(entries)?entries:[])
      .map(({session})=>({
        session,
        score:sessionFocusScore(session,{sessionSeconds,sessionIntervals}),
        seconds:Math.max(0,Number(sessionSeconds(session))||0)
      }))
      .filter(row=>row.seconds>0);

    if(!rows.length){
      return {average:null,best:null,worst:null,count:0};
    }

    const weight=rows.reduce((sum,row)=>sum+row.seconds,0)||1;
    const average=Math.round(
      rows.reduce((sum,row)=>sum+row.score*row.seconds,0)/weight
    );
    const sorted=[...rows].sort((a,b)=>b.score-a.score);

    return {
      average,
      best:sorted[0],
      worst:sorted[sorted.length-1],
      count:rows.length
    };
  }

  function normalizePlanText(value){
    return String(value||'')
      .toLocaleLowerCase('tr-TR')
      .replace(/[^a-z0-9çğıöşü]+/gi,' ')
      .trim();
  }

  function timedEventDurationSeconds(event){
    if(!event?.time || !event?.endTime) return 0;

    const [startHour,startMinute]=event.time.split(':').map(Number);
    const [endHour,endMinute]=event.endTime.split(':').map(Number);

    if(
      ![startHour,startMinute,endHour,endMinute].every(Number.isFinite)
    ){
      return 0;
    }

    const minutes=(endHour*60+endMinute)-(startHour*60+startMinute);
    return minutes>0?minutes*60:0;
  }

  function scheduledStudyStats(keys=[],options={}){
    const events=Array.isArray(options.events)?options.events:[];
    const sessionsForDate=typeof options.sessionsForDate==='function'
      ? options.sessionsForDate
      : ()=>[];
    const sessionSeconds=options.sessionSeconds || (()=>0);
    const keySet=new Set(keys);

    let planned=0;
    let actual=0;
    let matchedEvents=0;
    const rows=[];

    events
      .filter(event=>keySet.has(event?.date) && timedEventDurationSeconds(event)>0)
      .forEach(event=>{
        const label=normalizePlanText(event.title);
        if(!label) return;

        const matching=(sessionsForDate(event.date)||[]).filter(session=>{
          const subject=normalizePlanText(
            session?.subject && session.subject!=='Genel'
              ? session.subject
              : session?.name
          );
          return subject && (
            subject===label ||
            subject.includes(label) ||
            label.includes(subject)
          );
        });

        if(!matching.length) return;

        const plannedSeconds=timedEventDurationSeconds(event);
        const actualSeconds=matching.reduce(
          (sum,session)=>sum+Math.max(0,Number(sessionSeconds(session))||0),
          0
        );

        planned+=plannedSeconds;
        actual+=actualSeconds;
        matchedEvents+=1;
        rows.push({
          event,
          planned:plannedSeconds,
          actual:actualSeconds
        });
      });

    const adherence=planned
      ? Math.round(Math.min(actual,planned)/planned*100)
      : null;

    return {
      planned,
      actual,
      delta:actual-planned,
      adherence,
      matchedEvents,
      rows
    };
  }

  function weeklyReviewStats(keys=[],options={}){
    const entries=Array.isArray(options.entries)?options.entries:[];
    const days=options.days || {};
    const tasks=Array.isArray(options.tasks)?options.tasks:[];
    const dateKey=options.dateKey || (date=>date.toISOString().slice(0,10));
    const sessionSeconds=options.sessionSeconds || (()=>0);
    const meetsGoal=typeof options.meetsGoal==='function'
      ? options.meetsGoal
      : ()=>false;

    const dayRows=keys
      .map(key=>({
        key,
        seconds:Number(days[key]?.workSeconds||0)
      }))
      .sort((a,b)=>b.seconds-a.seconds);

    const bestDay=dayRows.find(day=>day.seconds>0) || null;
    const subjectTotals=new Map();
    let longestSession=null;
    let totalSessionSeconds=0;

    entries.forEach(({session})=>{
      if(!session) return;

      const seconds=Math.max(0,Number(sessionSeconds(session))||0);
      totalSessionSeconds+=seconds;

      const subject=session.subject && session.subject!=='Genel'
        ? session.subject
        : 'Genel';

      subjectTotals.set(
        subject,
        (subjectTotals.get(subject)||0)+seconds
      );

      if(!longestSession || seconds>longestSession.seconds){
        longestSession={seconds,subject};
      }
    });

    const topSubject=[...subjectTotals.entries()]
      .sort((a,b)=>b[1]-a[1])[0] || null;

    const goalsMet=keys.filter(key=>meetsGoal(key)).length;

    const tasksCompleted=tasks.filter(task=>{
      if(!task?.doneAt) return false;
      const date=new Date(task.doneAt);
      return !Number.isNaN(date.getTime()) && keys.includes(dateKey(date));
    }).length;

    return {
      bestDay,
      topSubject,
      longestSession,
      productiveHour:options.productiveHour || null,
      focus:options.focus || {average:null,best:null,worst:null,count:0},
      scheduledStudy:options.scheduledStudy || {
        planned:0,actual:0,delta:0,adherence:null,matchedEvents:0,rows:[]
      },
      goalsMet,
      tasksCompleted,
      sessionCount:entries.length,
      avgSession:entries.length
        ? Math.round(totalSessionSeconds/entries.length)
        : 0
    };
  }

  window.ProductivityAnalyticsCore={
    planningStats,
    productiveHourStats,
    sessionFocusScore,
    focusScoreStats,
    normalizePlanText,
    timedEventDurationSeconds,
    scheduledStudyStats,
    weeklyReviewStats
  };
})();
