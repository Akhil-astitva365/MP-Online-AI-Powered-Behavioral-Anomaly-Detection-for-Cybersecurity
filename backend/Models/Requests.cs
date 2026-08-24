using System.Text.Json.Serialization;

namespace BackendApi.Models;

public class FeedbackRequest
{
    [JsonPropertyName("event_id")]
    public string EventId { get; set; } = string.Empty;

    [JsonPropertyName("entity_id")]
    public string EntityId { get; set; } = string.Empty;

    [JsonPropertyName("predicted_label")]
    public string PredictedLabel { get; set; } = string.Empty;

    [JsonPropertyName("feedback_status")]
    public string FeedbackStatus { get; set; } = string.Empty;

    [JsonPropertyName("analyst_notes")]
    public string AnalystNotes { get; set; } = string.Empty;
}

public class RemediationActionRequest
{
    [JsonPropertyName("action_type")]
    public string ActionType { get; set; } = string.Empty;

    [JsonPropertyName("entity_id")]
    public string EntityId { get; set; } = string.Empty;

    [JsonPropertyName("event_id")]
    public string? EventId { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; } = string.Empty;
}

public class SimulateRequest
{
    [JsonPropertyName("entity_id")]
    public string EntityId { get; set; } = string.Empty;

    [JsonPropertyName("attack_type")]
    public string AttackType { get; set; } = string.Empty;
}

public class StatusResponse
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = "online";

    [JsonPropertyName("mode")]
    public string Mode { get; set; } = "REAL_PRODUCTION_DATA";

    [JsonPropertyName("system_name")]
    public string SystemName { get; set; } = "SentinelAI Behavioral Anomaly Engine (ASP.NET Core)";

    [JsonPropertyName("version")]
    public string Version { get; set; } = "2.4.0";

    [JsonPropertyName("total_events_processed")]
    public int TotalEventsProcessed { get; set; } = 15000;

    [JsonPropertyName("real_events_ingested")]
    public int RealEventsIngested { get; set; } = 0;

    [JsonPropertyName("top_1_cutoff")]
    public double Top1Cutoff { get; set; } = 0.99;

    [JsonPropertyName("precision_at_1_pct")]
    public double PrecisionAt1Pct { get; set; } = 1.0;

    [JsonPropertyName("psi_drift_score")]
    public double PsiDriftScore { get; set; } = 0.0179;

    [JsonPropertyName("total_alerts_queued")]
    public int TotalAlertsQueued { get; set; } = 0;

    [JsonPropertyName("feedback")]
    public object Feedback { get; set; } = new();
}

public class SimulationStatusResponse
{
    [JsonPropertyName("active")]
    public bool Active { get; set; }

    [JsonPropertyName("interval_seconds")]
    public int IntervalSeconds { get; set; } = 3;

    [JsonPropertyName("events_generated")]
    public int EventsGenerated { get; set; } = 0;
}
