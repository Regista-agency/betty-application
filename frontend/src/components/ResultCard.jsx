import React, { useState } from "react";
import { Copy, RefreshCw, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function ResultCard({ result, onRegenerate, regenerating }) {
  const [copied, setCopied] = useState(false);

  if (!result) {
    return (
      <div
        data-testid="result-empty"
        style={{
          background: "#EBF0F8",
          border: "2px dashed #1B3A6B",
          borderRadius: 12,
          padding: 40,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 420,
        }}
      >
        <Sparkles size={48} color="#1B3A6B" style={{ opacity: 0.5 }} />
        <div
          style={{
            marginTop: 14,
            fontSize: 18,
            fontWeight: 600,
            color: "#475569",
          }}
        >
          Ton annonce apparaîtra ici
        </div>
        <div style={{ marginTop: 6, fontSize: 14, color: "#94A3B8" }}>
          Remplis le formulaire et clique sur Générer
        </div>
      </div>
    );
  }

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(result.annonce_text);
      setCopied(true);
      toast.success("Annonce copiée !");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  return (
    <div className="iad-card iad-fade-in" data-testid="result-card">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <div className="iad-badge-success" data-testid="result-badge">
          <Check size={14} /> Annonce générée
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="iad-btn-secondary"
            onClick={copyText}
            data-testid="copy-btn"
          >
            <Copy size={14} /> {copied ? "Copié" : "Copier"}
          </button>
          <button
            type="button"
            className="iad-btn-blue"
            onClick={onRegenerate}
            disabled={regenerating}
            data-testid="regenerate-btn"
          >
            <RefreshCw size={14} className={regenerating ? "iad-spin" : ""} />{" "}
            {regenerating ? "..." : "Régénérer"}
          </button>
        </div>
      </div>

      <div
        className="iad-annonce-text"
        data-testid="annonce-text"
        style={{
          background: "#FAFBFC",
          borderRadius: 10,
          padding: 18,
          border: "1px solid #EEF2F7",
        }}
      >
        {result.annonce_text}
      </div>

      {result.hashtags?.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#1B3A6B",
              marginBottom: 8,
            }}
          >
            Hashtags suggérés
          </div>
          <div data-testid="hashtags">
            {result.hashtags.map((h, i) => (
              <span
                key={i}
                className="iad-hashtag"
                onClick={async () => {
                  await navigator.clipboard.writeText(h);
                  toast.success(`${h} copié`);
                }}
              >
                {h}
              </span>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: 14,
          textAlign: "right",
          fontSize: 12,
          color: "#94A3B8",
        }}
        data-testid="char-count"
      >
        {result.char_count} caractères
      </div>
    </div>
  );
}
