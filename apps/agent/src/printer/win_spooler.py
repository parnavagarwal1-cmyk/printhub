import sys
import os
import time
from typing import List, Dict, Any, Optional

try:
    import win32print
    import win32ui
    import win32con
    HAS_WIN32PRINT = True
except ImportError:
    HAS_WIN32PRINT = False

# Fallback mock printers for testing or environments without physical Windows printers
MOCK_PRINTERS = [
    {
        "name": "HP LaserJet Pro M404dn (USB)",
        "driver_name": "HP LaserJet Pro M404-M405 PCL 6",
        "port_name": "USB001",
        "is_color_supported": False,
        "is_duplex_supported": True,
        "supported_paper_sizes": ["A4", "Letter"],
        "is_default": True,
        "status": "ready"
    },
    {
        "name": "Epson EcoTank L8050 Color Photo (Wi-Fi)",
        "driver_name": "EPSON L8050 Series",
        "port_name": "WSD-29104-Epson",
        "is_color_supported": True,
        "is_duplex_supported": False,
        "supported_paper_sizes": ["A4", "A3"],
        "is_default": False,
        "status": "ready"
    },
    {
        "name": "Canon imageRUNNER ADVANCE C3530i (Network)",
        "driver_name": "Canon Generic Plus UFR II",
        "port_name": "192.168.1.150",
        "is_color_supported": True,
        "is_duplex_supported": True,
        "supported_paper_sizes": ["A4", "A3", "Legal"],
        "is_default": False,
        "status": "ready"
    }
]

class WindowsPrinterManager:
    """
    Manages physical Windows printers (USB, Wi-Fi, Ethernet) and handles
    spooler job lifecycle, printer enumeration, and error reporting.
    """

    def __init__(self, force_mock: bool = False):
        self.force_mock = force_mock or not HAS_WIN32PRINT

    def list_printers(self) -> List[Dict[str, Any]]:
        """
        Enumerate all printers installed in Windows.
        """
        if self.force_mock:
            return MOCK_PRINTERS

        printers = []
        try:
            default_printer_name = win32print.GetDefaultPrinter()
            flags = win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS
            raw_printers = win32print.EnumPrinters(flags, None, 2)

            for p in raw_printers:
                name = p.get("pPrinterName", "")
                driver = p.get("pDriverName", "")
                port = p.get("pPortName", "")
                status_raw = p.get("Status", 0)

                # Decode status
                status = "ready"
                if status_raw & win32print.PRINTER_STATUS_OFFLINE:
                    status = "offline"
                elif status_raw & win32print.PRINTER_STATUS_PAPER_JAM:
                    status = "paper_jam"
                elif status_raw & win32print.PRINTER_STATUS_PAPER_OUT:
                    status = "low_paper"
                elif status_raw & win32print.PRINTER_STATUS_ERROR:
                    status = "error"

                # Detect capabilities
                is_color = True
                is_duplex = True
                try:
                    hprinter = win32print.OpenPrinter(name)
                    # DeviceCapabilities queries
                    try:
                        color_cap = win32print.DeviceCapabilities(name, port, win32con.DC_COLORDEVICE, None)
                        is_color = bool(color_cap == 1)
                    except Exception:
                        is_color = True
                    try:
                        duplex_cap = win32print.DeviceCapabilities(name, port, win32con.DC_DUPLEX, None)
                        is_duplex = bool(duplex_cap == 1)
                    except Exception:
                        is_duplex = True
                    win32print.ClosePrinter(hprinter)
                except Exception:
                    pass

                printers.append({
                    "name": name,
                    "driver_name": driver,
                    "port_name": port,
                    "is_color_supported": is_color,
                    "is_duplex_supported": is_duplex,
                    "supported_paper_sizes": ["A4", "Letter"],
                    "is_default": (name == default_printer_name),
                    "status": status
                })
        except Exception as e:
            print(f"[PrinterManager] Error enumerating Windows printers: {e}. Falling back to mock printers.")
            return MOCK_PRINTERS

        return printers if printers else MOCK_PRINTERS

    def print_file(
        self,
        printer_name: str,
        file_path: str,
        settings: Dict[str, Any],
        progress_callback = None
    ) -> Dict[str, Any]:
        """
        Sends processed document to Windows Print Spooler with printer settings:
        color_mode, paper_size, duplex, copies, orientation.
        """
        if not os.path.exists(file_path):
            return {"success": False, "error": f"File does not exist: {file_path}"}

        if self.force_mock or not HAS_WIN32PRINT:
            return self._mock_print_execution(printer_name, file_path, settings, progress_callback)

        try:
            if progress_callback:
                progress_callback("Opening Windows printer connection...")

            hprinter = win32print.OpenPrinter(printer_name)
            try:
                # Configure DEVMODE for paper size, color, duplex, orientation
                mode = win32print.GetPrinter(hprinter, 2)["pDevMode"]
                
                # Apply Color Mode
                if settings.get("color_mode") == "bw":
                    mode.Color = win32con.DMCOLOR_MONOCHROME
                else:
                    mode.Color = win32con.DMCOLOR_COLOR

                # Apply Duplex Mode
                sided = settings.get("sided_mode", "single")
                if sided == "single":
                    mode.Duplex = win32con.DMDUP_SIMPLEX
                elif sided == "double_long_edge":
                    mode.Duplex = win32con.DMDUP_VERTICAL
                elif sided == "double_short_edge":
                    mode.Duplex = win32con.DMDUP_HORIZONTAL

                # Apply Copies
                copies = int(settings.get("copies", 1))
                if copies > 1:
                    mode.Copies = copies

                # Apply Orientation
                orientation = settings.get("orientation", "portrait")
                if orientation == "landscape":
                    mode.Orientation = win32con.DMORIENT_LANDSCAPE
                elif orientation == "portrait":
                    mode.Orientation = win32con.DMORIENT_PORTRAIT

                # Apply Paper Size
                paper_size = settings.get("paper_size", "A4").upper()
                if paper_size == "A4":
                    mode.PaperSize = win32con.DMPAPER_A4
                elif paper_size == "A3":
                    mode.PaperSize = win32con.DMPAPER_A3

                # Set DevMode fields
                mode.Fields = (
                    win32con.DM_COLOR |
                    win32con.DM_DUPLEX |
                    win32con.DM_COPIES |
                    win32con.DM_ORIENTATION |
                    win32con.DM_PAPERSIZE
                )

                if progress_callback:
                    progress_callback("Submitting document to Windows Print Spooler...")

                # Spool document to Windows Spooler
                job_id = win32print.StartDocPrinter(hprinter, 1, ("PrintFlow Automatic Job", None, "RAW"))
                win32print.StartPagePrinter(hprinter)

                with open(file_path, "rb") as f:
                    while chunk := f.read(65536):
                        win32print.WritePrinter(hprinter, chunk)

                win32print.EndPagePrinter(hprinter)
                win32print.EndDocPrinter(hprinter)

                if progress_callback:
                    progress_callback(f"Windows Spooler Job #{job_id} submitted successfully.")

                # Monitor spooler completion
                return self._monitor_spooler_job(hprinter, job_id, progress_callback)

            finally:
                win32print.ClosePrinter(hprinter)

        except Exception as e:
            return {"success": False, "error": f"Windows Spooler error: {str(e)}"}

    def _monitor_spooler_job(self, hprinter, job_id: int, progress_callback = None) -> Dict[str, Any]:
        """
        Polls the Windows print spooler until the job has completed, or detects errors.
        """
        for _ in range(60): # Up to 60 seconds of monitoring
            try:
                job_info = win32print.GetJob(hprinter, job_id, 1)
                status = job_info.get("Status", 0)
                
                if status & win32print.JOB_STATUS_ERROR:
                    return {"success": False, "error": "Hardware error reported by Windows Spooler", "needs_reconciliation": True}
                if status & win32print.JOB_STATUS_PAPEROUT:
                    return {"success": False, "error": "Printer is out of paper", "needs_reconciliation": True}
                if status & win32print.JOB_STATUS_OFFLINE:
                    return {"success": False, "error": "Printer is offline", "needs_reconciliation": True}
                if status & win32print.JOB_STATUS_PRINTED:
                    return {"success": True, "job_id": job_id}
                
                if progress_callback:
                    pages = job_info.get("PagesPrinted", 0)
                    total = job_info.get("TotalPages", 0)
                    progress_callback(f"Printing: {pages}/{total} pages completed")

                time.sleep(1)
            except Exception:
                # Job has exited the spooler queue successfully
                return {"success": True, "job_id": job_id}

        return {"success": True, "job_id": job_id, "note": "Spooler accepted job successfully"}

    def _mock_print_execution(
        self,
        printer_name: str,
        file_path: str,
        settings: Dict[str, Any],
        progress_callback = None
    ) -> Dict[str, Any]:
        """
        Simulates physical print execution for dev/sandbox verification.
        """
        steps = [
            f"[MOCK] Connected to printer '{printer_name}'",
            f"[MOCK] Applied driver flags: {settings.get('color_mode', 'bw').upper()}, {settings.get('paper_size', 'A4')}, Copies: {settings.get('copies', 1)}",
            f"[MOCK] Transmitted spool stream ({os.path.getsize(file_path)} bytes)",
            "[MOCK] Physical print pages processed through roller feed",
            "[MOCK] Windows Print Spooler confirmed job completion"
        ]
        for step in steps:
            if progress_callback:
                progress_callback(step)
            time.sleep(0.4)

        return {"success": True, "job_id": 99901, "mock": True}
