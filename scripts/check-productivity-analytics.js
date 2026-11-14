const path=require('path');

global.window=global;
require(path.resolve(__dirname,'../assets/js/modules/analytics/productivity-analytics.js'));
require(path.resolve(__dirname,'../assets/js/modules/analytics/insight-engine.js'));

const Analytics=global.ProductivityLearningAnalytics;
const Insights=global.ProductivityInsightEngine;

function assert(condition,message){
  if(!condition) throw new Error(message);
}

function localMs(year,month,day,hour,minute=0){
  return new Date(year,month-1,day,hour,minute,0,0).getTime();
}

function key(date){
  const pad=value=>String(value).padStart(2,'0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
}

const sessionSeconds=session=>Number(session.duration)||0;
const sessionIntervals=session=>session.workIntervals||[];

// Exact hour splitting + focus-weighted ratings.
{
  const a={
    id:'a',duration:80*60,productivityRating:5,
    startedAt:localMs(2026,11,10,17,40),
    workIntervals:[{
      start:localMs(2026,11,10,17,40),
      end:localMs(2026,11,10,19,0)
    }],
    distractionTrackingVersion:1,
    distractionTrackingStartedAt:localMs(2026,11,10,17,40),
    distractionEvents:[{at:localMs(2026,11,10,18,20),category:'Telefon'}],
    targetSeconds:80*60
  };
  const b={
    id:'b',duration:10*60,productivityRating:2,
    startedAt:localMs(2026,11,11,18,0),
    workIntervals:[{
      start:localMs(2026,11,11,18,0),
      end:localMs(2026,11,11,18,10)
    }],
    distractionTrackingVersion:1,
    distractionTrackingStartedAt:localMs(2026,11,11,18,0),
    distractionEvents:[],
    targetSeconds:20*60
  };
  const hours=Analytics.hourlyProfile(
    [{key:'2026-11-10',session:a},{key:'2026-11-11',session:b}],
    {
      keys:['2026-11-10','2026-11-11'],
      sessionSeconds,
      sessionIntervals,
      dateKey:key
    }
  );
  assert(hours[17].focusSeconds===20*60,'17:00 overlap must be 20 min');
  assert(hours[18].focusSeconds===70*60,'18:00 overlap must be 70 min');
  assert(hours[18].ratedSessionCount===2,'18:00 must contain two rated sessions');
  assert(Math.abs(hours[18].avgProductivityRating-((5*60+2*10)/70))<0.001,'hour rating must be focus weighted');
  assert(hours[18].timedDistractions===1,'timed distraction must land in exact hour');
  assert(Math.abs(hours[18].distractionsPerHour-(1/(70/60)))<0.001,'hour distraction rate must use tracked focus hours');
  assert(hours[17].targetSessions===1,'target is attributed to session start hour');
}

// Legacy sessions must never imply zero hourly distractions.
{
  const legacy={
    id:'legacy',duration:60*60,productivityRating:4,
    startedAt:localMs(2026,11,10,12,0),
    workIntervals:[{start:localMs(2026,11,10,12,0),end:localMs(2026,11,10,13,0)}],
    distractions:5,
    distractionTrackingVersion:0,
    distractionEvents:[]
  };
  const hour=Analytics.hourlyProfile(
    [{key:'2026-11-10',session:legacy}],
    {keys:['2026-11-10'],sessionSeconds,sessionIntervals,dateKey:key}
  )[12];
  assert(hour.focusSeconds===3600,'legacy focus still counts');
  assert(hour.distractionsPerHour===null,'legacy hourly distraction rate must remain unknown');
}

// Tracking that begins mid-session only uses focus after tracking start.
{
  const start=localMs(2026,11,10,14,0);
  const trackedAt=localMs(2026,11,10,14,30);
  const session={
    id:'partial',duration:60*60,startedAt:start,
    workIntervals:[{start,end:localMs(2026,11,10,15,0)}],
    distractionTrackingVersion:1,
    distractionTrackingStartedAt:trackedAt,
    distractionEvents:[{at:localMs(2026,11,10,14,45)}]
  };
  const hour=Analytics.hourlyProfile(
    [{key:'2026-11-10',session}],
    {keys:['2026-11-10'],sessionSeconds,sessionIntervals,dateKey:key}
  )[14];
  assert(hour.distractionTrackedSeconds===1800,'partial tracking denominator');
  assert(Math.abs(hour.distractionsPerHour-2)<0.001,'partial tracking rate');
}

// Hour confidence thresholds.
{
  assert(Analytics.hourConfidence({focusSeconds:20*60,sessionCount:1,uniqueDays:1}).level===0,'hour level 0');
  assert(Analytics.hourConfidence({focusSeconds:45*60,sessionCount:1,uniqueDays:1}).level===1,'hour level 1');
  assert(Analytics.hourConfidence({focusSeconds:100*60,sessionCount:3,uniqueDays:2}).level===2,'hour level 2');
  assert(Analytics.hourConfidence({focusSeconds:250*60,sessionCount:6,uniqueDays:4}).level===3,'hour level 3');
}

// Subject and duration datasets.
{
  const entries=[];
  for(let i=0;i<6;i++){
    const start=localMs(2026,11,1+i,17,0);
    entries.push({
      key:key(new Date(start)),
      session:{
        id:'math'+i,subject:'Matematik',duration:50*60,
        startedAt:start,endedAt:start+50*60*1000,
        workIntervals:[{start,end:start+50*60*1000}],
        productivityRating:i<5?4:null,
        distractions:1,targetSeconds:60*60,
        distractionTrackingVersion:0,distractionEvents:[]
      }
    });
  }
  const options={sessionSeconds,sessionIntervals,dateKey:key,keys:entries.map(x=>x.key)};
  const subjects=Analytics.subjectProfiles(entries,options);
  assert(subjects[0].subject==='Matematik','subject profile name');
  assert(subjects[0].sessions===6 && subjects[0].activeDays===6,'subject evidence counts');
  assert(subjects[0].insightEligible===true,'subject threshold');
  const buckets=Analytics.durationBuckets(entries,options);
  const bucket=buckets.find(item=>item.id==='45-59');
  assert(bucket.sessionCount===6 && bucket.insightEligible===true,'duration bucket threshold');
}

// Insight engine: best-hour recommendation requires evidence and meaningful lift.
{
  const hours=Array.from({length:24},(_,hour)=>({
    hour,focusSeconds:0,sessionCount:0,uniqueDays:0,ratedSessionCount:0,
    ratedFocusSeconds:0,avgProductivityRating:null,distractionsPerHour:null,
    distractionTrackedSeconds:0,targetSessions:0,avgTargetCompletion:null,
    confidence:{level:0,usable:false,strong:false,label:'Az veri'}
  }));
  hours[18]={
    ...hours[18],focusSeconds:5*3600,sessionCount:7,uniqueDays:5,
    ratedSessionCount:7,ratedFocusSeconds:5*3600,avgProductivityRating:4.6,
    distractionsPerHour:0.3,distractionTrackedSeconds:5*3600,
    targetSessions:5,avgTargetCompletion:0.92,
    confidence:{level:3,usable:true,strong:true,label:'Yüksek'}
  };
  const insight=Insights.bestHourInsight(hours,{
    avgProductivityRating:4.0,
    distractionsPerHour:0.8,
    avgTargetCompletion:0.78
  });
  assert(insight?.type==='best-hour','best-hour insight generated');
  assert(insight.confidence.level===3,'best-hour confidence');
}

// No evidence -> transparent learning state, not a fabricated recommendation.
{
  const result=Insights.generate({
    summary:{focusSeconds:20*60,ratedSessions:0,avgProductivityRating:null},
    hours:[],subjects:[],durationBuckets:[],previousSummary:{}
  });
  assert(result.length===1 && result[0].type==='learning','insufficient data insight');
}

console.log('productivity analytics checks passed');
