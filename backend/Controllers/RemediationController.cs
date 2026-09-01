using BackendApi.Models;
using BackendApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace BackendApi.Controllers;

[ApiController]
[Route("api/remediation")]
public class RemediationController : ControllerBase
{
    private readonly AnomalyEngineService _engineService;

    public RemediationController(AnomalyEngineService engineService)
    {
        _engineService = engineService;
    }

    [HttpPost("action")]
    public IActionResult ExecuteAction([FromBody] RemediationActionRequest req)
    {
        _engineService.ExecuteRemediation(req.EntityId, req.ActionType);
        return Ok(new
        {
            success = true,
            message = $"Remediation action are '{req.ActionType}' successfully executed for user '{req.EntityId}'. Entity risk reset to 0.",
            entity_id = req.EntityId,
            action_type = req.ActionType
        });
    }
}
