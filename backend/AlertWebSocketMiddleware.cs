//using websockets for realtime feedback
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
