/* Business case explanations within the Intelligence Queue. */
(() => {
  const esc=escapeHtml;
  function renderAssistant(draft,host){
    const titles={'assessment':'Original assessment','business-context':'Service and current case position','case-state':'Recorded outcome and financial context','connected-context':'Linked activity in the review window'};
    const facts=new Map(draft.facts.map((fact,index)=>[fact.id,{...fact,number:index+1,title:titles[fact.id]||fact.value.name||fact.value.contributor||fact.value.description||'Supporting evidence'}]));
    const renderItem=item=>`<p>${esc(item.text)} <span class="ops-citations">${item.evidenceIds.map(id=>`<button type="button" class="ops-evidence-link" data-evidence="${esc(id)}" aria-label="View evidence ${facts.get(id)?.number}: ${esc(facts.get(id)?.title)}">[${facts.get(id)?.number}]</button>`).join(' ')}</span></p>`;
    const plainKey=key=>key.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,c=>c.toUpperCase());
    const valueText=value=>value==null?'Not supplied':typeof value==='boolean'?(value?'Yes':'No'):String(value);
    const renderValue=value=>Array.isArray(value)?`<ol>${value.map(v=>`<li>${renderValue(v)}</li>`).join('')}</ol>`:value && typeof value==='object'?`<dl>${Object.entries(value).map(([key,v])=>`<div><dt>${esc(plainKey(key))}</dt><dd>${renderValue(v)}</dd></div>`).join('')}</dl>`:esc(valueText(value));
    host.innerHTML=`<span class="status-chip">AI draft · specialist review required</span><h4>Case in brief</h4>${renderItem(draft.explanation.overview)}<div class="ops-business-meaning"><h4>Why this matters</h4>${renderItem(draft.explanation.whyItMatters)}</div>${[['What the evidence shows','findings'],['What needs checking','questions'],['Suggested next steps','nextSteps']].map(([name,key])=>`<h4>${name}</h4>${draft.explanation[key].map(renderItem).join('')||'<p>No additional points supplied.</p>'}`).join('')}<details class="ops-brief-evidence"><summary>View supporting evidence</summary>${[...facts.values()].map(f=>`<article id="brief-fact-${esc(f.id)}" tabindex="-1"><h4>[${f.number}] ${esc(f.title)}</h4>${renderValue(f.value)}</article>`).join('')}</details><details class="ops-brief-provenance"><summary>About this AI draft</summary><p>${esc(draft.provider)} · ${esc(draft.model)} · ${esc(new Date(draft.generatedAt).toLocaleString())}</p><p>References point to saved case evidence. They do not guarantee the interpretation is correct. Verify the brief before using it in a decision.</p></details>`;
    host.querySelectorAll('[data-evidence]').forEach(button=>button.onclick=()=>{host.querySelector('.ops-brief-evidence').open=true;const target=host.querySelector('#brief-fact-'+button.dataset.evidence);target?.scrollIntoView({behavior:'smooth',block:'center'});target?.focus({preventScroll:true})});
  }
  function enhanceCase(){
    const item=portfolioCases().find(c=>c.id===selectedId), panel=document.querySelector('#case-panel');
    if(!item?.assessmentId || (!item.modelAssessment && !item.rulesAssessment))return;
    // Keep the original case review flow: summary, evidence, then specialist decision.
    const trace=panel.querySelector('.agent-trace');
    const assessmentStep=trace?.children[1];
    if(assessmentStep && (item.rulesAssessment || !item.modelAssessment?.complete)){
      assessmentStep.querySelector('strong').textContent=item.rulesAssessment?.complete?'Business control checked':'Assessment deferred';
      assessmentStep.querySelector('small').textContent=item.rulesAssessment?.complete?'Supplied records checked against the illustrative business rule; no AI model used.':'Required source evidence is incomplete; complete it before relying on the assessment.';
    }
    const overview=panel.querySelector('.ai-summary-section');
    const hero=panel.querySelector('.case-hero');
    if(overview && hero) hero.after(overview);
    if(item.crossJourneyEvidence && window.madarConnectedEvidence){
      const evidence=document.createElement('section');
      evidence.className='detail-section';
      evidence.innerHTML='<h3>Connected journey evidence</h3>'+window.madarConnectedEvidence(item.crossJourneyEvidence);
      const timelineSection=panel.querySelector('.timeline')?.closest('section');
      if(timelineSection) timelineSection.replaceWith(evidence);else panel.append(evidence);
    }
    const assistant=document.createElement('section');assistant.className='detail-section ops-assistant';assistant.innerHTML='<p class="eyebrow">SPECIALIST ASSISTANT</p><h3>AI case explanation</h3><p>Understand what happened, why it matters and what to check next — in business terms.</p><button class="primary-btn" disabled>Checking API setup…</button><p class="ops-llm-status" role="status"></p><div class="ops-llm-draft"></div>';
    if(overview)overview.before(assistant);else panel.append(assistant);
    const button=assistant.querySelector('button'), status=assistant.querySelector('.ops-llm-status'), draftHost=assistant.querySelector('.ops-llm-draft');
    const attached=()=>assistant.isConnected && item.assessmentId===cases.find(c=>c.id===item.id)?.assessmentId;
    Promise.all([backendJSON('/llm/status'),backendJSON('/case-explanation',{caseId:item.id,assessmentId:item.assessmentId,generate:false})]).then(([config,response])=>{if(!attached())return;button.textContent=response.draft?'Explanation saved':config.configured?'Explain this case':'API setup required';button.disabled=!config.configured||!!response.draft;status.textContent=config.configured?'On demand · only a minimal synthetic evidence packet is sent to OpenAI.':'Open “Set up Madar LLM.command” in the project folder to connect OpenAI, then restart Madar. The evidence overview remains available.';if(response.draft){renderAssistant(response.draft,draftHost);if(overview)overview.hidden=true}}).catch(error=>{if(attached()){status.textContent=error.message;button.textContent='Explanation unavailable'}});
    button.onclick=async()=>{button.disabled=true;status.textContent='Writing the business case brief…';try{const result=await backendJSON('/case-explanation',{caseId:item.id,assessmentId:item.assessmentId,generate:true},55000);if(!attached())return;renderAssistant(result.draft,draftHost);if(overview)overview.hidden=true;button.textContent='Explanation saved';status.textContent='Draft saved for this assessment. Verify all statements before recording your decision.'}catch(error){if(attached()){status.textContent=error.message;button.disabled=false}}};
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
