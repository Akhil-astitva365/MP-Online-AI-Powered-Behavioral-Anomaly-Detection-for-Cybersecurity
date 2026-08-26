using BackendApi.Models;

namespace BackendApi.Services;

public class SimulationService : IHostedService, IDisposable
{
    private readonly LogStreamerService _streamerService;
    private readonly ILogger<SimulationService> _logger;
    private readonly Random _random = new();
    private CancellationTokenSource? _cts;
    private Task? _executingTask;

    public bool IsActive { get; private set; } = false;
    public int IntervalSeconds { get; private set; } = 3;
    public int EventsGenerated { get; private set; } = 0;

    public SimulationService(LogStreamerService streamerService, ILogger<SimulationService> logger)
    {
        _streamerService = streamerService;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        StopSimulation();
        return Task.CompletedTask;
    }

    public bool StartSimulation()
    {
        if (IsActive) return true;

        IsActive = true;
        _cts = new CancellationTokenSource();
        _executingTask = RunSimulationLoopAsync(_cts.Token);
        _logger.LogInformation("Simulation loop started.");
        return true;
    }

    public bool StopSimulation()
    {
        IsActive = false;
        if (_cts != null)
        {
            _cts.Cancel();
            _cts.Dispose();
            _cts = null;
        }
        _logger.LogInformation("Simulation loop stopped.");
        return true;
    }

    private async Task RunSimulationLoopAsync(CancellationToken ct)
    {
        while (IsActive && !ct.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(IntervalSeconds), ct);
                if (!IsActive || ct.IsCancellationRequested) break;

                var evt = GenerateRandomSimEvent();
                EventsGenerated++;
                await _streamerService.ProcessEventBatchAsync(new[] { evt });
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in simulation loop iteration");
                await Task.Delay(2000, ct);
            }
        }
    }

    public async Task<AlertItem?> SimulateAttackAsync(string entityId, string attackType)
    {
        var evt = GenerateSimEvent(entityId, attackType);
        EventsGenerated++;
        var alerts = await _streamerService.ProcessEventBatchAsync(new[] { evt });
        return alerts.FirstOrDefault();
    }

    private Dictionary<string, object?> GenerateRandomSimEvent()
    {
        string[] attackTypes = { "normal", "impossible_travel", "brute_force", "lateral_movement", "ransomware_activity", "c2_beaconing", "credential_stuffing", "insider_drift", "device_spoofing" };
        string atype = attackTypes[_random.Next(attackTypes.Length)];
        string eid = $"user_sim_{_random.Next(100, 999)}";
        return GenerateSimEvent(eid, atype);
    }

    private Dictionary<string, object?> GenerateSimEvent(string entityId, string attackType)
    {
        string atype = attackType.ToLowerInvariant();
        string country = atype == "impossible_travel" ? "JP" : (_random.Next(2) == 0 ? "US" : "DE");
        string city = country switch
        {
            "JP" => "Tokyo",
            "DE" => "Berlin",
            _ => "San Francisco"
        };

        string resource = atype switch
        {
            "impossible_travel" => "/api/v1/auth",
            "brute_force" => "/api/v1/login",
            "lateral_movement" => "/db/finance/payouts",
            "ransomware_activity" => "/fs/shared/encrypt_all",
            "c2_beaconing" => "/external/c2/beacon",
            "credential_stuffing" => "/api/v1/mfa",
            "insider_drift" => "/storage/backups/download",
            "device_spoofing" => "/auth/sso",
            _ => "/public/dashboard"
        };

        string etype = "user";
        string dept = "Engineering";
        if (_random.Next(3) == 1)
        {
            etype = "service_account";
            dept = "Automated Infrastructure";
        }

        return new Dictionary<string, object?>
        {
            ["event_id"] = $"evt_sim_{Guid.NewGuid().ToString("N")[..8]}",
            ["entity_id"] = string.IsNullOrWhiteSpace(entityId) ? $"user_sim_{_random.Next(100, 999)}" : entityId,
            ["entity_type"] = etype,
            ["department"] = dept,
            ["timestamp"] = DateTime.UtcNow.ToString("o"),
            ["source_ip"] = $"198.51.{_random.Next(1, 100)}.{_random.Next(1, 254)}",
            ["city"] = city,
            ["country"] = country,
            ["lat"] = country == "JP" ? 35.6762 : (country == "DE" ? 52.5200 : 37.7749),
            ["lon"] = country == "JP" ? 139.6503 : (country == "DE" ? 13.4050 : -122.4194),
            ["resource_accessed"] = resource,
            ["auth_method"] = etype == "service_account" ? "certificate" : "password",
            ["session_duration"] = atype == "ransomware_activity" ? 340.0 : 15.0,
            ["failed_logins"] = atype == "brute_force" ? 28 : 0,
            ["failed_mfa"] = atype == "credential_stuffing" ? 4 : 0,
            ["asn_score"] = atype == "c2_beaconing" ? 95.0 : 10.0,
            ["device_fingerprint"] = atype == "device_spoofing" ? "OS: Unknown Linux | Fingerprint Drift 0.85" : "OS: Windows 11",
            ["label"] = atype
        };
    }

    public void Dispose()
    {
        StopSimulation();
    }
}
