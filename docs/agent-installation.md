# PrintFlow Windows Print Agent — Installation & Packaging Guide

The **PrintFlow Agent** is a native Windows desktop daemon that connects physical USB and Wi-Fi printers installed on shop computers directly to the PrintFlow SaaS cloud queue.

---

## 1. System Requirements
- Windows 10 or Windows 11 (64-bit)
- Python 3.10+ (if running from source)
- Local printer drivers installed in Windows Settings / Control Panel

---

## 2. Running from Source

1. Clone or extract the repository onto the Windows shop computer.
2. Navigate to `apps/agent`:
   ```cmd
   cd apps\agent
   ```
3. Install required packages:
   ```cmd
   pip install -r requirements.txt
   ```
4. Start the Agent application:
   ```cmd
   python src\main.py
   ```

---

## 3. Desktop Application Features
- **Printers Tab**: Lists all local USB and networked Wi-Fi/Ethernet printers discovered via Windows `EnumPrinters`. Shows color support, duplex support, and live spooler status.
- **Activity Log Tab**: Real-time log of downloaded documents, DEVMODE driver flag configurations, and spooler transmissions.
- **Pair with Shop (PIN)**: Simple single-step pairing using the 6-digit PIN displayed on your PrintFlow Shop Owner Dashboard.
- **Mock Mode**: When running on development machines without physical printers, the agent includes an integrated mock printer engine for continuous testing.

---

## 4. Packaging Standalone Windows `.exe` with PyInstaller

To produce a single, portable Windows executable installer for shop owners:

1. Install PyInstaller:
   ```cmd
   pip install pyinstaller
   ```
2. Build executable:
   ```cmd
   pyinstaller --name "PrintFlowAgent" --windowed --onefile --icon="assets\icon.ico" src\main.py
   ```
3. The compiled binary will be located at:
   `apps\agent\dist\PrintFlowAgent.exe`

4. Copy `PrintFlowAgent.exe` to any Windows shop computer. No Python installation required!
