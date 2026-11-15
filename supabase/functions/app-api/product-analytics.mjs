const DAY_MS=86400000;

const TELEMETRY_EVENTS=new Set([
  'app_opened','task_created','task_completed','task_focus_started',
  'focus_started','focus_paused','focus_resumed','focus_completed',
  'session_rated','distraction_logged','analytics_opened',
  'heatmap_metric_changed','insight_seen',
  'sync_success','sync_failed','sync_conflict','destructive_sync_blocked',
  'runtime_error','recovery_restored'
]);
const REPEATS=new Set(['none','daily','weekly','monthly']);
const TARGET_BUCKETS=new Set(['none','1-24','25-44','45-59','60-89','90+']);
const DURATION_BUCKETS=new Set(['0-4','5-24','25-44','45-59','60-89','90+']);
const DISTRACTION_BUCKETS=new Set(['0','1','2','3+']);
const HEATMAP_METRICS=new Set(['rating','focus','distraction','target']);
const INSIGHT_TYPES=new Set(['best-hour','session-length','subject','rating-trend','distraction-trend','learning']);
const CONFIDENCE=new Set(['Az veri','Erken bulgu','Orta','Yüksek']);
const SYNC_ACTIONS=new Set(['noop','push-local-empty-remote','initial-merge-push','initial-adopt-remote','remote-newer-merge-push','remote-newer-adopt','push-dirty-local','conflict-merge-push']);
const ERROR_KINDS=new Set(['error','unhandledrejection']);

function telemetryBool(value){ return value===true; }
function telemetryEnum(value,allowed,fallback=null){ const clean=String(value??''); return allowed.has(clean)?clean:fallback; }
function telemetryNumber(value,min,max,fallback=null){ const n=Number(value); return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback; }

export function sanitizeTelemetryProperties(eventName,input={}){
  const p=input && typeof input==='object' && !Array.isArray(input)?input:{};
  switch(eventName){
    case 'task_created': return {hasDueDate:telemetryBool(p.hasDueDate),hasTime:telemetryBool(p.hasTime),hasTag:telemetryBool(p.hasTag),repeat:telemetryEnum(p.repeat,REPEATS,'none')};
    case 'task_completed': return {linkedFocus:telemetryBool(p.linkedFocus)};
    case 'task_focus_started': return {hasTag:telemetryBool(p.hasTag),targetBucket:telemetryEnum(p.targetBucket,TARGET_BUCKETS,'none')};
    case 'focus_started': return {linkedTask:telemetryBool(p.linkedTask),hasTarget:telemetryBool(p.hasTarget),targetBucket:telemetryEnum(p.targetBucket,TARGET_BUCKETS,'none')};
    case 'focus_paused': case 'focus_resumed': case 'analytics_opened': case 'recovery_restored': return {};
    case 'focus_completed': return {durationBucket:telemetryEnum(p.durationBucket,DURATION_BUCKETS,'0-4'),linkedTask:telemetryBool(p.linkedTask),ratingEligible:telemetryBool(p.ratingEligible),rated:telemetryBool(p.rated),distractionBucket:telemetryEnum(p.distractionBucket,DISTRACTION_BUCKETS,'0'),targetReached:p.targetReached===null?null:telemetryBool(p.targetReached)};
    case 'session_rated': return {rating:telemetryNumber(p.rating,1,5,null),editing:telemetryBool(p.editing),durationBucket:telemetryEnum(p.durationBucket,DURATION_BUCKETS,'0-4'),linkedTask:telemetryBool(p.linkedTask)};
    case 'distraction_logged': return {duringFocus:telemetryBool(p.duringFocus),hasCategory:telemetryBool(p.hasCategory)};
    case 'heatmap_metric_changed': return {metric:telemetryEnum(p.metric,HEATMAP_METRICS,'rating')};
    case 'insight_seen': return {type:telemetryEnum(p.type,INSIGHT_TYPES,'learning'),confidence:telemetryEnum(p.confidence,CONFIDENCE,'Az veri')};
    case 'sync_success': return {initial:telemetryBool(p.initial),action:telemetryEnum(p.action,SYNC_ACTIONS,'noop')};
    case 'sync_failed': return {status:telemetryNumber(p.status,0,599,0)};
    case 'sync_conflict': return {resolved:telemetryBool(p.resolved)};
    case 'destructive_sync_blocked': return {conflict:telemetryBool(p.conflict)};
    case 'runtime_error': return {kind:telemetryEnum(p.kind,ERROR_KINDS,'error')};
    default:return {};
  }
}

export function sanitizeTelemetryEvent(event){
  const eventName=String(event?.name||event?.eventName||'');
  if(!TELEMETRY_EVENTS.has(eventName)) return null;
  const eventId=String(event?.eventId||'').toLowerCase();
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(eventId)) return null;
  const eventAt=Number(event?.at);
  if(!Number.isFinite(eventAt)) return null;
  const now=Date.now();
  const boundedAt=Math.max(now-7*DAY_MS,Math.min(now+5*60*1000,eventAt));
  return {eventId,eventName,eventAt:new Date(boundedAt).toISOString(),properties:sanitizeTelemetryProperties(eventName,event?.properties)};
}

const PRODUCT_EVENTS=new Set([
  'app_opened','task_created','task_completed','task_focus_started',
  'focus_started','focus_paused','focus_resumed','focus_completed',
  'session_rated','distraction_logged','analytics_opened',
  'heatmap_metric_changed','insight_seen'
]);

function ts(value){
  const n=new Date(value||0).getTime();
  return Number.isFinite(n)?n:0;
}
function dayKey(value){
  const d=new Date(value);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}
function dayIndex(value){ return Math.floor(Date.UTC(new Date(value).getUTCFullYear(),new Date(value).getUTCMonth(),new Date(value).getUTCDate())/DAY_MS); }
function weekStartKey(value){
  const d=new Date(value); const weekday=d.getUTCDay(); const shift=(weekday+6)%7;
  return dayKey(new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()-shift)));
}
function inWindow(at,now,days){ const t=ts(at); return t>0 && t>=now-days*DAY_MS && t<=now+60000; }
function percent(n,d){ return d>0?Math.round(n/d*1000)/10:null; }
function unique(rows,key='account_id'){ return new Set(rows.map(row=>row?.[key]).filter(Boolean)); }
function eventProps(event){ return event?.properties && typeof event.properties==='object' && !Array.isArray(event.properties)?event.properties:{}; }

function activeEvents(events){ return events.filter(event=>PRODUCT_EVENTS.has(String(event.event_name||''))); }

function retention(accounts,events,offsetDays,now,telemetryStart){
  const eligible=(accounts||[]).filter(account=>{
    const created=ts(account.created_at);
    return created>=telemetryStart && created<=now-offsetDays*DAY_MS;
  });
  if(!eligible.length) return {eligible:0,retained:0,rate:null};
  const opensByAccount=new Map();
  for(const event of events){
    if(event.event_name!=='app_opened') continue;
    if(!opensByAccount.has(event.account_id)) opensByAccount.set(event.account_id,[]);
    opensByAccount.get(event.account_id).push(ts(event.event_at));
  }
  let retained=0;
  for(const account of eligible){
    const createdDay=dayIndex(account.created_at);
    if((opensByAccount.get(account.id)||[]).some(value=>dayIndex(value)-createdDay===offsetDays)) retained++;
  }
  return {eligible:eligible.length,retained,rate:percent(retained,eligible.length)};
}

function featureAdoption(events,wauUsers){
  const features=[
    ['Focus','focus_completed'],
    ['Görevler','task_created'],
    ['Task → Focus','task_focus_started'],
    ['Session Rating','session_rated'],
    ['Analytics','analytics_opened'],
    ['Dikkat Kaydı','distraction_logged'],
    ['Heatmap Etkileşimi','heatmap_metric_changed']
  ];
  return features.map(([label,eventName])=>{
    const users=unique(events.filter(event=>event.event_name===eventName));
    return {label,eventName,users:users.size,rate:percent(users.size,wauUsers.size)};
  });
}

function activationFunnel(accounts,events,now,telemetryStart){
  const cohort=(accounts||[]).filter(account=>{
    const created=ts(account.created_at);
    return created>=Math.max(telemetryStart,now-30*DAY_MS) && created<=now;
  });
  const byAccount=new Map();
  for(const event of events){
    if(!byAccount.has(event.account_id)) byAccount.set(event.account_id,[]);
    byAccount.get(event.account_id).push(event);
  }
  const requirements=[
    ['Yeni hesap',null],
    ['İlk görev','task_created'],
    ['Task → Focus','task_focus_started'],
    ['Focus tamamlandı','focus_completed'],
    ['İlk rating','session_rated'],
    ['Analytics açıldı','analytics_opened']
  ];
  let survivors=new Set(cohort.map(account=>account.id));
  const rows=[];
  for(const [label,eventName] of requirements){
    if(eventName){
      const next=new Set();
      for(const account of cohort){
        if(!survivors.has(account.id)) continue;
        const created=ts(account.created_at);
        const reached=(byAccount.get(account.id)||[]).some(event=>
          event.event_name===eventName && ts(event.event_at)>=created && ts(event.event_at)<=created+7*DAY_MS
        );
        if(reached) next.add(account.id);
      }
      survivors=next;
    }
    rows.push({label,eventName,users:survivors.size,rate:percent(survivors.size,cohort.length)});
  }
  return {cohortSize:cohort.length,rows};
}

function cohorts(accounts,events,now,telemetryStart){
  const opensByAccount=new Map();
  for(const event of events){
    if(event.event_name!=='app_opened') continue;
    if(!opensByAccount.has(event.account_id)) opensByAccount.set(event.account_id,[]);
    opensByAccount.get(event.account_id).push(ts(event.event_at));
  }
  const weeks=[];
  const currentStart=ts(weekStartKey(now)+'T00:00:00Z');
  for(let i=7;i>=0;i--){
    const start=currentStart-i*7*DAY_MS,end=start+7*DAY_MS;
    if(end<=telemetryStart) continue;
    const cohort=(accounts||[]).filter(a=>ts(a.created_at)>=Math.max(start,telemetryStart)&&ts(a.created_at)<end);
    const row={week:dayKey(start),size:cohort.length};
    for(let w=0;w<4;w++){
      let active=0;
      for(const account of cohort){
        const accountWeek=ts(weekStartKey(account.created_at)+'T00:00:00Z');
        if((opensByAccount.get(account.id)||[]).some(open=>{
          const diff=Math.floor((ts(weekStartKey(open)+'T00:00:00Z')-accountWeek)/(7*DAY_MS));
          return diff===w;
        })) active++;
      }
      row['w'+w]=cohort.length?percent(active,cohort.length):null;
    }
    weeks.push(row);
  }
  return weeks;
}

function dailySeries(accounts,events,now){
  const out=[];
  for(let i=29;i>=0;i--){
    const date=dayKey(now-i*DAY_MS);
    const dayEvents=events.filter(e=>dayKey(e.event_at)===date);
    const active=unique(activeEvents(dayEvents));
    out.push({
      date,
      newAccounts:(accounts||[]).filter(a=>dayKey(a.created_at)===date).length,
      activeUsers:active.size,
      focusCompleted:dayEvents.filter(e=>e.event_name==='focus_completed').length,
      ratedSessions:dayEvents.filter(e=>e.event_name==='session_rated' && !eventProps(e).editing).length,
      analyticsUsers:unique(dayEvents.filter(e=>e.event_name==='analytics_opened')).size
    });
  }
  return out;
}

function releaseHealth(events,now){
  const recent=events.filter(e=>inWindow(e.event_at,now,30));
  const map=new Map();
  for(const event of recent){
    const version=String(event.app_version||'unknown').slice(0,20)||'unknown';
    if(!map.has(version)) map.set(version,{version,users:new Set(),events:0,focusCompleted:0,sessionRatings:0,syncSuccess:0,syncFailed:0,syncConflicts:0});
    const row=map.get(version); row.events++;
    if(PRODUCT_EVENTS.has(event.event_name) && event.account_id) row.users.add(event.account_id);
    if(event.event_name==='focus_completed') row.focusCompleted++;
    if(event.event_name==='session_rated' && !eventProps(event).editing) row.sessionRatings++;
    if(event.event_name==='sync_success') row.syncSuccess++;
    if(event.event_name==='sync_failed') row.syncFailed++;
    if(event.event_name==='sync_conflict') row.syncConflicts++;
  }
  return [...map.values()].map(row=>({
    version:row.version,
    activeUsers:row.users.size,
    events:row.events,
    focusCompleted:row.focusCompleted,
    sessionRatings:row.sessionRatings,
    syncSuccess:row.syncSuccess,
    syncFailed:row.syncFailed,
    syncConflicts:row.syncConflicts,
    syncFailureRate:percent(row.syncFailed,row.syncSuccess+row.syncFailed)
  })).sort((a,b)=>String(b.version).localeCompare(String(a.version),undefined,{numeric:true}));
}

function adminInsights(result){
  const insights=[];
  const funnel=result.activation?.rows||[];
  if(result.activation?.cohortSize>=5 && funnel.length>1){
    let biggest=null;
    for(let i=1;i<funnel.length;i++){
      const previous=funnel[i-1],current=funnel[i];
      const drop=previous.users-current.users;
      if(!biggest || drop>biggest.drop) biggest={previous,current,drop};
    }
    if(biggest?.drop>0){
      insights.push({kind:'growth',title:`En büyük activation kaybı: ${biggest.previous.label} → ${biggest.current.label}`,detail:`${biggest.previous.users} kullanıcıdan ${biggest.current.users} kullanıcıya düşüyor.`});
    }
  }
  if(result.summary.wau>=5){
    if(result.summary.analyticsAdoption!==null && result.summary.analyticsAdoption<30){
      insights.push({kind:'opportunity',title:'Analytics keşfi düşük.',detail:`WAU'nun yalnızca %${result.summary.analyticsAdoption} kadarı Analytics ekranını açıyor.`});
    }
    if(result.summary.meaningfulRate!==null && result.summary.meaningfulRate<45){
      insights.push({kind:'opportunity',title:'Haftalık aktiflerin önemli kısmı meaningful kullanıma geçmiyor.',detail:`Meaningful WAU / WAU oranı %${result.summary.meaningfulRate}.`});
    }
  }
  if(result.reliability.syncAttempts>=10 && result.reliability.syncFailureRate!==null && result.reliability.syncFailureRate>=2){
    insights.push({kind:'reliability',title:'Sync hata oranını incele.',detail:`Son 7 günde sync denemelerinin %${result.reliability.syncFailureRate} kadarı başarısız.`});
  }
  if(result.coreLoop.ratingEligible>=5 && result.coreLoop.ratingResponseRate!==null && result.coreLoop.ratingResponseRate<40){
    insights.push({kind:'opportunity',title:'Session rating yanıt oranı düşük.',detail:`Uygun tamamlanmış oturumların %${result.coreLoop.ratingResponseRate} kadarı puanlanmış.`});
  }
  if(!insights.length){
    insights.push({kind:'learning',title:'Ürün telemetrisi öğrenme aşamasında.',detail:'Daha güçlü growth ve retention yorumları için v95 sonrası birkaç günlük kullanım verisi gerekiyor.'});
  }
  return insights.slice(0,4);
}

export function computeProductAnalytics({accounts=[],events=[],now=Date.now()}={}){
  const eventRows=(events||[]).map(event=>({...event,event_at:event.event_at||event.created_at})).filter(event=>ts(event.event_at)>0);
  const telemetryFirst=eventRows.length?Math.min(...eventRows.map(event=>ts(event.event_at))):now;
  const telemetryStart=ts(dayKey(telemetryFirst)+'T00:00:00Z');
  const product=activeEvents(eventRows);
  const recent7=eventRows.filter(event=>inWindow(event.event_at,now,7));
  const recent30=eventRows.filter(event=>inWindow(event.event_at,now,30));
  const active7=activeEvents(recent7),active30=activeEvents(recent30);
  const todayKey=dayKey(now);
  const activeToday=unique(activeEvents(eventRows.filter(event=>dayKey(event.event_at)===todayKey)));
  const wauUsers=unique(active7),mauUsers=unique(active30);

  const activityDaysByUser=new Map();
  const focusCountByUser=new Map();
  for(const event of active7){
    if(!activityDaysByUser.has(event.account_id)) activityDaysByUser.set(event.account_id,new Set());
    activityDaysByUser.get(event.account_id).add(dayKey(event.event_at));
    if(event.event_name==='focus_completed') focusCountByUser.set(event.account_id,(focusCountByUser.get(event.account_id)||0)+1);
  }
  const meaningfulUsers=new Set([...wauUsers].filter(id=>(activityDaysByUser.get(id)?.size||0)>=2 && (focusCountByUser.get(id)||0)>=2));
  const learningLoopUsers=new Set([...wauUsers].filter(id=>{
    const own=recent7.filter(e=>e.account_id===id);
    return own.some(e=>e.event_name==='focus_completed') && own.some(e=>e.event_name==='session_rated') && own.some(e=>e.event_name==='analytics_opened');
  }));

  const analyticsUsers=unique(recent7.filter(e=>e.event_name==='analytics_opened'));
  const taskFocusUsers=unique(recent7.filter(e=>e.event_name==='task_focus_started'));
  const completedRecent7=recent7.filter(e=>e.event_name==='focus_completed');
  const ratingEligible=completedRecent7.filter(e=>eventProps(e).ratingEligible).length;
  const ratingResponses=recent7.filter(e=>e.event_name==='session_rated' && !eventProps(e).editing).length;
  const syncSuccess=recent7.filter(e=>e.event_name==='sync_success').length;
  const syncFailed=recent7.filter(e=>e.event_name==='sync_failed').length;
  const syncConflicts=recent7.filter(e=>e.event_name==='sync_conflict').length;
  const destructiveBlocks=recent7.filter(e=>e.event_name==='destructive_sync_blocked').length;
  const runtimeErrors=recent7.filter(e=>e.event_name==='runtime_error').length;

  const result={
    telemetryStartedAt:new Date(telemetryStart).toISOString(),
    summary:{
      dau:activeToday.size,
      wau:wauUsers.size,
      mau:mauUsers.size,
      meaningfulWau:meaningfulUsers.size,
      meaningfulRate:percent(meaningfulUsers.size,wauUsers.size),
      learningLoopWau:learningLoopUsers.size,
      analyticsAdoption:percent(analyticsUsers.size,wauUsers.size),
      taskFocusAdoption:percent(taskFocusUsers.size,wauUsers.size),
      newAccounts30:(accounts||[]).filter(account=>inWindow(account.created_at,now,30)).length
    },
    retention:{
      d1:retention(accounts,eventRows,1,now,telemetryStart),
      d7:retention(accounts,eventRows,7,now,telemetryStart),
      d30:retention(accounts,eventRows,30,now,telemetryStart)
    },
    activation:activationFunnel(accounts,eventRows,now,telemetryStart),
    coreLoop:{
      focusCompleted:completedRecent7.length,
      ratingEligible,
      ratingResponses,
      ratingResponseRate:percent(ratingResponses,ratingEligible),
      analyticsUsers:analyticsUsers.size,
      taskFocusUsers:taskFocusUsers.size
    },
    featureAdoption:featureAdoption(recent7,wauUsers),
    reliability:{
      syncSuccess,syncFailed,syncAttempts:syncSuccess+syncFailed,
      syncFailureRate:percent(syncFailed,syncSuccess+syncFailed),
      syncConflicts,destructiveBlocks,runtimeErrors,
      affectedUsers:unique(recent7.filter(e=>['sync_failed','destructive_sync_blocked','runtime_error'].includes(e.event_name))).size
    },
    daily:dailySeries(accounts,eventRows,now),
    cohorts:cohorts(accounts,eventRows,now,telemetryStart),
    releases:releaseHealth(eventRows,now)
  };
  result.insights=adminInsights(result);
  return result;
}

export {dayKey,weekStartKey,percent};
