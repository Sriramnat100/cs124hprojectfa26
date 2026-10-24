"""Turn the log's text into structured fields: dates and location parts.

Locations look like "Bousfield Hall, Bike Rack, 1214 S First St, Champaign"
(sometimes with ";" instead of ","): place, sub-location, street, city.
"""

import re
from datetime import datetime

CITIES = {"champaign", "urbana", "savoy"}
DATE = re.compile(r"(\d{1,2})/(\d{1,2})/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?")
STREET = re.compile(r"^\d+[A-Za-z]?\s+\S")
GENERIC_PLACES = re.compile(r"^(off campus|on campus property|on campus|unknown)$", re.I)


def parse_date(text):
    """First date in the text as "YYYY-MM-DD", or None."""
    m = DATE.search(text or "")
    return f"{m[3]}-{int(m[1]):02d}-{int(m[2]):02d}" if m else None


def parse_occurred(text):
    """ "08/24/2026 17:00 - 08/25/2026 08:00" -> (start, end) as ISO strings (either may be None).
    The end can be a time only ("13:30 - 17:30"), which means the same day."""
    text = text or ""
    first = DATE.search(text)
    if not first:
        return None, None
    start = _iso(first)
    rest = text[first.end():]
    second = DATE.search(rest)
    if second:
        return start, _iso(second)
    only_time = re.search(r"-\s*(\d{1,2}):(\d{2})", rest)
    if only_time:
        end = datetime(int(first[3]), int(first[1]), int(first[2]), int(only_time[1]), int(only_time[2]))
        return start, end.isoformat(timespec="minutes")
    return start, None


def _iso(m):
    if m[4]:
        return datetime(int(m[3]), int(m[1]), int(m[2]), int(m[4]), int(m[5])).isoformat(timespec="minutes")
    return f"{m[3]}-{int(m[1]):02d}-{int(m[2]):02d}"


def parse_location(raw):
    """Split a location into its parts. Returns a dict with
    place_name, sub_location, street_address, city, on_campus (1, 0 or None)."""
    lowered = (raw or "").lower()
    on_campus = 0 if "off campus" in lowered else 1 if "on campus" in lowered or "on-campus" in lowered else None

    parts = [p.strip() for p in re.split(r"[;,]", raw or "") if p.strip()]
    street_i = next((i for i, p in enumerate(parts) if STREET.match(p)), None)

    street = parts[street_i] if street_i is not None else None
    city = None
    if street_i is not None and street_i + 1 < len(parts) and parts[street_i + 1].lower() in CITIES:
        city = parts[street_i + 1].title()

    before = parts[:street_i] if street_i is not None else parts
    place = re.sub(r"\s*\((on|off)[- ]campus\)\s*", "", before[0], flags=re.I) if before else None
    if place and GENERIC_PLACES.match(place):
        place = None
    sub = ", ".join(before[1:]) or None

    return {
        "place_name": _title(place),
        "sub_location": sub,
        "street_address": f"{street}, {city}" if street and city else street,
        "city": city,
        "on_campus": on_campus,
    }


def _title(name):
    """The log writes some buildings in ALL CAPS; make those readable."""
    if not name or not name.isupper():
        return name
    small = {"of", "and", "for", "the", "at", "in"}
    words = name.title().split()
    return " ".join(w.lower() if i and w.lower() in small else w for i, w in enumerate(words))


def address_key(street_address):
    """The geocode cache key: uppercase, single spaces, ", IL" added."""
    if not street_address:
        return None
    key = " ".join(street_address.upper().split())
    key = re.sub(r"\bAV\b", "AVE", key)
    return key if key.endswith(", IL") else f"{key}, IL"
