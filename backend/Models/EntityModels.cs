using System.Text.Json.Serialization;

namespace BackendApi.Models;

public class EntitySummary
{
    [JsonPropertyName("entity_id")]
    public string EntityId { get; set; } = string.Empty;

    [JsonPropertyName("entity_type")]
    public string EntityType { get; set; } = "user";

    [JsonPropertyName("auth_method")]
    public string AuthMethod { get; set; } = "password";

    [JsonPropertyName("primary_vector")]
    public string PrimaryVector { get; set; } = "normal";

    [JsonPropertyName("max_risk_score")]
    public double MaxRiskScore { get; set; } = 0.0;

    [JsonPropertyName("status")]
    public string? Status { get; set; }
}

public class EntityHistoryResponse
{
    [JsonPropertyName("entity_id")]
    public string EntityId { get; set; } = string.Empty;

    [JsonPropertyName("department")]
    public string Department { get; set; } = "Engineering";

    [JsonPropertyName("max_risk_score")]
    public double MaxRiskScore { get; set; } = 0.0;

    [JsonPropertyName("source_ip")]
    public string SourceIp { get; set; } = "192.168.1.42";

    [JsonPropertyName("location")]
    public string Location { get; set; } = "San Francisco, US";

    [JsonPropertyName("device_fingerprint")]
    public string DeviceFingerprint { get; set; } = "OS: Windows 11 | Chrome 124";

    [JsonPropertyName("history")]
    public List<AlertItem> History { get; set; } = new();
}
