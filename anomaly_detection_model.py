import math
import random
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder

random.seed(42)
np.random.seed(42)

NUMERIC = [
    "time_sin", "time_cos", "is_weekend", "delta_time_sec",
    "dist_km", "geo_velocity_kmh", "session_duration", "cmd_seq_len"
]
CATEGORICAL = [
    "entity_type", "resource_accessed", "auth_method", "device_fingerprint"
]
FEATURES = NUMERIC + CATEGORICAL

def haversine(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def make_data(n=10000):
    locations = [
        (37.7749, -122.4194), (40.7128, -74.0060),
        (51.5074, -0.1278), (35.6762, 139.6503),
        (50.1109, 8.6821)
    ]
    resources = [
        "/api/v1/auth", "/api/v2/finance/payouts",
        "/admin/dashboard", "/db/production/query",
        "/public/index.html", "port:22/ssh",
        "/storage/backups/download"
    ]
    auth = ["password", "mfa_token", "certificate", "biometric"]
    devices = ["linux", "windows", "macos"]

    rows = []
    for _ in range(n):
        lat, lon = random.choice(locations)
        hour = int(np.clip(np.random.normal(14, 4), 0, 23))
        prev_lat, prev_lon = lat, lon
        if random.random() < 0.03:
            prev_lat, prev_lon = random.choice(locations)
        delta = max(1, float(np.random.exponential(900)))
        distance = haversine(prev_lat, prev_lon, lat, lon)

        rows.append({
            "time_sin": math.sin(2 * math.pi * hour / 24),
            "time_cos": math.cos(2 * math.pi * hour / 24),
            "is_weekend": int(random.randint(0, 6) >= 5),
            "delta_time_sec": delta,
            "dist_km": distance,
            "geo_velocity_kmh": distance / (delta / 3600),
            "session_duration": max(0.5, float(np.random.exponential(15))),
            "cmd_seq_len": random.randint(1, 5),
            "entity_type": random.choice(["user", "service_account", "edge_device"]),
            "resource_accessed": random.choice(resources[:5]),
            "auth_method": random.choice(auth),
            "device_fingerprint": random.choice(devices),
        })
    return pd.DataFrame(rows)

def build_model():
    data = make_data()

    preprocessor = ColumnTransformer([
        ("num", StandardScaler(), NUMERIC),
        ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL)
    ])

    detector = IsolationForest(
        n_estimators=200,
        contamination=0.03,
        random_state=42,
        n_jobs=-1
    )

    pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("detector", detector)
    ])

    pipeline.fit(data[FEATURES])

    artifact = {
        "model": pipeline,
        "features": FEATURES,
        "score": "negative score_samples; higher = more anomalous"
    }

    with open("anomaly_detection_model.pkl", "wb") as f:
        pickle.dump(artifact, f)

if __name__ == "__main__":
    build_model()
