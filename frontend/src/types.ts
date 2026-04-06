export type Area =
  | "linux"
  | "kubernetes"
  | "networking"
  | "database"
  | "storage"
  | "security"
  | "application";

export type Status =
  | "open"
  | "acknowledged"
  | "in_progress"
  | "resolved"
  | "closed";

export type Source = "agent" | "human";

export type Role = "admin" | "operator" | "viewer";

export interface Ticket {
  id: string;
  title: string;
  description: string;
  area: Area;
  status: Status;
  confidence: number;
  risk: number;
  recommended_action: string;
  affected_systems: string[];
  skills: string[];
  assigned_to: string | null;
  created_by_source: Source;
  created_at: string;
  updated_at: string;
  issues: Issue[];
}

export interface TicketListResponse {
  items: Ticket[];
  total: number;
  page: number;
  per_page: number;
}

export interface Comment {
  id: string;
  ticket_id: string;
  body: string;
  author_source: Source;
  author_name: string;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  ticket_id: string;
  action: string;
  actor_source: Source;
  actor_name: string;
  actor_tier: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  timestamp: string;
}

export interface Artifact {
  id: string;
  ticket_id: string;
  filename: string;
  content_type: string;
  uploaded_by_source: Source;
  uploaded_at: string;
}

export interface User {
  id: string;
  username: string;
  display_name: string;
  role: Role;
  expertise_area: Area | null;
  tier: string | null;
}

export interface DashboardStats {
  open: number;
  acknowledged: number;
  in_progress: number;
  resolved: number;
  closed: number;
  avg_confidence: number | null;
  by_area: Record<string, number>;
  risk_distribution: { high: number; medium: number; low: number };
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface ChatInfo {
  enabled: boolean;
  model: string | null;
}

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type IssueStatus =
  | "identified"
  | "backlog"
  | "in_progress"
  | "done"
  | "dismissed";

export interface Issue {
  id: string;
  ticket_id: string;
  ticket_title: string;
  title: string;
  severity: Severity;
  description: string;
  fix: string;
  status: IssueStatus;
  priority: number | null;
  assigned_to: string | null;
  assignee_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface IssueListResponse {
  items: Issue[];
  total: number;
  page: number;
  per_page: number;
}

export interface IssueComment {
  id: string;
  issue_id: string;
  body: string;
  author_name: string;
  created_at: string;
}
