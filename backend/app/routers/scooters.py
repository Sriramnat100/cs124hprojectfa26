"""Feature 1: Register a scooter (the owner's side)."""

from fastapi import APIRouter, Depends

from ..auth import get_current_user

router = APIRouter(prefix="/scooters", tags=["scooters"])


def init_tables():
    # TODO: create the scooters table here, for example:
    # run_schema("CREATE TABLE IF NOT EXISTS scooters (...)")   (import run_schema from ..db)
    pass


@router.get("/mine")
def my_scooters(user=Depends(get_current_user)):
    # TODO: return the logged-in user's scooters from the database
    return []
