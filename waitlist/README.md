# BricoWerx waitlist service

One static Go binary. Stores signups in an append-only JSON Lines file, serves the
landing page, and exports CSV. No database server, no third party.

## Run locally

    cd waitlist
    go build -o waitlist .
    ADMIN_TOKEN=change-me STATIC_DIR=.. ./waitlist
    # open http://localhost:8080

## Environment

| Variable        | Default          | Meaning                                                        |
|-----------------|------------------|----------------------------------------------------------------|
| ADDR            | :8080            | Listen address                                                 |
| DB_PATH         | waitlist.jsonl   | Data file (one JSON object per signup). Back this file up.     |
| ADMIN_TOKEN     | (empty)          | Required for /admin/export.csv. Empty disables admin routes.   |
| STATIC_DIR      | (empty)          | Serve the landing page from this folder (same origin, no CORS) |
| ALLOWED_ORIGIN  | (empty)          | Set only if the page is hosted elsewhere, e.g. https://bricowerx.dev |
| IP_SALT         | bwx              | Salt for the hashed IP stored with each signup                 |

## Endpoints

    POST /api/waitlist          {"email":"you@co.com","source":"launch","company":""}
                                -> {"ok":true,"already":false,"count":42}
    GET  /api/waitlist/count    -> {"count":42}
    GET  /admin/export.csv      Authorization: Bearer $ADMIN_TOKEN
    GET  /healthz

Protection: per-IP rate limit (5 per minute), 4 KB body cap, honeypot field
(`company`), email validation, dedupe by lowercase email, hashed IP only.

## Export

    curl -H "Authorization: Bearer $ADMIN_TOKEN" https://your-host/admin/export.csv -o waitlist.csv

## Docker

    docker build -f waitlist/Dockerfile -t bwx-site .
    docker run -p 8080:8080 -e ADMIN_TOKEN=change-me -v bwx-data:/data bwx-site

## Page wiring

`index.html` reads `data-endpoint` on the waitlist form. Leave it as `/api/waitlist`
when the binary serves the page. Point it at your API host if the page lives elsewhere,
and set ALLOWED_ORIGIN on the service to the page's origin.

## Moving to SQLite or Postgres later

Implement the four-method `Store` interface in main.go (Add, Count, All, Close) and
replace `openFileStore` in `main()`. Everything else stays the same.
