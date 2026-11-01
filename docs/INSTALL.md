# 🚀 TORNET Command Center — Guida all'Installazione

> **Guida Completa di Setup per Windows 10/11, WSL2 e Docker**  
> *Versione 1.0.0 — Architettura su Disco ./TorNet*

---

## 📋 Indice
1. [Prerequisiti di Sistema](#prerequisiti-di-sistema)
2. [Installazione su Disco F:](#installazione-su-disco-f)
3. [Setup Backend Python](#setup-backend-python)
4. [Setup Frontend React](#setup-frontend-react)
5. [Setup WSL2 & Tool di Pentesting](#setup-wsl2--tool-di-pentesting)
6. [Avvio Rapido (One-Click)](#avvio-rapido-one-click)
7. [Setup Alternativo con Docker](#setup-alternativo-con-docker)
8. [Risoluzione Problemi](#risoluzione-problemi)

---

## 1. Prerequisiti di Sistema

| Componente | Minimo | Raccomandato | Note |
|---|---|---|---|
| **OS** | Windows 10 (Build 19041+) / 11 | Windows 11 Pro | Con supporto WSL2 attivo |
| **RAM** | 8 GB | 16 GB+ | Per pipeline multithread e WSL2 |
| **Spazio Disco** | 15 GB liberi su **F:** | 30 GB liberi su **F:** | Tutto il progetto è configurato per risiedere su F: |
| **Python** | Python 3.11+ (consigliato 3.12/3.14) | Python 3.11 o 3.14 | 64-bit |
| **Node.js** | Node.js v18 LTS | Node.js v20+ LTS | Con npm |

---

## 2. Installazione su Disco F:

Clonare o copiare l'albero di TORNET direttamente nella directory principale di `./TorNet`:

```powershell
git clone https://github.com/robinandreoni/TorNet.git
cd TorNet
# La cartella ./TorNet contiene:
# - backend/
# - frontend/
# - docs/
# - docker/
# - start_tornet.bat
# - start_tornet.ps1
```

---

## 3. Setup Backend Python

1. Aprire una finestra di PowerShell e posizionarsi in `./TorNet\backend`:
```powershell
cd ./TorNet\backend
```

2. Creare il virtual environment:
```powershell
python -m venv venv
```

3. Attivare il virtual environment:
```powershell
.\venv\Scripts\Activate.ps1
```

4. Installare le dipendenze:
```powershell
pip install -r requirements.txt
```

5. Verificare l'inizializzazione del database SQLite in `./TorNet\backend\data\tornet.db`:
```powershell
python -c "from app.main import app; print('Backend configurato con successo!')"
```

---

## 4. Setup Frontend React

1. Posizionarsi nella directory frontend:
```powershell
cd ./TorNet\frontend
```

2. Installare i moduli Node:
```powershell
npm install
```

3. Testare la compilazione di produzione:
```powershell
npm run build
```

---

## 5. Setup WSL2 & Tool di Pentesting

TORNET integra il bridge nativo verso WSL2 per lanciare i tool del mondo Linux (Kali Linux o Ubuntu).

1. Abilitare WSL2 su Windows (se non già attivo):
```powershell
wsl --install --no-distribution
```

2. Se si desidera importare Kali Linux direttamente su F:
```powershell
mkdir F:\WSL\kali-linux
# wsl --import kali-linux F:\WSL\kali-linux <percorso-rootfs.tar>
```

3. Installare i tool di penetration testing all'interno dell'ambiente WSL:
```bash
sudo apt-get update && sudo apt-get install -y \
  nmap nuclei nikto sqlmap gobuster subfinder httpx-toolkit whatweb scapy metasploit-framework
```

---

## 6. Avvio Rapido (One-Click)

All'interno della root del progetto `./TorNet` sono disponibili due script di avvio immediato:

- **Via file Batch:** Fare doppio clic su `start_tornet.bat`
- **Via PowerShell:**
```powershell
powershell -ExecutionPolicy Bypass -File ./TorNet\start_tornet.ps1
```

Gli script avviano contemporaneamente:
1. **Backend FastAPI** su `http://localhost:8000` (con documentazione Swagger interattiva su `/docs`)
2. **Frontend Command Center** su `http://localhost:5173`

---

## 7. Setup Alternativo con Docker

Per eseguire TORNET e i target di addestramento autorizzati (DVWA & OWASP Juice Shop) in container isolati:

```powershell
cd ./TorNet\docker
docker-compose up --build -d
```

Servizi esposti:
- **TORNET Dashboard:** `http://localhost`
- **TORNET API & WebSocket:** `http://localhost:8000`
- **Target Vulnerabile DVWA:** `http://localhost:8081`
- **Target Vulnerabile Juice Shop:** `http://localhost:3000`

---

## 8. Risoluzione Problemi

- **Porta 8000 o 5173 già in uso:** Verificare i processi attivi con `netstat -ano | findstr :8000` e terminare i vecchi processi.
- **Errore di esecuzione script PowerShell:** Eseguire `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`.
- **WSL non risponde:** Eseguire `wsl --shutdown` e riaprire il terminale WSL.


