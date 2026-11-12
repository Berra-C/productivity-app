(() => {
  'use strict';

  function create({getState,dateKeyFromMs,persist}={}){
    if(typeof getState!=='function') throw new Error('SessionRepository getState gerekli');
    if(typeof dateKeyFromMs!=='function') throw new Error('SessionRepository dateKeyFromMs gerekli');

    function state(){
      const value=getState();
      if(!value || typeof value!=='object') throw new Error('SessionRepository state bulunamadı');
      if(!value.sessionLog || typeof value.sessionLog!=='object' || Array.isArray(value.sessionLog)) value.sessionLog={};
      return value;
    }

    function forDate(key){
      const s=state();
      if(!Array.isArray(s.sessionLog[key])) s.sessionLog[key]=[];
      return s.sessionLog[key];
    }

    function byId(id){
      if(!id) return null;
      const s=state();
      for(const [key,sessions] of Object.entries(s.sessionLog||{})){
        if(!Array.isArray(sessions)) continue;
        const index=sessions.findIndex(item=>item?.id===id);
        if(index>=0) return {key,index,session:sessions[index]};
      }
      return null;
    }

    function add(key,session){
      if(!key || !session) return null;
      forDate(key).push(session);
      return session;
    }

    function removeById(id){
      const found=byId(id);
      if(!found) return null;
      const list=forDate(found.key);
      return list.splice(found.index,1)[0] || null;
    }

    function repairDate(key){
      const s=state();
      const target=forDate(key);
      const seen=new Set(target.map(session=>session?.id).filter(Boolean));
      let moved=0;

      for(const [otherKey,sessions] of Object.entries(s.sessionLog||{})){
        if(otherKey===key || !Array.isArray(sessions)) continue;
        for(let i=sessions.length-1;i>=0;i--){
          const session=sessions[i];
          const started=Number(session?.startedAt);
          if(!session?.id || !Number.isFinite(started) || dateKeyFromMs(started)!==key || seen.has(session.id)) continue;
          sessions.splice(i,1);
          target.push(session);
          seen.add(session.id);
          moved+=1;
        }
      }

      if(moved>0 && typeof persist==='function') persist({force:true});
      return {sessions:target,moved,changed:moved>0};
    }

    function allEntries(){
      const out=[];
      const s=state();
      for(const [key,sessions] of Object.entries(s.sessionLog||{})){
        if(!Array.isArray(sessions)) continue;
        sessions.forEach((session,index)=>out.push({key,index,session}));
      }
      return out;
    }

    return Object.freeze({
      forDate,
      byId,
      add,
      removeById,
      repairDate,
      allEntries
    });
  }

  window.ProductivitySessionRepository={create};
})();
