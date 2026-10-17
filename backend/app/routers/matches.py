"""Feature 3 (draft): rank sightings against every stolen scooter.

DRAFT / DEMO: this shows every stolen scooter to every logged-in user so we
can play with the ranking. The real version should only show owners their
own scooters' matches (and alert them).
"""

import json
import sqlite3

from fastapi import APIRouter, Depends

from ..auth import get_current_user
from ..db import get_db
from ..matching import rank

router = APIRouter(prefix="/matches", tags=["matches"])


def init_tables():
    pass  # no tables of its own: it reads scooters and sightings


def photos(db, table, key, owner_id, url_prefix):
    rows = db.execute(f"SELECT filename FROM {table} WHERE {key} = ? ORDER BY id", (owner_id,)).fetchall()
    return [f"{url_prefix}/{r['filename']}" for r in rows]


@router.get("")
def all_matches(user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    scooters = []
    for row in db.execute(
        "SELECT s.*, u.email AS owner_email FROM scooters s JOIN users u ON u.id = s.owner_id "
        "WHERE s.status = 'stolen' ORDER BY s.stolen_at DESC"
    ):
        scooter = dict(row)
        scooter["mine"] = scooter["owner_id"] == user["id"]
        scooter["photos"] = photos(db, "scooter_photos", "scooter_id", row["id"], "/scooters/photos")
        scooters.append(scooter)

    sightings = []
    for row in db.execute("SELECT * FROM sightings ORDER BY seen_at DESC"):
        sighting = dict(row)
        sighting["features"] = json.loads(sighting["features"] or "[]")
        sighting["photos"] = photos(db, "sighting_photos", "sighting_id", row["id"], "/sightings/photos")
        sightings.append(sighting)

    return {"total_sightings": len(sightings), "results": rank(scooters, sightings)}
