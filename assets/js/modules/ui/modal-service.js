(() => {
  'use strict';

  function createController(options={}){
    const doc=options.document || document;
    const computeStyle=options.getComputedStyle
      || (typeof getComputedStyle==='function' ? getComputedStyle : ()=>({visibility:'visible'}));
    const later=options.setTimeout || setTimeout;
    const stack=[];
    const cancelHandlers=new WeakMap();
    const previousFocus=new WeakMap();

    function focusables(backdrop){
      if(!backdrop) return [];
      return [...backdrop.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      )].filter(node=>
        node.offsetParent!==null &&
        computeStyle(node).visibility!=='hidden'
      );
    }

    function syncBody(){
      doc.body?.classList?.toggle('app-modal-open',stack.length>0);
    }

    function open(backdrop,options={}){
      if(!backdrop) return;

      const existing=stack.indexOf(backdrop);
      if(existing>=0) stack.splice(existing,1);

      previousFocus.set(backdrop,doc.activeElement);
      cancelHandlers.set(
        backdrop,
        typeof options.onCancel==='function' ? options.onCancel : null
      );

      backdrop.setAttribute?.('aria-hidden','false');
      const box=backdrop.querySelector?.('.modal-box');

      if(box){
        box.setAttribute?.('role','dialog');
        box.setAttribute?.('aria-modal','true');
      }

      backdrop.classList?.add('show');
      stack.push(backdrop);
      syncBody();

      later(()=>{
        const target=options.focus || focusables(backdrop)[0] || box;
        if(!target) return;

        if(
          target===box &&
          !box.hasAttribute?.('tabindex')
        ){
          box.setAttribute?.('tabindex','-1');
        }

        target.focus?.();

        if(options.select && typeof target.select==='function'){
          target.select();
        }
      },30);
    }

    function close(backdrop,options={}){
      if(!backdrop) return;

      backdrop.classList?.remove('show');
      backdrop.setAttribute?.('aria-hidden','true');
      cancelHandlers.delete(backdrop);

      const index=stack.lastIndexOf(backdrop);
      if(index>=0) stack.splice(index,1);
      syncBody();

      if(options.restoreFocus!==false){
        const prior=previousFocus.get(backdrop);
        if(prior?.isConnected){
          later(()=>prior.focus?.(),0);
        }
      }

      previousFocus.delete(backdrop);
    }

    function top(){
      return stack[stack.length-1] || null;
    }

    function cancelTop(){
      const backdrop=top();
      if(!backdrop) return false;

      const cancel=cancelHandlers.get(backdrop);
      if(typeof cancel!=='function') return false;

      cancel();
      return true;
    }

    doc.addEventListener?.('keydown',event=>{
      const backdrop=top();
      if(!backdrop) return;

      if(event.key==='Escape'){
        if(cancelTop()){
          event.preventDefault?.();
          event.stopPropagation?.();
        }
        return;
      }

      if(event.key==='Tab'){
        const items=focusables(backdrop);
        if(!items.length) return;

        const first=items[0];
        const last=items[items.length-1];

        if(event.shiftKey && doc.activeElement===first){
          event.preventDefault?.();
          last.focus?.();
        }else if(!event.shiftKey && doc.activeElement===last){
          event.preventDefault?.();
          first.focus?.();
        }
      }
    },true);

    doc.addEventListener?.('click',event=>{
      const backdrop=top();
      if(!backdrop || event.target!==backdrop) return;

      const cancel=cancelHandlers.get(backdrop);
      if(typeof cancel==='function') cancel();
    });

    return Object.freeze({
      open,
      close,
      top,
      cancelTop,
      focusables
    });
  }

  function listen(element,event,handler){
    element?.addEventListener?.(event,handler);
    return ()=>element?.removeEventListener?.(event,handler);
  }

  function buttonSnapshot(button){
    if(!button) return null;
    return {
      text:button.textContent,
      display:button.style?.display || '',
      danger:button.classList?.contains('danger') || false,
      primary:button.classList?.contains('primary') || false
    };
  }

  function restoreButton(button,snapshot){
    if(!button || !snapshot) return;
    button.textContent=snapshot.text;
    if(button.style) button.style.display=snapshot.display;
    button.classList?.toggle('danger',snapshot.danger);
    button.classList?.toggle('primary',snapshot.primary);
  }

  function choice(options={}){
    const {
      controller,
      backdrop,
      textElement,
      okButton,
      altButton,
      cancelButton,
      message='',
      okLabel='Evet',
      okValue=true,
      okDanger=false,
      altLabel='',
      altValue=null,
      showAlt=false,
      cancelLabel,
      cancelValue=false,
      showCancel=true,
      focus='cancel',
      backdropCancel=true
    }=options;

    return new Promise(resolve=>{
      const okSnapshot=buttonSnapshot(okButton);
      const altSnapshot=buttonSnapshot(altButton);
      const cancelSnapshot=buttonSnapshot(cancelButton);
      const removers=[];
      let settled=false;

      if(textElement) textElement.textContent=message;

      if(okButton){
        okButton.textContent=okLabel;
        okButton.classList?.toggle('danger',Boolean(okDanger));
        okButton.classList?.toggle('primary',!okDanger);
      }

      if(altButton){
        altButton.textContent=altLabel || altButton.textContent;
        if(altButton.style) altButton.style.display=showAlt?'':'none';
      }

      if(cancelButton){
        if(cancelLabel!==undefined) cancelButton.textContent=cancelLabel;
        if(cancelButton.style) cancelButton.style.display=showCancel?'':'none';
      }

      function finish(value){
        if(settled) return;
        settled=true;

        controller.close(backdrop);
        removers.splice(0).forEach(remove=>remove());
        restoreButton(okButton,okSnapshot);
        restoreButton(altButton,altSnapshot);
        restoreButton(cancelButton,cancelSnapshot);
        resolve(value);
      }

      if(okButton) removers.push(listen(okButton,'click',()=>finish(okValue)));
      if(showAlt && altButton){
        removers.push(listen(altButton,'click',()=>finish(altValue)));
      }
      if(showCancel && cancelButton){
        removers.push(listen(cancelButton,'click',()=>finish(cancelValue)));
      }

      let focusElement=cancelButton;
      if(focus==='ok') focusElement=okButton;
      if(focus==='alt') focusElement=altButton;
      if(focus && typeof focus==='object') focusElement=focus;

      const onCancel=backdropCancel && showCancel
        ? ()=>finish(cancelValue)
        : ()=>{};

      controller.open(backdrop,{
        onCancel,
        focus:focusElement
      });
    });
  }

  function textPrompt(options={}){
    const {
      controller,
      backdrop,
      labelElement,
      input,
      okButton,
      cancelButton,
      label='',
      defaultValue='',
      select=true
    }=options;

    return new Promise(resolve=>{
      const removers=[];
      let settled=false;

      if(labelElement) labelElement.textContent=label;
      if(input) input.value=defaultValue || '';

      function finish(value){
        if(settled) return;
        settled=true;
        controller.close(backdrop);
        removers.splice(0).forEach(remove=>remove());
        resolve(value);
      }

      function onOk(){
        finish(input?.value ?? '');
      }

      function onCancel(){
        finish(null);
      }

      function onKey(event){
        if(event.key==='Enter'){
          event.preventDefault?.();
          onOk();
        }else if(event.key==='Escape'){
          event.preventDefault?.();
          onCancel();
        }
      }

      removers.push(listen(okButton,'click',onOk));
      removers.push(listen(cancelButton,'click',onCancel));
      removers.push(listen(input,'keydown',onKey));

      controller.open(backdrop,{
        onCancel,
        focus:input,
        select
      });
    });
  }

  function dateTimePrompt(options={}){
    const {
      controller,
      backdrop,
      labelElement,
      input,
      okButton,
      cancelButton,
      label='',
      minMs,
      maxMs,
      initialMs,
      formatValue,
      parseValue,
      validate,
      onInvalid
    }=options;

    return new Promise(resolve=>{
      const oldType=input?.type;
      const oldMaxLength=input?.maxLength;
      const oldMin=input?.min;
      const oldMax=input?.max;
      const removers=[];
      let settled=false;

      if(labelElement) labelElement.textContent=label;

      if(input){
        input.type='datetime-local';
        input.removeAttribute?.('maxlength');
        input.min=formatValue(minMs);
        input.max=formatValue(maxMs);
        input.value=formatValue(initialMs);
      }

      function restore(){
        if(!input) return;
        input.type=oldType || 'text';

        if(oldMaxLength>=0) input.maxLength=oldMaxLength;
        else input.removeAttribute?.('maxlength');

        if(oldMin) input.min=oldMin;
        else input.removeAttribute?.('min');

        if(oldMax) input.max=oldMax;
        else input.removeAttribute?.('max');
      }

      function finish(value){
        if(settled) return;
        settled=true;
        controller.close(backdrop);
        removers.splice(0).forEach(remove=>remove());
        restore();
        resolve(value);
      }

      function onOk(){
        const value=parseValue(input?.value);
        if(!validate(value)){
          onInvalid?.();
          return;
        }
        finish(value);
      }

      function onCancel(){
        finish(null);
      }

      function onKey(event){
        if(event.key==='Enter'){
          event.preventDefault?.();
          onOk();
        }else if(event.key==='Escape'){
          event.preventDefault?.();
          onCancel();
        }
      }

      removers.push(listen(okButton,'click',onOk));
      removers.push(listen(cancelButton,'click',onCancel));
      removers.push(listen(input,'keydown',onKey));

      controller.open(backdrop,{
        onCancel,
        focus:input,
        select:false
      });
    });
  }

  function timeRange(options={}){
    const {
      controller,
      backdrop,
      dateLabel,
      startInput,
      endInput,
      errorElement,
      saveButton,
      cancelButton,
      closeButton,
      label='',
      currentStart='',
      currentEnd='',
      parseStart,
      parseEnd
    }=options;

    return new Promise(resolve=>{
      const removers=[];
      let settled=false;

      if(dateLabel) dateLabel.textContent=label;
      if(startInput) startInput.value=currentStart || '';
      if(endInput) endInput.value=currentEnd || '';
      if(errorElement) errorElement.textContent='';

      function finish(value){
        if(settled) return;
        settled=true;
        controller.close(backdrop);
        removers.splice(0).forEach(remove=>remove());
        resolve(value);
      }

      function onSave(){
        const start=parseStart(startInput?.value);
        const end=parseEnd(endInput?.value);

        if(start===null || end===null){
          if(errorElement){
            errorElement.textContent='Başlangıç ve bitiş saatini seç.';
          }
          return;
        }

        if(end<=start){
          if(errorElement){
            errorElement.textContent='Bitiş saati başlangıç saatinden sonra olmalı.';
          }
          return;
        }

        finish({start,end});
      }

      function onCancel(){
        finish(null);
      }

      function onKey(event){
        if(event.key==='Enter'){
          event.preventDefault?.();
          onSave();
        }else if(event.key==='Escape'){
          event.preventDefault?.();
          onCancel();
        }
      }

      removers.push(listen(saveButton,'click',onSave));
      removers.push(listen(cancelButton,'click',onCancel));
      removers.push(listen(closeButton,'click',onCancel));
      removers.push(listen(startInput,'keydown',onKey));
      removers.push(listen(endInput,'keydown',onKey));

      controller.open(backdrop,{
        onCancel,
        focus:startInput,
        select:false
      });
    });
  }

  function subject(options={}){
    const {
      controller,
      backdrop,
      labelElement,
      input,
      chipsElement,
      saveButton,
      cancelButton,
      label='Ne çalışıyorsun?',
      defaultValue='',
      subjects=[],
      escapeHtml=value=>String(value)
    }=options;

    return new Promise(resolve=>{
      const removers=[];
      let settled=false;

      if(labelElement) labelElement.textContent=label;
      if(input) input.value=defaultValue || '';

      if(chipsElement){
        chipsElement.innerHTML=(subjects||[]).slice(0,8).map(value=>
          '<button type="button" class="subject-chip" data-subject="'
          +escapeHtml(value)+'">'+escapeHtml(value)+'</button>'
        ).join('');
      }

      function finish(value){
        if(settled) return;
        settled=true;
        controller.close(backdrop);
        removers.splice(0).forEach(remove=>remove());
        resolve(value);
      }

      function onSave(){
        finish(input?.value ?? '');
      }

      function onCancel(){
        finish(null);
      }

      function onKey(event){
        if(event.key==='Enter'){
          event.preventDefault?.();
          onSave();
        }else if(event.key==='Escape'){
          event.preventDefault?.();
          onCancel();
        }
      }

      function onChip(event){
        const chip=event.target?.closest?.('.subject-chip');
        if(!chip) return;
        input.value=chip.dataset.subject || '';
        input.focus?.();
      }

      removers.push(listen(saveButton,'click',onSave));
      removers.push(listen(cancelButton,'click',onCancel));
      removers.push(listen(input,'keydown',onKey));
      removers.push(listen(chipsElement,'click',onChip));

      controller.open(backdrop,{
        onCancel,
        focus:input,
        select:true
      });
    });
  }

  function minutes(options={}){
    const {
      controller,
      backdrop,
      promptTextElement,
      noneButton,
      subjectSection,
      subjectInput,
      subjectChips,
      minutesInput,
      upButton,
      downButton,
      startButton,
      cancelButton,
      presetWrap,
      promptText='',
      defaultMinutes=25,
      allowNone=false,
      showSubject=false,
      mode='session',
      initialSubject='',
      goalMin=1,
      goalMax=180,
      goalStep=5,
      renderSubjectChips=()=>{},
      playNote=()=>{}
    }=options;

    return new Promise(resolve=>{
      const isBreak=mode==='break';
      const isDailyGoal=mode==='dailyGoal';
      const maxMinutes=isDailyGoal?Infinity:goalMax;
      const presetValues=isBreak
        ? [5,10,15]
        : isDailyGoal
          ? [30,60,90,120]
          : [15,25,45,60,90];

      let current=Math.max(
        goalMin,
        Number(defaultMinutes)||(isBreak?5:25)
      );

      if(promptTextElement) promptTextElement.textContent=promptText;
      if(noneButton?.style) noneButton.style.display=allowNone?'':'none';
      if(subjectSection?.style) subjectSection.style.display=showSubject?'block':'none';

      if(showSubject && subjectInput){
        subjectInput.value=initialSubject || '';
        renderSubjectChips();
      }

      if(presetWrap){
        presetWrap.innerHTML=presetValues.map(value=>
          '<button class="goal-chip" data-min="'+value+'">'+value+'</button>'
        ).join('');
      }

      const chips=presetWrap
        ? [...presetWrap.querySelectorAll('.goal-chip')]
        : [];
      const removers=[];
      let settled=false;

      function normalize(value){
        const number=Math.floor(Number(value));
        if(!Number.isFinite(number)||number<goalMin) return goalMin;
        return Number.isFinite(maxMinutes)
          ? Math.min(maxMinutes,number)
          : number;
      }

      function render(){
        current=normalize(current);
        if(minutesInput){
          minutesInput.value=current;
          minutesInput.removeAttribute?.('max');
          if(Number.isFinite(maxMinutes)){
            minutesInput.max=String(maxMinutes);
          }
        }

        chips.forEach(chip=>{
          chip.classList?.toggle(
            'active',
            parseInt(chip.dataset.min,10)===current
          );
        });
      }

      function syncFromInput(){
        if(!minutesInput || minutesInput.value==='') return;
        current=normalize(minutesInput.value);

        chips.forEach(chip=>{
          chip.classList?.toggle(
            'active',
            parseInt(chip.dataset.min,10)===current
          );
        });
      }

      function finish(value){
        if(settled) return;
        settled=true;
        controller.close(backdrop);
        removers.splice(0).forEach(remove=>remove());
        resolve(value);
      }

      function onUp(){
        syncFromInput();
        current=normalize(current+goalStep);
        render();
        playNote(660,0,0.05,'sine',0.08);
      }

      function onDown(){
        syncFromInput();
        current=normalize(current-goalStep);
        render();
        playNote(500,0,0.05,'sine',0.08);
      }

      function onInput(){
        syncFromInput();
      }

      function onInputBlur(){
        current=normalize(minutesInput?.value);
        render();
      }

      function onStart(){
        current=normalize(minutesInput?.value || current);
        finish({
          minutes:current,
          subject:showSubject ? subjectInput?.value.trim() : undefined
        });
      }

      function onNone(){
        finish({
          minutes:null,
          subject:showSubject ? subjectInput?.value.trim() : undefined
        });
      }

      function onCancel(){
        finish(undefined);
      }

      function onKey(event){
        if(event.key==='Enter'){
          event.preventDefault?.();
          onStart();
        }else if(event.key==='Escape'){
          event.preventDefault?.();
          onCancel();
        }
      }

      function onChip(event){
        current=normalize(event.currentTarget.dataset.min);
        render();
      }

      function onSubjectChip(event){
        const chip=event.target?.closest?.('.subject-chip');
        if(chip && subjectInput){
          subjectInput.value=chip.dataset.subject || '';
        }
      }

      render();

      removers.push(listen(upButton,'click',onUp));
      removers.push(listen(downButton,'click',onDown));
      removers.push(listen(minutesInput,'input',onInput));
      removers.push(listen(minutesInput,'blur',onInputBlur));
      removers.push(listen(minutesInput,'keydown',onKey));
      chips.forEach(chip=>removers.push(listen(chip,'click',onChip)));
      removers.push(listen(subjectChips,'click',onSubjectChip));
      removers.push(listen(startButton,'click',onStart));
      removers.push(listen(noneButton,'click',onNone));
      removers.push(listen(cancelButton,'click',onCancel));

      controller.open(backdrop,{
        onCancel,
        focus:showSubject ? subjectInput : minutesInput,
        select:!showSubject
      });
    });
  }

  function rating(options={}){
    const {
      controller,
      document:doc=document,
      title='Bu oturum ne kadar verimli geçti?',
      description='1 çok düşük, 5 çok yüksek verim anlamına gelir.',
      currentRating=null,
      skipLabel='Atla'
    }=options;

    if(!controller) throw new Error('ModalService.rating controller gerekli');

    return new Promise(resolve=>{
      const backdrop=doc.createElement('div');
      backdrop.className='modal-backdrop session-rating-backdrop';
      backdrop.setAttribute('aria-hidden','true');
      backdrop.innerHTML=`
        <div class="modal-box session-rating-modal" role="dialog" aria-modal="true" aria-labelledby="sessionRatingTitle">
          <div class="session-rating-kicker">OTURUM DEĞERLENDİRMESİ</div>
          <h3 id="sessionRatingTitle">${title}</h3>
          <p class="session-rating-description">${description}</p>
          <div class="session-rating-scale" role="group" aria-label="Verim puanı">
            ${[1,2,3,4,5].map(value=>`
              <button type="button" class="session-rating-option${Number(currentRating)===value?' selected':''}" data-rating="${value}" aria-label="${value} üzerinden 5">
                <span class="session-rating-number">${value}</span>
                <span class="session-rating-emoji">${['😞','😕','😐','🙂','🔥'][value-1]}</span>
              </button>`).join('')}
          </div>
          <div class="session-rating-labels"><span>Çok düşük</span><span>Çok yüksek</span></div>
          <button type="button" class="btn-secondary session-rating-skip" data-action="skip-rating">${skipLabel}</button>
        </div>`;

      doc.body.appendChild(backdrop);
      let settled=false;

      function finish(value){
        if(settled) return;
        settled=true;
        controller.close(backdrop);
        backdrop.remove();
        resolve(value);
      }

      backdrop.querySelectorAll('[data-rating]').forEach(button=>{
        button.addEventListener('click',()=>finish(Number(button.dataset.rating)));
      });

      backdrop.querySelector('[data-action="skip-rating"]')
        ?.addEventListener('click',()=>finish(null));

      controller.open(backdrop,{
        onCancel:()=>finish(null),
        focus:backdrop.querySelector(
          Number(currentRating)>=1 && Number(currentRating)<=5
            ? `[data-rating="${Number(currentRating)}"]`
            : '[data-rating="4"]'
        )
      });
    });
  }

  function destructiveRisk(options={}){
    const {
      document:doc=document,
      risk,
      escapeHtml=value=>String(value)
    }=options;

    if(!risk?.risky) return Promise.resolve(true);

    const format=count=>
      `Oturum ${count.sessions} · Görev ${count.tasks} · Etkinlik ${count.events} · Gün ${count.days}`;

    return new Promise(resolve=>{
      const backdrop=doc.createElement('div');
      backdrop.className='modal-backdrop cloud-risk-backdrop show';
      backdrop.innerHTML=`
        <div class="modal cloud-risk-modal" role="dialog" aria-modal="true" aria-labelledby="cloudRiskTitle">
          <div class="modal-header">
            <div>
              <h3 id="cloudRiskTitle">⚠️ Olası veri kaybı engellendi</h3>
              <p class="muted">Buluttaki kayıt daha yeni görünüyor ancak bu cihazdaki veriden belirgin biçimde daha az içerik taşıyor.</p>
            </div>
          </div>
          <div class="cloud-risk-compare">
            <div class="cloud-risk-card">
              <b>Bu cihaz</b>
              <span>${escapeHtml(format(risk.local))}</span>
            </div>
            <div class="cloud-risk-card">
              <b>Bulut</b>
              <span>${escapeHtml(format(risk.remote))}</span>
            </div>
          </div>
          <p class="cloud-risk-note">Otomatik değiştirme durduruldu. Güvenli seçenek bu cihazdaki veriyi korumaktır.</p>
          <div class="cloud-risk-actions">
            <button type="button" class="btn-secondary" data-action="keep-local">Bu cihazdaki veriyi koru</button>
            <button type="button" class="btn-danger" data-action="use-cloud">Yine de bulutu kullan</button>
          </div>
        </div>`;

      doc.body.appendChild(backdrop);

      let settled=false;

      function finish(value){
        if(settled) return;
        settled=true;
        backdrop.remove();
        resolve(value);
      }

      backdrop.querySelector('[data-action="keep-local"]')
        ?.addEventListener('click',()=>finish(false));

      backdrop.querySelector('[data-action="use-cloud"]')
        ?.addEventListener('click',()=>finish(true));
    });
  }

  window.ProductivityModalService={
    createController,
    choice,
    textPrompt,
    dateTimePrompt,
    timeRange,
    subject,
    minutes,
    rating,
    destructiveRisk
  };
})();
