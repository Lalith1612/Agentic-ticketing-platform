from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from typing import List, Optional
from pathlib import Path
from collections import defaultdict
import time

from auth import hash_password, verify_password, create_token, get_current_user, get_optional_user
from seed_data import seed_database
from agents import OrchestratorAgent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Use .get() to avoid a fatal KeyError crash
mongo_url = os.getenv('MONGO_URL')
db_name = os.getenv('DB_NAME', 'showspot') # Defaults to 'showspot' if missing

if not mongo_url:
    # This provides a clear error in your Render logs instead of a generic crash
    print("CRITICAL ERROR: MONGO_URL environment variable is not set!")
    
client = AsyncIOMotorClient(mongo_url) if mongo_url else None
db = client[db_name] if client else None

app = FastAPI(title="ShowSpot API", version="2.0.0")
api_router = APIRouter(prefix="/api")

# ── Rate limiting (in-memory, per IP) ────────────────────────────────────────
_rate_store: dict[str, list] = defaultdict(list)
RATE_LIMIT = 60          # requests
RATE_WINDOW = 60         # seconds

def _check_rate_limit(ip: str):
    now = time.time()
    window_start = now - RATE_WINDOW
    calls = [t for t in _rate_store[ip] if t > window_start]
    if len(calls) >= RATE_LIMIT:
        raise HTTPException(429, "Too many requests. Please slow down.")
    calls.append(now)
    _rate_store[ip] = calls

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    ip = request.client.host if request.client else "unknown"
    if request.url.path.startswith("/api/chat") or request.url.path.startswith("/api/agent"):
        try:
            _check_rate_limit(ip)
        except HTTPException as e:
            return JSONResponse(status_code=429, content={"detail": e.detail})
    return await call_next(request)

# ── Pydantic Models ───────────────────────────────────────────────────────────
class RegisterInput(BaseModel):
    name: str
    email: str
    password: str
    city: str = "Hyderabad"

class LoginInput(BaseModel):
    email: str
    password: str

class BookingInput(BaseModel):
    show_id: str
    seats: List[str]

class ChatInput(BaseModel):
    message: str
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))

class AgentExecuteInput(BaseModel):
    task: str                      # e.g. "find shows for Interstellar in Hyderabad tomorrow"
    agent: Optional[str] = None    # override: "movie_discovery"|"show_selection"|"seat_booking"|"recommendation"|"ticket"
    context: Optional[dict] = {}
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))

# ── Auth Routes ───────────────────────────────────────────────────────────────
@api_router.post("/auth/register")
async def register(input: RegisterInput):
    existing = await db.users.find_one({"email": input.email})
    if existing:
        raise HTTPException(400, "Email already registered")
    user = {
        "id": str(uuid.uuid4()),
        "name": input.name,
        "email": input.email,
        "password_hash": hash_password(input.password),
        "city": input.city,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user.copy())
    token = create_token(user["id"], user["email"])
    return {"token": token, "user": {"id": user["id"], "name": user["name"], "email": user["email"], "city": user["city"]}}

@api_router.post("/auth/login")
async def login(input: LoginInput):
    user = await db.users.find_one({"email": input.email}, {"_id": 0})
    if not user or not verify_password(input.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = create_token(user["id"], user["email"])
    return {"token": token, "user": {"id": user["id"], "name": user["name"], "email": user["email"], "city": user.get("city", "")}}

@api_router.get("/auth/me")
async def get_me(current_user=Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(404, "User not found")
    return user

# ── Movie Routes ──────────────────────────────────────────────────────────────
@api_router.get("/movies")
async def get_movies(genre: Optional[str] = None, language: Optional[str] = None, search: Optional[str] = None):
    query = {}
    if genre:
        query["genre"] = genre
    if language:
        query["language"] = {"$regex": language, "$options": "i"}
    if search:
        query["title"] = {"$regex": search, "$options": "i"}
    movies = await db.movies.find(query, {"_id": 0}).to_list(100)
    return movies

@api_router.get("/movies/{movie_id}")
async def get_movie(movie_id: str):
    movie = await db.movies.find_one({"id": movie_id}, {"_id": 0})
    if not movie:
        raise HTTPException(404, "Movie not found")
    return movie

# ── Event Routes ──────────────────────────────────────────────────────────────
@api_router.get("/events")
async def get_events():
    return await db.events.find({}, {"_id": 0}).to_list(100)

# ── Theatre Routes ────────────────────────────────────────────────────────────
@api_router.get("/theatres")
async def get_theatres(city: Optional[str] = None):
    query = {}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    return await db.theatres.find(query, {"_id": 0}).to_list(100)

# ── Show Routes ───────────────────────────────────────────────────────────────
@api_router.get("/shows")
async def get_shows(movie_id: Optional[str] = None, city: Optional[str] = None, date: Optional[str] = None):
    query = {}
    if movie_id:
        query["movie_id"] = movie_id
    if date:
        query["date"] = date
    shows = await db.shows.find(query, {"_id": 0}).to_list(500)

    if city:
        theatres = await db.theatres.find({"city": {"$regex": city, "$options": "i"}}, {"_id": 0}).to_list(100)
        theatre_ids = {t["id"] for t in theatres}
        shows = [s for s in shows if s["theatre_id"] in theatre_ids]

    for show in shows:
        theatre = await db.theatres.find_one({"id": show["theatre_id"]}, {"_id": 0})
        if theatre:
            show["theatre_name"] = theatre["name"]
            show["theatre_city"] = theatre["city"]
            show["theatre_location"] = theatre["location"]
    return shows

@api_router.get("/shows/{show_id}")
async def get_show(show_id: str):
    show = await db.shows.find_one({"id": show_id}, {"_id": 0})
    if not show:
        raise HTTPException(404, "Show not found")
    theatre = await db.theatres.find_one({"id": show["theatre_id"]}, {"_id": 0})
    movie   = await db.movies.find_one({"id": show["movie_id"]}, {"_id": 0})
    if theatre: show["theatre"] = theatre
    if movie:   show["movie"]   = movie
    return show

@api_router.get("/shows/{show_id}/seats")
async def get_show_seats(show_id: str):
    show = await db.shows.find_one({"id": show_id}, {"_id": 0})
    if not show:
        raise HTTPException(404, "Show not found")

    bookings = await db.bookings.find(
        {"show_id": show_id, "status": "confirmed"}, {"_id": 0, "seats": 1}
    ).to_list(500)
    booked_seats = set()
    for b in bookings:
        booked_seats.update(b.get("seats", []))

    rows = "ABCDEFGHIJ"
    cols = range(1, 16)
    layout = {}
    for row in rows:
        category = "platinum" if row in "ABC" else ("gold" if row in "DEFG" else "silver")
        layout[row] = {
            "category": category,
            "price": show["prices"][category],
            "seats": [
                {"id": f"{row}{col}", "status": "booked" if f"{row}{col}" in booked_seats else "available"}
                for col in cols
            ]
        }
    return {"show_id": show_id, "layout": layout, "prices": show["prices"]}

# ── Booking Routes ────────────────────────────────────────────────────────────
@api_router.post("/bookings")
async def create_booking(input: BookingInput, current_user=Depends(get_current_user)):
    show = await db.shows.find_one({"id": input.show_id}, {"_id": 0})
    if not show:
        raise HTTPException(404, "Show not found")

    existing = await db.bookings.find(
        {"show_id": input.show_id, "status": "confirmed"}, {"_id": 0, "seats": 1}
    ).to_list(500)
    booked = set()
    for b in existing:
        booked.update(b.get("seats", []))

    for seat in input.seats:
        if seat in booked:
            raise HTTPException(400, f"Seat {seat} is already booked")

    total = 0
    for seat in input.seats:
        row = seat[0]
        if row in "ABC":   total += show["prices"]["platinum"]
        elif row in "DEFG": total += show["prices"]["gold"]
        else:               total += show["prices"]["silver"]

    theatre = await db.theatres.find_one({"id": show["theatre_id"]}, {"_id": 0})
    movie   = await db.movies.find_one({"id": show["movie_id"]}, {"_id": 0})

    booking = {
        "id":               f"BK-{uuid.uuid4().hex[:8].upper()}",
        "user_id":          current_user["user_id"],
        "show_id":          input.show_id,
        "movie_id":         show["movie_id"],
        "theatre_id":       show["theatre_id"],
        "movie_title":      movie["title"] if movie else "",
        "movie_poster":     movie["poster"] if movie else "",
        "theatre_name":     theatre["name"] if theatre else "",
        "theatre_city":     theatre["city"] if theatre else "",
        "theatre_location": theatre.get("location", "") if theatre else "",
        "show_date":        show["date"],
        "show_time":        show["time"],
        "screen":           show.get("screen", 1),
        "seats":            input.seats,
        "total_price":      total,
        "status":           "confirmed",
        "payment_status":   "skipped",
        "booking_date":     datetime.now(timezone.utc).isoformat(),
        "ticket_id":        f"TK-{uuid.uuid4().hex[:8].upper()}"
    }

    await db.bookings.insert_one(booking.copy())
    return booking

@api_router.get("/bookings")
async def get_bookings(current_user=Depends(get_current_user)):
    return await db.bookings.find(
        {"user_id": current_user["user_id"]}, {"_id": 0}
    ).sort("booking_date", -1).to_list(100)

@api_router.get("/bookings/{booking_id}")
async def get_booking(booking_id: str):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(404, "Booking not found")
    return booking

# ── Chat Route ────────────────────────────────────────────────────────────────
@api_router.post("/chat")
async def chat(input: ChatInput, user=Depends(get_optional_user)):
    user_id = user["user_id"] if user else "anonymous"
    agent = OrchestratorAgent(db)
    try:
        return await agent.process_message(user_id, input.session_id, input.message)
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(500, "Agent processing failed")

@api_router.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    session = await db.chat_sessions.find_one({"session_id": session_id}, {"_id": 0})
    if not session:
        return {"messages": [], "state": "idle", "context": {}}
    return {
        "messages": session.get("messages", []),
        "state":    session.get("state", "idle"),
        "context":  {k: v for k, v in session.get("context", {}).items() if k != "user_id"},
        "agent_history": session.get("agent_history", []),
    }

# ── Agent Execute Route (direct sub-agent call) ───────────────────────────────
@api_router.post("/agent/execute")
async def agent_execute(input: AgentExecuteInput, user=Depends(get_optional_user)):
    """
    Directly execute a specific sub-agent or the orchestrator.
    Useful for testing and advanced integrations.
    """
    user_id = user["user_id"] if user else "anonymous"
    orchestrator = OrchestratorAgent(db)

    ctx = input.context or {}
    ctx["user_id"] = user_id

    agent_name = input.agent
    if not agent_name:
        # use full orchestrator
        return await orchestrator.process_message(user_id, input.session_id, input.task)

    if agent_name not in orchestrator.agents:
        raise HTTPException(400, f"Unknown agent '{agent_name}'. Valid: {list(orchestrator.agents.keys())}")

    try:
        result = await orchestrator.agents[agent_name].run(ctx, input.task)
        return {"agent": agent_name, "task": input.task, "result": result}
    except Exception as e:
        logger.error(f"Agent execute error: {e}")
        raise HTTPException(500, f"Agent '{agent_name}' failed: {str(e)}")

# ── Utility Routes ────────────────────────────────────────────────────────────
@api_router.get("/cities")
async def get_cities():
    theatres = await db.theatres.find({}, {"_id": 0, "city": 1}).to_list(100)
    return sorted(set(t["city"] for t in theatres))

@api_router.post("/seed")
async def seed():
    result = await seed_database(db)
    return {"message": "Database seeded successfully", "counts": result}

@api_router.get("/health")
async def health():
    return {"status": "ok", "version": "2.0.0", "agents": ["orchestrator", "movie_discovery", "show_selection", "seat_booking", "recommendation", "ticket"]}

# ── App Setup ─────────────────────────────────────────────────────────────────
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
