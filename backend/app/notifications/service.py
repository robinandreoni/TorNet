import os
import json
import logging
import asyncio
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Optional
import requests

logger = logging.getLogger("tornet.notifications.service")

CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "notifications_config.json")

class NotificationService:
    def __init__(self):
        self.config = self._load_config()

    def _load_config(self) -> Dict[str, Any]:
        default_config = {
            "telegram_enabled": False,
            "telegram_bot_token": "",
            "telegram_chat_id": "",
            "email_enabled": False,
            "email_smtp_host": "smtp.gmail.com",
            "email_smtp_port": 587,
            "email_smtp_user": "",
            "email_smtp_pass": "",
            "email_recipient": "",
            "webhook_enabled": False,
            "webhook_url": ""
        }
        if os.path.exists(CONFIG_PATH):
            try:
                with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    default_config.update(data)
            except Exception as e:
                logger.error(f"Error reading notification config: {e}")
        return default_config

    def save_config(self, new_config: Dict[str, Any]):
        self.config.update(new_config)
        try:
            os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
            with open(CONFIG_PATH, "w", encoding="utf-8") as f:
                json.dump(self.config, f, indent=2)
            logger.info("Notification configuration saved successfully.")
        except Exception as e:
            logger.error(f"Error saving notification config: {e}")

    def send_telegram(self, message: str) -> bool:
        token = self.config.get("telegram_bot_token")
        chat_id = self.config.get("telegram_chat_id")
        if not token or not chat_id:
            logger.warning("Telegram notification skipped: token or chat_id missing.")
            return False

        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": message,
            "parse_mode": "HTML"
        }
        try:
            resp = requests.post(url, json=payload, timeout=10)
            return resp.status_code == 200
        except Exception as e:
            logger.error(f"Telegram dispatch failed: {e}")
            return False

    def send_email(self, subject: str, body_text: str) -> bool:
        host = self.config.get("email_smtp_host")
        port = self.config.get("email_smtp_port", 587)
        user = self.config.get("email_smtp_user")
        pwd = self.config.get("email_smtp_pass")
        recipient = self.config.get("email_recipient")

        if not user or not pwd or not recipient:
            logger.warning("Email notification skipped: SMTP credentials or recipient missing.")
            return False

        try:
            msg = MIMEMultipart()
            msg["From"] = user
            msg["To"] = recipient
            msg["Subject"] = subject
            msg.attach(MIMEText(body_text, "plain"))

            with smtplib.SMTP(host, port, timeout=10) as server:
                server.starttls()
                server.login(user, pwd)
                server.send_message(msg)
            return True
        except Exception as e:
            logger.error(f"SMTP dispatch failed: {e}")
            return False

    def send_webhook(self, payload: Dict[str, Any]) -> bool:
        webhook_url = self.config.get("webhook_url")
        if not webhook_url:
            return False

        try:
            resp = requests.post(webhook_url, json=payload, timeout=10)
            return resp.status_code in (200, 201, 204)
        except Exception as e:
            logger.error(f"Webhook dispatch failed: {e}")
            return False

    async def dispatch_scan_completion(self, scan_id: int, target: str, status: str, stats: Dict[str, Any]):
        """Dispatches automated alerts across all enabled channels asynchronously."""
        asyncio.create_task(self._async_dispatch(scan_id, target, status, stats))

    async def _async_dispatch(self, scan_id: int, target: str, status: str, stats: Dict[str, Any]):
        status_emoji = "✅" if status == "completed" else "⚠️"
        crit = stats.get("critical", 0)
        high = stats.get("high", 0)
        med = stats.get("medium", 0)

        tg_text = (
            f"<b>{status_emoji} TORNET Scan #{scan_id} Completed</b>\n\n"
            f"<b>Target:</b> <code>{target}</code>\n"
            f"<b>Status:</b> {status.upper()}\n"
            f"<b>Findings:</b>\n"
            f"🚨 Critical: {crit} | 🔴 High: {high} | 🟡 Medium: {med}\n\n"
            f"<i>Report generated in TORNET Command Center.</i>"
        )

        email_subject = f"[TORNET Alert] Scan #{scan_id} {status.upper()} - {target}"
        email_body = (
            f"TORNET Command Center Security Notification\n\n"
            f"Scan ID: #{scan_id}\n"
            f"Target: {target}\n"
            f"Status: {status}\n"
            f"Findings Summary:\n"
            f" - Critical: {crit}\n"
            f" - High: {high}\n"
            f" - Medium: {med}\n\n"
            f"Access your dashboard to view the full audit trail and remediation roadmap."
        )

        webhook_payload = {
            "source": "TORNET Command Center",
            "event": "scan_completed",
            "scan_id": scan_id,
            "target": target,
            "status": status,
            "statistics": stats
        }

        # Dispatch Telegram if enabled
        if self.config.get("telegram_enabled"):
            try:
                self.send_telegram(tg_text)
            except Exception as e:
                logger.error(f"Telegram notification error: {e}")

        # Dispatch Email if enabled
        if self.config.get("email_enabled"):
            try:
                self.send_email(email_subject, email_body)
            except Exception as e:
                logger.error(f"Email notification error: {e}")

        # Dispatch Webhook if enabled
        if self.config.get("webhook_enabled"):
            try:
                self.send_webhook(webhook_payload)
            except Exception as e:
                logger.error(f"Webhook notification error: {e}")

    def test_alert(self) -> Dict[str, Any]:
        results = {}
        sample_msg = "🔔 <b>TORNET Command Center</b>: Canale di notifica verificato con successo!"
        
        if self.config.get("telegram_enabled"):
            results["telegram"] = "success" if self.send_telegram(sample_msg) else "failed_check_credentials"
        else:
            results["telegram"] = "disabled"

        if self.config.get("email_enabled"):
            results["email"] = "success" if self.send_email("[TORNET] Test Notification", "This is a test notification from TORNET Command Center.") else "failed_check_smtp"
        else:
            results["email"] = "disabled"

        if self.config.get("webhook_enabled"):
            results["webhook"] = "success" if self.send_webhook({"event": "test_alert", "message": "TORNET webhook test OK"}) else "failed_check_url"
        else:
            results["webhook"] = "disabled"

        return results

notification_service = NotificationService()

