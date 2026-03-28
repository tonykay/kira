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
          borderRadius: "8px",
          width: "320px",
        }}
      >
        <h2 style={{ color: "var(--kira-accent)", marginBottom: "24px", textAlign: "center" }}>Kira</h2>
        {error && (
          <div style={{ color: "#ef4444", fontSize: "13px", marginBottom: "12px", textAlign: "center" }}>
            {error}
          </div>
        )}
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "12px",
            background: "var(--kira-bg-input)",
            border: "1px solid var(--kira-border)",
            borderRadius: "4px",
            color: "var(--kira-text-primary)",
            fontSize: "14px",
            boxSizing: "border-box",
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "16px",
            background: "var(--kira-bg-input)",
            border: "1px solid var(--kira-border)",
            borderRadius: "4px",
            color: "var(--kira-text-primary)",
            fontSize: "14px",
            boxSizing: "border-box",
          }}
        />
        <button
          type="submit"
          style={{
            width: "100%",
            padding: "10px",
            background: "var(--kira-accent)",
            color: "white",
            border: "none",
            borderRadius: "4px",
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
