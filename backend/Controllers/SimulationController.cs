using BackendApi.Models;
using BackendApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace BackendApi.Controllers;

[ApiController]
[Route("api")]
public class SimulationController : ControllerBase
{
    private readonly SimulationService _simulationService;

    public SimulationController(SimulationService simulationService)
    {
        _simulationService = simulationService;
    }

    [HttpGet("simulation/stream/status")]
    public ActionResult<SimulationStatusResponse> GetSimulationStatus()
    {
        return Ok(new SimulationStatusResponse
        {
            Active = _simulationService.IsActive,
            IntervalSeconds = _simulationService.IntervalSeconds,
            EventsGenerated = _simulationService.EventsGenerated
        });
    }

    [HttpPost("simulation/stream/start")]
    public IActionResult StartSimulationStream()
    {
        _simulationService.StartSimulation();
        return Ok(new
        {
            success = true,
            active = true,
            message = "Live attack & telemetry simulation stream started (3s interval)."
        });
    }

    [HttpPost("simulation/stream/stop")]
    public IActionResult StopSimulationStream()
    {
        _simulationService.StopSimulation();
        return Ok(new
        {
            success = true,
            active = false,
            message = "Live simulation stream paused for now."
        });
    }

    [HttpPost("simulate-attack")]
    public async Task<IActionResult> SimulateAttack([FromBody] SimulateRequest req)
    {
        var alert = await _simulationService.SimulateAttackAsync(req.EntityId, req.AttackType);
        return Ok(new
        {
            success = true,
            simulated_alert = alert
        });
    }
}
