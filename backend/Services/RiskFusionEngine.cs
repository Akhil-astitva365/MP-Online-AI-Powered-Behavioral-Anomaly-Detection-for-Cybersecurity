namespace BackendApi.Services;

public static class RiskFusionEngine
{
    public static (double RiskScore, double Confidence, string Severity) FuseRisk(
        double sequenceSurprise = 0.1,
        double isolationScore = 0.1,
        double peerDeviation = 0.1,
        double graphLateralScore = 0.1,
        List<string>? ruleFlags = null,
        double threatScore = 0.05)
    {
        double wSeq = 0.25;
        double wIso = 0.25;
        double wPeer = 0.15;
        double wGraph = 0.20;
        double wThreat = 0.15;

        double baseRisk = (sequenceSurprise * wSeq) +
                          (isolationScore * wIso) +
                          (peerDeviation * wPeer) +
                          (graphLateralScore * wGraph) +
                          (threatScore * wThreat);

        int flagCount = ruleFlags?.Count ?? 0;
        double ruleMultiplier = 1.0 + (0.35 * flagCount);

        double compositeRisk = baseRisk * ruleMultiplier * 100.0;
        double riskScore = Math.Min(100.0, Math.Max(0.0, compositeRisk));

        double variance = Math.Abs(isolationScore - sequenceSurprise) + Math.Abs(threatScore - peerDeviation);
        double confidence = Math.Min(0.99, Math.Max(0.70, 1.0 - (variance * 0.2)));

        string severity;
        if (riskScore >= 80.0)
            severity = "CRITICAL";
        else if (riskScore >= 60.0)
            severity = "HIGH";
        else if (riskScore >= 30.0)
            severity = "LOW_MEDIUM";
        else
            severity = "INFORMATIONAL";

        return (Math.Round(riskScore, 2), Math.Round(confidence, 2), severity);
    }
}
