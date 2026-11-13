(() => {
  'use strict';

  function build(options={}){
    const {
      treeProgress=0,
      treeNumber=1,
      collection=[],
      treeGoal=140,
      speciesPoolSize=0,
      growthStage={emoji:'🌱'},
      speciesColors={},
      displayDate=value=>String(value)
    }=options;

    const progress=Math.max(0,Number(treeProgress)||0);
    const goal=Math.max(1,Number(treeGoal)||140);
    const progressPercent=Math.min(100,progress/goal*100);

    let html='<div class="tree-progress-card">'
      +'<div class="tp-emoji">'+growthStage.emoji+'</div>'
      +'<div class="tp-info">'
      +'<div class="tp-title">Ağaç #'+treeNumber+' büyüyor</div>'
      +'<div class="tp-bar"><div class="tp-fill" style="width:'+progressPercent+'%"></div></div>'
      +'<div class="tp-caption">'+Math.round(progress)+' / '+goal
      +' büyüme puanı — tür tamamlanınca belli olacak 🌱</div>'
      +'</div></div>';

    if(collection.length>0){
      const uniqueCount=new Set(
        collection.map(item=>item.species)
      ).size;

      html+='<div class="collection-stats">'
        +'<div class="collection-stat"><div class="cs-num">'+collection.length
        +'</div><div class="cs-lbl">Toplam Ağaç</div></div>'
        +'<div class="collection-stat"><div class="cs-num">'+uniqueCount
        +' / '+speciesPoolSize+'</div><div class="cs-lbl">Keşfedilen Tür</div></div>'
        +'</div>';
    }

    if(!collection.length){
      const remaining=Math.max(0,Math.ceil(goal-progress));
      return html
        +'<div class="empty-state">Henüz tamamlanmış ağacın yok.<br>İlk ağacını tamamlamak için <b>'
        +remaining+'</b> büyüme puanı daha gerek.</div>';
    }

    html+='<div class="collection-grid">';

    [...collection].reverse().forEach((item,index)=>{
      const colors=speciesColors[item.species]
        || {accent:'#74d99f',bg:'rgba(116,217,159,0.16)'};

      html+='<div class="tree-card" style="--accent:'+colors.accent
        +';--accent-bg:'+colors.bg
        +';animation-delay:'+(index*0.04)+'s">'
        +'<span class="badge-num">Ağaç #'+item.treeNumber+'</span>'
        +'<div class="emoji">'+item.emoji+'</div>'
        +'<div class="species">'+item.species+'</div>'
        +'<div class="date">'+displayDate(new Date(item.completedAt))+'</div>'
        +'</div>';
    });

    html+='</div>';
    return html;
  }

  window.ProductivityCollectionView={build};
})();
