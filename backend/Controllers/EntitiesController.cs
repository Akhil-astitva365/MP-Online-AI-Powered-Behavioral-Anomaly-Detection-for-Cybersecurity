using BackendApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace BackendApi.Controllers;


[ApiController]
[Route("api/[controller]")]
public class EntitiesController : ControllerBase
{
    
    private readonly AnomalyEngineService _engineService;

  
    public EntitiesController(AnomalyEngineService engineService)
    {
        _engineService = engineService;
    }

    [HttpGet]
    public IActionResult GetEntities()
    {
        
        var entities = _engineService.GetEntities();
        
        
        return Ok(new { entities = entities });
    }

   
    [HttpGet("{entityId}/history")]
    public IActionResult GetEntityHistory(string entityId)
    {
      
        var history = _engineService.GetEntityHistory(entityId);
        
       
        return Ok(history);
    }
}
