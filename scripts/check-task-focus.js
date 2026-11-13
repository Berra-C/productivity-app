const path=require('path');

global.window=global;
require(path.resolve(__dirname,'../assets/js/modules/tasks/task-focus-service.js'));
require(path.resolve(__dirname,'../assets/js/modules/timer/timer-core.js'));
require(path.resolve(__dirname,'../assets/js/modules/timer/timer-service.js'));

const Focus=global.ProductivityTaskFocusService;
const Timer=global.ProductivityTimerService;

function assert(condition,message){
  if(!condition) throw new Error(message);
}

const legacySession={
  id:'s1',
  duration:600,
  todos:[{id:'x',text:'Legacy task',done:false,linkedTaskId:'t1'}]
};
assert(Focus.sessionTaskId(legacySession)==='t1','legacy todo link inferred');
assert(Focus.sessionTaskText(legacySession)==='Legacy task','legacy task text inferred');

const task={id:'t2',text:'Physics',done:false};
const session={id:'s2',todos:[{id:'y',text:'Physics',done:false}]};
const linked=Focus.linkSession(session,task,{now:123});
assert(linked.taskId==='t2','linkSession id');
assert(session.linkedTaskId==='t2','session direct link');
assert(session.linkedTaskText==='Physics','session task snapshot');
assert(session.todos[0].linkedTaskId==='t2','matching todo linked');
assert(session.updatedAt===123,'linkSession touch');

assert(Focus.syncLinkedTodo(session,true)===true,'linked todo sync changed');
assert(session.todos[0].done===true,'linked todo done mirrors task');
assert(session.updatedAt>123,'linked todo sync touches session timestamp');
assert(Focus.syncLinkedTodo(session,true)===false,'linked todo sync idempotent');

const entries=[
  {key:'a',session:{id:'a',linkedTaskId:'t2',linkedTaskText:'Physics',duration:300}},
  {key:'b',session:{id:'b',todos:[{linkedTaskId:'t2',text:'Physics'}],duration:600}},
  {key:'b',session:{id:'c',linkedTaskId:'other',duration:900}}
];
const summary=Focus.summarizeTask(
  't2',
  entries,
  item=>item.duration,
  {activeSessionId:'b',isWorking:false}
);
assert(summary.seconds===900,'summary seconds');
assert(summary.sessions===2,'summary sessions');
assert(summary.active===true && summary.activeState==='paused','summary active state');

const breakdown=Focus.breakdown(
  entries,
  [task],
  item=>item.duration
);
assert(breakdown[0].taskId==='t2','breakdown top task');
assert(breakdown[0].seconds===900,'breakdown seconds');
assert(breakdown[0].sessions===2,'breakdown session count');
assert(breakdown.some(row=>row.taskId==='other' && row.missing),'deleted task retained via snapshot');

const created=Timer.createSession({
  now:1000,
  name:'Oturum',
  subject:'Fizik',
  seedTodoText:'Physics',
  linkedTaskId:'t2',
  linkedTaskText:'Physics'
});
assert(created.linkedTaskId==='t2','new timer session stores linked task');
assert(created.todos[0].linkedTaskId==='t2','seed todo stores linked task');

const continuation=Timer.createMidnightContinuation(created,5000);
assert(continuation.linkedTaskId==='t2','midnight continuation preserves linked task');
assert(continuation.linkedTaskText==='Physics','midnight continuation preserves task snapshot');

const info=Focus.linkedTaskInfo(
  {linkedTaskId:'deleted',linkedTaskText:'Deleted snapshot'},
  []
);
assert(info.missing===true && info.text==='Deleted snapshot','deleted task snapshot preserved');

console.log('task focus integration checks passed');
