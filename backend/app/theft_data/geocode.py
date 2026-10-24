"""Address -> lat/lng, cached in the geocode_cache table so each address is
looked up only once, ever (failures are cached too, so we don't retry them
unless asked).

The default provider is OpenStreetMap's free Nominatim service. Its usage
policy asks for at most 1 request per second, an identifying User-Agent, and
caching results, which is exactly what this does. Results are limited to a box
around Champaign-Urbana so a "First St" doesn't land in another state.
"""

import json
import ssl
import time
import urllib.parse
import urllib.request

import certifi

# python.org's macOS Python has no CA certificates set up by default, so use certifi's bundle.
SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "ScooterTrace/0.1 (CS 124 Honors student project, UIUC)"
# west, north, east, south around Champaign-Urbana
CU_VIEWBOX = "-88.32,40.15,-88.15,40.06"


class NominatimProvider:
    name = "nominatim"

    def __init__(self, min_interval=1.1):
        self.min_interval, self.last_call = min_interval, 0.0

    def lookup(self, query):
        """Return (lat, lng, display_name, precision) or None. precision is "exact" or "street"."""
        wait = self.min_interval - (time.monotonic() - self.last_call)
        if wait > 0:
            time.sleep(wait)
        params = urllib.parse.urlencode({
            "q": query, "format": "jsonv2", "limit": 1, "countrycodes": "us",
            "viewbox": CU_VIEWBOX, "bounded": 1,
        })
        request = urllib.request.Request(f"{NOMINATIM_URL}?{params}", headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(request, timeout=15, context=SSL_CONTEXT) as response:
                results = json.load(response)
        finally:
            self.last_call = time.monotonic()
        if not results:
            return None
        top = results[0]
        # A "highway" result means only the street matched, not the building or house number.
        precision = "street" if top.get("category") == "highway" else "exact"
        return float(top["lat"]), float(top["lon"]), top.get("display_name"), precision


class Geocoder:
    def __init__(self, db, provider=None):
        self.db, self.provider = db, provider or NominatimProvider()
        self.looked_up = 0  # how many addresses we tried to look up (cache misses), success or not

    @staticmethod
    def needs_lookup(row, retry_failed):
        if row["status"] == "error":
            return True  # network trouble last time
        if retry_failed:
            return row["status"] == "not_found" or row["precision"] == "street"
        return False

    def cached(self, key):
        return self.db.execute("SELECT * FROM geocode_cache WHERE key = ?", (key,)).fetchone()

    def geocode(self, key, queries, retry_failed=False):
        """Look up `key`, trying each query in order (e.g. street address, then building name).
        Uses the cache when possible. Network errors are always retried on the next run;
        "not found" is only retried when retry_failed is True. Returns the cache row."""
        row = self.cached(key)
        if row and not self.needs_lookup(row, retry_failed):
            return row

        self.looked_up += 1
        status, lat, lng, display, precision, used = "not_found", None, None, None, None, queries[0]
        for query in queries:
            try:
                result = self.provider.lookup(query)
            except OSError as err:  # network problem: cache as an error so a later run can retry
                status, display, used = "error", str(err)[:200], query
                break
            if result and (status != "ok" or result[3] == "exact"):
                (lat, lng, display, precision), status, used = result, "ok", query
                if precision == "exact":
                    break  # otherwise keep the street match but try the next query (e.g. the building name)

        self.db.execute(
            "INSERT INTO geocode_cache (key, query, lat, lng, provider, status, precision, display_name, geocoded_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP) "
            "ON CONFLICT(key) DO UPDATE SET query = excluded.query, lat = excluded.lat, lng = excluded.lng, "
            "provider = excluded.provider, status = excluded.status, precision = excluded.precision, "
            "display_name = excluded.display_name, geocoded_at = excluded.geocoded_at",
            (key, used, lat, lng, self.provider.name, status, precision, display),
        )
        self.db.commit()
        return self.cached(key)
