import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "tornet.db"
DATABASE_URL = f"sqlite:///{DB_PATH.as_posix()}"

SECRET_KEY = os.getenv("TORNET_SECRET_KEY", "tornet-super-secret-command-center-key-2026-secure")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000"
]

DEFAULT_ADMIN_USER = "admin"
DEFAULT_ADMIN_PASS = "tornet2026"

WSL_DISTRO = os.getenv("TORNET_WSL_DISTRO", "kali-linux")

WORDLISTS_DIR = BASE_DIR / "wordlists"
WORDLISTS_DIR.mkdir(parents=True, exist_ok=True)

REPORTS_DIR = BASE_DIR / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)
