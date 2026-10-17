"""Feature 3 (draft): score how likely a sighting is a given stolen scooter.

Deliberately simple and free (no APIs, no ML libraries):

1. Serial number: if the stolen scooter's serial appears in the sighting's
   notes (ignoring dashes, spaces and case), it's a "serial" match and always
   ranks first.
2. Otherwise a 0-99 score from three parts:
   - brand:  +25 same, -20 different, 0 if the spotter wasn't sure
   - color:  +25 same, -20 different, 0 if the spotter wasn't sure
   - text:   up to +50 for how similar the descriptions are. Both sides are
             turned into words (owner's marks/model vs. spotter's features/notes),
             synonyms are merged ("decal" -> "sticker"), and we compare them
             with TF-IDF cosine similarity, so rare words like "duck" count
             more than common ones like "scooter". That's averaged with the
             share of the owner's details the spotter mentioned.
   - time:   -15 if the sighting happened before the scooter was reported stolen
"""

import math
import re
from collections import Counter

BRAND_POINTS = 25
COLOR_POINTS = 25
TEXT_POINTS = 50
MISMATCH_PENALTY = 20
BEFORE_STOLEN_PENALTY = 15

TIERS = [(60, "strong"), (30, "possible"), (0, "weak")]

STOPWORDS = set("""
a an and are as at be by for from has have in is it its of on or that the this to was
were with near there their very just looks look like one some my your i we our
""".split())

# Words that mean the same thing for our purposes all become one word.
SYNONYMS = {
    "decal": "sticker", "label": "sticker", "logo": "sticker",
    "scratch": "scratch", "scuff": "scratch", "scrape": "scratch",
    "dent": "damage", "bent": "damage", "broken": "damage", "crack": "damage", "damaged": "damage",
    "grey": "gray", "silver": "gray",
    "crate": "basket", "bag": "basket",
    "holder": "mount", "phone": "mount",
    "headlight": "light", "led": "light", "lights": "light",
    "handlebar": "handle", "grip": "handle", "handle": "handle",
    "floorboard": "deck", "board": "deck", "platform": "deck",
    "illinois": "illini", "uiuc": "illini",
    "fender": "fender", "mudguard": "fender",
}


def stem(word):
    """Very rough stemming so "stickers"/"sticker", "scratched"/"scratches" line up."""
    for suffix in ("ing", "ed", "es", "s"):
        if word.endswith(suffix) and len(word) - len(suffix) >= 3:
            word = word[: -len(suffix)]
            break
    return word


def words(text):
    out = []
    for raw in re.findall(r"[a-z]+", (text or "").lower()):
        if raw in STOPWORDS or len(raw) < 3:
            continue
        word = SYNONYMS.get(raw) or SYNONYMS.get(stem(raw)) or stem(raw)
        out.append(word)
    return out


def normalize_serial(text):
    return re.sub(r"[^A-Z0-9]", "", (text or "").upper())


def scooter_text(s):
    return " ".join(filter(None, [s.get("model"), s.get("marks")]))


def sighting_text(s):
    return " ".join(filter(None, [" ".join(s.get("features") or []), s.get("notes")]))


class TextIndex:
    """TF-IDF over every description we're comparing, so rare words weigh more."""

    def __init__(self, texts):
        docs = [set(words(t)) for t in texts]
        n = len(docs) or 1
        df = Counter(w for d in docs for w in d)
        self.idf = {w: math.log((1 + n) / (1 + c)) + 1 for w, c in df.items()}

    def vector(self, text):
        counts = Counter(words(text))
        return {w: c * self.idf.get(w, 1.0) for w, c in counts.items()}

    @staticmethod
    def cosine(a, b):
        dot = sum(a[w] * b[w] for w in a.keys() & b.keys())
        if not dot:
            return 0.0
        return dot / (math.sqrt(sum(v * v for v in a.values())) * math.sqrt(sum(v * v for v in b.values())))


def compare(scooter, sighting, index):
    """Return {score, tier, reasons, shared_words} for one stolen scooter vs one sighting."""
    reasons = []

    serial = normalize_serial(scooter.get("serial_number"))
    if len(serial) >= 5 and serial in normalize_serial(sighting.get("notes")):
        return {"score": 100, "tier": "serial", "reasons": ["Serial number matches"], "shared_words": []}

    score = 0
    for field, points, label in (("brand", BRAND_POINTS, "brand"), ("color", COLOR_POINTS, "color")):
        seen = sighting.get(field)
        if not seen or seen == "unsure":
            reasons.append(f"Spotter wasn't sure of the {label}")
        elif seen == scooter[field]:
            score += points
            reasons.append(f"Same {label}")
        else:
            score -= MISMATCH_PENALTY
            reasons.append(f"Different {label} ({seen})")

    a, b = index.vector(scooter_text(scooter)), index.vector(sighting_text(sighting))
    shared = sorted(a.keys() & b.keys(), key=lambda w: -index.idf.get(w, 0))
    # Cosine alone favors very short sightings ("phone mount" vs. a long owner description),
    # so blend it with how many of the owner's details the spotter actually mentioned.
    coverage = len(shared) / len(a) if a else 0
    similarity = (index.cosine(a, b) + coverage) / 2
    if similarity > 0:
        score += round(similarity * TEXT_POINTS)
        reasons.append(f"Description {round(similarity * 100)}% similar")

    stolen_at, seen_at = scooter.get("stolen_at"), sighting.get("seen_at")
    if stolen_at and seen_at and seen_at[:19].replace("T", " ") < stolen_at[:19]:
        score -= BEFORE_STOLEN_PENALTY
        reasons.append("Seen before it was reported stolen")

    score = max(0, min(99, score))
    tier = next(name for cutoff, name in TIERS if score >= cutoff)
    return {"score": score, "tier": tier, "reasons": reasons, "shared_words": shared}


def rank(scooters, sightings):
    """For each stolen scooter, every sighting ranked best first (serial matches on top)."""
    index = TextIndex([scooter_text(s) for s in scooters] + [sighting_text(s) for s in sightings])
    results = []
    for scooter in scooters:
        matches = [{"sighting": s, **compare(scooter, s, index)} for s in sightings]
        matches.sort(key=lambda m: m["sighting"]["seen_at"] or "", reverse=True)  # ties: newest first
        matches.sort(key=lambda m: (m["tier"] != "serial", -m["score"]))
        results.append({"scooter": scooter, "matches": matches})
    # Scooters with the most promising sighting first.
    best = lambda r: (r["matches"][0]["score"] if r["matches"] else -1)
    results.sort(key=best, reverse=True)
    return results
