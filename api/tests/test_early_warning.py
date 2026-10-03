from datetime import datetime, timedelta, timezone

from app.services.early_warning import evaluate_water_body


NOW = datetime(2026, 10, 3, tzinfo=timezone.utc)


def report(days_ago: float, category="algae", lat=17.4, lng=78.4):
    return {
        "water_body_id": 1,
        "issue_type": category,
        "lat": lat,
        "lng": lng,
        "created_at": NOW - timedelta(days=days_ago),
    }


def test_quiet_baseline_does_not_fire():
    result = evaluate_water_body([report(8), report(10)], 1, now=NOW)
    assert result["level"] == "Normal"


def test_recent_ratio_becomes_warning():
    result = evaluate_water_body([report(day) for day in (1, 2, 3, 4, 8)], 1, now=NOW)
    assert result["level"] == "Warning"


def test_recurring_three_days_becomes_watch():
    result = evaluate_water_body([report(day) for day in (0.2, 1.2, 2.2)], 1, now=NOW)
    assert result["level"] == "Watch"


def test_spatial_cluster_becomes_alert():
    reports = [report(1, lat=17.4 + index * 0.0001, lng=78.4) for index in range(6)]
    assert evaluate_water_body(reports, 1, now=NOW)["level"] == "Alert"


def test_category_is_evaluated_separately():
    result = evaluate_water_body([report(1, "debris")] + [report(day) for day in (1, 2, 3, 4)], 1, category="algae", now=NOW)
    assert result["category"] == "algae"
    assert result["report_count"] == 4


def test_reason_uses_cautious_language():
    result = evaluate_water_body([report(day) for day in (1, 2, 3, 4)], 1, now=NOW)
    assert "emerging risk" in result["reason"]
    assert "confirmed" not in result["reason"].lower()
