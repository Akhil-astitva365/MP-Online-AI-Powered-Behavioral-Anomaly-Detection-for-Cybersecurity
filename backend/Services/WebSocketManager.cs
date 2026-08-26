using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace BackendApi.Services;

public class WebSocketManagerService
{
    private readonly ConcurrentDictionary<string, WebSocket> _sockets = new();

    public void AddSocket(string id, WebSocket socket)
    {
        _sockets.TryAdd(id, socket);
    }

    public async Task RemoveSocketAsync(string id)
    {
        if (_sockets.TryRemove(id, out var socket))
        {
            if (socket.State == WebSocketState.Open || socket.State == WebSocketState.CloseReceived)
            {
                try
                {
                    await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closed", CancellationToken.None);
                }
                catch
                {
                    // Ignore disconnect errors
                }
            }
        }
    }

    public async Task BroadcastAlertAsync(object alertPayload)
    {
        var messageJson = JsonSerializer.Serialize(new
        {
            type = "NEW_ALERT",
            payload = alertPayload
        });

        var bytes = Encoding.UTF8.GetBytes(messageJson);
        var buffer = new ArraySegment<byte>(bytes, 0, bytes.Length);

        var deadSockets = new List<string>();

        foreach (var (id, socket) in _sockets)
        {
            if (socket.State == WebSocketState.Open)
            {
                try
                {
                    await socket.SendAsync(buffer, WebSocketMessageType.Text, true, CancellationToken.None);
                }
                catch
                {
                    deadSockets.Add(id);
                }
            }
            else
            {
                deadSockets.Add(id);
            }
        }

        foreach (var id in deadSockets)
        {
            await RemoveSocketAsync(id);
        }
    }
}
