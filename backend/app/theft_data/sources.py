"""Where crime log rows come from. Every source yields RawIncident, so the rest
of the pipeline doesn't care whether the data came from a CSV, a saved web
page, or (later) an API."""

import csv
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path

UIUC_SOURCE = "uiuc_police_daily_log"
SAMPLE_FILE = Path(__file__).resolve().parent / "sample_uiuc_crime_log.csv"


@dataclass
class RawIncident:
    """One row exactly as the crime log shows it (all text, nothing parsed yet)."""
    case_number: str
    reported: str
    occurred: str
    location: str
    description: str
    disposition: str


# Column headers as the UIUC log writes them, plus a few easy variants.
COLUMNS = {
    "case_number": ("number", "case number", "case #", "case"),
    "reported": ("reported date/time", "reported", "date reported"),
    "occurred": ("occurred from date/time", "occurred", "date occurred"),
    "location": ("location",),
    "description": ("description", "offense", "incident"),
    "disposition": ("disposition", "status"),
}


def map_header(header):
    """Find which column index holds each field. Raises if a needed column is missing."""
    names = [h.strip().lower() for h in header]
    found = {}
    for field, aliases in COLUMNS.items():
        for i, name in enumerate(names):
            if name in aliases:
                found[field] = i
                break
    missing = [f for f in ("case_number", "reported", "location", "description") if f not in found]
    if missing:
        raise ValueError(f"Couldn't find columns {missing} in header {header}")
    return found


def to_incidents(header, rows):
    cols = map_header(header)
    for row in rows:
        get = lambda field: row[cols[field]].strip() if field in cols and cols[field] < len(row) else ""
        if get("case_number") and get("location"):  # skip blank/section rows
            yield RawIncident(*(get(f) for f in COLUMNS))


class CsvSource:
    """A CSV with the crime log's columns (e.g. copied from the page into a spreadsheet)."""

    def __init__(self, path, source=UIUC_SOURCE):
        self.path, self.source = Path(path), source

    def rows(self):
        with open(self.path, newline="", encoding="utf-8-sig") as f:
            reader = csv.reader(f)
            yield from to_incidents(next(reader), reader)


class _TableParser(HTMLParser):
    """Collects every <table> as a list of rows of cell text."""

    def __init__(self):
        super().__init__()
        self.tables, self.row, self.cell = [], None, None

    def handle_starttag(self, tag, attrs):
        if tag == "table":
            self.tables.append([])
        elif tag == "tr" and self.tables:
            self.row = []
        elif tag in ("td", "th") and self.row is not None:
            self.cell = []
        elif tag == "br" and self.cell is not None:
            self.cell.append(" ")

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self.cell is not None:
            self.row.append(" ".join("".join(self.cell).split()))
            self.cell = None
        elif tag == "tr" and self.row is not None:
            if self.row:
                self.tables[-1].append(self.row)
            self.row = None

    def handle_data(self, data):
        if self.cell is not None:
            self.cell.append(data)


class SavedPageSource:
    """The crime log page saved from a browser (File > Save Page As > HTML).
    Uses the first table whose header has the log's columns."""

    def __init__(self, path, source=UIUC_SOURCE):
        self.path, self.source = Path(path), source

    def rows(self):
        parser = _TableParser()
        parser.feed(self.path.read_text(encoding="utf-8", errors="replace"))
        for table in parser.tables:
            if not table:
                continue
            try:
                map_header(table[0])
            except ValueError:
                continue
            yield from to_incidents(table[0], table[1:])
            return
        raise ValueError(f"No crime log table found in {self.path}")
