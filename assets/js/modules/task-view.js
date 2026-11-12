(() => {
  'use strict';

  function filterAndGroup(tasks=[],options={}){
    const {
      today,
      taskFilter='all',
      statusFilter='all',
      dateFilter='all',
      searchQuery='',
      normalizedTaskTagId=()=>null
    }=options;

    const query=String(searchQuery||'').trim().toLocaleLowerCase('tr-TR');

    const filtered=(Array.isArray(tasks)?tasks:[]).filter(task=>{
      if(taskFilter!=='all' && normalizedTaskTagId(task)!==taskFilter){
        return false;
      }

      if(statusFilter==='active' && task.done) return false;
      if(statusFilter==='done' && !task.done) return false;

      if(dateFilter!=='all'){
        if(dateFilter==='overdue' && !(task.dueDate && task.dueDate<today && !task.done)){
          return false;
        }
        if(dateFilter==='today' && task.dueDate!==today) return false;
        if(dateFilter==='upcoming' && !(task.dueDate && task.dueDate>today)){
          return false;
        }
        if(dateFilter==='nodate' && task.dueDate) return false;
      }

      if(!query) return true;

      const haystack=[
        task.text||'',
        task.dueDate||'',
        task.time||''
      ].join(' ').toLocaleLowerCase('tr-TR');

      return haystack.includes(query);
    });

    const active=filtered
      .filter(task=>!task.done)
      .sort(
        (a,b)=>(Number(a.sortOrder)||0)-(Number(b.sortOrder)||0)
      );

    const done=filtered
      .filter(task=>task.done)
      .sort(
        (a,b)=>(b.doneAt||'').localeCompare(a.doneAt||'')
      );

    return {
      filtered,
      active,
      done,
      overdue:active.filter(task=>task.dueDate && task.dueDate<today),
      today:active.filter(task=>task.dueDate===today),
      upcoming:active.filter(task=>task.dueDate && task.dueDate>today),
      noDate:active.filter(task=>!task.dueDate),
      isFiltered:Boolean(
        query ||
        taskFilter!=='all' ||
        statusFilter!=='all' ||
        dateFilter!=='all'
      )
    };
  }

  function buildCard(task,options={}){
    const {
      tagById=()=>null,
      normalizedTaskTagId=()=>null,
      safeTagColor=color=>color,
      escapeHtml=value=>String(value),
      taskDueBadge=()=> '',
      repeatTaskLabel=()=> ''
    }=options;

    const tag=tagById(normalizedTaskTagId(task));
    const tagHtml=tag
      ? '<span class="task-tag" style="--tag-color:'+safeTagColor(tag.color)
        +'">#'+escapeHtml(tag.name)+'</span>'
      : '';

    const borderStyle=tag
      ? ' style="border-left-color:'+safeTagColor(tag.color)+'"'
      : '';

    const dueHtml=taskDueBadge(task.dueDate,task.time,task.done);
    const repeatHtml=task.repeat && task.repeat!=='none'
      ? '<span class="task-repeat-badge">↻ '
        +repeatTaskLabel(task.repeat,task.repeatDays)+'</span>'
      : '';

    return '<div class="task-card'+(task.done?' completed':'')
      +'" draggable="true" data-task-id="'+task.id+'"'+borderStyle+'>'
      +'<span class="task-drag-handle" title="Sürükleyerek sırala">☰</span>'
      +'<button class="task-check'+(task.done?' done':'')
      +'" data-action="toggle-task" data-id="'+task.id+'">'
      +(task.done?'✓':'')+'</button>'
      +'<div class="task-card-body">'
      +'<div class="task-text'+(task.done?' done':'')+'">'
      +escapeHtml(task.text)+'</div>'+tagHtml+'</div>'
      +((dueHtml||repeatHtml)
        ? '<div class="task-right-meta">'+dueHtml+repeatHtml+'</div>'
        : '')
      +(!task.done
        ? '<button class="task-focus-btn" data-action="focus-task" data-id="'
          +task.id+'" title="Bu görev için çalışma oturumu başlat">▶ Odaklan</button>'
        : '')
      +'<button class="task-del" data-action="edit-task" data-id="'+task.id
      +'" aria-label="Görevi düzenle" title="Görevi düzenle">✎</button>'
      +'<button class="task-del" data-action="delete-task" data-id="'+task.id
      +'" aria-label="Görevi sil">✕</button>'
      +'</div>';
  }

  function buildList(groups,renderCard){
    if(!groups.filtered.length){
      return groups.isFiltered
        ? '<div class="task-empty">Bu arama ve filtrelere uyan görev bulunamadı.</div>'
        : '<div class="task-empty">Henüz görev yok. Yukarıdan yeni bir görev ekleyebilirsin.</div>';
    }

    let html='';

    if(groups.overdue.length){
      html+='<div class="task-group-title">⚠️ Gecikmiş</div>'
        +groups.overdue.map(renderCard).join('');
    }

    if(groups.today.length){
      html+='<div class="task-group-title">Bugün</div>'
        +groups.today.map(renderCard).join('');
    }

    if(groups.upcoming.length){
      html+='<div class="task-group-title">Yaklaşan</div>'
        +groups.upcoming.map(renderCard).join('');
    }

    if(groups.noDate.length){
      html+='<div class="task-group-title">Tarihsiz</div>'
        +groups.noDate.map(renderCard).join('');
    }

    if(groups.done.length){
      html+='<div class="task-group-title task-group-title-with-action"><span>Tamamlanan</span><button class="task-group-clear-done" data-action="clear-completed-inline" type="button">Tümünü sil</button></div>'
        +groups.done.map(renderCard).join('');
    }

    return html || '<div class="task-empty">Görev yok. Yukarıdan ekleyebilirsin.</div>';
  }

  window.ProductivityTaskView={
    filterAndGroup,
    buildCard,
    buildList
  };
})();
