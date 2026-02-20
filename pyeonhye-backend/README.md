# Pyeonhye Backend (Node + TypeScript)

Backend API for weekly convenience-store promotion aggregation.
Target brands: CU, GS25, SEVEN, EMART24.

## Quick Start

```bash
cp .env.example .env
npm install
npm run build
npm run migrate
npm run dev
```

Default server: `http://localhost:3000`

## API

- `GET /health`
- `GET /promos` (frontend-friendly format)
- `GET /v1/brands`
- `GET /v1/meta/refresh`
- `GET /v1/offers?brand=&promoType=&q=&page=&limit=&sort=latest`
- `GET /v1/offers/:id`
- `POST /v1/admin/scrape` (Bearer required)

Examples:

```bash
curl "http://localhost:3000/promos"
curl "http://localhost:3000/v1/offers?brand=CU&promoType=ONE_PLUS_ONE&page=1&limit=20&sort=popular"
curl -X POST "http://localhost:3000/v1/admin/scrape" -H "Authorization: Bearer change-me"
```

Supported `sort`:
- `latest`
- `oldest`
- `popular`
- `price_asc`
- `price_desc`

`/promos` item fields include:
- `price`
- `originalPrice`
- `imageUrl`

## CORS

- Env key: `CORS_ORIGIN`
- Default: `*`
- Multiple origins: comma-separated
  - Example: `CORS_ORIGIN=http://localhost:8081,https://my-app.example.com`

## `/promos` Cache

- Env key: `PROMOS_CACHE_TTL_MS`
- Default: `30000` (30s)
- Behavior: in-memory response cache by `(brand, promoType, q, sort)` key
- Invalidation: cache clears after successful `POST /v1/admin/scrape`
- Metrics: `GET /v1/meta/refresh` returns `promosCache` stats (`hitCount`, `missCount`, `hitRatePercent`, `entries`, ...)

## Weekly Scheduler

- Cron: Monday 06:00 (Asia/Seoul)
- Retry chain on failure: +10 min, +30 min
- Keeps previous DB data if all retries fail

## DB Migration

```bash
npm run migrate
npm run migrate:rollback
```

Creates `offers` table and indexes.

## Docker

```bash
docker compose up --build
```

## Crawl QA (Playwright CLI)

```bash
npm run crawl:check
npm run ux:capture
```

Details: `docs/scrape-playwright-ops.md`

## Performance (Portfolio)

```bash
npm run perf:collect
```

External HTTPS benchmark example:

```bash
PERF_BASE_URL=https://165.232.168.243.nip.io npm run perf:collect
```

See:
- `docs/performance-bmad-playbook.md`
- `docs/performance-storyline.md`
- `docs/performance-metrics.md`

## Deploy

See: `deploy/DO_DROPLET_SETUP.md`

## Notes

- Scraping parser uses heuristic selectors + fallback sample data.
- If one brand fails, only that brand falls back while others keep real scraped data.
