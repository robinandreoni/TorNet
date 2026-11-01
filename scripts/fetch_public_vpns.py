import urllib.request
import csv
import base64
import os
import re
from pathlib import Path

DEST_DIR = Path(__file__).resolve().parent.parent / "backend" / "data" / "vpn"
DEST_DIR.mkdir(parents=True, exist_ok=True)

def fetch_and_save_vpns():
    url = "http://www.vpngate.net/api/iphone/"
    print(f"Fetching public VPN list from {url}...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            content = response.read().decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"Error fetching API: {e}")
        return []

    lines = content.splitlines()
    if len(lines) < 3:
        print("Invalid response format")
        return []

    data_lines = [line for line in lines[2:] if line.strip() and not line.startswith("*")]
    reader = csv.reader(data_lines)
    
    servers_by_country = {}

    for row in reader:
        if len(row) < 15:
            continue
        try:
            hostname = row[0]
            ip = row[1]
            score = int(row[2]) if row[2].isdigit() else 0
            speed = int(row[4]) if row[4].isdigit() else 0
            country_long = row[5].strip()
            country_short = row[6].strip()
            b64_config = row[14].strip()

            if not b64_config or not country_long:
                continue

            # Keep the highest scoring server per country
            if country_short not in servers_by_country or score > servers_by_country[country_short]["score"]:
                servers_by_country[country_short] = {
                    "hostname": hostname,
                    "ip": ip,
                    "score": score,
                    "speed_mbps": round(speed / (1024 * 1024), 1),
                    "country_long": country_long,
                    "country_short": country_short,
                    "b64_config": b64_config
                }
        except Exception as ex:
            continue

    saved_profiles = []
    # Pick top 6 servers by speed/score
    sorted_servers = sorted(servers_by_country.values(), key=lambda x: x["score"], reverse=True)[:6]

    for s in sorted_servers:
        clean_country = re.sub(r"[^a-zA-Z0-9_]", "_", s["country_long"])
        filename = f"VPNGate_{clean_country}_{s['country_short']}.ovpn"
        dest_path = DEST_DIR / filename

        try:
            raw_ovpn = base64.b64decode(s["b64_config"]).decode("utf-8", errors="ignore")
            dest_path.write_text(raw_ovpn, encoding="utf-8")
            print(f"Saved: {filename} ({s['country_long']} - {s['speed_mbps']} Mbps)")
            saved_profiles.append(filename)
        except Exception as e:
            print(f"Error saving {filename}: {e}")

    return saved_profiles

if __name__ == "__main__":
    profiles = fetch_and_save_vpns()
    print(f"\nDone! Successfully saved {len(profiles)} free public VPN profiles in {DEST_DIR}")

