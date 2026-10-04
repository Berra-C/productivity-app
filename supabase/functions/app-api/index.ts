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

async function handle(req:Request,body:any){
  const action=String(body?.action||'');
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
