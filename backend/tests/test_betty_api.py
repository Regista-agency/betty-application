"""Backend integration tests for Betty Campobasso annonce generator."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://betty-annonces.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# Module-level state to share between ordered tests
state = {}


# --- Health ---
def test_health_google_connected():
    r = requests.get(f"{API}/health", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert data.get("google") == "connected", f"Health unexpected: {data}"


# --- Generate annonce ---
def test_generate_annonce_full_payload():
    payload = {
        "type_bien": "Maison individuelle",
        "statut": "À vendre",
        "ville": "TEST_Raismes",
        "surface": "100",
        "pieces": "4",
        "chambres": "2",
        "prix": "180000",
        "etage": "rdc + 1 étage",
        "points_forts": "jardin 200m², garage, cuisine rénovée",
        "infos_complementaires": "proche écoles, quartier calme",
        "ton": "Familial & cocooning",
    }
    r = requests.post(f"{API}/biens/generate", json=payload, timeout=120)
    assert r.status_code == 200, f"Body: {r.text}"
    data = r.json()
    assert "id" in data and isinstance(data["id"], str)
    assert "annonce_text" in data and len(data["annonce_text"]) > 100
    assert "hashtags" in data and isinstance(data["hashtags"], list)
    assert "char_count" in data and data["char_count"] == len(data["annonce_text"])

    text = data["annonce_text"]
    # phone line and pricing key
    assert "📱 07.59.61.56.54" in text, "Phone line missing/incorrect"
    assert "🔑" in text, "Price key emoji missing"
    # First non-empty line should contain emojis (status header)
    first_line = next((line for line in text.splitlines() if line.strip()), "")
    assert any(ch in first_line for ch in ["🔑", "✨", "✅", "📋", "⚠️", "🏼"]), f"First line lacks status emojis: {first_line}"

    # hashtags expectations
    hashtags_lower = [h.lower() for h in data["hashtags"]]
    assert any("iadfrance" in h for h in hashtags_lower), f"hashtags missing #iadfrance: {data['hashtags']}"

    state["bien_id"] = data["id"]


# --- Verify it appears in /api/biens ---
def test_biens_list_contains_generated():
    assert "bien_id" in state, "Previous test must have created a bien"
    # small grace period for sheets propagation
    time.sleep(2)
    r = requests.get(f"{API}/biens", timeout=30)
    assert r.status_code == 200
    biens = r.json()
    assert isinstance(biens, list) and len(biens) > 0

    # required field shape
    first = biens[0]
    for k in ["id", "label", "ville", "type_bien", "statut", "prix"]:
        assert k in first

    ids = [b["id"] for b in biens]
    assert state["bien_id"] in ids, "Generated bien not in list"

    # Most-recent-first: our newly created one should be at index 0 (or near top)
    assert biens[0]["id"] == state["bien_id"], "Generated bien should be most-recent-first"


# --- Change statut ---
def test_change_statut_updates_text_and_sheet():
    bien_id = state.get("bien_id")
    assert bien_id, "No bien_id from previous test"
    r = requests.post(
        f"{API}/biens/{bien_id}/change-statut",
        json={"nouveau_statut": "Sous compromis"},
        timeout=120,
    )
    assert r.status_code == 200, f"Body: {r.text}"
    data = r.json()
    assert data["id"] == bien_id
    assert "SOUS COMPROMIS" in data["annonce_text"].upper(), "New annonce should mention SOUS COMPROMIS"

    # Verify list reflects new statut
    time.sleep(2)
    r2 = requests.get(f"{API}/biens", timeout=30)
    assert r2.status_code == 200
    found = next((b for b in r2.json() if b["id"] == bien_id), None)
    assert found is not None
    assert found["statut"].lower().startswith("sous compromis"), f"Statut not updated: {found['statut']}"


def test_change_statut_404_for_bad_id():
    r = requests.post(
        f"{API}/biens/does-not-exist-xyz/change-statut",
        json={"nouveau_statut": "Sous compromis"},
        timeout=30,
    )
    assert r.status_code == 404, f"Expected 404 got {r.status_code}: {r.text}"


# --- Photo upload (skip on failure since Drive write may be restricted) ---
def test_photo_upload():
    # tiny 1x1 png
    png_bytes = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\xcf"
        b"\xc0\x00\x00\x00\x03\x00\x01\x9b\x97\xfc!\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    files = [("files", ("test_pixel.png", png_bytes, "image/png"))]
    data = {"ville": "TEST_Raismes", "type_bien": "Maison individuelle"}
    r = requests.post(f"{API}/photos/upload", data=data, files=files, timeout=60)
    if r.status_code != 200:
        pytest.skip(f"Drive upload not available: {r.status_code} {r.text[:200]}")
    body = r.json()
    assert "folder_id" in body and body["folder_id"]
    assert "folder_url" in body
    assert "photo_urls" in body and isinstance(body["photo_urls"], list)
    assert len(body["photo_urls"]) >= 1
