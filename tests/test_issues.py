from api.models.enums import SeverityEnum, IssueStatusEnum


def test_severity_enum_values():
    assert list(SeverityEnum) == [
        SeverityEnum.CRITICAL,
        SeverityEnum.HIGH,
        SeverityEnum.MEDIUM,
        SeverityEnum.LOW,
        SeverityEnum.INFO,
    ]
    assert SeverityEnum.CRITICAL.value == "critical"
    assert SeverityEnum.INFO.value == "info"


def test_issue_status_enum_values():
    assert list(IssueStatusEnum) == [
        IssueStatusEnum.IDENTIFIED,
        IssueStatusEnum.BACKLOG,
        IssueStatusEnum.IN_PROGRESS,
        IssueStatusEnum.DONE,
        IssueStatusEnum.DISMISSED,
    ]
    assert IssueStatusEnum.IDENTIFIED.value == "identified"
    assert IssueStatusEnum.DISMISSED.value == "dismissed"
