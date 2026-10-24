"""Group mapped thefts into hotspots for the map.

Simple grid binning: snap every theft to a cell about 250 m on a side and
count per cell. It's predictable and needs no libraries. Each hotspot sits at
the average position of its thefts, not the cell corner.
"""

from collections import Counter

CELL_LAT = 0.0022   # ~245 m north-south
CELL_LNG = 0.0029   # ~245 m east-west at Champaign's latitude


def place_names(incidents):
    """Address -> building name, from any row that names it. The log sometimes writes
    "Bousfield Hall, Bike Rack, 1214 S First St" and sometimes just "On Campus Property, ...,
    1214 S First St", so this lets both count as Bousfield Hall."""
    names = {}
    for inc in incidents:
        if inc["street_address"] and inc["place_name"]:
            names.setdefault(inc["street_address"], inc["place_name"])
    return names


def location_label(incident, names):
    address = incident["street_address"]
    return names.get(address) or incident["place_name"] or address or incident["location_raw"]


def hotspots(incidents):
    names = place_names(incidents)
    cells = {}
    for inc in incidents:
        if inc["lat"] is None:
            continue
        cell = (int(inc["lat"] // CELL_LAT), int(inc["lng"] // CELL_LNG))
        cells.setdefault(cell, []).append(inc)

    result = []
    for (row, col), group in cells.items():
        top = Counter(location_label(i, names) for i in group).most_common(3)
        result.append({
            "id": f"{row}:{col}",
            "lat": sum(i["lat"] for i in group) / len(group),
            "lng": sum(i["lng"] for i in group) / len(group),
            "count": len(group),
            "latest_date": max(i["reported_date"] for i in group),
            "top_locations": [{"name": name, "count": n} for name, n in top],
            "categories": dict(Counter(i["category"] for i in group)),
        })
    result.sort(key=lambda h: h["latest_date"], reverse=True)  # ties: most recent first
    result.sort(key=lambda h: h["count"], reverse=True)
    return result
