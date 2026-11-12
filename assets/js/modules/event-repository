(() => {
  'use strict';

  function create(options={}){
    const getState=options.getState;
    if(typeof getState!=='function'){
      throw new Error('EventRepository getState gerekli');
    }

    function list(){
      const state=getState();
      if(!Array.isArray(state.events)) state.events=[];
      return state.events;
    }

    function byId(id){
      if(!id) return null;
      return list().find(event=>event?.id===id) || null;
    }

    function add(event){
      if(!event || typeof event!=='object'){
        throw new Error('EventRepository geçerli event gerekli');
      }
      list().push(event);
      return event;
    }

    function removeById(id){
      const events=list();
      const index=events.findIndex(event=>event?.id===id);
      if(index<0) return null;
      return events.splice(index,1)[0] || null;
    }

    function startingOn(key){
      return list().filter(event=>event?.date===key);
    }

    function recurring(){
      return list().filter(
        event=>event?.repeat && event.repeat!=='none'
      );
    }

    return Object.freeze({
      all:list,
      byId,
      add,
      removeById,
      startingOn,
      recurring
    });
  }

  window.ProductivityEventRepository={create};
})();
