import sqlite3
from pathlib import Path

# The whole database is this one file. It is created automatically and is
# not committed to git, so each person has their own local copy.
DB_PATH = Path(__file__).resolve().parent.parent / "scootertrace.db"


def connect():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row  # lets you use row["email"] instead of row[1]
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def get_db():
    """FastAPI dependency: gives each request its own connection."""
    conn = connect()
    try:
        yield conn
    finally:
        conn.close()


def run_schema(sql):
    """Run CREATE TABLE statements once at startup."""
    conn = connect()
    try:
        conn.executescript(sql)
        conn.commit()
    finally:
        conn.close()
