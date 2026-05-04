"""Google Drive and Sheets service using Service Account authentication."""
import os
import io
import logging
from datetime import datetime, timezone
from typing import List, Dict, Optional

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

logger = logging.getLogger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets",
]

SHEET_HEADERS = [
    "id", "timestamp", "type_bien", "statut", "ville", "surface",
    "pieces", "chambres", "prix", "etage", "points_forts",
    "infos_complementaires", "ton", "drive_folder_id", "drive_folder_url",
    "photo_urls", "annonce_text", "hashtags",
]


class GoogleService:
    def __init__(self):
        self.service_account_path = os.environ["GOOGLE_SERVICE_ACCOUNT_PATH"]
        self.drive_root_folder_id = os.environ["GOOGLE_DRIVE_ROOT_FOLDER_ID"]
        self.sheet_id = os.environ["GOOGLE_SHEET_ID"]

        credentials = service_account.Credentials.from_service_account_file(
            self.service_account_path, scopes=SCOPES
        )
        self.drive = build("drive", "v3", credentials=credentials, cache_discovery=False)
        self.sheets = build("sheets", "v4", credentials=credentials, cache_discovery=False)
        self._headers_ensured = False

    # ---------- DRIVE ----------
    def create_folder(self, name: str) -> Dict[str, str]:
        metadata = {
            "name": name,
            "mimeType": "application/vnd.google-apps.folder",
            "parents": [self.drive_root_folder_id],
        }
        folder = (
            self.drive.files()
            .create(body=metadata, fields="id, webViewLink", supportsAllDrives=True)
            .execute()
        )
        folder_id = folder["id"]
        # Make it publicly readable
        try:
            self.drive.permissions().create(
                fileId=folder_id,
                body={"role": "reader", "type": "anyone"},
                supportsAllDrives=True,
            ).execute()
        except Exception as e:
            logger.warning(f"Could not set public permission on folder: {e}")
        return {"id": folder_id, "url": folder.get("webViewLink", "")}

    def upload_image(
        self, folder_id: str, filename: str, content: bytes, mime_type: str
    ) -> Dict[str, str]:
        metadata = {"name": filename, "parents": [folder_id]}
        media = MediaIoBaseUpload(io.BytesIO(content), mimetype=mime_type, resumable=False)
        uploaded = (
            self.drive.files()
            .create(
                body=metadata,
                media_body=media,
                fields="id, webViewLink, webContentLink",
                supportsAllDrives=True,
            )
            .execute()
        )
        file_id = uploaded["id"]
        # Make it publicly readable
        try:
            self.drive.permissions().create(
                fileId=file_id,
                body={"role": "reader", "type": "anyone"},
                supportsAllDrives=True,
            ).execute()
        except Exception as e:
            logger.warning(f"Could not set public permission on file: {e}")
        public_url = f"https://drive.google.com/uc?id={file_id}"
        return {
            "id": file_id,
            "view_url": uploaded.get("webViewLink", ""),
            "public_url": public_url,
        }

    # ---------- SHEETS ----------
    def ensure_headers(self):
        if self._headers_ensured:
            return
        try:
            result = (
                self.sheets.spreadsheets()
                .values()
                .get(spreadsheetId=self.sheet_id, range="A1:R1")
                .execute()
            )
            values = result.get("values", [])
            if not values or values[0] != SHEET_HEADERS:
                self.sheets.spreadsheets().values().update(
                    spreadsheetId=self.sheet_id,
                    range="A1",
                    valueInputOption="RAW",
                    body={"values": [SHEET_HEADERS]},
                ).execute()
            self._headers_ensured = True
        except Exception as e:
            logger.error(f"ensure_headers failed: {e}")
            raise

    def append_row(self, row: Dict) -> None:
        self.ensure_headers()
        values = [[str(row.get(h, "")) for h in SHEET_HEADERS]]
        self.sheets.spreadsheets().values().append(
            spreadsheetId=self.sheet_id,
            range="A1",
            valueInputOption="RAW",
            insertDataOption="INSERT_ROWS",
            body={"values": values},
        ).execute()

    def list_biens(self) -> List[Dict]:
        self.ensure_headers()
        result = (
            self.sheets.spreadsheets()
            .values()
            .get(spreadsheetId=self.sheet_id, range="A2:R10000")
            .execute()
        )
        rows = result.get("values", [])
        biens = []
        for idx, r in enumerate(rows, start=2):  # sheet row starts at 2
            padded = r + [""] * (len(SHEET_HEADERS) - len(r))
            bien = dict(zip(SHEET_HEADERS, padded))
            bien["_sheet_row"] = idx
            biens.append(bien)
        return biens

    def get_bien(self, bien_id: str) -> Optional[Dict]:
        for b in self.list_biens():
            if b.get("id") == bien_id:
                return b
        return None

    def update_bien_fields(self, sheet_row: int, updates: Dict[str, str]) -> None:
        """Update specific columns for a given row."""
        self.ensure_headers()
        for key, value in updates.items():
            if key not in SHEET_HEADERS:
                continue
            col_idx = SHEET_HEADERS.index(key)
            col_letter = _col_letter(col_idx + 1)
            self.sheets.spreadsheets().values().update(
                spreadsheetId=self.sheet_id,
                range=f"{col_letter}{sheet_row}",
                valueInputOption="RAW",
                body={"values": [[value]]},
            ).execute()


def _col_letter(n: int) -> str:
    s = ""
    while n > 0:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


_instance: Optional[GoogleService] = None


def get_google_service() -> GoogleService:
    global _instance
    if _instance is None:
        _instance = GoogleService()
    return _instance
