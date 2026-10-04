
(function(){
  const STORAGE_KEY = 'direncAgaci_v2';
  const OLD_KEY = 'direncAgaci_v1';
  const SCHEMA_VERSION = 44;

  const TAB_ID = (()=>{
  window.addEventListener('error',event=>{
    const box=document.getElementById('runtimeErrorBanner');
    const text=document.getElementById('runtimeErrorText');
    if(box && text){
      text.textContent='Uygulamada bir hata oluştu: '+(event.error?.message || event.message || 'Bilinmeyen hata');
      box.classList.add('show');
    }
  });
  window.addEventListener('unhandledrejection',event=>{
    const box=document.getElementById('runtimeErrorBanner');
    const text=document.getElementById('runtimeErrorText');
    if(box && text){
      text.textContent='Uygulamada bir işlem tamamlanamadı: '+(event.reason?.message || String(event.reason || 'Bilinmeyen hata'));
      box.classList.add('show');
    }
  });
  document.addEventListener('click',event=>{
    if(event.target?.id==='runtimeErrorClose') document.getElementById('runtimeErrorBanner')?.classList.remove('show');
  });
    try{
      const existing=sessionStorage.getItem('test_tab_id');
      if(existing) return existing;
      const id=(typeof crypto!=='undefined' && typeof crypto.randomUUID==='function')
        ? crypto.randomUUID()
        : 'tab_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,10);
      sessionStorage.setItem('test_tab_id',id);
      return id;
    }catch(error){
      return 'tab_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,10);
    }
  })();

  const TAB_HEARTBEAT_PREFIX='test_tab_heartbeat_';
  function touchTabHeartbeat(){
    try{ localStorage.setItem(TAB_HEARTBEAT_PREFIX+TAB_ID,String(Date.now())); }catch(error){}
  }
  function clearTabHeartbeat(){
    try{ localStorage.removeItem(TAB_HEARTBEAT_PREFIX+TAB_ID); }catch(error){}
  }
  function isTabHeartbeatFresh(tabId,maxAgeMs=15000,now=Date.now()){
    if(!tabId) return false;
    try{
      const value=Number(localStorage.getItem(TAB_HEARTBEAT_PREFIX+tabId));
      return Number.isFinite(value) && value>0 && now-value<=maxAgeMs;
    }catch(error){
      return false;
    }
  }
  touchTabHeartbeat();
  const tabHeartbeatInterval=setInterval(touchTabHeartbeat,5000);

  // IndexedDB şimdilik ikincil, geriye uyumlu bir ayna katmanıdır.
  // Ana açılış kaynağı localStorage olarak kalır.
  const IDB_NAME = 'test_app_storage';
  const IDB_VERSION = 1;
  const IDB_STORE = 'snapshots';
  const IDB_PRIMARY_KEY = 'app-data';

  const RANKS = [
    "Acemi Nöbetçi","Dikkatli Çırak","Kararlı Gözcü","Odak Bekçisi",
    "Direnç Ustası","Zihin Şovalyesi","Sarsılmaz İrade","Konsantrasyon Kahramanı",
    "Zihin Fatihi","Efsanevi Odak"
  ];

  const GROWTH_STAGES = [
    {min:0,  emoji:"🌰"},
    {min:8,  emoji:"🌱"},
    {min:16, emoji:"🌿"},
    {min:24, emoji:"🪴"},
    {min:32, emoji:"🌳"}
  ];

  const SPECIES_POOL = [
    {emoji:"🌳", name:"Meşe"},
    {emoji:"🌲", name:"Çam"},
    {emoji:"🌴", name:"Palmiye"},
    {emoji:"🎋", name:"Bambu"},
    {emoji:"🌵", name:"Kaktüs"},
    {emoji:"🍁", name:"Akçaağaç"},
    {emoji:"🌸", name:"Sakura"},
    {emoji:"🫒", name:"Zeytin"},
    {emoji:"🌻", name:"Ayçiçeği"},
    {emoji:"🌹", name:"Gül"},
    {emoji:"🌼", name:"Papatya"},
    {emoji:"🌷", name:"Lale"},
    {emoji:"🍄", name:"Mantar"},
    {emoji:"🌾", name:"Buğday"},
    {emoji:"🎄", name:"Ladin"},
    {emoji:"🪷", name:"Nilüfer"},
    {emoji:"🌿", name:"Fesleğen"},
    {emoji:"🍀", name:"Yonca"},
    {emoji:"🌱", name:"Filiz"},
    {emoji:"🥭", name:"Mango"}
  ];

  const SPECIES_COLORS = {
    'Meşe':       {accent:'#c98a4b', bg:'rgba(201,138,75,0.16)'},
    'Çam':        {accent:'#4f9d73', bg:'rgba(79,157,115,0.16)'},
    'Palmiye':    {accent:'#d9c15a', bg:'rgba(217,193,90,0.16)'},
    'Bambu':      {accent:'#8fd15c', bg:'rgba(143,209,92,0.16)'},
    'Kaktüs':     {accent:'#5fae76', bg:'rgba(95,174,118,0.16)'},
    'Akçaağaç':   {accent:'#e07a4f', bg:'rgba(224,122,79,0.16)'},
    'Sakura':     {accent:'#f2a4bd', bg:'rgba(242,164,189,0.16)'},
    'Zeytin':     {accent:'#9caf5b', bg:'rgba(156,175,91,0.16)'},
    'Ayçiçeği':   {accent:'#f4c542', bg:'rgba(244,197,66,0.16)'},
    'Gül':        {accent:'#e85d75', bg:'rgba(232,93,117,0.16)'},
    'Papatya':    {accent:'#d9d9a3', bg:'rgba(217,217,163,0.16)'},
    'Lale':       {accent:'#c77dff', bg:'rgba(199,125,255,0.16)'},
    'Mantar':     {accent:'#b5495b', bg:'rgba(181,73,91,0.16)'},
    'Buğday':     {accent:'#c9a24b', bg:'rgba(201,162,75,0.16)'},
    'Ladin':      {accent:'#2f6b4f', bg:'rgba(47,107,79,0.16)'},
    'Nilüfer':    {accent:'#d8a7d1', bg:'rgba(216,167,209,0.16)'},
    'Fesleğen':   {accent:'#5fa85a', bg:'rgba(95,168,90,0.16)'},
    'Yonca':      {accent:'#52b788', bg:'rgba(82,183,136,0.16)'},
    'Filiz':      {accent:'#74d99f', bg:'rgba(116,217,159,0.16)'},
    'Mango':      {accent:'#ff9f5a', bg:'rgba(255,159,90,0.16)'}
  };

  const TREE_GOAL = 80;
  const GROWTH_PER_WORK_MIN = 0.5;  // her dakika çalışma
  const GROWTH_PER_TODO = 4;        // her tamamlanan görev
  const WORK_AUTOSAVE_MS = 30000;
  const TIME_MILESTONES = [10, 25, 50, 90, 120, 180, 240, 300]; // dakika cinsinden dönüm noktaları
  const MILESTONE_MESSAGES = {
    10:  '10 dakika! Isındın 🔥',
    25:  '25 dakika — klasik bir pomodoro tamamladın 🍅',
    50:  '50 dakika! Derin odaktasın 🧠',
    90:  '90 dakika — gerçek bir maraton 🏅',
    120: '2 saat! Bu inanılmaz 🚀',
    180: '3 saat! Efsanevi bir odak 👑',
    240: '4 saat! Sınırların neredeyse yok 🌌',
    300: '5 saat! Bugün tarihe geçti ⭐'
  };
  const LEVEL_BASE_XP = 100;
  const LEVEL_GROWTH = 30; // her seviyede gereken XP bu kadar artar
  const XP_PER_WORK_MIN = 2;
  const XP_PER_TODO = 15;

  function pad(n){ return String(n).padStart(2,'0'); }
  function normalize24HourTime(value){
    const raw=String(value||'').trim();
    if(!raw) return null;
    let h,m;
    const colon=raw.match(/^(\d{1,2}):(\d{2})$/);
    if(colon){
      h=Number(colon[1]); m=Number(colon[2]);
    }else{
      const digits=raw.replace(/\D/g,'');
      if(digits.length===3){ h=Number(digits.slice(0,1)); m=Number(digits.slice(1)); }
      else if(digits.length===4){ h=Number(digits.slice(0,2)); m=Number(digits.slice(2)); }
      else return null;
    }
    if(!Number.isInteger(h)||!Number.isInteger(m)||h<0||h>23||m<0||m>59) return null;
    return pad(h)+':'+pad(m);
  }
  function dateKey(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  // Veri anahtarları içeride ISO (YYYY-MM-DD) kalır; kullanıcıya gösterilen tüm tarihler DD-MM-YY biçimindedir.
  function displayDate(value){
    if(!value) return '';
    let d;
    if(value instanceof Date) d = value;
    else if(/^\d{4}-\d{2}-\d{2}$/.test(String(value))){
      const parts=String(value).split('-');
      return parts[2]+'-'+parts[1]+'-'+parts[0].slice(-2);
    } else d = new Date(value);
    if(Number.isNaN(d.getTime())) return String(value);
    return pad(d.getDate())+'-'+pad(d.getMonth()+1)+'-'+String(d.getFullYear()).slice(-2);
  }
  function displayClockTime(value){
    if(!value) return '';
    const d = new Date(value);
    if(Number.isNaN(d.getTime())) return '';
    return pad(d.getHours())+':'+pad(d.getMinutes());
  }

  function displaySessionTimeRange(session){
    const start = displayClockTime(session?.startedAt);
    const end = displayClockTime(session?.endedAt);
    if(start && end) return start+'–'+end;
    if(start) return start;
    return '';
  }

  function sessionIntervalText(session){
    return sessionIntervals(session).map(x=>displayClockTime(x.start)+'-'+displayClockTime(x.end)).join(', ');
  }

  function parseSessionIntervalText(dateKeyValue,text){
    const ranges=String(text||'').split(',').map(x=>x.trim()).filter(Boolean);
    if(!ranges.length) return null;
    const out=[];
    for(const range of ranges){
      const m=range.match(/^(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})$/);
      if(!m) return null;
      const sh=Number(m[1]),sm=Number(m[2]),eh=Number(m[3]),em=Number(m[4]);
      if(sh>23||eh>23||sm>59||em>59) return null;
      const start=new Date(dateKeyValue+'T'+pad(sh)+':'+pad(sm)+':00').getTime();
      let end=new Date(dateKeyValue+'T'+pad(eh)+':'+pad(em)+':00').getTime();
      if(end<=start) return null;
      out.push({start,end});
    }
    out.sort((a,b)=>a.start-b.start);
    for(let i=1;i<out.length;i++) if(out[i].start<out[i-1].end) return null;
    return out;
  }

  function recomputeSessionDay(key){
    const list=Array.isArray(data.sessionLog?.[key])?data.sessionLog[key]:[];
    const day=getDay(key);
    day.workSeconds=Math.round(list.reduce((sum,s)=>sum+Number(s.duration||0),0));
    day.sessions=list.length;
    day.distraction=list.reduce((sum,s)=>sum+Number(s.distractions||0),0);
    const cats={};
    list.forEach(s=>Object.entries(s.distractionCategories||{}).forEach(([k,v])=>cats[k]=(cats[k]||0)+Number(v||0)));
    day.distractionCategories=cats;
    if(!dayMeetsGoal(key)) day.goalCelebrated=false;
  }

  async function editHistoricalSessionTiming(sessionId){
    if(sessionId===data.activeSessionId) return;
    const session=findSession(sessionId);
    const oldKey=findSessionDateKey(sessionId);
    if(!session||!oldKey) return;
    const dateText=await askPrompt('Oturum tarihi (GG/AA/YYYY)',displayTaskDate(oldKey));
    if(dateText===null) return;
    const newKey=parseTaskDateInput(dateText.trim());
    if(!newKey){ showToast('Geçerli bir tarih gir: GG/AA/YYYY',true); return; }
    const currentText=sessionIntervalText(session) || (displayClockTime(session.startedAt)&&displayClockTime(session.endedAt)?displayClockTime(session.startedAt)+'-'+displayClockTime(session.endedAt):'');
    const intervalText=await askPrompt('Çalışma blokları (örn. 14:00-14:25, 14:50-15:20)',currentText);
    if(intervalText===null) return;
    const intervals=parseSessionIntervalText(newKey,intervalText);
    if(!intervals){ showToast('Saatleri “14:00-14:25, 14:50-15:20” biçiminde gir.',true); return; }
    const total=Math.round(intervals.reduce((sum,x)=>sum+(x.end-x.start)/1000,0));
    if(total<=0){ showToast('Toplam çalışma süresi sıfır olamaz.',true); return; }
    if(newKey!==oldKey){
      data.sessionLog[oldKey]=(data.sessionLog[oldKey]||[]).filter(x=>x.id!==sessionId);
      if(!data.sessionLog[newKey]) data.sessionLog[newKey]=[];
      data.sessionLog[newKey].push(session);
    }
    session.workIntervals=intervals;
    session.startedAt=intervals[0].start;
    session.endedAt=intervals[intervals.length-1].end;
    session.duration=total;
    recomputeSessionDay(oldKey);
    if(newKey!==oldKey) recomputeSessionDay(newKey);
    saveData({force:true});
    renderToday(false); renderSessionList(); updateWorkDisplay(); renderStats(); renderCalendar();
    showToast('Oturum saatleri ve istatistikler güncellendi.',true);
  }

  function displayTaskDate(value){
    if(!value) return '';
    if(/^\d{4}-\d{2}-\d{2}$/.test(String(value))){
      const [y,m,d] = String(value).split('-');
      return d+'/'+m+'/'+y;
    }
    const d = value instanceof Date ? value : new Date(value);
    if(Number.isNaN(d.getTime())) return String(value);
    return pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear();
  }
  function parseTaskDateInput(value){
    const v = String(value || '').trim();
    if(!v) return null;
    const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if(!m) return null;
    const day = Number(m[1]), month = Number(m[2]), year = Number(m[3]);
    const d = new Date(year, month-1, day);
    if(d.getFullYear() !== year || d.getMonth() !== month-1 || d.getDate() !== day) return null;
    return year+'-'+pad(month)+'-'+pad(day);
  }
  function formatTaskDateTyping(value){
    const digits = String(value || '').replace(/\D/g,'').slice(0,8);
    if(digits.length <= 2) return digits;
    if(digits.length <= 4) return digits.slice(0,2)+'/'+digits.slice(2);
    return digits.slice(0,2)+'/'+digits.slice(2,4)+'/'+digits.slice(4);
  }
  function todayKey(){ return dateKey(new Date()); }
  function startOfWeek(d){ const day=(d.getDay()+6)%7; const r=new Date(d); r.setDate(d.getDate()-day); r.setHours(0,0,0,0); return r; }
  function addDays(d,n){ const r=new Date(d); r.setDate(r.getDate()+n); return r; }
  function emptyDay(goalMinutes=null){ return {resist:0, distraction:0, distractionCategories:{}, workSeconds:0, sessions:0, goalMinutes:goalMinutes}; }
  function range(a,b){ const arr=[]; for(let i=a;i<=b;i++) arr.push(i); return arr; }
  function escapeHtml(str){ return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

  function ensureAccessibleButtonNames(root=document){
    root.querySelectorAll('button').forEach(btn=>{
      if(!btn.hasAttribute('type')) btn.type='button';
      if(!btn.hasAttribute('aria-label')){
        const title=(btn.getAttribute('title')||'').trim();
        const rowLabel=(btn.closest('.settings-row,.notif-subrow')?.querySelector('.settings-row-label,span')?.textContent||'').trim();
        const visible=(btn.textContent||'').replace(/\s+/g,' ').trim();
        const label=title || rowLabel || visible;
        if(label) btn.setAttribute('aria-label',label);
      }
      if(btn.classList.contains('toggle-switch')){
        btn.setAttribute('role','switch');
        btn.setAttribute('aria-checked',btn.classList.contains('on')?'true':'false');
      }
    });
  }
  ensureAccessibleButtonNames();
  const accessibilityObserver=new MutationObserver(mutations=>{
    for(const mutation of mutations){
      if(mutation.type==='attributes' && mutation.target instanceof HTMLElement && mutation.target.classList.contains('toggle-switch')){
        mutation.target.setAttribute('aria-checked',mutation.target.classList.contains('on')?'true':'false');
      }
      mutation.addedNodes.forEach(node=>{ if(node.nodeType===1) ensureAccessibleButtonNames(node); });
    }
  });
  accessibilityObserver.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  function formatDurationLabel(seconds){
    const mins = Math.floor(seconds/60);
    if(mins < 60) return mins+' dk';
    const h = Math.floor(mins/60), m = mins%60;
    return m===0 ? h+' sa' : h+'sa '+m+'dk';
  }

  function freshData(){
    return {
      schemaVersion: SCHEMA_VERSION,
      totalResists: 0,
      totalTodosCompleted: 0,
      treeProgress: 0,
      treeNumber: 1,
      speciesDeck: [],
      collection: [],
      days: {},
      sessionLog: {},
      activeSessionId: null,
      activeSessionDate: null,
      isWorking: false,
      workStart: null,
      breakState: null,
      timerState: {mode:'idle', sessionId:null, runningSince:null, ownerId:null},
      activeTimerOwnerId: null,
      storageMeta: {revision:0, updatedAt:0, writerId:null},
      intent: '',
      muted: false,
      soundVolume: 70,
      soundCategories: {interface:true, achievement:true, alarm:true},
      notificationsEnabled: false,
      notificationCategories: {sessionTarget:true, breakReminder:true, dailyGoal:true},
      calendarActivityColors: true,
      calendarWorkIntervals: true,
      badgeUnlockLog: [],
      dailyGoalMinutes: 60,
      subjects: [],
      bestGoalStreak: 0,
      streakFreezes: 0,
      streakFreezeAwardedAt: 0,
      streakRewardKeys: [],
      onboarded: false,
      tasks: [],
      recurrenceExceptions: {tasks:{}, events:{}},
      taskTags: [
        {id:'tag_is', name:'İş', color:'#7aa2f7'},
        {id:'tag_kisisel', name:'Kişisel', color:'#74d99f'}
      ],
      events: []
    };
  }

  // Eski/eksik alanları güvenli varsayılanlarla tamamlar; şema ilerledikçe buraya yeni kurallar eklenir.
  function migrateData(raw){
    if(raw.schemaVersion === undefined){
      // v1/v2 (sürüm alanı yoktu) -> eksik alanları doldur
      if(raw.muted === undefined) raw.muted = false;
      if(!raw.sessionLog) raw.sessionLog = {};
      if(raw.activeSessionId === undefined) raw.activeSessionId = null;
      if(raw.breakState === undefined) raw.breakState = null;
      if(raw.totalTodosCompleted === undefined) raw.totalTodosCompleted = 0;
      if(raw.notificationsEnabled === undefined) raw.notificationsEnabled = false;
      if(!raw.badgeUnlockLog) raw.badgeUnlockLog = [];
      if(!raw.dailyGoalMinutes) raw.dailyGoalMinutes = 60;
      if(!raw.subjects) raw.subjects = [];
    }
    if(raw.bestGoalStreak === undefined) raw.bestGoalStreak = 0;
    if(raw.streakFreezes === undefined) raw.streakFreezes = 0;
    if(raw.streakFreezeAwardedAt === undefined) raw.streakFreezeAwardedAt = 0;
    if(!Array.isArray(raw.streakRewardKeys)) raw.streakRewardKeys = [];
    if(raw.activeSessionDate === undefined) raw.activeSessionDate = null;
    if(raw.activeTimerOwnerId === undefined) raw.activeTimerOwnerId = null;
    if(!raw.storageMeta || typeof raw.storageMeta!=='object' || Array.isArray(raw.storageMeta)){
      raw.storageMeta = {revision:0, updatedAt:0, writerId:null};
    }else{
      raw.storageMeta.revision = Math.max(0, Number(raw.storageMeta.revision)||0);
      raw.storageMeta.updatedAt = Math.max(0, Number(raw.storageMeta.updatedAt)||0);
      raw.storageMeta.writerId = raw.storageMeta.writerId ? String(raw.storageMeta.writerId) : null;
    }
    if(raw.onboarded === undefined) raw.onboarded = true; // önceden veri varsa zaten tanışmış demektir
    if(raw.calendarActivityColors === undefined) raw.calendarActivityColors = true;
    if(raw.calendarWorkIntervals === undefined) raw.calendarWorkIntervals = true;
    if(!Number.isFinite(Number(raw.soundVolume))) raw.soundVolume = 70;
    raw.soundVolume = Math.max(0, Math.min(100, Number(raw.soundVolume)));
    if(!raw.soundCategories || typeof raw.soundCategories!=='object'){
      raw.soundCategories = {interface:true, achievement:true, alarm:true};
    }else{
      if(raw.soundCategories.interface === undefined) raw.soundCategories.interface = true;
      if(raw.soundCategories.achievement === undefined) raw.soundCategories.achievement = true;
      if(raw.soundCategories.alarm === undefined) raw.soundCategories.alarm = true;
    }
    if(!Array.isArray(raw.subjects)) raw.subjects = [];
    if(!raw.notificationCategories || typeof raw.notificationCategories!=='object'){
      raw.notificationCategories = {sessionTarget:true, breakReminder:true, dailyGoal:true};
    }else{
      if(raw.notificationCategories.sessionTarget === undefined) raw.notificationCategories.sessionTarget = true;
      if(raw.notificationCategories.breakReminder === undefined) raw.notificationCategories.breakReminder = true;
      if(raw.notificationCategories.dailyGoal === undefined) raw.notificationCategories.dailyGoal = true;
    }
    if(raw.totalResists === undefined) raw.totalResists = 0;
    if(raw.treeProgress === undefined) raw.treeProgress = 0;
    if(raw.treeNumber === undefined) raw.treeNumber = 1;
    if(!Array.isArray(raw.speciesDeck)) raw.speciesDeck = [];
    if(!Array.isArray(raw.collection)) raw.collection = [];
    if(!Array.isArray(raw.badgeUnlockLog)) raw.badgeUnlockLog = [];
    if(!raw.days || typeof raw.days!=='object' || Array.isArray(raw.days)) raw.days = {};
    if(!raw.sessionLog || typeof raw.sessionLog!=='object' || Array.isArray(raw.sessionLog)) raw.sessionLog = {};
    Object.keys(raw.sessionLog).forEach(key=>{
      if(!Array.isArray(raw.sessionLog[key])) raw.sessionLog[key]=[];
    });
    const legacyGoalMinutes = Number(raw.dailyGoalMinutes) || 60;
    Object.keys(raw.days).forEach(k=>{
      const d = raw.days[k];
      if(!d || typeof d !== 'object') return;
      if(!Number.isFinite(Number(d.goalMinutes)) || Number(d.goalMinutes) <= 0){
        d.goalMinutes = legacyGoalMinutes;
      }
      if(!d.distractionCategories || typeof d.distractionCategories !== 'object' || Array.isArray(d.distractionCategories)){
        d.distractionCategories = {};
      }
    });
    if(!raw.recurrenceExceptions || typeof raw.recurrenceExceptions!=='object' || Array.isArray(raw.recurrenceExceptions)){
      raw.recurrenceExceptions = {tasks:{}, events:{}};
    }
    if(!raw.recurrenceExceptions.tasks || typeof raw.recurrenceExceptions.tasks!=='object' || Array.isArray(raw.recurrenceExceptions.tasks)){
      raw.recurrenceExceptions.tasks = {};
    }
    if(!raw.recurrenceExceptions.events || typeof raw.recurrenceExceptions.events!=='object' || Array.isArray(raw.recurrenceExceptions.events)){
      raw.recurrenceExceptions.events = {};
    }
    ['tasks','events'].forEach(kind=>{
      Object.keys(raw.recurrenceExceptions[kind]).forEach(sourceId=>{
        const list=raw.recurrenceExceptions[kind][sourceId];
        if(!Array.isArray(list)){
          delete raw.recurrenceExceptions[kind][sourceId];
          return;
        }
        raw.recurrenceExceptions[kind][sourceId]=[...new Set(list.filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(String(x))))].sort();
        if(raw.recurrenceExceptions[kind][sourceId].length===0) delete raw.recurrenceExceptions[kind][sourceId];
      });
    });

    if(!Array.isArray(raw.tasks)) raw.tasks = [];
    if(!Array.isArray(raw.taskTags)){
      raw.taskTags = [
        {id:'tag_is', name:'İş', color:'#7aa2f7'},
        {id:'tag_kisisel', name:'Kişisel', color:'#74d99f'}
      ];
      const legacyMap = {'İş':'tag_is','Kişisel':'tag_kisisel'};
      raw.tasks.forEach(t=>{ t.tagId = legacyMap[t.tag] || null; });
    } else {
      raw.tasks.forEach(t=>{ if(t.tagId === undefined) t.tagId = null; });
    }
    raw.taskTags.forEach(tag=>{ if('labels' in tag) delete tag.labels; });
    raw.tasks.forEach((t,index)=>{
      if(!Number.isFinite(Number(t.sortOrder))) t.sortOrder=index;
      if('subtag' in t) delete t.subtag;
      if(t.repeat === undefined) t.repeat = 'none';
      if(t.repeatSourceId === undefined) t.repeatSourceId = null;
      if(!Array.isArray(t.repeatDays)) t.repeatDays = [];
      if(t.repeatAnchorDay === undefined) t.repeatAnchorDay = null;
      if(t.repeatUntil === undefined) t.repeatUntil = null;
    });
    const monthlyTaskAnchorBySource = {};
    raw.tasks.forEach(t=>{
      if(t.repeat!=='monthly' || !t.dueDate) return;
      const source=t.repeatSourceId || t.id;
      const day=Number(String(t.dueDate).slice(-2));
      if(Number.isFinite(day)){
        monthlyTaskAnchorBySource[source]=Math.max(monthlyTaskAnchorBySource[source]||0,day);
      }
    });
    raw.tasks.forEach(t=>{
      if(t.repeat==='monthly'){
        const source=t.repeatSourceId || t.id;
        const inferred=monthlyTaskAnchorBySource[source] || Number(String(t.dueDate||'').slice(-2)) || null;
        if(!Number.isFinite(Number(t.repeatAnchorDay)) || Number(t.repeatAnchorDay)<1 || Number(t.repeatAnchorDay)>31){
          t.repeatAnchorDay=inferred;
        }
      }else{
        t.repeatAnchorDay=null;
      }
    });

    if(!Array.isArray(raw.events)) raw.events = [];
    raw.events.forEach(ev=>{
      if(typeof ev.description!=='string') ev.description='';
      ev.description=ev.description.slice(0,600);
      if(ev.repeat === undefined) ev.repeat = 'none';
      if(!Array.isArray(ev.repeatDays)) ev.repeatDays = [];
      if(ev.repeatSourceId === undefined) ev.repeatSourceId = null;
      if(ev.endTime === undefined) ev.endTime = null;
      if(ev.repeatAnchorDay === undefined) ev.repeatAnchorDay = null;
      if(ev.repeatUntil === undefined) ev.repeatUntil = null;
    });
    const monthlyEventAnchorBySource = {};
    raw.events.forEach(ev=>{
      if(ev.repeat!=='monthly' || !ev.date) return;
      const source=ev.repeatSourceId || ev.id;
      const day=Number(String(ev.date).slice(-2));
      if(Number.isFinite(day)){
        monthlyEventAnchorBySource[source]=Math.max(monthlyEventAnchorBySource[source]||0,day);
      }
    });
    raw.events.forEach(ev=>{
      if(ev.repeat==='monthly'){
        const source=ev.repeatSourceId || ev.id;
        const inferred=monthlyEventAnchorBySource[source] || Number(String(ev.date||'').slice(-2)) || null;
        if(!Number.isFinite(Number(ev.repeatAnchorDay)) || Number(ev.repeatAnchorDay)<1 || Number(ev.repeatAnchorDay)>31){
          ev.repeatAnchorDay=inferred;
        }
      }else{
        ev.repeatAnchorDay=null;
      }
    });

    // v4: oturum zaman damgaları ve tekil timer state uyumluluk katmanı.
    // Eski oturumlarda kesin saat bilgisi yoksa veri uydurmak yerine null bırakılır.
    Object.values(raw.sessionLog || {}).forEach(sessions=>{
      if(!Array.isArray(sessions)) return;
      sessions.forEach(session=>{
        if(session.startedAt === undefined) session.startedAt = null;
        if(session.endedAt === undefined) session.endedAt = null;
        if(!Array.isArray(session.workIntervals)){
          session.workIntervals = [];
          const started = Number(session.startedAt);
          const durationMs = Math.max(0, Number(session.duration||0))*1000;
          if(Number.isFinite(started) && durationMs>0){
            session.workIntervals.push({start:started,end:started+durationMs,legacyApprox:true});
          }
          if(session.id===raw.activeSessionId && raw.isWorking && Number(raw.workStart)){
            session.workIntervals.push({start:Number(raw.workStart),end:null});
          }
        }else{
          session.workIntervals = session.workIntervals.map(interval=>({
            start:Number(interval?.start)||null,
            end:interval?.end==null?null:(Number(interval.end)||null),
            legacyApprox:!!interval?.legacyApprox
          })).filter(interval=>interval.start);
        }
        if(session.hidden === undefined) session.hidden = false;
        if(!session.distractionCategories || typeof session.distractionCategories !== 'object' || Array.isArray(session.distractionCategories)){
          session.distractionCategories = {};
        }
      });
    });
    if(raw.activeSessionId){
      const activeSessions = Object.values(raw.sessionLog || {}).flatMap(v=>Array.isArray(v)?v:[]);
      const active = activeSessions.find(session=>session.id===raw.activeSessionId);
      if(active && !active.startedAt && raw.workStart){
        active.startedAt = Math.max(0, Number(raw.workStart) - Number(active.duration || 0)*1000);
      }
    }
    if(!raw.timerState || typeof raw.timerState !== 'object'){
      const mode = raw.breakState ? 'break' : (raw.activeSessionId ? (raw.isWorking ? 'working' : 'paused') : 'idle');
      raw.timerState = {
        mode,
        sessionId: raw.activeSessionId || null,
        runningSince: raw.isWorking ? (raw.workStart || null) : null,
        ownerId: raw.activeTimerOwnerId || null
      };
    }else if(raw.timerState.ownerId === undefined){
      raw.timerState.ownerId = raw.activeTimerOwnerId || null;
    }

    raw.schemaVersion = SCHEMA_VERSION;
    return raw;
  }

  // Kayıtlı veri bozuksa/geçersizse çökmek yerine güvenle sıfırdan başlar
  function looksValid(raw){
    if(!raw || typeof raw!=='object' || Array.isArray(raw)) return false;
    if(typeof raw.totalResists!=='number' || typeof raw.treeProgress!=='number') return false;
    if(!raw.days || typeof raw.days!=='object' || Array.isArray(raw.days)) return false;
    if(raw.tasks !== undefined && !Array.isArray(raw.tasks)) return false;
    if(raw.events !== undefined && !Array.isArray(raw.events)) return false;
    if(raw.taskTags !== undefined && !Array.isArray(raw.taskTags)) return false;
    if(raw.collection !== undefined && !Array.isArray(raw.collection)) return false;
    if(raw.sessionLog !== undefined && (!raw.sessionLog || typeof raw.sessionLog!=='object' || Array.isArray(raw.sessionLog))) return false;
    return true;
  }

  let dataWasReset = false;
  let startupNeedsIDBRecovery = false;

  function tryMigrateStoredData(raw, sourceLabel){
    if(!raw || !looksValid(raw)) return null;
    try{
      return migrateData(raw);
    }catch(error){
      console.error(sourceLabel+' verisi migrate edilemedi:', error);
      return null;
    }
  }

  const AppStorageRepository = {
    readJson(key){
      try{
        const raw=localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      }catch(error){
        return null;
      }
    },
    readRaw(key){
      try{ return localStorage.getItem(key); }
      catch(error){ return null; }
    },
    writeRaw(key,value){
      try{
        localStorage.setItem(key,value);
        return true;
      }catch(error){
        console.error('Yerel depolama yazımı başarısız:', error);
        return false;
      }
    },
    remove(key){
      try{
        localStorage.removeItem(key);
        return true;
      }catch(error){
        return false;
      }
    },
    readPrimary(){
      return this.readJson(STORAGE_KEY);
    },
    readBackup(){
      return this.readJson(BACKUP_KEY);
    },
    readLegacy(){
      return this.readJson(OLD_KEY);
    },
    readPrimaryMeta(){
      const raw=this.readPrimary();
      return raw && raw.storageMeta && typeof raw.storageMeta==='object'
        ? raw.storageMeta
        : null;
    },
    commitSnapshot(serialized,{mirror=true}={}){
      const previous=this.readRaw(STORAGE_KEY);
      if(previous && previous!==serialized && !this.writeRaw(BACKUP_KEY,previous)){
        return false;
      }
      if(!this.writeRaw(STORAGE_KEY,serialized)) return false;
      if(mirror) mirrorSnapshotToIndexedDB(serialized);
      return true;
    },
    savePreImport(value){
      try{
        return this.writeRaw(STORAGE_KEY+'_pre_import',JSON.stringify(value));
      }catch(error){
        return false;
      }
    },
    async resetAll(){
      this.remove(STORAGE_KEY);
      this.remove(BACKUP_KEY);
      this.remove(STORAGE_KEY+'_pre_import');
      this.remove(OLD_KEY);
      return clearIndexedDBSnapshot();
    },
    async readRecoverySnapshot(){
      const snapshot=await readIndexedDBSnapshot();
      return parseIndexedDBSnapshot(snapshot);
    },
    mirror(serialized){
      return mirrorSnapshotToIndexedDB(serialized);
    }
  };

  function loadData(){
    const raw = AppStorageRepository.readPrimary();
    const primary=tryMigrateStoredData(raw,'Primary storage');
    if(primary) return primary;

    const backup = AppStorageRepository.readBackup();
    const recoveredBackup=tryMigrateStoredData(backup,'Backup storage');
    if(recoveredBackup){
      dataWasReset = true;
      return recoveredBackup;
    }
    if(raw || backup) dataWasReset = true;

    const old = AppStorageRepository.readLegacy();

    const fresh = freshData();
    if(old){
      fresh.totalResists = old.total || 0;
      fresh.intent = old.intent || '';
      fresh.onboarded = true;
      const key = old.lastDate ? dateKey(new Date(old.lastDate)) : todayKey();
      fresh.days[key] = emptyDay();
      fresh.days[key].resist = old.todayCount || 0;
      return fresh;
    }

    // Geçerli localStorage/backup/legacy veri yoksa ilk kayıtta IndexedDB aynasını ezme.
    startupNeedsIDBRecovery = true;
    return fresh;
  }

  // ---------- IndexedDB ikincil depolama katmanı ----------
  let idbOpenPromise = null;
  let idbMirrorQueue = Promise.resolve();

  function openAppDatabase(){
    if(!('indexedDB' in window)) return Promise.resolve(null);
    if(idbOpenPromise) return idbOpenPromise;

    idbOpenPromise = new Promise(resolve=>{
      let request;
      try{
        request = indexedDB.open(IDB_NAME, IDB_VERSION);
      }catch(error){
        console.warn('IndexedDB açılamadı:', error);
        resolve(null);
        return;
      }

      request.onupgradeneeded = ()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains(IDB_STORE)){
          db.createObjectStore(IDB_STORE,{keyPath:'key'});
        }
      };
      request.onsuccess = ()=> resolve(request.result);
      request.onerror = ()=>{
        console.warn('IndexedDB açılamadı:', request.error);
        resolve(null);
      };
      request.onblocked = ()=>{
        console.warn('IndexedDB yükseltmesi başka bir sekme tarafından engelleniyor.');
      };
    });

    return idbOpenPromise;
  }

  async function writeIndexedDBSnapshot(serializedData){
    const db=await openAppDatabase();
    if(!db) return false;

    return new Promise(resolve=>{
      let tx;
      try{
        tx=db.transaction(IDB_STORE,'readwrite');
        tx.objectStore(IDB_STORE).put({
          key:IDB_PRIMARY_KEY,
          schemaVersion:SCHEMA_VERSION,
          savedAt:Date.now(),
          payload:serializedData
        });
      }catch(error){
        console.warn('IndexedDB kaydı başlatılamadı:', error);
        resolve(false);
        return;
      }

      tx.oncomplete=()=>resolve(true);
      tx.onerror=()=>{
        console.warn('IndexedDB kaydı başarısız:', tx.error);
        resolve(false);
      };
      tx.onabort=()=>resolve(false);
    });
  }

  function mirrorSnapshotToIndexedDB(serializedData){
    // Yazımları sıraya alarak eski bir snapshot'ın yenisinin üstüne yazmasını engeller.
    idbMirrorQueue=idbMirrorQueue
      .catch(()=>false)
      .then(()=>writeIndexedDBSnapshot(serializedData));
    return idbMirrorQueue;
  }

  async function readIndexedDBSnapshot(){
    const db=await openAppDatabase();
    if(!db) return null;

    return new Promise(resolve=>{
      let tx;
      try{
        tx=db.transaction(IDB_STORE,'readonly');
        const request=tx.objectStore(IDB_STORE).get(IDB_PRIMARY_KEY);
        request.onsuccess=()=>resolve(request.result || null);
        request.onerror=()=>resolve(null);
      }catch(error){
        resolve(null);
      }
    });
  }

  async function clearIndexedDBSnapshot(){
    const db=await openAppDatabase();
    if(!db) return false;

    return new Promise(resolve=>{
      let tx;
      try{
        tx=db.transaction(IDB_STORE,'readwrite');
        tx.objectStore(IDB_STORE).delete(IDB_PRIMARY_KEY);
      }catch(error){
        resolve(false);
        return;
      }
      tx.oncomplete=()=>resolve(true);
      tx.onerror=()=>resolve(false);
      tx.onabort=()=>resolve(false);
    });
  }

  function parseIndexedDBSnapshot(snapshot){
    try{
      const parsed=snapshot && typeof snapshot.payload==='string'
        ? JSON.parse(snapshot.payload)
        : null;
      return parsed && looksValid(parsed) ? parsed : null;
    }catch(error){
      return null;
    }
  }

  async function recoverFromIndexedDBIfNeeded(){
    if(!startupNeedsIDBRecovery) return false;

    let restored=null;
    try{
      const parsed=await AppStorageRepository.readRecoverySnapshot();
      restored=tryMigrateStoredData(parsed,'IndexedDB recovery');
    }catch(error){
      console.warn('IndexedDB kurtarma snapshotı okunamadı:', error);
    }

    // Bundan sonra normal ayna yazımları yeniden etkin.
    startupNeedsIDBRecovery=false;

    if(!restored){
      // Geçerli bir kurtarma yoksa mevcut güvenli başlangıcı aynala.
      saveData();
      return false;
    }

    data=restored;
    if(data.breakState === undefined) data.breakState=null;
    if(data.activeSessionId && !data.activeSessionDate){
      for(const [key,sessions] of Object.entries(data.sessionLog || {})){
        if(Array.isArray(sessions) && sessions.some(session=>session.id===data.activeSessionId)){
          data.activeSessionDate=key;
          break;
        }
      }
    }

    refillDeckIfNeeded();
    reconcileStreakFreeze();

    // Başka canlı sekme timer'ın sahibiyse recovery onu pause etmez.
    if(data.isWorking && data.activeSessionId){
      const ownerIsAlive=data.activeTimerOwnerId
        && data.activeTimerOwnerId!==TAB_ID
        && isTabHeartbeatFresh(data.activeTimerOwnerId);
      if(!ownerIsAlive){
        data.isWorking=false;
        data.workStart=null;
        data.activeTimerOwnerId=null;
      }
    }

    syncTimerState();
    saveData();

    const active=data.activeSessionId ? findSession(data.activeSessionId) : null;
    el.workTimer.textContent=active ? formatRingTime(Number(active.duration||0)) : '00:00';
    renderWorkButtonRow();
    renderToday(false);
    renderDistractionCategorySummary();
    renderSessionList();
    updateIntentDisplay();
    renderCalendar();
    renderStats();
    if(el.collectionContent && !el.collectionContent.classList.contains('collapsed')) renderCollection();
    if(el.summaryContent && !el.summaryContent.classList.contains('collapsed')) renderSummary();

    showToast('Veriler IndexedDB yedeğinden kurtarıldı.','success');
    return true;
  }

  // Bir sonraki depolama geçişi için geliştirici erişimi.
  window.__TEST_STORAGE__ = {
    repository:AppStorageRepository,
    readIndexedDBSnapshot,
    recoverFromIndexedDBIfNeeded,
    mirrorCurrent:()=>AppStorageRepository.mirror(JSON.stringify(data)),
    readPrimary:()=>AppStorageRepository.readPrimary(),
    readBackup:()=>AppStorageRepository.readBackup()
  };

  const BACKUP_KEY = STORAGE_KEY + '_backup';

  // Tek depolama kapısı: UI ve iş mantığı localStorage/IndexedDB ayrıntılarını doğrudan bilmez.
  // Bugün primary localStorage + IndexedDB mirror kullanır; ileride implementation
  // değiştirilirken çağıran kodların değişmemesi için bu katman korunur.


  let lastSaveAt = 0;
  let lastSemanticSnapshot = null;
  let reassertStorageTimer = null;

  function syncTimerState(){
    if(!data) return;
    let mode = 'idle';
    if(data.breakState) mode = 'break';
    else if(data.activeSessionId) mode = data.isWorking ? 'working' : 'paused';
    data.timerState = {
      mode,
      sessionId: data.activeSessionId || null,
      runningSince: mode === 'working' ? (data.workStart || null) : null,
      ownerId: (mode === 'working' || mode === 'break') ? (data.activeTimerOwnerId || null) : null
    };
  }

  function semanticSnapshot(value){
    const copy={...value};
    delete copy.storageMeta;
    return JSON.stringify(copy);
  }

  function storageMetaCompare(a,b){
    const aa=a && typeof a==='object' ? a : {};
    const bb=b && typeof b==='object' ? b : {};
    const ar=Number(aa.revision)||0, br=Number(bb.revision)||0;
    if(ar!==br) return ar-br;
    const at=Number(aa.updatedAt)||0, bt=Number(bb.updatedAt)||0;
    if(at!==bt) return at-bt;
    return String(aa.writerId||'').localeCompare(String(bb.writerId||''));
  }

  function readPrimaryStorageMeta(){
    return AppStorageRepository.readPrimaryMeta();
  }

  function saveData(options={}){
    syncTimerState();
    try{
      const semantic=semanticSnapshot(data);
      if(!options.force && lastSemanticSnapshot!==null && semantic===lastSemanticSnapshot){
        return true;
      }

      const storedMeta=readPrimaryStorageMeta();
      const localMeta=data.storageMeta || {};
      data.storageMeta = {
        revision: Math.max(Number(localMeta.revision)||0, Number(storedMeta?.revision)||0) + 1,
        updatedAt: Date.now(),
        writerId: TAB_ID
      };

      const serialized = JSON.stringify(data);
      const committed=AppStorageRepository.commitSnapshot(serialized,{
        mirror:!startupNeedsIDBRecovery
      });
      if(!committed) return false;

      lastSemanticSnapshot = semantic;
      lastSaveAt = Date.now();
      if(!options.suppressCloud){
        window.dispatchEvent(new CustomEvent('app:data-saved',{detail:{revision:data.storageMeta?.revision||0,updatedAt:data.storageMeta?.updatedAt||Date.now()}}));
      }
      return true;
    }catch(err){
      console.error('Veri kaydedilemedi:', err);
      return false;
    }
  }

  function renderAfterExternalSync(){
    renderWorkButtonRow();
    renderToday(false);
    renderDistractionCategorySummary();
    renderSessionList();
    updateIntentDisplay();
    renderTaskTagControls();
    renderTaskList();
    renderCalendar();
    if(el.panels?.stats?.classList.contains('active')) renderStats();
    if(el.collectionContent && !el.collectionContent.classList.contains('collapsed')) renderCollection();
    if(el.summaryContent && !el.summaryContent.classList.contains('collapsed')) renderSummary();
  }

  function adoptExternalState(incoming){
    data=incoming;
    lastSemanticSnapshot=semanticSnapshot(data);
    refillDeckIfNeeded();
    reconcileStreakFreeze();
    syncTimerState();
    renderAfterExternalSync();
  }

  window.__APP_CLOUD_BRIDGE__ = {
    exportState(){
      return JSON.parse(JSON.stringify(data));
    },
    replaceState(raw,{persist=true}={}){
      if(!raw || typeof raw!=='object' || !looksValid(raw)) throw new Error('Geçersiz bulut verisi');
      const incoming=migrateData(JSON.parse(JSON.stringify(raw)));
      data=incoming;
      lastSemanticSnapshot=semanticSnapshot(data);
      refillDeckIfNeeded();
      reconcileStreakFreeze();
      syncTimerState();
      if(persist) saveData({force:true,suppressCloud:true});
      renderAfterExternalSync();
      return true;
    },
    validateState(raw){
      try{ return !!(raw && typeof raw==='object' && looksValid(raw)); }catch(error){ return false; }
    },
    saveLocal(){ return saveData({force:true,suppressCloud:true}); },
    getStorageMeta(){ return JSON.parse(JSON.stringify(data.storageMeta||{})); }
  };

  window.addEventListener('storage', event=>{
    if(event.key!==STORAGE_KEY || !event.newValue) return;
    let incoming;
    try{
      const parsed=JSON.parse(event.newValue);
      if(!looksValid(parsed)) return;
      incoming=migrateData(parsed);
    }catch(error){
      return;
    }

    const cmp=storageMetaCompare(incoming.storageMeta,data.storageMeta);
    if(cmp>0){
      adoptExternalState(incoming);
      return;
    }

    if(cmp<0 && !reassertStorageTimer){
      reassertStorageTimer=setTimeout(()=>{
        reassertStorageTimer=null;
        saveData({force:true});
      },50);
    }
  });

  const DataRepository = {
    tasks:{
      all:()=>data.tasks,
      byId:id=>data.tasks.find(item=>item.id===id) || null,
      add:item=>{ data.tasks.push(item); return item; },
      removeById(id){
        const index=data.tasks.findIndex(item=>item.id===id);
        if(index<0) return null;
        return data.tasks.splice(index,1)[0] || null;
      }
    },
    events:{
      all:()=>data.events,
      byId:id=>data.events.find(item=>item.id===id) || null,
      add:item=>{ data.events.push(item); return item; },
      removeById(id){
        const index=data.events.findIndex(item=>item.id===id);
        if(index<0) return null;
        return data.events.splice(index,1)[0] || null;
      }
    },
    sessions:{
      forDate:key=>{
        if(!Array.isArray(data.sessionLog[key])) data.sessionLog[key]=[];
        return data.sessionLog[key];
      },
      byId(id){
        for(const [key,sessions] of Object.entries(data.sessionLog||{})){
          if(!Array.isArray(sessions)) continue;
          const session=sessions.find(item=>item.id===id);
          if(session) return {key,session};
        }
        return null;
      }
    },
    days:{
      byKey:key=>data.days[key] || null,
      ensure(key){
        if(!data.days[key]) data.days[key]=emptyDay(data.dailyGoalMinutes||60);
        return data.days[key];
      }
    }
  };

  function getDay(key){
    if(!data.days[key]) data.days[key] = emptyDay(data.dailyGoalMinutes || 60);
    if(!Number.isFinite(Number(data.days[key].goalMinutes)) || Number(data.days[key].goalMinutes) <= 0){
      data.days[key].goalMinutes = data.dailyGoalMinutes || 60;
    }
    return data.days[key];
  }

  function getSessionsFor(key){
    return DataRepository.sessions.forDate(key);
  }
  function repairTodaySessionBucket(){
    const key=todayKey();
    const today=getSessionsFor(key);
    const seen=new Set(today.map(session=>session?.id).filter(Boolean));
    let changed=false;
    for(const [otherKey,sessions] of Object.entries(data.sessionLog||{})){
      if(otherKey===key || !Array.isArray(sessions)) continue;
      for(let i=sessions.length-1;i>=0;i--){
        const session=sessions[i];
        const started=Number(session?.startedAt);
        if(!session?.id || !Number.isFinite(started) || dateKey(new Date(started))!==key || seen.has(session.id)) continue;
        sessions.splice(i,1);
        today.push(session);
        seen.add(session.id);
        changed=true;
      }
    }
    if(changed) saveData({force:true});
    return today;
  }
  function getSessionsToday(){ return repairTodaySessionBucket(); }
  function findSession(id){
    if(!id) return null;
    const found=DataRepository.sessions.byId(id);
    return found ? found.session : null;
  }

  function findSessionDateKey(id){
    const found=DataRepository.sessions.byId(id);
    return found ? found.key : null;
  }

  function dayGoalMinutes(key){
    const d = data.days[key];
    return d && Number(d.goalMinutes) > 0 ? Number(d.goalMinutes) : (data.dailyGoalMinutes || 60);
  }
  function dayGoalSeconds(key){ return dayGoalMinutes(key) * 60; }
  function dayMeetsGoal(key){
    const d = data.days[key];
    return !!(d && Number(d.workSeconds) >= dayGoalSeconds(key));
  }

  function persistAppState(){ saveData(); }
  function pauseActiveWorkForExit(){
    const ownsTimer=!data?.activeTimerOwnerId || data.activeTimerOwnerId===TAB_ID;
    if(data && data.isWorking && data.workStart && ownsTimer){
      flushWorkTime();
      data.isWorking = false;
      data.workStart = null;
      data.activeTimerOwnerId = null;
      saveData();
    }else if(ownsTimer){
      saveData();
    }
    clearTabHeartbeat();
  }
  window.addEventListener('pagehide', pauseActiveWorkForExit);
  window.addEventListener('beforeunload', pauseActiveWorkForExit);
  document.addEventListener('visibilitychange', ()=>{
    if(document.visibilityState === 'hidden') persistAppState();
    else if(typeof timerSchedulerTick === 'function') timerSchedulerTick();
  });

  function refillDeckIfNeeded(){
    if(data.speciesDeck.length === 0){
      data.speciesDeck = [...SPECIES_POOL].sort(()=>Math.random()-0.5);
    }
  }

  let data = loadData();
  if(data.breakState === undefined) data.breakState = null;
  if(data.activeSessionId && !data.activeSessionDate){
    for(const [k,sessions] of Object.entries(data.sessionLog || {})){
      if(Array.isArray(sessions) && sessions.some(s=>s.id===data.activeSessionId)){ data.activeSessionDate = k; break; }
    }
  }
  refillDeckIfNeeded();
  reconcileStreakFreeze();
  if(data.isWorking && data.activeSessionId){
    const ownerIsAlive = data.activeTimerOwnerId
      && data.activeTimerOwnerId!==TAB_ID
      && isTabHeartbeatFresh(data.activeTimerOwnerId);
    if(!ownerIsAlive){
      // Sahip sekme artık yaşamıyorsa çevrimdışı geçen süreyi çalışma sayma.
      data.isWorking = false;
      data.workStart = null;
      data.activeTimerOwnerId = null;
    }
  }
  syncTimerState();
  saveData();

  const expandedSessions = new Set();
  let showHiddenSessions = false;

  // ---------- Metrik yardımcıları ----------
  function totalDistractions(){ return Object.values(data.days).reduce((s,d)=>s+d.distraction,0); }
  function totalWorkSecondsAll(){ return Object.values(data.days).reduce((s,d)=>s+d.workSeconds,0); }
  function totalSessionsCount(){ return Object.values(data.days).reduce((s,d)=>s+d.sessions,0); }
  function bestDayWorkSeconds(){ return Object.values(data.days).reduce((m,d)=>Math.max(m,d.workSeconds),0); }
  function uniqueSpeciesCount(){ return new Set(data.collection.map(c=>c.species)).size; }
  function activeDayKeys(){ return Object.keys(data.days).filter(k=> data.days[k].workSeconds>0).sort(); }

  function computeBestStreak(){
    const keys = activeDayKeys();
    if(keys.length===0) return 0;
    let best=1, cur=1;
    for(let i=1;i<keys.length;i++){
      const diffDays = Math.round((new Date(keys[i]) - new Date(keys[i-1]))/86400000);
      if(diffDays===1){ cur+=1; best=Math.max(best,cur); } else if(diffDays>1){ cur=1; }
    }
    return best;
  }

  // Bugün henüz bitmediği için sayılmaz — bir günün "temiz" sayılması ancak gün tamamlandıktan sonra olur
  function computeBestCleanStreak(){
    const keys = activeDayKeys().filter(k=> k !== todayKey());
    let best=0, cur=0, prevKey=null;
    keys.forEach(k=>{
      const d = data.days[k];
      if(prevKey){
        const diffDays = Math.round((new Date(k) - new Date(prevKey))/86400000);
        if(diffDays!==1) cur=0;
      }
      if(d.distraction===0){ cur+=1; best=Math.max(best,cur); } else { cur=0; }
      prevKey=k;
    });
    return best;
  }

  // Günlük çalışma hedefinin üst üste kaç gün tutturulduğu (dondurulmuş günler de sayılır)
  function computeGoalStreak(){
    const frozen = data.frozenDays || [];
    const qualifying = Object.keys(data.days)
      .filter(k=> dayMeetsGoal(k))
      .concat(frozen)
      .filter((k,i,arr)=> arr.indexOf(k)===i)
      .sort();
    if(qualifying.length === 0) return 0;
    let streak = 1;
    for(let i=qualifying.length-1; i>0; i--){
      const diffDays = Math.round((new Date(qualifying[i]) - new Date(qualifying[i-1]))/86400000);
      if(diffDays === 1) streak += 1; else break;
    }
    const lastKey = qualifying[qualifying.length-1];
    const diffFromToday = Math.round((new Date(todayKey()) - new Date(lastKey))/86400000);
    if(diffFromToday > 1) return 0; // seri kırılmış, en son tutturulan gün dünden daha eski
    return streak;
  }

  // Dün hedef kaçırıldıysa ve bir dondurma hakkın varsa, seriyi otomatik korur (sadece bir kere / gün çalışır)
  function reconcileStreakFreeze(){
    if(!data.frozenDays) data.frozenDays = [];
    const yKey = dateKey(addDays(new Date(), -1));
    const yesterdayQualifies = dayMeetsGoal(yKey) || data.frozenDays.includes(yKey);
    if(yesterdayQualifies || data.streakFreezes <= 0) return;
    const dbKey = dateKey(addDays(new Date(), -2));
    const dayBeforeQualifies = dayMeetsGoal(dbKey) || data.frozenDays.includes(dbKey);
    if(!dayBeforeQualifies) return; // zaten kırık bir seriydi, donduracak bir şey yok
    data.frozenDays.push(yKey);
    data.streakFreezes -= 1;
    saveData();
  }

  // En uzun seriyi günceller ve her 7 günlük yeni dönümde bir dondurma hakkı kazandırır
  function updateStreakMilestones(streak){
    let changed = false;
    if(streak > data.bestGoalStreak){ data.bestGoalStreak = streak; changed = true; }
    if(!Array.isArray(data.streakRewardKeys)) data.streakRewardKeys = [];
    if(streak > 0 && streak % 7 === 0){
      const rewardKey = todayKey() + ':' + streak;
      if(!data.streakRewardKeys.includes(rewardKey)){
        data.streakRewardKeys.push(rewardKey);
        data.streakFreezeAwardedAt = Math.max(data.streakFreezeAwardedAt || 0, streak);
        data.streakFreezes = (data.streakFreezes||0) + 1;
        changed = true;
        showToast('🧊 ' + streak + ' günlük seri! 1 dondurma hakkı kazandın.');
        playBadgeSound();
      }
    }
    if(changed) saveData();
  }

  function streakFreezeProgress(streak){
    const safe=Math.max(0,Number(streak)||0);
    const intoCycle=safe % 7;
    return {
      remaining: intoCycle===0 ? 7 : 7-intoCycle,
      pct: Math.round((intoCycle/7)*100),
      intoCycle
    };
  }

  function renderFreezeStatus(streak){
    if(!el.freezeMini || !el.freezeDetail) return;
    const freezes=Math.max(0,Number(data.streakFreezes)||0);
    const p=streakFreezeProgress(streak);
    el.freezeCount.textContent=freezes;
    el.freezeMini.classList.toggle('has-freeze', freezes>0);
    el.freezeDetail.innerHTML =
      '<div class="freeze-detail-row"><span>Mevcut dondurma hakkı</span><b>'+freezes+'</b></div>'
      + '<div class="freeze-detail-row"><span>Bir sonraki hak</span><b>'+p.remaining+' hedef günü</b></div>'
      + '<div class="freeze-progress"><div class="freeze-progress-fill" style="width:'+Math.min(100,p.pct)+'%"></div></div>'
      + '<div class="freeze-note">Bir günü kaçırırsan, devam eden serini korumak için 1 hak otomatik kullanılır. Her 7 hedef gününde 1 yeni hak kazanırsın.</div>';
  }

  // En uzun oturum rekorları — bugünkü ve tüm zamanların
  function bestSessionSecondsToday(){
    let best = 0;
    getSessionsToday().forEach(s=>{
      let d = s.duration;
      if(s.id === data.activeSessionId && data.isWorking && data.workStart) d += Math.floor((Date.now()-data.workStart)/1000);
      if(d > best) best = d;
    });
    return best;
  }
  function bestSessionSecondsAllTime(){
    let best = 0;
    Object.values(data.sessionLog || {}).forEach(list=>{
      list.forEach(s=>{
        let d = s.duration;
        if(s.id === data.activeSessionId && data.isWorking && data.workStart) d += Math.floor((Date.now()-data.workStart)/1000);
        if(d > best) best = d;
      });
    });
    return best;
  }

  // ---------- Zorlaşan seviye eğrisi (çalışma süresi + görev tamamlama) ----------
  function xpRequiredForLevel(level){ return LEVEL_BASE_XP + (level-1)*LEVEL_GROWTH; }
  function xpFromWork(){ return Math.floor(totalWorkSecondsAll()/60) * XP_PER_WORK_MIN; }
  function xpFromTodos(){ return (data.totalTodosCompleted||0) * XP_PER_TODO; }
  function getTotalXP(){ return xpFromWork() + xpFromTodos(); }
  function getLevelInfo(){
    let totalXP = getTotalXP();
    let level = 1, req = xpRequiredForLevel(1);
    while(totalXP >= req){
      totalXP -= req;
      level += 1;
      req = xpRequiredForLevel(level);
    }
    return { level, xpInLevel: totalXP, xpNeeded: req };
  }
  function getLevel(){ return getLevelInfo().level; }
  function getRank(level){ return RANKS[Math.min(level-1, RANKS.length-1)]; }
  function getGrowthStage(progress){
    let s = GROWTH_STAGES[0];
    for(const st of GROWTH_STAGES){ if(progress >= st.min) s = st; }
    return s;
  }

  // ---------- Rozet kütüphanesi (218 rozet) ----------
  const BADGE_CATEGORIES = [
    { title:'Seviye', icon:'🎖️',
      thresholds: range(1,50),
      getValue: ()=> getLevel(), label: t => 'Seviye '+t },
    { title:'Tamamlanan Ağaçlar', icon:'🌳',
      thresholds:[1,2,3,5,7,10,15,20,25,30,40,50,75,100,150,200],
      getValue: ()=> data.collection.length, label: t => t+' ağaç' },
    { title:'Günlük Çalışma Rekoru', icon:'⏱️',
      thresholds:[10,20,30,45,60,90,120,180,240,300,360,480,600,720,960].map(m=>m*60),
      getValue: ()=> bestDayWorkSeconds(), label: t => formatDurationLabel(t)+' (tek gün)' },
    { title:'Toplam Çalışma Süresi', icon:'📚',
      thresholds:[30,60,120,300,600,1200,1800,3000,4500,6000,9000,12000,18000,30000,45000,60000].map(m=>m*60),
      getValue: ()=> totalWorkSecondsAll(), label: t => formatDurationLabel(t)+' toplam' },
    { title:'Çalışma Oturumu Sayısı', icon:'🔁',
      thresholds:[1,3,5,10,15,20,30,50,75,100,150,200,300,500,750,1000],
      getValue: ()=> totalSessionsCount(), label: t => t+' oturum' },
    { title:'Kullanım Serisi', icon:'🔥',
      thresholds:[2,3,4,5,6,7,10,14,21,30,45,60,90,120,180,270,365],
      getValue: ()=> computeBestStreak(), label: t => t+' gün üst üste' },
    { title:'Temiz Seri (Dikkat Dağılmadan)', icon:'🧘',
      thresholds:[1,3,5,7,10,14,21,30,60,90],
      getValue: ()=> computeBestCleanStreak(), label: t => t+' gün temiz seri' },
    { title:'Tamamlanan Görevler', icon:'✅',
      thresholds:[1,3,5,10,15,25,40,60,100,150,250,400],
      getValue: ()=> data.totalTodosCompleted||0, label: t => t+' görev' }
  ];

  const TOTAL_BADGE_COUNT = BADGE_CATEGORIES.reduce((s,c)=>s+c.thresholds.length,0);

  function countUnlockedBadges(){
    let n=0;
    BADGE_CATEGORIES.forEach(cat=>{
      const v = cat.getValue();
      if(v===null || v===undefined) return;
      cat.thresholds.forEach(t=>{ if(v>=t) n++; });
    });
    return n;
  }

  function getUnlockedBadgeMap(){
    const map = new Map();
    BADGE_CATEGORIES.forEach(cat=>{
      const v = cat.getValue();
      if(v===null || v===undefined) return;
      cat.thresholds.forEach(t=>{ if(v>=t) map.set(cat.title+'|'+t, {icon:cat.icon, label:cat.label(t), category:cat.title}); });
    });
    return map;
  }

  function getNextBadgeProgress(){
    const candidates=[];
    BADGE_CATEGORIES.forEach(cat=>{
      const value=Number(cat.getValue());
      if(!Number.isFinite(value)) return;
      const next=cat.thresholds.find(t=>value<t);
      if(next===undefined) return;
      const prev=[...cat.thresholds].filter(t=>t<=value).pop() || 0;
      const span=Math.max(1,next-prev);
      const pct=Math.max(0,Math.min(100,((value-prev)/span)*100));
      candidates.push({
        icon:cat.icon,
        category:cat.title,
        label:cat.label(next),
        current:value,
        next,
        pct
      });
    });
    if(!candidates.length) return null;
    candidates.sort((a,b)=>b.pct-a.pct || (a.next-a.current)-(b.next-b.current));
    return candidates[0];
  }

  function renderNextBadgeProgress(){
    if(!el.nextBadgeMini) return;
    const n=getNextBadgeProgress();
    if(!n){
      el.nextBadgeMini.innerHTML='<div class="next-badge-label">🎉 Tüm rozetler açıldı</div>';
      return;
    }
    el.nextBadgeMini.innerHTML =
      '<div class="next-badge-label" title="Sıradaki rozet: '+escapeHtml(n.label)+'">'+n.icon+' '+escapeHtml(n.label)+'</div>'
      + '<div class="next-badge-progress" aria-label="Rozet ilerlemesi %'+Math.round(n.pct)+'"><div class="next-badge-fill" style="width:'+Math.round(n.pct)+'%"></div></div>';
  }

  // ---------- DOM refs ----------
  const el = {
    app: document.getElementById('appRoot'),
    tabs: document.querySelectorAll('.tab-btn'),
    panels: { work: document.getElementById('panel-work'), tree: document.getElementById('panel-tree'), tasks: document.getElementById('panel-tasks'), calendar: document.getElementById('panel-calendar'), stats: document.getElementById('panel-stats') },

    currentTaskLine: document.getElementById('currentTaskLine'),
    currentTaskText: document.getElementById('currentTaskText'),
    rank: document.getElementById('rankLabel'),
    levelNum: document.getElementById('levelNum'),
    levelFill: document.getElementById('levelProgressFill'),
    levelCaption: document.getElementById('levelProgressCaption'),
    treeNumberLabel: document.getElementById('treeNumberLabel'),
    tree: document.getElementById('treeEmoji'),
    fill: document.getElementById('progressFill'),
    caption: document.getElementById('progressCaption'),

    workTimer: document.getElementById('workTimer'),
    workButtonRow: document.getElementById('workButtonRow'),
    workHistoryToggle: document.getElementById('workHistoryToggle'),
    workHistoryCount: document.getElementById('workHistoryCount'),
    workHistoryChevron: document.getElementById('workHistoryChevron'),
    workHistoryBody: document.getElementById('workHistoryBody'),
    sessionList: document.getElementById('sessionList'),
    streakBadge: document.getElementById('streakBadge'),
    streakCount: document.getElementById('streakCount'),
    freezeMini: document.getElementById('freezeMini'),
    freezeCount: document.getElementById('freezeCount'),
    freezeDetail: document.getElementById('freezeDetail'),
    dailyGoalEditBtn: document.getElementById('dailyGoalEditBtn'),
    dailyGoalLabel: document.getElementById('dailyGoalLabel'),
    goalMiniFill: document.getElementById('goalMiniFill'),
    dailyScoreRow: document.getElementById('dailyScoreRow'),
    dailyScoreValue: document.getElementById('dailyScoreValue'),
    dailyScoreDetail: document.getElementById('dailyScoreDetail'),
    ringWrap: document.getElementById('ringWrap'),
    ringFill: document.getElementById('ringFill'),
    ringGoalLabel: document.getElementById('ringGoalLabel'),
    statusLine: document.getElementById('statusLine'),
    subjectSection: document.getElementById('subjectSection'),
    subjectInput: document.getElementById('subjectInput'),
    subjectChips: document.getElementById('subjectChips'),
    subjectManageBtn: document.getElementById('subjectManageBtn'),
    subjectManageBackdrop: document.getElementById('subjectManageBackdrop'),
    subjectManageClose: document.getElementById('subjectManageClose'),
    subjectManageList: document.getElementById('subjectManageList'),

    distractRow: document.getElementById('distractRow'),
    distractBtn: document.getElementById('distractBtn'),
    distractTypeBtn: document.getElementById('distractTypeBtn'),
    distractCategoryPanel: document.getElementById('distractCategoryPanel'),
    distractCategorySummary: document.getElementById('distractCategorySummary'),
    distractToday: document.getElementById('distractToday'),

    totalWorkStat: document.getElementById('totalWorkStat'),
    totalTasksStat: document.getElementById('totalTasksStat'),
    treeCount: document.getElementById('treeCount'),
    resetBtn: document.getElementById('resetBtn'),
    exportBtn: document.getElementById('exportBtn'),
    importBtn: document.getElementById('importBtn'),
    importFile: document.getElementById('importFile'),

    badgesSummaryBtn: document.getElementById('badgesSummaryBtn'),
    badgeSummaryCount: document.getElementById('badgeSummaryCount'),
    nextBadgeMini: document.getElementById('nextBadgeMini'),
    badgeBackdrop: document.getElementById('badgeBackdrop'),
    badgeClose: document.getElementById('badgeClose'),
    badgeModalBody: document.getElementById('badgeModalBody'),
    badgeModalCount: document.getElementById('badgeModalCount'),

    eventDetailBackdrop: document.getElementById('eventDetailBackdrop'),
    eventDetailTitle: document.getElementById('eventDetailTitle'),
    eventDetailMeta: document.getElementById('eventDetailMeta'),
    eventDetailDescription: document.getElementById('eventDetailDescription'),
    eventDetailClose: document.getElementById('eventDetailClose'),
    eventDetailSave: document.getElementById('eventDetailSave'),
    eventDetailEditTitle: document.getElementById('eventDetailEditTitle'),
    confirmBackdrop: document.getElementById('confirmBackdrop'),
    confirmText: document.getElementById('confirmText'),
    confirmOk: document.getElementById('confirmOk'),
    confirmAlt: document.getElementById('confirmAlt'),
    confirmCancel: document.getElementById('confirmCancel'),

    promptBackdrop: document.getElementById('promptBackdrop'),
    promptLabel: document.getElementById('promptLabel'),
    promptInput: document.getElementById('promptInput'),
    promptOk: document.getElementById('promptOk'),
    promptCancel: document.getElementById('promptCancel'),

    subjectEditBackdrop: document.getElementById('subjectEditBackdrop'),
    subjectEditLabel: document.getElementById('subjectEditLabel'),
    subjectEditInput: document.getElementById('subjectEditInput'),
    subjectEditChips: document.getElementById('subjectEditChips'),
    subjectEditSave: document.getElementById('subjectEditSave'),
    subjectEditCancel: document.getElementById('subjectEditCancel'),

    goalBackdrop: document.getElementById('goalBackdrop'),
    goalCancel: document.getElementById('goalCancel'),
    goalUp: document.getElementById('goalUp'),
    goalDown: document.getElementById('goalDown'),
    goalMinutesDisplay: document.getElementById('goalMinutesDisplay'),
    goalStart: document.getElementById('goalStart'),
    goalNone: document.getElementById('goalNone'),

    periodBtns: document.querySelectorAll('.period-btn'),
    statsWeekNav: document.getElementById('statsWeekNav'),
    statsWeekPrev: document.getElementById('statsWeekPrev'),
    statsWeekNext: document.getElementById('statsWeekNext'),
    statsWeekLabel: document.getElementById('statsWeekLabel'),
    periodWork: document.getElementById('periodWork'),
    periodSessions: document.getElementById('periodSessions'),
    periodAvgSession: document.getElementById('periodAvgSession'),
    periodDistract: document.getElementById('periodDistract'),
    chartTitle: document.getElementById('chartTitle'),
    metricPills: document.querySelectorAll('.metric-pill'),
    typePills: document.querySelectorAll('.type-pill'),
    heatmapSvg: document.getElementById('heatmapSvg'),
    heatmapTitle: document.getElementById('heatmapTitle'),
    chartSvg: document.getElementById('chartSvg'),
    chartLegend: document.getElementById('chartLegend'),
    subjectBreakdownBody: document.getElementById('subjectBreakdownBody'),
    sessionAnalyticsBody: document.getElementById('sessionAnalyticsBody'),

    collectionContent: document.getElementById('collectionContent'),
    collectionRevealBtn: document.getElementById('collectionRevealBtn'),
    summaryContent: document.getElementById('summaryContent'),
    summaryRevealBtn: document.getElementById('summaryRevealBtn'),

    taskInput: document.getElementById('taskInput'),
    taskTagInput: document.getElementById('taskTagInput'),
    taskDateInput: document.getElementById('taskDateInput'),
    taskTimeToggle: document.getElementById('taskTimeToggle'),
    taskRepeatInput: document.getElementById('taskRepeatInput'),
    taskRepeatDays: document.getElementById('taskRepeatDays'),
    taskTimeInput: document.getElementById('taskTimeInput'),
    taskAddBtn: document.getElementById('taskAddBtn'),
    taskCreateToggle: document.getElementById('taskCreateToggle'),
    taskCreatePanel: document.getElementById('taskCreatePanel'),
    taskDetailsToggle: document.getElementById('taskDetailsToggle'),
    taskDetailsPanel: document.getElementById('taskDetailsPanel'),
    taskSearchToggle: document.getElementById('taskSearchToggle'),
    taskSearchPanel: document.getElementById('taskSearchPanel'),
    taskFilterRow: document.getElementById('taskFilterRow'),
    taskSearchInput: document.getElementById('taskSearchInput'),
    taskSearchClear: document.getElementById('taskSearchClear'),
    taskStatusFilter: document.getElementById('taskStatusFilter'),
    taskDateFilter: document.getElementById('taskDateFilter'),
    taskFilterReset: document.getElementById('taskFilterReset'),
    taskListBody: document.getElementById('taskListBody'),
    clearDoneTasksBtn: document.getElementById('clearDoneTasksBtn'),
    taskTagManagerBtn: document.getElementById('taskTagManagerBtn'),
    taskTagManager: document.getElementById('taskTagManager'),
    taskTagNameInput: document.getElementById('taskTagNameInput'),
    taskTagColorInput: document.getElementById('taskTagColorInput'),
    taskTagCreateBtn: document.getElementById('taskTagCreateBtn'),
    taskTagManageList: document.getElementById('taskTagManageList'),

    calPrevBtn: document.getElementById('calPrevBtn'),
    calNextBtn: document.getElementById('calNextBtn'),
    calTitle: document.getElementById('calTitle'),
    calViewBtns: document.querySelectorAll('.cal-view-btn'),
    calMonthView: document.getElementById('calMonthView'),
    calWeekView: document.getElementById('calWeekView'),
    calYearView: document.getElementById('calYearView'),
    calGrid: document.getElementById('calGrid'),
    calAgenda: document.getElementById('calAgenda'),

    toast: document.getElementById('toast'),
    undoToast: document.getElementById('undoToast'),
    undoToastText: document.getElementById('undoToastText'),
    undoToastBtn: document.getElementById('undoToastBtn'),
    flashOverlay: document.getElementById('flashOverlay'),
    soundToggle: document.getElementById('soundToggle'),
    soundSubsettings: document.getElementById('soundSubsettings'),
    soundVolumeRange: document.getElementById('soundVolumeRange'),
    soundVolumeValue: document.getElementById('soundVolumeValue'),
    soundInterfaceToggle: document.getElementById('soundInterfaceToggle'),
    soundAchievementToggle: document.getElementById('soundAchievementToggle'),
    soundAlarmToggle: document.getElementById('soundAlarmToggle'),
    focusToggleBtn: document.getElementById('focusToggleBtn'),
    settingsToggleBtn: document.getElementById('settingsToggleBtn'),
    settingsBackdrop: document.getElementById('settingsBackdrop'),
    settingsClose: document.getElementById('settingsClose'),
    helpToggleBtn: document.getElementById('helpToggleBtn'),
    helpBackdrop: document.getElementById('helpBackdrop'),
    helpClose: document.getElementById('helpClose'),
    focusOverlay: document.getElementById('focusOverlay'),
    focusCloseBtn: document.getElementById('focusCloseBtn'),
    focusSubjectText: document.getElementById('focusSubjectText'),
    focusCurrentCard: document.getElementById('focusCurrentCard'),
    focusTaskText: document.getElementById('focusTaskText'),
    flipClock: document.getElementById('flipClock'),
    focusTargetWrap: document.getElementById('focusTargetWrap'),
    focusTargetText: document.getElementById('focusTargetText'),
    focusTargetPct: document.getElementById('focusTargetPct'),
    focusTargetFill: document.getElementById('focusTargetFill'),
    focusSubText: document.getElementById('focusSubText'),
    focusPauseBtn: document.getElementById('focusPauseBtn'),
    focusFinishBtn: document.getElementById('focusFinishBtn'),
    notifToggle: document.getElementById('notifToggle'),
    notifSessionToggle: document.getElementById('notifSessionToggle'),
    notifBreakToggle: document.getElementById('notifBreakToggle'),
    notifDailyGoalToggle: document.getElementById('notifDailyGoalToggle'),
    notifSubsettings: document.getElementById('notifSubsettings'),
    calendarColorToggle: document.getElementById('calendarColorToggle'),
    calendarWorkIntervalsToggle: document.getElementById('calendarWorkIntervalsToggle'),

    bigReveal: document.getElementById('bigReveal'),
    achievementTray: document.getElementById('achievementTray'),
    bigRevealIcon: document.getElementById('bigRevealIcon'),
    bigRevealTitle: document.getElementById('bigRevealTitle'),
    bigRevealSubtitle: document.getElementById('bigRevealSubtitle')
  };

  // Aktif oturumun to-do listesindeki ilk tamamlanmamış görevi bul
  function getCurrentTodoTask(){
    if(!data.activeSessionId) return null;
    const s = findSession(data.activeSessionId);
    if(!s || !s.todos || s.todos.length===0) return null;
    const todo = s.todos.find(t=>!t.done);
    if(!todo) return null;
    return { session:s, todo };
  }

  function updateIntentDisplay(){
    const current = getCurrentTodoTask();
    if(current){
      el.currentTaskText.textContent = current.todo.text;
      el.currentTaskLine.style.display = 'flex';
    } else {
      el.currentTaskLine.style.display = 'none';
    }
  }

  // ---------- Ses (Web Audio API) ----------
  let audioCtx = null;

  function soundCategoryEnabled(category='interface'){
    if(data.muted) return false;
    const cats=data.soundCategories || {};
    return cats[category] !== false;
  }

  function soundVolumeMultiplier(){
    return Math.max(0,Math.min(1,(Number(data.soundVolume)||0)/100));
  }

  function ensureAudio(category='interface'){
    if(!soundCategoryEnabled(category)) return null;
    if(!audioCtx){ try{ audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ return null; } }
    if(audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function playNote(freq, startOffset, duration, type, vol, category='interface'){
    const ctx = ensureAudio(category);
    if(!ctx) return;
    type = type || 'sine';
    vol = (vol===undefined ? 0.16 : vol) * soundVolumeMultiplier();
    if(vol<=0) return;
    const t0 = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0+0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0+duration);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t0); osc.stop(t0+duration+0.03);
  }

  function playLevelUpSound(){ [523.25,659.25,783.99,1046.5].forEach((f,i)=>playNote(f,i*0.09,0.22,'triangle',0.13,'achievement')); }
  function playTreeCompleteSound(){ [392,523.25,659.25,783.99,1046.5,1318.5].forEach((f,i)=>playNote(f,i*0.07,0.26,'triangle',0.12,'achievement')); }
  function playDistractSound(){ playNote(300,0,0.16,'square',0.07,'interface'); playNote(210,0.1,0.22,'square',0.07,'interface'); }
  function playBadgeSound(){ playNote(698.46,0,0.1,'sine',0.16,'achievement'); playNote(880,0.05,0.14,'sine',0.16,'achievement'); }
  function playTodoCheckSound(){ playNote(740,0,0.08,'sine',0.14,'interface'); playNote(988,0.05,0.1,'sine',0.12,'interface'); }
  function playMilestoneSound(){ playNote(587.33,0,0.1,'triangle',0.12,'achievement'); playNote(739.99,0.06,0.1,'triangle',0.12,'achievement'); playNote(880,0.12,0.16,'triangle',0.14,'achievement'); }
  function playTimerCompleteSound(){ [880,1046.5,1318.5].forEach((f,i)=>playNote(f,i*0.11,0.24,'triangle',0.16,'alarm')); }

  function updateSoundIcon(){
    el.soundToggle.classList.toggle('on', !data.muted);
    const cats=data.soundCategories || {};
    el.soundInterfaceToggle?.classList.toggle('on', cats.interface !== false);
    el.soundAchievementToggle?.classList.toggle('on', cats.achievement !== false);
    el.soundAlarmToggle?.classList.toggle('on', cats.alarm !== false);
    if(el.soundSubsettings) el.soundSubsettings.style.opacity=data.muted?'.48':'1';
    if(el.soundVolumeRange) el.soundVolumeRange.value=String(Math.round(Number(data.soundVolume)||0));
    if(el.soundVolumeValue) el.soundVolumeValue.textContent=Math.round(Number(data.soundVolume)||0)+'%';
  }
  updateSoundIcon();

  el.soundToggle.addEventListener('click', ()=>{
    data.muted = !data.muted;
    saveData();
    updateSoundIcon();
    if(!data.muted) playBadgeSound();
  });

  function bindSoundCategoryToggle(button,key,label,preview){
    if(!button) return;
    button.addEventListener('click',()=>{
      if(!data.soundCategories) data.soundCategories={interface:true,achievement:true,alarm:true};
      data.soundCategories[key]=!(data.soundCategories[key] !== false);
      saveData();
      updateSoundIcon();
      showToast(label+' '+(data.soundCategories[key]?'açıldı.':'kapatıldı.'),true);
      if(data.soundCategories[key] && !data.muted && typeof preview==='function') preview();
    });
  }
  bindSoundCategoryToggle(el.soundInterfaceToggle,'interface','Arayüz sesleri',()=>playTodoCheckSound());
  bindSoundCategoryToggle(el.soundAchievementToggle,'achievement','Başarı sesleri',()=>playBadgeSound());
  bindSoundCategoryToggle(el.soundAlarmToggle,'alarm','Alarm sesleri',()=>playTimerCompleteSound());

  if(el.soundVolumeRange){
    el.soundVolumeRange.addEventListener('input',()=>{
      data.soundVolume=Math.max(0,Math.min(100,Number(el.soundVolumeRange.value)||0));
      if(el.soundVolumeValue) el.soundVolumeValue.textContent=Math.round(data.soundVolume)+'%';
      if(backgroundAlarmAudio) backgroundAlarmAudio.volume=Math.min(1,0.9*soundVolumeMultiplier());
    });
    el.soundVolumeRange.addEventListener('change',()=>{
      saveData();
      if(!data.muted && soundCategoryEnabled('interface')) playNote(660,0,0.08,'sine',0.12,'interface');
    });
  }

  let backgroundAlarmAudio = null;
  function buildAlarmWavDataUri(){
    const sampleRate = 8000;
    const seconds = 1.35;
    const samples = Math.floor(sampleRate * seconds);
    const bytes = new Uint8Array(44 + samples * 2);
    const view = new DataView(bytes.buffer);
    const write = (offset, text)=>{ for(let j=0;j<text.length;j++) bytes[offset+j]=text.charCodeAt(j); };
    write(0,'RIFF'); view.setUint32(4,36+samples*2,true); write(8,'WAVE');
    write(12,'fmt '); view.setUint32(16,16,true); view.setUint16(20,1,true);
    view.setUint16(22,1,true); view.setUint32(24,sampleRate,true);
    view.setUint32(28,sampleRate*2,true); view.setUint16(32,2,true); view.setUint16(34,16,true);
    write(36,'data'); view.setUint32(40,samples*2,true);
    for(let n=0;n<samples;n++){
      const t=n/sampleRate;
      const tone = t<0.42 ? 880 : (t<0.82 ? 1174.66 : 1396.91);
      const envelope = Math.min(1,t*18) * Math.max(0,1-(t/seconds)*0.7);
      const sample = Math.sin(2*Math.PI*tone*t) * envelope * 0.32;
      view.setInt16(44+n*2, Math.max(-1,Math.min(1,sample))*32767, true);
    }
    let binary='';
    for(let j=0;j<bytes.length;j++) binary+=String.fromCharCode(bytes[j]);
    return 'data:audio/wav;base64,'+btoa(binary);
  }

  function ensureBackgroundAlarmUnlocked(){
    if(backgroundAlarmAudio) return;
    try{
      backgroundAlarmAudio = new Audio(buildAlarmWavDataUri());
      backgroundAlarmAudio.preload = 'auto';
      backgroundAlarmAudio.volume = Math.min(1,0.9*soundVolumeMultiplier());
      const promise = backgroundAlarmAudio.play();
      if(promise && promise.then){
        promise.then(()=>{
          backgroundAlarmAudio.pause();
          backgroundAlarmAudio.currentTime = 0;
        }).catch(()=>{});
      }
    }catch(e){}
  }

  function playSessionEndAlarm(){
    if(!soundCategoryEnabled('alarm')) return;
    if(document.hidden && backgroundAlarmAudio){
      try{
        backgroundAlarmAudio.volume=Math.min(1,0.9*soundVolumeMultiplier());
        backgroundAlarmAudio.currentTime = 0;
        const p = backgroundAlarmAudio.play();
        if(p && p.catch) p.catch(()=>playTimerCompleteSound());
        return;
      }catch(e){}
    }
    playTimerCompleteSound();
  }

  // ---------- Tarayıcı bildirimleri ----------
  function updateNotifIcon(){
    el.notifToggle.classList.toggle('on', !!data.notificationsEnabled);
    const cats=data.notificationCategories || {};
    el.notifSessionToggle?.classList.toggle('on', cats.sessionTarget !== false);
    el.notifBreakToggle?.classList.toggle('on', cats.breakReminder !== false);
    el.notifDailyGoalToggle?.classList.toggle('on', cats.dailyGoal !== false);
    if(el.notifSubsettings) el.notifSubsettings.style.opacity=data.notificationsEnabled?'1':'.48';
  }
  updateNotifIcon();

  function updateCalendarColorToggle(){
    if(el.calendarColorToggle) el.calendarColorToggle.classList.toggle('on', data.calendarActivityColors !== false);
  }
  updateCalendarColorToggle();

  el.calendarColorToggle.addEventListener('click', ()=>{
    data.calendarActivityColors = !(data.calendarActivityColors !== false);
    saveData();
    updateCalendarColorToggle();
    renderCalendar();
    showToast(data.calendarActivityColors ? 'Takvim çalışma renkleri açıldı.' : 'Takvim çalışma renkleri kapatıldı.', true);
  });

  function updateCalendarWorkIntervalsToggle(){
    if(el.calendarWorkIntervalsToggle) el.calendarWorkIntervalsToggle.classList.toggle('on', data.calendarWorkIntervals !== false);
  }
  updateCalendarWorkIntervalsToggle();

  el.calendarWorkIntervalsToggle?.addEventListener('click', ()=>{
    data.calendarWorkIntervals = !(data.calendarWorkIntervals !== false);
    saveData();
    updateCalendarWorkIntervalsToggle();
    renderCalendar();
    showToast(data.calendarWorkIntervals ? 'Çalışma saatleri takvimde gösteriliyor.' : 'Çalışma saatleri takvimden gizlendi.', true);
  });

  function sendNotification(title, body, category=null){
    if(!data.notificationsEnabled) return;
    if(category && data.notificationCategories && data.notificationCategories[category] === false) return;
    if(!('Notification' in window)) return;
    if(Notification.permission !== 'granted') return;
    try{
      new Notification(title, {
        body,
        tag:'test-app',
        icon:'./icons/icon-192.png',
        badge:'./icons/icon-192.png'
      });
    }catch(e){ /* sessizce geç */ }
  }

  function bindNotifCategoryToggle(button,key,label){
    if(!button) return;
    button.addEventListener('click',()=>{
      if(!data.notificationCategories) data.notificationCategories={sessionTarget:true,breakReminder:true,dailyGoal:true};
      data.notificationCategories[key]=!(data.notificationCategories[key] !== false);
      saveData();
      updateNotifIcon();
      showToast(label+' '+(data.notificationCategories[key]?'açıldı.':'kapatıldı.'),true);
    });
  }
  bindNotifCategoryToggle(el.notifSessionToggle,'sessionTarget','Oturum hedefi bildirimleri');
  bindNotifCategoryToggle(el.notifBreakToggle,'breakReminder','Mola hatırlatmaları');
  bindNotifCategoryToggle(el.notifDailyGoalToggle,'dailyGoal','Günlük hedef bildirimleri');

  el.notifToggle.addEventListener('click', async ()=>{
    if(!('Notification' in window)){
      showToast('Tarayıcın bildirimleri desteklemiyor.', true);
      return;
    }
    if(!data.notificationsEnabled){
      const understood = await askConfirm('Bildirimler yalnızca bu sekme açık ve tarayıcı çalışırken gönderilebilir — sekmeyi kapatırsan bildirim gelmez. Yine de açmak ister misin?');
      if(!understood) return;
      let perm = Notification.permission;
      if(perm === 'default'){ perm = await Notification.requestPermission(); }
      if(perm === 'granted'){
        data.notificationsEnabled = true;
        saveData();
        updateNotifIcon();
        showToast('Bildirimler açıldı.', true);
        sendNotification('🌳 Test', 'Bildirimler artık açık. Hedefe ulaştığında ve uzun oturumlarda haber vereceğim.');
      } else {
        showToast('Bildirim izni verilmedi. Tarayıcı ayarlarından değiştirebilirsin.', true);
      }
    } else {
      data.notificationsEnabled = false;
      saveData();
      updateNotifIcon();
      showToast('Bildirimler kapatıldı.', true);
    }
  });

  // ---------- Sekme geçişleri ----------
  el.tabs.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      el.tabs.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      Object.values(el.panels).forEach(p=>p.classList.remove('active'));
      el.panels[btn.dataset.tab].classList.add('active');
      if(btn.dataset.tab === 'stats') renderStats();
      if(btn.dataset.tab === 'tasks') renderTaskList();
      if(btn.dataset.tab === 'calendar') renderCalendar();
    });
  });

  el.collectionRevealBtn.addEventListener('click', ()=>{
    const isOpen = !el.collectionContent.classList.contains('collapsed');
    if(isOpen){
      el.collectionContent.classList.add('collapsed');
      el.collectionRevealBtn.textContent = '🌲 Koleksiyonu Göster';
      el.collectionRevealBtn.classList.remove('open');
    } else {
      renderCollection();
      el.collectionContent.classList.remove('collapsed');
      el.collectionRevealBtn.textContent = '🌲 Koleksiyonu Gizle';
      el.collectionRevealBtn.classList.add('open');
    }
  });

  el.summaryRevealBtn.addEventListener('click', ()=>{
    const isOpen = !el.summaryContent.classList.contains('collapsed');
    if(isOpen){
      el.summaryContent.classList.add('collapsed');
      el.summaryRevealBtn.textContent = '📋 Özet Çıkar';
      el.summaryRevealBtn.classList.remove('open');
    } else {
      renderSummary();
      el.summaryContent.classList.remove('collapsed');
      el.summaryRevealBtn.textContent = '📋 Özeti Gizle';
      el.summaryRevealBtn.classList.add('open');
    }
  });

  // ---------- Geri al kuyruğu ----------
  let undoState = null;
  let undoTimer = null;

  function clearUndo(){
    if(undoTimer){ clearTimeout(undoTimer); undoTimer=null; }
    undoState=null;
    if(el.undoToast) el.undoToast.classList.remove('show');
  }

  function refreshAfterUndo(){
    refreshUI(['today','tasks','calendar','stats','summary','collection']);
    renderSessionList();
    updateIntentDisplay();
    renderWorkButtonRow();
    updateWorkDisplay();
    renderDistractionCategorySummary();
    if(el.focusOverlay.classList.contains('show')) renderFocusOverlay();
  }

  function offerUndo(message, action, ttl=6500){
    clearUndo();
    undoState={action};
    if(el.undoToastText) el.undoToastText.textContent=message;
    if(el.undoToast) el.undoToast.classList.add('show');
    undoTimer=setTimeout(clearUndo,ttl);
  }

  if(el.undoToastBtn){
    el.undoToastBtn.addEventListener('click',()=>{
      if(!undoState || typeof undoState.action!=='function') return;
      const fn=undoState.action;
      clearUndo();
      try{
        fn();
        refreshAfterUndo();
        showToast('İşlem geri alındı.','success');
      }catch(err){
        console.error('Geri alma başarısız:',err);
        showToast('Geri alma işlemi başarısız oldu.','error');
      }
    });
  }

  // ---------- Toast kuyruğu ----------
  let toastQueue = [];
  let toastBusy = false;
  function normalizeToastVariant(variant){
    if(variant===true) return 'calm';
    if(variant===false || variant==null) return 'default';
    return ['default','calm','success','error'].includes(variant) ? variant : 'default';
  }
  function showToast(text, variant='default'){
    toastQueue.push({text, variant:normalizeToastVariant(variant)});
    processToastQueue();
  }
  function processToastQueue(){
    if(toastBusy || toastQueue.length===0) return;
    toastBusy = true;
    const item = toastQueue.shift();
    el.toast.textContent = item.text;
    el.toast.className = 'toast show' + (item.variant!=='default' ? ' '+item.variant : '');
    setTimeout(()=>{
      el.toast.classList.remove('show');
      setTimeout(()=>{ toastBusy=false; processToastQueue(); }, 280);
    }, 1700);
  }

  // ---------- Büyük ödül ekranı kuyruğu ----------
  let revealQueue = [];
  let revealBusy = false;
  function showBigReveal(icon, title, subtitle){
    revealQueue.push({icon, title, subtitle});
    processRevealQueue();
  }

  function addAchievementNotice(item){
    if(!el.achievementTray || !item) return;
    const notice=document.createElement('div');
    notice.className='achievement-notice';
    notice.innerHTML =
      '<div class="achievement-notice-icon"></div>'
      + '<div><div class="achievement-notice-title"></div><div class="achievement-notice-sub"></div></div>'
      + '<button type="button" class="achievement-notice-close" aria-label="Bildirimi kapat">×</button>';
    notice.querySelector('.achievement-notice-icon').textContent=item.icon || '✨';
    notice.querySelector('.achievement-notice-title').textContent=item.title || 'Başarı';
    notice.querySelector('.achievement-notice-sub').textContent=item.subtitle || '';
    el.achievementTray.prepend(notice);
  }

  if(el.achievementTray){
    el.achievementTray.addEventListener('click',e=>{
      const close=e.target.closest('.achievement-notice-close');
      if(!close) return;
      close.closest('.achievement-notice')?.remove();
    });
  }

  function processRevealQueue(){
    if(revealBusy || revealQueue.length===0) return;
    revealBusy = true;
    const item = revealQueue.shift();
    el.bigRevealIcon.textContent = item.icon;
    el.bigRevealTitle.textContent = item.title;
    el.bigRevealSubtitle.textContent = item.subtitle || '';
    el.bigReveal.classList.remove('show');
    void el.bigReveal.offsetWidth;
    el.bigReveal.classList.add('show');
    setTimeout(()=>{
      el.bigReveal.classList.remove('show');
      addAchievementNotice(item);
      setTimeout(()=>{ revealBusy=false; processRevealQueue(); }, 150);
    }, 2300);
  }

  function triggerFlash(variant){
    el.flashOverlay.className = 'flash-overlay' + (variant ? ' '+variant : '');
    void el.flashOverlay.offsetWidth;
    el.flashOverlay.classList.add('show');
  }

  function triggerShake(){ el.app.classList.remove('shake'); void el.app.offsetWidth; el.app.classList.add('shake'); }
  function triggerPulse(){ el.app.classList.remove('pulse'); void el.app.offsetWidth; el.app.classList.add('pulse'); }

  function spawnConfettiBurst(count){
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const symbols = ['🎉','✨','🍃','🌟','🎊','💚'];
    for(let i=0;i<count;i++){
      const p = document.createElement('div');
      p.className = 'confetti-piece';
      p.textContent = symbols[Math.floor(Math.random()*symbols.length)];
      p.style.left = (Math.random()*100) + 'vw';
      p.style.setProperty('--rot', (Math.random()*720-360)+'deg');
      const dur = 1.8 + Math.random()*1.6;
      p.style.animationDuration = dur+'s';
      p.style.animationDelay = (Math.random()*0.4)+'s';
      document.body.appendChild(p);
      setTimeout(()=> p.remove(), (dur+0.5)*1000);
    }
  }

  function celebrateDailyGoal(totalSecondsToday, goalMinutes){
    triggerFlash('tree');
    triggerPulse();
    spawnConfettiBurst(70);
    setTimeout(()=>spawnConfettiBurst(35), 450);
    playTreeCompleteSound();
    showBigReveal(
      '🎯',
      'Günlük Hedef Tamamlandı!',
      Math.round(totalSecondsToday/60) + ' dk çalıştın · Hedef: ' + goalMinutes + ' dk'
    );
  }

  // ---------- Render: bugün paneli ----------
  // Çalışma süresi + tamamlanan görevleri tek bir "günün skoru" sayısında birleştirir
  function getDailyScoreBreakdown(){
    const td = getDay(todayKey());
    const workMin = Math.floor(td.workSeconds/60);
    let todosToday = 0;
    getSessionsToday().forEach(s=> (s.todos||[]).forEach(t=>{ if(t.done) todosToday++; }));
    const workScore = workMin * XP_PER_WORK_MIN;
    const todoScore = todosToday * XP_PER_TODO;
    return {
      workMin,
      todosToday,
      workScore,
      todoScore,
      distractions:Number(td.distraction||0),
      total:workScore+todoScore
    };
  }

  function computeDailyScore(){
    return getDailyScoreBreakdown().total;
  }

  function renderDailyScoreDetail(){
    if(!el.dailyScoreDetail) return;
    const b=getDailyScoreBreakdown();
    el.dailyScoreDetail.innerHTML =
      '<div class="score-break-row"><span>⏱ '+b.workMin+' dk çalışma</span><b>+'+b.workScore+'</b></div>'
      + '<div class="score-break-row"><span>✅ '+b.todosToday+' tamamlanan oturum görevi</span><b>+'+b.todoScore+'</b></div>'
      + '<div class="score-break-row"><span>⭐ Toplam</span><b>'+b.total+'</b></div>'
      + '<div class="score-break-note">Dikkat dağınıklığı ('+b.distractions+') skorunu düşürmez; ayrı bir odak metriği olarak izlenir.</div>';
  }

  function renderToday(justGrew){
    const info = getLevelInfo();
    const stage = getGrowthStage(data.treeProgress);

    el.rank.textContent = getRank(info.level).toUpperCase();
    el.levelNum.textContent = info.level;
    el.levelFill.style.width = Math.min(100, info.xpInLevel/info.xpNeeded*100) + '%';
    el.levelCaption.textContent = info.xpInLevel + ' / ' + info.xpNeeded + ' XP';

    el.treeNumberLabel.textContent = 'Ağaç #' + data.treeNumber;
    el.tree.textContent = stage.emoji;
    el.fill.style.width = Math.min(100, data.treeProgress / TREE_GOAL * 100) + '%';
    el.caption.textContent = Math.round(data.treeProgress) + ' / ' + TREE_GOAL;

    el.totalWorkStat.textContent = formatDurationLabel(totalWorkSecondsAll());
    el.totalTasksStat.textContent = data.totalTodosCompleted || 0;
    el.treeCount.textContent = data.collection.length;
    el.distractToday.textContent = getDay(todayKey()).distraction;
    el.dailyScoreValue.textContent = Math.round(computeDailyScore());
    renderDailyScoreDetail();

    updateWorkDisplay();

    const unlocked = countUnlockedBadges();
    el.badgeSummaryCount.textContent = unlocked + ' / ' + TOTAL_BADGE_COUNT + ' açıldı';
    renderNextBadgeProgress();

    if(justGrew){ el.tree.classList.remove('grew'); void el.tree.offsetWidth; el.tree.classList.add('grew'); }
  }

  function spawnParticles(container, symbols, count, opts){
    opts = opts || {};
    const n = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : count;
    const rect = container.getBoundingClientRect();
    for(let i=0;i<n;i++){
      const p = document.createElement('div');
      p.className = 'particle' + (opts.cls ? ' '+opts.cls : '');
      p.textContent = symbols[Math.floor(Math.random()*symbols.length)];
      const angle = -Math.random()*Math.PI; // sadece yukarı yarım küre -> mesaj yazısının üstünü kapatmaz
      const dist = (opts.minDist||60) + Math.random()*(opts.distRange||80);
      p.style.setProperty('--dx', Math.cos(angle)*dist + 'px');
      p.style.setProperty('--dy', (Math.sin(angle)*dist - 30) + 'px');
      p.style.setProperty('--rot', (Math.random()*360-180)+'deg');
      p.style.left = (rect.width/2) + 'px';
      p.style.top = '0px';
      container.appendChild(p);
      setTimeout(()=> p.remove(), opts.life||950);
    }
  }

  function ambientSpark(){
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if(!el.panels.tree.classList.contains('active')) return;
    const wrap = document.querySelector('.tree-wrap');
    if(!wrap) return;
    const p = document.createElement('div');
    p.className = 'particle ambient';
    p.textContent = Math.random() < 0.5 ? '✨' : '🍃';
    p.style.left = (40 + Math.random()*70) + 'px';
    p.style.top = '20px';
    p.style.setProperty('--dx', (Math.random()*30-15)+'px');
    p.style.setProperty('--dy', (55+Math.random()*30)+'px');
    p.style.setProperty('--rot', (Math.random()*180-90)+'deg');
    wrap.appendChild(p);
    setTimeout(()=> p.remove(), 1500);
  }
  setInterval(ambientSpark, 5000);

  function randomSpecies(){
    if(!SPECIES_POOL.length) return {name:'Filiz',emoji:'🌱'};
    let index;
    if(typeof crypto!=='undefined' && typeof crypto.getRandomValues==='function'){
      const value=new Uint32Array(1);
      crypto.getRandomValues(value);
      index=value[0] % SPECIES_POOL.length;
    }else{
      index=Math.floor(Math.random()*SPECIES_POOL.length);
    }
    return SPECIES_POOL[index];
  }

  function completeTree(){
    const species = randomSpecies();
    data.collection.push({
      species: species.name,
      emoji: species.emoji,
      treeNumber: data.treeNumber,
      completedAt: new Date().toISOString()
    });
    data.treeNumber += 1;
    return species;
  }

  // Ağaç çalışma süresi ve tamamlanan görevlerin ortak katkısıyla büyür.
  // Kalan fazla büyüme puanı bir sonraki ağaca aktarılır (kayıp olmaz).
  function addTreeGrowth(amount){
    if(!amount || amount <= 0) return [];
    data.treeProgress += amount;
    const completed = [];
    while(data.treeProgress >= TREE_GOAL){
      data.treeProgress -= TREE_GOAL;
      completed.push(completeTree());
    }
    return completed;
  }

  // Daha önce verilmiş büyüme puanını güvenli biçimde geri alır.
  // Gerekirse en son tamamlanan ağaçları koleksiyondan geri çeker.
  function removeTreeGrowth(amount){
    let remaining = Math.max(0, Number(amount) || 0);
    if(remaining <= 0) return 0;

    const totalAvailable = Math.max(0, Number(data.treeProgress || 0)) + (data.collection?.length || 0) * TREE_GOAL;
    remaining = Math.min(remaining, totalAvailable);
    const original = remaining;

    while(remaining > Number(data.treeProgress || 0) + 1e-9 && data.collection.length){
      remaining -= Number(data.treeProgress || 0);
      data.treeProgress = 0;

      const removedTree = data.collection.pop();
      data.treeNumber = Math.max(1, Number(data.treeNumber || 1) - 1);

      data.treeProgress = TREE_GOAL;
    }

    data.treeProgress = Math.max(0, Number(data.treeProgress || 0) - remaining);
    if(data.treeProgress >= TREE_GOAL) data.treeProgress = data.treeProgress % TREE_GOAL;
    return original;
  }

  function celebrateTreeCompletions(completedList){
    if(!completedList || !completedList.length) return;
    completedList.forEach(species=>{
      triggerFlash('tree');
      triggerPulse();
      spawnConfettiBurst(70);
      playTreeCompleteSound();
      showBigReveal(species.emoji, species.name + ' Tamamlandı!', (data.collection.length)+'. ağacın — yeni bir ağaç filizleniyor');
    });
  }

  function checkNewBadges(beforeMap){
    const afterMap = getUnlockedBadgeMap();
    const newly = [];
    afterMap.forEach((val, key)=>{ if(!beforeMap.has(key)) newly.push(val); });
    return newly;
  }

  // Çalışma süresi ve görev tamamlama kaynaklarının hepsinde
  // seviye atlama / rozet kontrolü için ortak kullanılan yardımcı
  function reportProgress(beforeLevel, beforeBadges){
    const newLevel = getLevelInfo().level;
    if(newLevel > beforeLevel){
      triggerFlash();
      playLevelUpSound();
      showBigReveal('🎖️', 'Seviye ' + newLevel, getRank(newLevel));
    }
    const newBadges = checkNewBadges(beforeBadges);
    if(newBadges.length){
      playBadgeSound();
      if(!data.badgeUnlockLog) data.badgeUnlockLog = [];
      const nowIso = new Date().toISOString();
      newBadges.forEach(b=>{
        showBigReveal(b.icon, b.label, 'Yeni rozet: ' + b.category);
        data.badgeUnlockLog.push({ icon:b.icon, label:b.label, category:b.category, at: nowIso });
      });
      saveData();
    }
  }

  if(el.freezeMini){
    el.freezeMini.addEventListener('click', ()=>{
      const open=!el.freezeDetail.classList.contains('show');
      el.freezeDetail.classList.toggle('show',open);
      el.freezeMini.setAttribute('aria-expanded',open?'true':'false');
    });
  }

  // ---------- Dikkat dağınıklığı (isteğe bağlı kategori) ----------
  function renderDistractionCategorySummary(){
    if(!el.distractCategorySummary) return;
    const day=getDay(todayKey());
    const map=day.distractionCategories || {};
    const entries=Object.entries(map).filter(([,count])=>Number(count)>0).sort((a,b)=>b[1]-a[1]);
    const categorized=entries.reduce((sum,[,count])=>sum+Number(count||0),0);
    const uncategorized=Math.max(0,Number(day.distraction||0)-categorized);
    const rows=[...entries];
    if(uncategorized>0) rows.push(['__uncategorized__',uncategorized]);
    el.distractCategorySummary.innerHTML = rows
      .map(([name,count])=>{
        const label=name==='__uncategorized__' ? 'Kategorisiz' : name;
        return '<span class="distract-summary-chip">'
          +escapeHtml(label)+' · '+Number(count)
          +'<button type="button" data-action="remove-distraction" data-category="'+escapeHtml(name)+'" aria-label="'+escapeHtml(label)+' dikkat dağınıklığı kaydından bir tane sil">×</button>'
          +'</span>';
      })
      .join('');
  }

  function removeOneDistraction(category){
    const day=getDay(todayKey());
    if(Number(day.distraction||0)<=0) return false;

    const isUncategorized=category==='__uncategorized__';
    if(!isUncategorized){
      const count=Number(day.distractionCategories?.[category]||0);
      if(count<=0) return false;
    }else{
      const categorized=Object.values(day.distractionCategories||{}).reduce((sum,count)=>sum+Number(count||0),0);
      if(Number(day.distraction||0)-categorized<=0) return false;
    }

    const daySnapshot=JSON.parse(JSON.stringify(day));
    const activeSession=data.activeSessionId ? findSession(data.activeSessionId) : null;
    const sessionSnapshot=activeSession ? JSON.parse(JSON.stringify(activeSession)) : null;

    if(!isUncategorized){
      const count=Number(day.distractionCategories?.[category]||0);
      if(count===1) delete day.distractionCategories[category];
      else day.distractionCategories[category]=count-1;
    }
    day.distraction=Math.max(0,Number(day.distraction||0)-1);

    // En olası yanlış tıklama aktif oturumda yapıldığı için, varsa aynı oturum kaydını da azalt.
    if(activeSession && Number(activeSession.distractions||0)>0){
      if(!isUncategorized){
        const sessionCount=Number(activeSession.distractionCategories?.[category]||0);
        if(sessionCount>0){
          if(sessionCount===1) delete activeSession.distractionCategories[category];
          else activeSession.distractionCategories[category]=sessionCount-1;
          activeSession.distractions=Math.max(0,Number(activeSession.distractions||0)-1);
        }
      }else{
        const categorized=Object.values(activeSession.distractionCategories||{}).reduce((sum,count)=>sum+Number(count||0),0);
        if(Number(activeSession.distractions||0)-categorized>0){
          activeSession.distractions=Math.max(0,Number(activeSession.distractions||0)-1);
        }
      }
    }

    saveData();
    renderToday(false);
    renderSessionList();
    renderDistractionCategorySummary();

    offerUndo('Dikkat dağınıklığı kaydı silindi.',()=>{
      data.days[todayKey()]=daySnapshot;
      if(sessionSnapshot){
        const current=findSession(sessionSnapshot.id);
        if(current) Object.assign(current,sessionSnapshot);
      }
      saveData();
      renderToday(false);
      renderSessionList();
      renderDistractionCategorySummary();
    });
    return true;
  }

  el.distractCategorySummary.addEventListener('click',e=>{
    const btn=e.target.closest('[data-action="remove-distraction"]');
    if(!btn) return;
    removeOneDistraction(btn.dataset.category);
  });

  function recordDistraction(category=null){
    const beforeBadges = getUnlockedBadgeMap();
    const beforeLevel = getLevelInfo().level;
    const day=getDay(todayKey());
    day.distraction += 1;
    if(category){
      if(!day.distractionCategories || typeof day.distractionCategories!=='object') day.distractionCategories={};
      day.distractionCategories[category]=(Number(day.distractionCategories[category])||0)+1;
    }
    if(data.isWorking && data.activeSessionId){
      const session = findSession(data.activeSessionId);
      if(session){
        session.distractions += 1;
        if(category){
          if(!session.distractionCategories || typeof session.distractionCategories!=='object') session.distractionCategories={};
          session.distractionCategories[category]=(Number(session.distractionCategories[category])||0)+1;
        }
      }
    }
    saveData();
    renderToday(false);
    renderSessionList();
    renderDistractionCategorySummary();

    triggerShake();
    triggerFlash('red');
    playDistractSound();
    spawnParticles(el.distractRow, ['💢','⚠️'], 7, {cls:'mistake', life:750, minDist:40, distRange:50});

    showToast(category ? (category+' olarak kaydedildi.') : 'Kaydedildi. Hazır olduğunda geri dönebilirsin.', true);
    reportProgress(beforeLevel, beforeBadges);
  }

  el.distractBtn.addEventListener('click', ()=> recordDistraction(null));
  el.distractTypeBtn.addEventListener('click', ()=>{
    el.distractCategoryPanel.classList.toggle('show');
  });
  el.distractCategoryPanel.addEventListener('click', e=>{
    const btn=e.target.closest('[data-distraction-category]');
    if(!btn) return;
    recordDistraction(btn.dataset.distractionCategory);
    el.distractCategoryPanel.classList.remove('show');
  });

  // ---------- Çalışma modu ----------
  let timerSchedulerInterval = null;
  let lastSchedulerPersist = 0;
  let lastAutosave = Date.now();

  function formatHMS(totalSeconds){
    const h = Math.floor(totalSeconds/3600);
    const m = Math.floor((totalSeconds%3600)/60);
    const s = Math.floor(totalSeconds%60);
    return pad(h)+':'+pad(m)+':'+pad(s);
  }
  // Halkanın içine daha rahat sığması için: 1 saatin altında MM:SS, üstünde H:MM:SS
  function formatRingTime(totalSeconds){
    const h = Math.floor(totalSeconds/3600);
    const m = Math.floor((totalSeconds%3600)/60);
    const s = Math.floor(totalSeconds%60);
    if(h > 0) return h+':'+pad(m)+':'+pad(s);
    return pad(m)+':'+pad(s);
  }

  const RING_R = 52;
  const RING_C = 2 * Math.PI * RING_R;
  el.ringFill.setAttribute('stroke-dasharray', RING_C.toFixed(1));

  function isBreakActive(){ return !!(data.breakState && data.breakState.startedAt); }
  function getBreakElapsed(){
    return isBreakActive() ? Math.max(0, Math.floor((Date.now() - data.breakState.startedAt)/1000)) : 0;
  }
  function renderBreakDisplay(options={}){
    const readOnly=!!options.readOnly;
    if(!isBreakActive()) return false;
    const b = data.breakState;
    const elapsed = getBreakElapsed();
    const remaining = b.targetSeconds - elapsed;
    el.workTimer.textContent = remaining >= 0 ? formatRingTime(remaining) : ('+' + formatRingTime(-remaining));
    const pct = b.targetSeconds > 0 ? Math.min(1, elapsed / b.targetSeconds) : 1;
    el.ringFill.style.strokeDashoffset = (RING_C * (1-pct)).toFixed(1);
    el.ringFill.classList.toggle('reached', remaining <= 0);
    el.ringWrap.classList.toggle('reached', remaining <= 0);
    el.ringGoalLabel.textContent = remaining > 0
      ? '☕ Mola · ' + Math.ceil(remaining/60) + ' dk kaldı'
      : '☕ Mola süresi doldu';
    el.statusLine.textContent = remaining > 0
      ? 'Dinleniyorsun — hazır olduğunda molayı geçebilirsin.'
      : 'Mola hedefin doldu. İstersen dinlenmeye devam et ya da yeni oturuma geç.';
    el.goalMiniFill.style.width = Math.round(pct*100) + '%';
    el.goalMiniFill.classList.toggle('reached', remaining <= 0);

    if(remaining <= 0 && !b.notified && !readOnly){
      b.notified = true;
      saveData();
      playTimerCompleteSound();
      triggerFlash();
      showToast('☕ Mola süren doldu. Hazırsan yeni oturuma geçebilirsin.', true);
      sendNotification('☕ Mola tamamlandı', 'Hazırsan yeni çalışma oturumuna başlayabilirsin.', 'breakReminder');
    }
    return true;
  }

  function startBreak(minutes){
    const mins = Math.max(GOAL_MIN, Math.min(GOAL_MAX, Number(minutes) || 5));
    data.breakState = { startedAt: Date.now(), targetSeconds: mins*60, notified:false };
    data.activeTimerOwnerId = TAB_ID;
    touchTabHeartbeat();
    saveData();
    renderWorkButtonRow();
    renderBreakDisplay();
    ensureTimerScheduler();
  }

  function stopBreak(){
    data.breakState = null;
    data.activeTimerOwnerId = null;
    saveData();
    renderWorkButtonRow();
    updateWorkDisplay();
  }

  // Çalışma kartının tüm görsel durumunu (halka, seri, hedef, canlı XP) tek noktadan günceller.
  // Hem statik render'larda hem de saniyelik tick'te çağrılır.
  function updateWorkDisplay(options={}){
    const readOnly=!!options.readOnly;
    const td = getDay(todayKey());
    if(renderBreakDisplay(options)) return;
    let liveElapsed = 0;
    if(data.isWorking && data.workStart) liveElapsed = Math.floor((Date.now() - data.workStart)/1000);
    const totalSecondsToday = td.workSeconds + liveElapsed;

    // Ana sayaç günlük toplamı değil, mevcut oturumun kendi süresini gösterir.
    // Böylece her yeni session 00:00'dan başlar; günlük toplam/hedef aşağıdaki
    // günlük ilerleme hesaplarında aynen korunur.
    const activeSession = data.activeSessionId ? findSession(data.activeSessionId) : null;
    const currentSessionSeconds = activeSession
      ? activeSession.duration + (data.isWorking ? liveElapsed : 0)
      : totalSecondsToday;
    el.workTimer.textContent = formatRingTime(currentSessionSeconds);

    const todayGoalMinutes = dayGoalMinutes(todayKey());
    const goalSeconds = todayGoalMinutes * 60;
    const pct = Math.min(1, totalSecondsToday / goalSeconds);
    const offset = RING_C * (1 - pct);
    el.ringFill.style.strokeDashoffset = offset.toFixed(1);
    const reached = totalSecondsToday >= goalSeconds;
    el.ringFill.classList.toggle('reached', reached);
    el.ringWrap.classList.toggle('reached', reached);
    el.ringGoalLabel.textContent = Math.round(totalSecondsToday/60) + ' / ' + todayGoalMinutes + ' dk';
    el.dailyGoalLabel.textContent = todayGoalMinutes + ' dk';
    el.goalMiniFill.style.width = Math.round(pct*100) + '%';
    el.goalMiniFill.classList.toggle('reached', reached);

    const streak = computeGoalStreak();
    updateStreakMilestones(streak);
    el.streakCount.textContent = streak;
    renderFreezeStatus(streak);
    el.streakBadge.classList.toggle('active', streak > 0);
    const freezeText = data.streakFreezes > 0 ? ' · 🧊 ' + data.streakFreezes + ' dondurma hakkın var' : '';
    el.streakBadge.title = streak === 0 && data.bestGoalStreak > 0
      ? 'En uzun serin: ' + data.bestGoalStreak + ' gün — tekrar başlayabilirsin!' + freezeText
      : 'En uzun serin: ' + data.bestGoalStreak + ' gün' + freezeText;

    let sessionSeconds = 0;
    if(data.activeSessionId){
      const s = findSession(data.activeSessionId);
      sessionSeconds = (s ? s.duration : 0) + (data.isWorking ? liveElapsed : 0);
    }

    // Tek durum satırı: çalışırken dönüm noktası geri sayımı, boştayken günün özeti
    if(data.isWorking){
      const sessionMin = Math.floor(sessionSeconds/60);
      const next = TIME_MILESTONES.find(m=> m > sessionMin);
      el.statusLine.textContent = next
        ? '⏳ ' + (next - sessionMin) + ' dk sonra: ' + next + ' dk dönüm noktası'
        : 'Bugün gerçek bir efsanesin 🏆';
    } else if(td.sessions > 0){
      const bestToday = bestSessionSecondsToday();
      const bestAll = bestSessionSecondsAllTime();
      const isRecord = bestToday > 0 && bestToday >= bestAll && bestAll > 0;
      el.statusLine.textContent = 'Bugün: ' + Math.round(totalSecondsToday/60) + ' dk · ' + td.sessions + ' oturum'
        + (isRecord ? ' · 🏆 kişisel rekor!' : (bestAll > 0 ? ' · Rekorun: ' + formatDurationLabel(bestAll) : ''));
    } else {
      el.statusLine.textContent = 'Bir oturum başlat, dönüm noktalarını gör 🏁';
    }

    if(reached && !td.goalCelebrated && !readOnly){
      td.goalCelebrated = true;
      saveData();
      celebrateDailyGoal(totalSecondsToday, todayGoalMinutes);
      sendNotification('🎯 Günlük hedefe ulaştın!', 'Bugün ' + Math.round(totalSecondsToday/60) + ' dakika çalıştın. Harika iş!', 'dailyGoal');
    }
  }

  const WORK_INTERVAL_COLORS = ['#74d99f','#7aa2f7','#ffb703','#c792ea','#ff9f5a','#5cc8ff','#8bd5ca'];

  function workIntervalColor(session){
    const key=String((session?.subject && session.subject!=='Genel') ? session.subject : (session?.name||'Çalışma'));
    let hash=0;
    for(let i=0;i<key.length;i++) hash=((hash<<5)-hash)+key.charCodeAt(i);
    return WORK_INTERVAL_COLORS[Math.abs(hash)%WORK_INTERVAL_COLORS.length];
  }

  function closeOpenWorkInterval(session, endMs=Date.now()){
    if(!session || !Array.isArray(session.workIntervals)) return;
    for(let i=session.workIntervals.length-1;i>=0;i--){
      const interval=session.workIntervals[i];
      if(interval && interval.end==null){
        interval.end=Math.max(Number(interval.start)||0, Number(endMs)||Date.now());
        return;
      }
    }
  }

  function openWorkInterval(session, startMs=Date.now()){
    if(!session) return;
    if(!Array.isArray(session.workIntervals)) session.workIntervals=[];
    const hasOpen=session.workIntervals.some(interval=>interval && interval.end==null);
    if(!hasOpen) session.workIntervals.push({start:Number(startMs)||Date.now(),end:null});
  }

  function sessionIntervals(session){
    if(!session) return [];
    const intervals=Array.isArray(session.workIntervals) ? session.workIntervals.slice() : [];
    if(!intervals.length && session.startedAt && Number(session.duration)>0){
      intervals.push({start:Number(session.startedAt),end:Number(session.startedAt)+Number(session.duration)*1000,legacyApprox:true});
    }
    return intervals.map(interval=>{
      const start=Number(interval?.start);
      let end=interval?.end==null ? null : Number(interval.end);
      if(interval?.end==null && session.id===data.activeSessionId && data.isWorking){
        end=Date.now();
      }
      return {start,end,legacyApprox:!!interval?.legacyApprox};
    }).filter(interval=>Number.isFinite(interval.start) && Number.isFinite(interval.end) && interval.end>interval.start);
  }

  function workIntervalsForDate(key){
    const dayStart=new Date(key+'T00:00:00').getTime();
    const dayEnd=new Date(key+'T00:00:00').setDate(new Date(key+'T00:00:00').getDate()+1);
    const out=[];
    Object.values(data.sessionLog||{}).forEach(list=>{
      if(!Array.isArray(list)) return;
      list.forEach(session=>{
        sessionIntervals(session).forEach(interval=>{
          const start=Math.max(dayStart,interval.start);
          const end=Math.min(dayEnd,interval.end);
          if(end<=start) return;
          out.push({
            sessionId:session.id,
            subject:(session.subject && session.subject!=='Genel') ? session.subject : (session.name||'Çalışma'),
            start,end,
            startMin:(start-dayStart)/60000,
            endMin:(end-dayStart)/60000,
            color:workIntervalColor(session),
            legacyApprox:interval.legacyApprox
          });
        });
      });
    });
    return out.sort((a,b)=>a.start-b.start);
  }

  function flushWorkTime(){
    if(!data.isWorking || !data.workStart) return [];
    const now = Date.now();
    const startMs = Number(data.workStart);
    const elapsed = Math.max(0, Math.floor((now - startMs)/1000));
    let completed = [];
    if(elapsed > 0){
      let cursor = startMs;
      while(cursor < now){
        const cursorDate = new Date(cursor);
        const nextMidnight = new Date(cursorDate);
        nextMidnight.setHours(24,0,0,0);
        const segmentEnd = Math.min(now, nextMidnight.getTime());
        const segmentSeconds = Math.max(0, Math.floor((segmentEnd - cursor)/1000));
        if(segmentSeconds > 0){
          getDay(dateKey(cursorDate)).workSeconds += segmentSeconds;
        }
        cursor = segmentEnd;
      }
      const s = findSession(data.activeSessionId);
      if(s) s.duration += elapsed;
      data.workStart = now;
      completed = addTreeGrowth((elapsed/60) * GROWTH_PER_WORK_MIN);
      saveData();
    }
    return completed;
  }


  function timerSchedulerTick(){
    const now=Date.now();
    const ownsActiveTimer=!data.activeTimerOwnerId || data.activeTimerOwnerId===TAB_ID;

    if(ownsActiveTimer && (data.isWorking || isBreakActive())) touchTabHeartbeat();

    if(isBreakActive()){
      renderBreakDisplay({readOnly:!ownsActiveTimer});
    } else if(data.isWorking && data.workStart){
      if(ownsActiveTimer){
        workTick();
      }else{
        updateWorkDisplay({readOnly:true});
        if(el.focusOverlay.classList.contains('show')) renderFocusOverlay();
      }
    }

    if(ownsActiveTimer && (data.isWorking || isBreakActive()) && now-lastSchedulerPersist >= 10000){
      lastSchedulerPersist=now;
      persistAppState();
    }
  }

  function ensureTimerScheduler(){
    if(timerSchedulerInterval) return;
    lastSchedulerPersist=Date.now();
    timerSchedulerInterval=setInterval(timerSchedulerTick,1000);
  }

  function workTick(){
    if(!data.isWorking || !data.workStart) return;
    const now = Date.now();
    if(now - lastAutosave > WORK_AUTOSAVE_MS){
      const beforeLevel = getLevelInfo().level;
      const beforeBadges = getUnlockedBadgeMap();
      const completedList = flushWorkTime();
      lastAutosave = now;
      if(completedList.length){ celebrateTreeCompletions(completedList); renderToday(true); }
      reportProgress(beforeLevel, beforeBadges);
    }
    updateWorkDisplay();
    if(el.focusOverlay.classList.contains('show')) renderFocusOverlay();
    const liveElapsed = Math.floor((now - data.workStart)/1000);

    const s = findSession(data.activeSessionId);
    if(s){
      const liveDur = s.duration + liveElapsed;
      const durEl = document.querySelector('.session-card[data-id="'+s.id+'"] .meta-duration');
      if(durEl) durEl.textContent = '⏱ ' + formatDurationLabel(liveDur);

      if(s.targetSeconds){
        const pct = Math.min(100, liveDur / s.targetSeconds * 100);
        const fillEl = document.querySelector('.session-card[data-id="'+s.id+'"] .target-fill');
        const capEl = document.querySelector('.session-card[data-id="'+s.id+'"] .target-caption');
        if(fillEl) fillEl.style.width = pct + '%';
        if(capEl){
          const overtime = Math.max(0, liveDur - s.targetSeconds);
          capEl.textContent = '🎯 ' + formatDurationLabel(Math.min(liveDur, s.targetSeconds)) + ' / ' + formatDurationLabel(s.targetSeconds)
            + (s.targetReached ? ' ✓' : '') + (overtime > 0 ? ' · +' + formatDurationLabel(overtime) : '');
        }

        if(!s.targetReached && liveDur >= s.targetSeconds){
          s.targetReached = true;
          saveData();
          if(capEl) capEl.classList.add('reached');
          triggerFlash();
          triggerPulse();
          playSessionEndAlarm();
          showBigReveal('🎯', 'Hedefe Ulaştın!', s.name + ' — ' + formatDurationLabel(s.targetSeconds) + ' tamamlandı');
          sendNotification('🎯 Hedefe ulaştın!', s.name + ' için hedeflediğin ' + formatDurationLabel(s.targetSeconds) + ' doldu.', 'sessionTarget');
        }
      }


      // Zaman dönüm noktaları (10/25/50/90 dk vb.) — her biri sadece bir kez kutlanır
      const liveMin = Math.floor(liveDur/60);
      if(!s.milestonesHit) s.milestonesHit = [];
      TIME_MILESTONES.forEach(m=>{
        if(liveMin >= m && !s.milestonesHit.includes(m)){
          s.milestonesHit.push(m);
          saveData();
          spawnParticles(document.querySelector('.ring-wrap'), ['🔥','✨','⭐'], 14, {minDist:50, distRange:70});
          playMilestoneSound();
          showToast(MILESTONE_MESSAGES[m] || (m+' dakika!'));
          if(el.statusLine){ el.statusLine.classList.remove('hit'); void el.statusLine.offsetWidth; el.statusLine.classList.add('hit'); }
        }
      });
    }
  }

  function renderWorkButtonRow(){
    let html;
    if(isBreakActive()){
      html = '<button id="breakAdjustBtn" class="work-btn resume">Mola Süresi ⚙️</button>'
           + '<button id="breakSkipBtn" class="work-btn finish">Molayı Geç · Yeni Oturum ▶</button>';
    } else if(data.isWorking){
      html = '<button id="workToggle" class="work-btn active">Duraklat ⏸</button>';
    } else if(data.activeSessionId && findSession(data.activeSessionId)){
      html = '<button id="workResumeBtn" class="work-btn resume">Devam Et ▶</button>'
           + '<button id="workFinishBtn" class="work-btn finish">Bitir ✓</button>';
    } else {
      html = '<button id="workToggle" class="work-btn idle">Çalışmaya Başla ▶</button>';
    }
    el.workButtonRow.innerHTML = html;
  }

  // Yeni bir oturum başlatır (sadece aktif/duraklatılmış oturum yokken çağrılır)
  function startWorking(subject, targetMinutes, seedTodoText=null){
    ensureBackgroundAlarmUnlocked();
    if(isBreakActive()) stopBreak();
    data.isWorking = true;
    data.activeTimerOwnerId = TAB_ID;
    touchTabHeartbeat();
    const sessionStartedAt = Date.now();
    data.workStart = sessionStartedAt;
    const todaySessions = getSessionsToday();
    const cleanSubject = (subject || '').trim();
    if(cleanSubject) rememberSubject(cleanSubject);
    const newSession = {
      id:'s'+sessionStartedAt+'_'+Math.random().toString(36).slice(2,7), name:'Oturum ' + (todaySessions.length+1),
      subject: cleanSubject || 'Genel',
      startedAt: sessionStartedAt,
      endedAt: null,
      workIntervals:[{start:sessionStartedAt,end:null}],
      hidden: false,
      duration:0, distractions:0, distractionCategories:{},
      todos: seedTodoText ? [{id:'t'+sessionStartedAt+'seed', text:String(seedTodoText).trim().slice(0,80), done:false, linkedTaskId:null}] : [],
      targetSeconds: targetMinutes ? targetMinutes*60 : null,
      targetReached: false,
      breakNotified: false,
      milestonesHit: []
    };
    const sessionDate=todayKey();
    data.activeSessionDate = sessionDate;
    getSessionsFor(sessionDate).push(newSession);
    data.activeSessionId = newSession.id;
    getDay(sessionDate).sessions += 1;
    // Oturum kaydı kritik bir oluşturma işlemidir. Özellikle günün ilk oturumunda,
    // konu önerisi kaydı gibi hemen önce yapılan bir save'in bunu yutmasına izin verme.
    saveData({force:true});

    expandedSessions.add(newSession.id);

    renderWorkButtonRow();
    lastAutosave = Date.now();
    ensureTimerScheduler();
    renderToday(false);
    renderSessionList();
    updateIntentDisplay();
    playNote(660,0,0.12);
  }

  // Oturumu duraklatır ama aynı oturumu (süresiyle birlikte) canlı tutar
  function pauseWorking(){
    const beforeBadges = getUnlockedBadgeMap();
    const beforeLevel = getLevelInfo().level;
    const completedList = flushWorkTime();
    closeOpenWorkInterval(data.activeSessionId ? findSession(data.activeSessionId) : null, Date.now());
    data.isWorking = false;
    data.workStart = null;
    data.activeTimerOwnerId = null;
    saveData();
    renderWorkButtonRow();
    const pausedSession = data.activeSessionId ? findSession(data.activeSessionId) : null;
    el.workTimer.textContent = formatRingTime(pausedSession ? pausedSession.duration : 0);
    renderToday(completedList.length > 0);
    renderSessionList();
    updateIntentDisplay();
    celebrateTreeCompletions(completedList);
    showToast('Duraklatıldı. "Devam Et" ile kaldığın yerden sürdürebilirsin.', true);
    reportProgress(beforeLevel, beforeBadges);
  }

  // Duraklatılmış oturuma kaldığı yerden devam eder — yeni oturum açmaz
  function resumeWorking(){
    ensureBackgroundAlarmUnlocked();
    if(!data.activeSessionId || !findSession(data.activeSessionId)) return;
    data.isWorking = true;
    data.workStart = Date.now();
    openWorkInterval(findSession(data.activeSessionId), data.workStart);
    data.activeTimerOwnerId = TAB_ID;
    touchTabHeartbeat();
    saveData();
    renderWorkButtonRow();
    lastAutosave = Date.now();
    ensureTimerScheduler();
    renderToday(false);
    renderSessionList();
    playNote(660,0,0.12);
  }

  // ---------- Odak Modu (tam ekran, dikkat dağıtıcısız görünüm) ----------
  let lastFlipStr = '';

  function buildFlipClockDOM(str){
    el.flipClock.innerHTML = '';
    for(let i=0;i<str.length;i++){
      const ch = str[i];
      if(ch === ':'){
        const sep = document.createElement('div');
        sep.className = 'flip-colon';
        sep.textContent = ':';
        el.flipClock.appendChild(sep);
      } else {
        const digit = document.createElement('div');
        digit.className = 'flip-digit';
        const span = document.createElement('span');
        span.textContent = ch;
        digit.appendChild(span);
        el.flipClock.appendChild(digit);
      }
    }
    lastFlipStr = str;
  }

  function updateFlipClock(seconds){
    const str = formatRingTime(seconds);
    if(str.length !== lastFlipStr.length){
      buildFlipClockDOM(str);
      return;
    }
    const digitEls = el.flipClock.querySelectorAll('.flip-digit');
    let di = 0;
    for(let i=0;i<str.length;i++){
      if(str[i] === ':') continue;
      const cardEl = digitEls[di];
      di++;
      if(!cardEl) continue;
      const span = cardEl.querySelector('span');
      if(lastFlipStr[i] !== str[i]){
        cardEl.classList.remove('flipping');
        void cardEl.offsetWidth;
        cardEl.classList.add('flipping');
        setTimeout(()=>{ span.textContent = str[i]; }, 150);
        setTimeout(()=>{ cardEl.classList.remove('flipping'); }, 340);
      }
    }
    lastFlipStr = str;
  }

  function renderFocusOverlay(){
    const session = data.activeSessionId ? findSession(data.activeSessionId) : null;
    if(!session){
      closeFocusMode();
      return;
    }

    const liveElapsed = (data.isWorking && data.workStart) ? Math.floor((Date.now()-data.workStart)/1000) : 0;
    const liveDur = Number(session.duration||0) + liveElapsed;
    updateFlipClock(liveDur);

    const subject = session.subject && session.subject!=='Genel' ? session.subject : session.name;
    el.focusSubjectText.textContent = subject || 'Genel';

    const current = getCurrentTodoTask();
    if(current){
      el.focusTaskText.textContent = current.todo.text;
      el.focusCurrentCard.classList.remove('no-task');
      const kicker=el.focusCurrentCard.querySelector('.focus-current-kicker');
      if(kicker) kicker.textContent='Şimdi yap';
    }else{
      el.focusTaskText.textContent = 'Aktif görev yok';
      el.focusCurrentCard.classList.add('no-task');
      const kicker=el.focusCurrentCard.querySelector('.focus-current-kicker');
      if(kicker) kicker.textContent='Oturum';
    }

    if(session.targetSeconds){
      const target=Number(session.targetSeconds);
      const pct=Math.min(100,Math.round(liveDur/target*100));
      const remaining=Math.max(0,target-liveDur);
      el.focusTargetWrap.classList.remove('no-target');
      el.focusTargetText.textContent = remaining>0
        ? 'Hedefe '+formatDurationLabel(remaining)+' kaldı'
        : 'Hedef tamamlandı';
      el.focusTargetPct.textContent = pct+'%';
      el.focusTargetFill.style.width=pct+'%';
      el.focusTargetFill.classList.toggle('reached', liveDur>=target);
    }else{
      el.focusTargetWrap.classList.add('no-target');
      el.focusTargetFill.style.width='0%';
      el.focusTargetFill.classList.remove('reached');
    }

    el.focusSubText.textContent = data.isWorking
      ? 'Odak oturumu devam ediyor'
      : 'Oturum duraklatıldı';
    el.focusPauseBtn.textContent = data.isWorking ? 'Duraklat ⏸' : 'Devam Et ▶';
    el.focusPauseBtn.classList.toggle('active', data.isWorking);
    el.focusPauseBtn.classList.toggle('resume', !data.isWorking);
  }

  function openFocusMode(){
    if(!data.activeSessionId || !findSession(data.activeSessionId)){
      showToast('Odak moduna girmek için önce bir oturum başlat.', true);
      return;
    }
    lastFlipStr = ''; // yeniden açılışta saati baştan kur
    renderFocusOverlay();
    el.focusOverlay.classList.add('show');
  }
  function closeFocusMode(){ el.focusOverlay.classList.remove('show'); }

  el.focusToggleBtn.addEventListener('click', openFocusMode);

  function closeSettingsModal(){
    modalController.close(el.settingsBackdrop);
  }
  el.settingsToggleBtn.addEventListener('click', ()=>{
    modalController.open(el.settingsBackdrop,{onCancel:closeSettingsModal,focus:el.settingsClose});
  });
  el.settingsClose.addEventListener('click', closeSettingsModal);

  function prepareHelpGuide(){
    const sections = Array.from(el.helpBackdrop.querySelectorAll('.help-section'));
    sections.forEach((section, index)=>{
      const title = section.querySelector('h4');
      if(!title) return;
      title.setAttribute('role','button');
      title.setAttribute('tabindex','0');
      title.setAttribute('aria-expanded', section.classList.contains('open') ? 'true' : 'false');
      if(!title.dataset.helpBound){
        const toggle = ()=>{
          const opening = !section.classList.contains('open');
          section.classList.toggle('open', opening);
          title.setAttribute('aria-expanded', opening ? 'true' : 'false');
        };
        title.addEventListener('click', toggle);
        title.addEventListener('keydown', e=>{
          if(e.key==='Enter' || e.key===' '){ e.preventDefault(); toggle(); }
        });
        title.dataset.helpBound='1';
      }
      if(index===0 && !sections.some(s=>s.classList.contains('open'))){
        section.classList.add('open');
        title.setAttribute('aria-expanded','true');
      }
    });
  }

  function closeHelpModal(){
    modalController.close(el.helpBackdrop);
  }
  el.helpToggleBtn.addEventListener('click', ()=>{
    modalController.close(el.settingsBackdrop,{restoreFocus:false});
    prepareHelpGuide();
    modalController.open(el.helpBackdrop,{onCancel:closeHelpModal,focus:el.helpClose});
  });
  el.helpClose.addEventListener('click', closeHelpModal);
  el.focusCloseBtn.addEventListener('click', closeFocusMode);
  el.focusPauseBtn.addEventListener('click', ()=>{
    if(data.isWorking) pauseWorking(); else resumeWorking();
    renderFocusOverlay();
  });
  el.focusFinishBtn.addEventListener('click', async ()=>{
    const ok = await askConfirm('Bu odak oturumunu bitirmek istediğine emin misin?');
    if(!ok) return;
    endSession();
  });

  // Oturumu bitirir; sayaç hedef sürede kendiliğinden durmaz, bitirme kararı kullanıcıdadır.
  function endSession(){
    // Oturum hangi arayüzden bitirilirse bitirilsin Focus Mode kapalı kalmalı.
    closeFocusMode();
    const beforeBadges = getUnlockedBadgeMap();
    const beforeLevel = getLevelInfo().level;
    let completedList = [];
    if(data.isWorking){
      completedList = flushWorkTime();
      closeOpenWorkInterval(data.activeSessionId ? findSession(data.activeSessionId) : null, Date.now());
      data.isWorking = false;
      data.workStart = null;
    }
    const endingSession = data.activeSessionId ? findSession(data.activeSessionId) : null;
    if(endingSession){
      closeOpenWorkInterval(endingSession, Date.now());
      if(!endingSession.endedAt) endingSession.endedAt = Date.now();
    }
    data.activeSessionId = null;
    data.activeSessionDate = null;
    data.activeTimerOwnerId = null;
    saveData();
    celebrateTreeCompletions(completedList);
    renderSessionList();
    updateIntentDisplay();
    reportProgress(beforeLevel, beforeBadges);
    showToast('Oturum bitirildi. Şimdi kısa bir mola zamanı ☕', true);
    startBreak(5);
  }

  async function skipBreakAndStartNewSession(){
    const result = await askMinutes('Yeni oturum için bir hedef süre ayarla', 25, true, true, 'session');
    if(result === undefined) return;
    stopBreak();
    startWorking(result.subject, result.minutes);
  }


  el.workButtonRow.addEventListener('click', async (e)=>{
    const btn = e.target.closest('button');
    if(!btn) return;
    if(btn.id === 'workToggle'){
      if(data.isWorking){
        pauseWorking();
      } else {
        const result = await askMinutes('Bu oturum için bir hedef süre ayarla', 25, true, true, 'session');
        if(result === undefined) return; // vazgeçildi
        startWorking(result.subject, result.minutes);
      }
    } else if(btn.id === 'workResumeBtn'){
      resumeWorking();
    } else if(btn.id === 'workFinishBtn'){
      endSession();
    } else if(btn.id === 'breakAdjustBtn'){
      const currentMinutes = Math.max(GOAL_MIN, Math.round((data.breakState && data.breakState.targetSeconds || 300)/60));
      const result = await askMinutes('Mola süresini ayarla', currentMinutes, false, false, 'break');
      if(result === undefined || result.minutes === null || !isBreakActive()) return;
      data.breakState.targetSeconds = result.minutes * 60;
      data.breakState.notified = false;
      saveData();
      renderBreakDisplay();
    } else if(btn.id === 'breakSkipBtn'){
      await skipBreakAndStartNewSession();
    }
  });

  el.dailyGoalEditBtn.addEventListener('click', async ()=>{
    const result = await askMinutes('Günlük çalışma hedefini ayarla', data.dailyGoalMinutes || 60, false, false, 'dailyGoal');
    if(result === undefined || result.minutes === null) return;
    data.dailyGoalMinutes = result.minutes;
    const today = getDay(todayKey());
    today.goalMinutes = result.minutes;
    if(Number(today.workSeconds || 0) < result.minutes * 60){
      today.goalCelebrated = false;
    }
    saveData();
    updateWorkDisplay();
    showToast('Günlük hedef ' + result.minutes + ' dakika olarak ayarlandı.', true);
  });

  renderWorkButtonRow();
  ensureTimerScheduler();
  if(isBreakActive()){
    renderBreakDisplay();
  } else if(data.isWorking && data.workStart && data.activeSessionId && findSession(data.activeSessionId)){
    lastAutosave = Date.now();
    workTick();
  } else {
    if(data.isWorking){ data.isWorking = false; data.workStart = null; saveData(); renderWorkButtonRow(); }
    el.workTimer.textContent = formatRingTime(getDay(todayKey()).workSeconds);
  }

  // ---------- Oturum listesi / to-do ----------
  function sessionCompletionPct(s){
    if(!s.todos || s.todos.length===0) return null;
    const done = s.todos.filter(t=>t.done).length;
    return Math.round(done / s.todos.length * 100);
  }

  let workHistoryOpen = false;

  function updateWorkHistorySummary(){
    if(!el.workHistoryToggle) return;
    const count=getSessionsToday().filter(x=>!x.hidden).length;
    el.workHistoryCount.textContent=String(count);
    el.workHistoryToggle.setAttribute('aria-expanded', workHistoryOpen?'true':'false');
    el.workHistoryBody.classList.toggle('show',workHistoryOpen);
  }

  el.workHistoryToggle.addEventListener('click',()=>{
    workHistoryOpen=!workHistoryOpen;
    updateWorkHistorySummary();
  });

  function renderSessionList(){
    updateWorkHistorySummary();
    const workPanel = document.getElementById('panel-work');
    if(workPanel){
      const hasCurrentSession = !!(data.activeSessionId && findSession(data.activeSessionId));
      workPanel.classList.toggle('session-in-progress', hasCurrentSession);
      workPanel.classList.toggle('session-paused', hasCurrentSession && !data.isWorking);
    }
    const allSessions = getSessionsToday();
    const hiddenCount = allSessions.filter(session=>session.hidden).length;
    const list = showHiddenSessions ? allSessions : allSessions.filter(session=>!session.hidden);
    if(allSessions.length === 0){
      el.sessionList.innerHTML = '<div class="session-empty">Bugün henüz oturum başlatmadın.</div>';
      return;
    }
    if(list.length === 0 && hiddenCount > 0){
      el.sessionList.innerHTML = '<div class="session-hidden-tools"><button class="session-hidden-toggle" data-action="toggle-hidden-sessions">👁 '+hiddenCount+' gizlenen oturumu göster</button></div>';
      return;
    }
    // Var olan (aktif/duraklatılmış) oturumu en öne al ve belirginleştir
    const sorted = [...list].sort((a,b)=>{
      const aCur = a.id === data.activeSessionId ? 1 : 0;
      const bCur = b.id === data.activeSessionId ? 1 : 0;
      return bCur - aCur;
    });

    let html = '';
    let printedHistoryHeading = false;
    sorted.forEach(s=>{
      const isCurrent = s.id === data.activeSessionId;
      const isTicking = isCurrent && data.isWorking;
      const isPaused = isCurrent && !data.isWorking;
      const expanded = expandedSessions.has(s.id);
      const liveDur = isTicking && data.workStart ? s.duration + Math.floor((Date.now()-data.workStart)/1000) : s.duration;
      const pct = sessionCompletionPct(s);
      const pctLabel = pct===null ? 'Görev eklenmedi' : ('%' + pct + ' tamamlandı');
      const hasSubject = s.subject && s.subject !== 'Genel';
      const subjectTag = hasSubject ? '<span class="subject-tag">📘 '+escapeHtml(s.subject)+'</span>' : '';
      const subjectEdit = isCurrent
        ? '<button class="session-subject-edit" data-action="edit-subject" data-id="'+s.id+'">'+(hasSubject?'Değiştir':'＋ Ders / konu ekle')+'</button>'
          + '<button class="session-subject-edit" data-action="manage-subjects" data-id="'+s.id+'" title="Konu önerilerini yönet">⚙ Konular</button>'
        : '';

      if(!isCurrent && !printedHistoryHeading && (data.activeSessionId && findSession(data.activeSessionId))){
        printedHistoryHeading = true;
        html += '<div class="session-history-heading">Geçmiş Oturumlar</div>';
      }

      let todosHtml = '';
      if(s.todos && s.todos.length){
        s.todos.forEach(t=>{
          todosHtml += '<div class="todo-item">'
            + '<button class="todo-check'+(t.done?' done':'')+'" data-action="toggle-todo" data-id="'+s.id+'" data-todo="'+t.id+'">'+(t.done?'✓':'')+'</button>'
            + '<span class="todo-text'+(t.done?' done':'')+'">'+escapeHtml(t.text)+'</span>'
            + '<button class="todo-del" data-action="delete-todo" data-id="'+s.id+'" data-todo="'+t.id+'">✕</button>'
            + '</div>';
        });
      } else {
        todosHtml = '<div class="todo-empty">Henüz görev eklenmedi.</div>';
      }

      let targetHtml = '';
      if(s.targetSeconds){
        const tpct = Math.min(100, liveDur / s.targetSeconds * 100);
        targetHtml = '<div class="session-target">'
          + '<div class="target-bar"><div class="target-fill" style="width:'+tpct+'%"></div></div>'
          + '<div class="target-caption'+(s.targetReached?' reached':'')+'">🎯 '+formatDurationLabel(Math.min(liveDur,s.targetSeconds))+' / '+formatDurationLabel(s.targetSeconds)+(s.targetReached?' ✓':'')+(liveDur>s.targetSeconds?' · +'+formatDurationLabel(liveDur-s.targetSeconds):'')+'</div>'
          + '</div>';
      }

      html += '<div class="session-card'+(isTicking?' active':'')+(isPaused?' paused':'')+(isCurrent?' current':'')+(s.hidden?' hidden-session':'')+'" data-id="'+s.id+'">'
        + (!isCurrent && !s.hidden ? '<button class="session-time-edit-btn" data-action="edit-session-time" data-id="'+s.id+'" title="Oturum tarih ve saatlerini düzenle" aria-label="Oturum saatlerini düzenle">🕒</button><button class="session-delete-btn" data-action="delete-session" data-id="'+s.id+'" title="Oturumu sil" aria-label="Oturumu sil">🗑</button>' : '')
        + (s.hidden ? '<button class="session-restore-btn" data-action="restore-session" data-id="'+s.id+'">Geri Göster</button>' : '')
        + (isCurrent ? '<div class="current-badge">'+(isTicking?'▶ ŞU ANKİ OTURUM':'⏸ ŞU ANKİ OTURUM')+'</div>' : '')
        + '<div class="session-head" data-action="toggle" data-id="'+s.id+'">'
        +   '<span class="chevron">'+(expanded?'▾':'▸')+'</span>'
        +   '<span class="session-name">'+escapeHtml(s.name)+(isTicking?' <span class="live-dot">●</span>':'')+(isPaused?' <span class="paused-tag">⏸ Duraklatıldı</span>':'')+'</span>'
        +   '<button class="session-edit" data-action="rename" data-id="'+s.id+'" title="Adını değiştir">✏️</button>'
        +   '<span class="session-meta">'+(displaySessionTimeRange(s)?'<span class="meta-time">🕒 '+displaySessionTimeRange(s)+'</span>':'')+'<span class="meta-duration">⏱ '+formatDurationLabel(liveDur)+'</span><span class="meta-distract">😕 '+s.distractions+'</span><span class="meta-focus" title="Odak kalite skoru">🧠 '+sessionFocusScore(s)+'</span></span>'
        + '</div>'
        + ((subjectTag || subjectEdit) ? '<div class="session-subject-row">'+subjectTag+subjectEdit+'</div>' : '')
        + '<div class="session-pct">'+pctLabel+'</div>'
        + targetHtml
        + (expanded ? ('<div class="session-body">'+todosHtml+'<div class="todo-add-row"><input type="text" class="todo-input" placeholder="Yeni görev ekle..." /><button class="todo-add-btn" data-action="add-todo" data-id="'+s.id+'">+</button></div></div>') : '')
        + '</div>';
    });
    if(hiddenCount > 0){
      html += '<div class="session-hidden-tools"><button class="session-hidden-toggle" data-action="toggle-hidden-sessions">'
        + (showHiddenSessions ? 'Gizlenenleri Sakla' : '👁 '+hiddenCount+' gizlenen oturumu göster')
        + '</button></div>';
    }
    el.sessionList.innerHTML = html;
  }

  el.sessionList.addEventListener('click', async (e)=>{
    const target = e.target.closest('[data-action]');
    if(!target) return;
    const action = target.dataset.action;
    const sid = target.dataset.id;

    if(action === 'toggle'){
      expandedSessions.has(sid) ? expandedSessions.delete(sid) : expandedSessions.add(sid);
      renderSessionList();
    } else if(action === 'rename'){
      const session = findSession(sid);
      if(!session) return;
      const name = await askPrompt('Oturum adı', session.name);
      if(name !== null && name.trim()){ session.name = name.trim().slice(0,40); saveData(); renderSessionList(); }
    } else if(action === 'manage-subjects'){
      if(sid !== data.activeSessionId) return;
      openSubjectManager();
    } else if(action === 'edit-subject'){
      const session = findSession(sid);
      if(!session || sid !== data.activeSessionId) return;
      const current = session.subject && session.subject !== 'Genel' ? session.subject : '';
      const subject = await askSubject(current);
      if(subject !== null){
        const clean = subject.trim().slice(0,30);
        session.subject = clean || 'Genel';
        if(clean) rememberSubject(clean);
        saveData();
        renderSessionList();
        updateIntentDisplay();
        if(el.focusOverlay.classList.contains('show')) renderFocusOverlay();
        showToast(clean ? 'Çalışılan konu güncellendi: '+clean : 'Ders / konu kaldırıldı.', true);
      }
    } else if(action === 'toggle-hidden-sessions'){
      showHiddenSessions = !showHiddenSessions;
      renderSessionList();
    } else if(action === 'restore-session'){
      const session = findSession(sid);
      if(!session) return;
      session.hidden = false;
      saveData();
      renderSessionList();
      showToast('Oturum tekrar geçmişte gösteriliyor.', true);
    } else if(action === 'edit-session-time'){
      await editHistoricalSessionTiming(sid);
    } else if(action === 'delete-session'){
      if(sid === data.activeSessionId) return;
      const session = findSession(sid);
      const key = findSessionDateKey(sid);
      if(!session || !key) return;

      const rewardedTodos = Array.isArray(session.todos)
        ? session.todos.filter(t=>t && t.xpCounted).length
        : 0;
      const workGrowth = (Number(session.duration || 0) / 60) * GROWTH_PER_WORK_MIN;
      const todoGrowth = rewardedTodos * GROWTH_PER_TODO;
      const totalGrowthToReverse = workGrowth + todoGrowth;

      const choice = await askSessionDeleteChoice();
      if(choice === 'cancel') return;
      if(choice === 'hide'){
        session.hidden = true;
        expandedSessions.delete(sid);
        saveData();
        renderSessionList();
        showToast('Oturum yalnızca geçmiş görünümünden gizlendi.', true);
        return;
      }

      const oldStreak = computeGoalStreak();
      const day = getDay(key);
      day.workSeconds = Math.max(0, Number(day.workSeconds || 0) - Number(session.duration || 0));
      day.sessions = Math.max(0, Number(day.sessions || 0) - 1);
      day.distraction = Math.max(0, Number(day.distraction || 0) - Number(session.distractions || 0));

      if(rewardedTodos > 0){
        data.totalTodosCompleted = Math.max(0, Number(data.totalTodosCompleted || 0) - rewardedTodos);
      }
      removeTreeGrowth(totalGrowthToReverse);

      data.sessionLog[key] = (data.sessionLog[key] || []).filter(x=>x.id!==sid);
      expandedSessions.delete(sid);

      // Hedef artık sağlanmıyorsa aynı gün yeniden ulaşılabilmesi için kutlama kilidini aç.
      if(!dayMeetsGoal(key)) day.goalCelebrated = false;

      // Bugünkü silme, bugün kazanılmış 7 günlük freeze ödülünü geçersiz kıldıysa geri al.
      const newStreak = computeGoalStreak();
      if(key === todayKey() && oldStreak > newStreak && oldStreak > 0 && oldStreak % 7 === 0){
        const rewardKey = todayKey() + ':' + oldStreak;
        const idx = Array.isArray(data.streakRewardKeys) ? data.streakRewardKeys.indexOf(rewardKey) : -1;
        if(idx >= 0){
          data.streakRewardKeys.splice(idx,1);
          if(Number(data.streakFreezes || 0) > 0) data.streakFreezes -= 1;
        }
      }

      saveData();
      renderToday(false);
      renderSessionList();
      updateWorkDisplay();
      renderStats();
      renderCalendar();
      renderCollection();
      showToast('Oturum ve ona bağlı ilerleme kayıtları silindi.', true);
    } else if(action === 'toggle-todo'){
      const session = findSession(sid);
      const t = session && session.todos.find(x=>x.id===target.dataset.todo);
      if(t){
        const beforeBadges = getUnlockedBadgeMap();
        const beforeLevel = getLevelInfo().level;
        const wasDone = t.done;
        t.done = !t.done;
        let completedList = [];
        if(!wasDone && t.done && !t.xpCounted){
          t.xpCounted = true;
          data.totalTodosCompleted = (data.totalTodosCompleted||0) + 1;
          completedList = addTreeGrowth(GROWTH_PER_TODO);
        }
        saveData();
        renderSessionList();
        updateIntentDisplay();
        if(!wasDone && t.done){
          playTodoCheckSound();
          renderToday(completedList.length > 0);
          celebrateTreeCompletions(completedList);
          reportProgress(beforeLevel, beforeBadges);
          if(session.todos.length && session.todos.every(x=>x.done)){
            showToast('Bu oturumun tüm görevleri tamamlandı! 🎉');
          }
        }
      }
    } else if(action === 'delete-todo'){
      const session = findSession(sid);
      if(session){ session.todos = session.todos.filter(x=>x.id!==target.dataset.todo); saveData(); renderSessionList(); updateIntentDisplay(); }
    } else if(action === 'add-todo'){
      const session = findSession(sid);
      const body = target.closest('.session-body');
      const input = body && body.querySelector('.todo-input');
      if(session && input && input.value.trim()){
        session.todos.push({ id:'t'+Date.now()+Math.random().toString(36).slice(2,6), text: input.value.trim().slice(0,80), done:false });
        saveData();
        renderSessionList();
        updateIntentDisplay();
      }
    }
  });

  el.sessionList.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter' && e.target.classList.contains('todo-input')){
      const card = e.target.closest('.session-card');
      if(!card) return;
      const sid = card.dataset.id;
      const session = findSession(sid);
      if(session && e.target.value.trim()){
        session.todos.push({ id:'t'+Date.now()+Math.random().toString(36).slice(2,6), text: e.target.value.trim().slice(0,80), done:false });
        saveData();
        renderSessionList();
        updateIntentDisplay();
      }
    }
  });


  // ---------- Merkezi modal yöneticisi ----------
  const modalController = (() => {
    const stack = [];
    const cancelHandlers = new WeakMap();
    const previousFocus = new WeakMap();

    function focusables(backdrop){
      if(!backdrop) return [];
      return [...backdrop.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      )].filter(node => node.offsetParent !== null && getComputedStyle(node).visibility !== 'hidden');
    }

    function syncBody(){
      document.body.classList.toggle('app-modal-open', stack.length > 0);
    }

    function open(backdrop, options={}){
      if(!backdrop) return;
      const existing = stack.indexOf(backdrop);
      if(existing >= 0) stack.splice(existing,1);

      previousFocus.set(backdrop, document.activeElement);
      cancelHandlers.set(backdrop, typeof options.onCancel === 'function' ? options.onCancel : null);

      backdrop.setAttribute('aria-hidden','false');
      const box=backdrop.querySelector('.modal-box');
      if(box){
        box.setAttribute('role','dialog');
        box.setAttribute('aria-modal','true');
      }

      backdrop.classList.add('show');
      stack.push(backdrop);
      syncBody();

      setTimeout(()=>{
        const target = options.focus || focusables(backdrop)[0] || box;
        if(target){
          if(target===box && !box.hasAttribute('tabindex')) box.setAttribute('tabindex','-1');
          target.focus?.();
          if(options.select && typeof target.select === 'function') target.select();
        }
      }, 30);
    }

    function close(backdrop, options={}){
      if(!backdrop) return;
      backdrop.classList.remove('show');
      backdrop.setAttribute('aria-hidden','true');
      cancelHandlers.delete(backdrop);

      const index=stack.lastIndexOf(backdrop);
      if(index>=0) stack.splice(index,1);
      syncBody();

      if(options.restoreFocus !== false){
        const prior=previousFocus.get(backdrop);
        if(prior && prior.isConnected) setTimeout(()=>prior.focus?.(),0);
      }
      previousFocus.delete(backdrop);
    }

    function top(){ return stack[stack.length-1] || null; }

    function cancelTop(){
      const backdrop=top();
      if(!backdrop) return false;
      const cancel=cancelHandlers.get(backdrop);
      if(typeof cancel==='function'){
        cancel();
        return true;
      }
      return false;
    }

    document.addEventListener('keydown', e=>{
      const backdrop=top();
      if(!backdrop) return;

      if(e.key==='Escape'){
        if(cancelTop()){
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }

      if(e.key==='Tab'){
        const items=focusables(backdrop);
        if(!items.length) return;
        const first=items[0], last=items[items.length-1];
        if(e.shiftKey && document.activeElement===first){
          e.preventDefault(); last.focus();
        }else if(!e.shiftKey && document.activeElement===last){
          e.preventDefault(); first.focus();
        }
      }
    }, true);

    document.addEventListener('click', e=>{
      const backdrop=top();
      if(backdrop && e.target===backdrop){
        const cancel=cancelHandlers.get(backdrop);
        if(typeof cancel==='function') cancel();
      }
    });

    return {open, close, top, cancelTop};
  })();

  // ---------- Özel modallar (onay / metin girişi) ----------
  function askConfirm(message, okLabel='Evet', danger=true){
    return new Promise(resolve=>{
      el.confirmText.textContent = message;
      el.confirmOk.textContent = okLabel;
      el.confirmOk.classList.toggle('danger', danger);
      el.confirmOk.classList.toggle('primary', !danger);
      el.confirmAlt.style.display = 'none';
      function cleanup(result){
        modalController.close(el.confirmBackdrop);
        el.confirmOk.removeEventListener('click', onOk);
        el.confirmCancel.removeEventListener('click', onCancel);
        resolve(result);
      }
      function onOk(){ cleanup(true); }
      function onCancel(){ cleanup(false); }
      el.confirmOk.addEventListener('click', onOk);
      el.confirmCancel.addEventListener('click', onCancel);
      modalController.open(el.confirmBackdrop,{onCancel,focus:el.confirmCancel});
    });
  }

  function askSessionDeleteChoice(){
    return new Promise(resolve=>{
      el.confirmText.textContent = 'Bu oturum için ne yapmak istiyorsun? “Sadece Gizle” istatistiklere, XP’ye ve ağaç ilerlemesine dokunmaz.';
      el.confirmOk.textContent = 'Tamamen Sil';
      el.confirmOk.classList.add('danger');
      el.confirmOk.classList.remove('primary');
      el.confirmAlt.textContent = 'Sadece Gizle';
      el.confirmAlt.style.display = '';
      function cleanup(result){
        modalController.close(el.confirmBackdrop);
        el.confirmAlt.style.display = 'none';
        el.confirmOk.removeEventListener('click', onDelete);
        el.confirmAlt.removeEventListener('click', onHide);
        el.confirmCancel.removeEventListener('click', onCancel);
        resolve(result);
      }
      function onDelete(){ cleanup('delete'); }
      function onHide(){ cleanup('hide'); }
      function onCancel(){ cleanup('cancel'); }

      el.confirmOk.addEventListener('click', onDelete);
      el.confirmAlt.addEventListener('click', onHide);
      el.confirmCancel.addEventListener('click', onCancel);
      modalController.open(el.confirmBackdrop,{onCancel,focus:el.confirmCancel});
    });
  }

  function askRecurringEditChoice(kind='öğe'){
    return new Promise(resolve=>{
      el.confirmText.textContent = 'Bu '+kind+' tekrarlanan bir serinin parçası. Değişiklik hangi kayıtlara uygulansın?';
      el.confirmOk.textContent = 'Tüm Seri';
      el.confirmOk.classList.remove('danger');
      el.confirmOk.classList.add('primary');
      el.confirmAlt.textContent = 'Bu + Sonrakiler';
      el.confirmAlt.style.display = '';

      function cleanup(result){
        modalController.close(el.confirmBackdrop);
        el.confirmAlt.style.display = 'none';
        el.confirmOk.removeEventListener('click', onAll);
        el.confirmAlt.removeEventListener('click', onFuture);
        el.confirmCancel.removeEventListener('click', onSingle);
        resolve(result);
      }
      function onAll(){ cleanup('all'); }
      function onFuture(){ cleanup('future'); }
      function onSingle(){ cleanup('single'); }

      el.confirmOk.addEventListener('click', onAll);
      el.confirmAlt.addEventListener('click', onFuture);
      el.confirmCancel.addEventListener('click', onSingle);
      el.confirmCancel.textContent = 'Yalnızca Bu';
      modalController.open(el.confirmBackdrop,{onCancel:onSingle,focus:el.confirmCancel});
    }).finally(()=>{
      el.confirmCancel.textContent = 'Vazgeç';
    });
  }

  function recurringSeriesItems(items,item,dateField,scope){
    if(!item) return [];
    if(scope==='single') return [item];
    const sourceId=item.repeatSourceId || item.id;
    if(scope==='all'){
      return (items||[]).filter(candidate=>(candidate.repeatSourceId||candidate.id)===sourceId);
    }
    return recurringItemsFrom(items,item,dateField);
  }

  function askRecurringDeleteChoice(kind='öğe'){
    return new Promise(resolve=>{
      el.confirmText.textContent = 'Bu '+kind+' tekrarlanan bir serinin parçası. Yalnızca bunu mu, yoksa bunu ve sonraki tekrarları mı silmek istiyorsun?';
      el.confirmOk.textContent = 'Bu + Sonrakiler';
      el.confirmOk.classList.add('danger');
      el.confirmOk.classList.remove('primary');
      el.confirmAlt.textContent = 'Yalnızca Bu';
      el.confirmAlt.style.display = '';

      function cleanup(result){
        modalController.close(el.confirmBackdrop);
        el.confirmAlt.style.display = 'none';
        el.confirmOk.removeEventListener('click', onFuture);
        el.confirmAlt.removeEventListener('click', onSingle);
        el.confirmCancel.removeEventListener('click', onCancel);
        resolve(result);
      }
      function onFuture(){ cleanup('future'); }
      function onSingle(){ cleanup('single'); }
      function onCancel(){ cleanup('cancel'); }

      el.confirmOk.addEventListener('click', onFuture);
      el.confirmAlt.addEventListener('click', onSingle);
      el.confirmCancel.addEventListener('click', onCancel);
      modalController.open(el.confirmBackdrop,{onCancel,focus:el.confirmCancel});
    });
  }

  function askPrompt(label, defaultValue){
    return new Promise(resolve=>{
      el.promptLabel.textContent = label;
      el.promptInput.value = defaultValue || '';
      function cleanup(result){
        modalController.close(el.promptBackdrop);
        el.promptOk.removeEventListener('click', onOk);
        el.promptCancel.removeEventListener('click', onCancel);
        el.promptInput.removeEventListener('keydown', onKey);
        resolve(result);
      }
      function onOk(){ cleanup(el.promptInput.value); }
      function onCancel(){ cleanup(null); }
      function onKey(e){ if(e.key==='Enter') onOk(); if(e.key==='Escape') onCancel(); }
      el.promptOk.addEventListener('click', onOk);
      el.promptCancel.addEventListener('click', onCancel);
      el.promptInput.addEventListener('keydown', onKey);
      modalController.open(el.promptBackdrop,{onCancel,focus:el.promptInput,select:true});
    });
  }

  function askSubject(defaultValue){
    return new Promise(resolve=>{
      el.subjectEditLabel.textContent = 'Ne çalışıyorsun?';
      el.subjectEditInput.value = defaultValue || '';
      const subjects = data.subjects || [];
      el.subjectEditChips.innerHTML = subjects.slice(0,8).map(subject =>
        '<button type="button" class="subject-chip" data-subject="'+escapeHtml(subject)+'">'+escapeHtml(subject)+'</button>'
      ).join('');

      function cleanup(result){
        modalController.close(el.subjectEditBackdrop);
        el.subjectEditSave.removeEventListener('click', onSave);
        el.subjectEditCancel.removeEventListener('click', onCancel);
        el.subjectEditInput.removeEventListener('keydown', onKey);
        el.subjectEditChips.removeEventListener('click', onChip);
        resolve(result);
      }
      function onSave(){ cleanup(el.subjectEditInput.value); }
      function onCancel(){ cleanup(null); }
      function onKey(e){
        if(e.key==='Enter'){ e.preventDefault(); onSave(); }
        if(e.key==='Escape'){ e.preventDefault(); onCancel(); }
      }
      function onChip(e){
        const chip = e.target.closest('.subject-chip');
        if(!chip) return;
        el.subjectEditInput.value = chip.dataset.subject || '';
        el.subjectEditInput.focus();
      }

      el.subjectEditSave.addEventListener('click', onSave);
      el.subjectEditCancel.addEventListener('click', onCancel);
      el.subjectEditInput.addEventListener('keydown', onKey);
      el.subjectEditChips.addEventListener('click', onChip);
      modalController.open(el.subjectEditBackdrop,{onCancel,focus:el.subjectEditInput,select:true});
    });
  }

  // Süre seçimi: oklar, hazır öneriler veya klavyeden doğrudan dakika girişi.
  // Günlük hedefte üst sınır yoktur; oturum ve mola sürelerinde mevcut güvenli üst sınır korunur.
  const GOAL_MIN = 1, GOAL_MAX = 240, GOAL_STEP = 5;
  function renderSubjectManager(){
    const subjects=data.subjects || [];
    if(!el.subjectManageList) return;
    el.subjectManageList.innerHTML = subjects.length
      ? subjects.map((subject,index)=>
          '<div class="subject-manage-row">'
          + '<input type="text" maxlength="30" data-subject-index="'+index+'" value="'+escapeHtml(subject)+'" aria-label="Konu adı">'
          + '<button type="button" data-action="save-subject" data-index="'+index+'">Kaydet</button>'
          + '<button type="button" data-action="delete-subject" data-index="'+index+'">Sil</button>'
          + '</div>'
        ).join('')
      : '<div class="subject-manage-empty">Henüz kayıtlı konu önerisi yok.</div>';
  }

  function openSubjectManager(){
    renderSubjectManager();
    modalController.open(el.subjectManageBackdrop,{onCancel:closeSubjectManager,focus:el.subjectManageClose});
  }
  function closeSubjectManager(){
    modalController.close(el.subjectManageBackdrop);
    renderSubjectChips();
  }

  el.subjectManageBtn.addEventListener('click',openSubjectManager);
  el.subjectManageClose.addEventListener('click',closeSubjectManager);
  el.subjectManageList.addEventListener('click',e=>{
    const btn=e.target.closest('[data-action]'); if(!btn) return;
    const index=Number(btn.dataset.index);
    if(!Number.isInteger(index) || !data.subjects[index]) return;
    if(btn.dataset.action==='delete-subject'){
      const removed=data.subjects[index];
      data.subjects.splice(index,1);
      saveData();
      renderSubjectManager();
      offerUndo('Konu önerilerden silindi.',()=>{
        data.subjects.splice(Math.min(index,data.subjects.length),0,removed);
        saveData(); renderSubjectManager(); renderSubjectChips();
      });
    }else if(btn.dataset.action==='save-subject'){
      const input=el.subjectManageList.querySelector('input[data-subject-index="'+index+'"]');
      const value=(input?.value||'').trim().slice(0,30);
      if(!value){ showToast('Konu adı boş olamaz.',true); return; }
      if(data.subjects.some((x,i)=>i!==index && x.toLowerCase()===value.toLowerCase())){
        showToast('Bu konu zaten önerilerde var.',true); return;
      }
      const oldValue=data.subjects[index];
      data.subjects[index]=value;
      saveData();
      renderSubjectManager();
      renderSubjectChips();
      offerUndo('Konu adı değiştirildi.',()=>{
        const currentIndex=data.subjects.findIndex(x=>x===value);
        if(currentIndex>=0) data.subjects[currentIndex]=oldValue;
        saveData(); renderSubjectManager(); renderSubjectChips();
      });
    }
  });

  function renderSubjectChips(){
    const subjects = data.subjects || [];
    el.subjectChips.innerHTML = subjects.slice(0,6).map(s=>
      '<button type="button" class="subject-chip" data-subject="'+escapeHtml(s)+'">'+escapeHtml(s)+'</button>'
    ).join('');
  }

  function rememberSubject(subject){
    if(!subject) return;
    if(!data.subjects) data.subjects = [];
    data.subjects = data.subjects.filter(s=> s.toLowerCase() !== subject.toLowerCase());
    data.subjects.unshift(subject);
    data.subjects = data.subjects.slice(0, 12);
  }

  function askMinutes(promptText, defaultMinutes, allowNone, showSubject, mode='session', initialSubject=''){
    return new Promise(resolve=>{
      const isBreak = mode === 'break';
      const isDailyGoal = mode === 'dailyGoal';
      const maxMinutes = isDailyGoal ? Infinity : GOAL_MAX;
      const presetValues = isBreak ? [5,10,15] : (isDailyGoal ? [30,60,90,120] : [15,25,45,60,90]);
      let minutes = Math.max(GOAL_MIN, Number(defaultMinutes) || (isBreak ? 5 : 25));

      document.getElementById('goalPromptText').textContent = promptText;
      el.goalNone.style.display = allowNone ? '' : 'none';
      el.subjectSection.style.display = showSubject ? 'block' : 'none';
      if(showSubject){
        el.subjectInput.value = initialSubject || '';
        renderSubjectChips();
      }

      const presetWrap = el.goalBackdrop.querySelector('.goal-presets');
      presetWrap.innerHTML = presetValues.map(v=>'<button class="goal-chip" data-min="'+v+'">'+v+'</button>').join('');
      const chips = presetWrap.querySelectorAll('.goal-chip');

      function normalize(value){
        const n = Math.floor(Number(value));
        if(!Number.isFinite(n) || n < GOAL_MIN) return GOAL_MIN;
        return Number.isFinite(maxMinutes) ? Math.min(maxMinutes, n) : n;
      }
      function render(){
        minutes = normalize(minutes);
        el.goalMinutesDisplay.value = minutes;
        el.goalMinutesDisplay.removeAttribute('max');
        if(Number.isFinite(maxMinutes)) el.goalMinutesDisplay.max = String(maxMinutes);
        chips.forEach(c=> c.classList.toggle('active', parseInt(c.dataset.min,10) === minutes));
      }
      function syncFromInput(){
        if(el.goalMinutesDisplay.value === '') return;
        minutes = normalize(el.goalMinutesDisplay.value);
        chips.forEach(c=> c.classList.toggle('active', parseInt(c.dataset.min,10) === minutes));
      }
      function onUp(){ syncFromInput(); minutes = normalize(minutes + GOAL_STEP); render(); playNote(660,0,0.05,'sine',0.08); }
      function onDown(){ syncFromInput(); minutes = normalize(minutes - GOAL_STEP); render(); playNote(500,0,0.05,'sine',0.08); }
      function onChip(e){ minutes = normalize(e.currentTarget.dataset.min); render(); }
      function onInput(){ syncFromInput(); }
      function onInputBlur(){ minutes = normalize(el.goalMinutesDisplay.value); render(); }
      function onInputKey(e){
        if(e.key === 'Enter'){ e.preventDefault(); onStart(); }
        if(e.key === 'Escape'){ e.preventDefault(); onCancel(); }
      }
      function onSubjectChip(e){ el.subjectInput.value = e.currentTarget.dataset.subject; }
      function onStart(){
        minutes = normalize(el.goalMinutesDisplay.value || minutes);
        cleanup({ minutes, subject: showSubject ? el.subjectInput.value.trim() : undefined });
      }
      function onNone(){ cleanup({ minutes: null, subject: showSubject ? el.subjectInput.value.trim() : undefined }); }
      function onCancel(){ cleanup(undefined); }

      function cleanup(result){
        modalController.close(el.goalBackdrop);
        el.goalUp.removeEventListener('click', onUp);
        el.goalDown.removeEventListener('click', onDown);
        el.goalMinutesDisplay.removeEventListener('input', onInput);
        el.goalMinutesDisplay.removeEventListener('blur', onInputBlur);
        el.goalMinutesDisplay.removeEventListener('keydown', onInputKey);
        chips.forEach(c=> c.removeEventListener('click', onChip));
        el.subjectChips.removeEventListener('click', onSubjectChipDelegate);
        el.goalStart.removeEventListener('click', onStart);
        el.goalNone.removeEventListener('click', onNone);
        el.goalCancel.removeEventListener('click', onCancel);
        resolve(result);
      }
      function onSubjectChipDelegate(e){ const c = e.target.closest('.subject-chip'); if(c) onSubjectChip({currentTarget:c}); }

      render();
      el.goalUp.addEventListener('click', onUp);
      el.goalDown.addEventListener('click', onDown);
      el.goalMinutesDisplay.addEventListener('input', onInput);
      el.goalMinutesDisplay.addEventListener('blur', onInputBlur);
      el.goalMinutesDisplay.addEventListener('keydown', onInputKey);
      chips.forEach(c=> c.addEventListener('click', onChip));
      el.subjectChips.addEventListener('click', onSubjectChipDelegate);
      el.goalStart.addEventListener('click', onStart);
      el.goalNone.addEventListener('click', onNone);
      el.goalCancel.addEventListener('click', onCancel);
      modalController.open(el.goalBackdrop,{
        onCancel,
        focus:showSubject ? el.subjectInput : el.goalMinutesDisplay,
        select:!showSubject
      });
    });
  }

  // ---------- Dışa / içe aktarma (yedekleme) ----------
  el.exportBtn.addEventListener('click', ()=>{
    syncTimerState();
    const backup = {
      app: 'Test',
      formatVersion: 1,
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      data
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'test-yedek-' + todayKey() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=> URL.revokeObjectURL(url), 2000);
    showToast('Yedek dosyası oluşturuldu.', true);
  });

  el.importBtn.addEventListener('click', ()=> el.importFile.click());

  el.importFile.addEventListener('change', async (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    try{
      if(file.size > 10 * 1024 * 1024){
        showToast('Yedek dosyası beklenenden çok büyük.', true);
        e.target.value = '';
        return;
      }

      const text = await file.text();
      const parsed = JSON.parse(text);
      const payload = parsed && parsed.formatVersion === 1 && parsed.data ? parsed.data : parsed;

      if(!looksValid(payload)){
        showToast('Bu dosya geçerli bir Test yedeği değil.', true);
        e.target.value = '';
        return;
      }

      const ok = await askConfirm(
        'Yedek geri yüklendiğinde mevcut verilerin yerini dosyadaki veriler alacak. İşlem öncesinde mevcut durumun yerel güvenlik kopyası tutulacak.',
        'Yedeği Geri Yükle',
        false
      );
      if(!ok){ e.target.value = ''; return; }

      AppStorageRepository.savePreImport(data);

      const merged = freshData();
      Object.assign(merged, payload);
      data = migrateData(merged);

      // Başka cihazdan veya eski zamandan gelen aktif sayaç çevrimdışı süreyi çalışma saymaz.
      if(data.activeSessionId && findSession(data.activeSessionId)){
        data.isWorking = false;
        data.workStart = null;
      }else{
        data.activeSessionId = null;
        data.activeSessionDate = null;
        data.isWorking = false;
        data.workStart = null;
      }
      if(data.breakState) data.breakState = null;

      refillDeckIfNeeded();
      syncTimerState();
      saveData();
      expandedSessions.clear();
      showHiddenSessions = false;

      const importedActive = data.activeSessionId ? findSession(data.activeSessionId) : null;
      el.workTimer.textContent = importedActive ? formatRingTime(Number(importedActive.duration || 0)) : '00:00';

      renderWorkButtonRow();
      renderToday(false);
      renderSessionList();
      updateIntentDisplay();
      renderStats();
      renderCollection();
      renderCalendar();
      showToast('Yedek başarıyla geri yüklendi. Aktif sayaç güvenlik için duraklatıldı.', true);
    }catch(err){
      showToast('Dosya okunamadı veya yedek bozuk.', true);
    }
    e.target.value = '';
  });

  // ---------- Sıfırlama ----------
  el.resetBtn.addEventListener('click', async ()=>{
    const ok = await askConfirm('Tüm ilerlemen (ağaçlar, koleksiyon, rozetler, oturumlar, istatistikler) kalıcı olarak silinecek. Bu işlem geri alınamaz. Emin misin?');
    if(!ok) return;

    await AppStorageRepository.resetAll();

    data = freshData();
    refillDeckIfNeeded();
    saveData();
    expandedSessions.clear();

    el.workTimer.textContent = '00:00';
    renderWorkButtonRow();

    renderToday(false);
    renderSessionList();
    updateIntentDisplay();
    renderStats();
    renderCollection();
    showToast('Veriler sıfırlandı.', true);
  });

  // ---------- Rozet modalı ----------
  function renderBadgeModal(){
    let unlockedTotal = 0;
    let html = '';
    BADGE_CATEGORIES.forEach(cat=>{
      const value = cat.getValue();
      let catUnlocked = 0;
      let chips = '';
      cat.thresholds.forEach(t=>{
        const unlocked = value !== null && value !== undefined && value >= t;
        if(unlocked){ catUnlocked++; unlockedTotal++; }
        chips += '<div class="badge-chip'+(unlocked?' unlocked':'')+'">'
          + '<span class="chip-icon">'+cat.icon+'</span>'
          + '<span class="chip-label">'+cat.label(t)+'</span>'
          + '</div>';
      });
      html += '<div class="badge-category"><h4>'+cat.title+' <span class="cat-count">'+catUnlocked+'/'+cat.thresholds.length+'</span></h4>'
        + '<div class="badge-grid-full">'+chips+'</div></div>';
    });
    el.badgeModalCount.textContent = unlockedTotal + ' / ' + TOTAL_BADGE_COUNT + ' açıldı';
    el.badgeModalBody.innerHTML = html;
  }

  function closeBadgeModal(){
    modalController.close(el.badgeBackdrop);
  }
  el.badgesSummaryBtn.addEventListener('click', ()=>{
    renderBadgeModal();
    modalController.open(el.badgeBackdrop,{onCancel:closeBadgeModal,focus:el.badgeClose});
  });
  el.badgeClose.addEventListener('click', closeBadgeModal);

  // ================= İSTATİSTİKLER =================
  let currentPeriod = 'day';
  let currentMetric = 'work';
  let currentChartType = 'bar';
  let statsWeekOffset = 0;

  el.periodBtns.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      el.periodBtns.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentPeriod = btn.dataset.period;
      if(currentPeriod!=='week') statsWeekOffset=0;
      renderStats();
    });
  });

  el.metricPills.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      el.metricPills.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentMetric = btn.dataset.metric;
      renderStats();
    });
  });

  el.typePills.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      el.typePills.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentChartType = btn.dataset.type;
      renderChartDispatch();
    });
  });

  function renderChartDispatch(){
    if(currentMetric === 'subject'){
      renderSubjectChart();
    } else {
      el.chartLegend.innerHTML = '';
      renderChart();
    }
  }

  function sumEntries(keys){
    const total = emptyDay();
    keys.forEach(k=>{
      const d = data.days[k];
      if(d){ total.resist += d.resist; total.distraction += d.distraction; total.workSeconds += d.workSeconds; total.sessions += d.sessions; }
    });
    return total;
  }

  function keysInRange(start, end){
    const keys = [];
    let cur = new Date(start);
    while(cur <= end){ keys.push(dateKey(cur)); cur = addDays(cur, 1); }
    return keys;
  }

  function getPeriodKeys(period){
    const now = new Date();
    if(period === 'day') return [todayKey()];
    if(period === 'week'){
      const start=addDays(startOfWeek(now),statsWeekOffset*7);
      const end=addDays(start,6);
      return keysInRange(start,end);
    }
    if(period === 'month') return keysInRange(new Date(now.getFullYear(), now.getMonth(), 1), now);
    if(period === 'year') return keysInRange(new Date(now.getFullYear(), 0, 1), now);
    return [];
  }
  function getPeriodTotals(period){ return sumEntries(getPeriodKeys(period)); }

  function getSubjectBreakdown(keys){
    const totals = {};
    keys.forEach(k=>{
      const list = data.sessionLog[k] || [];
      list.forEach(s=>{
        let dur = s.duration;
        if(s.id === data.activeSessionId && data.isWorking && data.workStart && k === todayKey()){
          dur += Math.floor((Date.now()-data.workStart)/1000);
        }
        if(dur <= 0) return;
        const subj = s.subject || 'Genel';
        totals[subj] = (totals[subj]||0) + dur;
      });
    });
    return Object.entries(totals).sort((a,b)=> b[1]-a[1]);
  }

  function renderSubjectBreakdown(){
    const keys = getPeriodKeys(currentPeriod);
    const keySet = new Set(keys);
    const rows = new Map();

    Object.entries(data.sessionLog || {}).forEach(([key, sessions])=>{
      if(!keySet.has(key) || !Array.isArray(sessions)) return;
      sessions.forEach(session=>{
        const subj = (session.subject && session.subject !== 'Genel') ? session.subject : 'Genel';
        const cur = rows.get(subj) || {seconds:0, sessions:0, distractions:0, targetSessions:0, reachedTargets:0};
        let secs = Number(session.duration || 0);
        if(session.id === data.activeSessionId && data.isWorking && data.workStart){
          secs += Math.floor((Date.now()-data.workStart)/1000);
        }
        cur.seconds += Math.max(0, secs);
        cur.sessions += 1;
        cur.distractions += Number(session.distractions || 0);
        if(session.targetSeconds){
          cur.targetSessions += 1;
          if(secs >= Number(session.targetSeconds)) cur.reachedTargets += 1;
        }
        rows.set(subj, cur);
      });
    });

    const breakdown = [...rows.entries()].sort((a,b)=>b[1].seconds-a[1].seconds);
    if(breakdown.length === 0){
      el.subjectBreakdownBody.innerHTML = '<div class="todo-empty">Bu dönemde henüz çalışma kaydı yok.</div>';
      return;
    }

    const max = Math.max(1, breakdown[0][1].seconds);
    el.subjectBreakdownBody.innerHTML = breakdown.map(([subj, stats])=>{
      const pct = Math.max(4, Math.round(stats.seconds/max*100));
      const avg = stats.sessions ? Math.round(stats.seconds/stats.sessions) : 0;
      const avgDistract = stats.sessions ? (stats.distractions/stats.sessions).toFixed(1) : '0.0';
      const targetRate = stats.targetSessions
        ? Math.round(stats.reachedTargets/stats.targetSessions*100)+'% hedef'
        : 'hedef verisi yok';
      return '<div class="subject-row">'
        + '<div class="subject-row-top"><span>'+escapeHtml(subj)+'</span><span>'+formatDurationLabel(stats.seconds)+'</span></div>'
        + '<div class="subject-bar-bg"><div class="subject-bar-fill" style="width:'+pct+'%"></div></div>'
        + '<div class="subject-row-meta">'
        + '<span>'+stats.sessions+' oturum</span>'
        + '<span>ort. '+formatDurationLabel(avg)+'</span>'
        + '<span>😕 '+avgDistract+'/oturum</span>'
        + '<span>🎯 '+targetRate+'</span>'
        + '</div>'
        + '</div>';
    }).join('');
  }

  const WEEKDAY_SHORT = ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];
  const MONTH_SHORT = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  const MONTH_FULL = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

  function metricValue(entry){
    if(currentMetric === 'work') return Math.round(entry.workSeconds/60);
    if(currentMetric === 'distraction') return entry.distraction;
    return 0;
  }

  function getPeriodSlots(period){
    const now = new Date();
    const slots = [];
    if(period === 'day'){
      for(let i=6;i>=0;i--){
        const d = addDays(now, -i);
        slots.push({ label: WEEKDAY_SHORT[d.getDay()], keys: [dateKey(d)] });
      }
      el.chartTitle.textContent = 'Son 7 gün';
    } else if(period === 'week'){
      for(let i=7;i>=0;i--){
        const wStart = addDays(startOfWeek(now), -7*i);
        const wEnd = addDays(wStart, 6);
        slots.push({ label: displayDate(wStart), keys: keysInRange(wStart, wEnd) });
      }
      el.chartTitle.textContent = 'Son 8 hafta';
    } else if(period === 'month'){
      for(let i=11;i>=0;i--){
        const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
        const prefix = d.getFullYear()+'-'+pad(d.getMonth()+1);
        const keys = Object.keys(data.days).filter(k=>k.startsWith(prefix));
        slots.push({ label: MONTH_SHORT[d.getMonth()], keys });
      }
      el.chartTitle.textContent = 'Son 12 ay';
    } else if(period === 'year'){
      for(let i=4;i>=0;i--){
        const y = now.getFullYear()-i;
        const keys = Object.keys(data.days).filter(k=>k.startsWith(String(y)));
        slots.push({ label: String(y), keys });
      }
      el.chartTitle.textContent = 'Son 5 yıl';
    }
    return slots;
  }

  function buildChartData(period){
    const slots = getPeriodSlots(period);
    return {
      labels: slots.map(s=>s.label),
      values: slots.map(s=> metricValue(sumEntries(s.keys)))
    };
  }

  // ---------- Derslere göre grafik verisi ----------
  const SUBJECT_PALETTE = ['#74d99f','#ffb703','#ff9f5a','#ef5354','#8ec5ff','#c792ea','#f2a4bd','#6fcf97'];
  function subjectColor(subject){
    if(subject === 'Diğer') return '#7d8f88';
    let hash = 0;
    for(let i=0;i<subject.length;i++) hash = (hash*31 + subject.charCodeAt(i)) | 0;
    return SUBJECT_PALETTE[Math.abs(hash) % SUBJECT_PALETTE.length];
  }

  function buildSubjectChartData(period){
    const slots = getPeriodSlots(period);
    const perSlot = slots.map(slot=>{
      const totals = {};
      slot.keys.forEach(k=>{
        const list = data.sessionLog[k] || [];
        list.forEach(s=>{
          let dur = s.duration;
          if(s.id === data.activeSessionId && data.isWorking && data.workStart && k === todayKey()){
            dur += Math.floor((Date.now()-data.workStart)/1000);
          }
          if(dur <= 0) return;
          const subj = s.subject || 'Genel';
          totals[subj] = (totals[subj]||0) + Math.round(dur/60);
        });
      });
      return totals;
    });

    const grandTotals = {};
    perSlot.forEach(t=> Object.entries(t).forEach(([k,v])=> grandTotals[k] = (grandTotals[k]||0) + v));
    let subjects = Object.entries(grandTotals).sort((a,b)=> b[1]-a[1]).map(x=>x[0]);

    // en fazla 6 ders + gerisini "Diğer" altında topla, grafik karışmasın
    if(subjects.length > 6){
      const others = subjects.slice(6);
      subjects = subjects.slice(0,6);
      perSlot.forEach(t=>{
        let sum = 0;
        others.forEach(o=>{ if(t[o]){ sum += t[o]; delete t[o]; } });
        if(sum > 0) t['Diğer'] = (t['Diğer']||0) + sum;
      });
      subjects.push('Diğer');
    }

    return { labels: slots.map(s=>s.label), subjects, perSlot };
  }

  function renderSubjectChart(){
    const {labels, subjects, perSlot} = buildSubjectChartData(currentPeriod);
    const chartW = 680;
    const barAreaBottom = 148, barAreaTop = 16;
    const labelY = 168;
    const gap = 10;
    const n = labels.length;

    if(subjects.length === 0){
      el.chartSvg.innerHTML = '<text x="340" y="88" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="IBM Plex Sans, sans-serif">Bu dönemde ders kaydı yok</text>';
      el.chartLegend.innerHTML = '';
      return;
    }

    const totalsPerSlot = perSlot.map(t=> subjects.reduce((s,subj)=> s+(t[subj]||0), 0));
    const max = Math.max(...totalsPerSlot, 1);
    let svg = '';

    if(currentChartType === 'line'){
      const stepX = n > 1 ? (chartW - gap*2) / (n-1) : 0;
      subjects.forEach(subj=>{
        const color = subjectColor(subj);
        const points = perSlot.map((t,i)=>{
          const v = t[subj]||0;
          const x = gap + i*stepX;
          const y = barAreaBottom - (v/max) * (barAreaBottom - barAreaTop);
          return {x, y, v};
        });
        const linePath = points.map((p,i)=> (i===0?'M':'L') + p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ');
        svg += '<path class="chart-line" d="'+linePath+'" fill="none" stroke="'+color+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"></path>';
        points.forEach(p=>{
          if(p.v > 0) svg += '<circle class="line-point" cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="2.8" fill="'+color+'"><title>'+subj+': '+p.v+' dk</title></circle>';
        });
      });
      for(let i=0;i<n;i++){
        const x = gap + i*stepX;
        svg += '<text x="'+x.toFixed(1)+'" y="'+labelY+'" text-anchor="middle" font-size="9" fill="var(--paper-dim)" font-family="IBM Plex Mono, monospace">'+labels[i]+'</text>';
      }
    } else {
      const barW = (chartW - gap*(n+1)) / n;
      perSlot.forEach((t,i)=>{
        const x = gap + i*(barW+gap);
        let yCursor = barAreaBottom;
        subjects.forEach(subj=>{
          const v = t[subj]||0;
          if(v <= 0) return;
          const h = (v/max) * (barAreaBottom - barAreaTop);
          yCursor -= h;
          svg += '<rect class="chart-bar" x="'+x+'" y="'+yCursor.toFixed(1)+'" width="'+barW+'" height="'+h.toFixed(1)+'" fill="'+subjectColor(subj)+'"><title>'+subj+': '+v+' dk</title></rect>';
        });
        svg += '<text x="'+(x+barW/2)+'" y="'+labelY+'" text-anchor="middle" font-size="9" fill="var(--paper-dim)" font-family="IBM Plex Mono, monospace">'+labels[i]+'</text>';
      });
    }

    el.chartSvg.innerHTML = svg;
    el.chartLegend.innerHTML = subjects.map(s=>
      '<div class="chart-legend-item"><span class="chart-legend-dot" style="background:'+subjectColor(s)+'"></span>'+escapeHtml(s)+'</div>'
    ).join('');
  }

  function renderChart(){
    const {labels, values} = buildChartData(currentPeriod);
    const goalMinutesForChart = (currentPeriod==='day' && currentMetric==='work') ? Number(data.dailyGoalMinutes||60) : 0;
    const max = Math.max(...values, goalMinutesForChart, 1);
    const n = values.length;
    const chartW = 680;
    const barAreaBottom = 148, barAreaTop = 16;
    const labelY = 168;
    const gap = 10;

    if(currentChartType === 'line'){
      const stepX = n > 1 ? (chartW - gap*2) / (n-1) : 0;
      const points = values.map((v,i)=>{
        const x = gap + i*stepX;
        const y = barAreaBottom - (v/max) * (barAreaBottom - barAreaTop);
        return {x, y, v};
      });
      const linePath = points.map((p,i)=> (i===0?'M':'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
      const areaPath = linePath + ' L' + points[points.length-1].x.toFixed(1) + ',' + barAreaBottom + ' L' + points[0].x.toFixed(1) + ',' + barAreaBottom + ' Z';

      let svg = '<defs><linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">'
        + '<stop offset="0%" stop-color="var(--moss-bright)" stop-opacity="0.35"/>'
        + '<stop offset="100%" stop-color="var(--moss-bright)" stop-opacity="0"/>'
        + '</linearGradient><pattern id="goalStripe" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="var(--gold)" stroke-width="2"/></pattern></defs>';
      svg += '<path d="'+areaPath+'" fill="url(#lineAreaGrad)" stroke="none"></path>';
      svg += '<path class="chart-line" d="'+linePath+'" fill="none" stroke="var(--moss-bright)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>';
      points.forEach((p,i)=>{
        const isLast = i === points.length-1;
        svg += '<circle class="line-point" cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="3.5" fill="'+(isLast?'var(--gold)':'var(--moss-bright)')+'"><title>'+labels[i]+': '+p.v+'</title></circle>';
        svg += '<text x="'+p.x.toFixed(1)+'" y="'+labelY+'" text-anchor="middle" font-size="9" fill="var(--paper-dim)" font-family="IBM Plex Mono, monospace">'+labels[i]+'</text>';
        if(p.v > 0) svg += '<text x="'+p.x.toFixed(1)+'" y="'+(p.y-8)+'" text-anchor="middle" font-size="8.5" fill="var(--paper-dim)" font-family="IBM Plex Mono, monospace">'+p.v+'</text>';
      });
      if(goalMinutesForChart>0){
        const gy=barAreaBottom-(goalMinutesForChart/max)*(barAreaBottom-barAreaTop);
        svg+='<line x1="0" y1="'+gy+'" x2="'+chartW+'" y2="'+gy+'" stroke="url(#goalStripe)" stroke-width="4"><title>Günlük hedef: '+goalMinutesForChart+' dk</title></line>';
      }
      el.chartSvg.innerHTML = svg;
      return;
    }

    const barW = (chartW - gap*(n+1)) / n;
    let bars = '<defs><pattern id="goalStripeBar" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="var(--gold)" stroke-width="2"/></pattern></defs>';
    values.forEach((v,i)=>{
      const h = (v/max) * (barAreaBottom - barAreaTop);
      const x = gap + i*(barW+gap);
      const y = barAreaBottom - h;
      const isLast = i === n-1;
      const color = isLast ? 'var(--gold)' : 'var(--moss-bright)';
      bars += '<rect class="chart-bar" x="'+x+'" y="'+y+'" width="'+barW+'" height="'+Math.max(h,1.5)+'" rx="3" fill="'+color+'"><title>'+labels[i]+': '+v+'</title></rect>';
      bars += '<text x="'+(x+barW/2)+'" y="'+labelY+'" text-anchor="middle" font-size="9" fill="var(--paper-dim)" font-family="IBM Plex Mono, monospace">'+labels[i]+'</text>';
      if(v > 0) bars += '<text x="'+(x+barW/2)+'" y="'+(y-4)+'" text-anchor="middle" font-size="8.5" fill="var(--paper-dim)" font-family="IBM Plex Mono, monospace">'+v+'</text>';
    });
    if(goalMinutesForChart>0){
      const gy=barAreaBottom-(goalMinutesForChart/max)*(barAreaBottom-barAreaTop);
      bars+='<line x1="0" y1="'+gy+'" x2="'+chartW+'" y2="'+gy+'" stroke="url(#goalStripeBar)" stroke-width="4"><title>Günlük hedef: '+goalMinutesForChart+' dk</title></line>';
    }
    el.chartSvg.innerHTML = bars;
  }

  // ================= YILLIK ISI HARİTASI =================
  // O günün çalışma süresinin, güncel günlük hedefe oranı (1.0 = hedefe ulaşıldı ya da geçildi)
  function goalRatioFor(day){
    if(!day) return 0;
    const goalMinutes = Number(day.goalMinutes) > 0 ? Number(day.goalMinutes) : (data.dailyGoalMinutes || 60);
    const goalSeconds = goalMinutes * 60;
    if(goalSeconds <= 0) return 0;
    return day.workSeconds / goalSeconds;
  }

  function renderHeatmap(){
    const lookback = 365;
    if(el.heatmapTitle) el.heatmapTitle.textContent = 'Yıllık Aktivite (Günlük Hedefe Göre)';

    const today = new Date();
    const startAligned = startOfWeek(addDays(today, -(lookback-1)));
    const totalDays = Math.round((today - startAligned)/86400000) + 1;
    const weeks = Math.ceil(totalDays/7);
    const cellSize = 9, gap = 2;

    let rects = '';
    let lastMonth = -1;
    for(let w=0; w<weeks; w++){
      for(let d=0; d<7; d++){
        const date = addDays(startAligned, w*7+d);
        if(date > today) continue;
        const k = dateKey(date);
        const ratio = goalRatioFor(data.days[k]);
        let level = 0;
        if(ratio > 0){
          level = ratio >= 1 ? 4 : ratio >= 0.5 ? 3 : ratio >= 0.25 ? 2 : 1;
        }
        const x = w*(cellSize+gap);
        const y = d*(cellSize+gap) + 14;
        const pctLabel = Math.round(ratio*100) + '% hedef';
        rects += '<rect class="heat-cell level-'+level+'" x="'+x+'" y="'+y+'" width="'+cellSize+'" height="'+cellSize+'" rx="2.2"><title>'+displayDate(k)+': '+pctLabel+'</title></rect>';

        if(d === 0 && date.getMonth() !== lastMonth){
          lastMonth = date.getMonth();
          rects += '<text x="'+x+'" y="9" font-size="7.8" fill="var(--paper-dim)" font-family="IBM Plex Mono, monospace">'+MONTH_SHORT[lastMonth]+'</text>';
        }
      }
    }

    const svgW = weeks*(cellSize+gap);
    const svgH = 7*(cellSize+gap) + 14;
    el.heatmapSvg.setAttribute('viewBox', '0 0 ' + svgW + ' ' + svgH);
    el.heatmapSvg.innerHTML = rects;
  }

  function formatMinutes(seconds){
    const mins = Math.round(seconds/60);
    if(mins < 60) return mins + ' dk';
    const h = Math.floor(mins/60), m = mins%60;
    return h + 's ' + m + 'dk';
  }

  function sessionAnalyticsForKeys(keys){
    const sessions=sessionsForKeys(keys);
    const hourly=Array.from({length:24},()=>({seconds:0,sessions:0}));
    let totalSeconds=0;
    let longest=null;
    let timedSessions=0;
    const activeDays=new Set();

    sessions.forEach(({key,session})=>{
      const seconds=sessionSecondsForAnalytics(session);
      totalSeconds += seconds;
      if(seconds>0) activeDays.add(key);
      if(!longest || seconds>longest.seconds){
        longest={seconds,subject:(session.subject && session.subject!=='Genel')?session.subject:'Genel'};
      }
      if(session.startedAt){
        const started=new Date(session.startedAt);
        if(!Number.isNaN(started.getTime())){
          const hour=started.getHours();
          hourly[hour].seconds += seconds;
          hourly[hour].sessions += 1;
          timedSessions++;
        }
      }
    });

    let bestHour=-1,bestSeconds=0;
    hourly.forEach((bucket,hour)=>{
      if(bucket.seconds>bestSeconds){
        bestSeconds=bucket.seconds;
        bestHour=hour;
      }
    });

    return {
      sessionCount:sessions.length,
      totalSeconds,
      avgSeconds:sessions.length?Math.round(totalSeconds/sessions.length):0,
      longest,
      activeDays:activeDays.size,
      hourly,
      bestHour,
      bestSeconds,
      timedSessions
    };
  }

  function renderSessionAnalytics(){
    if(!el.sessionAnalyticsBody) return;
    const keys=getPeriodKeys(currentPeriod);
    const stats=sessionAnalyticsForKeys(keys);

    if(!stats.sessionCount){
      el.sessionAnalyticsBody.innerHTML='<div class="todo-empty">Bu dönemde henüz oturum kaydı yok.</div>';
      return;
    }

    const bestLabel=stats.bestHour>=0 ? pad(stats.bestHour)+':00–'+pad((stats.bestHour+1)%24)+':00' : '—';
    const longestLabel=stats.longest ? formatDurationLabel(stats.longest.seconds) : '—';
    const shownHours=[0,2,4,6,8,10,12,14,16,18,20,22];
    const pairTotals=shownHours.map(hour=>stats.hourly[hour].seconds + stats.hourly[hour+1].seconds);
    const maxHour=Math.max(...pairTotals,1);

    const bars=shownHours.map((hour,index)=>{
      const bucketSeconds=pairTotals[index];
      const height=Math.max(bucketSeconds>0?5:2,Math.round(bucketSeconds/maxHour*92));
      const isBest=stats.bestHour===hour || stats.bestHour===hour+1;
      const title=pad(hour)+':00–'+pad((hour+2)%24)+':00 · '+formatDurationLabel(bucketSeconds);
      return '<div class="hour-col'+(isBest?' best':'')+'" title="'+title+'">'
        + '<div class="hour-bar-wrap"><div class="hour-bar" style="height:'+height+'%"></div></div>'
        + '<span class="hour-label">'+pad(hour)+'</span>'
        + '</div>';
    }).join('');

    el.sessionAnalyticsBody.innerHTML=
      '<div class="session-analytics-grid">'
      + '<div class="session-analytics-stat"><div class="k">Ortalama Oturum</div><div class="v">'+formatDurationLabel(stats.avgSeconds)+'</div></div>'
      + '<div class="session-analytics-stat"><div class="k">En Uzun Oturum</div><div class="v">'+longestLabel+'</div></div>'
      + '<div class="session-analytics-stat"><div class="k">En Verimli Başlangıç</div><div class="v">'+bestLabel+'</div></div>'
      + '<div class="session-analytics-stat"><div class="k">Aktif Gün</div><div class="v">'+stats.activeDays+'</div></div>'
      + '<div class="session-analytics-stat"><div class="k">Zaman Damgalı Oturum</div><div class="v">'+stats.timedSessions+' / '+stats.sessionCount+'</div></div>'
      + '<div class="session-analytics-stat"><div class="k">Toplam Oturum</div><div class="v">'+stats.sessionCount+'</div></div>'
      + '</div>'
      + '<div class="hour-analytics">'+bars+'</div>'
      + '<div class="hour-analytics-note">Saat grafiği oturumların <b>başlangıç saatine</b> göre gruplandırılır. Eski kayıtlarda başlangıç saati yoksa bu grafiğe dahil edilmez.</div>';
  }

  function renderStatsWeekNav(){
    if(!el.statsWeekNav) return;
    const show=currentPeriod==='week';
    el.statsWeekNav.classList.toggle('show',show);
    if(!show) return;
    const start=addDays(startOfWeek(new Date()),statsWeekOffset*7), end=addDays(start,6);
    el.statsWeekLabel.textContent=displayDate(start)+' – '+displayDate(end);
    el.statsWeekNext.disabled=statsWeekOffset>=0;
    el.statsWeekNext.style.opacity=statsWeekOffset>=0?'.35':'1';
  }
  el.statsWeekPrev?.addEventListener('click',()=>{statsWeekOffset--;renderStats();});
  el.statsWeekNext?.addEventListener('click',()=>{if(statsWeekOffset<0){statsWeekOffset++;renderStats();}});

  function renderStats(){
    renderStatsWeekNav();
    const totals = getPeriodTotals(currentPeriod);
    el.periodWork.textContent = formatMinutes(totals.workSeconds);
    el.periodSessions.textContent = totals.sessions;
    el.periodAvgSession.textContent = totals.sessions > 0
      ? 'ort. ' + formatDurationLabel(Math.round(totals.workSeconds / totals.sessions))
      : 'henüz oturum yok';
    el.periodDistract.textContent = totals.distraction;
    renderChartDispatch();
    renderSessionAnalytics();
    renderSubjectBreakdown();
    renderHeatmap();
  }

  // ================= ÖZET (haftalık rapor) =================
  function trendArrowHtml(cur, prev){
    if(prev === 0 && cur === 0) return '<span class="trend-flat">—</span>';
    if(prev === 0) return '<span class="trend-up">▲ yeni</span>';
    const diff = Math.round((cur-prev)/prev*100);
    if(diff > 4) return '<span class="trend-up">▲ %'+diff+'</span>';
    if(diff < -4) return '<span class="trend-down">▼ %'+Math.abs(diff)+'</span>';
    return '<span class="trend-flat">— aynı</span>';
  }

  // Dikkat dağınıklığında azalış olumlu, artış olumsuzdur.
  function distractionTrendHtml(cur, prev){
    if(prev === 0 && cur === 0) return '<span class="trend-flat">—</span>';
    if(prev === 0 && cur > 0) return '<span class="trend-down">▲ yeni</span>';
    if(prev > 0 && cur === 0) return '<span class="trend-up">▼ %100</span>';
    const diff = Math.round((cur-prev)/prev*100);
    if(diff > 4) return '<span class="trend-down">▲ %'+diff+'</span>';
    if(diff < -4) return '<span class="trend-up">▼ %'+Math.abs(diff)+'</span>';
    return '<span class="trend-flat">— aynı</span>';
  }

  function buildShareText(thisTotals, treesThisWeek, badgesThisWeek){
    let lines = [
      '🌳 Test — Haftalık Özet',
      '⏱ Çalışma süresi: ' + formatMinutes(thisTotals.workSeconds),
      '🌳 Bu hafta tamamlanan ağaç: ' + treesThisWeek,
      '🏅 Bu hafta kazanılan rozet: ' + badgesThisWeek
    ];
    lines.push('', '#DirençAğacı');
    return lines.join('\n');
  }

  async function shareCurrentSummary(){
    const now = new Date();
    const thisWeekKeys = keysInRange(startOfWeek(now), now);
    const thisTotals = sumEntries(thisWeekKeys);
    const treesThisWeek = data.collection.filter(c=> thisWeekKeys.includes(dateKey(new Date(c.completedAt)))).length;
    const badgesThisWeek = (data.badgeUnlockLog||[]).filter(b=> thisWeekKeys.includes(dateKey(new Date(b.at)))).length;
    const text = buildShareText(thisTotals, treesThisWeek, badgesThisWeek);
    try{
      if(navigator.clipboard && navigator.clipboard.writeText){
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position='fixed'; ta.style.opacity='0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      showToast('Özet panoya kopyalandı! 📋', true);
    }catch(e){
      showToast('Kopyalama başarısız oldu.', true);
    }
  }

  function sessionSecondsForAnalytics(session){
    let secs = Number(session?.duration || 0);
    if(session && session.id === data.activeSessionId && data.isWorking && data.workStart){
      secs += Math.floor((Date.now()-data.workStart)/1000);
    }
    return Math.max(0, secs);
  }

  function sessionsForKeys(keys){
    const set = new Set(keys);
    const result = [];
    Object.entries(data.sessionLog || {}).forEach(([key,list])=>{
      if(!set.has(key) || !Array.isArray(list)) return;
      list.forEach(session=> result.push({key, session}));
    });
    return result;
  }

  function planningStatsForKeys(keys){
    const sessions = sessionsForKeys(keys).map(x=>x.session).filter(s=>Number(s.targetSeconds)>0);
    if(!sessions.length){
      return {count:0, reached:0, completionRate:null, planned:0, actual:0, delta:0, avgDelta:0, avgOvertime:0, overtimeCount:0};
    }
    let reached=0, planned=0, actual=0, overtimeTotal=0, overtimeCount=0;
    sessions.forEach(session=>{
      const target=Number(session.targetSeconds)||0;
      const secs=sessionSecondsForAnalytics(session);
      planned+=target;
      actual+=secs;
      if(secs>=target) reached++;
      if(secs>target){ overtimeTotal += secs-target; overtimeCount++; }
    });
    const delta=actual-planned;
    return {
      count:sessions.length,
      reached,
      completionRate:Math.round(reached/sessions.length*100),
      planned,
      actual,
      delta,
      avgDelta:Math.round(delta/sessions.length),
      avgOvertime:overtimeCount?Math.round(overtimeTotal/overtimeCount):0,
      overtimeCount
    };
  }

  function productiveHourStats(keys){
    const keySet=new Set(keys);
    const buckets=Array.from({length:24},()=>0);
    sessionsForKeys(keys).forEach(({key,session})=>{
      const intervals=sessionIntervals(session);
      if(!intervals.length && session.startedAt){
        const d=new Date(session.startedAt);
        if(!Number.isNaN(d.getTime())) buckets[d.getHours()]+=sessionSecondsForAnalytics(session);
        return;
      }
      intervals.forEach(interval=>{
        let cursor=interval.start;
        while(cursor<interval.end){
          const d=new Date(cursor);
          const k=dateKey(d);
          const nextHour=new Date(d); nextHour.setMinutes(60,0,0);
          const end=Math.min(interval.end,nextHour.getTime());
          if(keySet.has(k)) buckets[d.getHours()]+=Math.max(0,(end-cursor)/1000);
          cursor=end;
        }
      });
    });
    let bestHour=-1,bestSeconds=0;
    buckets.forEach((secs,h)=>{ if(secs>bestSeconds){bestSeconds=secs;bestHour=h;} });
    return bestHour>=0?{hour:bestHour,seconds:Math.round(bestSeconds),buckets:buckets.map(Math.round)}:null;
  }

  function sessionFocusScore(session){
    const duration=Math.max(1,sessionSecondsForAnalytics(session));
    const distractions=Math.max(0,Number(session?.distractions||0));
    const intervals=sessionIntervals(session);
    const interruptions=Math.max(0,intervals.length-1);
    const todos=Array.isArray(session?.todos)?session.todos:[];
    const done=todos.filter(t=>t?.done).length;
    let score=100;
    score-=Math.min(42,distractions*12);
    score-=Math.min(20,interruptions*5);
    if(Number(session?.targetSeconds)>0){
      const ratio=duration/Number(session.targetSeconds);
      if(ratio>=1) score+=8;
      else if(ratio<.6) score-=10;
      else if(ratio<.85) score-=5;
    }
    if(todos.length) score+=Math.round((done/todos.length)*10);
    if(duration<10*60) score-=5;
    return Math.max(0,Math.min(100,Math.round(score)));
  }

  function focusScoreStats(keys){
    const rows=sessionsForKeys(keys).map(({session})=>({session,score:sessionFocusScore(session),seconds:sessionSecondsForAnalytics(session)})).filter(x=>x.seconds>0);
    if(!rows.length) return {average:null,best:null,worst:null,count:0};
    const weight=rows.reduce((a,x)=>a+x.seconds,0)||1;
    const average=Math.round(rows.reduce((a,x)=>a+x.score*x.seconds,0)/weight);
    const sorted=[...rows].sort((a,b)=>b.score-a.score);
    return {average,best:sorted[0],worst:sorted[sorted.length-1],count:rows.length};
  }

  function normPlanText(value){
    return String(value||'').toLocaleLowerCase('tr-TR').replace(/[^a-z0-9çğıöşü]+/gi,' ').trim();
  }

  function timedEventDurationSeconds(ev){
    if(!ev?.time||!ev?.endTime) return 0;
    const [sh,sm]=ev.time.split(':').map(Number),[eh,em]=ev.endTime.split(':').map(Number);
    const mins=(eh*60+em)-(sh*60+sm);
    return mins>0?mins*60:0;
  }

  function scheduledStudyStats(keys){
    const keySet=new Set(keys);
    let planned=0,actual=0,matchedEvents=0;
    const rows=[];
    (data.events||[]).filter(ev=>keySet.has(ev.date)&&timedEventDurationSeconds(ev)>0).forEach(ev=>{
      const label=normPlanText(ev.title);
      if(!label) return;
      const matching=sessionsForKeys([ev.date]).map(x=>x.session).filter(s=>{
        const subj=normPlanText(s.subject&&s.subject!=='Genel'?s.subject:s.name);
        return subj && (subj===label || subj.includes(label) || label.includes(subj));
      });
      if(!matching.length) return;
      const p=timedEventDurationSeconds(ev);
      const a=matching.reduce((sum,s)=>sum+sessionSecondsForAnalytics(s),0);
      planned+=p; actual+=a; matchedEvents++;
      rows.push({event:ev,planned:p,actual:a});
    });
    const adherence=planned?Math.round(Math.min(actual,planned)/planned*100):null;
    return {planned,actual,delta:actual-planned,adherence,matchedEvents,rows};
  }

  function weeklyReviewStats(keys){
    const sessions = sessionsForKeys(keys);
    const dayRows = keys.map(key=>({key, seconds:Number(data.days[key]?.workSeconds||0)})).sort((a,b)=>b.seconds-a.seconds);
    const bestDay = dayRows.find(d=>d.seconds>0) || null;

    const subjectTotals = new Map();
    let longestSession = null;
    let totalSessionSeconds = 0;
    sessions.forEach(({session})=>{
      const secs=sessionSecondsForAnalytics(session);
      totalSessionSeconds += secs;
      const subj=(session.subject && session.subject!=='Genel')?session.subject:'Genel';
      subjectTotals.set(subj,(subjectTotals.get(subj)||0)+secs);
      if(!longestSession || secs>longestSession.seconds) longestSession={seconds:secs, subject:subj};
    });
    const topSubject=[...subjectTotals.entries()].sort((a,b)=>b[1]-a[1])[0] || null;
    const goalsMet=keys.filter(k=>dayMeetsGoal(k)).length;
    const tasksCompleted=(data.tasks||[]).filter(t=>{
      if(!t.doneAt) return false;
      const d=new Date(t.doneAt);
      return !Number.isNaN(d.getTime()) && keys.includes(dateKey(d));
    }).length;

    return {
      bestDay,
      topSubject,
      longestSession,
      productiveHour: productiveHourStats(keys),
      focus: focusScoreStats(keys),
      scheduledStudy: scheduledStudyStats(keys),
      goalsMet,
      tasksCompleted,
      sessionCount:sessions.length,
      avgSession:sessions.length?Math.round(totalSessionSeconds/sessions.length):0
    };
  }

  function printWeeklySummary(){
    const area = document.getElementById('summaryPrintArea');
    if(!area){
      showToast('Özet henüz oluşturulmadı.', true);
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if(!printWindow){
      showToast('PDF penceresi engellendi. Tarayıcıda açılır pencerelere izin ver.', true);
      return;
    }

    const styles = `
      <style>
        *{box-sizing:border-box}
        html,body{
          margin:0;
          padding:0;
          width:100%;
          background:#fff;
          color:#111;
          font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif;
          -webkit-font-smoothing:antialiased;
          text-rendering:optimizeLegibility;
        }
        body{
          padding:28px;
          line-height:1.45;
          font-size:13px;
        }
        #pdfSummaryRoot{
          width:100%;
          max-width:760px;
          margin:0 auto;
          overflow:hidden;
        }
        #pdfSummaryRoot,#pdfSummaryRoot *{
          max-width:100%;
          min-width:0;
          box-sizing:border-box;
        }
        h1{
          font-size:22px;
          margin:0 0 18px;
          font-weight:700;
          letter-spacing:-.01em;
        }
        .summary-card,.insight-card,.collection-stat,.weekly-review-card,.planning-analysis{
          border:1px solid #d9d9d9;
          border-radius:12px;
          padding:14px;
          margin:0 0 12px;
          background:#fff;
          color:#111;
          break-inside:avoid;
          page-break-inside:avoid;
          overflow:hidden;
        }
        .summary-title-row{
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:12px;
          flex-wrap:wrap;
        }
        .summary-title{
          font-size:15px;
          font-weight:700;
          line-height:1.3;
          margin-bottom:8px;
          overflow-wrap:anywhere;
        }
        .summary-row,.planning-row{
          display:grid;
          grid-template-columns:minmax(0,1fr) auto;
          gap:12px;
          padding:6px 0;
          border-bottom:1px solid #ececec;
          align-items:start;
        }
        .summary-row:last-child,.planning-row:last-child{border-bottom:0}
        .summary-label,.planning-row span{
          color:#333;
          min-width:0;
          overflow-wrap:anywhere;
        }
        .summary-value,.planning-row b{
          font-weight:700;
          text-align:right;
          min-width:0;
          overflow-wrap:anywhere;
          white-space:normal;
        }
        .collection-stats,.weekly-review-grid{
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:10px;
          margin-bottom:12px;
          width:100%;
        }
        .collection-stat{text-align:center}
        .cs-num,.wr-value{
          font-size:17px;
          font-weight:700;
          line-height:1.25;
          overflow-wrap:anywhere;
          word-break:break-word;
        }
        .cs-lbl,.wr-label{
          font-size:10px;
          color:#555;
          text-transform:uppercase;
          letter-spacing:.04em;
          line-height:1.3;
          overflow-wrap:anywhere;
        }
        .wr-sub,.insight-line{
          font-size:12px;
          color:#333;
          margin-top:4px;
          line-height:1.45;
          overflow-wrap:anywhere;
        }
        .planning-analysis-title{
          font-size:14px;
          font-weight:700;
          margin-bottom:6px;
        }
        .trend-up{color:#16803c;font-weight:700}
        .trend-down{color:#b42318;font-weight:700}
        .trend-flat{color:#666;font-weight:700}
        .share-btn,.summary-print-btn{display:none!important}

        @media(max-width:640px){
          .collection-stats,.weekly-review-grid{grid-template-columns:1fr}
          .summary-row,.planning-row{grid-template-columns:1fr}
          .summary-value,.planning-row b{text-align:left}
        }

        @media print{
          @page{size:A4;margin:12mm}
          html,body{width:100%;background:#fff}
          body{padding:0;font-size:11.5pt}
          #pdfSummaryRoot{max-width:none;width:100%}
          .collection-stats,.weekly-review-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
        }
      </style>`;

    printWindow.document.open();
    printWindow.document.write(
      '<!doctype html><html lang="tr"><head><meta charset="utf-8">'
      + '<meta name="viewport" content="width=device-width,initial-scale=1">'
      + '<title>Test - Haftalık Özet</title>'
      + styles
      + '</head><body><div id="pdfSummaryRoot">'
      + '<h1>Test — Haftalık Özet</h1>'
      + area.innerHTML
      + '</div></body></html>'
    );
    printWindow.document.close();

    const trigger = ()=>{
      try{
        printWindow.focus();
        printWindow.print();
      }catch(err){
        showToast('Yazdırma penceresi açılamadı.', true);
      }
    };

    if(printWindow.document.readyState === 'complete') setTimeout(trigger, 250);
    else printWindow.addEventListener('load', ()=>setTimeout(trigger,250), {once:true});
  }

  function renderSummary(){
    const now = new Date();
    const thisWeekStart = startOfWeek(now);
    const thisWeekKeys = keysInRange(thisWeekStart, now);
    const lastWeekStart = addDays(thisWeekStart, -7);
    const lastWeekEnd = addDays(thisWeekStart, -1);
    const lastWeekKeys = keysInRange(lastWeekStart, lastWeekEnd);

    const thisTotals = sumEntries(thisWeekKeys);
    const lastTotals = sumEntries(lastWeekKeys);
    const review = weeklyReviewStats(thisWeekKeys);
    const planning = planningStatsForKeys(thisWeekKeys);

    const treesThisWeek = data.collection.filter(c=> thisWeekKeys.includes(dateKey(new Date(c.completedAt)))).length;
    const badgesThisWeek = (data.badgeUnlockLog||[]).filter(b=> thisWeekKeys.includes(dateKey(new Date(b.at)))).length;

    let bestDay=null, bestDayVal=-1, worstDay=null, worstDayVal=-1;
    thisWeekKeys.forEach(k=>{
      const d = data.days[k];
      if(!d) return;
      if(d.workSeconds > bestDayVal){ bestDayVal = d.workSeconds; bestDay = k; }
      if(d.distraction > worstDayVal){ worstDayVal = d.distraction; worstDay = k; }
    });

    function dayLabel(key){
      if(!key) return null;
      const d = new Date(key);
      return WEEKDAY_SHORT[d.getDay()] + ' (' + d.getDate() + ' ' + MONTH_SHORT[d.getMonth()] + ')';
    }

    let html = '<div class="summary-card">'
      + '<div class="summary-title-row"><div class="summary-title">Bu Hafta vs Geçen Hafta</div><div class="summary-actions"><button class="share-btn" id="shareBtn">📤 Paylaş</button><button class="summary-print-btn" id="summaryPrintBtn">🖨 PDF / Yazdır</button></div></div>'
      + '<div class="summary-row"><span class="summary-label">Çalışma Süresi</span><span class="summary-value">'+formatMinutes(thisTotals.workSeconds)+' '+trendArrowHtml(thisTotals.workSeconds, lastTotals.workSeconds)+'</span></div>'
      + '<div class="summary-row"><span class="summary-label">Dikkat Dağınıklığı</span><span class="summary-value">'+thisTotals.distraction+' '+distractionTrendHtml(thisTotals.distraction, lastTotals.distraction)+'</span></div>'
      + '<div class="summary-row"><span class="summary-label">Oturum Sayısı</span><span class="summary-value">'+thisTotals.sessions+' '+trendArrowHtml(thisTotals.sessions, lastTotals.sessions)+'</span></div>'
      + '</div>';

    html += '<div class="collection-stats">'
      + '<div class="collection-stat"><div class="cs-num">'+treesThisWeek+'</div><div class="cs-lbl">Bu Hafta Ağaç</div></div>'
      + '<div class="collection-stat"><div class="cs-num">'+badgesThisWeek+'</div><div class="cs-lbl">Bu Hafta Rozet</div></div>'
      + '</div>';

    const bestDayLabel = review.bestDay ? (dayLabel(review.bestDay.key)+' · '+formatDurationLabel(review.bestDay.seconds)) : '—';
    const topSubjectLabel = review.topSubject ? (review.topSubject[0]+' · '+formatDurationLabel(review.topSubject[1])) : '—';
    const longestLabel = review.longestSession ? (formatDurationLabel(review.longestSession.seconds)+' · '+review.longestSession.subject) : '—';

    html += '<div class="insight-card">'
      + '<div class="summary-title">Haftalık Değerlendirme</div>'
      + '<div class="weekly-review-grid">'
      + '<div class="weekly-review-card"><div class="wr-label">En güçlü gün</div><div class="wr-value">'+escapeHtml(bestDayLabel)+'</div><div class="wr-sub">Haftanın en yüksek çalışma süresi</div></div>'
      + '<div class="weekly-review-card"><div class="wr-label">En çok çalışılan konu</div><div class="wr-value">'+escapeHtml(topSubjectLabel)+'</div><div class="wr-sub">Oturum konu kayıtlarına göre</div></div>'
      + '<div class="weekly-review-card"><div class="wr-label">En uzun oturum</div><div class="wr-value">'+escapeHtml(longestLabel)+'</div><div class="wr-sub">'+review.sessionCount+' oturum · ort. '+formatDurationLabel(review.avgSession)+'</div></div>'
      + '<div class="weekly-review-card"><div class="wr-label">En verimli saat</div><div class="wr-value">'+(review.productiveHour ? (pad(review.productiveHour.hour)+':00–'+pad((review.productiveHour.hour+1)%24)+':00') : '—')+'</div><div class="wr-sub">'+(review.productiveHour ? formatDurationLabel(review.productiveHour.seconds)+' çalışma' : 'Yeni oturumlarda saat verisi birikecek')+'</div></div>'
      + '<div class="weekly-review-card"><div class="wr-label">Odak kalite skoru</div><div class="wr-value">'+(review.focus.average!==null?review.focus.average+'/100':'—')+'</div><div class="wr-sub">'+(review.focus.count?review.focus.count+' oturumun ağırlıklı ortalaması':'Henüz oturum verisi yok')+'</div></div>'
      + '<div class="weekly-review-card"><div class="wr-label">Hedef günleri</div><div class="wr-value">'+review.goalsMet+' / '+thisWeekKeys.length+'</div><div class="wr-sub">'+review.tasksCompleted+' görev bu hafta tamamlandı</div></div>'
      + '</div>'
      + '<div class="planning-analysis">'
      + '<div class="planning-analysis-title">🎯 Planlanan / Gerçek Süre</div>'
      + (planning.count
        ? '<div class="planning-row"><span>Hedefli oturum</span><b>'+planning.count+'</b></div>'
          + '<div class="planning-row"><span>Hedefe ulaşan</span><b>'+planning.reached+' · %'+planning.completionRate+'</b></div>'
          + '<div class="planning-row"><span>Planlanan toplam</span><b>'+formatDurationLabel(planning.planned)+'</b></div>'
          + '<div class="planning-row"><span>Gerçek toplam</span><b>'+formatDurationLabel(planning.actual)+'</b></div>'
          + '<div class="planning-row"><span>Ortalama sapma</span><b>'+(planning.avgDelta>=0?'+':'−')+formatDurationLabel(Math.abs(planning.avgDelta))+'</b></div>'
          + '<div class="planning-row"><span>Ortalama overtime</span><b>'+(planning.overtimeCount?('+'+formatDurationLabel(planning.avgOvertime)):'—')+'</b></div>'
        : '<div class="todo-empty">Bu hafta hedef süre belirlenmiş oturum yok.</div>')
      + '</div>'
      + (review.scheduledStudy.matchedEvents
        ? '<div class="planning-analysis"><div class="planning-analysis-title">🗓 Takvim Planı / Gerçekleşen Çalışma</div>'
          + '<div class="planning-row"><span>Eşleşen plan</span><b>'+review.scheduledStudy.matchedEvents+'</b></div>'
          + '<div class="planning-row"><span>Takvimde planlanan</span><b>'+formatDurationLabel(review.scheduledStudy.planned)+'</b></div>'
          + '<div class="planning-row"><span>Gerçekte çalışılan</span><b>'+formatDurationLabel(review.scheduledStudy.actual)+'</b></div>'
          + '<div class="planning-row"><span>Plan uyumu</span><b>%'+review.scheduledStudy.adherence+'</b></div>'
          + '<div class="planning-row"><span>Süre farkı</span><b>'+(review.scheduledStudy.delta>=0?'+':'−')+formatDurationLabel(Math.abs(review.scheduledStudy.delta))+'</b></div></div>'
        : '')
      + '</div>';

    // Bu ay vs geçen ay
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthKeys = keysInRange(thisMonthStart, now);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth()-1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthKeys = keysInRange(lastMonthStart, lastMonthEnd);
    const thisMonthTotals = sumEntries(thisMonthKeys);
    const lastMonthTotals = sumEntries(lastMonthKeys);

    if(thisMonthTotals.workSeconds > 0 || lastMonthTotals.workSeconds > 0){
      html += '<div class="summary-card">'
        + '<div class="summary-title">Bu Ay vs Geçen Ay</div>'
        + '<div class="summary-row"><span class="summary-label">Çalışma Süresi</span><span class="summary-value">'+formatMinutes(thisMonthTotals.workSeconds)+' '+trendArrowHtml(thisMonthTotals.workSeconds, lastMonthTotals.workSeconds)+'</span></div>'
        + '<div class="summary-row"><span class="summary-label">Dikkat Dağınıklığı</span><span class="summary-value">'+thisMonthTotals.distraction+' '+distractionTrendHtml(thisMonthTotals.distraction, lastMonthTotals.distraction)+'</span></div>'
        + '</div>';
    }

    let insights = '';
    if(bestDay && bestDayVal > 0) insights += '<div class="insight-line">🏆 En verimli günün: <b>'+dayLabel(bestDay)+'</b> — '+formatDurationLabel(bestDayVal)+' çalıştın.</div>';
    if(worstDay && worstDayVal > 0) insights += '<div class="insight-line">😕 En çok dikkatin dağıldığı gün: <b>'+dayLabel(worstDay)+'</b> — '+worstDayVal+' kez.</div>';
    if(thisTotals.distraction > 0 || thisTotals.workSeconds > 0){
      insights += '<div class="insight-line">😕 Bu hafta toplam dikkat dağınıklığın: <b>'+thisTotals.distraction+' kez</b></div>';
    }
    if(review.productiveHour){
      insights += '<div class="insight-line">🕒 Gerçek timer aralıklarına göre en yoğun çalışma saatin <b>'+pad(review.productiveHour.hour)+':00–'+pad((review.productiveHour.hour+1)%24)+':00</b>.</div>';
    }
    if(review.focus.average!==null){
      const focusText=review.focus.average>=85?'çok güçlü':review.focus.average>=70?'iyi':review.focus.average>=55?'orta':'geliştirilebilir';
      insights += '<div class="insight-line">🎯 Haftalık odak kalite skorun <b>'+review.focus.average+'/100</b> — '+focusText+'.</div>';
    }
    const lastWeekFocus=focusScoreStats(lastWeekKeys);
    if(review.focus.average!==null && lastWeekFocus.average!==null){
      const fd=review.focus.average-lastWeekFocus.average;
      if(Math.abs(fd)>=3) insights += '<div class="insight-line">'+(fd>0?'📈':'📉')+' Odak kaliten geçen haftaya göre <b>'+(fd>0?'+':'')+fd+' puan</b> '+(fd>0?'arttı':'değişti')+'.</div>';
    }
    if(review.scheduledStudy.matchedEvents){
      insights += '<div class="insight-line">🗓 Takvimdeki eşleşen çalışma planlarının <b>%'+review.scheduledStudy.adherence+'</b> kadarını süre olarak gerçekleştirdin.</div>';
    }
    if(!insights) insights = '<div class="insight-line">Bu hafta henüz yeterli veri yok. Birkaç gün daha kullan, buraya içgörüler eklenecek.</div>';

    html += '<div class="insight-card"><div class="summary-title">İçgörüler</div>'+insights+'</div>';

    // Uzun vadeli gelişim anlatısı
    const activeDays = Object.keys(data.days).filter(k=> data.days[k].workSeconds > 0).sort();
    if(activeDays.length >= 10){
      const span = Math.min(14, Math.floor(activeDays.length/2));
      const firstSlice = activeDays.slice(0, span);
      const recentSlice = activeDays.slice(-span);
      const avgFirst = Math.round(firstSlice.reduce((s,k)=> s+data.days[k].workSeconds, 0) / firstSlice.length / 60);
      const avgRecent = Math.round(recentSlice.reduce((s,k)=> s+data.days[k].workSeconds, 0) / recentSlice.length / 60);
      let narrative;
      if(avgFirst > 0){
        const growth = Math.round((avgRecent-avgFirst)/avgFirst*100);
        if(growth > 5) narrative = '📈 Başladığından beri günlük ortalama çalışma süren <b>%'+growth+' arttı</b> — eskiden günde ~'+avgFirst+' dk, son zamanlarda ~'+avgRecent+' dk.';
        else if(growth < -5) narrative = '📉 İlk günlere göre biraz yavaşlamışsın (%'+Math.abs(growth)+' azalma) — eskiden ~'+avgFirst+' dk, şimdi ~'+avgRecent+' dk. Tekrar hız kazanabilirsin.';
        else narrative = '➡️ Günlük ortalama çalışma süren ilk günlerinden bu yana oldukça istikrarlı: ~'+avgRecent+' dk.';
      } else {
        narrative = '📈 Son dönemde günde ortalama ~'+avgRecent+' dk çalışıyorsun.';
      }
      html += '<div class="insight-card"><div class="summary-title">Uzun Vadeli Gelişim</div><div class="insight-line">'+narrative+'</div></div>';
    }

    el.summaryContent.innerHTML = '<div id="summaryPrintArea">'+html+'</div>';
    const shareBtn = document.getElementById('shareBtn');
    if(shareBtn) shareBtn.addEventListener('click', shareCurrentSummary);
    const summaryPrintBtn = document.getElementById('summaryPrintBtn');
    if(summaryPrintBtn) summaryPrintBtn.addEventListener('click', printWeeklySummary);
  }


  // ---------- Merkezi UI yenileme ----------
  function refreshUI(parts, options={}){
    const requested = new Set(Array.isArray(parts) ? parts : [parts]);

    if(requested.has('tasks')) renderTaskList();
    if(requested.has('calendar')) renderCalendar();
    if(requested.has('today')) renderToday(!!options.celebrateTree);

    if(requested.has('stats')){
      const statsPanel=el.panels?.stats;
      if(statsPanel?.classList.contains('active')) renderStats();
    }

    if(requested.has('summary') && el.summaryContent && !el.summaryContent.classList.contains('collapsed')){
      renderSummary();
    }

    if(requested.has('collection') && el.collectionContent && !el.collectionContent.classList.contains('collapsed')){
      renderCollection();
    }
  }

  // ================= GÖREVLER =================
  let currentTaskFilter = 'all';
  let currentTaskStatusFilter = 'all';
  let currentTaskDateFilter = 'all';

  function tagById(id){ return data.taskTags.find(t=>t.id===id) || null; }
  function normalizedTaskTagId(t){ return tagById(t.tagId) ? t.tagId : null; }
  function safeTagColor(color){ return /^#[0-9a-fA-F]{6}$/.test(color||'') ? color : '#8da39a'; }

  function renderTaskTagControls(){
    const previous = el.taskTagInput.value;
    if(data.taskTags.length){
      el.taskTagInput.innerHTML = data.taskTags.map(tag=>'<option value="'+tag.id+'">#'+escapeHtml(tag.name)+'</option>').join('') + '<option value="">Etiketsiz</option>';
      el.taskTagInput.value = data.taskTags.some(t=>t.id===previous) ? previous : data.taskTags[0].id;
    } else {
      el.taskTagInput.innerHTML = '<option value="">Etiketsiz</option>';
    }

    let filters = '<button class="task-filter task-folder-tab'+(currentTaskFilter==='all'?' active':'')+'" data-filter="all"><span class="folder-tab-dot all"></span>Tümü</button>';
    filters += data.taskTags.map(tag=>{
      const labels=(tag.labels||[]).map(label=>'<span class="task-folder-label">#'+escapeHtml(label)+'</span>').join('');
      return '<span class="task-folder-wrap"><button class="task-filter task-folder-tab task-filter-tag'+(currentTaskFilter===tag.id?' active':'')+'" data-filter="'+tag.id+'" style="--tag-color:'+safeTagColor(tag.color)+';--tag-glow:'+safeTagColor(tag.color)+'"><span class="folder-tab-dot"></span>'+escapeHtml(tag.name)+'</button>'+(labels?'<span class="task-folder-labels">'+labels+'</span>':'')+'</span>';
    }).join('');
    el.taskFilterRow.innerHTML = filters;

    if(currentTaskFilter!=='all' && !tagById(currentTaskFilter)) currentTaskFilter='all';
  }


  function renderTaskTagManager(){
    if(!data.taskTags.length){
      el.taskTagManageList.innerHTML = '<div class="task-empty" style="padding:10px 4px;">Henüz etiket yok. Yukarıdan yeni bir etiket ekleyebilirsin.</div>';
      return;
    }
    el.taskTagManageList.innerHTML = data.taskTags.map(tag=>
      '<div class="task-tag-manage-item" draggable="true" data-tag-id="'+tag.id+'">'
      + '<span class="task-tag-drag" title="Sürükle">☰</span>'
      + '<input class="task-tag-dot" type="color" value="'+safeTagColor(tag.color)+'" data-action="color-tag" data-tag-id="'+tag.id+'" aria-label="Etiket rengini değiştir">'
      + '<span class="task-tag-manage-name">#'+escapeHtml(tag.name)+'</span>'
      + '<button class="task-tag-delete" data-action="delete-tag" data-tag-id="'+tag.id+'" aria-label="Etiketi sil">✕</button>'
      + '</div>'
    ).join('');
  }

  function createTaskTag(){
    let name = el.taskTagNameInput.value.trim().replace(/^#+/,'').trim();
    if(!name) return;
    name = name.slice(0,24);
    if(data.taskTags.some(t=>t.name.toLocaleLowerCase('tr-TR')===name.toLocaleLowerCase('tr-TR'))){
      showToast('Bu isimde bir etiket zaten var.', true); return;
    }
    const tag = { id:'tag_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5), name, color:safeTagColor(el.taskTagColorInput.value) };
    data.taskTags.push(tag);
    saveData();
    el.taskTagNameInput.value='';
    renderTaskTagControls();
    el.taskTagInput.value=tag.id;
    renderTaskTagManager();
    refreshUI(['tasks','calendar']);
  }

  function deleteTaskTag(id){
    const tag=tagById(id); if(!tag) return;
    data.tasks.forEach(t=>{ if(t.tagId===id) t.tagId=null; });
    data.taskTags=data.taskTags.filter(t=>t.id!==id);
    if(currentTaskFilter===id) currentTaskFilter='all';
    saveData();
    renderTaskTagControls();
    renderTaskTagManager();
    refreshUI(['tasks','calendar']);
  }

  function addTask(text, dueDate, time, tagId, repeat='none', repeatSourceId=null, repeatDays=[], repeatAnchorDay=null, repeatUntil=null){
    const task = {
      id: 'tk'+Date.now()+Math.random().toString(36).slice(2,6),
      text: text.trim().slice(0,120),
      done: false,
      dueDate: dueDate || null,
      time: normalize24HourTime(time) || null,
      tagId: tagById(tagId) ? tagId : null,
      repeat: ['daily','weekly','monthly'].includes(repeat) && dueDate ? repeat : 'none',
      repeatSourceId: repeatSourceId || null,
      repeatDays: Array.isArray(repeatDays) ? [...new Set(repeatDays.map(Number).filter(d=>d>=0 && d<=6))].sort((a,b)=>a-b) : [],
      repeatAnchorDay: repeat==='monthly'
        ? (Number.isFinite(Number(repeatAnchorDay)) && Number(repeatAnchorDay)>=1 && Number(repeatAnchorDay)<=31
          ? Number(repeatAnchorDay)
          : Number(String(dueDate||'').slice(-2)) || null)
        : null,
      repeatUntil: repeatUntil || null,
      createdAt: new Date().toISOString(),
      doneAt: null,
      xpCounted: false,
      sortOrder: data.tasks.reduce((m,t)=>Math.max(m,Number(t.sortOrder)||0),-1)+1
    };
    DataRepository.tasks.add(task);
    saveData();
    return task;
  }

  function nextRepeatDate(dateStr, repeat, repeatDays=[], repeatAnchorDay=null){
    if(!dateStr || repeat==='none') return null;
    const d=new Date(dateStr+'T12:00:00');
    if(Number.isNaN(d.getTime())) return null;
    if(repeat==='daily'){
      d.setDate(d.getDate()+1);
    } else if(repeat==='weekly'){
      const days=[...new Set((repeatDays||[]).map(Number).filter(x=>x>=0&&x<=6))];
      if(days.length){
        for(let step=1; step<=7; step++){
          const cand=new Date(d);
          cand.setDate(d.getDate()+step);
          if(days.includes(cand.getDay())) return dateKey(cand);
        }
        return null;
      }
      d.setDate(d.getDate()+7);
    } else if(repeat==='monthly'){
      const anchorDay=Number.isFinite(Number(repeatAnchorDay)) && Number(repeatAnchorDay)>=1 && Number(repeatAnchorDay)<=31
        ? Number(repeatAnchorDay)
        : d.getDate();
      d.setDate(1);
      d.setMonth(d.getMonth()+1);
      const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
      d.setDate(Math.min(anchorDay,last));
    } else return null;
    return dateKey(d);
  }
  function repeatTaskLabel(r, days=[]){
    if(r==='daily') return 'Her gün';
    if(r==='monthly') return 'Her ay';
    if(r==='weekly'){
      const names={1:'Pzt',2:'Sal',3:'Çar',4:'Per',5:'Cum',6:'Cmt',0:'Paz'};
      const list=(days||[]).map(Number).filter(d=>names[d]!==undefined);
      return list.length ? list.map(d=>names[d]).join(' · ') : 'Her hafta';
    }
    return '';
  }
  function hasRecurringTaskOccurrence(tasks, sourceId, dueDate){
    return (tasks||[]).some(t=>(t.repeatSourceId||t.id)===sourceId && t.dueDate===dueDate);
  }

  function repeatAllowsDate(repeatUntil, nextDate){
    return !repeatUntil || !nextDate || nextDate<=repeatUntil;
  }

  function recurrenceExceptionBucket(kind){
    if(!data.recurrenceExceptions || typeof data.recurrenceExceptions!=='object'){
      data.recurrenceExceptions={tasks:{},events:{}};
    }
    if(!data.recurrenceExceptions[kind] || typeof data.recurrenceExceptions[kind]!=='object'){
      data.recurrenceExceptions[kind]={};
    }
    return data.recurrenceExceptions[kind];
  }

  function isRecurrenceException(kind, sourceId, dateKeyValue){
    if(!sourceId || !dateKeyValue) return false;
    const bucket=recurrenceExceptionBucket(kind);
    return Array.isArray(bucket[sourceId]) && bucket[sourceId].includes(dateKeyValue);
  }

  function addRecurrenceException(kind, sourceId, dateKeyValue){
    if(!sourceId || !dateKeyValue) return false;
    const bucket=recurrenceExceptionBucket(kind);
    const list=Array.isArray(bucket[sourceId]) ? bucket[sourceId] : [];
    if(list.includes(dateKeyValue)) return false;
    bucket[sourceId]=[...list,dateKeyValue].sort();
    return true;
  }

  function removeRecurrenceException(kind, sourceId, dateKeyValue){
    if(!sourceId || !dateKeyValue) return false;
    const bucket=recurrenceExceptionBucket(kind);
    if(!Array.isArray(bucket[sourceId])) return false;
    const next=bucket[sourceId].filter(x=>x!==dateKeyValue);
    if(next.length===bucket[sourceId].length) return false;
    if(next.length) bucket[sourceId]=next;
    else delete bucket[sourceId];
    return true;
  }

  function trimRecurrenceExceptionsFrom(kind, sourceId, startDate){
    if(!sourceId || !startDate) return [];
    const bucket=recurrenceExceptionBucket(kind);
    const current=Array.isArray(bucket[sourceId]) ? [...bucket[sourceId]] : [];
    const removed=current.filter(x=>x>=startDate);
    const kept=current.filter(x=>x<startDate);
    if(kept.length) bucket[sourceId]=kept;
    else delete bucket[sourceId];
    return removed;
  }

  function restoreRecurrenceExceptions(kind, sourceId, dates){
    if(!sourceId || !Array.isArray(dates) || !dates.length) return;
    const bucket=recurrenceExceptionBucket(kind);
    bucket[sourceId]=[...new Set([...(bucket[sourceId]||[]),...dates])].sort();
  }

  function recurringItemsFrom(items, item, dateField){
    if(!item) return [];
    const sourceId=item.repeatSourceId || item.id;
    const startDate=item[dateField];
    if(!sourceId || !startDate) return [];
    return (items||[]).filter(candidate=>
      (candidate.repeatSourceId||candidate.id)===sourceId
      && candidate[dateField]
      && candidate[dateField]>=startDate
    );
  }

  function spawnNextRecurringTask(task){
    if(!task || !['daily','weekly','monthly'].includes(task.repeat) || !task.dueDate) return;
    const anchorDay=task.repeat==='monthly'
      ? (Number(task.repeatAnchorDay) || Number(String(task.dueDate).slice(-2)))
      : null;
    const sourceId=task.repeatSourceId || task.id;
    let cursor=task.dueDate;
    let nextDate=null;
    let guard=0;

    while(guard++<1200){
      nextDate=nextRepeatDate(cursor,task.repeat,task.repeatDays,anchorDay);
      if(!nextDate || !repeatAllowsDate(task.repeatUntil || null,nextDate)) return;
      if(!isRecurrenceException('tasks',sourceId,nextDate)) break;
      cursor=nextDate;
    }
    if(!nextDate || guard>=1200) return;
    if(hasRecurringTaskOccurrence(data.tasks,sourceId,nextDate)) return;
    addTask(task.text,nextDate,task.time,normalizedTaskTagId(task),task.repeat,sourceId,task.repeatDays || [],anchorDay,task.repeatUntil || null);
  }

  function taskDueBadge(dueDate, time, done){
    if(!dueDate) return time ? '<span class="task-due-badge">🕐 '+escapeHtml(time)+'</span>' : '';
    const today = todayKey();
    let cls = '';
    if(!done){
      if(dueDate < today) cls = 'overdue';
      else if(dueDate === today) cls = 'today';
    }
    let label = displayTaskDate(dueDate);
    if(time) label += ' · ' + time;
    return '<span class="task-due-badge '+cls+'">📅 '+escapeHtml(label)+'</span>';
  }

  function renderTaskCard(t){
    const tag = tagById(normalizedTaskTagId(t));
    const tagHtml = tag ? '<span class="task-tag" style="--tag-color:'+safeTagColor(tag.color)+'">#'+escapeHtml(tag.name)+'</span>' : '';
    const borderStyle = tag ? ' style="border-left-color:'+safeTagColor(tag.color)+'"' : '';
    const dueHtml = taskDueBadge(t.dueDate, t.time, t.done);
    const repeatHtml = t.repeat && t.repeat!=='none' ? '<span class="task-repeat-badge">↻ '+repeatTaskLabel(t.repeat,t.repeatDays)+'</span>' : '';
    return '<div class="task-card'+(t.done?' completed':'')+'" draggable="true" data-task-id="'+t.id+'"'+borderStyle+'>'
      + '<span class="task-drag-handle" title="Sürükleyerek sırala">☰</span>'
      + '<button class="task-check'+(t.done?' done':'')+'" data-action="toggle-task" data-id="'+t.id+'">'+(t.done?'✓':'')+'</button>'
      + '<div class="task-card-body">'
      +   '<div class="task-text'+(t.done?' done':'')+'">'+escapeHtml(t.text)+'</div>'
      +   tagHtml
      + '</div>'
      + ((dueHtml || repeatHtml) ? '<div class="task-right-meta">'+dueHtml+repeatHtml+'</div>' : '')
      + (!t.done ? '<button class="task-focus-btn" data-action="focus-task" data-id="'+t.id+'" title="Bu görev için çalışma oturumu başlat">▶ Odaklan</button>' : '')
      + '<button class="task-del" data-action="edit-task" data-id="'+t.id+'" aria-label="Görevi düzenle" title="Görevi düzenle">✎</button>'
      + '<button class="task-del" data-action="delete-task" data-id="'+t.id+'" aria-label="Görevi sil">✕</button>'
      + '</div>';
  }

  if(el.taskCreateToggle && el.taskCreatePanel){
    el.taskCreateToggle.addEventListener('click',()=>{
      const open=el.taskCreatePanel.classList.toggle('show');
      el.taskCreateToggle.setAttribute('aria-expanded',open?'true':'false');
      if(open) setTimeout(()=>el.taskInput?.focus(),0);
    });
  }

  if(el.taskDetailsToggle && el.taskDetailsPanel){
    el.taskDetailsToggle.addEventListener('click',()=>{
      const open=el.taskDetailsPanel.classList.toggle('show');
      el.taskDetailsToggle.setAttribute('aria-expanded',open?'true':'false');
    });
  }

  if(el.taskSearchToggle && el.taskSearchPanel){
    el.taskSearchToggle.addEventListener('click',()=>{
      const open=el.taskSearchPanel.classList.toggle('show');
      el.taskSearchToggle.setAttribute('aria-expanded',open?'true':'false');
      if(open) setTimeout(()=>el.taskSearchInput?.focus(),0);
    });
  }

  function updateTaskSearchUi(){
    if(!el.taskSearchInput || !el.taskSearchClear) return;
    const hasQuery=!!el.taskSearchInput.value.trim();
    const wrap=el.taskSearchInput.closest('.task-search-wrap');
    if(wrap) wrap.classList.toggle('searching',hasQuery);
    el.taskSearchClear.style.visibility=hasQuery?'visible':'hidden';
  }
  if(el.taskSearchInput){
    el.taskSearchInput.addEventListener('input',()=>{
      updateTaskSearchUi();
      renderTaskList();
    });
    el.taskSearchInput.addEventListener('search',()=>{
      updateTaskSearchUi();
      renderTaskList();
    });
  }
  if(el.taskSearchClear){
    el.taskSearchClear.addEventListener('click',()=>{
      el.taskSearchInput.value='';
      updateTaskSearchUi();
      renderTaskList();
      el.taskSearchInput.focus();
    });
    updateTaskSearchUi();
  }

  function renderTaskList(){
    renderTaskTagControls();
    const today = todayKey();
    const searchQuery=(el.taskSearchInput?.value || '').trim().toLocaleLowerCase('tr-TR');
    const filtered = data.tasks.filter(t=>{
      if(currentTaskFilter !== 'all' && normalizedTaskTagId(t) !== currentTaskFilter) return false;

      if(currentTaskStatusFilter==='active' && t.done) return false;
      if(currentTaskStatusFilter==='done' && !t.done) return false;

      if(currentTaskDateFilter!=='all'){
        if(currentTaskDateFilter==='overdue' && !(t.dueDate && t.dueDate < today && !t.done)) return false;
        if(currentTaskDateFilter==='today' && t.dueDate !== today) return false;
        if(currentTaskDateFilter==='upcoming' && !(t.dueDate && t.dueDate > today)) return false;
        if(currentTaskDateFilter==='nodate' && t.dueDate) return false;
      }

      if(!searchQuery) return true;
      const haystack=[t.text||'', t.dueDate||'', t.time||''].join(' ').toLocaleLowerCase('tr-TR');
      return haystack.includes(searchQuery);
    });
    const active = filtered.filter(t=>!t.done).sort((a,b)=>(Number(a.sortOrder)||0)-(Number(b.sortOrder)||0));
    const done = filtered.filter(t=>t.done).sort((a,b)=> (b.doneAt||'').localeCompare(a.doneAt||''));

    if(filtered.length === 0){
      const filteredView = searchQuery || currentTaskFilter!=='all' || currentTaskStatusFilter!=='all' || currentTaskDateFilter!=='all';
      el.taskListBody.innerHTML = filteredView
        ? '<div class="task-empty">Bu arama ve filtrelere uyan görev bulunamadı.</div>'
        : '<div class="task-empty">Henüz görev yok. Yukarıdan yeni bir görev ekleyebilirsin.</div>';
      el.clearDoneTasksBtn.style.display = 'none';
      return;
    }

    const overdue = active.filter(t=>t.dueDate && t.dueDate < today);
    const dueToday = active.filter(t=>t.dueDate === today);
    const upcoming = active.filter(t=>t.dueDate && t.dueDate > today);
    const noDate = active.filter(t=>!t.dueDate);

    let html = '';
    if(overdue.length){ html += '<div class="task-group-title">⚠️ Gecikmiş</div>' + overdue.map(renderTaskCard).join(''); }
    if(dueToday.length){ html += '<div class="task-group-title">Bugün</div>' + dueToday.map(renderTaskCard).join(''); }
    if(upcoming.length){ html += '<div class="task-group-title">Yaklaşan</div>' + upcoming.map(renderTaskCard).join(''); }
    if(noDate.length){ html += '<div class="task-group-title">Tarihsiz</div>' + noDate.map(renderTaskCard).join(''); }
    if(done.length){
      html += '<div class="task-group-title task-group-title-with-action"><span>Tamamlanan</span><button class="task-group-clear-done" data-action="clear-completed-inline" type="button">Tümünü sil</button></div>'
        + done.map(renderTaskCard).join('');
    }
    el.taskListBody.innerHTML = html || '<div class="task-empty">Görev yok. Yukarıdan ekleyebilirsin.</div>';
    el.clearDoneTasksBtn.style.display = 'none';
  }

  function toggleTaskDone(id){
    const t = data.tasks.find(x=>x.id===id);
    if(!t) return;
    const beforeBadges = getUnlockedBadgeMap();
    const beforeLevel = getLevelInfo().level;
    const wasDone = t.done;
    t.done = !t.done;
    t.doneAt = t.done ? new Date().toISOString() : null;
    let completedList = [];
    if(!wasDone && t.done && !t.xpCounted){
      t.xpCounted = true;
      data.totalTodosCompleted = (data.totalTodosCompleted||0) + 1;
      completedList = addTreeGrowth(GROWTH_PER_TODO);
    }
    if(!wasDone && t.done) spawnNextRecurringTask(t);
    saveData();
    refreshUI(['tasks','calendar']);
    if(!wasDone && t.done){
      playTodoCheckSound();
      refreshUI('today',{celebrateTree:completedList.length > 0});
      celebrateTreeCompletions(completedList);
      reportProgress(beforeLevel, beforeBadges);
    } else {
      refreshUI('today');
    }
  }

  async function editTask(id){
    const target=data.tasks.find(t=>t.id===id);
    if(!target) return;
    const value=await askPrompt('Görev adını düzenle',target.text || '');
    if(value===null) return;
    const text=value.trim().slice(0,120);
    if(!text){ showToast('Görev adı boş olamaz.', 'error'); return; }

    let scope='single';
    if(['daily','weekly','monthly'].includes(target.repeat)){
      scope=await askRecurringEditChoice('görev');
    }
    const affected=recurringSeriesItems(data.tasks,target,'dueDate',scope);
    affected.forEach(task=>{ task.text=text; });
    saveData();
    refreshUI(['tasks','calendar']);
    showToast(scope==='single' ? 'Görev güncellendi.' : affected.length+' görev güncellendi.','success');
  }

  async function deleteTask(id){
    const index=data.tasks.findIndex(t=>t.id===id);
    if(index<0) return;

    const target=data.tasks[index];
    const isRecurring=['daily','weekly','monthly'].includes(target.repeat);
    let choice='single';
    if(isRecurring){
      choice=await askRecurringDeleteChoice('görev');
      if(choice==='cancel') return;
    }

    if(choice==='future'){
      const sourceId=target.repeatSourceId || target.id;
      const removeIds=new Set(recurringItemsFrom(data.tasks,target,'dueDate').map(task=>task.id));
      const removed=data.tasks
        .map((task,taskIndex)=>({task:JSON.parse(JSON.stringify(task)),index:taskIndex}))
        .filter(entry=>removeIds.has(entry.task.id));
      const priorSnapshots=data.tasks
        .filter(task=>(task.repeatSourceId||task.id)===sourceId && !removeIds.has(task.id))
        .map(task=>({id:task.id,repeatUntil:task.repeatUntil || null}));

      const stopKey=dateBeforeKey(target.dueDate);
      const removedExceptions=trimRecurrenceExceptionsFrom('tasks',sourceId,target.dueDate);
      data.tasks=data.tasks.filter(task=>!removeIds.has(task.id));
      data.tasks.forEach(task=>{
        if((task.repeatSourceId||task.id)===sourceId) task.repeatUntil=stopKey;
      });
      saveData();
      refreshUI(['tasks','calendar']);
      offerUndo(removed.length+' tekrarlanan görev silindi.', ()=>{
        priorSnapshots.forEach(snapshot=>{
          const task=data.tasks.find(item=>item.id===snapshot.id);
          if(task) task.repeatUntil=snapshot.repeatUntil;
        });
        restoreRecurrenceExceptions('tasks',sourceId,removedExceptions);
        removed.sort((a,b)=>a.index-b.index).forEach(({task,index:taskIndex})=>{
          data.tasks.splice(Math.min(taskIndex,data.tasks.length),0,task);
        });
        saveData();
        refreshUI(['tasks','calendar']);
      });
      return;
    }

    const removed=JSON.parse(JSON.stringify(target));
    const singleSourceId=isRecurring ? (target.repeatSourceId || target.id) : null;
    const exceptionAdded=isRecurring && target.dueDate
      ? addRecurrenceException('tasks',singleSourceId,target.dueDate)
      : false;
    data.tasks.splice(index,1);
    saveData();
    refreshUI(['tasks','calendar']);
    offerUndo('Görev silindi.', ()=>{
      if(exceptionAdded) removeRecurrenceException('tasks',singleSourceId,target.dueDate);
      data.tasks.splice(Math.min(index,data.tasks.length),0,removed);
      saveData();
      refreshUI(['tasks','calendar']);
    });
  }

  function clearCompletedTasks(){
    const removed=data.tasks
      .map((task,index)=>({task:JSON.parse(JSON.stringify(task)),index}))
      .filter(x=>x.task.done);
    if(!removed.length) return;
    data.tasks=data.tasks.filter(t=>!t.done);
    saveData();
    refreshUI(['tasks','calendar']);
    offerUndo(removed.length+' tamamlanmış görev silindi.', ()=>{
      removed.sort((a,b)=>a.index-b.index).forEach(({task,index})=>{
        data.tasks.splice(Math.min(index,data.tasks.length),0,task);
      });
      saveData();
      refreshUI(['tasks','calendar']);
    });
  }

  el.taskAddBtn.addEventListener('click', ()=>{
    const text = el.taskInput.value.trim();
    if(!text) return;
    const rawDate = el.taskDateInput.value.trim();
    const dueDate = rawDate ? parseTaskDateInput(rawDate) : null;
    if(rawDate && !dueDate){
      showToast('Tarihi DD/MM/YYYY biçiminde gir.', true);
      el.taskDateInput.focus();
      return;
    }
    const rawTime = el.taskTimeToggle.checked ? el.taskTimeInput.value.trim() : '';
    const time = rawTime ? normalize24HourTime(rawTime) : null;
    if(rawTime && !time){
      showToast('Saati 24 saat biçiminde HH:MM olarak gir. Örn. 17:30.', 'error');
      el.taskTimeInput.focus();
      return;
    }
    if(time) el.taskTimeInput.value=time;
    const repeat = dueDate ? el.taskRepeatInput.value : 'none';
    if(!dueDate && el.taskRepeatInput.value !== 'none'){
      showToast('Tekrarlanan görev için önce bir tarih seç.', true);
      el.taskDateInput.focus(); return;
    }
    const repeatDays = repeat==='weekly' ? selectedRepeatDays() : [];
    if(repeat==='weekly' && repeatDays.length===0){
      showToast('Haftalık tekrar için en az bir gün seç.', true);
      return;
    }
    addTask(text, dueDate, time, el.taskTagInput.value, repeat, null, repeatDays);
    el.taskInput.value = '';
    el.taskDateInput.value = '';
    el.taskTimeInput.value = '';
    el.taskRepeatInput.value = 'none';
    el.taskRepeatDays.querySelectorAll('button').forEach(btn=>btn.classList.remove('active'));
    el.taskRepeatDays.classList.remove('show');
    el.taskTimeToggle.checked = false;
    el.taskTimeInput.style.display = 'none';
    refreshUI(['tasks','calendar']);
    playNote(660,0,0.1);
  });
  el.taskDateInput.addEventListener('input', ()=>{
    const pos = el.taskDateInput.selectionStart;
    el.taskDateInput.value = formatTaskDateTyping(el.taskDateInput.value);
    if(el.taskRepeatInput.value==='weekly' && selectedRepeatDays().length===0) syncRepeatDaysVisibility();
  });
  document.addEventListener('input', e=>{
    const input=e.target.closest?.('.time-24-input');
    if(!input) return;
    input.value=String(input.value||'').replace(/[^0-9:]/g,'').slice(0,5);
  });
  document.addEventListener('focusout', e=>{
    const input=e.target.closest?.('.time-24-input');
    if(!input || !input.value.trim()) return;
    const normalized=normalize24HourTime(input.value);
    if(normalized) input.value=normalized;
  });

  el.taskInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') el.taskAddBtn.click(); });
  el.taskTimeToggle.addEventListener('change', ()=>{
    el.taskTimeInput.style.display = el.taskTimeToggle.checked ? '' : 'none';
  });

  function selectedRepeatDays(){
    return Array.from(el.taskRepeatDays.querySelectorAll('button.active')).map(btn=>Number(btn.dataset.repeatDay));
  }
  function syncRepeatDaysVisibility(){
    const weekly=el.taskRepeatInput.value==='weekly';
    el.taskRepeatDays.classList.toggle('show',weekly);
    if(weekly && selectedRepeatDays().length===0){
      const raw=el.taskDateInput.value.trim();
      const date=raw ? parseTaskDateInput(raw) : null;
      if(date){
        const d=new Date(date+'T12:00:00');
        const btn=el.taskRepeatDays.querySelector('[data-repeat-day="'+d.getDay()+'"]');
        if(btn) btn.classList.add('active');
      }
    }
  }
  el.taskRepeatInput.addEventListener('change',syncRepeatDaysVisibility);
  el.taskRepeatDays.addEventListener('click',e=>{
    const btn=e.target.closest('[data-repeat-day]');
    if(!btn) return;
    btn.classList.toggle('active');
  });

  el.taskFilterRow.addEventListener('click', (e)=>{
    const btn=e.target.closest('.task-filter'); if(!btn) return;
    currentTaskFilter=btn.dataset.filter;
    renderTaskList();
  });


  if(el.taskStatusFilter){
    el.taskStatusFilter.addEventListener('change',()=>{
      currentTaskStatusFilter=el.taskStatusFilter.value;
      renderTaskList();
    });
  }
  if(el.taskDateFilter){
    el.taskDateFilter.addEventListener('change',()=>{
      currentTaskDateFilter=el.taskDateFilter.value;
      renderTaskList();
    });
  }
  if(el.taskFilterReset){
    el.taskFilterReset.addEventListener('click',()=>{
      currentTaskFilter='all';
        currentTaskStatusFilter='all';
      currentTaskDateFilter='all';
      if(el.taskSearchInput) el.taskSearchInput.value='';
      if(el.taskStatusFilter) el.taskStatusFilter.value='all';
      if(el.taskDateFilter) el.taskDateFilter.value='all';
      updateTaskSearchUi();
      renderTaskList();
    });
  }

  el.taskTagManagerBtn.addEventListener('click', ()=>{
    el.taskTagManager.classList.toggle('open');
    renderTaskTagManager();
  });
  el.taskTagCreateBtn.addEventListener('click', createTaskTag);
  el.taskTagNameInput.addEventListener('keydown', e=>{ if(e.key==='Enter') createTaskTag(); });
  el.taskTagManageList.addEventListener('click', async e=>{
    const btn=e.target.closest('[data-action="delete-tag"]');
    if(btn) deleteTaskTag(btn.dataset.tagId);
  });
  el.taskTagManageList.addEventListener('input', e=>{
    const picker=e.target.closest('[data-action="color-tag"]'); if(!picker) return;
    const tag=tagById(picker.dataset.tagId); if(!tag) return;
    tag.color=safeTagColor(picker.value);
    saveData();
    renderTaskTagControls();
    refreshUI(['tasks','calendar']);
  });

  let draggedTagId=null;
  el.taskTagManageList.addEventListener('dragstart', e=>{
    const item=e.target.closest('.task-tag-manage-item'); if(!item) return;
    draggedTagId=item.dataset.tagId; item.classList.add('dragging');
    e.dataTransfer.effectAllowed='move';
  });
  el.taskTagManageList.addEventListener('dragend', e=>{
    const item=e.target.closest('.task-tag-manage-item'); if(item) item.classList.remove('dragging');
    draggedTagId=null;
  });
  el.taskTagManageList.addEventListener('dragover', e=>{
    e.preventDefault();
    const over=e.target.closest('.task-tag-manage-item');
    if(!over || !draggedTagId || over.dataset.tagId===draggedTagId) return;
    const from=data.taskTags.findIndex(t=>t.id===draggedTagId), to=data.taskTags.findIndex(t=>t.id===over.dataset.tagId);
    if(from<0 || to<0) return;
    const [moved]=data.taskTags.splice(from,1); data.taskTags.splice(to,0,moved);
    saveData(); renderTaskTagManager(); renderTaskTagControls();
  });

  el.clearDoneTasksBtn.addEventListener('click', clearCompletedTasks);

  async function startFocusFromTaskId(taskId){
    const task = data.tasks.find(t=>t.id===taskId);
    if(!task || task.done) return;
    if(data.activeSessionId){
      showToast('Önce mevcut oturumu bitir veya duraklatılmış oturuma devam et.', true);
      return;
    }
    const tag = tagById(normalizedTaskTagId(task));
    const suggestedSubject = tag ? tag.name : '';
    const result = await askMinutes('Bu görev için bir odak oturumu başlat',25,true,true,'session',suggestedSubject);
    if(!result) return;
    startWorking(result.subject, result.minutes, task.text);
    const active = findSession(data.activeSessionId);
    if(active && active.todos && active.todos[0]) active.todos[0].linkedTaskId = task.id;
    saveData();
    document.querySelector('.tab-btn[data-tab="work"]')?.click();
    showToast('Görev odak oturumuna eklendi.', true);
  }



  async function handleTaskItemAction(btn){
    if(!btn) return false;
    const action=btn.dataset.action;
    if(action === 'toggle-task') toggleTaskDone(btn.dataset.id);
    else if(action === 'edit-task') await editTask(btn.dataset.id);
    else if(action === 'delete-task') await deleteTask(btn.dataset.id);
    else if(action === 'clear-completed-inline') clearCompletedTasks();
    else if(action === 'focus-task') await startFocusFromTaskId(btn.dataset.id);
    else return false;
    return true;
  }

  let draggedTaskId=null;
  el.taskListBody.addEventListener('dragstart',e=>{
    const card=e.target.closest('.task-card[data-task-id]'); if(!card) return;
    draggedTaskId=card.dataset.taskId; card.classList.add('task-dragging'); e.dataTransfer.effectAllowed='move';
  });
  el.taskListBody.addEventListener('dragover',e=>{
    const over=e.target.closest('.task-card[data-task-id]'); if(!over||!draggedTaskId||over.dataset.taskId===draggedTaskId) return;
    e.preventDefault(); over.classList.add('task-drag-over');
  });
  el.taskListBody.addEventListener('dragleave',e=>e.target.closest('.task-card')?.classList.remove('task-drag-over'));
  el.taskListBody.addEventListener('drop',e=>{
    const over=e.target.closest('.task-card[data-task-id]'); if(!over||!draggedTaskId) return;
    e.preventDefault();
    const visible=Array.from(el.taskListBody.querySelectorAll('.task-card[data-task-id]')).map(x=>x.dataset.taskId);
    const from=visible.indexOf(draggedTaskId), to=visible.indexOf(over.dataset.taskId);
    if(from<0||to<0) return;
    visible.splice(to,0,visible.splice(from,1)[0]);
    visible.forEach((id,index)=>{const task=data.tasks.find(t=>t.id===id);if(task) task.sortOrder=index;});
    saveData(); renderTaskList();
  });
  el.taskListBody.addEventListener('dragend',()=>{
    draggedTaskId=null; el.taskListBody.querySelectorAll('.task-dragging,.task-drag-over').forEach(x=>x.classList.remove('task-dragging','task-drag-over'));
  });

  el.taskListBody.addEventListener('click', async (e)=>{
    await handleTaskItemAction(e.target.closest('[data-action]'));
  });

  // ================= TAKVİM =================
  let calViewDate = new Date();
  let calSelectedDate = todayKey();
  let calSelectedMonth = null;
  let calViewMode = 'month';
  let calAddType = 'task';

  const EVENT_COLORS = ['#7aa2f7','#c792ea','#4dd0e1','#f2a4bd','#ffb703','#74d99f','#ff9f5a'];
  function eventColor(eventOrId){
    if(eventOrId && typeof eventOrId === 'object' && /^#[0-9a-fA-F]{6}$/.test(eventOrId.color || '')) return eventOrId.color;
    const id = typeof eventOrId === 'object' ? eventOrId.id : eventOrId;
    let hash = 0;
    for(let i=0;i<id.length;i++) hash = id.charCodeAt(i) + ((hash<<5)-hash);
    return EVENT_COLORS[Math.abs(hash) % EVENT_COLORS.length];
  }
  function hexToRgba(hex, alpha){
    const h = hex.replace('#','');
    const r = parseInt(h.substring(0,2),16), g = parseInt(h.substring(2,4),16), b = parseInt(h.substring(4,6),16);
    return 'rgba('+r+','+g+','+b+','+alpha+')';
  }

  function repeatEventLabel(repeat, days=[]){
    if(repeat==='daily') return 'Her gün';
    if(repeat==='monthly') return 'Her ay';
    if(repeat==='weekly'){
      const names={1:'Pzt',2:'Sal',3:'Çar',4:'Per',5:'Cum',6:'Cmt',0:'Paz'};
      const list=(days||[]).map(Number).filter(d=>names[d]!==undefined);
      return list.length ? list.map(d=>names[d]).join(' · ') : 'Her hafta';
    }
    return '';
  }

  function nextEventRepeatDate(dateStr, repeat, repeatDays=[], repeatAnchorDay=null){
    if(!dateStr || repeat==='none') return null;
    const d=new Date(dateStr+'T12:00:00');
    if(Number.isNaN(d.getTime())) return null;
    if(repeat==='daily'){
      d.setDate(d.getDate()+1);
    } else if(repeat==='weekly'){
      const days=[...new Set((repeatDays||[]).map(Number).filter(x=>x>=0&&x<=6))];
      if(days.length){
        for(let step=1; step<=7; step++){
          const cand=new Date(d); cand.setDate(d.getDate()+step);
          if(days.includes(cand.getDay())) return dateKey(cand);
        }
        return null;
      }
      d.setDate(d.getDate()+7);
    } else if(repeat==='monthly'){
      const anchorDay=Number.isFinite(Number(repeatAnchorDay)) && Number(repeatAnchorDay)>=1 && Number(repeatAnchorDay)<=31
        ? Number(repeatAnchorDay)
        : d.getDate();
      d.setDate(1); d.setMonth(d.getMonth()+1);
      const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
      d.setDate(Math.min(anchorDay,last));
    } else return null;
    return dateKey(d);
  }

  function addEventOccurrence(title,date,time,endTime,color,repeat='none',repeatSourceId=null,repeatDays=[],repeatAnchorDay=null,description=''){
    const ev={
      id:'ev'+Date.now()+Math.random().toString(36).slice(2,6),
      title:title.trim().slice(0,80),
      description:String(description||'').trim().slice(0,600),
      date,endDate:null,time:normalize24HourTime(time)||null,endTime:normalize24HourTime(endTime)||null,
      color:/^#[0-9a-fA-F]{6}$/.test(color||'')?color:EVENT_COLORS[0],
      repeat,repeatSourceId,
      repeatDays:Array.isArray(repeatDays)?[...new Set(repeatDays.map(Number).filter(d=>d>=0&&d<=6))]:[],
      repeatAnchorDay:repeat==='monthly'
        ? (Number.isFinite(Number(repeatAnchorDay)) && Number(repeatAnchorDay)>=1 && Number(repeatAnchorDay)<=31
          ? Number(repeatAnchorDay)
          : Number(String(date||'').slice(-2)) || null)
        : null,
      repeatUntil:null,
      createdAt:new Date().toISOString()
    };
    DataRepository.events.add(ev);
    return ev;
  }

  function dateBeforeKey(key){
    const d=new Date(key+'T12:00:00');
    if(Number.isNaN(d.getTime())) return null;
    d.setDate(d.getDate()-1);
    return dateKey(d);
  }

  function generateRecurringEventSeries(baseEvent,targetKey=null){
    if(!baseEvent || !['daily','weekly','monthly'].includes(baseEvent.repeat) || baseEvent.endDate) return 0;
    const sourceId=baseEvent.repeatSourceId || baseEvent.id;
    baseEvent.repeatSourceId=sourceId;
    const anchorDay=baseEvent.repeat==='monthly'
      ? (Number(baseEvent.repeatAnchorDay) || Number(String(baseEvent.date).slice(-2)))
      : null;
    if(baseEvent.repeat==='monthly') baseEvent.repeatAnchorDay=anchorDay;

    const fallback=new Date(baseEvent.date+'T12:00:00');
    fallback.setMonth(fallback.getMonth()+3);
    const horizonKey=targetKey || dateKey(fallback);
    const repeatUntil=baseEvent.repeatUntil || null;
    let cursor=baseEvent.date, guard=0, created=0;

    while(guard++<1200){
      const next=nextEventRepeatDate(cursor,baseEvent.repeat,baseEvent.repeatDays,anchorDay);
      if(!next || next>horizonKey || (repeatUntil && next>repeatUntil)) break;
      if(
        !isRecurrenceException('events',sourceId,next)
        && !data.events.some(ev=>(ev.repeatSourceId||ev.id)===sourceId && ev.date===next)
      ){
        const occurrence=addEventOccurrence(
          baseEvent.title,next,baseEvent.time,baseEvent.endTime,baseEvent.color,
          baseEvent.repeat,sourceId,baseEvent.repeatDays,anchorDay,baseEvent.description||''
        );
        occurrence.repeatUntil=repeatUntil;
        created++;
      }
      cursor=next;
    }
    return created;
  }

  function ensureRecurringEventsThrough(targetKey){
    if(!targetKey) return 0;
    const groups=new Map();
    data.events.forEach(ev=>{
      if(!['daily','weekly','monthly'].includes(ev.repeat) || !ev.date || ev.endDate) return;
      const sourceId=ev.repeatSourceId || ev.id;
      if(!groups.has(sourceId)) groups.set(sourceId,[]);
      groups.get(sourceId).push(ev);
    });

    let created=0;
    groups.forEach(items=>{
      items.sort((a,b)=>a.date.localeCompare(b.date));
      const latest=items[items.length-1];
      if(!latest) return;
      const repeatUntil=items.map(x=>x.repeatUntil).filter(Boolean).sort().at(-1) || null;
      if(repeatUntil && latest.date>=repeatUntil) return;
      latest.repeatUntil=repeatUntil;
      created += generateRecurringEventSeries(latest,targetKey);
    });
    if(created) saveData();
    return created;
  }

  function addEvent(title, date, time, endDate, color, repeat='none', repeatDays=[], endTime=null, description=''){
    const isMulti=!!(endDate && endDate>date);
    const safeRepeat=!isMulti && ['daily','weekly','monthly'].includes(repeat)?repeat:'none';
    const ev={
      id:'ev'+Date.now()+Math.random().toString(36).slice(2,6),
      title:title.trim().slice(0,80),
      description:String(description||'').trim().slice(0,600),
      date,
      endDate:isMulti?endDate:null,
      time:isMulti?null:(normalize24HourTime(time)||null),
      endTime:isMulti?null:(normalize24HourTime(endTime)||null),
      color:/^#[0-9a-fA-F]{6}$/.test(color||'')?color:EVENT_COLORS[0],
      repeat:safeRepeat,
      repeatSourceId:null,
      repeatDays:safeRepeat==='weekly'&&Array.isArray(repeatDays)?[...new Set(repeatDays.map(Number).filter(d=>d>=0&&d<=6))]:[],
      repeatAnchorDay:safeRepeat==='monthly' ? (Number(String(date||'').slice(-2)) || null) : null,
      repeatUntil:null,
      createdAt:new Date().toISOString()
    };
    DataRepository.events.add(ev);
    if(safeRepeat!=='none') generateRecurringEventSeries(ev);
    saveData();
    return ev;
  }

  let openEventDetailId=null;

  function eventDetailMetaHtml(ev){
    const parts=[];
    if(isMultiDayEvent(ev)){
      parts.push('📅 '+eventDateRangeLabel(ev));
    }else{
      parts.push('📅 '+displayDate(ev.date));
      parts.push(ev.time ? ('🕐 '+ev.time+(ev.endTime?'–'+ev.endTime:'')) : '🕐 Tüm gün');
    }
    if(ev.repeat && ev.repeat!=='none') parts.push('↻ '+repeatEventLabel(ev.repeat,ev.repeatDays));
    return parts.map(text=>'<span>'+escapeHtml(text)+'</span>').join('');
  }

  function openEventDetail(id){
    const ev=data.events.find(item=>item.id===id);
    if(!ev) return;
    openEventDetailId=id;
    el.eventDetailTitle.textContent=ev.title || 'Etkinlik';
    el.eventDetailMeta.innerHTML=eventDetailMetaHtml(ev);
    el.eventDetailDescription.value=ev.description || '';
    modalController.open(el.eventDetailBackdrop,{onCancel:closeEventDetail,focus:el.eventDetailClose});
  }

  function closeEventDetail(){
    openEventDetailId=null;
    modalController.close(el.eventDetailBackdrop);
  }

  function saveEventDetailDescription(){
    const ev=data.events.find(item=>item.id===openEventDetailId);
    if(!ev) return closeEventDetail();
    const next=el.eventDetailDescription.value.trim().slice(0,600);
    const sourceId=ev.repeatSourceId || ev.id;
    const affected=['daily','weekly','monthly'].includes(ev.repeat)
      ? data.events.filter(item=>(item.repeatSourceId||item.id)===sourceId && item.date>=ev.date)
      : [ev];
    affected.forEach(item=>{ item.description=next; });
    saveData();
    refreshUI('calendar');
    el.eventDetailDescription.value=next;
    showToast('Etkinlik açıklaması kaydedildi.','success');
  }

  el.eventDetailClose.addEventListener('click',closeEventDetail);
  el.eventDetailSave.addEventListener('click',saveEventDetailDescription);
  el.eventDetailEditTitle.addEventListener('click',async ()=>{
    const id=openEventDetailId;
    if(!id) return;
    await editEvent(id);
    const ev=data.events.find(item=>item.id===id);
    if(ev){
      el.eventDetailTitle.textContent=ev.title;
      el.eventDetailMeta.innerHTML=eventDetailMetaHtml(ev);
    }
  });

  async function editEvent(id){
    const target=data.events.find(ev=>ev.id===id);
    if(!target) return;
    const value=await askPrompt('Etkinlik adını düzenle',target.title || '');
    if(value===null) return;
    const title=value.trim().slice(0,80);
    if(!title){ showToast('Etkinlik adı boş olamaz.', 'error'); return; }

    let scope='single';
    if(['daily','weekly','monthly'].includes(target.repeat)){
      scope=await askRecurringEditChoice('etkinlik');
    }
    const affected=recurringSeriesItems(data.events,target,'date',scope);
    affected.forEach(event=>{ event.title=title; });
    saveData();
    refreshUI('calendar');
    showToast(scope==='single' ? 'Etkinlik güncellendi.' : affected.length+' etkinlik güncellendi.','success');
  }

  async function deleteEvent(id){
    const index=data.events.findIndex(e=>e.id===id);
    if(index<0) return;

    const target=data.events[index];
    const isRecurring=['daily','weekly','monthly'].includes(target.repeat);
    let choice='single';
    if(isRecurring){
      choice=await askRecurringDeleteChoice('etkinlik');
      if(choice==='cancel') return;
    }

    if(choice==='future'){
      const sourceId=target.repeatSourceId || target.id;
      const removeIds=new Set(recurringItemsFrom(data.events,target,'date').map(event=>event.id));
      const removed=data.events
        .map((event,eventIndex)=>({event:JSON.parse(JSON.stringify(event)),index:eventIndex}))
        .filter(entry=>removeIds.has(entry.event.id));
      const priorSnapshots=data.events
        .filter(event=>(event.repeatSourceId||event.id)===sourceId && !removeIds.has(event.id))
        .map(event=>({id:event.id,repeatUntil:event.repeatUntil || null}));

      const stopKey=dateBeforeKey(target.date);
      const removedExceptions=trimRecurrenceExceptionsFrom('events',sourceId,target.date);
      data.events=data.events.filter(event=>!removeIds.has(event.id));
      data.events.forEach(event=>{
        if((event.repeatSourceId||event.id)===sourceId) event.repeatUntil=stopKey;
      });
      saveData();
      refreshUI('calendar');
      offerUndo(removed.length+' tekrarlanan etkinlik silindi.', ()=>{
        priorSnapshots.forEach(snapshot=>{
          const event=data.events.find(item=>item.id===snapshot.id);
          if(event) event.repeatUntil=snapshot.repeatUntil;
        });
        restoreRecurrenceExceptions('events',sourceId,removedExceptions);
        removed.sort((a,b)=>a.index-b.index).forEach(({event,index:eventIndex})=>{
          data.events.splice(Math.min(eventIndex,data.events.length),0,event);
        });
        saveData();
        refreshUI('calendar');
      });
      return;
    }

    const removed=JSON.parse(JSON.stringify(target));
    const singleSourceId=isRecurring ? (target.repeatSourceId || target.id) : null;
    const exceptionAdded=isRecurring && target.date
      ? addRecurrenceException('events',singleSourceId,target.date)
      : false;
    data.events.splice(index,1);
    saveData();
    refreshUI('calendar');
    offerUndo('Etkinlik silindi.', ()=>{
      if(exceptionAdded) removeRecurrenceException('events',singleSourceId,target.date);
      data.events.splice(Math.min(index,data.events.length),0,removed);
      saveData();
      refreshUI('calendar');
    });
  }
  function isMultiDayEvent(ev){ return !!ev.endDate && ev.endDate !== ev.date; }
  function eventDateRangeLabel(ev){
    const label1 = displayDate(ev.date);
    if(!isMultiDayEvent(ev)) return label1;
    const label2 = displayDate(ev.endDate);
    return label1 + ' – ' + label2;
  }
  function renderEventCard(ev){
    const meta = isMultiDayEvent(ev) ? eventDateRangeLabel(ev) : (ev.time ? (ev.endTime ? ev.time+'–'+ev.endTime : ev.time) : 'Tüm gün');
    const color = eventColor(ev);
    const repeatHtml = ev.repeat && ev.repeat!=='none' ? '<span class="task-repeat-badge">↻ '+repeatEventLabel(ev.repeat,ev.repeatDays)+'</span>' : '';
    return '<div class="task-card event-card" data-action="view-event" data-id="'+ev.id+'" style="border-left-color:'+color+'">'
      + '<span class="event-icon" style="background:'+hexToRgba(color,0.2)+'; color:'+color+';">📌</span>'
      + '<div class="task-card-body"><div class="task-text">'+escapeHtml(ev.title)+'</div><span class="task-due-badge" style="background:'+hexToRgba(color,0.16)+'; color:'+color+';">🕐 '+meta+'</span>'+repeatHtml+(ev.description?'<div class="event-description-preview">'+escapeHtml(ev.description)+'</div>':'')+'</div>'
      + '<button class="event-focus-btn" data-action="view-event" data-id="'+ev.id+'" title="Etkinlik detaylarını aç">Detay</button>'
      + '<label class="event-color-edit-wrap" style="--event-color:'+color+'" title="Rengi değiştir"><input type="color" class="event-color-edit" data-action="change-event-color" data-id="'+ev.id+'" value="'+color+'" aria-label="Etkinlik rengini değiştir"></label>'
      + '<button class="task-del" data-action="edit-event" data-id="'+ev.id+'" aria-label="Etkinliği düzenle" title="Etkinliği düzenle">✎</button>'
      + '<button class="task-del" data-action="delete-event" data-id="'+ev.id+'">✕</button>'
      + '</div>';
  }

  function dayLevelForKey(k){
    if(data.calendarActivityColors === false) return 0;
    const day = data.days[k];
    const goalSeconds = dayGoalSeconds(k);
    const ratio = day ? day.workSeconds/goalSeconds : 0;
    if(ratio <= 0) return 0;
    return ratio >= 1 ? 4 : ratio >= 0.5 ? 3 : ratio >= 0.25 ? 2 : 1;
  }

  function renderCalendar(){
    let requiredThrough=null;
    if(calViewMode==='year'){
      requiredThrough=calViewDate.getFullYear()+'-12-31';
    }else if(calViewMode==='week'){
      requiredThrough=dateKey(addDays(startOfWeek(calViewDate),6));
    }else{
      requiredThrough=dateKey(new Date(calViewDate.getFullYear(),calViewDate.getMonth()+2,0));
    }
    ensureRecurringEventsThrough(requiredThrough);

    el.calMonthView.style.display = 'none';
    el.calWeekView.style.display = 'none';
    el.calYearView.style.display = 'none';
    if(calViewMode === 'year'){
      el.calYearView.style.display = 'grid';
      renderYearView();
    } else if(calViewMode === 'week'){
      el.calWeekView.style.display = 'block';
      renderWeekView();
    } else {
      el.calMonthView.style.display = 'block';
      renderMonthView();
    }
    renderCalAgenda();
  }

  function weekTitle(start, end){
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    const sameYear = start.getFullYear() === end.getFullYear();
    if(sameMonth) return start.getDate()+'–'+end.getDate()+' '+MONTH_FULL[start.getMonth()]+' '+start.getFullYear();
    if(sameYear) return start.getDate()+' '+MONTH_FULL[start.getMonth()]+' – '+end.getDate()+' '+MONTH_FULL[end.getMonth()]+' '+start.getFullYear();
    return start.getDate()+' '+MONTH_FULL[start.getMonth()]+' '+start.getFullYear()+' – '+end.getDate()+' '+MONTH_FULL[end.getMonth()]+' '+end.getFullYear();
  }

  function weeklyItemColor(item, type){
    if(type === 'event') return eventColor(item);
    const tag = tagById(normalizedTaskTagId(item));
    return tag ? safeTagColor(tag.color) : '#ffb703';
  }

  function clockToMinutes(value){
    const normalized=normalize24HourTime(value);
    if(!normalized) return null;
    const [h,m]=normalized.split(':').map(Number);
    return h*60+m;
  }

  function layoutTimedItems(items){
    const sorted=[...items].sort((a,b)=>a.startMin-b.startMin || a.endMin-b.endMin);
    const result=[];
    let cluster=[];
    let clusterEnd=-1;

    function flushCluster(){
      if(!cluster.length) return;

      const colEnds=[];
      cluster.forEach(item=>{
        let col=colEnds.findIndex(end=>end<=item.startMin);
        if(col<0){
          col=colEnds.length;
          colEnds.push(item.endMin);
        }else{
          colEnds[col]=item.endMin;
        }
        item.col=col;
      });

      const cols=Math.max(1,colEnds.length);
      cluster.forEach(item=>{
        item.cols=cols;
        result.push(item);
      });

      cluster=[];
      clusterEnd=-1;
    }

    sorted.forEach(item=>{
      if(cluster.length && item.startMin>=clusterEnd) flushCluster();
      cluster.push(item);
      clusterEnd=Math.max(clusterEnd,item.endMin);
    });

    flushCluster();
    return result;
  }

  const WEEK_HOUR_PX = 48;

  function renderWeekView(){
    const start = startOfWeek(calViewDate);
    const end = addDays(start, 6);
    const today = todayKey();
    el.calTitle.textContent = weekTitle(start, end);

    const days = Array.from({length:7}, (_,i)=>addDays(start,i));
    const dayKeys = days.map(dateKey);
    const dayNames = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];

    let head = '<div class="cal-week-head-spacer"></div>';
    days.forEach((d,i)=>{
      const k=dayKeys[i];
      head += '<button class="cal-week-day-head'+(k===today?' today':'')+(k===calSelectedDate?' selected':'')+'" data-date="'+k+'"><span>'+dayNames[i]+'</span><b>'+d.getDate()+'</b></button>';
    });

    let allDay = '<div class="cal-week-all-label">Tüm gün</div>';
    days.forEach((d,i)=>{
      const k=dayKeys[i];
      const items=[];
      data.events.filter(ev=> isMultiDayEvent(ev) ? (k>=ev.date && k<=ev.endDate) : (ev.date===k && !ev.time)).forEach(ev=>items.push({type:'event',item:ev}));
      data.tasks.filter(t=>t.dueDate===k && !t.time).forEach(t=>items.push({type:'task',item:t}));
      const chips=items.slice(0,3).map(x=>{
        const c=weeklyItemColor(x.item,x.type);
        const label=x.type==='event'?'📌 ':'✓ ';
        return '<button class="cal-week-all-chip '+x.type+'" data-date="'+k+'" data-action="'+(x.type==='task'?'focus-task':'view-event')+'" data-id="'+x.item.id+'" style="--week-color:'+c+'" title="'+escapeHtml(x.item.title||x.item.text)+'">'+label+escapeHtml(x.item.title||x.item.text)+'</button>';
      }).join('');
      allDay += '<div class="cal-week-all-cell'+(k===calSelectedDate?' selected':'')+'" data-date="'+k+'">'+chips+(items.length>3?'<span class="cal-week-more">+'+(items.length-3)+'</span>':'')+'</div>';
    });

    let timeLabels='';
    for(let h=0;h<24;h++) timeLabels += '<div class="cal-week-hour-label">'+pad(h)+':00</div>';

    let dayColumns='';
    days.forEach((d,i)=>{
      const k=dayKeys[i];
      let slots='';
      for(let h=0;h<24;h++) slots += '<div class="cal-week-hour-slot" data-date="'+k+'" data-hour="'+h+'"></div>';
      const timed=[];
      data.events.filter(ev=>!isMultiDayEvent(ev) && ev.date===k && ev.time).forEach(ev=>{
        const startMin=clockToMinutes(ev.time);
        if(startMin===null) return;
        const endCandidate=clockToMinutes(ev.endTime);
        const endMin=endCandidate!==null && endCandidate>startMin ? endCandidate : Math.min(1440,startMin+45);
        timed.push({type:'event',item:ev,time:ev.time,startMin,endMin,cols:1});
      });
      data.tasks.filter(t=>t.dueDate===k && t.time).forEach(t=>{
        const startMin=clockToMinutes(t.time);
        if(startMin===null) return;
        timed.push({type:'task',item:t,time:t.time,startMin,endMin:Math.min(1440,startMin+30),cols:1});
      });
      if(data.calendarWorkIntervals !== false){
        workIntervalsForDate(k).forEach(block=>{
          timed.push({type:'work',item:block,time:displayClockTime(block.start),startMin:block.startMin,endMin:block.endMin,cols:1});
        });
      }
      const laidOut=layoutTimedItems(timed);
      const blocks=laidOut.map((x,index)=>{
        const top=(x.startMin/60)*WEEK_HOUR_PX;
        const height=Math.max(20,((x.endMin-x.startMin)/60)*WEEK_HOUR_PX-2);
        const c=x.type==='work' ? x.item.color : weeklyItemColor(x.item,x.type);
        const label=x.type==='work' ? ('Çalışma · '+x.item.subject) : (x.item.title||x.item.text);
        const widthPct=100/Math.max(1,x.cols);
        const leftPct=x.col*widthPct;
        const timeLabel=x.type==='work'
          ? displayClockTime(x.item.start)+'–'+displayClockTime(x.item.end)
          : (x.type==='event' && x.item.endTime ? x.time+'–'+x.item.endTime : x.time);
        if(x.type==='work'){
          return '<div class="cal-week-timed-item work-session" style="top:'+top+'px;height:'+height+'px;left:calc('+leftPct+'% + 2px);right:auto;width:calc('+widthPct+'% - 4px);--week-color:'+c+';z-index:'+(3+index)+'" title="'+escapeHtml(timeLabel+' · '+label+(x.item.legacyApprox?' · eski kayıt, yaklaşık saat':'') )+'"><span>'+escapeHtml(timeLabel)+'</span>'+escapeHtml(label)+'</div>';
        }
        return '<button class="cal-week-timed-item '+x.type+'" data-date="'+k+'" data-action="'+(x.type==='task'?'focus-task':'view-event')+'" data-id="'+x.item.id+'" style="top:'+top+'px;height:'+height+'px;left:calc('+leftPct+'% + 2px);right:auto;width:calc('+widthPct+'% - 4px);--week-color:'+c+';z-index:'+(3+index)+'" title="'+escapeHtml(timeLabel+' · '+label)+'"><span>'+escapeHtml(timeLabel)+'</span>'+escapeHtml(label)+'</button>';
      }).join('');
      let nowLine = '';
      if(k===today){
        const now = new Date();
        const nowMinutes = now.getHours()*60 + now.getMinutes();
        nowLine = '<div class="cal-week-now-line" style="top:'+((nowMinutes/60)*WEEK_HOUR_PX)+'px"></div>';
      }
      dayColumns += '<div class="cal-week-day-column'+(k===today?' today':'')+(k===calSelectedDate?' selected':'')+'" data-date="'+k+'">'+slots+blocks+nowLine+'</div>';
    });

    el.calWeekView.innerHTML = '<div class="cal-week-scroll"><div class="cal-week-surface">'
      + '<div class="cal-week-head">'+head+'</div>'
      + '<div class="cal-week-all-day">'+allDay+'</div>'
      + '<div class="cal-week-body"><div class="cal-week-time-col">'+timeLabels+'</div><div class="cal-week-days">'+dayColumns+'</div></div>'
      + '</div></div>';

    requestAnimationFrame(()=>{
      const scroll=el.calWeekView.querySelector('.cal-week-scroll');
      if(scroll && !scroll.dataset.initialized){
        const currentHour=new Date().getHours();
        scroll.scrollTop=Math.max(0, currentHour*WEEK_HOUR_PX-120);
        scroll.dataset.initialized='1';
      }
    });
  }

  function renderMonthView(){
    const year = calViewDate.getFullYear();
    const month = calViewDate.getMonth();
    el.calTitle.textContent = MONTH_FULL[month] + ' ' + year;

    const firstOfMonth = new Date(year, month, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // Pazartesi=0
    const gridStart = addDays(firstOfMonth, -startOffset);
    const today = todayKey();
    const multiDayEvents = data.events.filter(isMultiDayEvent);

    let html = '';
    for(let i=0;i<42;i++){
      const date = addDays(gridStart, i);
      const k = dateKey(date);
      const outside = date.getMonth() !== month;
      const level = outside ? 0 : dayLevelForKey(k);
      const hasTask = data.tasks.some(t=> !t.done && t.dueDate === k);
      const singleDayEvents = data.events.filter(e=> !isMultiDayEvent(e) && e.date === k);
      const spanEvents = outside ? [] : multiDayEvents.filter(e=> k >= e.date && k <= e.endDate);

      const cls = ['cal-cell'];
      if(outside) cls.push('outside');
      if(k === today) cls.push('today');
      if(k === calSelectedDate) cls.push('selected');
      if(level>0) cls.push('level-'+level);

      let spanBars = '';
      if(!outside){
        spanEvents.slice(0,2).forEach(ev=>{
          const isStart = k === ev.date;
          const isEnd = k === ev.endDate;
          const isWeekStart = i % 7 === 0;
          const showLabel = isStart || isWeekStart;
          const barCls = ['cal-span-bar'];
          if(isStart) barCls.push('start');
          if(isEnd) barCls.push('end');
          spanBars += '<div class="'+barCls.join(' ')+'" style="background:'+eventColor(ev)+'">'+(showLabel?escapeHtml(ev.title):'')+'</div>';
        });
      }

      let eventLabel = '';
      if(!outside && singleDayEvents.length){
        const extra = singleDayEvents.length > 1 ? ' +' + (singleDayEvents.length-1) : '';
        eventLabel = '<span class="cal-event-label">'+escapeHtml(singleDayEvents[0].title)+extra+'</span>';
      }
      let dots = '';
      if(!outside && (hasTask || (singleDayEvents.length && !spanEvents.length))){
        dots = '<div class="cal-dot-row">' + (hasTask?'<span class="cal-dot task"></span>':'') + (singleDayEvents.length && !spanEvents.length?'<span class="cal-dot event"></span>':'') + '</div>';
      }
      html += '<div class="'+cls.join(' ')+'" data-date="'+k+'"><span>'+date.getDate()+'</span>'+eventLabel+spanBars+dots+'</div>';
    }
    el.calGrid.innerHTML = html;
  }

  function renderYearView(){
    const year = calViewDate.getFullYear();
    el.calTitle.textContent = String(year);
    const today = todayKey();
    const multiDayEvents = data.events.filter(isMultiDayEvent);
    let html = '';
    for(let m=0; m<12; m++){
      const firstOfMonth = new Date(year, m, 1);
      const startOffset = (firstOfMonth.getDay() + 6) % 7;
      const gridStart = addDays(firstOfMonth, -startOffset);
      let cellsHtml = '';
      for(let i=0;i<42;i++){
        const date = addDays(gridStart, i);
        const k = dateKey(date);
        const outside = date.getMonth() !== m;
        if(outside){ cellsHtml += '<div class="cal-mini-cell outside"></div>'; continue; }

        const level = dayLevelForKey(k);
        const singleDayEvents = data.events.filter(e=> !isMultiDayEvent(e) && e.date === k);
        const spanEvents = multiDayEvents.filter(e=> k >= e.date && k <= e.endDate);
        const cls = ['cal-mini-cell'];
        if(k === today) cls.push('today');
        if(!calSelectedMonth && k === calSelectedDate) cls.push('selected');
        if(level>0) cls.push('level-'+level);

        let eventMarks = '';
        const bars = [];
        spanEvents.slice(0,2).forEach(ev=>{
          const isStart = k === ev.date;
          const isEnd = k === ev.endDate;
          const barCls = ['cal-mini-bar'];
          if(isStart) barCls.push('start');
          if(isEnd) barCls.push('end');
          bars.push('<div class="'+barCls.join(' ')+'" style="--event-color:'+eventColor(ev)+'" title="'+escapeHtml(ev.title)+'"></div>');
        });
        if(bars.length){
          eventMarks = '<div class="cal-mini-event-stack">'+bars.join('')+'</div>';
        } else if(singleDayEvents.length){
          const ev = singleDayEvents[0];
          eventMarks = '<div class="cal-mini-single-event" style="--event-color:'+eventColor(ev)+'" title="'+escapeHtml(ev.title)+'"></div>';
        }

        cellsHtml += '<div class="'+cls.join(' ')+'" data-date="'+k+'"><span>'+date.getDate()+'</span>'+eventMarks+'</div>';
      }
      const monthKey = year + '-' + String(m+1).padStart(2,'0');
      const monthCls = 'cal-mini-month' + (calSelectedMonth === monthKey ? ' selected' : '');
      html += '<div class="'+monthCls+'" data-month="'+monthKey+'"><div class="cal-mini-title">'+MONTH_FULL[m]+'</div><div class="cal-mini-grid">'+cellsHtml+'</div></div>';
    }
    el.calYearView.innerHTML = html;
  }


  let calMultiDay = false;
  let calTaskHasTime = false;
  let calEventRepeat = 'none';
  let calEventRepeatDays = [];

  function renderMonthEventCard(ev){
    const color = eventColor(ev);
    const repeatHtml = ev.repeat && ev.repeat!=='none' ? '<span class="task-repeat-badge">↻ '+repeatEventLabel(ev.repeat,ev.repeatDays)+'</span>' : '';
    let meta = displayDate(ev.date);
    if(isMultiDayEvent(ev)){
      meta += ' – ' + displayDate(ev.endDate);
    } else if(ev.time){
      meta += ' · ' + ev.time + (ev.endTime ? '–'+ev.endTime : '');
    } else {
      meta += ' · Tüm gün';
    }
    return '<div class="task-card event-card" data-action="view-event" data-id="'+ev.id+'" style="border-left-color:'+color+'">'
      + '<span class="event-icon" style="background:'+hexToRgba(color,0.2)+'; color:'+color+';">📌</span>'
      + '<div class="task-card-body"><div class="task-text">'+escapeHtml(ev.title)+'</div><span class="task-due-badge" style="background:'+hexToRgba(color,0.16)+'; color:'+color+';">🕐 '+meta+'</span>'+repeatHtml+(ev.description?'<div class="event-description-preview">'+escapeHtml(ev.description)+'</div>':'')+'</div>'
      + '<button class="event-focus-btn" data-action="view-event" data-id="'+ev.id+'" title="Etkinlik detaylarını aç">Detay</button>'
      + '<label class="event-color-edit-wrap" style="--event-color:'+color+'" title="Rengi değiştir"><input type="color" class="event-color-edit" data-action="change-event-color" data-id="'+ev.id+'" value="'+color+'" aria-label="Etkinlik rengini değiştir"></label>'
      + '<button class="task-del" data-action="edit-event" data-id="'+ev.id+'" aria-label="Etkinliği düzenle" title="Etkinliği düzenle">✎</button>'
      + '<button class="task-del" data-action="delete-event" data-id="'+ev.id+'">✕</button>'
      + '</div>';
  }

  function renderCalAgenda(){
    if(calViewMode === 'year' && calSelectedMonth){
      const parts = calSelectedMonth.split('-');
      const year = Number(parts[0]);
      const month = Number(parts[1]) - 1;
      const monthStart = year + '-' + String(month+1).padStart(2,'0') + '-01';
      const monthEndDate = new Date(year, month + 1, 0);
      const monthEnd = dateKey(monthEndDate);
      const eventsForMonth = data.events.filter(ev=>{
        const evEnd = isMultiDayEvent(ev) ? ev.endDate : ev.date;
        return ev.date <= monthEnd && evEnd >= monthStart;
      }).sort((a,b)=> a.date.localeCompare(b.date) || (a.time||'99:99').localeCompare(b.time||'99:99'));

      const itemsHtml = eventsForMonth.length
        ? eventsForMonth.map(renderMonthEventCard).join('')
        : '<div class="task-empty">Bu ay planlanmış etkinlik yok.</div>';

      el.calAgenda.innerHTML = '<div class="cal-agenda-date">'+MONTH_FULL[month]+' '+year+'</div>'
        + '<div class="cal-agenda-stats"><span>📌 <b>'+eventsForMonth.length+'</b> etkinlik</span></div>'
        + itemsHtml;
      return;
    }
    const k = calSelectedDate;
    const d = new Date(k);
    const label = displayDate(k);
    const day = data.days[k];
    const tasksForDay = data.tasks.filter(t=> t.dueDate === k);
    const eventsForDay = data.events.filter(e=> isMultiDayEvent(e) ? (k>=e.date && k<=e.endDate) : e.date === k)
      .sort((a,b)=> (a.time||'99:99').localeCompare(b.time||'99:99'));
    const dailyFocus=focusScoreStats([k]);
    const dailySchedule=scheduledStudyStats([k]);

    let statsHtml = '<div class="cal-agenda-stats">'
      + '<span>⏱ <b>'+(day ? formatDurationLabel(day.workSeconds) : '0 dk')+'</b> çalışma</span>'
      + '<span>😕 <b>'+(day ? day.distraction : 0)+'</b> dikkat dağınıklığı</span>'
      + (dailyFocus.average!==null?'<span>🧠 <b>'+dailyFocus.average+'/100</b> odak</span>':'')
      + '</div>';

    let workTimelineHtml = '';
    if(data.calendarWorkIntervals !== false){
      const intervals=workIntervalsForDate(k);
      if(intervals.length){
        const chips=intervals.map(block=>{
          const label=displayClockTime(block.start)+'–'+displayClockTime(block.end);
          return '<div class="cal-work-chip" style="--work-color:'+block.color+'"><span class="cal-work-dot"></span><b>'+escapeHtml(label)+'</b><span>'+escapeHtml(block.subject)+'</span>'+(block.legacyApprox?'<em>yaklaşık</em>':'')+'</div>';
        }).join('');
        const bars=intervals.map(block=>{
          const left=(block.startMin/1440)*100;
          const width=Math.max(.35,((block.endMin-block.startMin)/1440)*100);
          return '<span class="cal-work-day-bar" style="left:'+left+'%;width:'+width+'%;--work-color:'+block.color+'" title="'+escapeHtml(displayClockTime(block.start)+'–'+displayClockTime(block.end)+' · '+block.subject)+'"></span>';
        }).join('');
        workTimelineHtml='<div class="cal-work-timeline"><div class="cal-work-timeline-head"><b>Çalışma zamanları</b><span>Timer’ın gerçekten çalıştığı aralıklar</span></div><div class="cal-work-day-track">'+bars+'<i style="left:25%">06</i><i style="left:50%">12</i><i style="left:75%">18</i></div><div class="cal-work-chip-list">'+chips+'</div></div>';
      }
    }

    let scheduleCompareHtml='';
    if(dailySchedule.matchedEvents){
      scheduleCompareHtml='<div class="cal-plan-compare"><div class="cal-work-timeline-head"><b>Planlanan / gerçekleşen</b><span>Takvimdeki saatli çalışma planlarıyla timer eşleşmesi</span></div>'
        +'<div class="planning-row"><span>Planlanan</span><b>'+formatDurationLabel(dailySchedule.planned)+'</b></div>'
        +'<div class="planning-row"><span>Gerçekleşen</span><b>'+formatDurationLabel(dailySchedule.actual)+'</b></div>'
        +'<div class="planning-row"><span>Uyum</span><b>%'+dailySchedule.adherence+'</b></div></div>';
    }

    let itemsHtml = '';
    if(eventsForDay.length) itemsHtml += eventsForDay.map(renderEventCard).join('');
    if(tasksForDay.length) itemsHtml += tasksForDay.map(renderTaskCard).join('');
    if(!itemsHtml) itemsHtml = '<div class="task-empty">Bu güne planlanmış görev ya da etkinlik yok.</div>';

    let optionsHtml = calAddType === 'event'
      ? '<label class="cal-check-row"><input type="checkbox" id="calMultiDayToggle"'+(calMultiDay?' checked':'')+'> Birden fazla gün sürer</label>'
        + (!calMultiDay
          ? '<div class="cal-repeat-row"><select id="calEventRepeatInput" class="task-repeat-select" aria-label="Etkinlik tekrarı">'
            + '<option value="none"'+(calEventRepeat==='none'?' selected':'')+'>Tekrar yok</option>'
            + '<option value="daily"'+(calEventRepeat==='daily'?' selected':'')+'>Her gün</option>'
            + '<option value="weekly"'+(calEventRepeat==='weekly'?' selected':'')+'>Her hafta</option>'
            + '<option value="monthly"'+(calEventRepeat==='monthly'?' selected':'')+'>Her ay</option>'
            + '</select></div>'
            + (calEventRepeat==='weekly'
              ? '<div class="task-repeat-days show cal-event-repeat-days" id="calEventRepeatDays">'
                + [1,2,3,4,5,6,0].map((day,i)=>'<button type="button" data-event-repeat-day="'+day+'" class="'+(calEventRepeatDays.includes(day)?'active':'')+'">'+['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'][i]+'</button>').join('')
                + '</div>'
              : '')
          : '')
      : '<label class="cal-check-row"><input type="checkbox" id="calTaskTimeToggle"'+(calTaskHasTime?' checked':'')+'> Belirli bir saati var</label>';

    let datesRowHtml = '<div class="cal-add-dates-row"><input type="date" class="cal-date-input" id="calAddDateInput" value="'+k+'">';
    if(calAddType === 'event' && calMultiDay){
      datesRowHtml += '<input type="date" class="cal-date-input" id="calAddEndDateInput" value="'+k+'">';
    } else if(calAddType === 'event' && !calMultiDay){
      datesRowHtml += '<input type="text" class="cal-time-input time-24-input" id="calAddTimeInput" inputmode="numeric" maxlength="5" placeholder="HH:MM" aria-label="Başlangıç saati, 24 saat formatı">'
        + '<input type="text" class="cal-time-input time-24-input" id="calAddEndTimeInput" inputmode="numeric" maxlength="5" placeholder="HH:MM" aria-label="Bitiş saati, 24 saat formatı">';
    } else if(calAddType === 'task' && calTaskHasTime){
      datesRowHtml += '<input type="text" class="cal-time-input time-24-input" id="calAddTimeInput" inputmode="numeric" maxlength="5" placeholder="HH:MM" aria-label="Görev saati, 24 saat formatı">';
    }
    datesRowHtml += '</div>';

    el.calAgenda.innerHTML =
      '<div class="cal-agenda-date">'+label+'</div>'
      + statsHtml
      + workTimelineHtml
      + scheduleCompareHtml
      + itemsHtml
      + '<div class="cal-add-type-row">'
      +   '<button class="add-type-btn'+(calAddType==='task'?' active':'')+'" data-add-type="task">✅ Görev</button>'
      +   '<button class="add-type-btn'+(calAddType==='event'?' active':'')+'" data-add-type="event">📌 Etkinlik</button>'
      + '</div>'
      + optionsHtml
      + datesRowHtml
      + (calAddType==='event'
          ? '<div class="cal-event-color-row"><span class="cal-event-color-label">Etkinlik rengi</span>'
            + '<div class="event-color-palette">'
            + EVENT_COLORS.map((c,i)=>'<button type="button" class="event-color-swatch'+(i===0?' active':'')+'" data-event-color="'+c+'" style="--swatch:'+c+'" aria-label="'+c+'"></button>').join('')
            + '<label class="event-color-custom" title="Özel renk">＋<input type="color" id="calEventColorInput" value="'+EVENT_COLORS[0]+'"></label>'
            + '</div></div>'
          : '')
      + '<div class="cal-add-row">'
      +   '<input type="text" class="cal-add-input" id="calAddInput" placeholder="'+(calAddType==='event'?'Etkinlik adı...':'Görev adı...')+'">'
      +   '<button class="cal-add-btn" id="calAddBtn">+</button>'
      + '</div>'
      + (calAddType==='event'
          ? '<textarea class="event-detail-description cal-event-description-input" id="calEventDescriptionInput" maxlength="600" placeholder="Açıklama (isteğe bağlı)..."></textarea>'
          : '');


  }


  function submitCalendarAgendaItem(){
    const input = el.calAgenda.querySelector('#calAddInput');
    if(!input) return;
    const text = input.value.trim();
    if(!text) return;

    const dateEl = el.calAgenda.querySelector('#calAddDateInput');
    const dateVal = dateEl?.value || calSelectedDate;

    if(calAddType === 'event'){
      const endDateEl = el.calAgenda.querySelector('#calAddEndDateInput');
      const timeEl = el.calAgenda.querySelector('#calAddTimeInput');
      const endTimeEl = el.calAgenda.querySelector('#calAddEndTimeInput');
      const colorEl = el.calAgenda.querySelector('#calEventColorInput');
      const descriptionEl = el.calAgenda.querySelector('#calEventDescriptionInput');

      const rawStart=timeEl ? timeEl.value.trim() : '';
      const rawEnd=endTimeEl ? endTimeEl.value.trim() : '';
      const startTime=rawStart ? normalize24HourTime(rawStart) : null;
      const endTime=rawEnd ? normalize24HourTime(rawEnd) : null;

      if(rawStart && !startTime){
        showToast('Başlangıç saatini 24 saat biçiminde HH:MM olarak gir.', 'error');
        timeEl.focus();
        return;
      }
      if(rawEnd && !endTime){
        showToast('Bitiş saatini 24 saat biçiminde HH:MM olarak gir.', 'error');
        endTimeEl.focus();
        return;
      }
      if(endTime && !startTime){
        showToast('Bitiş saati için önce başlangıç saatini gir.', 'error');
        timeEl.focus();
        return;
      }
      if(startTime && endTime && clockToMinutes(endTime)<=clockToMinutes(startTime)){
        showToast('Bitiş saati başlangıç saatinden sonra olmalı.', 'error');
        return;
      }
      if(timeEl && startTime) timeEl.value=startTime;
      if(endTimeEl && endTime) endTimeEl.value=endTime;

      if(calEventRepeat==='weekly' && calEventRepeatDays.length===0){
        showToast('Haftalık etkinlik için en az bir gün seç.', true);
        return;
      }

      addEvent(
        text,
        dateVal,
        startTime,
        endDateEl ? endDateEl.value : null,
        colorEl ? colorEl.value : EVENT_COLORS[0],
        calEventRepeat,
        calEventRepeatDays,
        endTime,
        descriptionEl ? descriptionEl.value : ''
      );
      calEventRepeat='none';
      calEventRepeatDays=[];
    } else {
      const timeEl = el.calAgenda.querySelector('#calAddTimeInput');
      const rawTime=timeEl ? timeEl.value.trim() : '';
      const taskTime=rawTime ? normalize24HourTime(rawTime) : null;
      if(rawTime && !taskTime){
        showToast('Görev saatini 24 saat biçiminde HH:MM olarak gir.', 'error');
        timeEl.focus();
        return;
      }
      if(timeEl && taskTime) timeEl.value=taskTime;
      addTask(text, dateVal, taskTime);
    }

    calSelectedDate = dateVal;
    refreshUI(['tasks','calendar']);
    playNote(660,0,0.1);
  }

  async function handleCalendarItemAction(actionEl){
    if(!actionEl) return false;
    const action=actionEl.dataset.action;
    const id=actionEl.dataset.id;
    if(action === 'toggle-task') toggleTaskDone(id);
    else if(action === 'edit-task') await editTask(id);
    else if(action === 'delete-task') await deleteTask(id);
    else if(action === 'edit-event') await editEvent(id);
    else if(action === 'delete-event') await deleteEvent(id);
    else if(action === 'focus-task') await startFocusFromTaskId(id);
    else if(action === 'view-event') openEventDetail(id);
    else return false;
    return true;
  }

  el.calGrid.addEventListener('click', (e)=>{
    const cell = e.target.closest('.cal-cell');
    if(!cell || cell.classList.contains('outside')) return;
    calSelectedMonth = null;
    calSelectedDate = cell.dataset.date;
    renderCalendar();
  });
  el.calWeekView.addEventListener('click', async (e)=>{
    const action = e.target.closest('[data-action]');
    if(action){
      e.preventDefault();
      e.stopPropagation();
      await handleCalendarItemAction(action);
      return;
    }
    const target = e.target.closest('[data-date]');
    if(!target) return;
    calSelectedMonth = null;
    calSelectedDate = target.dataset.date;
    const selected = new Date(calSelectedDate+'T12:00:00');
    if(!Number.isNaN(selected.getTime())) calViewDate = selected;
    renderCalendar();
  });
  el.calYearView.addEventListener('click', (e)=>{
    const cell = e.target.closest('.cal-mini-cell');
    if(cell && !cell.classList.contains('outside')){
      calSelectedMonth = null;
      calSelectedDate = cell.dataset.date;
      renderCalendar();
      return;
    }
    const monthCard = e.target.closest('.cal-mini-month');
    if(!monthCard) return;
    calSelectedMonth = monthCard.dataset.month;
    renderCalendar();
  });
  el.calAgenda.addEventListener('click', async (e)=>{
    const action = e.target.closest('[data-action]');
    if(action){
      await handleCalendarItemAction(action);
      return;
    }

    const typeBtn=e.target.closest('.add-type-btn');
    if(typeBtn){
      calAddType=typeBtn.dataset.addType;
      renderCalAgenda();
      return;
    }

    const repeatDay=e.target.closest('[data-event-repeat-day]');
    if(repeatDay){
      const day=Number(repeatDay.dataset.eventRepeatDay);
      calEventRepeatDays=calEventRepeatDays.includes(day)
        ? calEventRepeatDays.filter(d=>d!==day)
        : [...calEventRepeatDays,day];
      renderCalAgenda();
      return;
    }

    const swatch=e.target.closest('.event-color-swatch');
    if(swatch){
      const colorInput=el.calAgenda.querySelector('#calEventColorInput');
      if(colorInput) colorInput.value=swatch.dataset.eventColor;
      el.calAgenda.querySelectorAll('.event-color-swatch').forEach(x=>{
        x.classList.toggle('active',x===swatch);
      });
      return;
    }

    if(e.target.closest('#calAddBtn')){
      submitCalendarAgendaItem();
    }
  });

  el.calAgenda.addEventListener('change', e=>{
    if(e.target.matches('#calMultiDayToggle')){
      calMultiDay=e.target.checked;
      if(calMultiDay){
        calEventRepeat='none';
        calEventRepeatDays=[];
      }
      renderCalAgenda();
      return;
    }

    if(e.target.matches('#calTaskTimeToggle')){
      calTaskHasTime=e.target.checked;
      renderCalAgenda();
      return;
    }

    if(e.target.matches('#calEventRepeatInput')){
      calEventRepeat=e.target.value;
      if(calEventRepeat!=='weekly') calEventRepeatDays=[];
      renderCalAgenda();
    }
  });

  el.calAgenda.addEventListener('input', e=>{
    if(e.target.matches('#calEventColorInput')){
      const value=e.target.value.toLowerCase();
      el.calAgenda.querySelectorAll('.event-color-swatch').forEach(x=>{
        x.classList.toggle('active',x.dataset.eventColor.toLowerCase()===value);
      });
    }
  });

  el.calAgenda.addEventListener('change', async e=>{
    const picker=e.target.closest('[data-action="change-event-color"]');
    if(!picker) return;
    const ev=data.events.find(item=>item.id===picker.dataset.id);
    if(!ev) return;
    const color=/^#[0-9a-fA-F]{6}$/.test(picker.value) ? picker.value : EVENT_COLORS[0];
    let scope='single';
    if(['daily','weekly','monthly'].includes(ev.repeat)){
      scope=await askRecurringEditChoice('etkinlik');
    }
    recurringSeriesItems(data.events,ev,'date',scope).forEach(item=>{ item.color=color; });
    saveData();
    refreshUI('calendar');
  });

  el.calAgenda.addEventListener('keydown', e=>{
    if(e.key==='Enter' && e.target.matches('#calAddInput')){
      e.preventDefault();
      submitCalendarAgendaItem();
    }
  });

  el.calPrevBtn.addEventListener('click', ()=>{
    if(calViewMode === 'year') calViewDate = new Date(calViewDate.getFullYear()-1, calViewDate.getMonth(), 1);
    else if(calViewMode === 'week') calViewDate = addDays(calViewDate, -7);
    else calViewDate = new Date(calViewDate.getFullYear(), calViewDate.getMonth()-1, 1);
    if(calViewMode === 'year' && calSelectedMonth){
      calSelectedMonth = calViewDate.getFullYear() + '-' + calSelectedMonth.slice(5,7);
    }
    if(calViewMode === 'week') calSelectedDate = dateKey(startOfWeek(calViewDate));
    renderCalendar();
  });
  el.calNextBtn.addEventListener('click', ()=>{
    if(calViewMode === 'year') calViewDate = new Date(calViewDate.getFullYear()+1, calViewDate.getMonth(), 1);
    else if(calViewMode === 'week') calViewDate = addDays(calViewDate, 7);
    else calViewDate = new Date(calViewDate.getFullYear(), calViewDate.getMonth()+1, 1);
    if(calViewMode === 'year' && calSelectedMonth){
      calSelectedMonth = calViewDate.getFullYear() + '-' + calSelectedMonth.slice(5,7);
    }
    if(calViewMode === 'week') calSelectedDate = dateKey(startOfWeek(calViewDate));
    renderCalendar();
  });
  el.calViewBtns.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      el.calViewBtns.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      calViewMode = btn.dataset.view;
      if(calViewMode === 'month') calSelectedMonth = null;
      if(calViewMode === 'week'){
        calSelectedMonth = null;
        const selected = new Date(calSelectedDate+'T12:00:00');
        if(!Number.isNaN(selected.getTime())) calViewDate = selected;
      }
      renderCalendar();
    });
  });

  // ================= KOLEKSİYON =================
  function renderCollection(){
    const stage = getGrowthStage(data.treeProgress);
    const progressPct = Math.min(100, data.treeProgress / TREE_GOAL * 100);

    let html = '<div class="tree-progress-card">'
      + '<div class="tp-emoji">'+stage.emoji+'</div>'
      + '<div class="tp-info">'
      +   '<div class="tp-title">Ağaç #'+data.treeNumber+' büyüyor</div>'
      +   '<div class="tp-bar"><div class="tp-fill" style="width:'+progressPct+'%"></div></div>'
      +   '<div class="tp-caption">'+Math.round(data.treeProgress)+' / '+TREE_GOAL+' büyüme puanı — tür tamamlanınca belli olacak 🌱</div>'
      + '</div>'
      + '</div>';

    if(data.collection.length > 0){
      const uniqueCount = uniqueSpeciesCount();
      html += '<div class="collection-stats">'
        + '<div class="collection-stat"><div class="cs-num">'+data.collection.length+'</div><div class="cs-lbl">Toplam Ağaç</div></div>'
        + '<div class="collection-stat"><div class="cs-num">'+uniqueCount+' / '+SPECIES_POOL.length+'</div><div class="cs-lbl">Keşfedilen Tür</div></div>'
        + '</div>';
    }

    if(data.collection.length === 0){
      const remaining = Math.max(0, Math.ceil(TREE_GOAL - data.treeProgress));
      html += '<div class="empty-state">Henüz tamamlanmış ağacın yok.<br>İlk ağacını tamamlamak için <b>'+remaining+'</b> büyüme puanı daha gerek.</div>';
      el.collectionContent.innerHTML = html;
      return;
    }

    const items = [...data.collection].reverse();
    html += '<div class="collection-grid">';
    items.forEach((item, i)=>{
      const d = new Date(item.completedAt);
      const dateStr = displayDate(d);
      const colors = SPECIES_COLORS[item.species] || {accent:'#74d99f', bg:'rgba(116,217,159,0.16)'};
      html += '<div class="tree-card" style="--accent:'+colors.accent+';--accent-bg:'+colors.bg+';animation-delay:'+(i*0.04)+'s">'
        + '<span class="badge-num">Ağaç #'+item.treeNumber+'</span>'
        + '<div class="emoji">'+item.emoji+'</div>'
        + '<div class="species">'+item.species+'</div>'
        + '<div class="date">'+dateStr+'</div>'
        + '</div>';
    });
    html += '</div>';
    el.collectionContent.innerHTML = html;
  }


  // ---------- Mikro etkileşim sesleri / ripple ----------
  function playUiHoverSound(){
    if(data.muted) return;
    playNote(520, 0, 0.035, 'sine', 0.025);
  }
  function playUiPressSound(){
    if(data.muted) return;
    playNote(760, 0, 0.045, 'triangle', 0.035);
  }
  function addPressRipple(target, clientX, clientY){
    if(!target) return;
    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.9;
    const dot = document.createElement('span');
    dot.className = 'fx-ripple';
    dot.style.width = size+'px';
    dot.style.height = size+'px';
    dot.style.left = (clientX - rect.left)+'px';
    dot.style.top = (clientY - rect.top)+'px';
    target.appendChild(dot);
    setTimeout(()=>dot.remove(), 520);
  }

  const FX_SELECTOR = [
    '.icon-btn','.goal-edit-btn','.work-btn','.cal-add-btn','.add-type-btn',
    '.task-filter','.task-tag-manager-btn','.task-clear-done','.settings-link',
    '.badge-close','.focus-close','.event-color-swatch','.event-color-edit-wrap',
    '.task-check','.task-del'
  ].join(',');

  let lastHoverFxAt = 0;
  document.addEventListener('pointerover', e=>{
    const target = e.target.closest(FX_SELECTOR);
    if(!target || e.pointerType==='touch') return;
    const now = Date.now();
    if(now - lastHoverFxAt < 85) return;
    lastHoverFxAt = now;
    playUiHoverSound();
  }, {passive:true});

  document.addEventListener('pointerdown', e=>{
    const target = e.target.closest(FX_SELECTOR);
    if(!target) return;
    playUiPressSound();
    addPressRipple(target, e.clientX, e.clientY);
    target.classList.remove('fx-pulse');
    void target.offsetWidth;
    target.classList.add('fx-pulse');
    setTimeout(()=>target.classList.remove('fx-pulse'), 460);
  }, {passive:true});

  renderToday(false);
  renderDistractionCategorySummary();
  renderSessionList();
  updateIntentDisplay();

  // ---------- İlk kullanım tanıtımı ----------
  function initOnboarding(){
    if(data.onboarded) return;
    const backdrop = document.getElementById('onboardBackdrop');
    const steps = backdrop.querySelectorAll('.onboard-step');
    const dots = backdrop.querySelectorAll('.onboard-dot');
    const nextBtn = document.getElementById('onboardNext');
    const skipBtn = document.getElementById('onboardSkip');
    let step = 1;
    const maxStep = steps.length;
    function render(){
      steps.forEach(s=> s.style.display = (parseInt(s.dataset.step,10)===step) ? 'block' : 'none');
      dots.forEach(d=> d.classList.toggle('active', parseInt(d.dataset.dot,10)===step));
      nextBtn.textContent = step === maxStep ? 'Başla! 🌱' : 'Devam';
    }
    function finish(){
      data.onboarded = true;
      saveData();
      modalController.close(backdrop);
    }
    nextBtn.addEventListener('click', ()=>{
      if(step < maxStep){ step += 1; render(); } else { finish(); }
    });
    skipBtn.addEventListener('click', finish);
    render();
    setTimeout(()=> modalController.open(backdrop,{onCancel:finish,focus:nextBtn}), 300);
  }

  recoverFromIndexedDBIfNeeded()
    .then(recovered=>{
      if(dataWasReset && !recovered){
        showToast('Kayıtlı verin okunamadı, güvenli bir başlangıç yapıldı.', true);
      }
      initOnboarding();
    })
    .catch(error=>{
      console.warn('Başlangıç kurtarma kontrolü tamamlanamadı:', error);
      startupNeedsIDBRecovery=false;
      saveData();
      if(dataWasReset){
        showToast('Kayıtlı verin okunamadı, güvenli bir başlangıç yapıldı.', true);
      }
      initOnboarding();
    })
    .finally(()=>window.dispatchEvent(new CustomEvent('app:ready')));
})();

  // ---------- Geliştirici birim testleri (?test=1) ----------
  function runUnitTests(){
    const results=[];

    function test(name, fn){
      try{
        fn();
        results.push({name,ok:true});
      }catch(error){
        results.push({name,ok:false,error:error?.message || String(error)});
      }
    }

    function equal(actual, expected, label=''){
      if(actual!==expected){
        throw new Error((label ? label+': ' : '')+'beklenen '+JSON.stringify(expected)+', gelen '+JSON.stringify(actual));
      }
    }

    function includes(actual, expected, label=''){
      if(!String(actual).includes(expected)){
        throw new Error((label ? label+': ' : '')+JSON.stringify(expected)+' bulunamadı');
      }
    }

    test('Görev tarihi DD/MM/YYYY → ISO', ()=>{
      equal(parseTaskDateInput('11/09/2026'),'2026-09-11');
    });

    test('Geçersiz takvim tarihi reddedilir', ()=>{
      equal(parseTaskDateInput('31/02/2026'),null);
    });

    test('Eksik tarih biçimi reddedilir', ()=>{
      equal(parseTaskDateInput('1/9/2026'),null);
    });

    test('Tarih yazarken otomatik ayraç eklenir', ()=>{
      equal(formatTaskDateTyping('11092026'),'11/09/2026');
    });

    test('Sayaç 1 saatin altında MM:SS gösterir', ()=>{
      equal(formatRingTime(65),'01:05');
    });

    test('Sayaç 1 saatten sonra H:MM:SS gösterir', ()=>{
      equal(formatRingTime(3661),'1:01:01');
    });

    test('Günlük tekrar ertesi güne gider', ()=>{
      equal(nextRepeatDate('2026-09-11','daily'),'2026-09-12');
    });

    test('Aylık tekrar kısa ayda son güne sabitlenir', ()=>{
      equal(nextRepeatDate('2026-01-31','monthly'),'2026-02-28');
    });

    test('Aylık görev tekrarı kısa aydan sonra orijinal güne geri döner', ()=>{
      const feb=nextRepeatDate('2026-01-31','monthly',[],31);
      equal(feb,'2026-02-28');
      equal(nextRepeatDate(feb,'monthly',[],31),'2026-03-31');
    });

    test('Aylık etkinlik tekrarı anchor gününü korur', ()=>{
      const feb=nextEventRepeatDate('2028-01-31','monthly',[],31);
      equal(feb,'2028-02-29');
      equal(nextEventRepeatDate(feb,'monthly',[],31),'2028-03-31');
    });

    test('Seri bitiş tarihi seçilen tarihten bir gün önce hesaplanır', ()=>{
      equal(dateBeforeKey('2026-09-11'),'2026-09-10');
    });

    test('Tekrarlanan etkinlik üretimi hedef tarihte durur', ()=>{
      const originalEvents=data.events;
      try{
        data.events=[];
        const root={
          id:'ev-root',title:'Test',date:'2026-09-01',endDate:null,time:null,endTime:null,
          color:'#7aa2f7',repeat:'daily',repeatSourceId:'ev-root',repeatDays:[],
          repeatAnchorDay:null,repeatUntil:null
        };
        data.events.push(root);
        generateRecurringEventSeries(root,'2026-09-03');
        equal(data.events.map(x=>x.date).join(','),'2026-09-01,2026-09-02,2026-09-03');
      }finally{
        data.events=originalEvents;
      }
    });

    test('Seri bitiş sınırı sonrasındaki etkinliği üretmez', ()=>{
      const originalEvents=data.events;
      try{
        data.events=[];
        const root={
          id:'ev-root',title:'Test',date:'2026-09-01',endDate:null,time:null,endTime:null,
          color:'#7aa2f7',repeat:'daily',repeatSourceId:'ev-root',repeatDays:[],
          repeatAnchorDay:null,repeatUntil:'2026-09-02'
        };
        data.events.push(root);
        generateRecurringEventSeries(root,'2026-09-05');
        equal(data.events.map(x=>x.date).join(','),'2026-09-01,2026-09-02');
      }finally{
        data.events=originalEvents;
      }
    });

    test('Oturum analizi başlangıç saatine göre süre toplar', ()=>{
      const originalLog=data.sessionLog;
      const originalActive=data.activeSessionId;
      const originalWorking=data.isWorking;
      try{
        data.sessionLog={'2026-09-11':[
          {id:'s1',duration:1200,startedAt:'2026-09-11T09:10:00',subject:'Matematik'},
          {id:'s2',duration:1800,startedAt:'2026-09-11T09:40:00',subject:'Fizik'}
        ]};
        data.activeSessionId=null; data.isWorking=false;
        const stats=sessionAnalyticsForKeys(['2026-09-11']);
        equal(stats.hourly[9].seconds,3000);
        equal(stats.bestHour,9);
      }finally{
        data.sessionLog=originalLog;
        data.activeSessionId=originalActive;
        data.isWorking=originalWorking;
      }
    });

    test('Oturum analizi zaman damgası olmayan eski kaydı saat grafiğine katmaz', ()=>{
      const originalLog=data.sessionLog;
      try{
        data.sessionLog={'2026-09-11':[{id:'s1',duration:600,startedAt:null}]};
        const stats=sessionAnalyticsForKeys(['2026-09-11']);
        equal(stats.sessionCount,1);
        equal(stats.timedSessions,0);
      }finally{
        data.sessionLog=originalLog;
      }
    });


    test('Haftalık çoklu gün tekrarında sıradaki seçili gün bulunur', ()=>{
      equal(nextRepeatDate('2026-09-11','weekly',[1,3]),'2026-09-14');
    });

    test('Etkinlik aylık tekrarı da kısa ayı doğru işler', ()=>{
      equal(nextEventRepeatDate('2028-01-31','monthly'),'2028-02-29');
    });

    test('Dikkat dağınıklığı artışı kötü/kırmızı trenddir', ()=>{
      const html=distractionTrendHtml(12,10);
      includes(html,'trend-down');
      includes(html,'▲');
    });

    test('Dikkat dağınıklığı azalışı iyi/yeşil trenddir', ()=>{
      const html=distractionTrendHtml(5,10);
      includes(html,'trend-up');
      includes(html,'▼');
    });

    test('Dikkat dağınıklığı sıfıra inince %100 iyileşme gösterilir', ()=>{
      const html=distractionTrendHtml(0,8);
      includes(html,'trend-up');
      includes(html,'%100');
    });

    test('Takvim anahtarı yerel tarihten ISO gün anahtarı üretir', ()=>{
      equal(dateKey(new Date(2026,8,11,12,0,0)),'2026-09-11');
    });

    test('Takvim zincirleme çakışmaları aynı kolon kümesine alır', ()=>{
      const items=layoutTimedItems([
        {id:'a',startMin:540,endMin:600},
        {id:'b',startMin:570,endMin:630},
        {id:'c',startMin:610,endMin:660}
      ]);
      equal(items.length,3);
      equal(items[0].cols,2);
      equal(items[1].cols,2);
      equal(items[2].cols,2);
    });

    test('Takvim ayrı çakışma kümelerini bağımsız hesaplar', ()=>{
      const items=layoutTimedItems([
        {id:'a',startMin:540,endMin:600},
        {id:'b',startMin:570,endMin:630},
        {id:'c',startMin:720,endMin:750}
      ]);
      equal(items[0].cols,2);
      equal(items[1].cols,2);
      equal(items[2].cols,1);
    });

    test('HTML kaçışında çift ve tek tırnak güvenlidir', ()=>{
      equal(escapeHtml(`a"b'c&d<e>`),'a&quot;b&#39;c&amp;d&lt;e&gt;');
    });

    test('Freeze ilerlemesi 7 günün katında yeni döngüye sıfırdan başlar', ()=>{
      const p=streakFreezeProgress(14);
      equal(p.remaining,7);
      equal(p.pct,0);
      equal(p.intoCycle,0);
    });

    test('Tekrarlanan görevde tamamlanmış mevcut kopya da duplicate sayılır', ()=>{
      const tasks=[{id:'x',repeatSourceId:'root',dueDate:'2026-09-12',done:true}];
      equal(hasRecurringTaskOccurrence(tasks,'root','2026-09-12'),true);
    });

    test('Toast varyantı eski boolean çağrılarıyla geriye uyumludur', ()=>{
      equal(normalizeToastVariant(true),'calm');
      equal(normalizeToastVariant(false),'default');
      equal(normalizeToastVariant('success'),'success');
    });

    test('IndexedDB kurtarma snapshotı geçerli veriyi kabul eder', ()=>{
      const sample=freshData();
      const parsed=parseIndexedDBSnapshot({payload:JSON.stringify(sample)});
      equal(!!parsed,true);
    });

    test('IndexedDB kurtarma snapshotı bozuk JSON verisini reddeder', ()=>{
      equal(parseIndexedDBSnapshot({payload:'{bozuk'}),null);
    });

    test('Tekrarlanan görevlerde gelecek silme seçilen tarihten başlar', ()=>{
      const items=[
        {id:'a',repeat:'daily',repeatSourceId:'root',dueDate:'2026-09-10'},
        {id:'b',repeat:'daily',repeatSourceId:'root',dueDate:'2026-09-11'},
        {id:'c',repeat:'daily',repeatSourceId:'root',dueDate:'2026-09-12'}
      ];
      const selected=recurringItemsFrom(items,items[1],'dueDate').map(x=>x.id).join(',');
      equal(selected,'b,c');
    });

    test('Tekrarlanan etkinliklerde başka seri geleceğe dahil edilmez', ()=>{
      const items=[
        {id:'a',repeat:'weekly',repeatSourceId:'r1',date:'2026-09-11'},
        {id:'b',repeat:'weekly',repeatSourceId:'r1',date:'2026-09-18'},
        {id:'x',repeat:'weekly',repeatSourceId:'r2',date:'2026-09-18'}
      ];
      const selected=recurringItemsFrom(items,items[0],'date').map(x=>x.id).join(',');
      equal(selected,'a,b');
    });

    test('Seri düzenleme tüm seriyi seçebilir', ()=>{
      const items=[
        {id:'a',repeatSourceId:'r',dueDate:'2026-09-01'},
        {id:'b',repeatSourceId:'r',dueDate:'2026-09-08'},
        {id:'x',repeatSourceId:'x',dueDate:'2026-09-08'}
      ];
      equal(recurringSeriesItems(items,items[1],'dueDate','all').map(x=>x.id).join(','),'a,b');
    });

    test('Seri düzenleme yalnızca seçilen örneği değiştirebilir', ()=>{
      const item={id:'a',repeatSourceId:'r',date:'2026-09-01'};
      equal(recurringSeriesItems([item],item,'date','single').length,1);
    });

    test('Görev tekrar kesme tarihi sonraki oluşumu engeller', ()=>{
      equal(repeatAllowsDate('2026-09-11','2026-09-12'),false);
      equal(repeatAllowsDate('2026-09-12','2026-09-12'),true);
      equal(repeatAllowsDate(null,'2026-09-12'),true);
    });

    test('Görev tekrar kesme tarihi seçilen günden bir gün öncesine ayarlanabilir', ()=>{
      equal(dateBeforeKey('2026-09-12'),'2026-09-11');
      equal(dateBeforeKey('2026-03-01'),'2026-02-28');
    });

    test('Tekil tekrar istisnası yalnızca seçilen tarihi işaretler', ()=>{
      const oldData=data;
      try{
        data=freshData();
        addRecurrenceException('tasks','seri-1','2026-09-13');
        equal(isRecurrenceException('tasks','seri-1','2026-09-13'),true);
        equal(isRecurrenceException('tasks','seri-1','2026-09-14'),false);
        removeRecurrenceException('tasks','seri-1','2026-09-13');
        equal(isRecurrenceException('tasks','seri-1','2026-09-13'),false);
      }finally{
        data=oldData;
      }
    });

    test('Gelecek seri silme yalnızca ileri tarihli istisnaları temizler', ()=>{
      const oldData=data;
      try{
        data=freshData();
        data.recurrenceExceptions.tasks['seri-1']=['2026-09-10','2026-09-12','2026-09-15'];
        const removed=trimRecurrenceExceptionsFrom('tasks','seri-1','2026-09-12').join(',');
        equal(removed,'2026-09-12,2026-09-15');
        equal(data.recurrenceExceptions.tasks['seri-1'].join(','),'2026-09-10');
        restoreRecurrenceExceptions('tasks','seri-1',['2026-09-12','2026-09-15']);
        equal(data.recurrenceExceptions.tasks['seri-1'].join(','),'2026-09-10,2026-09-12,2026-09-15');
      }finally{
        data=oldData;
      }
    });

    test('24 saat girişi normalize edilir', ()=>{
      equal(normalize24HourTime('9:05'),'09:05');
      equal(normalize24HourTime('1730'),'17:30');
      equal(normalize24HourTime('23:59'),'23:59');
    });

    test('AM/PM veya geçersiz 24 saat değeri reddedilir', ()=>{
      equal(normalize24HourTime('5:30 PM'),null);
      equal(normalize24HourTime('24:00'),null);
      equal(normalize24HourTime('12:60'),null);
    });

    test('Haftalık takvim event yüksekliği 48px saat gridine uyar', ()=>{
      equal(WEEK_HOUR_PX,48);
      equal(((clockToMinutes('11:00')-clockToMinutes('09:00'))/60)*WEEK_HOUR_PX,96);
    });

    test('Storage meta revizyon karşılaştırması yeni kaydı seçer', ()=>{
      equal(storageMetaCompare({revision:3,updatedAt:1,writerId:'a'},{revision:2,updatedAt:999,writerId:'z'})>0,true);
    });

    test('Sekme heartbeat tazelik kontrolü aktif sahibi ayırt eder', ()=>{
      const key=TAB_HEARTBEAT_PREFIX+'unit-test-owner';
      try{
        localStorage.setItem(key,'1000');
        equal(isTabHeartbeatFresh('unit-test-owner',15000,10000),true);
        equal(isTabHeartbeatFresh('unit-test-owner',15000,20000),false);
      }finally{
        localStorage.removeItem(key);
      }
    });

    test('DataRepository session ID ile kayıt ve tarih döndürür', ()=>{
      const oldData=data;
      try{
        data=freshData();
        data.sessionLog['2026-09-12']=[{id:'session-test'}];
        const found=DataRepository.sessions.byId('session-test');
        equal(found.key,'2026-09-12');
        equal(found.session.id,'session-test');
      }finally{
        data=oldData;
      }
    });

    test('DataRepository task ekleme ve silme işlemini kapsüller', ()=>{
      const oldData=data;
      try{
        data=freshData();
        DataRepository.tasks.add({id:'task-test'});
        equal(DataRepository.tasks.byId('task-test').id,'task-test');
        equal(DataRepository.tasks.removeById('task-test').id,'task-test');
        equal(DataRepository.tasks.byId('task-test'),null);
      }finally{
        data=oldData;
      }
    });

    test('Storage repository primary meta bilgisini tek kapıdan okur', ()=>{
      const original=AppStorageRepository.readPrimaryMeta;
      try{
        AppStorageRepository.readPrimaryMeta=()=>({revision:77,updatedAt:1,writerId:'x'});
        equal(readPrimaryStorageMeta().revision,77);
      }finally{
        AppStorageRepository.readPrimaryMeta=original;
      }
    });

    test('Oturum hedef önerilerinde 90 dakika bulunur', ()=>{
      const sessionPresets=[15,25,45,60,90];
      equal(sessionPresets.includes(90),true);
    });

    test('Haftalık etkinlik ölçeğinde 09:30–12:00 kutusu 120px olur', ()=>{
      const start=clockToMinutes('09:30');
      const end=clockToMinutes('12:00');
      equal(((end-start)/60)*WEEK_HOUR_PX,120);
    });

    test('Dikkat dağınıklığı kategorisiz miktarı toplamdan kategori toplamı çıkarılarak hesaplanır', ()=>{
      const total=4;
      const categorized={Telefon:2,'Sosyal Medya':1};
      const categorizedTotal=Object.values(categorized).reduce((a,b)=>a+b,0);
      equal(total-categorizedTotal,1);
    });

    test('Bozuk primary veri migration sırasında uygulamayı çökertmez', ()=>{
      const malformed={...freshData(), sessionLog:{bad:{not:'array'}}};
      const migrated=tryMigrateStoredData(malformed,'unit-test');
      equal(Array.isArray(migrated.sessionLog.bad),true);
    });

    test('Ağaç kazanma eşiği v62 ile daha zordur', ()=>{
      equal(TREE_GOAL,80);
      equal(GROWTH_PER_WORK_MIN,0.5);
      equal(GROWTH_PER_TODO,4);
    });

    test('Rastgele ağaç türü havuzdan gelir', ()=>{
      const species=randomSpecies();
      equal(SPECIES_POOL.some(item=>item.name===species.name),true);
    });

    test('Etkinlik açıklaması 600 karakter ile sınırlıdır', ()=>{
      equal('a'.repeat(650).slice(0,600).length,600);
    });

    const passed=results.filter(r=>r.ok).length;
    const failed=results.length-passed;

    console.groupCollapsed('Test · Unit tests: '+passed+'/'+results.length+' geçti');
    results.forEach(r=>{
      if(r.ok) console.log('✓',r.name);
      else console.error('✕',r.name,'—',r.error);
    });
    console.groupEnd();

    let panel=document.getElementById('unitTestPanel');
    if(!panel){
      panel=document.createElement('div');
      panel.id='unitTestPanel';
      panel.setAttribute('role','status');
      panel.style.cssText=[
        'position:fixed','right:14px','bottom:14px','z-index:99999',
        'max-width:360px','padding:12px 14px','border-radius:12px',
        'font:12px/1.45 system-ui,-apple-system,sans-serif',
        'background:rgba(18,23,20,.96)','color:#e8f0ea',
        'border:1px solid rgba(255,255,255,.12)',
        'box-shadow:0 12px 34px rgba(0,0,0,.32)'
      ].join(';');
      document.body.appendChild(panel);
    }
    panel.innerHTML='<strong>Unit tests: '+passed+'/'+results.length+' geçti</strong>'
      +(failed
        ? '<div style="margin-top:6px;color:#ff9a9a">'+failed+' test başarısız. Ayrıntı console’da.</div>'
        : '<div style="margin-top:6px;color:#8fe0ae">Tüm kritik temel testler başarılı.</div>');

    return {passed,failed,total:results.length,results};
  }

  if(new URLSearchParams(location.search).get('test')==='1'){
    setTimeout(()=>{ window.__TEST_RESULTS__=runUnitTests(); },0);
  }

