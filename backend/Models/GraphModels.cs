using System.Text.Json.Serialization;

namespace BackendApi.Models;

public class GraphNode
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = "user";

    [JsonPropertyName("risk")]
    public string Risk { get; set; } = "low";
}

public class GraphEdge
{
    [JsonPropertyName("source")]
    public string Source { get; set; } = string.Empty;

    [JsonPropertyName("target")]
    public string Target { get; set; } = string.Empty;

    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("weight")]
    public int Weight { get; set; } = 1;
}

public class GraphTopology
{
    [JsonPropertyName("nodes")]
    public List<GraphNode> Nodes { get; set; } = new();

    [JsonPropertyName("edges")]
    public List<GraphEdge> Edges { get; set; } = new();
}
