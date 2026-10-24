"""Decide which crime log rows are scooter/bike thefts, using keywords.

The UIUC log never says "scooter" in the Description: it uses Clery categories
like "Larceny" or "Motor Vehicle Theft". The vehicle shows up in the Location
instead ("..., Bike Rack, ..."). So a row counts when:

  1. the description is a theft (larceny / theft / burglary / robbery), and
  2. the description or location mentions a scooter, moped, bike or bike rack.

Then we guess the kind:
  - "scooter":        says scooter / e-scooter / moped outright
  - "likely_scooter": "Motor Vehicle Theft" at a bike rack, i.e. something
                      motorized parked with bikes (e-scooter, e-bike, moped)
  - "bike":           any other theft at a bike rack (probably a bicycle)
"""

import re

THEFT = re.compile(r"\b(larceny|theft|burglary|robbery)\b", re.I)
SCOOTER = re.compile(r"\b(e-?scooters?|scooters?|mopeds?)\b", re.I)
BIKE = re.compile(r"\b(bikes?|bicycles?|cycles?)\b", re.I)
MOTOR_VEHICLE = re.compile(r"motor vehicle theft", re.I)

CATEGORY_LABELS = {
    "scooter": "Scooter / moped",
    "likely_scooter": "Likely e-scooter or e-bike",
    "bike": "Likely bike",
}


def classify(description, location):
    """Return (category, reason) for a scooter/bike theft, or None to skip the row."""
    description, location = description or "", location or ""
    theft = THEFT.search(description)
    if not theft:
        return None

    text = f"{description} {location}"
    if m := SCOOTER.search(text):
        return "scooter", f'mentions "{m[0].lower()}"'
    if b := BIKE.search(text):
        if MOTOR_VEHICLE.search(description):
            return "likely_scooter", f'motor vehicle theft + "{b[0].lower()}"'
        return "bike", f'{theft[0].lower()} + "{b[0].lower()}"'
    return None
