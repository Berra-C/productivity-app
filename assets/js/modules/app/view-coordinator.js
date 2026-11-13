(() => {
  'use strict';

  function create(options={}){
    const renderTaskList=options.renderTaskList || (()=>{});
    const renderCalendar=options.renderCalendar || (()=>{});
    const renderToday=options.renderToday || (()=>{});
    const renderStats=options.renderStats || (()=>{});
    const renderSummary=options.renderSummary || (()=>{});
    const renderCollection=options.renderCollection || (()=>{});
    const renderWorkButtonRow=options.renderWorkButtonRow || (()=>{});
    const renderDistractionCategorySummary=options.renderDistractionCategorySummary || (()=>{});
    const renderSessionList=options.renderSessionList || (()=>{});
    const updateIntentDisplay=options.updateIntentDisplay || (()=>{});
    const renderTaskTagControls=options.renderTaskTagControls || (()=>{});
    const scheduleLongSessionReview=options.scheduleLongSessionReview || (()=>{});
    const isStatsActive=options.isStatsActive || (()=>false);
    const isCollectionVisible=options.isCollectionVisible || (()=>false);
    const isSummaryVisible=options.isSummaryVisible || (()=>false);

    function refresh(parts,config={}){
      const requested=new Set(
        Array.isArray(parts) ? parts : [parts]
      );

      if(requested.has('tasks')) renderTaskList();
      if(requested.has('calendar')) renderCalendar();
      if(requested.has('today')){
        renderToday(Boolean(config.celebrateTree));
      }

      if(requested.has('stats') && isStatsActive()){
        renderStats();
      }

      if(requested.has('summary') && isSummaryVisible()){
        renderSummary();
      }

      if(requested.has('collection') && isCollectionVisible()){
        renderCollection();
      }
    }

    function renderExternal(){
      renderWorkButtonRow();
      renderToday(false);
      renderDistractionCategorySummary();
      renderSessionList();
      updateIntentDisplay();
      renderTaskTagControls();
      renderTaskList();
      renderCalendar();

      if(isStatsActive()) renderStats();
      if(isCollectionVisible()) renderCollection();
      if(isSummaryVisible()) renderSummary();
    }

    function renderInitial(){
      renderToday(false);
      renderDistractionCategorySummary();
      renderSessionList();
      updateIntentDisplay();
      scheduleLongSessionReview(450);
    }

    return Object.freeze({
      refresh,
      renderExternal,
      renderInitial
    });
  }

  window.ProductivityViewCoordinator={create};
})();
