using BackendApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace BackendApi.Controllers;


[ApiController]
[Route("api/[controller]")]
public class AlertsController : ControllerBase
{
    
    private readonly AnomalyEngineService _engineService;

    
    public AlertsController(AnomalyEngineService engineService)
    {
        _engineService = engineService;
    }

    
    [HttpGet]
    public IActionResult GetAlerts(
        [FromQuery] string? vector = null,
        [FromQuery] string? severity = null,
        [FromQuery] string? search = null)
    {
    
        var alerts = _engineService.GetAlerts(vector, severity, search);
        
        return Ok(new
        {
            count = alerts.Count,
            alerts = alerts
        });
    }
}
