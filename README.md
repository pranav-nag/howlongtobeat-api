# howlongtobeat-api ![Version](https://img.shields.edge/badge/version-1.0.0-black?style=flat-square)

> A resilient, developer-first bridge to HowLongToBeat® data. Built for precision, engineered for uptime.

## Engineered for Uptime

Most scrapers break when the target site updates its security. This API uses a **browser-accurate handshake**—including persistent session cookies, randomized but consistent User-Agents, and matching platform headers—to bypass `403 Forbidden` blocks and ensure your dashboards stay live.

[ ★ STAR ON GITHUB ](https://github.com/pranav-nag/howlongtobeat-api)

## API in Action

Get comprehensive game intelligence with a single request.

```json
// GET /api/game/10270
{
  "title": "The Witcher 3: Wild Hunt",
  "times": {
    "mainStory": "51h 36m",
    "mainExtras": "103h",
    "completionist": "173h"
  },
  "rating": "93%",
  "steamId": 292030,
  "price": { "final_formatted": "₹ 359" },
  "valueScore": 17 // Playtime (mins) per Dollar
}
```

## Endpoints

### Discovery
`GET /api/search?q={query}`  
Locate game IDs and basic metadata. Supports `?force=true`.

### Intelligence
`GET /api/game/{id}`  
Comprehensive stats, community metrics, and playtimes. Supports `?force=true`.

## Unique Features

- **Value Score**: Automatically calculates "Playtime per Dollar" by integrating live Steam pricing.
- **In-Memory Caching**: Configurable TTL with request deduplication to prevent redundant HLTB fetches.
- **JSON-First Parsing**: Prioritizes HLTB's internal data structures over fragile DOM scraping.

## Tech Stack
**Node.js 18+** • **Express** • **TypeScript** • **Cheerio**

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `CACHE_TTL_SECONDS` | `86400` | Cache TTL (seconds) |
| `FORCE_COOLDOWN_MS` | `5000` | Refresh cooldown (ms) |

## Setup

```bash
git clone https://github.com/pranav-nag/howlongtobeat-api.git
npm install && cp .env.example .env
npm run build && npm start
```

## Resilience & Legal

This API mimics browser behavior to ensure uptime. If endpoints fail, the site's structure may have changed. Import the [Postman Collection](docs/postman_collection.json) for testing.

Distributed under the **MIT License**. This project is an independent, unofficial API and is not affiliated with or endorsed by HowLongToBeat.com or IGN Entertainment, Inc.
