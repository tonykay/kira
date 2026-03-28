interface SkillTagProps {
  skill: string;
  onRemove?: () => void;
}

export function SkillTag({ skill, onRemove }: SkillTagProps) {
  return (
    <span
      style={{
        background: "var(--kira-border)",
        color: "var(--kira-text-secondary)",
        padding: "1px 6px",
        borderRadius: "8px",
        fontSize: "10px",
        fontWeight: 500,
        display: "inline-flex",
        alignItems: "center",
        gap: "3px",
        whiteSpace: "nowrap",
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
