import logging
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ORIGINS
from .database import engine, Base, SessionLocal
from .auth.routes import router as auth_router, ensure_default_admin
from .scans.routes import router as scans_router
from .reports.routes import router as reports_router
from .pipeline.scheduler_routes import router as scheduler_router
from .ai.routes import router as ai_router
from .projects.routes import router as projects_router
from .notifications.routes import router as notifications_router
from .tools.plugin_routes import router as plugins_router
from .opsec.routes import router as opsec_router
from .adaptive.routes import router as adaptive_router
from .websocket.manager import manager
from .pipeline.scheduler import scan_scheduler

# Import all models to guarantee table registration
from .auth import models as auth_models
from .scans import models as scan_models
from .pipeline import models as pipeline_models
from .projects import models as project_models

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("tornet.main")

# Auto-create all tables in SQLite
Base.metadata.create_all(bind=engine)

# Ensure initial default admin user exists
db = SessionLocal()
try:
    ensure_default_admin(db)
finally:
    db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: launch scheduler daemon
    scan_scheduler.start()
    logger.info("TORNET Command Center services initialized.")
    yield
    # Shutdown: stop scheduler daemon
    scan_scheduler.stop()
    logger.info("TORNET Command Center services terminated.")

app = FastAPI(
    title="TORNET Command Center API",
    version="1.0.0",
    description="High-performance backend API and WebSocket orchestrator for authorized cybersecurity assessment and telemetry.",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(scans_router, prefix="/api/v1")
app.include_router(reports_router, prefix="/api/v1")
app.include_router(scheduler_router, prefix="/api/v1")
app.include_router(ai_router, prefix="/api/v1")
app.include_router(projects_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(plugins_router, prefix="/api/v1")
app.include_router(opsec_router, prefix="/api/v1/opsec")
app.include_router(adaptive_router, prefix="/api/v1/adaptive")

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "TORNET Command Center",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "features": {
            "metasploit_rpc": True,
            "scan_scheduler": True,
            "ai_assistant": True,
            "multi_target_projects": True,
            "notifications": True,
            "plugin_system": True,
            "opsec_shield": True,
            "adaptive_engine": True
        }
    }

@app.websocket("/ws")
@app.websocket("/ws/{channel}")
async def websocket_endpoint(websocket: WebSocket, channel: str = "global"):
    await manager.connect(websocket, channel)
    try:
        # Welcome message
        await manager.send_personal_message({
            "type": "connection_established",
            "channel": channel,
            "timestamp": datetime.utcnow().isoformat()
        }, websocket)

        while True:
            data = await websocket.receive_text()
            # Echo or handle incoming websocket client messages/commands
            logger.debug(f"Received WS text on {channel}: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
    except Exception as e:
        logger.warning(f"WebSocket connection error: {e}")
        manager.disconnect(websocket, channel)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
