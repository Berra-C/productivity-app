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


  function sessionAnalytics(entries=[],sessionSeconds=()=>0){
    const hourly=Array.from({length:24},()=>({seconds:0,sessions:0}));
    let totalSeconds=0;
    let longest=null;
    let timedSessions=0;
    const activeDays=new Set();

    (Array.isArray(entries)?entries:[]).forEach(({key,session})=>{
      if(!session) return;
      const seconds=Math.max(0,Number(sessionSeconds(session,key))||0);
      totalSeconds+=seconds;

      if(seconds>0) activeDays.add(key);

      const subject=session.subject && session.subject!=='Genel'
        ? session.subject
        : 'Genel';

      if(!longest || seconds>longest.seconds){
        longest={seconds,subject};
      }

      if(session.startedAt){
        const started=new Date(session.startedAt);
        if(!Number.isNaN(started.getTime())){
          const hour=started.getHours();
          hourly[hour].seconds+=seconds;
          hourly[hour].sessions+=1;
          timedSessions+=1;
        }
      }
    });

    let bestHour=-1;
    let bestSeconds=0;

    hourly.forEach((bucket,hour)=>{
      if(bucket.seconds>bestSeconds){
        bestSeconds=bucket.seconds;
        bestHour=hour;
      }
    });

    return {
      sessionCount:Array.isArray(entries)?entries.length:0,
      totalSeconds,
      avgSeconds:entries.length?Math.round(totalSeconds/entries.length):0,
      longest,
      activeDays:activeDays.size,
      hourly,
      bestHour,
      bestSeconds,
      timedSessions
    };
  }

  function subjectBreakdown(entries=[],sessionSeconds=()=>0){
    const rows=new Map();

    (Array.isArray(entries)?entries:[]).forEach(({key,session})=>{
      if(!session) return;

      const subject=session.subject && session.subject!=='Genel'
        ? session.subject
        : 'Genel';

      const current=rows.get(subject) || {
        seconds:0,
        sessions:0,
        distractions:0,
        targetSessions:0,
        reachedTargets:0
      };

      const seconds=Math.max(0,Number(sessionSeconds(session,key))||0);

      current.seconds+=seconds;
      current.sessions+=1;
      current.distractions+=Number(session.distractions||0);

      if(session.targetSeconds){
        current.targetSessions+=1;
        if(seconds>=Number(session.targetSeconds)){
          current.reachedTargets+=1;
        }
      }

      rows.set(subject,current);
    });

    return [...rows.entries()].sort(
      (a,b)=>b[1].seconds-a[1].seconds
    );
  }

  function subjectChartData(slots=[],options={}){
    const sessionsForKey=typeof options.sessionsForKey==='function'
      ? options.sessionsForKey
      : ()=>[];
    const sessionSeconds=typeof options.sessionSeconds==='function'
      ? options.sessionSeconds
      : session=>Number(session?.duration)||0;
    const maxSubjects=Math.max(1,Number(options.maxSubjects)||6);

    const perSlot=(Array.isArray(slots)?slots:[]).map(slot=>{
      const totals={};

      (slot.keys||[]).forEach(key=>{
        (sessionsForKey(key)||[]).forEach(session=>{
          const duration=Math.max(0,Number(sessionSeconds(session,key))||0);
          if(duration<=0) return;

          const subject=session.subject || 'Genel';
          totals[subject]=(totals[subject]||0)+Math.round(duration/60);
        });
      });

      return totals;
    });

    const grandTotals={};

    perSlot.forEach(totals=>{
      Object.entries(totals).forEach(([subject,value])=>{
        grandTotals[subject]=(grandTotals[subject]||0)+value;
      });
    });

    let subjects=Object.entries(grandTotals)
      .sort((a,b)=>b[1]-a[1])
      .map(entry=>entry[0]);

    if(subjects.length>maxSubjects){
      const others=subjects.slice(maxSubjects);
      subjects=subjects.slice(0,maxSubjects);

      perSlot.forEach(totals=>{
        let sum=0;

        others.forEach(subject=>{
          if(totals[subject]){
            sum+=totals[subject];
            delete totals[subject];
          }
        });

        if(sum>0){
          totals['Diğer']=(totals['Diğer']||0)+sum;
        }
      });

      subjects.push('Diğer');
    }

    return {
      labels:slots.map(slot=>slot.label),
      subjects,
      perSlot
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
    weeklyReviewStats,
    sessionAnalytics,
    subjectBreakdown,
    subjectChartData
  };
})();
