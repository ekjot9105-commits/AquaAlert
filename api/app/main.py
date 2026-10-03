from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Session, create_engine, select
from pydantic import BaseModel
import os
import json
from .models import User, WaterBody, Report, Case, EarlyWarning, ResponseUnit
from .services.ai import get_ai_provider, RealVisionProvider
from .services.rules import calculate_priority, get_distance_meters

# SQLite DB
sqlite_file_name = "database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"
connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, echo=False, connect_args=connect_args)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

app = FastAPI(
    title="AquaAlert AI API",
    description="API for citizen environmental observations and early warnings",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# Mock Auth route
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

@app.get("/water-bodies", tags=["Water Bodies"])
def list_water_bodies(session: Session = Depends(get_session)):
    return session.exec(select(WaterBody)).all()

@app.get("/water-bodies/{wb_id}", tags=["Water Bodies"])
def get_water_body(wb_id: int, session: Session = Depends(get_session)):
    return session.get(WaterBody, wb_id)

class AssessRequest(BaseModel):
    image_b64: str
    text: str

@app.post("/ai/assess", tags=["AI"])
def assess_image(req: AssessRequest):
    ai = get_ai_provider()
    result = ai.assess(req.image_b64, req.text, {})
    return {
        "result": result.model_dump(), 
        "provider": "Vision" if isinstance(ai, RealVisionProvider) else "Mock"
    }

@app.post("/reports", tags=["Reports"])
def create_report(report: dict, session: Session = Depends(get_session)):
    # Calculate rules and final priority
    reporter = session.get(User, report.get('user_id', 1))
    trust_score = reporter.trust_score if reporter else 1.0
    
    ai_json_str = report.get("ai_result_json", "{}")
    ai_conf = report.get("ai_confidence", 0.0)
    ai_pri = report.get("ai_priority", "Low")
    
    categories = []
    try:
        ai_data = json.loads(ai_json_str)
        if "categories" in ai_data:
            categories = [c.get("label", "") for c in ai_data["categories"]]
    except:
        pass
        
    final_priority, rules, needs_verif = calculate_priority(
        ai_pri,
        ai_conf,
        categories,
        trust_score,
        0, # mock 0 recent reports
        1000 # mock 1000m to sensitive area
    )
    
    report["rules_triggered_json"] = json.dumps(rules)
    report["priority"] = final_priority
    if needs_verif:
        report["status"] = "Under Review"
    
    new_report = Report(**report)
    session.add(new_report)
    session.commit()
    session.refresh(new_report)
    return new_report

@app.get("/reports", tags=["Reports"])
def list_reports(session: Session = Depends(get_session)):
    return session.exec(select(Report)).all()

@app.get("/cases", tags=["Cases"])
def list_cases(session: Session = Depends(get_session)):
    return session.exec(select(Case)).all()

@app.get("/early-warnings", tags=["Alerts"])
def list_early_warnings(session: Session = Depends(get_session)):
    return session.exec(select(EarlyWarning)).all()

@app.post("/upload", tags=["Media"])
async def upload_file(file: UploadFile = File(...)):
    # Mock file upload, limits and downscale would be implemented here
    return {"url": f"/static/uploads/mock_{file.filename}", "message": "File processed and EXIF stripped (mock)"}

@app.get("/analytics/summary", tags=["Analytics"])
def get_analytics_summary(session: Session = Depends(get_session)):
    reports = session.exec(select(Report)).all()
    cases = session.exec(select(Case)).all()
    return {
        "total_reports": len(reports),
        "total_cases": len(cases),
        "active_warnings": len(session.exec(select(EarlyWarning).where(EarlyWarning.resolved_at == None)).all())
    }

@app.get("/leaderboard", tags=["Gamification"])
def get_leaderboard(session: Session = Depends(get_session)):
    users = session.exec(select(User).order_by(User.xp.desc()).limit(10)).all()
    return users
