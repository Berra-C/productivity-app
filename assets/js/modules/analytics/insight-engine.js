(() => {
  'use strict';

  function finite(value,fallback=0){
    const number=Number(value);
    return Number.isFinite(number)?number:fallback;
  }

  function confidence(level,evidence=''){
    const normalized=Math.max(0,Math.min(3,Number(level)||0));
    const labels=['Az veri','Erken bulgu','Orta','Yüksek'];
    return {level:normalized,label:labels[normalized],evidence};
  }

  function bestHourInsight(hours=[],summary={}){
    const eligible=(Array.isArray(hours)?hours:[])
      .filter(hour=>
        hour?.confidence?.usable &&
        hour.ratedSessionCount>=3 &&
        hour.avgProductivityRating!==null
      );

    if(!eligible.length || summary.avgProductivityRating===null) return null;

    const best=[...eligible].sort((a,b)=>
      b.avgProductivityRating-a.avgProductivityRating ||
      b.ratedFocusSeconds-a.ratedFocusSeconds
    )[0];

    const ratingLift=best.avgProductivityRating-summary.avgProductivityRating;
    const distractionSupport=
      best.distractionsPerHour!==null &&
      summary.timedDistractionsPerHour!==null &&
      best.distractionTrackedSeconds>=90*60 &&
      summary.distractionTrackedSeconds>=90*60 &&
      best.distractionsPerHour<=summary.timedDistractionsPerHour*0.85;
    const targetSupport=
      best.targetSessions>=3 &&
      best.avgTargetCompletion!==null &&
      summary.avgTargetCompletion!==null &&
      best.avgTargetCompletion>=summary.avgTargetCompletion+0.08;

    const supportCount=(ratingLift>=0.35?1:0)+(distractionSupport?1:0)+(targetSupport?1:0);
    if(supportCount<2) return null;

    const next=(best.hour+1)%24;
    const details=[
      `Verim puanın ${best.avgProductivityRating.toFixed(1)}/5`
    ];
    if(distractionSupport){
      details.push('dikkat dağılman genel ortalamanın altında');
    }else if(targetSupport){
      details.push('hedef uyumun genel ortalamanın üzerinde');
    }

    return {
      type:'best-hour',
      title:`${String(best.hour).padStart(2,'0')}:00–${String(next).padStart(2,'0')}:00 güçlü bir çalışma saatin.`,
      detail:details.join(' ve ')+'.',
      recommendation:'Zor veya yüksek öncelikli işleri mümkün olduğunda bu saate yakın planlamayı deneyebilirsin.',
      confidence:confidence(
        best.confidence.level,
        `${best.sessionCount} oturum · ${best.uniqueDays} farklı gün`
      ),
      impact:3,
      actionable:true
    };
  }

  function durationInsight(buckets=[]){
    const eligible=(Array.isArray(buckets)?buckets:[])
      .filter(bucket=>
        bucket.insightEligible &&
        bucket.ratedSessionCount>=3 &&
        bucket.avgProductivityRating!==null
      );
    if(eligible.length<2) return null;

    const best=[...eligible].sort((a,b)=>
      b.avgProductivityRating-a.avgProductivityRating ||
      b.sessionCount-a.sessionCount
    )[0];
    const long=eligible.find(bucket=>bucket.id==='90+');

    if(
      long &&
      best.id!=='90+' &&
      best.avgProductivityRating-long.avgProductivityRating>=0.5
    ){
      const distractionSupport=
        best.distractionsPerHour!==null &&
        long.distractionsPerHour!==null &&
        long.distractionsPerHour>=best.distractionsPerHour*1.25 &&
        long.distractionsPerHour-best.distractionsPerHour>=0.3;

      return {
        type:'session-length',
        title:`${best.label} oturumlar sende daha verimli görünüyor.`,
        detail:`Bu aralıkta ortalama puanın ${best.avgProductivityRating.toFixed(1)}/5; 90+ dakikada ${long.avgProductivityRating.toFixed(1)}/5.`+
          (distractionSupport?' Uzun oturumlarda dikkat dağılman da daha yüksek.':''),
        recommendation:`Uzun çalışma bloklarını ${best.label} civarında parçalara bölmeyi deneyebilirsin.`,
        confidence:confidence(
          Math.min(3,best.sessionCount>=8 && long.sessionCount>=8?3:2),
          `${best.sessionCount+long.sessionCount} karşılaştırılan oturum`
        ),
        impact:3,
        actionable:true
      };
    }

    const second=[...eligible]
      .filter(bucket=>bucket.id!==best.id)
      .sort((a,b)=>b.avgProductivityRating-a.avgProductivityRating)[0];

    if(second && best.avgProductivityRating-second.avgProductivityRating>=0.6){
      return {
        type:'session-length',
        title:`${best.label} oturumlar en yüksek verim puanına sahip.`,
        detail:`Ortalama ${best.avgProductivityRating.toFixed(1)}/5; sonraki en iyi aralık ${second.avgProductivityRating.toFixed(1)}/5.`,
        recommendation:'Bu süre aralığını bir çalışma şablonu olarak birkaç kez daha deneyebilirsin.',
        confidence:confidence(2,`${best.sessionCount} oturum`),
        impact:2,
        actionable:true
      };
    }

    return null;
  }

  function subjectInsight(subjects=[],summary={}){
    const eligible=(Array.isArray(subjects)?subjects:[])
      .filter(subject=>subject.insightEligible && subject.ratingEligible);
    if(!eligible.length || summary.avgProductivityRating===null) return null;

    const low=[...eligible]
      .filter(subject=>subject.avgProductivityRating!==null)
      .sort((a,b)=>a.avgProductivityRating-b.avgProductivityRating)[0];

    if(
      low &&
      summary.avgProductivityRating-low.avgProductivityRating>=0.5
    ){
      return {
        type:'subject',
        title:`${low.subject} oturumlarında verim puanın daha düşük.`,
        detail:`${low.subject}: ${low.avgProductivityRating.toFixed(1)}/5 · genel: ${summary.avgProductivityRating.toFixed(1)}/5.`,
        recommendation:low.bestHour!==null
          ? `${low.subject} için ${String(low.bestHour).padStart(2,'0')}:00 civarını daha sık denemeyi değerlendirebilirsin.`
          : 'Bu derste daha kısa oturum veya farklı saatleri deneyip sonucu karşılaştırabilirsin.',
        confidence:confidence(
          low.sessions>=8 && low.activeDays>=5?3:2,
          `${low.sessions} oturum · ${low.activeDays} gün`
        ),
        impact:2,
        actionable:true
      };
    }

    return null;
  }

  function trendInsight(current={},previous={}){
    if(!previous || !current) return null;

    if(
      current.ratedSessions>=5 &&
      previous.ratedSessions>=5 &&
      current.avgProductivityRating!==null &&
      previous.avgProductivityRating!==null
    ){
      const delta=current.avgProductivityRating-previous.avgProductivityRating;
      if(Math.abs(delta)>=0.4){
        const improved=delta>0;
        return {
          type:'rating-trend',
          title:improved?'Son dönemde verim algın yükseliyor.':'Son dönemde verim algın düşmüş görünüyor.',
          detail:`Son 30 gün ${current.avgProductivityRating.toFixed(1)}/5 · önceki 30 gün ${previous.avgProductivityRating.toFixed(1)}/5.`,
          recommendation:improved
            ? 'İyi giden saat ve oturum uzunluklarını korumaya çalış.'
            : 'Son dönemde değişen çalışma saatlerini ve oturum uzunluklarını karşılaştırmak faydalı olabilir.',
          confidence:confidence(2,`${current.ratedSessions+previous.ratedSessions} puanlanan oturum`),
          impact:2,
          actionable:true
        };
      }
    }

    if(
      current.focusSeconds>=180*60 &&
      previous.focusSeconds>=180*60 &&
      current.distractionsPerHour!==null &&
      previous.distractionsPerHour!==null
    ){
      const absolute=current.distractionsPerHour-previous.distractionsPerHour;
      const relative=previous.distractionsPerHour>0
        ? absolute/previous.distractionsPerHour
        : 0;
      if(Math.abs(relative)>=0.25 && Math.abs(absolute)>=0.3){
        const improved=absolute<0;
        return {
          type:'distraction-trend',
          title:improved?'Dikkat dağılma sıklığın azalıyor.':'Dikkat dağılma sıklığın artmış görünüyor.',
          detail:`Şimdi ${current.distractionsPerHour.toFixed(1)}/saat · önce ${previous.distractionsPerHour.toFixed(1)}/saat.`,
          recommendation:improved
            ? 'Son dönemde işe yarayan çalışma düzenini korumaya çalış.'
            : 'Saat ve oturum uzunluğu analizinde artışın nerede yoğunlaştığını kontrol edebilirsin.',
          confidence:confidence(2,'İki 30 günlük dönem'),
          impact:2,
          actionable:true
        };
      }
    }

    return null;
  }

  function learningInsight(summary={}){
    const needed=[];
    if(finite(summary.focusSeconds,0)<90*60) needed.push('biraz daha çalışma süresi');
    if(finite(summary.ratedSessions,0)<3) needed.push('en az 3 puanlanan oturum');

    return {
      type:'learning',
      title:'Çalışma ritmini öğreniyorum.',
      detail:needed.length
        ? `Daha güvenilir kişisel öneriler için ${needed.join(' ve ')} gerekiyor.`
        : 'Veri birikiyor; güçlü bir örüntü oluştuğunda burada göstereceğim.',
      recommendation:'Oturumları bitirirken 1–5 verim puanı vermen analizi belirgin biçimde güçlendirir.',
      confidence:confidence(0,'Henüz yeterli örnek yok'),
      impact:1,
      actionable:true
    };
  }

  function generate(options={}){
    const summary=options.summary || {};
    const candidates=[
      bestHourInsight(options.hours,summary),
      durationInsight(options.durationBuckets),
      subjectInsight(options.subjects,summary),
      trendInsight(summary,options.previousSummary)
    ].filter(Boolean);

    candidates.sort((a,b)=>
      b.confidence.level-a.confidence.level ||
      b.impact-a.impact ||
      Number(b.actionable)-Number(a.actionable)
    );

    const types=new Set();
    const selected=[];
    for(const insight of candidates){
      if(types.has(insight.type)) continue;
      selected.push(insight);
      types.add(insight.type);
      if(selected.length>=3) break;
    }

    if(!selected.length) selected.push(learningInsight(summary));
    return selected;
  }

  window.ProductivityInsightEngine={
    confidence,
    bestHourInsight,
    durationInsight,
    subjectInsight,
    trendInsight,
    generate
  };
})();
