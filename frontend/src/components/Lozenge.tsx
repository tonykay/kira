import type { Area } from "../types";

const AREA_STYLES: Record<Area, { bg: string; color: string }> = {
  linux: { bg: "#f3f0ff", color: "#7c3aed" },
  kubernetes: { bg: "#eff6ff", color: "#2563eb" },
  networking: { bg: "#ecfeff", color: "#0891b2" },
  database: { bg: "#ecfdf5", color: "#059669" },
  storage: { bg: "#fffbeb", color: "#d97706" },
  security: { bg: "#fef2f2", color: "#dc2626" },
  application: { bg: "#eef2ff", color: "#6366f1" },
};

function riskStyle(value: number): { bg: string; color: string } {
  if (value >= 0.7) return { bg: "#fef2f2", color: "#dc2626" };
  if (value >= 0.4) return { bg: "#fffbeb", color: "#d97706" };
  return { bg: "#f0fdf4", color: "#16a34a" };
}

function confidenceStyle(value: number): { bg: string; color: string } {
  if (value >= 0.8) return { bg: "#f0fdf4", color: "#16a34a" };
  if (value >= 0.5) return { bg: "#fffbeb", color: "#d97706" };
  return { bg: "#fef2f2", color: "#dc2626" };
}

function riskColor(value: number): string {
  return riskStyle(value).color;
}

function confidenceColor(value: number): string {
  return confidenceStyle(value).color;
}

function label(value: number): string {
  if (value >= 0.7) return "high";
  if (value >= 0.4) return "med";
  return "low";
}

const pill = (bg: string, fg: string) =>
  ({
    background: bg,
    color: fg,
    padding: "3px 10px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: 500,
    display: "inline-block",
    whiteSpace: "nowrap" as const,
  }) as const;

export function AreaLozenge({ area }: { area: Area }) {
  const s = AREA_STYLES[area] || AREA_STYLES.application;
  return <span style={pill(s.bg, s.color)}>{area}</span>;
}

export function RiskLozenge({ value }: { value: number }) {
  const s = riskStyle(value);
  return <span style={pill(s.bg, s.color)}>{label(value)} {value.toFixed(1)}</span>;
}

export function ConfidenceLozenge({ value }: { value: number }) {
  const s = confidenceStyle(value);
  return <span style={pill(s.bg, s.color)}>{label(value)} {value.toFixed(1)}</span>;
}

const STAGE_STYLES: Record<string, { bg: string; color: string }> = {
  dev: { bg: "#f0fdf4", color: "#16a34a" },
  test: { bg: "#fffbeb", color: "#d97706" },
  production: { bg: "#fef2f2", color: "#dc2626" },
  unknown: { bg: "#f1f5f9", color: "#6b7280" },
};

export function StageLozenge({ stage }: { stage: string }) {
  const s = STAGE_STYLES[stage] || STAGE_STYLES.unknown;
  return <span style={pill(s.bg, s.color)}>{stage}</span>;
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  open: { bg: "#fef2f2", color: "#dc2626" },
  acknowledged: { bg: "#fffbeb", color: "#d97706" },
  in_progress: { bg: "#eff6ff", color: "#2563eb" },
  resolved: { bg: "#f0fdf4", color: "#16a34a" },
  closed: { bg: "#f1f5f9", color: "#6b7280" },
};

export function StatusLozenge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.open;
  return <span style={pill(s.bg, s.color)}>{status.replace("_", " ")}</span>;
}

export { riskColor, confidenceColor, label as valueLabel };

interface EditableLozengeProps {
  value: number;
  onClick: () => void;
}

export function EditableRiskLozenge({ value, onClick }: EditableLozengeProps) {
  const s = riskStyle(value);
  return (
    <span onClick={onClick} style={{ ...pill(s.bg, s.color), cursor: "pointer" }} title="Click to edit risk">
      {label(value)} {value.toFixed(1)} &#9998;
    </span>
  );
}

export function EditableConfidenceLozenge({ value, onClick }: EditableLozengeProps) {
  const s = confidenceStyle(value);
  return (
    <span onClick={onClick} style={{ ...pill(s.bg, s.color), cursor: "pointer" }} title="Click to edit confidence">
      {label(value)} {value.toFixed(1)} &#9998;
    </span>
  );
}
