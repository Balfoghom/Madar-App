import { createCrossJourneyAssessment, parseEventCSV, demoCases, crossJourneyModel } from './lib/cross-journey-adapter.mjs';
import { createServer } from "node:http";
import { createApplicationAssessment, InputError } from "./lib/assessment-adapter.mjs";
import { readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import cases from "./data/cases.json" with { type: "json" };
import report from "./data/evaluation.json" with { type: "json" };
import { assess, model } from "./lib/detector.mjs";
import {
  journeyModelMetadata,
} from "./lib/journey-detector.mjs";
const runtimeDataDirectory = process.env.ASSESSMENT_DATA_DIR || join(dirname(fileURLToPath(import.meta.url)), "data");
const assessmentsPath = join(runtimeDataDirectory, "backend-assessments.json");
const queueCasesPath = join(runtimeDataDirectory, "queue-cases.json");
const riskConfigPath = join(runtimeDataDirectory, "risk-config.json");
const indicatorSuggestionsPath = join(runtimeDataDirectory, "indicator-suggestions.json");
const defaultRiskConfig = {
  controlWeight: 55,
  anomalyWeight: 45,
  interactionMultiplier: 100,
  lowMax: 34,
  highMin: 75,
  criticalControlFloor: 80,
  featureWeights: {
    velocity: 18,
    retroDays: 12,
    linkedEntities: 14,
    priorRisk: 12,
    overrides: 8,
    identityReuse: 12,
    amountChangePct: 12,
    crossSourceConflict: 12,
  },
};
const scenarioProposalsPath = join(runtimeDataDirectory, "scenario-proposals.json");
const humanReviewsPath = join(runtimeDataDirectory, "human-reviews.json");
let scenarioWrites = Promise.resolve();
let assessmentWrites = Promise.resolve();
let journeyAssessmentMigration;

async function readQueueCases() {
  try {
    const saved = JSON.parse(await readFile(queueCasesPath, "utf8"));
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function readSavedAssessments() {
  try {
    return JSON.parse(await readFile(assessmentsPath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

function writeSavedAssessments(saved) {
  const temporaryPath = assessmentsPath + ".tmp";
  return writeFile(temporaryPath, JSON.stringify(saved.slice(0, 200), null, 2) + "\n")
    .then(() => rename(temporaryPath, assessmentsPath));
}

function saveAssessment(result) {
  assessmentWrites = assessmentWrites
    .catch(() => {})
    .then(async () => {
      const saved = await readSavedAssessments();
      const reviewHistory = (await readJsonFile(humanReviewsPath, [])).filter((entry) => entry.caseId === result.caseId);
      result.reviewHistory = reviewHistory;
      if (result.caseData) result.caseData.reviewHistory = reviewHistory;
      saved.unshift(result);
      await writeSavedAssessments(saved);
    });
  return assessmentWrites;
}

async function readJsonFile(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJsonFile(path, value) {
  const temporaryPath = path + ".tmp";
  await writeFile(temporaryPath, JSON.stringify(value, null, 2) + "\n");
  await rename(temporaryPath, path);
}

function validRiskConfig(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) return false;
  const numeric = ["controlWeight", "anomalyWeight", "interactionMultiplier", "lowMax", "highMin", "criticalControlFloor"];
  if (numeric.some((key) => !Number.isFinite(config[key]))) return false;
  if (config.controlWeight < 0 || config.anomalyWeight < 0 || config.controlWeight + config.anomalyWeight <= 0) return false;
  if (config.interactionMultiplier < 0 || config.interactionMultiplier > 200) return false;
  if (config.lowMax < 0 || config.lowMax > 90 || config.highMin < config.lowMax + 5 || config.highMin > 100) return false;
  if (config.criticalControlFloor < 0 || config.criticalControlFloor > 100) return false;
  const keys = Object.keys(defaultRiskConfig.featureWeights);
  return config.featureWeights && typeof config.featureWeights === "object" &&
    keys.every((key) => Number.isFinite(config.featureWeights[key]) && config.featureWeights[key] >= 0 && config.featureWeights[key] <= 100);
}

async function saveUploadedRecords(records, mode) {
  assessmentWrites = assessmentWrites.catch(() => {}).then(async () => {
    const previous = await readSavedAssessments();
    const retained = mode === "replace" ? previous.filter((entry) => entry.assessmentSource !== "csv-upload") : previous;
    const reviews = await readJsonFile(humanReviewsPath, []);
    for (const record of records) {
      record.reviewHistory = reviews.filter((entry) => entry.caseId === record.caseId);
      record.caseData.reviewHistory = record.reviewHistory;
    }
    await writeSavedAssessments([...records, ...retained]);
  });
  await assessmentWrites;
}

async function activeConfig() {
  const saved = await readJsonFile(riskConfigPath, null);
  return validRiskConfig(saved?.config) ? saved.config : defaultRiskConfig;
}

const outcomeValues = ["Legitimate activity", "Data Quality Issue", "Error", "Process or data error", "Suspected fraud — further investigation", "Confirmed violation", "Inconclusive", "Confirmed fraud — formally established"];
const financialValues = ["Proceeded", "Prevented before payment", "Paid — post-payment detection", "Partially prevented", "No financial impact"];
function saveHumanReview(body, type) {
  assessmentWrites = assessmentWrites.catch(() => {}).then(async () => {
    const saved = await readSavedAssessments();
    const index = saved.findIndex((entry) => entry.caseId === body.caseId);
    if (index < 0) throw new InputError("No saved assessment for this case. Assess and save it first.", 404);
    const current = saved[index];
    if (body.assessmentId && body.assessmentId !== current.assessmentId) throw new InputError("A newer assessment exists; refresh before reviewing.", 409);
    const review = { ...body, type, reviewId: crypto.randomUUID(), assessmentId: current.assessmentId, recordedAt: new Date().toISOString(), actorName: body.actorName?.trim() || "Demo specialist", note: body.note.trim() };
    const data = { ...(current.caseData || { id: current.caseId, synthetic: true, transactionId: current.transactionId, features: {} }) };
    if (type === "outcome") {
      if (!outcomeValues.includes(body.outcome) || !financialValues.includes(body.financialOutcome) || !["amountAtRisk", "confirmedFraudAmount", "preventedAmount"].every((key) => Number.isFinite(body[key]) && body[key] >= 0)) throw new InputError("Invalid specialist or financial outcome.");
      if (body.outcome.startsWith("Confirmed fraud") && body.confirmedFraudAmount <= 0) throw new InputError("Confirmed fraud requires a positive confirmed amount.");
      if (["Prevented before payment", "Partially prevented"].includes(body.financialOutcome) && body.preventedAmount <= 0) throw new InputError("A prevention outcome requires a positive prevented amount.");
      if (Number.isFinite(data.transactionAmount) && (body.confirmedFraudAmount > data.transactionAmount || body.preventedAmount > data.transactionAmount)) throw new InputError("Confirmed or prevented amount cannot exceed the transaction amount.");
      if (body.financialOutcome === "Proceeded" && body.preventedAmount > 0) throw new InputError("A proceeded transaction cannot also be recorded as prevented.");
      Object.assign(data, { outcome: body.outcome, financialOutcome: body.financialOutcome, amountAtRisk: body.amountAtRisk, confirmedFraudAmount: body.confirmedFraudAmount, preventedAmount: body.preventedAmount, decisionDate: review.recordedAt, decisionOwner: review.actorName, status: body.outcome.startsWith("Suspected fraud") ? "Under investigation" : "Outcome recorded" });
      if (["Prevented before payment", "Partially prevented"].includes(body.financialOutcome)) data.paymentStatus = "Prevented";
      else if (body.financialOutcome === "Paid — post-payment detection") { data.paymentStatus = "Paid"; data.detectionStage = "After payment"; }
      else if (body.financialOutcome === "Proceeded") data.paymentStatus = "Released";
      if (body.financialOutcome === "Prevented before payment") data.detectionStage = "Before payment";
    } else {
      if (!["approve", "override", "reject"].includes(body.action)) throw new InputError("Unknown review decision.");
      if (body.action === "override" && (typeof body.route !== "string" || !body.route.trim() || body.route.length > 200)) throw new InputError("Select a proposed alternative route.");
      data.status = { approve: "Route approved", override: "Route overridden", reject: "Recommendation rejected" }[body.action];
      if (body.action === "override") data.route = body.route;
      if (body.action === "reject") data.route = "Specialist review — recommendation rejected";
    }
    const reviews = await readJsonFile(humanReviewsPath, []);
    reviews.push(review);
    data.reviewHistory = reviews.filter((entry) => entry.caseId === body.caseId);
    data.audit = [...(data.audit || []), `Human ${type} recorded by ${review.actorName} at ${review.recordedAt}: ${review.note}`];
    // The raw model result, version, flags, feature values and score are immutable.
    saved[index] = { ...current, caseData: data, humanDecision: review, reviewHistory: data.reviewHistory };
    await writeJsonFile(humanReviewsPath, reviews);
    await writeSavedAssessments(saved);
    return saved[index];
  });
  return assessmentWrites;
}

function updateSavedJourneyAssessment(caseId, updates) {
  assessmentWrites = assessmentWrites
    .catch(() => {})
    .then(async () => {
      const saved = await readSavedAssessments();
      const index = saved.findIndex(
        (item) =>
          ["journey-prototype", "csv-upload"].includes(item.assessmentSource) &&
          item.caseId === caseId,
      );
      if (index < 0) return null;
      const current = saved[index];
      const caseData = current.caseData
        ? { ...current.caseData, ...updates.caseData }
        : current.caseData;
      if (
        caseData &&
        Array.isArray(current.caseData.audit) &&
        Array.isArray(updates.caseData.audit)
      ) {
        caseData.audit = [...current.caseData.audit, ...updates.caseData.audit];
      }
      saved[index] = {
        ...current,
        ...updates,
        caseData,
      };
      await writeSavedAssessments(saved);
      return saved[index];
    });
  return assessmentWrites;
}

function restoreLegacyCaseData(assessment) {
  const reasons = Array.isArray(assessment.reasons)
    ? assessment.reasons.filter((reason) => typeof reason === "string" && reason)
    : [];
  return {
    id: assessment.caseId,
    transactionId: assessment.transactionId || assessment.caseId,
    synthetic: true,
    journey: assessment.journey || "—",
    scenario: assessment.scenario || "Restored saved assessment",
    subject: "Legacy saved assessment",
    entity: "—",
    requested: assessment.assessedAt || "",
    country: "Saudi Arabia",
    region: "—",
    city: "—",
    ruleScore: 0,
    features: {
      velocity: 0,
      linkedEntities: 0,
      priorRisk: 0,
      retroDays: 0,
      identityReuse: 0,
      amountChangePct: 0,
      overrides: 0,
      crossSourceConflict: 0,
      missingData: 0,
      urgentPriority: 0,
    },
    primaryCode: "RESTORED_ASSESSMENT_SUMMARY",
    primaryReason: reasons[0] || "Restored from saved assessment summary",
    source: "Legacy backend assessment; original form details unavailable",
    transactionAmount: 0,
    currency: "SAR",
    detectionStage: "Before payment",
    paymentStatus: "Pending",
    amountAtRisk: 0,
    confirmedFraudAmount: 0,
    preventedAmount: 0,
    financialOutcome: null,
    decisionDate: null,
    decisionOwner: null,
    outcome: null,
    anomalyScore: 0,
    interaction: 0,
    score: assessment.score,
    risk: assessment.risk,
    confidenceScore:
      assessment.confidence === "High"
        ? 94
        : assessment.confidence === "Medium"
          ? 72
          : 45,
    confidence: assessment.confidence || "—",
    comparison: "Restored from a saved summary; original inputs were not retained",
    route: assessment.route || "—",
    status: "Awaiting specialist",
    signals: (
      reasons.length
        ? reasons
        : ["Original detailed form values were not retained by the earlier version."]
    ).map((reason) => ["SAVED_ASSESSMENT", reason]),
    events: [["Saved assessment", "Restored from the local backend assessment history"]],
    audit: ["Restored from an earlier backend assessment summary"],
  };
}

async function migrateSavedJourneyAssessments() {
  if (!journeyAssessmentMigration) {
    journeyAssessmentMigration = (async () => {
      await assessmentWrites.catch(() => {});
      const [savedAssessments, savedQueueCases] = await Promise.all([
        readSavedAssessments(),
        readQueueCases(),
      ]);
      const knownCaseIds = new Set(savedAssessments.map((item) => item.caseId));
      for (const item of savedQueueCases) {
        if (
          !item.id?.startsWith("NEW-") ||
          item.synthetic !== true ||
          knownCaseIds.has(item.id) ||
          !Number.isFinite(item.score) ||
          !["Low", "Medium", "High"].includes(item.risk)
        ) {
          continue;
        }
        await saveAssessment({
          assessmentId: crypto.randomUUID(),
          assessedAt: new Date().toISOString(),
          caseId: item.id,
          transactionId: item.transactionId || null,
          synthetic: true,
          assessmentSource: "journey-prototype",
          journey: item.journey || "—",
          scenario: item.scenario || "",
          score: item.score,
          risk: item.risk,
          modelVersion: item.aiModel?.version || null,
          modelFlagged: item.aiModel?.flagged ?? null,
          modelPercentile: item.aiModel?.percentile ?? null,
          confidence: item.confidence || "—",
          route: item.route || "—",
          reasons: Array.isArray(item.signals)
            ? item.signals
                .map((signal) => signal[1] || signal.message || signal.label || "")
                .filter(Boolean)
            : [],
          mainReason: item.primaryReason || item.scenario,
          reasonCodes: item.reasonCodes || (item.signals || []).map(([code, description]) => ({ code, description })),
          caseData: {
            ...item,
            audit: [
              ...(Array.isArray(item.audit) ? item.audit : []),
              `Migrated into backend assessment history at ${new Date().toISOString()}`,
            ],
          },
          validation: item.aiModel?.validation || "Prototype journey assessment; AI model metadata unavailable",
          aiModel: item.aiModel || null,
        });
        knownCaseIds.add(item.id);
      }
      await assessmentWrites.catch(() => {});
      const refreshed = await readSavedAssessments();
      const queueById = new Map(savedQueueCases.map((item) => [item.id, item]));
      let changed = false;
      for (const item of refreshed) {
        if (item.assessmentSource !== "journey-prototype" || item.caseData) {
          continue;
        }
        item.caseData = queueById.get(item.caseId) || restoreLegacyCaseData(item);
        changed = true;
      }
      if (changed) await writeSavedAssessments(refreshed);
    })().catch((error) => {
      journeyAssessmentMigration = undefined;
      throw error;
    });
  }
  return journeyAssessmentMigration;
}
export function createInferenceServer() {
  return createServer(async (req, res) => {
    const corsHeaders = {
      "Access-Control-Allow-Origin": ["http://localhost:8080", "http://127.0.0.1:8080"].includes(req.headers.origin) ? req.headers.origin : "http://localhost:8080",
      "Vary": "Origin",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    const send = (status, data) => {
      res.writeHead(status, {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(data));
    };
    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders);
      return res.end();
    }
    const path = new URL(req.url, "http://localhost").pathname;
    if (req.method === "GET" && path === "/health")
      return send(200, {
        status: "ready",
        contractVersion: "integration-v0.2-separated",
        modelVersion: model.version,
        crossJourneyModelVersion: crossJourneyModel.version,
        syntheticOnly: true,
      });
    if (req.method === "GET" && path === "/cross-journey/cases") return send(200, demoCases.map(c => ({id:c.id, family:c.family, events:c.events.length})));
    if (req.method === "GET" && path === "/cross-journey/template") {
      const csv = await readFile(new URL("./cross-journey/data/cross-journey-demo-events.csv", import.meta.url), "utf8");
      res.writeHead(200, {...corsHeaders, "Content-Type":"text/csv; charset=utf-8", "Content-Disposition":"attachment; filename=madar-connected-events.csv"});
      return res.end(csv);
    }
    if (req.method === "POST" && path === "/cross-journey/assess") {
      try {
        let payload = "";
        for await (const chunk of req) { payload += chunk; if (Buffer.byteLength(payload) > 1_100_000) return send(413,{error:"Event upload is too large."}); }
        const body = JSON.parse(payload);
        if (!body || Array.isArray(body) || Object.keys(body).length !== 1 || !["csv","case_id"].includes(Object.keys(body)[0])) throw new InputError("Supply either csv or one bundled case_id.");
        const inputs = body.csv !== undefined ? parseEventCSV(body.csv) : [demoCases.find(c => c.id === body.case_id)];
        if (inputs.some(c=>!c)) throw new InputError("Synthetic cross-journey case not found.",404);
        const records = inputs.map(createCrossJourneyAssessment);
        const operation = assessmentWrites.catch(()=>{}).then(async()=>{
          const previous = await readSavedAssessments();
          const reviews = await readJsonFile(humanReviewsPath, []);
          const saved = records.map(record=>{
            const latest = previous.find(p=>p.caseId===record.caseId && p.assessmentSource==='cross-journey');
            if (latest?.evidenceFingerprint === record.evidenceFingerprint) return latest;
            record.reviewHistory = reviews.filter(r=>r.caseId===record.caseId);
            record.caseData.reviewHistory = record.reviewHistory;
            return record;
          });
          const newRecords = saved.filter(r=>!previous.some(p=>p.assessmentId===r.assessmentId));
          if (newRecords.length) await writeSavedAssessments([...newRecords,...previous]);
          return saved;
        });
        assessmentWrites = operation;
        const saved = await operation;
        return send(200,{saved,complete:saved.filter(r=>r.complete).length,incomplete:saved.filter(r=>!r.complete).length,events:inputs.reduce((n,c)=>n+c.events.length,0),syntheticOnly:true});
      } catch (error) { return send(error.status || (error instanceof SyntaxError ? 400 : 500),{error:error instanceof InputError ? error.message : "Could not assess connected evidence."}); }
    }
    if (req.method === "GET" && path === "/model")
      return send(200, {
        version: model.version,
        algorithm: model.algorithm,
        features: model.features,
        trees: model.trees.length,
        threshold: model.threshold,
        trainingHistories: model.trainCount,
        calibrationHistories: model.calibrationCount,
        artifactSha256: report.artifactSha256,
        validation: report.validation,
      });
    if (req.method === "GET" && path === "/scenario-proposals") {
      try {
        await scenarioWrites.catch(() => {});
        return send(200, { proposals: await readJsonFile(scenarioProposalsPath, []), syntheticOnly: true, roleMode: "demo" });
      } catch { return send(500, { error: "Could not load scenario reviews." }); }
    }
    if (req.method === "POST" && path === "/scenario-proposals") {
      let payload = "";
      try {
        for await (const chunk of req) {
          payload += chunk;
          if (Buffer.byteLength(payload) > 8192) return send(413, { error: "Review request is too large." });
        }
        const body = JSON.parse(payload);
        if (!body || typeof body.caseId !== "string" || !["submit", "review", "pass-test", "approve", "activate", "reject"].includes(body.action) ||
            typeof body.actorName !== "string" || !body.actorName.trim() || body.actorName.length > 120 ||
            typeof body.note !== "string" || !body.note.trim() || body.note.length > 2000 ||
            !["Specialist", "Data & AI", "GM"].includes(body.role)) {
          return send(400, { error: "Case, reviewer name, demo role, action, and evidence note are required." });
        }
        const operation = scenarioWrites.catch(() => {}).then(async () => {
          await assessmentWrites.catch(() => {});
          const saved = await readSavedAssessments();
          const record = saved.find((entry) => entry.caseId === body.caseId && entry.caseData?.synthetic === true);
          if (!record) return { status: 404, error: "Save the new assessment to the backend first." };
          const proposals = await readJsonFile(scenarioProposalsPath, []);
          let proposal = proposals.find((entry) => entry.caseId === body.caseId);
          const now = new Date().toISOString();
          if (body.action === "submit") {
            if (body.role !== "Specialist") return { status: 403, error: "A specialist must submit the scenario." };
            if (!record.caseData.outcome) return { status: 409, error: "Record the specialist outcome before submitting the scenario." };
            if (proposal) return { status: 409, error: "This case already has a scenario proposal." };
            proposal = {
              id: crypto.randomUUID(), caseId: body.caseId, transactionId: record.transactionId,
              journey: record.caseData.journey, scenario: record.caseData.scenario,
              status: "Specialist Review", syntheticOnly: true, createdAt: now,
              assessmentId: record.assessmentId,
              snapshot: structuredClone(record.caseData), history: [],
            };
            proposals.push(proposal);
          } else {
            if (!proposal) return { status: 404, error: "Scenario proposal not found." };
            if (body.expectedStatus !== proposal.status) return { status: 409, error: "The proposal changed. Reload it before reviewing." };
            const transitions = {
              review: ["Specialist Review", "Specialist", "Testing"],
              "pass-test": ["Testing", "Data & AI", "GM Approval"],
              approve: ["GM Approval", "GM", "Approved"],
              activate: ["Approved", "GM", "Active"],
            };
            if (body.action === "reject") {
              const requiredRole = { "Specialist Review": "Specialist", Testing: "Data & AI", "GM Approval": "GM", Approved: "GM" }[proposal.status];
              if (!requiredRole || body.role !== requiredRole) return { status: 403, error: "This demo role cannot reject the proposal at its current stage." };
              proposal.status = "Rejected";
            } else {
              const transition = transitions[body.action];
              if (proposal.status !== transition[0]) return { status: 409, error: "Complete the preceding review stage first." };
              if (body.role !== transition[1]) return { status: 403, error: "This demo role cannot perform that review stage." };
              if (body.action === "activate" && /suspected|inconclusive/i.test(proposal.snapshot.outcome || "")) {
                return { status: 409, error: "An unresolved outcome cannot become an active reference scenario. Submit a resolved case." };
              }
              proposal.status = transition[2];
            }
          }
          proposal.updatedAt = now;
          proposal.history.push({ action: body.action, status: proposal.status, role: body.role, actorName: body.actorName.trim(), note: body.note.trim(), at: now });
          await writeJsonFile(scenarioProposalsPath, proposals);
          await updateSavedJourneyAssessment(body.caseId, { caseData: {
            scenarioProposal: { id: proposal.id, status: proposal.status, updatedAt: now },
            audit: [`Scenario ${body.action}: ${proposal.status} by ${body.actorName.trim()} (${body.role}) at ${now}: ${body.note.trim()}`],
          } });
          return { status: 200, proposal };
        });
        scenarioWrites = operation.then(() => {});
        const result = await operation;
        return send(result.status, result.error ? { error: result.error } : { proposal: result.proposal, syntheticOnly: true, roleMode: "demo" });
      } catch (error) {
        return send(error instanceof SyntaxError ? 400 : 500, { error: "Could not save the scenario review." });
      }
    }
    if (req.method === "GET" && path === "/risk-config") {
      const saved = await readJsonFile(riskConfigPath, null);
      return send(200, { config: validRiskConfig(saved?.config) ? saved.config : defaultRiskConfig, updatedAt: saved?.updatedAt || null, syntheticOnly: true });
    }
    if (req.method === "POST" && path === "/risk-config") {
      let payload = "";
      try {
        for await (const chunk of req) payload += chunk;
        if (Buffer.byteLength(payload) > 8192) return send(413, { error: "Risk configuration is too large." });
        const body = JSON.parse(payload);
        if (!body || Object.keys(body).some((key) => key !== "config") || !validRiskConfig(body.config)) {
          return send(400, { error: "Invalid risk weights or thresholds." });
        }
        const saved = { config: body.config, updatedAt: new Date().toISOString(), syntheticOnly: true, status: "Draft" };
        await writeJsonFile(riskConfigPath, saved);
        return send(200, saved);
      } catch (error) {
        return send(error instanceof SyntaxError ? 400 : 500, { error: "Could not save risk configuration." });
      }
    }
    if (req.method === "POST" && path === "/upload") {
      let payload = "";
      try {
        for await (const chunk of req) {
          payload += chunk;
          if (Buffer.byteLength(payload) > 2_000_000) return send(413, { error: "CSV evidence batch is too large." });
        }
        const body = JSON.parse(payload);
        const rows = body?.rows;
        if (typeof body?.csv !== "string" || !body.csv.trim() || !Array.isArray(rows) || rows.length < 1 || rows.length > 200 || !["append", "replace"].includes(body.mode)) throw new InputError("Expected CSV text and 1–200 explicitly synthetic evidence rows, with append/replace mode. Client-calculated scores are not accepted.");
        const config = await activeConfig();
        const records = [], rejected = [];
        for (let i = 0; i < rows.length; i++) {
          try {
            if (!rows[i]?.id?.startsWith("UPL-")) throw new InputError("Upload IDs must start with UPL-.");
            records.push(createApplicationAssessment(rows[i], { config, source: "csv-upload" }));
          } catch (error) {
            if (!(error instanceof InputError)) throw error;
            rejected.push({ row: i + 2, error: error.message });
          }
        }
        if (!records.length) return send(400, { error: "No valid synthetic evidence rows.", rejected });
        await saveUploadedRecords(records, body.mode);
        return send(200, { accepted: records.length, rejected, complete: records.filter((entry) => entry.complete).length, incomplete: records.filter((entry) => !entry.complete).length, saved: records, syntheticOnly: true });
      } catch (error) {
        return send(error.status || (error instanceof SyntaxError ? 400 : 500), { error: error instanceof InputError ? error.message : "Could not assess and save uploaded evidence." });
      }
    }
    if (req.method === "POST" && path === "/demo-reset") {
      try {
        await scenarioWrites.catch(() => {});
        await assessmentWrites.catch(() => {});
        await writeJsonFile(scenarioProposalsPath, []);
        await writeJsonFile(humanReviewsPath, []);
        await writeJsonFile(assessmentsPath, []);
        await writeJsonFile(queueCasesPath, []);
        await writeJsonFile(riskConfigPath, { config: defaultRiskConfig, updatedAt: new Date().toISOString(), syntheticOnly: true, status: "Default" });
        await writeJsonFile(indicatorSuggestionsPath, []);
        journeyAssessmentMigration = undefined;
        return send(200, { reset: true, syntheticOnly: true });
      } catch {
        return send(500, { error: "Could not reset the demo data." });
      }
    }
    if (req.method === "GET" && path === "/indicator-suggestions") {
      return send(200, await readJsonFile(indicatorSuggestionsPath, []));
    }
    if (req.method === "POST" && path === "/indicator-suggestions/generate") {
      try {
        await migrateSavedJourneyAssessments();
        const saved = await readSavedAssessments();
        const latestCases = [...new Map([...saved].reverse().map((item) => [item.caseId, item])).values()];
        const confirmed = latestCases.filter((item) => /confirmed violation|confirmed fraud/i.test(item.caseData?.outcome || item.outcome || ""));
        const counts = new Map();
        for (const item of confirmed) {
          const seen = new Set();
          for (const signal of item.caseData?.signals || []) {
            const code = Array.isArray(signal) ? signal[0] : signal?.code;
            const label = Array.isArray(signal) ? signal[1] : signal?.label;
            if (!code || seen.has(code) || ["COMBINED_PATTERN", "MODEL_NOT_FLAGGED", "LOWER_BEHAVIORAL_DEVIATION", "NO_MATERIAL_ANOMALY", "EVIDENCE_INCOMPLETE"].includes(code)) continue;
            seen.add(code);
            const entry = counts.get(code) || { code, label: String(label || code), confirmedCases: 0, examples: [] };
            entry.confirmedCases += 1;
            if (entry.examples.length < 3) entry.examples.push(item.caseId);
            counts.set(code, entry);
          }
        }
        const prior = await readJsonFile(indicatorSuggestionsPath, []);
        const existing = new Map(prior.map((item) => [item.code, item]));
        for (const candidate of counts.values()) {
          if (candidate.confirmedCases < 2) continue;
          const old = existing.get(candidate.code);
          if (old) {
            old.confirmedCases = candidate.confirmedCases;
            old.examples = candidate.examples;
            old.updatedAt = new Date().toISOString();
          } else {
            const now = new Date().toISOString();
            existing.set(candidate.code, { id: crypto.randomUUID(), code: candidate.code, name: candidate.label, detail: `Observed in ${candidate.confirmedCases} separately confirmed synthetic cases. Specialist validation is required.`, evidenceCount: candidate.confirmedCases, examples: candidate.examples, source: "Confirmed synthetic outcomes", status: "Proposed", createdAt: now, updatedAt: now, syntheticOnly: true });
          }
        }
        const proposals = [...existing.values()];
        await writeJsonFile(indicatorSuggestionsPath, proposals);
        return send(200, { proposals, confirmedCasesReviewed: confirmed.length, minimumRepeatCount: 2, syntheticOnly: true });
      } catch {
        return send(500, { error: "Could not generate indicator suggestions." });
      }
    }
    if (req.method === "POST" && path.startsWith("/indicator-suggestions/")) {
      try {
        const id = decodeURIComponent(path.slice("/indicator-suggestions/".length));
        let payload = "";
        for await (const chunk of req) payload += chunk;
        const body = JSON.parse(payload);
        if (!body || body.status !== "Testing") return send(400, { error: "Suggestions may only be submitted for testing here; approval and activation require governed review." });
        const proposals = await readJsonFile(indicatorSuggestionsPath, []);
        const proposal = proposals.find((item) => item.id === id);
        if (!proposal) return send(404, { error: "Suggestion not found." });
        if (proposal.status !== "Proposed") return send(409, { error: "Only Proposed suggestions can enter testing." });
        proposal.status = "Testing";
        proposal.updatedAt = new Date().toISOString();
        await writeJsonFile(indicatorSuggestionsPath, proposals);
        return send(200, proposal);
      } catch (error) {
        return send(error instanceof SyntaxError ? 400 : 500, { error: "Could not update suggestion." });
      }
    }
    if (req.method === "GET" && path === "/journey-models")
      return send(200, {
        syntheticOnly: true,
        models: [
          {
            journey: "SANED",
            version: model.version,
            algorithm: model.algorithm,
            syntheticOnly: true,
            trainingCases: report.train,
            calibrationCases: report.calibration,
            treeCount: model.trees.length,
            evaluation: {
              source: report.validation,
              testCount: report.test,
              ...report.metrics["Isolation Forest only"],
            },
          },
          ...journeyModelMetadata,
        ],
      });
    if (req.method === "GET" && path === "/assessments") {
      try {
        await migrateSavedJourneyAssessments();
        await assessmentWrites.catch(() => {});
        const saved = await readSavedAssessments();
        const reviews = await readJsonFile(humanReviewsPath, []);
        return send(200, saved.map((entry) => {
          const reviewHistory = reviews.filter((review) => review.caseId === entry.caseId);
          return { ...entry, reviewHistory, ...(entry.caseData ? { caseData: { ...entry.caseData, reviewHistory } } : {}) };
        }));
      } catch {
        return send(500, { error: "Could not read saved assessments." });
      }
    }
    if (req.method === "POST" && path === "/save-assessment") {
      let payload = "";
      try {
        for await (const chunk of req) { payload += chunk; if (Buffer.byteLength(payload) > 65536) return send(413, { error: "Request too large." }); }
        const body = JSON.parse(payload);
        await assessmentWrites.catch(() => {});
        const id = body?.assessmentId || body?.assessment?.assessmentId;
        const result = (await readSavedAssessments()).find((entry) => entry.assessmentId === id);
        if (!result) return send(409, { error: "Client-scored assessments are not accepted. Use /assess or /assess-case; inference and persistence happen together." });
        return send(200, result);
      } catch (error) { return send(error instanceof SyntaxError ? 400 : 500, { error: "Could not retrieve the saved server assessment." }); }
    }
    if (req.method === "POST" && (path === "/assess-journey" || path === "/assess")) {
      let payload = "";
      try {
        for await (const chunk of req) { payload += chunk; if (Buffer.byteLength(payload) > 65536) return send(413, { error: "Assessment evidence is too large." }); }
        const body = JSON.parse(payload);
        if (!body || typeof body !== "object" || Array.isArray(body)) throw new InputError("Expected a synthetic case ID or assessment evidence.");
        let result;
        if (body.assessment && Object.keys(body).length === 1) {
          result = createApplicationAssessment(body.assessment, { config: await activeConfig() });
        } else {
          if (path === "/assess-journey" || typeof body.case_id !== "string" || Object.keys(body).length !== 1) throw new InputError("Expected only {case_id} or {assessment}.");
          const evidence = cases.find((entry) => entry.id === body.case_id);
          if (!evidence) throw new InputError("Synthetic case not found. Arbitrary records are not accepted.", 404);
          const modelResult = assess(evidence);
          result = { assessmentId: crypto.randomUUID(), assessedAt: new Date().toISOString(), caseId: evidence.id, transactionId: null, synthetic: true, assessmentSource: "saned-model", validation: report.validation, ...modelResult };
          result.modelResult = { ...modelResult };
        }
        await saveAssessment(result);
        return send(200, result);
      } catch (error) { return send(error.status || (error instanceof SyntaxError ? 400 : 500), { error: error instanceof InputError ? error.message : "Could not assess and save synthetic evidence." }); }
    }
    if (req.method === "POST" && ["/record-outcome", "/outcome", "/decision"].includes(path)) {
      let payload = "";
      try {
        for await (const chunk of req) { payload += chunk; if (Buffer.byteLength(payload) > 8192) return send(413, { error: "Review note is too large." }); }
        const body = JSON.parse(payload);
        const keys = new Set(["caseId", "assessmentId", "outcome", "financialOutcome", "amountAtRisk", "confirmedFraudAmount", "preventedAmount", "note", "actorName", "action", "route"]);
        if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !keys.has(key)) || typeof body.caseId !== "string" || typeof body.note !== "string" || !body.note.trim() || body.note.length > 2000 || (body.actorName != null && (typeof body.actorName !== "string" || body.actorName.length > 120))) throw new InputError("A saved case and a review note of up to 2000 characters are required.");
        return send(200, await saveHumanReview(body, path === "/decision" ? "decision" : "outcome"));
      } catch (error) { return send(error.status || (error instanceof SyntaxError ? 400 : 500), { error: error instanceof InputError ? error.message : "Could not save the human review." }); }
    }
    if (req.method === "GET" && path === "/cases")
      return send(
        200,
        cases.map((c) => ({
          id: c.id,
          scenario: c.family,
          events: c.events.length,
          synthetic: true,
        })),
      );
    if (req.method === "POST" && path === "/assess-case") {
      let payload = "";
      try {
        for await (const chunk of req) { payload += chunk; if (Buffer.byteLength(payload) > 65536) return send(413, { error: "Synthetic case is too large." }); }
        const body = JSON.parse(payload);
        if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !["case", "context"].includes(key)) || body.case?.synthetic !== true || typeof body.case.id !== "string" || !body.case.id.startsWith("SYN-")) throw new InputError("Expected an explicitly synthetic event history with a SYN- ID.");
        let result;
        if (body.context) {
          if (body.context.journey !== "SANED") throw new InputError("This endpoint accepts SANED evidence only.");
          result = createApplicationAssessment(body.context, { sanedCase: body.case, config: await activeConfig() });
        } else {
          const inference = assess(body.case);
          result = { assessmentId: crypto.randomUUID(), assessedAt: new Date().toISOString(), caseId: body.case.id, transactionId: body.case.transactionId || null, synthetic: true, assessmentSource: "saned-model", validation: report.validation, ...inference, modelResult: inference };
        }
        await saveAssessment(result);
        return send(200, result);
      } catch (error) { return send(error.status || (error instanceof SyntaxError ? 400 : 500), { error: error instanceof InputError ? error.message : "Could not assess and save synthetic SANED evidence." }); }
    }
    return send(404, { error: "Not found" });
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const port = Number(process.env.SANED_AI_PORT || 8787);
  createInferenceServer().listen(port, "127.0.0.1", () =>
    console.log(
      `SANED inference ready at http://127.0.0.1:${port}. Synthetic IDs only.`,
    ),
  );
}
