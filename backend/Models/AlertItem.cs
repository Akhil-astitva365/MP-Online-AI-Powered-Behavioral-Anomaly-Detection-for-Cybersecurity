using System.Text.Json.Serialization;

namespace BackendApi.Models;

public class MitreInfo
{
    [JsonPropertyName("technique_id")]
    public string TechniqueId { get; set; } = "T1078";

    [JsonPropertyName("name")]
    public string Name { get; set; } = "Valid Accounts";

    [JsonPropertyName("tactic")]
    public string Tactic { get; set; } = "Defense Evasion / Initial Access";

    [JsonPropertyName("url")]
    public string Url { get; set; } = "https://attack.mitre.org/techniques/T1078/";
}

public class ShapFeature
{
    [JsonPropertyName("feature")]
    public string Feature { get; set; } = string.Empty;

    [JsonPropertyName("shap_value")]
    public double ShapValue { get; set; }

    [JsonPropertyName("abs_shap")]
    public double AbsShap { get; set; }
}

public class AlertItem
{
    [JsonPropertyName("event_id")]
    public string EventId { get; set; } = string.Empty;

    [JsonPropertyName("entity_id")]
    public string EntityId { get; set; } = string.Empty;

    [JsonPropertyName("entity_type")]
    public string EntityType { get; set; } = "user";

    [JsonPropertyName("department")]
    public string Department { get; set; } = "Engineering";

    [JsonPropertyName("timestamp")]
    public string Timestamp { get; set; } = DateTime.UtcNow.ToString("o");

    [JsonPropertyName("source_ip")]
    public string SourceIp { get; set; } = "192.168.1.1";

    [JsonPropertyName("location")]
    public string Location { get; set; } = "San Francisco, US";

    [JsonPropertyName("lat")]
    public double Lat { get; set; } = 37.7749;

    [JsonPropertyName("lon")]
    public double Lon { get; set; } = -122.4194;

    [JsonPropertyName("resource_accessed")]
    public string ResourceAccessed { get; set; } = "/api/v1/auth";

    [JsonPropertyName("auth_method")]
    public string AuthMethod { get; set; } = "password";

    [JsonPropertyName("session_duration")]
    public double SessionDuration { get; set; } = 10.0;

    [JsonPropertyName("geo_velocity_kmh")]
    public double GeoVelocityKmh { get; set; } = 0.0;

    [JsonPropertyName("device_fingerprint")]
    public string DeviceFingerprint { get; set; } = "OS: Windows 11";

    [JsonPropertyName("device_drift_score")]
    public double DeviceDriftScore { get; set; } = 0.0;

    [JsonPropertyName("failed_logins")]
    public int FailedLogins { get; set; } = 0;

    [JsonPropertyName("failed_mfa")]
    public int FailedMfa { get; set; } = 0;

    [JsonPropertyName("vpn_tor_risk_score")]
    public double VpnTorRiskScore { get; set; } = 5.0;

    [JsonPropertyName("actual_label")]
    public string ActualLabel { get; set; } = "normal";

    [JsonPropertyName("predicted_label")]
    public string PredictedLabel { get; set; } = "normal";

    [JsonPropertyName("threat_score")]
    public double ThreatScore { get; set; } = 0.05;

    [JsonPropertyName("risk_score")]
    public double RiskScore { get; set; } = 10.0;

    [JsonPropertyName("confidence")]
    public double Confidence { get; set; } = 0.95;

    [JsonPropertyName("severity")]
    public string Severity { get; set; } = "LOW";

    [JsonPropertyName("mitre")]
    public MitreInfo Mitre { get; set; } = new();

    [JsonPropertyName("top_shap_features")]
    public List<ShapFeature> TopShapFeatures { get; set; } = new();

    [JsonPropertyName("investigation_report")]
    public string InvestigationReport { get; set; } = "Baseline normal activity.";
}
