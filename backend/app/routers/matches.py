"""Feature 3 (draft): rank sightings against the logged-in owner's stolen scooters.

Owners only ever see their own scooters here. Sightings come from everyone,
but without who reported them, like the sightings map. Alerts aren't built yet.
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
def my_matches(user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    scooters = []
    for row in db.execute(
        "SELECT * FROM scooters WHERE owner_id = ? AND status = 'stolen' ORDER BY stolen_at DESC", (user["id"],)
    ):
        scooter = dict(row)
        scooter["photos"] = photos(db, "scooter_photos", "scooter_id", row["id"], "/scooters/photos")
        scooters.append(scooter)

    sightings = []
    for row in db.execute("SELECT * FROM sightings ORDER BY seen_at DESC"):
        sighting = dict(row)
        sighting["features"] = json.loads(sighting["features"] or "[]")
        sighting["photos"] = photos(db, "sighting_photos", "sighting_id", row["id"], "/sightings/photos")
        sightings.append(sighting)

    results = rank(scooters, sightings)
    # Matching needed these, but owners shouldn't learn who reported a sighting,
    # or a serial number the spotter read off some other scooter.
    for sighting in sightings:
        del sighting["reporter_id"], sighting["serial_number"]
    return {"total_sightings": len(sightings), "results": results}
