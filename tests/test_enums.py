from api.models.enums import AreaEnum, StatusEnum, SourceEnum, RoleEnum


def test_area_enum_values():
    assert AreaEnum.LINUX == "linux"
    assert AreaEnum.KUBERNETES == "kubernetes"
    assert AreaEnum.NETWORKING == "networking"
    assert AreaEnum.DATABASE == "database"
    assert AreaEnum.STORAGE == "storage"
    assert AreaEnum.SECURITY == "security"
    assert AreaEnum.APPLICATION == "application"


def test_status_enum_values():
    assert StatusEnum.OPEN == "open"
    assert StatusEnum.ACKNOWLEDGED == "acknowledged"
    assert StatusEnum.IN_PROGRESS == "in_progress"
    assert StatusEnum.RESOLVED == "resolved"
    assert StatusEnum.CLOSED == "closed"


def test_source_enum_values():
    assert SourceEnum.AGENT == "agent"
    assert SourceEnum.HUMAN == "human"


def test_role_enum_values():
    assert RoleEnum.ADMIN == "admin"
    assert RoleEnum.OPERATOR == "operator"
    assert RoleEnum.VIEWER == "viewer"
