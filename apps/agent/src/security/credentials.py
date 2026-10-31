import hashlib
import platform
import uuid

def generate_hardware_fingerprint() -> str:
    """
    Generates a deterministic hardware fingerprint based on system architecture,
    node name, machine type, and hardware UUID.
    """
    raw = f"{platform.node()}-{platform.machine()}-{platform.processor()}-{uuid.getnode()}"
    return "WIN-FP-" + hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16].upper()

def hash_token(token: str) -> str:
    """
    Returns SHA256 hash of device secret token for server-side verification.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def compute_file_sha256(file_path: str) -> str:
    """
    Calculates SHA256 checksum of downloaded document to ensure file integrity.
    """
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            sha256.update(chunk)
    return sha256.hexdigest()
