const path = require('path');

const root = path.resolve(__dirname, '..');
global.window = global;

require(path.join(root, 'assets/js/modules/recurrence-service.js'));
require(path.join(root, 'assets/js/modules/session-service.js'));
require(path.join(root, 'assets/js/modules/task-service.js'));
require(path.join(root, 'assets/js/modules/event-service.js'));

function dateKey(date){
  const pad=value=>String(value).padStart(2,'0');
  return date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate());
}

function assert(value,message){
  if(!value) throw new Error(message);
}

// Recurrence: month-end, weekly stepping and exception lifecycle.
{
  const state={recurrenceExceptions:{tasks:{},events:{}}};
  const service=global.ProductivityRecurrenceService.create({
    getState:()=>state,
    dateKey
  });

  assert(service.nextDate('2026-01-31','monthly',[],31)==='2026-02-28','monthly recurrence must clamp to month end');
  assert(service.nextDate('2026-11-02','weekly',[1,3])==='2026-11-04','weekly recurrence must select next configured weekday');
  assert(service.addException('tasks','series-1','2026-11-04')===true,'exception add failed');
  assert(service.isException('tasks','series-1','2026-11-04')===true,'exception lookup failed');
  assert(service.removeException('tasks','series-1','2026-11-04')===true,'exception remove failed');
}

// Session: rename/dedupe, one-time todo reward and historical interval edit.
{
  const state={
    subjects:['Math','math','Physics'],
    totalTodosCompleted:0,
    sessionLog:{day:[{id:'s1',name:'Math',subject:'Math',todos:[]}]}
  };
  let timestamp=100;
  const service=global.ProductivitySessionService.create({
    getState:()=>state,
    now:()=>timestamp++
  });

  assert(service.renameGroupEverywhere('Math','Matematik')===1,'session group rename count mismatch');
  assert(state.sessionLog.day[0].name==='Matematik','session name rename failed');
  assert(state.sessionLog.day[0].subject==='Matematik','session subject rename failed');
  assert(state.subjects.filter(item=>item==='Matematik').length===1,'subject rename must deduplicate suggestions');

  const todo=service.addTodo(state.sessionLog.day[0],'  Deneme çöz  ');
  const first=service.toggleTodo(state.sessionLog.day[0],todo.id);
  service.toggleTodo(state.sessionLog.day[0],todo.id);
  const third=service.toggleTodo(state.sessionLog.day[0],todo.id);
  assert(first.newlyRewarded===true,'first todo completion must be rewarded');
  assert(third.newlyRewarded===false,'re-completing rewarded todo must not reward twice');
  assert(state.totalTodosCompleted===1,'todo total must increment once');

  const session={duration:0};
  const timing=service.editHistoricalTiming(session,{
    newStart:1000,
    newEnd:10000,
    existingIntervals:[{start:0,end:5000},{start:5001,end:20000}],
    mergeGapMs:1000
  });
  assert(timing.ok===true,'historical timing edit failed');
  assert(session.startedAt===1000 && session.endedAt===10000,'historical bounds mismatch');
  assert(session.duration===9,'historical duration mismatch');
}

// Task: completion/reward, recurrence spawning, scoped deletion and undo.
{
  const state={tasks:[],totalTodosCompleted:0,recurrenceExceptions:{tasks:{},events:{}}};
  const tombstones=new Set();
  const recurrence=global.ProductivityRecurrenceService.create({getState:()=>state,dateKey});
  let timestamp=1000;
  const service=global.ProductivityTaskService.create({
    getState:()=>state,
    recurrence,
    normalizeTime:value=>value||null,
    tagExists:()=>false,
    normalizedTagId:()=>null,
    nextSortOrder:()=>state.tasks.length,
    touchRecord:(record,at)=>{record.updatedAt=at;return record;},
    recordTombstone:(kind,id)=>tombstones.add(kind+':'+id),
    clearTombstone:(kind,id)=>tombstones.delete(kind+':'+id),
    now:()=>timestamp++,
    random:()=>0.123
  });

  const rootTask=service.createTask('Daily','2026-11-01',null,null,'daily');
  rootTask.repeatSourceId=rootTask.id;
  const completed=service.toggleDone(rootTask.id);
  assert(completed.newlyRewarded===true && state.totalTodosCompleted===1,'task completion reward mismatch');

  const second=service.spawnNext(rootTask);
  assert(second?.dueDate==='2026-11-02','first recurring task spawn failed');
  const third=service.spawnNext(second);
  assert(third?.dueDate==='2026-11-03','second recurring task spawn failed');

  const before=state.tasks.length;
  const deletion=service.deleteTask(second.id,'future');
  assert(deletion.removedCount===2 && state.tasks.length===1,'future task deletion mismatch');
  deletion.undo();
  assert(state.tasks.length===before,'future task deletion undo mismatch');
}

// Event: horizon generation skips exceptions and scoped deletion can be undone.
{
  const state={events:[],recurrenceExceptions:{tasks:{},events:{}}};
  const tombstones=new Set();
  const recurrence=global.ProductivityRecurrenceService.create({getState:()=>state,dateKey});
  let timestamp=2000;
  const service=global.ProductivityEventService.create({
    getState:()=>state,
    recurrence,
    normalizeTime:value=>value||null,
    defaultColor:'#7aa2f7',
    dateKey,
    touchRecord:(record,at)=>{record.updatedAt=at;return record;},
    recordTombstone:(kind,id)=>tombstones.add(kind+':'+id),
    clearTombstone:(kind,id)=>tombstones.delete(kind+':'+id),
    now:()=>timestamp++,
    random:()=>0.234
  });

  const rootEvent=service.createOccurrence(
    'Ders','2026-11-01','10:00','11:00','#7aa2f7','daily',null,[],null,'Açıklama'
  );
  recurrence.addException('events',rootEvent.id,'2026-11-03');
  service.generateSeries(rootEvent,'2026-11-04');

  const dates=state.events.map(event=>event.date).sort();
  assert(dates.join(',')==='2026-11-01,2026-11-02,2026-11-04','event recurrence exception mismatch');

  const second=state.events.find(event=>event.date==='2026-11-02');
  const before=state.events.length;
  const deletion=service.deleteEvent(second.id,'future');
  assert(state.events.length===1,'future event deletion mismatch');
  deletion.undo();
  assert(state.events.length===before,'future event deletion undo mismatch');
}

console.log('domain service checks passed');
