import { useState } from "react";
import { SkillTag } from "./SkillTag";

interface SkillEditorProps {
  skills: string[];
  onSave: (skills: string[]) => Promise<void>;
}

export function SkillEditor({ skills, onSave }: SkillEditorProps) {
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    const value = input.trim().toLowerCase();
    if (!value || skills.includes(value)) {
      setInput("");
      return;
    }
    setSaving(true);
    await onSave([...skills, value]);
    setInput("");
    setSaving(false);
  };

  const handleRemove = async (skill: string) => {
    setSaving(true);
    await onSave(skills.filter((s) => s !== skill));
    setSaving(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", alignItems: "center" }}>
      {skills.map((skill) => (
        <SkillTag key={skill} skill={skill} onRemove={() => handleRemove(skill)} />
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={saving ? "Saving..." : "Add skill..."}
        disabled={saving}
        style={{
          background: "transparent",
          border: "none",
          borderBottom: "1px solid var(--kira-border)",
          color: "var(--kira-text-primary)",
          fontSize: "11px",
          padding: "2px 4px",
          width: "80px",
          outline: "none",
        }}
      />
    </div>
  );
}
