"""Train the cross-journey proof using synthetic, connected entity histories only."""

from __future__ import annotations

import csv
import hashlib
import json
import math
from pathlib import Path

import numpy as np
import sklearn
from sklearn.ensemble import RandomForestClassifier


OUT = Path(__file__).resolve().parents[1] / "data"
ASSESSMENT_TIME = 1792195200000  # 17 October 2026 00:00:00 UTC
DAY = 86_400_000
HOUR = 3_600_000

FEATURE_NAMES = [
    "Distinct journeys in 30 days",
    "Events in 30 days",
    "Linked contributors in 30 days",
    "Registrations in 30 days",
    "Wage changes in 30 days",
    "Exclusions in 30 days",
    "SANED requests in 30 days",
    "Maximum wage change (%)",
    "Maximum retroactive days",
    "Hours since latest wage change (log1p)",
    "Maximum identifier reuse",
    "Cross-source conflicts",
    "Rule overrides",
    "Coordinated chain count",
    "Registration-wage-exclusion-SANED chain",
    "Completed chain span (days)",
    "Login events", "Verified login locations", "Maximum verified travel speed (km/h)",
    "IBAN changes", "Profile updates", "Login-profile-IBAN-request sequences",
    "Hours from latest IBAN change to request (log1p)",
]

JOURNEYS = {
    "registration": "Employer Registration",
    "wage": "Contribution & Wage",
    "exclusion": "Employer Registration",
    "claim": "SANED",
    "payment": "Benefit Payments",
    "retirement": "Retirement",
    "maternity": "Maternity Benefit",
    "login": "Digital Access", "iban_change": "Benefit Payments", "profile_update": "Account Maintenance",
}


DIGITAL_FAMILIES = ["routine_digital", "legitimate_travel", "legitimate_account_update", "account_takeover_sequence", "coordinated_iban_network", "rapid_profile_payment"]
REVIEW_DIGITAL = set(DIGITAL_FAMILIES[3:])

def digital_features(events):
    logins = [e for e in events if e["type"] == "login"]
    verified = [e for e in logins if e.get("locationVerified") is True]
    changes = [e for e in events if e["type"] == "iban_change"]
    speed, sequences, recencies = 0.0, 0, []
    for subject in {e["subjectId"] for e in events}:
        history = [e for e in events if e["subjectId"] == subject]
        sessions = sorted([e for e in verified if e["subjectId"] == subject], key=lambda e:e["recordedAt"])
        for a,b in zip(sessions, sessions[1:]):
            lat1, lat2 = math.radians(a["latitude"]), math.radians(b["latitude"])
            dlat, dlon = lat2-lat1, math.radians(b["longitude"]-a["longitude"])
            h = math.sin(dlat/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dlon/2)**2
            distance = 6371*2*math.asin(min(1,math.sqrt(h)))
            hours = (b["recordedAt"]-a["recordedAt"])/HOUR
            if hours > 0: speed=max(speed,min(100000,distance/hours))
        found=False
        for claim in [e for e in history if e["type"] == "claim"]:
            ibans=[e for e in history if e["type"] == "iban_change" and e["recordedAt"] < claim["recordedAt"]]
            if ibans: recencies.append((claim["recordedAt"]-max(e["recordedAt"] for e in ibans))/HOUR)
            for iban in ibans:
                for profile in [e for e in history if e["type"] == "profile_update" and e["recordedAt"] < iban["recordedAt"]]:
                    if any(e["type"] == "login" and claim["recordedAt"]-DAY <= e["recordedAt"] < profile["recordedAt"] for e in history): found=True
        sequences += int(found)
    return [len(logins),len({(e["latitude"],e["longitude"]) for e in verified}),speed,len(changes),sum(e["type"]=="profile_update" for e in events),sequences,math.log1p(min(recencies) if recencies else 720)]

def add_event(case, kind, days_ago, subject, rng, **extra):
    """Append one timestamped synthetic event to a connected case history."""
    event = {
        "eventId": f"EVT-{case['id']}-{len(case['events']) + 1:03d}",
        "journey": JOURNEYS[kind],
        "type": kind,
        "recordedAt": int(case["asOf"] - days_ago * DAY),
        "subjectId": subject,
        "employerId": case["employerId"],
        "sourceConflict": False,
        "ruleOverride": False,
    }
    event.update(extra)
    case["events"].append(event)


def make_case(rng, index, family="routine", split="train"):
    """Generate one connected employer/contributor history for a scenario family."""
    case_id = f"CJ-SYN-{split}-{index:05d}"
    employer = f"EMP-SYN-{split}-{index:05d}"
    case = {
        "id": case_id,
        "synthetic": True,
        "asOf": ASSESSMENT_TIME,
        "employerId": employer,
        "family": family,
        "split": split,
        "events": [],
    }
    subjects = [f"CTR-SYN-{split}-{index:05d}-{n:02d}" for n in range(1, 13)]

    if family in DIGITAL_FAMILIES:
        # Vary event timing between entities without changing event order.
        case["asOf"] += int(rng.uniform(-12,12)*HOUR)

    if family == "missing":
        case["employerId"] = None
        add_event(case, "claim", 0, subjects[0], rng)
        return case

    if family == "routine":
        registrations = int(rng.integers(0, 3))
        wages = int(rng.integers(1, 4))
        exclusions = int(rng.integers(0, 3))
        for n in range(registrations):
            add_event(case, "registration", float(rng.uniform(12, 29)), subjects[n], rng)
        for n in range(wages):
            pct = float(rng.uniform(-8, 20))
            add_event(
                case,
                "wage",
                float(rng.uniform(8, 27)),
                subjects[n % max(1, registrations, 2)],
                rng,
                previousAmount=6000,
                amount=round(6000 * (1 + pct / 100), 2),
            )
        for n in range(exclusions):
            recorded_days = float(rng.uniform(3, 25))
            retro_days = float(rng.uniform(0, 8))
            add_event(
                case,
                "exclusion",
                recorded_days,
                subjects[n],
                rng,
                effectiveAt=int(case["asOf"] - (recorded_days + retro_days) * DAY),
            )
        add_event(case, "claim", 0, subjects[0], rng)

    elif family == "legitimate_growth":
        registrations = int(rng.integers(5, 8))
        for n in range(registrations):
            add_event(case, "registration", float(rng.uniform(8, 29)), subjects[n], rng)
        for n in range(int(rng.integers(3, 7))):
            pct = float(rng.uniform(5, 28))
            add_event(
                case,
                "wage",
                float(rng.uniform(3, 20)),
                subjects[n],
                rng,
                previousAmount=6000,
                amount=round(6000 * (1 + pct / 100), 2),
            )
        add_event(case, "claim", 0, subjects[0], rng)

    elif family == "legitimate_restructuring":
        for n in range(int(rng.integers(3, 8))):
            recorded_days = float(rng.uniform(2, 25))
            retro_days = float(rng.uniform(0, 7))
            add_event(
                case,
                "exclusion",
                recorded_days,
                subjects[n],
                rng,
                effectiveAt=int(case["asOf"] - (recorded_days + retro_days) * DAY),
            )
        add_event(case, "claim", 0, subjects[0], rng)

    elif family == "coordinated_claim_sequence":
        # Each individual signal remains below the provisional comparator rules.
        retro_days = float(rng.uniform(15, 28))
        for n in range(3):
            add_event(case, "registration", float(rng.uniform(22, 28)), subjects[n], rng)
        for n in range(3):
            pct = float(rng.uniform(25, 55))
            add_event(
                case,
                "wage",
                float(rng.uniform(13, 19)),
                subjects[n],
                rng,
                previousAmount=6000,
                amount=round(6000 * (1 + pct / 100), 2),
            )
        for n in range(3):
            recorded_days = float(rng.uniform(5, 10))
            add_event(
                case,
                "exclusion",
                recorded_days,
                subjects[n],
                rng,
                effectiveAt=int(case["asOf"] - (recorded_days + retro_days) * DAY),
                sourceConflict=bool(n == 0 and rng.random() < 0.45),
            )
        for n in range(3):
            add_event(case, "claim", float(2 - n), subjects[n], rng)

    elif family == "identifier_reuse_network":
        identifier = f"IBAN-SYN-{split}-{index:05d}"
        for n in range(int(rng.integers(5, 9))):
            add_event(
                case,
                "payment",
                float(rng.uniform(1, 18)),
                subjects[n],
                rng,
                identifierId=identifier,
            )
        add_event(case, "claim", 0, subjects[0], rng, identifierId=identifier)

    elif family == "retroactive_source_conflict":
        for n in range(2):
            pct = float(rng.uniform(35, 70))
            days_ago = float(rng.uniform(4, 12))
            add_event(
                case,
                "wage",
                days_ago,
                subjects[n],
                rng,
                previousAmount=6000,
                amount=round(6000 * (1 + pct / 100), 2),
                effectiveAt=int(case["asOf"] - (days_ago + float(rng.uniform(35, 80))) * DAY),
                sourceConflict=True,
                ruleOverride=bool(n == 0),
            )
        add_event(case, "retirement", 3, subjects[0], rng, sourceConflict=True)
        add_event(case, "claim", 0, subjects[0], rng)
    elif family in DIGITAL_FAMILIES:
        subject = subjects[0]
        if family == "account_takeover_sequence":
            add_event(case, "login", 0.15, subject, rng, latitude=24.7136, longitude=46.6753, locationVerified=True)
            add_event(case, "login", 0.14, subject, rng, latitude=51.5074, longitude=-0.1278, locationVerified=True)
            add_event(case, "profile_update", 0.12, subject, rng, changedField="mobile")
            add_event(case, "iban_change", 0.08, subject, rng, identifierId=f"IBAN-SYN-{split}-{index}-new", previousIdentifierId=f"IBAN-SYN-{split}-{index}-old")
        elif family == "coordinated_iban_network":
            for n in range(3):
                add_event(case, "login", 0.6, subjects[n], rng, latitude=24.7136, longitude=46.6753, locationVerified=True)
                add_event(case, "profile_update", 0.4, subjects[n], rng, changedField="mobile")
                add_event(case, "iban_change", 0.2, subjects[n], rng, identifierId=f"IBAN-SYN-{split}-{index}-shared", previousIdentifierId=f"IBAN-SYN-{split}-{index}-old-{n}")
                add_event(case, "claim", 0, subjects[n], rng)
        elif family == "rapid_profile_payment":
            add_event(case, "login", 0.7, subject, rng, latitude=24.7136, longitude=46.6753, locationVerified=True)
            for n, field in enumerate(["mobile", "email", "address"]):
                add_event(case, "profile_update", 0.6-n*0.1, subject, rng, changedField=field)
            for n in range(2):
                add_event(case, "iban_change", 0.3-n*0.1, subject, rng, identifierId=f"IBAN-SYN-{split}-{index}-new-{n}", previousIdentifierId=f"IBAN-SYN-{split}-{index}-old-{n}")
        else:
            travel = family == "legitimate_travel"
            add_event(case, "login", float(rng.uniform(8, 20)), subject, rng, latitude=24.7136, longitude=46.6753, locationVerified=True)
            add_event(case, "login", 2, subject, rng, latitude=51.5074 if travel else 24.7136, longitude=-0.1278 if travel else 46.6753, locationVerified=True)
            if family != "legitimate_travel":
                days = float(rng.uniform(0.05, 7)) if family == "legitimate_account_update" else float(rng.uniform(10, 25))
                add_event(case, "profile_update", days+0.01, subject, rng, changedField="mobile")
                add_event(case, "iban_change", days, subject, rng, identifierId=f"IBAN-SYN-{split}-{index}-new", previousIdentifierId=f"IBAN-SYN-{split}-{index}-old")
        if family != "coordinated_iban_network":
            add_event(case, "claim", 0, subject, rng)
    else:
        raise ValueError(f"Unknown family: {family}")

    if family in DIGITAL_FAMILIES:
        scale=float(rng.uniform(0.7,1.1))
        for event in case["events"]:
            event["recordedAt"]=int(case["asOf"]-(case["asOf"]-event["recordedAt"])*scale)
    case["events"].sort(key=lambda event: event["recordedAt"])
    return case


def ordered_chain(events):
    """Find registration → wage → exclusion → claim in chronological order."""
    times = {
        kind: sorted(event["recordedAt"] for event in events if event["type"] == kind)
        for kind in ("registration", "wage", "exclusion", "claim")
    }
    for registration in times["registration"]:
        for wage in times["wage"]:
            if wage <= registration:
                continue
            for exclusion in times["exclusion"]:
                if exclusion <= wage:
                    continue
                for claim in times["claim"]:
                    if claim > exclusion:
                        return True, (claim - registration) / DAY
    return False, 30.0


def features(case):
    """Convert a connected history into the model's sixteen ordered features."""
    if not case.get("employerId") or not case.get("events"):
        return None
    events = [
        event
        for event in case["events"]
        if event["recordedAt"] <= case["asOf"]
        and event["recordedAt"] >= case["asOf"] - 30 * DAY
    ]
    claims = [event for event in events if event["type"] == "claim"]
    if not claims:
        return None
    wages = [event for event in events if event["type"] == "wage"]
    exclusions = [event for event in events if event["type"] == "exclusion"]
    identifier_counts = {}
    for event in events:
        identifier = event.get("identifierId")
        if identifier:
            identifier_counts.setdefault(identifier, set()).add(event["subjectId"])
    completed = [ordered_chain([event for event in events if event["subjectId"] == subject])
                 for subject in sorted({event["subjectId"] for event in events})]
    completed = [span for found, span in completed if found]
    chain_count = len(completed)
    chain, chain_span = bool(completed), min(completed) if completed else 30.0
    latest_wage_hours = (
        (case["asOf"] - max(event["recordedAt"] for event in wages)) / HOUR
        if wages
        else 30 * 24
    )
    wage_changes = [
        100 * (event["amount"] / event["previousAmount"] - 1)
        for event in wages
        if event.get("previousAmount", 0) > 0 and event.get("amount") is not None
    ]
    retroactive = [
        max(0.0, (event["recordedAt"] - event["effectiveAt"]) / DAY)
        for event in events
        if event.get("effectiveAt") is not None
    ]
    return [
        len({event["journey"] for event in events}),
        len(events),
        len({event["subjectId"] for event in events}),
        sum(event["type"] == "registration" for event in events),
        len(wages),
        len(exclusions),
        len(claims),
        max(wage_changes or [0.0]),
        max(retroactive or [0.0]),
        math.log1p(max(0.0, latest_wage_hours)),
        max([len(subjects) for subjects in identifier_counts.values()] or [0]),
        sum(bool(event.get("sourceConflict")) for event in events),
        sum(bool(event.get("ruleOverride")) for event in events),
        chain_count,
        int(chain),
        chain_span,
    ] + digital_features(events)


def comparator_rules(vector):
    """Return whether any transparent provisional threshold triggers review."""
    return (
        vector[3] >= 8
        or vector[6] >= 5
        or vector[7] >= 80
        or vector[8] >= 30
        or vector[10] >= 4
        or vector[11] >= 2
        or vector[12] >= 3
    )


def metric_counts(expected, predicted):
    """Calculate binary review-class detection counts and rates."""
    tp = sum(wanted and result for wanted, result in zip(expected, predicted))
    fp = sum(not wanted and result for wanted, result in zip(expected, predicted))
    fn = sum(wanted and not result for wanted, result in zip(expected, predicted))
    tn = sum(not wanted and not result for wanted, result in zip(expected, predicted))
    return {
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "tn": tn,
        "accuracy": (tp + tn) / len(expected),
        "precision": tp / max(1, tp + fp),
        "recall": tp / max(1, tp + fn),
        "falsePositiveRate": fp / max(1, fp + tn),
    }


def generate_population(rng, split, counts):
    """Generate a partition with disjoint synthetic entity namespaces."""
    cases = []
    index = 0
    for family, count in counts:
        for _ in range(count):
            cases.append(make_case(rng, index, family, split))
            index += 1
    return cases


def write_demo_csvs(cases):
    """Write event-level upload data and separate case-level reference metadata."""
    event_fields = [
        "case_id",
        "assessment_time",
        "event_id",
        "recorded_at",
        "effective_at",
        "journey",
        "event_type",
        "subject_id",
        "employer_id",
        "identifier_id",
        "amount",
        "previous_amount",
        "source_conflict",
        "rule_override",
        "synthetic", "latitude", "longitude", "location_verified", "previous_identifier_id", "changed_field",
    ]
    with (OUT / "cross-journey-demo-events.csv").open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=event_fields, lineterminator="\n")
        writer.writeheader()
        for case in cases:
            for event in case["events"]:
                writer.writerow(
                    {
                        "case_id": case["id"],
                        "assessment_time": case["asOf"],
                        "event_id": event["eventId"],
                        "recorded_at": event["recordedAt"],
                        "effective_at": event.get("effectiveAt", ""),
                        "journey": event["journey"],
                        "event_type": event["type"],
                        "subject_id": event["subjectId"],
                        "employer_id": event.get("employerId", ""),
                        "identifier_id": event.get("identifierId", ""),
                        "amount": event.get("amount", ""),
                        "previous_amount": event.get("previousAmount", ""),
                        "source_conflict": int(bool(event.get("sourceConflict"))),
                        "rule_override": int(bool(event.get("ruleOverride"))),
                        "latitude":event.get("latitude", ""), "longitude":event.get("longitude", ""), "location_verified":int(bool(event.get("locationVerified"))), "previous_identifier_id":event.get("previousIdentifierId", ""), "changed_field":event.get("changedField", ""),
                        "synthetic": 1,
                    }
                )
    with (OUT / "cross-journey-demo-cases.csv").open("w", newline="") as handle:
        fields = [
            "case_id",
            "family",
            "expected_review_provisional",
            "business_validation_status",
            "primary_journey",
            "employer_id",
            "event_count",
            "journey_count",
            "synthetic",
        ]
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        for case in cases:
            vector = features(case)
            writer.writerow(
                {
                    "case_id": case["id"],
                    "family": case["family"],
                    "expected_review_provisional": int(
                        case["family"]
                        in REVIEW_DIGITAL | {
                            "coordinated_claim_sequence",
                            "identifier_reuse_network",
                            "retroactive_source_conflict",
                        }
                    ),
                    "business_validation_status": (
                        "Digital typology and threshold require specialist validation" if case["family"] in DIGITAL_FAMILIES else "Original business pattern confirmed; model threshold remains a prototype assumption"
                    ),
                    "primary_journey": "SANED",
                    "employer_id": case.get("employerId") or "",
                    "event_count": len(case["events"]),
                    "journey_count": int(vector[0]) if vector else "",
                    "synthetic": 1,
                }
            )


def main():
    """Train, calibrate, evaluate, export, and generate reproducible demo data."""
    rng = np.random.default_rng(20261017)
    train_counts = [
        ("routine", 3200),
        ("legitimate_growth", 400),
        ("legitimate_restructuring", 400),
        ("coordinated_claim_sequence", 1500),
        ("identifier_reuse_network", 600),
        ("retroactive_source_conflict", 600),
    ]
    train_counts += [(family, 600) for family in DIGITAL_FAMILIES]
    train = generate_population(
        rng,
        "train",
        train_counts,
    )
    calibration = generate_population(
        rng,
        "calibration",
        [("routine", 800), ("legitimate_growth", 100), ("legitimate_restructuring", 100)] + [(family,200) for family in DIGITAL_FAMILIES[:3]],
    )
    test_counts = [
        ("routine", 250),
        ("legitimate_growth", 75),
        ("legitimate_restructuring", 75),
        ("coordinated_claim_sequence", 150),
        ("identifier_reuse_network", 75),
        ("retroactive_source_conflict", 75),
    ]
    test_counts += [(family,100) for family in DIGITAL_FAMILIES]
    test = generate_population(rng, "test", test_counts)

    review_families = {
        "coordinated_claim_sequence",
        "identifier_reuse_network",
        "retroactive_source_conflict",
    }
    review_families |= REVIEW_DIGITAL
    train_x = np.asarray([features(case) for case in train], dtype=np.float32)
    train_y = np.asarray([case["family"] in review_families for case in train], dtype=np.int8)
    calibration_x = np.asarray([features(case) for case in calibration], dtype=np.float32)
    test_x = np.asarray([features(case) for case in test], dtype=np.float32)

    model = RandomForestClassifier(
        n_estimators=180,
        max_depth=10,
        min_samples_leaf=6,
        max_features="sqrt",
        class_weight="balanced_subsample",
        random_state=20261017,
        n_jobs=1,
    ).fit(train_x, train_y)
    calibration_scores = sorted(model.predict_proba(calibration_x)[:, 1].tolist())
    threshold = float(np.quantile(calibration_scores, 0.97) + 1e-10)

    trees = []
    for estimator in model.estimators_:
        tree = estimator.tree_
        trees.append(
            {
                "left": tree.children_left.tolist(),
                "right": tree.children_right.tolist(),
                "feature": tree.feature.tolist(),
                "threshold": tree.threshold.tolist(),
                "positive": [
                    float(value[0][1] / max(1e-12, value[0].sum()))
                    for value in tree.value
                ],
            }
        )

    artifact = {
        "version": "madar-cross-journey-rf-20261107-v3",
        "algorithm": "Random Forest cross-journey pattern classifier",
        "sklearnVersion": sklearn.__version__,
        "seed": 20261017,
        "features": FEATURE_NAMES,
        "trees": trees,
        "threshold": threshold,
        "calibrationScores": calibration_scores,
        "trainCount": len(train),
        "calibrationCount": len(calibration),
        "referenceMedian": np.median(train_x, axis=0).tolist(),
        "referenceP05": np.quantile(train_x, 0.05, axis=0).tolist(),
        "referenceP95": np.quantile(train_x, 0.95, axis=0).tolist(),
    }
    model_raw = json.dumps(artifact, separators=(",", ":"))
    (OUT / "model.json").write_text(model_raw)

    expected = [case["family"] in review_families for case in test]
    scores = model.predict_proba(test_x)[:, 1]
    ai = [bool(score >= threshold) for score in scores]
    rules = [bool(comparator_rules(vector)) for vector in test_x]
    combined = [rule or anomaly for rule, anomaly in zip(rules, ai)]

    report = {
        "modelVersion": artifact["version"],
        "artifactSha256": hashlib.sha256(model_raw.encode()).hexdigest(),
        "validation": "Synthetic prototype with contributor-level sequence correction; business validation and real-data evaluation required",
        "train": len(train),
        "calibration": len(calibration),
        "test": len(test),
        "routineOrLegitimate": expected.count(False),
        "review": expected.count(True),
        "threshold": threshold,
        "thresholdMethod": "97th percentile of a separate routine and legitimate calibration population",
        "splitMethod": "Disjoint synthetic case, employer, contributor, and identifier IDs; common generator; no real-world generalisation claim",
        "metrics": {
            "Provisional rules only": metric_counts(expected, rules),
            "Cross-journey pattern model only": metric_counts(expected, ai),
            "Rules OR cross-journey AI": metric_counts(expected, combined),
        },
        "byScenario": {},
    }
    for family, _ in test_counts:
        indexes = [index for index, case in enumerate(test) if case["family"] == family]
        report["byScenario"][family] = {
            "count": len(indexes),
            "aiFlagged": sum(ai[index] for index in indexes),
            "ruleFlagged": sum(rules[index] for index in indexes),
        }
    (OUT / "evaluation.json").write_text(json.dumps(report, indent=2) + "\n")
    (OUT / "evaluation-cases.json").write_text(
        json.dumps(
            [
                {
                    "id": case["id"],
                    "family": case["family"],
                    "expectedReview": expected[index],
                    "features": features(case),
                    "pythonScore": float(scores[index]),
                }
                for index, case in enumerate(test)
            ],
            separators=(",", ":"),
        )
    )

    demo_families = [
        "routine",
        "coordinated_claim_sequence",
        "legitimate_restructuring",
        "identifier_reuse_network",
        "retroactive_source_conflict",
        "missing",
    ]
    demo_families += DIGITAL_FAMILIES
    demos = [make_case(rng, index, family, "demo") for index, family in enumerate(demo_families)]
    (OUT / "demo-cases.json").write_text(json.dumps(demos, separators=(",", ":")))
    write_demo_csvs(demos)

    parity = []
    for case in test[::19]:
        vector = features(case)
        parity.append(
            {
                "case": case,
                "features": vector,
                    "score": float(model.predict_proba(np.asarray([vector], dtype=np.float32))[0, 1]),
            }
        )
    (OUT / "parity-fixtures.json").write_text(json.dumps(parity, separators=(",", ":")))
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
