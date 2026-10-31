import sys
import os
import time
import threading
from typing import Dict, Any, List

from config import AgentConfig
from networking.client import PrintFlowClient
from printer.win_spooler import WindowsPrinterManager
from processing.document_processor import DocumentProcessor

class PrintFlowAgentController:
    """
    Core Controller managing background polling, job downloading,
    spooler dispatch, and live UI synchronization.
    """

    def __init__(self, headless: bool = False):
        self.config = AgentConfig()
        self.client = PrintFlowClient(self.config)
        self.printer_manager = WindowsPrinterManager(force_mock=self.config.mock_mode)
        self.doc_processor = DocumentProcessor()
        self.headless = headless
        self.running = True
        self.ui = None

        self.stats = {
            "active": 0,
            "completed": 0,
            "failed": 0
        }
        self.printers: List[Dict[str, Any]] = []

    def log(self, message: str):
        print(f"[Agent] {message}")
        if self.ui:
            try:
                self.ui.append_log(message)
            except Exception:
                pass

    def manual_sync(self):
        self.log("Syncing installed Windows printers...")
        self.printers = self.printer_manager.list_printers()
        if self.config.is_paired():
            res = self.client.send_heartbeat(self.printers)
            if res.get("success"):
                self.log(f"Heartbeat sent. Synchronized {len(self.printers)} printers with server.")
            else:
                self.log(f"Heartbeat error: {res.get('error')}")

    def start_background_worker(self):
        worker_thread = threading.Thread(target=self._worker_loop, daemon=True)
        worker_thread.start()

    def _worker_loop(self):
        self.log("Background worker thread started.")
        self.manual_sync()

        heartbeat_counter = 0

        while self.running:
            try:
                # 1. Periodic Heartbeat every ~15 seconds
                heartbeat_counter += 1
                if heartbeat_counter >= 5:
                    heartbeat_counter = 0
                    if self.config.is_paired():
                        self.client.send_heartbeat(self.printers)

                # 2. Poll for Queued Jobs
                if self.config.is_paired():
                    res = self.client.fetch_queued_jobs()
                    jobs = res.get("jobs", [])
                    if jobs:
                        self.log(f"Found {len(jobs)} pending print jobs in shop queue.")
                        for job in jobs:
                            self._execute_job(job)

            except Exception as e:
                self.log(f"Worker loop exception: {e}")

            time.sleep(self.config.poll_interval_seconds)

    def _execute_job(self, job: Dict[str, Any]):
        job_id = job.get("id")
        self.stats["active"] += 1
        self.log(f"Processing Job #{job_id}...")

        # A. Transition status to 'downloading'
        self.client.update_job_status(job_id, "downloading", note="Agent began file download")

        files = job.get("files", [])
        items = job.get("items", [])
        printer_name = job.get("printer_name") or (self.printers[0]["name"] if self.printers else "Default Printer")

        job_success = True
        error_msg = None

        for item in items:
            file_id = item.get("order_file_id")
            self.log(f"Downloading document (File ID: {file_id})...")
            dl_res = self.client.download_job_file(job_id, file_id)

            if not dl_res.get("success"):
                job_success = False
                error_msg = dl_res.get("error")
                break

            downloaded_file = dl_res.get("file_path")
            processed_file = downloaded_file + "_processed.pdf"

            # B. Document Conversion & Page Filtering
            self.log("Applying page range and converting document...")
            proc_res = self.doc_processor.process_document(
                downloaded_file,
                processed_file,
                page_range=item.get("page_range", "all")
            )

            if not proc_res.get("success"):
                job_success = False
                error_msg = proc_res.get("error")
                break

            # C. Transition to 'printing'
            self.client.update_job_status(job_id, "printing", note="Sending to Windows Print Spooler")

            # D. Submit to Windows Spooler
            self.log(f"Submitting to spooler: '{printer_name}'...")
            spool_res = self.printer_manager.print_file(
                printer_name=printer_name,
                file_path=processed_file,
                settings=item,
                progress_callback=self.log
            )

            # Cleanup temp files
            try:
                if os.path.exists(downloaded_file):
                    os.remove(downloaded_file)
                if os.path.exists(processed_file):
                    os.remove(processed_file)
            except Exception:
                pass

            if not spool_res.get("success"):
                job_success = False
                error_msg = spool_res.get("error")
                if spool_res.get("needs_reconciliation"):
                    self.client.update_job_status(job_id, "needs_reconciliation", error_message=error_msg)
                    self.stats["active"] = max(0, self.stats["active"] - 1)
                    self.stats["failed"] += 1
                    return
                break

        self.stats["active"] = max(0, self.stats["active"] - 1)

        if job_success:
            self.stats["completed"] += 1
            self.log(f"Job #{job_id} successfully printed and completed!")
            self.client.update_job_status(job_id, "completed", note="Physical print completed via Spooler")
        else:
            self.stats["failed"] += 1
            self.log(f"Job #{job_id} failed: {error_msg}")
            self.client.update_job_status(job_id, "failed", error_message=error_msg)

    def run(self):
        self.start_background_worker()
        if not self.headless:
            from ui.dashboard import AgentDashboardUI
            self.ui = AgentDashboardUI(self)
            self.ui.run()
        else:
            while self.running:
                time.sleep(1)

if __name__ == "__main__":
    headless_flag = "--headless" in sys.argv
    app = PrintFlowAgentController(headless=headless_flag)
    app.run()
