(() => {
  'use strict';

  function buildModel(options={}){
    const {
      session,
      isWorking=false,
      workStart=null,
      currentTodo=null,
      now=Date.now(),
      formatDurationLabel=value=>String(value)
    }=options;

    if(!session) return null;

    const liveElapsed=isWorking && workStart
      ? Math.floor((now-workStart)/1000)
      : 0;

    const liveDuration=Number(session.duration||0)+liveElapsed;
    const subjectText=session.subject && session.subject!=='Genel'
      ? session.subject
      : (session.name||'Oturum');

    const hasTodo=Boolean(currentTodo?.todo);
    const taskText=hasTodo ? currentTodo.todo.text : 'Aktif görev yok';
    const kicker=hasTodo?'Şimdi yap':'Oturum';

    let target;

    if(session.targetSeconds){
      const targetSeconds=Number(session.targetSeconds);
      const percent=Math.min(
        100,
        Math.round(liveDuration/targetSeconds*100)
      );

      target={
        hasTarget:true,
        text:'Hedef · '+formatDurationLabel(targetSeconds),
        percentText:percent+'%',
        percent,
        reached:liveDuration>=targetSeconds
      };
    }else{
      target={
        hasTarget:false,
        text:'',
        percentText:'',
        percent:0,
        reached:false
      };
    }

    const pauseLabel=isWorking?'Duraklat':'Devam Et';

    return {
      liveDuration,
      subjectText,
      taskText,
      noTask:!hasTodo,
      kicker,
      target,
      subText:isWorking
        ? 'Odak oturumu devam ediyor'
        : 'Oturum duraklatıldı',
      pause:{
        icon:isWorking?'⏸':'▶',
        label:pauseLabel,
        isPausedAction:isWorking,
        isResumeAction:!isWorking
      },
      finish:{
        icon:'■',
        label:'Bitir'
      }
    };
  }

  window.ProductivityFocusView={buildModel};
})();
