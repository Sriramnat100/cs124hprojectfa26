"""Fill your local database with fake stolen scooters and sightings to try matching.

Run from the backend folder (with the venv active):

    python -m app.seed_demo

Safe to run again: it deletes the previous demo data first. Only touches
accounts whose email starts with "demo-", so your own data is left alone.
"""

import json
from datetime import datetime, timedelta, timezone

from .db import connect
from .main import app  # noqa: F401  (importing creates any missing tables)

NOW = datetime.now(timezone.utc)


def ago(**kwargs):
    return NOW - timedelta(**kwargs)


def sql_time(dt):  # how scooters.stolen_at is stored
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def iso_time(dt):  # how sightings.seen_at is stored
    return dt.isoformat(timespec="seconds")


OWNERS = ["demo-owner-1@illinois.edu", "demo-owner-2@illinois.edu", "demo-owner-3@illinois.edu"]
SPOTTER = "demo-spotter@illinois.edu"

# (owner index, brand, model, color, serial, marks, stolen how long ago or None if not stolen)
SCOOTERS = [
    (0, "segway", "Ninebot Max G30", "black", "SEG-G30-48213",
     "Orange Illini sticker on the stem, scratches on the front fender, phone mount on the handlebar",
     timedelta(days=2)),
    (1, "xiaomi", "Mi Pro 2", "red", "XM-PRO2-77310",
     "White stripe down the stem, one gray replacement grip, small basket on the front",
     timedelta(days=3)),
    (2, "gotrax", "G4", "blue", None,
     "Yellow rubber duck decal on the deck, bell on the handlebar",
     timedelta(days=1)),
    (2, "hiboy", "S2", "white", "HB-S2-10094",
     "Cracked rear fender, green LED lights under the deck",
     timedelta(hours=20)),
    (0, "apollo", "City", "green", "APL-CITY-5521",
     "Not stolen, so matching should ignore it",
     None),
]

# (brand, color, features, situation, landmark, seen how long ago, notes)
SIGHTINGS = [
    # Serial matches: should rank #1 for their scooter
    ("unsure", "black", ["sticker"], "locked", "Grainger", timedelta(hours=5),
     "Serial on the deck reads SEG-G30-48213"),
    ("xiaomi", "red", [], "lying", "Union", timedelta(hours=9),
     "frame says xm pro2 77310"),
    # Strong text + brand + color matches
    ("segway", "black", ["sticker", "scratches"], "locked", "Siebel", timedelta(hours=12),
     "Orange stickers on the stem and a scuffed fender"),
    ("xiaomi", "red", ["basket"], "locked", "Main Library", timedelta(days=1),
     "White stripe, the grips don't match"),
    ("gotrax", "blue", ["sticker", "bell"], "abandoned", "ISR", timedelta(hours=6),
     "Little duck sticker on the deck"),
    ("hiboy", "white", ["damaged", "lights"], "lying", "ECEB", timedelta(hours=3),
     "Rear fender is broken, green lights underneath"),
    # Partial matches: spotter unsure of something, or fewer details
    ("unsure", "red", ["basket"], "locked", "Krannert", timedelta(hours=30),
     None),
    ("unsure", "blue", [], "lying", "Union", timedelta(hours=8),
     "Has a rubber duck on it"),
    ("segway", "black", ["phone mount"], "locked", "Grainger", timedelta(hours=40),
     None),
    # Looks right but seen BEFORE it was stolen (gets a time penalty)
    ("segway", "black", ["sticker"], "locked", "Siebel", timedelta(days=4),
     "Illini sticker on the stem"),
    # Noise: shouldn't match anything well
    ("apollo", "green", ["basket"], "locked", "Main Library", timedelta(hours=15),
     "Clean scooter, looks brand new"),
    ("segway", "gray", [], "locked", "ECEB", timedelta(hours=18),
     None),
    ("other", "white", ["bell"], "abandoned", "Krannert", timedelta(hours=26),
     "Kids' scooter with a pink bell"),
]

LANDMARKS = {
    "Siebel": (40.1138, -88.2249), "Grainger": (40.1125, -88.2269), "ECEB": (40.115, -88.228),
    "Union": (40.1092, -88.2272), "ISR": (40.1071, -88.2205), "Main Library": (40.1047, -88.229),
    "Krannert": (40.108, -88.2224),
}


def make_user(db, email):
    # Login is "any password" for now, so the hash doesn't matter.
    return db.execute(
        "INSERT INTO users (email, password_hash, salt) VALUES (?, 'demo', '00')", (email,)
    ).lastrowid


def main():
    db = connect()
    deleted = db.execute("DELETE FROM users WHERE email LIKE 'demo-%@illinois.edu'").rowcount

    owners = [make_user(db, e) for e in OWNERS]
    spotter = make_user(db, SPOTTER)

    for owner, brand, model, color, serial, marks, stolen_ago in SCOOTERS:
        db.execute(
            "INSERT INTO scooters (owner_id, brand, model, color, serial_number, marks, status, stolen_at, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (owners[owner], brand, model, color, serial, marks,
             "stolen" if stolen_ago else "registered",
             sql_time(NOW - stolen_ago) if stolen_ago else None,
             sql_time(ago(days=30))),
        )

    for brand, color, features, situation, landmark, seen_ago, notes in SIGHTINGS:
        lat, lng = LANDMARKS[landmark]
        db.execute(
            "INSERT INTO sightings (reporter_id, lat, lng, landmark, seen_at, brand, color, features, situation, notes) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (spotter, lat, lng, landmark, iso_time(NOW - seen_ago), brand, color,
             json.dumps(sorted(features)), situation, notes),
        )

    db.commit()
    db.close()
    print(f"Removed {deleted} old demo accounts. Added {len(SCOOTERS)} scooters "
          f"({sum(1 for s in SCOOTERS if s[-1])} stolen) and {len(SIGHTINGS)} sightings.")
    print("Open the Matches page to see the ranking.")


if __name__ == "__main__":
    main()
