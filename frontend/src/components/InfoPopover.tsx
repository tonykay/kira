import { useEffect, useRef, useState } from "react";

interface ScaleEntry {
  range: string;
  label: string;
  description: string;
}

const RISK_SCALE: ScaleEntry[] = [
  { range: "0.0–0.3", label: "Low", description: "Routine issue, minimal blast radius, safe to action" },
  { range: "0.4–0.6", label: "Medium", description: "Some risk of disruption, review recommended before action" },
  { range: "0.7–1.0", label: "High", description: "Significant risk — service restart, data impact, or production-affecting. Requires SME validation" },
];

const CONFIDENCE_SCALE: ScaleEntry[] = [
  { range: "0.0–0.3", label: "Low", description: "Weak evidence, multiple possible root causes, needs investigation" },
  { range: "0.4–0.6", label: "Medium", description: "Partial evidence supports diagnosis, some uncertainty remains" },
  { range: "0.7–1.0", label: "High", description: "Strong evidence, diagnosis well-supported, high certainty in root cause" },
];

const STAGE_INFO: ScaleEntry[] = [
  { range: "dev", label: "Development", description: "Development environment. Low urgency — issues here are expected during development" },
  { range: "test", label: "Test/Staging", description: "Test/staging environment. Moderate urgency — failures may block releases" },
  { range: "production", label: "Production", description: "Production environment. High urgency — real users and services are affected" },
  { range: "unknown", label: "Unknown", description: "Environment not specified. Treat with appropriate caution until confirmed" },
];

interface InfoPopoverProps {
  type: "risk" | "confidence" | "stage";
}

export function InfoPopover({ type }: InfoPopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const scale = type === "risk" ? RISK_SCALE : type === "confidence" ? CONFIDENCE_SCALE : STAGE_INFO;
  const title = type === "risk" ? "Risk Scale" : type === "confidence" ? "Confidence Scale" : "Stage Guide";

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <span style={{ position: "relative", display: "inline-block" }} ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        title={`${title} guidelines`}
        style={{
          background: "none",
          border: "none",
          color: "var(--kira-text-muted)",
          cursor: "pointer",
          fontSize: "11px",
          padding: "0 4px",
          fontStyle: "italic",
          opacity: 0.7,
        }}
      >
        (i)
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginTop: "4px",
            background: "var(--kira-bg-card)",
            border: "1px solid var(--kira-border)",
            borderRadius: "6px",
            padding: "12px",
            width: "280px",
            zIndex: 100,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--kira-text-primary)", marginBottom: "8px" }}>
            {title}
          </div>
          {scale.map((entry) => (
            <div key={entry.range} style={{ marginBottom: "8px", fontSize: "11px" }}>
              <div style={{ color: "var(--kira-text-secondary)", fontWeight: 500 }}>
                {entry.range} ({entry.label})
              </div>
              <div style={{ color: "var(--kira-text-muted)", marginTop: "2px" }}>
                {entry.description}
              </div>
            </div>
          ))}
        </div>
      )}
    </span>
  );
}
