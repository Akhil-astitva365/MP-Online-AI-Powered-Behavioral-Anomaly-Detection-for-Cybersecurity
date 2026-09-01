import pickle
import pandas as pd

with open("anomaly_detection_model.pkl", "rb") as f:
    artifact = pickle.load(f)

event = pd.DataFrame([{
    "time_sin": 0.71,
    "time_cos": 0.71,
    "is_weekend": 0,
    "delta_time_sec": 120,
    "dist_km": 9000,
    "geo_velocity_kmh": 1200,
    "session_duration": 450,
    "cmd_seq_len": 20,
    "entity_type": "user",
    "resource_accessed": "/storage/backups/download",
    "auth_method": "password",
    "device_fingerprint": "linux"
}])

score = -artifact["model"].score_samples(event[artifact["features"]])[0]
prediction = int(artifact["model"].predict(event[artifact["features"]])[0] == -1)

print("Anomaly score:", round(float(score), 4))
print("Anomalous:", prediction)
