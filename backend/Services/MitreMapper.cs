using BackendApi.Models;

namespace BackendApi.Services;

public static class MitreMapper
{
    private static readonly Dictionary<string, MitreInfo> Mapping = new(StringComparer.OrdinalIgnoreCase)
    {
        ["impossible_travel"] = new MitreInfo
        {
            TechniqueId = "T1078",
            Name = "Valid Accounts: Impossible Travel",
            Tactic = "Initial Access / Defense Evasion",
            Url = "https://attack.mitre.org/techniques/T1078/"
        },
        ["brute_force"] = new MitreInfo
        {
            TechniqueId = "T1110",
            Name = "Brute Force Password Spraying",
            Tactic = "Credential Access",
            Url = "https://attack.mitre.org/techniques/T1110/"
        },
        ["lateral_movement"] = new MitreInfo
        {
            TechniqueId = "T1021",
            Name = "Remote Services Lateral Movement",
            Tactic = "Lateral Movement",
            Url = "https://attack.mitre.org/techniques/T1021/"
        },
        ["ransomware_activity"] = new MitreInfo
        {
            TechniqueId = "T1486",
            Name = "Data Encrypted for Impact (Ransomware)",
            Tactic = "Impact",
            Url = "https://attack.mitre.org/techniques/T1486/"
        },
        ["c2_beaconing"] = new MitreInfo
        {
            TechniqueId = "T1071",
            Name = "Application Layer C2 Channel",
            Tactic = "Command and Control",
            Url = "https://attack.mitre.org/techniques/T1071/"
        },
        ["credential_stuffing"] = new MitreInfo
        {
            TechniqueId = "T1110.004",
            Name = "Credential Stuffing",
            Tactic = "Credential Access",
            Url = "https://attack.mitre.org/techniques/T1110/004/"
        },
        ["insider_drift"] = new MitreInfo
        {
            TechniqueId = "T1036",
            Name = "Masquerading & Behavioral Anomaly",
            Tactic = "Defense Evasion",
            Url = "https://attack.mitre.org/techniques/T1036/"
        },
        ["device_spoofing"] = new MitreInfo
        {
            TechniqueId = "T1036.005",
            Name = "Device Fingerprint Drift / Spoofing",
            Tactic = "Defense Evasion",
            Url = "https://attack.mitre.org/techniques/T1036/005/"
        },
        ["exfiltration_low_slow"] = new MitreInfo
        {
            TechniqueId = "T1041",
            Name = "Exfiltration Over C2 Channel",
            Tactic = "Exfiltration",
            Url = "https://attack.mitre.org/techniques/T1041/"
        },
        ["normal"] = new MitreInfo
        {
            TechniqueId = "T1078",
            Name = "Valid Accounts (Baseline)",
            Tactic = "Normal Baseline Operation",
            Url = "https://attack.mitre.org/techniques/T1078/"
        }
    };

    public static MitreInfo GetMitreInfo(string label)
    {
        if (string.IsNullOrWhiteSpace(label))
            return Mapping["normal"];

        string key = label.Trim().ToLowerInvariant();
        if (Mapping.TryGetValue(key, out var info))
            return info;

        return new MitreInfo
        {
            TechniqueId = "T1078",
            Name = $"Behavioral Anomaly: {label}",
            Tactic = "Uncategorized Threat Vector",
            Url = "https://attack.mitre.org/"
        };
    }
}
