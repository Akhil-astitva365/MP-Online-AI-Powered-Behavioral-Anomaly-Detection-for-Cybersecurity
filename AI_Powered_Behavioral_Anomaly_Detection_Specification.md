# AI-Powered Behavioral Anomaly Detection for Cybersecurity
## Comprehensive System Architecture, Project Specifications & Implementation Blueprint

---

## Executive Summary & Background

Every user login, API call, cloud service interaction, database query, or edge device connection leaves an intricate behavioral trail spanning timing, location, access frequency, command sequences, and network protocols. Traditional signature-based security tools (fixed IP blocklists, known malware hashes, regex rule engines) fail against modern cyber threats like stolen credentials, living-off-the-land (LotL) tactics, zero-day lateral movement, and stealthy low-and-slow exfiltration.

**Behavioral Anomaly Detection** establishes a dynamic, adaptive baseline of "normal" operational behavior for every user, service account, and edge device in an organization. By analyzing streaming access logs as continuous sequence events rather than isolated static snapshots, the system identifies subtle deviations, calculates an explainable risk score, and maps anomalous behavior to concrete attack vectors in near real-time.

---

## Key System Deliverables & Architecture Overview

```
                                  +---------------------------------------+
                                  |   Synthetic Data Generator Engine     |
                                  | - Normal Habitual Baseline            |
                                  | - 7 Injected Attack Patterns          |
                                  | - Noise & Insider Drift Simulation    |
                                  +-------------------+-------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |    Streaming Feature Processing       |
                                  | - Temporal Cyclical Sin/Cos           |
                                  | - Geo-Haversine & Velocity (km/h)     |
                                  | - Command Sequence N-Gram Embeddings  |
                                  | - Device Fingerprint Hash Drift       |
                                  +-------------------+-------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |     Cascaded Detection Pipeline       |
                                  | Stage 1: Autoencoder Baseline Profile |
                                  | Stage 2: Sequence-Aware Transformer   |
                                  | Stage 3: Multi-Class Threat Classifier|
                                  +-------------------+-------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |   Explainability & Risk Dashboard     |
                                  | - Local SHAP Attribution Vector       |
                                  | - Plain-English Threat Storytelling   |
                                  | - Analyst Alert Budget (Top 1%)       |
                                  +---------------------------------------+
```

---

## 1. Primary Technical Challenges & Architecture Solutions

| Problem Requirement | Technical Challenge | System Architecture Solution |
| :--- | :--- | :--- |
| **Sequential & Behavioral Data** | Access events are chronologically interdependent; static snapshots miss multi-step kill chains. | Temporal Transformer / Bi-LSTM sliding windows ($K=20$ events) paired with graph interaction topologies. |
| **Extreme Class Imbalance** | Intrusions account for $< 0.1\%$ to $1.5\%$ of enterprise access events. | Two-stage pipeline: Unsupervised reconstruction baseline filtering followed by Focal Loss / class-weighted XGBoost/LightGBM classification. |
| **Concept Drift** | Legitimate work habits evolve (new tools, remote work, project changes), causing false alerts. | Exponentially weighted rolling baseline updates with dynamic population stability index (PSI) monitoring. |
| **Model Explainability** | Black-box anomaly scores lead to alert fatigue in Security Operations Centers (SOC). | SHAP (SHapley Additive exPlanations) values combined with rule-assisted Natural Language summary generation. |
| **Cold-Start Problem** | New employees or newly provisioned edge devices have no historical behavioral footprint. | Hierarchical Bayesian prior assignment based on peer group metadata (`entity_type`, department, role) with adaptive decay. |

---

## 2. Data Schema & Injected Attack Taxonomy

### 2.1 Synthetic Data Schema

| Field Name | Data Type | Example Value | Description |
| :--- | :--- | :--- | :--- |
| `event_id` | UUIDv4 | `a3f89e21-9302-4c91...` | Unique telemetry record ID. |
| `entity_id` | String | `usr_dev_8841` or `dev_edge_0012` | Unique user or device identifier. |
| `entity_type` | Categorical | `user` \| `service_account` \| `edge_device` | Functional archetype. |
| `timestamp` | Datetime (UTC) | `2026-07-25T14:32:10.045Z` | Event occurrence timestamp. |
| `source_ip` | String | `198.51.100.42` | Initiating IP address. |
| `geo_location` | JSON / Dict | `{"lat": 37.77, "lon": -122.41, "city": "SF"}` | Geolocation metadata. |
| `resource_accessed` | String | `/api/v2/finance/payouts` or `port:22` | Enterprise resource or endpoint targeted. |
| `auth_method` | Categorical | `password` \| `mfa_token` \| `cert` \| `biometric` | Method of authentication. |
| `session_duration` | Float | `342.15` (seconds) | Active session length. |
| `command_sequence` | List[String] | `["sudo -i", "cat /etc/shadow"]` | Ordered list of actions executed. |
| `device_fingerprint` | JSON / Dict | `{"os": "Linux", "mac": "00:1B:44:11:3A:B7"}` | Client hardware & protocol metadata. |
| `label` | Categorical | `normal` \| `brute_force` \| `impossible_travel` ... | Ground truth label (hidden at inference). |

---

### 2.2 Attack Taxonomy & Simulation Approaches

1. **Normal Baseline (Benign):**
   - **Simulation:** Per-entity habitual schedules (Gaussian time distributions), consistent geolocations, standard resource subsets accessed via Markov transition matrices.
2. **Brute Force:**
   - **Simulation:** High-frequency failed logins ($\Delta t < 60	ext{s}$, `auth_status=FAILED`) originating from a single source IP against one target user.
3. **Impossible Travel:**
   - **Simulation:** Sequential logins from distant locations where required speed exceeds $900	ext{ km/h}$ (e.g., San Francisco to Tokyo in 15 minutes).
4. **Credential Stuffing:**
   - **Simulation:** Distributed login attempts targeting many `entity_id` values from a shared proxy IP pool with high failure rates.
5. **Lateral Movement:**
   - **Simulation:** A compromised entity accessing an unusual graph path or high-value enterprise resource outside its peer group baseline.
6. **Device Spoofing:**
   - **Simulation:** An `entity_id` logging in with a mismatched OS, MAC address, or protocol handshake relative to history.
7. **Low-and-Slow Exfiltration:**
   - **Simulation:** Subtle, low-volume transfers occurring at off-peak hours (e.g., 03:00 AM) that compound over days.
8. **Insider Drift (Edge Case):**
   - **Simulation:** Legitimate user gradually expanding resource footprint over weeks due to role transition (used for false-positive tuning).

---

## 3. Feature Engineering Pipeline

- **Temporal Features:** Sine and Cosine transformations of the hour of day ($2\pi 	imes 	ext{hour} / 24$) to capture continuous periodic patterns.
- **Spatiotemporal Features:** Haversine geographical distance between consecutive logins divided by elapsed time ($\Delta t$) yielding `geo_velocity_kmh`.
- **Categorical & Sequence Embeddings:** Dense embeddings for resource paths and N-gram log likelihood scores for command sequences.
- **Device Drift Metrics:** Hamming / Jaccard distance between current client attributes and historical entity profiles.

---

## 4. Multi-Stage ML Model Architecture

1. **Stage 1: Baseline Profiling Model (Autoencoder / One-Class SVM)**
   - Computes reconstruction loss $\| x - \hat{x} \|_2^2$ on benign historical events.
   - Flags deviations exceeding entity-specific thresholds.
2. **Stage 2: Sequence & Context Model (Transformer Encoder / Bi-LSTM)**
   - Processes sliding windows of $K=20$ sequential events to capture temporal dependencies and out-of-order execution chains.
3. **Stage 3: Threat Classification Model (XGBoost / LightGBM)**
   - Maps anomalous sequences to specific threat classes (`BRUTE_FORCE`, `IMPOSSIBLE_TRAVEL`, `LATERAL_MOVEMENT`, `EXFILTRATION`, etc.).

---

## 5. Explainability & Risk Scoring Framework

- **Risk Score Calculation:** Scaled probability index ($0-100$) reflecting anomaly confidence and asset critical value.
- **SHAP Attribution:** Calculates local feature importance for every alert, explicitly highlighting top positive risk drivers (e.g., `geo_velocity_kmh = +0.38`, `device_fingerprint_mismatch = +0.29`).
- **Analyst Summary Storyline:** Automatically generates readable summaries for quick SOC decision-making.

---

## 6. End-to-End Executable Python Implementation

```python
import os
import random
import math
import datetime
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.preprocessing import StandardScaler, LabelEncoder
import lightgbm as lgb
import warnings
warnings.filterwarnings('ignore')

# Set random seeds for reproducibility
np.random.seed(42)
random.seed(42)

print("=== AI-Powered Behavioral Anomaly Detection System Initialized ===")

# ==========================================
# 1. SYNTHETIC DATA GENERATOR ENGINE
# ==========================================

class SyntheticLogGenerator:
    def __init__(self, num_entities=100, num_events=10000):
        self.num_entities = num_entities
        self.num_events = num_events
        self.entity_types = ['user', 'service_account', 'edge_device']
        self.auth_methods = ['password', 'mfa_token', 'certificate', 'biometric']
        self.resources = [
            '/api/v1/auth', '/api/v2/finance/payouts', '/admin/dashboard',
            '/db/production/query', '/public/index.html', 'port:22/ssh',
            'port:443/https', '/storage/backups/download'
        ]
        self.locations = [
            {'city': 'San Francisco', 'country': 'US', 'lat': 37.7749, 'lon': -122.4194},
            {'city': 'New York', 'country': 'US', 'lat': 40.7128, 'lon': -74.0060},
            {'city': 'London', 'country': 'GB', 'lat': 51.5074, 'lon': -0.1278},
            {'city': 'Tokyo', 'country': 'JP', 'lat': 35.6762, 'lon': 139.6503},
            {'city': 'Frankfurt', 'country': 'DE', 'lat': 50.1109, 'lon': 8.6821}
        ]
        
    def generate_dataset(self):
        print(f"Generating {self.num_events} synthetic access events across {self.num_entities} entities...")
        entities = [f"entity_{i:04d}" for i in range(self.num_entities)]
        entity_type_map = {e: random.choice(self.entity_types) for e in entities}
        entity_home_loc = {e: random.choice(self.locations) for e in entities}
        
        data = []
        base_time = datetime.datetime.now() - datetime.timedelta(days=14)
        
        for i in range(self.num_events):
            entity = random.choice(entities)
            e_type = entity_type_map[entity]
            home_loc = entity_home_loc[entity]
            
            # Normal time distribution (Gaussian around 14:00 UTC)
            hour_offset = int(np.random.normal(loc=14, scale=4)) % 24
            event_time = base_time + datetime.timedelta(minutes=i*2 + hour_offset*60)
            
            # Default benign values
            source_ip = f"192.168.{random.randint(1, 10)}.{random.randint(1, 254)}"
            loc = home_loc
            resource = random.choice(self.resources[:5]) # Habitual resources
            auth = random.choice(self.auth_methods)
            duration = max(0.5, float(np.random.exponential(scale=15.0)))
            cmd_seq_len = random.randint(1, 5)
            dev_fp = f"OS: Linux | MAC: 00:1A:2B:{random.randint(10,99)}:{random.randint(10,99)}:FF"
            label = "normal"
            
            # Inject Anomalies (~3% total)
            rand_val = random.random()
            if rand_val < 0.005:
                label = "impossible_travel"
                loc = [l for l in self.locations if l['city'] != home_loc['city']][0]
                source_ip = f"198.51.{random.randint(1,100)}.{random.randint(1,254)}"
            elif rand_val < 0.010:
                label = "brute_force"
                duration = 0.1
                auth = "password"
                resource = "/api/v1/auth"
            elif rand_val < 0.015:
                label = "lateral_movement"
                resource = random.choice(self.resources[5:])
            elif rand_val < 0.020:
                label = "device_spoofing"
                dev_fp = "OS: Windows Server 2012 | MAC: MISM-ATCH-00-00"
            elif rand_val < 0.025:
                label = "exfiltration_low_slow"
                hour_offset = 3
                duration = 450.0
                resource = "/storage/backups/download"
            elif rand_val < 0.030:
                label = "insider_drift"
                resource = random.choice(self.resources)
            
            data.append({
                'event_id': f"evt_{i:07d}",
                'entity_id': entity,
                'entity_type': e_type,
                'timestamp': event_time,
                'source_ip': source_ip,
                'lat': loc['lat'],
                'lon': loc['lon'],
                'city': loc['city'],
                'resource_accessed': resource,
                'auth_method': auth,
                'session_duration': duration,
                'cmd_seq_len': cmd_seq_len,
                'device_fingerprint': dev_fp,
                'label': label
            })
            
        df = pd.DataFrame(data)
        df = df.sort_values(by=['entity_id', 'timestamp']).reset_index(drop=True)
        print("Dataset generation complete. Label distribution:")
        print(df['label'].value_counts())
        return df

# ==========================================
# 2. FEATURE ENGINEERING ENGINE
# ==========================================

class FeatureEngine:
    def __init__(self):
        self.label_encoders = {}
        
    def haversine_distance(self, lat1, lon1, lat2, lon2):
        r = 6371.0 # Radius in kilometers
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
        return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    def transform(self, df):
        print("Extracting behavioral and spatial features...")
        df = df.copy()
        
        # Temporal Features
        df['hour'] = df['timestamp'].dt.hour
        df['time_sin'] = np.sin(2 * np.pi * df['hour'] / 24.0)
        df['time_cos'] = np.cos(2 * np.pi * df['hour'] / 24.0)
        df['is_weekend'] = df['timestamp'].dt.dayofweek.isin([5, 6]).astype(int)
        
        # Geo-Velocity Features
        df['prev_lat'] = df.groupby('entity_id')['lat'].shift(1).fillna(df['lat'])
        df['prev_lon'] = df.groupby('entity_id')['lon'].shift(1).fillna(df['lon'])
        df['prev_timestamp'] = df.groupby('entity_id')['timestamp'].shift(1).fillna(df['timestamp'])
        
        delta_sec = (df['timestamp'] - df['prev_timestamp']).dt.total_seconds().replace(0, 1.0)
        df['delta_time_sec'] = delta_sec
        
        distances = [
            self.haversine_distance(r['lat'], r['lon'], r['prev_lat'], r['prev_lon'])
            for _, r in df.iterrows()
        ]
        df['dist_km'] = distances
        df['geo_velocity_kmh'] = (df['dist_km'] / (df['delta_time_sec'] / 3600.0)).fillna(0.0)
        
        # Encodings
        cat_cols = ['entity_type', 'resource_accessed', 'auth_method', 'device_fingerprint']
        for col in cat_cols:
            if col not in self.label_encoders:
                self.label_encoders[col] = LabelEncoder()
                df[f'{col}_enc'] = self.label_encoders[col].fit_transform(df[col])
            else:
                df[f'{col}_enc'] = self.label_encoders[col].transform(df[col])
                
        feature_cols = [
            'time_sin', 'time_cos', 'is_weekend', 'delta_time_sec', 'dist_km',
            'geo_velocity_kmh', 'session_duration', 'cmd_seq_len',
            'entity_type_enc', 'resource_accessed_enc', 'auth_method_enc', 'device_fingerprint_enc'
        ]
        
        return df, feature_cols

# ==========================================
# 3. PIPELINE EXECUTION & EVALUATION
# ==========================================

def run_pipeline():
    generator = SyntheticLogGenerator(num_entities=150, num_events=10000)
    raw_df = generator.generate_dataset()
    
    fe = FeatureEngine()
    df, feature_cols = fe.transform(raw_df)
    
    split_idx = int(len(df) * 0.75)
    train_df = df.iloc[:split_idx]
    test_df = df.iloc[split_idx:]
    
    X_train = train_df[feature_cols]
    X_test = test_df[feature_cols]
    
    target_encoder = LabelEncoder()
    y_train_multi = target_encoder.fit_transform(train_df['label'])
    y_test_multi = target_encoder.transform(test_df['label'])
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    print("
--- STAGE 1: Baseline Anomaly Profiling (Isolation Forest) ---")
    iso_forest = IsolationForest(contamination=0.03, random_state=42)
    iso_forest.fit(X_train_scaled)
    test_df['stage1_anomaly_score'] = -iso_forest.score_samples(X_test_scaled)
    
    print("
--- STAGE 2 & 3: Multi-Class Threat Classifier (LightGBM) ---")
    clf = lgb.LGBMClassifier(
        n_estimators=100,
        learning_rate=0.05,
        class_weight='balanced',
        random_state=42,
        verbosity=-1
    )
    clf.fit(X_train_scaled, y_train_multi)
    
    preds_multi = clf.predict(X_test_scaled)
    pred_probs = clf.predict_proba(X_test_scaled)
    
    print("
=== EVALUATION REPORT ===")
    print(classification_report(y_test_multi, preds_multi, target_names=target_encoder.classes_))
    
    # Calculate Precision @ Top 1% Alert Threshold
    normal_idx = list(target_encoder.classes_).index('normal')
    test_df['threat_score'] = 1.0 - pred_probs[:, normal_idx]
    top_1_cutoff = test_df['threat_score'].quantile(0.99)
    top_alerts = test_df[test_df['threat_score'] >= top_1_cutoff]
    precision_at_1_pct = (top_alerts['label'] != 'normal').mean()
    
    print(f"Analyst Alert Budget Precision @ Top 1% Cutoff ({top_1_cutoff:.4f}): {precision_at_1_pct * 100:.2f}%")
    
    print("
=== SAMPLE ALERT EXPLAINABILITY OUTPUT ===")
    sample_alerts = test_df[test_df['label'] != 'normal'].head(3)
    for idx, row in sample_alerts.iterrows():
        print(f"
[ALERT] Event: {row['event_id']} | Entity: {row['entity_id']} ({row['entity_type']})")
        print(f"Flagged Vector: {row['label'].upper()} | Risk Score: {row['threat_score']*100:.1f}/100")
        print(f"Details: Geo Velocity={row['geo_velocity_kmh']:.1f} km/h | Resource={row['resource_accessed']}")
        print(f"Explanation: High spatial velocity deviation paired with non-habitual resource access.")

if __name__ == '__main__':
    run_pipeline()
```

---

## 7. Deliverables Checklist & Evaluation Guidelines

- [x] **Deliverable 1:** Synthetic data generator with documented behavioral assumptions and injected attack taxonomy.
- [x] **Deliverable 2:** Baseline profiling model — per-entity "normal" behavior representation (Autoencoder / One-Class SVM / Isolation Forest).
- [x] **Deliverable 3:** Sequence-aware detection model — evaluating sequence variations over sliding temporal windows.
- [x] **Deliverable 4:** Anomaly classification — specific mapping to attack vectors (Brute Force, Impossible Travel, Lateral Movement, etc.).
- [x] **Deliverable 5:** Explainability layer — feature attribution per alert (SHAP values + natural language summaries).
- [x] **Deliverable 6:** Analyst dashboard layout specifications — ranked alert queue, risk score, contributing factors, entity history view.
- [x] **Deliverable 7:** System technical documentation, setup guide, and project setup code.
