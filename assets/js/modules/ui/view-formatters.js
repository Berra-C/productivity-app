(() => {
  'use strict';

  function pad(value){
    return String(value).padStart(2,'0');
  }

  function formatDurationLabel(seconds){
    const mins=Math.floor((Number(seconds)||0)/60);
    if(mins<60) return mins+' dk';
    const hours=Math.floor(mins/60);
    const remaining=mins%60;
    return remaining===0 ? hours+' sa' : hours+'sa '+remaining+'dk';
  }

  function formatMinutes(seconds){
    const mins=Math.round((Number(seconds)||0)/60);
    if(mins<60) return mins+' dk';
    const hours=Math.floor(mins/60);
    const remaining=mins%60;
    return hours+'s '+remaining+'dk';
  }

  function displayDate(value){
    if(!value) return '';

    let date;

    if(value instanceof Date){
      date=value;
    }else if(/^\d{4}-\d{2}-\d{2}$/.test(String(value))){
      const parts=String(value).split('-');
      return parts[2]+'-'+parts[1]+'-'+parts[0].slice(-2);
    }else{
      date=new Date(value);
    }

    if(Number.isNaN(date.getTime())) return String(value);

    return pad(date.getDate())
      +'-'+pad(date.getMonth()+1)
      +'-'+String(date.getFullYear()).slice(-2);
  }

  function displayClockTime(value){
    if(!value) return '';
    const date=new Date(value);
    if(Number.isNaN(date.getTime())) return '';
    return pad(date.getHours())+':'+pad(date.getMinutes());
  }

  function trendArrowHtml(current,previous){
    const cur=Number(current)||0;
    const prev=Number(previous)||0;

    if(prev===0 && cur===0) return '<span class="trend-flat">—</span>';
    if(prev===0) return '<span class="trend-up">▲ yeni</span>';

    const diff=Math.round((cur-prev)/prev*100);

    if(diff>4) return '<span class="trend-up">▲ %'+diff+'</span>';
    if(diff<-4) return '<span class="trend-down">▼ %'+Math.abs(diff)+'</span>';

    return '<span class="trend-flat">— aynı</span>';
  }

  function distractionTrendHtml(current,previous){
    const cur=Number(current)||0;
    const prev=Number(previous)||0;

    if(prev===0 && cur===0) return '<span class="trend-flat">—</span>';
    if(prev===0 && cur>0) return '<span class="trend-down">▲ yeni</span>';
    if(prev>0 && cur===0) return '<span class="trend-up">▼ %100</span>';

    const diff=Math.round((cur-prev)/prev*100);

    if(diff>4) return '<span class="trend-down">▲ %'+diff+'</span>';
    if(diff<-4) return '<span class="trend-up">▼ %'+Math.abs(diff)+'</span>';

    return '<span class="trend-flat">— aynı</span>';
  }

  function weekTitle(start,end,monthNames=[]){
    const sameMonth=start.getMonth()===end.getMonth()
      && start.getFullYear()===end.getFullYear();
    const sameYear=start.getFullYear()===end.getFullYear();

    if(sameMonth){
      return start.getDate()+'–'+end.getDate()+' '
        +monthNames[start.getMonth()]+' '+start.getFullYear();
    }

    if(sameYear){
      return start.getDate()+' '+monthNames[start.getMonth()]
        +' – '+end.getDate()+' '+monthNames[end.getMonth()]
        +' '+start.getFullYear();
    }

    return start.getDate()+' '+monthNames[start.getMonth()]+' '+start.getFullYear()
      +' – '+end.getDate()+' '+monthNames[end.getMonth()]+' '+end.getFullYear();
  }

  window.ProductivityViewFormatters={
    pad,
    formatDurationLabel,
    formatMinutes,
    displayDate,
    displayClockTime,
    trendArrowHtml,
    distractionTrendHtml,
    weekTitle
  };
})();
