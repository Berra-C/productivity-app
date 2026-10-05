const SUPABASE_URL=Deno.env.get('SUPABASE_URL')||'';
const LEGACY_SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
let MODERN_SERVICE_KEY='';
try{ MODERN_SERVICE_KEY=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||''; }catch{}
const SERVICE_KEY=LEGACY_SERVICE_KEY||MODERN_SERVICE_KEY;
const ADMIN_SECRET=Deno.env.get('APP_ADMIN_SECRET')||'';
const SESSION_DAYS=90;
const encoder=new TextEncoder();
const cors={
  'access-control-allow-origin':'*',
  'access-control-allow-headers':'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods':'POST, OPTIONS',
  'content-type':'application/json; charset=utf-8'
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
const nowIso=()=>new Date().toISOString();

function bytesToB64(bytes:Uint8Array){
  let s=''; for(const b of bytes) s+=String.fromCharCode(b); return btoa(s);
}
function b64ToBytes(value:string){
  const s=atob(value); return Uint8Array.from(s,c=>c.charCodeAt(0));
}
function randomBytes(n:number){ const out=new Uint8Array(n); crypto.getRandomValues(out); return out; }
async function sha256(value:string){
  const hash=await crypto.subtle.digest('SHA-256',encoder.encode(value)); return bytesToB64(new Uint8Array(hash));
}
async function credentialHash(magicWord:string,accessCode:string,saltB64:string){
  const material=await crypto.subtle.importKey('raw',encoder.encode(`${magicWord.normalize('NFKC').trim().toLowerCase()}\0${accessCode}`),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:b64ToBytes(saltB64),iterations:210000},material,256);
  return bytesToB64(new Uint8Array(bits));
}
function safeEqual(a:string,b:string){
  const aa=encoder.encode(a),bb=encoder.encode(b); if(aa.length!==bb.length) return false;
  let diff=0; for(let i=0;i<aa.length;i++) diff|=aa[i]^bb[i]; return diff===0;
}
function normalizeUsername(value:unknown){ return String(value||'').trim().toUpperCase().slice(0,40); }
function safeDevice(value:unknown){ return String(value||'Cihaz').trim().slice(0,80)||'Cihaz'; }
function adminOk(value:unknown){ return !!ADMIN_SECRET && safeEqual(String(value||''),ADMIN_SECRET); }

async function rest(path:string,init:RequestInit={}){
  const headers=new Headers(init.headers||{});
  headers.set('apikey',SERVICE_KEY); headers.set('authorization',`Bearer ${SERVICE_KEY}`);
  if(init.body && !headers.has('content-type')) headers.set('content-type','application/json');
  const res=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...init,headers});
  const text=await res.text(); let body:any=null; try{body=text?JSON.parse(text):null}catch{body=text}
  return {res,body};
}
async function select(path:string){ const {res,body}=await rest(path); if(!res.ok) throw new Error(`DB read ${res.status}: ${JSON.stringify(body)}`); return body||[]; }
async function insert(table:string,row:unknown,returning=true){
  const {res,body}=await rest(table,{method:'POST',headers:{Prefer:returning?'return=representation':'return=minimal'},body:JSON.stringify(row)});
  if(!res.ok) throw Object.assign(new Error(`DB insert ${res.status}`),{status:res.status,body}); return body;
}
async function patch(path:string,row:unknown,returning=true){
  const {res,body}=await rest(path,{method:'PATCH',headers:{Prefer:returning?'return=representation':'return=minimal'},body:JSON.stringify(row)});
  if(!res.ok) throw Object.assign(new Error(`DB update ${res.status}`),{status:res.status,body}); return body||[];
}
async function remove(path:string){ const {res,body}=await rest(path,{method:'DELETE'}); if(!res.ok) throw new Error(`DB delete ${res.status}: ${JSON.stringify(body)}`); }

const usernamePrefixes=['NOVA','ORBIT','CEDAR','EMBER','ATLAS','LUMEN','AURORA','COMET','FERN','RIVER','PIXEL','SOLAR','MINT','VIOLET','ECHO','MAPLE'];
const magicWords=['atlas','pusula','mercan','orman','yelken','kutup','lale','nehir','bulut','fener','kumsal','yildiz','toprak','marti','zeytin','ayva','kiraz','kozmos','dalga','safir','kehribar','limon','lavanta','ada'];
function pick<T>(arr:T[]){ return arr[Math.floor(Math.random()*arr.length)]; }
function randomCode(){ const a=new Uint32Array(1); crypto.getRandomValues(a); return String(100000+(a[0]%900000)); }
function randomMagic(){ let a=pick(magicWords),b=pick(magicWords); while(a===b)b=pick(magicWords); return `${a}-${b}`; }
async function uniqueUsername(){
  for(let i=0;i<30;i++){
    const digits=randomCode().slice(0,4), username=`${pick(usernamePrefixes)}-${digits}`;
    const rows=await select(`app_accounts?select=id&username=eq.${encodeURIComponent(username)}&limit=1`); if(!rows.length) return username;
  }
  throw new Error('Benzersiz kullanıcı adı üretilemedi.');
}
function clientIp(req:Request){ return (req.headers.get('x-forwarded-for')||req.headers.get('cf-connecting-ip')||'unknown').split(',')[0].trim().slice(0,80); }
async function recordAttempt(username:string,ipHash:string,success:boolean){ try{await insert('app_login_attempts',{username,ip_hash:ipHash,success},false)}catch{} }
async function rateLimit(username:string,ipHash:string){
  const since=new Date(Date.now()-5*60*1000).toISOString();
  const rows=await select(`app_login_attempts?select=success,created_at&username=eq.${encodeURIComponent(username)}&ip_hash=eq.${encodeURIComponent(ipHash)}&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=20`);
  const failures=rows.filter((r:any)=>!r.success);
  if(failures.length>=10) return {blocked:true,retry:300};
  if(failures.length>=5 && failures[0] && Date.now()-new Date(failures[0].created_at).getTime()<30000) return {blocked:true,retry:30};
  return {blocked:false,retry:0};
}

async function signupRateLimit(ipHash:string){
  const sinceHour=new Date(Date.now()-60*60*1000).toISOString();
  const sinceDay=new Date(Date.now()-24*60*60*1000).toISOString();
  const rows=await select(`app_login_attempts?select=created_at&username=eq.__SIGNUP__&ip_hash=eq.${encodeURIComponent(ipHash)}&created_at=gte.${encodeURIComponent(sinceDay)}&order=created_at.desc&limit=20`);
  const lastHour=rows.filter((r:any)=>new Date(r.created_at).getTime()>=new Date(sinceHour).getTime()).length;
  if(lastHour>=3) return {blocked:true,retry:3600};
  if(rows.length>=10) return {blocked:true,retry:86400};
  return {blocked:false,retry:0};
}
async function recordSignup(ipHash:string){
  try{ await insert('app_login_attempts',{username:'__SIGNUP__',ip_hash:ipHash,success:true},false); }catch{}
}
async function newSession(accountId:string,deviceName:string,rememberDevice=true){
  const token=bytesToB64(randomBytes(32)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
  const tokenHash=await sha256(token);
  const expires=new Date(Date.now()+(rememberDevice?SESSION_DAYS:1)*86400000).toISOString();
  const rows=await insert('app_sessions',{account_id:accountId,token_hash:tokenHash,device_name:deviceName,expires_at:expires});
  return {token,row:rows?.[0]};
}
async function auth(sessionToken:unknown,deviceName?:unknown){
  const token=String(sessionToken||''); if(token.length<30) return null;
  const hash=await sha256(token);
  const rows=await select(`app_sessions?select=id,account_id,device_name,expires_at,revoked&token_hash=eq.${encodeURIComponent(hash)}&revoked=eq.false&expires_at=gt.${encodeURIComponent(nowIso())}&limit=1`);
  const session=rows[0]; if(!session) return null;
  const accounts=await select(`app_accounts?select=id,username,disabled&ID=eq.${encodeURIComponent(session.account_id)}&limit=1`.replace('&ID=','&id='));
  const account=accounts[0]; if(!account || account.disabled) return null;
  await patch(`app_sessions?id=eq.${session.id}`,{last_seen_at:nowIso(),device_name:safeDevice(deviceName||session.device_name)},false);
  return {session,account};
}


function num(v:unknown){ const n=Number(v); return Number.isFinite(n)?n:0; }
function stateMetrics(state:any){
  const s=(state && typeof state==='object' && !Array.isArray(state))?state:{};
  const days=(s.days && typeof s.days==='object' && !Array.isArray(s.days))?s.days:{};
  const sessionLog=(s.sessionLog && typeof s.sessionLog==='object' && !Array.isArray(s.sessionLog))?s.sessionLog:{};
  let workSeconds=0,workSessions=0;
  const dayWork:Record<string,number>={};
  const daySessions:Record<string,number>={};
  const hourlyWork=Array.from({length:24},()=>0);

  for(const [key,d] of Object.entries(days) as [string,any][]){
    if(!d || typeof d!=='object') continue;
    const seconds=Math.max(0,num(d.workSeconds));
    const sessions=Math.max(0,num(d.sessions));
    workSeconds+=seconds;
    workSessions+=sessions;
    if(seconds>0) dayWork[key]=Math.round(seconds);
    if(sessions>0) daySessions[key]=Math.round(sessions);
  }

  // Session logs are the source for hour-of-day distribution.
  // Existing migration logic gives legacy sessions an approximate interval when possible.
  for(const list of Object.values(sessionLog) as any[]){
    if(!Array.isArray(list)) continue;
    if(!workSessions) workSessions+=list.length;
    for(const session of list){
      const intervals=Array.isArray(session?.workIntervals)?session.workIntervals:[];
      for(const interval of intervals){
        let a=Number(interval?.start), b=Number(interval?.end);
        if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a) continue;
        // Guard against malformed intervals.
        if(b-a>24*60*60*1000) b=a+24*60*60*1000;
        let cursor=a;
        while(cursor<b){
          const d=new Date(cursor);
          const hour=d.getHours();
          const nextHour=new Date(d.getFullYear(),d.getMonth(),d.getDate(),hour+1,0,0,0).getTime();
          const segmentEnd=Math.min(b,nextHour);
          hourlyWork[hour]+=Math.max(0,(segmentEnd-cursor)/1000);
          cursor=segmentEnd;
        }
      }
    }
  }

  return {
    workSeconds:Math.round(workSeconds),
    workSessions:Math.round(workSessions),
    dayWork,
    daySessions,
    hourlyWork:hourlyWork.map(v=>Math.round(v))
  };
}
function localDateKey(value:number|Date){
  const d=value instanceof Date?value:new Date(value);
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function lastDateKeys(count:number){
  const out:string[]=[];
  const base=new Date(); base.setHours(12,0,0,0);
  for(let i=count-1;i>=0;i--){ const d=new Date(base); d.setDate(base.getDate()-i); out.push(localDateKey(d)); }
  return out;
}


async function handle(req:Request,body:any){
  const action=String(body?.action||'');

  if(action==='signup'){
    const accessCode=String(body.accessCode||'').trim();
    if(!/^\d{6}$/.test(accessCode)) return json({error:'6 haneli bir erişim kodu seç.'},400);

    const ipHash=await sha256(clientIp(req));
    const limit=await signupRateLimit(ipHash);
    if(limit.blocked) return json({error:'Bu bağlantıdan kısa sürede çok fazla hesap oluşturuldu. Daha sonra tekrar dene.',retryAfter:limit.retry},429);

    const username=await uniqueUsername();
    const magicWord=randomMagic();
    const salt=bytesToB64(randomBytes(16));
    const hash=await credentialHash(magicWord,accessCode,salt);
    const rows=await insert('app_accounts',{username,credential_salt:salt,credential_hash:hash});
    await recordSignup(ipHash);
    const session=await newSession(rows[0].id,safeDevice(body.deviceName),body.rememberDevice!==false);

    return json({
      accountId:rows[0].id,
      username:String(username).toUpperCase(),
      magicWord,
      accessCode,
      sessionToken:session.token,
      expiresAt:session.row?.expires_at,
      createdAt:rows[0].created_at
    },201);
  }

  if(action==='login'){
    const username=normalizeUsername(body.username), magicWord=String(body.magicWord||''), accessCode=String(body.accessCode||'');
    if(!username||magicWord.length<3||!/^[0-9]{6}$/.test(accessCode)) return json({error:'Giriş bilgileri geçersiz.'},400);
    const ipHash=await sha256(clientIp(req)); const limit=await rateLimit(username,ipHash);
    if(limit.blocked) return json({error:`Çok fazla hatalı deneme. ${limit.retry} saniye sonra tekrar dene.`},429);
    const accounts=await select(`app_accounts?select=id,username,credential_salt,credential_hash,disabled&username=eq.${encodeURIComponent(username)}&limit=1`);
    const account=accounts[0];
    if(!account || account.disabled){ await recordAttempt(username,ipHash,false); return json({error:'Kullanıcı adı veya giriş bilgileri hatalı.'},401); }
    const hash=await credentialHash(magicWord,accessCode,account.credential_salt);
    if(!safeEqual(hash,account.credential_hash)){ await recordAttempt(username,ipHash,false); return json({error:'Kullanıcı adı veya giriş bilgileri hatalı.'},401); }
    await recordAttempt(username,ipHash,true);
    await patch(`app_accounts?id=eq.${account.id}`,{last_login_at:nowIso()},false);
    const session=await newSession(account.id,safeDevice(body.deviceName),body.rememberDevice!==false);
    return json({accountId:account.id,username:String(account.username).toUpperCase(),sessionToken:session.token,expiresAt:session.row?.expires_at});
  }

  if(action==='create-user'){
    if(!adminOk(body.adminSecret)) return json({error:'Yönetici anahtarı geçersiz.'},401);
    const username=await uniqueUsername(), magicWord=randomMagic(), accessCode=randomCode(), salt=bytesToB64(randomBytes(16));
    const hash=await credentialHash(magicWord,accessCode,salt);
    const rows=await insert('app_accounts',{username,credential_salt:salt,credential_hash:hash});
    return json({id:rows[0].id,username,magicWord,accessCode,createdAt:rows[0].created_at},201);
  }
  if(action==='reset-user'){
    if(!adminOk(body.adminSecret)) return json({error:'Yönetici anahtarı geçersiz.'},401);
    const username=normalizeUsername(body.username); if(!username) return json({error:'Kullanıcı adı gerekli.'},400);
    const rows=await select(`app_accounts?select=id,username&username=eq.${encodeURIComponent(username)}&limit=1`); if(!rows[0]) return json({error:'Kullanıcı bulunamadı.'},404);
    const magicWord=randomMagic(),accessCode=randomCode(),salt=bytesToB64(randomBytes(16)),hash=await credentialHash(magicWord,accessCode,salt);
    await patch(`app_accounts?id=eq.${rows[0].id}`,{credential_salt:salt,credential_hash:hash},false);
    await patch(`app_sessions?account_id=eq.${rows[0].id}`,{revoked:true},false);
    return json({username:String(rows[0].username).toUpperCase(),magicWord,accessCode});
  }
  if(action==='set-disabled'){
    if(!adminOk(body.adminSecret)) return json({error:'Yönetici anahtarı geçersiz.'},401);
    const username=normalizeUsername(body.username),disabled=!!body.disabled;
    const rows=await patch(`app_accounts?username=eq.${encodeURIComponent(username)}`,{disabled}); if(!rows.length)return json({error:'Kullanıcı bulunamadı.'},404);
    if(disabled) await patch(`app_sessions?account_id=eq.${rows[0].id}`,{revoked:true},false);
    return json({ok:true});
  }

  if(action==='admin-overview'){
    if(!adminOk(body.adminSecret)) return json({error:'Yönetici anahtarı geçersiz.'},401);
    const [accounts,sessions,states]=await Promise.all([
      select('app_accounts?select=id,username,disabled,created_at,last_login_at&order=created_at.desc&limit=500'),
      select('app_sessions?select=id,account_id,device_name,created_at,last_seen_at,expires_at,revoked&order=last_seen_at.desc&limit=5000'),
      select('app_states?select=account_id,state,revision,updated_at&limit=500')
    ]);

    const now=Date.now(), dayMs=86400000;
    const sessionsByAccount=new Map<string,any[]>();
    for(const s of sessions){
      if(!sessionsByAccount.has(s.account_id)) sessionsByAccount.set(s.account_id,[]);
      sessionsByAccount.get(s.account_id)!.push(s);
    }
    const statesByAccount=new Map<string,any>();
    for(const s of states) statesByAccount.set(s.account_id,s);

    const activeAccountWithin=(ms:number)=>{
      const set=new Set<string>();
      for(const s of sessions){
        if(!s.revoked && new Date(s.last_seen_at).getTime()>=now-ms) set.add(s.account_id);
      }
      return set.size;
    };

    const dailyWork=new Map<string,number>();
    const dailySessions=new Map<string,number>();
    const dailyWorkingAccounts=new Map<string,Set<string>>();
    const hourlyWork=Array.from({length:24},()=>0);
    const weekdayWork=Array.from({length:7},()=>0);
    let totalWorkSeconds=0,totalWorkSessions=0;

    const users=accounts.map((a:any)=>{
      const st=statesByAccount.get(a.id)||null;
      const metrics=stateMetrics(st?.state);
      totalWorkSeconds+=metrics.workSeconds;
      totalWorkSessions+=metrics.workSessions;

      for(const [key,secondsRaw] of Object.entries(metrics.dayWork||{}) as [string,any][]){
        const seconds=Math.max(0,num(secondsRaw));
        if(!seconds) continue;
        dailyWork.set(key,(dailyWork.get(key)||0)+seconds);
        if(!dailyWorkingAccounts.has(key)) dailyWorkingAccounts.set(key,new Set());
        dailyWorkingAccounts.get(key)!.add(a.id);
        const parsed=new Date(`${key}T12:00:00`);
        if(!Number.isNaN(parsed.getTime())) weekdayWork[parsed.getDay()]+=seconds;
      }
      for(const [key,countRaw] of Object.entries(metrics.daySessions||{}) as [string,any][]){
        const count=Math.max(0,num(countRaw));
        if(count) dailySessions.set(key,(dailySessions.get(key)||0)+count);
      }
      for(let h=0;h<24;h++) hourlyWork[h]+=Math.max(0,num(metrics.hourlyWork?.[h]));

      const devs=(sessionsByAccount.get(a.id)||[]).map((s:any)=>({
        id:s.id,deviceName:s.device_name,createdAt:s.created_at,lastSeenAt:s.last_seen_at,expiresAt:s.expires_at,
        revoked:!!s.revoked,expired:new Date(s.expires_at).getTime()<=now
      }));
      const activeDeviceCount=devs.filter((d:any)=>!d.revoked&&!d.expired).length;
      return {
        ...a,
        username:String(a.username).toUpperCase(),
        activeDeviceCount,
        devices:devs
      };
    });

    const dateKeys=lastDateKeys(30);
    const daily=dateKeys.map(key=>({
      date:key,
      workSeconds:Math.round(dailyWork.get(key)||0),
      sessions:Math.round(dailySessions.get(key)||0),
      workingAccounts:dailyWorkingAccounts.get(key)?.size||0,
      averageSessionSeconds:(dailySessions.get(key)||0)>0
        ? Math.round((dailyWork.get(key)||0)/(dailySessions.get(key)||1))
        : 0
    }));

    // Snapshot distributions
    const accountStatus=[
      {label:'Aktif',value:accounts.filter((a:any)=>!a.disabled).length},
      {label:'Devre dışı',value:accounts.filter((a:any)=>!!a.disabled).length}
    ];
    const activation=[
      {label:'Giriş yaptı',value:accounts.filter((a:any)=>!!a.last_login_at).length},
      {label:'Hiç giriş yapmadı',value:accounts.filter((a:any)=>!a.last_login_at).length}
    ];
    const recencyCounts={recent7:0,recent30:0,older:0,never:0};
    for(const a of accounts){
      if(!a.last_login_at){recencyCounts.never++;continue}
      const age=now-new Date(a.last_login_at).getTime();
      if(age<=7*dayMs) recencyCounts.recent7++;
      else if(age<=30*dayMs) recencyCounts.recent30++;
      else recencyCounts.older++;
    }
    const loginRecency=[
      {label:'Son 7 gün',value:recencyCounts.recent7},
      {label:'8–30 gün',value:recencyCounts.recent30},
      {label:'30+ gün',value:recencyCounts.older},
      {label:'Hiç giriş yok',value:recencyCounts.never}
    ];

    let activeSessions=0,revokedSessions=0,expiredSessions=0;
    for(const s of sessions){
      const expired=new Date(s.expires_at).getTime()<=now;
      if(s.revoked) revokedSessions++;
      else if(expired) expiredSessions++;
      else activeSessions++;
    }
    const sessionStatus=[
      {label:'Aktif',value:activeSessions},
      {label:'İptal edildi',value:revokedSessions},
      {label:'Süresi doldu',value:expiredSessions}
    ];

    const deviceBuckets={zero:0,one:0,two:0,threePlus:0};
    for(const a of accounts){
      const names=new Set((sessionsByAccount.get(a.id)||[]).map((s:any)=>String(s.device_name||'Cihaz')));
      const n=names.size;
      if(n===0)deviceBuckets.zero++;
      else if(n===1)deviceBuckets.one++;
      else if(n===2)deviceBuckets.two++;
      else deviceBuckets.threePlus++;
    }
    const deviceCountDistribution=[
      {label:'0 cihaz',value:deviceBuckets.zero},
      {label:'1 cihaz',value:deviceBuckets.one},
      {label:'2 cihaz',value:deviceBuckets.two},
      {label:'3+ cihaz',value:deviceBuckets.threePlus}
    ];

    const syncBuckets={recent24:0,recent7:0,recent30:0,older:0,never:0};
    for(const a of accounts){
      const st=statesByAccount.get(a.id);
      if(!st?.updated_at){syncBuckets.never++;continue}
      const age=now-new Date(st.updated_at).getTime();
      if(age<=dayMs)syncBuckets.recent24++;
      else if(age<=7*dayMs)syncBuckets.recent7++;
      else if(age<=30*dayMs)syncBuckets.recent30++;
      else syncBuckets.older++;
    }
    const syncRecency=[
      {label:'Son 24 saat',value:syncBuckets.recent24},
      {label:'2–7 gün',value:syncBuckets.recent7},
      {label:'8–30 gün',value:syncBuckets.recent30},
      {label:'30+ gün',value:syncBuckets.older},
      {label:'Hiç sync yok',value:syncBuckets.never}
    ];

    const weekdayNames=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
    const weekday=weekdayNames.map((label,i)=>({label,workSeconds:Math.round(weekdayWork[i])}));
    const hourly=hourlyWork.map((seconds,hour)=>({label:String(hour).padStart(2,'0')+':00',workSeconds:Math.round(seconds)}));

    const growthKeys=lastDateKeys(30);
    const accountsBefore=growthKeys.length
      ? accounts.filter((a:any)=>new Date(a.created_at).getTime()<new Date(`${growthKeys[0]}T00:00:00`).getTime()).length
      : 0;
    let cumulative=accountsBefore;
    const accountGrowth=growthKeys.map(key=>{
      const created=accounts.filter((a:any)=>localDateKey(new Date(a.created_at))===key).length;
      cumulative+=created;
      return {date:key,created,total:cumulative};
    });

    const enabled=accounts.filter((a:any)=>!a.disabled).length;
    const active7d=activeAccountWithin(7*dayMs);
    const activeRatio=enabled>0?Math.round((active7d/enabled)*1000)/10:0;
    const avgSessionSeconds=totalWorkSessions>0?Math.round(totalWorkSeconds/totalWorkSessions):0;

    return json({
      summary:{
        totalAccounts:accounts.length,
        enabledAccounts:enabled,
        disabledAccounts:accounts.length-enabled,
        active24h:activeAccountWithin(dayMs),
        active7d,
        activeRatio,
        totalWorkSeconds:Math.round(totalWorkSeconds),
        totalWorkSessions:Math.round(totalWorkSessions),
        averageSessionSeconds:avgSessionSeconds,
        activeSessions,
        syncedAccounts:states.length
      },
      charts:{
        daily,
        weekday,
        hourly,
        accountStatus,
        activation,
        loginRecency,
        sessionStatus,
        deviceCountDistribution,
        syncRecency,
        accountGrowth
      },
      users
    });
  }
  if(action==='admin-revoke-session'){
    if(!adminOk(body.adminSecret)) return json({error:'Yönetici anahtarı geçersiz.'},401);
    const sessionId=String(body.sessionId||'').trim();
    if(!sessionId) return json({error:'Oturum kimliği gerekli.'},400);
    const rows=await patch(`app_sessions?id=eq.${encodeURIComponent(sessionId)}`,{revoked:true});
    if(!rows.length) return json({error:'Oturum bulunamadı.'},404);
    return json({ok:true});
  }

  if(action==='list-users'){
    if(!adminOk(body.adminSecret)) return json({error:'Yönetici anahtarı geçersiz.'},401);
    const accounts=await select('app_accounts?select=id,username,disabled,created_at,last_login_at&order=created_at.desc&limit=500');
    const sessions=await select(`app_sessions?select=account_id,id,revoked,expires_at&revoked=eq.false&expires_at=gt.${encodeURIComponent(nowIso())}`);
    const counts=new Map<string,number>(); sessions.forEach((s:any)=>counts.set(s.account_id,(counts.get(s.account_id)||0)+1));
    return json({users:accounts.map((a:any)=>({...a,username:String(a.username).toUpperCase(),deviceCount:counts.get(a.id)||0}))});
  }

  const identity=await auth(body.sessionToken,body.deviceName);
  if(!identity) return json({error:'Oturum geçersiz veya süresi dolmuş.'},401);
  const accountId=identity.account.id, username=String(identity.account.username).toUpperCase();

  if(action==='me') return json({accountId,username});
  if(action==='logout'){ await patch(`app_sessions?id=eq.${identity.session.id}`,{revoked:true},false); return json({ok:true}); }
  if(action==='list-devices'){
    const rows=await select(`app_sessions?select=id,device_name,created_at,last_seen_at,expires_at&account_id=eq.${accountId}&revoked=eq.false&expires_at=gt.${encodeURIComponent(nowIso())}&order=last_seen_at.desc`);
    return json({devices:rows.map((r:any)=>({id:r.id,deviceName:r.device_name,createdAt:r.created_at,lastSeenAt:r.last_seen_at,expiresAt:r.expires_at,current:r.id===identity.session.id}))});
  }
  if(action==='revoke-other-devices'){
    await patch(`app_sessions?account_id=eq.${accountId}&id=neq.${identity.session.id}`,{revoked:true},false); return json({ok:true});
  }
  if(action==='sync-pull'){
    const rows=await select(`app_states?select=state,revision,updated_at&account_id=eq.${accountId}&limit=1`),row=rows[0]||null;
    return json({accountId,username,state:row?.state||null,revision:Number(row?.revision||0),updatedAt:row?.updated_at||null});
  }
  if(action==='sync-push'){
    const expected=Math.max(0,Number(body.expectedRevision)||0); const state=body.state;
    if(!state||typeof state!=='object'||Array.isArray(state)) return json({error:'Geçersiz uygulama verisi.'},400);
    const serialized=JSON.stringify(state); if(serialized.length>5_000_000) return json({error:'Bulut verisi 5 MB sınırını aşıyor.'},413);
    const current=(await select(`app_states?select=state,revision,updated_at&account_id=eq.${accountId}&limit=1`))[0]||null;
    const currentRevision=Number(current?.revision||0);
    if(currentRevision!==expected) return json({error:'Bulut verisi başka bir cihazda değişmiş.',state:current?.state||null,revision:currentRevision,updatedAt:current?.updated_at||null},409);
    const next=currentRevision+1;
    if(current){
      const rows=await patch(`app_states?account_id=eq.${accountId}&revision=eq.${currentRevision}`,{state,revision:next,updated_at:nowIso()});
      if(!rows.length){ const fresh=(await select(`app_states?select=state,revision,updated_at&account_id=eq.${accountId}&limit=1`))[0]; return json({error:'Bulut verisi başka bir cihazda değişmiş.',state:fresh?.state||null,revision:Number(fresh?.revision||0),updatedAt:fresh?.updated_at||null},409); }
      return json({revision:Number(rows[0].revision),updatedAt:rows[0].updated_at});
    }
    try{
      const rows=await insert('app_states',{account_id:accountId,state,revision:1,updated_at:nowIso()}); return json({revision:Number(rows[0].revision),updatedAt:rows[0].updated_at});
    }catch(error){
      const fresh=(await select(`app_states?select=state,revision,updated_at&account_id=eq.${accountId}&limit=1`))[0]; return json({error:'Bulut verisi başka bir cihazda oluşturulmuş.',state:fresh?.state||null,revision:Number(fresh?.revision||0),updatedAt:fresh?.updated_at||null},409);
    }
  }
  return json({error:'Bilinmeyen işlem.'},400);
}

Deno.serve(async req=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
  if(req.method!=='POST') return json({error:'Method not allowed'},405);
  if(!SUPABASE_URL||!SERVICE_KEY) return json({error:'Sunucu yapılandırması eksik.'},500);
  try{ const body=await req.json(); return await handle(req,body); }
  catch(error){ console.error(error); return json({error:'Sunucu işlemi tamamlanamadı.'},500); }
});
