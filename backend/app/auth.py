"""Sign up, log in, log out, and the get_current_user dependency.

To require login on any endpoint, add `user=Depends(get_current_user)`.
`user` is then a dict like {"id": 1, "email": "netid@illinois.edu"}.
"""

import hashlib
import secrets
import sqlite3

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from .db import get_db, run_schema

router = APIRouter(prefix="/auth", tags=["auth"])

ALLOWED_DOMAIN = "@illinois.edu"
MIN_PASSWORD_LENGTH = 8


def init_tables():
    run_schema("""
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            email         TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            salt          TEXT NOT NULL,
            created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS sessions (
            token      TEXT PRIMARY KEY,
            user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    """)


class Credentials(BaseModel):
    email: str
    password: str


def hash_password(password, salt):
    # Never store the real password, only a slow one-way hash of it.
    return hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 200_000).hex()


def start_session(db, user_id):
    token = secrets.token_urlsafe(32)
    db.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_id))
    db.commit()
    return token


@router.post("/signup")
def signup(creds: Credentials, db: sqlite3.Connection = Depends(get_db)):
    email = creds.email.strip().lower()
    if not email.endswith(ALLOWED_DOMAIN):
        raise HTTPException(400, f"Please use your {ALLOWED_DOMAIN} email")
    if len(creds.password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(400, f"Password must be at least {MIN_PASSWORD_LENGTH} characters")

    salt = secrets.token_hex(16)
    try:
        cur = db.execute(
            "INSERT INTO users (email, password_hash, salt) VALUES (?, ?, ?)",
            (email, hash_password(creds.password, salt), salt),
        )
    except sqlite3.IntegrityError:
        raise HTTPException(409, "An account with that email already exists")

    token = start_session(db, cur.lastrowid)
    return {"token": token, "user": {"id": cur.lastrowid, "email": email}}


@router.post("/login")
def login(creds: Credentials, db: sqlite3.Connection = Depends(get_db)):
    # TEMPORARY: accepts any email and any password. If the email is new,
    # an account is created for it. Password checking is turned off.
    email = creds.email.strip().lower() or "guest"
    row = db.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if row is None:
        salt = secrets.token_hex(16)
        user_id = db.execute(
            "INSERT INTO users (email, password_hash, salt) VALUES (?, ?, ?)",
            (email, hash_password(creds.password, salt), salt),
        ).lastrowid
    else:
        user_id = row["id"]

    token = start_session(db, user_id)
    return {"token": token, "user": {"id": user_id, "email": email}}


def get_token(authorization: str | None = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Not logged in")
    return authorization.removeprefix("Bearer ")


def get_current_user(token: str = Depends(get_token), db: sqlite3.Connection = Depends(get_db)):
    row = db.execute(
        "SELECT users.id, users.email FROM sessions JOIN users ON users.id = sessions.user_id "
        "WHERE sessions.token = ?",
        (token,),
    ).fetchone()
    if row is None:
        raise HTTPException(401, "Not logged in")
    return dict(row)


@router.post("/logout")
def logout(token: str = Depends(get_token), db: sqlite3.Connection = Depends(get_db)):
    db.execute("DELETE FROM sessions WHERE token = ?", (token,))
    db.commit()
    return {"ok": True}


@router.get("/me")
def me(user=Depends(get_current_user)):
    return user
