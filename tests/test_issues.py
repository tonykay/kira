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


def test_issue_model_exists(db_session):
    from api.db.models import Issue, Ticket

    ticket = Ticket(
        title="Test ticket",
        description="desc",
        area="linux",
        confidence=0.5,
        risk=0.5,
        recommended_action="fix it",
        created_by_source="agent",
    )
    db_session.add(ticket)
    db_session.flush()

    issue = Issue(
        ticket_id=ticket.id,
        title="No retry logic",
        severity="critical",
        description="The task fails immediately",
        fix="Add retries: 3",
        status="identified",
    )
    db_session.add(issue)
    db_session.commit()
    db_session.refresh(issue)

    assert issue.id is not None
    assert issue.ticket_id == ticket.id
    assert issue.severity == "critical"
    assert issue.status == "identified"
    assert issue.priority is None
    assert issue.created_at is not None
    assert issue.updated_at is not None


def test_ticket_issues_relationship(db_session):
    from api.db.models import Issue, Ticket

    ticket = Ticket(
        title="Test ticket",
        description="desc",
        area="linux",
        confidence=0.5,
        risk=0.5,
        recommended_action="fix it",
        created_by_source="agent",
    )
    db_session.add(ticket)
    db_session.flush()

    issue1 = Issue(
        ticket_id=ticket.id,
        title="Issue one",
        severity="high",
        description="desc1",
        fix="fix1",
    )
    issue2 = Issue(
        ticket_id=ticket.id,
        title="Issue two",
        severity="low",
        description="desc2",
        fix="fix2",
    )
    db_session.add_all([issue1, issue2])
    db_session.commit()
    db_session.refresh(ticket)

    assert len(ticket.issues) == 2
    titles = {i.title for i in ticket.issues}
    assert titles == {"Issue one", "Issue two"}


def test_issue_create_schema():
    from api.models.issues import IssueCreate

    issue = IssueCreate(
        title="No retry logic",
        severity="critical",
        description="Task fails immediately",
        fix="Add retries: 3",
    )
    assert issue.title == "No retry logic"
    assert issue.severity.value == "critical"


def test_issue_create_schema_validation():
    from api.models.issues import IssueCreate
    import pytest as _pytest

    with _pytest.raises(Exception):
        IssueCreate(
            title="x" * 256,  # exceeds max_length=255
            severity="critical",
            description="desc",
            fix="fix",
        )


def test_issue_update_schema():
    from api.models.issues import IssueUpdate

    update = IssueUpdate(status="backlog", priority=3)
    assert update.status.value == "backlog"
    assert update.priority == 3

    partial = IssueUpdate(priority=5)
    assert partial.status is None
    assert partial.priority == 5


def test_issue_update_priority_validation():
    from api.models.issues import IssueUpdate
    import pytest as _pytest

    with _pytest.raises(Exception):
        IssueUpdate(priority=0)  # below ge=1

    with _pytest.raises(Exception):
        IssueUpdate(priority=6)  # above le=5


TICKET_PAYLOAD = {
    "title": "OOM kills on payment-service pod",
    "description": "Pod payment-service-7d4b8c restarting due to OOM kills",
    "area": "kubernetes",
    "confidence": 0.92,
    "risk": 0.8,
    "recommended_action": "Increase memory limits from 512Mi to 1Gi",
    "affected_systems": ["payment-service-7d4b8c"],
    "source": "agent",
}

ISSUE_PAYLOAD_1 = {
    "title": "No retry logic",
    "severity": "critical",
    "description": "Task fails immediately on transient errors",
    "fix": "Add `retries: 3` and `delay: 30`",
}

ISSUE_PAYLOAD_2 = {
    "title": "GPG check disabled",
    "severity": "high",
    "description": "Package installation skips GPG verification",
    "fix": "Remove `disable_gpg_check: yes`",
}


def test_create_ticket_with_issues(client, api_key_headers):
    payload = {**TICKET_PAYLOAD, "issues": [ISSUE_PAYLOAD_1, ISSUE_PAYLOAD_2]}
    resp = client.post("/api/v1/tickets", json=payload, headers=api_key_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert len(data["issues"]) == 2
    assert data["issues"][0]["title"] == "No retry logic"
    assert data["issues"][0]["severity"] == "critical"
    assert data["issues"][0]["status"] == "identified"
    assert data["issues"][0]["priority"] is None
    assert data["issues"][0]["ticket_id"] == data["id"]
    assert data["issues"][0]["ticket_title"] == data["title"]
    assert data["issues"][1]["title"] == "GPG check disabled"


def test_create_ticket_without_issues(client, api_key_headers):
    resp = client.post("/api/v1/tickets", json=TICKET_PAYLOAD, headers=api_key_headers)
    assert resp.status_code == 201
    assert resp.json()["issues"] == []


def test_get_ticket_includes_issues(client, api_key_headers):
    payload = {**TICKET_PAYLOAD, "issues": [ISSUE_PAYLOAD_1]}
    create_resp = client.post("/api/v1/tickets", json=payload, headers=api_key_headers)
    ticket_id = create_resp.json()["id"]

    resp = client.get(f"/api/v1/tickets/{ticket_id}", headers=api_key_headers)
    assert resp.status_code == 200
    assert len(resp.json()["issues"]) == 1
    assert resp.json()["issues"][0]["title"] == "No retry logic"
