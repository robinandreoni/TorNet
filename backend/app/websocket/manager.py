import json
import logging
from typing import Dict, List, Set
from fastapi import WebSocket

logger = logging.getLogger("tornet.websocket")

class ConnectionManager:
    def __init__(self):
        # Active connections: scan_id -> set of websockets, or "global" -> set
        self.active_connections: Dict[str, Set[WebSocket]] = {
            "global": set()
        }

    async def connect(self, websocket: WebSocket, channel: str = "global"):
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = set()
        self.active_connections[channel].add(websocket)
        logger.info(f"WebSocket client connected on channel: {channel}. Total: {len(self.active_connections[channel])}")

    def disconnect(self, websocket: WebSocket, channel: str = "global"):
        if channel in self.active_connections and websocket in self.active_connections[channel]:
            self.active_connections[channel].remove(websocket)
            logger.info(f"WebSocket client disconnected from channel: {channel}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.warning(f"Failed to send personal message: {e}")

    async def broadcast(self, message: dict, channel: str = "global"):
        """Broadcast message to all subscribers of a specific channel (e.g. 'global' or 'scan_123')"""
        if channel not in self.active_connections:
            return
        
        dead_sockets = []
        payload = json.dumps(message)
        for connection in self.active_connections[channel]:
            try:
                await connection.send_text(payload)
            except Exception as e:
                logger.warning(f"Error broadcasting to socket on {channel}: {e}")
                dead_sockets.append(connection)
        
        for dead in dead_sockets:
            if dead in self.active_connections[channel]:
                self.active_connections[channel].remove(dead)

    async def broadcast_terminal(self, scan_id: int, text: str, stream_type: str = "stdout", tool_name: str = None):
        """Convenience function to stream live terminal output to scan channel and global channel with tool_name metadata"""
        msg = {
            "type": "terminal_output",
            "scan_id": scan_id,
            "tool_name": tool_name,
            "stream": stream_type,
            "text": text
        }
        await self.broadcast(msg, channel=f"scan_{scan_id}")
        await self.broadcast(msg, channel="global")

    async def broadcast_progress(self, scan_id: int, progress: int, status: str, current_tool: str):
        msg = {
            "type": "scan_progress",
            "scan_id": scan_id,
            "progress": progress,
            "status": status,
            "current_tool": current_tool
        }
        await self.broadcast(msg, channel=f"scan_{scan_id}")
        await self.broadcast(msg, channel="global")

manager = ConnectionManager()
