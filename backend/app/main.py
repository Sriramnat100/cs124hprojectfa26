from fastapi import FastAPI

from . import auth
from .routers import matches, points, scooters, shop, sightings

app = FastAPI(title="ScooterTrace")

# Each module creates its own tables and registers its own endpoints,
# so the two features never need to edit this file.
for module in (auth, scooters, sightings, matches, points, shop):
    module.init_tables()
    app.include_router(module.router)


@app.get("/health")
def health():
    return {"ok": True}
