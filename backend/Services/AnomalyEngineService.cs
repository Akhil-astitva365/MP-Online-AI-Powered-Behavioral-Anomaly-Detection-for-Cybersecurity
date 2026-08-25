using System.Collections.Concurrent;
using System.Text.Json;
using BackendApi.Models;

namespace BackendApi.Services;

public class AnomalyEngineService
{
    private readonly ConcurrentBag<AlertItem> _alerts = new();
    private readonly ConcurrentDictionary<string, List<Dictionary<string, object>>> _feedbackMap = new();
    private readonly ILogger<AnomalyEngineService> _logger;
    private int _feedbackCount = 0;

    public AnomalyEngineService(ILogger<AnomalyEngineService> logger)
    {
        _logger = logger;
        InitializeSeedAlerts();
    }

    private void InitializeSeedAlerts()
    {
        try
        {
            var dataDir = Path.Combine(Directory.GetCurrentDirectory(), "..", "data");
            var realLogsPath = Path.Combine(dataDir, "real_enterprise_logs.json");

            if (File.Exists(realLogsPath))
            {
                _logger.LogInformation("Loading seed alerts from {Path}...", realLogsPath);
                var jsonText = File.ReadAllText(realLogsPath);
                using var doc = JsonDocument.Parse(jsonText);

                if (doc.RootElement.ValueKind == JsonValueKind.Array)
                {
                    int index = 0;
                    foreach (var item in doc.RootElement.EnumerateArray())
                    {
                        index++;
                        var entityId = item.TryGetProperty("entity_id", out var eid) ? eid.GetString() ?? $"user_{index}" : $"user_{index}";
                        var eventId = item.TryGetProperty("event_id", out var evId) ? evId.GetString() ?? $"evt_{index}" : $"evt_{index}";
                        var label = item.TryGetProperty("label", out var lbl) ? lbl.GetString() ?? "normal" : "normal";
                        var resource = item.TryGetProperty("resource_accessed", out var res) ? res.GetString() ?? "/api/v1/auth" : "/api/v1/auth";
                        var ip = item.TryGetProperty("source_ip", out var ipProp) ? ipProp.GetString() ?? "192.168.1.1" : "192.168.1.1";
                        var city = item.TryGetProperty("city", out var cProp) ? cProp.GetString() ?? "San Francisco" : "San Francisco";
                        var country = item.TryGetProperty("country", out var cntProp) ? cntProp.GetString() ?? "US" : "US";

                        var isThreat = label != "normal";
                        double threatScore = isThreat ? 0.88 : 0.04;
                        double seqSurp = isThreat ? 0.85 : 0.05;
                        double isoScore = isThreat ? 0.90 : 0.05;
                        double graphScore = label == "lateral_movement" || label == "ransomware_activity" ? 0.92 : 0.08;

                        var (riskScore, confidence, severity) = RiskFusionEngine.FuseRisk(
                            sequenceSurprise: seqSurp,
                            isolationScore: isoScore,
                            peerDeviation: 0.1,
                            graphLateralScore: graphScore,
                            threatScore: threatScore
                        );

                        var alert = new AlertItem
                        {
                            EventId = eventId,
                            EntityId = entityId,
                            EntityType = entityId.StartsWith("svc_") ? "service_account" : (entityId.StartsWith("edge_") ? "edge_device" : "user"),
                            Department = "Engineering",
                            Timestamp = DateTime.UtcNow.AddMinutes(-index * 15).ToString("o"),
                            SourceIp = ip,
                            Location = $"{city}, {country}",
                            ResourceAccessed = resource,
                            AuthMethod = "password",
                            ActualLabel = label,
                            PredictedLabel = label,
                            ThreatScore = threatScore,
                            RiskScore = riskScore,
                            Confidence = confidence,
                            Severity = severity,
                            Mitre = MitreMapper.GetMitreInfo(label),
                            InvestigationReport = isThreat
                                ? $"CRITICAL ALERT: Detected behavioral anomaly '{label}' on resource {resource}."
                                : "Baseline normal user activity."
                        };

                        _alerts.Add(alert);
                    }
                }
            }

            if (_alerts.IsEmpty)
            {
                // Fallback default alerts
                _alerts.Add(new AlertItem
                {
                    EventId = "evt_001",
                    EntityId = "user_john_doe",
                    EntityType = "user",
                    Department = "Engineering",
                    Timestamp = DateTime.UtcNow.ToString("o"),
                    SourceIp = "198.51.100.88",
                    Location = "Tokyo, JP",
                    ResourceAccessed = "/storage/backups/download",
                    AuthMethod = "session_token",
                    FailedLogins = 18,
                    FailedMfa = 3,
                    GeoVelocityKmh = 1240.8,
                    DeviceFingerprint = "OS: Linux x86_64 | Fingerprint Drift 0.92",
                    ActualLabel = "exfiltration_low_slow",
                    PredictedLabel = "exfiltration_low_slow",
                    ThreatScore = 0.96,
                    RiskScore = 94.5,
                    Confidence = 0.98,
                    Severity = "CRITICAL",
                    Mitre = MitreMapper.GetMitreInfo("exfiltration_low_slow"),
                    InvestigationReport = "HIGH RISK CRITICAL: User executed command sequence resulting in large data exfiltration."
                });

                _alerts.Add(new AlertItem
                {
                    EventId = "evt_002",
                    EntityId = "user_alice_smith",
                    EntityType = "user",
                    Department = "Finance",
                    Timestamp = DateTime.UtcNow.AddMinutes(-30).ToString("o"),
                    SourceIp = "192.168.1.42",
                    Location = "San Francisco, US",
                    ResourceAccessed = "/api/v1/auth",
                    AuthMethod = "biometric",
                    ActualLabel = "normal",
                    PredictedLabel = "normal",
                    ThreatScore = 0.02,
                    RiskScore = 12.0,
                    Confidence = 0.99,
                    Severity = "LOW",
                    Mitre = MitreMapper.GetMitreInfo("normal"),
                    InvestigationReport = "User performed normal baseline authentication."
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error initializing seed alerts");
        }
    }

    public List<AlertItem> GetAlerts(string? vector = null, string? severity = null, string? search = null)
    {
        IEnumerable<AlertItem> filtered = _alerts;

        if (!string.IsNullOrWhiteSpace(vector) && !vector.Equals("ALL", StringComparison.OrdinalIgnoreCase))
        {
            filtered = filtered.Where(a =>
                a.PredictedLabel.Equals(vector, StringComparison.OrdinalIgnoreCase) ||
                a.ActualLabel.Equals(vector, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(severity) && !severity.Equals("ALL", StringComparison.OrdinalIgnoreCase))
        {
            filtered = filtered.Where(a => a.Severity.Equals(severity, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            filtered = filtered.Where(a =>
                a.EntityId.ToLower().Contains(s) ||
                a.EventId.ToLower().Contains(s) ||
                a.Location.ToLower().Contains(s));
        }

        return filtered.OrderByDescending(a => a.Timestamp).ToList();
    }

    public void AddAlert(AlertItem alert)
    {
        _alerts.Add(alert);
    }

    public void AddAlerts(IEnumerable<AlertItem> alerts)
    {
        foreach (var a in alerts)
        {
            _alerts.Add(a);
        }
    }

    public List<EntitySummary> GetEntities()
    {
        var alerts = _alerts.ToList();
        var entityMap = new Dictionary<string, EntitySummary>(StringComparer.OrdinalIgnoreCase);

        foreach (var a in alerts)
        {
            var eid = string.IsNullOrWhiteSpace(a.EntityId) ? "user_john_doe" : a.EntityId;
            var etype = a.EntityType;
            var amethod = a.AuthMethod;
            var risk = a.RiskScore;

            if (!entityMap.TryGetValue(eid, out var summary))
            {
                entityMap[eid] = new EntitySummary
                {
                    EntityId = eid,
                    EntityType = etype,
                    AuthMethod = amethod,
                    PrimaryVector = a.PredictedLabel,
                    MaxRiskScore = risk,
                    Status = null
                };
            }
            else
            {
                if (risk > summary.MaxRiskScore)
                {
                    summary.MaxRiskScore = risk;
                    summary.PrimaryVector = a.PredictedLabel;
                }
            }
        }

        return entityMap.Values.ToList();
    }

    public EntityHistoryResponse GetEntityHistory(string entityId)
    {
        var allAlerts = _alerts.Where(a => a.EntityId.Equals(entityId, StringComparison.OrdinalIgnoreCase)).ToList();

        if (allAlerts.Count == 0)
        {
            var defaultHistory = new List<AlertItem>
            {
                new AlertItem
                {
                    EventId = $"evt_{entityId}_1",
                    EntityId = entityId,
                    Department = "Engineering",
                    Timestamp = "2026-07-26T08:00:00",
                    ResourceAccessed = "/api/v1/auth",
                    AuthMethod = "password",
                    DeviceFingerprint = "OS: Windows 11 | Chrome 124",
                    PredictedLabel = "normal",
                    ThreatScore = 0.02,
                    RiskScore = 15.0,
                    Severity = "LOW",
                    Location = "San Francisco, US",
                    SourceIp = "192.168.1.42",
                    Mitre = MitreMapper.GetMitreInfo("normal"),
                    InvestigationReport = "User performed normal baseline authentication."
                },
                new AlertItem
                {
                    EventId = $"evt_{entityId}_2",
                    EntityId = entityId,
                    Department = "Engineering",
                    Timestamp = "2026-07-26T12:30:00",
                    ResourceAccessed = "/storage/backups/download",
                    AuthMethod = "session_token",
                    FailedLogins = 18,
                    FailedMfa = 3,
                    GeoVelocityKmh = 1240.8,
                    DeviceFingerprint = "OS: Linux x86_64 | Fingerprint Drift 0.92",
                    PredictedLabel = "exfiltration_low_slow",
                    ThreatScore = 0.96,
                    RiskScore = 94.5,
                    Severity = "CRITICAL",
                    Location = "Tokyo, JP",
                    SourceIp = "198.51.100.88",
                    Mitre = MitreMapper.GetMitreInfo("exfiltration_low_slow"),
                    InvestigationReport = "HIGH RISK CRITICAL: User executed 45 command sequences resulting in large data transfer."
                }
            };

            return new EntityHistoryResponse
            {
                EntityId = entityId,
                Department = "Engineering",
                MaxRiskScore = 94.5,
                SourceIp = "198.51.100.88",
                Location = "Tokyo, JP",
                DeviceFingerprint = "OS: Linux x86_64 | Fingerprint Drift 0.92",
                History = defaultHistory
            };
        }

        double maxRisk = allAlerts.Max(a => a.RiskScore);
        var latest = allAlerts.OrderByDescending(a => a.Timestamp).First();

        return new EntityHistoryResponse
        {
            EntityId = entityId,
            Department = latest.Department,
            MaxRiskScore = maxRisk,
            SourceIp = latest.SourceIp,
            Location = latest.Location,
            DeviceFingerprint = latest.DeviceFingerprint,
            History = allAlerts.OrderByDescending(a => a.Timestamp).ToList()
        };
    }

    public void ExecuteRemediation(string entityId, string actionType)
    {
        foreach (var alert in _alerts)
        {
            if (alert.EntityId.Equals(entityId, StringComparison.OrdinalIgnoreCase))
            {
                alert.RiskScore = 0.0;
                alert.ThreatScore = 0.0;
                alert.Severity = "LOW";
                alert.PredictedLabel = "normal";
                alert.InvestigationReport = $"REMEDIATED: Action '{actionType}' executed by SOC analyst.";
            }
        }
    }

    public Dictionary<string, object> SaveFeedback(FeedbackRequest req)
    {
        Interlocked.Increment(ref _feedbackCount);
        var entry = new Dictionary<string, object>
        {
            ["event_id"] = req.EventId,
            ["entity_id"] = req.EntityId,
            ["predicted_label"] = req.PredictedLabel,
            ["feedback_status"] = req.FeedbackStatus,
            ["analyst_notes"] = req.AnalystNotes,
            ["timestamp"] = DateTime.UtcNow.ToString("o")
        };

        _feedbackMap.AddOrUpdate(req.EntityId,
            _ => new List<Dictionary<string, object>> { entry },
            (_, list) => { list.Add(entry); return list; });

        return entry;
    }

    public object GetFeedbackSummary()
    {
        return new
        {
            total_feedback_submitted = _feedbackCount,
            unique_entities_annotated = _feedbackMap.Count
        };
    }

    public int GetTotalAlertsCount() => _alerts.Count;
}
