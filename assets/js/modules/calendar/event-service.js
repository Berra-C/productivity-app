(() => {
  'use strict';

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  function dedupeDays(days=[]){
    const seen=new Set();
    const output=[];
    (days||[]).map(Number).forEach(day=>{
      if(day<0 || day>6 || seen.has(day)) return;
      seen.add(day);
      output.push(day);
    });
    return output;
  }

  function create(options={}){
    const getState=options.getState;
    const recurrence=options.recurrence;
    const normalizeTime=options.normalizeTime || (value=>value||null);
    const defaultColor=options.defaultColor || '#7aa2f7';
    const touchRecord=options.touchRecord || ((record,at)=>{ if(record) record.updatedAt=at; return record; });
    const recordTombstone=options.recordTombstone || (()=>0);
    const clearTombstone=options.clearTombstone || (()=>{});
    const now=typeof options.now==='function' ? options.now : ()=>Date.now();
    const random=typeof options.random==='function' ? options.random : Math.random;

    if(typeof getState!=='function') throw new Error('EventService getState gerekli');
    if(!recurrence) throw new Error('EventService recurrence gerekli');

    function state(){
      const value=getState();
      if(!value || typeof value!=='object') throw new Error('EventService state gerekli');
      if(!Array.isArray(value.events)) value.events=[];
      return value;
    }

    function id(){
      return 'ev'+now()+random().toString(36).slice(2,6);
    }

    function safeColor(color){
      return /^#[0-9a-fA-F]{6}$/.test(color||'') ? color : defaultColor;
    }

    function createOccurrence(title,date,time,endTime,color,repeat='none',repeatSourceId=null,repeatDays=[],repeatAnchorDay=null,description=''){
      const value=state();
      const timestamp=now();
      const event={
        id:id(),
        title:String(title||'').trim().slice(0,80),
        description:String(description||'').trim().slice(0,600),
        date,
        endDate:null,
        time:normalizeTime(time)||null,
        endTime:normalizeTime(endTime)||null,
        color:safeColor(color),
        repeat,
        repeatSourceId,
        repeatDays:dedupeDays(repeatDays),
        repeatAnchorDay:repeat==='monthly'
          ? (Number.isFinite(Number(repeatAnchorDay)) && Number(repeatAnchorDay)>=1 && Number(repeatAnchorDay)<=31
            ? Number(repeatAnchorDay)
            : Number(String(date||'').slice(-2)) || null)
          : null,
        repeatUntil:null,
        createdAt:new Date(timestamp).toISOString(),
        updatedAt:timestamp
      };
      value.events.push(event);
      return event;
    }

    function generateSeries(baseEvent,targetKey=null){
      const value=state();
      if(!baseEvent || !['daily','weekly','monthly'].includes(baseEvent.repeat) || baseEvent.endDate) return 0;

      const sourceId=baseEvent.repeatSourceId || baseEvent.id;
      baseEvent.repeatSourceId=sourceId;
      const anchorDay=baseEvent.repeat==='monthly'
        ? (Number(baseEvent.repeatAnchorDay) || Number(String(baseEvent.date).slice(-2)))
        : null;
      if(baseEvent.repeat==='monthly') baseEvent.repeatAnchorDay=anchorDay;

      const fallback=new Date(baseEvent.date+'T12:00:00');
      fallback.setMonth(fallback.getMonth()+3);
      const horizonKey=targetKey || options.dateKey?.(fallback);
      if(!horizonKey) return 0;

      const repeatUntil=baseEvent.repeatUntil || null;
      let cursor=baseEvent.date;
      let guard=0;
      let created=0;

      while(guard++<1200){
        const next=recurrence.nextDate(cursor,baseEvent.repeat,baseEvent.repeatDays,anchorDay);
        if(!next || next>horizonKey || (repeatUntil && next>repeatUntil)) break;

        if(
          !recurrence.isException('events',sourceId,next) &&
          !recurrence.hasOccurrence(value.events,sourceId,'date',next)
        ){
          const occurrence=createOccurrence(
            baseEvent.title,
            next,
            baseEvent.time,
            baseEvent.endTime,
            baseEvent.color,
            baseEvent.repeat,
            sourceId,
            baseEvent.repeatDays,
            anchorDay,
            baseEvent.description||''
          );
          occurrence.repeatUntil=repeatUntil;
          created+=1;
        }
        cursor=next;
      }

      return created;
    }

    function ensureThrough(targetKey){
      const value=state();
      if(!targetKey) return 0;
      const groups=new Map();

      value.events.forEach(event=>{
        if(!['daily','weekly','monthly'].includes(event.repeat) || !event.date || event.endDate) return;
        const sourceId=event.repeatSourceId || event.id;
        if(!groups.has(sourceId)) groups.set(sourceId,[]);
        groups.get(sourceId).push(event);
      });

      let created=0;
      groups.forEach(items=>{
        items.sort((a,b)=>a.date.localeCompare(b.date));
        const latest=items[items.length-1];
        if(!latest) return;
        const repeatUntil=items.map(item=>item.repeatUntil).filter(Boolean).sort().at(-1) || null;
        if(repeatUntil && latest.date>=repeatUntil) return;
        latest.repeatUntil=repeatUntil;
        created+=generateSeries(latest,targetKey);
      });

      return created;
    }

    function createEvent(title,date,time,endDate,color,repeat='none',repeatDays=[],endTime=null,description=''){
      const value=state();
      const isMulti=Boolean(endDate && endDate>date);
      const safeRepeat=!isMulti && ['daily','weekly','monthly'].includes(repeat) ? repeat : 'none';
      const timestamp=now();
      const event={
        id:id(),
        title:String(title||'').trim().slice(0,80),
        description:String(description||'').trim().slice(0,600),
        date,
        endDate:isMulti?endDate:null,
        time:isMulti?null:(normalizeTime(time)||null),
        endTime:isMulti?null:(normalizeTime(endTime)||null),
        color:safeColor(color),
        repeat:safeRepeat,
        repeatSourceId:null,
        repeatDays:safeRepeat==='weekly' ? dedupeDays(repeatDays) : [],
        repeatAnchorDay:safeRepeat==='monthly' ? (Number(String(date||'').slice(-2)) || null) : null,
        repeatUntil:null,
        createdAt:new Date(timestamp).toISOString(),
        updatedAt:timestamp
      };
      value.events.push(event);
      if(safeRepeat!=='none') generateSeries(event);
      return event;
    }

    function rename(idValue,title,scope='single'){
      const value=state();
      const target=value.events.find(event=>event?.id===idValue);
      const clean=String(title||'').trim().slice(0,80);
      if(!target || !clean) return [];
      const affected=recurrence.seriesItems(value.events,target,'date',scope);
      const timestamp=now();
      affected.forEach(event=>{
        event.title=clean;
        touchRecord(event,timestamp);
      });
      return affected;
    }

    function deleteEvent(idValue,choice='single'){
      const value=state();
      const index=value.events.findIndex(event=>event?.id===idValue);
      if(index<0) return null;
      const target=value.events[index];
      const recurring=['daily','weekly','monthly'].includes(target.repeat);

      if(choice==='future'){
        const sourceId=target.repeatSourceId || target.id;
        const removeIds=new Set(recurrence.itemsFrom(value.events,target,'date').map(event=>event.id));
        const removed=value.events
          .map((event,eventIndex)=>({event:clone(event),index:eventIndex}))
          .filter(entry=>removeIds.has(entry.event.id));
        const priorSnapshots=value.events
          .filter(event=>(event.repeatSourceId||event.id)===sourceId && !removeIds.has(event.id))
          .map(event=>({id:event.id,repeatUntil:event.repeatUntil||null}));
        const stopKey=recurrence.dateBefore(target.date);
        const removedExceptions=recurrence.trimExceptionsFrom('events',sourceId,target.date);

        removeIds.forEach(eventId=>recordTombstone('events',eventId));
        value.events=value.events.filter(event=>!removeIds.has(event.id));
        value.events.forEach(event=>{
          if((event.repeatSourceId||event.id)===sourceId) event.repeatUntil=stopKey;
        });

        return {
          mode:'future',
          removedCount:removed.length,
          undo(){
            const current=state();
            priorSnapshots.forEach(snapshot=>{
              const event=current.events.find(item=>item.id===snapshot.id);
              if(event) event.repeatUntil=snapshot.repeatUntil;
            });
            recurrence.restoreExceptions('events',sourceId,removedExceptions);
            removed.sort((a,b)=>a.index-b.index).forEach(({event,index:eventIndex})=>{
              clearTombstone('events',event.id);
              touchRecord(event,now());
              current.events.splice(Math.min(eventIndex,current.events.length),0,event);
            });
          }
        };
      }

      const removed=clone(target);
      const sourceId=recurring ? (target.repeatSourceId||target.id) : null;
      const exceptionAdded=recurring && target.date
        ? recurrence.addException('events',sourceId,target.date)
        : false;

      recordTombstone('events',target.id);
      value.events.splice(index,1);

      return {
        mode:'single',
        removedCount:1,
        undo(){
          const current=state();
          if(exceptionAdded) recurrence.removeException('events',sourceId,target.date);
          clearTombstone('events',removed.id);
          touchRecord(removed,now());
          current.events.splice(Math.min(index,current.events.length),0,removed);
        }
      };
    }

    return Object.freeze({
      createOccurrence,
      generateSeries,
      ensureThrough,
      createEvent,
      rename,
      deleteEvent
    });
  }

  window.ProductivityEventService={create};
})();
