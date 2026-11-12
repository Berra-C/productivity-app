(() => {
  'use strict';

  function layoutTimedItems(items=[]){
    const sorted=[...items].sort(
      (a,b)=>a.startMin-b.startMin || a.endMin-b.endMin
    );

    const result=[];
    let cluster=[];
    let clusterEnd=-1;

    function flushCluster(){
      if(!cluster.length) return;

      const columnEnds=[];

      cluster.forEach(item=>{
        let column=columnEnds.findIndex(end=>end<=item.startMin);

        if(column<0){
          column=columnEnds.length;
          columnEnds.push(item.endMin);
        }else{
          columnEnds[column]=item.endMin;
        }

        item.col=column;
      });

      const columns=Math.max(1,columnEnds.length);

      cluster.forEach(item=>{
        item.cols=columns;
        result.push(item);
      });

      cluster=[];
      clusterEnd=-1;
    }

    sorted.forEach(item=>{
      if(cluster.length && item.startMin>=clusterEnd){
        flushCluster();
      }

      cluster.push({...item});
      clusterEnd=Math.max(clusterEnd,item.endMin);
    });

    flushCluster();
    return result;
  }

  function buildMonth(options={}){
    const {
      viewDate,
      selectedDate,
      today,
      events=[],
      tasks=[],
      monthNames=[],
      addDays,
      dateKey,
      isMultiDayEvent,
      dayLevelForKey,
      eventColor,
      escapeHtml
    }=options;

    const year=viewDate.getFullYear();
    const month=viewDate.getMonth();
    const title=monthNames[month]+' '+year;
    const firstOfMonth=new Date(year,month,1);
    const startOffset=(firstOfMonth.getDay()+6)%7;
    const gridStart=addDays(firstOfMonth,-startOffset);
    const multiDayEvents=events.filter(isMultiDayEvent);

    let html='';

    for(let index=0;index<42;index+=1){
      const date=addDays(gridStart,index);
      const key=dateKey(date);
      const outside=date.getMonth()!==month;
      const level=outside?0:dayLevelForKey(key);
      const hasTask=tasks.some(task=>!task.done && task.dueDate===key);
      const singleDayEvents=events.filter(
        event=>!isMultiDayEvent(event) && event.date===key
      );
      const spanEvents=outside
        ? []
        : multiDayEvents.filter(event=>key>=event.date && key<=event.endDate);

      const classes=['cal-cell'];
      if(outside) classes.push('outside');
      if(key===today) classes.push('today');
      if(key===selectedDate) classes.push('selected');
      if(level>0) classes.push('level-'+level);

      let spanBars='';

      if(!outside){
        spanEvents.slice(0,2).forEach(event=>{
          const isStart=key===event.date;
          const isEnd=key===event.endDate;
          const isWeekStart=index%7===0;
          const showLabel=isStart || isWeekStart;
          const barClasses=['cal-span-bar'];

          if(isStart) barClasses.push('start');
          if(isEnd) barClasses.push('end');

          spanBars+='<div class="'+barClasses.join(' ')
            +'" style="background:'+eventColor(event)+'">'
            +(showLabel?escapeHtml(event.title):'')
            +'</div>';
        });
      }

      let eventLabel='';

      if(!outside && singleDayEvents.length){
        const extra=singleDayEvents.length>1
          ? ' +'+(singleDayEvents.length-1)
          : '';

        eventLabel='<span class="cal-event-label">'
          +escapeHtml(singleDayEvents[0].title)+extra+'</span>';
      }

      let dots='';

      if(!outside && (hasTask || (singleDayEvents.length && !spanEvents.length))){
        dots='<div class="cal-dot-row">'
          +(hasTask?'<span class="cal-dot task"></span>':'')
          +(singleDayEvents.length && !spanEvents.length
            ? '<span class="cal-dot event"></span>'
            : '')
          +'</div>';
      }

      html+='<div class="'+classes.join(' ')+'" data-date="'+key+'">'
        +'<span>'+date.getDate()+'</span>'
        +eventLabel+spanBars+dots
        +'</div>';
    }

    return {title,html};
  }

  function buildYear(options={}){
    const {
      viewDate,
      selectedDate,
      selectedMonth,
      today,
      events=[],
      monthNames=[],
      addDays,
      dateKey,
      isMultiDayEvent,
      dayLevelForKey,
      eventColor,
      escapeHtml
    }=options;

    const year=viewDate.getFullYear();
    const multiDayEvents=events.filter(isMultiDayEvent);
    let html='';

    for(let month=0;month<12;month+=1){
      const firstOfMonth=new Date(year,month,1);
      const startOffset=(firstOfMonth.getDay()+6)%7;
      const gridStart=addDays(firstOfMonth,-startOffset);
      let cellsHtml='';

      for(let index=0;index<42;index+=1){
        const date=addDays(gridStart,index);
        const key=dateKey(date);
        const outside=date.getMonth()!==month;

        if(outside){
          cellsHtml+='<div class="cal-mini-cell outside"></div>';
          continue;
        }

        const level=dayLevelForKey(key);
        const singleDayEvents=events.filter(
          event=>!isMultiDayEvent(event) && event.date===key
        );
        const spanEvents=multiDayEvents.filter(
          event=>key>=event.date && key<=event.endDate
        );

        const classes=['cal-mini-cell'];
        if(key===today) classes.push('today');
        if(!selectedMonth && key===selectedDate) classes.push('selected');
        if(level>0) classes.push('level-'+level);

        let eventMarks='';
        const bars=[];

        spanEvents.slice(0,2).forEach(event=>{
          const isStart=key===event.date;
          const isEnd=key===event.endDate;
          const barClasses=['cal-mini-bar'];

          if(isStart) barClasses.push('start');
          if(isEnd) barClasses.push('end');

          bars.push(
            '<div class="'+barClasses.join(' ')
            +'" style="--event-color:'+eventColor(event)
            +'" title="'+escapeHtml(event.title)+'"></div>'
          );
        });

        if(bars.length){
          eventMarks='<div class="cal-mini-event-stack">'
            +bars.join('')
            +'</div>';
        }else if(singleDayEvents.length){
          const event=singleDayEvents[0];
          eventMarks='<div class="cal-mini-single-event" style="--event-color:'
            +eventColor(event)+'" title="'+escapeHtml(event.title)+'"></div>';
        }

        cellsHtml+='<div class="'+classes.join(' ')+'" data-date="'+key+'">'
          +'<span>'+date.getDate()+'</span>'
          +eventMarks
          +'</div>';
      }

      const monthKey=year+'-'+String(month+1).padStart(2,'0');
      const monthClass='cal-mini-month'
        +(selectedMonth===monthKey?' selected':'');

      html+='<div class="'+monthClass+'" data-month="'+monthKey+'">'
        +'<div class="cal-mini-title">'+monthNames[month]+'</div>'
        +'<div class="cal-mini-grid">'+cellsHtml+'</div>'
        +'</div>';
    }

    return {
      title:String(year),
      html
    };
  }

  function buildWeek(options={}){
    const {
      viewDate,
      selectedDate,
      today,
      now=new Date(),
      events=[],
      tasks=[],
      calendarWorkIntervals=true,
      weekHourPx=48,
      startOfWeek,
      addDays,
      dateKey,
      weekTitle,
      pad,
      isMultiDayEvent,
      weeklyItemColor,
      escapeHtml,
      clockToMinutes,
      workIntervalsForDate,
      displayClockTime
    }=options;

    const start=startOfWeek(viewDate);
    const end=addDays(start,6);
    const days=Array.from({length:7},(_,index)=>addDays(start,index));
    const dayKeys=days.map(dateKey);
    const dayNames=['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];

    let head='<div class="cal-week-head-spacer"></div>';

    days.forEach((date,index)=>{
      const key=dayKeys[index];

      head+='<button class="cal-week-day-head'
        +(key===today?' today':'')
        +(key===selectedDate?' selected':'')
        +'" data-date="'+key+'"><span>'+dayNames[index]
        +'</span><b>'+date.getDate()+'</b></button>';
    });

    let allDay='<div class="cal-week-all-label">Tüm gün</div>';

    days.forEach((date,index)=>{
      const key=dayKeys[index];
      const items=[];

      events
        .filter(event=>isMultiDayEvent(event)
          ? key>=event.date && key<=event.endDate
          : event.date===key && !event.time)
        .forEach(event=>items.push({type:'event',item:event}));

      tasks
        .filter(task=>task.dueDate===key && !task.time)
        .forEach(task=>items.push({type:'task',item:task}));

      const chips=items.slice(0,3).map(entry=>{
        const color=weeklyItemColor(entry.item,entry.type);
        const label=entry.type==='event'?'📌 ':'✓ ';

        return '<button class="cal-week-all-chip '+entry.type
          +'" data-date="'+key
          +'" data-action="'+(entry.type==='task'?'focus-task':'view-event')
          +'" data-id="'+entry.item.id
          +'" style="--week-color:'+color
          +'" title="'+escapeHtml(entry.item.title||entry.item.text)+'">'
          +label+escapeHtml(entry.item.title||entry.item.text)
          +'</button>';
      }).join('');

      allDay+='<div class="cal-week-all-cell'
        +(key===selectedDate?' selected':'')
        +'" data-date="'+key+'">'
        +chips
        +(items.length>3?'<span class="cal-week-more">+'+(items.length-3)+'</span>':'')
        +'</div>';
    });

    let timeLabels='';

    for(let hour=0;hour<24;hour+=1){
      timeLabels+='<div class="cal-week-hour-label">'
        +pad(hour)+':00</div>';
    }

    let dayColumns='';

    days.forEach((date,index)=>{
      const key=dayKeys[index];
      let slots='';

      for(let hour=0;hour<24;hour+=1){
        slots+='<div class="cal-week-hour-slot" data-date="'
          +key+'" data-hour="'+hour+'"></div>';
      }

      const timed=[];

      events
        .filter(event=>!isMultiDayEvent(event) && event.date===key && event.time)
        .forEach(event=>{
          const startMin=clockToMinutes(event.time);
          if(startMin===null) return;

          const endCandidate=clockToMinutes(event.endTime);
          const endMin=endCandidate!==null && endCandidate>startMin
            ? endCandidate
            : Math.min(1440,startMin+45);

          timed.push({
            type:'event',
            item:event,
            time:event.time,
            startMin,
            endMin,
            cols:1
          });
        });

      tasks
        .filter(task=>task.dueDate===key && task.time)
        .forEach(task=>{
          const startMin=clockToMinutes(task.time);
          if(startMin===null) return;

          timed.push({
            type:'task',
            item:task,
            time:task.time,
            startMin,
            endMin:Math.min(1440,startMin+30),
            cols:1
          });
        });

      if(calendarWorkIntervals!==false){
        workIntervalsForDate(key).forEach(block=>{
          timed.push({
            type:'work',
            item:block,
            time:displayClockTime(block.start),
            startMin:block.startMin,
            endMin:block.endMin,
            cols:1
          });
        });
      }

      const laidOut=layoutTimedItems(timed);

      const blocks=laidOut.map((entry,indexValue)=>{
        const top=(entry.startMin/60)*weekHourPx;
        const height=Math.max(
          20,
          ((entry.endMin-entry.startMin)/60)*weekHourPx-2
        );

        const color=entry.type==='work'
          ? entry.item.color
          : weeklyItemColor(entry.item,entry.type);

        const label=entry.type==='work'
          ? 'Çalışma · '+entry.item.subject
          : (entry.item.title||entry.item.text);

        const widthPercent=100/Math.max(1,entry.cols);
        const leftPercent=entry.col*widthPercent;

        const timeLabel=entry.type==='work'
          ? displayClockTime(entry.item.start)+'–'+displayClockTime(entry.item.end)
          : entry.type==='event' && entry.item.endTime
            ? entry.time+'–'+entry.item.endTime
            : entry.time;

        if(entry.type==='work'){
          return '<div class="cal-week-timed-item work-session" style="top:'
            +top+'px;height:'+height+'px;left:calc('+leftPercent
            +'% + 2px);right:auto;width:calc('+widthPercent
            +'% - 4px);--week-color:'+color+';z-index:'+(3+indexValue)
            +'" title="'+escapeHtml(
              timeLabel+' · '+label
              +(entry.item.legacyApprox?' · eski kayıt, yaklaşık saat':'')
            )+'"><span>'+escapeHtml(timeLabel)+'</span>'
            +escapeHtml(label)+'</div>';
        }

        return '<button class="cal-week-timed-item '+entry.type
          +'" data-date="'+key
          +'" data-action="'+(entry.type==='task'?'focus-task':'view-event')
          +'" data-id="'+entry.item.id
          +'" style="top:'+top+'px;height:'+height
          +'px;left:calc('+leftPercent
          +'% + 2px);right:auto;width:calc('+widthPercent
          +'% - 4px);--week-color:'+color
          +';z-index:'+(3+indexValue)
          +'" title="'+escapeHtml(timeLabel+' · '+label)+'"><span>'
          +escapeHtml(timeLabel)+'</span>'+escapeHtml(label)+'</button>';
      }).join('');

      let nowLine='';

      if(key===today){
        const nowMinutes=now.getHours()*60+now.getMinutes();
        nowLine='<div class="cal-week-now-line" style="top:'
          +((nowMinutes/60)*weekHourPx)+'px"></div>';
      }

      dayColumns+='<div class="cal-week-day-column'
        +(key===today?' today':'')
        +(key===selectedDate?' selected':'')
        +'" data-date="'+key+'">'
        +slots+blocks+nowLine+'</div>';
    });

    const html='<div class="cal-week-scroll"><div class="cal-week-surface">'
      +'<div class="cal-week-head">'+head+'</div>'
      +'<div class="cal-week-all-day">'+allDay+'</div>'
      +'<div class="cal-week-body"><div class="cal-week-time-col">'
      +timeLabels+'</div><div class="cal-week-days">'+dayColumns+'</div></div>'
      +'</div></div>';

    return {
      title:weekTitle(start,end),
      html,
      initialScrollTop:Math.max(0,now.getHours()*weekHourPx-120)
    };
  }

  function buildAgenda(options={}){
    const {
      viewMode,
      selectedMonth,
      selectedDate,
      data={},
      monthNames=[],
      eventColors=[],
      addType='task',
      multiDay=false,
      eventRepeat='none',
      eventRepeatDays=[],
      taskHasTime=false,
      dateKey,
      isMultiDayEvent,
      renderMonthEventCard,
      displayDate,
      focusScoreStats,
      scheduledStudyStats,
      formatDurationLabel,
      workIntervalsForDate,
      displayClockTime,
      escapeHtml,
      renderEventCard,
      renderTaskCard
    }=options;

    if(viewMode==='year' && selectedMonth){
      const parts=selectedMonth.split('-');
      const year=Number(parts[0]);
      const month=Number(parts[1])-1;
      const monthStart=year+'-'+String(month+1).padStart(2,'0')+'-01';
      const monthEndDate=new Date(year,month+1,0);
      const monthEnd=dateKey(monthEndDate);

      const eventsForMonth=(data.events||[])
        .filter(event=>{
          const end=isMultiDayEvent(event)?event.endDate:event.date;
          return event.date<=monthEnd && end>=monthStart;
        })
        .sort(
          (a,b)=>a.date.localeCompare(b.date)
            || (a.time||'99:99').localeCompare(b.time||'99:99')
        );

      const itemsHtml=eventsForMonth.length
        ? eventsForMonth.map(renderMonthEventCard).join('')
        : '<div class="task-empty">Bu ay planlanmış etkinlik yok.</div>';

      return '<div class="cal-agenda-date">'+monthNames[month]+' '+year+'</div>'
        +'<div class="cal-agenda-stats"><span>📌 <b>'
        +eventsForMonth.length+'</b> etkinlik</span></div>'
        +itemsHtml;
    }

    const key=selectedDate;
    const label=displayDate(key);
    const day=data.days?.[key];

    const tasksForDay=(data.tasks||[])
      .filter(task=>task.dueDate===key);

    const eventsForDay=(data.events||[])
      .filter(event=>isMultiDayEvent(event)
        ? key>=event.date && key<=event.endDate
        : event.date===key)
      .sort(
        (a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99')
      );

    const dailyFocus=focusScoreStats([key]);
    const dailySchedule=scheduledStudyStats([key]);

    const statsHtml='<div class="cal-agenda-stats">'
      +'<span>⏱ <b>'+(day?formatDurationLabel(day.workSeconds):'0 dk')+'</b> çalışma</span>'
      +'<span>😕 <b>'+(day?day.distraction:0)+'</b> dikkat dağınıklığı</span>'
      +(dailyFocus.average!==null
        ? '<span>🧠 <b>'+dailyFocus.average+'/100</b> odak</span>'
        : '')
      +'</div>';

    let workTimelineHtml='';

    if(data.calendarWorkIntervals!==false){
      const intervals=workIntervalsForDate(key);

      if(intervals.length){
        const chips=intervals.map(block=>{
          const timeLabel=displayClockTime(block.start)
            +'–'+displayClockTime(block.end);

          return '<div class="cal-work-chip" style="--work-color:'
            +block.color+'"><span class="cal-work-dot"></span><b>'
            +escapeHtml(timeLabel)+'</b><span>'
            +escapeHtml(block.subject)+'</span>'
            +(block.legacyApprox?'<em>yaklaşık</em>':'')
            +'</div>';
        }).join('');

        const bars=intervals.map(block=>{
          const left=(block.startMin/1440)*100;
          const width=Math.max(
            0.35,
            ((block.endMin-block.startMin)/1440)*100
          );

          return '<span class="cal-work-day-bar" style="left:'
            +left+'%;width:'+width+'%;--work-color:'+block.color
            +'" title="'+escapeHtml(
              displayClockTime(block.start)+'–'
              +displayClockTime(block.end)+' · '+block.subject
            )+'"></span>';
        }).join('');

        workTimelineHtml='<div class="cal-work-timeline">'
          +'<div class="cal-work-timeline-head"><b>Çalışma zamanları</b><span>Timer’ın gerçekten çalıştığı aralıklar</span></div>'
          +'<div class="cal-work-day-track">'+bars
          +'<i style="left:25%">06</i><i style="left:50%">12</i><i style="left:75%">18</i></div>'
          +'<div class="cal-work-chip-list">'+chips+'</div></div>';
      }
    }

    let scheduleCompareHtml='';

    if(dailySchedule.matchedEvents){
      scheduleCompareHtml='<div class="cal-plan-compare">'
        +'<div class="cal-work-timeline-head"><b>Planlanan / gerçekleşen</b><span>Takvimdeki saatli çalışma planlarıyla timer eşleşmesi</span></div>'
        +'<div class="planning-row"><span>Planlanan</span><b>'+formatDurationLabel(dailySchedule.planned)+'</b></div>'
        +'<div class="planning-row"><span>Gerçekleşen</span><b>'+formatDurationLabel(dailySchedule.actual)+'</b></div>'
        +'<div class="planning-row"><span>Uyum</span><b>%'+dailySchedule.adherence+'</b></div>'
        +'</div>';
    }

    let itemsHtml='';

    if(eventsForDay.length){
      itemsHtml+=eventsForDay.map(renderEventCard).join('');
    }

    if(tasksForDay.length){
      itemsHtml+=tasksForDay.map(renderTaskCard).join('');
    }

    if(!itemsHtml){
      itemsHtml='<div class="task-empty">Bu güne planlanmış görev ya da etkinlik yok.</div>';
    }

    const optionsHtml=addType==='event'
      ? '<label class="cal-check-row"><input type="checkbox" id="calMultiDayToggle"'
        +(multiDay?' checked':'')+'> Birden fazla gün sürer</label>'
        +(!multiDay
          ? '<div class="cal-repeat-row"><select id="calEventRepeatInput" class="task-repeat-select" aria-label="Etkinlik tekrarı">'
            +'<option value="none"'+(eventRepeat==='none'?' selected':'')+'>Tekrar yok</option>'
            +'<option value="daily"'+(eventRepeat==='daily'?' selected':'')+'>Her gün</option>'
            +'<option value="weekly"'+(eventRepeat==='weekly'?' selected':'')+'>Her hafta</option>'
            +'<option value="monthly"'+(eventRepeat==='monthly'?' selected':'')+'>Her ay</option>'
            +'</select></div>'
            +(eventRepeat==='weekly'
              ? '<div class="task-repeat-days show cal-event-repeat-days" id="calEventRepeatDays">'
                +[1,2,3,4,5,6,0].map((day,index)=>{
                  const labels=['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
                  return '<button type="button" data-event-repeat-day="'+day
                    +'" class="'+(eventRepeatDays.includes(day)?'active':'')
                    +'">'+labels[index]+'</button>';
                }).join('')
                +'</div>'
              : '')
          : '')
      : '<label class="cal-check-row"><input type="checkbox" id="calTaskTimeToggle"'
        +(taskHasTime?' checked':'')+'> Belirli bir saati var</label>';

    let datesRowHtml='<div class="cal-add-dates-row"><input type="date" class="cal-date-input" id="calAddDateInput" value="'+key+'">';

    if(addType==='event' && multiDay){
      datesRowHtml+='<input type="date" class="cal-date-input" id="calAddEndDateInput" value="'+key+'">';
    }else if(addType==='event' && !multiDay){
      datesRowHtml+='<input type="text" class="cal-time-input time-24-input" id="calAddTimeInput" inputmode="numeric" maxlength="5" placeholder="HH:MM" aria-label="Başlangıç saati, 24 saat formatı">'
        +'<input type="text" class="cal-time-input time-24-input" id="calAddEndTimeInput" inputmode="numeric" maxlength="5" placeholder="HH:MM" aria-label="Bitiş saati, 24 saat formatı">';
    }else if(addType==='task' && taskHasTime){
      datesRowHtml+='<input type="text" class="cal-time-input time-24-input" id="calAddTimeInput" inputmode="numeric" maxlength="5" placeholder="HH:MM" aria-label="Görev saati, 24 saat formatı">';
    }

    datesRowHtml+='</div>';

    return '<div class="cal-agenda-date">'+label+'</div>'
      +statsHtml
      +workTimelineHtml
      +scheduleCompareHtml
      +itemsHtml
      +'<div class="cal-add-type-row">'
      +'<button class="add-type-btn'+(addType==='task'?' active':'')+'" data-add-type="task">✅ Görev</button>'
      +'<button class="add-type-btn'+(addType==='event'?' active':'')+'" data-add-type="event">📌 Etkinlik</button>'
      +'</div>'
      +optionsHtml
      +datesRowHtml
      +(addType==='event'
        ? '<div class="cal-event-color-row"><span class="cal-event-color-label">Etkinlik rengi</span>'
          +'<div class="event-color-palette">'
          +eventColors.map((color,index)=>
            '<button type="button" class="event-color-swatch'
            +(index===0?' active':'')
            +'" data-event-color="'+color
            +'" style="--swatch:'+color
            +'" aria-label="'+color+'"></button>'
          ).join('')
          +'<label class="event-color-custom" title="Özel renk">＋<input type="color" id="calEventColorInput" value="'+eventColors[0]+'"></label>'
          +'</div></div>'
        : '')
      +'<div class="cal-add-row">'
      +'<input type="text" class="cal-add-input" id="calAddInput" placeholder="'
      +(addType==='event'?'Etkinlik adı...':'Görev adı...')
      +'">'
      +'<button class="cal-add-btn" id="calAddBtn">+</button>'
      +'</div>'
      +(addType==='event'
        ? '<textarea class="event-detail-description cal-event-description-input" id="calEventDescriptionInput" maxlength="600" placeholder="Açıklama (isteğe bağlı)..."></textarea>'
        : '');
  }

  window.ProductivityCalendarView={
    layoutTimedItems,
    buildMonth,
    buildYear,
    buildWeek,
    buildAgenda
  };
})();
