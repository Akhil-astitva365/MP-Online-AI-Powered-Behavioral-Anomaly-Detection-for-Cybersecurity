using System.Text.Json;
using BackendApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace BackendApi.Controllers;

[ApiController]
[Route("api/logs")]
public class LogsController : ControllerBase
{
    private readonly LogStreamerService _streamerService;
    private readonly ILogger<LogsController> _logger;

    public LogsController(LogStreamerService streamerService, ILogger<LogsController> logger)
    {
        _streamerService = streamerService;
        _logger = logger;
    }

    [HttpPost("stream")]
    public async Task<IActionResult> StreamLogs([FromBody] JsonElement rawBody)
    {
        var eventList = new List<Dictionary<string, object?>>();

        if (rawBody.ValueKind == JsonValueKind.Array)
        {
            foreach (var elem in rawBody.EnumerateArray())
            {
                var dict = ConvertJsonElementToDict(elem);
                if (dict != null) eventList.Add(dict);
            }
        }
        else if (rawBody.ValueKind == JsonValueKind.Object)
        {
            var dict = ConvertJsonElementToDict(rawBody);
            if (dict != null) eventList.Add(dict);
        }

        var processedAlerts = await _streamerService.ProcessEventBatchAsync(eventList);

        return Ok(new
        {
            success = true,
            processed_count = processedAlerts.Count,
            alerts = processedAlerts
        });
    }

    [HttpPost("upload")]
    public async Task<IActionResult> UploadLogFile(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { success = false, detail = "No file uploaded." });
        }

        try
        {
            using var stream = file.OpenReadStream();
            var processedAlerts = await _streamerService.ParseAndProcessFileAsync(stream, file.FileName);

            return Ok(new
            {
                success = true,
                filename = file.FileName,
                processed_count = processedAlerts.Count,
                alerts = processedAlerts
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing uploaded file");
            return StatusCode(500, new { success = false, detail = $"Server processing error: {ex.Message}" });
        }
    }

    private static Dictionary<string, object?>? ConvertJsonElementToDict(JsonElement elem)
    {
        if (elem.ValueKind != JsonValueKind.Object) return null;
        var dict = new Dictionary<string, object?>();
        foreach (var prop in elem.EnumerateObject())
        {
            dict[prop.Name] = prop.Value.ValueKind switch
            {
                JsonValueKind.String => prop.Value.GetString(),
                JsonValueKind.Number => prop.Value.TryGetInt64(out long l) ? l : prop.Value.GetDouble(),
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                JsonValueKind.Null => null,
                _ => prop.Value.ToString()
            };
        }
        return dict;
    }
}
