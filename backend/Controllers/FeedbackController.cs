using BackendApi.Models;
using BackendApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace BackendApi.Controllers;

/// <summary>
/// Controller responsible for handling user or system feedback regarding alerts and anomalies.
/// Routes to /api/Feedback
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class FeedbackController : ControllerBase
{
    // Dependency injection field for the service that handles core business logic
    private readonly AnomalyEngineService _engineService;

    /// <summary>
    /// Constructor that initializes the controller with the required AnomalyEngineService.
    /// </summary>
    /// <param name="engineService">The service used to process and save feedback data.</param>
    public FeedbackController(AnomalyEngineService engineService)
    {
        _engineService = engineService;
    }

    /// <summary>
    /// Submits new feedback into the system and returns an updated feedback summary.
    /// </summary>
    /// <param name="req">The feedback request object parsed from the HTTP request body.</param>
    /// <returns>An HTTP OK status containing the success state, the saved entry, and an updated summary.</returns>
    [HttpPost]
    public IActionResult SubmitFeedback([FromBody] FeedbackRequest req)
    {
        // Pass the incoming request payload to the service to be saved in the database
        var entry = _engineService.SaveFeedback(req);
        var entities = _engineService.GetEntites();
        // Return a 200 OK response wrapping a composite object.
        // This includes a success flag, the newly created feedback entry, 
        // and an updated summary of all feedback to immediately update the frontend UI.
        return Ok(new
        {
            success = true,
            entry = entry,
            summary = _engineService.GetFeedbackSummary()
        });
    }
}
