import os
import json
from datetime import datetime, timedelta, timezone
from sqlmodel import Session, create_engine
from app.models import User, WaterBody, ResponseUnit, Report, Case, EarlyWarning

sqlite_file_name = "database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"
engine = create_engine(sqlite_url)

CITY = os.getenv("CITY", "Neo-Venice")

def seed():
    with Session(engine) as session:
        # Check if already seeded
        if session.query(User).first():
            print("Database already seeded.")
            return

        # Users
        roles = ['citizen']*10 + ['reviewer'] + ['authority']
        users = []
        for i, role in enumerate(roles):
            u = User(
                handle=f"user_{i}_{role}",
                display_name=f"{role.capitalize()} {i}",
                role=role,
                xp=100 * i,
                level=1 + (i//3)
            )
            session.add(u)
            users.append(u)
        
        # Response Units
        ru1 = ResponseUnit(name="Alpha Cleanup Crew", contact="alpha@aquaalert.city")
        ru2 = ResponseUnit(name="Beta Env Checkers", contact="beta@aquaalert.city")
        ru3 = ResponseUnit(name="Delta Fast Response", contact="delta@aquaalert.city")
        session.add_all([ru1, ru2, ru3])
        session.commit()

        # Water Bodies
        wb1 = WaterBody(name="Crystal Lake", type="lake", city=CITY, center_lat=40.0, center_lng=-73.0, status="Alert", health_score=45.0) # Algae trend
        wb2 = WaterBody(name="Silver River Stretch A", type="river", city=CITY, center_lat=40.01, center_lng=-73.01, status="Healthy")
        wb3 = WaterBody(name="Industrial Canal", type="canal", city=CITY, center_lat=40.02, center_lng=-73.02, status="Watch") # Resolved case
        wb4 = WaterBody(name="City Pond", type="pond", city=CITY, center_lat=40.03, center_lng=-73.03)
        wb5 = WaterBody(name="Northern Lake", type="lake", city=CITY, center_lat=40.04, center_lng=-73.04)
        wb6 = WaterBody(name="Southern River", type="river", city=CITY, center_lat=40.05, center_lng=-73.05)
        
        session.add_all([wb1, wb2, wb3, wb4, wb5, wb6])
        session.commit()

        # Story: Algae rising trend on Crystal Lake
        now = datetime.now(timezone.utc)
        for i in range(5):
            r = Report(
                user_id=1,
                water_body_id=wb1.id,
                lat=40.001, lng=-73.001,
                description="Green scum on water",
                issue_type="Algae",
                evidence_url="https://placehold.co/600x400/004d00/FFF?text=Algae+Demo+Data",
                ai_result_json=json.dumps({"categories": ["Algae", "Vegetation"], "confidence": 0.85}),
                ai_confidence=0.85,
                ai_priority="High",
                priority="High",
                created_at=now - timedelta(days=3 - i*0.5)
            )
            session.add(r)
        
        ew = EarlyWarning(
            water_body_id=wb1.id,
            level="Alert",
            category="Algae Bloom",
            reason_text="5 reports of potential algae detected in 3 days. Trend rising.",
            report_count=5
        )
        session.add(ew)

        # Story: Resolved case on Industrial Canal
        r2 = Report(
            user_id=2,
            water_body_id=wb3.id,
            lat=40.02, lng=-73.02,
            description="Floating trash",
            issue_type="Debris",
            evidence_url="https://placehold.co/600x400/555/FFF?text=Debris+Demo+Data",
            status="Resolved"
        )
        session.add(r2)
        session.commit()

        c1 = Case(
            report_id=r2.id,
            status="Resolved",
            assigned_unit_id=ru1.id,
            verified_by=11,
            decision="Confirmed debris",
            after_evidence_url="https://placehold.co/600x400/004d00/FFF?text=Clean+Demo+Data",
            resolved_at=now - timedelta(hours=2)
        )
        session.add(c1)
        session.commit()

        print("Mock data seeded successfully.")

if __name__ == "__main__":
    from app.main import create_db_and_tables
    create_db_and_tables()
    seed()
