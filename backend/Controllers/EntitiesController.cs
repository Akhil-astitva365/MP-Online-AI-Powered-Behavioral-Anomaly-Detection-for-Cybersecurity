using BackendApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace BackendApi.Controllers;

/// <summary>
/// Controller responsible for managing API requests related to system entities 
/// (such as users, devices, or nodes being monitored).
/// Routes to /api/Entities
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class EntitiesController : ControllerBase
{
    // Dependency injection field to hold the anomaly processing service
    private readonly AnomalyEngineService _engineService;

    /// <summary>
    /// Constructor that initializes the controller with the required service.
    /// </summary>
    /// <param name="engineService">The service used to retrieve entity data and history.</param>
    public EntitiesController(AnomalyEngineService engineService)
    {
        _engineService = engineService;
    }

    /// <summary>
    /// Retrieves a list of all monitored entities in the system.
    /// </summary>
    /// <returns>An HTTP OK status containing an object with the entities array.</returns>
    [HttpGet]
    public IActionResult GetEntities()
    {
        // Fetch the list of entities from the data service
        var entities = _engineService.GetEntities();
        
        // Return a 200 OK response, wrapping the list in a JSON object 
        // with an 'entities' property for easier frontend parsing
        return Ok(new { entities = entities });
    }

    /// <summary>
    /// Retrieves the historical anomaly or activity data for a specific entity.
    /// </summary>
    /// <param name="entityId">The unique identifier of the entity provided in the URL path.</param>
    /// <returns>An HTTP OK status containing the history record for the specified entity.</returns>
    [HttpGet("{entityId}/history")]
    public IActionResult GetEntityHistory(string entityId)
    {
        // Fetch the historical records for the provided entity ID
        var history = _engineService.GetEntityHistory(entityId);
        
        // Return a 200 OK response with the history data directly
        return Ok(history);
    }
}
