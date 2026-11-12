(() => {
  'use strict';

  function dayBounds(key){
    const startDate=new Date(key+'T00:00:00');
    const dayStart=startDate.getTime();

    if(!Number.isFinite(dayStart)){
      return null;
    }

    const endDate=new Date(startDate);
    endDate.setDate(endDate.getDate()+1);

    return {
      start:dayStart,
      end:endDate.getTime()
    };
  }

  function projectWorkIntervalsForDate(key,options={}){
    const bounds=dayBounds(key);
    if(!bounds) return [];

    const sessionLog=options.sessionLog || {};
    const intervalsForSession=typeof options.intervalsForSession==='function'
      ? options.intervalsForSession
      : ()=>[];
    const colorForSession=typeof options.colorForSession==='function'
      ? options.colorForSession
      : ()=>'#000';

    const output=[];

    Object.values(sessionLog).forEach(list=>{
      if(!Array.isArray(list)) return;

      list.forEach(session=>{
        (intervalsForSession(session)||[]).forEach(interval=>{
          const intervalStart=Number(interval?.start);
          const intervalEnd=Number(interval?.end);

          if(
            !Number.isFinite(intervalStart) ||
            !Number.isFinite(intervalEnd)
          ){
            return;
          }

          const start=Math.max(bounds.start,intervalStart);
          const end=Math.min(bounds.end,intervalEnd);

          if(end<=start) return;

          output.push({
            sessionId:session?.id,
            subject:session?.subject && session.subject!=='Genel'
              ? session.subject
              : (session?.name||'Ã‡alÄ±ÅŸma'),
            start,
            end,
            startMin:(start-bounds.start)/60000,
            endMin:(end-bounds.start)/60000,
            color:colorForSession(session),
            legacyApprox:Boolean(interval?.legacyApprox)
          });
        });
      });
    });

    return output.sort((a,b)=>a.start-b.start);
  }

  window.ProductivityCalendarCore={
    dayBounds,
    projectWorkIntervalsForDate
  };
})();
