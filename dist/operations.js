/* A short executive brief, with specialist evidence and questions on demand. */
(() => {
  const esc=escapeHtml;
  function closeDrawer(){casePanelOpen=false;document.querySelector('#case-panel').hidden=true;document.body.classList.remove('case-drawer-open');document.querySelector('[data-case="'+CSS.escape(selectedId||'')+'"]')?.focus({preventScroll:true});}

  const conversations=new Map();
  let translateOnLoad=false;
  const copy={
    en:{title:'Case explanation',intro:'A short explanation of what happened and what to check next.',generate:'Explain this case',loading:'Preparing explanation…',setup:'AI explanation is not configured.',unavailable:'Explanation unavailable. Please try again.',why:'Why it matters',next:'What to check next',evidence:'View evidence & details',draft:'AI draft · verify before deciding',ask:'Ask about this case',chatTitle:'Ask about this case',chatIntro:'Answers use this case’s saved evidence. They do not change the case.',question:'Your question',placeholder:'What would you like to understand?',send:'Ask',thinking:'Checking the case evidence…',close:'Close',privacy:'Use synthetic case questions only. Do not enter personal or confidential information.',you:'You',assistant:'Case assistant',suggestions:['Why was this case flagged?','What evidence is missing?','Could there be a legitimate explanation?'],sources:'Supporting evidence',more:'Additional observations',decision:'Specialist actions',status:'Current status',unsaved:'Save a synthetic assessment to use the case assistant.',restart:'New conversation',review:'Review the evidence before making a decision.',details:'Evidence & case details'},
    ar:{title:'شرح الحالة',intro:'شرح موجز لما حدث وما ينبغي التحقق منه.',generate:'اشرح هذه الحالة',loading:'جارٍ إعداد الشرح…',setup:'شرح الحالة بالذكاء الاصطناعي غير مُعدّ.',unavailable:'تعذّر إعداد الشرح. يرجى المحاولة مجددًا.',why:'لماذا تستحق الاهتمام',next:'ما الذي ينبغي التحقق منه',evidence:'عرض الأدلة والتفاصيل',draft:'مسودة بالذكاء الاصطناعي · تحقّق قبل اتخاذ القرار',ask:'اسأل عن هذه الحالة',chatTitle:'اسأل عن هذه الحالة',chatIntro:'تستند الإجابات إلى الأدلة المحفوظة لهذه الحالة، ولا تُجري أي تعديل عليها.',question:'سؤالك',placeholder:'ما الذي تودّ فهمه؟',send:'اسأل',thinking:'جارٍ مراجعة أدلة الحالة…',close:'إغلاق',privacy:'استخدم أسئلة عن الحالة التجريبية فقط. لا تُدخل معلومات شخصية أو سرية.',you:'أنت',assistant:'مساعد الحالة',suggestions:['لماذا أُشير إلى هذه الحالة للمراجعة؟','ما الأدلة الناقصة؟','هل يوجد تفسير مشروع محتمل؟'],sources:'الأدلة الداعمة',more:'ملاحظات إضافية',decision:'إجراءات المختص',status:'الحالة الحالية',unsaved:'احفظ تقييمًا تجريبيًا لاستخدام مساعد الحالة.',restart:'محادثة جديدة',review:'راجع الأدلة قبل اتخاذ أي قرار.',details:'الأدلة وتفاصيل الحالة'}
  };
  function evidenceMarkup(facts){
    const plainKey=key=>key.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,c=>c.toUpperCase());
    const valueText=value=>value==null?'—':typeof value==='boolean'?(value?'Yes':'No'):String(value);
    const valueMarkup=value=>Array.isArray(value)?`<ol>${value.map(v=>`<li>${valueMarkup(v)}</li>`).join('')}</ol>`:value && typeof value==='object'?`<dl>${Object.entries(value).map(([key,v])=>`<div><dt>${esc(plainKey(key))}</dt><dd>${valueMarkup(v)}</dd></div>`).join('')}</dl>`:esc(valueText(value));
    return facts.map((fact,index)=>`<article id="brief-fact-${esc(fact.id)}" tabindex="-1"><h4>[${index+1}] ${esc(fact.value.name||fact.value.contributor||fact.id)}</h4>${valueMarkup(fact.value)}</article>`).join('');
  }
  function citedItem(item,facts){
    if(!item)return '';
    return `<p>${esc(item.text)} <span class="ops-citations">${item.evidenceIds.map(id=>`<button type="button" class="ops-evidence-link" data-evidence="${esc(id)}" aria-label="${caseSummaryLanguage==='ar'?'الدليل':'Evidence'} ${facts.findIndex(f=>f.id===id)+1}">[${facts.findIndex(f=>f.id===id)+1}]</button>`).join(' ')}</span></p>`;
  }
  function wireCitations(host,sourceHost){
    host.querySelectorAll('[data-evidence]').forEach(button=>button.onclick=()=>{
      const article=[...sourceHost.querySelectorAll('.ops-brief-evidence article')].find(node=>node.id==='brief-fact-'+button.dataset.evidence);
      if(!article)return;
      article.closest('details').open=true;
      article.scrollIntoView({behavior:'smooth',block:'center'});article.focus({preventScroll:true});
    });
  }
  function openConversation(item,draft,language){
    const t=copy[language];
    document.querySelector('#case-question-dialog')?.remove();
    const dialog=document.createElement('dialog');dialog.id='case-question-dialog';dialog.className='case-question-dialog';dialog.dir=language==='ar'?'rtl':'ltr';dialog.lang=language;dialog.setAttribute('aria-labelledby','case-question-title');
    const key=[item.id,item.assessmentId,draft.evidenceFingerprint,language].join(':');
    const turns=conversations.get(key)||[];conversations.set(key,turns);
    dialog.innerHTML=`<header class="case-question-head"><div><p class="eyebrow">${esc(item.transactionId||item.id)}</p><h2 id="case-question-title">${t.chatTitle}</h2></div><button type="button" class="icon-button" aria-label="${t.close}">×</button></header><p class="case-question-intro">${t.chatIntro}</p><div class="case-conversation" role="log" aria-live="polite" aria-label="${t.chatTitle}"></div><div class="case-question-suggestions">${t.suggestions.map(q=>`<button type="button">${q}</button>`).join('')}</div><form class="case-question-form"><label for="case-question-input">${t.question}</label><textarea id="case-question-input" maxlength="1200" rows="2" required placeholder="${t.placeholder}"></textarea><small>${t.privacy}</small><p class="case-question-status" role="status"></p><div class="case-question-actions"><button type="button" class="text-btn case-chat-reset">${t.restart}</button><button type="submit" class="primary-btn">${t.send}</button></div></form><details class="ops-brief-evidence case-chat-evidence"><summary>${t.sources}</summary>${evidenceMarkup(draft.facts)}</details>`;
    document.body.append(dialog);
    const log=dialog.querySelector('.case-conversation'),form=dialog.querySelector('form'),input=dialog.querySelector('textarea'),status=dialog.querySelector('[role="status"]');
    const draw=()=>{log.innerHTML=turns.map(turn=>`<article class="case-message ${turn.role}"><strong>${turn.role==='user'?t.you:t.assistant}</strong>${turn.role==='user'?`<p>${esc(turn.text)}</p>`:citedItem({text:turn.text,evidenceIds:turn.evidenceIds},draft.facts)}</article>`).join('');wireCitations(log,dialog);log.scrollTop=log.scrollHeight;};
    let busy=false;
    dialog.querySelector('.icon-button').onclick=()=>dialog.close();
    dialog.addEventListener('close',()=>{if(busy)turns.pop();dialog.remove();});
    dialog.querySelector('.case-chat-reset').onclick=()=>{turns.length=0;draw();status.textContent='';input.focus();};
    dialog.querySelectorAll('.case-question-suggestions button').forEach(button=>button.onclick=()=>{input.value=button.textContent;input.focus();});
    form.onsubmit=async event=>{
      event.preventDefault();const question=input.value.trim();if(!question||busy)return;
      busy=true;status.textContent=t.thinking;
      dialog.querySelectorAll('form button,.case-question-suggestions button').forEach(button=>button.disabled=true);input.disabled=true;
      const history=turns.slice(-8).map(({role,text})=>({role,text}));
      turns.push({role:'user',text:question});input.value='';draw();
      try{
        const response=await backendJSON('/case-question',{caseId:item.id,assessmentId:item.assessmentId,language,question,history,evidenceFingerprint:draft.evidenceFingerprint},55000);
        if(!dialog.isConnected)return;
        turns.push({role:'assistant',text:response.answer.text,evidenceIds:response.answer.evidenceIds});draw();status.textContent=t.review;
      }catch(error){if(!dialog.isConnected)return;turns.pop();input.value=question;draw();status.textContent=language==='ar'?'تعذّر الحصول على إجابة. حاول مجددًا؛ وإذا تغيّرت الحالة فأعِد فتحها.':error.message;}
      finally{busy=false;dialog.querySelectorAll('form button,.case-question-suggestions button').forEach(button=>button.disabled=false);input.disabled=false;if(dialog.open)input.focus();}
    };
    draw();dialog.showModal();input.focus();
  }
  function renderAssistant(draft,host,item,language){
    const t=copy[language],brief=draft.explanation;
    host.innerHTML=`<div class="case-brief-overview">${citedItem(brief.overview,draft.facts)}</div><div class="case-brief-point"><h4>${t.why}</h4>${citedItem(brief.whyItMatters,draft.facts)}</div>${brief.nextSteps.length?`<div class="case-brief-point"><h4>${t.next}</h4>${brief.nextSteps.slice(0,1).map(step=>citedItem(step,draft.facts)).join('')}</div>`:''}<p class="case-draft-note">${t.draft}</p><button type="button" class="case-ask-button">${t.ask} <span aria-hidden="true">↗</span></button><details class="ops-brief-evidence"><summary>${t.sources}</summary><h4>${t.more}</h4>${[...brief.findings,...brief.questions,...brief.nextSteps.slice(1)].map(part=>citedItem(part,draft.facts)).join('')}${evidenceMarkup(draft.facts)}<p class="case-draft-note">${esc(draft.provider)} · ${esc(draft.model)} · ${esc(new Date(draft.generatedAt).toLocaleString(language==='ar'?'ar-SA':'en-GB'))}</p></details>`;
    wireCitations(host,host);host.querySelector('.case-ask-button').onclick=()=>openConversation(item,draft,language);
  }
  function enhanceCase(){
    const item=portfolioCases().find(c=>c.id===selectedId),panel=document.querySelector('#case-panel');panel.hidden=!casePanelOpen;document.body.classList.toggle('case-drawer-open',casePanelOpen);if(!item||!casePanelOpen)return;
    const language=caseSummaryLanguage==='ar'?'ar':'en',t=copy[language],ar=language==='ar',autoGenerate=translateOnLoad;translateOnLoad=false;
    const view=MadarCasePresentation,score=view.score(item),state=view.state(item),financial=view.financial(item);
    const hero=panel.querySelector('.case-hero');hero.querySelector('h2').id='case-review-title';panel.setAttribute('role','complementary');panel.removeAttribute('aria-modal');panel.setAttribute('aria-labelledby','case-review-title');
    const riskNames={High:'High risk',Medium:'Medium risk',Low:'Low risk',Incomplete:'Evidence incomplete'};
    const riskArabic={High:'مخاطر مرتفعة',Medium:'مخاطر متوسطة',Low:'مخاطر منخفضة',Incomplete:'أدلة غير مكتملة'};
    const ring=hero.querySelector('.score-ring');
    ring.classList.add('case-priority-ring');ring.style.setProperty('--score',`${score.value??0}%`);
    if(score.value===null)ring.classList.add('qualitative');
    ring.innerHTML=`<div><strong>${score.value===null?(state.incomplete?'!':item.modelAssessment?.modelFlagged?'↗':'✓'):esc(score.value)}</strong><small>${esc(ar?riskArabic[item.risk]||item.risk:riskNames[item.risk]||item.risk)}</small></div>`;
    ring.setAttribute('aria-label',`${score.label}${score.value===null?'':': '+score.value+'/100'}. ${riskNames[item.risk]||item.risk}`);
    const scoreLabel=document.createElement('p');scoreLabel.className='case-score-caption';scoreLabel.textContent=score.value===null?(ar?(state.incomplete?'لا توجد درجة':'تقييم نمط · بلا درجة موحّدة'):score.label):(ar?(score.kind==='simulation'?'درجة المحاكاة':'درجة الضوابط'):score.label);const scoreColumn=document.createElement('div');scoreColumn.className='case-score-column';ring.replaceWith(scoreColumn);scoreColumn.append(ring,scoreLabel);if(state.resolved){const originalSignal=document.createElement('small');originalSignal.className='case-original-signal';originalSignal.textContent=ar?'وقت التقييم':'At assessment';scoreColumn.append(originalSignal);}
    const status=document.createElement('div');status.className='case-header-status';status.innerHTML=`<span>${esc(state.status)}</span><span>${ar?'بيانات تجريبية':'Synthetic demo'}</span>${state.scripted?`<span>${ar?'نتيجة توضيحية':'Scripted outcome'}</span>`:''}`;hero.append(status);
    const toolbar=document.createElement('div');toolbar.className='case-panel-toolbar';toolbar.innerHTML=`<span>${ar?'مراجعة الحالة':'CASE REVIEW'}</span><button type="button" class="case-expand" aria-pressed="${panel.classList.contains('case-drawer-wide')}">${panel.classList.contains('case-drawer-wide')?(ar?'تصغير الحالة':'Compact case'):(ar?'توسيع الحالة':'Expand case')} <span aria-hidden="true">⤢</span></button>`;hero.before(toolbar);
    const closeCase=document.createElement('button');closeCase.type='button';closeCase.className='case-close-button';closeCase.setAttribute('aria-label','Close case');closeCase.textContent='×';toolbar.append(closeCase);closeCase.onclick=closeDrawer;
    toolbar.querySelector('button').onclick=()=>{const expanded=panel.classList.toggle('case-drawer-wide');toolbar.querySelector('button').setAttribute('aria-pressed',expanded);toolbar.querySelector('button').textContent=expanded?(ar?'تصغير الحالة':'Compact case'):(ar?'توسيع الحالة':'Expand case');panel.scrollTop=0;};
    if(item.crossJourneyEvidence && window.madarConnectedEvidence){
      const evidence=document.createElement('section');evidence.className='detail-section';evidence.innerHTML='<h3>Connected journey evidence</h3>'+window.madarConnectedEvidence(item.crossJourneyEvidence);
      const timeline=panel.querySelector('.timeline')?.closest('section');if(timeline)timeline.replaceWith(evidence);else panel.append(evidence);
    }
    const action=panel.querySelector('.recommendation')?.closest('section'),controls=action?.querySelector('.action-row');
    const sourceSections=[...panel.children].filter(node=>node.matches('section.detail-section')&&node!==action);
    const groupNames={context:ar?'الأطراف والسياق المالي':'People & financial context',activity:ar?'تسلسل الأحداث والمصادر':'Activity & source records',assessment:ar?'التقييم واحتساب الدرجة':'Assessment & scoring',history:ar?'سجل المراجعات':'Review history'};
    const sourceHost=document.createElement('div');sourceHost.className='case-source-groups';
    const groups={};for(const [key,title] of Object.entries(groupNames)){const group=document.createElement('details');group.id='case-source-'+key;group.className='case-source-group';group.innerHTML=`<summary>${title}</summary>`;groups[key]=group;sourceHost.append(group);}
    for(const section of sourceSections){
      const heading=section.querySelector('h3')?.textContent||'';
      const key=/context/i.test(heading)?'context':/timeline|Connected journey/i.test(heading)?'activity':/history|scenario|governance|approval/i.test(heading)?'history':'assessment';
      if(/processing steps/i.test(heading)){const inner=document.createElement('details');inner.className='case-processing';inner.innerHTML='<summary>Processing details</summary>';inner.append(section);groups.assessment.append(inner);}else groups[key].append(section);
    }
    const scoreNote=document.createElement('p');scoreNote.className='case-score-note';scoreNote.textContent=score.note;groups.assessment.querySelector('summary').after(scoreNote);
    if(!groups.activity.querySelector('section'))groups.activity.insertAdjacentHTML('beforeend','<p class="case-source-empty">No separate source timeline is supplied for this example.</p>');
    if(!groups.history.querySelector('section'))groups.history.insertAdjacentHTML('beforeend','<p class="case-source-empty">No specialist review has been recorded.</p>');
    const trace=groups.assessment.querySelector('.agent-trace')?.children[1];if(trace&&(item.rulesAssessment||!item.modelAssessment?.complete)){trace.querySelector('strong').textContent=item.rulesAssessment?.complete?'Business control checked':'Assessment deferred';trace.querySelector('small').textContent=item.rulesAssessment?.complete?'Supplied records checked against the illustrative business rule; no AI model used.':'Complete the required evidence before model review.';}
    action?.remove();
    const keyFacts=document.createElement('section');keyFacts.className='detail-section case-key-facts';keyFacts.innerHTML=`<h3>${ar?'أبرز الأدلة':'Key evidence'}</h3>${view.keyEvidence(item).map(fact=>`<button type="button" class="case-fact" data-source="${fact.target}"><strong>${esc(fact.title)}</strong><span>${esc(fact.text)}</span><small>${ar?'عرض المصدر':'View source'} ↗</small></button>`).join('')}<div class="case-exposure-line"><span>${esc(financial.label)}</span><strong>${financial.amount===null?(ar?'غير متاح':'Not supplied'):formatSar(financial.amount)}</strong></div>`;
    keyFacts.querySelectorAll('[data-source]').forEach(button=>button.onclick=()=>{const group=groups[button.dataset.source];group.open=true;group.scrollIntoView({behavior:'smooth',block:'start'});group.querySelector('summary').focus();});
    const next=document.createElement('section');next.className='detail-section case-next-step';
    const owner=routeOwnership(item);
    next.innerHTML=`<h3>${esc(state.resolved?(ar?'النتيجة المسجلة':'Recorded outcome'):state.incomplete?(ar?'الأدلة المطلوبة':'Evidence needed'):(ar?'الخطوة التالية':'Next step'))}</h3><strong class="case-next-title">${esc(state.resolved?item.outcome:item.route)}</strong><p>${esc(state.resolved?(item.financialOutcome||'Outcome recorded. Review the history for supporting notes.'):owner.next)}</p><dl><div><dt>${state.resolved?'Recorded by':'Recommended team'}</dt><dd>${esc(state.resolved?item.decisionOwner||'See review history':owner.owner)}</dd></div></dl>${state.scripted?'<small>Scripted demonstration outcome · not an actual finding or realised saving.</small>':''}`;
    const workflow=document.createElement('details');workflow.className='case-workflow';
    const stages=['New','Triage','Investigation','Decision pending','Closed'],current=item.workflow||{stage:'New',revision:0,assignedTo:''},stageIndex=stages.indexOf(current.stage);
    workflow.innerHTML=`<summary>${ar?'متابعة الحالة':'Case ownership & progress'} · ${esc(current.stage)}</summary><p>${ar?'الفريق المقترح':'Recommended team'}: ${esc(MadarRoutingPolicy.ownership(item.route,item.journey).owner)}</p><p>${ar?'النتيجة والمسار ومرحلة العمل حقول منفصلة.':'The recommended route, specialist outcome and work stage are tracked separately.'}</p><form><label>Case owner<input name="assignedTo" maxlength="120" required value="${esc(current.assignedTo)}"></label><label>Work stage<select name="workflowStage">${stages.map((stage,index)=>`<option ${stage===current.stage?'selected':''} ${Math.abs(index-stageIndex)>1?'disabled':''}>${stage}</option>`).join('')}</select></label><label>Reviewer<input name="actorName" maxlength="120" required></label><label>Rationale<textarea name="note" maxlength="2000" required rows="2"></textarea></label><button class="secondary-btn" type="submit" ${!item.assessmentId?'disabled':''}>Save case progress</button><p role="status" aria-live="polite"></p></form>`;
    next.append(workflow);
    workflow.querySelector('form').onsubmit=async event=>{
      event.preventDefault();const form=event.currentTarget,button=form.querySelector('button'),status=form.querySelector('[role="status"]');button.disabled=true;status.textContent='Saving…';
      try{const fields=Object.fromEntries(new FormData(form));const saved=await backendJSON('/case-workflow',{...fields,caseId:item.id,assessmentId:item.assessmentId,expectedRevision:current.revision});const index=cases.findIndex(c=>c.id===item.id);if(index>=0)cases[index]={...saved.caseData,assessmentId:saved.assessmentId};renderAll();showToast('Case owner and progress saved.');}
      catch(error){status.textContent=error.message;button.disabled=false;}
    };
    const footer=document.createElement('footer');footer.className='case-review-footer';footer.innerHTML=`<small>${ar?'القرار النهائي للمختص':'The specialist retains the final decision.'}</small><button type="button" class="primary-btn">${esc(ar?(state.resolved?'تحديث النتيجة':'تسجيل المراجعة'):state.action)}</button>`;
    footer.querySelector('button').disabled=!item.assessmentId;
    const chooser=document.createElement('dialog');chooser.id='case-review-actions';chooser.className='case-review-dialog';chooser.setAttribute('aria-labelledby','case-review-heading');chooser.innerHTML=`<div class="dialog-head"><div><h2 id="case-review-heading">${ar?'تسجيل المراجعة':'Record review'}</h2><p>${esc(item.transactionId)} · ${esc(state.status)}</p></div><button type="button" class="icon-button" aria-label="Close">×</button></div><p>Choose how to proceed. Your name and rationale are required when saving.</p>`;
    if(controls){controls.querySelector('#record-outcome-btn').textContent=state.resolved?'Update outcome':'Record outcome';if(state.resolved)controls.querySelectorAll('#approve-route,#override-route-btn,#reject-route').forEach(button=>button.hidden=true);controls.querySelector('#record-outcome-btn').addEventListener('click',()=>{const heading=document.querySelector('#outcome-dialog h2');if(heading)heading.textContent=state.resolved?'Update specialist outcome':'Record specialist outcome';},true);chooser.append(controls);controls.addEventListener('click',event=>{if(event.target.closest('button:not(:disabled)'))chooser.close();},true);}
    chooser.querySelector('.icon-button').onclick=()=>chooser.close();document.body.append(chooser);footer.querySelector('button').onclick=()=>{if(state.resolved){chooser.querySelector('#record-outcome-btn').click();}else chooser.showModal();};
    const assistant=document.createElement('section');assistant.className='detail-section ops-assistant';assistant.lang=language;assistant.dir=ar?'rtl':'ltr';
    assistant.innerHTML=`<div class="case-brief-heading"><h3>${t.title}</h3><div class="case-language-switch" role="group" aria-label="Explanation language"><button type="button" data-language="en" aria-pressed="${language==='en'}">English</button><button type="button" data-language="ar" aria-pressed="${language==='ar'}" lang="ar">العربية</button></div></div><div class="ops-llm-draft"><p class="case-brief-intro">${t.intro}</p></div><button class="primary-btn case-explain-button" disabled>${t.loading}</button><p class="ops-llm-status" role="status"></p>`;
    hero.after(assistant);assistant.after(keyFacts);keyFacts.after(next);next.after(sourceHost);sourceHost.after(footer);
    assistant.querySelectorAll('[data-language]').forEach(button=>button.onclick=()=>{if(caseSummaryLanguage===button.dataset.language)return;translateOnLoad=!!assistant.querySelector('.case-ask-button');caseSummaryLanguage=button.dataset.language;renderCase();});
    const button=assistant.querySelector('.case-explain-button'),message=assistant.querySelector('[role="status"]'),host=assistant.querySelector('.ops-llm-draft');
    if(!item.assessmentId || (!item.modelAssessment&&!item.rulesAssessment)){button.hidden=true;message.textContent=t.unsaved;return;}
    const attached=()=>assistant.isConnected && item.assessmentId===cases.find(c=>c.id===item.id)?.assessmentId;
    const showDraft=draft=>{renderAssistant(draft,host,item,language);button.hidden=true;message.textContent='';};
    Promise.all([backendJSON('/llm/status'),backendJSON('/case-explanation',{caseId:item.id,assessmentId:item.assessmentId,language,generate:false})]).then(([config,response])=>{
      if(!attached())return;if(response.draft){showDraft(response.draft);return;}
      button.textContent=t.generate;button.disabled=!config.configured;message.textContent=config.configured?'':t.setup;if(autoGenerate&&config.configured)button.click();
    }).catch(()=>{if(attached()){button.textContent=t.generate;button.disabled=false;message.textContent=t.unavailable;}});
    button.onclick=async()=>{button.disabled=true;button.textContent=t.loading;message.textContent='';try{const response=await backendJSON('/case-explanation',{caseId:item.id,assessmentId:item.assessmentId,language,generate:true},55000);if(attached())showDraft(response.draft);}catch(error){if(attached()){message.textContent=ar?t.unavailable:error.message;button.disabled=false;button.textContent=t.generate;}}};
  }
  const original=renderCase;renderCase=function(){document.querySelector('#case-review-actions')?.remove();original();enhanceCase()};
  let workspaceRequest=null;
  async function refreshWorkspace(){
    if(workspaceRequest)return workspaceRequest;
    workspaceRequest=(async()=>{
      const response=await backendJSON('/workspace-demo',{},60000);
      cases=response.saved.map(record=>({...record.caseData,assessmentId:record.assessmentId}));
      if(selectedId&&!cases.some(item=>item.id===selectedId)){selectedId=null;casePanelOpen=false;}
      renderAll();return response;
    })().finally(()=>{workspaceRequest=null;});
    return workspaceRequest;
  }
  window.madarRefreshWorkspace=refreshWorkspace;
  let loadingDemo=false;
  async function loadDemo(){
    if(loadingDemo)return;loadingDemo=true;
    const buttons=[...document.querySelectorAll('[data-load-demo]')];
    const status=document.querySelector('.demo-load-status');
    buttons.forEach(button=>{button.disabled=true;button.textContent='Preparing cases…';});
    if(status)status.textContent='Preparing the shared case workspace…';
    try{const response=await refreshWorkspace();if(status)status.textContent=response.saved.length+' cases ready. Existing reviews are retained.';showToast('Demo cases are ready.');}
    catch(error){if(status)status.textContent=error.message;showToast(error.message);}
    finally{loadingDemo=false;buttons.forEach(button=>{button.disabled=false;button.textContent='Refresh demo cases';});}
  }
  document.querySelectorAll('[data-load-demo]').forEach(button=>button.addEventListener('click',loadDemo));
  const routeLibrary=document.querySelector('#business-route-library');
  if(routeLibrary)routeLibrary.innerHTML=MadarRoutingPolicy.routes.map(route=>{const context=MadarRoutingPolicy.ownership(route);return `<article><h4>${esc(route)}</h4><strong>${esc(context.owner)}</strong><p>${esc(context.next)}</p>${route==='Business Owner Review'?'<small>The accountable owner follows the case service journey.</small>':''}</article>`;}).join('');
  switchView('dashboard');
  refreshWorkspace().catch(error=>showToast('Could not load the workspace: '+error.message));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.querySelector('dialog[open]')&&casePanelOpen)closeDrawer();});
})();
