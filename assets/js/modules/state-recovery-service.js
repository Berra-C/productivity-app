(() => {
  'use strict';

  function create(options={}){
    const getNeedsRecovery=options.getNeedsRecovery || (()=>false);
    const setNeedsRecovery=options.setNeedsRecovery || (()=>{});
    const readRecoverySnapshot=options.readRecoverySnapshot;
    const migrate=options.migrate;
    const setState=options.setState || (()=>{});
    const normalizeRecoveredState=options.normalizeRecoveredState || (()=>{});
    const prepareRecoveredState=options.prepareRecoveredState || (()=>{});
    const saveCurrent=options.saveCurrent || (()=>{});
    const scheduleReview=options.scheduleReview || (()=>{});
    const renderRecovered=options.renderRecovered || (()=>{});
    const notifyRecovered=options.notifyRecovered || (()=>{});
    const logger=options.logger || console;

    if(typeof readRecoverySnapshot!=='function'){
      throw new Error('StateRecoveryService readRecoverySnapshot gerekli');
    }
    if(typeof migrate!=='function'){
      throw new Error('StateRecoveryService migrate gerekli');
    }

    async function recoverIfNeeded(){
      if(!getNeedsRecovery()) return false;

      let restored=null;
      try{
        const parsed=await readRecoverySnapshot();
        restored=migrate(parsed,'IndexedDB recovery');
      }catch(error){
        logger.warn?.('IndexedDB kurtarma snapshotı okunamadı:',error);
      }

      setNeedsRecovery(false);

      if(!restored){
        saveCurrent();
        return false;
      }

      setState(restored);
      normalizeRecoveredState(restored);
      prepareRecoveredState(restored);
      saveCurrent({force:true});
      scheduleReview();
      renderRecovered(restored);
      notifyRecovered(restored);
      return true;
    }

    return Object.freeze({recoverIfNeeded});
  }

  window.ProductivityStateRecoveryService={create};
})();
