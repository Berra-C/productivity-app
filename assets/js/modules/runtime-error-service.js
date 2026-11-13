(() => {
  'use strict';

  function bind(options={}){
    const win=options.window || window;
    const doc=options.document || document;
    let bound=false;

    function show(message,prefix){
      const box=doc.getElementById('runtimeErrorBanner');
      const text=doc.getElementById('runtimeErrorText');
      if(!box || !text) return;
      text.textContent=prefix+message;
      box.classList.add('show');
    }

    function onError(event){
      show(
        event?.error?.message || event?.message || 'Bilinmeyen hata',
        'Uygulamada bir hata oluştu: '
      );
    }

    function onRejection(event){
      show(
        event?.reason?.message || String(event?.reason || 'Bilinmeyen hata'),
        'Uygulamada bir işlem tamamlanamadı: '
      );
    }

    function onClick(event){
      if(event?.target?.id==='runtimeErrorClose'){
        doc.getElementById('runtimeErrorBanner')?.classList.remove('show');
      }
    }

    win.addEventListener('error',onError);
    win.addEventListener('unhandledrejection',onRejection);
    doc.addEventListener('click',onClick);
    bound=true;

    return Object.freeze({
      get bound(){ return bound; },
      dispose(){
        if(!bound) return;
        win.removeEventListener('error',onError);
        win.removeEventListener('unhandledrejection',onRejection);
        doc.removeEventListener('click',onClick);
        bound=false;
      }
    });
  }

  window.ProductivityRuntimeErrorService={bind};
})();
