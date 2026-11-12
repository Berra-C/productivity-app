(() => {
  'use strict';

  function build(options={}){
    const {
      breakActive=false,
      isWorking=false,
      hasActiveSession=false
    }=options;

    if(breakActive){
      return '<button id="breakAdjustBtn" class="work-btn resume">Mola Süresi ⚙️</button>'
        +'<button id="breakSkipBtn" class="work-btn finish">Molayı Geç · Yeni Oturum ▶</button>';
    }

    if(isWorking){
      return '<button id="workToggle" class="work-btn active">Duraklat ⏸</button>';
    }

    if(hasActiveSession){
      return '<button id="workResumeBtn" class="work-btn resume">Devam Et ▶</button>'
        +'<button id="workFinishBtn" class="work-btn finish">Bitir ✓</button>';
    }

    return '<button id="workToggle" class="work-btn idle">Çalışmaya Başla ▶</button>';
  }

  window.ProductivityWorkControlsView={build};
})();
