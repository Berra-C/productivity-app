const path=require('path');

global.window=global;
require(path.resolve(__dirname,'../assets/js/modules/view-coordinator.js'));
require(path.resolve(__dirname,'../assets/js/modules/startup-controller.js'));

function assert(condition,message){
  if(!condition) throw new Error(message);
}

(async()=>{
  const calls=[];
  let statsActive=false;
  let collectionVisible=false;
  let summaryVisible=false;

  const view=global.ProductivityViewCoordinator.create({
    renderTaskList:()=>calls.push('tasks'),
    renderCalendar:()=>calls.push('calendar'),
    renderToday:value=>calls.push('today:'+value),
    renderStats:()=>calls.push('stats'),
    renderSummary:()=>calls.push('summary'),
    renderCollection:()=>calls.push('collection'),
    renderWorkButtonRow:()=>calls.push('work-buttons'),
    renderDistractionCategorySummary:()=>calls.push('distraction'),
    renderSessionList:()=>calls.push('sessions'),
    updateIntentDisplay:()=>calls.push('intent'),
    renderTaskTagControls:()=>calls.push('task-tags'),
    scheduleLongSessionReview:value=>calls.push('review:'+value),
    isStatsActive:()=>statsActive,
    isCollectionVisible:()=>collectionVisible,
    isSummaryVisible:()=>summaryVisible
  });

  view.refresh(['tasks','calendar','today','stats','summary','collection'],{
    celebrateTree:true
  });

  assert(
    calls.join('|')==='tasks|calendar|today:true',
    'hidden/ inactive expensive views must not render during refresh'
  );

  statsActive=true;
  collectionVisible=true;
  summaryVisible=true;
  calls.length=0;
  view.renderExternal();

  assert(
    calls.join('|')===
      'work-buttons|today:false|distraction|sessions|intent|task-tags|tasks|calendar|stats|collection|summary',
    'external render order'
  );

  calls.length=0;
  view.renderInitial();
  assert(
    calls.join('|')==='today:false|distraction|sessions|intent|review:450',
    'initial render order'
  );

  const startupCalls=[];
  let ready=0;
  const startup=global.ProductivityStartupController.create({
    recover:async()=>true,
    wasReset:()=>true,
    showResetWarning:()=>startupCalls.push('warning'),
    clearRecoveryPending:()=>startupCalls.push('clear'),
    saveFallback:()=>startupCalls.push('save'),
    initOnboarding:()=>startupCalls.push('onboarding'),
    dispatchReady:()=>{ready++;startupCalls.push('ready');},
    logger:{warn:()=>startupCalls.push('log')}
  });

  const success=await startup.run();
  assert(success.recovered===true && success.failed===false,'startup success result');
  assert(
    startupCalls.join('|')==='onboarding|ready',
    'successful recovery should not show reset warning'
  );
  assert(ready===1,'ready must dispatch exactly once');

  const failCalls=[];
  const failedStartup=global.ProductivityStartupController.create({
    recover:async()=>{throw new Error('boom');},
    wasReset:()=>true,
    showResetWarning:()=>failCalls.push('warning'),
    clearRecoveryPending:()=>failCalls.push('clear'),
    saveFallback:()=>failCalls.push('save'),
    initOnboarding:()=>failCalls.push('onboarding'),
    dispatchReady:()=>failCalls.push('ready'),
    logger:{warn:()=>failCalls.push('log')}
  });

  const failure=await failedStartup.run();
  assert(failure.failed===true,'startup failure result');
  assert(
    failCalls.join('|')==='log|clear|save|warning|onboarding|ready',
    'startup fallback ordering'
  );

  console.log('composition service checks passed');
})().catch(error=>{
  console.error(error);
  process.exit(1);
});
