(() => {
  'use strict';

  function create(options={}){
    const getState=options.getState;
    const normalizeGroupName=options.normalizeGroupName || (value=>String(value||'').trim().toLocaleLowerCase('tr-TR'));
    const now=typeof options.now==='function' ? options.now : ()=>Date.now();
    const idFactory=typeof options.idFactory==='function'
      ? options.idFactory
      : ()=> 't'+Date.now()+Math.random().toString(36).slice(2,6);

    if(typeof getState!=='function') throw new Error('SessionService getState gerekli');

    function state(){
      const value=getState();
      if(!value || typeof value!=='object') throw new Error('SessionService state gerekli');
      return value;
    }

    function renameGroupEverywhere(oldValue,newValue){
      const value=state();
      const oldKey=normalizeGroupName(oldValue);
      const cleanNew=String(newValue||'').trim();
      if(!oldKey || !cleanNew) return 0;

      const timestamp=now();
      let changed=0;

      Object.values(value.sessionLog||{}).forEach(sessions=>{
        if(!Array.isArray(sessions)) return;
        sessions.forEach(session=>{
          let touched=false;
          if(normalizeGroupName(session.name)===oldKey){
            session.name=cleanNew;
            touched=true;
          }
          if(normalizeGroupName(session.subject)===oldKey){
            session.subject=cleanNew;
            touched=true;
          }
          if(touched){
            session.updatedAt=timestamp;
            changed+=1;
          }
        });
      });

      if(Array.isArray(value.subjects)){
        value.subjects=value.subjects.map(subject=>
          normalizeGroupName(subject)===oldKey ? cleanNew : subject
        );
        const seen=new Set();
        value.subjects=value.subjects.filter(subject=>{
          const key=normalizeGroupName(subject);
          if(seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }

      return changed;
    }

    function rememberSubject(subject,limit=12){
      const value=state();
      const clean=String(subject||'').trim();
      if(!clean) return false;
      if(!Array.isArray(value.subjects)) value.subjects=[];
      const lower=clean.toLowerCase();
      value.subjects=value.subjects.filter(item=>String(item||'').toLowerCase()!==lower);
      value.subjects.unshift(clean);
      value.subjects=value.subjects.slice(0,Math.max(1,Number(limit)||12));
      return true;
    }

    function setSubject(session,subject){
      if(!session || typeof session!=='object') return null;
      const clean=String(subject||'').trim().slice(0,30);
      session.subject=clean || 'Genel';
      session.updatedAt=now();
      if(clean) rememberSubject(clean);
      return clean;
    }

    function setHidden(session,hidden){
      if(!session || typeof session!=='object') return false;
      session.hidden=Boolean(hidden);
      session.updatedAt=now();
      return true;
    }

    function addTodo(session,text){
      if(!session || typeof session!=='object') return null;
      const clean=String(text||'').trim().slice(0,80);
      if(!clean) return null;
      if(!Array.isArray(session.todos)) session.todos=[];
      const todo={id:idFactory(),text:clean,done:false};
      session.todos.push(todo);
      session.updatedAt=now();
      return todo;
    }

    function toggleTodo(session,todoId,options={}){
      if(!session || !Array.isArray(session.todos)) return null;
      const todo=session.todos.find(item=>item?.id===todoId);
      if(!todo) return null;

      const value=state();
      const wasDone=Boolean(todo.done);
      todo.done=!wasDone;
      session.updatedAt=now();
      let newlyRewarded=false;

      const reward=options.reward!==false;

      if(reward && !wasDone && todo.done && !todo.xpCounted){
        todo.xpCounted=true;
        value.totalTodosCompleted=(Number(value.totalTodosCompleted)||0)+1;
        newlyRewarded=true;
      }

      return {
        todo,
        wasDone,
        newlyRewarded,
        allDone:session.todos.length>0 && session.todos.every(item=>item.done)
      };
    }

    function deleteTodo(session,todoId){
      if(!session || !Array.isArray(session.todos)) return null;
      const index=session.todos.findIndex(item=>item?.id===todoId);
      if(index<0) return null;
      const removed=session.todos.splice(index,1)[0] || null;
      if(removed) session.updatedAt=now();
      return removed;
    }

    function editHistoricalTiming(session,{newStart,newEnd,existingIntervals=[],mergeGapMs=1000}={}){
      if(!session || !Number.isFinite(Number(newStart)) || !Number.isFinite(Number(newEnd)) || Number(newEnd)<=Number(newStart)){
        return {ok:false,total:0,intervals:[]};
      }

      const start=Number(newStart);
      const end=Number(newEnd);
      const existing=(Array.isArray(existingIntervals)?existingIntervals:[])
        .filter(interval=>Number.isFinite(Number(interval?.start)) && Number.isFinite(Number(interval?.end)))
        .map(interval=>({start:Number(interval.start),end:Number(interval.end)}))
        .sort((a,b)=>a.start-b.start);

      let intervals=existing
        .map(interval=>({
          start:Math.max(interval.start,start),
          end:Math.min(interval.end,end)
        }))
        .filter(interval=>interval.end>interval.start);

      if(!intervals.length){
        intervals=[{start,end}];
      }else{
        if(existing.length && start<existing[0].start){
          intervals[0].start=start;
        }
        if(existing.length && end>existing[existing.length-1].end){
          intervals[intervals.length-1].end=end;
        }
      }

      intervals.sort((a,b)=>a.start-b.start);
      const merged=[];

      intervals.forEach(interval=>{
        const previous=merged[merged.length-1];
        if(previous && interval.start<=previous.end+mergeGapMs){
          previous.end=Math.max(previous.end,interval.end);
        }else{
          merged.push({...interval});
        }
      });

      const total=Math.round(
        merged.reduce((sum,interval)=>sum+(interval.end-interval.start)/1000,0)
      );

      if(total<=0) return {ok:false,total:0,intervals:merged};

      session.workIntervals=merged;
      session.startedAt=start;
      session.endedAt=end;
      session.duration=total;
      session.updatedAt=now();

      return {ok:true,total,intervals:merged};
    }

    return Object.freeze({
      renameGroupEverywhere,
      rememberSubject,
      setSubject,
      setHidden,
      addTodo,
      toggleTodo,
      deleteTodo,
      editHistoricalTiming
    });
  }

  window.ProductivitySessionService={create};
})();
