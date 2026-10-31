# PrintFlow — Local Development & Setup Guide

This guide covers getting the PrintFlow SaaS platform running on your local machine, including both the Next.js web application and the Python Windows Print Agent.

---

## 1. Prerequisites
- **Node.js**: v18+ (Node v20 or v24 recommended)
- **npm** or **pnpm**
- **Python**: 3.10+ (Windows 10/11)
- Optional: Physical USB or Wi-Fi printer (Mock Mode is enabled automatically when physical printers are absent)

---

## 2. Environment Configuration
Copy the template configuration file:
```bash
cp .env.example .env.local
```

Key environment variables:
```ini
NEXT_PUBLIC_APP_URL=http://localhost:3000
PAYMENT_PROVIDER=mock
DOCUMENT_RETENTION_HOURS=24
```

---

## 3. Web Application Setup
Install dependencies and run the Next.js development server:
```bash
cd apps/web
npm install
npm run dev
```

The web application is now accessible at:
- **Landing Page**: [http://localhost:3000](http://localhost:3000)
- **Demo Shop 1**: [http://localhost:3000/p/campus-prints](http://localhost:3000/p/campus-prints)
- **Demo Shop 2**: [http://localhost:3000/p/metro-docs](http://localhost:3000/p/metro-docs)
- **Shop Owner Dashboard**: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
- **Platform Super Admin**: [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 4. Windows Print Agent Setup
Install Python dependencies:
```bash
cd apps/agent
pip install -r requirements.txt
```

Launch the Windows Print Agent:
```bash
python src/main.py
```
*(Or run `python src/main.py --headless` for headless terminal mode).*

### Pairing Agent with a Shop:
1. Open the Shop Owner Dashboard at [http://localhost:3000/dashboard](http://localhost:3000/dashboard).
2. Click **"Pair Windows PC"** to generate a single-use 6-digit PIN (e.g. `482910`).
3. In the Windows Agent GUI, click **"Pair with Shop (PIN)"**, enter the PIN, and click **"Pair Device"**.
4. The agent is now paired and automatically polls for authorized print jobs.
