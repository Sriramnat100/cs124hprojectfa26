"""Points shop: spend points on avatar backgrounds and frames.

Buying an item keeps it forever. You can have one background and one frame on
at a time, and everyone sees them next to your name on the leaderboard.
Spending points never changes your rank: the competition counts what you
earned, not what you have left (see routers/points.py).
"""

import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..db import get_db, run_schema
from .points import balance

router = APIRouter(prefix="/shop", tags=["shop"])

KINDS = ("background", "frame")

# What each item looks like lives in frontend/src/cosmetics.js; keep the ids in sync.
CATALOG = {
    "bg-aurora":  {"kind": "background", "name": "Aurora",       "price": 30},
    "bg-sunset":  {"kind": "background", "name": "Sunset",       "price": 30},
    "bg-ocean":   {"kind": "background", "name": "Deep Ocean",   "price": 50},
    "bg-illini":  {"kind": "background", "name": "Illini",       "price": 60},
    "bg-galaxy":  {"kind": "background", "name": "Galaxy",       "price": 80},
    "bg-gold":    {"kind": "background", "name": "Solid Gold",   "price": 120},
    "fr-silver":  {"kind": "frame",      "name": "Silver Ring",  "price": 40},
    "fr-gold":    {"kind": "frame",      "name": "Gold Ring",    "price": 70},
    "fr-neon":    {"kind": "frame",      "name": "Neon Glow",    "price": 90},
    "fr-rainbow": {"kind": "frame",      "name": "Rainbow",      "price": 120},
    "fr-flame":   {"kind": "frame",      "name": "Flame",        "price": 150},
}


def init_tables():
    run_schema("""
        CREATE TABLE IF NOT EXISTS purchases (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            item_id    TEXT NOT NULL,
            price      INTEGER NOT NULL,  -- what was paid, so later price changes don't rewrite history
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (user_id, item_id)
        );
        CREATE TABLE IF NOT EXISTS equipped (
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            kind    TEXT NOT NULL CHECK (kind IN ('background', 'frame')),
            item_id TEXT NOT NULL,
            PRIMARY KEY (user_id, kind)
        );
    """)


def get_item(item_id):
    item = CATALOG.get(item_id)
    if item is None:
        raise HTTPException(404, "That item isn't in the shop")
    return item


def shop_state(db, user_id):
    owned = {r["item_id"] for r in db.execute("SELECT item_id FROM purchases WHERE user_id = ?", (user_id,))}
    on = {r["item_id"] for r in db.execute("SELECT item_id FROM equipped WHERE user_id = ?", (user_id,))}
    return {
        "balance": balance(db, user_id),
        "items": [
            {"id": item_id, **item, "owned": item_id in owned, "equipped": item_id in on}
            for item_id, item in CATALOG.items()
        ],
    }


@router.get("")
def shop(user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    return shop_state(db, user["id"])


@router.post("/{item_id}/buy")
def buy(item_id: str, user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    item = get_item(item_id)
    db.execute("BEGIN IMMEDIATE")  # check the balance and pay in one step, so a double click can't overspend
    try:
        if db.execute("SELECT 1 FROM purchases WHERE user_id = ? AND item_id = ?", (user["id"], item_id)).fetchone():
            raise HTTPException(409, "You already own this")
        if balance(db, user["id"]) < item["price"]:
            raise HTTPException(400, "Not enough points yet")
        db.execute(
            "INSERT INTO purchases (user_id, item_id, price) VALUES (?, ?, ?)", (user["id"], item_id, item["price"])
        )
        # Put it on right away: that's almost always why you bought it.
        db.execute(
            "INSERT OR REPLACE INTO equipped (user_id, kind, item_id) VALUES (?, ?, ?)",
            (user["id"], item["kind"], item_id),
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    return shop_state(db, user["id"])


@router.post("/{item_id}/equip")
def equip(item_id: str, user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    item = get_item(item_id)
    if not db.execute("SELECT 1 FROM purchases WHERE user_id = ? AND item_id = ?", (user["id"], item_id)).fetchone():
        raise HTTPException(403, "Buy this first")
    db.execute(
        "INSERT OR REPLACE INTO equipped (user_id, kind, item_id) VALUES (?, ?, ?)", (user["id"], item["kind"], item_id)
    )
    db.commit()
    return shop_state(db, user["id"])


@router.post("/unequip/{kind}")
def unequip(kind: str, user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    if kind not in KINDS:
        raise HTTPException(404, "Unknown item type")
    db.execute("DELETE FROM equipped WHERE user_id = ? AND kind = ?", (user["id"], kind))
    db.commit()
    return shop_state(db, user["id"])
