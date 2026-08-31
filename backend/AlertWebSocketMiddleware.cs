//The real point of this file isn't the PONG message — it's the socket registry pattern (AddSocket / RemoveSocketAsync). It turns the server into something that can actively push alerts to connected dashboards the moment an anomaly is scored, rather than dashboards having to poll a REST endpoint repeatedly. For a "real-time behavioral anomaly detection" system, that's the whole value proposition: detection latency ≈ 0 between "server flags a threat" and "analyst sees it on screen."
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using BackendApi.Services;

namespace BackendApi;

public static class AlertWebSocketMiddleware
{
    public static async Task HandleWebSocketAsync(HttpContext context, WebSocketManagerService wsManager)
    {
        if (context.WebSockets.IsWebSocketRequest)
        {
            using var webSocket = await context.WebSockets.AcceptWebSocketAsync();
            var socketId = Guid.NewGuid().ToString();
            wsManager.AddSocket(socketId, webSocket);

            var buffer = new byte[1024 * 4];
            while (webSocket.State == WebSocketState.Open)
            {
                var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                if (result.MessageType == WebSocketMessageType.Text)
                {
                    var pongJson = JsonSerializer.Serialize(new
                    {
                        type = "PONG",
                        payload = "SentinelAI Real-Data Engine (ASP.NET Core) Active"
                    });
                    var pongBytes = Encoding.UTF8.GetBytes(pongJson);
                    await webSocket.SendAsync(new ArraySegment<byte>(pongBytes), WebSocketMessageType.Text, true, CancellationToken.None);
                }
                else if (result.MessageType == WebSocketMessageType.Close)
                {
                    await wsManager.RemoveSocketAsync(socketId);
                    break;
                }
            }
        }
        else
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
        }
    }
}
