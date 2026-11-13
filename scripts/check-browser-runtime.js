const fs=require('fs');
const path=require('path');
const os=require('os');
const {spawn}=require('child_process');

const root=path.resolve(__dirname,'..');

function chromiumBinary(){
  const candidates=[
    process.env.CHROMIUM_BIN,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable'
  ].filter(Boolean);

  return candidates.find(file=>fs.existsSync(file)) || null;
}

function sleep(ms){
  return new Promise(resolve=>setTimeout(resolve,ms));
}

async function waitFor(fn,timeout=15000){
  const started=Date.now();
  let lastError=null;

  while(Date.now()-started<timeout){
    try{
      const value=await fn();
      if(value) return value;
    }catch(error){
      lastError=error;
    }
    await sleep(80);
  }

  throw lastError || new Error('browser wait timeout');
}

class CDP {
  constructor(url){
    this.ws=new WebSocket(url);
    this.nextId=0;
    this.pending=new Map();
    this.events=[];

    this.ws.onmessage=event=>{
      const message=JSON.parse(event.data);

      if(message.id){
        const pending=this.pending.get(message.id);
        if(!pending) return;

        this.pending.delete(message.id);

        if(message.error){
          pending.reject(
            new Error(JSON.stringify(message.error))
          );
        }else{
          pending.resolve(message.result);
        }
        return;
      }

      this.events.push(message);
    };
  }

  open(){
    return new Promise((resolve,reject)=>{
      this.ws.onopen=resolve;
      this.ws.onerror=reject;
    });
  }

  send(method,params={}){
    return new Promise((resolve,reject)=>{
      const id=++this.nextId;
      this.pending.set(id,{resolve,reject});
      this.ws.send(JSON.stringify({id,method,params}));
    });
  }

  async evaluate(expression,awaitPromise=true){
    const result=await this.send('Runtime.evaluate',{
      expression,
      awaitPromise,
      returnByValue:true,
      userGesture:true
    });

    if(result.exceptionDetails){
      throw new Error(
        result.exceptionDetails.exception?.description ||
        result.exceptionDetails.text ||
        'Runtime.evaluate failed'
      );
    }

    return result.result.value;
  }

  close(){
    this.ws.close();
  }
}

function stripExternalAssets(html){
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
    .replace(/<script\b[^>]*\/?>/gi,'')
    .replace(
      /<link\b[^>]*rel=["'](?:stylesheet|manifest)["'][^>]*>/gi,
      ''
    );
}

function browserStubs(){
  return `(()=>{
    const memory=new Map();

    const storage={
      getItem:key=>
        memory.has(String(key))
          ? memory.get(String(key))
          : null,
      setItem:(key,value)=>
        memory.set(String(key),String(value)),
      removeItem:key=>memory.delete(String(key)),
      clear:()=>memory.clear(),
      key:index=>Array.from(memory.keys())[index] || null,
      get length(){ return memory.size; }
    };

    Object.defineProperty(window,'localStorage',{
      configurable:true,
      value:storage
    });

    Object.defineProperty(window,'sessionStorage',{
      configurable:true,
      value:storage
    });

    window.Notification=function(){};
    Notification.permission='denied';
    Notification.requestPermission=async()=> 'denied';

    window.AudioContext=undefined;
    window.webkitAudioContext=undefined;

    return true;
  })()`;
}

(async()=>{
  const chromium=chromiumBinary();

  if(!chromium){
    throw new Error(
      'Chromium bulunamadı. CHROMIUM_BIN ile Chromium/Chrome yolunu belirt.'
    );
  }

  const debugPort=10000+Math.floor(Math.random()*3000);
  const profile=fs.mkdtempSync(
    path.join(os.tmpdir(),'productivity-browser-check-')
  );

  const browser=spawn(
    chromium,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profile}`,
      'about:blank'
    ],
    {stdio:['ignore','ignore','pipe']}
  );

  let cdp=null;

  try{
    const target=await waitFor(async()=>{
      const response=await fetch(
        `http://127.0.0.1:${debugPort}/json`
      );

      if(!response.ok) return null;

      const targets=await response.json();
      return targets.find(item=>item.type==='page') || null;
    },20000);

    cdp=new CDP(target.webSocketDebuggerUrl);
    await cdp.open();
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');

    const frameTree=await cdp.send('Page.getFrameTree');
    const frameId=frameTree.frameTree.frame.id;

    const html=stripExternalAssets(
      fs.readFileSync(
        path.join(root,'index.html'),
        'utf8'
      )
    );

    await cdp.send('Page.setDocumentContent',{
      frameId,
      html
    });

    await cdp.evaluate(browserStubs());

    const productionScripts=[
      'assets/js/app.js',
      'assets/js/cloud-config.js',
      'assets/js/cloud-sync.js'
    ];

    // Production uses defer scripts in this exact order. Execute them inside
    // one Chromium task so promise microtasks from app.js cannot overtake
    // cloud-sync.js listener registration.
    const productionCode=productionScripts
      .map(relativePath=>
        fs.readFileSync(
          path.join(root,relativePath),
          'utf8'
        )
      )
      .join('\n;\n');

    await cdp.evaluate(productionCode,false);

    await waitFor(()=>
      cdp.evaluate(
        'Boolean(window.__APP_CLOUD_BRIDGE__)'
      ),
      15000
    );

    // Fresh-user onboarding should be dismissible.
    await cdp.evaluate(`
      (()=>{
        document.getElementById('onboardSkip')?.click();
        return true;
      })()
    `);

    // TASK: real DOM input -> click -> application state.
    await cdp.evaluate(`
      (()=>{
        const input=document.getElementById('taskInput');
        const button=document.getElementById('taskAddBtn');
        if(!input || !button) throw new Error('task controls missing');
        input.value='Browser regression task';
        button.click();
        return true;
      })()
    `);

    await waitFor(()=>
      cdp.evaluate(`
        window.__APP_CLOUD_BRIDGE__
          .exportState()
          .tasks
          .some(task=>task.text==='Browser regression task')
      `)
    );

    // Task delegation must also toggle completion.
    await cdp.evaluate(`
      (()=>{
        const button=document.querySelector(
          '[data-action="toggle-task"]'
        );
        if(!button) throw new Error('task toggle missing');
        button.click();
        return true;
      })()
    `);

    await waitFor(()=>
      cdp.evaluate(`
        window.__APP_CLOUD_BRIDGE__
          .exportState()
          .tasks
          .some(task=>
            task.text==='Browser regression task' &&
            task.done===true
          )
      `)
    );

    // Browser integration must also persist the mutation through the real
    // StateWriter/StatePersistence path (Storage itself is in-memory here).
    const persistedAfterTask=await cdp.evaluate(`
      localStorage.getItem('direncAgaci_v2')
    `);

    if(!persistedAfterTask){
      throw new Error('primary storage was not written after task mutation');
    }

    const persistedTaskState=JSON.parse(persistedAfterTask);

    if(
      !persistedTaskState.tasks?.some(task=>
        task.text==='Browser regression task' &&
        task.done===true
      )
    ){
      throw new Error('completed task missing from serialized primary state');
    }

    // Cloud UI is initialized from the separately loaded production script.
    const cloudUiReady=await cdp.evaluate(`
      Boolean(document.getElementById('cloudStatus'))
    `);

    if(!cloudUiReady){
      throw new Error('cloud account UI did not initialize');
    }

    // TIMER: idle -> goal modal -> working.
    await cdp.evaluate(`
      (()=>{
        const button=document.getElementById('workToggle');
        if(!button) throw new Error('workToggle missing');
        button.click();
        return true;
      })()
    `);

    await waitFor(()=>
      cdp.evaluate(`
        document
          .getElementById('goalBackdrop')
          ?.classList
          .contains('show')
      `)
    );

    await cdp.evaluate(`
      (()=>{
        const input=document.getElementById('goalMinutesDisplay');
        const start=document.getElementById('goalStart');

        if(!input || !start){
          throw new Error('goal controls missing');
        }

        input.value='1';
        input.dispatchEvent(
          new Event('input',{bubbles:true})
        );
        start.click();
        return true;
      })()
    `);

    await waitFor(()=>
      cdp.evaluate(`
        window.__APP_CLOUD_BRIDGE__
          .exportState()
          .isWorking===true
      `)
    );

    const activeSessionId=await cdp.evaluate(`
      window.__APP_CLOUD_BRIDGE__
        .exportState()
        .activeSessionId
    `);

    if(!activeSessionId){
      throw new Error('active session id missing');
    }

    // working -> paused.
    await cdp.evaluate(
      `document.getElementById('workToggle').click()`
    );

    await waitFor(()=>
      cdp.evaluate(`
        (()=>{
          const state=window.__APP_CLOUD_BRIDGE__.exportState();
          return state.isWorking===false &&
            state.activeSessionId===${JSON.stringify(activeSessionId)};
        })()
      `)
    );

    // paused -> working.
    await cdp.evaluate(
      `document.getElementById('workResumeBtn').click()`
    );

    await waitFor(()=>
      cdp.evaluate(`
        window.__APP_CLOUD_BRIDGE__
          .exportState()
          .isWorking===true
      `)
    );

    // working -> paused -> finished -> break.
    await cdp.evaluate(
      `document.getElementById('workToggle').click()`
    );

    await waitFor(()=>
      cdp.evaluate(`
        window.__APP_CLOUD_BRIDGE__
          .exportState()
          .isWorking===false
      `)
    );

    await cdp.evaluate(
      `document.getElementById('workFinishBtn').click()`
    );

    await waitFor(()=>
      cdp.evaluate(`
        (()=>{
          const state=window.__APP_CLOUD_BRIDGE__.exportState();

          return (
            state.activeSessionId===null &&
            Boolean(state.breakState) &&
            Object.values(state.sessionLog||{})
              .flat()
              .some(session=>
                session.id===${JSON.stringify(activeSessionId)} &&
                Boolean(session.endedAt)
              )
          );
        })()
      `)
    );

    const persistedAfterSession=await cdp.evaluate(`
      localStorage.getItem('direncAgaci_v2')
    `);

    if(!persistedAfterSession){
      throw new Error('primary storage missing after finished session');
    }

    const persistedSessionState=JSON.parse(persistedAfterSession);
    const persistedSession=Object.values(
      persistedSessionState.sessionLog||{}
    )
      .flat()
      .find(session=>session.id===activeSessionId);

    if(
      !persistedSession ||
      !persistedSession.endedAt ||
      persistedSessionState.activeSessionId!==null
    ){
      throw new Error('finished session was not serialized correctly');
    }

    // Task delete uses the real delegated click path and must persist too.
    await cdp.evaluate(`
      (()=>{
        const target=[
          ...document.querySelectorAll('[data-action="delete-task"]')
        ].find(button=>{
          const card=button.closest('[data-task-id]');
          return card?.textContent?.includes('Browser regression task');
        });

        if(!target){
          throw new Error('task delete control missing');
        }

        target.click();
        return true;
      })()
    `);

    await waitFor(()=>
      cdp.evaluate(`
        !window.__APP_CLOUD_BRIDGE__
          .exportState()
          .tasks
          .some(task=>task.text==='Browser regression task')
      `)
    );

    const persistedAfterDelete=JSON.parse(
      await cdp.evaluate(`
        localStorage.getItem('direncAgaci_v2')
      `)
    );

    if(
      persistedAfterDelete.tasks?.some(
        task=>task.text==='Browser regression task'
      )
    ){
      throw new Error('deleted task remained in primary storage');
    }

    // Browser runtime banner must remain hidden.
    const runtimeBannerVisible=await cdp.evaluate(`
      document
        .getElementById('runtimeErrorBanner')
        ?.classList
        .contains('show') || false
    `);

    if(runtimeBannerVisible){
      throw new Error('runtime error banner became visible');
    }

    const errors=cdp.events.filter(event=>
      event.method==='Runtime.exceptionThrown' ||
      (
        event.method==='Runtime.consoleAPICalled' &&
        event.params?.type==='error'
      )
    );

    if(errors.length){
      throw new Error(
        `Chromium runtime produced ${errors.length} error event(s)`
      );
    }

    console.log(
      'headless Chromium DOM regression checks passed'
    );
  }finally{
    try{ cdp?.close(); }catch(error){}
    browser.kill('SIGKILL');

    // Browser process may still hold profile files for a short moment.
    await sleep(250);

    try{
      fs.rmSync(profile,{
        recursive:true,
        force:true,
        maxRetries:5,
        retryDelay:100
      });
    }catch(error){}
  }
})().catch(error=>{
  console.error(error);
  process.exit(1);
});
