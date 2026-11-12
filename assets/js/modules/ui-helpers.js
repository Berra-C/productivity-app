(() => {
  'use strict';

  function scrollCurrentMonthIntoView(container, year, options={}){
    if(!container) return false;
    const maxWidth = Number(options.maxWidth || 620);
    if(window.innerWidth > maxWidth) return false;

    const now = new Date();
    if(Number(year) !== now.getFullYear()) return false;

    const key = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const target = container.querySelector(`[data-month="${key}"]`);
    if(!target) return false;

    requestAnimationFrame(() => {
      target.scrollIntoView({behavior:'smooth', block:'start', inline:'nearest'});
    });
    return true;
  }


  window.ProductivityUIHelpers = {
    scrollCurrentMonthIntoView
  };
})();
