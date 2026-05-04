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
from gcs_service import upload_photo, make_folder_slug, folder_url, health_check as gcs_health  # noqa: E402
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
        gcs = gcs_health()
        return {"status": "ok", "google_sheets": "connected", "gcs": gcs}
    except Exception as e:
        logger.exception("Health check failed")
        return {"status": "degraded", "error": str(e)}


@api_router.post("/photos/upload")
async def upload_photos(
    ville: str = Form(...),
    type_bien: str = Form(...),
    files: List[UploadFile] = File(...),
):
    file_payloads = []
    for f in files:
        content = await f.read()
        if content:
            file_payloads.append((f.filename or "photo.jpg", f.content_type or "image/jpeg", content))

    if not file_payloads:
        raise HTTPException(status_code=400, detail="Aucun fichier valide reçu")

    try:
        slug = make_folder_slug(ville, type_bien)
        photo_urls = []
        for filename, mime, content in file_payloads:
            url = upload_photo(ville, type_bien, slug, filename, content, mime)
            photo_urls.append(url)

        return {
            "folder_id": slug,
            "folder_url": folder_url(slug),
            "photo_urls": photo_urls,
        }
    except Exception as e:
        logger.exception("Upload photos failed")
        msg = str(e)
        if "does not have storage.objects.create" in msg or "403" in msg:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Accès GCS refusé. Vérifie que le bucket '{os.environ.get('GCS_BUCKET', '')}' "
                    f"existe et que le service account "
                    f"betty-288@betty-project-495316.iam.gserviceaccount.com a le rôle "
                    f"'Storage Object Admin'. L'annonce peut être générée sans photos."
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


# --------- Serve built frontend if present (production docker) ---------
_FRONTEND_DIR = os.environ.get("FRONTEND_BUILD_DIR", "/app/frontend_build")
if os.path.isdir(_FRONTEND_DIR):
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse

    app.mount(
        "/static",
        StaticFiles(directory=os.path.join(_FRONTEND_DIR, "static")),
        name="static",
    )

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_catch_all(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="Not Found")
        asset_path = os.path.join(_FRONTEND_DIR, full_path)
        if full_path and os.path.isfile(asset_path):
            return FileResponse(asset_path)
        return FileResponse(os.path.join(_FRONTEND_DIR, "index.html"))


@app.on_event("shutdown")
async def shutdown_db_client():
    mongo_client.close()
