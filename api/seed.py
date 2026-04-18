"""Seed the database with essential users and optionally demo data."""

import sys

from sqlalchemy.orm import Session

from api.auth.passwords import hash_password
from api.db.models import AuditLog, Issue, Ticket, User
from api.db.session import SessionLocal


def seed(demo: bool = False):
    db: Session = SessionLocal()
    try:
        if db.query(User).first():
            print("Database already seeded. Skipping.")
            return

        admin = User(
            username="admin",
            password_hash=hash_password("admin123"),
            display_name="Admin User",
            role="admin",
        )
        viewer = User(
            username="viewer",
            password_hash=hash_password("password"),
            display_name="Read Only",
            role="viewer",
        )

        users = [admin, viewer]

        if demo:
            op1 = User(
                username="jsmith",
                password_hash=hash_password("password"),
                display_name="Jane Smith",
                role="operator",
                expertise_area="kubernetes",
                tier="tier_3_sme",
            )
            op2 = User(
                username="akhan",
                password_hash=hash_password("password"),
                display_name="Amir Khan",
                role="operator",
                expertise_area="linux",
                tier="tier_2",
            )
            users.extend([op1, op2])

        db.add_all(users)
        db.flush()

        if not demo:
            db.commit()
            print(f"Seeded {len(users)} users.")
            return

        tickets_data = [
            {
                "title": "OOM kills on payment-service pod",
                "description": "## Root Cause Analysis\n\nPod `payment-service-7d4b8c` is being OOM-killed repeatedly.\n\n**Evidence:**\n- `kubectl describe pod` shows `OOMKilled` exit code\n- Memory usage trending at 490Mi against 512Mi limit\n- Heap dump shows leak in PaymentHandler.processRefund()\n\n**Timeline:** Started 2026-03-27 14:30 UTC after deploy v2.4.1",
                "area": "kubernetes",
                "confidence": 0.95,
                "risk": 0.9,
                "stage": "production",
                "recommended_action": "Increase memory limits from 512Mi to 1Gi and investigate memory leak in PaymentHandler.processRefund()",
                "affected_systems": ["payment-service-7d4b8c", "payment-service-9a2f1e"],
                "created_by_source": "agent",
                "status": "in_progress",
                "assigned_to": op1.id,
                "skills": ["kubernetes", "helm", "java"],
            },
            {
                "title": "SSH timeout on db-replica-03",
                "description": "## Root Cause Analysis\n\nSSH connections to `db-replica-03` timing out after 10s.\n\n**Evidence:**\n- `ssh -vvv` shows connection reset at key exchange\n- `sshd` process consuming 100% CPU\n- `/var/log/auth.log` shows brute-force attempts from 198.51.100.0/24",
                "area": "linux",
                "confidence": 0.7,
                "risk": 0.5,
                "stage": "production",
                "recommended_action": "Block 198.51.100.0/24 in firewall, restart sshd, verify authorized_keys integrity",
                "affected_systems": ["db-replica-03"],
                "created_by_source": "agent",
                "status": "open",
                "skills": ["linux", "ssh", "firewall"],
            },
            {
                "title": "DNS resolution failures in staging",
                "description": "## Root Cause Analysis\n\nIntermittent DNS failures in staging namespace.\n\n**Evidence:**\n- CoreDNS pods healthy but cache hit ratio at 12%\n- `ndots:5` in resolv.conf causing excessive lookups\n- Upstream DNS server 10.0.0.2 responding slowly (>500ms)",
                "area": "networking",
                "confidence": 0.4,
                "risk": 0.3,
                "stage": "test",
                "recommended_action": "Reduce ndots to 2, add FQDN dots to service names, investigate upstream DNS latency",
                "affected_systems": ["coredns-staging", "api-gateway-staging"],
                "created_by_source": "agent",
                "status": "resolved",
                "assigned_to": op2.id,
                "skills": ["kubernetes", "coredns", "networking"],
            },
            {
                "title": "PostgreSQL replication lag exceeding 30s",
                "description": "## Root Cause Analysis\n\nReplication lag on `db-replica-02` spiking to 30-45s.\n\n**Evidence:**\n- `pg_stat_replication` shows write_lag at 32s\n- WAL sender process blocked on disk I/O\n- iostat shows 98% disk utilization on replica",
                "area": "database",
                "confidence": 0.88,
                "risk": 0.7,
                "stage": "production",
                "recommended_action": "Migrate replica to SSD-backed storage, increase wal_buffers to 64MB",
                "affected_systems": ["db-replica-02", "db-primary-01"],
                "created_by_source": "agent",
                "status": "open",
                "skills": ["postgresql", "linux", "storage"],
            },
            {
                "title": "Unauthorized S3 bucket access attempts",
                "description": "## Root Cause Analysis\n\nCloudTrail logs show repeated `AccessDenied` on `s3://prod-backups`.\n\n**Evidence:**\n- 847 AccessDenied events in last 6 hours\n- Source IP: 203.0.113.42 (not in our IP ranges)\n- Requests targeting `db-dumps/` prefix specifically",
                "area": "security",
                "confidence": 0.82,
                "risk": 0.95,
                "stage": "production",
                "recommended_action": "Block source IP in WAF, rotate S3 bucket policy, audit IAM roles for leaked credentials",
                "affected_systems": ["s3://prod-backups", "iam-role-backup-agent"],
                "created_by_source": "agent",
                "status": "acknowledged",
                "assigned_to": op1.id,
                "skills": ["aws", "iam", "security"],
            },
        ]

        for td in tickets_data:
            assigned = td.pop("assigned_to", None)
            ticket = Ticket(**td)
            if assigned:
                ticket.assigned_to = assigned
            db.add(ticket)
            db.flush()
            db.add(AuditLog(
                ticket_id=ticket.id,
                action="created",
                actor_source="agent",
                actor_name="aiops-agent",
                new_value={"title": ticket.title, "area": ticket.area},
            ))

        db.commit()

        # Add sample issues to some tickets
        all_tickets = db.query(Ticket).all()

        oom_ticket = next(t for t in all_tickets if "OOM" in t.title)
        db.add_all([
            Issue(
                ticket_id=oom_ticket.id,
                title="No memory limits on sidecar containers",
                severity="high",
                description="The envoy sidecar proxy has no memory limits set, allowing unbounded growth that competes with the main container for memory.",
                fix="Add resource limits to the sidecar:\n\n```yaml\nresources:\n  limits:\n    memory: 128Mi\n  requests:\n    memory: 64Mi\n```",
                status="identified",
            ),
            Issue(
                ticket_id=oom_ticket.id,
                title="JVM heap not capped relative to container limit",
                severity="critical",
                description="The JVM `-Xmx` is set to 480Mi but the container limit is 512Mi, leaving only 32Mi for off-heap, metaspace, and the OS. This guarantees OOM kills under load.",
                fix="Set `-Xmx` to ~70% of container limit:\n\n```yaml\nenv:\n  - name: JAVA_OPTS\n    value: \"-Xmx358m -XX:MaxMetaspaceSize=96m\"\n```\n\nOr use `-XX:MaxRAMPercentage=70.0` with container-aware JVM flags.",
                status="backlog",
                priority=2,
            ),
        ])

        s3_ticket = next(t for t in all_tickets if "S3" in t.title)
        db.add_all([
            Issue(
                ticket_id=s3_ticket.id,
                title="S3 bucket policy allows wildcard principal",
                severity="critical",
                description="The bucket policy on `prod-backups` uses `\"Principal\": \"*\"` with a condition that only checks source IP. This is bypassable via VPC endpoints or misconfigured NAT gateways.",
                fix="Restrict the principal to specific IAM roles:\n\n```json\n{\n  \"Principal\": {\n    \"AWS\": \"arn:aws:iam::123456789:role/backup-agent\"\n  }\n}\n```",
                status="backlog",
                priority=1,
            ),
            Issue(
                ticket_id=s3_ticket.id,
                title="No S3 access logging enabled",
                severity="medium",
                description="Server access logging is disabled on the `prod-backups` bucket. Without it, the 847 AccessDenied events were only found by correlating CloudTrail, which has a ~15 minute delay.",
                fix="Enable server access logging:\n\n```bash\naws s3api put-bucket-logging \\\n  --bucket prod-backups \\\n  --bucket-logging-status '{\"LoggingEnabled\":{\"TargetBucket\":\"prod-logs\",\"TargetPrefix\":\"s3-access/\"}}'\n```",
                status="identified",
            ),
            Issue(
                ticket_id=s3_ticket.id,
                title="IAM role has overly broad S3 permissions",
                severity="high",
                description="The `backup-agent` IAM role uses `s3:*` on `arn:aws:s3:::prod-backups/*`. If credentials leak, an attacker gets full read/write/delete access.",
                fix="Apply least-privilege:\n\n```json\n{\n  \"Effect\": \"Allow\",\n  \"Action\": [\"s3:PutObject\", \"s3:GetObject\"],\n  \"Resource\": \"arn:aws:s3:::prod-backups/db-dumps/*\"\n}\n```",
                status="identified",
            ),
        ])

        db.commit()
        print(f"Seeded {len(tickets_data)} tickets, {len(users)} users, and 5 issues.")

    finally:
        db.close()


if __name__ == "__main__":
    demo = "--demo" in sys.argv
    seed(demo=demo)
