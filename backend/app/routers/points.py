"""Points and the weekly Points competition.

Points are never stored: they're counted from sightings and scooters each time,
so they can't drift out of sync.

  - every sighting you report:           +10
  - setting up My Scooter (one time):    +20  (registering your first scooter)

The competition starts over every Monday at midnight, campus time: the
leaderboard only counts points earned this week, and last week's top 3 stay
on show. Points never expire, though: everything you've ever earned, minus
what you spent in the shop (routers/shop.py), is your balance.
"""

import sqlite3
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends

from ..auth import get_current_user
from ..db import get_db

router = APIRouter(prefix="/points", tags=["points"])

POINTS_PER_SIGHTING = 10
SCOOTER_SETUP_BONUS = 20
LEADERBOARD_SIZE = 50
CAMPUS_TZ = ZoneInfo("America/Chicago")
ALL_TIME = ("0000-01-01 00:00:00", "9999-12-31 23:59:59")

# One row per user: sightings and scooter setup inside [:since, :until), plus the points they're worth.
# Timestamps are SQLite CURRENT_TIMESTAMP text (UTC), so plain text comparison is correct.
SCORES_SQL = f"""
    SELECT id, email, sightings, scooter_done,
           sightings * {POINTS_PER_SIGHTING} + scooter_done * {SCOOTER_SETUP_BONUS} AS points
    FROM (
        SELECT users.id, users.email,
               (SELECT COUNT(*) FROM sightings
                 WHERE reporter_id = users.id AND created_at >= :since AND created_at < :until) AS sightings,
               COALESCE(first_scooter >= :since AND first_scooter < :until, 0) AS scooter_done
        FROM users
        LEFT JOIN (SELECT owner_id, MIN(created_at) AS first_scooter FROM scooters GROUP BY owner_id)
               ON owner_id = users.id
    )
"""

# The shop items each user has on (the shop owns this table).
COSMETICS_SQL = """
    LEFT JOIN (SELECT user_id,
                      MAX(CASE WHEN kind = 'background' THEN item_id END) AS background,
                      MAX(CASE WHEN kind = 'frame' THEN item_id END) AS frame
               FROM equipped GROUP BY user_id) AS cosmetics ON cosmetics.user_id = scores.id
"""


def init_tables():
    pass  # no tables of its own: it counts sightings and scooters


# --- weeks -------------------------------------------------------------------

def week_bounds(weeks_ago=0, now=None):
    """Monday 00:00 to the next Monday 00:00, campus time, as aware datetimes."""
    today = (now or datetime.now(timezone.utc)).astimezone(CAMPUS_TZ).date()
    monday = today - timedelta(days=today.weekday() + 7 * weeks_ago)
    start = datetime.combine(monday, time(), CAMPUS_TZ)
    end = datetime.combine(monday + timedelta(days=7), time(), CAMPUS_TZ)
    return start, end


def sql_time(dt):
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def window(weeks_ago):
    start, end = week_bounds(weeks_ago)
    return {"since": sql_time(start), "until": sql_time(end)}


# --- scores ------------------------------------------------------------------

def ranked(db, since, until):
    """Everyone with points in the window, best first. Ties share a rank (1, 2, 2, 4)."""
    return db.execute(f"""
        SELECT scores.*, cosmetics.background, cosmetics.frame,
               RANK() OVER (ORDER BY points DESC) AS rank
        FROM ({SCORES_SQL}) AS scores {COSMETICS_SQL}
        WHERE points > 0
        ORDER BY points DESC, sightings DESC, id
    """, {"since": since, "until": until}).fetchall()


def score_for(db, user_id, since, until):
    """(row, rank, players) for one user. Rank counts everyone with more points."""
    args = {"since": since, "until": until, "id": user_id}
    row = db.execute(f"SELECT * FROM ({SCORES_SQL}) WHERE id = :id", args).fetchone()
    ahead, players = db.execute(
        f"SELECT SUM(points > :mine), SUM(points > 0) FROM ({SCORES_SQL})", {**args, "mine": row["points"]}
    ).fetchone()
    return row, (ahead or 0) + 1, players or 0


def total_points(db, user_id):
    """Everything this user has ever earned."""
    since, until = ALL_TIME
    return score_for(db, user_id, since, until)[0]["points"]


def spent_points(db, user_id):
    return db.execute("SELECT COALESCE(SUM(price), 0) FROM purchases WHERE user_id = ?", (user_id,)).fetchone()[0]


def balance(db, user_id):
    """Points you can spend in the shop."""
    return total_points(db, user_id) - spent_points(db, user_id)


def public_row(row, user_id):
    return {
        "rank": row["rank"],
        "name": row["email"].split("@")[0],  # NetID only, never the full email
        "points": row["points"],
        "sightings": row["sightings"],
        "scooter_done": bool(row["scooter_done"]),
        "background": row["background"],
        "frame": row["frame"],
        "me": row["id"] == user_id,
    }


# --- endpoints ---------------------------------------------------------------

@router.get("/me")
def me(user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    week = window(0)
    row, rank, players = score_for(db, user["id"], **week)
    earned = total_points(db, user["id"])
    spent = spent_points(db, user["id"])
    has_scooter = db.execute("SELECT 1 FROM scooters WHERE owner_id = ?", (user["id"],)).fetchone() is not None
    cosmetics = dict(db.execute(
        "SELECT kind, item_id FROM equipped WHERE user_id = ?", (user["id"],)
    ).fetchall())
    return {
        "name": user["email"].split("@")[0],
        "week_points": row["points"],
        "week_sightings": row["sightings"],
        "rank": rank if row["points"] > 0 else None,
        "players": players,
        "earned": earned,
        "spent": spent,
        "balance": earned - spent,
        "scooter_done": has_scooter,
        "background": cosmetics.get("background"),
        "frame": cosmetics.get("frame"),
        "per_sighting": POINTS_PER_SIGHTING,
        "scooter_bonus": SCOOTER_SETUP_BONUS,
    }


@router.get("/leaderboard")
def leaderboard(user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    start, end = week_bounds(0)
    this_week = ranked(db, **window(0))
    last_week = ranked(db, **window(1))
    return {
        "week_start": start.isoformat(),
        "week_end": end.isoformat(),  # when it starts over
        "rows": [public_row(row, user["id"]) for row in this_week[:LEADERBOARD_SIZE]],
        "last_week_top": [public_row(row, user["id"]) for row in last_week[:3]],
    }
