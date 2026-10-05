(()=>{'use strict';
const cfg=window.CLOUD_CONFIG||{},$=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const endpoint=()=>`${String(cfg.supabaseUrl||'').replace(/\/$/,'')}/functions/v1/${cfg.functionName||'app-api'}`;
const configured=()=>/^https:\/\//.test(String(cfg.supabaseUrl||''))&&String(cfg.anonKey||'').length>20;
const palette=['#74d99f','#e4bd64','#7aa2f7','#d88771','#b58ce3','#7ed6d1','#9fb07a','#d59ab5'];

function secret(){return $('adminSecret').value.trim()}
function error(msg=''){$('adminError').textContent=msg}
function connected(on){const el=$('adminConnection');el.classList.toggle('on',!!on);el.querySelector('span:last-child').textContent=on?'Bağlandı':'Bağlı değil'}
function fmtDate(v){if(!v)return '—';try{return new Date(v).toLocaleString('tr-TR',{dateStyle:'short',timeStyle:'short'})}catch{return String(v)}}
function shortDate(v){try{return new Date(v+'T12:00:00').toLocaleDateString('tr-TR',{day:'2-digit',month:'short'})}catch{return v}}
function fmtDuration(sec){const n=Math.max(0,Number(sec)||0);if(n<60)return Math.round(n)+' sn';if(n<3600)return Math.round(n/60)+' dk';const h=n/3600;return (h>=10?Math.round(h):h.toFixed(1).replace('.',','))+' sa'}
function fmtCount(n){return new Intl.NumberFormat('tr-TR').format(Number(n)||0)}
async function api(action,payload={}){
  if(!configured())throw new Error('cloud-config.js içindeki Supabase bilgileri eksik.');
  const r=await fetch(endpoint(),{method:'POST',headers:{'content-type':'application/json','apikey':cfg.anonKey},body:JSON.stringify({action,adminSecret:secret(),...payload})});
  let b={};try{b=await r.json()}catch{}
  if(!r.ok)throw new Error(b.error||`Sunucu hatası (${r.status})`);
  return b;
}
function credentials(result,label='Yeni kullanıcı'){
  const resultBox=$('adminCredentialResult'); if(!resultBox) return;
  resultBox.innerHTML=`<div class="admin-cred">
    <div><span>Kullanıcı adı</span><strong>${esc(result.username)}</strong></div>
    <div><span>Sihirli kelime</span><strong>${esc(result.magicWord)}</strong></div>
    <div><span>6 haneli kod</span><strong>${esc(result.accessCode)}</strong></div>
  </div><div class="admin-warning">${esc(label)} bilgileri yalnızca bu anda açık metin gösterilir. Sonradan görüntülenemez; yeniden sıfırlamak gerekir.</div>`;
}
function renderSummary(s={},charts={}){
  const cards=[
    ['Toplam hesap',fmtCount(s.totalAccounts),''],
    ['Toplam çalışma',fmtDuration(s.totalWorkSeconds),'accent'],
    ['Ort. oturum',s.averageSessionSeconds?fmtDuration(s.averageSessionSeconds):'—','']
  ];
  const summaryEl=$('adminSummary'); if(!summaryEl) return;
  summaryEl.innerHTML=cards.map(([k,v,c])=>`<div class="admin-stat ${c}"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`).join('');
}
function empty(el,msg='Henüz yeterli veri yok.'){
  if(!el) return false;
  el.innerHTML=`<div class="chart-empty">${esc(msg)}</div>`;
  return true;
}
function svgLine(el,rows,key,opt={}){
  if(!el) return false;
  const data=rows||[]; if(!data.length||!data.some(r=>Number(r[key])>0)){empty(el);return false}
  const W=720,H=190,pL=39,pR=10,pT=12,pB=30,max=Math.max(...data.map(r=>Number(r[key])||0),1);
  const x=i=>pL+(data.length===1?(W-pL-pR)/2:i*(W-pL-pR)/(data.length-1));
  const y=v=>pT+(H-pT-pB)*(1-v/max);
  const pts=data.map((r,i)=>[x(i),y(Number(r[key])||0)]);
  const path=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const grid=[0,.25,.5,.75,1].map(t=>{const yy=pT+(H-pT-pB)*t,val=max*(1-t);return `<line class="grid-line" x1="${pL}" y1="${yy}" x2="${W-pR}" y2="${yy}"/><text class="axis" x="${pL-6}" y="${yy+3}" text-anchor="end">${esc(opt.format?opt.format(val):Math.round(val))}</text>`}).join('');
  const step=Math.max(1,Math.ceil(data.length/7));
  const labels=data.map((r,i)=>(i%step===0||i===data.length-1)?`<text class="axis" x="${x(i)}" y="${H-7}" text-anchor="middle">${esc(shortDate(r.date))}</text>`:'').join('');
  const dots=data.map((r,i)=>Number(r[key])>0?`<circle class="dot-main" cx="${x(i)}" cy="${y(Number(r[key]))}" r="2.7"><title>${esc(shortDate(r.date))}: ${esc(opt.format?opt.format(r[key]):r[key])}</title></circle>`:'').join('');
  el.innerHTML=`<svg class="svg-chart" viewBox="0 0 ${W} ${H}">${grid}<path class="line-main" d="${path}"/>${dots}${labels}</svg>`;return true;
}
function barChart(el,rows,key,opt={}){
  if(!el) return false;
  const data=rows||[]; if(!data.length||!data.some(r=>Number(r[key])>0)){empty(el);return false}
  const max=Math.max(...data.map(r=>Number(r[key])||0),1);
  el.innerHTML=`<div class="bar-grid">${data.map((r,i)=>{
    const pct=Math.max(Number(r[key])>0?2:0,(Number(r[key])||0)/max*100);
    const label=opt.label?opt.label(r,i):r.label;
    const title=`${label}: ${opt.format?opt.format(r[key]):fmtCount(r[key])}`;
    return `<div class="bar-col" title="${esc(title)}"><div class="bar-plot" style="width:100%;height:100%;display:flex;align-items:flex-end;justify-content:center"><div class="bar ${opt.gold?'gold':''}" style="height:${pct}%"></div></div><div class="bar-label">${esc(label)}</div></div>`;
  }).join('')}</div>`;return true;
}
function donut(el,rows){
  if(!el) return false;
  const data=(rows||[]).filter(r=>Number(r.value)>0);
  if(!data.length){empty(el);return false}
  const total=data.reduce((s,r)=>s+Number(r.value||0),0);
  let cursor=0;
  const parts=data.map((r,i)=>{const a=cursor,b=cursor+Number(r.value)/total*100;cursor=b;return `${palette[i%palette.length]} ${a.toFixed(2)}% ${b.toFixed(2)}%`});
  el.innerHTML=`<div class="donut-wrap">
    <div class="donut" style="background:conic-gradient(${parts.join(',')})"><div class="donut-center"><div><strong>${esc(fmtCount(total))}</strong><span>toplam</span></div></div></div>
    <div class="legend">${data.map((r,i)=>`<div class="legend-row"><span class="legend-dot" style="background:${palette[i%palette.length]}"></span><span>${esc(r.label)}</span><span class="legend-value">${esc(fmtCount(r.value))} · ${esc((Number(r.value)/total*100).toFixed(0))}%</span></div>`).join('')}</div>
  </div>`;return true;
}
function growthChart(el,rows){
  if(!el) return false;
  const data=rows||[]; if(!data.length){empty(el);return false}
  const W=720,H=190,pL=36,pR=10,pT=12,pB=30;
  const maxTotal=Math.max(...data.map(r=>Number(r.total)||0),1), maxCreated=Math.max(...data.map(r=>Number(r.created)||0),1);
  const x=i=>pL+(data.length===1?(W-pL-pR)/2:i*(W-pL-pR)/(data.length-1));
  const y=v=>pT+(H-pT-pB)*(1-v/maxTotal);
  const line=data.map((r,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(Number(r.total)||0).toFixed(1)).join(' ');
  const bw=Math.max(3,Math.min(12,(W-pL-pR)/data.length*.48));
  const bars=data.map((r,i)=>{const val=Number(r.created)||0,h=(H-pT-pB)*(val/maxCreated)*.35;return val?`<rect x="${x(i)-bw/2}" y="${H-pB-h}" width="${bw}" height="${h}" rx="2" fill="rgba(228,189,100,.65)"><title>${esc(shortDate(r.date))}: ${val} yeni hesap</title></rect>`:''}).join('');
  const step=Math.max(1,Math.ceil(data.length/7));
  const labels=data.map((r,i)=>(i%step===0||i===data.length-1)?`<text class="axis" x="${x(i)}" y="${H-7}" text-anchor="middle">${esc(shortDate(r.date))}</text>`:'').join('');
  el.innerHTML=`<svg class="svg-chart" viewBox="0 0 ${W} ${H}">${bars}<path class="line-main" d="${line}"/>${labels}</svg>`;return true;
}
function renderCharts(c={}){
  const daily=c.daily||[];
  svgLine($('dailyWorkChart'),daily,'workSeconds',{format:fmtDuration});
  svgLine($('avgSessionChart'),daily,'averageSessionSeconds',{format:fmtDuration});
  barChart($('weekdayChart'),c.weekday||[],'workSeconds',{format:fmtDuration});
  barChart($('hourlyChart'),c.hourly||[],'workSeconds',{format:fmtDuration,label:(r,i)=>i%3===0?r.label:''});
  donut($('accountStatusChart'),c.accountStatus||[]);
  donut($('activationChart'),c.activation||[]);
  donut($('sessionStatusChart'),c.sessionStatus||[]);
  growthChart($('growthChart'),c.accountGrowth||[]);
  const analytics=$('analyticsSection'); if(analytics) analytics.hidden=false;
}
function deviceStatus(d){if(d.revoked)return['revoked','İptal'];if(d.expired)return['expired','Süresi doldu'];return['active','Aktif']}
function renderUsers(users=[]){
  const box=$('adminUsers'); if(!box) return; if(!users.length){box.innerHTML='<div class="admin-empty">Henüz kullanıcı yok.</div>';return}
  box.innerHTML=users.map((u,i)=>{
    const devices=Array.isArray(u.devices)?u.devices:[];
    const meta=[`Oluşturma: ${fmtDate(u.created_at)}`,u.last_login_at?`Son giriş: ${fmtDate(u.last_login_at)}`:'Henüz giriş yapmadı',u.activeDeviceCount?`${u.activeDeviceCount} aktif cihaz`:''].filter(Boolean).join(' · ');
    const devHtml=devices.map(d=>{const [cls,label]=deviceStatus(d);return `<div class="admin-device"><div><div class="admin-device-name">${esc(d.deviceName||'Cihaz')}</div><div class="admin-device-meta">İlk giriş: ${esc(fmtDate(d.createdAt))}<br>Son görülme: ${esc(fmtDate(d.lastSeenAt))}</div></div><div><div class="admin-device-status ${cls}">${label}</div>${!d.revoked&&!d.expired?`<button class="modal-btn ghost" style="margin-top:6px;padding:5px 7px;font-size:7.3px" data-revoke-session="${esc(d.id)}">Çıkış Yap</button>`:''}</div></div>`}).join('');
    return `<div class="admin-user"><div class="admin-user-top"><div><div class="admin-user-name"><b>${esc(String(u.username).toUpperCase())}</b><span class="admin-status ${u.disabled?'off':'on'}">${u.disabled?'Devre dışı':'Aktif'}</span></div><div class="admin-meta">${esc(meta)}</div>${devices.length?`<button class="admin-device-toggle" data-device-toggle="${i}">▾ Cihaz geçmişi (${devices.length})</button>`:''}</div><div class="admin-actions"><button class="modal-btn ghost" data-reset="${esc(u.username)}">Bilgileri Sıfırla</button><button class="modal-btn ghost" data-disable="${esc(u.username)}" data-value="${u.disabled?'0':'1'}">${u.disabled?'Etkinleştir':'Devre Dışı'}</button></div></div>${devices.length?`<div class="admin-devices" data-device-panel="${i}">${devHtml}</div>`:''}</div>`;
  }).join('');
  box.querySelectorAll('[data-device-toggle]').forEach(b=>b.onclick=()=>box.querySelector(`[data-device-panel="${b.dataset.deviceToggle}"]`)?.classList.toggle('show'));
  box.querySelectorAll('[data-reset]').forEach(b=>b.onclick=async()=>{if(!confirm(`${b.dataset.reset} için yeni giriş bilgileri üretilecek ve tüm cihaz oturumları kapanacak. Devam?`))return;try{const r=await api('reset-user',{username:b.dataset.reset});credentials(r,'Yenilenen giriş');await load()}catch(e){error(e.message)}});
  box.querySelectorAll('[data-disable]').forEach(b=>b.onclick=async()=>{try{await api('set-disabled',{username:b.dataset.disable,disabled:b.dataset.value==='1'});await load()}catch(e){error(e.message)}});
  box.querySelectorAll('[data-revoke-session]').forEach(b=>b.onclick=async()=>{if(!confirm('Bu cihazın oturumu kapatılsın mı?'))return;try{await api('admin-revoke-session',{sessionId:b.dataset.revokeSession});await load()}catch(e){error(e.message)}});
}
async function load(){
  error();if(!secret()){error('Önce yönetici anahtarını gir.');connected(false);return}
  try{const r=await api('admin-overview');connected(true);renderSummary(r.summary||{},r.charts||{});renderCharts(r.charts||{});renderUsers(r.users||[])}
  catch(e){connected(false);error('v54 · '+(e?.message||String(e)))}
}
$('adminLoad').onclick=load;$('adminRefresh').onclick=load;
$('adminCreate').onclick=async()=>{error();if(!secret()){error('Önce yönetici anahtarını gir.');return}try{const r=await api('create-user');credentials(r);await load()}catch(e){error(e.message)}};

function initCollapsibles(){
  document.querySelectorAll('[data-collapse-btn]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const card=btn.closest('.collapsible-section');
      if(card) card.classList.toggle('is-collapsed');
    });
  });
  document.querySelectorAll('[data-chart-collapse]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const card=btn.closest('.collapsible-chart');
      if(card) card.classList.toggle('is-collapsed');
    });
  });
}
initCollapsibles();

})();
