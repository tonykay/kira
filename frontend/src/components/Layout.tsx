import { Link, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useTheme } from "../theme/ThemeProvider";
import type { User } from "../types";

export function Layout() {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    api.me().then(setUser).catch(() => navigate("/login"));
  }, [navigate]);

  const handleLogout = async () => {
    await api.logout();
    navigate("/login");
  };

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--kira-bg-page)", color: "var(--kira-text-primary)" }}>
      <nav
        style={{
          background: "var(--kira-nav-bg)",
          padding: "10px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--kira-border)",
        }}
      >
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <Link to="/" style={{ fontWeight: "bold", fontSize: "16px", color: "var(--kira-accent)", textDecoration: "none" }}>
            Kira
          </Link>
          <Link to="/" style={{ color: "var(--kira-text-secondary)", fontSize: "13px", textDecoration: "none" }}>
            Dashboard
          </Link>
          <Link to="/tickets" style={{ color: "var(--kira-text-secondary)", fontSize: "13px", textDecoration: "none" }}>
            Tickets
          </Link>
          <Link to="/issues" style={{ color: "var(--kira-text-secondary)", fontSize: "13px", textDecoration: "none" }}>
            Issues
          </Link>
          {user.role !== "viewer" && (
            <Link
              to="/tickets/new"
              style={{
                background: "var(--kira-accent)",
                color: "white",
                padding: "4px 10px",
                borderRadius: "4px",
                fontSize: "12px",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              + New Ticket
            </Link>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ color: "var(--kira-text-muted)", fontSize: "12px" }}>
            {user.display_name} ({user.tier || user.role})
          </span>
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            style={{
              background: "none",
              border: "1px solid var(--kira-btn-border)",
              color: "var(--kira-btn-text)",
              padding: "4px 8px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              lineHeight: 1,
            }}
          >
            {theme === "dark" ? "\u2600" : "\u263E"}
          </button>
          <button
            onClick={handleLogout}
            style={{
              background: "var(--kira-btn-bg)",
              border: "1px solid var(--kira-btn-border)",
              color: "var(--kira-btn-text)",
              padding: "4px 10px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Logout
          </button>
        </div>
      </nav>
      <main style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
