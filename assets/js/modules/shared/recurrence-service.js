(() => {
  'use strict';

  function normalizeDays(days=[]){
    return [...new Set((days||[]).map(Number).filter(day=>day>=0 && day<=6))]
      .sort((a,b)=>a-b);
  }

  function create(options={}){
    const getState=options.getState;
    const dateKey=options.dateKey;

    if(typeof getState!=='function') throw new Error('RecurrenceService getState gerekli');
    if(typeof dateKey!=='function') throw new Error('RecurrenceService dateKey gerekli');

    function state(){
      const value=getState();
      if(!value || typeof value!=='object') throw new Error('RecurrenceService state gerekli');
      return value;
    }

    function bucket(kind){
      const value=state();
      if(!value.recurrenceExceptions || typeof value.recurrenceExceptions!=='object' || Array.isArray(value.recurrenceExceptions)){
        value.recurrenceExceptions={tasks:{},events:{}};
      }
      if(!value.recurrenceExceptions[kind] || typeof value.recurrenceExceptions[kind]!=='object' || Array.isArray(value.recurrenceExceptions[kind])){
        value.recurrenceExceptions[kind]={};
      }
      return value.recurrenceExceptions[kind];
    }

    function nextDate(dateStr,repeat,repeatDays=[],repeatAnchorDay=null){
      if(!dateStr || repeat==='none') return null;
      const d=new Date(dateStr+'T12:00:00');
      if(Number.isNaN(d.getTime())) return null;

      if(repeat==='daily'){
        d.setDate(d.getDate()+1);
      }else if(repeat==='weekly'){
        const days=normalizeDays(repeatDays);
        if(days.length){
          for(let step=1;step<=7;step+=1){
            const candidate=new Date(d);
            candidate.setDate(d.getDate()+step);
            if(days.includes(candidate.getDay())) return dateKey(candidate);
          }
          return null;
        }
        d.setDate(d.getDate()+7);
      }else if(repeat==='monthly'){
        const anchor=Number.isFinite(Number(repeatAnchorDay)) && Number(repeatAnchorDay)>=1 && Number(repeatAnchorDay)<=31
          ? Number(repeatAnchorDay)
          : d.getDate();
        d.setDate(1);
        d.setMonth(d.getMonth()+1);
        const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
        d.setDate(Math.min(anchor,last));
      }else{
        return null;
      }

      return dateKey(d);
    }

    function dateBefore(key){
      const d=new Date(key+'T12:00:00');
      if(Number.isNaN(d.getTime())) return null;
      d.setDate(d.getDate()-1);
      return dateKey(d);
    }

    function allowsDate(repeatUntil,nextDateValue){
      return !repeatUntil || !nextDateValue || nextDateValue<=repeatUntil;
    }

    function isException(kind,sourceId,dateValue){
      if(!sourceId || !dateValue) return false;
      const values=bucket(kind)[sourceId];
      return Array.isArray(values) && values.includes(dateValue);
    }

    function addException(kind,sourceId,dateValue){
      if(!sourceId || !dateValue) return false;
      const exceptions=bucket(kind);
      const current=Array.isArray(exceptions[sourceId]) ? exceptions[sourceId] : [];
      if(current.includes(dateValue)) return false;
      exceptions[sourceId]=[...current,dateValue].sort();
      return true;
    }

    function removeException(kind,sourceId,dateValue){
      if(!sourceId || !dateValue) return false;
      const exceptions=bucket(kind);
      if(!Array.isArray(exceptions[sourceId])) return false;
      const next=exceptions[sourceId].filter(value=>value!==dateValue);
      if(next.length===exceptions[sourceId].length) return false;
      if(next.length) exceptions[sourceId]=next;
      else delete exceptions[sourceId];
      return true;
    }

    function trimExceptionsFrom(kind,sourceId,startDate){
      if(!sourceId || !startDate) return [];
      const exceptions=bucket(kind);
      const current=Array.isArray(exceptions[sourceId]) ? [...exceptions[sourceId]] : [];
      const removed=current.filter(value=>value>=startDate);
      const kept=current.filter(value=>value<startDate);
      if(kept.length) exceptions[sourceId]=kept;
      else delete exceptions[sourceId];
      return removed;
    }

    function restoreExceptions(kind,sourceId,dates){
      if(!sourceId || !Array.isArray(dates) || !dates.length) return false;
      const exceptions=bucket(kind);
      exceptions[sourceId]=[...new Set([...(exceptions[sourceId]||[]),...dates])].sort();
      return true;
    }

    function itemsFrom(items,item,dateField){
      if(!item) return [];
      const sourceId=item.repeatSourceId || item.id;
      const startDate=item[dateField];
      if(!sourceId || !startDate) return [];
      return (items||[]).filter(candidate=>(candidate.repeatSourceId||candidate.id)===sourceId
        && candidate[dateField]
        && candidate[dateField]>=startDate);
    }

    function seriesItems(items,item,dateField,scope){
      if(!item) return [];
      if(scope==='single') return [item];
      const sourceId=item.repeatSourceId || item.id;
      if(scope==='all'){
        return (items||[]).filter(candidate=>(candidate.repeatSourceId||candidate.id)===sourceId);
      }
      return itemsFrom(items,item,dateField);
    }

    function hasOccurrence(items,sourceId,dateField,dateValue){
      return (items||[]).some(item=>(item.repeatSourceId||item.id)===sourceId && item[dateField]===dateValue);
    }

    return Object.freeze({
      normalizeDays,
      bucket,
      nextDate,
      dateBefore,
      allowsDate,
      isException,
      addException,
      removeException,
      trimExceptionsFrom,
      restoreExceptions,
      itemsFrom,
      seriesItems,
      hasOccurrence
    });
  }

  window.ProductivityRecurrenceService={create,normalizeDays};
})();
