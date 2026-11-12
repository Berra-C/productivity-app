(() => {
  'use strict';

  function pickSpecies(pool=[]){
    if(!Array.isArray(pool) || !pool.length){
      return {name:'Filiz',emoji:'🌱'};
    }

    let index;

    if(
      typeof crypto!=='undefined' &&
      typeof crypto.getRandomValues==='function'
    ){
      const value=new Uint32Array(1);
      crypto.getRandomValues(value);
      index=value[0] % pool.length;
    }else{
      index=Math.floor(Math.random()*pool.length);
    }

    return pool[index];
  }

  function ensureTreeState(state){
    if(!Array.isArray(state.collection)) state.collection=[];
    state.treeProgress=Math.max(0,Number(state.treeProgress)||0);
    state.treeNumber=Math.max(1,Number(state.treeNumber)||1);
    return state;
  }

  function completeTree(state,{
    pool=[],
    pick=pickSpecies,
    now=()=>new Date().toISOString()
  }={}){
    ensureTreeState(state);

    const species=pick(pool);
    state.collection.push({
      species:species.name,
      emoji:species.emoji,
      treeNumber:state.treeNumber,
      completedAt:now()
    });
    state.treeNumber+=1;

    return species;
  }

  function addGrowth(state,amount,{
    goal=140,
    pool=[],
    pick=pickSpecies,
    now=()=>new Date().toISOString()
  }={}){
    ensureTreeState(state);

    const growth=Math.max(0,Number(amount)||0);
    const safeGoal=Math.max(1,Number(goal)||140);
    if(growth<=0) return [];

    state.treeProgress+=growth;
    const completed=[];

    while(state.treeProgress>=safeGoal){
      state.treeProgress-=safeGoal;
      completed.push(completeTree(state,{pool,pick,now}));
    }

    return completed;
  }

  function removeGrowth(state,amount,{goal=140}={}){
    ensureTreeState(state);

    let remaining=Math.max(0,Number(amount)||0);
    const safeGoal=Math.max(1,Number(goal)||140);
    if(remaining<=0) return 0;

    const totalAvailable=state.treeProgress+state.collection.length*safeGoal;
    remaining=Math.min(remaining,totalAvailable);
    const original=remaining;

    while(remaining>state.treeProgress+1e-9 && state.collection.length){
      remaining-=state.treeProgress;
      state.treeProgress=0;
      state.collection.pop();
      state.treeNumber=Math.max(1,state.treeNumber-1);
      state.treeProgress=safeGoal;
    }

    state.treeProgress=Math.max(0,state.treeProgress-remaining);
    if(state.treeProgress>=safeGoal){
      state.treeProgress%=safeGoal;
    }

    return original;
  }

  window.ProductivityTreeService={
    pickSpecies,
    completeTree,
    addGrowth,
    removeGrowth
  };
})();
