import model from "../data/model.json" with { type: "json" };

export { model };

const DAY = 86_400_000;
const HOUR = 3_600_000;
const ALLOWED_TYPES = new Set([
  "registration",
  "wage",
  "exclusion",
  "claim",
  "payment",
  "retirement",
  "maternity", "login", "iban_change", "profile_update",
]);

const JOURNEY_FOR_TYPE = {registration:'Employer Registration', wage:'Contribution & Wage', exclusion:'Employer Registration', claim:'SANED', payment:'Benefit Payments', retirement:'Retirement', maternity:'Maternity Benefit', login:'Digital Access', iban_change:'Benefit Payments', profile_update:'Account Maintenance'};

// Named positions keep rule logic readable while preserving the model's fixed feature order.
const FEATURE = Object.freeze({
  distinctJourneys: 0,
  eventCount: 1,
  linkedContributors: 2,
  registrations: 3,
  wages: 4,
  exclusions: 5,
  claims: 6,
  maximumWageChange: 7,
  maximumRetroactiveDays: 8,
  wageRecency: 9,
  maximumIdentifierReuse: 10,
  sourceConflicts: 11,
  ruleOverrides: 12,
  coordinatedChainCount: 13,
  hasOrderedChain: 14,
  chainSpanDays: 15,
});

/** Check that a value is a synthetic identifier with the expected namespace. */
function validSyntheticId(value, prefix) {
  return typeof value === "string" && value.startsWith(prefix);
}

/**
 * Search timestamps for registration → wage → exclusion → SANED in that order.
 * Call this only with one contributor’s events; employer-level counts are separate.
 */
function findOrderedChain(events) {
  const times = Object.fromEntries(
    ["registration", "wage", "exclusion", "claim"].map((type) => [
      type,
      events
        .filter((event) => event.type === type)
        .map((event) => event.recordedAt)
        .sort((a, b) => a - b),
    ]),
  );
  for (const registration of times.registration) {
    for (const wage of times.wage) {
      if (wage <= registration) continue;
      for (const exclusion of times.exclusion) {
        if (exclusion <= wage) continue;
        for (const claim of times.claim) {
          if (claim > exclusion) return { found: true, spanDays: (claim - registration) / DAY };
        }
      }
    }
  }
  return { found: false, spanDays: 30 };
}


function digitalFeatures(events) {
  const logins=events.filter(e=>e.type==='login'), verified=logins.filter(e=>e.locationVerified===true), changes=events.filter(e=>e.type==='iban_change');
  let speed=0,sequences=0;const recencies=[];
  for(const subject of new Set(events.map(e=>e.subjectId))){
    const history=events.filter(e=>e.subjectId===subject),sessions=verified.filter(e=>e.subjectId===subject).sort((a,b)=>a.recordedAt-b.recordedAt);
    for(let i=1;i<sessions.length;i++){
      const a=sessions[i-1],b=sessions[i],rad=x=>x*Math.PI/180,lat1=rad(a.latitude),lat2=rad(b.latitude),h=Math.sin((lat2-lat1)/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(rad(b.longitude-a.longitude)/2)**2;
      const distance=6371*2*Math.asin(Math.min(1,Math.sqrt(h))),hours=(b.recordedAt-a.recordedAt)/HOUR;
      if(hours>0)speed=Math.max(speed,Math.min(100000,distance/hours));
    }
    let found=false;
    for(const claim of history.filter(e=>['claim','maternity'].includes(e.type))){
      const ibans=history.filter(e=>e.type==='iban_change'&&e.recordedAt<claim.recordedAt);
      if(ibans.length)recencies.push((claim.recordedAt-Math.max(...ibans.map(e=>e.recordedAt)))/HOUR);
      for(const iban of ibans)for(const profile of history.filter(e=>e.type==='profile_update'&&e.recordedAt<iban.recordedAt)){
        if(history.some(e=>e.type==='login'&&e.recordedAt>=claim.recordedAt-DAY&&e.recordedAt<profile.recordedAt))found=true;
      }
    }
    sequences+=Number(found);
  }
  return [logins.length,new Set(verified.map(e=>`${e.latitude},${e.longitude}`)).size,speed,changes.length,events.filter(e=>e.type==='profile_update').length,sequences,Math.log1p(recencies.length?Math.min(...recencies):720)];
}

/**
 * Validate a connected synthetic history and calculate the model's twenty-five
 * ordered inputs. Returning null means evidence is incomplete or malformed and
 * causes an explicit abstention rather than a fabricated low-risk result.
 */
export function extractFeatures(caseRecord) {
  if (
    !caseRecord ||
    caseRecord.synthetic !== true ||
    !validSyntheticId(caseRecord.id, "CJ-SYN-") ||
    !validSyntheticId(caseRecord.employerId, "EMP-SYN-") ||
    !Number.isFinite(caseRecord.asOf) ||
    !Array.isArray(caseRecord.events) ||
    caseRecord.events.length === 0
  ) {
    return null;
  }

  if (
    caseRecord.events.some(
      (event) =>
        !event ||
        !ALLOWED_TYPES.has(event.type) ||
        !Number.isFinite(event.recordedAt) ||
        !validSyntheticId(event.subjectId, "CTR-SYN-") ||
        event.employerId !== caseRecord.employerId ||
        event.journey !== JOURNEY_FOR_TYPE[event.type],
    )
  ) {
    return null;
  }

  // The model sees only events available inside the 30-day assessment window.
  const events = caseRecord.events.filter(
    (event) =>
      event.recordedAt <= caseRecord.asOf &&
      event.recordedAt >= caseRecord.asOf - 30 * DAY,
  );
  const claims = events.filter((event) => event.type === "claim");
  const maternity=events.filter(event=>event.type==="maternity");
  if (claims.length === 0 && maternity.length === 0) return null;
  const wages = events.filter((event) => event.type === "wage");
  if (
    wages.some(
      (event) =>
        !Number.isFinite(event.amount) || event.amount <= 0 ||
        !Number.isFinite(event.previousAmount) ||
        event.previousAmount <= 0,
    ) ||
    events.some(
      (event) => event.effectiveAt !== undefined && !Number.isFinite(event.effectiveAt),
    )
  ) {
    return null;
  }

  if(events.some(e=>
    (e.type==='login' && (!Number.isFinite(e.latitude)||Math.abs(e.latitude)>90||!Number.isFinite(e.longitude)||Math.abs(e.longitude)>180||typeof e.locationVerified!=='boolean')) ||
    (e.type==='iban_change' && (!validSyntheticId(e.identifierId,'IBAN-SYN-')||!validSyntheticId(e.previousIdentifierId,'IBAN-SYN-')||e.identifierId===e.previousIdentifierId)) ||
    (e.type==='profile_update' && !['mobile','email','address','identity'].includes(e.changedField))
  )) return null;
  const exclusions = events.filter((event) => event.type === "exclusion");
  const identifierSubjects = new Map();
  for (const event of events) {
    if (!event.identifierId) continue;
    if (!validSyntheticId(event.identifierId, "IBAN-SYN-") &&
        !validSyntheticId(event.identifierId, "MOB-SYN-") &&
        !validSyntheticId(event.identifierId, "DEV-SYN-")) return null;
    if (!identifierSubjects.has(event.identifierId)) identifierSubjects.set(event.identifierId, new Set());
    identifierSubjects.get(event.identifierId).add(event.subjectId);
  }

  const chains = [...new Set(events.map(event => event.subjectId))]
    .map(subject => findOrderedChain(events.filter(event => event.subjectId === subject)))
    .filter(chain => chain.found);
  const chainCount = chains.length;
  const chain = {found: chainCount > 0, spanDays: chains.length ? Math.min(...chains.map(chain => chain.spanDays)) : 30};
  const count = (type) => events.filter((event) => event.type === type).length;
  const latestWageHours = wages.length
    ? (caseRecord.asOf - Math.max(...wages.map((event) => event.recordedAt))) / HOUR
    : 30 * 24;
  const wageChanges = wages.map(
    (event) => 100 * (event.amount / event.previousAmount - 1),
  );
  const retroactiveDays = events
    .filter((event) => event.effectiveAt !== undefined)
    .map((event) => Math.max(0, (event.recordedAt - event.effectiveAt) / DAY));

  const vector = [
    new Set(events.map((event) => event.journey)).size,
    events.length,
    new Set(events.map((event) => event.subjectId)).size,
    count("registration"),
    wages.length,
    exclusions.length,
    claims.length,
    wageChanges.length ? Math.max(...wageChanges) : 0,
    Math.max(0, ...retroactiveDays),
    Math.log1p(Math.max(0, latestWageHours)),
    Math.max(0, ...[...identifierSubjects.values()].map((subjects) => subjects.size)),
    events.filter((event) => Boolean(event.sourceConflict)).length,
    events.filter((event) => Boolean(event.ruleOverride)).length,
    chainCount,
    Number(chain.found),
    chain.spanDays,
    ...digitalFeatures(events),
    maternity.length,
    [...new Set(events.map(e=>e.subjectId))].filter(subject=>{
      const history=events.filter(e=>e.subjectId===subject);
      return history.some(r=>r.type==='registration' && history.some(w=>w.type==='wage' && w.recordedAt>r.recordedAt && history.some(m=>m.type==='maternity' && m.recordedAt>w.recordedAt)));
    }).length,
  ];
  return vector.every(Number.isFinite) ? vector : null;
}

/**
 * Reproduce the exported Random Forest prediction by traversing every fitted
 * tree and averaging its positive-class leaf value. The score represents
 * similarity to provisional synthetic review patterns, not fraud probability.
 */
export function scoreVector(input) {
  if (!Array.isArray(input) || input.length !== model.features.length) {
    throw new TypeError(`Expected ${model.features.length} numeric features.`);
  }
  const vector = input.map(Math.fround);
  const treeScores = model.trees.map((tree) => {
    let node = 0;
    while (tree.left[node] !== -1) {
      node = vector[tree.feature[node]] <= tree.threshold[node]
        ? tree.left[node]
        : tree.right[node];
    }
    return tree.positive[node];
  });
  return treeScores.reduce((total, value) => total + value, 0) / treeScores.length;
}

/**
 * Evaluate the transparent comparator thresholds. These deterministic rules
 * stay separate from the trained model so an AI-only detection remains visible.
 */
export function evaluateRules(vector) {
  const reasons = [];
  if (vector[FEATURE.registrations] >= 8) {
    reasons.push("Eight or more registrations in 30 days");
  }
  if (vector[FEATURE.claims] >= 5) {
    reasons.push("Five or more SANED requests in 30 days");
  }
  if (vector[FEATURE.maximumWageChange] >= 80) {
    reasons.push("Wage increase of 80% or more");
  }
  if (vector[FEATURE.maximumRetroactiveDays] >= 30) {
    reasons.push("Retroactive change of 30 days or more");
  }
  if (vector[FEATURE.maximumIdentifierReuse] >= 4) {
    reasons.push("Identifier shared by four or more contributors");
  }
  if (vector[FEATURE.sourceConflicts] >= 2) {
    reasons.push("Two or more cross-source conflicts");
  }
  if (vector[FEATURE.ruleOverrides] >= 3) {
    reasons.push("Three or more rule overrides");
  }
  return reasons;
}

/**
 * Convert internal feature values into display evidence with synthetic
 * reference ranges. These ranges are context, not exact model attribution.
 */
function contextualFeatures(vector) {
  return vector.map((internalValue, index) => {
    const recency = index === 9 || index === 22;
    const display = (value) => recency ? Math.expm1(value) : value;
    return {
      name: index===9 ? "Hours since latest wage change" : index===22 ? "Hours from latest IBAN change to request" : model.features[index],
      value: display(internalValue),
      median: display(model.referenceMedian[index]),
      low: display(model.referenceP05[index]),
      high: display(model.referenceP95[index]),
      unusual: internalValue < model.referenceP05[index] || internalValue > model.referenceP95[index],
      outsideReferenceRange:
        internalValue < model.referenceP05[index] ||
        internalValue > model.referenceP95[index],
    };
  });
}

/**
 * Run the complete cross-journey assessment: validate, derive features, execute
 * the fitted model, check comparator rules, explain the result, and propose a
 * human-review route. It never confirms fraud or takes an adverse action.
 */
export function assess(caseRecord) {
  const vector = extractFeatures(caseRecord);
  if (!vector) {
    return {
      modelVersion: model.version,
      complete: false,
      route: "Complete evidence",
      band: "Incomplete",
      percentile: null,
      reasons: ["Required synthetic entity or event evidence is missing. No model score was produced."],
      features: [],
    };
  }

  const score = scoreVector(vector);
  const percentile =
    (100 * model.calibrationScores.filter((value) => value <= score).length) /
    model.calibrationScores.length;
  const ruleReasons = evaluateRules(vector);
  const modelFlagged = score >= model.threshold;
  const involvedJourneys = [
    ...new Set(
      caseRecord.events
        .filter((event) => event.recordedAt <= caseRecord.asOf && event.recordedAt >= caseRecord.asOf - 30 * DAY)
        .map((event) => event.journey),
    ),
  ];
  const chainCount = vector[FEATURE.coordinatedChainCount];
  const reasons = [
    modelFlagged
      ? "The trained cross-journey model found similarity to provisional review patterns."
      : "The trained cross-journey model did not cross the selected review threshold.",
  ];
  if (chainCount >= 2) {
    reasons.push(
      `${chainCount} linked contributors each complete a registration → wage → exclusion → SANED sequence.`,
    );
  }
  if(vector[24]>=2)reasons.push(`${vector[24]} linked contributors each complete a registration → wage → maternity request sequence.`);
  if(vector[18]>1000)reasons.push('Verified login locations imply unusually rapid travel; verify account access and location reliability.');
  if(vector[19]>0)reasons.push(`${vector[19]} payment-account changes appear before the assessment; verify ownership before payment.`);
  if(vector[20]>0)reasons.push(`${vector[20]} profile updates appear in the connected history.`);
  if(vector[21]>0)reasons.push(`${vector[21]} contributors show a login → profile update → IBAN change → request sequence within 24 hours.`);
  reasons.push(...ruleReasons);

  return {
    modelVersion: model.version,
    complete: true,
    score,
    percentile,
    modelFlagged,
    ruleFlagged: ruleReasons.length > 0,
    ruleReasons,
    ruleFindings: ruleReasons.map(description => ({code: ({
      "Eight or more registrations in 30 days":"CJ_REGISTRATION_VOLUME",
      "Five or more SANED requests in 30 days":"CJ_CLAIM_VOLUME",
      "Wage increase of 80% or more":"CJ_WAGE_INCREASE",
      "Retroactive change of 30 days or more":"CJ_RETROACTIVE_CHANGE",
      "Identifier shared by four or more contributors":"CJ_IDENTIFIER_REUSE",
      "Two or more cross-source conflicts":"CJ_SOURCE_CONFLICT",
      "Three or more rule overrides":"CJ_RULE_OVERRIDES",
    })[description], description})),
    completedContributorChains: chainCount,
    maternityContributorChains: vector[24],
    maternityRequests: vector[23],
    involvedJourneys,
    linkedContributorCount: vector[FEATURE.linkedContributors],
    route: modelFlagged || ruleReasons.length ? "Specialist review" : "Standard review",
    band: modelFlagged || ruleReasons.length ? "Review" : "Typical",
    features: contextualFeatures(vector),
    reasons,
    scoreBoundary:
      "The model score measures similarity to provisional synthetic review patterns. It is not a fraud probability.",
    explanationBoundary:
      "Reference ranges provide context; they are not causal explanations or exact feature contributions.",
  };
}
