from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy import Column, JSON

class UserBase(SQLModel):
    handle: str = Field(unique=True, index=True)
    display_name: str
    role: str # 'citizen', 'reviewer', 'authority'
    xp: int = Field(default=0)
    level: int = Field(default=1)
    streak_count: int = Field(default=0)
    trust_score: float = Field(default=1.0)
    avatar: Optional[str] = None
    adopted_water_body_ids: str = Field(default="[]") # JSON list of ints

class User(UserBase, table=True):
    __tablename__ = "users"
    id: Optional[int] = Field(default=None, primary_key=True)
    last_active_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WaterBodyBase(SQLModel):
    name: str
    type: str # 'lake', 'river', 'canal', 'pond'
    city: str
    center_lat: float
    center_lng: float
    polygon: str = Field(default="[]") # JSON geometry
    health_score: float = Field(default=100.0)
    status: str = Field(default="Healthy")

class WaterBody(WaterBodyBase, table=True):
    __tablename__ = "water_bodies"
    id: Optional[int] = Field(default=None, primary_key=True)

class ResponseUnitBase(SQLModel):
    name: str
    contact: str
    covered_water_body_ids: str = Field(default="[]") # JSON list of ints

class ResponseUnit(ResponseUnitBase, table=True):
    __tablename__ = "response_units"
    id: Optional[int] = Field(default=None, primary_key=True)

class ReportBase(SQLModel):
    user_id: int = Field(foreign_key="users.id")
    water_body_id: Optional[int] = Field(default=None, foreign_key="water_bodies.id")
    lat: float
    lng: float
    description: str
    issue_type: str
    evidence_url: str
    evidence_type: str = Field(default="image")
    ai_result_json: str = Field(default="{}")
    ai_confidence: float = Field(default=0.0)
    ai_priority: str = Field(default="Low")
    rules_triggered_json: str = Field(default="[]")
    priority: str = Field(default="Low")
    status: str = Field(default="New") # 'New', 'Under Review', 'Verified', 'Rejected'

class Report(ReportBase, table=True):
    __tablename__ = "reports"
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CaseBase(SQLModel):
    report_id: int = Field(foreign_key="reports.id")
    status: str = Field(default="Assigned") # 'Assigned', 'Action Taken', 'Resolved'
    assigned_unit_id: Optional[int] = Field(default=None, foreign_key="response_units.id")
    verified_by: Optional[int] = Field(default=None, foreign_key="users.id")
    decision: Optional[str] = None
    decision_reason: Optional[str] = None
    after_evidence_url: Optional[str] = None

class Case(CaseBase, table=True):
    __tablename__ = "cases"
    id: Optional[int] = Field(default=None, primary_key=True)
    resolved_at: Optional[datetime] = None

class CaseEventBase(SQLModel):
    case_id: int = Field(foreign_key="cases.id")
    actor_id: Optional[int] = Field(default=None)
    actor_role: str
    event_type: str
    note: Optional[str] = None

class CaseEvent(CaseEventBase, table=True):
    __tablename__ = "case_events"
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EarlyWarningBase(SQLModel):
    water_body_id: int = Field(foreign_key="water_bodies.id")
    responsible_unit_id: Optional[int] = Field(default=None, foreign_key="response_units.id")
    level: str # 'Watch', 'Warning', 'Alert'
    category: str
    reason_text: str
    report_count: int = Field(default=1)

class EarlyWarning(EarlyWarningBase, table=True):
    __tablename__ = "early_warnings"
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None

# Gamification models
class GamificationBase(SQLModel):
    pass
class XPEvent(GamificationBase, table=True):
    __tablename__ = "xp_events"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    amount: int
    reason: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Badge(GamificationBase, table=True):
    __tablename__ = "badges"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: str
    icon_url: Optional[str] = None

class UserBadge(GamificationBase, table=True):
    __tablename__ = "user_badges"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    badge_id: int = Field(foreign_key="badges.id")
    awarded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Quest(GamificationBase, table=True):
    __tablename__ = "quests"
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str
    xp_reward: int
    is_daily: bool = Field(default=True)

class UserQuest(GamificationBase, table=True):
    __tablename__ = "user_quests"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    quest_id: int = Field(foreign_key="quests.id")
    completed: bool = Field(default=False)
    completed_at: Optional[datetime] = None

class Checkin(GamificationBase, table=True):
    __tablename__ = "checkins"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    water_body_id: int = Field(foreign_key="water_bodies.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StreamObservation(GamificationBase, table=True):
    __tablename__ = "stream_observations"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    water_body_id: int = Field(foreign_key="water_bodies.id")
    observations_json: str = Field(default="{}")
    quality_score: int = Field(default=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Notification(GamificationBase, table=True):
    __tablename__ = "notifications"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    message: str
    is_read: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CommunityEvent(GamificationBase, table=True):
    __tablename__ = "community_events"
    id: Optional[int] = Field(default=None, primary_key=True)
    water_body_id: int = Field(foreign_key="water_bodies.id")
    title: str
    scheduled_for: datetime
    created_by: int = Field(foreign_key="users.id")
    participant_ids: str = Field(default="[]")
