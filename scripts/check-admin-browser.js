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
        path.join(root,'admin.html'),
        'utf8'
      )
    );

    await cdp.send('Page.setDocumentContent',{
      frameId,
      html
    });

    const fixture={"summary": {"totalAccounts": 12, "totalWorkSeconds": 86400, "averageSessionSeconds": 2400}, "charts": {"daily": [{"date": "2026-11-14", "workSeconds": 7200, "sessions": 3, "workingAccounts": 2, "averageSessionSeconds": 2400}], "weekday": [], "hourly": [], "accountStatus": [{"label": "Aktif", "value": 12}]}, "productAnalytics": {"telemetryStartedAt": "2026-11-01T00:00:00.000Z", "summary": {"dau": 4, "wau": 7, "mau": 10, "meaningfulWau": 5, "meaningfulRate": 71.4, "learningLoopWau": 3, "analyticsAdoption": 42.9, "taskFocusAdoption": 57.1, "newAccounts30": 6}, "retention": {"d1": {"eligible": 6, "retained": 4, "rate": 66.7}, "d7": {"eligible": 4, "retained": 2, "rate": 50}, "d30": {"eligible": 0, "retained": 0, "rate": null}}, "activation": {"cohortSize": 6, "rows": [{"label": "Yeni hesap", "users": 6, "rate": 100}, {"label": "İlk görev", "users": 5, "rate": 83.3}, {"label": "Task → Focus", "users": 4, "rate": 66.7}, {"label": "Focus tamamlandı", "users": 4, "rate": 66.7}, {"label": "İlk rating", "users": 3, "rate": 50}, {"label": "Analytics açıldı", "users": 2, "rate": 33.3}]}, "coreLoop": {"focusCompleted": 18, "ratingEligible": 15, "ratingResponses": 10, "ratingResponseRate": 66.7, "analyticsUsers": 3, "taskFocusUsers": 4}, "featureAdoption": [{"label": "Focus", "eventName": "focus_completed", "users": 6, "rate": 85.7}, {"label": "Analytics", "eventName": "analytics_opened", "users": 3, "rate": 42.9}], "reliability": {"syncSuccess": 40, "syncFailed": 1, "syncAttempts": 41, "syncFailureRate": 2.4, "syncConflicts": 2, "destructiveBlocks": 1, "runtimeErrors": 0, "affectedUsers": 2}, "daily": [{"date": "2026-11-13", "newAccounts": 1, "activeUsers": 5, "focusCompleted": 8, "ratedSessions": 4, "analyticsUsers": 2}, {"date": "2026-11-14", "newAccounts": 2, "activeUsers": 4, "focusCompleted": 10, "ratedSessions": 6, "analyticsUsers": 3}], "cohorts": [{"week": "2026-11-02", "size": 4, "w0": 100, "w1": 50, "w2": null, "w3": null}], "releases": [{"version": "v95", "activeUsers": 7, "events": 100, "focusCompleted": 18, "sessionRatings": 10, "syncSuccess": 40, "syncFailed": 1, "syncConflicts": 2, "syncFailureRate": 2.4}], "insights": [{"kind": "growth", "title": "Activation yükseliyor.", "detail": "Task → Focus kullanımı güçlü."}]}, "users": []};
    await cdp.evaluate(`(()=>{
      window.CLOUD_CONFIG={
        supabaseUrl:'https://example.supabase.co',
        anonKey:'x'.repeat(40),
        functionName:'app-api'
      };
      window.fetch=async()=>({
        ok:true,
        status:200,
        json:async()=>(${JSON.stringify(fixture)})
      });
      return true;
    })()`);

    const adminCode=fs.readFileSync(
      path.join(root,'assets/js/admin.js'),
      'utf8'
    );
    await cdp.evaluate(adminCode,false);

    await cdp.evaluate(`(()=>{
      const secret=document.getElementById('adminSecret');
      const load=document.getElementById('adminLoad');
      if(!secret || !load) throw new Error('admin controls missing');
      secret.value='test-secret';
      load.click();
      return true;
    })()`);

    await waitFor(()=>cdp.evaluate(`
      document.getElementById('adminSummary')?.textContent?.includes('WAU') &&
      document.getElementById('releaseTable')?.textContent?.includes('v95')
    `),10000);

    const state=await cdp.evaluate(`(()=>({
      summary:document.getElementById('adminSummary')?.textContent||'',
      insights:document.getElementById('adminInsights')?.textContent||'',
      funnel:document.getElementById('activationFunnel')?.textContent||'',
      retention:document.getElementById('retentionCards')?.textContent||'',
      adoption:document.getElementById('featureAdoption')?.textContent||'',
      reliability:document.getElementById('reliabilityCards')?.textContent||'',
      release:document.getElementById('releaseTable')?.textContent||'',
      scope:document.getElementById('telemetryScope')?.textContent||'',
      connected:document.getElementById('adminConnection')?.classList.contains('on')||false
    }))()`);

    if(
      !state.connected ||
      !state.summary.includes('Meaningful WAU') ||
      !state.summary.includes('Learning Loop WAU') ||
      !state.insights.includes('Activation yükseliyor') ||
      !state.funnel.includes('Task → Focus') ||
      !state.retention.includes('D7') ||
      !state.adoption.includes('Analytics') ||
      !state.reliability.includes('Sync hata oranı') ||
      !state.release.includes('v95') ||
      !state.scope.includes('İçerik metinleri toplanmaz')
    ){
      throw new Error('admin analytics DOM did not render expected product metrics');
    }

    const errors=cdp.events.filter(event=>
      event.method==='Runtime.exceptionThrown' ||
      (event.method==='Runtime.consoleAPICalled' && event.params?.type==='error')
    );
    if(errors.length) throw new Error(`Admin Chromium runtime produced ${errors.length} error event(s)`);

    console.log('admin headless Chromium analytics checks passed');
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
