import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { RiskLozenge, ConfidenceLozenge } from "../components/Lozenge";
import { InfoPopover } from "../components/InfoPopover";
import type { Area } from "../types";

const AREAS: Area[] = ["linux", "kubernetes", "networking", "database", "storage", "security", "application"];

export function CreateTicket() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [area, setArea] = useState<Area>("linux");
  const [description, setDescription] = useState("");
  const [recommendedAction, setRecommendedAction] = useState("");
  const [risk, setRisk] = useState(0.5);
  const [confidence, setConfidence] = useState(0.5);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [affectedSystems, setAffectedSystems] = useState<string[]>([]);
  const [systemInput, setSystemInput] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit =
    title.trim() &&
    description.trim() &&
    recommendedAction.trim() &&
    comment.trim() &&
    !submitting;

  const handleAddSkill = () => {
    const val = skillInput.trim().toLowerCase();
    if (val && !skills.includes(val)) {
      setSkills([...skills, val]);
    }
    setSkillInput("");
  };

  const handleAddSystem = () => {
    const val = systemInput.trim();
    if (val && !affectedSystems.includes(val)) {
      setAffectedSystems([...affectedSystems, val]);
    }
    setSystemInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");

    try {
      const ticket = await api.createTicket({
        title: title.trim(),
        description: description.trim(),
        area,
        confidence,
        risk,
        recommended_action: recommendedAction.trim(),
        skills,
        affected_systems: affectedSystems,
        source: "human",
      });
      await api.addComment(
        ticket.id,
        `[Ticket created manually] ${comment.trim()}`
      );
      navigate(`/tickets/${ticket.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ticket");
      setSubmitting(false);
    }
  };

  const sectionStyle = {
    background: "var(--kira-bg-card)",
    borderRadius: "6px",
    padding: "16px",
    marginBottom: "12px",
  };

  const labelStyle = {
    fontSize: "11px",
    color: "var(--kira-text-muted)",
    textTransform: "uppercase" as const,
    marginBottom: "6px",
    display: "block",
  };

  const inputStyle = {
    width: "100%",
    padding: "8px",
    background: "var(--kira-bg-input)",
    border: "1px solid var(--kira-border)",
    borderRadius: "4px",
    color: "var(--kira-text-primary)",
    fontSize: "13px",
    boxSizing: "border-box" as const,
  };

  const textareaStyle = {
    ...inputStyle,
    minHeight: "80px",
    resize: "vertical" as const,
  };

  return (
    <div>
      <h2 style={{ fontSize: "18px", marginBottom: "16px" }}>New Ticket</h2>

      {error && (
        <div style={{ ...sectionStyle, borderLeft: "3px solid #ef4444", color: "#ef4444", fontSize: "13px" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Title and Area */}
        <div style={sectionStyle}>
          <div style={{ marginBottom: "12px" }}>
            <label style={labelStyle}>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the issue"
              maxLength={255}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Area *</label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value as Area)}
              style={{ ...inputStyle, width: "auto", minWidth: "150px" }}
            >
              {AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Description / Analysis *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Root cause analysis, evidence, timeline..."
            style={textareaStyle}
          />
        </div>

        {/* Recommended Action */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Recommended Action *</label>
          <textarea
            value={recommendedAction}
            onChange={(e) => setRecommendedAction(e.target.value)}
            placeholder="What should be done to resolve this issue"
            style={{ ...textareaStyle, minHeight: "60px" }}
          />
        </div>

        {/* Risk and Confidence */}
        <div style={{ ...sectionStyle, display: "flex", gap: "24px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Risk *</label>
              <InfoPopover type="risk" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={risk}
                onChange={(e) => setRisk(parseFloat(e.target.value))}
                style={{ flex: 1 }}
              />
              <RiskLozenge value={risk} />
            </div>
          </div>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Confidence *</label>
              <InfoPopover type="confidence" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={confidence}
                onChange={(e) => setConfidence(parseFloat(e.target.value))}
                style={{ flex: 1 }}
              />
              <ConfidenceLozenge value={confidence} />
            </div>
          </div>
        </div>

        {/* Skills */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Skills</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
            {skills.map((s) => (
              <span
                key={s}
                style={{
                  background: "var(--kira-border)",
                  color: "var(--kira-text-secondary)",
                  padding: "2px 8px",
                  borderRadius: "8px",
                  fontSize: "11px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {s}
                <button
                  type="button"
                  onClick={() => setSkills(skills.filter((x) => x !== s))}
                  style={{ background: "none", border: "none", color: "var(--kira-text-muted)", cursor: "pointer", padding: 0, fontSize: "11px" }}
                >
                  {"\u00d7"}
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSkill(); } }}
            placeholder="Type skill and press Enter"
            style={{ ...inputStyle, width: "200px" }}
          />
        </div>

        {/* Affected Systems */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Affected Systems</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
            {affectedSystems.map((s) => (
              <code
                key={s}
                style={{
                  background: "var(--kira-bg-input)",
                  padding: "2px 8px",
                  borderRadius: "3px",
                  fontSize: "11px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {s}
                <button
                  type="button"
                  onClick={() => setAffectedSystems(affectedSystems.filter((x) => x !== s))}
                  style={{ background: "none", border: "none", color: "var(--kira-text-muted)", cursor: "pointer", padding: 0, fontSize: "11px" }}
                >
                  {"\u00d7"}
                </button>
              </code>
            ))}
          </div>
          <input
            type="text"
            value={systemInput}
            onChange={(e) => setSystemInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSystem(); } }}
            placeholder="Hostname or service, press Enter"
            style={{ ...inputStyle, width: "250px" }}
          />
        </div>

        {/* Comment */}
        <div style={{ ...sectionStyle, borderLeft: "3px solid var(--kira-accent)" }}>
          <label style={labelStyle}>Comment * (why is this ticket being created manually?)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="e.g., Observed during routine monitoring, not detected by agents"
            style={textareaStyle}
          />
        </div>

        {/* Submit */}
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => navigate("/tickets")}
            style={{
              padding: "8px 16px",
              background: "var(--kira-btn-bg)",
              border: "1px solid var(--kira-btn-border)",
              borderRadius: "4px",
              color: "var(--kira-btn-text)",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              padding: "8px 16px",
              background: canSubmit ? "var(--kira-accent)" : "var(--kira-border)",
              color: canSubmit ? "white" : "var(--kira-text-muted)",
              border: "none",
              borderRadius: "4px",
              cursor: canSubmit ? "pointer" : "not-allowed",
              fontSize: "13px",
            }}
          >
            {submitting ? "Creating..." : "Create Ticket"}
          </button>
        </div>
      </form>
    </div>
  );
}
