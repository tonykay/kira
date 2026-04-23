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
  createTicket: (data: {
    title: string;
    description: string;
    area: string;
    confidence: number;
    risk: number;
    recommended_action: string;
    skills: string[];
    affected_systems: string[];
    source: string;
  }) =>
    request<import("../types").Ticket>("/tickets", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getEnums: () => request<Record<string, string[]>>("/enums"),
  chatInfo: () => request<import("../types").ChatInfo>("/chat/info"),
  chatHistory: (ticketId: string) =>
    request<import("../types").ChatMessage[]>(`/chat/${ticketId}/history`),
  chatSend: async (ticketId: string, message: string, includeContext: boolean, model?: string) => {
    const resp = await fetch(`${BASE}/chat/${ticketId}/send`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, include_context: includeContext, model: model || undefined }),
    });
    if (!resp.ok) {
      if (resp.status === 401) window.location.href = "/login";
      throw new Error(`${resp.status}: ${await resp.text()}`);
    }
    return resp;
  },
  chatClear: (ticketId: string) =>
    request(`/chat/${ticketId}/history`, { method: "DELETE" }),
  chatSendGeneral: async (message: string, model?: string) => {
    const resp = await fetch(`${BASE}/chat/general/send`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, include_context: false, model: model || undefined }),
    });
    if (!resp.ok) {
      if (resp.status === 401) window.location.href = "/login";
      throw new Error(`${resp.status}: ${await resp.text()}`);
    }
    return resp;
  },
  getIssues: (params?: string) =>
    request<import("../types").IssueListResponse>(
      `/issues${params ? `?${params}` : ""}`
    ),
  getIssue: (id: string) =>
    request<import("../types").Issue>(`/issues/${id}`),
  updateIssue: (id: string, data: Record<string, unknown>) =>
    request<import("../types").Issue>(`/issues/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  createIssueOnTicket: (ticketId: string, data: {
    title: string;
    severity: string;
    description: string;
    fix: string;
  }) =>
    request<import("../types").Issue>(`/tickets/${ticketId}/issues`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getIssueComments: (issueId: string) =>
    request<import("../types").IssueComment[]>(`/issues/${issueId}/comments`),
  addIssueComment: (issueId: string, body: string) =>
    request<import("../types").IssueComment>(`/issues/${issueId}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
};
