(() => {
  'use strict';

  function normalizeId(value){
    const text=String(value||'').trim();
    return text || null;
  }

  function sessionTaskId(session){
    if(!session || typeof session!=='object') return null;
    const direct=normalizeId(session.linkedTaskId);
    if(direct) return direct;

    const todos=Array.isArray(session.todos)?session.todos:[];
    const legacy=todos.find(todo=>normalizeId(todo?.linkedTaskId));
    return legacy ? normalizeId(legacy.linkedTaskId) : null;
  }

  function sessionTaskText(session){
    if(!session || typeof session!=='object') return '';
    const direct=String(session.linkedTaskText||'').trim();
    if(direct) return direct;

    const taskId=sessionTaskId(session);
    const todos=Array.isArray(session.todos)?session.todos:[];
    const legacy=todos.find(todo=>
      normalizeId(todo?.linkedTaskId)===taskId
    );
    return String(legacy?.text||'').trim();
  }

  function linkSession(session,task,{now=Date.now()}={}){
    if(!session || !task?.id) return null;
    const taskId=normalizeId(task.id);
    const text=String(task.text||'').trim().slice(0,120);

    session.linkedTaskId=taskId;
    session.linkedTaskText=text || null;
    session.updatedAt=Number(now)||Date.now();

    if(!Array.isArray(session.todos)) session.todos=[];

    let linkedTodo=session.todos.find(todo=>
      normalizeId(todo?.linkedTaskId)===taskId
    );

    if(!linkedTodo && text){
      linkedTodo=session.todos.find(todo=>
        !todo?.linkedTaskId &&
        String(todo?.text||'').trim()===text
      );
    }

    if(linkedTodo){
      linkedTodo.linkedTaskId=taskId;
    }

    return {
      taskId,
      text,
      todo:linkedTodo || null
    };
  }

  function linkedTaskInfo(session,tasks=[]){
    const taskId=sessionTaskId(session);
    if(!taskId) return null;

    const task=(Array.isArray(tasks)?tasks:[])
      .find(item=>normalizeId(item?.id)===taskId) || null;

    const snapshot=sessionTaskText(session);

    return {
      taskId,
      text:String(task?.text||snapshot||'Bağlı görev').trim(),
      done:Boolean(task?.done),
      missing:!task,
      task
    };
  }

  function syncLinkedTodo(session,done,{now=Date.now()}={}){
    const taskId=sessionTaskId(session);
    if(!taskId || !Array.isArray(session?.todos)) return false;

    const todo=session.todos.find(item=>
      normalizeId(item?.linkedTaskId)===taskId
    );

    if(!todo || Boolean(todo.done)===Boolean(done)) return false;
    todo.done=Boolean(done);
    session.updatedAt=Number(now)||Date.now();
    return true;
  }

  function normalizeEntry(entry){
    if(entry?.session) return entry.session;
    return entry;
  }

  function summarizeTask(taskId,entries=[],sessionSeconds=()=>0,options={}){
    const wanted=normalizeId(taskId);
    if(!wanted){
      return {seconds:0,sessions:0,active:false,activeState:null};
    }

    let seconds=0;
    let sessions=0;
    let active=false;
    let activeState=null;

    (Array.isArray(entries)?entries:[]).forEach(entry=>{
      const session=normalizeEntry(entry);
      if(sessionTaskId(session)!==wanted) return;

      sessions+=1;
      seconds+=Math.max(0,Number(sessionSeconds(session,entry))||0);

      if(session?.id && session.id===options.activeSessionId){
        active=true;
        activeState=options.isWorking ? 'working' : 'paused';
      }
    });

    return {
      seconds:Math.round(seconds),
      sessions,
      active,
      activeState
    };
  }

  function breakdown(entries=[],tasks=[],sessionSeconds=()=>0){
    const taskMap=new Map(
      (Array.isArray(tasks)?tasks:[])
        .filter(task=>task?.id)
        .map(task=>[normalizeId(task.id),task])
    );
    const rows=new Map();

    (Array.isArray(entries)?entries:[]).forEach(entry=>{
      const session=normalizeEntry(entry);
      const taskId=sessionTaskId(session);
      if(!taskId) return;

      const task=taskMap.get(taskId) || null;
      const row=rows.get(taskId) || {
        taskId,
        text:String(task?.text||sessionTaskText(session)||'Silinmiş görev').trim(),
        seconds:0,
        sessions:0,
        done:Boolean(task?.done),
        missing:!task
      };

      if(task?.text) row.text=String(task.text).trim();
      row.done=Boolean(task?.done);
      row.missing=!task;
      row.seconds+=Math.max(0,Number(sessionSeconds(session,entry))||0);
      row.sessions+=1;
      rows.set(taskId,row);
    });

    return [...rows.values()]
      .map(row=>({...row,seconds:Math.round(row.seconds)}))
      .sort((a,b)=>b.seconds-a.seconds || b.sessions-a.sessions || a.text.localeCompare(b.text,'tr'));
  }

  window.ProductivityTaskFocusService={
    sessionTaskId,
    sessionTaskText,
    linkSession,
    linkedTaskInfo,
    syncLinkedTodo,
    summarizeTask,
    breakdown
  };
})();
