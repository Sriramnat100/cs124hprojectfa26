# sample_uiuc_crime_log.csv

These rows are copied from the public **UIUC Police Department Daily Crime Log**
(https://police.illinois.edu/info/daily-crime-log/), reported 08/24/2026–10/04/2026,
and kept exactly as written. It's a sample for development, not the whole log.

- 29 rows are thefts at bike racks, which the filter should keep.
- 10 rows are other crimes, or thefts not involving a bike/scooter, which the filter should skip.

The log only covers the last 60 days, so importing it regularly (CSV or saved page)
is how the "semester" and "all time" ranges build up history.
