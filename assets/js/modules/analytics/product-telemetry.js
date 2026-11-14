(() => {
  'use strict';

  const EVENTS=new Set([
    'app_opened','sync_success','sync_failed','sync_conflict','destructive_sync_blocked',
    'task_created','task_completed','task_focus_started',
    'focus_started','focus_paused','focus_resumed','focus_completed',
    'session_rated','distraction_logged',
    'analytics_opened','heatmap_metric_changed','insight_seen',
    'runtime_error','recovery_restored'
  ]);

  const REPEATS=new Set(['none','daily','weekly','monthly']);
  const TARGET_BUCKETS=new Set(['none','1-24','25-44','45-59','60-89','90+']);
  const DURATION_BUCKETS=new Set(['0-4','5-24','25-44','45-59','60-89','90+']);
  const DISTRACTION_BUCKETS=new Set(['0','1','2','3+']);
  const HEATMAP_METRICS=new Set(['rating','focus','distraction','target']);
  const INSIGHT_TYPES=new Set(['best-hour','session-length','subject','rating-trend','distraction-trend','learning']);
  const CONFIDENCE=new Set(['Az veri','Erken bulgu','Orta','Yüksek']);
  const ERROR_KINDS=new Set(['error','unhandledrejection']);

  function bool(value){ return value===true; }
  function enumValue(value,allowed,fallback=null){
    const clean=String(value??'');
    return allowed.has(clean)?clean:fallback;
  }
  function number(value,min,max,fallback=null){
    const n=Number(value);
    if(!Number.isFinite(n)) return fallback;
    return Math.max(min,Math.min(max,n));
  }
  function durationBucket(seconds){
    const minutes=Math.max(0,Number(seconds)||0)/60;
    if(minutes<5) return '0-4';
    if(minutes<25) return '5-24';
    if(minutes<45) return '25-44';
    if(minutes<60) return '45-59';
    if(minutes<90) return '60-89';
    return '90+';
  }
  function targetBucket(minutes){
    const n=Math.max(0,Number(minutes)||0);
    if(!n) return 'none';
    if(n<25) return '1-24';
    if(n<45) return '25-44';
    if(n<60) return '45-59';
    if(n<90) return '60-89';
    return '90+';
  }
  function distractionBucket(count){
    const n=Math.max(0,Math.round(Number(count)||0));
    if(n<=0) return '0';
    if(n===1) return '1';
    if(n===2) return '2';
    return '3+';
  }

  function sanitizeProperties(eventName,input={}){
    const p=input && typeof input==='object' && !Array.isArray(input)?input:{};
    switch(eventName){
      case 'task_created': return {
        hasDueDate:bool(p.hasDueDate),
        hasTime:bool(p.hasTime),
        hasTag:bool(p.hasTag),
        repeat:enumValue(p.repeat,REPEATS,'none')
      };
      case 'task_completed': return {linkedFocus:bool(p.linkedFocus)};
      case 'task_focus_started': return {
        hasTag:bool(p.hasTag),
        targetBucket:enumValue(p.targetBucket,TARGET_BUCKETS,'none')
      };
      case 'focus_started': return {
        linkedTask:bool(p.linkedTask),
        hasTarget:bool(p.hasTarget),
        targetBucket:enumValue(p.targetBucket,TARGET_BUCKETS,'none')
      };
      case 'app_opened':
      case 'focus_paused':
      case 'focus_resumed':
      case 'analytics_opened':
      case 'recovery_restored': return {};
      case 'focus_completed': return {
        durationBucket:enumValue(p.durationBucket,DURATION_BUCKETS,'0-4'),
        linkedTask:bool(p.linkedTask),
        ratingEligible:bool(p.ratingEligible),
        rated:bool(p.rated),
        distractionBucket:enumValue(p.distractionBucket,DISTRACTION_BUCKETS,'0'),
        targetReached:p.targetReached===null?null:bool(p.targetReached)
      };
      case 'session_rated': return {
        rating:number(p.rating,1,5,null),
        editing:bool(p.editing),
        durationBucket:enumValue(p.durationBucket,DURATION_BUCKETS,'0-4'),
        linkedTask:bool(p.linkedTask)
      };
      case 'distraction_logged': return {
        duringFocus:bool(p.duringFocus),
        hasCategory:bool(p.hasCategory)
      };
      case 'heatmap_metric_changed': return {
        metric:enumValue(p.metric,HEATMAP_METRICS,'rating')
      };
      case 'insight_seen': return {
        type:enumValue(p.type,INSIGHT_TYPES,'learning'),
        confidence:enumValue(p.confidence,CONFIDENCE,'Az veri')
      };
      case 'sync_success': return {
        initial:bool(p.initial),
        action:['noop','push-local-empty-remote','initial-merge-push','initial-adopt-remote','remote-newer-merge-push','remote-newer-adopt','push-dirty-local','conflict-merge-push'].includes(String(p.action)) ? String(p.action) : 'noop'
      };
      case 'sync_failed': return {status:number(p.status,0,599,0)};
      case 'sync_conflict': return {resolved:bool(p.resolved)};
      case 'destructive_sync_blocked': return {conflict:bool(p.conflict)};
      case 'runtime_error': return {
        kind:enumValue(p.kind,ERROR_KINDS,'error')
      };
      default:return {};
    }
  }

  function uuid(){
    if(globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    const bytes=new Uint8Array(16);
    globalThis.crypto?.getRandomValues?.(bytes);
    bytes[6]=(bytes[6]&0x0f)|0x40;
    bytes[8]=(bytes[8]&0x3f)|0x80;
    const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }

  const pageOnce=new Set();

  function track(eventName,properties={}){
    if(!EVENTS.has(eventName)) return false;
    const detail={
      eventId:uuid(),
      name:eventName,
      at:Date.now(),
      properties:sanitizeProperties(eventName,properties)
    };
    window.dispatchEvent(new CustomEvent('app:telemetry',{detail}));
    return true;
  }

  function trackOnce(key,eventName,properties={}){
    const normalized=String(key||eventName);
    if(pageOnce.has(normalized)) return false;
    const tracked=track(eventName,properties);
    if(tracked) pageOnce.add(normalized);
    return tracked;
  }

  window.ProductivityProductTelemetry={
    EVENTS,
    sanitizeProperties,
    durationBucket,
    targetBucket,
    distractionBucket,
    track,
    trackOnce
  };
})();
