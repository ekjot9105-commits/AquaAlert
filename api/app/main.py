from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, PlainTextResponse
from sqlmodel import SQLModel, Session, create_engine, select
from pydantic import BaseModel
from typing import Optional, List
import os
import json
import asyncio
import csv
import io
import time
from urllib.parse import urlencode
from urllib.request import urlopen
from datetime import datetime, timezone, timedelta
from .models import (User, WaterBody, Report, Case, CaseEvent,
                     EarlyWarning, ResponseUnit, Notification, XPEvent)
from .models import UserBadge, Badge, Checkin, StreamObservation, CommunityEvent
from .services.ai import get_ai_provider, RealVisionProvider
from .services.rules import calculate_priority, get_distance_meters
from .services.lifecycle import (validate_transition, get_xp_for_transition,
                                  should_create_alert, XP_AWARDS)
from .services.early_warning import evaluate_all
from .services.gamification import level_for_xp, quality_xp, DAILY_XP_CAP

# SQLite DB
sqlite_file_name = "database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"
connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, echo=False, connect_args=connect_args)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    # create_all does not alter existing SQLite tables. Keep the local Phase 2
    # database usable when the alert ownership field is introduced.
    with engine.connect() as connection:
        columns = connection.exec_driver_sql("PRAGMA table_info(early_warnings)").fetchall()
        if columns and "responsible_unit_id" not in {row[1] for row in columns}:
            connection.exec_driver_sql(
                "ALTER TABLE early_warnings ADD COLUMN responsible_unit_id INTEGER"
            )
            connection.commit()

def get_session():
    with Session(engine) as session:
        yield session

app = FastAPI(
    title="AquaAlert AI API",
    description="API for citizen environmental observations and early warnings",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _cities_config() -> dict:
    try:
        with open(CITY_CONFIG, encoding="utf-8") as file:
            return json.load(file)
    except (OSError, json.JSONDecodeError):
        return {"cities": []}


def _save_cities_config(config: dict) -> None:
    os.makedirs(os.path.dirname(CITY_CONFIG), exist_ok=True)
    with open(CITY_CONFIG, "w", encoding="utf-8") as file:
        json.dump(config, file, indent=2)


@app.get("/api/public/aggregates", tags=["Public API"])
def public_aggregates(x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"), session: Session = Depends(get_session)):
    expected = os.getenv("AQUAALERT_PUBLIC_API_KEY", "demo-public-key")
    if x_api_key != expected:
        raise HTTPException(401, "Use the X-API-Key header")
    reports = session.exec(select(Report)).all()
    return {
        "cities": _cities_config()["cities"],
        "total_reports": len(reports),
        "verified_reports": sum(report.status == "Verified" for report in reports),
        "water_bodies": len(session.exec(select(WaterBody)).all()),
        "active_warnings": len(session.exec(select(EarlyWarning).where(EarlyWarning.resolved_at == None)).all()),
        "note": "Aggregated demo data only; no personal or precise home-location data is included.",
    }


@app.get("/api/research/export.csv", tags=["Interoperability"])
def researcher_csv_export(session: Session = Depends(get_session)):
    rows = io.StringIO()
    writer = csv.writer(rows)
    writer.writerow(["report_id", "water_body_id", "issue_type", "priority", "status", "ai_confidence", "created_at"])
    for report in session.exec(select(Report).where(Report.status == "Verified")).all():
        writer.writerow([report.id, report.water_body_id, report.issue_type, report.priority, report.status, report.ai_confidence, report.created_at.isoformat()])
    return PlainTextResponse(rows.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=aquaalert-verified-cases.csv"})


@app.get("/admin/cities", tags=["Administration"])
def list_cities():
    return _cities_config()


class CityConfigRequest(BaseModel):
    id: str
    name: str
    center_lat: float
    center_lng: float
    default_unit: str


@app.post("/admin/cities", tags=["Administration"])
def add_city(req: CityConfigRequest):
    config = _cities_config()
    if any(city["id"] == req.id for city in config["cities"]):
        raise HTTPException(409, "City id already exists")
    config["cities"].append({"id": req.id, "name": req.name, "center": {"lat": req.center_lat, "lng": req.center_lng}, "routing": {"default_unit": req.default_unit}})
    _save_cities_config(config)
    return config["cities"][-1]

# ── SSE event bus ────────────────────────────────────────────
# Simple in-memory event bus for server-sent events
_sse_subscribers: list = []
_weather_cache: dict[int, tuple[float, dict]] = {}
CITY_CONFIG = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config", "cities.json")

def broadcast_event(event_type: str, data: dict):
    """Push an event to all SSE subscribers."""
    import json as _json
    msg = _json.dumps({"type": event_type, **data})
    for q in _sse_subscribers:
        try:
            q.put_nowait(msg)
        except:
            pass

# ── Startup & Seed ───────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    _seed_data()

def _seed_data():
    """Seed mock users, water bodies, and response units if empty."""
    with Session(engine) as s:
        if s.exec(select(User)).first():
            return
        users = [
            User(handle="citizen1", display_name="Aanya Sharma", role="citizen", xp=150, level=2, trust_score=3.5),
            User(handle="reviewer1", display_name="Dr. Mehra", role="reviewer", xp=400, level=4, trust_score=4.8),
            User(handle="authority1", display_name="Officer Kapoor", role="authority", xp=600, level=5, trust_score=5.0),
            User(handle="researcher1", display_name="Prof. Rao", role="researcher", xp=200, level=3, trust_score=4.0),
        ]
        for u in users:
            s.add(u)

        wbs = [
            WaterBody(name="Lake Hussain Sagar", type="lake", city="Hyderabad",
                      center_lat=17.4239, center_lng=78.4738, health_score=62, status="Watch"),
            WaterBody(name="Musi River", type="river", city="Hyderabad",
                      center_lat=17.3700, center_lng=78.4800, health_score=38, status="Warning"),
            WaterBody(name="Durgam Cheruvu", type="lake", city="Hyderabad",
                      center_lat=17.4340, center_lng=78.3876, health_score=85, status="Healthy"),
        ]
        for wb in wbs:
            s.add(wb)

        units = [
            ResponseUnit(name="GHMC Water Wing", contact="040-21111111",
                        covered_water_body_ids="[1,2]"),
            ResponseUnit(name="PCB Hyderabad", contact="040-23892920",
                        covered_water_body_ids="[1,2,3]"),
        ]
        for u in units:
            s.add(u)
        s.commit()


# ── Auth ─────────────────────────────────────────────────────
class AuthResponse(BaseModel):
    token: str
    role: str
    user: dict

@app.post("/auth/login", tags=["Auth"])
def login(role: str = "citizen", session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.role == role)).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"No mock user found for role {role}")
    return {"token": f"mock-token-{role}-{user.id}", "role": role, "user": user.model_dump()}

@app.get("/users/me", tags=["Users"])
def get_me(token: str = "mock-token-citizen-1", session: Session = Depends(get_session)):
    user_id = int(token.split("-")[-1])
    user = session.get(User, user_id)
    return user

@app.get("/users", tags=["Users"])
def list_users(session: Session = Depends(get_session)):
    return session.exec(select(User)).all()


# ── Water Bodies ─────────────────────────────────────────────
@app.get("/water-bodies", tags=["Water Bodies"])
def list_water_bodies(session: Session = Depends(get_session)):
    return session.exec(select(WaterBody)).all()

@app.get("/water-bodies/{wb_id}", tags=["Water Bodies"])
def get_water_body(wb_id: int, session: Session = Depends(get_session)):
    return session.get(WaterBody, wb_id)


def _weather_context(body: WaterBody) -> dict:
    cached = _weather_cache.get(body.id or 0)
    if cached and time.time() - cached[0] < 900:
        return cached[1]
    query = urlencode({
        "latitude": body.center_lat,
        "longitude": body.center_lng,
        "past_days": 2,
        "forecast_days": 1,
        "hourly": "precipitation,temperature_2m,wind_speed_10m",
        "timezone": "UTC",
    })
    try:
        with urlopen(f"https://api.open-meteo.com/v1/forecast?{query}", timeout=3) as response:
            payload = json.loads(response.read())
        hourly = payload.get("hourly", {})
        precipitation = [float(value or 0) for value in hourly.get("precipitation", [])[-48:]]
        temperatures = [float(value or 0) for value in hourly.get("temperature_2m", [])[-48:]]
        wind = [float(value or 0) for value in hourly.get("wind_speed_10m", [])[-48:]]
        rainfall = round(sum(precipitation), 1)
        average_temp = round(sum(temperatures) / len(temperatures), 1) if temperatures else None
        average_wind = round(sum(wind) / len(wind), 1) if wind else None
        result = {
            "available": True,
            "rainfall_last_48h_mm": rainfall,
            "average_temperature_c": average_temp,
            "average_wind_kmh": average_wind,
            "factors": [
                factor for factor, active in (
                    ("heavy rain in the last 48 hours", rainfall >= 20),
                    ("warm and still conditions", average_temp is not None and average_wind is not None and average_temp >= 28 and average_wind <= 8),
                ) if active
            ],
        }
    except (OSError, ValueError, KeyError, json.JSONDecodeError):
        result = {"available": False, "rainfall_last_48h_mm": None, "average_temperature_c": None, "average_wind_kmh": None, "factors": []}
    _weather_cache[body.id or 0] = (time.time(), result)
    return result


@app.get("/api/water-bodies/{water_body_id}/weather", tags=["Water Bodies"])
def water_body_weather(water_body_id: int, session: Session = Depends(get_session)):
    body = session.get(WaterBody, water_body_id)
    if not body:
        raise HTTPException(404, "Water body not found")
    return {"water_body_id": body.id, "water_body_name": body.name, **_weather_context(body)}


# ── Response Units ───────────────────────────────────────────
@app.get("/response-units", tags=["Response Units"])
def list_response_units(session: Session = Depends(get_session)):
    return session.exec(select(ResponseUnit)).all()


# ── AI Assessment ────────────────────────────────────────────
class AssessRequest(BaseModel):
    image_b64: str
    text: str


class ExplainRequest(BaseModel):
    water_body_id: int
    audience: str = "citizen"
    language: str = "English"


@app.post("/api/explain", tags=["Insights"])
def explain_water_body(req: ExplainRequest, session: Session = Depends(get_session)):
    body = session.get(WaterBody, req.water_body_id)
    if not body:
        raise HTTPException(404, "Water body not found")
    if req.audience not in ("citizen", "researcher"):
        raise HTTPException(400, "Audience must be citizen or researcher")
    reports = session.exec(select(Report).where(Report.water_body_id == body.id).order_by(Report.created_at.desc())).all()
    warning = max(
        evaluate_all(reports, now=datetime.now(timezone.utc)),
        key=lambda item: ("Normal", "Watch", "Warning", "Alert").index(item["level"]),
        default={"level": "Normal", "reason": "No recent reports indicate an emerging risk.", "category": "none"},
    )
    weather = _weather_context(body)
    observed = f"{len(reports)} reports are recorded for {body.name}; the most common recent category is {warning['category']}."
    trend = warning["reason"]
    ecosystem = "This may help teams notice changes in the water ecosystem earlier." if req.audience == "citizen" else "The pattern is an environmental signal for prioritization and follow-up, not a validated ecological diagnosis."
    unknown = "The available reports cannot establish the cause, toxicity, pathogen presence, or human-health impact."
    if req.language.lower().startswith("hindi"):
        observed = f"{body.name} के लिए {len(reports)} रिपोर्ट दर्ज हैं; हाल की सबसे सामान्य श्रेणी {warning['category']} है।"
        trend = "रुझान: " + warning["reason"]
        ecosystem = "यह जल पारिस्थितिकी तंत्र में बदलावों को जल्दी देखने में मदद कर सकता है।"
        unknown = "इन रिपोर्टों से कारण, विषाक्तता, रोगाणु या स्वास्थ्य प्रभाव की पुष्टि नहीं होती।"
    if req.audience == "researcher":
        summary = f"Observed: {observed} Trend: {trend} Interpretation: {ecosystem} Unknowns: {unknown}"
    else:
        summary = f"What we saw: {observed} What is changing: {trend} Why it matters: {ecosystem} What we do not know: {unknown}"
    return {
        "water_body_id": body.id,
        "audience": req.audience,
        "language": req.language,
        "summary": summary,
        "weather_context": weather["factors"],
        "provider": "mock-safe-summary",
        "limitations": "Visual and community reports are not a laboratory test or confirmation of contamination.",
    }

@app.post("/ai/assess", tags=["AI"])
def assess_image(req: AssessRequest):
    ai = get_ai_provider()
    result = ai.assess(req.image_b64, req.text, {})
    return {
        "result": result.model_dump(),
        "provider": "Vision" if isinstance(ai, RealVisionProvider) else "Mock"
    }


# ── Reports ──────────────────────────────────────────────────
@app.post("/reports", tags=["Reports"])
def create_report(report: dict, session: Session = Depends(get_session)):
    reporter = session.get(User, report.get('user_id', 1))
    trust_score = reporter.trust_score if reporter else 1.0

    ai_json_str = report.get("ai_result_json", "{}")
    ai_conf = report.get("ai_confidence", 0.0)
    ai_pri = report.get("ai_priority", "Low")
    if not reporter:
        raise HTTPException(404, "Reporter not found")
    if not report.get("description") or not report.get("issue_type"):
        raise HTTPException(400, "A report needs a description and category")
    water_body = session.get(WaterBody, report.get("water_body_id")) if report.get("water_body_id") else None
    if water_body and get_distance_meters(report.get("lat", 0), report.get("lng", 0), water_body.center_lat, water_body.center_lng) > 5000:
        raise HTTPException(400, "Location is too far from the selected water body")
    recent_cutoff = datetime.now(timezone.utc) - timedelta(minutes=10)
    duplicates = session.exec(select(Report).where(
        Report.user_id == reporter.id,
        Report.created_at >= recent_cutoff,
        Report.lat == report.get("lat"),
        Report.lng == report.get("lng"),
        Report.issue_type == report.get("issue_type"),
    )).first()
    if duplicates:
        raise HTTPException(429, "A similar report was already submitted from this location recently")

    categories = []
    try:
        ai_data = json.loads(ai_json_str)
        if "categories" in ai_data:
            categories = [c.get("label", "") for c in ai_data["categories"]]
    except:
        pass

    final_priority, rules, needs_verif = calculate_priority(
        ai_pri, ai_conf, categories, trust_score, 0, 1000
    )

    report["rules_triggered_json"] = json.dumps(rules)
    report["priority"] = final_priority
    if needs_verif:
        report["status"] = "Under Review"

    new_report = Report(**report)
    session.add(new_report)
    session.commit()
    session.refresh(new_report)
    refresh_early_warnings(session)
    session.commit()

    # Award submission XP
    if reporter:
        _award_xp(session, reporter.id, XP_AWARDS["report_submitted"], "Report submitted")
        session.commit()

    # Broadcast SSE
    broadcast_event("new_report", {"report_id": new_report.id, "priority": new_report.priority,
                                    "status": new_report.status})
    return new_report

@app.get("/reports", tags=["Reports"])
def list_reports(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    user_id: Optional[int] = None,
    session: Session = Depends(get_session)
):
    stmt = select(Report)
    if status:
        stmt = stmt.where(Report.status == status)
    if priority:
        stmt = stmt.where(Report.priority == priority)
    if user_id:
        stmt = stmt.where(Report.user_id == user_id)
    return session.exec(stmt.order_by(Report.created_at.desc())).all()

@app.get("/reports/{report_id}", tags=["Reports"])
def get_report(report_id: int, session: Session = Depends(get_session)):
    report = session.get(Report, report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    return report


@app.get("/api/reports/{report_id}/fhir", tags=["Interoperability"])
def export_fhir_observation(report_id: int, session: Session = Depends(get_session)):
    report = session.get(Report, report_id)
    if not report or report.status != "Verified":
        raise HTTPException(404, "Only verified cases can be exported")
    case = session.exec(select(Case).where(Case.report_id == report.id)).first()
    resource = {
        "resourceType": "Observation",
        "meta": {"profile": ["http://hl7.org/fhir/R4/observation.html"]},
        "status": "final",
        "category": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/observation-category", "code": "environment", "display": "Environment"}]}],
        "code": {"coding": [{"system": "https://aquaalert.example/issue-type", "code": report.issue_type.lower().replace(" ", "-"), "display": report.issue_type}]},
        "subject": {"display": f"Water body {report.water_body_id or 'unassigned'}"},
        "effectiveDateTime": report.created_at.isoformat(),
        "component": [
            {"code": {"text": "Issue type"}, "valueString": report.issue_type},
            {"code": {"text": "AI confidence"}, "valueQuantity": {"value": report.ai_confidence, "unit": "score"}},
            {"code": {"text": "Location"}, "valueString": f"{report.lat:.6f}, {report.lng:.6f}"},
            {"code": {"text": "AquaAlert status"}, "valueString": report.status},
        ],
        "note": [{"text": "Illustrative mapping for interoperability demonstration; not a clinical record."}],
    }
    if case and case.verified_by:
        resource["performer"] = [{"reference": f"Practitioner/{case.verified_by}"}]
    return resource


# ── Report Status Transition ─────────────────────────────────
class StatusChangeRequest(BaseModel):
    new_status: str
    actor_id: int
    actor_role: str
    note: Optional[str] = None
    reason: Optional[str] = None
    assigned_unit_id: Optional[int] = None
    after_evidence_url: Optional[str] = None
    edited_category: Optional[str] = None
    edited_priority: Optional[str] = None

@app.patch("/reports/{report_id}/status", tags=["Reports"])
def change_report_status(report_id: int, req: StatusChangeRequest, session: Session = Depends(get_session)):
    report = session.get(Report, report_id)
    if not report:
        raise HTTPException(404, "Report not found")

    # Validate transition
    ok, err = validate_transition(report.status, req.new_status, req.actor_role)
    if not ok:
        raise HTTPException(400, err)

    # Rejection requires a reason
    if req.new_status == "Rejected" and not req.reason:
        raise HTTPException(400, "Rejection requires a reason")

    # Resolution requires a note
    if req.new_status == "Resolved" and not req.note:
        raise HTTPException(400, "Resolution requires notes")

    old_status = report.status
    report.status = req.new_status
    case = session.exec(select(Case).where(Case.report_id == report_id)).first()
    if not case:
        case = Case(report_id=report_id, status=old_status)
        session.add(case)
        session.flush()
    case.status = req.new_status
    case.verified_by = req.actor_id if req.new_status == "Verified" else case.verified_by
    if req.assigned_unit_id:
        case.assigned_unit_id = req.assigned_unit_id
    if req.new_status == "Assigned" and not case.assigned_unit_id:
        default_unit = session.exec(select(ResponseUnit).order_by(ResponseUnit.id.asc())).first()
        if default_unit:
            case.assigned_unit_id = default_unit.id
    if req.new_status == "Resolved":
        case.resolved_at = datetime.now(timezone.utc)
        case.after_evidence_url = req.after_evidence_url
    if req.new_status == "Rejected":
        reporter = session.get(User, report.user_id)
        if reporter:
            reporter.trust_score = max(0.0, reporter.trust_score - 0.25)

    # Apply optional edits
    if req.edited_category:
        report.issue_type = req.edited_category
    if req.edited_priority:
        report.priority = req.edited_priority

    # Create a case event
    event = CaseEvent(
        case_id=case.id,
        actor_id=req.actor_id,
        actor_role=req.actor_role,
        event_type=f"status_change:{old_status}→{req.new_status}",
        note=req.note or req.reason or f"Status changed to {req.new_status}",
    )
    session.add(event)

    # Create alert on high-priority verified
    if should_create_alert(req.new_status, report.priority):
        alert = EarlyWarning(
            water_body_id=report.water_body_id or 1,
            responsible_unit_id=case.assigned_unit_id,
            level="Alert",
            category=report.issue_type,
            reason_text=f"High-priority verified report AQA-{report.id}",
            report_count=1,
        )
        session.add(alert)

    # Handle assignment
    if req.new_status == "Assigned" and req.assigned_unit_id:
        # Store in a case event note
        assign_event = CaseEvent(
            case_id=case.id,
            actor_id=req.actor_id,
            actor_role=req.actor_role,
            event_type="assignment",
            note=f"Assigned to response unit #{req.assigned_unit_id}",
        )
        session.add(assign_event)

    # After-photo on resolution
    if req.new_status == "Resolved" and req.after_evidence_url:
        resolve_event = CaseEvent(
            case_id=case.id,
            actor_id=req.actor_id,
            actor_role=req.actor_role,
            event_type="after_photo",
            note=f"After photo: {req.after_evidence_url}",
        )
        session.add(resolve_event)

    # XP awards
    xp_awards = get_xp_for_transition(req.new_status)
    for target_key, amount, reason in xp_awards:
        target_user_id = report.user_id if target_key == "reporter" else req.actor_id
        _award_xp(session, target_user_id, amount, reason)
    if req.new_status == "Verified":
        _award_badge(session, report.user_id, "Verified Reporter", "A reviewer verified one of your observations.", "Common")
    if req.new_status == "Resolved":
        _award_badge(session, report.user_id, "Clean Water Champion", "A case you reported reached resolution.", "Rare")

    # Notification for the citizen
    if report.user_id != req.actor_id:
        status_msg = {
            "Under Review": "Your report is now under review.",
            "Verified": "Your report has been verified! +20 XP",
            "Rejected": f"Your report was not verified. Reason: {req.reason or 'N/A'}",
            "Needs Field Check": "A field check has been requested for your report.",
            "Assigned": "Your report has been assigned to a response unit.",
            "Action Taken": "Action has been taken on your report.",
            "Resolved": "Your report has been resolved! +30 XP 🎉",
        }
        msg = status_msg.get(req.new_status, f"Report status updated to {req.new_status}")
        notif = Notification(user_id=report.user_id, message=msg)
        session.add(notif)

    session.commit()
    session.refresh(report)

    broadcast_event("status_change", {
        "report_id": report.id,
        "old_status": old_status,
        "new_status": req.new_status,
        "priority": report.priority
    })

    return report


# ── Case Events (Timeline) ──────────────────────────────────
@app.get("/reports/{report_id}/events", tags=["Reports"])
def get_report_events(report_id: int, session: Session = Depends(get_session)):
    case = session.exec(select(Case).where(Case.report_id == report_id)).first()
    if not case:
        return []
    events = session.exec(
        select(CaseEvent).where(CaseEvent.case_id == case.id)
        .order_by(CaseEvent.created_at.asc())
    ).all()
    return events


# ── Notifications ────────────────────────────────────────────
@app.get("/notifications", tags=["Notifications"])
def get_notifications(user_id: int, session: Session = Depends(get_session)):
    return session.exec(
        select(Notification).where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
    ).all()

@app.patch("/notifications/{notif_id}/read", tags=["Notifications"])
def mark_notification_read(notif_id: int, session: Session = Depends(get_session)):
    notif = session.get(Notification, notif_id)
    if not notif:
        raise HTTPException(404, "Notification not found")
    notif.is_read = True
    session.commit()
    return {"ok": True}


# ── Dashboard Endpoints ──────────────────────────────────────
@app.get("/dashboard/queue", tags=["Dashboard"])
def dashboard_queue(
    priority: Optional[str] = None,
    status: Optional[str] = None,
    water_body_id: Optional[int] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    session: Session = Depends(get_session)
):
    """Returns reports sorted by priority (High first) then age (oldest first)."""
    stmt = select(Report)
    
    # Exclude terminal states by default (show active cases)
    active_statuses = ["New", "Under Review", "Verified", "Assigned", 
                       "Action Taken", "Needs Field Check"]
    if status:
        stmt = stmt.where(Report.status == status)
    else:
        stmt = stmt.where(Report.status.in_(active_statuses))
    
    if priority:
        stmt = stmt.where(Report.priority == priority)
    if water_body_id:
        stmt = stmt.where(Report.water_body_id == water_body_id)
    if category:
        stmt = stmt.where(Report.issue_type == category)
    if search:
        stmt = stmt.where(Report.description.contains(search))

    reports = session.exec(stmt.order_by(Report.created_at.asc())).all()

    # Sort: High > Medium > Low, then by age
    priority_order = {"High": 0, "Medium": 1, "Low": 2}
    reports_sorted = sorted(reports, key=lambda r: (priority_order.get(r.priority, 3), r.created_at))
    
    return reports_sorted

@app.get("/dashboard/stats", tags=["Dashboard"])
def dashboard_stats(session: Session = Depends(get_session)):
    """Needs-attention cards and summary stats."""
    reports = session.exec(select(Report)).all()
    
    high_unreviewed = len([r for r in reports if r.priority == "High" and r.status in ("New", "Under Review")])
    
    # SLA: reports older than 24h still in New or Under Review
    now = datetime.now(timezone.utc)
    sla_breach = len([r for r in reports 
                      if r.status in ("New", "Under Review") 
                      and (now - r.created_at).total_seconds() > 86400])
    
    active_warnings = session.exec(
        select(EarlyWarning).where(EarlyWarning.resolved_at == None)
    ).all()
    
    total_active = len([r for r in reports if r.status not in ("Resolved", "Rejected")])
    total_resolved = len([r for r in reports if r.status == "Resolved"])
    
    return {
        "high_unreviewed": high_unreviewed,
        "sla_breaching": sla_breach,
        "active_warnings": len(active_warnings),
        "total_active": total_active,
        "total_resolved": total_resolved,
        "total_reports": len(reports),
        "warnings": [w.model_dump() for w in active_warnings],
    }

@app.get("/dashboard/nearby/{report_id}", tags=["Dashboard"])
def get_nearby_reports(report_id: int, session: Session = Depends(get_session)):
    """Find similar reports within 7 days and ~2km."""
    report = session.get(Report, report_id)
    if not report:
        return []
    
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    all_reports = session.exec(
        select(Report).where(Report.created_at >= week_ago)
    ).all()
    
    nearby = []
    for r in all_reports:
        if r.id == report_id:
            continue
        dist = get_distance_meters(report.lat, report.lng, r.lat, r.lng)
        if dist < 2000:
            nearby.append({**r.model_dump(), "distance_m": round(dist)})
    return nearby


# ── Early Warnings ───────────────────────────────────────────
@app.get("/early-warnings", tags=["Alerts"])
def list_early_warnings(session: Session = Depends(get_session)):
    refresh_early_warnings(session)
    session.commit()
    return session.exec(select(EarlyWarning).where(EarlyWarning.resolved_at == None)).all()


@app.get("/api/early-warnings", tags=["Alerts"])
def list_api_early_warnings(session: Session = Depends(get_session)):
    return list_early_warnings(session)


@app.get("/api/trends", tags=["Analytics"])
def get_trends(session: Session = Depends(get_session)):
    reports = session.exec(select(Report)).all()
    now = datetime.now(timezone.utc)
    output = []
    for warning in evaluate_all(reports, now=now):
        water_body = session.get(WaterBody, warning["water_body_id"])
        points = []
        for offset in range(13, -1, -1):
            day = now - timedelta(days=offset)
            points.append({
                "date": day.date().isoformat(),
                "count": sum(
                    1 for report in reports
                    if report.water_body_id == warning["water_body_id"]
                    and report.issue_type.lower().replace("_", " ") == warning["category"]
                    and _report_day(report.created_at) == day.date()
                ),
            })
        output.append({
            **warning,
            "water_body_name": water_body.name if water_body else f"Water body {warning['water_body_id']}",
            "sparkline": points,
        })
    return output


# ── SSE Endpoint ─────────────────────────────────────────────
@app.get("/events/stream", tags=["SSE"])
async def sse_stream():
    """Server-Sent Events stream for live updates."""
    q = asyncio.Queue()
    _sse_subscribers.append(q)

    async def event_generator():
        try:
            while True:
                try:
                    msg = await asyncio.wait_for(q.get(), timeout=30.0)
                    yield f"data: {msg}\n\n"
                except asyncio.TimeoutError:
                    yield f"data: {json.dumps({'type': 'heartbeat'})}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            if q in _sse_subscribers:
                _sse_subscribers.remove(q)

    return StreamingResponse(event_generator(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ── Polling alternative ─────────────────────────────────────
@app.get("/events/poll", tags=["SSE"])
def poll_events(since: Optional[str] = None, session: Session = Depends(get_session)):
    """Poll for recent case events (fallback for SSE)."""
    if since:
        try:
            since_dt = datetime.fromisoformat(since)
        except:
            since_dt = datetime.now(timezone.utc) - timedelta(seconds=10)
    else:
        since_dt = datetime.now(timezone.utc) - timedelta(seconds=10)
    
    events = session.exec(
        select(CaseEvent).where(CaseEvent.created_at >= since_dt)
        .order_by(CaseEvent.created_at.desc())
    ).all()
    return events


# ── Misc ─────────────────────────────────────────────────────
@app.post("/upload", tags=["Media"])
async def upload_file(file: UploadFile = File(...)):
    return {"url": f"/static/uploads/mock_{file.filename}", "message": "File processed (mock)"}

@app.get("/analytics/summary", tags=["Analytics"])
def get_analytics_summary(session: Session = Depends(get_session)):
    reports = session.exec(select(Report)).all()
    now = datetime.now(timezone.utc)
    verified = [r for r in reports if r.status not in ("New", "Under Review")]
    resolved = [r for r in reports if r.status == "Resolved"]
    verification_hours = [
        (now - r.created_at).total_seconds() / 3600 for r in verified
    ]
    resolution_hours = [
        (now - r.created_at).total_seconds() / 3600 for r in resolved
    ]
    issue_distribution = {}
    water_body_counts = {}
    for report in reports:
        issue_distribution[report.issue_type] = issue_distribution.get(report.issue_type, 0) + 1
        key = str(report.water_body_id or "Unassigned")
        water_body_counts[key] = water_body_counts.get(key, 0) + 1
    timeline = []
    for offset in range(13, -1, -1):
        day = (now - timedelta(days=offset)).date()
        timeline.append({
            "date": day.isoformat(),
            "reports": sum(_report_day(r.created_at) == day for r in reports),
        })
    return {
        "total_reports": len(reports),
        "active_warnings": len(session.exec(select(EarlyWarning).where(EarlyWarning.resolved_at == None)).all()),
        "issue_distribution": [{"name": key, "value": value} for key, value in issue_distribution.items()],
        "reports_over_time": timeline,
        "top_water_bodies": [{"name": key, "reports": value} for key, value in sorted(water_body_counts.items(), key=lambda item: item[1], reverse=True)],
        "median_hours_to_verify": round(_median(verification_hours), 1),
        "median_hours_to_resolve": round(_median(resolution_hours), 1),
        "sla_compliance": round(sum(value <= 24 for value in verification_hours) / len(verification_hours) * 100, 1) if verification_hours else 100,
        "category_mix": [{"name": key, "value": value} for key, value in issue_distribution.items()],
    }

@app.get("/leaderboard", tags=["Gamification"])
def get_leaderboard(session: Session = Depends(get_session)):
    users = session.exec(select(User).where(User.role == "citizen").order_by(User.xp.desc()).limit(10)).all()
    return [{"rank": index + 1, "handle": user.handle, "xp": user.xp, **level_for_xp(user.xp)} for index, user in enumerate(users)]


QUEST_CATALOG = [
    {"key": "daily-check", "title": "Daily Water Check", "description": "Check one water body and share whether it looks fine.", "xp_reward": 10, "is_daily": True},
    {"key": "photo-observation", "title": "Sharp Eyes", "description": "Add one photo with a safe location.", "xp_reward": 20, "is_daily": True},
    {"key": "neighbor-confirmation", "title": "I See It Too", "description": "Confirm a neighbor report without approaching hazardous water.", "xp_reward": 15, "is_daily": True},
    {"key": "two-water-bodies", "title": "Two Shores", "description": "Check two different water bodies this week.", "xp_reward": 40, "is_daily": False},
]


@app.get("/guardian/home", tags=["Gamification"])
def guardian_home(user_id: int = 1, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, "Citizen not found")
    adopted_ids = json.loads(user.adopted_water_body_ids or "[]")
    adopted = [session.get(WaterBody, item) for item in adopted_ids]
    today = datetime.now(timezone.utc).date()
    quests = [{"key": item["key"], **item, "completed": _quest_completed(session, user.id, item["key"], today)} for item in QUEST_CATALOG]
    reports = session.exec(select(Report).where(Report.user_id == user.id).order_by(Report.created_at.desc()).limit(10)).all()
    return {
        "user": {"id": user.id, "handle": user.handle, "xp": user.xp, "streak": user.streak_count, **level_for_xp(user.xp)},
        "adopted": [body.model_dump() for body in adopted if body],
        "quests": quests,
        "badges": _badges_for_user(session, user.id),
        "impact": [{"report_id": item.id, "status": item.status, "issue_type": item.issue_type, "created_at": item.created_at} for item in reports],
        "city_goal": {"current": len(session.exec(select(Report)).all()), "target": 500, "label": "500 safe observations unlock the City Water Report"},
    }


class DailyCheckRequest(BaseModel):
    user_id: int = 1
    water_body_id: int
    response: str


class StreamCheckupRequest(BaseModel):
    user_id: int = 1
    water_body_id: int
    water_color: str
    clarity: str
    floating_material: str
    smell: str
    wildlife: str
    recent_rain: str


@app.post("/guardian/stream-checkup", tags=["Gamification"])
def stream_checkup(req: StreamCheckupRequest, session: Session = Depends(get_session)):
    user = session.get(User, req.user_id)
    body = session.get(WaterBody, req.water_body_id)
    if not user or not body:
        raise HTTPException(404, "User or water body not found")
    answers = req.model_dump(exclude={"user_id", "water_body_id"})
    allowed = {
        "water_color": {"clear", "green", "brown", "other"},
        "clarity": {"clear", "cloudy", "very_cloudy"},
        "floating_material": {"none", "natural", "litter", "unknown"},
        "smell": {"none", "earthy", "strong_or_unusual", "unknown"},
        "wildlife": {"none_seen", "fish_birds", "distress", "unknown"},
        "recent_rain": {"none", "light", "heavy", "unknown"},
    }
    for field, values in allowed.items():
        if answers[field] not in values:
            raise HTTPException(400, f"Invalid {field.replace('_', ' ')}")
    today = datetime.now(timezone.utc).date()
    previous = session.exec(
        select(StreamObservation).where(StreamObservation.user_id == user.id, StreamObservation.water_body_id == body.id)
    ).all()
    if any(_report_day(item.created_at) == today for item in previous):
        latest = max(previous, key=lambda item: item.created_at)
        return {
            "ok": True,
            "duplicate": True,
            "xp_awarded": 0,
            "quality_score": latest.quality_score,
            "observation": json.loads(latest.observations_json),
            "user": {"xp": user.xp, "streak": user.streak_count, **level_for_xp(user.xp)},
        }
    quality_score = round(sum(bool(value and value != "unknown") for value in answers.values()) / len(answers) * 100)
    events_today = session.exec(select(XPEvent).where(XPEvent.user_id == user.id)).all()
    awarded_today = sum(event.amount for event in events_today if _report_day(event.created_at) == today)
    base = 20 if quality_score < 70 else 35 if quality_score < 100 else 50
    amount = min(base, max(0, DAILY_XP_CAP - awarded_today))
    user.streak_count = max(1, user.streak_count + 1)
    user.last_active_date = datetime.now(timezone.utc)
    if amount:
        _award_xp(session, user.id, amount, f"stream-checkup:{body.id}:{today.isoformat()}")
    session.add(StreamObservation(
        user_id=user.id,
        water_body_id=body.id,
        observations_json=json.dumps(answers),
        quality_score=quality_score,
    ))
    _complete_quest(session, user.id, "daily-check", today)
    session.add(Notification(user_id=user.id, message=f"Stream Checkup saved at {body.name}. +{amount} XP"))
    session.commit()
    return {
        "ok": True,
        "duplicate": False,
        "xp_awarded": amount,
        "quality_score": quality_score,
        "observation": answers,
        "user": {"xp": user.xp, "streak": user.streak_count, **level_for_xp(user.xp)},
    }


@app.post("/guardian/daily-check", tags=["Gamification"])
def daily_check(req: DailyCheckRequest, session: Session = Depends(get_session)):
    if req.response not in ("fine", "off"):
        raise HTTPException(400, "Choose whether the water looks fine or something is off")
    user = session.get(User, req.user_id)
    body = session.get(WaterBody, req.water_body_id)
    if not user or not body:
        raise HTTPException(404, "User or water body not found")
    today = datetime.now(timezone.utc).date()
    key = f"daily-check:{body.id}:{today.isoformat()}"
    if session.exec(select(XPEvent).where(XPEvent.user_id == user.id, XPEvent.reason == key)).first():
        return {"ok": True, "duplicate": True, "xp_awarded": 0, "user": {"xp": user.xp, "streak": user.streak_count, **level_for_xp(user.xp)}}
    events_today = session.exec(select(XPEvent).where(XPEvent.user_id == user.id)).all()
    awarded_today = sum(event.amount for event in events_today if _report_day(event.created_at) == today)
    amount = min(quality_xp("daily_check"), max(0, DAILY_XP_CAP - awarded_today))
    user.streak_count = max(1, user.streak_count + 1)
    user.last_active_date = datetime.now(timezone.utc)
    if amount:
        _award_xp(session, user.id, amount, key)
    session.add(Checkin(user_id=user.id, water_body_id=body.id))
    _complete_quest(session, user.id, "daily-check", today)
    session.add(Notification(user_id=user.id, message=f"Daily water check complete at {body.name}. +{amount} XP"))
    session.commit()
    return {"ok": True, "duplicate": False, "xp_awarded": amount, "user": {"xp": user.xp, "streak": user.streak_count, **level_for_xp(user.xp)}}


class AdoptionRequest(BaseModel):
    user_id: int = 1
    water_body_id: int


@app.post("/guardian/adopt", tags=["Gamification"])
def adopt_water_body(req: AdoptionRequest, session: Session = Depends(get_session)):
    user = session.get(User, req.user_id)
    if not user or not session.get(WaterBody, req.water_body_id):
        raise HTTPException(404, "User or water body not found")
    ids = json.loads(user.adopted_water_body_ids or "[]")
    if req.water_body_id not in ids and len(ids) >= 3:
        raise HTTPException(400, "Guardians can adopt up to three water bodies")
    if req.water_body_id not in ids:
        ids.append(req.water_body_id)
    user.adopted_water_body_ids = json.dumps(ids)
    session.commit()
    return {"adopted_water_body_ids": ids}


class CommunityEventRequest(BaseModel):
    water_body_id: int
    title: str
    scheduled_for: datetime
    created_by: int = 3


@app.get("/api/community-events", tags=["Community"])
def list_community_events(session: Session = Depends(get_session)):
    events = session.exec(select(CommunityEvent).order_by(CommunityEvent.scheduled_for)).all()
    return [{**event.model_dump(), "participant_count": len(json.loads(event.participant_ids or "[]"))} for event in events]


@app.post("/api/community-events", tags=["Community"])
def schedule_community_event(req: CommunityEventRequest, session: Session = Depends(get_session)):
    if not session.get(WaterBody, req.water_body_id) or not session.get(User, req.created_by):
        raise HTTPException(404, "Water body or organizer not found")
    event = CommunityEvent(water_body_id=req.water_body_id, title=req.title, scheduled_for=req.scheduled_for, created_by=req.created_by)
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


class JoinCommunityEventRequest(BaseModel):
    user_id: int = 1


@app.post("/api/community-events/{event_id}/join", tags=["Community"])
def join_community_event(event_id: int, req: JoinCommunityEventRequest, session: Session = Depends(get_session)):
    event = session.get(CommunityEvent, event_id)
    user = session.get(User, req.user_id)
    if not event or not user:
        raise HTTPException(404, "Event or citizen not found")
    participants = json.loads(event.participant_ids or "[]")
    if user.id in participants:
        return {"joined": True, "duplicate": True, "xp_awarded": 0, "participant_count": len(participants)}
    participants.append(user.id)
    event.participant_ids = json.dumps(participants)
    amount = 15
    _award_xp(session, user.id, amount, f"community-event:{event.id}")
    session.add(Notification(user_id=user.id, message=f"You joined {event.title}. +{amount} XP"))
    session.commit()
    return {"joined": True, "duplicate": False, "xp_awarded": amount, "participant_count": len(participants)}


@app.get("/guardian/leaderboard", tags=["Gamification"])
def guardian_leaderboard(user_id: int = 1, session: Session = Depends(get_session)):
    users = session.exec(select(User).where(User.role == "citizen").order_by(User.xp.desc())).all()
    rows = [{"rank": index + 1, "handle": user.handle, "xp": user.xp, "tier": level_for_xp(user.xp)["name"]} for index, user in enumerate(users)]
    current = next((row for row in rows if row["handle"] == session.get(User, user_id).handle), None)
    return {"rows": rows[:10], "your_rank": current["rank"] if current else None, "week_label": datetime.now(timezone.utc).strftime("Week %W")}


def _quest_completed(session: Session, user_id: int, key: str, day) -> bool:
    return session.exec(select(XPEvent).where(XPEvent.user_id == user_id, XPEvent.reason == f"quest:{key}:{day.isoformat()}")).first() is not None


def _complete_quest(session: Session, user_id: int, key: str, day) -> None:
    if not _quest_completed(session, user_id, key, day):
        session.add(XPEvent(user_id=user_id, amount=0, reason=f"quest:{key}:{day.isoformat()}"))


def _badges_for_user(session: Session, user_id: int):
    badges = session.exec(select(UserBadge).where(UserBadge.user_id == user_id)).all()
    return [{"id": badge.badge_id, "awarded_at": badge.awarded_at, "name": session.get(Badge, badge.badge_id).name if session.get(Badge, badge.badge_id) else "Water Guardian"} for badge in badges]


def _award_badge(session: Session, user_id: int, name: str, description: str, rarity: str) -> None:
    badge = session.exec(select(Badge).where(Badge.name == name)).first()
    if not badge:
        badge = Badge(name=name, description=f"{description} · {rarity}")
        session.add(badge)
        session.flush()
    if not session.exec(select(UserBadge).where(UserBadge.user_id == user_id, UserBadge.badge_id == badge.id)).first():
        session.add(UserBadge(user_id=user_id, badge_id=badge.id))


# ── Helper ───────────────────────────────────────────────────
def _award_xp(session: Session, user_id: int, amount: int, reason: str):
    """Award XP to a user and log it."""
    user = session.get(User, user_id)
    if user:
        user.xp += amount
        # Level up every 200 XP
        user.level = (user.xp // 200) + 1
        xp_event = XPEvent(user_id=user_id, amount=amount, reason=reason)
        session.add(xp_event)


def _report_day(value: datetime):
    return (value if value.tzinfo else value.replace(tzinfo=timezone.utc)).date()


def _median(values: list[float]) -> float:
    if not values:
        return 0
    ordered = sorted(values)
    middle = len(ordered) // 2
    return ordered[middle] if len(ordered) % 2 else (ordered[middle - 1] + ordered[middle]) / 2


def refresh_early_warnings(session: Session) -> None:
    """Recompute active warnings and the water-body health projection."""
    reports = session.exec(select(Report)).all()
    warnings = evaluate_all(reports)
    by_water_body = {}
    for warning in warnings:
        current = by_water_body.setdefault(warning["water_body_id"], [])
        current.append(warning)
    for water_body_id, body_warnings in by_water_body.items():
        active = session.exec(select(EarlyWarning).where(
            EarlyWarning.water_body_id == water_body_id,
            EarlyWarning.resolved_at == None,
        )).all()
        for existing in active:
            session.delete(existing)
        for warning in body_warnings:
            if warning["level"] == "Normal":
                continue
            weather = _weather_context(session.get(WaterBody, water_body_id))
            if weather["factors"]:
                warning["reason"] = f"{warning['reason']} Context factors: {', '.join(weather['factors'])}; these are context only, not a causal finding."
            session.add(EarlyWarning(
                water_body_id=water_body_id,
                level=warning["level"],
                category=warning["category"],
                reason_text=warning["reason"],
                report_count=warning["report_count"],
            ))
    for water_body in session.exec(select(WaterBody)).all():
        body_warnings = by_water_body.get(water_body.id, [])
        if not body_warnings:
            for existing in session.exec(select(EarlyWarning).where(
                EarlyWarning.water_body_id == water_body.id,
                EarlyWarning.resolved_at == None,
            )).all():
                session.delete(existing)
        warning = max(body_warnings, key=lambda item: ("Normal", "Watch", "Warning", "Alert").index(item["level"]), default=None)
        score_by_level = {"Normal": 90, "Watch": 72, "Warning": 52, "Alert": 32}
        water_body.health_score = score_by_level.get(warning["level"] if warning else "Normal", 90)
        water_body.status = "Healthy" if not warning or warning["level"] == "Normal" else warning["level"]
