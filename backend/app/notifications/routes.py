from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict, Any
from .service import notification_service

router = APIRouter(prefix="/notifications", tags=["Notifications & Alerts"])

class NotificationConfigModel(BaseModel):
    telegram_enabled: bool = False
    telegram_bot_token: Optional[str] = ""
    telegram_chat_id: Optional[str] = ""
    email_enabled: bool = False
    email_smtp_host: Optional[str] = "smtp.gmail.com"
    email_smtp_port: Optional[int] = 587
    email_smtp_user: Optional[str] = ""
    email_smtp_pass: Optional[str] = ""
    email_recipient: Optional[str] = ""
    webhook_enabled: bool = False
    webhook_url: Optional[str] = ""

@router.get("/config")
def get_notification_config():
    # Mask password for security
    cfg = dict(notification_service.config)
    if cfg.get("email_smtp_pass"):
        cfg["email_smtp_pass"] = "••••••••"
    return cfg

@router.post("/config")
def update_notification_config(data: NotificationConfigModel):
    new_data = data.model_dump()
    # Don't overwrite password with mask
    if new_data.get("email_smtp_pass") == "••••••••":
        new_data["email_smtp_pass"] = notification_service.config.get("email_smtp_pass", "")
    notification_service.save_config(new_data)
    return {"status": "saved", "config": get_notification_config()}

@router.post("/test")
def test_notifications():
    result = notification_service.test_alert()
    return {"status": "tested", "results": result}

