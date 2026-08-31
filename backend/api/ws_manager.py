from typing import List
from fastapi import WebSocket

class ConnectionManager:
    """
    WebSockets Manager for real time SOC alert streaming and live threat broadcasts.
    """
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[WebSocket] Client connected. Active clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"[WebSocket] Client disconnected. Active clients: {len(self.active_connections)}")

    async def broadcast_alert(self, alert_data: dict):
        """Broadcasts real-time threat alert payload to all connected frontend clients."""
        for connection in self.active_connections:
            try:
                await connection.send_json(alert_data)
            except Exception as e:
                print(f"[WebSocket] Broadcast error: {e}")

ws_manager = ConnectionManager()
