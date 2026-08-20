# Behavioral Intrusion & Anomaly Detection System — Design Document

## 1. Problem Statement

Build a system that:

1. **Models "normal"** access and connection behavior per user and per device (a behavioral baseline, not a static rule set).
2. **Detects intrusions / compromised-credential activity** in near real-time as events stream in.
3. **Classifies the anomaly type** — credential misuse, lateral movement, brute force, impossible travel, device spoofing, etc. — rather than emitting an undifferentiated "anomaly" flag.
4. **Produces an explainable risk score** a SOC analyst can act on without reverse-engineering the model.

The five hard constraints called out in the brief — sequential data, class imbalance, concept drift, explainability, and cold-start — are treated as first-class design drivers, not afterthoughts. Each shapes a specific architectural decision below.

---

## 2. High-Level Architecture

```
                    ┌────────────────────────────────────────────────────────┐
                    │                    EVENT SOURCES                        │
                    │  VPN/SSO logs · IdP (Okta/AAD) · EDR · VPN · Firewall   │
                    │  Cloud API audit logs (CloudTrail/Azure AD) · DHCP/DNS  │
                    └───────────────────────────┬──────────────────────────┘
                                                 │  (Kafka / Kinesis / Event Hub)
                                                 ▼
                    ┌────────────────────────────────────────────────────────┐
                    │             STREAM INGESTION & NORMALIZATION            │
                    │  Schema unification (OCSF/CEF) · dedup · enrichment      │
                    │  (GeoIP, ASN, device fingerprint, HR/IT asset join)      │
                    └───────────────────────────┬──────────────────────────┘
                                                 ▼
        ┌───────────────────────┐   ┌───────────────────────────┐   ┌───────────────────────┐
        │ REAL-TIME FEATURE     │   │ ENTITY PROFILE STORE       │   │ GRAPH STORE            │
        │ ENGINEERING (stateful │◄─►│ (rolling user/device       │◄─►│ (identity ↔ device ↔    │
        │ stream processor)     │   │ behavioral baselines,      │   │ resource ↔ session      │
        │                       │   │ per-entity, versioned)     │   │ edges, for lateral      │
        └───────────┬───────────┘   └───────────────────────────┘   │ movement detection)     │
                    │                                               └───────────────────────┘
                    ▼
        ┌───────────────────────────────────────────────────────────────────┐
        │                     DETECTION LAYER (ensemble)                     │
        │  A) Sequence model (per-entity next-event likelihood)               │
        │  B) Unsupervised outlier ensemble (density / isolation / graph)     │
        │  C) Supervised weak-label classifiers (rule-derived + rare labels)  │
        │  D) Rule / heuristic layer (brute force, impossible travel — hard   │
        │     physics/logic checks that don't need ML)                       │
        └───────────────────────────┬─────────────────────────────────────┘
                                     ▼
        ┌───────────────────────────────────────────────────────────────────┐
        │              RISK FUSION & ANOMALY-TYPE CLASSIFIER                 │
        │  Combines signals → calibrated risk score (0-100) + anomaly-type    │
        │  label(s) + confidence + contributing-feature attribution           │
        └───────────────────────────┬─────────────────────────────────────┘
                                     ▼
        ┌───────────────────────────────────────────────────────────────────┐
        │            EXPLAINABILITY & CASE-BUILDING LAYER                    │
        │  SHAP/attention attribution → natural-language rationale →          │
        │  evidence timeline → SOC case object                               │
        └───────────────────────────┬─────────────────────────────────────┘
                                     ▼
        ┌───────────────────────────────────────────────────────────────────┐
        │   SOC OUTPUTS: SIEM/SOAR alert · analyst UI · feedback loop back    │
        │   into training data (analyst verdict = label)                     │
        └───────────────────────────────────────────────────────────────────┘
```

Design principle: **no single model owns the decision.** A rule layer catches the things that are deterministic and cheap (brute force thresholds, physically-impossible travel), while ML layers absorb everything fuzzy (drifted behavior, novel attack patterns, multi-signal correlation). This keeps false-positive rates manageable and gives analysts a mix of "obviously true" and "ML-flagged, here's why" alerts.

---

## 3. Constraint 1 — Sequential & Behavioral Data

**Why this matters:** an access event's meaning depends entirely on its context in a sequence — a login from a new city is benign after 3pm on a travel day and suspicious 4 minutes after the same user logged in from another continent. Point-in-time snapshots throw this away.

### 3.1 Event representation
Each raw event (login, VPN connect, file access, privilege escalation, API call) is normalized into a common schema:

```
{entity_id, entity_type[user|device|service_account], timestamp,
 action_type, resource, source_ip, geo{lat,lon,country,asn},
 device_fingerprint, auth_method, mfa_used, session_id,
 outcome[success|fail|challenge], target_entity_id (for lateral movement edges)}
```

### 3.2 Two parallel sequence representations
- **Per-entity event sequence** — chronological stream of that user's/device's own actions. Used to detect deviation from *self*.
- **Per-session sequence** — the sequence of actions within one authenticated session, used to detect mid-session pivoting (e.g., login → normal file access → sudden lateral RDP to a server this user has never touched).

### 3.3 Modeling approaches (layered, cheapest-first)
| Layer | Technique | Purpose |
|---|---|---|
| Statistical baseline | Rolling per-entity histograms (login hour-of-day, source ASN set, resource set) with exponentially-weighted counts | Cheap, interpretable, always available, degrades gracefully |
| Sequence model | GRU/LSTM or small Transformer trained as a **next-action predictor** per entity-type cohort (not per individual — see cold-start) | Learns "what usually follows what" — flags low-likelihood transitions (e.g., login → immediate admin-share access) |
| Graph sequence | Temporal graph (nodes = users/devices/resources, edges = access events with timestamps) fed to a temporal GNN or simpler edge-time-decay scoring | Captures lateral movement — abnormal edge creation between entities that rarely/never interact |

The sequence model does **not** predict "is this an attack" directly — it predicts "how surprising is this action given this entity's recent history," expressed as a negative log-likelihood. That likelihood becomes one of several inputs into the risk fusion layer (Section 6), which keeps it interpretable rather than a black-box binary classifier.

### 3.4 Windowing strategy
- Short window (session-level, minutes): for brute force, impossible travel, credential stuffing.
- Medium window (rolling 24h–7d): for privilege/resource-access pattern shifts.
- Long window (rolling 30–90d, decayed): the behavioral baseline itself, used for drift-aware normalcy modeling (Section 5).

---

## 4. Constraint 2 — Extreme Class Imbalance

True intrusions are typically <0.01–0.1% of events. Standard supervised classification collapses under this ratio (a model predicting "never anomalous" gets >99.9% accuracy and is useless).

### 4.1 Frame it as anomaly detection first, classification second
Rather than one supervised multi-class model trained end-to-end on rare labels, use a **two-stage funnel**:

1. **Stage 1 — unsupervised/self-supervised anomaly scoring** (doesn't need labeled attacks at all):
   - Isolation Forest / Extended Isolation Forest on tabular behavioral features.
   - Autoencoder or sequence-model reconstruction/likelihood error (Section 3.3) as an anomaly score.
   - Local Outlier Factor or density-based scoring within peer groups (see 4.4).
   - This stage's job: cheaply cut 99%+ of clearly-normal traffic, passing only the top-k% most surprising events downstream.

2. **Stage 2 — supervised anomaly-type classifier**, trained only on the (much smaller, much richer) set of events that Stage 1 flagged plus confirmed historical incidents plus synthetically generated attack sequences (Section 4.3). Because Stage 1 pre-filters, the effective class balance Stage 2 sees is far less extreme.

### 4.2 Handling imbalance within each stage
- **Cost-sensitive learning**: class weights / focal loss so rare true positives contribute proportionally more gradient signal.
- **Threshold-free evaluation during training**: optimize PR-AUC and recall-at-fixed-precision rather than accuracy or plain ROC-AUC, since ROC-AUC is misleadingly optimistic under extreme imbalance.
- **Resampling with care**: SMOTE-style oversampling is risky on sequential/behavioral data (synthetic interpolation between two "normal-adjacent" sequences may not correspond to a real attack pattern). Prefer:
  - Oversampling by *replaying* real historical incident sequences with light perturbation (time-jitter, IP/ASN substitution within realistic ranges) rather than naive feature-space interpolation.
  - Undersampling the "obviously normal" majority using the Stage-1 anomaly score itself (keep hard negatives near the decision boundary, discard trivially-normal events) — this is more informative than random undersampling.
- **Synthetic red-team data**: generate labeled examples of each target class (brute force, impossible travel, credential stuffing, lateral movement) via attack simulation / purple-team exercises, MITRE ATT&CK-mapped scenario replay, and log injection into a staging pipeline. This is often the single highest-leverage fix for imbalance since real confirmed incidents are rare by definition.
- **Semi-supervised label propagation**: use the small set of analyst-confirmed verdicts (Section 8 feedback loop) to propagate soft labels to similar unlabeled anomalies via nearest-neighbor in embedding space, expanding effective training signal over time.

### 4.3 Evaluation under imbalance
- Primary metric: **precision-recall AUC** and **recall at a fixed analyst-tolerable false-positive budget** (e.g., "how many true intrusions do we catch if the SOC can only triage 50 alerts/day").
- Report **per-class recall** for each anomaly type separately — a model can look good in aggregate while missing an entire attack category.
- Track **alert-to-incident ratio** in production as the operational north star, not offline AUC alone.

### 4.4 Peer-group modeling helps imbalance too
Comparing an entity only to its own history has too little data per entity to be statistically stable. Group entities into **peer cohorts** (role, department, device type, access pattern cluster) and score anomalies relative to both self-history and peer-group norms. This gives more "normal" examples to learn from per cohort and makes rare-event detection more statistically grounded.

---

## 5. Constraint 3 — Concept Drift

Legitimate behavior changes: new job role, new laptop, team moves to a new office, seasonal work patterns, a new SaaS tool rolled out company-wide. The system must **adapt without permanently anchoring on stale "normal"** and without treating every drift as an attack.

### 5.1 Decaying, rolling baselines (not fixed training snapshots)
- Per-entity baseline features use **exponentially-weighted moving statistics** (half-life configurable, e.g., 14–30 days) rather than a fixed historical window. Old behavior fades out gradually instead of being either permanently binding or abruptly discarded.
- Maintain **two baselines simultaneously**: a fast one (7-day decay) and a slow one (90-day decay). A new pattern that's stable in the fast baseline but absent from the slow one is flagged as "emerging behavior" — surfaced at low severity, not high — and gets promoted into the slow baseline automatically if it persists without further incident for N days.

### 5.2 Drift vs. attack disambiguation
The hard problem is telling "user got a new laptop" from "attacker is impersonating the user with a new device." Mitigations:
- **Corroborating signal requirement**: a single drifted feature (new device fingerprint alone) is low severity; drift is only escalated when it co-occurs with other risk signals (new device AND unusual hour AND new geography AND sequence-model surprise) — this is exactly what the risk fusion layer (Section 6) is for.
- **Soft-launch / probation period for new patterns**: a new device/location is auto-tagged "unverified new pattern," subjected to step-up authentication (MFA challenge) once, and if it clears, the system begins folding it into the entity's baseline instead of re-flagging every subsequent use. This also directly solves cold-start for *returning* patterns.
- **Change-point detection**: apply an online change-point detection algorithm (e.g., Bayesian Online Change Point Detection or ADWIN) on each entity's behavioral time series so the system can detect *when* behavior shifted, not just *that* it did — enabling "this looks like a step-change starting 3 days ago" rather than continuous low-grade alerting.

### 5.3 Model-level drift handling
- **Online/incremental retraining**: sequence and peer-cohort models retrained on a rolling schedule (e.g., nightly incremental fine-tune, full retrain weekly) rather than a single static model.
- **Population Stability Index (PSI) / feature drift monitors** on model inputs, tracked per feature, to detect when the *global* population is shifting (e.g., company-wide VPN migration) — this should trigger a scheduled model refresh rather than a flood of individual alerts.
- **Shadow deployment before promotion**: retrained models run in shadow mode, scoring live traffic without alerting, and are only promoted to production once their score distribution and precision/recall on a held-out labeled+synthetic set meet gates. This prevents a bad retrain from silently degrading detection.
- **Human-in-the-loop baseline correction**: analyst "not a threat, this is expected new behavior" verdicts directly update that entity's/cohort's baseline weighting, not just the training label set — closing the loop faster than a full retrain cycle would.

---

## 6. Constraint 4 — Explainability

A risk score with no rationale is not actionable for a SOC analyst under time pressure; it also creates institutional distrust of the system.

### 6.1 Architectural choice: interpretable fusion over end-to-end black box
Rather than one large opaque model that ingests raw sequences and emits a score, the **fusion layer is a small, interpretable model** (e.g., gradient-boosted tree or logistic regression over a curated feature set) sitting on top of the deeper components' outputs:

```
Inputs to fusion model (each independently interpretable):
 - sequence_model_surprise_score        (from Section 3)
 - isolation_forest_score               (from Section 4)
 - peer_group_deviation_score           (from Section 4.4)
 - graph_lateral_movement_score         (from Section 3.3)
 - rule_engine_flags[]                  (brute_force_threshold, impossible_travel, new_device, geo_velocity, mfa_bypass_attempt, etc.)
 - drift_context[]                      (is_emerging_pattern, days_since_pattern_first_seen)
```

Because the top-level model is shallow and tree/linear-based, **SHAP values or native feature importances directly translate into "this event scored 87/100 because: impossible travel (Δ+35), sequence surprise in top 1% for this user (Δ+22), new device fingerprint co-occurring with privilege escalation (Δ+18), peer-group deviation (Δ+12)."**

### 6.2 Explanation surfaces for the analyst
- **Feature attribution** (SHAP waterfall) — which signals moved the score, and by how much.
- **Natural-language rationale**, template-generated from the top attributions (e.g., *"Login succeeded from Lagos, NG 11 minutes after a login from Toronto, CA for the same account — physically implausible (impossible travel). Device fingerprint has not been seen for this user in 90 days. Sequence of subsequent actions (immediate access to HR database) deviates sharply from this user's typical post-login behavior."*).
- **Comparison to baseline**: side-by-side "typical behavior" vs. "this event" (typical login hours, typical countries, typical resources) rendered as a small visual/table.
- **Evidence timeline**: the raw event sequence that triggered the sequence-model surprise, so the analyst can verify the model's reasoning against ground truth logs, not just trust the score.
- **Counterfactual hint**: "score would drop to 22 if MFA had been used" / "would drop to 40 if this device had been seen before" — helps analysts and later, policy owners, understand actionable levers.

### 6.3 Explainability for the deep components specifically
- Sequence model: use **attention weights** (if Transformer-based) or **integrated gradients** (if RNN-based) to highlight which prior events in the sequence contributed most to a low-likelihood prediction for the current event.
- Graph model: highlight the **specific edge(s)** (entity-resource or entity-entity pairs) that are anomalous in a temporal-GNN score, not just an aggregate node score.
- All deep-component explanations are summarized into the same fixed feature slots the fusion model consumes, so the *final* explanation the analyst sees is always coherent and consistent, never a dump of raw attention matrices.

---

## 7. Constraint 5 — Cold-Start Problem

New users, new devices, and new service accounts have no history, so "deviation from self" is undefined at first.

### 7.1 Fall back to peer-group / role-based priors
When entity-level history is insufficient (below a configurable event-count threshold, e.g., <30 events or <14 days), score against:
- **Role/department cohort baseline** (e.g., "new engineer" behavior profile) instead of individual baseline.
- **Organizational policy priors** (expected working hours, expected geography, expected resource categories for that role, pulled from HR/IT provisioning systems) as a Bayesian prior.
- **Device-class baseline** for new devices (managed corporate laptop vs. unmanaged BYOD vs. server vs. IoT) rather than device-specific history.

### 7.2 Bayesian blending as history accumulates
Represent the entity's behavioral profile as a **posterior that starts at the cohort prior and is updated toward entity-specific data as evidence accumulates**:

```
belief(entity) = w(n) * cohort_prior + (1 - w(n)) * entity_empirical_baseline
where w(n) decays as n (entity's own event count) grows,
e.g. w(n) = k / (k + n)   for some smoothing constant k
```

This means a brand-new user is scored almost entirely against their peer group on day one, and the weighting smoothly shifts toward their own emerging pattern over the following days/weeks — no hard cutover, no "sorry, no baseline yet" gap.

### 7.3 Elevated-scrutiny, not blind-trust, during the cold-start window
- New entities are placed in a **probationary risk tier**: not silently trusted, but also not flooded with false alerts. Concretely — step-up authentication (MFA) is required more readily for a new entity's first sensitive actions, and any anomaly during the cold-start window is corroborated against provisioning records (does IT/HR confirm this user/device was actually issued today?) before being escalated.
- **Identity-proofing integration**: cross-check new-account activity against the identity/HR system of record and IT asset management (was this device actually enrolled via MDM today, or did it just start appearing in logs?) — a new device with no corresponding asset-management enrollment event is itself a strong anomaly signal, independent of behavioral modeling.

### 7.4 Transfer learning for the sequence models
The per-entity sequence model (Section 3.3) is never trained from scratch per entity — it's trained once per cohort (role/department/device-class) on many entities' pooled sequences, then **conditioned on entity ID as an embedding** at inference time. A new entity gets a freshly initialized (or cohort-averaged) embedding that still benefits from the shared cohort-level sequential patterns learned across everyone else, and that embedding personalizes as more of the entity's own events arrive. This avoids the "no data, no model" dead end entirely.

---

## 8. Anomaly Taxonomy & Detection Logic per Type

| Anomaly type | Primary signals | Detection approach |
|---|---|---|
| **Brute force / credential stuffing** | High-frequency failed auth attempts, single source → many accounts (stuffing) or single account → many passwords (brute force), short time window | Rule engine (rate thresholds, unique-target counts) + sequence model surprise on rapid-fail sequences |
| **Impossible travel** | Two successful auths for same identity, geodistance / min-travel-time infeasible given elapsed time | Deterministic geo-velocity rule (physics check) — high precision, low recall by design; corroborated with device-fingerprint mismatch |
| **Credential misuse** (valid creds, wrong behavior) | Login succeeds normally, but subsequent action sequence deviates from entity/peer baseline; access to resources never touched before; off-hours privileged access | Sequence-model surprise + peer-group deviation + resource-access-graph anomaly |
| **Lateral movement** | New entity-to-entity or entity-to-resource edges appearing in the access graph; privilege escalation followed by access to systems atypical for the account's role; account "hopping" between hosts | Temporal graph anomaly detection (edge novelty + edge velocity); MITRE ATT&CK technique mapping (e.g., pass-the-hash patterns, RDP chaining) |
| **Device spoofing / fingerprint mismatch** | Device fingerprint inconsistent with claimed device (user-agent/TLS/hardware telemetry mismatch), MDM enrollment absent, fingerprint reused across geographically implausible sessions | Fingerprint-consistency rule checks + cross-reference with asset management system + cold-start elevated scrutiny (Section 7.3) |
| **Privilege escalation / policy violation** | Role/permission changes not matching HR-driven entitlement, admin actions outside change-management windows | Rule engine tied to IAM/entitlement system + sequence surprise |

Multi-label output is supported — a single event can legitimately trigger more than one category (e.g., impossible travel *and* device spoofing together are a strong compromised-credential signal and should compound the risk score, not just union the labels).

---

## 9. Risk Score Design

- **Score range**: 0–100, calibrated so the number is a genuine probability-like estimate (use **Platt scaling or isotonic regression** on the fusion model's raw output against the labeled/synthetic evaluation set) — not an arbitrary weighted sum that drifts in meaning over time.
- **Severity banding for SOC triage**: e.g., 0–39 informational (logged, no alert), 40–69 low/medium (batched daily digest), 70–89 high (real-time alert, auto-case creation), 90–100 critical (real-time alert + auto step-up-auth challenge or account suspension via SOAR playbook, depending on policy).
- **Score stability requirement**: near-duplicate events for the same entity within a short window shouldn't cause wildly different scores — smooth scoring over a short trailing window to avoid alert flapping.
- **Decay-aware scoring**: score contribution from "new pattern" features should shrink automatically as that pattern ages into the baseline (ties back to Section 5), so the same score input doesn't stay permanently flagged.

---

## 10. Near-Real-Time Serving Architecture

- **Stream processing**: Kafka/Kinesis + a stateful stream processor (Flink, or Kafka Streams) maintaining per-entity rolling feature state in a low-latency store (Redis / RocksDB-backed state store) — target end-to-end latency from event ingestion to score: **under 2–5 seconds** for the rule + Stage-1 anomaly path, sub-minute acceptable for the deeper sequence/graph model path if it runs slightly async and republishes an updated score.
- **Two-speed scoring**: a fast synchronous path (rules + lightweight statistical baseline) gives an initial score immediately; a slower async path (sequence model, graph model, fusion) refines/upgrades the score within seconds and republishes if it crosses a severity threshold. This avoids blocking real-time alerting on the heaviest models while still using them.
- **Feature store**: an online feature store (e.g., Feast, or a custom Redis-backed store) serving both the streaming scorer and offline training pipeline from the same feature definitions, to avoid train/serve skew.
- **Model serving**: containerized model server (e.g., Triton/TorchServe or a lightweight custom service) behind the stream processor, with the interpretable fusion model runnable as a fast in-process step (tree models are cheap enough to embed directly in the stream job).

---

## 11. Evaluation, Monitoring & Feedback Loop

- **Offline evaluation**: PR-AUC, recall@precision, per-anomaly-type recall (Section 4.3), plus a held-out red-team/simulated-attack test set refreshed regularly so the model isn't overfit to a single historical incident set.
- **Online evaluation**: shadow-mode comparison before promoting any retrained model (Section 5.3); track alert volume, analyst-confirmed true/false positive rate, mean-time-to-triage.
- **Feedback loop**: every analyst disposition (true positive / false positive / benign-new-pattern) is captured as a label and flows back into (a) the supervised Stage-2 training set, (b) the entity/cohort baseline correction (Section 5.3), and (c) periodic recalibration of the risk-score-to-probability mapping.
- **Drift monitors**: PSI/feature-drift dashboards (Section 5.3) and a scheduled model-health review cadence, independent of ad hoc retraining triggers.
- **Bias / fairness check**: periodically verify the model isn't systematically scoring certain departments, roles, geographies, or device types higher purely due to population size or data sparsity rather than genuine risk — important both ethically and because it directly degrades SOC trust and alert fatigue if one team gets flagged disproportionately.

---

## 12. Suggested Tech Stack (indicative, not prescriptive)

| Layer | Options |
|---|---|
| Event streaming | Kafka / AWS Kinesis / Azure Event Hubs |
| Stream processing | Apache Flink / Kafka Streams / Spark Structured Streaming |
| Feature store | Feast, or Redis/RocksDB-backed custom store |
| Graph store | Neo4j / Amazon Neptune / TigerGraph |
| Sequence modeling | PyTorch (GRU/LSTM/small Transformer), or a managed service equivalent |
| Unsupervised anomaly detection | scikit-learn (Isolation Forest, LOF), PyOD library |
| Fusion / classifier | LightGBM / XGBoost (native SHAP support) |
| Explainability | SHAP, Captum (for deep-model attribution) |
| Orchestration / retraining | Airflow / Kubeflow Pipelines |
| Serving | Triton Inference Server / TorchServe / custom FastAPI microservice |
| SIEM/SOAR integration | Splunk, Microsoft Sentinel, or generic webhook into existing SOAR (e.g., Cortex XSOAR) |

---

## 13. Summary of How Each Constraint Is Addressed

| Constraint | Core mechanism |
|---|---|
| Sequential & behavioral data | Per-entity and per-session sequence models (RNN/Transformer + temporal graph) treating events as ordered streams, not snapshots |
| Extreme class imbalance | Two-stage funnel (unsupervised filter → supervised classifier), cost-sensitive learning, synthetic/replayed attack data, PR-AUC-based evaluation |
| Concept drift | Dual-decay rolling baselines, change-point detection, probation periods for new patterns, shadow-mode retraining, human-verdict baseline correction |
| Explainability | Interpretable top-level fusion model (tree/linear) over deep-model outputs, SHAP attribution, natural-language rationale, evidence timeline, counterfactuals |
| Cold-start | Cohort/role priors with Bayesian blending toward entity-specific baseline, probationary elevated scrutiny, embedding-based transfer learning for sequence models |

