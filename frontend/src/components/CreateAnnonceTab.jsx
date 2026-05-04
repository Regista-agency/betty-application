import React, { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import PhotoUpload from "./PhotoUpload";
import ResultCard from "./ResultCard";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TYPES = [
  "Maison individuelle",
  "Maison semi-individuelle",
  "Appartement",
  "Immeuble de rapport",
  "Terrain",
];

const STATUTS = [
  "À vendre",
  "Sous compromis",
  "Vendu — Acte authentique signé",
  "Offre acceptée",
];

const TONS = [
  "Familial & cocooning",
  "Coup de cœur émotionnel",
  "Investisseur",
  "Neutre et informatif",
];

const emptyForm = {
  type_bien: "Maison individuelle",
  statut: "À vendre",
  ville: "",
  surface: "",
  pieces: "",
  chambres: "",
  prix: "",
  etage: "",
  points_forts: "",
  infos_complementaires: "",
  ton: "Familial & cocooning",
};

export default function CreateAnnonceTab() {
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [result, setResult] = useState(null);

  const setField = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const uploadPhotosIfAny = async () => {
    if (files.length === 0) return { folder_id: "", folder_url: "", photo_urls: [] };
    const fd = new FormData();
    fd.append("ville", form.ville || "Sans ville");
    fd.append("type_bien", form.type_bien);
    files.forEach(({ file }) => fd.append("files", file));
    const { data } = await axios.post(`${API}/photos/upload`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  };

  const generate = async (regen = false) => {
    if (!form.ville.trim()) {
      toast.error("Merci de renseigner la ville");
      return;
    }
    if (regen) setRegenerating(true);
    else setLoading(true);

    try {
      let photoData = { folder_id: "", folder_url: "", photo_urls: [] };
      if (!regen && files.length > 0) {
        try {
          toast("Upload des photos sur Google Drive...");
          photoData = await uploadPhotosIfAny();
        } catch (uploadErr) {
          console.error(uploadErr);
          const msg =
            uploadErr?.response?.data?.detail ||
            "L'upload Drive a échoué — l'annonce est générée sans photos.";
          toast.warning(msg, { duration: 8000 });
          photoData = { folder_id: "", folder_url: "", photo_urls: [] };
        }
      } else if (regen && result) {
        photoData = {
          folder_id: "",
          folder_url: result.drive_folder_url || "",
          photo_urls: [],
        };
      }

      const payload = {
        ...form,
        drive_folder_id: photoData.folder_id,
        drive_folder_url: photoData.folder_url,
        photo_urls: photoData.photo_urls,
      };

      const { data } = await axios.post(`${API}/biens/generate`, payload);
      setResult(data);
      toast.success("Annonce générée !");
    } catch (e) {
      console.error(e);
      toast.error(
        e?.response?.data?.detail ||
          "Une erreur est survenue, réessaie dans quelques secondes"
      );
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  };

  return (
    <div
      className="iad-two-cols"
      style={{
        display: "grid",
        gridTemplateColumns: "45% 55%",
        gap: 32,
        padding: 32,
        maxWidth: 1440,
        margin: "0 auto",
      }}
    >
      {/* LEFT: form */}
      <div className="iad-card" data-testid="form-card">
        <h2
          style={{
            color: "#1B3A6B",
            fontSize: 26,
            fontWeight: 800,
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Décris ton bien
        </h2>
        <p
          style={{ color: "#6B7280", marginTop: 4, marginBottom: 22, fontSize: 14 }}
        >
          Betty génère ton annonce en quelques secondes ✨
        </p>

        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <label className="iad-label">Type de bien</label>
            <select
              className="iad-select"
              value={form.type_bien}
              onChange={(e) => setField("type_bien", e.target.value)}
              data-testid="type-select"
            >
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="iad-label">Statut de l'annonce</label>
            <select
              className="iad-select"
              value={form.statut}
              onChange={(e) => setField("statut", e.target.value)}
              data-testid="statut-select"
            >
              {STATUTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="iad-label">Ville</label>
            <input
              className="iad-input"
              placeholder="ex: Raismes, Valenciennes..."
              value={form.ville}
              onChange={(e) => setField("ville", e.target.value)}
              data-testid="ville-input"
            />
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}
          >
            <div>
              <label className="iad-label">Surface (m²)</label>
              <input
                type="number"
                className="iad-input"
                value={form.surface}
                onChange={(e) => setField("surface", e.target.value)}
                data-testid="surface-input"
              />
            </div>
            <div>
              <label className="iad-label">Pièces</label>
              <input
                type="number"
                className="iad-input"
                value={form.pieces}
                onChange={(e) => setField("pieces", e.target.value)}
                data-testid="pieces-input"
              />
            </div>
            <div>
              <label className="iad-label">Chambres</label>
              <input
                type="number"
                className="iad-input"
                value={form.chambres}
                onChange={(e) => setField("chambres", e.target.value)}
                data-testid="chambres-input"
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="iad-label">Prix HAI (€)</label>
              <input
                type="number"
                className="iad-input"
                value={form.prix}
                onChange={(e) => setField("prix", e.target.value)}
                data-testid="prix-input"
              />
            </div>
            <div>
              <label className="iad-label">Étage (optionnel)</label>
              <input
                className="iad-input"
                placeholder="ex: rdc + 1 étage"
                value={form.etage}
                onChange={(e) => setField("etage", e.target.value)}
                data-testid="etage-input"
              />
            </div>
          </div>

          <div>
            <label className="iad-label">Points forts du bien</label>
            <textarea
              rows={5}
              className="iad-textarea"
              placeholder="ex: jardin 200m², garage, cuisine rénovée, double vitrage, chaudière récente..."
              value={form.points_forts}
              onChange={(e) => setField("points_forts", e.target.value)}
              data-testid="points-forts-input"
            />
          </div>

          <div>
            <label className="iad-label">Informations complémentaires</label>
            <textarea
              rows={4}
              className="iad-textarea"
              placeholder="ex: proche écoles, autoroute A2 à 5 min, quartier calme, pas de travaux..."
              value={form.infos_complementaires}
              onChange={(e) => setField("infos_complementaires", e.target.value)}
              data-testid="infos-comp-input"
            />
          </div>

          <div>
            <label className="iad-label">Ton souhaité</label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
              data-testid="ton-group"
            >
              {TONS.map((t) => (
                <div
                  key={t}
                  className={`iad-radio-card ${form.ton === t ? "selected" : ""}`}
                  onClick={() => setField("ton", t)}
                  data-testid={`ton-${t}`}
                >
                  <input
                    type="radio"
                    readOnly
                    checked={form.ton === t}
                    style={{ accentColor: "#E91E8C" }}
                  />
                  {t}
                </div>
              ))}
            </div>
          </div>

          <PhotoUpload files={files} setFiles={setFiles} />

          <button
            type="button"
            className="iad-btn-primary"
            onClick={() => generate(false)}
            disabled={loading}
            data-testid="generate-btn"
          >
            {loading ? (
              <>
                <span className="iad-spinner" />
                Betty rédige... ✍️
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Générer mon annonce Betty
              </>
            )}
          </button>
        </div>
      </div>

      {/* RIGHT: result */}
      <div>
        <ResultCard
          result={result}
          onRegenerate={() => generate(true)}
          regenerating={regenerating}
        />
      </div>
    </div>
  );
}
