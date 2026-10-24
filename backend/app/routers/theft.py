"""Theft Risk Map: where scooters and bikes get stolen, from the UIUC Police crime log.

The data is imported separately (python -m app.theft_data ...); this endpoint
only reads what's in the database, so the page never waits on a geocoder.
"""

import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..db import get_db
from ..theft_data import store
from ..theft_data.classify import CATEGORY_LABELS
from ..theft_data.hotspots import hotspots

router = APIRouter(prefix="/theft", tags=["theft"])


def init_tables():
    store.init_tables()


@router.get("/map")
def theft_map(range: str = "semester", user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    if range not in store.RANGES:
        raise HTTPException(400, f"range must be one of {list(store.RANGES)}")

    incidents = store.incidents_in_range(db, range)
    mapped = [i for i in incidents if i["lat"] is not None]
    return {
        "range": range,
        "ranges": [{"value": k, "label": v} for k, v in store.RANGES.items()],
        "since": store.since_date(range),
        "total": len(incidents),
        "unmapped": len(incidents) - len(mapped),
        "category_labels": CATEGORY_LABELS,
        "incidents": [
            {
                "id": i["id"],
                "case_number": i["case_number"],
                "reported_date": i["reported_date"],
                "occurred_start": i["occurred_start"],
                "occurred_end": i["occurred_end"],
                "place_name": i["place_name"],
                "sub_location": i["sub_location"],
                "street_address": i["street_address"],
                "description": i["description"],
                "disposition": i["disposition"],
                "category": i["category"],
                "lat": i["lat"],
                "lng": i["lng"],
                "approximate": i["precision"] == "street",
            }
            for i in mapped
        ],
        "hotspots": hotspots(mapped),
        "last_import": store.last_ingest(db),
    }
