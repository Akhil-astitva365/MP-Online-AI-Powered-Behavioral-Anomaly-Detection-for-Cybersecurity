using BackendApi;
using BackendApi.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        options.JsonSerializerOptions.PropertyNamingPolicy = null;
    });

builder.Services.AddEndpointsApiExplorer();

// CORS for Vite frontend or external API consumers
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Singleton & Hosted Services
builder.Services.AddSingleton<WebSocketManagerService>();
builder.Services.AddSingleton<AnomalyEngineService>();
builder.Services.AddSingleton<LogStreamerService>();
builder.Services.AddSingleton<SimulationService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<SimulationService>());

var app = builder.Build();

app.UseCors("AllowAll");

// Enable WebSockets
app.UseWebSockets();

// Route WebSocket endpoint /api/ws/alerts
app.Use(async (context, next) =>
{
    if (context.Request.Path == "/api/ws/alerts")
    {
        var wsManager = context.RequestServices.GetRequiredService<WebSocketManagerService>();
        await AlertWebSocketMiddleware.HandleWebSocketAsync(context, wsManager);
    }
    else
    {
        await next();
    }
});

app.UseAuthorization();
app.MapControllers();

Console.WriteLine("=================================================================");
Console.WriteLine("   SENTINEL AI - ASP.NET CORE BEHAVIORAL ENGINE STARTED");
Console.WriteLine("   API Port: http://localhost:8000");
Console.WriteLine("=================================================================");

app.Run();
