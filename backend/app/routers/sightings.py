"""Feature 2: Submit a sighting (the spotter's side)."""

import json
import re
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from ..auth import get_current_user
from ..db import get_db, run_schema

router = APIRouter(prefix="/sightings", tags=["sightings"])

# Uploaded photos live here (gitignored, like the database).
PHOTO_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "sightings"

MIN_PHOTOS = 2
MAX_PHOTOS = 5
MAX_PHOTO_BYTES = 8 * 1024 * 1024  # the browser shrinks photos first, so real ones are far smaller
MAX_NOTES = 200
POINTS_PER_SIGHTING = 10

# Keep these lists in sync with frontend/src/sighting/constants.js.
# Brand and color must match Feature 1's lists exactly, because matching compares them.
BRANDS = {"segway", "xiaomi", "gotrax", "hiboy", "apollo", "other", "unsure"}
COLORS = {"black", "white", "gray", "red", "blue", "green", "other", "unsure"}
FEATURES = {"sticker", "basket", "phone mount", "scratches", "damaged", "bell", "lights"}
SITUATIONS = {"locked", "lying", "abandoned"}  # "someone is riding it" left out on purpose (safety)


def init_tables():
    run_schema("""
        CREATE TABLE IF NOT EXISTS sightings (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            lat         REAL NOT NULL,
            lng         REAL NOT NULL,
            landmark    TEXT,
            seen_at     TEXT NOT NULL,
            brand       TEXT,
            color       TEXT,
            features    TEXT NOT NULL DEFAULT '[]',  -- JSON list, e.g. ["sticker", "basket"]
            situation   TEXT,
            notes       TEXT,
            created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS sighting_photos (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            sighting_id INTEGER NOT NULL REFERENCES sightings(id) ON DELETE CASCADE,
            filename    TEXT NOT NULL,
            label       TEXT,
            position    INTEGER NOT NULL
        );
    """)


def points_for(db, user_id):
    count = db.execute("SELECT COUNT(*) FROM sightings WHERE reporter_id = ?", (user_id,)).fetchone()[0]
    return count * POINTS_PER_SIGHTING


def pick(value, allowed, field):
    """Return value lowercased, or None if empty. Reject anything not in the allowed list."""
    value = (value or "").strip().lower()
    if not value:
        return None
    if value not in allowed:
        raise HTTPException(400, f"Unknown {field}: {value}")
    return value


def parse_seen_at(seen_at):
    """Empty means "just now". Otherwise an ISO time that isn't in the future or over a week old."""
    now = datetime.now(timezone.utc)
    if not seen_at:
        return now
    try:
        when = datetime.fromisoformat(seen_at.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(400, "seen_at must be a date and time")
    if when.tzinfo is None:
        when = when.replace(tzinfo=timezone.utc)
    if when > now + timedelta(minutes=5):
        raise HTTPException(400, "The sighting time can't be in the future")
    if when < now - timedelta(days=7):
        raise HTTPException(400, "Sightings older than a week aren't accepted")
    return when


def to_dict(db, row):
    photos = db.execute(
        "SELECT filename, label FROM sighting_photos WHERE sighting_id = ? ORDER BY position",
        (row["id"],),
    ).fetchall()
    sighting = dict(row)
    sighting["features"] = json.loads(sighting["features"])
    # SQLite's CURRENT_TIMESTAMP is UTC without a timezone; mark it so browsers convert it correctly.
    sighting["created_at"] = sighting["created_at"].replace(" ", "T") + "+00:00"
    sighting["photos"] = [{"url": f"/sightings/photos/{p['filename']}", "label": p["label"]} for p in photos]
    return sighting


@router.post("")
async def create_sighting(
    photos: list[UploadFile] = File(...),
    photo_labels: list[str] = Form([]),
    lat: float = Form(...),
    lng: float = Form(...),
    landmark: str = Form(""),
    seen_at: str = Form(""),
    brand: str = Form(""),
    color: str = Form(""),
    features: str = Form("[]"),
    situation: str = Form(""),
    notes: str = Form(""),
    user=Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    if not MIN_PHOTOS <= len(photos) <= MAX_PHOTOS:
        raise HTTPException(400, f"Please add {MIN_PHOTOS} to {MAX_PHOTOS} photos")
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        raise HTTPException(400, "That location isn't valid")

    try:
        feature_list = json.loads(features)
    except json.JSONDecodeError:
        raise HTTPException(400, "features must be a JSON list")
    if not isinstance(feature_list, list) or any(f not in FEATURES for f in feature_list):
        raise HTTPException(400, "Unknown feature in the list")

    notes = notes.strip()
    if len(notes) > MAX_NOTES:
        raise HTTPException(400, f"Notes can be at most {MAX_NOTES} characters")

    # Read and check every photo before saving anything.
    images = []
    for photo in photos:
        if not (photo.content_type or "").startswith("image/"):
            raise HTTPException(400, f"{photo.filename or 'A file'} isn't an image")
        data = await photo.read()
        if len(data) > MAX_PHOTO_BYTES:
            raise HTTPException(400, "One of the photos is too large")
        images.append(data)

    cur = db.execute(
        """INSERT INTO sightings (reporter_id, lat, lng, landmark, seen_at, brand, color, features, situation, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            user["id"], lat, lng, landmark.strip()[:60] or None,
            parse_seen_at(seen_at).isoformat(timespec="seconds"),
            pick(brand, BRANDS, "brand"), pick(color, COLORS, "color"),
            json.dumps(sorted(set(feature_list))), pick(situation, SITUATIONS, "situation"), notes or None,
        ),
    )
    sighting_id = cur.lastrowid

    PHOTO_DIR.mkdir(parents=True, exist_ok=True)
    for position, data in enumerate(images):
        filename = f"{uuid.uuid4().hex}.jpg"  # random name, never the user's filename
        (PHOTO_DIR / filename).write_bytes(data)
        label = photo_labels[position][:40] if position < len(photo_labels) else None
        db.execute(
            "INSERT INTO sighting_photos (sighting_id, filename, label, position) VALUES (?, ?, ?, ?)",
            (sighting_id, filename, label, position),
        )
    db.commit()

    row = db.execute("SELECT * FROM sightings WHERE id = ?", (sighting_id,)).fetchone()
    return {"sighting": to_dict(db, row), "points": points_for(db, user["id"])}


@router.get("/mine")
def my_sightings(user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute(
        "SELECT * FROM sightings WHERE reporter_id = ? ORDER BY created_at DESC, id DESC",
        (user["id"],),
    ).fetchall()
    return [to_dict(db, row) for row in rows]


MAP_LIMIT = 500  # newest first; plenty for campus, and keeps the map fast


@router.get("/map")
def map_sightings(days: int | None = None, user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    """Everyone's sightings for the View sightings map. Who reported them is never sent;
    `mine` only tells the logged-in user which ones are their own."""
    if days is not None and not 1 <= days <= 365:
        raise HTTPException(400, "days must be between 1 and 365")
    sql, args = "SELECT * FROM sightings", []
    if days is not None:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        sql += " WHERE seen_at >= ?"  # seen_at is always stored as UTC ISO text, so text comparison works
        args.append(since.isoformat(timespec="seconds"))
    sql += " ORDER BY seen_at DESC, id DESC LIMIT ?"
    args.append(MAP_LIMIT)

    sightings = []
    for row in db.execute(sql, args).fetchall():
        sighting = to_dict(db, row)
        sighting["mine"] = sighting.pop("reporter_id") == user["id"]
        sightings.append(sighting)
    return sightings


@router.get("/points")
def my_points(user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    return {"points": points_for(db, user["id"])}


@router.get("/photos/{filename}")
def get_photo(filename: str):
    # <img> tags can't send the login token, so this isn't behind login. The random
    # 32-character names can't be guessed, and the pattern blocks paths like "../".
    if not re.fullmatch(r"[0-9a-f]{32}\.jpg", filename):
        raise HTTPException(404, "Photo not found")
    path = PHOTO_DIR / filename
    if not path.is_file():
        raise HTTPException(404, "Photo not found")
    return FileResponse(path, media_type="image/jpeg")
