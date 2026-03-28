"""Seed the database with an admin user and sample tickets for demo purposes."""

from sqlalchemy.orm import Session

from api.auth.passwords import hash_password
from api.db.models import AuditLog, Ticket, User
from api.db.session import SessionLocal


def seed():
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
        viewer = User(
            username="viewer",
            password_hash=hash_password("password"),
            display_name="Read Only",
            role="viewer",
        )

        db.add_all([admin, op1, op2, viewer])
        db.flush()

        tickets_data = [
            {
                "title": "OOM kills on payment-service pod",
                "description": "## Root Cause Analysis\n\nPod `payment-service-7d4b8c` is being OOM-killed repeatedly.\n\n**Evidence:**\n- `kubectl describe pod` shows `OOMKilled` exit code\n- Memory usage trending at 490Mi against 512Mi limit\n- Heap dump shows leak in PaymentHandler.processRefund()\n\n**Timeline:** Started 2026-03-27 14:30 UTC after deploy v2.4.1",
                "area": "kubernetes",
                "confidence": 0.95,
                "risk": 0.9,
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
        print(f"Seeded {len(tickets_data)} tickets and 4 users.")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
