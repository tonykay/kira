import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { User } from "../types";

export function Layout() {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    api.me().then(setUser).catch(() => navigate("/login"));
  }, [navigate]);

  const handleLogout = async () => {
    await api.logout();
    navigate("/login");
  };

  if (!user) return null;

  const navLink = (to: string, label: string) => {
    const active = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
    return (
      <Link
        to={to}
        style={{
          color: active ? "var(--kira-nav-active)" : "var(--kira-nav-text)",
          fontSize: "13px",
          textDecoration: "none",
          fontWeight: active ? 500 : 400,
          borderBottom: active ? "2px solid var(--kira-nav-indicator)" : "2px solid transparent",
          paddingBottom: "6px",
        }}
      >
        {label}
      </Link>
    );
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--kira-bg-page)", color: "var(--kira-text-primary)", overflow: "hidden" }}>
      <nav
        style={{
          background: "var(--kira-nav-bg)",
          padding: "10px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          <Link to="/" style={{ fontWeight: 700, fontSize: "17px", color: "var(--kira-nav-active)", textDecoration: "none", letterSpacing: "-0.5px" }}>
            Kira
          </Link>
          {navLink("/", "Dashboard")}
          {navLink("/tickets", "Tickets")}
          {navLink("/issues", "Backlog")}
          {user.role !== "viewer" && navLink("/workspace", "Workspace")}
          {user.role !== "viewer" && (
            <Link
              to="/tickets/new"
              style={{
                background: "var(--kira-btn-bg)",
                color: "var(--kira-btn-text)",
                padding: "5px 12px",
                borderRadius: "6px",
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
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>
            {user.display_name}
          </span>
          <button
            onClick={handleLogout}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: "var(--kira-nav-active)",
              padding: "5px 12px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Logout
          </button>
        </div>
      </nav>
      <main style={{ flex: 1, padding: "20px", maxWidth: "1200px", margin: "0 auto", overflow: "auto", width: "100%" }}>
        <Outlet />
      </main>
    </div>
  );
}
