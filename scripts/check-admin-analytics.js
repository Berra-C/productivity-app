const fs=require('fs');
const path=require('path');
const {pathToFileURL}=require('url');

const root=path.resolve(__dirname,'..');

function assert(condition,message){
  if(!condition) throw new Error(message);
}
function iso(year,month,day,hour=12){
  return new Date(Date.UTC(year,month-1,day,hour)).toISOString();
}
function event(accountId,eventName,at,properties={},version='v95'){
  return {account_id:accountId,event_name:eventName,event_at:at,app_version:version,properties};
}

(async()=>{
  // Client telemetry privacy/sanitization.
  global.window=global;
  let lastDetail=null;
  global.CustomEvent=class CustomEvent{
    constructor(type,options={}){this.type=type;this.detail=options.detail;}
  };
  global.dispatchEvent=event=>{lastDetail=event.detail;return true;};
  require(path.join(root,'assets/js/modules/analytics/product-telemetry.js'));
  const client=global.ProductivityProductTelemetry;

  const taskProps=client.sanitizeProperties('task_created',{
    hasDueDate:true,
    hasTime:false,
    hasTag:true,
    repeat:'weekly',
    taskText:'PRIVATE TASK',
    subject:'PRIVATE SUBJECT'
  });
  assert(taskProps.hasDueDate===true,'task due-date flag');
  assert(taskProps.repeat==='weekly','task repeat enum');
  assert(!('taskText' in taskProps),'task text must be stripped');
  assert(!('subject' in taskProps),'subject must be stripped');

  assert(client.track('task_created',{taskText:'SECRET'})===true,'known event tracked');
  assert(lastDetail?.name==='task_created','event name emitted');
  assert(!('taskText' in lastDetail.properties),'emitted payload strips task text');
  assert(client.track('totally_unknown',{value:'x'})===false,'unknown event rejected');
  assert(client.durationBucket(4*60)==='0-4','duration bucket under 5m');
  assert(client.durationBucket(50*60)==='45-59','duration bucket 50m');
  assert(client.targetBucket(90)==='90+','target bucket');

  // Server sanitizer + aggregate analytics.
  const server=await import(pathToFileURL(path.join(root,'supabase/functions/app-api/product-analytics.mjs')).href+'?v='+Date.now());
  const validId='123e4567-e89b-42d3-a456-426614174000';
  const clean=server.sanitizeTelemetryEvent({
    eventId:validId,
    name:'session_rated',
    at:Date.UTC(2026,10,14,10),
    properties:{rating:4,editing:false,taskText:'SECRET',durationBucket:'45-59',linkedTask:true}
  });
  assert(clean?.eventName==='session_rated','server accepts known event');
  assert(clean.properties.rating===4,'server rating preserved');
  assert(!('taskText' in clean.properties),'server strips content fields');
  assert(server.sanitizeTelemetryEvent({eventId:validId,name:'unknown',at:Date.now(),properties:{}})===null,'server rejects unknown event');

  const now=Date.UTC(2026,10,14,12);
  const accounts=[
    {id:'a1',created_at:iso(2026,11,1,8),disabled:false},
    {id:'a2',created_at:iso(2026,11,7,8),disabled:false},
    {id:'a3',created_at:iso(2026,11,13,8),disabled:false}
  ];
  const events=[
    event('a1','app_opened',iso(2026,11,1,9)),
    event('a1','task_created',iso(2026,11,1,9)),
    event('a1','task_focus_started',iso(2026,11,1,9)),
    event('a1','focus_started',iso(2026,11,1,9)),
    event('a1','focus_completed',iso(2026,11,1,10),{ratingEligible:true}),
    event('a1','session_rated',iso(2026,11,1,10),{editing:false}),
    event('a1','analytics_opened',iso(2026,11,1,10)),
    event('a1','app_opened',iso(2026,11,2,9)),
    event('a1','app_opened',iso(2026,11,8,9)),
    event('a1','focus_completed',iso(2026,11,13,10),{ratingEligible:true}),
    event('a1','app_opened',iso(2026,11,14,8)),
    event('a1','focus_completed',iso(2026,11,14,9),{ratingEligible:true}),
    event('a1','session_rated',iso(2026,11,14,9),{editing:false}),
    event('a1','analytics_opened',iso(2026,11,14,9)),
    event('a1','sync_success',iso(2026,11,14,9),{action:'noop'}),

    event('a2','app_opened',iso(2026,11,7,9)),
    event('a2','task_created',iso(2026,11,7,9)),
    event('a2','app_opened',iso(2026,11,8,9)),
    event('a2','sync_failed',iso(2026,11,8,9),{status:500}),

    event('a3','app_opened',iso(2026,11,13,9)),
    event('a3','app_opened',iso(2026,11,14,9)),
    event('a3','distraction_logged',iso(2026,11,14,9),{duringFocus:false})
  ];

  const result=server.computeProductAnalytics({accounts,events,now});
  assert(result.summary.dau===2,'DAU should include a1/a3');
  assert(result.summary.wau===3,'WAU should include all three accounts');
  assert(result.summary.mau===3,'MAU should include all three accounts');
  assert(result.summary.meaningfulWau===1,'a1 is meaningful WAU');
  assert(result.summary.learningLoopWau===1,'a1 completes learning loop');
  assert(result.retention.d1.rate===100,'D1 eligible accounts retained in fixture');
  assert(result.retention.d7.eligible===2 && result.retention.d7.retained===1 && result.retention.d7.rate===50,'D7 retention fixture');
  assert(result.activation.rows[0].users===3,'activation cohort size');
  assert(result.activation.rows.at(-1).users===1,'one user reaches full core loop');
  assert(result.featureAdoption.some(row=>row.eventName==='analytics_opened' && row.users===1),'analytics adoption');
  assert(result.reliability.syncAttempts===2,'sync attempts');
  assert(result.reliability.syncFailed===1,'sync failure count');
  assert(result.daily.length===30,'30-day series');
  assert(result.releases.some(row=>row.version==='v95'),'release health row');
  assert(Array.isArray(result.insights) && result.insights.length>=1 && result.insights.length<=4,'admin insights bounded');

  // Admin DOM contracts.
  const html=fs.readFileSync(path.join(root,'admin.html'),'utf8');
  const adminJs=fs.readFileSync(path.join(root,'assets/js/admin.js'),'utf8');
  for(const id of ['adminSummary','adminInsights','retentionCards','dailyActiveChart','newAccountsChart','cohortTable','coreLoopCards','activationFunnel','featureAdoption','reliabilityCards','releaseTable','telemetryScope']){
    assert(html.includes(`id="${id}"`),`admin.html missing ${id}`);
    assert(adminJs.includes(`$('${id}')`),`admin.js missing ${id} renderer`);
  }
  assert(html.includes('assets/js/admin.js?v=95'),'admin asset version v95');

  // Migration/security contracts.
  const migration=fs.readFileSync(path.join(root,'supabase/migrations/003_product_analytics.sql'),'utf8');
  assert(migration.includes('create table if not exists public.app_telemetry_events'),'telemetry table migration');
  assert(migration.includes('enable row level security'),'telemetry RLS enabled');
  assert(!/create\s+policy/i.test(migration),'telemetry must not expose anon policies');

  const cloud=fs.readFileSync(path.join(root,'assets/js/cloud-sync.js'),'utf8');
  assert(cloud.includes("const TELEMETRY_OPT_OUT='test_product_analytics_optout';"),'telemetry opt-out key');
  assert(cloud.includes("if(!telemetryEnabled() || !getToken()"),'telemetry requires opt-in cloud auth');
  assert(cloud.includes("action,'telemetry-batch'") || cloud.includes("api('telemetry-batch'"),'cloud telemetry batch sender');
  assert(cloud.includes("telemetryQueue.length=0"),'auth changes clear telemetry queue');

  const edge=fs.readFileSync(path.join(root,'supabase/functions/app-api/index.ts'),'utf8');
  assert(edge.includes("action==='telemetry-batch'"),'telemetry batch Edge action');
  assert(edge.includes('sanitizeTelemetryEvent(event)'),'server sanitizer required');
  assert(edge.includes('computeProductAnalytics({'),'admin aggregate analytics required');

  console.log('admin product analytics checks passed');
})().catch(error=>{
  console.error(error);
  process.exit(1);
});
