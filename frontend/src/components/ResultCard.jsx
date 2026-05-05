"use client";

import { useState, useEffect } from "react";
import { Copy, RefreshCw, Check, Sparkles, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";

export default function ResultCard({ result, onRegenerate, regenerating }) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");

  useEffect(() => {
    if (result) {
      setEditedText(result.annonce_text);
      setIsEditing(false);
    }
  }, [result?.id, result?.annonce_text]);

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
        <div style={{ marginTop: 14, fontSize: 18, fontWeight: 600, color: "#475569" }}>
          Ton annonce apparaîtra ici
        </div>
        <div style={{ marginTop: 6, fontSize: 14, color: "#94A3B8" }}>
          Remplis le formulaire et clique sur Générer
        </div>
      </div>
    );
  }

  const displayText = isEditing ? editedText : editedText || result.annonce_text;

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(displayText);
      setCopied(true);
      toast.success("Annonce copiée !");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const startEdit = () => {
    setEditedText(displayText);
    setIsEditing(true);
  };
  const cancelEdit = () => {
    setEditedText(result.annonce_text);
    setIsEditing(false);
  };
  const saveEdit = () => {
    setIsEditing(false);
    toast.success("Modifications enregistrées localement");
  };

  const isModified = editedText && editedText !== result.annonce_text;
  const charCount = displayText.length;

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
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div className="iad-badge-success" data-testid="result-badge">
            <Check size={14} /> Annonce générée
          </div>
          {isModified && !isEditing && (
            <span
              data-testid="modified-badge"
              style={{
                background: "#FEF3C7",
                color: "#92400E",
                fontSize: 11,
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: 999,
              }}
            >
              ✏️ Modifiée
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {!isEditing ? (
            <>
              <button type="button" className="iad-btn-secondary" onClick={startEdit} data-testid="edit-btn">
                <Pencil size={14} /> Modifier
              </button>
              <button type="button" className="iad-btn-secondary" onClick={copyText} data-testid="copy-btn">
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
            </>
          ) : (
            <>
              <button type="button" className="iad-btn-secondary" onClick={cancelEdit} data-testid="cancel-edit-btn">
                <X size={14} /> Annuler
              </button>
              <button type="button" className="iad-btn-blue" onClick={saveEdit} data-testid="save-edit-btn">
                <Save size={14} /> Enregistrer
              </button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <textarea
          data-testid="annonce-textarea"
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          className="iad-annonce-text"
          style={{
            width: "100%",
            minHeight: 420,
            background: "#FAFBFC",
            borderRadius: 10,
            padding: 18,
            border: "1px solid #1B3A6B",
            resize: "vertical",
            outline: "none",
            boxShadow: "0 0 0 3px rgba(27, 58, 107, 0.12)",
          }}
          autoFocus
        />
      ) : (
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
          {displayText}
        </div>
      )}

      {result.hashtags?.length > 0 && !isEditing && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1B3A6B", marginBottom: 8 }}>
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
        {charCount} caractères
      </div>
    </div>
  );
}
