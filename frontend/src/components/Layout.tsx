import { Link, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { User } from "../types";

export function Layout() {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.me().then(setUser).catch(() => navigate("/login"));
  }, [navigate]);

  const handleLogout = async () => {
    await api.logout();
    navigate("/login");
  };

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f1a", color: "#e0e0e0" }}>
      <nav
        style={{
          background: "#1a1a2e",
          padding: "10px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #333",
        }}
      >
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <Link to="/" style={{ fontWeight: "bold", fontSize: "16px", color: "#4a9eff", textDecoration: "none" }}>
            Kira
          </Link>
          <Link to="/" style={{ color: "#ccc", fontSize: "13px", textDecoration: "none" }}>
            Dashboard
          </Link>
          <Link to="/tickets" style={{ color: "#ccc", fontSize: "13px", textDecoration: "none" }}>
            Tickets
          </Link>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ color: "#888", fontSize: "12px" }}>
            {user.display_name} ({user.tier || user.role})
          </span>
          <button
            onClick={handleLogout}
            style={{
              background: "none",
              border: "1px solid #555",
              color: "#999",
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
