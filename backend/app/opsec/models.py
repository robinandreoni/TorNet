from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class IPInfo(BaseModel):
    ip: str = "Unknown"
    country: str = "Unknown"
    country_code: str = "XX"
    city: str = ""
    isp: str = "Unknown"
    is_tor: bool = False
    is_vpn: bool = False

class MacStatus(BaseModel):
    interface: str = "eth0"
    current_mac: str = "00:00:00:00:00:00"
    permanent_mac: str = "00:00:00:00:00:00"
    is_spoofed: bool = False

class TorStatus(BaseModel):
    is_active: bool = False
    exit_ip: Optional[str] = None
    country: Optional[str] = None
    country_code: Optional[str] = "XX"
    socks_port: int = 9050
    control_port: int = 9051

class VpnStatus(BaseModel):
    is_active: bool = False
    active_profile: Optional[str] = None
    tunnel_interface: Optional[str] = None
    tunnel_ip: Optional[str] = None

class OpsecState(BaseModel):
    mac: MacStatus
    tor: TorStatus
    vpn: VpnStatus
    current_ip: IPInfo
    stealth_level: str = "Standard"
    stealth_score: int = 0  # 0 to 100%

class MacSpoofRequest(BaseModel):
    interface: str = "eth0"

class VpnConnectRequest(BaseModel):
    profile_name: str

