(() => {
  'use strict';

  function create(options={}){
    const recover=options.recover;
    const wasReset=options.wasReset || (()=>false);
    const showResetWarning=options.showResetWarning || (()=>{});
    const clearRecoveryPending=options.clearRecoveryPending || (()=>{});
    const saveFallback=options.saveFallback || (()=>{});
    const initOnboarding=options.initOnboarding || (()=>{});
    const dispatchReady=options.dispatchReady || (()=>{});
    const logger=options.logger || console;

    if(typeof recover!=='function'){
      throw new Error('StartupController recover gerekli');
    }

    async function run(){
      try{
        const recovered=await recover();

        if(wasReset() && !recovered){
          showResetWarning();
        }

        initOnboarding();
        return {recovered:Boolean(recovered),failed:false};
      }catch(error){
        logger.warn?.(
          'Başlangıç kurtarma kontrolü tamamlanamadı:',
          error
        );

        clearRecoveryPending();
        saveFallback();

        if(wasReset()){
          showResetWarning();
        }

        initOnboarding();
        return {recovered:false,failed:true,error};
      }finally{
        dispatchReady();
      }
    }

    return Object.freeze({run});
  }

  window.ProductivityStartupController={create};
})();
