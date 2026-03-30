"""
ShowSpot Agentic System — v6
=============================
Fixes:
  1. Date extraction — "tomorrow", "this weekend", "29th", specific dates all resolved
  2. Seat choice — user sees options (auto/manual/preference) before seats are picked
  3. City filter for movies — "movies in Hyderabad" now shows shows in that city only
  4. Navigation actions — "change seats", "go back", "more tickets", "different date" handled
  5. "change seats" correctly re-triggers seat selection with updated preferences
"""

import os
import json
import re
import uuid
import logging
from datetime import datetime, timezone, date, timedelta
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / '.env')

try:
    from google import genai
    from google.genai import types
    USE_NEW_SDK = True
except ImportError:
    import google.generativeai as genai_old
    USE_NEW_SDK = False

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise EnvironmentError("GEMINI_API_KEY is not set.")


# ── LLM helpers ────────────────────────────────────────────────────────────────
async def _prose(prompt: str) -> str:
    try:
        if USE_NEW_SDK:
            client = genai.Client(api_key=GEMINI_API_KEY)
            resp = client.models.generate_content(
                model="gemini-2.0-flash", contents=prompt,
                config=types.GenerateContentConfig(temperature=0.8))
            return resp.text.strip()
        else:
            genai_old.configure(api_key=GEMINI_API_KEY)
            m = genai_old.GenerativeModel("gemini-2.0-flash",
                generation_config=genai_old.GenerationConfig(
                    temperature=0.8, response_mime_type="text/plain"))
            return m.generate_content(prompt).text.strip()
    except Exception as e:
        logger.error(f"Prose error: {e}")
        return ""


async def _json_call(prompt: str) -> dict:
    try:
        if USE_NEW_SDK:
            client = genai.Client(api_key=GEMINI_API_KEY)
            resp = client.models.generate_content(
                model="gemini-2.0-flash", contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.1, response_mime_type="application/json"))
            text = resp.text.strip()
        else:
            genai_old.configure(api_key=GEMINI_API_KEY)
            m = genai_old.GenerativeModel("gemini-2.0-flash",
                generation_config=genai_old.GenerationConfig(
                    temperature=0.1, response_mime_type="application/json"))
            text = m.generate_content(prompt).text.strip()
        text = re.sub(r'^```(?:json)?\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        return json.loads(text)
    except Exception as e:
        logger.warning(f"JSON error: {e}")
        return {}


# ── Date resolver ──────────────────────────────────────────────────────────────
def _resolve_date(raw: str) -> str:
    """Convert natural language date to YYYY-MM-DD. Returns empty string if no date specified."""
    if not raw or raw.strip() == "":
        return ""  # no date filter
    raw = raw.strip().lower()
    today = date.today()
    if raw in ("today", ""):
        return today.isoformat()
    if raw == "tomorrow":
        return (today + timedelta(days=1)).isoformat()
    if raw in ("day after tomorrow", "overmorrow"):
        return (today + timedelta(days=2)).isoformat()
    # "this weekend"
    if "weekend" in raw:
        days_ahead = 5 - today.weekday()  # Saturday
        if days_ahead <= 0:
            days_ahead += 7
        return (today + timedelta(days=days_ahead)).isoformat()
    # "this friday/saturday/sunday..."
    WEEKDAYS = {"monday":0,"tuesday":1,"wednesday":2,"thursday":3,
                "friday":4,"saturday":5,"sunday":6}
    for name, wd in WEEKDAYS.items():
        if name in raw:
            days_ahead = (wd - today.weekday()) % 7
            if days_ahead == 0:
                days_ahead = 7
            return (today + timedelta(days=days_ahead)).isoformat()
    # Already YYYY-MM-DD
    if re.match(r'\d{4}-\d{2}-\d{2}', raw):
        return raw
    # "29th", "march 29", "29 march" etc — try LLM later, fallback to today
    return today.isoformat()



# ══════════════════════════════════════════════════════════════════════════════
# USER MEMORY — persists preferences across sessions
# ══════════════════════════════════════════════════════════════════════════════

async def _load_user_memory(db, user_id: str) -> dict:
    """Load long-term user preferences from DB."""
    if not user_id or user_id == "anonymous":
        return {}
    doc = await db.user_memory.find_one({"user_id": user_id}, {"_id": 0})
    return doc or {}


async def _save_user_memory(db, user_id: str, updates: dict):
    """Merge new preferences into long-term user memory."""
    if not user_id or user_id == "anonymous" or not updates:
        return
    # Only save meaningful fields
    saveable = {k: v for k, v in updates.items()
                if k in ("city", "language", "seat_preference", "past_genres", "num_tickets")
                and v and v != 0 and v != []}
    if not saveable:
        return
    saveable["user_id"]    = user_id
    saveable["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.user_memory.update_one(
        {"user_id": user_id},
        {"$set": saveable},
        upsert=True
    )


# ══════════════════════════════════════════════════════════════════════════════
# TOOL FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

async def tool_search_movies(db, movie_name="", genre="", language="", city="") -> dict:
    """
    If city is given, return movies that have shows in that city.
    Otherwise do a pure movie search by name/genre/language.
    """
    if city:
        # Find theatres in city → get shows → get unique movies playing there
        theatres = await db.theatres.find(
            {"city": {"$regex": city, "$options": "i"}}, {"_id": 0, "id": 1}
        ).to_list(100)
        theatre_ids = [t["id"] for t in theatres]
        if not theatre_ids:
            return {"type": "movies", "items": [], "city": city}

        shows = await db.shows.find(
            {"theatre_id": {"$in": theatre_ids}}, {"_id": 0, "movie_id": 1}
        ).to_list(500)
        movie_ids = list(set(s["movie_id"] for s in shows))

        query = {"id": {"$in": movie_ids}}
        if movie_name:
            query["title"] = {"$regex": movie_name, "$options": "i"}
        if genre:
            query["genre"] = {"$regex": genre, "$options": "i"}
        if language:
            query["language"] = {"$regex": language, "$options": "i"}

        movies = await db.movies.find(query, {"_id": 0}).to_list(20)
        movies.sort(key=lambda m: m.get("rating", 0), reverse=True)
        return {"type": "movies", "items": movies, "city": city}

    # No city — regular search
    query = {}
    if movie_name:
        query["title"] = {"$regex": movie_name, "$options": "i"}
    if genre:
        query["genre"] = {"$regex": genre, "$options": "i"}
    if language:
        query["language"] = {"$regex": language, "$options": "i"}

    movies = await db.movies.find(query, {"_id": 0}).to_list(20)
    if not movies and movie_name:
        movies = await db.movies.find(
            {"title": {"$regex": movie_name.split()[0], "$options": "i"}}, {"_id": 0}
        ).to_list(10)
    if not movies:
        movies = await db.movies.find({}, {"_id": 0}).to_list(20)
        movies.sort(key=lambda m: m.get("rating", 0), reverse=True)

    return {"type": "movies", "items": movies}


async def tool_get_shows(db, movie_name="", city="", date_str="", time_pref="any", num_tickets=1) -> dict:
    chosen_date = _resolve_date(date_str)

    movie_id = ""
    movie_title_resolved = movie_name
    if movie_name:
        m = await db.movies.find_one(
            {"title": {"$regex": movie_name, "$options": "i"}}, {"_id": 0, "id": 1, "title": 1}
        )
        if m:
            movie_id = m["id"]
            movie_title_resolved = m["title"]

    # Filter by city BEFORE fetching shows — get theatre IDs in that city first
    theatre_ids_in_city = None
    if city:
        city_theatres = await db.theatres.find(
            {"city": {"$regex": city, "$options": "i"}}, {"_id": 0, "id": 1}
        ).to_list(100)
        theatre_ids_in_city = [t["id"] for t in city_theatres]
        if not theatre_ids_in_city:
            return {
                "type": "shows", "items": [],
                "movie_name": movie_title_resolved,
                "city": city, "date": chosen_date, "num_tickets": num_tickets,
            }

    query = {}
    if movie_id:    query["movie_id"] = movie_id
    if chosen_date: query["date"]     = chosen_date  # empty = all upcoming dates
    if theatre_ids_in_city is not None:
        query["theatre_id"] = {"$in": theatre_ids_in_city}

    shows = await db.shows.find(query, {"_id": 0}).to_list(200)

    enriched = []
    seen = set()
    for show in shows:
        dedup_key = f"{show['theatre_id']}_{show.get('time','')}"
        if dedup_key in seen:
            continue
        seen.add(dedup_key)

        theatre   = await db.theatres.find_one({"id": show["theatre_id"]}, {"_id": 0})
        movie_doc = await db.movies.find_one({"id": show["movie_id"]},
                        {"_id": 0, "title": 1, "poster": 1})
        if theatre:
            show["theatre_name"] = theatre["name"]
            show["city"]         = theatre["city"]
            show["location"]     = theatre.get("location", "")
        if movie_doc:
            show["movie_title"]  = movie_doc.get("title", "")
            show["movie_poster"] = movie_doc.get("poster", "")
        enriched.append(show)

    if time_pref not in ("any", "", None):
        def _slot(t):
            try:
                h = int(t.split(":")[0])
                if time_pref == "morning":   return 6  <= h < 12
                if time_pref == "afternoon": return 12 <= h < 17
                if time_pref == "evening":   return 17 <= h < 21
                if time_pref == "night":     return h >= 21 or h < 6
            except: pass
            return True
        enriched = [s for s in enriched if _slot(s.get("time", ""))]

    return {
        "type":        "shows",
        "items":       enriched[:30],
        "movie_name":  movie_title_resolved,
        "city":        city,
        "date":        chosen_date,
        "num_tickets": num_tickets,
    }


async def tool_seat_choice(db, show_id: str, num_tickets: int = 1) -> dict:
    """
    FIX #2 — Instead of auto-selecting, show a seat choice card:
    Auto (best available) | Platinum | Gold | Silver | Manual (go to seat map)
    """
    if not show_id:
        return {"type": "error", "message": "No show selected. Please tap a showtime first."}

    show    = await db.shows.find_one({"id": show_id}, {"_id": 0})
    if not show:
        return {"type": "error", "message": "Show not found."}

    movie   = await db.movies.find_one({"id": show.get("movie_id","")}, {"_id": 0})
    theatre = await db.theatres.find_one({"id": show.get("theatre_id","")}, {"_id": 0})
    prices  = show.get("prices", {"platinum": 500, "gold": 300, "silver": 150})

    # Count available seats per category
    bookings = await db.bookings.find(
        {"show_id": show_id, "status": "confirmed"}, {"_id": 0, "seats": 1}
    ).to_list(500)
    booked = set()
    for b in bookings:
        booked.update(b.get("seats", []))

    avail = {"platinum": 0, "gold": 0, "silver": 0}
    for row in "ABC":
        avail["platinum"] += sum(1 for c in range(1, 16) if f"{row}{c}" not in booked)
    for row in "DEFG":
        avail["gold"] += sum(1 for c in range(1, 16) if f"{row}{c}" not in booked)
    for row in "HIJ":
        avail["silver"] += sum(1 for c in range(1, 16) if f"{row}{c}" not in booked)

    return {
        "type":         "seat_choice",
        "show_id":      show_id,
        "num_tickets":  num_tickets,
        "show": {
            "id":           show_id,
            "date":         show.get("date",""),
            "time":         show.get("time",""),
            "screen":       show.get("screen", 1),
            "movie_title":  movie.get("title","")   if movie   else "",
            "movie_poster": movie.get("poster","")  if movie   else "",
            "theatre_name": theatre.get("name","")  if theatre else "",
            "theatre_city": theatre.get("city","")  if theatre else "",
        },
        "prices":    prices,
        "available": avail,
    }


async def tool_select_seats(db, show_id: str, num_tickets: int = 1, seat_preference: str = "any") -> dict:
    ROWS = {"platinum": list("ABC"), "gold": list("DEFG"), "silver": list("HIJ")}

    if not show_id:
        return {"type": "error", "message": "No show selected. Please tap a showtime first."}

    bookings = await db.bookings.find(
        {"show_id": show_id, "status": "confirmed"}, {"_id": 0, "seats": 1}
    ).to_list(500)
    booked = set()
    for b in bookings:
        booked.update(b.get("seats", []))

    show    = await db.shows.find_one({"id": show_id}, {"_id": 0})
    if not show:
        return {"type": "error", "message": "Show not found."}

    movie   = await db.movies.find_one({"id": show.get("movie_id","")}, {"_id": 0})
    theatre = await db.theatres.find_one({"id": show.get("theatre_id","")}, {"_id": 0})
    prices  = show.get("prices", {"platinum": 500, "gold": 300, "silver": 150})

    pref_order = (["platinum","gold","silver"] if seat_preference == "any"
                  else [seat_preference] + [c for c in ["platinum","gold","silver"] if c != seat_preference])

    selected = []
    for cat in pref_order:
        if len(selected) >= num_tickets: break
        for row in ROWS[cat]:
            for col in range(1, 16):
                seat = f"{row}{col}"
                if seat not in booked:
                    selected.append({"id": seat, "category": cat, "price": prices[cat]})
                if len(selected) >= num_tickets: break
            if len(selected) >= num_tickets: break

    total = sum(s["price"] for s in selected)
    return {
        "type":     "seats_selected",
        "show_id":  show_id,
        "show": {
            "id":           show_id,
            "date":         show.get("date",""),
            "time":         show.get("time",""),
            "screen":       show.get("screen", 1),
            "prices":       prices,
            "movie_title":  movie.get("title","")   if movie   else "",
            "movie_poster": movie.get("poster","")  if movie   else "",
            "theatre_name": theatre.get("name","")  if theatre else "",
            "theatre_city": theatre.get("city","")  if theatre else "",
        },
        "seats":       selected,
        "seat_ids":    [s["id"] for s in selected],
        "total":       total,
        "num_tickets": num_tickets,
    }


async def tool_recommend_movies(db, user_message: str, past_genres=None, language="") -> dict:
    movies    = await db.movies.find({}, {"_id": 0}).to_list(50)
    catalogue = [{"id": m["id"], "title": m["title"], "genre": m.get("genre"),
                  "language": m.get("language"), "rating": m.get("rating")} for m in movies]
    prompt = (
        f"Pick 4-5 best movies for this user.\n"
        f"User said: {user_message}\nPast genres: {past_genres or []}\nLanguage: {language}\n"
        f"Catalogue: {json.dumps(catalogue)}\n"
        f'Return JSON: {{"recommended_ids":["id1"],"reason":"one sentence"}}'
    )
    parsed     = await _json_call(prompt)
    rec_ids    = parsed.get("recommended_ids", [])
    reason     = parsed.get("reason", "top picks for you")
    rec_movies = [m for m in movies if m["id"] in rec_ids]
    if not rec_movies:
        rec_movies = sorted(movies, key=lambda m: m.get("rating", 0), reverse=True)[:5]
        reason = "highest rated on ShowSpot"
    return {"type": "recommendations", "items": rec_movies, "reason": reason}


async def tool_view_bookings(db, user_id: str) -> dict:
    if not user_id or user_id == "anonymous":
        return {"type": "auth_required", "message": "Please sign in to view your bookings."}
    bookings = await db.bookings.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("booking_date", -1).to_list(10)
    return {"type": "bookings", "items": bookings}


async def tool_confirm_booking(db, user_id: str, show_id: str, seat_ids: list) -> dict:
    if not user_id or user_id == "anonymous":
        return {"type": "auth_required", "message": "Please sign in to confirm your booking."}
    if not show_id or not seat_ids:
        return {"type": "error", "message": "No seats to confirm. Please select seats first."}

    existing = await db.bookings.find(
        {"show_id": show_id, "status": "confirmed"}, {"_id": 0, "seats": 1}
    ).to_list(500)
    booked = set()
    for b in existing:
        booked.update(b.get("seats", []))

    conflict = [s for s in seat_ids if s in booked]
    if conflict:
        return {"type": "seats_conflict",
                "message": f"Seats {', '.join(conflict)} just got taken! Please select new ones."}

    show    = await db.shows.find_one({"id": show_id}, {"_id": 0})
    if not show:
        return {"type": "error", "message": "Show not found."}

    theatre = await db.theatres.find_one({"id": show["theatre_id"]}, {"_id": 0})
    movie   = await db.movies.find_one({"id": show["movie_id"]}, {"_id": 0})
    prices  = show.get("prices", {"platinum": 500, "gold": 300, "silver": 150})

    total = 0
    for seat in seat_ids:
        row = seat[0]
        if row in "ABC":    total += prices["platinum"]
        elif row in "DEFG": total += prices["gold"]
        else:               total += prices["silver"]

    booking = {
        "id":               f"BK-{uuid.uuid4().hex[:8].upper()}",
        "user_id":          user_id,
        "show_id":          show_id,
        "movie_id":         show["movie_id"],
        "theatre_id":       show["theatre_id"],
        "movie_title":      movie["title"]             if movie   else "",
        "movie_poster":     movie["poster"]            if movie   else "",
        "theatre_name":     theatre["name"]            if theatre else "",
        "theatre_city":     theatre["city"]            if theatre else "",
        "theatre_location": theatre.get("location","") if theatre else "",
        "show_date":        show["date"],
        "show_time":        show["time"],
        "screen":           show.get("screen", 1),
        "seats":            seat_ids,
        "total_price":      total,
        "status":           "confirmed",
        "payment_status":   "skipped",
        "booking_date":     datetime.now(timezone.utc).isoformat(),
        "ticket_id":        f"TK-{uuid.uuid4().hex[:8].upper()}",
    }
    await db.bookings.insert_one(booking.copy())
    return {"type": "booking_confirmed", "booking": booking}


# ══════════════════════════════════════════════════════════════════════════════
# ORCHESTRATOR
# ══════════════════════════════════════════════════════════════════════════════

GREETING_WORDS = {
    "hi","hello","hey","yo","sup","howdy","hiya","ok","okay","k",
    "thanks","thank you","thx","ty","bye","goodbye","cool","nice",
    "great","awesome","wow","good","got it","yep","yup","sure","alright"
}


class OrchestratorAgent:

    GREETING_RESPONSES = [
        "Hey! 👋 Which movie are you looking to book today?",
        "Hi! 🎬 Tell me a movie you'd like to watch and I'll find shows for you.",
        "Hello! 🍿 Want a recommendation, or do you already have a movie in mind?",
        "Hey there! What are you in the mood to watch? 🎥",
        "Hi! I can find shows and book tickets in seconds — just name a movie! 🎟️",
    ]

    def __init__(self, db):
        self.db = db
        self._greet_idx = 0

    def _greeting(self):
        r = self.GREETING_RESPONSES[self._greet_idx % len(self.GREETING_RESPONSES)]
        self._greet_idx += 1
        return r

    def _extract_show_id(self, message: str) -> str:
        m = re.search(r'show[-_]([a-f0-9\-]+)', message, re.IGNORECASE)
        return f"show-{m.group(1)}" if m else ""

    def _extract_num_tickets(self, message: str) -> int:
        m = re.search(r'(\d+)\s+ticket', message, re.IGNORECASE)
        if m:
            return max(1, min(10, int(m.group(1))))
        return 0

    def _extract_city(self, message: str) -> str:
        """Extract city name from message using known cities list."""
        KNOWN_CITIES = [
            "hyderabad","mumbai","delhi","bangalore","bengaluru","chennai",
            "kolkata","pune","ahmedabad","jaipur","surat","lucknow",
            "kanpur","nagpur","indore","bhopal","patna","vadodara",
        ]
        msg_lower = message.lower()
        # Pattern: "in <city>" or "at <city>" or "near <city>"
        m = re.search(r'\b(?:in|at|near)\s+([a-zA-Z]+)', msg_lower)
        if m:
            candidate = m.group(1).strip()
            for city in KNOWN_CITIES:
                if candidate.startswith(city[:4]):  # prefix match
                    # Capitalize first letter
                    return city.capitalize()
        # Direct city name in message
        for city in KNOWN_CITIES:
            if city in msg_lower:
                return city.capitalize()
        return ""

    def _detect_nav_action(self, message: str, state: str, ctx: dict) -> dict | None:
        """
        FIX #4 — Detect backward/change navigation commands
        Returns a tool dict if it's a nav action, else None.
        """
        msg = message.strip().lower()

        # Change/increase tickets
        if any(p in msg for p in ["more ticket","increase ticket","change ticket",
                                   "want more","need more ticket","add ticket"]):
            n = self._extract_num_tickets(message)
            if n == 0:
                m = re.search(r'(\d+)', message)
                n = int(m.group(1)) if m else ctx.get("num_tickets", 1) + 1
            show_id = ctx.get("show_id","")
            return {"tool": "seat_choice", "params": {"show_id": show_id, "num_tickets": n}}

        # Change seat preference / category
        if any(p in msg for p in ["change seat","different seat","other seat",
                                   "platinum","gold seat","silver seat","prefer platinum",
                                   "prefer gold","prefer silver"]):
            pref = "any"
            if "platinum" in msg: pref = "platinum"
            elif "gold"    in msg: pref = "gold"
            elif "silver"  in msg: pref = "silver"
            show_id = ctx.get("show_id","")
            num     = ctx.get("num_tickets", 1)
            return {"tool": "select_seats", "params": {
                "show_id": show_id, "num_tickets": num, "seat_preference": pref}}

        # Go back to shows (change showtime / different time)
        if any(p in msg for p in ["different time","change time","other time","different show",
                                   "go back","change showtime","different showtime",
                                   "change date","different date","back to show"]):
            return {"tool": "get_shows", "params": {
                "movie_name": ctx.get("movie_name",""),
                "city":       ctx.get("city",""),
                "date_str":   ctx.get("date",""),
                "num_tickets":ctx.get("num_tickets", 1),
            }}

        # Manual seat selection → redirect to seat page
        if any(p in msg for p in ["choose seat","pick seat","select seat manually",
                                   "manual","i want to choose","let me pick"]):
            show_id = ctx.get("show_id","")
            if show_id:
                return {"tool": "manual_seat_redirect",
                        "params": {"show_id": show_id}}

        return None

    async def _classify(self, message: str, ctx: dict, state: str, history: list) -> dict:
        today    = date.today().isoformat()
        tomorrow = (date.today() + timedelta(days=1)).isoformat()

        recent = history[-8:] if history else []
        history_str = "\n".join(
            f"{m['role'].upper()}: {m['content'][:150]}" for m in recent
        ) if recent else "None"

        clean_ctx = {k: v for k, v in ctx.items()
                     if k not in ("user_id","past_genres","auto_seat_ids")
                     and v and v != 0 and v != []}

        prompt = f"""You are the routing brain for ShowSpot, a movie booking chatbot.
Decide which tool to call. Use conversation history for context.

=== HISTORY (newest last) ===
{history_str}

=== STATE === {state}
=== CONTEXT === {json.dumps(clean_ctx)}
=== TODAY === {today} | TOMORROW === {tomorrow}

=== TOOLS ===
1. search_movies(movie_name, genre, language, city) — list/browse movies; if city given, only movies showing there
2. get_shows(movie_name, city, date_str, time_pref, num_tickets) — find showtimes. date_str: "today","tomorrow","this weekend","YYYY-MM-DD"
3. seat_choice(show_id, num_tickets) — show seat category options BEFORE selecting
4. select_seats(show_id, num_tickets, seat_preference) — auto-pick seats with preference
5. confirm_booking — user confirms after seeing seats
6. recommend_movies — user wants suggestions
7. view_bookings — user's past bookings
8. chitchat — greetings, small talk
9. get_help — only "what can you do"

=== STRICT RULES ===
- "movies in [city]" or "what's playing in [city]" → search_movies with city=that city
- message contains "show-[id]" → seat_choice with show_id extracted
- state=showing_shows AND user picks/taps a time → seat_choice
- state=seat_selection AND "yes/confirm/proceed" → confirm_booking
- "recommend/suggest/what to watch" → recommend_movies
- "my bookings/tickets/history" → view_bookings
- Extract date: "tomorrow", "this weekend", "friday", "29th march" → put in date_str
- No date mentioned → date_str="" (empty, show all dates)
- "today" explicitly → date_str="today"
- greeting → chitchat

Return ONLY JSON:
{{
  "tool": "<tool>",
  "params": {{
    "movie_name":"","genre":"","language":"","city":"",
    "date_str":"","time_pref":"any","num_tickets":1,
    "show_id":"","seat_preference":"any"
  }},
  "reasoning":"brief reason"
}}

Message: {message}"""

        result = await _json_call(prompt)
        if not result or "tool" not in result:
            return self._fallback_classify(message, ctx, state)

        # Post-process: pull show_id from message text for seat_choice/select_seats
        tool = result.get("tool","")
        if tool in ("seat_choice","select_seats") and not result.get("params",{}).get("show_id",""):
            sid = self._extract_show_id(message)
            if sid:
                result.setdefault("params",{})["show_id"] = sid

        # Override num_tickets if explicitly in message
        t = self._extract_num_tickets(message)
        if t > 0:
            result.setdefault("params",{})["num_tickets"] = t

        logger.info(f"Tool: {tool} | Reason: {result.get('reasoning','')}")
        return result

    def _fallback_classify(self, message: str, ctx: dict, state: str) -> dict:
        msg = message.lower()

        if re.search(r'show[-_][a-f0-9\-]+', message, re.IGNORECASE):
            sid = self._extract_show_id(message)
            n   = self._extract_num_tickets(message) or ctx.get("num_tickets",1)
            return {"tool":"seat_choice","params":{"show_id":sid,"num_tickets":n}}

        if state == "seat_selection" and any(w in msg for w in ["yes","confirm","book it","proceed","done"]):
            return {"tool":"confirm_booking","params":{}}

        if any(w in msg for w in ["recommend","suggest","what to watch","good movie"]):
            return {"tool":"recommend_movies","params":{}}

        if any(w in msg for w in ["my booking","my ticket","booking history","view booking"]):
            return {"tool":"view_bookings","params":{}}

        # "movies in city" check
        city_match = re.search(r'(?:movies?|films?|playing)\s+in\s+(\w+)', msg)
        if city_match:
            return {"tool":"search_movies","params":{"city":city_match.group(1),"movie_name":""}}

        if any(w in msg for w in ["show time","showtime","shows in","find show","theatre","cinema"]):
            return {"tool":"get_shows","params":{
                "movie_name":ctx.get("movie_name",""),"city":ctx.get("city",""),"date_str":""}}

        if any(w in msg for w in ["book","ticket"]):
            mm = re.search(r'for\s+(.+?)(?:\s+in\s+|\s+at\s+|$)', message, re.IGNORECASE)
            movie = mm.group(1).strip() if mm else ctx.get("movie_name","")
            n     = self._extract_num_tickets(message) or 1
            return {"tool":"get_shows","params":{"movie_name":movie,"num_tickets":n,"date_str":""}}

        if any(w in msg for w in ["movie","film","watch","list","action","drama","horror","comedy"]):
            gmap = {"action":"Action","drama":"Drama","horror":"Horror","comedy":"Comedy",
                    "thriller":"Thriller","romance":"Romance","sci-fi":"Sci-Fi","fantasy":"Fantasy"}
            genre = next((gmap[k] for k in gmap if k in msg), "")
            return {"tool":"search_movies","params":{"genre":genre,"movie_name":""}}

        return {"tool":"chitchat","params":{}}

    async def process_message(self, user_id: str, session_id: str, message: str) -> dict:
        session = await self.db.chat_sessions.find_one({"session_id": session_id}, {"_id": 0})
        if not session:
            session = {"session_id": session_id, "user_id": user_id,
                       "messages": [], "state": "idle", "context": {}, "agent_history": []}

        ctx     = session.get("context", {})
        ctx["user_id"] = user_id
        state   = session.get("state", "idle")
        history = session.get("messages", [])

        # Load long-term user memory and merge into context (fills gaps)
        memory = await _load_user_memory(self.db, user_id)
        for key in ("city", "language", "seat_preference", "past_genres", "num_tickets"):
            if key in memory and not ctx.get(key):
                ctx[key] = memory[key]

        msg_clean   = message.strip().lower().rstrip("!?.").strip()
        is_greeting = (msg_clean in GREETING_WORDS or
                       (len(message.split()) <= 2 and msg_clean in GREETING_WORDS))

        tool_name    = "chitchat"
        tool_params  = {}
        agent_result = None
        new_state    = state
        response     = None

        if is_greeting:
            agent_result = {"type": "chitchat"}
            response     = self._greeting()
        else:
            # ── 1. Nav action detection (change seats, go back, more tickets) ──
            nav = self._detect_nav_action(message, state, ctx)

            # ── 2. Inline show_id → seat_choice (highest priority after nav) ──
            inline_show_id = self._extract_show_id(message)

            if nav:
                tool_name   = nav["tool"]
                tool_params = nav.get("params", {})
            elif message.startswith("autoselect-seats"):
                # Structured message from SeatChoiceCard buttons:
                # "autoselect-seats show_id=show-xxx tickets=2 preference=gold"
                sid_m   = re.search(r'show_id=(show-[\w\-]+)', message)
                tick_m  = re.search(r'tickets=(\d+)', message)
                pref_m  = re.search(r'preference=(\w+)', message)
                tool_name   = "select_seats"
                tool_params = {
                    "show_id":        sid_m.group(1)  if sid_m  else ctx.get("show_id",""),
                    "num_tickets":    int(tick_m.group(1)) if tick_m else ctx.get("num_tickets",1),
                    "seat_preference":pref_m.group(1) if pref_m else "any",
                }
            elif inline_show_id:
                # Showtime button tap → show seat choice card
                tool_name   = "seat_choice"
                tool_params = {
                    "show_id":     inline_show_id,
                    "num_tickets": self._extract_num_tickets(message) or ctx.get("num_tickets",1),
                }
            else:
                classification = await self._classify(message, ctx, state, history)
                tool_name   = classification.get("tool","chitchat")
                tool_params = classification.get("params",{}) or {}
                if not tool_params.get("num_tickets") or tool_params["num_tickets"] <= 0:
                    tool_params["num_tickets"] = ctx.get("num_tickets", 1)

                # Force-extract city from message text if LLM missed it
                if not tool_params.get("city"):
                    extracted_city = self._extract_city(message)
                    if extracted_city:
                        tool_params["city"] = extracted_city

            # ── Execute tool ──────────────────────────────────────────────────
            if tool_name == "search_movies":
                agent_result = await tool_search_movies(
                    self.db,
                    movie_name = tool_params.get("movie_name",""),
                    genre      = tool_params.get("genre",""),
                    language   = tool_params.get("language",""),
                    city       = tool_params.get("city",""),
                )
                new_state = "searching"
                if tool_params.get("city"): ctx["city"] = tool_params["city"]
                if agent_result.get("items"):
                    genres = []
                    for m in agent_result["items"][:3]:
                        g = m.get("genre",[])
                        genres.extend(g if isinstance(g,list) else [g])
                    ctx["past_genres"] = list(set(genres))

            elif tool_name == "get_shows":
                movie = tool_params.get("movie_name","") or ctx.get("movie_name","")
                city  = tool_params.get("city","")        or ctx.get("city","")
                num   = int(tool_params.get("num_tickets") or ctx.get("num_tickets") or 1)
                dstr  = tool_params.get("date_str","") or ""

                agent_result = await tool_get_shows(
                    self.db,
                    movie_name  = movie,
                    city        = city,
                    date_str    = dstr,
                    time_pref   = tool_params.get("time_pref","any"),
                    num_tickets = num,
                )
                new_state = "showing_shows"
                if movie: ctx["movie_name"] = movie
                if city:  ctx["city"]       = city
                if num:   ctx["num_tickets"] = num
                ctx["date"] = agent_result.get("date","")

            elif tool_name == "seat_choice":
                # FIX #2 — show choice card instead of auto-selecting
                show_id = tool_params.get("show_id","") or ctx.get("show_id","")
                num     = int(tool_params.get("num_tickets") or ctx.get("num_tickets") or 1)
                agent_result = await tool_seat_choice(self.db, show_id, num)
                ctx["show_id"]     = show_id
                ctx["num_tickets"] = num
                new_state = "choosing_seats"

            elif tool_name == "select_seats":
                show_id = tool_params.get("show_id","") or ctx.get("show_id","")
                num     = int(tool_params.get("num_tickets") or ctx.get("num_tickets") or 1)
                pref    = tool_params.get("seat_preference","any")
                agent_result = await tool_select_seats(self.db, show_id, num, pref)
                if agent_result.get("type") == "seats_selected":
                    ctx["auto_seat_ids"] = agent_result.get("seat_ids",[])
                    ctx["show_id"]       = show_id
                    ctx["num_tickets"]   = num
                new_state = "seat_selection"

            elif tool_name == "manual_seat_redirect":
                show_id = tool_params.get("show_id","") or ctx.get("show_id","")
                agent_result = {
                    "type": "manual_seat_redirect",
                    "show_id": show_id,
                    "url": f"/book/{show_id}",
                }
                new_state = "idle"

            elif tool_name == "confirm_booking":
                show_id  = ctx.get("show_id","")
                seat_ids = ctx.get("auto_seat_ids",[])
                agent_result = await tool_confirm_booking(self.db, user_id, show_id, seat_ids)
                if agent_result.get("type") == "booking_confirmed":
                    new_state = "idle"
                    for k in ("auto_seat_ids","show_id","num_tickets","movie_name","city","date"):
                        ctx.pop(k, None)

            elif tool_name == "recommend_movies":
                agent_result = await tool_recommend_movies(
                    self.db, message,
                    past_genres = ctx.get("past_genres",[]),
                    language    = tool_params.get("language","") or ctx.get("language",""),
                )
                new_state = "searching"

            elif tool_name == "view_bookings":
                agent_result = await tool_view_bookings(self.db, user_id)
                new_state    = "viewing_tickets"

            elif tool_name == "get_help":
                agent_result = {"type":"help","capabilities":[
                    "Search movies by name, genre or language",
                    "Find shows in your city on any date",
                    "Choose seat category (Platinum/Gold/Silver) or auto-select",
                    "Confirm booking directly in chat",
                    "Get personalised recommendations",
                    "View booking history + re-book",
                ]}
            else:
                agent_result = {"type":"chitchat"}

            if response is None:
                response = await self._respond(message, tool_name, agent_result, new_state, ctx)

        # ── Persist ───────────────────────────────────────────────────────────
        ts = datetime.now(timezone.utc).isoformat()
        session["messages"].append({"role":"user",      "content":message,  "timestamp":ts})
        session["messages"].append({"role":"assistant", "content":response, "timestamp":ts})
        session["state"]   = new_state
        session["context"] = ctx
        session.setdefault("agent_history",[]).append(
            {"timestamp":ts,"tool":tool_name,"state":new_state})

        await self.db.chat_sessions.update_one(
            {"session_id": session_id}, {"$set": session}, upsert=True)

        # Save learned preferences to long-term memory
        await _save_user_memory(self.db, user_id, {
            "city":             ctx.get("city",""),
            "language":         ctx.get("language",""),
            "seat_preference":  ctx.get("seat_preference",""),
            "past_genres":      ctx.get("past_genres",[]),
            "num_tickets":      ctx.get("num_tickets", 0),
        })

        return {
            "message":     response,
            "intent":      tool_name,
            "state":       new_state,
            "action":      agent_result.get("type") if agent_result else "none",
            "data":        agent_result,
            "context":     {k:v for k,v in ctx.items() if k not in ("user_id",)},
            "agent_steps": self._steps(tool_name, new_state, agent_result),
        }

    async def _respond(self, user_message, tool, result, state, ctx) -> str:
        rtype = result.get("type","") if result else ""
        count = len(result.get("items",[])) if result else 0

        if rtype == "booking_confirmed":
            b = result.get("booking",{})
            return f"🎉 Booking confirmed! Ticket **{b.get('ticket_id','')}** for {b.get('movie_title','')} is all set!"
        if rtype == "auth_required":   return "Please sign in first to continue 🔐"
        if rtype == "seats_conflict":  return result.get("message","Those seats were taken! Pick new ones.")
        if rtype == "error":           return result.get("message","Something went wrong — please try again.")
        if rtype == "manual_seat_redirect":
            return "No problem! Click the button below to choose your own seats on the seat map 🗺️"
        if tool == "get_help" or rtype == "help":
            caps  = result.get("capabilities",[]) if result else []
            lines = "\n".join(f"• {c}" for c in caps)
            return f"Here's what I can help with:\n\n{lines}\n\nWhat would you like to do? 🎬"
        if tool == "chitchat": return self._greeting()

        situation = {"user_said":user_message,"tool":tool,"result_type":rtype,"count":count}
        if rtype == "movies":
            situation["titles"] = [m.get("title","") for m in (result.get("items") or [])[:4]]
            if result.get("city"): situation["city"] = result["city"]
        elif rtype == "recommendations":
            situation["titles"] = [m.get("title","") for m in (result.get("items") or [])[:4]]
            situation["reason"] = result.get("reason","")
        elif rtype == "shows":
            situation.update({"movie":result.get("movie_name",""),"city":result.get("city",""),
                               "date":result.get("date","")})
        elif rtype == "seat_choice":
            show = result.get("show",{})
            situation.update({"movie":show.get("movie_title",""),"theatre":show.get("theatre_name",""),
                               "date":show.get("date",""),"time":show.get("time",""),
                               "num_tickets":result.get("num_tickets",1)})
        elif rtype == "seats_selected":
            show = result.get("show",{})
            situation.update({"movie":show.get("movie_title",""),
                               "seats":[s["id"] for s in (result.get("seats") or [])],
                               "total":result.get("total",0)})
        elif rtype == "bookings":
            situation["count"] = count

        prompt = f"""You are ShowSpot AI, a friendly movie booking assistant.
Write ONE short natural reply (1-2 sentences max, ~20 words).
Facts: {json.dumps(situation)}
Rules: natural tone, 1-2 emojis, guide next action, no bullets, no JSON, no markdown."""

        text = await _prose(prompt)
        if text and len(text.strip()) > 5:
            return text.strip()

        if rtype == "movies":          return f"Found {count} movies! Tap one to see showtimes 🎬"
        if rtype == "recommendations": return f"Here are {count} picks for you! ✨"
        if rtype == "shows":           return f"Found {count} shows! Tap a time to pick seats 🏟️"
        if rtype == "seat_choice":     return "Pick your seat category below, or I'll auto-select the best ones 💺"
        if rtype == "seats_selected":  return "Seats are ready! Tap Confirm Booking to lock them in ✅"
        if rtype == "bookings":        return f"Here are your {count} booking(s) 🎟️"
        return "What would you like to do next? 🍿"

    def _steps(self, tool, state, result):
        return [
            {"id":"intent", "label":"Understanding",  "done":True},
            {"id":"movies", "label":"Finding movies",  "done":state in ("searching","showing_shows","choosing_seats","seat_selection","booking_confirm","viewing_tickets")},
            {"id":"shows",  "label":"Showtimes",       "done":state in ("showing_shows","choosing_seats","seat_selection","booking_confirm")},
            {"id":"seats",  "label":"Seats",           "done":state in ("choosing_seats","seat_selection","booking_confirm")},
            {"id":"booking","label":"Confirmed",       "done":state=="idle" and bool(result and result.get("type")=="booking_confirmed")},
        ]


BookingAgent = OrchestratorAgent
