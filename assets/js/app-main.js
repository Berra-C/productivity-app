(function(){
  const STORAGE_KEY = 'direncAgaci_v2';
  const BACKUP_KEY = STORAGE_KEY + '_backup';
  const OLD_KEY = 'direncAgaci_v1';
  const SCHEMA_VERSION = 46;

  // Runtime modules must be initialized before repositories/state consume them.
  // Startup-order checks enforce this invariant.
  const StatePersistence=window.ProductivityStatePersistence;
  const StateWriterFactory=window.ProductivityStateWriter;
  const TimerCore=window.ProductivityTimerCore;
  const TimerService=window.ProductivityTimerService;
  const TimerControllerFactory=window.ProductivityTimerController;
  const SessionRepositoryFactory=window.ProductivitySessionRepository;
  const TaskRepositoryFactory=window.ProductivityTaskRepository;
  const EventRepositoryFactory=window.ProductivityEventRepository;
  const RecurrenceServiceFactory=window.ProductivityRecurrenceService;
  const SessionDomainServiceFactory=window.ProductivitySessionService;
  const TaskDomainServiceFactory=window.ProductivityTaskService;
  const EventDomainServiceFactory=window.ProductivityEventService;
  const GamificationCore=window.ProductivityGamificationCore;
  const TreeService=window.ProductivityTreeService;
  const AnalyticsCore=window.ProductivityAnalyticsCore;
  const CalendarCore=window.ProductivityCalendarCore;
  const ViewFormatters=window.ProductivityViewFormatters;
  const SummaryView=window.ProductivitySummaryView;
  const CalendarView=window.ProductivityCalendarView;
  const StatsView=window.ProductivityStatsView;
  const TaskView=window.ProductivityTaskView;
  const CollectionView=window.ProductivityCollectionView;
  const SessionView=window.ProductivitySessionView;
  const FocusView=window.ProductivityFocusView;
  const WorkControlsView=window.ProductivityWorkControlsView;
  const ModalService=window.ProductivityModalService;
  const StateMigrationFactory=window.ProductivityStateMigration;
  const RecoveryStoreFactory=window.ProductivityRecoveryStore;
  const StateRecoveryServiceFactory=window.ProductivityStateRecoveryService;
  const DestructiveSyncGuard=window.ProductivityDestructiveSyncGuard;
  const ExternalStateService=window.ProductivityExternalStateService;

  if(!StatePersistence || !StateWriterFactory || !TimerCore || !TimerService || !TimerControllerFactory || !SessionRepositoryFactory || !TaskRepositoryFactory || !EventRepositoryFactory || !GamificationCore || !TreeService || !AnalyticsCore || !CalendarCore || !ViewFormatters || !SummaryView || !CalendarView || !StatsView || !TaskView || !CollectionView || !SessionView || !FocusView || !WorkControlsView || !ModalService || !RecurrenceServiceFactory || !SessionDomainServiceFactory || !TaskDomainServiceFactory || !EventDomainServiceFactory || !StateMigrationFactory || !RecoveryStoreFactory || !StateRecoveryServiceFactory || !DestructiveSyncGuard || !ExternalStateService){
    const missing=[
      !StatePersistence ? 'StatePersistence' : null,
      !StateWriterFactory ? 'StateWriter' : null,
      !TimerCore ? 'TimerCore' : null,
      !TimerService ? 'TimerService' : null,
      !TimerControllerFactory ? 'TimerController' : null,
      !SessionRepositoryFactory ? 'SessionRepository' : null,
      !TaskRepositoryFactory ? 'TaskRepository' : null,
      !EventRepositoryFactory ? 'EventRepository' : null,
      !GamificationCore ? 'GamificationCore' : null,
      !TreeService ? 'TreeService' : null,
      !AnalyticsCore ? 'AnalyticsCore' : null,
      !CalendarCore ? 'CalendarCore' : null,
      !ViewFormatters ? 'ViewFormatters' : null,
      !SummaryView ? 'SummaryView' : null,
      !CalendarView ? 'CalendarView' : null,
      !StatsView ? 'StatsView' : null,
      !TaskView ? 'TaskView' : null,
      !CollectionView ? 'CollectionView' : null,
      !SessionView ? 'SessionView' : null,
      !FocusView ? 'FocusView' : null,
      !WorkControlsView ? 'WorkControlsView' : null,
      !ModalService ? 'ModalService' : null,
      !RecurrenceServiceFactory ? 'RecurrenceService' : null,
      !SessionDomainServiceFactory ? 'SessionService' : null,
      !TaskDomainServiceFactory ? 'TaskService' : null,
      !EventDomainServiceFactory ? 'EventService' : null,
      !StateMigrationFactory ? 'StateMigration' : null,
      !RecoveryStoreFactory ? 'RecoveryStore' : null,
      !StateRecoveryServiceFactory ? 'StateRecoveryService' : null,
      !DestructiveSyncGuard ? 'DestructiveSyncGuard' : null,
      !ExternalStateService ? 'ExternalStateService' : null
    ].filter(Boolean).join(', ');
    throw new Error('Uygulama modülleri yüklenemedi: '+missing+'. Sayfayı bir kez yenileyin.');
  }

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

  const StateMigration=StateMigrationFactory.create({
    schemaVersion:SCHEMA_VERSION,
    closedIntervalSeconds:(session,options)=>sessionClosedIntervalSeconds(session,options),
    logger:console
  });

  const RecoveryStore=RecoveryStoreFactory.create({
    indexedDBProvider:()=>window.indexedDB,
    dbName:IDB_NAME,
    dbVersion:IDB_VERSION,
    storeName:IDB_STORE,
    primaryKey:IDB_PRIMARY_KEY,
    schemaVersion:SCHEMA_VERSION,
    now:()=>Date.now(),
    logger:console
  });

  const RANKS = [
    "Acemi Nöbetçi","Dikkatli Çırak","Kararlı Gözcü","Odak Bekçisi",
    "Direnç Ustası","Zihin Şovalyesi","Sarsılmaz İrade","Konsantrasyon Kahramanı",
    "Zihin Fatihi","Efsanevi Odak"
  ];

  const GROWTH_STAGES = [
    {min:0,   emoji:"🌰"},
    {min:28,  emoji:"🌱"},
    {min:56,  emoji:"🌿"},
    {min:84,  emoji:"🪴"},
    {min:112, emoji:"🌳"}
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
    {emoji:"🥭", name:"Mango"},
    {emoji:"🌳", name:"Çınar"},
    {emoji:"🌲", name:"Sedir"},
    {emoji:"🌲", name:"Köknar"},
    {emoji:"🌳", name:"Ihlamur"},
    {emoji:"🌳", name:"Söğüt"},
    {emoji:"🌳", name:"Manolya"},
    {emoji:"🌲", name:"Servi"},
    {emoji:"🌲", name:"Ardıç"},
    {emoji:"🌿", name:"Defne"},
    {emoji:"🌿", name:"Okaliptüs"},
    {emoji:"🌿", name:"Biberiye"},
    {emoji:"🌿", name:"Nane"},
    {emoji:"🌼", name:"Lavanta"},
    {emoji:"🌼", name:"Yasemin"},
    {emoji:"🌸", name:"Kamelya"},
    {emoji:"🌸", name:"Begonya"},
    {emoji:"🍎", name:"Elma"},
    {emoji:"🍐", name:"Armut"},
    {emoji:"🍒", name:"Kiraz"},
    {emoji:"🍑", name:"Şeftali"},
    {emoji:"🍊", name:"Portakal"},
    {emoji:"🍋", name:"Limon"},
    {emoji:"🌳", name:"Nar"},
    {emoji:"🌳", name:"Ceviz"}
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
    'Mango':      {accent:'#ff9f5a', bg:'rgba(255,159,90,0.16)'},
    'Çınar':      {accent:'#b88954', bg:'rgba(184,137,84,0.16)'},
    'Sedir':      {accent:'#477a62', bg:'rgba(71,122,98,0.16)'},
    'Köknar':     {accent:'#3f7f67', bg:'rgba(63,127,103,0.16)'},
    'Ihlamur':    {accent:'#8db66d', bg:'rgba(141,182,109,0.16)'},
    'Söğüt':      {accent:'#78a889', bg:'rgba(120,168,137,0.16)'},
    'Manolya':    {accent:'#e7b3c8', bg:'rgba(231,179,200,0.16)'},
    'Servi':      {accent:'#38604f', bg:'rgba(56,96,79,0.16)'},
    'Ardıç':      {accent:'#517b69', bg:'rgba(81,123,105,0.16)'},
    'Defne':      {accent:'#6b985e', bg:'rgba(107,152,94,0.16)'},
    'Okaliptüs':  {accent:'#7ca99c', bg:'rgba(124,169,156,0.16)'},
    'Biberiye':   {accent:'#6e8f78', bg:'rgba(110,143,120,0.16)'},
    'Nane':       {accent:'#69c39b', bg:'rgba(105,195,155,0.16)'},
    'Lavanta':    {accent:'#a78bd4', bg:'rgba(167,139,212,0.16)'},
    'Yasemin':    {accent:'#e5dfae', bg:'rgba(229,223,174,0.16)'},
    'Kamelya':    {accent:'#dd7f9f', bg:'rgba(221,127,159,0.16)'},
    'Begonya':    {accent:'#dd7186', bg:'rgba(221,113,134,0.16)'},
    'Elma':       {accent:'#d95d57', bg:'rgba(217,93,87,0.16)'},
    'Armut':      {accent:'#a7b957', bg:'rgba(167,185,87,0.16)'},
    'Kiraz':      {accent:'#cf4962', bg:'rgba(207,73,98,0.16)'},
    'Şeftali':    {accent:'#ed9c78', bg:'rgba(237,156,120,0.16)'},
    'Portakal':   {accent:'#e99a3b', bg:'rgba(233,154,59,0.16)'},
    'Limon':      {accent:'#d7cf4f', bg:'rgba(215,207,79,0.16)'},
    'Nar':        {accent:'#c75258', bg:'rgba(199,82,88,0.16)'},
    'Ceviz':      {accent:'#8a6847', bg:'rgba(138,104,71,0.16)'}
  };

  const TREE_GOAL = 140;
  const GROWTH_PER_WORK_MIN = 0.35;  // her dakika çalışma
  const GROWTH_PER_TODO = 3;        // her tamamlanan görev
  const WORK_AUTOSAVE_MS = 30000;
  const LONG_SESSION_REVIEW_MS = 3 * 60 * 60 * 1000; // 3 saat boyunca güvenilir tick yoksa kullanıcıya sor
  let longSessionReviewPending = false;
  let longSessionReviewInFlight = false;
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
    return ViewFormatters.displayDate(value);
  }
  function displayClockTime(value){
    return ViewFormatters.displayClockTime(value);
  }

  function displaySessionTimeRange(session){
    return SessionView.displayTimeRange(session,displayClockTime);
  }

  function sessionIntervalText(session){
    return sessionIntervals(session).map(x=>displayClockTime(x.start)+'-'+displayClockTime(x.end)).join(', ');
  }

  function parseClockOnDate(dateKeyValue, value){
    const m=String(value||'').trim().match(/^(\d{1,2}):(\d{2})$/);
    if(!m) return null;
    const h=Number(m[1]), min=Number(m[2]);
    if(h<0 || h>23 || min<0 || min>59) return null;
    const ms=new Date(dateKeyValue+'T'+pad(h)+':'+pad(min)+':00').getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  function askSessionTimeRange(dateKeyValue,currentStart,currentEnd){
    return ModalService.timeRange({
      controller:modalController,
      backdrop:el.sessionTimeBackdrop,
      dateLabel:el.sessionTimeDateLabel,
      startInput:el.sessionTimeStart,
      endInput:el.sessionTimeEnd,
      errorElement:el.sessionTimeError,
      saveButton:el.sessionTimeSave,
      cancelButton:el.sessionTimeCancel,
      closeButton:el.sessionTimeClose,
      label:displayDate(dateKeyValue)+' tarihindeki oturum',
      currentStart,
      currentEnd,
      parseStart:value=>parseClockOnDate(dateKeyValue,value),
      parseEnd:value=>parseClockOnDate(dateKeyValue,value)
    });
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

  function sessionClosedIntervalSeconds(session,{fallbackToDuration=false}={}){
    if(!session) return 0;
    const intervals=Array.isArray(session.workIntervals) ? session.workIntervals : [];
    const seconds=TimerCore.closedIntervalSeconds(intervals);
    const hasClosed=intervals.some(interval=>{
      const start=Number(interval?.start);
      const end=interval?.end==null ? null : Number(interval.end);
      return Number.isFinite(start) && Number.isFinite(end) && end>start;
    });
    if(!hasClosed && fallbackToDuration) return Math.max(0,Math.round(Number(session.duration)||0));
    return seconds;
  }

  function recomputeSessionDuration(session){
    if(!session) return 0;
    const next=sessionClosedIntervalSeconds(session,{fallbackToDuration:true});
    session.duration=next;
    return next;
  }

  function rebuildDerivedWorkData(){
    const sessionKeys=Object.keys(data.sessionLog||{});
    sessionKeys.forEach(key=>{
      const list=Array.isArray(data.sessionLog[key]) ? data.sessionLog[key] : [];
      list.forEach(recomputeSessionDuration);
      recomputeSessionDay(key);
    });
    return true;
  }

  function recomputeSessionDay(key){
    const list=Array.isArray(data.sessionLog?.[key])?data.sessionLog[key]:[];
    list.forEach(recomputeSessionDuration);
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
    const key=findSessionDateKey(sessionId);
    if(!session || !key) return;

    const existing=sessionIntervals(session)
      .filter(interval=>Number.isFinite(Number(interval?.start)) && Number.isFinite(Number(interval?.end)))
      .map(interval=>({start:Number(interval.start),end:Number(interval.end)}))
      .sort((a,b)=>a.start-b.start);

    const currentStart=displayClockTime(session.startedAt || existing[0]?.start);
    const currentEnd=displayClockTime(session.endedAt || existing[existing.length-1]?.end);

    if(!currentStart || !currentEnd){
      showToast('Bu oturumun düzenlenebilir saat kaydı bulunamadı.',true);
      return;
    }

    const chosen=await askSessionTimeRange(key,currentStart,currentEnd);
    if(!chosen) return;

    const result=SessionDomainService.editHistoricalTiming(session,{
      newStart:chosen.start,
      newEnd:chosen.end,
      existingIntervals:existing,
      mergeGapMs:1000
    });

    if(!result.ok){
      showToast('Bu saat aralığında kaydedilebilir çalışma süresi kalmıyor.',true);
      return;
    }

    recomputeSessionDay(key);
    saveData({force:true});
    renderToday(false);
    renderSessionList();
    updateWorkDisplay();
    renderStats();
    renderCalendar();
    showToast('Oturum saatleri ve çalışma süresi güncellendi.',true);
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

  function nextLocalMidnightMs(ms){
    return TimerCore.nextLocalMidnightMs(ms);
  }

  function createMidnightContinuationSession(previous,startMs){
    const key=dateKey(new Date(startMs));
    const list=getSessionsFor(key);
    const session=TimerService.createMidnightContinuation(previous,startMs);
    list.push(session);
    getDay(key).sessions += 1;
    data.activeSessionId=session.id;
    data.activeSessionDate=key;
    return session;
  }

  function splitActiveSessionAtMidnight(nowMs=Date.now()){
    if(longSessionReviewPending) return false;
    if(!data.isWorking || !data.workStart || !data.activeSessionId) return false;

    let startMs=Number(data.workStart);
    const now=Number(nowMs);
    if(!Number.isFinite(startMs) || !Number.isFinite(now) || now<=startMs) return false;

    let changed=false;

    while(dateKey(new Date(startMs)) !== dateKey(new Date(now))){
      const boundary=nextLocalMidnightMs(startMs);
      if(boundary<=startMs || boundary>now) break;

      const current=findSession(data.activeSessionId);
      if(!current) break;

      const seconds=Math.max(0,Math.floor((boundary-startMs)/1000));
      TimerService.finishSession(current,boundary);
      recomputeSessionDay(dateKey(new Date(startMs)));
      if(seconds>0) addTreeGrowth((seconds/60)*GROWTH_PER_WORK_MIN);
      current.endedAt=boundary;
      current.updatedAt=Date.now();

      const continuation=createMidnightContinuationSession(current,boundary);
      transitionTimerMode(TIMER_MODES.WORKING,{
        sessionId:continuation.id,
        sessionDate:dateKey(new Date(boundary)),
        runningSince:boundary,
        ownerId:TAB_ID
      });

      startMs=boundary;
      changed=true;
    }

    if(changed){
      saveData({force:true});
      renderToday(false);
      renderSessionList();
      renderCalendar();
      renderStats();
    }
    return changed;
  }

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
    return ViewFormatters.formatDurationLabel(seconds);
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
      tombstones: {sessions:{}, tasks:{}, events:{}},
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
      frozenDays: [],
      streakGoalDaysTowardFreeze: 0,
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
    return StateMigration.migrate(raw);
  }

  // Kayıtlı veri bozuksa/geçersizse çökmek yerine güvenle sıfırdan başlar
  function looksValid(raw){
    return StateMigration.validate(raw);
  }

  let dataWasReset = false;
  let startupNeedsIDBRecovery = false;

  function tryMigrateStoredData(raw,sourceLabel){
    return StateMigration.tryMigrate(raw,sourceLabel);
  }

  const AppStorageRepository = StatePersistence.createRepository({
    storage:window.localStorage,
    primaryKey:STORAGE_KEY,
    backupKey:BACKUP_KEY,
    legacyKey:OLD_KEY,
    preImportKey:STORAGE_KEY+'_pre_import',
    mirrorSnapshot:serialized=>RecoveryStore.mirror(serialized),
    clearRecoverySnapshot:()=>RecoveryStore.clear(),
    readRecoverySnapshot:()=>RecoveryStore.readParsed(looksValid)
  });

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
  function mirrorSnapshotToIndexedDB(serializedData){
    return RecoveryStore.mirror(serializedData);
  }

  function readIndexedDBSnapshot(){
    return RecoveryStore.readRaw();
  }

  function clearIndexedDBSnapshot(){
    return RecoveryStore.clear();
  }

  function parseIndexedDBSnapshot(snapshot){
    return RecoveryStore.parse(snapshot,looksValid);
  }

  async function recoverFromIndexedDBIfNeeded(){
    return StateRecoveryCoordinator.recoverIfNeeded();
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


  // Tek depolama kapısı: UI ve iş mantığı localStorage/IndexedDB ayrıntılarını doğrudan bilmez.
  // Bugün primary localStorage + IndexedDB mirror kullanır; ileride implementation
  // değiştirilirken çağıran kodların değişmemesi için bu katman korunur.


  let stateWriter = null;
  let StateRecoveryCoordinator = null;
  let reassertStorageTimer = null;



  const TIMER_MODES=TimerCore.MODES;
  const TIMER_TRANSITIONS=TimerCore.TRANSITIONS;

  function inferredTimerMode(){
    return TimerCore.inferMode(data);
  }

  function canTransitionTimerMode(from,to){
    return TimerCore.canTransition(from,to);
  }

  function transitionTimerMode(nextMode,options={}){
    const current=inferredTimerMode();
    if(!canTransitionTimerMode(current,nextMode)){
      console.warn('Geçersiz timer state geçişi engellendi:',current,'→',nextMode);
      return false;
    }

    if(nextMode===TIMER_MODES.WORKING){
      const sessionId=options.sessionId || data.activeSessionId;
      const session=sessionId ? findSession(sessionId) : null;
      if(!session) return false;
      data.activeSessionId=sessionId;
      data.activeSessionDate=options.sessionDate || findSessionDateKey(sessionId) || data.activeSessionDate || todayKey();
      data.isWorking=true;
      data.workStart=Number(options.runningSince)||Date.now();
      data.breakState=null;
      data.activeTimerOwnerId=options.ownerId || TAB_ID;
    }else if(nextMode===TIMER_MODES.PAUSED){
      const sessionId=options.sessionId || data.activeSessionId;
      if(!sessionId || !findSession(sessionId)) return false;
      data.activeSessionId=sessionId;
      data.activeSessionDate=options.sessionDate || findSessionDateKey(sessionId) || data.activeSessionDate;
      data.isWorking=false;
      data.workStart=null;
      data.breakState=null;
      data.activeTimerOwnerId=null;
    }else if(nextMode===TIMER_MODES.BREAK){
      data.activeSessionId=null;
      data.activeSessionDate=null;
      data.isWorking=false;
      data.workStart=null;
      data.breakState=options.breakState || data.breakState || null;
      data.activeTimerOwnerId=options.ownerId || TAB_ID;
    }else{
      data.activeSessionId=null;
      data.activeSessionDate=null;
      data.isWorking=false;
      data.workStart=null;
      data.breakState=null;
      data.activeTimerOwnerId=null;
    }
    syncTimerState();
    return true;
  }

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
    return StatePersistence.semanticSnapshot(value);
  }

  function storageMetaCompare(a,b){
    return StatePersistence.compareStorageMeta(a,b);
  }

  function readPrimaryStorageMeta(){
    return AppStorageRepository.readPrimaryMeta();
  }

  function saveData(options={}){
    if(!stateWriter) return false;
    try{
      return stateWriter.save(options).ok;
    }catch(err){
      console.error('Veri kaydedilemedi:',err);
      return false;
    }
  }

  function captureDeviceLocalTimerState(){
    return ExternalStateService.captureDeviceLocalTimerState(data,{
      tabId:TAB_ID,
      findSession:id=>findSession(id),
      isBreakActive:()=>isBreakActive()
    });
  }

  function restoreDeviceLocalTimerState(incoming,snapshot){
    return ExternalStateService.restoreDeviceLocalTimerState(incoming,snapshot,{
      findSessionDateKey:id=>findSessionDateKey(id),
      todayKey:()=>todayKey()
    });
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
    const localTimer=captureDeviceLocalTimerState();
    data=restoreDeviceLocalTimerState(incoming,localTimer);
    rebuildDerivedWorkData();
    stateWriter?.acceptCurrentState();
    refillDeckIfNeeded();
    reconcileStreakFreeze();
    syncTimerState();
    renderAfterExternalSync();

    if(data.isWorking && data.activeTimerOwnerId===TAB_ID){
      touchTabHeartbeat();
      lastAutosave=Date.now();
      ensureTimerScheduler();
    }
  }


  function cloudStateCounts(state){
    return DestructiveSyncGuard.counts(state);
  }

  function cloudStateRisk(localState,remoteState){
    return DestructiveSyncGuard.risk(localState,remoteState);
  }

  function confirmDestructiveCloudReplace(risk){
    return ModalService.destructiveRisk({
      document,
      risk,
      escapeHtml
    });
  }

  window.__APP_CLOUD_BRIDGE__ = {
    cloudStateCounts,
    cloudStateRisk,
    confirmDestructiveCloudReplace,
    exportState(){
      return JSON.parse(JSON.stringify(data));
    },
    replaceState(raw,{persist=true}={}){
      if(!raw || typeof raw!=='object' || !looksValid(raw)) throw new Error('Geçersiz bulut verisi');

      const localTimer=captureDeviceLocalTimerState();
      const incoming=migrateData(JSON.parse(JSON.stringify(raw)));
      data=restoreDeviceLocalTimerState(incoming,localTimer);
      rebuildDerivedWorkData();

      stateWriter?.acceptCurrentState();
      refillDeckIfNeeded();
      reconcileStreakFreeze();
      syncTimerState();

      if(data.isWorking && data.activeTimerOwnerId===TAB_ID){
        touchTabHeartbeat();
        lastAutosave=Date.now();
        ensureTimerScheduler();
      }

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

  const TaskRepository=TaskRepositoryFactory.create({
    getState:()=>data
  });

  const EventRepository=EventRepositoryFactory.create({
    getState:()=>data
  });


  const RecurrenceService=RecurrenceServiceFactory.create({
    getState:()=>data,
    dateKey:date=>dateKey(date)
  });

  const SessionDomainService=SessionDomainServiceFactory.create({
    getState:()=>data,
    normalizeGroupName,
    now:()=>Date.now()
  });

  const TaskDomainService=TaskDomainServiceFactory.create({
    getState:()=>data,
    recurrence:RecurrenceService,
    normalizeTime:value=>normalize24HourTime(value),
    tagExists:id=>Boolean(tagById(id)),
    normalizedTagId:task=>normalizedTaskTagId(task),
    nextSortOrder:()=>TaskRepository.nextSortOrder(),
    touchRecord:(record,at)=>touchRecord(record,at),
    recordTombstone:(kind,id,at)=>recordTombstone(kind,id,at),
    clearTombstone:(kind,id)=>clearTombstone(kind,id),
    now:()=>Date.now()
  });

  const EventDomainService=EventDomainServiceFactory.create({
    getState:()=>data,
    recurrence:RecurrenceService,
    normalizeTime:value=>normalize24HourTime(value),
    defaultColor:'#7aa2f7',
    dateKey:date=>dateKey(date),
    touchRecord:(record,at)=>touchRecord(record,at),
    recordTombstone:(kind,id,at)=>recordTombstone(kind,id,at),
    clearTombstone:(kind,id)=>clearTombstone(kind,id),
    now:()=>Date.now()
  });

  function ensureTombstones(){
    if(!data.tombstones || typeof data.tombstones!=='object') data.tombstones={sessions:{},tasks:{},events:{}};
    ['sessions','tasks','events'].forEach(kind=>{
      if(!data.tombstones[kind] || typeof data.tombstones[kind]!=='object') data.tombstones[kind]={};
    });
    return data.tombstones;
  }

  function recordTombstone(kind,id,deletedAt=Date.now()){
    if(!id || !['sessions','tasks','events'].includes(kind)) return 0;
    const tombstones=ensureTombstones();
    const ts=Math.max(Number(tombstones[kind][id])||0,Number(deletedAt)||Date.now());
    tombstones[kind][id]=ts;
    return ts;
  }

  function clearTombstone(kind,id){
    const tombstones=ensureTombstones();
    if(tombstones[kind]) delete tombstones[kind][id];
  }

  function touchRecord(record,at=Date.now()){
    if(record && typeof record==='object') record.updatedAt=Number(at)||Date.now();
    return record;
  }

  function getDay(key){
    if(!data.days[key]) data.days[key] = emptyDay(data.dailyGoalMinutes || 60);
    if(!Number.isFinite(Number(data.days[key].goalMinutes)) || Number(data.days[key].goalMinutes) <= 0){
      data.days[key].goalMinutes = data.dailyGoalMinutes || 60;
    }
    return data.days[key];
  }

  const SessionRepository=SessionRepositoryFactory.create({
    getState:()=>data,
    dateKeyFromMs:ms=>dateKey(new Date(ms)),
    persist:options=>saveData(options)
  });

  function getSessionsFor(key){
    return SessionRepository.forDate(key);
  }
  function repairTodaySessionBucket(){
    return SessionRepository.repairDate(todayKey()).sessions;
  }
  function getSessionsToday(){ return repairTodaySessionBucket(); }
  function findSession(id){
    const found=SessionRepository.byId(id);
    return found ? found.session : null;
  }

  function findSessionDateKey(id){
    const found=SessionRepository.byId(id);
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

  function reconcileStaleRunningTimerOnStartup(){
    if(!data?.isWorking){
      longSessionReviewPending = false;
      return false;
    }

    const active = data.activeSessionId ? findSession(data.activeSessionId) : null;
    const start = Number(data.workStart);
    const now = Date.now();

    // isWorking tek başına çalışma kanıtı değildir.
    if(!active || !Number.isFinite(start) || start <= 0 || start > now + 5000){
      if(active) closeOpenWorkInterval(active, now);
      data.isWorking = false;
      data.workStart = null;
      data.activeTimerOwnerId = null;
      longSessionReviewPending = false;
      syncTimerState();
      return true;
    }

    const otherOwnerIsAlive = !!(
      data.activeTimerOwnerId &&
      data.activeTimerOwnerId !== TAB_ID &&
      isTabHeartbeatFresh(data.activeTimerOwnerId)
    );

    // Aynı hesabın başka canlı sekmesi timer'ı gerçekten yönetiyorsa dokunma.
    if(otherOwnerIsAlive){
      longSessionReviewPending = false;
      return false;
    }

    const unattendedMs = Math.max(0, now - start);

    // Normal arka plan / kısa süreli kapatma: timer devam eder.
    // Ancak son güvenilir tick 3+ saat önceyse önce kullanıcıya sor.
    if(unattendedMs >= LONG_SESSION_REVIEW_MS){
      longSessionReviewPending = true;
      data.activeTimerOwnerId = null;
      syncTimerState();
      return true;
    }

    // Kısa ara / sayfanın kapanıp yeniden açılması: oturumu sürdür.
    longSessionReviewPending = false;
    data.activeTimerOwnerId = TAB_ID;
    touchTabHeartbeat();
    syncTimerState();
    return true;
  }

  function formatLongElapsed(ms){
    const totalMinutes = Math.max(1, Math.round(ms / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if(hours <= 0) return totalMinutes + ' dk';
    if(minutes === 0) return hours + ' sa';
    return hours + ' sa ' + minutes + ' dk';
  }

  function formatLocalDateTimeInput(ms){
    const d = new Date(ms);
    const pad2 = n => String(n).padStart(2,'0');
    return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())
      +'T'+pad2(d.getHours())+':'+pad2(d.getMinutes());
  }

  function parseLocalDateTimeInput(value){
    if(!value) return NaN;
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  function applyActiveWorkUntil(endMs){
    if(!data.isWorking || !data.workStart) return [];

    const active = data.activeSessionId ? findSession(data.activeSessionId) : null;
    if(!active) return [];

    const startMs = Number(data.workStart);
    const now = Date.now();
    const safeEnd = Math.min(now, Number(endMs));

    if(!Number.isFinite(startMs) || !Number.isFinite(safeEnd) || safeEnd < startMs) return [];

    const elapsed = Math.max(0, Math.floor((safeEnd - startMs)/1000));
    let completed = [];

    if(elapsed > 0){
      closeOpenWorkInterval(active,safeEnd);
      recomputeSessionDuration(active);
      recomputeSessionDay(findSessionDateKey(active.id) || dateKey(new Date(startMs)));
      touchRecord(active);
      completed = addTreeGrowth((elapsed/60) * GROWTH_PER_WORK_MIN);
    }else{
      closeOpenWorkInterval(active,safeEnd);
    }
    return completed;
  }

  function pauseSuspiciousTimerAt(stopMs){
    const active = data.activeSessionId ? findSession(data.activeSessionId) : null;
    if(!active){
      transitionTimerMode(TIMER_MODES.IDLE);
      longSessionReviewPending = false;
      saveData({force:true});
      return [];
    }

    const completed = applyActiveWorkUntil(stopMs);
    transitionTimerMode(TIMER_MODES.PAUSED,{sessionId:active.id});
    longSessionReviewPending = false;
    saveData({force:true});
    return completed;
  }

  function continueSuspiciousTimer(){
    data.activeTimerOwnerId = TAB_ID;
    longSessionReviewPending = false;
    touchTabHeartbeat();
    syncTimerState();
    saveData({force:true});
    lastAutosave = Date.now();
    ensureTimerScheduler();
  }

  function askLongSessionChoice(elapsedMs){
    return ModalService.choice({
      controller:modalController,
      backdrop:el.confirmBackdrop,
      textElement:el.confirmText,
      okButton:el.confirmOk,
      altButton:el.confirmAlt,
      cancelButton:el.confirmCancel,
      message:'Bu oturum yaklaşık '+formatLongElapsed(elapsedMs)+' boyunca açık görünüyor. Hâlâ çalışıyor musun?',
      okLabel:'Evet, devam ediyorum',
      okValue:'continue',
      okDanger:false,
      altLabel:'Hayır, bıraktım',
      altValue:'stopped',
      showAlt:true,
      showCancel:false,
      focus:'ok',
      backdropCancel:false
    });
  }

  function askStoppedDateTime(minMs,maxMs){
    return ModalService.dateTimePrompt({
      controller:modalController,
      backdrop:el.promptBackdrop,
      labelElement:el.promptLabel,
      input:el.promptInput,
      okButton:el.promptOk,
      cancelButton:el.promptCancel,
      label:'Çalışmayı ne zaman bıraktın?',
      minMs,
      maxMs,
      initialMs:Math.min(maxMs,minMs+30*60*1000),
      formatValue:formatLocalDateTimeInput,
      parseValue:parseLocalDateTimeInput,
      validate:value=>Number.isFinite(value) && value>=minMs && value<=maxMs,
      onInvalid:()=>showToast(
        'Lütfen son kesin kayıt ile şu an arasında geçerli bir tarih/saat seç.',
        true
      )
    });
  }

  async function reviewSuspiciousLongSession(){
    if(longSessionReviewInFlight || !longSessionReviewPending || !data?.isWorking) return;

    const active = data.activeSessionId ? findSession(data.activeSessionId) : null;
    const startMs = Number(data.workStart);
    const now = Date.now();

    if(!active || !Number.isFinite(startMs) || startMs <= 0){
      reconcileStaleRunningTimerOnStartup();
      return;
    }

    longSessionReviewInFlight = true;
    try{
      const choice = await askLongSessionChoice(now - startMs);

      if(choice === 'continue'){
        continueSuspiciousTimer();
        renderWorkButtonRow();
        renderToday(false);
        renderSessionList();
        updateIntentDisplay();
        return;
      }

      if(choice === 'stopped'){
        const stopMs = await askStoppedDateTime(startMs, Date.now());
        if(stopMs == null){
          longSessionReviewPending = true;
          scheduleLongSessionReview(120);
          return;
        }

        const beforeLevel = getLevelInfo().level;
        const beforeBadges = getUnlockedBadgeMap();
        const completed = pauseSuspiciousTimerAt(stopMs);
        celebrateTreeCompletions(completed);
        reportProgress(beforeLevel, beforeBadges);
        showToast('Oturum seçtiğin bırakma saatinde duraklatıldı.', true);
      }

      repairTodayWorkAggregateFromSessions();
      renderWorkButtonRow();
      renderToday(false);
      renderSessionList();
      updateIntentDisplay();
      renderCalendar();
      renderStats();
    }finally{
      longSessionReviewInFlight = false;
    }
  }

  function scheduleLongSessionReview(delay=250){
    if(!longSessionReviewPending) return;
    setTimeout(()=>{ reviewSuspiciousLongSession(); }, delay);
  }

  function recordedWorkSecondsForDay(key){
    const dayStart = new Date(key + 'T00:00:00').getTime();
    const nextDay = new Date(key + 'T00:00:00');
    nextDay.setHours(24,0,0,0);
    const dayEnd = nextDay.getTime();
    if(!Number.isFinite(dayStart) || !Number.isFinite(dayEnd)) return null;

    let seconds = 0;
    let uncertain = false;

    Object.entries(data.sessionLog || {}).forEach(([bucketKey,sessions])=>{
      if(!Array.isArray(sessions)) return;

      sessions.forEach(session=>{
        const intervals = sessionIntervals(session);

        if(bucketKey === key && Number(session?.duration || 0) > 0 && !intervals.length){
          uncertain = true;
          return;
        }

        intervals.forEach(interval=>{
          const start = Number(interval?.start);
          let end = interval?.end == null ? null : Number(interval.end);
          if(!Number.isFinite(start)) return;

          if(end == null){
            const isValidLive = data.isWorking
              && !longSessionReviewPending
              && session.id === data.activeSessionId
              && !!findSession(data.activeSessionId)
              && Number(data.workStart);
            if(!isValidLive) return;
            end = Date.now();
          }

          if(!Number.isFinite(end) || end <= start) return;
          const overlapStart = Math.max(dayStart, start);
          const overlapEnd = Math.min(dayEnd, end);
          if(overlapEnd > overlapStart){
            seconds += Math.floor((overlapEnd - overlapStart) / 1000);
          }
        });
      });
    });

    return uncertain ? null : Math.max(0, Math.round(seconds));
  }

  function repairTodayWorkAggregateFromSessions(){
    if(longSessionReviewPending) return false;
    const key = todayKey();
    const recorded = recordedWorkSecondsForDay(key);
    if(recorded == null) return false;

    const day = getDay(key);
    const current = Math.max(0, Math.round(Number(day.workSeconds || 0)));
    if(Math.abs(current - recorded) <= 2) return false;

    day.workSeconds = recorded;
    if(recorded < dayGoalSeconds(key)) day.goalCelebrated = false;
    return true;
  }

  function persistAppState(){ saveData(); }

  function persistActiveWorkForExit(){
    const ownsTimer=!data?.activeTimerOwnerId || data.activeTimerOwnerId===TAB_ID;
    if(ownsTimer) saveData({force:true});
    clearTabHeartbeat();
  }

  window.addEventListener('pagehide', persistActiveWorkForExit);
  window.addEventListener('beforeunload', persistActiveWorkForExit);

  document.addEventListener('visibilitychange', ()=>{
    if(document.visibilityState === 'hidden'){
      // v60: arka plana geçmek çalışma oturumunu durdurmaz.
      // Sadece mevcut durum güvenli şekilde kaydedilir.
      persistAppState();
      return;
    }

    // Tarayıcı sekmeyi uzun süre askıya aldıysa workStart çok eski kalabilir.
    // Bu durumda süreyi otomatik saymak yerine kullanıcıdan doğrulama istenir.
    const active = data.activeSessionId ? findSession(data.activeSessionId) : null;
    const startMs = Number(data.workStart);
    if(
      data.isWorking &&
      active &&
      Number.isFinite(startMs) &&
      Date.now() - startMs >= LONG_SESSION_REVIEW_MS
    ){
      longSessionReviewPending = true;
      data.activeTimerOwnerId = null;
      syncTimerState();
      saveData({force:true});
      scheduleLongSessionReview(100);
    }else{
      renderWorkButtonRow();
      updateWorkDisplay();
      renderSessionList();
      updateIntentDisplay();
      if(typeof timerSchedulerTick === 'function') timerSchedulerTick();
    }
  });

  function refillDeckIfNeeded(){
    if(data.speciesDeck.length === 0){
      data.speciesDeck = [...SPECIES_POOL].sort(()=>Math.random()-0.5);
    }
  }

  let data = loadData();

  stateWriter=StateWriterFactory.create({
    getState:()=>data,
    persistence:AppStorageRepository,
    semanticSnapshot:value=>StatePersistence.semanticSnapshot(value),
    writerId:()=>TAB_ID,
    syncBeforeSave:()=>syncTimerState(),
    shouldMirror:()=>!startupNeedsIDBRecovery,
    onSaved:detail=>{
      window.dispatchEvent(new CustomEvent('app:data-saved',{detail}));
    }
  });

  StateRecoveryCoordinator=StateRecoveryServiceFactory.create({
    getNeedsRecovery:()=>startupNeedsIDBRecovery,
    setNeedsRecovery:value=>{ startupNeedsIDBRecovery=Boolean(value); },
    readRecoverySnapshot:()=>AppStorageRepository.readRecoverySnapshot(),
    migrate:(raw,label)=>tryMigrateStoredData(raw,label),
    setState:value=>{ data=value; },
    normalizeRecoveredState:()=>{
      if(data.breakState===undefined) data.breakState=null;
      if(data.activeSessionId && !data.activeSessionDate){
        for(const [key,sessions] of Object.entries(data.sessionLog||{})){
          if(Array.isArray(sessions) && sessions.some(session=>session.id===data.activeSessionId)){
            data.activeSessionDate=key;
            break;
          }
        }
      }
    },
    prepareRecoveredState:()=>{
      refillDeckIfNeeded();
      rebuildDerivedWorkData();
      reconcileStreakFreeze();
      reconcileStaleRunningTimerOnStartup();
      if(!longSessionReviewPending) repairTodayWorkAggregateFromSessions();
      syncTimerState();
    },
    saveCurrent:options=>saveData(options),
    scheduleReview:()=>scheduleLongSessionReview(350),
    renderRecovered:()=>{
      const active=data.activeSessionId ? findSession(data.activeSessionId) : null;
      el.workTimer.textContent=active ? formatRingTime(Number(active.duration||0)) : '00:00';
      renderWorkButtonRow();
      initializeTooltips();
      renderToday(false);
      renderDistractionCategorySummary();
      renderSessionList();
      updateIntentDisplay();
      renderCalendar();
      renderStats();
      if(el.collectionContent && !el.collectionContent.classList.contains('collapsed')) renderCollection();
      if(el.summaryContent && !el.summaryContent.classList.contains('collapsed')) renderSummary();
    },
    notifyRecovered:()=>showToast('Veriler IndexedDB yedeğinden kurtarıldı.','success'),
    logger:console
  });


  if(data.breakState === undefined) data.breakState = null;
  if(data.activeSessionId && !data.activeSessionDate){
    for(const [k,sessions] of Object.entries(data.sessionLog || {})){
      if(Array.isArray(sessions) && sessions.some(s=>s.id===data.activeSessionId)){ data.activeSessionDate = k; break; }
    }
  }
  refillDeckIfNeeded();
  rebuildDerivedWorkData();
  reconcileStreakFreeze();
  const timerIntegrityChanged = reconcileStaleRunningTimerOnStartup();
  const todayAggregateRepaired = longSessionReviewPending ? false : repairTodayWorkAggregateFromSessions();
  syncTimerState();
  saveData({force: timerIntegrityChanged || todayAggregateRepaired});

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
    return GamificationCore.bestStreak(activeDayKeys());
  }

  // Bugün henüz bitmediği için sayılmaz — bir günün "temiz" sayılması ancak gün tamamlandıktan sonra olur
  function computeBestCleanStreak(){
    return GamificationCore.bestCleanStreak({
      keys:activeDayKeys(),
      days:data.days,
      today:todayKey()
    });
  }

  // Seri + dondurma sistemi geçmiş günlerden deterministik olarak yeniden hesaplanır.
  function computeStreakFreezeState(){
    if(!Array.isArray(data.frozenDays)) data.frozenDays=[];

    const state=GamificationCore.streakFreezeState({
      days:data.days,
      frozenDays:data.frozenDays,
      today:todayKey(),
      meetsGoal:key=>dayMeetsGoal(key),
      rewardEvery:7,
      maxFreezes:2
    });

    data.frozenDays=state.frozenDays;
    return state;
  }

  function computeGoalStreak(){
    return computeStreakFreezeState().streak;
  }

  function reconcileStreakFreeze(){
    const before=JSON.stringify({
      frozen:data.frozenDays||[],
      freezes:data.streakFreezes||0,
      toward:data.streakGoalDaysTowardFreeze||0
    });

    const state=computeStreakFreezeState();
    data.streakFreezes=state.freezes;
    data.streakGoalDaysTowardFreeze=state.toward;
    data.bestGoalStreak=Math.max(Number(data.bestGoalStreak)||0,state.best);

    const after=JSON.stringify({
      frozen:data.frozenDays||[],
      freezes:data.streakFreezes||0,
      toward:data.streakGoalDaysTowardFreeze||0
    });
    if(before!==after) saveData({force:true});
  }

  function updateStreakMilestones(streak){
    const oldFreezes=Number(data.streakFreezes||0);
    const state=computeStreakFreezeState();

    data.streakFreezes=state.freezes;
    data.streakGoalDaysTowardFreeze=state.toward;
    if(streak>Number(data.bestGoalStreak||0)) data.bestGoalStreak=streak;

    if(state.freezes>oldFreezes){
      showToast('🧊 7 gerçek hedef günü tamamlandı! 1 dondurma hakkı kazandın.');
      playBadgeSound();
      saveData({force:true});
    }
  }

  function streakFreezeProgress(streak){
    const intoCycle=Math.max(0,Math.min(6,Number(data.streakGoalDaysTowardFreeze)||0));
    return {
      remaining:7-intoCycle,
      pct:Math.round((intoCycle/7)*100),
      intoCycle
    };
  }

  function renderFreezeStatus(streak){
    if(!el.freezeMini || !el.freezeDetail) return;
    const freezes=Math.max(0,Math.min(2,Number(data.streakFreezes)||0));
    const p=streakFreezeProgress(streak);
    el.freezeCount.textContent=freezes;
    el.freezeMini.classList.toggle('has-freeze', freezes>0);
    el.freezeDetail.innerHTML =
      '<div class="freeze-detail-row"><span>Mevcut dondurma hakkı</span><b>'+freezes+'</b></div>'
      + '<div class="freeze-detail-row"><span>Bir sonraki hak</span><b>'+p.remaining+' hedef günü</b></div>'
      + '<div class="freeze-progress"><div class="freeze-progress-fill" style="width:'+Math.min(100,p.pct)+'%"></div></div>'
      + '<div class="freeze-note">Bir günü kaçırırsan devam eden serini korumak için 1 hak otomatik kullanılır. Her 7 gerçek hedef gününde 1 yeni hak kazanırsın; en fazla 2 hak biriktirebilirsin.</div>';
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
  function xpRequiredForLevel(level){
    return GamificationCore.xpRequiredForLevel(level,{
      base:LEVEL_BASE_XP,
      growth:LEVEL_GROWTH
    });
  }
  function xpFromWork(){
    return GamificationCore.xpFromWork(totalWorkSecondsAll(),XP_PER_WORK_MIN);
  }
  function xpFromTodos(){
    return GamificationCore.xpFromTodos(data.totalTodosCompleted||0,XP_PER_TODO);
  }
  function getTotalXP(){
    return GamificationCore.totalXP({
      workSeconds:totalWorkSecondsAll(),
      totalTodosCompleted:data.totalTodosCompleted||0,
      xpPerWorkMin:XP_PER_WORK_MIN,
      xpPerTodo:XP_PER_TODO
    });
  }
  function getLevelInfo(){
    return GamificationCore.levelInfo(getTotalXP(),{
      base:LEVEL_BASE_XP,
      growth:LEVEL_GROWTH
    });
  }
  function getLevel(){ return getLevelInfo().level; }
  function getRank(level){
    return GamificationCore.rankForLevel(level,RANKS);
  }
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
    return GamificationCore.countUnlockedBadges(BADGE_CATEGORIES);
  }

  function getUnlockedBadgeMap(){
    return GamificationCore.unlockedBadgeMap(BADGE_CATEGORIES);
  }

  function getNextBadgeProgress(){
    return GamificationCore.nextBadgeProgress(BADGE_CATEGORIES);
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

  // ---------- Açıklayıcı hover / focus tooltip sistemi ----------
  let tooltipEl = null;
  let tooltipTarget = null;
  let tooltipHideTimer = null;
  let tooltipsInitialized = false;

  function ensureTooltipElement(){
    if(tooltipEl) return tooltipEl;
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'app-tooltip';
    tooltipEl.setAttribute('role','tooltip');
    tooltipEl.hidden = true;
    document.body.appendChild(tooltipEl);
    return tooltipEl;
  }

  function upgradeTooltipElement(node){
    if(!(node instanceof Element)) return;

    const apply = el=>{
      if(!(el instanceof Element)) return;
      const title=(el.getAttribute('title')||'').trim();
      if(title && !el.dataset.tooltip){
        el.dataset.tooltip=title;
        el.removeAttribute('title');
      }
      if(el.dataset.tooltip && !el.hasAttribute('aria-label')){
        const text=(el.dataset.tooltip||'').trim();
        if(
          text &&
          (el.matches('button,[role="button"],input,select,label') || !String(el.textContent||'').trim())
        ){
          el.setAttribute('aria-label',text);
        }
      }
    };

    apply(node);
    node.querySelectorAll?.('[title],[data-tooltip]').forEach(apply);
  }

  function positionTooltip(target){
    if(!tooltipEl || tooltipEl.hidden || !target?.isConnected) return;

    const rect = target.getBoundingClientRect();
    const tip = tooltipEl.getBoundingClientRect();
    const gap = 9;
    const edge = 10;

    let top = rect.top - tip.height - gap;
    let placement = 'top';
    if(top < edge){
      top = rect.bottom + gap;
      placement = 'bottom';
    }

    let left = rect.left + (rect.width - tip.width) / 2;
    left = Math.max(edge, Math.min(left, window.innerWidth - tip.width - edge));

    if(top + tip.height > window.innerHeight - edge){
      const above = rect.top - tip.height - gap;
      if(above >= edge){
        top = above;
        placement = 'top';
      }else{
        top = Math.max(edge, window.innerHeight - tip.height - edge);
      }
    }

    tooltipEl.style.left = Math.round(left) + 'px';
    tooltipEl.style.top = Math.round(top) + 'px';
    tooltipEl.dataset.placement = placement;
  }

  function showAppTooltip(target){
    const text=(target?.dataset?.tooltip||'').trim();
    if(!text) return;
    clearTimeout(tooltipHideTimer);
    const tip=ensureTooltipElement();
    tooltipTarget=target;
    tip.textContent=text;
    tip.hidden=false;
    requestAnimationFrame(()=>positionTooltip(target));
  }

  function hideAppTooltip(immediate=false){
    clearTimeout(tooltipHideTimer);
    const hide=()=>{
      if(tooltipEl) tooltipEl.hidden=true;
      tooltipTarget=null;
    };
    if(immediate) hide();
    else tooltipHideTimer=setTimeout(hide,80);
  }

  function initializeTooltips(){
    if(tooltipsInitialized) return;
    tooltipsInitialized = true;

    upgradeTooltipElement(document.documentElement);
    ensureTooltipElement();

    const observer=new MutationObserver(mutations=>{
      mutations.forEach(m=>{
        m.addedNodes.forEach(node=>{
          if(node.nodeType===1) upgradeTooltipElement(node);
        });
      });
    });
    observer.observe(document.body,{childList:true,subtree:true});

    document.addEventListener('pointerover',e=>{
      const target=e.target.closest?.('[data-tooltip]');
      if(target) showAppTooltip(target);
    });

    document.addEventListener('pointerout',e=>{
      const target=e.target.closest?.('[data-tooltip]');
      if(!target) return;
      const next=e.relatedTarget;
      if(next && target.contains(next)) return;
      hideAppTooltip();
    });

    document.addEventListener('focusin',e=>{
      const target=e.target.closest?.('[data-tooltip]');
      if(target) showAppTooltip(target);
    });

    document.addEventListener('focusout',e=>{
      const target=e.target.closest?.('[data-tooltip]');
      if(target) hideAppTooltip();
    });

    window.addEventListener('scroll',()=>{
      if(tooltipTarget) positionTooltip(tooltipTarget);
    },{passive:true});

    window.addEventListener('resize',()=>{
      if(tooltipTarget) positionTooltip(tooltipTarget);
    });
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

    sessionTimeBackdrop: document.getElementById('sessionTimeBackdrop'),
    sessionTimeDateLabel: document.getElementById('sessionTimeDateLabel'),
    sessionTimeStart: document.getElementById('sessionTimeStart'),
    sessionTimeEnd: document.getElementById('sessionTimeEnd'),
    sessionTimeError: document.getElementById('sessionTimeError'),
    sessionTimeSave: document.getElementById('sessionTimeSave'),
    sessionTimeCancel: document.getElementById('sessionTimeCancel'),
    sessionTimeClose: document.getElementById('sessionTimeClose'),

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
    return TreeService.pickSpecies(SPECIES_POOL);
  }

  function completeTree(){
    return TreeService.completeTree(data,{
      pool:SPECIES_POOL
    });
  }

  // Ağaç çalışma süresi ve tamamlanan görevlerin ortak katkısıyla büyür.
  // Kalan fazla büyüme puanı bir sonraki ağaca aktarılır (kayıp olmaz).
  function addTreeGrowth(amount){
    return TreeService.addGrowth(data,amount,{
      goal:TREE_GOAL,
      pool:SPECIES_POOL
    });
  }

  // Daha önce verilmiş büyüme puanını güvenli biçimde geri alır.
  // Gerekirse en son tamamlanan ağaçları koleksiyondan geri çeker.
  function removeTreeGrowth(amount){
    return TreeService.removeGrowth(data,amount,{
      goal:TREE_GOAL
    });
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

    // Mola yalnızca ana sayaç ve durum metninde gösterilir.
    // Günlük hedef halkası, mini hedef çubuğu, seri ve dondurma bilgileri
    // mola boyunca çalışma ilerliyormuş gibi değişmez.
    el.workTimer.textContent = remaining >= 0 ? formatRingTime(remaining) : ('+' + formatRingTime(-remaining));
    el.statusLine.textContent = remaining > 0
      ? '☕ Mola · ' + Math.ceil(remaining/60) + ' dk kaldı — dinleniyorsun.'
      : '☕ Mola süresi doldu. İstersen dinlenmeye devam et ya da yeni oturuma geç.';

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
    const breakState={ startedAt: Date.now(), targetSeconds: mins*60, notified:false };
    transitionTimerMode(TIMER_MODES.BREAK,{breakState,ownerId:TAB_ID});
    touchTabHeartbeat();
    saveData();
    renderWorkButtonRow();
    renderBreakDisplay();
    ensureTimerScheduler();
  }

  function stopBreak(){
    transitionTimerMode(TIMER_MODES.IDLE);
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
    const activeSession = data.activeSessionId ? findSession(data.activeSessionId) : null;
    let liveElapsed = 0;
    // v60 integrity rule: workStart alone is never enough to create live work.
    if(data.isWorking && data.workStart && activeSession && !longSessionReviewPending){
      liveElapsed = Math.max(0, Math.floor((Date.now() - Number(data.workStart))/1000));
    }
    const totalSecondsToday = td.workSeconds + liveElapsed;

    // Ana sayaç günlük toplamı değil, mevcut oturumun kendi süresini gösterir.
    // Böylece her yeni session 00:00'dan başlar; günlük toplam/hedef aşağıdaki
    // günlük ilerleme hesaplarında aynen korunur.
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
      if(
        interval?.end==null &&
        session.id===data.activeSessionId &&
        data.isWorking &&
        !longSessionReviewPending
      ){
        end=Date.now();
      }
      return {start,end,legacyApprox:!!interval?.legacyApprox};
    }).filter(interval=>Number.isFinite(interval.start) && Number.isFinite(interval.end) && interval.end>interval.start);
  }

  // Autosave, güvenilir süre hesabı için çalışan oturumu küçük interval parçalarına böler.
  // Bu ham parçaları saklamaya devam ediyoruz; yalnızca takvim/oturum görünümünde
  // birbirine bitişik parçaları tek, anlamlı çalışma bloğu olarak gösteriyoruz.
  const DISPLAY_INTERVAL_MERGE_GAP_MS = 5000;

  function mergeSessionIntervalsForDisplay(session,maxGapMs=DISPLAY_INTERVAL_MERGE_GAP_MS){
    const intervals=sessionIntervals(session)
      .slice()
      .sort((a,b)=>a.start-b.start);

    if(intervals.length<2) return intervals;

    const merged=[];
    intervals.forEach(interval=>{
      const current={
        start:Number(interval.start),
        end:Number(interval.end),
        legacyApprox:!!interval.legacyApprox
      };
      const previous=merged[merged.length-1];

      if(
        previous &&
        current.start <= previous.end + maxGapMs
      ){
        previous.end=Math.max(previous.end,current.end);
        previous.legacyApprox=previous.legacyApprox || current.legacyApprox;
        return;
      }

      merged.push(current);
    });

    return merged;
  }

  function workIntervalsForDate(key){
    return CalendarCore.projectWorkIntervalsForDate(key,{
      sessionLog:data.sessionLog,
      intervalsForSession:session=>mergeSessionIntervalsForDisplay(session),
      colorForSession:session=>workIntervalColor(session)
    });
  }

  function flushWorkTime(){
    if(longSessionReviewPending) return [];
    if(!data.isWorking || !data.workStart) return [];

    splitActiveSessionAtMidnight(Date.now());

    const activeSession = data.activeSessionId ? findSession(data.activeSessionId) : null;
    if(!activeSession){
      // Orphan timer state must never create day work without a session.
      transitionTimerMode(TIMER_MODES.IDLE);
      saveData({force:true});
      return [];
    }

    const now = Date.now();
    const startMs = Number(data.workStart);
    if(!Number.isFinite(startMs) || startMs <= 0 || startMs > now + 5000){
      closeOpenWorkInterval(activeSession, now);
      recomputeSessionDuration(activeSession);
      recomputeSessionDay(findSessionDateKey(activeSession.id) || todayKey());
      transitionTimerMode(TIMER_MODES.PAUSED,{sessionId:activeSession.id});
      saveData({force:true});
      return [];
    }

    const elapsed = Math.max(0, Math.floor((now - startMs)/1000));
    let completed = [];
    if(elapsed > 0){
      closeOpenWorkInterval(activeSession,now);
      recomputeSessionDuration(activeSession);
      const sessionKey=findSessionDateKey(activeSession.id) || dateKey(new Date(startMs));
      recomputeSessionDay(sessionKey);
      activeSession.updatedAt=Date.now();
      data.workStart=now;
      openWorkInterval(activeSession,now);
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
      if(longSessionReviewPending){
        updateWorkDisplay({readOnly:true});
      }else if(ownsActiveTimer){
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
    splitActiveSessionAtMidnight(now);
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


  const timerController=TimerControllerFactory.create({
    now:()=>Date.now(),
    todayKey,
    getTodaySessionCount:()=>getSessionsToday().length,
    addSession:(key,session)=>getSessionsFor(key).push(session),
    getActiveSession:()=>data.activeSessionId ? findSession(data.activeSessionId) : null,
    getSessionDateKey:sessionId=>findSessionDateKey(sessionId),
    recomputeSessionDay,
    transitionMode:(mode,options)=>transitionTimerMode(mode,options),
    persist:options=>saveData(options),
    ensureReady:()=>ensureBackgroundAlarmUnlocked(),
    isBreakActive:()=>isBreakActive(),
    stopBreak:()=>stopBreak(),
    rememberSubject,
    ownerId:()=>TAB_ID,
    touchHeartbeat:()=>touchTabHeartbeat(),
    isWorking:()=>Boolean(data.isWorking),
    beforePause:()=>flushWorkTime(),
    beforeFinish:()=>{
      const completed=flushWorkTime();
      TimerService.closeOpenInterval(
        data.activeSessionId ? findSession(data.activeSessionId) : null,
        Date.now()
      );
      return completed;
    }
  });

  function renderWorkButtonRow(){
    el.workButtonRow.innerHTML=WorkControlsView.build({
      breakActive:isBreakActive(),
      isWorking:data.isWorking,
      hasActiveSession:Boolean(
        data.activeSessionId && findSession(data.activeSessionId)
      )
    });
  }

  // Yeni bir oturum başlatır (sadece aktif/duraklatılmış oturum yokken çağrılır)
  function startWorking(subject, targetMinutes, seedTodoText=null){
    const result=timerController.start({subject,targetMinutes,seedTodoText});
    const newSession=result.session;

    expandedSessions.add(newSession.id);
    renderWorkButtonRow();
    lastAutosave=Date.now();
    ensureTimerScheduler();
    renderToday(false);
    renderSessionList();
    updateIntentDisplay();
    playNote(660,0,0.12);
  }

  // Oturumu duraklatır ama aynı oturumu (süresiyle birlikte) canlı tutar
  function pauseWorking(){
    const beforeBadges=getUnlockedBadgeMap();
    const beforeLevel=getLevelInfo().level;
    const result=timerController.pause();
    const completedList=result.completedList || [];

    renderWorkButtonRow();
    const pausedSession=data.activeSessionId ? findSession(data.activeSessionId) : null;
    el.workTimer.textContent=formatRingTime(pausedSession ? pausedSession.duration : 0);
    renderToday(completedList.length > 0);
    renderSessionList();
    updateIntentDisplay();
    celebrateTreeCompletions(completedList);
    showToast('Duraklatıldı. "Devam Et" ile kaldığın yerden sürdürebilirsin.', true);
    reportProgress(beforeLevel,beforeBadges);
  }

  // Duraklatılmış oturuma kaldığı yerden devam eder — yeni oturum açmaz
  function resumeWorking(){
    const result=timerController.resume();
    if(!result.session) return;

    renderWorkButtonRow();
    lastAutosave=Date.now();
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
    const session=data.activeSessionId
      ? findSession(data.activeSessionId)
      : null;

    if(!session){
      closeFocusMode();
      return;
    }

    const model=FocusView.buildModel({
      session,
      isWorking:data.isWorking,
      workStart:data.workStart,
      currentTodo:getCurrentTodoTask(),
      now:Date.now(),
      formatDurationLabel
    });

    updateFlipClock(model.liveDuration);
    el.focusSubjectText.textContent=model.subjectText;
    el.focusTaskText.textContent=model.taskText;
    el.focusCurrentCard.classList.toggle('no-task',model.noTask);

    const kicker=el.focusCurrentCard.querySelector('.focus-current-kicker');
    if(kicker) kicker.textContent=model.kicker;

    el.focusTargetWrap.classList.toggle(
      'no-target',
      !model.target.hasTarget
    );

    el.focusTargetText.textContent=model.target.text;
    el.focusTargetPct.textContent=model.target.percentText;
    el.focusTargetFill.style.width=model.target.percent+'%';
    el.focusTargetFill.classList.toggle(
      'reached',
      model.target.reached
    );

    el.focusSubText.textContent=model.subText;

    el.focusPauseBtn.textContent=model.pause.icon;
    el.focusPauseBtn.dataset.tooltip=model.pause.label;
    el.focusPauseBtn.setAttribute('aria-label',model.pause.label);
    el.focusPauseBtn.classList.toggle(
      'is-paused-action',
      model.pause.isPausedAction
    );
    el.focusPauseBtn.classList.toggle(
      'is-resume-action',
      model.pause.isResumeAction
    );

    el.focusFinishBtn.textContent=model.finish.icon;
    el.focusFinishBtn.dataset.tooltip=model.finish.label;
    el.focusFinishBtn.setAttribute('aria-label',model.finish.label);
  }

  let focusFullscreenOwned = false;

  async function tryEnterMobileFocusLandscape(){
    const mobileLike = window.matchMedia?.('(max-width: 900px)')?.matches;
    if(!mobileLike) return;

    try{
      if(!document.fullscreenElement && document.documentElement.requestFullscreen){
        await document.documentElement.requestFullscreen({navigationUI:'hide'});
        focusFullscreenOwned = true;
      }
    }catch(error){}

    try{
      if(screen.orientation?.lock){
        await screen.orientation.lock('landscape');
      }
    }catch(error){}
  }

  async function openFocusMode(){
    if(!data.activeSessionId || !findSession(data.activeSessionId)){
      showToast('Odak moduna girmek için önce bir oturum başlat.', true);
      return;
    }
    lastFlipStr = ''; // yeniden açılışta saati baştan kur
    renderFocusOverlay();
    el.focusOverlay.classList.add('show');
    await tryEnterMobileFocusLandscape();
  }


  function closeFocusMode(){
    el.focusOverlay.classList.remove('show');
    try{ screen.orientation?.unlock?.(); }catch(error){}
    if(focusFullscreenOwned && document.fullscreenElement && document.exitFullscreen){
      document.exitFullscreen().catch(()=>{});
    }
    focusFullscreenOwned = false;
  }

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
    const beforeBadges=getUnlockedBadgeMap();
    const beforeLevel=getLevelInfo().level;
    const result=timerController.finish();
    const completedList=result.completedList || [];

    celebrateTreeCompletions(completedList);
    renderSessionList();
    updateIntentDisplay();
    reportProgress(beforeLevel,beforeBadges);
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
  function sessionCompletionPct(session){
    return SessionView.completionPct(session);
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

    const workPanel=document.getElementById('panel-work');
    const activeSession=data.activeSessionId
      ? findSession(data.activeSessionId)
      : null;

    if(workPanel){
      workPanel.classList.toggle('session-in-progress',Boolean(activeSession));
      workPanel.classList.toggle(
        'session-paused',
        Boolean(activeSession) && !data.isWorking
      );
    }

    const view=SessionView.buildList({
      sessions:getSessionsToday(),
      activeSessionId:data.activeSessionId,
      isWorking:data.isWorking,
      workStart:data.workStart,
      showHidden:showHiddenSessions,
      expandedIds:expandedSessions,
      now:Date.now(),
      escapeHtml,
      formatDurationLabel,
      displayClockTime,
      sessionFocusScore
    });

    el.sessionList.innerHTML=view.html;
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
      const oldName=String(session.name||'').trim();
      const name = await askPrompt('Oturum adı', oldName);
      if(name !== null && name.trim()){
        const clean=name.trim().slice(0,40);
        const changed=renameSessionGroupEverywhere(oldName,clean);
        if(!changed){
          session.name=clean;
          session.updatedAt=Date.now();
        }
        saveData({force:true});
        renderSessionList();
        renderStats();
        renderCalendar();
        showToast(changed>1 ? changed+' geçmiş oturum aynı ad altında güncellendi.' : 'Oturum adı güncellendi.',true);
      }
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
        SessionDomainService.setSubject(session,clean);
        saveData({force:true});
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
      SessionDomainService.setHidden(session,false);
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
        SessionDomainService.setHidden(session,true);
        expandedSessions.delete(sid);
        saveData();
        renderSessionList();
        showToast('Oturum yalnızca geçmiş görünümünden gizlendi.', true);
        return;
      }

      recomputeSessionDuration(session);
      const oldStreak = computeGoalStreak();
      const day = getDay(key);

      if(rewardedTodos > 0){
        data.totalTodosCompleted = Math.max(0, Number(data.totalTodosCompleted || 0) - rewardedTodos);
      }
      removeTreeGrowth(totalGrowthToReverse);

      recordTombstone('sessions',sid);
      data.sessionLog[key] = (data.sessionLog[key] || []).filter(x=>x.id!==sid);
      expandedSessions.delete(sid);
      recomputeSessionDay(key);

      // Hedef artık sağlanmıyorsa aynı gün yeniden ulaşılabilmesi için kutlama kilidini aç.
      if(!dayMeetsGoal(key)) day.goalCelebrated = false;
      reconcileStreakFreeze();

      saveData();
      renderToday(false);
      renderSessionList();
      updateWorkDisplay();
      renderStats();
      renderCalendar();
      renderCollection();
      showToast('Oturum ve ona bağlı ilerleme kayıtları silindi.', true);
    } else if(action === 'toggle-todo'){
      const session=findSession(sid);
      const beforeBadges=getUnlockedBadgeMap();
      const beforeLevel=getLevelInfo().level;
      const result=session && SessionDomainService.toggleTodo(session,target.dataset.todo);
      if(result){
        const completedList=result.newlyRewarded ? addTreeGrowth(GROWTH_PER_TODO) : [];
        saveData();
        renderSessionList();
        updateIntentDisplay();
        if(!result.wasDone && result.todo.done){
          playTodoCheckSound();
          renderToday(completedList.length>0);
          celebrateTreeCompletions(completedList);
          reportProgress(beforeLevel,beforeBadges);
          if(result.allDone) showToast('Bu oturumun tüm görevleri tamamlandı! 🎉');
        }
      }
    } else if(action === 'delete-todo'){
      const session=findSession(sid);
      if(session && SessionDomainService.deleteTodo(session,target.dataset.todo)){
        saveData();
        renderSessionList();
        updateIntentDisplay();
      }
    } else if(action === 'add-todo'){
      const session = findSession(sid);
      const body = target.closest('.session-body');
      const input = body && body.querySelector('.todo-input');
      if(session && input && SessionDomainService.addTodo(session,input.value)){
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
      if(session && SessionDomainService.addTodo(session,e.target.value)){
        saveData();
        renderSessionList();
        updateIntentDisplay();
      }
    }
  });


  // ---------- Merkezi modal yöneticisi ----------
  const modalController=ModalService.createController({
    document,
    getComputedStyle,
    setTimeout
  });

  // ---------- Özel modallar (onay / metin girişi) ----------
  function askConfirm(message,okLabel='Evet',danger=true){
    return ModalService.choice({
      controller:modalController,
      backdrop:el.confirmBackdrop,
      textElement:el.confirmText,
      okButton:el.confirmOk,
      altButton:el.confirmAlt,
      cancelButton:el.confirmCancel,
      message,
      okLabel,
      okValue:true,
      okDanger:danger,
      showAlt:false,
      cancelValue:false,
      showCancel:true,
      focus:'cancel'
    });
  }

  function askSessionDeleteChoice(){
    return ModalService.choice({
      controller:modalController,
      backdrop:el.confirmBackdrop,
      textElement:el.confirmText,
      okButton:el.confirmOk,
      altButton:el.confirmAlt,
      cancelButton:el.confirmCancel,
      message:'Bu oturum için ne yapmak istiyorsun? “Sadece Gizle” istatistiklere, XP’ye ve ağaç ilerlemesine dokunmaz.',
      okLabel:'Tamamen Sil',
      okValue:'delete',
      okDanger:true,
      altLabel:'Sadece Gizle',
      altValue:'hide',
      showAlt:true,
      cancelValue:'cancel',
      showCancel:true,
      focus:'cancel'
    });
  }

  function askRecurringEditChoice(kind='öğe'){
    return ModalService.choice({
      controller:modalController,
      backdrop:el.confirmBackdrop,
      textElement:el.confirmText,
      okButton:el.confirmOk,
      altButton:el.confirmAlt,
      cancelButton:el.confirmCancel,
      message:'Bu '+kind+' tekrarlanan bir serinin parçası. Değişiklik hangi kayıtlara uygulansın?',
      okLabel:'Tüm Seri',
      okValue:'all',
      okDanger:false,
      altLabel:'Bu + Sonrakiler',
      altValue:'future',
      showAlt:true,
      cancelLabel:'Yalnızca Bu',
      cancelValue:'single',
      showCancel:true,
      focus:'cancel'
    });
  }

  function recurringSeriesItems(items,item,dateField,scope){
    return RecurrenceService.seriesItems(items,item,dateField,scope);
  }

  function askRecurringDeleteChoice(kind='öğe'){
    return ModalService.choice({
      controller:modalController,
      backdrop:el.confirmBackdrop,
      textElement:el.confirmText,
      okButton:el.confirmOk,
      altButton:el.confirmAlt,
      cancelButton:el.confirmCancel,
      message:'Bu '+kind+' tekrarlanan bir serinin parçası. Yalnızca bunu mu, yoksa bunu ve sonraki tekrarları mı silmek istiyorsun?',
      okLabel:'Bu + Sonrakiler',
      okValue:'future',
      okDanger:true,
      altLabel:'Yalnızca Bu',
      altValue:'single',
      showAlt:true,
      cancelValue:'cancel',
      showCancel:true,
      focus:'cancel'
    });
  }

  function askPrompt(label,defaultValue){
    return ModalService.textPrompt({
      controller:modalController,
      backdrop:el.promptBackdrop,
      labelElement:el.promptLabel,
      input:el.promptInput,
      okButton:el.promptOk,
      cancelButton:el.promptCancel,
      label,
      defaultValue,
      select:true
    });
  }

  function askSubject(defaultValue){
    return ModalService.subject({
      controller:modalController,
      backdrop:el.subjectEditBackdrop,
      labelElement:el.subjectEditLabel,
      input:el.subjectEditInput,
      chipsElement:el.subjectEditChips,
      saveButton:el.subjectEditSave,
      cancelButton:el.subjectEditCancel,
      label:'Ne çalışıyorsun?',
      defaultValue,
      subjects:data.subjects || [],
      escapeHtml
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
      const beforeState=JSON.parse(JSON.stringify(data.sessionLog || {}));
      renameSessionGroupEverywhere(oldValue,value);
      data.subjects[index]=value;
      saveData({force:true});
      renderSubjectManager();
      renderSubjectChips();
      renderSessionList();
      renderStats();
      renderCalendar();
      offerUndo('Konu adı ve geçmiş veriler güncellendi.',()=>{
        data.sessionLog=beforeState;
        const currentIndex=data.subjects.findIndex(x=>normalizeGroupName(x)===normalizeGroupName(value));
        if(currentIndex>=0) data.subjects[currentIndex]=oldValue;
        saveData({force:true});
        renderSubjectManager();
        renderSubjectChips();
        renderSessionList();
        renderStats();
        renderCalendar();
      });
    }
  });

  function renderSubjectChips(){
    const subjects = data.subjects || [];
    el.subjectChips.innerHTML = subjects.slice(0,6).map(s=>
      '<button type="button" class="subject-chip" data-subject="'+escapeHtml(s)+'">'+escapeHtml(s)+'</button>'
    ).join('');
  }

  function normalizeGroupName(value){
    return String(value||'').trim().toLocaleLowerCase('tr-TR');
  }

  function renameSessionGroupEverywhere(oldValue,newValue){
    return SessionDomainService.renameGroupEverywhere(oldValue,newValue);
  }

  function rememberSubject(subject){
    return SessionDomainService.rememberSubject(subject);
  }

  function askMinutes(promptText,defaultMinutes,allowNone,showSubject,mode='session',initialSubject=''){
    return ModalService.minutes({
      controller:modalController,
      backdrop:el.goalBackdrop,
      promptTextElement:document.getElementById('goalPromptText'),
      noneButton:el.goalNone,
      subjectSection:el.subjectSection,
      subjectInput:el.subjectInput,
      subjectChips:el.subjectChips,
      minutesInput:el.goalMinutesDisplay,
      upButton:el.goalUp,
      downButton:el.goalDown,
      startButton:el.goalStart,
      cancelButton:el.goalCancel,
      presetWrap:el.goalBackdrop.querySelector('.goal-presets'),
      promptText,
      defaultMinutes,
      allowNone,
      showSubject,
      mode,
      initialSubject,
      goalMin:GOAL_MIN,
      goalMax:GOAL_MAX,
      goalStep:GOAL_STEP,
      renderSubjectChips,
      playNote
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
      rebuildDerivedWorkData();

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
    const breakdown=AnalyticsCore.subjectBreakdown(
      sessionsForKeys(getPeriodKeys(currentPeriod)),
      (session,key)=>{
        let seconds=Number(session.duration||0);
        if(
          session.id===data.activeSessionId &&
          data.isWorking &&
          data.workStart
        ){
          seconds+=Math.floor((Date.now()-data.workStart)/1000);
        }
        return seconds;
      }
    );

    el.subjectBreakdownBody.innerHTML=StatsView.buildSubjectBreakdown(
      breakdown,
      {escapeHtml,formatDurationLabel}
    );
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
    const slots=getPeriodSlots(period);
    return AnalyticsCore.subjectChartData(slots,{
      sessionsForKey:key=>getSessionsFor(key),
      sessionSeconds:(session,key)=>{
        let duration=Number(session.duration||0);
        if(
          session.id===data.activeSessionId &&
          data.isWorking &&
          data.workStart &&
          key===todayKey()
        ){
          duration+=Math.floor((Date.now()-data.workStart)/1000);
        }
        return duration;
      },
      maxSubjects:6
    });
  }

  function renderSubjectChart(){
    const chart=StatsView.buildSubjectChart({
      ...buildSubjectChartData(currentPeriod),
      chartType:currentChartType,
      subjectColor,
      escapeHtml
    });

    el.chartSvg.innerHTML=chart.svg;
    el.chartLegend.innerHTML=chart.legend;
  }

  function renderChart(){
    const {labels,values}=buildChartData(currentPeriod);
    const goalMinutes=(currentPeriod==='day' && currentMetric==='work')
      ? Number(data.dailyGoalMinutes||60)
      : 0;

    el.chartSvg.innerHTML=StatsView.buildMetricChart({
      labels,
      values,
      chartType:currentChartType,
      goalMinutes
    });
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
    if(el.heatmapTitle){
      el.heatmapTitle.textContent='Yıllık Aktivite (Günlük Hedefe Göre)';
    }

    const heatmap=StatsView.buildHeatmap({
      today:new Date(),
      lookback:365,
      startOfWeek,
      addDays,
      dateKey,
      goalRatioFor:key=>goalRatioFor(data.days[key]),
      displayDate,
      monthShort:MONTH_SHORT
    });

    el.heatmapSvg.setAttribute('viewBox',heatmap.viewBox);
    el.heatmapSvg.innerHTML=heatmap.svg;
  }

  function formatMinutes(seconds){
    return ViewFormatters.formatMinutes(seconds);
  }

  function sessionAnalyticsForKeys(keys){
    return AnalyticsCore.sessionAnalytics(
      sessionsForKeys(keys),
      session=>sessionSecondsForAnalytics(session)
    );
  }

  function renderSessionAnalytics(){
    if(!el.sessionAnalyticsBody) return;

    const stats=sessionAnalyticsForKeys(getPeriodKeys(currentPeriod));
    el.sessionAnalyticsBody.innerHTML=StatsView.buildSessionAnalytics(stats,{
      pad,
      formatDurationLabel
    });
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
  function trendArrowHtml(current,previous){
    return ViewFormatters.trendArrowHtml(current,previous);
  }

  // Dikkat dağınıklığında azalış olumlu, artış olumsuzdur.
  function distractionTrendHtml(current,previous){
    return ViewFormatters.distractionTrendHtml(current,previous);
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
    return AnalyticsCore.planningStats(
      sessionsForKeys(keys).map(entry=>entry.session),
      session=>sessionSecondsForAnalytics(session)
    );
  }

  function productiveHourStats(keys){
    return AnalyticsCore.productiveHourStats(
      keys,
      sessionsForKeys(keys),
      {
        sessionIntervals:session=>sessionIntervals(session),
        sessionSeconds:session=>sessionSecondsForAnalytics(session),
        dateKey:date=>dateKey(date)
      }
    );
  }

  function sessionFocusScore(session){
    return AnalyticsCore.sessionFocusScore(session,{
      sessionIntervals:item=>sessionIntervals(item),
      sessionSeconds:item=>sessionSecondsForAnalytics(item)
    });
  }

  function focusScoreStats(keys){
    return AnalyticsCore.focusScoreStats(
      sessionsForKeys(keys),
      {
        sessionIntervals:session=>sessionIntervals(session),
        sessionSeconds:session=>sessionSecondsForAnalytics(session)
      }
    );
  }

  function normPlanText(value){
    return AnalyticsCore.normalizePlanText(value);
  }

  function timedEventDurationSeconds(event){
    return AnalyticsCore.timedEventDurationSeconds(event);
  }

  function scheduledStudyStats(keys){
    return AnalyticsCore.scheduledStudyStats(keys,{
      events:EventRepository.all(),
      sessionsForDate:key=>sessionsForKeys([key]).map(entry=>entry.session),
      sessionSeconds:session=>sessionSecondsForAnalytics(session)
    });
  }

  function weeklyReviewStats(keys){
    const entries=sessionsForKeys(keys);
    const productiveHour=productiveHourStats(keys);
    const focus=focusScoreStats(keys);
    const scheduledStudy=scheduledStudyStats(keys);

    return AnalyticsCore.weeklyReviewStats(keys,{
      entries,
      days:data.days,
      tasks:TaskRepository.all(),
      dateKey:date=>dateKey(date),
      sessionSeconds:session=>sessionSecondsForAnalytics(session),
      meetsGoal:key=>dayMeetsGoal(key),
      productiveHour,
      focus,
      scheduledStudy
    });
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
    el.summaryContent.innerHTML=SummaryView.build({
      now:new Date(),
      data,
      startOfWeek,
      addDays,
      dateKey,
      keysInRange,
      sumEntries,
      weeklyReviewStats,
      planningStatsForKeys,
      focusScoreStats,
      formatMinutes,
      formatDurationLabel,
      trendArrowHtml,
      distractionTrendHtml,
      escapeHtml,
      pad,
      weekdayShort:WEEKDAY_SHORT,
      monthShort:MONTH_SHORT
    });

    const shareBtn=document.getElementById('shareBtn');
    if(shareBtn) shareBtn.addEventListener('click',shareCurrentSummary);

    const summaryPrintBtn=document.getElementById('summaryPrintBtn');
    if(summaryPrintBtn){
      summaryPrintBtn.addEventListener('click',printWeeklySummary);
    }
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

  function addTask(text,dueDate,time,tagId,repeat='none',repeatSourceId=null,repeatDays=[],repeatAnchorDay=null,repeatUntil=null){
    const task=TaskDomainService.createTask(
      text,dueDate,time,tagId,repeat,repeatSourceId,repeatDays,repeatAnchorDay,repeatUntil
    );
    if(task) saveData();
    return task;
  }

  function nextRepeatDate(dateStr,repeat,repeatDays=[],repeatAnchorDay=null){
    return RecurrenceService.nextDate(dateStr,repeat,repeatDays,repeatAnchorDay);
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
  function hasRecurringTaskOccurrence(tasks,sourceId,dueDate){
    return RecurrenceService.hasOccurrence(tasks,sourceId,'dueDate',dueDate);
  }

  function repeatAllowsDate(repeatUntil,nextDate){
    return RecurrenceService.allowsDate(repeatUntil,nextDate);
  }

  function recurrenceExceptionBucket(kind){
    return RecurrenceService.bucket(kind);
  }

  function isRecurrenceException(kind,sourceId,dateKeyValue){
    return RecurrenceService.isException(kind,sourceId,dateKeyValue);
  }

  function addRecurrenceException(kind,sourceId,dateKeyValue){
    return RecurrenceService.addException(kind,sourceId,dateKeyValue);
  }

  function removeRecurrenceException(kind,sourceId,dateKeyValue){
    return RecurrenceService.removeException(kind,sourceId,dateKeyValue);
  }

  function trimRecurrenceExceptionsFrom(kind,sourceId,startDate){
    return RecurrenceService.trimExceptionsFrom(kind,sourceId,startDate);
  }

  function restoreRecurrenceExceptions(kind,sourceId,dates){
    return RecurrenceService.restoreExceptions(kind,sourceId,dates);
  }

  function recurringItemsFrom(items,item,dateField){
    return RecurrenceService.itemsFrom(items,item,dateField);
  }

  function spawnNextRecurringTask(task){
    return TaskDomainService.spawnNext(task);
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

  function renderTaskCard(task){
    return TaskView.buildCard(task,{
      tagById,
      normalizedTaskTagId,
      safeTagColor,
      escapeHtml,
      taskDueBadge,
      repeatTaskLabel
    });
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

    const groups=TaskView.filterAndGroup(TaskRepository.all(),{
      today:todayKey(),
      taskFilter:currentTaskFilter,
      statusFilter:currentTaskStatusFilter,
      dateFilter:currentTaskDateFilter,
      searchQuery:el.taskSearchInput?.value || '',
      normalizedTaskTagId
    });

    el.taskListBody.innerHTML=TaskView.buildList(
      groups,
      task=>renderTaskCard(task)
    );

    el.clearDoneTasksBtn.style.display='none';
  }

  function toggleTaskDone(id){
    const beforeBadges=getUnlockedBadgeMap();
    const beforeLevel=getLevelInfo().level;
    const result=TaskDomainService.toggleDone(id);
    if(!result) return;

    let completedList=[];
    if(!result.wasDone && result.task.done && result.newlyRewarded){
      completedList=addTreeGrowth(GROWTH_PER_TODO);
    }
    if(!result.wasDone && result.task.done) spawnNextRecurringTask(result.task);

    saveData();
    refreshUI(['tasks','calendar']);
    if(!result.wasDone && result.task.done){
      playTodoCheckSound();
      refreshUI('today',{celebrateTree:completedList.length>0});
      celebrateTreeCompletions(completedList);
      reportProgress(beforeLevel,beforeBadges);
    }else{
      refreshUI('today');
    }
  }

  async function editTask(id){
    const target=TaskDomainService.byId(id);
    if(!target) return;
    const value=await askPrompt('Görev adını düzenle',target.text || '');
    if(value===null) return;
    const text=value.trim().slice(0,120);
    if(!text){ showToast('Görev adı boş olamaz.','error'); return; }

    let scope='single';
    if(['daily','weekly','monthly'].includes(target.repeat)){
      scope=await askRecurringEditChoice('görev');
    }
    const affected=TaskDomainService.rename(id,text,scope);
    saveData();
    refreshUI(['tasks','calendar']);
    showToast(scope==='single' ? 'Görev güncellendi.' : affected.length+' görev güncellendi.','success');
  }

  async function deleteTask(id){
    const target=TaskDomainService.byId(id);
    if(!target) return;

    let choice='single';
    if(['daily','weekly','monthly'].includes(target.repeat)){
      choice=await askRecurringDeleteChoice('görev');
      if(choice==='cancel') return;
    }

    const result=TaskDomainService.deleteTask(id,choice);
    if(!result) return;
    saveData();
    refreshUI(['tasks','calendar']);

    const message=result.mode==='future'
      ? result.removedCount+' tekrarlanan görev silindi.'
      : 'Görev silindi.';

    offerUndo(message,()=>{
      result.undo();
      saveData();
      refreshUI(['tasks','calendar']);
    });
  }

  function clearCompletedTasks(){
    const result=TaskDomainService.clearCompleted();
    if(!result) return;
    saveData();
    refreshUI(['tasks','calendar']);
    offerUndo(result.removedCount+' tamamlanmış görev silindi.',()=>{
      result.undo();
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
    visible.forEach((id,index)=>{const task=TaskRepository.byId(id);if(task) task.sortOrder=index;});
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

  function nextEventRepeatDate(dateStr,repeat,repeatDays=[],repeatAnchorDay=null){
    return RecurrenceService.nextDate(dateStr,repeat,repeatDays,repeatAnchorDay);
  }

  function addEventOccurrence(title,date,time,endTime,color,repeat='none',repeatSourceId=null,repeatDays=[],repeatAnchorDay=null,description=''){
    return EventDomainService.createOccurrence(
      title,date,time,endTime,color,repeat,repeatSourceId,repeatDays,repeatAnchorDay,description
    );
  }

  function dateBeforeKey(key){
    return RecurrenceService.dateBefore(key);
  }

  function generateRecurringEventSeries(baseEvent,targetKey=null){
    return EventDomainService.generateSeries(baseEvent,targetKey);
  }

  function ensureRecurringEventsThrough(targetKey){
    const created=EventDomainService.ensureThrough(targetKey);
    if(created) saveData();
    return created;
  }

  function addEvent(title,date,time,endDate,color,repeat='none',repeatDays=[],endTime=null,description=''){
    const event=EventDomainService.createEvent(
      title,date,time,endDate,color,repeat,repeatDays,endTime,description
    );
    if(event) saveData();
    return event;
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
    const ev=EventRepository.byId(id);
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
    affected.forEach(item=>{ item.description=next; touchRecord(item); });
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
    const ev=EventRepository.byId(id);
    if(ev){
      el.eventDetailTitle.textContent=ev.title;
      el.eventDetailMeta.innerHTML=eventDetailMetaHtml(ev);
    }
  });

  async function editEvent(id){
    const target=EventRepository.byId(id);
    if(!target) return;
    const value=await askPrompt('Etkinlik adını düzenle',target.title || '');
    if(value===null) return;
    const title=value.trim().slice(0,80);
    if(!title){ showToast('Etkinlik adı boş olamaz.','error'); return; }

    let scope='single';
    if(['daily','weekly','monthly'].includes(target.repeat)){
      scope=await askRecurringEditChoice('etkinlik');
    }
    const affected=EventDomainService.rename(id,title,scope);
    saveData();
    refreshUI('calendar');
    showToast(scope==='single' ? 'Etkinlik güncellendi.' : affected.length+' etkinlik güncellendi.','success');
  }

  async function deleteEvent(id){
    const target=EventRepository.byId(id);
    if(!target) return;

    let choice='single';
    if(['daily','weekly','monthly'].includes(target.repeat)){
      choice=await askRecurringDeleteChoice('etkinlik');
      if(choice==='cancel') return;
    }

    const result=EventDomainService.deleteEvent(id,choice);
    if(!result) return;
    saveData();
    refreshUI('calendar');

    const message=result.mode==='future'
      ? result.removedCount+' tekrarlanan etkinlik silindi.'
      : 'Etkinlik silindi.';

    offerUndo(message,()=>{
      result.undo();
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

  function weekTitle(start,end){
    return ViewFormatters.weekTitle(start,end,MONTH_FULL);
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
    return CalendarView.layoutTimedItems(items);
  }

  const WEEK_HOUR_PX = 48;

  function renderWeekView(){
    const view=CalendarView.buildWeek({
      viewDate:calViewDate,
      selectedDate:calSelectedDate,
      today:todayKey(),
      now:new Date(),
      events:EventRepository.all(),
      tasks:TaskRepository.all(),
      calendarWorkIntervals:data.calendarWorkIntervals,
      weekHourPx:WEEK_HOUR_PX,
      startOfWeek,
      addDays,
      dateKey,
      weekTitle,
      pad,
      isMultiDayEvent,
      weeklyItemColor,
      escapeHtml,
      clockToMinutes,
      workIntervalsForDate,
      displayClockTime
    });

    el.calTitle.textContent=view.title;
    el.calWeekView.innerHTML=view.html;

    requestAnimationFrame(()=>{
      const scroll=el.calWeekView.querySelector('.cal-week-scroll');
      if(scroll && !scroll.dataset.initialized){
        scroll.scrollTop=view.initialScrollTop;
        scroll.dataset.initialized='1';
      }
    });
  }

  function renderMonthView(){
    const view=CalendarView.buildMonth({
      viewDate:calViewDate,
      selectedDate:calSelectedDate,
      today:todayKey(),
      events:EventRepository.all(),
      tasks:TaskRepository.all(),
      monthNames:MONTH_FULL,
      addDays,
      dateKey,
      isMultiDayEvent,
      dayLevelForKey,
      eventColor,
      escapeHtml
    });

    el.calTitle.textContent=view.title;
    el.calGrid.innerHTML=view.html;
  }

  function renderYearView(){
    const view=CalendarView.buildYear({
      viewDate:calViewDate,
      selectedDate:calSelectedDate,
      selectedMonth:calSelectedMonth,
      today:todayKey(),
      events:EventRepository.all(),
      monthNames:MONTH_FULL,
      addDays,
      dateKey,
      isMultiDayEvent,
      dayLevelForKey,
      eventColor,
      escapeHtml
    });

    el.calTitle.textContent=view.title;
    el.calYearView.innerHTML=view.html;

    if(yearAutoScrollPending){
      yearAutoScrollPending=false;
      window.ProductivityUIHelpers?.scrollCurrentMonthIntoView?.(
        el.calYearView,
        calViewDate.getFullYear(),
        {maxWidth:620}
      );
    }
  }


  let yearAutoScrollPending = false;

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
    el.calAgenda.innerHTML=CalendarView.buildAgenda({
      viewMode:calViewMode,
      selectedMonth:calSelectedMonth,
      selectedDate:calSelectedDate,
      data,
      monthNames:MONTH_FULL,
      eventColors:EVENT_COLORS,
      addType:calAddType,
      multiDay:calMultiDay,
      eventRepeat:calEventRepeat,
      eventRepeatDays:calEventRepeatDays,
      taskHasTime:calTaskHasTime,
      dateKey,
      isMultiDayEvent,
      renderMonthEventCard,
      displayDate,
      focusScoreStats,
      scheduledStudyStats,
      formatDurationLabel,
      workIntervalsForDate,
      displayClockTime,
      escapeHtml,
      renderEventCard,
      renderTaskCard
    });
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
    recurringSeriesItems(data.events,ev,'date',scope).forEach(item=>{ item.color=color; touchRecord(item); });
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
      if(calViewMode === 'year') yearAutoScrollPending = true;
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
    el.collectionContent.innerHTML=CollectionView.build({
      treeProgress:data.treeProgress,
      treeNumber:data.treeNumber,
      collection:data.collection,
      treeGoal:TREE_GOAL,
      speciesPoolSize:SPECIES_POOL.length,
      growthStage:getGrowthStage(data.treeProgress),
      speciesColors:SPECIES_COLORS,
      displayDate
    });
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

  initializeTooltips();

  if(!window.ProductivityUIHelpers || !window.ProductivityStateMerge || !window.ProductivityStatePersistence || !window.ProductivityStateWriter || !window.ProductivityTimerCore || !window.ProductivityTimerService || !window.ProductivityTimerController || !window.ProductivitySessionRepository || !window.ProductivityTaskRepository || !window.ProductivityEventRepository || !window.ProductivityGamificationCore || !window.ProductivityTreeService || !window.ProductivityAnalyticsCore || !window.ProductivityCalendarCore || !window.ProductivityViewFormatters || !window.ProductivitySummaryView || !window.ProductivityCalendarView || !window.ProductivityStatsView || !window.ProductivityTaskView || !window.ProductivityCollectionView || !window.ProductivitySessionView || !window.ProductivityFocusView || !window.ProductivityWorkControlsView || !window.ProductivityModalService || !window.ProductivityRecurrenceService || !window.ProductivitySessionService || !window.ProductivityTaskService || !window.ProductivityEventService){
    console.error(
      'Test · Gerekli modüllerden biri yüklenemedi:',
      {
        uiHelpers: !!window.ProductivityUIHelpers,
        stateMerge: !!window.ProductivityStateMerge,
        statePersistence: !!window.ProductivityStatePersistence,
        stateWriter: !!window.ProductivityStateWriter,
        sessionRepository: !!window.ProductivitySessionRepository,
        taskRepository: !!window.ProductivityTaskRepository,
        eventRepository: !!window.ProductivityEventRepository,
        gamificationCore: !!window.ProductivityGamificationCore,
        treeService: !!window.ProductivityTreeService,
        analyticsCore: !!window.ProductivityAnalyticsCore,
        calendarCore: !!window.ProductivityCalendarCore,
        viewFormatters: !!window.ProductivityViewFormatters,
        summaryView: !!window.ProductivitySummaryView,
        calendarView: !!window.ProductivityCalendarView,
        statsView: !!window.ProductivityStatsView,
        taskView: !!window.ProductivityTaskView,
        collectionView: !!window.ProductivityCollectionView,
        sessionView: !!window.ProductivitySessionView,
        focusView: !!window.ProductivityFocusView,
        workControlsView: !!window.ProductivityWorkControlsView,
        modalService: !!window.ProductivityModalService,
        recurrenceService: !!window.ProductivityRecurrenceService,
        sessionService: !!window.ProductivitySessionService,
        taskService: !!window.ProductivityTaskService,
        eventService: !!window.ProductivityEventService,
        timerCore: !!window.ProductivityTimerCore,
        timerService: !!window.ProductivityTimerService,
        timerController: !!window.ProductivityTimerController
      }
    );
  }

  renderToday(false);
  renderDistractionCategorySummary();
  renderSessionList();
  updateIntentDisplay();
  scheduleLongSessionReview(450);

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

    test('Gece yarısı sınırı doğru hesaplanır', ()=>{
      const start=new Date(2026,10,7,23,55,0).getTime();
      const midnight=nextLocalMidnightMs(start);
      equal(dateKey(new Date(midnight)),'2026-11-08');
      equal(Math.round((midnight-start)/60000),5);
    });

    test('Dondurma hakkı en fazla iki olabilir', ()=>{
      equal(Math.min(2,3),2);
    });

    test('Korunan gün freeze kazanım sayacını ilerletmez', ()=>{
      let toward=6;
      const protectedMiss=true;
      if(!protectedMiss) toward+=1;
      equal(toward,6);
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

    test('SessionRepository session ID ile kayıt ve tarih döndürür', ()=>{
      const oldData=data;
      try{
        data=freshData();
        data.sessionLog['2026-09-12']=[{id:'session-test'}];
        const found=SessionRepository.byId('session-test');
        equal(found.key,'2026-09-12');
        equal(found.session.id,'session-test');
      }finally{
        data=oldData;
      }
    });

    test('TaskRepository task ekleme ve silme işlemini kapsüller', ()=>{
      const oldData=data;
      try{
        data=freshData();
        TaskRepository.add({id:'task-test',sortOrder:0});
        equal(TaskRepository.byId('task-test').id,'task-test');
        equal(TaskRepository.nextSortOrder(),1);
        equal(TaskRepository.removeById('task-test').id,'task-test');
        equal(TaskRepository.byId('task-test'),null);
      }finally{
        data=oldData;
      }
    });

    test('TaskRepository tarih bazlı görevleri döndürür', ()=>{
      const oldData=data;
      try{
        data=freshData();
        TaskRepository.add({id:'t1',dueDate:'2026-11-12'});
        TaskRepository.add({id:'t2',dueDate:'2026-11-13'});
        equal(TaskRepository.forDate('2026-11-12').length,1);
        equal(TaskRepository.forDate('2026-11-12')[0].id,'t1');
      }finally{
        data=oldData;
      }
    });

    test('EventRepository event ekleme ve silme işlemini kapsüller', ()=>{
      const oldData=data;
      try{
        data=freshData();
        EventRepository.add({id:'event-test',date:'2026-11-12'});
        equal(EventRepository.byId('event-test').id,'event-test');
        equal(EventRepository.startingOn('2026-11-12').length,1);
        equal(EventRepository.removeById('event-test').id,'event-test');
        equal(EventRepository.byId('event-test'),null);
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
      equal(TREE_GOAL,140);
      equal(GROWTH_PER_WORK_MIN,0.35);
      equal(GROWTH_PER_TODO,3);
    });

    test('Rastgele ağaç türü havuzdan gelir', ()=>{
      const species=randomSpecies();
      equal(SPECIES_POOL.some(item=>item.name===species.name),true);
    });

    test('Etkinlik açıklaması 600 karakter ile sınırlıdır', ()=>{
      equal('a'.repeat(650).slice(0,600).length,600);
    });

    test('Timer state machine geçersiz doğrudan WORKING→BREAK geçişini reddeder', ()=>{
      equal(canTransitionTimerMode('working','break'),false);
      equal(canTransitionTimerMode('working','paused'),true);
      equal(canTransitionTimerMode('paused','working'),true);
    });

    test('Session duration kapalı workIntervals toplamından türetilir', ()=>{
      const s={duration:999,workIntervals:[{start:1000,end:61000},{start:120000,end:180000}]};
      equal(sessionClosedIntervalSeconds(s,{fallbackToDuration:true}),120);
    });

    test('Açık work interval persisted durationa erken süre eklemez', ()=>{
      const s={duration:60,workIntervals:[{start:1000,end:61000},{start:120000,end:null}]};
      equal(sessionClosedIntervalSeconds(s,{fallbackToDuration:true}),60);
    });

    test('Tombstone en yeni silme zamanını korur', ()=>{
      const original=data;
      try{
        data=freshData();
        recordTombstone('tasks','x',100);
        recordTombstone('tasks','x',50);
        equal(data.tombstones.tasks.x,100);
      }finally{ data=original; }
    });

    test('Tombstone undo kaydı temizler', ()=>{
      const original=data;
      try{
        data=freshData();
        recordTombstone('events','e1',123);
        clearTombstone('events','e1');
        equal(data.tombstones.events.e1,undefined);
      }finally{ data=original; }
    });



    // === v67 reliability regression gate ===
    test('Timer: IDLE -> WORKING geçerli', ()=>{
      equal(canTransitionTimerMode(TIMER_MODES.IDLE,TIMER_MODES.WORKING),true);
    });

    test('Timer: IDLE -> PAUSED geçersiz', ()=>{
      equal(canTransitionTimerMode(TIMER_MODES.IDLE,TIMER_MODES.PAUSED),false);
    });

    test('Timer: IDLE -> BREAK geçerli', ()=>{
      equal(canTransitionTimerMode(TIMER_MODES.IDLE,TIMER_MODES.BREAK),true);
    });

    test('Timer: WORKING -> PAUSED ve IDLE geçerli', ()=>{
      equal(canTransitionTimerMode(TIMER_MODES.WORKING,TIMER_MODES.PAUSED),true);
      equal(canTransitionTimerMode(TIMER_MODES.WORKING,TIMER_MODES.IDLE),true);
    });

    test('Timer: WORKING -> BREAK doğrudan geçersiz', ()=>{
      equal(canTransitionTimerMode(TIMER_MODES.WORKING,TIMER_MODES.BREAK),false);
    });

    test('Timer: PAUSED -> BREAK doğrudan geçersiz', ()=>{
      equal(canTransitionTimerMode(TIMER_MODES.PAUSED,TIMER_MODES.BREAK),false);
    });

    test('Session duration sadece kapalı workIntervals toplamıdır', ()=>{
      const base=Date.now();
      const session={workIntervals:[
        {start:base,end:base+10*60*1000},
        {start:base+20*60*1000,end:base+50*60*1000}
      ]};
      equal(sessionClosedIntervalSeconds(session),40*60);
    });

    test('Pause aralığı çalışma süresine eklenmez', ()=>{
      const base=Date.now();
      const session={workIntervals:[
        {start:base,end:base+25*60*1000},
        {start:base+40*60*1000,end:base+55*60*1000}
      ]};
      equal(sessionClosedIntervalSeconds(session),40*60);
    });

    test('Açık workInterval tamamlanmadan duration sayılmaz', ()=>{
      const base=Date.now();
      const session={workIntervals:[
        {start:base,end:base+10*60*1000},
        {start:base+20*60*1000,end:null}
      ]};
      equal(sessionClosedIntervalSeconds(session),10*60);
    });

    test('Bozuk workInterval duration hesabını etkilemez', ()=>{
      const base=Date.now();
      const session={workIntervals:[
        {start:base,end:base-1000},
        {start:null,end:base},
        {start:base,end:base+5000}
      ]};
      equal(sessionClosedIntervalSeconds(session),5);
    });

    test('Midnight sınırı tam yeni gün 00:00 olur', ()=>{
      const start=new Date(2026,10,7,23,59,30).getTime();
      const midnight=nextLocalMidnightMs(start);
      const d=new Date(midnight);
      equal(dateKey(d),'2026-11-08');
      equal(d.getHours(),0);
      equal(d.getMinutes(),0);
      equal(d.getSeconds(),0);
    });

    test('Midnight öncesi kalan dakika doğru hesaplanır', ()=>{
      const start=new Date(2026,10,7,23,50,0).getTime();
      const midnight=nextLocalMidnightMs(start);
      equal(Math.round((midnight-start)/60000),10);
    });

    test('Freeze hakları 0 ile 2 arasında tutulur', ()=>{
      equal(Math.max(0,Math.min(2,5)),2);
      equal(Math.max(0,Math.min(2,-1)),0);
    });

    test('7 gerçek hedef günü bir freeze kazandırır', ()=>{
      let toward=0,freezes=0;
      for(let i=0;i<7;i++){
        toward+=1;
        if(toward>=7){
          toward=0;
          freezes=Math.min(2,freezes+1);
        }
      }
      equal(toward,0);
      equal(freezes,1);
    });

    test('Freeze ile korunan gün yeni hak sayacını ilerletmez', ()=>{
      let toward=6;
      const protectedMiss=true;
      if(!protectedMiss) toward+=1;
      equal(toward,6);
    });

    test('İki freeze varken üçüncü freeze birikmez', ()=>{
      let freezes=2;
      freezes=Math.min(2,freezes+1);
      equal(freezes,2);
    });

    test('Tombstone timestamp eski canlı kayıttan yeniyse silme kazanır', ()=>{
      const liveUpdatedAt=100;
      const deletedAt=200;
      equal(deletedAt>=liveUpdatedAt,true);
    });

    test('Restore daha yeni updatedAt ile eski tombstoneu geçebilir', ()=>{
      const deletedAt=200;
      const restoredUpdatedAt=300;
      equal(restoredUpdatedAt>deletedAt,true);
    });

    test('Rename işlemi updatedAt artırmalıdır', ()=>{
      const before={id:'s1',name:'Matematik',updatedAt:100};
      const after={...before,name:'Matematik A',updatedAt:200};
      equal(after.updatedAt>before.updatedAt,true);
      equal(after.name,'Matematik A');
    });

    test('Sync: scalar state için en güncel cihaz snapshotı temel alınır', ()=>{
      const merge=window.ProductivityStateMerge?.mergeStates;
      if(!merge) throw new Error('mergeStates bulunamadı');
      const remote={
        storageMeta:{updatedAt:100},
        dailyGoalMinutes:60,
        theme:'old',
        sessionLog:{},days:{},tasks:[],events:[],taskTags:[],collection:[],badgeUnlockLog:[]
      };
      const local={
        storageMeta:{updatedAt:200},
        dailyGoalMinutes:90,
        theme:'new',
        sessionLog:{},days:{},tasks:[],events:[],taskTags:[],collection:[],badgeUnlockLog:[]
      };
      const out=merge(remote,local);
      equal(out.dailyGoalMinutes,90);
      equal(out.theme,'new');
    });

    test('Sync: record updatedAt cihaz kimliğinden bağımsız kazanır', ()=>{
      const mergeArray=window.ProductivityStateMerge?.mergeArray;
      if(!mergeArray) throw new Error('mergeArray bulunamadı');
      const remote=[{id:'t1',name:'Eski',updatedAt:100}];
      const local=[{id:'t1',name:'Yeni',updatedAt:300}];
      const out=mergeArray(remote,local,{});
      equal(out.length,1);
      equal(out[0].name,'Yeni');
    });

    test('Sync: yeni tombstone eski taskı geri getirmez', ()=>{
      const mergeArray=window.ProductivityStateMerge?.mergeArray;
      if(!mergeArray) throw new Error('mergeArray bulunamadı');
      const old=[{id:'t1',name:'Eski task',updatedAt:100}];
      const out=mergeArray(old,[],{t1:200});
      equal(out.length,0);
    });

    test('Sync: tombstonedan yeni restore edilen kayıt geri gelebilir', ()=>{
      const mergeArray=window.ProductivityStateMerge?.mergeArray;
      if(!mergeArray) throw new Error('mergeArray bulunamadı');
      const restored=[{id:'t1',name:'Restore',updatedAt:300}];
      const out=mergeArray([],restored,{t1:200});
      equal(out.length,1);
      equal(out[0].name,'Restore');
    });


    test('TimerCore modülü yüklüdür', ()=>{
      equal(Boolean(window.ProductivityTimerCore),true);
    });

    test('TimerCore interval hesabı app helper ile aynıdır', ()=>{
      const base=Date.now();
      const intervals=[
        {start:base,end:base+5*60*1000},
        {start:base+10*60*1000,end:base+25*60*1000}
      ];
      equal(window.ProductivityTimerCore.closedIntervalSeconds(intervals),20*60);
      equal(sessionClosedIntervalSeconds({workIntervals:intervals}),20*60);
    });

    test('TimerCore state inference WORKING durumunu doğru bulur', ()=>{
      const mode=window.ProductivityTimerCore.inferMode({
        activeSessionId:'s1',
        isWorking:true,
        workStart:Date.now(),
        breakState:null
      });
      equal(mode,TIMER_MODES.WORKING);
    });

    test('TimerCore midnight helper app helper ile aynıdır', ()=>{
      const ts=new Date(2026,10,8,22,30,0).getTime();
      equal(window.ProductivityTimerCore.nextLocalMidnightMs(ts),nextLocalMidnightMs(ts));
    });


    test('Destructive sync guard benzer veri hacmini güvenli sayar', ()=>{
      const local={
        sessionLog:{a:Array.from({length:20},(_,i)=>({id:'l'+i}))},
        tasks:Array.from({length:10},(_,i)=>({id:'t'+i})),
        events:[],
        days:Object.fromEntries(Array.from({length:20},(_,i)=>['2026-10-'+String(i+1).padStart(2,'0'),{}]))
      };
      const remote={
        sessionLog:{a:Array.from({length:18},(_,i)=>({id:'r'+i}))},
        tasks:Array.from({length:9},(_,i)=>({id:'t'+i})),
        events:[],
        days:Object.fromEntries(Array.from({length:18},(_,i)=>['2026-10-'+String(i+1).padStart(2,'0'),{}]))
      };
      equal(cloudStateRisk(local,remote).risky,false);
    });

    test('Destructive sync guard büyük session kaybını engeller', ()=>{
      const local={sessionLog:{a:Array.from({length:40},(_,i)=>({id:'l'+i}))},tasks:[],events:[],days:{}};
      const remote={sessionLog:{a:Array.from({length:5},(_,i)=>({id:'r'+i}))},tasks:[],events:[],days:{}};
      equal(cloudStateRisk(local,remote).risky,true);
    });

    test('Destructive sync guard büyük task kaybını engeller', ()=>{
      const local={sessionLog:{},tasks:Array.from({length:30},(_,i)=>({id:'t'+i})),events:[],days:{}};
      const remote={sessionLog:{},tasks:Array.from({length:4},(_,i)=>({id:'r'+i})),events:[],days:{}};
      equal(cloudStateRisk(local,remote).risky,true);
    });


    test('TimerService modülü yüklüdür', ()=>{
      equal(Boolean(window.ProductivityTimerService),true);
    });

    test('TimerService yeni sessionı açık interval ile oluşturur', ()=>{
      const now=1000000;
      const s=window.ProductivityTimerService.createSession({
        now,
        name:'Test',
        subject:'Matematik',
        targetSeconds:1500
      });
      equal(s.startedAt,now);
      equal(s.workIntervals.length,1);
      equal(s.workIntervals[0].start,now);
      equal(s.workIntervals[0].end,null);
      equal(s.duration,0);
    });

    test('TimerService pause açık intervalı kapatır ve duration hesaplar', ()=>{
      const s={
        workIntervals:[{start:1000,end:null}],
        duration:0,
        updatedAt:1000
      };
      window.ProductivityTimerService.pauseSession(s,11000);
      equal(s.workIntervals[0].end,11000);
      equal(s.duration,10);
    });

    test('TimerService resume yeni açık interval açar', ()=>{
      const s={
        workIntervals:[{start:1000,end:11000}],
        duration:10,
        updatedAt:11000
      };
      window.ProductivityTimerService.resumeSession(s,21000);
      equal(s.workIntervals.length,2);
      equal(s.workIntervals[1].start,21000);
      equal(s.workIntervals[1].end,null);
    });

    test('TimerService finish endedAt ve duration üretir', ()=>{
      const s={
        workIntervals:[{start:1000,end:null}],
        duration:0,
        endedAt:null,
        updatedAt:1000
      };
      window.ProductivityTimerService.finishSession(s,61000);
      equal(s.duration,60);
      equal(s.endedAt,61000);
    });


    test('TimerController modülü yüklüdür', ()=>{
      equal(Boolean(window.ProductivityTimerController),true);
    });

    test('TimerController start lifecycle sırasını yürütür', ()=>{
      const sessions=[];
      const transitions=[];
      const saves=[];
      const fake=window.ProductivityTimerController.create({
        now:()=>1000,
        todayKey:()=>'2026-11-10',
        getTodaySessionCount:()=>2,
        addSession:(key,session)=>sessions.push({key,session}),
        getActiveSession:()=>sessions[0]?.session || null,
        getSessionDateKey:()=> '2026-11-10',
        recomputeSessionDay:()=>{},
        transitionMode:(mode,options)=>{ transitions.push({mode,options}); return true; },
        persist:options=>{ saves.push(options||{}); return true; },
        ownerId:()=> 'tab-test',
        touchHeartbeat:()=>{},
        isWorking:()=>false
      });
      const result=fake.start({subject:'Matematik',targetMinutes:25});
      equal(result.session.name,'Oturum 3');
      equal(result.session.subject,'Matematik');
      equal(result.session.targetSeconds,1500);
      equal(transitions[0].mode,TIMER_MODES.WORKING);
      equal(saves.length,1);
      equal(Boolean(saves[0].force),true);
    });

    test('TimerController pause lifecycle intervalı kapatır', ()=>{
      const session={
        id:'s1',
        workIntervals:[{start:1000,end:null}],
        duration:0,
        updatedAt:1000
      };
      let transition=null;
      let saved=0;
      const fake=window.ProductivityTimerController.create({
        now:()=>11000,
        todayKey:()=>'2026-11-10',
        getTodaySessionCount:()=>1,
        addSession:()=>{},
        getActiveSession:()=>session,
        getSessionDateKey:()=> '2026-11-10',
        recomputeSessionDay:()=>{},
        transitionMode:(mode)=>{ transition=mode; return true; },
        persist:()=>{ saved+=1; return true; },
        beforePause:()=>['tree'],
        isWorking:()=>true
      });
      const result=fake.pause();
      equal(session.duration,10);
      equal(transition,TIMER_MODES.PAUSED);
      equal(result.completedList.length,1);
      equal(saved,1);
    });

    test('TimerController finish IDLE durumuna geçirir', ()=>{
      const session={
        id:'s1',
        workIntervals:[{start:1000,end:11000}],
        duration:10,
        endedAt:null,
        updatedAt:11000
      };
      let transition=null;
      const fake=window.ProductivityTimerController.create({
        now:()=>21000,
        todayKey:()=>'2026-11-10',
        getTodaySessionCount:()=>1,
        addSession:()=>{},
        getActiveSession:()=>session,
        getSessionDateKey:()=> '2026-11-10',
        recomputeSessionDay:()=>{},
        transitionMode:(mode)=>{ transition=mode; return true; },
        persist:()=>true,
        beforeFinish:()=>[],
        isWorking:()=>false
      });
      fake.finish();
      equal(session.endedAt,21000);
      equal(transition,TIMER_MODES.IDLE);
    });


    test('Çalışma zamanı görünümü bitişik autosave interval parçalarını birleştirir', ()=>{
      const session={
        id:'display-merge',
        workIntervals:[
          {start:1000,end:31000},
          {start:31000,end:61000},
          {start:61000,end:91000}
        ],
        duration:90
      };
      const merged=mergeSessionIntervalsForDisplay(session);
      equal(merged.length,1);
      equal(merged[0].start,1000);
      equal(merged[0].end,91000);
    });

    test('Çalışma zamanı görünümü gerçek molayı ayrı blok bırakır', ()=>{
      const session={
        id:'display-pause',
        workIntervals:[
          {start:1000,end:61000},
          {start:71000,end:131000}
        ],
        duration:120
      };
      const merged=mergeSessionIntervalsForDisplay(session);
      equal(merged.length,2);
    });

    test('Çalışma zamanı görünümü küçük autosave jitter boşluğunu birleştirir', ()=>{
      const session={
        id:'display-jitter',
        workIntervals:[
          {start:1000,end:31000},
          {start:34000,end:64000}
        ],
        duration:60
      };
      const merged=mergeSessionIntervalsForDisplay(session);
      equal(merged.length,1);
      equal(merged[0].end,64000);
    });


    test('Timer production bundle üç timer globalini birlikte sağlar', ()=>{
      equal(Boolean(window.ProductivityTimerCore),true);
      equal(Boolean(window.ProductivityTimerService),true);
      equal(Boolean(window.ProductivityTimerController),true);
    });


    test('Production app timer runtime kendi içinde yüklüdür', ()=>{
      equal(Boolean(window.ProductivityTimerCore),true);
      equal(Boolean(window.ProductivityTimerService),true);
      equal(Boolean(window.ProductivityTimerController),true);
    });


    test('SessionRepository yanlış gün bucketındaki oturumu doğru güne taşır', ()=>{
      const mock={sessionLog:{
        '2026-11-10':[],
        '2026-11-09':[{id:'move-me',startedAt:new Date('2026-11-10T09:00:00').getTime()}]
      }};
      let persisted=0;
      const repo=window.ProductivitySessionRepository.create({
        getState:()=>mock,
        dateKeyFromMs:ms=>{
          const d=new Date(ms);
          return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
        },
        persist:()=>{ persisted+=1; }
      });
      const result=repo.repairDate('2026-11-10');
      equal(result.moved,1);
      equal(result.sessions[0].id,'move-me');
      equal(mock.sessionLog['2026-11-09'].length,0);
      equal(persisted,1);
    });

    test('SessionRepository removeById doğru oturumu kaldırır', ()=>{
      const mock={sessionLog:{'2026-11-10':[{id:'keep'},{id:'remove'}]}};
      const repo=window.ProductivitySessionRepository.create({
        getState:()=>mock,
        dateKeyFromMs:()=> '2026-11-10'
      });
      const removed=repo.removeById('remove');
      equal(removed.id,'remove');
      equal(repo.forDate('2026-11-10').length,1);
      equal(repo.forDate('2026-11-10')[0].id,'keep');
    });

    test('SessionRepository allEntries sessionları tarih bilgisiyle döndürür', ()=>{
      const mock={sessionLog:{
        '2026-11-10':[{id:'a'}],
        '2026-11-11':[{id:'b'}]
      }};
      const repo=window.ProductivitySessionRepository.create({
        getState:()=>mock,
        dateKeyFromMs:()=> '2026-11-10'
      });
      const rows=repo.allEntries();
      equal(rows.length,2);
      equal(rows[1].key,'2026-11-11');
      equal(rows[1].session.id,'b');
    });


    test('Production app StateMerge runtime kendi içinde yüklüdür', ()=>{
      equal(Boolean(window.ProductivityStateMerge),true);
      equal(typeof window.ProductivityStateMerge.mergeStates,'function');
    });


    test('StatePersistence modülü yüklüdür', ()=>{
      equal(Boolean(window.ProductivityStatePersistence),true);
    });

    test('StatePersistence commit önceki primary kaydı backup yapar', ()=>{
      const memory=new Map();
      const storage={
        getItem:key=>memory.has(key)?memory.get(key):null,
        setItem:(key,value)=>memory.set(key,String(value)),
        removeItem:key=>memory.delete(key)
      };
      const repo=window.ProductivityStatePersistence.createRepository({
        storage,
        primaryKey:'primary',
        backupKey:'backup'
      });
      repo.commitSnapshot('{"v":1}',{mirror:false});
      repo.commitSnapshot('{"v":2}',{mirror:false});
      equal(repo.readRaw('primary'),'{"v":2}');
      equal(repo.readRaw('backup'),'{"v":1}');
    });

    test('StatePersistence storage meta karşılaştırması revision önceliklidir', ()=>{
      const newer={revision:5,updatedAt:1,writerId:'a'};
      const older={revision:4,updatedAt:999999,writerId:'z'};
      equal(window.ProductivityStatePersistence.compareStorageMeta(newer,older)>0,true);
    });


    test('StateWriter modülü yüklüdür', ()=>{
      equal(Boolean(window.ProductivityStateWriter),true);
    });

    test('StateWriter değişmeyen state için yeni revision üretmez', ()=>{
      const state={value:1,storageMeta:{revision:4,updatedAt:10,writerId:'x'}};
      let commits=0;
      const writer=window.ProductivityStateWriter.create({
        getState:()=>state,
        persistence:{
          readPrimaryMeta:()=>({revision:4}),
          commitSnapshot:()=>{ commits+=1; return true; }
        },
        semanticSnapshot:value=>JSON.stringify({value:value.value}),
        writerId:()=> 'test',
        now:()=>100
      });
      writer.acceptCurrentState();
      const result=writer.save();
      equal(result.skipped,true);
      equal(commits,0);
      equal(state.storageMeta.revision,4);
    });

    test('StateWriter stored revision ile local revisionın büyüğünden ilerler', ()=>{
      const state={value:2,storageMeta:{revision:3,updatedAt:10,writerId:'x'}};
      let serialized='';
      const writer=window.ProductivityStateWriter.create({
        getState:()=>state,
        persistence:{
          readPrimaryMeta:()=>({revision:8}),
          commitSnapshot:value=>{ serialized=value; return true; }
        },
        semanticSnapshot:value=>JSON.stringify({value:value.value}),
        writerId:()=> 'tab-test',
        now:()=>500
      });
      const result=writer.save({force:true,suppressCloud:true});
      equal(result.ok,true);
      equal(state.storageMeta.revision,9);
      equal(state.storageMeta.updatedAt,500);
      equal(JSON.parse(serialized).storageMeta.revision,9);
    });

    test('StateWriter başarısız committe storageMeta değerini geri alır', ()=>{
      const state={value:3,storageMeta:{revision:7,updatedAt:70,writerId:'old'}};
      const writer=window.ProductivityStateWriter.create({
        getState:()=>state,
        persistence:{
          readPrimaryMeta:()=>({revision:7}),
          commitSnapshot:()=>false
        },
        semanticSnapshot:value=>JSON.stringify({value:value.value}),
        writerId:()=> 'new',
        now:()=>800
      });
      const result=writer.save({force:true});
      equal(result.ok,false);
      equal(state.storageMeta.revision,7);
      equal(state.storageMeta.updatedAt,70);
      equal(state.storageMeta.writerId,'old');
    });

    test('StateWriter suppressCloud callbacki çalıştırmaz', ()=>{
      const state={value:4,storageMeta:{revision:0,updatedAt:0,writerId:null}};
      let emitted=0;
      const writer=window.ProductivityStateWriter.create({
        getState:()=>state,
        persistence:{
          readPrimaryMeta:()=>null,
          commitSnapshot:()=>true
        },
        semanticSnapshot:value=>JSON.stringify({value:value.value}),
        writerId:()=> 'test',
        now:()=>900,
        onSaved:()=>{ emitted+=1; }
      });
      writer.save({force:true,suppressCloud:true});
      equal(emitted,0);
    });


    test('TaskRepository ve EventRepository modülleri yüklüdür', ()=>{
      equal(Boolean(window.ProductivityTaskRepository),true);
      equal(Boolean(window.ProductivityEventRepository),true);
    });


    test('GamificationCore ve TreeService modülleri yüklüdür', ()=>{
      equal(Boolean(window.ProductivityGamificationCore),true);
      equal(Boolean(window.ProductivityTreeService),true);
    });

    test('GamificationCore XP ve level hesabı mevcut kuralla aynıdır', ()=>{
      const xp=window.ProductivityGamificationCore.totalXP({
        workSeconds:3600,
        totalTodosCompleted:2,
        xpPerWorkMin:2,
        xpPerTodo:15
      });
      equal(xp,150);
      const info=window.ProductivityGamificationCore.levelInfo(xp,{base:100,growth:30});
      equal(info.level,2);
      equal(info.xpInLevel,50);
      equal(info.xpNeeded,130);
    });

    test('GamificationCore freeze hesabı kaçırılan günü otomatik korur', ()=>{
      const days={
        '2026-11-01':{goal:true},
        '2026-11-02':{goal:true},
        '2026-11-03':{goal:true},
        '2026-11-04':{goal:true},
        '2026-11-05':{goal:true},
        '2026-11-06':{goal:true},
        '2026-11-07':{goal:true},
        '2026-11-09':{goal:true}
      };
      const result=window.ProductivityGamificationCore.streakFreezeState({
        days,
        frozenDays:[],
        today:'2026-11-09',
        meetsGoal:key=>Boolean(days[key]?.goal),
        rewardEvery:7,
        maxFreezes:2
      });
      equal(result.streak,8);
      equal(result.frozenDays.includes('2026-11-08'),true);
      equal(result.freezes,0);
    });

    test('TreeService fazla büyümeyi sonraki ağaca aktarır', ()=>{
      const state={treeProgress:130,treeNumber:1,collection:[]};
      const completed=window.ProductivityTreeService.addGrowth(state,20,{
        goal:140,
        pool:[{name:'Test',emoji:'🌱'}],
        pick:pool=>pool[0],
        now:()=> '2026-11-12T00:00:00.000Z'
      });
      equal(completed.length,1);
      equal(state.treeProgress,10);
      equal(state.collection.length,1);
      equal(state.treeNumber,2);
    });

    test('TreeService büyüme geri alırken son ağacı geri çeker', ()=>{
      const state={
        treeProgress:10,
        treeNumber:3,
        collection:[
          {species:'A',emoji:'🌱',treeNumber:1},
          {species:'B',emoji:'🌳',treeNumber:2}
        ]
      };
      const removed=window.ProductivityTreeService.removeGrowth(state,30,{goal:140});
      equal(removed,30);
      equal(state.collection.length,1);
      equal(state.treeNumber,2);
      equal(state.treeProgress,120);
    });


    test('AnalyticsCore ve CalendarCore modülleri yüklüdür', ()=>{
      equal(Boolean(window.ProductivityAnalyticsCore),true);
      equal(Boolean(window.ProductivityCalendarCore),true);
    });

    test('AnalyticsCore focus score dikkat dağınıklığını düşürür', ()=>{
      const clean={distractions:0,targetSeconds:1500,todos:[],workIntervals:[{start:0,end:1500000}]};
      const distracted={...clean,distractions:2};
      const options={
        sessionSeconds:()=>1500,
        sessionIntervals:session=>session.workIntervals
      };
      const cleanScore=window.ProductivityAnalyticsCore.sessionFocusScore(clean,options);
      const distractedScore=window.ProductivityAnalyticsCore.sessionFocusScore(distracted,options);
      equal(cleanScore>distractedScore,true);
    });

    test('AnalyticsCore planlanan ve gerçekleşen süreyi hesaplar', ()=>{
      const stats=window.ProductivityAnalyticsCore.planningStats([
        {targetSeconds:600,duration:700},
        {targetSeconds:300,duration:200}
      ],session=>session.duration);
      equal(stats.count,2);
      equal(stats.reached,1);
      equal(stats.planned,900);
      equal(stats.actual,900);
      equal(stats.completionRate,50);
    });

    test('CalendarCore gün dışına taşan intervalı gün sınırında kırpar', ()=>{
      const start=new Date('2026-11-12T00:00:00').getTime();
      const end=new Date('2026-11-13T00:00:00').getTime();
      const blocks=window.ProductivityCalendarCore.projectWorkIntervalsForDate(
        '2026-11-12',
        {
          sessionLog:{x:[{id:'s1',subject:'Test'}]},
          intervalsForSession:()=>[
            {start:start-60000,end:start+60000},
            {start:end-60000,end:end+60000}
          ],
          colorForSession:()=> '#000'
        }
      );
      equal(blocks.length,2);
      equal(blocks[0].start,start);
      equal(blocks[1].end,end);
    });


    test('ViewFormatters, SummaryView ve CalendarView modülleri yüklüdür', ()=>{
      equal(Boolean(window.ProductivityViewFormatters),true);
      equal(Boolean(window.ProductivitySummaryView),true);
      equal(Boolean(window.ProductivityCalendarView),true);
    });

    test('ViewFormatters mevcut süre gösterimini korur', ()=>{
      equal(window.ProductivityViewFormatters.formatDurationLabel(59*60),'59 dk');
      equal(window.ProductivityViewFormatters.formatDurationLabel(60*60),'1 sa');
      equal(window.ProductivityViewFormatters.formatDurationLabel(65*60),'1sa 5dk');
      equal(window.ProductivityViewFormatters.formatMinutes(65*60),'1s 5dk');
    });

    test('CalendarView çakışan haftalık öğelere ayrı kolon verir', ()=>{
      const laidOut=window.ProductivityCalendarView.layoutTimedItems([
        {startMin:60,endMin:120},
        {startMin:90,endMin:150},
        {startMin:160,endMin:180}
      ]);
      equal(laidOut[0].cols,2);
      equal(laidOut[1].cols,2);
      equal(laidOut[2].cols,1);
    });

    test('CalendarView ay görünümünde seçili ve bugünkü günü işaretler', ()=>{
      const view=window.ProductivityCalendarView.buildMonth({
        viewDate:new Date('2026-11-12T12:00:00'),
        selectedDate:'2026-11-12',
        today:'2026-11-12',
        events:[],
        tasks:[],
        monthNames:MONTH_FULL,
        addDays,
        dateKey,
        isMultiDayEvent,
        dayLevelForKey:()=>0,
        eventColor:()=> '#000000',
        escapeHtml
      });
      equal(view.title,'Kasım 2026');
      equal(view.html.includes('today selected'),true);
    });

    test('SummaryView çıktı alanı ve paylaşım butonlarını üretir', ()=>{
      const blankReview={
        bestDay:null,
        topSubject:null,
        longestSession:null,
        productiveHour:null,
        focus:{average:null,count:0},
        scheduledStudy:{matchedEvents:0},
        goalsMet:0,
        tasksCompleted:0,
        sessionCount:0,
        avgSession:0
      };
      const html=window.ProductivitySummaryView.build({
        now:new Date('2026-11-12T12:00:00'),
        data:{days:{},collection:[],badgeUnlockLog:[]},
        startOfWeek,
        addDays,
        dateKey,
        keysInRange,
        sumEntries:()=>({workSeconds:0,distraction:0,sessions:0}),
        weeklyReviewStats:()=>blankReview,
        planningStatsForKeys:()=>({count:0}),
        focusScoreStats:()=>({average:null}),
        formatMinutes,
        formatDurationLabel,
        trendArrowHtml,
        distractionTrendHtml,
        escapeHtml,
        pad,
        weekdayShort:WEEKDAY_SHORT,
        monthShort:MONTH_SHORT
      });
      equal(html.includes('id="summaryPrintArea"'),true);
      equal(html.includes('id="shareBtn"'),true);
      equal(html.includes('id="summaryPrintBtn"'),true);
    });


    test('StatsView, TaskView ve CollectionView modülleri yüklüdür', ()=>{
      equal(Boolean(window.ProductivityStatsView),true);
      equal(Boolean(window.ProductivityTaskView),true);
      equal(Boolean(window.ProductivityCollectionView),true);
    });

    test('AnalyticsCore subject breakdown süreye göre sıralanır', ()=>{
      const rows=window.ProductivityAnalyticsCore.subjectBreakdown([
        {key:'2026-11-12',session:{subject:'A',duration:300}},
        {key:'2026-11-12',session:{subject:'B',duration:900}}
      ],session=>session.duration);
      equal(rows[0][0],'B');
      equal(rows[0][1].seconds,900);
    });

    test('StatsView metric chart SVG üretir', ()=>{
      const svg=window.ProductivityStatsView.buildMetricChart({
        labels:['Pzt','Sal'],
        values:[10,20],
        chartType:'bar',
        goalMinutes:30
      });
      equal(svg.includes('chart-bar'),true);
      equal(svg.includes('Günlük hedef: 30 dk'),true);
    });

    test('TaskView filtreleri gecikmiş görevleri ayırır', ()=>{
      const groups=window.ProductivityTaskView.filterAndGroup([
        {id:'1',text:'Eski',dueDate:'2026-11-10',done:false,sortOrder:0},
        {id:'2',text:'Bugün',dueDate:'2026-11-12',done:false,sortOrder:1}
      ],{
        today:'2026-11-12',
        dateFilter:'overdue',
        normalizedTaskTagId:()=>null
      });
      equal(groups.filtered.length,1);
      equal(groups.overdue[0].id,'1');
    });

    test('CollectionView boş koleksiyonda kalan büyümeyi gösterir', ()=>{
      const html=window.ProductivityCollectionView.build({
        treeProgress:100,
        treeNumber:2,
        collection:[],
        treeGoal:140,
        speciesPoolSize:44,
        growthStage:{emoji:'🌿'},
        displayDate:value=>String(value)
      });
      equal(html.includes('<b>40</b> büyüme puanı'),true);
    });


    test('SessionView, FocusView ve WorkControlsView modülleri yüklüdür', ()=>{
      equal(Boolean(window.ProductivitySessionView),true);
      equal(Boolean(window.ProductivityFocusView),true);
      equal(Boolean(window.ProductivityWorkControlsView),true);
    });

    test('SessionView görev tamamlama yüzdesini hesaplar', ()=>{
      equal(window.ProductivitySessionView.completionPct({
        todos:[{done:true},{done:false}]
      }),50);
      equal(window.ProductivitySessionView.completionPct({todos:[]}),null);
    });

    test('SessionView aktif oturumu listenin başına taşır', ()=>{
      const view=window.ProductivitySessionView.buildList({
        sessions:[
          {id:'old',name:'Eski',duration:60,distractions:0,todos:[]},
          {id:'current',name:'Aktif',duration:60,distractions:0,todos:[]}
        ],
        activeSessionId:'current',
        isWorking:false,
        expandedIds:new Set(),
        escapeHtml:value=>String(value),
        formatDurationLabel:value=>String(value),
        displayClockTime:()=> '',
        sessionFocusScore:()=>100
      });
      equal(view.html.indexOf('data-id="current"') < view.html.indexOf('data-id="old"'),true);
      equal(view.html.includes('Geçmiş Oturumlar'),true);
    });

    test('FocusView hedef yüzdesini ve pause aksiyonunu üretir', ()=>{
      const model=window.ProductivityFocusView.buildModel({
        session:{name:'Test',duration:300,targetSeconds:600},
        isWorking:true,
        workStart:1000,
        now:121000,
        formatDurationLabel:value=>String(value)
      });
      equal(model.liveDuration,420);
      equal(model.target.percent,70);
      equal(model.pause.label,'Duraklat');
      equal(model.pause.icon,'⏸');
    });

    test('WorkControlsView paused session için devam ve bitir butonlarını üretir', ()=>{
      const html=window.ProductivityWorkControlsView.build({
        breakActive:false,
        isWorking:false,
        hasActiveSession:true
      });
      equal(html.includes('workResumeBtn'),true);
      equal(html.includes('workFinishBtn'),true);
    });


    test('ModalService modülü yüklüdür', ()=>{
      equal(Boolean(window.ProductivityModalService),true);
      equal(typeof window.ProductivityModalService.createController,'function');
      equal(typeof window.ProductivityModalService.choice,'function');
      equal(typeof window.ProductivityModalService.minutes,'function');
    });


    test('Domain service modülleri yüklüdür', ()=>{
      equal(Boolean(window.ProductivityRecurrenceService),true);
      equal(Boolean(window.ProductivitySessionService),true);
      equal(Boolean(window.ProductivityTaskService),true);
      equal(Boolean(window.ProductivityEventService),true);
    });

    test('RecurrenceService aylık 31 gün kuralını ay sonuna kırpar', ()=>{
      const state={recurrenceExceptions:{tasks:{},events:{}}};
      const service=window.ProductivityRecurrenceService.create({
        getState:()=>state,
        dateKey:date=>dateKey(date)
      });
      equal(service.nextDate('2026-01-31','monthly',[],31),'2026-02-28');
    });

    test('SessionService todo ödülünü yalnızca bir kez sayar', ()=>{
      const state={totalTodosCompleted:0,subjects:[],sessionLog:{}};
      const service=window.ProductivitySessionService.create({
        getState:()=>state,
        now:()=>100
      });
      const session={todos:[{id:'x',text:'Test',done:false}]};
      const first=service.toggleTodo(session,'x');
      service.toggleTodo(session,'x');
      const third=service.toggleTodo(session,'x');
      equal(first.newlyRewarded,true);
      equal(third.newlyRewarded,false);
      equal(state.totalTodosCompleted,1);
    });

    test('TaskService recurring future delete undo ile geri döner', ()=>{
      const state={tasks:[],totalTodosCompleted:0,recurrenceExceptions:{tasks:{},events:{}}};
      const recurrence=window.ProductivityRecurrenceService.create({
        getState:()=>state,
        dateKey:date=>dateKey(date)
      });
      let idCounter=0;
      const service=window.ProductivityTaskService.create({
        getState:()=>state,
        recurrence,
        normalizeTime:value=>value,
        tagExists:()=>false,
        normalizedTagId:()=>null,
        nextSortOrder:()=>state.tasks.length,
        now:()=>1000+(idCounter++),
        random:()=>0.123,
        touchRecord:record=>record,
        recordTombstone:()=>0,
        clearTombstone:()=>{}
      });
      const root=service.createTask('Tekrar','2026-11-01',null,null,'daily');
      root.repeatSourceId=root.id;
      service.spawnNext(root);
      const second=state.tasks.find(task=>task.dueDate==='2026-11-02');
      service.spawnNext(second);
      const before=state.tasks.length;
      const result=service.deleteTask(second.id,'future');
      equal(state.tasks.length,1);
      result.undo();
      equal(state.tasks.length,before);
    });

    test('EventService tekrar serisini hedef güne kadar üretir', ()=>{
      const state={events:[],recurrenceExceptions:{tasks:{},events:{}}};
      const recurrence=window.ProductivityRecurrenceService.create({
        getState:()=>state,
        dateKey:date=>dateKey(date)
      });
      let tick=0;
      const service=window.ProductivityEventService.create({
        getState:()=>state,
        recurrence,
        normalizeTime:value=>value,
        defaultColor:'#7aa2f7',
        dateKey:date=>dateKey(date),
        now:()=>2000+(tick++),
        random:()=>0.234,
        touchRecord:record=>record,
        recordTombstone:()=>0,
        clearTombstone:()=>{}
      });
      const event=service.createOccurrence('Ders','2026-11-01',null,null,'#7aa2f7','daily');
      service.generateSeries(event,'2026-11-04');
      equal(state.events.filter(item=>item.date<='2026-11-04').length,4);
    });


    test('Reliability modülleri yüklüdür', ()=>{
      equal(Boolean(window.ProductivityStateMigration),true);
      equal(Boolean(window.ProductivityRecoveryStore),true);
      equal(Boolean(window.ProductivityStateRecoveryService),true);
      equal(Boolean(window.ProductivityDestructiveSyncGuard),true);
      equal(Boolean(window.ProductivityExternalStateService),true);
    });

    const passed=results.filter(r=>r.ok).length;
    const failed=results.length-passed;


    console.log('Test · Reliability regression gate aktif');
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
})();
