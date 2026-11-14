(() => {
  'use strict';

  const HOUR_THRESHOLDS=Object.freeze({
    visibleFocusSeconds:30*60,
    usableFocusSeconds:90*60,
    strongFocusSeconds:240*60,
    usableSessions:3,
    strongSessions:6,
    usableDays:2,
    strongDays:4,
    ratedSessions:3
  });

  const DURATION_BUCKETS=Object.freeze([
    {id:'5-24',label:'5–24 dk',min:5*60,max:25*60},
    {id:'25-44',label:'25–44 dk',min:25*60,max:45*60},
    {id:'45-59',label:'45–59 dk',min:45*60,max:60*60},
    {id:'60-89',label:'60–89 dk',min:60*60,max:90*60},
    {id:'90+',label:'90+ dk',min:90*60,max:Infinity}
  ]);

  function finite(value,fallback=0){
    const number=Number(value);
    return Number.isFinite(number)?number:fallback;
  }

  function normalizeRating(value){
    const rating=Number(value);
    return Number.isInteger(rating) && rating>=1 && rating<=5
      ? rating
      : null;
  }

  function normalizedEntry(entry){
    return entry?.session
      ? {key:entry.key||null,session:entry.session}
      : {key:null,session:entry};
  }

  function sessionDuration(session,options={}){
    const fn=options.sessionSeconds;
    return Math.max(
      0,
      finite(
        typeof fn==='function'
          ? fn(session)
          : session?.duration,
        0
      )
    );
  }

  function targetCompletion(session,seconds){
    const target=finite(session?.targetSeconds,0);
    if(target<=0) return null;
    return Math.max(0,Math.min(1,seconds/target));
  }

  function localDateKey(ms){
    const date=new Date(ms);
    if(Number.isNaN(date.getTime())) return null;
    const pad=value=>String(value).padStart(2,'0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
  }

  function dateKeyFor(ms,options={}){
    const fn=options.dateKey;
    const date=new Date(ms);
    if(Number.isNaN(date.getTime())) return null;
    return typeof fn==='function' ? fn(date) : localDateKey(ms);
  }

  function intervalsFor(session,options={}){
    const now=finite(options.now,Date.now());
    const raw=typeof options.sessionIntervals==='function'
      ? options.sessionIntervals(session)
      : session?.workIntervals;

    const intervals=(Array.isArray(raw)?raw:[])
      .map(interval=>({
        start:finite(interval?.start,NaN),
        end:interval?.end==null
          ? (options.includeOpen===false?NaN:now)
          : finite(interval.end,NaN)
      }))
      .filter(interval=>
        Number.isFinite(interval.start) &&
        Number.isFinite(interval.end) &&
        interval.end>interval.start
      );

    if(intervals.length) return intervals;

    const start=finite(session?.startedAt,NaN);
    const seconds=sessionDuration(session,options);
    if(Number.isFinite(start) && seconds>0){
      return [{start,end:start+seconds*1000,approximate:true}];
    }

    return [];
  }

  function splitByHour(start,end,callback){
    let cursor=Number(start);
    const stop=Number(end);
    if(!Number.isFinite(cursor) || !Number.isFinite(stop) || stop<=cursor) return;

    while(cursor<stop){
      const date=new Date(cursor);
      const nextHour=new Date(date);
      nextHour.setMinutes(60,0,0);
      let next=nextHour.getTime();
      if(!Number.isFinite(next) || next<=cursor) next=cursor+60*60*1000;
      const segmentEnd=Math.min(stop,next);
      callback({
        hour:date.getHours(),
        start:cursor,
        end:segmentEnd,
        seconds:(segmentEnd-cursor)/1000,
        date
      });
      cursor=segmentEnd;
    }
  }

  function emptyHour(hour){
    return {
      hour,
      focusSeconds:0,
      sessions:new Set(),
      days:new Set(),
      ratedSessions:new Set(),
      ratedFocusSeconds:0,
      ratingWeightedSeconds:0,
      timedDistractions:0,
      distractionTrackedSeconds:0,
      targetSessions:0,
      targetCompletionTotal:0
    };
  }

  function hourConfidence(bucket){
    const focus=finite(bucket?.focusSeconds,0);
    const sessions=finite(bucket?.sessionCount,bucket?.sessions?.size||0);
    const days=finite(bucket?.uniqueDays,bucket?.days?.size||0);

    if(
      sessions>=HOUR_THRESHOLDS.strongSessions &&
      focus>=HOUR_THRESHOLDS.strongFocusSeconds &&
      days>=HOUR_THRESHOLDS.strongDays
    ) return {level:3,label:'Yüksek',usable:true,strong:true};

    if(
      sessions>=HOUR_THRESHOLDS.usableSessions &&
      focus>=HOUR_THRESHOLDS.usableFocusSeconds &&
      days>=HOUR_THRESHOLDS.usableDays
    ) return {level:2,label:'Kullanılabilir',usable:true,strong:false};

    if(focus>=HOUR_THRESHOLDS.visibleFocusSeconds){
      return {level:1,label:'Öğreniliyor',usable:false,strong:false};
    }

    return {level:0,label:'Az veri',usable:false,strong:false};
  }

  function hourlyProfile(entries=[],options={}){
    const keys=Array.isArray(options.keys)?new Set(options.keys):null;
    const buckets=Array.from({length:24},(_,hour)=>emptyHour(hour));

    (Array.isArray(entries)?entries:[]).forEach(rawEntry=>{
      const {session}=normalizedEntry(rawEntry);
      if(!session) return;

      const sessionId=String(session.id||'');
      const rating=normalizeRating(session.productivityRating);
      const tracked=Number(session.distractionTrackingVersion)>=1;
      const trackingStartedAt=tracked
        ? finite(session.distractionTrackingStartedAt,finite(session.startedAt,NaN))
        : NaN;
      const seconds=sessionDuration(session,options);
      const completion=targetCompletion(session,seconds);
      const intervals=intervalsFor(session,options);

      intervals.forEach(interval=>{
        splitByHour(interval.start,interval.end,segment=>{
          const key=dateKeyFor(segment.start,options);
          if(keys && !keys.has(key)) return;

          const bucket=buckets[segment.hour];
          bucket.focusSeconds+=segment.seconds;
          if(sessionId) bucket.sessions.add(sessionId);
          if(key) bucket.days.add(key);

          if(rating!==null){
            if(sessionId) bucket.ratedSessions.add(sessionId);
            bucket.ratedFocusSeconds+=segment.seconds;
            bucket.ratingWeightedSeconds+=rating*segment.seconds;
          }

          if(tracked && Number.isFinite(trackingStartedAt)){
            const trackedStart=Math.max(segment.start,trackingStartedAt);
            if(segment.end>trackedStart){
              bucket.distractionTrackedSeconds+=(segment.end-trackedStart)/1000;
            }
          }
        });
      });

      const startedAt=finite(session.startedAt,NaN);
      if(
        Number.isFinite(startedAt) &&
        completion!==null
      ){
        const key=dateKeyFor(startedAt,options);
        if(!keys || keys.has(key)){
          const bucket=buckets[new Date(startedAt).getHours()];
          bucket.targetSessions+=1;
          bucket.targetCompletionTotal+=completion;
        }
      }

      if(tracked){
        (Array.isArray(session.distractionEvents)?session.distractionEvents:[])
          .forEach(event=>{
            const at=finite(event?.at,NaN);
            if(!Number.isFinite(at)) return;
            const key=dateKeyFor(at,options);
            if(keys && !keys.has(key)) return;
            buckets[new Date(at).getHours()].timedDistractions+=1;
          });
      }
    });

    return buckets.map(bucket=>{
      const sessionCount=bucket.sessions.size;
      const uniqueDays=bucket.days.size;
      const ratedSessionCount=bucket.ratedSessions.size;
      const avgProductivityRating=bucket.ratedFocusSeconds>0
        ? bucket.ratingWeightedSeconds/bucket.ratedFocusSeconds
        : null;
      const distractionsPerHour=bucket.distractionTrackedSeconds>0
        ? bucket.timedDistractions/(bucket.distractionTrackedSeconds/3600)
        : null;
      const avgTargetCompletion=bucket.targetSessions>0
        ? bucket.targetCompletionTotal/bucket.targetSessions
        : null;

      const row={
        hour:bucket.hour,
        focusSeconds:Math.round(bucket.focusSeconds),
        sessionCount,
        uniqueDays,
        ratedSessionCount,
        ratedFocusSeconds:Math.round(bucket.ratedFocusSeconds),
        avgProductivityRating,
        timedDistractions:bucket.timedDistractions,
        distractionTrackedSeconds:Math.round(bucket.distractionTrackedSeconds),
        distractionsPerHour,
        targetSessions:bucket.targetSessions,
        avgTargetCompletion
      };

      row.confidence=hourConfidence(row);
      return row;
    });
  }

  function periodSummary(entries=[],options={}){
    let focusSeconds=0;
    let distractions=0;
    let ratingWeightedSeconds=0;
    let ratedFocusSeconds=0;
    let ratedSessions=0;
    let targetSessions=0;
    let targetCompletionTotal=0;
    let sessions=0;
    let timedDistractions=0;
    let distractionTrackedSeconds=0;

    (Array.isArray(entries)?entries:[]).forEach(rawEntry=>{
      const {session}=normalizedEntry(rawEntry);
      if(!session) return;
      const seconds=sessionDuration(session,options);
      if(seconds<=0) return;

      sessions+=1;
      focusSeconds+=seconds;
      distractions+=Math.max(0,finite(session.distractions,0));

      if(Number(session.distractionTrackingVersion)>=1){
        const trackingStart=finite(
          session.distractionTrackingStartedAt,
          finite(session.startedAt,NaN)
        );
        if(Number.isFinite(trackingStart)){
          intervalsFor(session,options).forEach(interval=>{
            const start=Math.max(interval.start,trackingStart);
            if(interval.end>start){
              distractionTrackedSeconds+=(interval.end-start)/1000;
            }
          });
          timedDistractions+=(Array.isArray(session.distractionEvents)?session.distractionEvents:[])
            .filter(event=>Number.isFinite(Number(event?.at)) && Number(event.at)>=trackingStart)
            .length;
        }
      }

      const rating=normalizeRating(session.productivityRating);
      if(rating!==null){
        ratedSessions+=1;
        ratedFocusSeconds+=seconds;
        ratingWeightedSeconds+=rating*seconds;
      }

      const completion=targetCompletion(session,seconds);
      if(completion!==null){
        targetSessions+=1;
        targetCompletionTotal+=completion;
      }
    });

    return {
      focusSeconds:Math.round(focusSeconds),
      sessions,
      distractions,
      distractionsPerHour:focusSeconds>0
        ? distractions/(focusSeconds/3600)
        : null,
      timedDistractions,
      distractionTrackedSeconds:Math.round(distractionTrackedSeconds),
      timedDistractionsPerHour:distractionTrackedSeconds>0
        ? timedDistractions/(distractionTrackedSeconds/3600)
        : null,
      ratedSessions,
      ratedFocusSeconds:Math.round(ratedFocusSeconds),
      avgProductivityRating:ratedFocusSeconds>0
        ? ratingWeightedSeconds/ratedFocusSeconds
        : null,
      targetSessions,
      avgTargetCompletion:targetSessions
        ? targetCompletionTotal/targetSessions
        : null
    };
  }

  function bestRatedHour(entries,options={}){
    const hours=hourlyProfile(entries,options)
      .filter(hour=>
        hour.confidence.usable &&
        hour.ratedSessionCount>=HOUR_THRESHOLDS.ratedSessions &&
        hour.avgProductivityRating!==null
      )
      .sort((a,b)=>
        b.avgProductivityRating-a.avgProductivityRating ||
        b.ratedFocusSeconds-a.ratedFocusSeconds
      );
    return hours[0] || null;
  }

  function subjectProfiles(entries=[],options={}){
    const bySubject=new Map();

    (Array.isArray(entries)?entries:[]).forEach(rawEntry=>{
      const normalized=normalizedEntry(rawEntry);
      const session=normalized.session;
      if(!session) return;
      const subject=String(session.subject||'Genel').trim() || 'Genel';
      if(!bySubject.has(subject)) bySubject.set(subject,[]);
      bySubject.get(subject).push(normalized);
    });

    return [...bySubject.entries()].map(([subject,subjectEntries])=>{
      const summary=periodSummary(subjectEntries,options);
      const days=new Set(
        subjectEntries
          .map(entry=>entry.key || dateKeyFor(entry.session?.startedAt,options))
          .filter(Boolean)
      );
      const bestHour=bestRatedHour(subjectEntries,{
        ...options,
        keys:options.keys
      });

      return {
        subject,
        ...summary,
        activeDays:days.size,
        bestHour:bestHour?.hour ?? null,
        bestHourRating:bestHour?.avgProductivityRating ?? null,
        insightEligible:
          summary.sessions>=5 &&
          summary.focusSeconds>=180*60 &&
          days.size>=3,
        ratingEligible:summary.ratedSessions>=4
      };
    }).sort((a,b)=>b.focusSeconds-a.focusSeconds || a.subject.localeCompare(b.subject,'tr'));
  }

  function durationBucketFor(seconds){
    return DURATION_BUCKETS.find(bucket=>seconds>=bucket.min && seconds<bucket.max) || null;
  }

  function durationBuckets(entries=[],options={}){
    const buckets=DURATION_BUCKETS.map(bucket=>({
      ...bucket,
      sessionCount:0,
      ratedSessionCount:0,
      ratingTotal:0,
      distractions:0,
      focusSeconds:0,
      targetSessions:0,
      targetCompletionTotal:0,
      days:new Set()
    }));

    (Array.isArray(entries)?entries:[]).forEach(rawEntry=>{
      const {session,key}=normalizedEntry(rawEntry);
      if(!session) return;
      const seconds=sessionDuration(session,options);
      const definition=durationBucketFor(seconds);
      if(!definition) return;
      const bucket=buckets.find(item=>item.id===definition.id);
      bucket.sessionCount+=1;
      bucket.focusSeconds+=seconds;
      bucket.distractions+=Math.max(0,finite(session.distractions,0));
      const day=key || dateKeyFor(session.startedAt,options);
      if(day) bucket.days.add(day);

      const rating=normalizeRating(session.productivityRating);
      if(rating!==null){
        bucket.ratedSessionCount+=1;
        bucket.ratingTotal+=rating;
      }

      const completion=targetCompletion(session,seconds);
      if(completion!==null){
        bucket.targetSessions+=1;
        bucket.targetCompletionTotal+=completion;
      }
    });

    return buckets.map(bucket=>({
      id:bucket.id,
      label:bucket.label,
      sessionCount:bucket.sessionCount,
      ratedSessionCount:bucket.ratedSessionCount,
      activeDays:bucket.days.size,
      focusSeconds:Math.round(bucket.focusSeconds),
      avgProductivityRating:bucket.ratedSessionCount
        ? bucket.ratingTotal/bucket.ratedSessionCount
        : null,
      distractions:bucket.distractions,
      distractionsPerHour:bucket.focusSeconds>0
        ? bucket.distractions/(bucket.focusSeconds/3600)
        : null,
      targetSessions:bucket.targetSessions,
      avgTargetCompletion:bucket.targetSessions
        ? bucket.targetCompletionTotal/bucket.targetSessions
        : null,
      insightEligible:
        bucket.sessionCount>=5 &&
        bucket.days.size>=3
    }));
  }

  window.ProductivityLearningAnalytics={
    HOUR_THRESHOLDS,
    DURATION_BUCKETS,
    normalizeRating,
    intervalsFor,
    splitByHour,
    hourConfidence,
    hourlyProfile,
    periodSummary,
    subjectProfiles,
    durationBuckets
  };
})();
