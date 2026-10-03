"""Pure early-warning calculations used by the API and unit tests."""
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from math import sqrt
from typing import Any, Iterable

from .rules import get_distance_meters

LEVELS = ("Normal", "Watch", "Warning", "Alert")


def _as_datetime(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


def _category(report: Any) -> str:
    value = report.get("issue_type", "Other") if isinstance(report, dict) else getattr(report, "issue_type", "Other")
    return str(value).strip().lower().replace("_", " ") or "other"


def _field(report: Any, name: str, default: Any = None) -> Any:
    return report.get(name, default) if isinstance(report, dict) else getattr(report, name, default)


def _cluster_size(reports: list[Any]) -> int:
    largest = 0
    for report in reports:
        nearby = [
            other for other in reports
            if get_distance_meters(
                float(_field(report, "lat", 0)), float(_field(report, "lng", 0)),
                float(_field(other, "lat", 0)), float(_field(other, "lng", 0)),
            ) <= 300
        ]
        largest = max(largest, len(nearby))
    return largest


def _z_score(current: int, baseline: list[int]) -> float:
    if not baseline:
        return float(current > 0)
    mean = sum(baseline) / len(baseline)
    deviation = sqrt(sum((value - mean) ** 2 for value in baseline) / len(baseline))
    return (current - mean) / deviation if deviation else float(current > mean)


def evaluate_water_body(
    reports: Iterable[Any],
    water_body_id: int,
    *,
    category: str | None = None,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Return one warning for a water body/category without touching a database."""
    current_time = now or datetime.now(timezone.utc)
    normalized = [
        report for report in reports
        if _field(report, "water_body_id") == water_body_id
        and (category is None or _category(report) == category.lower())
    ]
    if category is None:
        categories = sorted({_category(report) for report in normalized})
        evaluations = [
            evaluate_water_body(normalized, water_body_id, category=item, now=current_time)
            for item in categories
        ]
        return max(evaluations, key=lambda item: LEVELS.index(item["level"])) if evaluations else {
            "level": "Normal", "category": "other", "report_count": 0,
            "reason": "No recent reports indicate an emerging risk.",
        }

    current_start = current_time - timedelta(days=7)
    recent_start = current_time - timedelta(hours=24)
    current = [r for r in normalized if _as_datetime(_field(r, "created_at")) >= current_start]
    last_day = [r for r in current if _as_datetime(_field(r, "created_at")) >= recent_start]
    baseline_start = current_time - timedelta(days=14)
    baseline = [r for r in normalized if baseline_start <= _as_datetime(_field(r, "created_at")) < current_start]
    daily_current = [sum(
        1 for report in current
        if _as_datetime(_field(report, "created_at")).date() == current_time.date() - timedelta(days=offset)
    ) for offset in range(7)]
    daily_baseline = [sum(
        1 for report in baseline
        if _as_datetime(_field(report, "created_at")).date() == current_time.date() - timedelta(days=7 + offset)
    ) for offset in range(7)]
    recent_days = sum(value > 0 for value in daily_current)
    cluster = _cluster_size(current)
    ratio = (len(current) / max(1, len(baseline)))
    z_score = _z_score(len(current), daily_baseline)

    level = "Normal"
    reason = "No recent reports indicate an emerging risk."
    if cluster >= 6 and len(current) >= 6:
        level = "Alert"
        reason = f"{cluster} reports of {category} within 300 m in 7 days, indicating an emerging risk."
    elif len(current) >= 4 and (ratio >= 2 or z_score >= 2):
        level = "Warning"
        reason = f"{len(current)} reports of {category} in 7 days, up from {len(baseline)} in the previous week, indicating an emerging risk."
    elif recent_days >= 3 and len(current) >= 3:
        level = "Watch"
        reason = f"{len(current)} reports of {category} recurring across {recent_days} days, an emerging risk to monitor."
    elif len(last_day) >= 3 and (ratio >= 1.5 or cluster >= 3):
        level = "Watch"
        reason = f"{len(last_day)} reports of {category} in the last 24 hours, suggesting an emerging risk."

    return {
        "level": level,
        "category": category,
        "report_count": len(current),
        "recent_24h": len(last_day),
        "baseline_count": len(baseline),
        "cluster_size": cluster,
        "ratio": round(ratio, 2),
        "z_score": round(z_score, 2),
        "reason": reason,
    }


def evaluate_all(reports: Iterable[Any], *, now: datetime | None = None) -> list[dict[str, Any]]:
    report_list = list(reports)
    water_bodies = sorted({_field(report, "water_body_id") for report in report_list if _field(report, "water_body_id") is not None})
    warnings = []
    for water_body_id in water_bodies:
        categories = sorted({
            _category(report) for report in report_list
            if _field(report, "water_body_id") == water_body_id
        })
        for category in categories:
            warning = evaluate_water_body(report_list, water_body_id, category=category, now=now)
            warning["water_body_id"] = water_body_id
            warnings.append(warning)
    return warnings
