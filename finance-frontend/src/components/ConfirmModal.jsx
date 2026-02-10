// src/components/ConfirmModal.jsx
import React, { useEffect } from "react";

export default function ConfirmModal({
  open,
  title = "Konfirmasi",
  message,
  confirmText = "Ya",
  cancelText = "Batal",
  danger = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") onCancel?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "grid",
        placeItems: "center",
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(15, 20, 35, 0.92)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
          padding: 18,
          color: "#fff",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>
          {title}
        </div>

        <div style={{ opacity: 0.88, lineHeight: 1.55 }}>
          {typeof message === "string" ? <div>{message}</div> : message}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 16,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.06)",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.18)",
              background: danger
                ? "linear-gradient(90deg, rgba(239,68,68,0.95), rgba(124,58,237,0.8))"
                : "linear-gradient(90deg, rgba(124,58,237,0.9), rgba(34,197,94,0.8))",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
