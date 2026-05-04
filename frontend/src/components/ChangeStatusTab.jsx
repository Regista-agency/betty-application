import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import ResultCard from "./ResultCard";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const STATUTS = [
  "À vendre",
  "Sous compromis",
  "Vendu — Acte authentique signé",
  "Offre acceptée",
];

export default function ChangeStatusTab() {
  const [biens, setBiens] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [nouveauStatut, setNouveauStatut] = useState("Sous compromis");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const fetchBiens = async () => {
    setLoadingList(true);
    try {
      const { data } = await axios.get(`${API}/biens`);
      setBiens(data);
      if (data.length > 0 && !selectedId) setSelectedId(data[0].id);
    } catch (e) {
      console.error(e);
      toast.error("Impossible de charger les biens");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchBiens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    if (!selectedId) {
      toast.error("Choisis un bien");
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.post(
        `${API}/biens/${selectedId}/change-statut`,
        { nouveau_statut: nouveauStatut }
      );
      setResult(data);
      toast.success("Statut mis à jour !");
      fetchBiens();
    } catch (e) {
      console.error(e);
      toast.error(
        e?.response?.data?.detail ||
          "Une erreur est survenue, réessaie dans quelques secondes"
      );
    } finally {
      setLoading(false);
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
      <div className="iad-card" data-testid="change-statut-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "start",
            gap: 12,
          }}
        >
          <div>
            <h2
              style={{
                color: "#1B3A6B",
                fontSize: 26,
                fontWeight: 800,
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              Changer un statut
            </h2>
            <p
              style={{
                color: "#6B7280",
                marginTop: 4,
                marginBottom: 22,
                fontSize: 14,
              }}
            >
              Sélectionne un bien existant et mets à jour son statut ✨
            </p>
          </div>
          <button
            className="iad-btn-secondary"
            onClick={fetchBiens}
            disabled={loadingList}
            data-testid="refresh-biens"
            title="Recharger depuis Google Sheets"
          >
            <RefreshCw size={14} className={loadingList ? "iad-spin" : ""} />
          </button>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <label className="iad-label">Sélectionner le bien</label>
            <select
              className="iad-select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              data-testid="bien-select"
              disabled={biens.length === 0}
            >
              {biens.length === 0 && (
                <option value="">
                  {loadingList ? "Chargement..." : "Aucun bien dans le Sheet"}
                </option>
              )}
              {biens.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label} — [{b.statut}]
                </option>
              ))}
            </select>
            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>
              {biens.length} bien(s) chargé(s) depuis Google Sheets
            </div>
          </div>

          <div>
            <label className="iad-label">Nouveau statut</label>
            <select
              className="iad-select"
              value={nouveauStatut}
              onChange={(e) => setNouveauStatut(e.target.value)}
              data-testid="nouveau-statut-select"
            >
              {STATUTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="iad-btn-primary"
            onClick={submit}
            disabled={loading || !selectedId}
            data-testid="change-statut-btn"
          >
            {loading ? (
              <>
                <span className="iad-spinner" />
                Betty met à jour... ✍️
              </>
            ) : (
              <>✨ Mettre à jour le statut</>
            )}
          </button>
        </div>
      </div>

      <div>
        <ResultCard
          result={result}
          onRegenerate={submit}
          regenerating={loading}
        />
      </div>
    </div>
  );
}
