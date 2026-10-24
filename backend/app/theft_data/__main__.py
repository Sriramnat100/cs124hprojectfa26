"""Command line: python -m app.theft_data --sample | --csv FILE | --html FILE [--retry-failed]"""

import argparse
import sys

from ..db import connect
from .pipeline import ingest
from .sources import SAMPLE_FILE, CsvSource, SavedPageSource
from .store import init_tables


def main():
    parser = argparse.ArgumentParser(description="Import scooter/bike thefts from a crime log for the Theft Risk Map.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--sample", action="store_true", help="import the bundled sample of the UIUC log")
    group.add_argument("--csv", metavar="FILE", help="a CSV with the crime log's columns")
    group.add_argument("--html", metavar="FILE", help="the crime log page saved from a browser")
    parser.add_argument("--retry-failed", action="store_true", help="look up again: addresses not found last time, or only matched to a street")
    args = parser.parse_args()

    if args.html:
        source, name = SavedPageSource(args.html), args.html
    else:
        path = SAMPLE_FILE if args.sample else args.csv
        source, name = CsvSource(path), str(path)

    init_tables()
    db = connect()
    try:
        print(f"Importing {name} …")
        result = ingest(db, source, name, retry_failed=args.retry_failed)
    except (OSError, ValueError) as err:
        sys.exit(f"Import failed: {err}")
    finally:
        db.close()

    print(f"Read {result['rows_read']} rows; kept {result['rows_kept']} scooter/bike thefts ({result['rows_new']} new).")
    print(f"{result['addresses']} addresses: {result['ok']} on the map, {result['not_found']} not found, "
          f"{result['error']} failed. {result['geocoded']} looked up now, "
          f"{result['addresses'] - result['geocoded']} from the cache.")
    if result["error"]:
        print("Some lookups failed (network?). Run the same command again to retry them.")
    if result["not_found"]:
        print("To retry addresses that weren't found, add --retry-failed.")
    if result["street_only"]:
        print(f"{result['street_only']} addresses only matched a street (less precise). --retry-failed tries them again.")


if __name__ == "__main__":
    main()
