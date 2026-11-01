from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List, Dict, Any

from .service import opsec_service
from .models import (
    OpsecState,
    IPInfo,
    MacStatus,
    TorStatus,
    VpnStatus,
    MacSpoofRequest,
    VpnConnectRequest
)

router = APIRouter()

@router.get("/status", response_model=OpsecState)
async def get_opsec_status():
    """Get complete status of all OPSEC shields (MAC, Tor, VPN, IP, Stealth Score)."""
    try:
        return await opsec_service.get_state()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch OPSEC status: {str(e)}")

@router.post("/ip/check", response_model=IPInfo)
async def check_ip():
    """Force real-time lookup and geolocation of current public IP."""
    try:
        return await opsec_service.get_public_ip(force_refresh=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check public IP: {str(e)}")

# ---------------- MAC CHANGER ----------------

@router.post("/mac/spoof", response_model=MacStatus)
async def spoof_mac(req: MacSpoofRequest = MacSpoofRequest()):
    """Randomize the MAC address of the network interface."""
    try:
        return await opsec_service.spoof_mac(req.interface)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to spoof MAC address: {str(e)}")

@router.post("/mac/restore", response_model=MacStatus)
async def restore_mac(req: MacSpoofRequest = MacSpoofRequest()):
    """Restore permanent factory MAC address of the network interface."""
    try:
        return await opsec_service.restore_mac(req.interface)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to restore permanent MAC: {str(e)}")

# ---------------- TOR NETWORK ----------------

@router.post("/tor/start", response_model=TorStatus)
async def start_tor():
    """Start the Tor daemon and open SOCKS5 / Control listeners."""
    try:
        return await opsec_service.start_tor()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start Tor network: {str(e)}")

@router.post("/tor/stop", response_model=TorStatus)
async def stop_tor():
    """Stop the Tor daemon."""
    try:
        return await opsec_service.stop_tor()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stop Tor network: {str(e)}")

@router.post("/tor/new-identity", response_model=TorStatus)
async def new_tor_identity():
    """Request a new Tor circuit (NEWNYM) to switch exit node and IP address."""
    try:
        return await opsec_service.new_tor_identity()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to switch Tor identity: {str(e)}")

# ---------------- VPN GATEWAY ----------------

@router.get("/vpn/profiles", response_model=List[Dict[str, Any]])
async def list_vpn_profiles():
    """List all available VPN configuration profiles (.ovpn / .conf)."""
    return opsec_service.list_vpn_profiles()

@router.post("/vpn/fetch-public", response_model=List[Dict[str, Any]])
async def fetch_public_vpns():
    """Download fresh free public VPN profiles from VPN Gate."""
    try:
        return await opsec_service.fetch_public_vpns()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch public VPNs: {str(e)}")

@router.post("/vpn/upload")
async def upload_vpn_profile(file: UploadFile = File(...)):
    """Upload a new OpenVPN or WireGuard profile file."""
    if not file.filename.lower().endswith((".ovpn", ".conf")):
        raise HTTPException(status_code=400, detail="Only .ovpn and .conf files are supported.")
    
    content = await file.read()
    return opsec_service.save_vpn_profile(file.filename, content)

@router.post("/vpn/connect", response_model=VpnStatus)
async def connect_vpn(req: VpnConnectRequest):
    """Connect to a VPN tunnel using the specified profile."""
    try:
        return await opsec_service.connect_vpn(req.profile_name)
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=404, detail=str(fnf))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initiate VPN tunnel: {str(e)}")

@router.post("/vpn/disconnect", response_model=VpnStatus)
async def disconnect_vpn():
    """Disconnect active VPN tunnel."""
    try:
        return await opsec_service.disconnect_vpn()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to disconnect VPN tunnel: {str(e)}")

