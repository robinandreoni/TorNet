import asyncio
import socket
import logging
from urllib.parse import urlparse
from typing import Dict, Any, List
import httpx

from .models import TargetProfile

logger = logging.getLogger("tornet.adaptive.profiler")

class TargetProfiler:
    """Pre-flight reconnaissance engine to fingerprint target architecture before launching attacks."""

    async def profile(self, target: str) -> TargetProfile:
        clean_host = target.replace("http://", "").replace("https://", "").split("/")[0].split(":")[0]
        ip = "Unknown"

        # 1. DNS Resolution
        try:
            ip = await asyncio.to_thread(socket.gethostbyname, clean_host)
        except Exception:
            ip = "Resolution Failed"

        # 2. Fast Port Check
        open_ports = []
        for port in [80, 443, 22, 21, 3306, 8080]:
            try:
                conn = asyncio.open_connection(clean_host, port)
                _, writer = await asyncio.wait_for(conn, timeout=1.0)
                open_ports.append(port)
                writer.close()
                await writer.wait_closed()
            except Exception:
                pass

        # 3. HTTP Header Fingerprinting & WAF Detection
        web_server = "Non identificato"
        os_hint = "Linux / Unix"
        technologies = []
        waf_detected = False
        waf_name = None

        url_to_test = target if target.startswith("http") else f"http://{clean_host}"
        try:
            async with httpx.AsyncClient(timeout=4.0, verify=False, follow_redirects=True) as client:
                resp = await client.get(url_to_test)
                headers = {k.lower(): v for k, v in resp.headers.items()}
                body = resp.text.lower()

                # Server Header
                if "server" in headers:
                    web_server = headers["server"]
                    if "iis" in web_server.lower() or "microsoft" in web_server.lower():
                        os_hint = "Windows Server"
                    elif "nginx" in web_server.lower() or "apache" in web_server.lower():
                        os_hint = "Linux"

                # Technology Detection
                if "x-powered-by" in headers:
                    technologies.append(headers["x-powered-by"])
                if "php" in headers.get("x-powered-by", "").lower() or ".php" in body:
                    technologies.append("PHP")
                if "asp.net" in headers.get("x-powered-by", "").lower() or "iis" in web_server.lower():
                    technologies.append("ASP.NET")
                if "wp-content" in body or "wp-includes" in body:
                    technologies.append("WordPress CMS")
                if "drupal" in body:
                    technologies.append("Drupal CMS")

                # WAF Detection
                if "cf-ray" in headers or "cloudflare" in web_server.lower() or "cf-cache-status" in headers:
                    waf_detected = True
                    waf_name = "Cloudflare Reverse Proxy & WAF"
                elif "x-sucuri-id" in headers or "sucuri" in web_server.lower():
                    waf_detected = True
                    waf_name = "Sucuri CloudProxy WAF"
                elif "x-akamai-transformed" in headers or "akamai" in web_server.lower():
                    waf_detected = True
                    waf_name = "Akamai Edge WAF"
                elif "mod_security" in web_server.lower():
                    waf_detected = True
                    waf_name = "ModSecurity Web Application Firewall"

        except Exception as e:
            logger.debug(f"HTTP profiling connection failed: {e}")

        # Remove duplicate technologies
        technologies = list(dict.fromkeys(technologies))

        # 4. Determine Recommended Strategy
        rec_strategy = "balanced"
        reason = ""

        if waf_detected:
            rec_strategy = "stealth"
            reason = f"Rilevata protezione {waf_name}: raccomandata modalità FURTIVA per eludere rate-limiting e ban automatici dell'IP."
        elif "vulnweb" in clean_host or "test" in clean_host or "dvwa" in clean_host:
            rec_strategy = "aggressive"
            reason = "Target identificato come ambiente di laboratorio autorizzato: raccomandata modalità APPROFONDITA per sprigionare l'intero arsenale contemporaneamente."
        elif len(open_ports) > 2:
            rec_strategy = "balanced"
            reason = f"Rilevate porte attive ({', '.join(map(str, open_ports))}): raccomandata modalità BILANCIATA per scansione completa senza saturare la banda."
        else:
            rec_strategy = "balanced"
            reason = "Configurazione standard: raccomandata modalità Bilanciata per un audit completo ed equilibrato."

        return TargetProfile(
            target=target,
            ip=ip,
            is_alive=(ip != "Resolution Failed" or len(open_ports) > 0),
            web_server=web_server,
            os_hint=os_hint,
            technologies=technologies,
            waf_detected=waf_detected,
            waf_name=waf_name,
            open_ports=open_ports,
            recommended_strategy=rec_strategy,
            strategy_reason=reason
        )

target_profiler = TargetProfiler()
