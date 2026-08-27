using BackendApi.Models;
using BackendApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace BackendApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FeedbackController : ControllerBase
{
    private readonly AnomalyEngineService _engineService;

    public FeedbackController(AnomalyEngineService engineService)
    {
        _engineService = engineService;
    }

    [HttpPost]
    public IActionResult SubmitFeedback([FromBody] FeedbackRequest req)
    {
        var entry = _engineService.SaveFeedback(req);
        return Ok(new
        {
            success = true,
            entry = entry,
            summary = _engineService.GetFeedbackSummary()
        });
    }
}
