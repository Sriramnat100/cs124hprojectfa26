"""Theft Risk Map data pipeline: crime log -> scooter/bike thefts -> map points.

    source (CSV / saved page)  ->  parse  ->  classify  ->  store  ->  geocode (cached)
    sources.py                     parse.py   classify.py   store.py   geocode.py

pipeline.py runs the steps; hotspots.py groups mapped thefts for the page.
To use a different data source later, add a class to sources.py with a
`rows()` method that yields RawIncident; nothing else has to change.

Run it from backend/ (venv active):

    python -m app.theft_data --sample            # the bundled sample file
    python -m app.theft_data --csv crimes.csv
    python -m app.theft_data --html saved-page.html
"""
