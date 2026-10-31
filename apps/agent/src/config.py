import os
import json
import uuid
import platform

# Use agent local directory or fallback gracefully
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.path.join(BASE_DIR, "agent_config.json")

class AgentConfig:
    def __init__(self):

        self.server_url = "http://localhost:3000"
        self.device_id = ""
        self.device_token = ""
        self.shop_id = ""
        self.shop_name = ""
        self.device_name = platform.node() or "WINDOWS-PRINT-PC"
        self.default_printer = ""
        self.poll_interval_seconds = 3
        self.agent_version = "1.0.0"
        self.mock_mode = False
        self.load()

    def load(self):
        if os.path.exists(CONFIG_PATH):
            try:
                with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.server_url = data.get("server_url", self.server_url)
                    self.device_id = data.get("device_id", self.device_id)
                    self.device_token = data.get("device_token", self.device_token)
                    self.shop_id = data.get("shop_id", self.shop_id)
                    self.shop_name = data.get("shop_name", self.shop_name)
                    self.device_name = data.get("device_name", self.device_name)
                    self.default_printer = data.get("default_printer", self.default_printer)
                    self.poll_interval_seconds = data.get("poll_interval_seconds", 3)
                    self.mock_mode = data.get("mock_mode", False)
            except Exception as e:
                print(f"[Config] Error loading config: {e}")

    def save(self):
        try:
            data = {
                "server_url": self.server_url,
                "device_id": self.device_id,
                "device_token": self.device_token,
                "shop_id": self.shop_id,
                "shop_name": self.shop_name,
                "device_name": self.device_name,
                "default_printer": self.default_printer,
                "poll_interval_seconds": self.poll_interval_seconds,
                "agent_version": self.agent_version,
                "mock_mode": self.mock_mode
            }
            with open(CONFIG_PATH, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"[Config] Error saving config: {e}")

    def is_paired(self) -> bool:
        return bool(self.device_id and self.device_token and self.shop_id)

    def clear_pairing(self):
        self.device_id = ""
        self.device_token = ""
        self.shop_id = ""
        self.shop_name = ""
        self.save()
