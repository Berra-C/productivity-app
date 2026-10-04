(()=>{'use strict';
const cfg=window.CLOUD_CONFIG||{},$=id=>document.getElementById(id),
escapeHtml=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const endpoint=()=>`${String(cfg.supabaseUrl||'').replace(/\/$/,'')}/functions/v1/${cfg.functionName||'app-api'}`;
const configured=()=>/^https:\/\//.test(String(cfg.supabaseUrl||''))&&String(cfg.anonKey||'').length>20;
function secret(){return $('adminSecret').value.trim()}
function error(msg=''){ $('adminError').textContent=msg }
function fmtDate(v){if(!v)return '—';try{return new Date(v).toLocaleString('tr-TR')}catch{return String(v)}}
function fmtMin(sec){const n=Math.max(0,Number(sec)||0);if(n<3600)return Math.round(n/60)+' dk';const h=n/3600;return (h>=10?Math.round(h):h.toFixed(1).replace('.',','))+' sa'}
async function api(action,payload={}){
  if(!configured())throw new Error('cloud-config.js içindeki Supabase bilgileri eksik.');
  const r=await fetch(endpoint(),{method:'POST',headers:{'content-type':'application/json','apikey':cfg.anonKey},
    body:JSON.stringify({action,adminSecret:secret(),...payload})});
  let b={};try{b=await r.json()}catch{}
  if(!r.ok)throw new Error(b.error||`Sunucu hatası (${r.status})`);
  return b;
}
function credentials(result,label='Yeni kullanıcı'){
  const box=$('adminCredentialResult');
  box.innerHTML=`<div class="admin-cred">
    <div><span>Kullanıcı adı</span><strong>${escapeHtml(result.username)}</strong></div>
    <div><span>Sihirli kelime</span><strong>${escapeHtml(result.magicWord)}</strong></div>
    <div><span>6 haneli kod</span><strong>${escapeHtml(result.accessCode)}</strong></div>
  </div>
  <div class="admin-warning">${escapeHtml(label)} bilgileri güvenlik nedeniyle yalnızca bu üretim/sıfırlama sonucunda açık metin gösterilir. Daha sonra mevcut parola okunamaz; gerekirse yeniden sıfırlanır.</div>`;
}
function renderSummary(s={}){
  const cards=[
    ['Toplam hesap',s.totalAccounts||0],
    ['Aktif hesap',s.enabledAccounts||0],
    ['Son 24 saatte aktif',s.active24h||0],
    ['Son 7 günde aktif',s.active7d||0],
    ['Kayıtlı cihaz',s.totalDevices||0],
    ['Aktif oturum',s.activeSessions||0],
    ['Toplam çalışma',fmtMin(s.totalWorkSeconds||0)],
    ['Çalışma oturumu',s.totalWorkSessions||0],
    ['Görev',`${s.completedTasks||0}/${s.totalTasks||0}`],
    ['Takvim etkinliği',s.totalEvents||0],
    ['Bulut verisi olan hesap',s.syncedAccounts||0],
    ['Devre dışı hesap',s.disabledAccounts||0]
  ];
  $('adminSummary').innerHTML=cards.map(([k,v])=>`<div class="admin-stat"><div class="k">${escapeHtml(k)}</div><div class="v">${escapeHtml(v)}</div></div>`).join('');
}
function deviceStatus(d){
  if(d.revoked)return ['revoked','İptal'];
  if(d.expired)return ['expired','Süresi doldu'];
  return ['active','Aktif'];
}
function render(users){
  const box=$('adminUsers');
  if(!users.length){box.innerHTML='<div class="cloud-muted">Henüz kullanıcı yok.</div>';return}
  box.innerHTML=users.map((u,idx)=>{
    const m=u.metrics||{}, devices=Array.isArray(u.devices)?u.devices:[];
    const devHtml=devices.length?devices.map(d=>{
      const [cls,label]=deviceStatus(d);
      return `<div class="admin-device">
        <div>
          <div class="admin-device-name">${escapeHtml(d.deviceName||'Cihaz')}</div>
          <div class="admin-device-meta">İlk giriş: ${escapeHtml(fmtDate(d.createdAt))}<br>Son görülme: ${escapeHtml(fmtDate(d.lastSeenAt))}<br>Oturum sonu: ${escapeHtml(fmtDate(d.expiresAt))}</div>
        </div>
        <div>
          <div class="admin-device-status ${cls}">${label}</div>
          ${!d.revoked&&!d.expired?`<button class="modal-btn ghost" style="margin-top:6px;padding:5px 7px;font-size:8px" data-revoke-session="${escapeHtml(d.id)}">Çıkış Yap</button>`:''}
        </div>
      </div>`;
    }).join(''):'<div class="cloud-muted">Cihaz kaydı yok.</div>';
    return `<div class="admin-user">
      <div class="admin-user-top">
        <div>
          <b>${escapeHtml(String(u.username).toUpperCase())}</b>
          <div class="admin-meta">${u.disabled?'Devre dışı':'Aktif'} · ${Number(u.activeDeviceCount)||0} aktif cihaz · Oluşturma: ${escapeHtml(fmtDate(u.created_at))} · Son giriş: ${escapeHtml(fmtDate(u.last_login_at))}</div>
          <div class="admin-user-metrics">
            <span class="admin-pill">Çalışma: ${escapeHtml(fmtMin(m.workSeconds||0))}</span>
            <span class="admin-pill">Oturum: ${Number(m.workSessions)||0}</span>
            <span class="admin-pill">Görev: ${Number(m.completedTasks)||0}/${Number(m.totalTasks)||0}</span>
            <span class="admin-pill">Etkinlik: ${Number(m.events)||0}</span>
            <span class="admin-pill">Son sync: ${escapeHtml(fmtDate(u.stateUpdatedAt))}</span>
          </div>
          <button class="admin-device-toggle" data-device-toggle="${idx}">▾ Cihaz geçmişi (${devices.length})</button>
        </div>
        <div class="admin-actions">
          <button class="modal-btn ghost" data-reset="${escapeHtml(u.username)}">Bilgileri Sıfırla</button>
          <button class="modal-btn ghost" data-disable="${escapeHtml(u.username)}" data-value="${u.disabled?'0':'1'}">${u.disabled?'Etkinleştir':'Devre Dışı Bırak'}</button>
        </div>
      </div>
      <div class="admin-devices" data-device-panel="${idx}">${devHtml}</div>
    </div>`;
  }).join('');

  box.querySelectorAll('[data-device-toggle]').forEach(btn=>btn.onclick=()=>{
    const p=box.querySelector(`[data-device-panel="${btn.dataset.deviceToggle}"]`);
    if(p)p.classList.toggle('show');
  });
  box.querySelectorAll('[data-reset]').forEach(btn=>btn.onclick=async()=>{
    if(!confirm(`${btn.dataset.reset} için yeni giriş bilgileri üretilecek ve tüm cihaz oturumları kapanacak. Devam?`))return;
    try{const r=await api('reset-user',{username:btn.dataset.reset});credentials(r,'Yenilenen giriş');await load()}catch(e){error(e.message)}
  });
  box.querySelectorAll('[data-disable]').forEach(btn=>btn.onclick=async()=>{
    try{await api('set-disabled',{username:btn.dataset.disable,disabled:btn.dataset.value==='1'});await load()}catch(e){error(e.message)}
  });
  box.querySelectorAll('[data-revoke-session]').forEach(btn=>btn.onclick=async()=>{
    if(!confirm('Bu cihazın oturumu kapatılsın mı?'))return;
    try{await api('admin-revoke-session',{sessionId:btn.dataset.revokeSession});await load()}catch(e){error(e.message)}
  });
}
async function load(){
  error();
  if(!secret()){error('Önce yönetici anahtarını gir.');return}
  try{
    const r=await api('admin-overview');
    renderSummary(r.summary||{});
    render(r.users||[]);
  }catch(e){error(e.message)}
}
$('adminLoad').onclick=load;
$('adminRefresh').onclick=load;
$('adminCreate').onclick=async()=>{
  error();if(!secret()){error('Önce yönetici anahtarını gir.');return}
  try{const r=await api('create-user');credentials(r);await load()}catch(e){error(e.message)}
};
})();
