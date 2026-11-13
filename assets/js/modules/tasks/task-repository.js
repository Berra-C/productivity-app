(() => {
  'use strict';

  function create(options={}){
    const getState=options.getState;
    if(typeof getState!=='function'){
      throw new Error('TaskRepository getState gerekli');
    }

    function list(){
      const state=getState();
      if(!Array.isArray(state.tasks)) state.tasks=[];
      return state.tasks;
    }

    function byId(id){
      if(!id) return null;
      return list().find(task=>task?.id===id) || null;
    }

    function add(task){
      if(!task || typeof task!=='object'){
        throw new Error('TaskRepository geçerli task gerekli');
      }
      list().push(task);
      return task;
    }

    function removeById(id){
      const tasks=list();
      const index=tasks.findIndex(task=>task?.id===id);
      if(index<0) return null;
      return tasks.splice(index,1)[0] || null;
    }

    function forDate(key){
      return list().filter(task=>task?.dueDate===key);
    }

    function completed(){
      return list().filter(task=>Boolean(task?.done));
    }

    function pending(){
      return list().filter(task=>!task?.done);
    }

    function nextSortOrder(){
      return list().reduce(
        (max,task)=>Math.max(max,Number(task?.sortOrder)||0),
        -1
      )+1;
    }

    return Object.freeze({
      all:list,
      byId,
      add,
      removeById,
      forDate,
      completed,
      pending,
      nextSortOrder
    });
  }

  window.ProductivityTaskRepository={create};
})();
