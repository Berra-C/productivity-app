(() => {
  'use strict';

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  function create(options={}){
    const getState=options.getState;
    const recurrence=options.recurrence;
    const normalizeTime=options.normalizeTime || (value=>value||null);
    const tagExists=options.tagExists || (()=>false);
    const normalizedTagId=options.normalizedTagId || (task=>task?.tagId||null);
    const nextSortOrder=options.nextSortOrder || (()=>0);
    const touchRecord=options.touchRecord || ((record,at)=>{ if(record) record.updatedAt=at; return record; });
    const recordTombstone=options.recordTombstone || (()=>0);
    const clearTombstone=options.clearTombstone || (()=>{});
    const now=typeof options.now==='function' ? options.now : ()=>Date.now();
    const random=typeof options.random==='function' ? options.random : Math.random;

    if(typeof getState!=='function') throw new Error('TaskService getState gerekli');
    if(!recurrence) throw new Error('TaskService recurrence gerekli');

    function state(){
      const value=getState();
      if(!value || typeof value!=='object') throw new Error('TaskService state gerekli');
      if(!Array.isArray(value.tasks)) value.tasks=[];
      return value;
    }

    function id(){
      return 'tk'+now()+random().toString(36).slice(2,6);
    }

    function createTask(text,dueDate,time,tagId,repeat='none',repeatSourceId=null,repeatDays=[],repeatAnchorDay=null,repeatUntil=null){
      const value=state();
      const cleanText=String(text||'').trim().slice(0,120);
      if(!cleanText) return null;
      const safeRepeat=['daily','weekly','monthly'].includes(repeat) && dueDate ? repeat : 'none';
      const timestamp=now();
      const task={
        id:id(),
        text:cleanText,
        done:false,
        dueDate:dueDate || null,
        time:normalizeTime(time) || null,
        tagId:tagExists(tagId) ? tagId : null,
        repeat:safeRepeat,
        repeatSourceId:repeatSourceId || null,
        repeatDays:recurrence.normalizeDays(repeatDays),
        repeatAnchorDay:safeRepeat==='monthly'
          ? (Number.isFinite(Number(repeatAnchorDay)) && Number(repeatAnchorDay)>=1 && Number(repeatAnchorDay)<=31
            ? Number(repeatAnchorDay)
            : Number(String(dueDate||'').slice(-2)) || null)
          : null,
        repeatUntil:repeatUntil || null,
        createdAt:new Date(timestamp).toISOString(),
        updatedAt:timestamp,
        doneAt:null,
        xpCounted:false,
        sortOrder:nextSortOrder()
      };
      value.tasks.push(task);
      return task;
    }

    function byId(idValue){
      return state().tasks.find(task=>task?.id===idValue) || null;
    }

    function rename(idValue,text,scope='single'){
      const value=state();
      const target=value.tasks.find(task=>task?.id===idValue);
      const clean=String(text||'').trim().slice(0,120);
      if(!target || !clean) return [];
      const affected=recurrence.seriesItems(value.tasks,target,'dueDate',scope);
      const timestamp=now();
      affected.forEach(task=>{
        task.text=clean;
        touchRecord(task,timestamp);
      });
      return affected;
    }

    function toggleDone(idValue){
      const value=state();
      const task=value.tasks.find(item=>item?.id===idValue);
      if(!task) return null;

      const wasDone=Boolean(task.done);
      task.done=!wasDone;
      task.doneAt=task.done ? new Date(now()).toISOString() : null;
      touchRecord(task,now());
      let newlyRewarded=false;

      if(!wasDone && task.done && !task.xpCounted){
        task.xpCounted=true;
        value.totalTodosCompleted=(Number(value.totalTodosCompleted)||0)+1;
        newlyRewarded=true;
      }

      return {task,wasDone,newlyRewarded};
    }

    function spawnNext(task){
      const value=state();
      if(!task || !['daily','weekly','monthly'].includes(task.repeat) || !task.dueDate) return null;

      const anchorDay=task.repeat==='monthly'
        ? (Number(task.repeatAnchorDay) || Number(String(task.dueDate).slice(-2)))
        : null;
      const sourceId=task.repeatSourceId || task.id;
      let cursor=task.dueDate;
      let nextDate=null;
      let guard=0;

      while(guard++<1200){
        nextDate=recurrence.nextDate(cursor,task.repeat,task.repeatDays,anchorDay);
        if(!nextDate || !recurrence.allowsDate(task.repeatUntil||null,nextDate)) return null;
        if(!recurrence.isException('tasks',sourceId,nextDate)) break;
        cursor=nextDate;
      }

      if(!nextDate || guard>=1200) return null;
      if(recurrence.hasOccurrence(value.tasks,sourceId,'dueDate',nextDate)) return null;

      return createTask(
        task.text,
        nextDate,
        task.time,
        normalizedTagId(task),
        task.repeat,
        sourceId,
        task.repeatDays || [],
        anchorDay,
        task.repeatUntil || null
      );
    }

    function deleteTask(idValue,choice='single'){
      const value=state();
      const index=value.tasks.findIndex(task=>task?.id===idValue);
      if(index<0) return null;
      const target=value.tasks[index];
      const recurring=['daily','weekly','monthly'].includes(target.repeat);

      if(choice==='future'){
        const sourceId=target.repeatSourceId || target.id;
        const removeIds=new Set(recurrence.itemsFrom(value.tasks,target,'dueDate').map(task=>task.id));
        const removed=value.tasks
          .map((task,taskIndex)=>({task:clone(task),index:taskIndex}))
          .filter(entry=>removeIds.has(entry.task.id));
        const priorSnapshots=value.tasks
          .filter(task=>(task.repeatSourceId||task.id)===sourceId && !removeIds.has(task.id))
          .map(task=>({id:task.id,repeatUntil:task.repeatUntil||null}));
        const stopKey=recurrence.dateBefore(target.dueDate);
        const removedExceptions=recurrence.trimExceptionsFrom('tasks',sourceId,target.dueDate);

        removeIds.forEach(taskId=>recordTombstone('tasks',taskId));
        value.tasks=value.tasks.filter(task=>!removeIds.has(task.id));
        value.tasks.forEach(task=>{
          if((task.repeatSourceId||task.id)===sourceId) task.repeatUntil=stopKey;
        });

        return {
          mode:'future',
          removedCount:removed.length,
          undo(){
            const current=state();
            priorSnapshots.forEach(snapshot=>{
              const task=current.tasks.find(item=>item.id===snapshot.id);
              if(task) task.repeatUntil=snapshot.repeatUntil;
            });
            recurrence.restoreExceptions('tasks',sourceId,removedExceptions);
            removed.sort((a,b)=>a.index-b.index).forEach(({task, index:taskIndex})=>{
              clearTombstone('tasks',task.id);
              touchRecord(task,now());
              current.tasks.splice(Math.min(taskIndex,current.tasks.length),0,task);
            });
          }
        };
      }

      const removed=clone(target);
      const sourceId=recurring ? (target.repeatSourceId||target.id) : null;
      const exceptionAdded=recurring && target.dueDate
        ? recurrence.addException('tasks',sourceId,target.dueDate)
        : false;

      recordTombstone('tasks',target.id);
      value.tasks.splice(index,1);

      return {
        mode:'single',
        removedCount:1,
        undo(){
          const current=state();
          if(exceptionAdded) recurrence.removeException('tasks',sourceId,target.dueDate);
          clearTombstone('tasks',removed.id);
          touchRecord(removed,now());
          current.tasks.splice(Math.min(index,current.tasks.length),0,removed);
        }
      };
    }

    function clearCompleted(){
      const value=state();
      const removed=value.tasks
        .map((task,index)=>({task:clone(task),index}))
        .filter(entry=>entry.task.done);
      if(!removed.length) return null;

      removed.forEach(({task})=>recordTombstone('tasks',task.id));
      value.tasks=value.tasks.filter(task=>!task.done);

      return {
        removedCount:removed.length,
        undo(){
          const current=state();
          removed.sort((a,b)=>a.index-b.index).forEach(({task,index})=>{
            clearTombstone('tasks',task.id);
            touchRecord(task,now());
            current.tasks.splice(Math.min(index,current.tasks.length),0,task);
          });
        }
      };
    }

    return Object.freeze({
      createTask,
      byId,
      rename,
      toggleDone,
      spawnNext,
      deleteTask,
      clearCompleted
    });
  }

  window.ProductivityTaskService={create};
})();
