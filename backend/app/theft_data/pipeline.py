"""Run one import: read a source, keep scooter/bike thefts, store them, geocode new addresses."""

from .classify import classify
from .geocode import Geocoder
from .parse import address_key, parse_date, parse_location, parse_occurred
from .store import upsert_incident


def normalize(raw, source):
    """RawIncident -> dict ready for theft_incidents, or None if it's not a scooter/bike theft."""
    kept = classify(raw.description, raw.location)
    reported = parse_date(raw.reported)
    if not kept or not reported:
        return None
    category, reason = kept
    start, end = parse_occurred(raw.occurred)
    loc = parse_location(raw.location)
    key = address_key(loc["street_address"]) or (f"PLACE:{loc['place_name']}" if loc["place_name"] else None)
    return {
        "source": source,
        "case_number": raw.case_number,
        "reported_date": reported,
        "occurred_start": start,
        "occurred_end": end,
        "location_raw": raw.location,
        "place_name": loc["place_name"],
        "sub_location": loc["sub_location"],
        "street_address": loc["street_address"],
        "on_campus": loc["on_campus"],
        "description": raw.description,
        "disposition": raw.disposition or None,
        "category": category,
        "match_reason": reason,
        "geocode_key": key,
    }


def geocode_queries(incident):
    """What to ask the geocoder, best first: the street address, then the building name."""
    queries = []
    if incident["street_address"]:
        queries.append(f"{incident['street_address']}, IL")
    if incident["place_name"]:
        queries.append(f"{incident['place_name']}, Urbana-Champaign, IL")
    return queries


def ingest(db, source, input_name, geocoder=None, retry_failed=False, log=print):
    rows_read = rows_kept = rows_new = 0
    keys = {}
    for raw in source.rows():
        rows_read += 1
        incident = normalize(raw, source.source)
        if incident is None:
            continue
        rows_kept += 1
        rows_new += upsert_incident(db, incident)
        if incident["geocode_key"]:
            keys.setdefault(incident["geocode_key"], geocode_queries(incident))
    db.commit()

    geocoder = geocoder or Geocoder(db)
    statuses = {"ok": 0, "not_found": 0, "error": 0, "street_only": 0}
    for i, (key, queries) in enumerate(keys.items(), 1):
        before = geocoder.looked_up
        row = geocoder.geocode(key, queries, retry_failed=retry_failed)
        statuses[row["status"]] += 1
        statuses["street_only"] += row["precision"] == "street"
        if geocoder.looked_up > before:  # only print lookups that hit the network, not cache hits
            log(f"  [{i}/{len(keys)}] {row['status']:<9} {key}")

    db.execute(
        "INSERT INTO theft_ingest_runs (source, input, rows_read, rows_kept, rows_new, geocoded) VALUES (?, ?, ?, ?, ?, ?)",
        (source.source, input_name, rows_read, rows_kept, rows_new, geocoder.looked_up),
    )
    db.commit()
    return {"rows_read": rows_read, "rows_kept": rows_kept, "rows_new": rows_new,
            "addresses": len(keys), "geocoded": geocoder.looked_up, **statuses}
