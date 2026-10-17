"""Feature 1: Register a scooter (the owner's side).

Owners register a scooter with its details and 2+ photos, then mark it
stolen (or recovered). Matching (Feature 3) only looks at stolen scooters.
"""

import secrets
import sqlite3
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from ..auth import get_current_user
from ..db import get_db, run_schema
from .sightings import BRANDS as SIGHTING_BRANDS, COLORS as SIGHTING_COLORS

# Same lists as sightings, so matching can compare them exactly.
# "unsure" is only for spotters: owners know their own scooter.
BRANDS = SIGHTING_BRANDS - {"unsure"}
COLORS = SIGHTING_COLORS - {"unsure"}

router = APIRouter(prefix="/scooters", tags=["scooters"])

# Uploaded photos live here. The folder is in .gitignore, like the database.
UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "scooters"

MIN_PHOTOS = 2
MAX_PHOTO_BYTES = 10 * 1024 * 1024
PHOTO_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/heic": ".heic"}


def init_tables():
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    run_schema("""
        CREATE TABLE IF NOT EXISTS scooters (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            owner_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            brand         TEXT NOT NULL,
            model         TEXT NOT NULL DEFAULT '',
            color         TEXT NOT NULL,
            serial_number TEXT,
            marks         TEXT NOT NULL DEFAULT '',
            status        TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'stolen')),
            stolen_at     TEXT,
            created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        -- A serial number can only be registered once (but it's optional).
        CREATE UNIQUE INDEX IF NOT EXISTS scooters_serial_unique
            ON scooters (serial_number) WHERE serial_number IS NOT NULL;
        CREATE TABLE IF NOT EXISTS scooter_photos (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            scooter_id INTEGER NOT NULL REFERENCES scooters(id) ON DELETE CASCADE,
            filename   TEXT NOT NULL UNIQUE
        );
    """)


# --- helpers ---------------------------------------------------------------

def clean_details(brand, model, color, serial_number, marks):
    """Trim everything and store brand/color lowercase so matching can compare them exactly."""
    brand = brand.strip().lower()
    color = color.strip().lower()
    if brand not in BRANDS:
        raise HTTPException(400, "Please pick a brand from the list")
    if color not in COLORS:
        raise HTTPException(400, "Please pick a color from the list")
    serial = (serial_number or "").strip().upper() or None
    return brand, model.strip(), color, serial, marks.strip()


def to_dict(db, row):
    scooter = dict(row)
    photos = db.execute(
        "SELECT filename FROM scooter_photos WHERE scooter_id = ? ORDER BY id", (row["id"],)
    ).fetchall()
    scooter["photos"] = [f"/scooters/photos/{p['filename']}" for p in photos]
    return scooter


def get_own_scooter(db, scooter_id, user):
    row = db.execute(
        "SELECT * FROM scooters WHERE id = ? AND owner_id = ?", (scooter_id, user["id"])
    ).fetchone()
    if row is None:
        raise HTTPException(404, "Scooter not found")
    return row


# --- endpoints -------------------------------------------------------------

@router.post("")
async def register_scooter(
    brand: str = Form(...),
    color: str = Form(...),
    model: str = Form(""),
    serial_number: str = Form(""),
    marks: str = Form(""),
    photos: list[UploadFile] = File(...),
    user=Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    brand, model, color, serial, marks = clean_details(brand, model, color, serial_number, marks)

    if len(photos) < MIN_PHOTOS:
        raise HTTPException(400, f"Please add at least {MIN_PHOTOS} photos")

    # Read and check every photo before saving anything.
    files = []
    for photo in photos:
        ext = PHOTO_TYPES.get(photo.content_type)
        if ext is None:
            raise HTTPException(400, f"{photo.filename} isn't a JPEG, PNG, WebP or HEIC image")
        data = await photo.read()
        if len(data) > MAX_PHOTO_BYTES:
            raise HTTPException(400, f"{photo.filename} is bigger than 10 MB")
        files.append((secrets.token_hex(16) + ext, data))

    try:
        scooter_id = db.execute(
            "INSERT INTO scooters (owner_id, brand, model, color, serial_number, marks) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (user["id"], brand, model, color, serial, marks),
        ).lastrowid
    except sqlite3.IntegrityError:
        raise HTTPException(409, "A scooter with that serial number is already registered")

    for filename, data in files:
        (UPLOAD_DIR / filename).write_bytes(data)
        db.execute("INSERT INTO scooter_photos (scooter_id, filename) VALUES (?, ?)", (scooter_id, filename))
    db.commit()

    return to_dict(db, get_own_scooter(db, scooter_id, user))


@router.get("/mine")
def my_scooters(user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute(
        "SELECT * FROM scooters WHERE owner_id = ? ORDER BY id DESC", (user["id"],)
    ).fetchall()
    return [to_dict(db, row) for row in rows]


# Photos are public on purpose: <img> tags can't send the login token, and
# the random filenames can't be guessed.
@router.get("/photos/{filename}")
def scooter_photo(filename: str):
    path = UPLOAD_DIR / Path(filename).name  # .name blocks "../" tricks
    if not path.is_file():
        raise HTTPException(404, "Photo not found")
    return FileResponse(path)


@router.get("/{scooter_id}")
def get_scooter(scooter_id: int, user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    return to_dict(db, get_own_scooter(db, scooter_id, user))


class ScooterDetails(BaseModel):
    brand: str
    model: str = ""
    color: str
    serial_number: str = ""
    marks: str = ""


@router.put("/{scooter_id}")
def edit_scooter(
    scooter_id: int,
    details: ScooterDetails,
    user=Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    get_own_scooter(db, scooter_id, user)
    brand, model, color, serial, marks = clean_details(
        details.brand, details.model, details.color, details.serial_number, details.marks
    )
    try:
        db.execute(
            "UPDATE scooters SET brand = ?, model = ?, color = ?, serial_number = ?, marks = ? WHERE id = ?",
            (brand, model, color, serial, marks, scooter_id),
        )
    except sqlite3.IntegrityError:
        raise HTTPException(409, "A scooter with that serial number is already registered")
    db.commit()
    return to_dict(db, get_own_scooter(db, scooter_id, user))


@router.post("/{scooter_id}/stolen")
def mark_stolen(scooter_id: int, user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    get_own_scooter(db, scooter_id, user)
    db.execute(
        "UPDATE scooters SET status = 'stolen', stolen_at = CURRENT_TIMESTAMP WHERE id = ? AND status != 'stolen'",
        (scooter_id,),
    )
    db.commit()
    return to_dict(db, get_own_scooter(db, scooter_id, user))


@router.post("/{scooter_id}/recovered")
def mark_recovered(scooter_id: int, user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    get_own_scooter(db, scooter_id, user)
    db.execute("UPDATE scooters SET status = 'registered', stolen_at = NULL WHERE id = ?", (scooter_id,))
    db.commit()
    return to_dict(db, get_own_scooter(db, scooter_id, user))
