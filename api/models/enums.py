from enum import StrEnum


class AreaEnum(StrEnum):
    LINUX = "linux"
    KUBERNETES = "kubernetes"
    NETWORKING = "networking"
    DATABASE = "database"
    STORAGE = "storage"
    SECURITY = "security"
    APPLICATION = "application"


class StatusEnum(StrEnum):
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class SourceEnum(StrEnum):
    AGENT = "agent"
    HUMAN = "human"


class RoleEnum(StrEnum):
    ADMIN = "admin"
    OPERATOR = "operator"
    VIEWER = "viewer"


class SeverityEnum(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class IssueStatusEnum(StrEnum):
    IDENTIFIED = "identified"
    BACKLOG = "backlog"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    DISMISSED = "dismissed"
