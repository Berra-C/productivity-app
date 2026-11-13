const path=require('path');

global.window=global;
require(path.resolve(__dirname,'../assets/js/modules/sync-controller.js'));

const Sync=global.ProductivitySyncController;

function assert(condition,message){
  if(!condition) throw new Error(message);
}

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

async function scenario({
  local,
  remote,
  initial=false,
  baseRevision=0,
  dirty=false,
  risky=false,
  confirm=true,
  conflict=null
}){
  const pushes=[];
  const replacements=[];
  let pullCount=0;

  const controller=Sync.create({
    pull:async()=>{
      pullCount++;
      return clone(remote);
    },
    push:async(state,revision)=>{
      pushes.push({state:clone(state),revision});
      if(conflict && pushes.length===1){
        const error=new Error('conflict');
        error.status=409;
        error.body=clone(conflict);
        throw error;
      }
      return {revision:revision+1};
    },
    exportState:()=>clone(local),
    replaceState:state=>replacements.push(clone(state)),
    mergeStates:(remoteState,localState)=>({
      ...clone(remoteState),
      ...clone(localState),
      tasks:[
        ...(remoteState.tasks||[]),
        ...(localState.tasks||[])
      ]
    }),
    stateRisk:()=>({risky}),
    confirmDestructive:async()=>confirm
  });

  const result=await controller.run({
    initial,
    baseRevision,
    dirty
  });

  return {
    result,
    pushes,
    replacements,
    pullCount
  };
}

(async()=>{
  assert(
    Sync.hasMeaningfulData({
      tasks:[],
      events:[],
      collection:[],
      sessionLog:{}
    })===false,
    'empty state should not be meaningful'
  );

  assert(
    Sync.hasMeaningfulData({
      tasks:[{id:'t1'}],
      sessionLog:{}
    })===true,
    'task state should be meaningful'
  );

  {
    const run=await scenario({
      local:{tasks:[{id:'local'}]},
      remote:{revision:0,state:null}
    });

    assert(run.result.ok===true,'empty remote sync succeeds');
    assert(run.result.action==='push-local-empty-remote','empty remote action');
    assert(run.pushes.length===1,'empty remote pushes local');
    assert(run.replacements.length===0,'empty remote does not replace local');
  }

  {
    const run=await scenario({
      local:{tasks:[{id:'local'}]},
      remote:{
        revision:7,
        state:{tasks:[{id:'remote'}]}
      },
      initial:true,
      baseRevision:0
    });

    assert(run.result.action==='initial-merge-push','initial merge action');
    assert(run.pushes.length===1,'initial merge pushes');
    assert(run.replacements.length===1,'initial merge adopts merged state');
    assert(run.replacements[0].tasks.length===2,'initial merge preserves both sides');
  }

  {
    const run=await scenario({
      local:{tasks:[],events:[],collection:[],sessionLog:{}},
      remote:{
        revision:5,
        state:{tasks:[{id:'remote'}]}
      },
      initial:true,
      baseRevision:0,
      risky:false
    });

    assert(run.result.action==='initial-adopt-remote','empty local adopts remote');
    assert(run.result.baseRevision===5,'remote revision adopted');
    assert(run.replacements.length===1,'remote state replaced');
  }

  {
    const run=await scenario({
      local:{tasks:[{id:'local'}]},
      remote:{
        revision:10,
        state:{tasks:[]}
      },
      initial:false,
      baseRevision:4,
      dirty:false,
      risky:true,
      confirm:false
    });

    assert(run.result.ok===false,'risk rejection returns not ok');
    assert(run.result.protectedLocal===true,'local protected');
    assert(run.result.action==='protect-local','protect action');
    assert(run.replacements.length===0,'risk rejection never replaces local');
    assert(run.pushes.length===0,'risk rejection never pushes candidate');
    assert(run.result.baseRevision===4,'base revision remains unchanged');
  }

  {
    const run=await scenario({
      local:{tasks:[{id:'local'}]},
      remote:{
        revision:10,
        state:{tasks:[{id:'remote'}]}
      },
      initial:false,
      baseRevision:4,
      dirty:true
    });

    assert(run.result.action==='remote-newer-merge-push','newer remote dirty merge');
    assert(run.pushes.length===1,'newer remote dirty push');
    assert(run.pushes[0].revision===10,'merge push uses remote revision');
    assert(run.replacements.length===1,'merged state adopted');
  }

  {
    const run=await scenario({
      local:{tasks:[{id:'local'}]},
      remote:{
        revision:5,
        state:{tasks:[{id:'remote-old'}]}
      },
      baseRevision:5,
      dirty:true,
      conflict:{
        revision:8,
        state:{tasks:[{id:'remote-new'}]}
      }
    });

    assert(run.result.action==='conflict-merge-push','409 conflict merge action');
    assert(run.pushes.length===2,'409 conflict retries push');
    assert(run.pushes[1].revision===8,'409 retry uses conflict revision');
    assert(run.replacements.length===1,'409 merged result adopted');
  }

  {
    const run=await scenario({
      local:{tasks:[{id:'local'}]},
      remote:{
        revision:5,
        state:{tasks:[{id:'remote-old'}]}
      },
      baseRevision:5,
      dirty:true,
      risky:true,
      confirm:false,
      conflict:{
        revision:8,
        state:{tasks:[{id:'remote-new'}]}
      }
    });

    assert(run.result.protectedLocal===true,'risky conflict protects local');
    assert(run.result.action==='protect-local-conflict','risky conflict action');
    assert(run.pushes.length===1,'risky conflict does not retry push');
    assert(run.replacements.length===0,'risky conflict does not replace');
  }

  {
    const run=await scenario({
      local:{tasks:[{id:'local'}]},
      remote:{
        revision:5,
        state:{tasks:[{id:'remote'}]}
      },
      baseRevision:5,
      dirty:false
    });

    assert(run.result.action==='noop','unchanged state is noop');
    assert(run.pushes.length===0,'noop does not push');
    assert(run.replacements.length===0,'noop does not replace');
  }

  console.log('sync controller checks passed');
})().catch(error=>{
  console.error(error);
  process.exit(1);
});
