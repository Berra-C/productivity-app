(() => {
  'use strict';

  function xpRequiredForLevel(level,{base=100,growth=30}={}){
    const safeLevel=Math.max(1,Math.floor(Number(level)||1));
    return Math.max(1,Number(base)||100) + (safeLevel-1)*(Number(growth)||0);
  }

  function xpFromWork(workSeconds,xpPerWorkMin=2){
    const minutes=Math.floor(Math.max(0,Number(workSeconds)||0)/60);
    return minutes*Math.max(0,Number(xpPerWorkMin)||0);
  }

  function xpFromTodos(totalTodosCompleted,xpPerTodo=15){
    return Math.max(0,Number(totalTodosCompleted)||0)*Math.max(0,Number(xpPerTodo)||0);
  }

  function totalXP({
    workSeconds=0,
    totalTodosCompleted=0,
    xpPerWorkMin=2,
    xpPerTodo=15
  }={}){
    return xpFromWork(workSeconds,xpPerWorkMin)
      + xpFromTodos(totalTodosCompleted,xpPerTodo);
  }

  function levelInfo(total,{
    base=100,
    growth=30
  }={}){
    let remaining=Math.max(0,Math.floor(Number(total)||0));
    let level=1;
    let required=xpRequiredForLevel(level,{base,growth});

    while(remaining>=required){
      remaining-=required;
      level+=1;
      required=xpRequiredForLevel(level,{base,growth});
    }

    return {
      level,
      xpInLevel:remaining,
      xpNeeded:required
    };
  }

  function rankForLevel(level,ranks=[]){
    if(!Array.isArray(ranks) || !ranks.length) return '';
    const index=Math.max(0,Math.min(ranks.length-1,(Math.floor(Number(level)||1)-1)));
    return ranks[index];
  }

  function countUnlockedBadges(categories=[]){
    let count=0;
    categories.forEach(category=>{
      const value=category?.getValue?.();
      if(value===null || value===undefined) return;
      (category.thresholds||[]).forEach(threshold=>{
        if(value>=threshold) count+=1;
      });
    });
    return count;
  }

  function unlockedBadgeMap(categories=[]){
    const map=new Map();
    categories.forEach(category=>{
      const value=category?.getValue?.();
      if(value===null || value===undefined) return;
      (category.thresholds||[]).forEach(threshold=>{
        if(value>=threshold){
          map.set(
            category.title+'|'+threshold,
            {
              icon:category.icon,
              label:category.label(threshold),
              category:category.title
            }
          );
        }
      });
    });
    return map;
  }

  function nextBadgeProgress(categories=[]){
    const candidates=[];

    categories.forEach(category=>{
      const value=Number(category?.getValue?.());
      if(!Number.isFinite(value)) return;

      const thresholds=Array.isArray(category.thresholds)
        ? category.thresholds
        : [];
      const next=thresholds.find(threshold=>value<threshold);
      if(next===undefined) return;

      const previous=[...thresholds].filter(threshold=>threshold<=value).pop() || 0;
      const span=Math.max(1,next-previous);
      const pct=Math.max(0,Math.min(100,((value-previous)/span)*100));

      candidates.push({
        icon:category.icon,
        category:category.title,
        label:category.label(next),
        current:value,
        next,
        pct
      });
    });

    if(!candidates.length) return null;
    candidates.sort((a,b)=>b.pct-a.pct || (a.next-a.current)-(b.next-b.current));
    return candidates[0];
  }

  function bestStreak(keys=[]){
    const sorted=[...keys].sort();
    if(!sorted.length) return 0;

    let best=1;
    let current=1;

    for(let index=1;index<sorted.length;index+=1){
      const previous=new Date(sorted[index-1]+'T12:00:00');
      const next=new Date(sorted[index]+'T12:00:00');
      const diff=Math.round((next-previous)/86400000);

      if(diff===1){
        current+=1;
        best=Math.max(best,current);
      }else if(diff>1){
        current=1;
      }
    }

    return best;
  }

  function bestCleanStreak({keys=[],days={},today=null}={}){
    const sorted=[...keys]
      .filter(key=>key!==today)
      .sort();

    let best=0;
    let current=0;
    let previousKey=null;

    sorted.forEach(key=>{
      const day=days?.[key];

      if(previousKey){
        const previous=new Date(previousKey+'T12:00:00');
        const next=new Date(key+'T12:00:00');
        const diff=Math.round((next-previous)/86400000);
        if(diff!==1) current=0;
      }

      if(day && Number(day.distraction||0)===0){
        current+=1;
        best=Math.max(best,current);
      }else{
        current=0;
      }

      previousKey=key;
    });

    return best;
  }

  function addDayKey(key,amount=1){
    const date=new Date(key+'T12:00:00');
    date.setDate(date.getDate()+Number(amount||0));
    const pad=value=>String(value).padStart(2,'0');
    return date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate());
  }

  function streakFreezeState({
    days={},
    frozenDays=[],
    today,
    meetsGoal,
    rewardEvery=7,
    maxFreezes=2
  }={}){
    if(!today || typeof meetsGoal!=='function'){
      return {
        streak:0,
        freezes:0,
        toward:0,
        best:0,
        frozenDays:Array.isArray(frozenDays)?[...frozenDays]:[]
      };
    }

    const frozenSet=new Set(Array.isArray(frozenDays)?frozenDays:[]);
    const known=[...new Set([
      ...Object.keys(days||{}),
      ...frozenSet
    ])]
      .filter(key=>/^\d{4}-\d{2}-\d{2}$/.test(key) && key<=today)
      .sort();

    const first=known.find(key=>meetsGoal(key) || frozenSet.has(key));
    if(!first){
      return {
        streak:0,
        freezes:0,
        toward:0,
        best:0,
        frozenDays:[...frozenSet].sort()
      };
    }

    let key=first;
    let streak=0;
    let freezes=0;
    let toward=0;
    let best=0;

    while(key<=today){
      const reached=Boolean(meetsGoal(key));
      const alreadyFrozen=frozenSet.has(key);

      if(reached){
        streak+=1;
        toward+=1;

        if(toward>=rewardEvery){
          toward=0;
          freezes=Math.min(maxFreezes,freezes+1);
        }
      }else if(alreadyFrozen){
        if(streak>0) freezes=Math.max(0,freezes-1);
      }else if(key!==today){
        if(streak>0 && freezes>0){
          freezes-=1;
          frozenSet.add(key);
        }else{
          streak=0;
          toward=0;
        }
      }

      best=Math.max(best,streak);
      key=addDayKey(key,1);
    }

    return {
      streak,
      freezes:Math.min(maxFreezes,freezes),
      toward,
      best,
      frozenDays:[...frozenSet].sort()
    };
  }

  window.ProductivityGamificationCore={
    xpRequiredForLevel,
    xpFromWork,
    xpFromTodos,
    totalXP,
    levelInfo,
    rankForLevel,
    countUnlockedBadges,
    unlockedBadgeMap,
    nextBadgeProgress,
    bestStreak,
    bestCleanStreak,
    streakFreezeState
  };
})();
