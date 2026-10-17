"""Feature 2: Submit a sighting (the spotter's side)."""

from fastapi import APIRouter, Depends

from ..auth import get_current_user

router = APIRouter(prefix="/sightings", tags=["sightings"])


def init_tables():
    # TODO: create the sightings table here, for example:
    # run_schema("CREATE TABLE IF NOT EXISTS sightings (...)")   (import run_schema from ..db)
    pass


@router.get("/mine")
def my_sightings(user=Depends(get_current_user)):
    # TODO: return the sightings the logged-in user submitted
    return []
