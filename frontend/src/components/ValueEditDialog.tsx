import { useState } from "react";

function riskColor(value: number): string {
  if (value >= 0.7) return "#ef4444";
  if (value >= 0.4) return "#f59e0b";
  return "#22c55e";
}

function confidenceColor(value: number): string {
  if (value >= 0.7) return "#22c55e";
  if (value >= 0.4) return "#f59e0b";
  return "#ef4444";
}

function valueLabel(value: number): string {
  if (value >= 0.7) return "high";
  if (value >= 0.4) return "med";
  return "low";
}

interface ValueEditDialogProps {
  type: "risk" | "confidence";
  currentValue: number;
  onSave: (newValue: number, comment: string) => Promise<void>;
  onCancel: () => void;
}

export function ValueEditDialog({ type, currentValue, onSave, onCancel }: ValueEditDialogProps) {
  const [value, setValue] = useState(currentValue);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const colorFn = type === "risk" ? riskColor : confidenceColor;
  const title = type === "risk" ? "Update Risk" : "Update Confidence";
  const hasChanged = Math.abs(value - currentValue) > 0.001;
  const canSave = hasChanged && comment.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    await onSave(value, comment.trim());
    setSaving(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        style={{
          background: "var(--kira-bg-card)",
          border: "1px solid var(--kira-border)",
          borderRadius: "8px",
          padding: "24px",
          width: "360px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}
      >
        <h3 style={{ margin: "0 0 16px", fontSize: "15px", color: "var(--kira-text-primary)" }}>{title}</h3>

        {/* Preview lozenge */}
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <span
            style={{
              background: colorFn(value),
              color: "white",
              padding: "4px 12px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            {valueLabel(value)} {value.toFixed(2)}
          </span>
        </div>

        {/* Slider */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--kira-text-muted)", marginBottom: "4px" }}>
            <span>0.0</span>
            <span>0.5</span>
            <span>1.0</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={value}
            onChange={(e) => setValue(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: colorFn(value) }}
          />
          <div style={{ fontSize: "11px", color: "var(--kira-text-muted)", marginTop: "4px" }}>
            Previous: {currentValue.toFixed(2)}
          </div>
        </div>

        {/* Comment */}
        <div style={{ marginBottom: "16px" }}>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Reason for change (required)"
            style={{
              width: "100%",
              background: "var(--kira-bg-input)",
              border: "1px solid var(--kira-border)",
              borderRadius: "4px",
              color: "var(--kira-text-primary)",
              padding: "8px",
              fontSize: "13px",
              minHeight: "60px",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "6px 14px",
              background: "var(--kira-btn-bg)",
              border: "1px solid var(--kira-btn-border)",
              borderRadius: "4px",
              color: "var(--kira-btn-text)",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              padding: "6px 14px",
              background: canSave ? "var(--kira-accent)" : "var(--kira-border)",
              border: "none",
              borderRadius: "4px",
              color: canSave ? "white" : "var(--kira-text-muted)",
              cursor: canSave ? "pointer" : "not-allowed",
              fontSize: "12px",
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
