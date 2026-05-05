"use client";

import { useRef, useState } from "react";
import { X, ImagePlus } from "lucide-react";

export default function PhotoUpload({ files, setFiles }) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const onFilesSelected = (list) => {
    const newFiles = Array.from(list).filter((f) => f.type.startsWith("image/"));
    const mapped = newFiles.map((f) => ({
      id: `${f.name}-${f.size}-${f.lastModified}-${Math.random()}`,
      file: f,
      preview: URL.createObjectURL(f),
    }));
    setFiles((prev) => [...prev, ...mapped]);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) onFilesSelected(e.dataTransfer.files);
  };

  const removeFile = (id) => {
    setFiles((prev) => {
      const target = prev.find((x) => x.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((x) => x.id !== id);
    });
  };

  return (
    <div>
      <label className="iad-label">Photos du bien</label>
      <div
        data-testid="photo-dropzone"
        className={`iad-dropzone ${dragActive ? "drag-active" : ""}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => onFilesSelected(e.target.files)}
          data-testid="photo-input"
        />
        <ImagePlus size={28} color="#1B3A6B" style={{ margin: "0 auto 8px", display: "block" }} />
        <div style={{ color: "#1B3A6B", fontWeight: 600, fontSize: 14 }}>
          Glisse tes photos ici ou clique pour importer
        </div>
        <div style={{ color: "#6B7280", fontSize: 12, marginTop: 4 }}>
          JPG, PNG, WEBP — multi-sélection
        </div>
      </div>

      {files.length > 0 && (
        <div
          data-testid="photo-grid"
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
            gap: 10,
          }}
        >
          {files.map((f) => (
            <div
              key={f.id}
              style={{
                position: "relative",
                borderRadius: 10,
                overflow: "hidden",
                aspectRatio: "1/1",
                background: "#F1F5F9",
                border: "1px solid #D1DCEE",
              }}
            >
              <img
                src={f.preview}
                alt="preview"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(f.id);
                }}
                data-testid={`remove-photo-${f.file.name}`}
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  border: "none",
                  background: "rgba(15, 23, 42, 0.82)",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                }}
                aria-label="Supprimer"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
