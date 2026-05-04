"""Google Cloud Storage service using the same service account."""
import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from google.cloud import storage
from google.oauth2 import service_account

logger = logging.getLogger(__name__)

_client: Optional[storage.Client] = None


def _get_client() -> storage.Client:
    global _client
    if _client is None:
        credentials = service_account.Credentials.from_service_account_file(
            os.environ["GOOGLE_SERVICE_ACCOUNT_PATH"]
        )
        _client = storage.Client(
            credentials=credentials,
            project=credentials.project_id,
        )
    return _client


def _safe_slug(value: str, default: str = "x") -> str:
    cleaned = "".join(c if c.isalnum() or c in "-_" else "-" for c in (value or "")).strip("-")
    return cleaned or default


def upload_photo(ville: str, type_bien: str, folder_slug: str, filename: str, data: bytes, content_type: str) -> str:
    """Upload photo to GCS bucket and return public URL.

    folder_slug identifies the bien-specific folder (one per listing).
    """
    bucket_name = os.environ["GCS_BUCKET"]
    client = _get_client()
    bucket = client.bucket(bucket_name)

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
    if ext not in {"jpg", "jpeg", "png", "webp", "gif", "heic"}:
        ext = "jpg"
    object_name = f"biens/{folder_slug}/{uuid.uuid4().hex}.{ext}"

    blob = bucket.blob(object_name)
    blob.upload_from_string(data, content_type=content_type or "image/jpeg")
    # Public URL works if bucket has allUsers -> Storage Object Viewer
    return f"https://storage.googleapis.com/{bucket_name}/{object_name}"


def make_folder_slug(ville: str, type_bien: str) -> str:
    ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    return f"{_safe_slug(ville, 'ville')}-{_safe_slug(type_bien, 'type')}-{ts}"


def folder_url(folder_slug: str) -> str:
    bucket_name = os.environ["GCS_BUCKET"]
    return f"https://console.cloud.google.com/storage/browser/{bucket_name}/biens/{folder_slug}"


def health_check() -> dict:
    try:
        bucket_name = os.environ["GCS_BUCKET"]
        client = _get_client()
        bucket = client.get_bucket(bucket_name)
        return {"ok": True, "bucket": bucket.name}
    except Exception as e:
        return {"ok": False, "error": str(e)}
