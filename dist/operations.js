/* Reference case-review layout with on-demand explanations and evidence-grounded questions. */
(() => {
  const esc=escapeHtml;
  function closeDrawer(){document.querySelector('#case-tools-button').hidden=true;document.querySelector('#queue-view').classList.remove('review-open');casePanelOpen=false;document.querySelector('#case-panel').hidden=true;document.body.classList.remove('case-drawer-open');document.querySelector('[data-case="'+CSS.escape(selectedId||'')+'"]')?.focus({preventScroll:true});}

  const conversations=new Map();
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
  function flattenCaseSections(host){
    host.querySelectorAll('details').forEach(details=>{
      const section=document.createElement('section');section.className=details.className;section.id=details.id;
      const summary=details.querySelector(':scope > summary');if(summary){const heading=document.createElement('h4');heading.textContent=summary.textContent;summary.replaceWith(heading);}
      section.append(...details.childNodes);details.replaceWith(section);
    });
  }
  function enhanceCase(){
    const item=portfolioCases().find(c=>c.id===selectedId),panel=document.querySelector('#case-panel');
    panel.hidden=!casePanelOpen;panel.classList.add('reference-case');
    document.querySelector('#queue-view').classList.toggle('review-open',casePanelOpen);
    document.body.classList.toggle('case-drawer-open',casePanelOpen);
    const toolsButton=document.querySelector('#case-tools-button');toolsButton.hidden=!item||!casePanelOpen;
    if(!item||!casePanelOpen)return;
    const language=caseSummaryLanguage==='ar'?'ar':'en',ar=language==='ar',state=MadarCasePresentation.state(item),score=MadarCasePresentation.score(item);
    const hero=panel.querySelector('.case-hero');hero.querySelector('h2').id='case-review-title';panel.setAttribute('role','complementary');panel.setAttribute('aria-labelledby','case-review-title');panel.removeAttribute('aria-modal');
    const ring=hero.querySelector('.score-ring');ring.style.setProperty('--score',score.value===null?'0%':score.value+'%');if(score.value===null)ring.classList.add('reference-qualitative');
    ring.innerHTML=`<div><strong>${score.value===null?(state.incomplete?'—':item.modelAssessment?.modelFlagged?'↗':'✓'):esc(score.value)}</strong><small>${esc(score.value===null?(state.incomplete?'Incomplete':'Model finding'):score.label)}</small></div>`;
    ring.setAttribute('aria-label',`${score.label}${score.value===null?'':': '+score.value+'/100'}`);
    const close=document.createElement('button');close.className='reference-case-close';close.type='button';close.setAttribute('aria-label','Close case');close.textContent='×';close.onclick=closeDrawer;hero.append(close);
    const sections=[...panel.querySelectorAll(':scope > section')];
    const find=title=>sections.find(section=>section.querySelector('h3')?.textContent.toLowerCase().includes(title));
    const identity=find('customer, employer'),financial=find('financial and intervention'),components=find('assessment components'),reasons=find('assessment reasons'),quality=find('data quality'),timeline=find('behavioral timeline'),activity=find('assessment processing'),action=find('recommended proportionate');
    reasons.querySelector('h3').textContent='Explainable reason codes';quality.querySelector('h3').textContent='Data quality & confidence';activity.querySelector('h3').textContent='AI agent activity';
    const trace=activity.querySelector('.agent-trace')?.children[1];
    if(trace&&(item.rulesAssessment||!item.modelAssessment?.complete)){trace.querySelector('strong').textContent=item.rulesAssessment?.complete?'Business control checked':'Assessment deferred';trace.querySelector('small').textContent=item.rulesAssessment?.complete?'Supplied records checked against the illustrative business rule; no AI model used.':'Complete the required evidence before model review.';}
    const summary=document.createElement('section');summary.className='detail-section case-explanation-section'+(ar?' rtl-summary':'');summary.dir=ar?'rtl':'ltr';
    summary.innerHTML=`<div class="summary-heading"><h3 class="detail-title">${ar?'شرح الحالة':'Case explanation'}</h3><div class="summary-actions"><button type="button" id="summary-language-toggle">${ar?'English':'العربية'}</button></div></div><button type="button" class="primary-btn reference-explain-button" disabled>${ar?'اشرح هذه الحالة':'Explain this case'}</button><p class="reference-explain-status" role="status">${ar?'جارٍ التحقق من خدمة الشرح…':'Checking explanation service…'}</p><div class="reference-explanation-content"></div>`;
    summary.querySelector('#summary-language-toggle').onclick=()=>{caseSummaryLanguage=ar?'en':'ar';renderCase();};
    const assistant=document.createElement('section');assistant.className='detail-section case-assistant-section';assistant.dir=ar?'rtl':'ltr';
    const questions=[['risk_reason','Why is the case rated at this level?'],['evidence_review','What evidence needs review?'],['missing_data','What data is missing or conflicting?'],['next_step','What route and next step are recommended?'],['rules_compare','How does this differ from current rules?'],['journey_events','What events are linked across the journey?']];
    if(ar){const labels=['لماذا صُنفت الحالة بهذا المستوى؟','ما الأدلة التي تحتاج إلى مراجعة؟','ما البيانات الناقصة أو المتعارضة؟','ما المسار والخطوة التالية؟','كيف تختلف النتيجة عن القواعد الحالية؟','ما الأحداث المرتبطة عبر الرحلة؟'];questions.forEach((question,index)=>question[1]=labels[index]);}
    assistant.innerHTML=`<div class="assistant-title-row"><div><h3>${ar?'مساعد ذكاء الحالة':'Case Intelligence Assistant'}</h3><small class="reference-assistant-mode">${ar?'نموذج تفاعلي مقيّد · يستند إلى أدلة الحالة':'Offline interactive prototype · grounded in case evidence'}</small></div><span>${ar?'القرار البشري مطلوب':'Human decision required'}</span></div><div class="assistant-suggestions">${questions.map(([key,text])=>`<button type="button" data-assistant-question="${key}">${text}</button>`).join('')}</div><div class="assistant-chat" aria-live="polite" role="log"><div class="assistant-message assistant"><span>Madar AI</span><p>Ask about the risk score, evidence, data quality, linked events, or recommended route.</p></div></div><form class="assistant-form" id="case-assistant-form"><input id="case-assistant-input" maxlength="1200" autocomplete="off" aria-label="Ask a question about this case" placeholder="${ar?'اسأل عن هذه الحالة…':'Ask a question about this case…'}" required><button type="submit">${ar?'إرسال':'Send'}</button><button type="button" id="case-assistant-clear" class="assistant-clear">${ar?'مسح':'Clear'}</button></form><small class="assistant-boundary">The assistant uses only this case’s evidence. It does not confirm fraud or replace the specialist decision.</small>`;
    // Preserve extra working capabilities outside the reference case-review layout.
    const tools=document.createElement('dialog');tools.id='case-review-tools';tools.className='case-question-dialog reference-tools';tools.innerHTML=`<div class="dialog-head"><div><h2>Case tools</h2><p>${esc(item.transactionId)} · ${esc(state.status)}</p></div><button type="button" class="icon-button" aria-label="Close case tools">×</button></div>`;
    tools.querySelector('button').onclick=()=>tools.close();document.body.append(tools);toolsButton.onclick=()=>tools.showModal();
    const workflow=document.createElement('section');workflow.className='case-workflow';
    const stages=['New','Triage','Investigation','Decision pending','Closed'],current=item.workflow||{stage:'New',revision:0,assignedTo:''},stageIndex=stages.indexOf(current.stage);
    workflow.innerHTML=`<h3>Case ownership & progress</h3><p>${esc(state.status)} · ${esc(current.assignedTo||'Unassigned')}. ${item.workflow?'Saved work stage: '+esc(current.stage)+'.':'Work stages have not been tracked yet; this does not reset the existing outcome.'}</p><form><label>Case owner<input name="assignedTo" maxlength="120" required value="${esc(current.assignedTo)}"></label><label>Tracked work stage<select name="workflowStage">${stages.map((stage,index)=>`<option ${stage===current.stage?'selected':''} ${Math.abs(index-stageIndex)>1?'disabled':''}>${stage}</option>`).join('')}</select></label><label>Reviewer<input name="actorName" maxlength="120" required></label><label>Rationale<textarea name="note" maxlength="2000" required rows="2"></textarea></label><button class="secondary-btn" type="submit" ${!item.assessmentId?'disabled':''}>Save case progress</button><p role="status" aria-live="polite"></p></form>`;
    tools.append(workflow);for(const detail of quality.querySelectorAll('details'))tools.append(detail);workflow.querySelector('form').onsubmit=async event=>{
      event.preventDefault();const form=event.currentTarget,button=form.querySelector('button'),status=form.querySelector('[role="status"]');button.disabled=true;status.textContent='Saving…';
      try{const saved=await backendJSON('/case-workflow',{...Object.fromEntries(new FormData(form)),caseId:item.id,assessmentId:item.assessmentId,expectedRevision:current.revision});const index=cases.findIndex(c=>c.id===item.id);if(index>=0)cases[index]={...saved.caseData,assessmentId:saved.assessmentId};renderAll();showToast('Case owner and progress saved.');}
      catch(error){status.textContent=error.message;button.disabled=false;}
    };
    const routeContext=MadarRoutingPolicy.ownership(item.route,item.journey);const ownerValues=action.querySelectorAll('.ownership-card strong');if(ownerValues[0])ownerValues[0].textContent=routeContext.owner;if(ownerValues[1])ownerValues[1].textContent=routeContext.next;
    const controls=action.querySelector('.action-row'),reject=controls.querySelector('#reject-route');reject.textContent='Return recommendation for review';tools.append(reject);
    controls.querySelector('#record-outcome-btn').textContent=state.resolved?'Update outcome':'Record outcome';
    if(state.resolved){const note=document.createElement('p');note.className='session-note';note.textContent=state.status+'. '+(item.workflow?.stage==='Closed'?'Reopen using Case tools before amending the outcome.':'Routing is locked because an outcome is recorded. Use Case tools for closeout.');controls.before(note);}
    if(item.workflow?.stage==='Closed')controls.querySelector('#record-outcome-btn').disabled=true;
    const main=[identity,financial,summary,assistant,components,reasons,quality,timeline,activity,action];
    for(const section of sections)if(!main.includes(section))tools.append(section);
    panel.replaceChildren(hero,...main);
    flattenCaseSections(panel);
    const key=[item.id,item.assessmentId,language].join(':');
    const turns=conversations.get(key)||[];conversations.set(key,turns);
    let configured=false,draft=null,busy=false;
    const chat=assistant.querySelector('.assistant-chat'),input=assistant.querySelector('input'),form=assistant.querySelector('form');
    const add=(role,text)=>{const message=document.createElement('div');message.className='assistant-message '+role;message.innerHTML=`<span>${role==='user'?'You':'Madar AI'}</span><p>${esc(text)}</p>`;chat.append(message);chat.scrollTop=chat.scrollHeight;};
    for(const turn of turns)add(turn.role,turn.text);
    const offline={
      risk_reason:()=>MadarCasePresentation.mainReason(item)+' '+score.note,
      evidence_review:()=>MadarCasePresentation.keyEvidence(item).map(fact=>fact.text).join(' ')||'Review the supplied source records and assessment reasons.',
      missing_data:()=>item.dataQuality?.issues?.length?item.dataQuality.issues.map(issue=>issue.field+(issue.critical?' — required for assessment':'')).join('; '):state.incomplete?'Required model evidence is incomplete. See the data-quality section.':'No missing required fields are recorded. This does not independently verify source reliability.',
      next_step:()=>item.route+'. '+MadarRoutingPolicy.ownership(item.route,item.journey).owner+'. '+MadarRoutingPolicy.ownership(item.route,item.journey).next+' '+state.status+'.',
      rules_compare:()=>(item.comparison||'No separate control comparison is supplied.')+' '+score.note,
      journey_events:()=>item.events?.length?item.events.map(event=>event[0]+': '+event[1]).join('\n'):'No separate event timeline is supplied.'
    };
    const remember=(role,text)=>{turns.push({role,text});add(role,text);};
    assistant.querySelectorAll('[data-assistant-question]').forEach(button=>button.onclick=()=>{if(busy)return;remember('user',button.textContent);remember('assistant',offline[button.dataset.assistantQuestion]());});
    assistant.querySelector('#case-assistant-clear').onclick=()=>{if(busy)return;turns.length=0;chat.innerHTML='<div class="assistant-message assistant"><span>Madar AI</span><p>Ask about the risk score, evidence, data quality, linked events, or recommended route.</p></div>';input.value='';};
    const explainButton=summary.querySelector('.reference-explain-button'),explainStatus=summary.querySelector('[role="status"]'),explainHost=summary.querySelector('.reference-explanation-content');
    const sourceReferences=()=>{
      tools.querySelector('.reference-ai-evidence')?.remove();
      const evidence=document.createElement('section');evidence.className='reference-ai-evidence ops-brief-evidence';evidence.innerHTML='<h3>AI evidence references</h3>'+evidenceMarkup(draft.facts);tools.append(evidence);
    };
    const bindReferences=host=>host.querySelectorAll('[data-evidence]').forEach(button=>button.onclick=()=>{
      const article=[...tools.querySelectorAll('.reference-ai-evidence article')].find(node=>node.id==='brief-fact-'+button.dataset.evidence);if(!article)return;if(!tools.open)tools.showModal();article.scrollIntoView({block:'center'});article.focus({preventScroll:true});
    });
    explainButton.onclick=async()=>{
      explainButton.disabled=true;explainStatus.textContent=ar?'جارٍ إعداد الشرح…':'Preparing explanation…';
      try{
        const result=await backendJSON('/case-explanation',{caseId:item.id,assessmentId:item.assessmentId,language,generate:true},55000);if(!summary.isConnected)return;draft=result.draft;sourceReferences();
        const brief=draft.explanation;explainHost.innerHTML=citedItem(brief.overview,draft.facts)+`<h4>${ar?'لماذا تستحق الاهتمام':'Why it matters'}</h4>`+citedItem(brief.whyItMatters,draft.facts)+`<h4>${ar?'ما الذي ينبغي التحقق منه':'What to check next'}</h4>`+brief.nextSteps.map(step=>citedItem(step,draft.facts)).join('');bindReferences(explainHost);explainStatus.textContent=ar?'مسودة بالذكاء الاصطناعي · تحقّق قبل اتخاذ القرار':'AI draft · verify before deciding';
      }catch(error){if(summary.isConnected)explainStatus.textContent=error.message;}
      finally{if(summary.isConnected)explainButton.disabled=false;}
    };
    if(item.assessmentId)Promise.all([backendJSON('/llm/status'),backendJSON('/case-explanation',{caseId:item.id,assessmentId:item.assessmentId,language,generate:false})]).then(([status,response])=>{
      if(!assistant.isConnected)return;configured=status.configured;draft=response.draft;explainButton.disabled=!configured;explainStatus.textContent=configured?'':(ar?'شرح الحالة بالذكاء الاصطناعي غير مُعدّ. أسئلة الأدلة أدناه متاحة.':'AI explanation is not configured. The evidence questions below remain available.');
      if(configured)assistant.querySelector('.reference-assistant-mode').textContent=ar?'أسئلة الأدلة · خدمة الذكاء الاصطناعي مُعدّة':'Evidence questions · AI connection configured';
    }).catch(()=>{if(summary.isConnected){explainButton.disabled=false;explainStatus.textContent='Could not check the explanation service. Try Explain this case again.';}});
    else explainStatus.textContent='Save an assessment before generating an AI explanation.';
    form.onsubmit=async event=>{
      event.preventDefault();const question=input.value.trim();if(!question||busy)return;
      const known=questions.find(([,text])=>text.toLowerCase()===question.toLowerCase());
      if(known){remember('user',question);remember('assistant',offline[known[0]]());input.value='';return;}
      if(!configured){remember('user',question);const match=/missing|conflict|quality/i.test(question)?'missing_data':/route|next|owner/i.test(question)?'next_step':/rule|control/i.test(question)?'rules_compare':/event|journey|sequence/i.test(question)?'journey_events':/why|risk|score/i.test(question)?'risk_reason':/evidence/i.test(question)?'evidence_review':null;remember('assistant',match?offline[match]():'Free-text AI is not configured. Use the six evidence questions above to inspect this case.');input.value='';return;}
      busy=true;assistant.querySelectorAll('button,input').forEach(el=>el.disabled=true);const history=turns.slice(-8).map(({role,text})=>({role,text}));remember('user',question);input.value='';
      try{
        if(!draft)draft=(await backendJSON('/case-explanation',{caseId:item.id,assessmentId:item.assessmentId,language,generate:true},55000)).draft;
        if(!assistant.isConnected)return;
        const response=await backendJSON('/case-question',{caseId:item.id,assessmentId:item.assessmentId,language,question,history,evidenceFingerprint:draft.evidenceFingerprint},55000);
        if(assistant.isConnected){remember('assistant',response.answer.text+'\nAI draft · verify against case evidence before deciding.');sourceReferences();const message=chat.lastElementChild;message.insertAdjacentHTML('beforeend',response.answer.evidenceIds.map(id=>`<button type="button" class="ops-evidence-link" data-evidence="${esc(id)}">[${draft.facts.findIndex(fact=>fact.id===id)+1}]</button>`).join(' '));bindReferences(message);}
      }catch(error){if(assistant.isConnected){if(turns.at(-1)?.role==='user')turns.pop();if(chat.lastElementChild?.classList.contains('user'))chat.lastElementChild.remove();input.value=question;add('assistant',error.message+' No case decision was changed.');}}
      finally{busy=false;if(assistant.isConnected){assistant.querySelectorAll('button,input').forEach(el=>el.disabled=false);input.focus();}}
    };
  }
  const original=renderCase;renderCase=function(){document.querySelector('#case-review-tools')?.remove();document.querySelector('#case-review-actions')?.remove();document.querySelector('#case-technical-evidence')?.remove();original();enhanceCase()};
  let workspaceRequest=null;
  async function refreshWorkspace(){
    if(workspaceRequest)return workspaceRequest;
    workspaceRequest=(async()=>{
      const response=await backendJSON('/workspace-demo',{},60000);
      cases=response.saved.map(record=>({...record.caseData,assessmentId:record.assessmentId}));
      if(selectedId&&!cases.some(item=>item.id===selectedId)){selectedId=null;casePanelOpen=false;}
      document.body.classList.remove('workspace-loading');document.querySelector('#workspace-load-status').hidden=true;renderAll();return response;
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
  refreshWorkspace().catch(error=>{document.querySelector('#workspace-load-status').textContent='Could not load cases. Use Refresh demo cases to retry. '+error.message;showToast('Could not load the workspace: '+error.message);});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.querySelector('dialog[open]')&&casePanelOpen)closeDrawer();});
})();
