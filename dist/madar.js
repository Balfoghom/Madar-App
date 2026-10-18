/* Madar's connected-journey workspace consumes server-calculated assessments. */
(() => {
  const root = document.querySelector('#madar-workspace');
  const names = {routine:'Routine activity',coordinated_claim_sequence:'Connected SANED sequence',legitimate_restructuring:'Legitimate restructuring',identifier_reuse_network:'Shared identifier network',retroactive_source_conflict:'Conflicting evidence',missing:'Missing employer evidence'};
  let catalog = [], records = new Map(), selected = 'CJ-SYN-demo-00001', busy = false, error = '';
  const esc = escapeHtml;
  const date = value => new Date(value).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Riyadh'});
  const eventNames = {registration:'Registration',wage:'Wage change',exclusion:'Employment exclusion',claim:'SANED request',payment:'Payment',retirement:'Retirement',maternity:'Maternity'};
  function merge(saved) {
    for (const record of saved) {
      records.set(record.caseId,record);
      const index = cases.findIndex(c=>c.id===record.caseId);
      if (index < 0) cases.push(record.caseData); else cases[index] = record.caseData;
    }
    renderAll();
  }
  async function load() {
    try {
      catalog = await backendJSON('/cross-journey/cases');
      const saved = await backendJSON('/assessments');
      const unique = new Map();
      for (const record of saved) if(record.assessmentSource === 'cross-journey' && !unique.has(record.caseId)) unique.set(record.caseId,record);
      records = new Map();
      merge([...unique.values()]);
      error = '';
    } catch (e) { error = 'Connected-journey service unavailable. Start Madar using npm start, then refresh. '+e.message; }
    render();
  }
  async function run(body) {
    if (busy) return;
    busy = true; error = ''; render();
    try {
      const response = await backendJSON('/cross-journey/assess',body,30000);
      merge(response.saved);
      if (!records.has(selected)) selected = response.saved[0].caseId;
      showToast(`${response.saved.length} connected case${response.saved.length===1?'':'s'} assessed · ${response.events} events`);
    } catch(e) { error = e.message; }
    finally { busy = false; render(); }
  }
  window.madarImportEvents = async function(csv) {
    switchView('connected');
    await run({csv});
    if(error) throw new Error(error);
  };
  function resultBadge(record) {
    if(!record) return '<span class="cj-badge neutral">Not assessed</span>';
    if(!record.complete) return '<span class="cj-badge incomplete">Complete evidence</span>';
    return record.modelFlagged ? '<span class="cj-badge review">Specialist review</span>' : '<span class="cj-badge typical">Standard review</span>';
  }
  function timeline(evidence) {
    const items = evidence.events.filter(e=>e.recordedAt<=evidence.asOf && e.recordedAt>=evidence.asOf-30*86400000).sort((a,b)=>a.recordedAt-b.recordedAt);
    const subjects = [...new Set(items.map(e=>e.subjectId))];
    return `<div class="cj-linked"><div class="cj-employer"><span>SHARED EMPLOYER</span><strong>${esc(evidence.employerId || 'Employer identity missing')}</strong><small>Links supplied in synthetic source evidence</small></div><div class="cj-contributors">${subjects.map(subject=>`<div class="cj-person"><strong>${esc(subject)}</strong><div class="cj-sequence">${items.filter(e=>e.subjectId===subject).map(e=>`<span title="${esc(date(e.recordedAt))}">${esc(eventNames[e.type]||e.type)}</span>`).join('<b aria-hidden="true">→</b>')}</div></div>`).join('')}</div></div><details class="cj-events"><summary>Inspect ${items.length} source event${items.length===1?'':'s'} · Arabia Standard Time</summary><div class="cj-table-wrap"><table><thead><tr><th>Recorded</th><th>Contributor</th><th>Journey / event</th><th>Evidence</th></tr></thead><tbody>${items.map(e=>{
      const detail=[];
      if(e.type==='wage' && e.previousAmount) detail.push(`${e.previousAmount.toLocaleString('en')} → ${Number(e.amount).toLocaleString('en')} SAR (${((e.amount/e.previousAmount-1)*100).toFixed(1)}%)`);
      if(e.effectiveAt!=null) detail.push('Effective '+date(e.effectiveAt));
      if(e.identifierId) detail.push(e.identifierId);
      if(e.sourceConflict) detail.push('Source conflict');
      if(e.ruleOverride) detail.push('Control override');
      return `<tr><td>${esc(date(e.recordedAt))}</td><td>${esc(e.subjectId)}</td><td><strong>${esc(eventNames[e.type]||e.type)}</strong><small>${esc(e.journey)}</small></td><td>${esc(detail.join(' · ')||'Recorded source event')}</td></tr>`;
    }).join('')}</tbody></table></div></details>`;
  }
  function detail(record) {
    if(!record) return `<article class="cj-empty"><div class="cj-orbit" aria-hidden="true">◎</div><p class="eyebrow">A SANED DECISION, INFORMED BY CONNECTED JOURNEYS</p><h2>See the pattern behind the request.</h2><p>One employer. Three contributors. Events across registration, wage changes and SANED. Run the model to see whether the combined history requires specialist attention.</p><button class="primary-btn" id="cj-run-selected" ${busy?'disabled':''}>${busy?'Assessing…':'Assess this case →'}</button><small>Real fitted inference on synthetic evidence. No payment action is taken.</small></article>`;
    const r = record.modelResult || record, c=record.caseData, evidence=c.crossJourneyEvidence;
    const reviewHistory=record.reviewHistory || c.reviewHistory || [];
    const journeys=[...new Set((c.sourceTimeline||[]).map(e=>e.journey))];
    const contributors=new Set((c.sourceTimeline||[]).map(e=>e.subjectId)).size;
    const currentDecision=record.humanDecision;
    return `<article class="cj-case"><div class="cj-case-heading"><div><p class="eyebrow">${esc(record.caseId)} · SYNTHETIC SCENARIO</p><h2>${esc(c.scenario)}</h2><p>${journeys.map(esc).join(' <span aria-hidden="true">→</span> ')}</p></div>${resultBadge(record)}</div>
      <div class="cj-checkpoint"><span>01 <strong>Request received</strong></span><span>02 <strong>Evidence assessed</strong></span><span class="${currentDecision?'done':'current'}">03 <strong>${currentDecision?'Decision recorded':'Specialist decision'}</strong></span><small>Before payment · simulated checkpoint</small></div>
      ${currentDecision?`<div class="cj-recorded"><strong>Recorded specialist route: ${esc(c.route)}</strong><span>${esc(c.status)} · ${esc(currentDecision.actorName)}</span></div>`:''}<div class="cj-results"><div><span>COMPARATOR RULES</span><strong>${!r.complete?'Not assessed':r.ruleFlagged?'Triggered':'No rule triggered'}</strong><small>${!r.complete?'Linked evidence is incomplete':r.ruleFlagged?'Included demonstration thresholds exceeded':'Individual comparator thresholds remain quiet'}</small></div><div class="${r.modelFlagged?'cj-ai-flag':''}"><span>CROSS-JOURNEY AI</span><strong>${!r.complete?'Abstained':r.modelFlagged?'Review pattern detected':'No review pattern flagged'}</strong><small>${!r.complete?'No score or low-risk classification produced':'Fitted model assessed the combined history'}</small></div><div><span>RECOMMENDED ROUTE</span><strong>${esc(r.route)}</strong><small>Specialist retains the decision</small></div></div>
      <div class="cj-explanation"><p class="eyebrow">WHY THIS CASE WAS ROUTED</p><ul>${r.reasons.map(reason=>`<li>${esc(reason)}</li>`).join('')}</ul>${r.modelFlagged&&!r.ruleFlagged?'<p class="cj-insight">The added value is in the connected history: the model recommends review even though the included comparator rules do not trigger.</p>':''}<small>A review recommendation is not a fraud determination. This is a synthetic proof.</small></div>
      <div class="cj-evidence-heading"><div><p class="eyebrow">CONNECTED EVIDENCE</p><h3>${contributors} contributor${contributors===1?'':'s'} · ${journeys.length} journey${journeys.length===1?'':'s'} · ${(c.sourceTimeline||[]).length} event${(c.sourceTimeline||[]).length===1?'':'s'}</h3></div><span class="data-badge">30-day window ending ${esc(date(evidence.asOf))}</span></div>
      ${timeline(evidence)}
      <div class="cj-review"><div><p class="eyebrow">SPECIALIST REVIEW · DEMO ROLES</p><h3>Decide the next step</h3><p>Record a routing decision and the evidence behind it. The original model assessment remains unchanged.</p><small>This records a demo decision. It does not release or stop a payment.</small></div><form id="cj-review-form"><label>Reviewer name<input name="actor" required maxlength="120" placeholder="Enter your name"></label><label>Decision<select name="action"><option value="approve">Approve recommended route</option><option value="override">Recommend a different route</option><option value="reject">Return recommendation for review</option></select></label><label id="cj-route-label" hidden>Alternative route<select name="route"><option>Additional verification</option><option>Specialist review</option><option>Standard review</option><option>Complete evidence</option></select></label><label class="cj-note">Evidence and rationale<textarea name="note" required maxlength="2000" rows="3" placeholder="What supports this decision? What should be checked next?"></textarea></label><button class="primary-btn" type="submit" ${busy?'disabled':''}>Save review decision</button><span class="cj-form-status" role="status"></span></form></div>
      <div class="cj-history"><h3>Review history <span>${reviewHistory.length}</span></h3>${reviewHistory.length?reviewHistory.map(h=>`<div><strong>${esc(h.actorName)} · ${esc(h.action||h.outcome||h.type)}${h.route?' → '+esc(h.route):''}</strong><small>${esc(date(h.recordedAt))} · Assessment ${esc(h.assessmentId.slice(0,8))}</small><p>${esc(h.note)}</p></div>`).join(''):'<p>No specialist decision recorded yet.</p>'}</div>
      <details class="cj-model"><summary>Model evidence and validation boundaries</summary><p><strong>Model:</strong> ${esc(r.modelVersion)} · Random Forest</p><p><strong>Assessed:</strong> ${esc(date(record.assessedAt))}</p><p><strong>Review-pattern score:</strong> ${r.complete?r.score:'Not produced'} · <strong>Calibration percentile:</strong> ${r.complete?r.percentile:'Not produced'}</p><p>The score is similarity to synthetic review patterns, not a fraud probability. Reference ranges are context, not exact feature contributions. Business pattern confirmed for this synthetic proof; model thresholds and production performance remain unvalidated.</p><div class="cj-table-wrap"><table><thead><tr><th>Derived feature</th><th>Observed</th><th>Reference median</th></tr></thead><tbody>${r.features.map(f=>`<tr><td>${esc(f.name)}</td><td>${Number(f.value).toFixed(2)}</td><td>${Number(f.median).toFixed(2)}</td></tr>`).join('')}</tbody></table></div></details>
      <div class="cj-case-actions"><button class="secondary-btn" id="cj-open-queue">Open in investigation queue</button><button class="text-btn" id="cj-run-selected" ${busy?'disabled':''}>Reassess supplied evidence</button></div>
    </article>`;
  }
  function render() {
    const record=records.get(selected);
    const available = new Map(catalog.map(c=>[c.id,c]));
    for(const r of records.values()) if(!available.has(r.caseId)) available.set(r.caseId,{id:r.caseId,family:r.scenario});
    const items=[...available.values()].sort((a,b)=>(a.id==='CJ-SYN-demo-00001'?-1:b.id==='CJ-SYN-demo-00001'?1:a.id.localeCompare(b.id)));
    root.innerHTML = `<div class="cj-hero"><div><p class="eyebrow">MADAR · CONNECTED JOURNEY INTELLIGENCE</p><h2>A clearer picture.<br>A better-informed decision.</h2><p>Bring existing controls and connected behavior into one view, before the payment decision.</p><div class="cj-pills"><span>Explainable evidence</span><span>Human decision</span><span>Synthetic proof</span></div></div><div class="cj-hero-side"><img src="madar-mark.svg" alt=""><span lang="ar">مدار</span><small>Connected journeys.<br>Clearer risk decisions.</small></div></div>
      <div class="cj-toolbar"><div><h2>Connected journey review</h2><p>Employer Registration → Contribution & Wage → SANED</p></div><div><button class="primary-btn" id="cj-run-all" ${busy?'disabled':''}>${busy?'Assessing evidence…':'Assess demo portfolio'}</button><label class="secondary-btn cj-upload">Upload events<input id="cj-upload" type="file" accept=".csv,text/csv" ${busy?'disabled':''}></label><a class="text-btn" href="${backendBaseUrl}/cross-journey/template" download>Download event CSV</a></div></div>
      ${error?`<div class="cj-error" role="alert">${esc(error)} <button id="cj-retry" class="text-btn">Retry connection</button></div>`:''}
      <div class="cj-layout"><aside class="cj-cases"><p class="eyebrow">SYNTHETIC CASES</p>${items.length?items.map(item=>`<button class="cj-case-choice ${selected===item.id?'selected':''}" data-cj-id="${esc(item.id)}" aria-pressed="${selected===item.id}"><strong>${esc(names[item.family]||item.family)}</strong><small>${esc(item.id)}</small>${resultBadge(records.get(item.id))}</button>`).join(''):'<p>Connecting to the model service…</p>'}<div class="cj-boundary"><strong>What this proves</strong><p>Linked event evidence is evaluated by a fitted model. Source systems and payments are simulated.</p><button class="text-btn" id="cj-vision">View enterprise vision →</button></div></aside><div>${detail(record)}</div></div>`;
    root.querySelectorAll('[data-cj-id]').forEach(button=>button.onclick=()=>{selected=button.dataset.cjId;render();});
    root.querySelector('#cj-run-selected')?.addEventListener('click',()=>{
      if(!catalog.some(c=>c.id===selected)) return showToast('Re-upload this case’s event CSV to reassess its evidence.');
      run({case_id:selected});
    });
    root.querySelector('#cj-run-all').onclick=async()=>{
      try { const response=await fetch(backendBaseUrl+'/cross-journey/template'); if(!response.ok) throw new Error('Cannot load event evidence.'); await run({csv:await response.text()}); } catch(e){error=e.message;render();}
    };
    root.querySelector('#cj-upload').onchange=async event=>{
      const file=event.target.files[0]; if(!file) return;
      if(file.size>1_000_000){error='Upload a CSV smaller than 1 MB.';render();return;}
      await run({csv:await file.text()});
    };
    root.querySelector('#cj-retry')?.addEventListener('click',load);
    root.querySelector('#cj-vision').onclick=()=>switchView('executive');
    root.querySelector('#cj-open-queue')?.addEventListener('click',()=>{
      selectedId=selected;activeFilter='All';activeJourney='All';activeRegion='All';searchQuery='';document.querySelector('#case-search').value='';renderAll();switchView('queue');
    });
    const form=root.querySelector('#cj-review-form');
    if(form){
      form.elements.action.onchange=()=>form.querySelector('#cj-route-label').hidden=form.elements.action.value!=='override';
      form.onsubmit=async event=>{
        event.preventDefault(); const button=form.querySelector('button[type=submit]');button.disabled=true;
        try {
          const body={caseId:selected,assessmentId:record.assessmentId,actorName:form.elements.actor.value.trim(),action:form.elements.action.value,note:form.elements.note.value.trim()};
          if(body.action==='override') body.route=form.elements.route.value;
          const updated=await backendJSON('/decision',body);merge([updated]);showToast('Decision saved with original model evidence');render();
        } catch(e){form.querySelector('.cj-form-status').textContent=e.message;button.disabled=false;}
      };
    }
  }
  async function refreshHealth(){
    const status=document.querySelector('#engine-status');
    try { const health=await backendJSON('/health',undefined,4000);const ready=!!health.crossJourneyModelVersion;status.textContent=ready?'Madar models ready':'Restart service for Madar models';status.closest('.stream-state').classList.toggle('offline',!ready); }
    catch{status.textContent='Model service unavailable';status.closest('.stream-state').classList.add('offline');}
  }
  document.querySelector('[data-view="connected"]').addEventListener('click',load);
  window.addEventListener('madar-reset',()=>{records=new Map();load();});
  switchView('connected'); render(); load(); refreshHealth();
  setInterval(refreshHealth,15000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshHealth();});
})();
