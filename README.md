# PrintFlow — Multi-Tenant QR Automated Printing SaaS

**PrintFlow** is a complete, production-grade self-service automated document printing SaaS platform. 

It enables customers to scan a permanent shop QR code with their smartphones, upload documents (PDF, DOCX, JPG, PNG), configure print options (B&W/Color, single/duplex, page ranges, copies), pay via dynamic UPI, and have their documents automatically print on connected USB or Wi-Fi printers via a native Windows desktop agent.

---

## Architecture Highlights

```
                                  [ Customer Smartphone ]
                                             |
                                  1. Scan Shop QR Code
                                             |
                                             v
[ Cloud Web Application ] <--------> [ Supabase PostgreSQL + Private Storage ]
 (Next.js 14 App Router)                     |
           |                                 | Real-time Event Queue
           | 2. Dynamic UPI QR               v
           v                     [ Windows PrintFlow Desktop Agent ]
  [ Payment Gateway ]                        |
  (Razorpay / Cashfree)                      | 3. Windows Spooler / win32print
           | Signed Webhook                  v
           +---------------------> [ Physical Printer: USB / Wi-Fi ]
```

---

## Key Features

1. **Strict Multi-Tenant Isolation**:
   - Each shop has a unique ID, public URL (`/p/[slug]`), permanent QR code, pricing rules, orders, and connected printers.
   - Tenant data isolation enforced via Supabase Row Level Security (RLS) policies.

2. **Mobile-First Customer Portal**:
   - Drag-and-drop document upload (PDF, DOCX, JPG, JPEG, PNG).
   - Accurate billable page counting using `pdf-lib` and image aspect-ratio normalization.
   - Interactive configuration: Color mode, Duplex mode, Copies, Paper Size, and Custom Page Ranges.
   - Live price breakdown calculated authoritatively on the backend.
   - Dynamic UPI payment QR generation.
   - Live real-time printing status page with animated steps (`queued` -> `downloading` -> `printing` -> `completed`).

3. **Shop Owner Dashboard (`/dashboard`)**:
   - Real-time revenue, order stats, and total printed page metrics.
   - Live Windows printer manager (USB & Wi-Fi printers, status pills, default printer switcher).
   - Connected Windows PC fleet monitor with single-use 6-digit pairing PIN generator.
   - Permanent Shop QR code generator with instant PNG download.
   - Dynamic pricing manager: B&W/Color rates, duplex discounts, A3 multipliers, minimum order amounts, and GST.

4. **Platform Super Admin Dashboard (`/admin`)**:
   - Global multi-tenant shop directory with activation and suspension controls.
   - Cross-platform revenue and spooler volume analytics.
   - Windows agent fleet health monitor.

5. **Windows Desktop Print Agent (`apps/agent`)**:
   - Python desktop application with PySide6 / Tkinter dual GUI.
   - Windows printer enumeration via `win32print` (`EnumPrinters`), detecting port types (USB, WSD, IP) and status flags.
   - Device pairing using secure PIN and hardware fingerprinting (`WIN-FP-...`).
   - Outbound secure polling / WebSocket connection with regular heartbeats.
   - Downloads documents via secure signed URLs with SHA256 integrity validation.
   - Configures Windows `DEVMODE` driver flags for color, duplex, orientation, copies, and paper size.
   - Integrated Mock Printer engine for local dev and cross-platform automated testing.

---

## Directory Structure

```
printflow/
  apps/
    web/                   # Next.js 14 App Router SaaS Platform
      app/
        p/[slug]/          # Customer Mobile Portal & Live Tracker
        dashboard/         # Shop Owner Dashboard
        admin/             # Super Admin Dashboard
        api/               # 14 REST Endpoints (Orders, Upload, Pay, Agent)
      lib/                 # Database store, Supabase, utilities
    agent/                 # Python Windows Desktop Print Agent
      src/
        ui/                # Desktop GUI Dashboard
        printer/           # Windows Spooler integration (win32print)
        processing/        # PDF/Image/DOCX normalization
        networking/        # Outbound HTTP Client & Heartbeats
        security/          # Hardware fingerprinting & SHA256 checksums
  packages/
    shared/                # TypeScript shared types & pricing tests
  supabase/
    migrations/            # Complete PostgreSQL DDL with RLS & Triggers
    seed.sql               # Demo profiles, shops, devices & printers
  docs/
    architecture.md        # Complete system architecture specifications
    setup.md               # Local development setup instructions
    deployment.md          # Vercel & Supabase production deployment guide
    agent-installation.md  # Windows Agent installation & PyInstaller build
    payment-setup.md       # Razorpay / Cashfree webhook integration
  .env.example             # Environment configuration template
  package.json             # Root monorepo workspace configuration
```

---

## Quick Start

### 1. Run Web Application:
```bash
cd apps/web
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Run Windows Print Agent:
```bash
cd apps/agent
pip install -r requirements.txt
python src/main.py
```
*(Or run `python src/main.py --headless` for background terminal mode).*

### 3. Run Automated Tests:
```bash
node packages/shared/tests/pricing.test.js
```
