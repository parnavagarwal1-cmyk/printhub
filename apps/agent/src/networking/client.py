import urllib.request
import urllib.parse
import json
import os
import tempfile
from typing import Dict, Any, Optional, List
from security.credentials import generate_hardware_fingerprint, compute_file_sha256

class PrintFlowClient:
    """
    HTTP client for communication with PrintFlow SaaS API.
    Handles device authentication, heartbeats, job polling, and status reporting.
    """

    def __init__(self, config):
        self.config = config

    def _request(self, endpoint: str, data: Optional[Dict[str, Any]] = None, method: str = "GET") -> Dict[str, Any]:
        url = f"{self.config.server_url.rstrip('/')}{endpoint}"
        headers = {
            "Content-Type": "application/json",
            "User-Agent": f"PrintFlowAgent/{self.config.agent_version}"
        }
        if self.config.device_id and self.config.device_token:
            headers["X-Device-Id"] = self.config.device_id
            headers["X-Device-Token"] = self.config.device_token
            headers["X-Shop-Id"] = self.config.shop_id

        req_body = json.dumps(data).encode("utf-8") if data is not None else None
        req = urllib.request.Request(url, data=req_body, headers=headers, method=method)

        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                content = response.read().decode("utf-8")
                return json.loads(content)
        except urllib.error.HTTPError as e:
            try:
                err_body = e.read().decode("utf-8")
                err_json = json.loads(err_body)
                return {"success": False, "error": err_json.get("error", f"HTTP {e.code}")}
            except Exception:
                return {"success": False, "error": f"HTTP {e.code}: {e.reason}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def pair_device(self, pairing_pin: str) -> Dict[str, Any]:
        """
        Submits pairing PIN and hardware fingerprint to pair this Windows PC with the shop.
        """
        payload = {
            "pairing_pin": pairing_pin.strip(),
            "device_name": self.config.device_name,
            "device_fingerprint": generate_hardware_fingerprint(),
            "agent_version": self.config.agent_version
        }
        res = self._request("/api/agent/pair", data=payload, method="POST")
        if res.get("success"):
            self.config.device_id = res.get("device_id")
            self.config.device_token = res.get("device_token")
            self.config.shop_id = res.get("shop_id")
            self.config.shop_name = res.get("shop_name", "Print Shop")
            self.config.save()
        return res

    def send_heartbeat(self, printers: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Sends regular heartbeat with detected printers to the server.
        """
        if not self.config.is_paired():
            return {"success": False, "error": "Device is not paired"}

        payload = {
            "device_id": self.config.device_id,
            "shop_id": self.config.shop_id,
            "agent_version": self.config.agent_version,
            "printers": printers
        }
        return self._request("/api/agent/heartbeat", data=payload, method="POST")

    def fetch_queued_jobs(self) -> Dict[str, Any]:
        """
        Polls for authorized paid print jobs queued for this shop.
        """
        if not self.config.is_paired():
            return {"success": False, "jobs": []}

        return self._request("/api/agent/jobs", method="GET")

    def update_job_status(
        self,
        job_id: str,
        status: str,
        error_message: Optional[str] = None,
        note: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Reports state transition for a print job.
        """
        payload = {
            "job_id": job_id,
            "status": status,
            "error_message": error_message,
            "note": note
        }
        return self._request("/api/agent/jobs", data=payload, method="PATCH")

    def download_job_file(self, job_id: str, file_id: str, expected_checksum: Optional[str] = None) -> Dict[str, Any]:
        """
        Downloads the document file to a secure temporary location and validates checksum.
        """
        url = f"{self.config.server_url.rstrip('/')}/api/agent/jobs/{job_id}/download?file_id={file_id}"
        headers = {
            "X-Device-Id": self.config.device_id,
            "X-Device-Token": self.config.device_token,
            "X-Shop-Id": self.config.shop_id
        }
        req = urllib.request.Request(url, headers=headers)
        temp_dir = tempfile.gettempdir()
        local_path = os.path.join(temp_dir, f"printflow_{job_id}_{file_id}.tmp")

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                with open(local_path, "wb") as f:
                    while chunk := resp.read(65536):
                        f.write(chunk)

            # Check integrity if expected checksum provided
            if expected_checksum:
                actual_checksum = compute_file_sha256(local_path)
                if actual_checksum.lower() != expected_checksum.lower():
                    os.remove(local_path)
                    return {"success": False, "error": "File checksum validation failed"}

            return {"success": True, "file_path": local_path}
        except Exception as e:
            return {"success": False, "error": f"Download failed: {str(e)}"}
