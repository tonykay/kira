from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.core.deps import get_current_user_or_api_key
from api.db.models import Ticket, User
from api.db.session import get_db

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    auth: User | str = Depends(get_current_user_or_api_key),
):
    tickets = db.query(Ticket).all()

    status_counts = {"open": 0, "acknowledged": 0, "in_progress": 0, "resolved": 0, "closed": 0}
    area_counts: dict[str, int] = {}
    risk_distribution = {"high": 0, "medium": 0, "low": 0}
    confidences: list[float] = []

    for t in tickets:
        status_counts[t.status] = status_counts.get(t.status, 0) + 1
        area_counts[t.area] = area_counts.get(t.area, 0) + 1
        confidences.append(t.confidence)

        if t.risk >= 0.7:
            risk_distribution["high"] += 1
        elif t.risk >= 0.4:
            risk_distribution["medium"] += 1
        else:
            risk_distribution["low"] += 1

    avg_confidence = round(sum(confidences) / len(confidences), 2) if confidences else None

    return {
        "open": status_counts["open"],
        "acknowledged": status_counts["acknowledged"],
        "in_progress": status_counts["in_progress"],
        "resolved": status_counts["resolved"],
        "closed": status_counts["closed"],
        "avg_confidence": avg_confidence,
        "by_area": area_counts,
        "risk_distribution": risk_distribution,
    }
