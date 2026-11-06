/* A short executive brief, with specialist evidence and questions on demand. */
(() => {
  const esc=escapeHtml;
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
    const item=portfolioCases().find(c=>c.id===selectedId),panel=document.querySelector('#case-panel');if(!item)return;
    const language=caseSummaryLanguage==='ar'?'ar':'en',t=copy[language],autoGenerate=translateOnLoad;translateOnLoad=false;
    // The opening view is a brief. Full evidence and specialist controls remain accessible.
    const assessmentStep=panel.querySelector('.agent-trace')?.children[1];
    if(assessmentStep && (item.rulesAssessment || !item.modelAssessment?.complete)){
      assessmentStep.querySelector('strong').textContent=item.rulesAssessment?.complete?'Business control checked':'Assessment deferred';
      assessmentStep.querySelector('small').textContent=item.rulesAssessment?.complete?'Supplied records checked against the illustrative business rule; no AI model used.':'Required source evidence is incomplete; complete it before relying on the assessment.';
    }
    const hero=panel.querySelector('.case-hero');
    hero.querySelector('.score-ring')?.remove();
    const current=document.createElement('p');current.className='case-current-status';current.textContent=t.status+': '+item.status+(item.outcomeProvenance==='Scripted demo outcome'?(language==='ar'?' · نتيجة تجريبية':' · Scripted demo outcome'):'');hero.append(current);
    if(item.crossJourneyEvidence && window.madarConnectedEvidence){
      const evidence=document.createElement('section');evidence.className='detail-section';evidence.innerHTML='<h3>Connected journey evidence</h3>'+window.madarConnectedEvidence(item.crossJourneyEvidence);
      const timeline=panel.querySelector('.timeline')?.closest('section');if(timeline)timeline.replaceWith(evidence);else panel.append(evidence);
    }
    const action=panel.querySelector('.recommendation')?.closest('section');
    const details=document.createElement('details');details.className='case-evidence-details';details.innerHTML=`<summary>${t.evidence}</summary>`;
    [...panel.children].filter(node=>node.matches('section.detail-section')&&node!==action).forEach(node=>details.append(node));
    panel.append(details);
    if(action){
      hero.after(action);
      const controls=action.querySelector('.action-row');
      if(controls){const specialist=document.createElement('details');specialist.className='case-specialist-actions';specialist.innerHTML=`<summary>${t.decision}</summary>`;specialist.append(controls);action.append(specialist);}
    }
    const assistant=document.createElement('section');assistant.className='detail-section ops-assistant';assistant.lang=language;assistant.dir=language==='ar'?'rtl':'ltr';
    assistant.innerHTML=`<div class="case-brief-heading"><h3>${t.title}</h3><div class="case-language-switch" role="group" aria-label="Explanation language"><button type="button" data-language="en" aria-pressed="${language==='en'}">English</button><button type="button" data-language="ar" aria-pressed="${language==='ar'}" lang="ar">العربية</button></div></div><div class="ops-llm-draft"><p class="case-brief-intro">${t.intro}</p></div><button class="primary-btn case-explain-button" disabled>${t.loading}</button><p class="ops-llm-status" role="status"></p>`;
    hero.after(assistant);
    assistant.querySelectorAll('[data-language]').forEach(button=>button.onclick=()=>{if(caseSummaryLanguage===button.dataset.language)return;translateOnLoad=!!assistant.querySelector('.case-ask-button');caseSummaryLanguage=button.dataset.language;renderCase();});
    const button=assistant.querySelector('.case-explain-button'),status=assistant.querySelector('[role="status"]'),host=assistant.querySelector('.ops-llm-draft');
    if(!item.assessmentId || (!item.modelAssessment&&!item.rulesAssessment)){button.hidden=true;status.textContent=t.unsaved;return;}
    const attached=()=>assistant.isConnected && item.assessmentId===cases.find(c=>c.id===item.id)?.assessmentId;
    const showDraft=draft=>{renderAssistant(draft,host,item,language);button.hidden=true;status.textContent='';};
    Promise.all([backendJSON('/llm/status'),backendJSON('/case-explanation',{caseId:item.id,assessmentId:item.assessmentId,language,generate:false})]).then(([config,response])=>{
      if(!attached())return;
      if(response.draft){showDraft(response.draft);return;}
      button.textContent=t.generate;button.disabled=!config.configured;status.textContent=config.configured?'':t.setup;if(autoGenerate && config.configured)button.click();
    }).catch(()=>{if(attached()){button.textContent=t.generate;button.disabled=false;status.textContent=t.unavailable;}});
    button.onclick=async()=>{
      button.disabled=true;button.textContent=t.loading;status.textContent='';
      try{const response=await backendJSON('/case-explanation',{caseId:item.id,assessmentId:item.assessmentId,language,generate:true},55000);if(attached())showDraft(response.draft);}
      catch(error){if(attached()){status.textContent=language==='ar'?t.unavailable:error.message;button.disabled=false;button.textContent=t.generate;}}
    };
  }
  const original=renderCase;renderCase=function(){original();enhanceCase()};
  let loadingDemo=false;
  async function loadDemo(){
    if(loadingDemo)return;
    loadingDemo=true;
    const buttons=[...document.querySelectorAll('[data-load-demo]')];
    const status=document.querySelector('.demo-load-status');
    buttons.forEach(button=>{button.disabled=true;button.textContent='Assessing demo cases…'});
    status.textContent='Preparing all journeys, rule findings and AI results…';
    try{
      const response=await backendJSON('/demo-portfolio',{},60000);
      for(const record of response.saved){const index=cases.findIndex(item=>item.id===record.caseId);if(index<0)cases.push(record.caseData);else cases[index]=record.caseData;}
      useAssessedPortfolio();selectedId='CJ-SYN-enterprise-001';activeFilter='All';activeJourney='All';activeRegion='All';searchQuery='';
      document.querySelector('#case-search').value='';
      renderAll();switchView('queue');
      status.textContent='Demo cases are ready in the Intelligence Queue. Existing saved reviews have been retained.';
      showToast('Enterprise portfolio ready: rules across all journeys, SANED and cross-journey AI.');
    }catch(error){
      renderAll();switchView('intake');
      status.textContent='Demo loading could not finish: '+error.message+' Any completed assessments are saved. Retry to load the remaining cases.';
    }finally{loadingDemo=false;buttons.forEach(button=>{button.disabled=false;button.textContent='Load & assess demo cases'});}
  }
  document.querySelectorAll('[data-load-demo]').forEach(button=>button.addEventListener('click',loadDemo));
  switchView('dashboard');
})();
