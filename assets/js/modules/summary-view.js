(() => {
  'use strict';

  function build(options={}){
    const {
      now=new Date(),
      data={},
      startOfWeek,
      addDays,
      dateKey,
      keysInRange,
      sumEntries,
      weeklyReviewStats,
      planningStatsForKeys,
      focusScoreStats,
      formatMinutes,
      formatDurationLabel,
      trendArrowHtml,
      distractionTrendHtml,
      escapeHtml,
      pad,
      weekdayShort=[],
      monthShort=[]
    }=options;

    const thisWeekStart=startOfWeek(now);
    const thisWeekKeys=keysInRange(thisWeekStart,now);
    const lastWeekStart=addDays(thisWeekStart,-7);
    const lastWeekEnd=addDays(thisWeekStart,-1);
    const lastWeekKeys=keysInRange(lastWeekStart,lastWeekEnd);

    const thisTotals=sumEntries(thisWeekKeys);
    const lastTotals=sumEntries(lastWeekKeys);
    const review=weeklyReviewStats(thisWeekKeys);
    const planning=planningStatsForKeys(thisWeekKeys);

    const treesThisWeek=(data.collection||[])
      .filter(item=>thisWeekKeys.includes(dateKey(new Date(item.completedAt))))
      .length;

    const badgesThisWeek=(data.badgeUnlockLog||[])
      .filter(item=>thisWeekKeys.includes(dateKey(new Date(item.at))))
      .length;

    let bestDay=null;
    let bestDayVal=-1;
    let worstDay=null;
    let worstDayVal=-1;

    thisWeekKeys.forEach(key=>{
      const day=data.days?.[key];
      if(!day) return;

      if(day.workSeconds>bestDayVal){
        bestDayVal=day.workSeconds;
        bestDay=key;
      }

      if(day.distraction>worstDayVal){
        worstDayVal=day.distraction;
        worstDay=key;
      }
    });

    function dayLabel(key){
      if(!key) return null;
      const date=new Date(key);
      return weekdayShort[date.getDay()]
        +' ('+date.getDate()+' '+monthShort[date.getMonth()]+')';
    }

    let html='<div class="summary-card">'
      +'<div class="summary-title-row"><div class="summary-title">Bu Hafta vs Geçen Hafta</div><div class="summary-actions"><button class="share-btn" id="shareBtn">📤 Paylaş</button><button class="summary-print-btn" id="summaryPrintBtn">🖨 PDF / Yazdır</button></div></div>'
      +'<div class="summary-row"><span class="summary-label">Çalışma Süresi</span><span class="summary-value">'+formatMinutes(thisTotals.workSeconds)+' '+trendArrowHtml(thisTotals.workSeconds,lastTotals.workSeconds)+'</span></div>'
      +'<div class="summary-row"><span class="summary-label">Dikkat Dağınıklığı</span><span class="summary-value">'+thisTotals.distraction+' '+distractionTrendHtml(thisTotals.distraction,lastTotals.distraction)+'</span></div>'
      +'<div class="summary-row"><span class="summary-label">Oturum Sayısı</span><span class="summary-value">'+thisTotals.sessions+' '+trendArrowHtml(thisTotals.sessions,lastTotals.sessions)+'</span></div>'
      +'</div>';

    html+='<div class="collection-stats">'
      +'<div class="collection-stat"><div class="cs-num">'+treesThisWeek+'</div><div class="cs-lbl">Bu Hafta Ağaç</div></div>'
      +'<div class="collection-stat"><div class="cs-num">'+badgesThisWeek+'</div><div class="cs-lbl">Bu Hafta Rozet</div></div>'
      +'</div>';

    const bestDayLabel=review.bestDay
      ? dayLabel(review.bestDay.key)+' · '+formatDurationLabel(review.bestDay.seconds)
      : '—';

    const topSubjectLabel=review.topSubject
      ? review.topSubject[0]+' · '+formatDurationLabel(review.topSubject[1])
      : '—';

    const longestLabel=review.longestSession
      ? formatDurationLabel(review.longestSession.seconds)+' · '+review.longestSession.subject
      : '—';

    html+='<div class="insight-card">'
      +'<div class="summary-title">Haftalık Değerlendirme</div>'
      +'<div class="weekly-review-grid">'
      +'<div class="weekly-review-card"><div class="wr-label">En güçlü gün</div><div class="wr-value">'+escapeHtml(bestDayLabel)+'</div><div class="wr-sub">Haftanın en yüksek çalışma süresi</div></div>'
      +'<div class="weekly-review-card"><div class="wr-label">En çok çalışılan konu</div><div class="wr-value">'+escapeHtml(topSubjectLabel)+'</div><div class="wr-sub">Oturum konu kayıtlarına göre</div></div>'
      +'<div class="weekly-review-card"><div class="wr-label">En uzun oturum</div><div class="wr-value">'+escapeHtml(longestLabel)+'</div><div class="wr-sub">'+review.sessionCount+' oturum · ort. '+formatDurationLabel(review.avgSession)+'</div></div>'
      +'<div class="weekly-review-card"><div class="wr-label">En verimli saat</div><div class="wr-value">'+(review.productiveHour?(pad(review.productiveHour.hour)+':00–'+pad((review.productiveHour.hour+1)%24)+':00'):'—')+'</div><div class="wr-sub">'+(review.productiveHour?formatDurationLabel(review.productiveHour.seconds)+' çalışma':'Yeni oturumlarda saat verisi birikecek')+'</div></div>'
      +'<div class="weekly-review-card"><div class="wr-label">Odak kalite skoru</div><div class="wr-value">'+(review.focus.average!==null?review.focus.average+'/100':'—')+'</div><div class="wr-sub">'+(review.focus.count?review.focus.count+' oturumun ağırlıklı ortalaması':'Henüz oturum verisi yok')+'</div></div>'
      +'<div class="weekly-review-card"><div class="wr-label">Hedef günleri</div><div class="wr-value">'+review.goalsMet+' / '+thisWeekKeys.length+'</div><div class="wr-sub">'+review.tasksCompleted+' görev bu hafta tamamlandı</div></div>'
      +'</div>'
      +'<div class="planning-analysis">'
      +'<div class="planning-analysis-title">🎯 Planlanan / Gerçek Süre</div>'
      +(planning.count
        ? '<div class="planning-row"><span>Hedefli oturum</span><b>'+planning.count+'</b></div>'
          +'<div class="planning-row"><span>Hedefe ulaşan</span><b>'+planning.reached+' · %'+planning.completionRate+'</b></div>'
          +'<div class="planning-row"><span>Planlanan toplam</span><b>'+formatDurationLabel(planning.planned)+'</b></div>'
          +'<div class="planning-row"><span>Gerçek toplam</span><b>'+formatDurationLabel(planning.actual)+'</b></div>'
          +'<div class="planning-row"><span>Ortalama sapma</span><b>'+(planning.avgDelta>=0?'+':'−')+formatDurationLabel(Math.abs(planning.avgDelta))+'</b></div>'
          +'<div class="planning-row"><span>Ortalama overtime</span><b>'+(planning.overtimeCount?('+'+formatDurationLabel(planning.avgOvertime)):'—')+'</b></div>'
        : '<div class="todo-empty">Bu hafta hedef süre belirlenmiş oturum yok.</div>')
      +'</div>'
      +(review.scheduledStudy.matchedEvents
        ? '<div class="planning-analysis"><div class="planning-analysis-title">🗓 Takvim Planı / Gerçekleşen Çalışma</div>'
          +'<div class="planning-row"><span>Eşleşen plan</span><b>'+review.scheduledStudy.matchedEvents+'</b></div>'
          +'<div class="planning-row"><span>Takvimde planlanan</span><b>'+formatDurationLabel(review.scheduledStudy.planned)+'</b></div>'
          +'<div class="planning-row"><span>Gerçekte çalışılan</span><b>'+formatDurationLabel(review.scheduledStudy.actual)+'</b></div>'
          +'<div class="planning-row"><span>Plan uyumu</span><b>%'+review.scheduledStudy.adherence+'</b></div>'
          +'<div class="planning-row"><span>Süre farkı</span><b>'+(review.scheduledStudy.delta>=0?'+':'−')+formatDurationLabel(Math.abs(review.scheduledStudy.delta))+'</b></div></div>'
        : '')
      +'</div>';

    const thisMonthStart=new Date(now.getFullYear(),now.getMonth(),1);
    const thisMonthKeys=keysInRange(thisMonthStart,now);
    const lastMonthStart=new Date(now.getFullYear(),now.getMonth()-1,1);
    const lastMonthEnd=new Date(now.getFullYear(),now.getMonth(),0);
    const lastMonthKeys=keysInRange(lastMonthStart,lastMonthEnd);
    const thisMonthTotals=sumEntries(thisMonthKeys);
    const lastMonthTotals=sumEntries(lastMonthKeys);

    if(thisMonthTotals.workSeconds>0 || lastMonthTotals.workSeconds>0){
      html+='<div class="summary-card">'
        +'<div class="summary-title">Bu Ay vs Geçen Ay</div>'
        +'<div class="summary-row"><span class="summary-label">Çalışma Süresi</span><span class="summary-value">'+formatMinutes(thisMonthTotals.workSeconds)+' '+trendArrowHtml(thisMonthTotals.workSeconds,lastMonthTotals.workSeconds)+'</span></div>'
        +'<div class="summary-row"><span class="summary-label">Dikkat Dağınıklığı</span><span class="summary-value">'+thisMonthTotals.distraction+' '+distractionTrendHtml(thisMonthTotals.distraction,lastMonthTotals.distraction)+'</span></div>'
        +'</div>';
    }

    let insights='';

    if(bestDay && bestDayVal>0){
      insights+='<div class="insight-line">🏆 En verimli günün: <b>'+dayLabel(bestDay)+'</b> — '+formatDurationLabel(bestDayVal)+' çalıştın.</div>';
    }

    if(worstDay && worstDayVal>0){
      insights+='<div class="insight-line">😕 En çok dikkatin dağıldığı gün: <b>'+dayLabel(worstDay)+'</b> — '+worstDayVal+' kez.</div>';
    }

    if(thisTotals.distraction>0 || thisTotals.workSeconds>0){
      insights+='<div class="insight-line">😕 Bu hafta toplam dikkat dağınıklığın: <b>'+thisTotals.distraction+' kez</b></div>';
    }

    if(review.productiveHour){
      insights+='<div class="insight-line">🕒 Gerçek timer aralıklarına göre en yoğun çalışma saatin <b>'+pad(review.productiveHour.hour)+':00–'+pad((review.productiveHour.hour+1)%24)+':00</b>.</div>';
    }

    if(review.focus.average!==null){
      const focusText=review.focus.average>=85
        ? 'çok güçlü'
        : review.focus.average>=70
          ? 'iyi'
          : review.focus.average>=55
            ? 'orta'
            : 'geliştirilebilir';

      insights+='<div class="insight-line">🎯 Haftalık odak kalite skorun <b>'+review.focus.average+'/100</b> — '+focusText+'.</div>';
    }

    const lastWeekFocus=focusScoreStats(lastWeekKeys);

    if(review.focus.average!==null && lastWeekFocus.average!==null){
      const difference=review.focus.average-lastWeekFocus.average;

      if(Math.abs(difference)>=3){
        insights+='<div class="insight-line">'+(difference>0?'📈':'📉')
          +' Odak kaliten geçen haftaya göre <b>'
          +(difference>0?'+':'')+difference+' puan</b> '
          +(difference>0?'arttı':'değişti')+'.</div>';
      }
    }

    if(review.scheduledStudy.matchedEvents){
      insights+='<div class="insight-line">🗓 Takvimdeki eşleşen çalışma planlarının <b>%'
        +review.scheduledStudy.adherence
        +'</b> kadarını süre olarak gerçekleştirdin.</div>';
    }

    if(!insights){
      insights='<div class="insight-line">Bu hafta henüz yeterli veri yok. Birkaç gün daha kullan, buraya içgörüler eklenecek.</div>';
    }

    html+='<div class="insight-card"><div class="summary-title">İçgörüler</div>'+insights+'</div>';

    const activeDays=Object.keys(data.days||{})
      .filter(key=>data.days[key].workSeconds>0)
      .sort();

    if(activeDays.length>=10){
      const span=Math.min(14,Math.floor(activeDays.length/2));
      const firstSlice=activeDays.slice(0,span);
      const recentSlice=activeDays.slice(-span);

      const avgFirst=Math.round(
        firstSlice.reduce((sum,key)=>sum+data.days[key].workSeconds,0)
        /firstSlice.length/60
      );

      const avgRecent=Math.round(
        recentSlice.reduce((sum,key)=>sum+data.days[key].workSeconds,0)
        /recentSlice.length/60
      );

      let narrative;

      if(avgFirst>0){
        const growth=Math.round((avgRecent-avgFirst)/avgFirst*100);

        if(growth>5){
          narrative='📈 Başladığından beri günlük ortalama çalışma süren <b>%'
            +growth+' arttı</b> — eskiden günde ~'+avgFirst
            +' dk, son zamanlarda ~'+avgRecent+' dk.';
        }else if(growth<-5){
          narrative='📉 İlk günlere göre biraz yavaşlamışsın (%'
            +Math.abs(growth)+' azalma) — eskiden ~'+avgFirst
            +' dk, şimdi ~'+avgRecent+' dk. Tekrar hız kazanabilirsin.';
        }else{
          narrative='➡️ Günlük ortalama çalışma süren ilk günlerinden bu yana oldukça istikrarlı: ~'
            +avgRecent+' dk.';
        }
      }else{
        narrative='📈 Son dönemde günde ortalama ~'+avgRecent+' dk çalışıyorsun.';
      }

      html+='<div class="insight-card"><div class="summary-title">Uzun Vadeli Gelişim</div><div class="insight-line">'+narrative+'</div></div>';
    }

    return '<div id="summaryPrintArea">'+html+'</div>';
  }

  window.ProductivitySummaryView={build};
})();
