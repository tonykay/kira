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

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: "#ef444422", text: "#ef4444" },
  acknowledged: { bg: "#f59e0b22", text: "#f59e0b" },
  in_progress: { bg: "#3b82f622", text: "#3b82f6" },
  resolved: { bg: "#22c55e22", text: "#22c55e" },
  closed: { bg: "#6b728022", text: "#6b7280" },
};

export function StatusLozenge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.open;
  return (
    <span
      style={{
        background: colors.bg,
        color: colors.text,
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
