interface SkillTagProps {
  skill: string;
  onRemove?: () => void;
}

export function SkillTag({ skill, onRemove }: SkillTagProps) {
  return (
    <span
      style={{
        background: "#f1f5f9",
        color: "#475569",
        padding: "2px 8px",
        borderRadius: "12px",
        fontSize: "10px",
        fontWeight: 500,
        display: "inline-flex",
        alignItems: "center",
        gap: "3px",
        whiteSpace: "nowrap",
        border: "1px solid #e2e8f0",
      }}
    >
      {skill}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            background: "none",
            border: "none",
            color: "var(--kira-text-muted)",
            cursor: "pointer",
            padding: "0 1px",
            fontSize: "10px",
            lineHeight: 1,
          }}
          title={`Remove ${skill}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
