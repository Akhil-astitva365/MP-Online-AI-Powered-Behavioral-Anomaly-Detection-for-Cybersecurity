using BackendApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace BackendApi.Controllers;

/// <summary>
/// Controller responsible for handling API requests related to system alerts and anomalies.
/// Routes to /api/Alerts
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AlertsController : ControllerBase
{
    // Dependency injection field to hold the service that processes anomalies
    private readonly AnomalyEngineService _engineService;

    /// <summary>
    /// Constructor that initializes the controller with the required AnomalyEngineService.
    /// </summary>
    /// <param name="engineService">The service used to fetch alert data.</param>
    public AlertsController(AnomalyEngineService engineService)
    {
        _engineService = engineService;
    }

    /// <summary>
    /// Retrieves a list of alerts based on optional filtering criteria.
    /// </summary>
    /// <param name="vector">Optional filter for the attack/anomaly vector.</param>
    /// <param name="severity">Optional filter for the severity level of the alert.</param>
    /// <param name="search">Optional keyword search string to find specific alerts.</param>
    /// <returns>An HTTP OK status containing the count and the list of filtered alerts.</returns>
    [HttpGet]
    public IActionResult GetAlerts(
        [FromQuery] string? vector = null,
        [FromQuery] string? severity = null,
        [FromQuery] string? search = null)
    {
        // Fetch the filtered alerts from the underlying data service
        var alerts = _engineService.GetAlerts(vector, severity, search);
        
        // Return a 200 OK response, wrapping the result in an anonymous object
        // This provides both the total count of alerts and the data array itself
        return Ok(new
        {
            count = alerts.Count,
            alerts = alerts
        });
    }
}
