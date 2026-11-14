(() => {
  'use strict';

  function buildMetricChart({
    labels=[],
    values=[],
    chartType='bar',
    goalMinutes=0
  }={}){
    const chartW=680;
    const barAreaBottom=148;
    const barAreaTop=16;
    const labelY=168;
    const gap=10;
    const safeValues=Array.isArray(values)?values:[];
    const safeLabels=Array.isArray(labels)?labels:[];
    const max=Math.max(...safeValues,Number(goalMinutes)||0,1);
    const count=safeValues.length;

    if(chartType==='line'){
      const stepX=count>1?(chartW-gap*2)/(count-1):0;
      const points=safeValues.map((value,index)=>{
        const x=gap+index*stepX;
        const y=barAreaBottom-(value/max)*(barAreaBottom-barAreaTop);
        return {x,y,v:value};
      });

      if(!points.length) return '';

      const linePath=points.map(
        (point,index)=>(index===0?'M':'L')
          +point.x.toFixed(1)+','+point.y.toFixed(1)
      ).join(' ');

      const areaPath=linePath
        +' L'+points[points.length-1].x.toFixed(1)+','+barAreaBottom
        +' L'+points[0].x.toFixed(1)+','+barAreaBottom+' Z';

      let svg='<defs><linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">'
        +'<stop offset="0%" stop-color="var(--moss-bright)" stop-opacity="0.35"/>'
        +'<stop offset="100%" stop-color="var(--moss-bright)" stop-opacity="0"/>'
        +'</linearGradient><pattern id="goalStripe" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="var(--gold)" stroke-width="2"/></pattern></defs>';

      svg+='<path d="'+areaPath+'" fill="url(#lineAreaGrad)" stroke="none"></path>';
      svg+='<path class="chart-line" d="'+linePath+'" fill="none" stroke="var(--moss-bright)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>';

      points.forEach((point,index)=>{
        const isLast=index===points.length-1;
        svg+='<circle class="line-point" cx="'+point.x.toFixed(1)
          +'" cy="'+point.y.toFixed(1)+'" r="3.5" fill="'
          +(isLast?'var(--gold)':'var(--moss-bright)')
          +'"><title>'+safeLabels[index]+': '+point.v+'</title></circle>';

        svg+='<text x="'+point.x.toFixed(1)+'" y="'+labelY
          +'" text-anchor="middle" font-size="9" fill="var(--paper-dim)" font-family="IBM Plex Mono, monospace">'
          +safeLabels[index]+'</text>';

        if(point.v>0){
          svg+='<text x="'+point.x.toFixed(1)+'" y="'+(point.y-8)
            +'" text-anchor="middle" font-size="8.5" fill="var(--paper-dim)" font-family="IBM Plex Mono, monospace">'
            +point.v+'</text>';
        }
      });

      if(goalMinutes>0){
        const goalY=barAreaBottom-(goalMinutes/max)*(barAreaBottom-barAreaTop);
        svg+='<line x1="0" y1="'+goalY+'" x2="'+chartW+'" y2="'+goalY
          +'" stroke="url(#goalStripe)" stroke-width="4"><title>Günlük hedef: '
          +goalMinutes+' dk</title></line>';
      }

      return svg;
    }

    if(!count) return '';

    const barWidth=(chartW-gap*(count+1))/count;
    let bars='<defs><pattern id="goalStripeBar" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="var(--gold)" stroke-width="2"/></pattern></defs>';

    safeValues.forEach((value,index)=>{
      const height=(value/max)*(barAreaBottom-barAreaTop);
      const x=gap+index*(barWidth+gap);
      const y=barAreaBottom-height;
      const isLast=index===count-1;
      const color=isLast?'var(--gold)':'var(--moss-bright)';

      bars+='<rect class="chart-bar" x="'+x+'" y="'+y
        +'" width="'+barWidth+'" height="'+Math.max(height,1.5)
        +'" rx="3" fill="'+color+'"><title>'
        +safeLabels[index]+': '+value+'</title></rect>';

      bars+='<text x="'+(x+barWidth/2)+'" y="'+labelY
        +'" text-anchor="middle" font-size="9" fill="var(--paper-dim)" font-family="IBM Plex Mono, monospace">'
        +safeLabels[index]+'</text>';

      if(value>0){
        bars+='<text x="'+(x+barWidth/2)+'" y="'+(y-4)
          +'" text-anchor="middle" font-size="8.5" fill="var(--paper-dim)" font-family="IBM Plex Mono, monospace">'
          +value+'</text>';
      }
    });

    if(goalMinutes>0){
      const goalY=barAreaBottom-(goalMinutes/max)*(barAreaBottom-barAreaTop);
      bars+='<line x1="0" y1="'+goalY+'" x2="'+chartW+'" y2="'+goalY
        +'" stroke="url(#goalStripeBar)" stroke-width="4"><title>Günlük hedef: '
        +goalMinutes+' dk</title></line>';
    }

    return bars;
  }

  function buildSubjectChart({
    labels=[],
    subjects=[],
    perSlot=[],
    chartType='bar',
    subjectColor=()=> '#7d8f88',
    escapeHtml=value=>String(value)
  }={}){
    const chartW=680;
    const barAreaBottom=148;
    const barAreaTop=16;
    const labelY=168;
    const gap=10;
    const count=labels.length;

    if(!subjects.length){
      return {
        svg:'<text x="340" y="88" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="IBM Plex Sans, sans-serif">Bu dönemde ders kaydı yok</text>',
        legend:''
      };
    }

    const totalsPerSlot=perSlot.map(
      totals=>subjects.reduce(
        (sum,subject)=>sum+(totals[subject]||0),
        0
      )
    );

    const max=Math.max(...totalsPerSlot,1);
    let svg='';

    if(chartType==='line'){
      const stepX=count>1?(chartW-gap*2)/(count-1):0;

      subjects.forEach(subject=>{
        const color=subjectColor(subject);

        const points=perSlot.map((totals,index)=>{
          const value=totals[subject]||0;
          const x=gap+index*stepX;
          const y=barAreaBottom-(value/max)*(barAreaBottom-barAreaTop);
          return {x,y,v:value};
        });

        const linePath=points.map(
          (point,index)=>(index===0?'M':'L')
            +point.x.toFixed(1)+','+point.y.toFixed(1)
        ).join(' ');

        svg+='<path class="chart-line" d="'+linePath
          +'" fill="none" stroke="'+color
          +'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"></path>';

        points.forEach(point=>{
          if(point.v>0){
            svg+='<circle class="line-point" cx="'+point.x.toFixed(1)
              +'" cy="'+point.y.toFixed(1)+'" r="2.8" fill="'+color
              +'"><title>'+escapeHtml(subject)+': '+point.v+' dk</title></circle>';
          }
        });
      });

      for(let index=0;index<count;index+=1){
        const x=gap+index*stepX;
        svg+='<text x="'+x.toFixed(1)+'" y="'+labelY
          +'" text-anchor="middle" font-size="9" fill="var(--paper-dim)" font-family="IBM Plex Mono, monospace">'
          +labels[index]+'</text>';
      }
    }else{
      const barWidth=(chartW-gap*(count+1))/Math.max(1,count);

      perSlot.forEach((totals,index)=>{
        const x=gap+index*(barWidth+gap);
        let yCursor=barAreaBottom;

        subjects.forEach(subject=>{
          const value=totals[subject]||0;
          if(value<=0) return;

          const height=(value/max)*(barAreaBottom-barAreaTop);
          yCursor-=height;

          svg+='<rect class="chart-bar" x="'+x+'" y="'+yCursor.toFixed(1)
            +'" width="'+barWidth+'" height="'+height.toFixed(1)
            +'" fill="'+subjectColor(subject)+'"><title>'
            +escapeHtml(subject)+': '+value+' dk</title></rect>';
        });

        svg+='<text x="'+(x+barWidth/2)+'" y="'+labelY
          +'" text-anchor="middle" font-size="9" fill="var(--paper-dim)" font-family="IBM Plex Mono, monospace">'
          +labels[index]+'</text>';
      });
    }

    const legend=subjects.map(subject=>
      '<div class="chart-legend-item"><span class="chart-legend-dot" style="background:'
      +subjectColor(subject)+'"></span>'+escapeHtml(subject)+'</div>'
    ).join('');

    return {svg,legend};
  }

  function buildSessionAnalytics(stats,{
    pad=value=>String(value).padStart(2,'0'),
    formatDurationLabel=value=>String(value)
  }={}){
    if(!stats?.sessionCount){
      return '<div class="todo-empty">Bu dönemde henüz oturum kaydı yok.</div>';
    }

    const bestLabel=stats.bestHour>=0
      ? pad(stats.bestHour)+':00–'+pad((stats.bestHour+1)%24)+':00'
      : '—';

    const longestLabel=stats.longest
      ? formatDurationLabel(stats.longest.seconds)
      : '—';

    const shownHours=[0,2,4,6,8,10,12,14,16,18,20,22];
    const pairTotals=shownHours.map(
      hour=>stats.hourly[hour].seconds+stats.hourly[hour+1].seconds
    );
    const maxHour=Math.max(...pairTotals,1);

    const bars=shownHours.map((hour,index)=>{
      const bucketSeconds=pairTotals[index];
      const height=Math.max(
        bucketSeconds>0?5:2,
        Math.round(bucketSeconds/maxHour*92)
      );
      const isBest=stats.bestHour===hour || stats.bestHour===hour+1;
      const title=pad(hour)+':00–'+pad((hour+2)%24)+':00 · '
        +formatDurationLabel(bucketSeconds);

      return '<div class="hour-col'+(isBest?' best':'')+'" title="'+title+'">'
        +'<div class="hour-bar-wrap"><div class="hour-bar" style="height:'+height+'%"></div></div>'
        +'<span class="hour-label">'+pad(hour)+'</span>'
        +'</div>';
    }).join('');

    return '<div class="session-analytics-grid">'
      +'<div class="session-analytics-stat"><div class="k">Ortalama Oturum</div><div class="v">'+formatDurationLabel(stats.avgSeconds)+'</div></div>'
      +'<div class="session-analytics-stat"><div class="k">En Uzun Oturum</div><div class="v">'+longestLabel+'</div></div>'
      +'<div class="session-analytics-stat"><div class="k">En Verimli Başlangıç</div><div class="v">'+bestLabel+'</div></div>'
      +'<div class="session-analytics-stat"><div class="k">Aktif Gün</div><div class="v">'+stats.activeDays+'</div></div>'
      +'<div class="session-analytics-stat"><div class="k">Zaman Damgalı Oturum</div><div class="v">'+stats.timedSessions+' / '+stats.sessionCount+'</div></div>'
      +'<div class="session-analytics-stat"><div class="k">Toplam Oturum</div><div class="v">'+stats.sessionCount+'</div></div>'
      +'</div>'
      +'<div class="hour-analytics">'+bars+'</div>'
      +'<div class="hour-analytics-note">Saat grafiği oturumların <b>başlangıç saatine</b> göre gruplandırılır. Eski kayıtlarda başlangıç saati yoksa bu grafiğe dahil edilmez.</div>';
  }

  function buildSubjectBreakdown(breakdown=[],{
    escapeHtml=value=>String(value),
    formatDurationLabel=value=>String(value)
  }={}){
    if(!breakdown.length){
      return '<div class="todo-empty">Bu dönemde henüz çalışma kaydı yok.</div>';
    }

    const max=Math.max(1,breakdown[0][1].seconds);

    return breakdown.map(([subject,stats])=>{
      const percent=Math.max(4,Math.round(stats.seconds/max*100));
      const average=stats.sessions
        ? Math.round(stats.seconds/stats.sessions)
        : 0;
      const avgDistraction=stats.sessions
        ? (stats.distractions/stats.sessions).toFixed(1)
        : '0.0';
      const targetRate=stats.targetSessions
        ? Math.round(stats.reachedTargets/stats.targetSessions*100)+'% hedef'
        : 'hedef verisi yok';

      return '<div class="subject-row">'
        +'<div class="subject-row-top"><span>'+escapeHtml(subject)
        +'</span><span>'+formatDurationLabel(stats.seconds)+'</span></div>'
        +'<div class="subject-bar-bg"><div class="subject-bar-fill" style="width:'+percent+'%"></div></div>'
        +'<div class="subject-row-meta">'
        +'<span>'+stats.sessions+' oturum</span>'
        +'<span>ort. '+formatDurationLabel(average)+'</span>'
        +'<span>😕 '+avgDistraction+'/oturum</span>'
        +'<span>🎯 '+targetRate+'</span>'
        +'</div></div>';
    }).join('');
  }

  function buildHeatmap({
    today=new Date(),
    lookback=365,
    startOfWeek,
    addDays,
    dateKey,
    goalRatioFor,
    displayDate,
    monthShort=[]
  }={}){
    const startAligned=startOfWeek(addDays(today,-(lookback-1)));
    const totalDays=Math.round((today-startAligned)/86400000)+1;
    const weeks=Math.ceil(totalDays/7);
    const cellSize=9;
    const gap=2;
    let rects='';
    let lastMonth=-1;

    for(let week=0;week<weeks;week+=1){
      for(let day=0;day<7;day+=1){
        const date=addDays(startAligned,week*7+day);
        if(date>today) continue;

        const key=dateKey(date);
        const ratio=goalRatioFor(key);
        let level=0;

        if(ratio>0){
          level=ratio>=1?4:ratio>=0.5?3:ratio>=0.25?2:1;
        }

        const x=week*(cellSize+gap);
        const y=day*(cellSize+gap)+14;
        const percentLabel=Math.round(ratio*100)+'% hedef';

        rects+='<rect class="heat-cell level-'+level
          +'" x="'+x+'" y="'+y+'" width="'+cellSize+'" height="'+cellSize
          +'" rx="2.2"><title>'+displayDate(key)+': '+percentLabel+'</title></rect>';

        if(day===0 && date.getMonth()!==lastMonth){
          lastMonth=date.getMonth();
          rects+='<text x="'+x+'" y="9" font-size="7.8" fill="var(--paper-dim)" font-family="IBM Plex Mono, monospace">'
            +monthShort[lastMonth]+'</text>';
        }
      }
    }

    return {
      viewBox:'0 0 '+(weeks*(cellSize+gap))+' '+(7*(cellSize+gap)+14),
      svg:rects
    };
  }


  function buildTaskFocusBreakdown(rows=[],{
    escapeHtml=value=>String(value),
    formatDurationLabel=value=>String(value)
  }={}){
    if(!rows.length){
      return '<div class="todo-empty">Bu dönemde göreve bağlı odak oturumu yok.</div>';
    }

    const max=Math.max(1,Number(rows[0]?.seconds)||0);

    return rows.map(row=>{
      const percent=Math.max(4,Math.round((Number(row.seconds)||0)/max*100));
      const state=row.missing
        ? 'görev silinmiş'
        : row.done
          ? 'tamamlandı'
          : 'açık';

      return '<div class="subject-row task-focus-analysis-row">'
        +'<div class="subject-row-top"><span>'+escapeHtml(row.text)
        +'</span><span>'+formatDurationLabel(row.seconds)+'</span></div>'
        +'<div class="subject-bar-bg"><div class="subject-bar-fill" style="width:'+percent+'%"></div></div>'
        +'<div class="subject-row-meta">'
        +'<span>'+row.sessions+' oturum</span>'
        +'<span>'+state+'</span>'
        +'</div></div>';
    }).join('');
  }


  function buildInsights(insights=[],{
    escapeHtml=value=>String(value)
  }={}){
    const rows=Array.isArray(insights)?insights:[];
    if(!rows.length){
      return '<div class="analytics-learning-empty">Henüz gösterilecek kişisel örüntü yok.</div>';
    }

    const icons={
      'best-hour':'🧠',
      'session-length':'⏱',
      'subject':'📘',
      'rating-trend':'📈',
      'distraction-trend':'📵',
      'learning':'🌱'
    };

    return rows.map(insight=>{
      const confidence=insight.confidence || {};
      return '<article class="analytics-insight-card confidence-'+Number(confidence.level||0)+'">'
        +'<div class="analytics-insight-head">'
        +'<span class="analytics-insight-icon">'+(icons[insight.type]||'✦')+'</span>'
        +'<div><strong>'+escapeHtml(insight.title||'')+'</strong>'
        +'<div class="analytics-confidence">Güven: '+escapeHtml(confidence.label||'')
        +(confidence.evidence?' · '+escapeHtml(confidence.evidence):'')+'</div></div></div>'
        +'<p>'+escapeHtml(insight.detail||'')+'</p>'
        +(insight.recommendation
          ? '<div class="analytics-recommendation">→ '+escapeHtml(insight.recommendation)+'</div>'
          : '')
        +'</article>';
    }).join('');
  }

  function buildHourlyHeatmap(hours=[],{
    metric='rating',
    formatDurationLabel=value=>String(value)
  }={}){
    const rows=Array.isArray(hours)?hours:[];
    const numeric=rows.map(hour=>{
      if(metric==='focus') return Number(hour.focusSeconds)||0;
      if(metric==='distraction') return hour.distractionsPerHour===null?null:Number(hour.distractionsPerHour);
      if(metric==='target') return hour.avgTargetCompletion===null?null:Number(hour.avgTargetCompletion);
      return hour.avgProductivityRating===null?null:Number(hour.avgProductivityRating);
    }).filter(value=>value!==null && Number.isFinite(value));
    const max=Math.max(...numeric,1);

    return rows.map(hour=>{
      let value=null;
      let ratio=0;
      let label='—';
      let detail='Yeterli veri yok';

      if(metric==='focus'){
        value=Number(hour.focusSeconds)||0;
        ratio=max>0?value/max:0;
        label=value>0?formatDurationLabel(value):'—';
        detail=`${hour.sessionCount} oturum · ${hour.uniqueDays} gün`;
      }else if(metric==='distraction'){
        value=hour.distractionsPerHour===null?null:Number(hour.distractionsPerHour);
        ratio=value===null?0:Math.min(1,value/max);
        label=value===null?'—':value.toFixed(1)+'/s';
        detail=value===null
          ? 'Saatlik dikkat kaydı v94 verisi bekliyor'
          : `${hour.timedDistractions} kayıt · ${formatDurationLabel(hour.distractionTrackedSeconds)} izlenen odak`;
      }else if(metric==='target'){
        value=hour.avgTargetCompletion===null?null:Number(hour.avgTargetCompletion);
        ratio=value===null?0:Math.min(1,value);
        label=value===null?'—':Math.round(value*100)+'%';
        detail=`${hour.targetSessions} hedefli oturum`;
      }else{
        value=hour.avgProductivityRating===null?null:Number(hour.avgProductivityRating);
        ratio=value===null?0:Math.min(1,value/5);
        label=value===null?'—':value.toFixed(1);
        detail=`${hour.ratedSessionCount} puanlanan oturum · ${formatDurationLabel(hour.ratedFocusSeconds)}`;
      }

      const level=value===null?0:Math.max(1,Math.min(4,Math.ceil(ratio*4)));
      const next=(hour.hour+1)%24;
      const title=`${String(hour.hour).padStart(2,'0')}:00–${String(next).padStart(2,'0')}:00 · ${label} · ${detail}`;
      const confidence=hour.confidence?.label || 'Az veri';

      return '<div class="hour-heatmap-cell metric-'+metric+' level-'+level+' confidence-'+Number(hour.confidence?.level||0)+'"'
        +' data-hour="'+hour.hour+'" title="'+title+'">'
        +'<span class="hour-label">'+String(hour.hour).padStart(2,'0')+'</span>'
        +'<strong>'+label+'</strong>'
        +'<span class="hour-confidence">'+confidence+'</span>'
        +'</div>';
    }).join('');
  }

  function buildSubjectProfiles(subjects=[],{
    escapeHtml=value=>String(value),
    formatDurationLabel=value=>String(value)
  }={}){
    const rows=Array.isArray(subjects)?subjects:[];
    if(!rows.length){
      return '<div class="todo-empty">Son 30 günde ders/konu verisi yok.</div>';
    }

    return rows.slice(0,8).map(subject=>{
      const rating=subject.avgProductivityRating===null
        ? '—'
        : subject.avgProductivityRating.toFixed(1)+'/5';
      const distraction=subject.distractionsPerHour===null
        ? '—'
        : subject.distractionsPerHour.toFixed(1)+'/saat';
      const target=subject.avgTargetCompletion===null
        ? '—'
        : Math.round(subject.avgTargetCompletion*100)+'%';
      const bestHour=subject.bestHour===null
        ? 'öğreniliyor'
        : String(subject.bestHour).padStart(2,'0')+':00';

      return '<div class="subject-profile-row">'
        +'<div class="subject-profile-head"><strong>'+escapeHtml(subject.subject)+'</strong>'
        +'<span>'+formatDurationLabel(subject.focusSeconds)+'</span></div>'
        +'<div class="subject-profile-metrics">'
        +'<span>⭐ '+rating+'</span>'
        +'<span>📵 '+distraction+'</span>'
        +'<span>🎯 '+target+'</span>'
        +'<span>🕒 '+bestHour+'</span>'
        +'</div>'
        +'<div class="subject-profile-evidence">'+subject.sessions+' oturum · '+subject.activeDays+' gün'
        +(subject.insightEligible?'':' · veri birikiyor')+'</div>'
        +'</div>';
    }).join('');
  }

  function buildDurationProfile(buckets=[],{
    formatDurationLabel=value=>String(value)
  }={}){
    const rows=Array.isArray(buckets)?buckets:[];
    return '<div class="duration-profile-grid">'+rows.map(bucket=>{
      const rating=bucket.avgProductivityRating===null?'—':bucket.avgProductivityRating.toFixed(1)+'/5';
      const distraction=bucket.distractionsPerHour===null?'—':bucket.distractionsPerHour.toFixed(1)+'/s';
      const target=bucket.avgTargetCompletion===null?'—':Math.round(bucket.avgTargetCompletion*100)+'%';
      return '<div class="duration-profile-card'+(bucket.insightEligible?' eligible':'')+'">'
        +'<strong>'+bucket.label+'</strong>'
        +'<span>⭐ '+rating+'</span>'
        +'<span>📵 '+distraction+'</span>'
        +'<span>🎯 '+target+'</span>'
        +'<small>'+bucket.sessionCount+' oturum · '+bucket.activeDays+' gün</small>'
        +'</div>';
    }).join('')+'</div>';
  }

  window.ProductivityStatsView={
    buildMetricChart,
    buildSubjectChart,
    buildSessionAnalytics,
    buildSubjectBreakdown,
    buildTaskFocusBreakdown,
    buildInsights,
    buildHourlyHeatmap,
    buildSubjectProfiles,
    buildDurationProfile,
    buildHeatmap
  };
})();
