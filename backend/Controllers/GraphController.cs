using BackendApi.Models;
using Microsoft.AspNetCore.Mvc;

namespace BackendApi.Controllers;

[ApiController]
[Route("api/graph")]
public class GraphController : ControllerBase
{
    [HttpGet("topology")]
    public ActionResult<GraphTopology> GetGraphTopology()
    {
        var nodes = new List<GraphNode>
        {
            new GraphNode { Id = "user_john_doe", Label = "User: John Doe", Type = "user", Risk = "high" },
            new GraphNode { Id = "user_alice_smith", Label = "User: Alice Smith", Type = "user", Risk = "low" },
            new GraphNode { Id = "svc_prod_deployment", Label = "ServiceAcc: AWS Prod Deploy", Type = "user", Risk = "medium" },
            new GraphNode { Id = "host_macbook_john", Label = "Host: MacBook Pro 14", Type = "machine", Risk = "high" },
            new GraphNode { Id = "db_finance_payouts", Label = "Database: ERP Payouts", Type = "database", Risk = "critical" },
            new GraphNode { Id = "fs_shared_encrypt", Label = "FileShare: Shared Encrypt Target", Type = "database", Risk = "critical" }
        };

        var edges = new List<GraphEdge>
        {
            new GraphEdge { Source = "user_john_doe", Target = "host_macbook_john", Label = "MFA Auth", Weight = 5 },
            new GraphEdge { Source = "host_macbook_john", Target = "fs_shared_encrypt", Label = "Ransomware Encrypt", Weight = 1 },
            new GraphEdge { Source = "user_alice_smith", Target = "db_finance_payouts", Label = "Biometric Auth", Weight = 4 },
            new GraphEdge { Source = "svc_prod_deployment", Target = "db_finance_payouts", Label = "STS AssumeRole", Weight = 2 }
        };

        return Ok(new GraphTopology { Nodes = nodes, Edges = edges });
    }
}
