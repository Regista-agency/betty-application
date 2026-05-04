from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
from pathlib import Path
import os
import json
import logging
import uuid
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from google_services import get_google_service  # noqa: E402
from llm_service import generate_annonce  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Mongo (kept for future use but not required for this app)
mongo_url = os.environ["MONGO_URL"]
mongo_client = AsyncIOMotorClient(mongo_url)
db = mongo_client[os.environ["DB_NAME"]]

app = FastAPI(title="Betty Campobasso - Générateur d'annonces")
api_router = APIRouter(prefix="/api")


# ---------- MODELS ----------
class GenerateRequest(BaseModel):
    type_bien: str
    statut: str
    ville: str
    surface: Optional[str] = ""
    pieces: Optional[str] = ""
    chambres: Optional[str] = ""
    prix: Optional[str] = ""
    etage: Optional[str] = ""
    points_forts: Optional[str] = ""
    infos_complementaires: Optional[str] = ""
    ton: Optional[str] = "Neutre et informatif"
    drive_folder_id: Optional[str] = ""
    drive_folder_url: Optional[str] = ""
    photo_urls: List[str] = Field(default_factory=list)


class GenerateResponse(BaseModel):
    id: str
    annonce_text: str
    hashtags: List[str]
    char_count: int
    drive_folder_url: Optional[str] = ""


class BienListItem(BaseModel):
    id: str
    label: str
    ville: str
    type_bien: str
    statut: str
    prix: str


class ChangeStatutRequest(BaseModel):
    nouveau_statut: str


# ---------- HELPERS ----------
HASHTAG_RE = re.compile(r"#[\w\u00C0-\u017F]+", re.UNICODE)


def extract_hashtags(text: str) -> List[str]:
    return list(dict.fromkeys(HASHTAG_RE.findall(text)))


# ---------- ROUTES ----------
@api_router.get("/")
async def root():
    return {"status": "ok", "app": "Betty Campobasso - Générateur d'annonces"}


@api_router.get("/health")
async def health():
    try:
        gs = get_google_service()
        gs.ensure_headers()
        return {"status": "ok", "google": "connected"}
    except Exception as e:
        logger.exception("Health check failed")
        return {"status": "degraded", "google_error": str(e)}


@api_router.post("/photos/upload")
async def upload_photos(
    ville: str = Form(...),
    type_bien: str = Form(...),
    files: List[UploadFile] = File(...),
):
    # Read all files first so we can reject if empty
    file_payloads = []
    for f in files:
        content = await f.read()
        if content:
            file_payloads.append((f.filename or "photo.jpg", f.content_type or "image/jpeg", content))

    if not file_payloads:
        raise HTTPException(status_code=400, detail="Aucun fichier valide reçu")

    try:
        gs = get_google_service()
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        folder_name = f"{ville} - {type_bien} - {timestamp}"
        folder = gs.create_folder(folder_name)

        photo_urls = []
        for filename, mime, content in file_payloads:
            uploaded = gs.upload_image(folder["id"], filename, content, mime)
            photo_urls.append(uploaded["public_url"])

        return {
            "folder_id": folder["id"],
            "folder_url": folder["url"],
            "photo_urls": photo_urls,
        }
    except Exception as e:
        logger.exception("Upload photos failed")
        msg = str(e)
        if "storageQuotaExceeded" in msg or "do not have storage quota" in msg:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Les Service Accounts Google ne peuvent stocker de fichiers que dans un "
                    "Shared Drive (Google Workspace). Le dossier Drive actuel est un Drive personnel. "
                    "Solution: crée un Shared Drive et partage-le avec le service account, puis mets "
                    "à jour GOOGLE_DRIVE_ROOT_FOLDER_ID. L'annonce peut être générée sans photos."
                ),
            )
        raise HTTPException(status_code=500, detail=f"Upload échoué: {msg}")


@api_router.post("/biens/generate", response_model=GenerateResponse)
async def biens_generate(payload: GenerateRequest):
    try:
        annonce_text = await generate_annonce(payload.model_dump())
        hashtags = extract_hashtags(annonce_text)
        bien_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()

        gs = get_google_service()
        row = {
            "id": bien_id,
            "timestamp": now_iso,
            "type_bien": payload.type_bien,
            "statut": payload.statut,
            "ville": payload.ville,
            "surface": payload.surface or "",
            "pieces": payload.pieces or "",
            "chambres": payload.chambres or "",
            "prix": payload.prix or "",
            "etage": payload.etage or "",
            "points_forts": payload.points_forts or "",
            "infos_complementaires": payload.infos_complementaires or "",
            "ton": payload.ton or "",
            "drive_folder_id": payload.drive_folder_id or "",
            "drive_folder_url": payload.drive_folder_url or "",
            "photo_urls": json.dumps(payload.photo_urls, ensure_ascii=False),
            "annonce_text": annonce_text,
            "hashtags": " ".join(hashtags),
        }
        gs.append_row(row)

        return GenerateResponse(
            id=bien_id,
            annonce_text=annonce_text,
            hashtags=hashtags,
            char_count=len(annonce_text),
            drive_folder_url=payload.drive_folder_url or "",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Generate annonce failed")
        raise HTTPException(status_code=500, detail=f"Génération échouée: {e}")


@api_router.get("/biens", response_model=List[BienListItem])
async def biens_list():
    try:
        gs = get_google_service()
        biens = gs.list_biens()
        result = []
        for b in biens:
            if not b.get("id"):
                continue
            label = f"{b.get('ville', '')} - {b.get('type_bien', '')} - {b.get('prix', '')}€"
            result.append(
                BienListItem(
                    id=b["id"],
                    label=label,
                    ville=b.get("ville", ""),
                    type_bien=b.get("type_bien", ""),
                    statut=b.get("statut", ""),
                    prix=b.get("prix", ""),
                )
            )
        # Most recent first
        result.reverse()
        return result
    except Exception as e:
        logger.exception("List biens failed")
        raise HTTPException(status_code=500, detail=f"Lecture Sheet échouée: {e}")


@api_router.post("/biens/{bien_id}/change-statut", response_model=GenerateResponse)
async def biens_change_statut(bien_id: str, payload: ChangeStatutRequest):
    try:
        gs = get_google_service()
        bien = gs.get_bien(bien_id)
        if not bien:
            raise HTTPException(status_code=404, detail="Bien introuvable")

        fields = {
            "type_bien": bien.get("type_bien", ""),
            "statut": payload.nouveau_statut,
            "ville": bien.get("ville", ""),
            "surface": bien.get("surface", ""),
            "pieces": bien.get("pieces", ""),
            "chambres": bien.get("chambres", ""),
            "prix": bien.get("prix", ""),
            "etage": bien.get("etage", ""),
            "points_forts": bien.get("points_forts", ""),
            "infos_complementaires": bien.get("infos_complementaires", ""),
            "ton": bien.get("ton", ""),
        }

        annonce_text = await generate_annonce(fields)
        hashtags = extract_hashtags(annonce_text)
        now_iso = datetime.now(timezone.utc).isoformat()

        gs.update_bien_fields(
            int(bien["_sheet_row"]),
            {
                "statut": payload.nouveau_statut,
                "annonce_text": annonce_text,
                "hashtags": " ".join(hashtags),
                "timestamp": now_iso,
            },
        )

        return GenerateResponse(
            id=bien_id,
            annonce_text=annonce_text,
            hashtags=hashtags,
            char_count=len(annonce_text),
            drive_folder_url=bien.get("drive_folder_url", ""),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Change statut failed")
        raise HTTPException(status_code=500, detail=f"Changement échoué: {e}")


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    mongo_client.close()
