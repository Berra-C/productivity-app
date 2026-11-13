(() => {
  'use strict';

  function completionPct(session){
    const todos=Array.isArray(session?.todos)?session.todos:[];
    if(!todos.length) return null;
    const done=todos.filter(todo=>todo?.done).length;
    return Math.round(done/todos.length*100);
  }

  function displayTimeRange(session,displayClockTime){
    const start=displayClockTime(session?.startedAt);
    const end=displayClockTime(session?.endedAt);
    if(start && end) return start+'–'+end;
    if(start) return start;
    return '';
  }

  function buildTarget(session,liveDuration,formatDurationLabel){
    if(session.targetSeconds){
      const target=Number(session.targetSeconds);
      const percent=Math.min(100,liveDuration/target*100);

      return '<div class="session-target" data-tooltip="Oturum hedefi: çalışılan süre / belirlediğin hedef süre">'
        +'<div class="target-bar"><div class="target-fill" style="width:'+percent+'%"></div></div>'
        +'<div class="target-caption'+(session.targetReached?' reached':'')+'">🎯 '
        +formatDurationLabel(Math.min(liveDuration,target))
        +' / '+formatDurationLabel(target)
        +(session.targetReached?' ✓':'')
        +(liveDuration>target?' · +'+formatDurationLabel(liveDuration-target):'')
        +'</div></div>';
    }

    return '<div class="session-target session-target-untargeted" data-tooltip="Bu oturum hedef süre olmadan başlatıldı. Çizgi yalnızca kart düzenini korur; yüzde ilerleme göstermez.">'
      +'<div class="target-bar untargeted"><div class="target-fill untargeted-fill"></div></div>'
      +'<div class="target-caption untargeted-caption">⏱ '
      +formatDurationLabel(liveDuration)+' · Hedefsiz</div></div>';
  }

  function buildTodos(session,escapeHtml){
    const todos=Array.isArray(session?.todos)?session.todos:[];

    if(!todos.length){
      return '<div class="todo-empty">Henüz görev eklenmedi.</div>';
    }

    return todos.map(todo=>{
      const label=todo.done
        ? 'Görevi yeniden aç'
        : 'Görevi tamamlandı olarak işaretle';

      return '<div class="todo-item">'
        +'<button class="todo-check'+(todo.done?' done':'')
        +'" data-action="toggle-todo" data-id="'+session.id
        +'" data-todo="'+todo.id
        +'" data-tooltip="'+label+'" aria-label="'+label+'">'
        +(todo.done?'✓':'')+'</button>'
        +'<span class="todo-text'+(todo.done?' done':'')+'">'
        +escapeHtml(todo.text)+'</span>'
        +'<button class="todo-del" data-action="delete-todo" data-id="'
        +session.id+'" data-todo="'+todo.id
        +'" data-tooltip="Bu oturum görevini sil" aria-label="Oturum görevini sil">✕</button>'
        +'</div>';
    }).join('');
  }

  function buildList(options={}){
    const {
      sessions=[],
      activeSessionId=null,
      isWorking=false,
      workStart=null,
      showHidden=false,
      expandedIds=new Set(),
      now=Date.now(),
      escapeHtml=value=>String(value),
      formatDurationLabel=value=>String(value),
      displayClockTime=()=> '',
      sessionFocusScore=()=>0
    }=options;

    const allSessions=Array.isArray(sessions)?sessions:[];
    const hiddenCount=allSessions.filter(session=>session?.hidden).length;
    const visible=showHidden
      ? allSessions
      : allSessions.filter(session=>!session?.hidden);

    if(!allSessions.length){
      return {
        html:'<div class="session-empty">Bugün henüz oturum başlatmadın.</div>',
        hiddenCount
      };
    }

    if(!visible.length && hiddenCount>0){
      return {
        html:'<div class="session-hidden-tools"><button class="session-hidden-toggle" data-action="toggle-hidden-sessions" data-tooltip="Daha önce görünümden gizlenen oturumları listele">👁 '
          +hiddenCount+' gizlenen oturumu göster</button></div>',
        hiddenCount
      };
    }

    const sorted=[...visible].sort((a,b)=>{
      const aCurrent=a?.id===activeSessionId?1:0;
      const bCurrent=b?.id===activeSessionId?1:0;
      return bCurrent-aCurrent;
    });

    let html='';
    let historyHeadingPrinted=false;
    const hasCurrent=Boolean(
      activeSessionId &&
      allSessions.some(session=>session?.id===activeSessionId)
    );

    sorted.forEach(session=>{
      const isCurrent=session.id===activeSessionId;
      const isTicking=isCurrent && isWorking;
      const isPaused=isCurrent && !isWorking;
      const expanded=expandedIds.has(session.id);

      const liveDuration=isTicking && workStart
        ? Number(session.duration||0)+Math.floor((now-workStart)/1000)
        : Number(session.duration||0);

      const percent=completionPct(session);
      const percentLabel=percent===null
        ? 'Görev eklenmedi'
        : '%'+percent+' tamamlandı';

      const hasSubject=session.subject && session.subject!=='Genel';
      const subjectTag=hasSubject
        ? '<span class="subject-tag">📘 '+escapeHtml(session.subject)+'</span>'
        : '';

      const subjectEdit=isCurrent
        ? '<button class="session-subject-edit" data-action="edit-subject" data-id="'
          +session.id+'" data-tooltip="Bu oturumun ders veya konu bilgisini değiştir">'
          +(hasSubject?'Değiştir':'＋ Ders / konu ekle')+'</button>'
          +'<button class="session-subject-edit" data-action="manage-subjects" data-id="'
          +session.id+'" data-tooltip="Kaydedilmiş ders / konu önerilerini yönet">⚙ Konular</button>'
        : '';

      if(!isCurrent && !historyHeadingPrinted && hasCurrent){
        historyHeadingPrinted=true;
        html+='<div class="session-history-heading">Geçmiş Oturumlar</div>';
      }

      const todosHtml=buildTodos(session,escapeHtml);
      const targetHtml=buildTarget(session,liveDuration,formatDurationLabel);
      const timeRange=displayTimeRange(session,displayClockTime);

      html+='<div class="session-card'
        +(isTicking?' active':'')
        +(isPaused?' paused':'')
        +(isCurrent?' current':'')
        +(session.hidden?' hidden-session':'')
        +'" data-id="'+session.id+'">'

        +(!isCurrent && !session.hidden
          ? '<button class="session-time-edit-btn" data-action="edit-session-time" data-id="'
            +session.id+'" data-tooltip="Oturumun başlangıç ve bitiş saatini düzelt. Örn. açık unuttuysan gerçek bitiş saatini yazabilirsin." aria-label="Oturum başlangıç ve bitiş saatlerini düzenle">🕒</button>'
            +'<button class="session-delete-btn" data-action="delete-session" data-id="'
            +session.id+'" data-tooltip="Bu oturumu geçmişten sil" aria-label="Oturumu sil">🗑</button>'
          : '')

        +(session.hidden
          ? '<button class="session-restore-btn" data-action="restore-session" data-id="'
            +session.id+'" data-tooltip="Gizlenen oturumu yeniden görünür yap">Geri Göster</button>'
          : '')

        +(isCurrent
          ? '<div class="current-badge" data-tooltip="'
            +(isTicking?'Şu anda çalışan aktif oturum':'Aktif oturum şu anda duraklatılmış')
            +'">'+(isTicking?'▶ ŞU ANKİ OTURUM':'⏸ ŞU ANKİ OTURUM')+'</div>'
          : '')

        +'<div class="session-head" data-action="toggle" data-id="'+session.id
        +'" data-tooltip="'+(expanded?'Oturum ayrıntılarını kapat':'Oturum görevlerini ve ayrıntılarını aç')+'">'
        +'<span class="chevron" aria-hidden="true">'+(expanded?'▾':'▸')+'</span>'
        +'<span class="session-name">'+escapeHtml(session.name)
        +(isTicking?' <span class="live-dot">●</span>':'')
        +(isPaused?' <span class="paused-tag">⏸ Duraklatıldı</span>':'')
        +'</span>'
        +'<button class="session-edit" data-action="rename" data-id="'+session.id
        +'" data-tooltip="Oturumun adını değiştir" aria-label="Oturum adını değiştir">✏️</button>'
        +'<span class="session-meta">'
        +(timeRange
          ? '<span class="meta-time metric-help" tabindex="0" data-tooltip="Oturumun başlangıç ve bitiş saatleri">🕒 '
            +timeRange+'</span>'
          : '')
        +'<span class="meta-duration metric-help" tabindex="0" data-tooltip="Bu oturumda kaydedilen toplam odaklı çalışma süresi. Duraklatılan süreler dahil edilmez.">⏱ '
        +formatDurationLabel(liveDuration)+'</span>'
        +'<span class="meta-distract metric-help" tabindex="0" data-tooltip="Bu oturum sırasında kaydettiğin dikkat dağınıklığı sayısı">😕 '
        +Number(session.distractions||0)+'</span>'
        +'<span class="meta-focus metric-help" tabindex="0" data-tooltip="Odak puanı (0–100): dikkat dağınıklığı ve kesintiler puanı düşürür; hedefe ulaşmak ve oturum görevlerini tamamlamak puanı artırabilir.">🧠 '
        +sessionFocusScore(session)+'</span>'
        +'</span></div>'

        +((subjectTag||subjectEdit)
          ? '<div class="session-subject-row">'+subjectTag+subjectEdit+'</div>'
          : '')

        +'<div class="session-pct">'+percentLabel+'</div>'
        +targetHtml

        +(expanded
          ? '<div class="session-body">'+todosHtml
            +'<div class="todo-add-row"><input type="text" class="todo-input" placeholder="Yeni görev ekle..." aria-label="Oturuma yeni görev ekle" />'
            +'<button class="todo-add-btn" data-action="add-todo" data-id="'
            +session.id+'" data-tooltip="Yazdığın görevi bu oturuma ekle" aria-label="Oturuma görevi ekle">+</button></div></div>'
          : '')

        +'</div>';
    });

    if(hiddenCount>0){
      html+='<div class="session-hidden-tools"><button class="session-hidden-toggle" data-action="toggle-hidden-sessions">'
        +(showHidden
          ? 'Gizlenenleri Sakla'
          : '👁 '+hiddenCount+' gizlenen oturumu göster')
        +'</button></div>';
    }

    return {html,hiddenCount};
  }

  window.ProductivitySessionView={
    completionPct,
    displayTimeRange,
    buildList
  };
})();
