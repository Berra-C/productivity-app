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
    this.defaultSessionId=null;

    this.openPromise=new Promise((resolve,reject)=>{
      const cleanup=()=>{
        this.ws.removeEventListener('open',onOpen);
        this.ws.removeEventListener('error',onError);
      };

      const onOpen=()=>{
        cleanup();
        resolve();
      };

      const onError=event=>{
        cleanup();
        reject(event);
      };

      this.ws.addEventListener('open',onOpen);
      this.ws.addEventListener('error',onError);

      if(this.ws.readyState===WebSocket.OPEN){
        onOpen();
      }else if(
        this.ws.readyState===WebSocket.CLOSING ||
        this.ws.readyState===WebSocket.CLOSED
      ){
        onError(new Error('CDP WebSocket closed before open'));
      }
    });

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
    if(this.ws.readyState===WebSocket.OPEN){
      return Promise.resolve();
    }

    return this.openPromise;
  }

  send(method,params={},sessionId=this.defaultSessionId){
    return new Promise((resolve,reject)=>{
      const id=++this.nextId;
      this.pending.set(id,{resolve,reject});

      const message={id,method,params};

      if(sessionId){
        message.sessionId=sessionId;
      }

      this.ws.send(JSON.stringify(message));
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

  const profile=fs.mkdtempSync(
    path.join(os.tmpdir(),'productivity-browser-check-')
  );

  let browserStderr='';

  const browser=spawn(
    chromium,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--remote-allow-origins=*',
      '--remote-debugging-address=127.0.0.1',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      'about:blank'
    ],
    {stdio:['ignore','ignore','pipe']}
  );

  browser.stderr?.on('data',chunk=>{
    browserStderr+=String(chunk);
    if(browserStderr.length>12000){
      browserStderr=browserStderr.slice(-12000);
    }
  });

  let cdp=null;

  try{
    const activePortFile=path.join(
      profile,
      'DevToolsActivePort'
    );

    const activePort=await waitFor(async()=>{
      if(!fs.existsSync(activePortFile)){
        if(browser.exitCode!==null){
          throw new Error(
            'Chromium exited before DevTools startup. '+
            browserStderr
          );
        }
        return null;
      }

      const lines=fs
        .readFileSync(activePortFile,'utf8')
        .split(/\r?\n/)
        .filter(Boolean);

      const port=Number(lines[0]);
      const browserPath=lines[1];

      if(
        !Number.isInteger(port) ||
        port<=0 ||
        !browserPath
      ){
        return null;
      }

      return {port,browserPath};
    },20000);

    const browserWebSocketUrl=
      `ws://127.0.0.1:${activePort.port}${activePort.browserPath}`;

    cdp=await waitFor(async()=>{
      if(browser.exitCode!==null){
        throw new Error(
          'Chromium exited before CDP attachment. '+
          browserStderr
        );
      }

      const candidate=new CDP(browserWebSocketUrl);

      try{
        await candidate.open();
        return candidate;
      }catch(error){
        try{
          candidate.close();
        }catch(closeError){}
        return null;
      }
    },10000);

    let targets=await cdp.send(
      'Target.getTargets',
      {},
      null
    );

    let pageTarget=targets.targetInfos.find(
      item=>item.type==='page'
    );

    if(!pageTarget){
      const created=await cdp.send(
        'Target.createTarget',
        {url:'about:blank'},
        null
      );

      targets=await cdp.send(
        'Target.getTargets',
        {},
        null
      );

      pageTarget=targets.targetInfos.find(
        item=>item.targetId===created.targetId
      );
    }

    if(!pageTarget){
      throw new Error(
        'Chromium page target bulunamadı.'
      );
    }

    const attached=await cdp.send(
      'Target.attachToTarget',
      {
        targetId:pageTarget.targetId,
        flatten:true
      },
      null
    );

    cdp.defaultSessionId=attached.sessionId;

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
    await cdp.evaluate(`(()=>{
      localStorage.setItem('test_cloud_session','t'.repeat(48));
      window.__telemetryRequests=[];
      window.__apiRequests=[];
      window.fetch=async(url,options={})=>{
        const body=JSON.parse(options.body||'{}');
        window.__apiRequests.push(body.action||'');
        if(body.action==='telemetry-batch'){
          window.__telemetryRequests.push(JSON.parse(JSON.stringify(body)));
          return {ok:true,status:200,json:async()=>({accepted:(body.events||[]).length})};
        }
        if(body.action==='me') return {ok:true,status:200,json:async()=>({accountId:'account-1',username:'TEST-0001'})};
        if(body.action==='sync-pull') return {ok:true,status:200,json:async()=>({accountId:'account-1',username:'TEST-0001',state:null,revision:0,updatedAt:null})};
        if(body.action==='sync-push') return {ok:true,status:200,json:async()=>({revision:1,updatedAt:new Date().toISOString()})};
        if(body.action==='list-devices') return {ok:true,status:200,json:async()=>({devices:[]})};
        return {ok:true,status:200,json:async()=>({ok:true})};
      };
      return true;
    })()`);

    const appCode=fs.readFileSync(path.join(root,'assets/js/app.js'),'utf8');
    const cloudCode=fs.readFileSync(path.join(root,'assets/js/cloud-sync.js'),'utf8');
    const bootCode=`${appCode}\n;window.CLOUD_CONFIG={supabaseUrl:'https://example.supabase.co',anonKey:'x'.repeat(40),functionName:'app-api'};\n${cloudCode}`;
    await cdp.evaluate(bootCode,false);
    await cdp.evaluate(`window.dispatchEvent(new CustomEvent('app:ready'))`);
    await waitFor(
      ()=>cdp.evaluate(
        `window.__apiRequests.includes('telemetry-batch')`
      ),
      15000
    );

    await cdp.evaluate(`document.getElementById('onboardSkip')?.click()`);
    await cdp.evaluate(`(()=>{
      const input=document.getElementById('taskInput');
      const button=document.getElementById('taskAddBtn');
      if(!input || !button) throw new Error('task controls missing');
      input.value='TOP SECRET TELEMETRY TASK';
      button.click();
      return true;
    })()`);

    await waitFor(()=>cdp.evaluate(`
      window.__telemetryRequests.some(batch=>
        (batch.events||[]).some(event=>event.name==='task_created')
      )
    `),15000);

    const telemetryState=await cdp.evaluate(`(()=>{
      const serialized=JSON.stringify(window.__telemetryRequests);
      const taskEvent=window.__telemetryRequests
        .flatMap(batch=>batch.events||[])
        .find(event=>event.name==='task_created');
      return {
        leaked:serialized.includes('TOP SECRET TELEMETRY TASK'),
        hasAppOpen:serialized.includes('app_opened'),
        hasSyncSuccess:serialized.includes('sync_success'),
        taskProperties:taskEvent?.properties||null,
        requestCount:window.__telemetryRequests.length
      };
    })()`);

    if(
      telemetryState.leaked ||
      !telemetryState.hasAppOpen ||
      !telemetryState.hasSyncSuccess ||
      !telemetryState.taskProperties ||
      Object.keys(telemetryState.taskProperties).some(key=>
        !['hasDueDate','hasTime','hasTag','repeat'].includes(key)
      )
    ){
      throw new Error('privacy-safe telemetry payload contract failed');
    }

    // Explicit user opt-out must stop future telemetry from this device.
    await cdp.evaluate(`(()=>{
      const toggle=document.getElementById('cloudTelemetryEnabled');
      if(!toggle) throw new Error('telemetry opt-out control missing');
      toggle.checked=false;
      toggle.dispatchEvent(new Event('change',{bubbles:true}));
      return true;
    })()`);

    const beforeOptOut=await cdp.evaluate(`window.__telemetryRequests.length`);

    await cdp.evaluate(`(()=>{
      const input=document.getElementById('taskInput');
      const button=document.getElementById('taskAddBtn');
      input.value='SECOND PRIVATE TASK';
      button.click();
      return true;
    })()`);
    await cdp.evaluate(`new Promise(resolve=>setTimeout(resolve,2200))`);
    const afterOptOut=await cdp.evaluate(`window.__telemetryRequests.length`);
    const optOutStored=await cdp.evaluate(`localStorage.getItem('test_product_analytics_optout')`);

    if(afterOptOut!==beforeOptOut || optOutStored!=='1'){
      throw new Error('telemetry opt-out did not stop event delivery');
    }

    const errors=cdp.events.filter(event=>
      event.method==='Runtime.exceptionThrown' ||
      (event.method==='Runtime.consoleAPICalled' && event.params?.type==='error')
    );
    if(errors.length) throw new Error(`Telemetry Chromium runtime produced ${errors.length} error event(s)`);

    console.log('authenticated telemetry Chromium checks passed');
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
