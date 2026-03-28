import type { Area } from "../types";

const AREA_COLORS: Record<Area, string> = {
  linux: "#7c3aed",
  kubernetes: "#2563eb",
  networking: "#0891b2",
  database: "#059669",
  storage: "#d97706",
  security: "#dc2626",
  application: "#6366f1",
};

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

function label(value: number): string {
  if (value >= 0.7) return "high";
  if (value >= 0.4) return "med";
  return "low";
}

const style = (bg: string) =>
  ({
    background: bg,
    color: "white",
    padding: "2px 8px",
    borderRadius: "10px",
    fontSize: "11px",
    fontWeight: 500,
    display: "inline-block",
    whiteSpace: "nowrap" as const,
  }) as const;

export function AreaLozenge({ area }: { area: Area }) {
  return <span style={style(AREA_COLORS[area])}>{area}</span>;
}

export function RiskLozenge({ value }: { value: number }) {
  return (
    <span style={style(riskColor(value))}>
      {label(value)} {value.toFixed(1)}
    </span>
  );
}

export function ConfidenceLozenge({ value }: { value: number }) {
  return (
    <span style={style(confidenceColor(value))}>
      {label(value)} {value.toFixed(1)}
    </span>
  );
}

const STATUS_TEXT_COLORS: Record<string, string> = {
  open: "#ef4444",
  acknowledged: "#f59e0b",
  in_progress: "#3b82f6",
  resolved: "#22c55e",
  closed: "#6b7280",
};

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

export function StatusLozenge({ status }: { status: string }) {
  const textColor = STATUS_TEXT_COLORS[status] || STATUS_TEXT_COLORS.open;
  return (
    <span
      style={{
        background: `rgba(${hexToRgb(textColor)}, var(--kira-status-opacity))`,
        color: textColor,
        padding: "2px 8px",
        borderRadius: "10px",
        fontSize: "11px",
        fontWeight: 500,
      }}
    >
      {status.replace("_", " ")}
    </span>
  );
}

// --- Exported utilities for ValueEditDialog ---
export { riskColor, confidenceColor, label as valueLabel };

// --- Editable variants (TicketDetail only) ---

interface EditableLozengeProps {
  value: number;
  onClick: () => void;
}

export function EditableRiskLozenge({ value, onClick }: EditableLozengeProps) {
  return (
    <span
      onClick={onClick}
      style={{
        ...style(riskColor(value)),
        cursor: "pointer",
        position: "relative",
      }}
      title="Click to edit risk"
    >
      {label(value)} {value.toFixed(1)} &#9998;
    </span>
  );
}

export function EditableConfidenceLozenge({ value, onClick }: EditableLozengeProps) {
  return (
    <span
      onClick={onClick}
      style={{
        ...style(confidenceColor(value)),
        cursor: "pointer",
        position: "relative",
      }}
      title="Click to edit confidence"
    >
      {label(value)} {value.toFixed(1)} &#9998;
    </span>
  );
}
