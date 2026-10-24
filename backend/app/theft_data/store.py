"""Database tables for the theft map, and the queries the page needs."""

from datetime import date, timedelta

from ..db import run_schema

# "This semester" starts here. Update each semester.
SEMESTER = {"label": "Fall 2026", "start": "2026-08-24"}

RANGES = {
    "30d": "Last 30 days",
    "semester": f"This semester ({SEMESTER['label']})",
    "all": "All time",
}


def init_tables():
    run_schema("""
        -- Only scooter/bike thefts are kept; other crimes are skipped at ingest.
        CREATE TABLE IF NOT EXISTS theft_incidents (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            source         TEXT NOT NULL,              -- e.g. 'uiuc_police_daily_log'
            case_number    TEXT NOT NULL,
            reported_date  TEXT NOT NULL,              -- YYYY-MM-DD
            occurred_start TEXT,                       -- ISO date or date+time, NULL if unknown
            occurred_end   TEXT,
            location_raw   TEXT NOT NULL,              -- exactly as the log wrote it
            place_name     TEXT,                       -- "Bousfield Hall"
            sub_location   TEXT,                       -- "Bike Rack"
            street_address TEXT,                       -- "1214 S First St, Champaign"
            on_campus      INTEGER,                    -- 1, 0, or NULL if the log doesn't say
            description    TEXT NOT NULL,              -- "Motor Vehicle Theft, Trespass"
            disposition    TEXT,
            category       TEXT NOT NULL CHECK (category IN ('scooter', 'likely_scooter', 'bike')),
            match_reason   TEXT NOT NULL,              -- why the keyword filter kept it
            geocode_key    TEXT,                       -- geocode_cache.key (filled in after the lookup, so no FK)
            first_seen_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (source, case_number)               -- re-importing updates instead of duplicating
        );
        CREATE INDEX IF NOT EXISTS theft_incidents_reported ON theft_incidents (reported_date);

        -- One row per address ever looked up, so nothing is geocoded twice.
        CREATE TABLE IF NOT EXISTS geocode_cache (
            key          TEXT PRIMARY KEY,             -- "1214 S FIRST ST, CHAMPAIGN, IL" or "PLACE:Bousfield Hall"
            query        TEXT NOT NULL,                -- what was actually sent to the geocoder
            lat          REAL,
            lng          REAL,
            provider     TEXT NOT NULL,                -- 'nominatim', or 'manual' for hand fixes
            status       TEXT NOT NULL CHECK (status IN ('ok', 'not_found', 'error')),
            precision    TEXT CHECK (precision IN ('exact', 'street')),  -- 'street' = only the street matched
            display_name TEXT,
            geocoded_at  TEXT NOT NULL
        );

        -- A record of each import, for "last updated" and debugging.
        CREATE TABLE IF NOT EXISTS theft_ingest_runs (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            source      TEXT NOT NULL,
            input       TEXT NOT NULL,                 -- file name
            rows_read   INTEGER NOT NULL,
            rows_kept   INTEGER NOT NULL,              -- passed the keyword filter
            rows_new    INTEGER NOT NULL,
            geocoded    INTEGER NOT NULL,              -- new lookups (cache misses)
            finished_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    """)


def upsert_incident(db, incident):
    """Insert, or update the existing row with the same source + case number. Returns True if new."""
    exists = db.execute(
        "SELECT 1 FROM theft_incidents WHERE source = ? AND case_number = ?",
        (incident["source"], incident["case_number"]),
    ).fetchone()
    columns = list(incident)
    db.execute(
        f"INSERT INTO theft_incidents ({', '.join(columns)}) VALUES ({', '.join('?' * len(columns))}) "
        "ON CONFLICT (source, case_number) DO UPDATE SET "
        + ", ".join(f"{c} = excluded.{c}" for c in columns if c not in ("source", "case_number"))
        + ", updated_at = CURRENT_TIMESTAMP",
        [incident[c] for c in columns],
    )
    return exists is None


def since_date(range_key, today=None):
    today = today or date.today()
    if range_key == "30d":
        return (today - timedelta(days=30)).isoformat()
    if range_key == "semester":
        return SEMESTER["start"]
    return None


def incidents_in_range(db, range_key):
    """Thefts in the range, with lat/lng when the address was found (else None)."""
    since = since_date(range_key)
    rows = db.execute(
        "SELECT t.*, g.lat, g.lng, g.precision FROM theft_incidents t "
        "LEFT JOIN geocode_cache g ON g.key = t.geocode_key AND g.status = 'ok' "
        + ("WHERE t.reported_date >= ? " if since else "")
        + "ORDER BY t.reported_date DESC, t.id DESC",
        (since,) if since else (),
    ).fetchall()
    return [dict(r) for r in rows]


def last_ingest(db):
    row = db.execute("SELECT * FROM theft_ingest_runs ORDER BY id DESC LIMIT 1").fetchone()
    return dict(row) if row else None
