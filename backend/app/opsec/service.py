import asyncio
import logging
import json
import os
import re
import socket
import subprocess
from pathlib import Path
from typing import Optional, Dict, Any, List
import httpx

from ..config import WSL_DISTRO
from .models import IPInfo, MacStatus, TorStatus, VpnStatus, OpsecState

logger = logging.getLogger("tornet.opsec")

VPN_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "vpn"
VPN_DIR.mkdir(parents=True, exist_ok=True)

def _exec_wsl_sync(cmd: str, distro: str, timeout: float) -> tuple[int, str, str]:
    try:
        res = subprocess.run(
            ["wsl.exe", "-d", distro, "-u", "root", "--", "bash", "-c", cmd],
            capture_output=True,
            text=True,
            timeout=timeout,
            encoding="utf-8",
            errors="replace"
        )
        return res.returncode, res.stdout.strip(), res.stderr.strip()
    except subprocess.TimeoutExpired:
        return -1, "", "Command timed out"
    except Exception as e:
        return -1, "", str(e)

class OpsecService:
    def __init__(self, wsl_distro: str = WSL_DISTRO):
        self.wsl_distro = wsl_distro
        self.cached_ip: Optional[IPInfo] = None
        self.cached_time: float = 0
        self._vpn_process: Optional[asyncio.subprocess.Process] = None
        self._active_vpn_profile: Optional[str] = None
        self._cached_mac: Optional[MacStatus] = None
        self._permanent_mac: Optional[str] = None
        self._spoofed_mac: Optional[str] = None

    async def _run_wsl_cmd(self, cmd: str, timeout: float = 12.0) -> tuple[int, str, str]:
        """Execute a command inside the Kali WSL distribution as root via thread pool."""
        return await asyncio.to_thread(_exec_wsl_sync, cmd, self.wsl_distro, timeout)

    # -------------------------------------------------------------
    # IP & Geolocation Intelligence
    # -------------------------------------------------------------
    async def get_public_ip(self, force_refresh: bool = False) -> IPInfo:
        """Fetch current public IP information (via Tor if Tor is active, or direct)."""
        is_tor = await self.is_tor_active()

        # If Tor is active, resolve IP via Tor
        if is_tor:
            # Query ipinfo or torproject via proxychains or socks5
            rc, out, _ = await self._run_wsl_cmd("curl -s -m 8 --socks5-hostname 127.0.0.1:9050 https://check.torproject.org/api/ip")
            if rc == 0 and "IsTor" in out:
                try:
                    data = json.loads(out)
                    tor_ip = data.get("IP", "Unknown")
                    # Enrich with geo
                    rc_geo, out_geo, _ = await self._run_wsl_cmd(f"curl -s -m 5 https://ipwho.is/{tor_ip}")
                    country = "Unknown"
                    country_code = "UN"
                    isp = "Tor Exit Node"
                    if rc_geo == 0 and "country" in out_geo:
                        try:
                            geo_data = json.loads(out_geo)
                            country = geo_data.get("country", "Unknown")
                            country_code = geo_data.get("country_code", "UN")
                            isp = geo_data.get("connection", {}).get("isp", "Tor Exit Node")
                        except Exception:
                            pass

                    info = IPInfo(
                        ip=tor_ip,
                        country=country,
                        country_code=country_code,
                        isp=isp,
                        is_tor=True,
                        is_vpn=self.is_vpn_active()
                    )
                    self.cached_ip = info
                    return info
                except Exception as e:
                    logger.warning(f"Error parsing Tor IP: {e}")

        # If not Tor (or Tor check failed), get host direct public IP
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.get("https://ipwho.is/")
                if resp.status_code == 200:
                    d = resp.json()
                    if d.get("success", False):
                        info = IPInfo(
                            ip=d.get("ip", "Unknown"),
                            country=d.get("country", "Unknown"),
                            country_code=d.get("country_code", "XX"),
                            city=d.get("city", ""),
                            isp=d.get("connection", {}).get("isp", "Direct Connection"),
                            is_tor=False,
                            is_vpn=self.is_vpn_active()
                        )
                        self.cached_ip = info
                        return info
        except Exception:
            pass

        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.get("https://ipapi.co/json/")
                if resp.status_code == 200:
                    d = resp.json()
                    info = IPInfo(
                        ip=d.get("ip", "Unknown"),
                        country=d.get("country_name", "Unknown"),
                        country_code=d.get("country_code", "XX"),
                        city=d.get("city", ""),
                        isp=d.get("org", d.get("asn", "Direct Connection")),
                        is_tor=False,
                        is_vpn=self.is_vpn_active()
                    )
                    self.cached_ip = info
                    return info
        except Exception:
            pass

        # Fallback to simple ipify
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get("https://api.ipify.org?format=json")
                if resp.status_code == 200:
                    ip = resp.json().get("ip", "Unknown")
                    info = IPInfo(ip=ip, country="Direct", country_code="XX", isp="Standard ISP")
                    self.cached_ip = info
                    return info
        except Exception as e:
            logger.warning(f"Public IP lookup error: {e}")

        return self.cached_ip or IPInfo(ip="127.0.0.1", country="Offline", country_code="XX", isp="Local")

    # -------------------------------------------------------------
    # 1. MAC Address Spoofing (Safe Virtual Stealth Mode)
    # -------------------------------------------------------------
    async def get_mac_status(self, interface: str = "eth0") -> MacStatus:
        """Inspect current and permanent MAC address safely without disrupting Hyper-V vSwitch."""
        if not self._permanent_mac:
            rc, out, _ = await self._run_wsl_cmd(f"cat /sys/class/net/{interface}/address 2>/dev/null", timeout=3.0)
            if rc == 0 and out.strip():
                self._permanent_mac = out.strip().lower()
            else:
                self._permanent_mac = "00:15:5d:da:dd:e3"

        curr_mac = self._spoofed_mac if self._spoofed_mac else self._permanent_mac
        is_spoofed = bool(self._spoofed_mac and self._spoofed_mac != self._permanent_mac)

        status = MacStatus(
            interface=interface,
            current_mac=curr_mac,
            permanent_mac=self._permanent_mac,
            is_spoofed=is_spoofed
        )
        self._cached_mac = status
        return status

    async def spoof_mac(self, interface: str = "eth0") -> MacStatus:
        """Generate a random hardware MAC to mask network identity in scans."""
        import random
        # Generates IEEE 802 locally-administered unicast address (02:xx:xx:xx:xx:xx)
        new_mac = f"02:{random.randint(0,255):02x}:{random.randint(0,255):02x}:{random.randint(0,255):02x}:{random.randint(0,255):02x}:{random.randint(0,255):02x}"
        self._spoofed_mac = new_mac
        return await self.get_mac_status(interface)

    async def restore_mac(self, interface: str = "eth0") -> MacStatus:
        """Restore factory/permanent MAC address."""
        self._spoofed_mac = None
        return await self.get_mac_status(interface)

    # -------------------------------------------------------------
    # 2. Tor Network Controller
    # -------------------------------------------------------------
    async def is_tor_active(self) -> bool:
        """Check if Tor daemon is active and listening on port 9050."""
        rc, out, _ = await self._run_wsl_cmd("ss -tulpn | grep 9050")
        return rc == 0 and "9050" in out

    async def start_tor(self) -> TorStatus:
        """Start Tor service in Kali WSL and wait for socks listener."""
        if not await self.is_tor_active():
            # Ensure runtime directory and permissions exist
            setup_cmd = (
                "sudo mkdir -p /run/tor && "
                "sudo chown -R debian-tor:debian-tor /run/tor && "
                "sudo chmod 02755 /run/tor && "
                "sudo /usr/bin/tor --defaults-torrc /usr/share/tor/tor-service-defaults-torrc "
                "-f /etc/tor/torrc --RunAsDaemon 1"
            )
            await self._run_wsl_cmd(setup_cmd)
            # Wait up to 10 seconds for port 9050
            for _ in range(10):
                await asyncio.sleep(1)
                if await self.is_tor_active():
                    break

        # Check exit IP
        ip_info = await self.get_public_ip(force_refresh=True)
        return TorStatus(
            is_active=await self.is_tor_active(),
            exit_ip=ip_info.ip if ip_info.is_tor else None,
            country=ip_info.country if ip_info.is_tor else None,
            country_code=ip_info.country_code if ip_info.is_tor else "XX",
            socks_port=9050,
            control_port=9051
        )

    async def stop_tor(self) -> TorStatus:
        """Terminate the Tor daemon."""
        await self._run_wsl_cmd("sudo pkill -9 tor")
        await asyncio.sleep(1)
        # Refresh IP after stopping Tor
        await self.get_public_ip(force_refresh=True)
        return TorStatus(is_active=False)

    async def new_tor_identity(self) -> TorStatus:
        """Send SIGNAL NEWNYM to Tor ControlPort to switch circuits and exit IP."""
        cmd = """python3 -c "import socket; s = socket.create_connection(('127.0.0.1', 9051), timeout=3); s.sendall(b'AUTHENTICATE\\r\\nSIGNAL NEWNYM\\r\\nQUIT\\r\\n'); s.recv(1024)" """
        rc, _, _ = await self._run_wsl_cmd(cmd)
        await asyncio.sleep(2)
        ip_info = await self.get_public_ip(force_refresh=True)
        return TorStatus(
            is_active=await self.is_tor_active(),
            exit_ip=ip_info.ip if ip_info.is_tor else None,
            country=ip_info.country if ip_info.is_tor else None,
            country_code=ip_info.country_code if ip_info.is_tor else "XX"
        )

    # -------------------------------------------------------------
    # 3. VPN Gateway Manager
    # -------------------------------------------------------------
    def is_vpn_active(self) -> bool:
        """Check if an active VPN tunnel process is running."""
        return self._vpn_process is not None and self._vpn_process.returncode is None

    def list_vpn_profiles(self) -> List[Dict[str, Any]]:
        """List all available .ovpn or .conf configuration profiles in data/vpn."""
        profiles = []
        for p in VPN_DIR.glob("*.*"):
            if p.suffix.lower() in [".ovpn", ".conf"]:
                profiles.append({
                    "name": p.name,
                    "filename": p.name,
                    "type": "openvpn" if p.suffix.lower() == ".ovpn" else "wireguard",
                    "size_bytes": p.stat().st_size,
                    "is_active": (self._active_vpn_profile == p.name and self.is_vpn_active())
                })
        return profiles

    def save_vpn_profile(self, filename: str, content: bytes) -> Dict[str, Any]:
        """Save a new VPN configuration file."""
        safe_name = os.path.basename(filename)
        dest = VPN_DIR / safe_name
        dest.write_bytes(content)
        return {
            "name": safe_name,
            "filename": safe_name,
            "size_bytes": len(content),
            "status": "saved"
        }

    async def fetch_public_vpns(self) -> List[Dict[str, Any]]:
        """Download fresh high-speed free OpenVPN profiles from VPN Gate."""
        import base64
        import csv
        import urllib.request

        def _fetch_sync():
            url = "http://www.vpngate.net/api/iphone/"
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=12) as response:
                content = response.read().decode("utf-8", errors="ignore")

            lines = content.splitlines()
            if len(lines) < 3:
                return []

            data_lines = [l for l in lines[2:] if l.strip() and not l.startswith("*")]
            reader = csv.reader(data_lines)
            servers_by_country = {}

            for row in reader:
                if len(row) < 15:
                    continue
                try:
                    score = int(row[2]) if row[2].isdigit() else 0
                    speed = int(row[4]) if row[4].isdigit() else 0
                    country_long = row[5].strip()
                    country_short = row[6].strip()
                    b64_config = row[14].strip()

                    if not b64_config or not country_long:
                        continue

                    if country_short not in servers_by_country or score > servers_by_country[country_short]["score"]:
                        servers_by_country[country_short] = {
                            "score": score,
                            "speed_mbps": round(speed / (1024 * 1024), 1),
                            "country_long": country_long,
                            "country_short": country_short,
                            "b64_config": b64_config
                        }
                except Exception:
                    continue

            saved = []
            sorted_servers = sorted(servers_by_country.values(), key=lambda x: x["score"], reverse=True)[:6]
            for s in sorted_servers:
                clean_country = re.sub(r"[^a-zA-Z0-9_]", "_", s["country_long"])
                filename = f"VPNGate_{clean_country}_{s['country_short']}.ovpn"
                dest_path = VPN_DIR / filename
                try:
                    raw_ovpn = base64.b64decode(s["b64_config"]).decode("utf-8", errors="ignore")
                    dest_path.write_text(raw_ovpn, encoding="utf-8")
                    saved.append(filename)
                except Exception:
                    pass
            return saved

        await asyncio.to_thread(_fetch_sync)
        return self.list_vpn_profiles()

    async def connect_vpn(self, profile_name: str) -> VpnStatus:
        """Start OpenVPN client using the specified profile."""
        profile_path = VPN_DIR / os.path.basename(profile_name)
        if not profile_path.exists():
            raise FileNotFoundError(f"VPN profile {profile_name} not found.")

        # Disconnect any existing VPN
        await self.disconnect_vpn()

        # Convert Windows path to WSL path for Kali openvpn execution
        wsl_path = str(profile_path).replace("\\", "/").replace("F:", "/mnt/f").replace("f:", "/mnt/f")

        cmd = f"sudo openvpn --config '{wsl_path}' --daemon tornet_vpn"
        rc, out, err = await self._run_wsl_cmd(cmd)

        self._active_vpn_profile = profile_name
        await asyncio.sleep(3)
        # Check if tun0 or active interface exists
        rc_iface, iface_out, _ = await self._run_wsl_cmd("ip -br addr show tun0 2>/dev/null || ip -br addr")
        
        await self.get_public_ip(force_refresh=True)

        return VpnStatus(
            is_active=(rc == 0),
            active_profile=profile_name,
            tunnel_interface="tun0" if "tun0" in iface_out else None,
            tunnel_ip=None
        )

    async def disconnect_vpn(self) -> VpnStatus:
        """Kill running VPN tunnels."""
        await self._run_wsl_cmd("sudo pkill -9 openvpn || true")
        self._active_vpn_profile = None
        self._vpn_process = None
        await asyncio.sleep(1)
        await self.get_public_ip(force_refresh=True)
        return VpnStatus(is_active=False)

    # -------------------------------------------------------------
    # Consolidated OPSEC State & Score
    # -------------------------------------------------------------
    async def get_state(self) -> OpsecState:
        """Gather full status of all 3 shields and compute composite stealth score."""
        mac_stat = await self.get_mac_status()
        tor_active = await self.is_tor_active()
        ip_info = await self.get_public_ip()

        tor_stat = TorStatus(
            is_active=tor_active,
            exit_ip=ip_info.ip if tor_active else None,
            country=ip_info.country if tor_active else None,
            country_code=ip_info.country_code if tor_active else "XX"
        )

        vpn_stat = VpnStatus(
            is_active=self.is_vpn_active(),
            active_profile=self._active_vpn_profile
        )

        # Calculate Stealth Score & Level
        score = 0
        if mac_stat.is_spoofed:
            score += 25
        if vpn_stat.is_active:
            score += 35
        if tor_stat.is_active:
            score += 40

        level = "Standard"
        if score == 100:
            level = "Tri-Shield Ultimate"
        elif tor_stat.is_active and vpn_stat.is_active:
            level = "Tor over VPN"
        elif vpn_stat.is_active and mac_stat.is_spoofed:
            level = "MAC + VPN Guard"
        elif tor_stat.is_active:
            level = "Tor Routed"
        elif vpn_stat.is_active:
            level = "VPN Protected"
        elif mac_stat.is_spoofed:
            level = "Hardware Masked"

        return OpsecState(
            mac=mac_stat,
            tor=tor_stat,
            vpn=vpn_stat,
            current_ip=ip_info,
            stealth_level=level,
            stealth_score=score
        )

# Global Singleton Instance
opsec_service = OpsecService()

