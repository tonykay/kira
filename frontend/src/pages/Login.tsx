import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

export function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.login(username, password);
      navigate("/");
    } catch {
      setError("Invalid credentials");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--kira-bg-page)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "var(--kira-bg-card)",
          padding: "32px",
          borderRadius: "12px",
          width: "340px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          border: "1px solid var(--kira-border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <span style={{ fontSize: "20px", fontWeight: 700, color: "var(--kira-accent)" }}>Kira</span>
        </div>
        <h2 style={{ fontSize: "20px", fontWeight: 600, color: "var(--kira-text-primary)", marginBottom: "4px" }}>Sign In</h2>
        <p style={{ fontSize: "13px", color: "var(--kira-text-muted)", marginBottom: "20px" }}>
          Access your incident dashboard
        </p>
        {error && (
          <div style={{ color: "#dc2626", fontSize: "13px", marginBottom: "12px", textAlign: "center" }}>
            {error}
          </div>
        )}
        <div style={{ marginBottom: "12px" }}>
          <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--kira-text-secondary)", display: "block", marginBottom: "4px" }}>
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              background: "var(--kira-bg-input)",
              border: "1px solid var(--kira-border)",
              borderRadius: "6px",
              color: "var(--kira-text-primary)",
              fontSize: "14px",
              boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--kira-text-secondary)", display: "block", marginBottom: "4px" }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              background: "var(--kira-bg-input)",
              border: "1px solid var(--kira-border)",
              borderRadius: "6px",
              color: "var(--kira-text-primary)",
              fontSize: "14px",
              boxSizing: "border-box",
            }}
          />
        </div>
        <button
          type="submit"
          style={{
            width: "100%",
            padding: "10px",
            background: "var(--kira-btn-bg)",
            color: "var(--kira-btn-text)",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          Sign In
        </button>
      </form>
    </div>
  );
}
