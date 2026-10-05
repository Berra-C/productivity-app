(()=>{
  'use strict';

  const cfg=window.CLOUD_CONFIG||{};
  const LS={
    token:'test_cloud_session',
    username:'test_cloud_username',
    baseRevision:'test_cloud_base_revision',
    accountId:'test_cloud_account_id',
    dirty:'test_cloud_dirty',
    lastSync:'test_cloud_last_sync'
  };
  let syncTimer=null;
  let syncing=false;
  let suppressDirty=false;
  let account=null;

  const $=id=>document.getElementById(id);
  const configured=()=>/^https:\/\/.+/.test(String(cfg.supabaseUrl||'')) && String(cfg.anonKey||'').length>20;
  const endpoint=()=>`${String(cfg.supabaseUrl).replace(/\/$/,'')}/functions/v1/${cfg.functionName||'app-api'}`;
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const clone=value=>JSON.parse(JSON.stringify(value));

  function getToken(){ return localStorage.getItem(LS.token)||sessionStorage.getItem(LS.token)||''; }
  function storeToken(token,remember){
    localStorage.removeItem(LS.token); sessionStorage.removeItem(LS.token);
    (remember?localStorage:sessionStorage).setItem(LS.token,token);
  }
  function clearAuth(){
    Object.values(LS).forEach(k=>localStorage.removeItem(k));
    sessionStorage.removeItem(LS.token);
    account=null;
  }
  function deviceName(){
    const ua=navigator.userAgent||'';
    let browser='Tarayıcı';
    if(/Edg\//.test(ua)) browser='Edge'; else if(/Chrome\//.test(ua)) browser='Chrome'; else if(/Firefox\//.test(ua)) browser='Firefox'; else if(/Safari\//.test(ua)) browser='Safari';
    let os=navigator.platform||'Cihaz';
    if(/iPhone/.test(ua)) os='iPhone'; else if(/iPad/.test(ua)) os='iPad'; else if(/Android/.test(ua)) os='Android'; else if(/Mac/.test(ua)) os='Mac'; else if(/Win/.test(ua)) os='Windows';
    return `${os} · ${browser}`.slice(0,80);
  }
  async function api(action,payload={}){
    if(!configured()) throw new Error('Bulut bağlantısı henüz yapılandırılmadı.');
    const res=await fetch(endpoint(),{
      method:'POST',
      headers:{'content-type':'application/json','apikey':cfg.anonKey},
      body:JSON.stringify({action,...payload})
    });
    let body={};
    try{ body=await res.json(); }catch(error){}
    if(!res.ok){
      const err=new Error(body.error||`Sunucu hatası (${res.status})`);
      err.status=res.status; err.body=body; throw err;
    }
    return body;
  }
  function bridge(){ return window.__APP_CLOUD_BRIDGE__||null; }
  function hasMeaningfulData(state){
    if(!state) return false;
    return (state.tasks?.length||0)+(state.events?.length||0)+(state.collection?.length||0)+Object.values(state.sessionLog||{}).reduce((n,x)=>n+(Array.isArray(x)?x.length:0),0)>0;
  }
  function itemKey(item,index){ return item?.id||item?.key||`${item?.name||item?.species||'item'}:${item?.date||item?.completedAt||index}`; }
  function mergeArray(remote=[],local=[]){
    const map=new Map();
    remote.forEach((x,i)=>map.set(itemKey(x,i),clone(x)));
    local.forEach((x,i)=>{
      const key=itemKey(x,i);
      const r=map.get(key);
      if(!r){ map.set(key,clone(x)); return; }
      const ru=Number(r.updatedAt||r.completedAt||0), lu=Number(x.updatedAt||x.completedAt||0);
      map.set(key,clone(lu>=ru?{...r,...x}:{...x,...r}));
    });
    return [...map.values()];
  }
  function mergeSessionLog(remote={},local={}){
    const out={};
    new Set([...Object.keys(remote||{}),...Object.keys(local||{})]).forEach(date=>{
      out[date]=mergeArray(remote?.[date]||[],local?.[date]||[]);
    });
    return out;
  }
  function mergeStates(remote,local){
    const out={...clone(remote),...clone(local)};
    out.tasks=mergeArray(remote.tasks,local.tasks);
    out.events=mergeArray(remote.events,local.events);
    out.taskTags=mergeArray(remote.taskTags,local.taskTags);
    out.collection=mergeArray(remote.collection,local.collection);
    out.badgeUnlockLog=mergeArray(remote.badgeUnlockLog,local.badgeUnlockLog);
    out.sessionLog=mergeSessionLog(remote.sessionLog,local.sessionLog);
    out.days={...clone(remote.days||{}),...clone(local.days||{})};
    out.totalResists=Math.max(Number(remote.totalResists)||0,Number(local.totalResists)||0);
    out.totalTodosCompleted=Math.max(Number(remote.totalTodosCompleted)||0,Number(local.totalTodosCompleted)||0);
    out.bestGoalStreak=Math.max(Number(remote.bestGoalStreak)||0,Number(local.bestGoalStreak)||0);
    out.treeNumber=Math.max(Number(remote.treeNumber)||1,Number(local.treeNumber)||1);
    // Aktif timer'ı cihazlar arasında taşımıyoruz; sadece geçmiş veriyi birleştiriyoruz.
    out.activeSessionId=null; out.activeSessionDate=null; out.isWorking=false; out.workStart=null; out.breakState=null; out.activeTimerOwnerId=null;
    out.timerState={mode:'idle',sessionId:null,runningSince:null,ownerId:null};
    return out;
  }

  function setStatus(kind,text){
    const node=$('cloudStatus'); if(!node) return;
    node.dataset.kind=kind; node.textContent=text;
  }
  function updateUI(){
    const signed=!!getToken() && !!account;
    $('cloudSignedOut')?.classList.toggle('cloud-hidden',signed);
    $('cloudSignedIn')?.classList.toggle('cloud-hidden',!signed);
    if($('cloudUsername')) $('cloudUsername').textContent=account?.username||localStorage.getItem(LS.username)||'—';
    if($('cloudLastSync')){
      const raw=Number(localStorage.getItem(LS.lastSync)||0);
      $('cloudLastSync').textContent=raw?new Date(raw).toLocaleString('tr-TR'):'Henüz senkronize edilmedi';
    }
    if(!configured()) setStatus('warning','Bulut yapılandırılmadı');
    else if(!signed) setStatus('off','Giriş yapılmadı');
  }
  function markDirty(){
    if(suppressDirty || !getToken()) return;
    localStorage.setItem(LS.dirty,'1');
    setStatus('pending','Değişiklikler bekliyor');
    clearTimeout(syncTimer); syncTimer=setTimeout(()=>syncNow({silent:true}),1400);
  }

  async function pull(){ return api('sync-pull',{sessionToken:getToken(),deviceName:deviceName()}); }
  async function push(state,expectedRevision){
    return api('sync-push',{sessionToken:getToken(),deviceName:deviceName(),expectedRevision,state});
  }
  async function syncNow({silent=false,initial=false}={}){
    const b=bridge(); if(!b || !getToken() || syncing || !configured()) return false;
    syncing=true; setStatus('syncing','Senkronize ediliyor…');
    try{
      const remote=await pull();
      account={id:remote.accountId,username:remote.username};
      localStorage.setItem(LS.accountId,remote.accountId||'');
      localStorage.setItem(LS.username,remote.username||'');
      let base=Number(localStorage.getItem(LS.baseRevision)||0);
      const dirty=localStorage.getItem(LS.dirty)==='1';
      const local=b.exportState();
      const remoteState=remote.state||null;
      let finalState=local;

      if(!remoteState){
        const saved=await push(local,Number(remote.revision)||0);
        base=saved.revision;
      }else if(initial && base===0){
        if(hasMeaningfulData(local)){
          finalState=mergeStates(remoteState,local);
          const saved=await push(finalState,Number(remote.revision)||0);
          base=saved.revision;
          suppressDirty=true; b.replaceState(finalState); suppressDirty=false;
        }else{
          suppressDirty=true; b.replaceState(remoteState); suppressDirty=false;
          base=Number(remote.revision)||0;
        }
      }else if(Number(remote.revision)>base){
        if(dirty){
          finalState=mergeStates(remoteState,local);
          const saved=await push(finalState,Number(remote.revision)||0);
          base=saved.revision;
          suppressDirty=true; b.replaceState(finalState); suppressDirty=false;
        }else{
          suppressDirty=true; b.replaceState(remoteState); suppressDirty=false;
          base=Number(remote.revision)||0;
        }
      }else if(dirty){
        try{
          const saved=await push(local,Number(remote.revision)||base);
          base=saved.revision;
        }catch(err){
          if(err.status===409 && err.body?.state){
            finalState=mergeStates(err.body.state,local);
            const saved=await push(finalState,Number(err.body.revision)||0);
            base=saved.revision;
            suppressDirty=true; b.replaceState(finalState); suppressDirty=false;
          }else throw err;
        }
      }
      localStorage.setItem(LS.baseRevision,String(base));
      localStorage.removeItem(LS.dirty);
      localStorage.setItem(LS.lastSync,String(Date.now()));
      setStatus('ok','Senkronize'); updateUI();
      if(!silent) toast('Bulut verileri senkronize edildi.','success');
      return true;
    }catch(err){
      if(err.status===401){ clearAuth(); updateUI(); openLogin(); }
      setStatus('error','Senkronizasyon hatası');
      if(!silent) toast(err.message||'Senkronizasyon başarısız.','error');
      return false;
    }finally{ syncing=false; }
  }

  function toast(message,type='calm'){
    const node=document.getElementById('toast');
    if(!node) return;
    node.textContent=message; node.className=`toast ${type} show`;
    setTimeout(()=>node.classList.remove('show'),2600);
  }
  function openLogin(){ $('cloudLoginBackdrop')?.classList.add('show'); $('cloudLoginBackdrop')?.setAttribute('aria-hidden','false'); setTimeout(()=>$('cloudLoginUsername')?.focus(),30); }
  function closeLogin(){ $('cloudLoginBackdrop')?.classList.remove('show'); $('cloudLoginBackdrop')?.setAttribute('aria-hidden','true'); }

  async function login(){
    const username=$('cloudLoginUsername')?.value.trim().toUpperCase();
    const magicWord=$('cloudLoginMagic')?.value.trim();
    const accessCode=$('cloudLoginCode')?.value.trim();
    const remember=!!$('cloudLoginRemember')?.checked;
    const error=$('cloudLoginError'); if(error) error.textContent='';
    if(!username||!magicWord||!/^[0-9]{6}$/.test(accessCode)){ if(error) error.textContent='Üç alanı da doğru biçimde doldur.'; return; }
    const btn=$('cloudLoginSubmit'); if(btn) btn.disabled=true;
    try{
      const result=await api('login',{username,magicWord,accessCode,deviceName:deviceName(),rememberDevice:remember});
      storeToken(result.sessionToken,remember);
      account={id:result.accountId,username:result.username};
      localStorage.setItem(LS.username,result.username);
      localStorage.setItem(LS.accountId,result.accountId);
      localStorage.setItem(LS.baseRevision,'0');
      closeLogin(); updateUI();
      await syncNow({initial:true});
      await loadDevices();
    }catch(err){ if(error) error.textContent=err.message||'Giriş yapılamadı.'; }
    finally{ if(btn) btn.disabled=false; }
  }
  function openSignup(){
    $('cloudSignupBackdrop')?.classList.add('show');
    $('cloudSignupBackdrop')?.setAttribute('aria-hidden','false');
    const result=$('cloudSignupResult'); if(result) result.innerHTML='';
    const form=$('cloudSignupForm'); if(form) form.classList.remove('cloud-hidden');
    const err=$('cloudSignupError'); if(err) err.textContent='';
    const code=$('cloudSignupCode'); if(code){ code.value=''; setTimeout(()=>code.focus(),30); }
    const confirmCode=$('cloudSignupCodeConfirm'); if(confirmCode) confirmCode.value='';
  }
  function closeSignup(){
    $('cloudSignupBackdrop')?.classList.remove('show');
    $('cloudSignupBackdrop')?.setAttribute('aria-hidden','true');
  }
  async function signup(){
    const accessCode=$('cloudSignupCode')?.value.trim()||'';
    const confirmCode=$('cloudSignupCodeConfirm')?.value.trim()||'';
    const remember=!!$('cloudSignupRemember')?.checked;
    const error=$('cloudSignupError'); if(error) error.textContent='';
    if(!/^[0-9]{6}$/.test(accessCode)){ if(error) error.textContent='6 haneli bir sayı seç.'; return; }
    if(accessCode!==confirmCode){ if(error) error.textContent='Kodlar eşleşmiyor.'; return; }

    const btn=$('cloudSignupSubmit'); if(btn) btn.disabled=true;
    try{
      const result=await api('signup',{accessCode,deviceName:deviceName(),rememberDevice:remember});
      const form=$('cloudSignupForm'); if(form) form.classList.add('cloud-hidden');
      const box=$('cloudSignupResult');
      if(box){
        box.innerHTML=`
          <div class="cloud-signup-success">
            <div class="cloud-signup-check">✓</div>
            <h3>Hesabın hazır</h3>
            <p><strong>Bu bilgileri mutlaka kaydet.</strong> Başka bir cihazdan veya daha sonra tekrar giriş yaparken kullanıcı adı, sihirli kelime ve seçtiğin 6 haneli kod birlikte gerekli olacak. Kullanıcı adı ve sihirli kelime daha sonra tekrar gösterilemez.</p>
            <div class="cloud-credential-grid">
              <div><span>Kullanıcı adı</span><strong>${escapeHtml(result.username)}</strong></div>
              <div><span>Sihirli kelime</span><strong>${escapeHtml(result.magicWord)}</strong></div>
              <div><span>Senin kodun</span><strong>${escapeHtml(result.accessCode)}</strong></div>
            </div>
            <div class="cloud-signup-reminder">⚠ Bu üç bilgiden biri eksik olursa tekrar giriş yapamazsın. Gerekirse admin üzerinden giriş bilgilerin sıfırlanabilir.</div>
            <button type="button" class="modal-btn primary" id="cloudSignupContinue">Bilgileri Kaydettim · Devam Et</button>
          </div>`;
        $('cloudSignupContinue')?.addEventListener('click',async()=>{
          storeToken(result.sessionToken,remember);
          account={id:result.accountId,username:result.username};
          localStorage.setItem(LS.username,result.username);
          localStorage.setItem(LS.accountId,result.accountId);
          localStorage.setItem(LS.baseRevision,'0');
          closeSignup(); updateUI();
          await syncNow({initial:true});
          await loadDevices();
          toast('Hesabın oluşturuldu ve giriş yapıldı.','success');
        },{once:true});
      }
    }catch(err){
      if(error) error.textContent=err.message||'Hesap oluşturulamadı.';
    }finally{
      if(btn) btn.disabled=false;
    }
  }

  async function logout(){
    try{ if(getToken()) await api('logout',{sessionToken:getToken()}); }catch(error){}
    clearAuth(); updateUI(); $('cloudDevices').innerHTML=''; toast('Bu cihazdaki oturum kapatıldı.');
  }
  async function loadDevices(){
    const box=$('cloudDevices'); if(!box||!getToken()) return;
    box.innerHTML='<div class="cloud-muted">Cihazlar yükleniyor…</div>';
    try{
      const result=await api('list-devices',{sessionToken:getToken()});
      box.innerHTML=(result.devices||[]).map(d=>`<div class="cloud-device"><div><b>${escapeHtml(d.deviceName||'Cihaz')}</b><span>${d.current?'Bu cihaz · ':''}${escapeHtml(new Date(d.lastSeenAt).toLocaleString('tr-TR'))}</span></div>${d.current?'<em>Aktif</em>':''}</div>`).join('')||'<div class="cloud-muted">Cihaz kaydı yok.</div>';
    }catch(err){ box.innerHTML='<div class="cloud-muted">Cihazlar alınamadı.</div>'; }
  }
  async function revokeOthers(){
    if(!confirm('Diğer tüm cihazlardaki oturumlar kapatılsın mı?')) return;
    try{ await api('revoke-other-devices',{sessionToken:getToken()}); await loadDevices(); toast('Diğer cihazların oturumları kapatıldı.','success'); }catch(err){ toast(err.message,'error'); }
  }

  function injectUI(){
    const settingsBody=document.querySelector('#settingsBackdrop .badge-modal-body');
    if(!settingsBody||$('cloudAccountSection')) return;
    const wrap=document.createElement('div'); wrap.id='cloudAccountSection';
    wrap.innerHTML=`
      <div class="settings-section-title">Hesap ve Senkronizasyon</div>
      <div class="cloud-account-card">
        <div class="cloud-account-top"><div><span class="cloud-kicker">BULUT HESABI</span><strong id="cloudUsername">—</strong></div><span class="cloud-status" id="cloudStatus" data-kind="off">Giriş yapılmadı</span></div>
        <div id="cloudSignedOut"><p class="cloud-muted">Aynı hesabı farklı cihazlarda kullanabilir veya buradan yeni bir bulut hesabı oluşturabilirsin.</p><div class="cloud-actions"><button type="button" class="modal-btn primary" id="cloudOpenLogin">Giriş Yap</button><button type="button" class="modal-btn ghost" id="cloudOpenSignup">Hesap Oluştur</button></div></div>
        <div id="cloudSignedIn" class="cloud-hidden">
          <div class="cloud-sync-meta"><span>Son senkronizasyon</span><b id="cloudLastSync">—</b></div>
          <div class="cloud-actions"><button type="button" class="modal-btn primary" id="cloudSyncNow">Şimdi Senkronize Et</button><button type="button" class="modal-btn ghost" id="cloudRefreshDevices">Cihazları Yenile</button></div>
          <div class="cloud-device-list" id="cloudDevices"></div>
          <div class="cloud-actions"><button type="button" class="modal-btn ghost" id="cloudRevokeOthers">Diğer Cihazlardan Çıkış</button><button type="button" class="modal-btn ghost" id="cloudLogout">Çıkış Yap</button></div>
        </div>
      </div>`;
    settingsBody.insertBefore(wrap,settingsBody.firstChild);

    const loginBackdrop=document.createElement('div'); loginBackdrop.className='modal-backdrop'; loginBackdrop.id='cloudLoginBackdrop'; loginBackdrop.setAttribute('aria-hidden','true');
    loginBackdrop.innerHTML=`<div class="modal-box cloud-login-box"><div class="cloud-login-icon">☁️</div><h2>Bulut hesabına giriş</h2><p>Kullanıcı bilgilerin yalnızca hesabını açmak için kullanılır.</p><label>Kullanıcı adı<input id="cloudLoginUsername" autocomplete="username" placeholder="NOVA-4831"></label><label>Sihirli kelime<input id="cloudLoginMagic" type="password" autocomplete="current-password" placeholder="••••••••••"></label><label>6 haneli kod<input id="cloudLoginCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000"></label><label class="cloud-remember"><input type="checkbox" id="cloudLoginRemember" checked> Bu cihazda oturumu açık tut</label><div class="cloud-login-error" id="cloudLoginError"></div><div class="modal-actions"><button type="button" class="modal-btn ghost" id="cloudLoginCancel">Vazgeç</button><button type="button" class="modal-btn primary" id="cloudLoginSubmit">Giriş Yap</button></div></div>`;
    document.body.appendChild(loginBackdrop);

    const signupBackdrop=document.createElement('div'); signupBackdrop.className='modal-backdrop'; signupBackdrop.id='cloudSignupBackdrop'; signupBackdrop.setAttribute('aria-hidden','true');
    signupBackdrop.innerHTML=`<div class="modal-box cloud-login-box cloud-signup-box">
      <div class="cloud-login-icon">🌱</div>
      <h2>Yeni hesap oluştur</h2>
      <p>6 haneli kodunu sen seç. Kullanıcı adı ve sihirli kelimeyi sistem güvenli şekilde oluşturacak.</p>
      <div id="cloudSignupForm">
        <label>6 haneli kodun<input id="cloudSignupCode" type="password" inputmode="numeric" autocomplete="new-password" maxlength="6" placeholder="000000"></label>
        <label>Kodu tekrar yaz<input id="cloudSignupCodeConfirm" type="password" inputmode="numeric" autocomplete="new-password" maxlength="6" placeholder="000000"></label>
        <label class="cloud-remember"><input type="checkbox" id="cloudSignupRemember" checked> Bu cihazda oturumu açık tut</label>
        <div class="cloud-login-error" id="cloudSignupError"></div>
        <div class="modal-actions"><button type="button" class="modal-btn ghost" id="cloudSignupCancel">Vazgeç</button><button type="button" class="modal-btn primary" id="cloudSignupSubmit">Hesabı Oluştur</button></div>
      </div>
      <div id="cloudSignupResult"></div>
    </div>`;
    document.body.appendChild(signupBackdrop);

    $('cloudOpenLogin').addEventListener('click',openLogin);
    $('cloudLoginCancel').addEventListener('click',closeLogin);
    $('cloudLoginSubmit').addEventListener('click',login);
    $('cloudLoginCode').addEventListener('keydown',e=>{if(e.key==='Enter') login();});
    $('cloudOpenSignup').addEventListener('click',openSignup);
    $('cloudSignupCancel').addEventListener('click',closeSignup);
    $('cloudSignupSubmit').addEventListener('click',signup);
    $('cloudSignupCodeConfirm').addEventListener('keydown',e=>{if(e.key==='Enter') signup();});
    $('cloudSyncNow').addEventListener('click',()=>syncNow());
    $('cloudLogout').addEventListener('click',logout);
    $('cloudRefreshDevices').addEventListener('click',loadDevices);
    $('cloudRevokeOthers').addEventListener('click',revokeOthers);
  }

  async function resume(){
    injectUI(); updateUI();
    if(!configured()) return;
    if(getToken()){
      try{
        const me=await api('me',{sessionToken:getToken(),deviceName:deviceName()});
        account={id:me.accountId,username:me.username}; updateUI();
        await syncNow({silent:true,initial:true}); await loadDevices();
      }catch(err){ if(err.status===401){ clearAuth(); updateUI(); } }
    }
  }

  window.addEventListener('app:data-saved',markDirty);
  window.addEventListener('online',()=>{ if(getToken()) syncNow({silent:true}); });
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'&&getToken()) syncNow({silent:true}); });
  let resumed=false;
  const start=()=>{ if(resumed) return; resumed=true; resume(); };
  window.addEventListener('app:ready',start,{once:true});
  window.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{ if(window.__APP_CLOUD_BRIDGE__) start(); },350));
})();
