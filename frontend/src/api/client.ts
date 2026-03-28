const BASE = "/api/v1";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const resp = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!resp.ok) {
    if (resp.status === 401) {
      window.location.href = "/login";
    }
    throw new Error(`${resp.status}: ${await resp.text()}`);
  }
  return resp.json();
}

export const api = {
  login: (username: string, password: string) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request<import("../types").User>("/auth/me"),
  getDashboard: () =>
    request<import("../types").DashboardStats>("/dashboard/stats"),
  getTickets: (params?: string) =>
    request<import("../types").TicketListResponse>(
      `/tickets${params ? `?${params}` : ""}`
    ),
  getTicket: (id: string) =>
    request<import("../types").Ticket>(`/tickets/${id}`),
  updateTicket: (id: string, data: Record<string, unknown>) =>
    request<import("../types").Ticket>(`/tickets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  getComments: (ticketId: string) =>
    request<import("../types").Comment[]>(`/tickets/${ticketId}/comments`),
  addComment: (ticketId: string, body: string) =>
    request<import("../types").Comment>(`/tickets/${ticketId}/comments`, {
      method: "POST",
      body: JSON.stringify({ body, source: "human" }),
    }),
  getAudit: (ticketId: string) =>
    request<import("../types").AuditEntry[]>(`/tickets/${ticketId}/audit`),
  getArtifacts: (ticketId: string) =>
    request<import("../types").Artifact[]>(`/tickets/${ticketId}/artifacts`),
  getEnums: () => request<Record<string, string[]>>("/enums"),
};
