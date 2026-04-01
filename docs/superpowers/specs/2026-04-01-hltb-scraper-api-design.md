# HowLongToBeat Scraper API Design

## Overview
A standalone, open-source REST API to scrape game completion times, platforms, and metadata from HowLongToBeat.com. Designed to be universally deployable (Docker, VPS, Serverless) and consumed by various clients, including browser extensions.

## Architecture & Tech Stack
- **Language/Runtime:** TypeScript running on Node.js (v18+)
- **Framework:** Express.js
- **HTTP Client:** Node.js native `fetch` (No Axios dependency)
- **HTML Parser:** `cheerio`
- **Caching:** Dual-layer strategy
  - **In-Memory Cache:** Protects HLTB from aggressive polling when self-hosted
  - **HTTP Headers:** `Cache-Control` headers for edge/CDN caching (Vercel, Cloudflare)

## Project Structure & Isolation
To address the brittleness of web scraping, the scraping logic will be strictly isolated from the API routing layer.

```text
src/
├── api/
│   ├── routes.ts       # Express route definitions
│   └── server.ts       # Express setup and middleware
├── scraper/
│   ├── hltb-client.ts  # Handles fetch requests to HLTB (User-Agents, timeouts)
│   ├── parsers/
│   │   ├── search.ts   # Cheerio logic to extract search results
│   │   └── detail.ts   # Cheerio logic to extract game details
│   └── index.ts        # Main scraper entry point exposing simple async functions
├── cache/
│   └── memory.ts       # Simple in-memory cache implementation
└── index.ts            # Application entry point
```

If HowLongToBeat changes their HTML structure, only the files in `src/scraper/parsers/` will need to be updated. The API endpoints and caching logic will remain untouched.

## Core Endpoints

### 1. `GET /api/search?q={game_title}`
Returns a list of basic game information matching the query.
- **Request:** Query parameter `q` (e.g., "Elden Ring")
- **Response (Example):**
  ```json
  [
    {
      "id": "68151",
      "title": "Elden Ring",
      "imageUrl": "https://howlongtobeat.com/games/...",
      "releaseYear": 2022
    }
  ]
  ```

### 2. `GET /api/game/{game_id}`
Returns the comprehensive details for a specific game.
- **Request:** Path parameter `game_id`
- **Response (Example):**
  ```json
  {
    "id": "68151",
    "title": "Elden Ring",
    "imageUrl": "https://howlongtobeat.com/games/...",
    "developer": "FromSoftware",
    "publisher": "Bandai Namco Entertainment",
    "platforms": ["PC", "PlayStation 4", "PlayStation 5", "Xbox One", "Xbox Series X/S"],
    "genres": ["Action", "Role-Playing"],
    "times": {
      "mainStory": "58.5 Hours",
      "mainExtras": "100 Hours",
      "completionist": "133 Hours",
      "allPlayStyles": "100 Hours"
    }
  }
  ```

## Caching Strategy
1.  **Memory Cache:** A simple `Map` based cache (or lightweight library like `node-cache`) will store successful responses for 24 hours. Subsequent requests for the same search term or game ID within this window will return the cached data immediately without hitting HLTB.
2.  **Edge Cache Headers:** All successful responses will include the header `Cache-Control: public, max-age=86400`. When deployed on platforms like Vercel or behind Cloudflare, the CDN will cache the response at the edge, meaning the server application won't even be invoked for cached requests.

## Resilience & Error Handling
- **User-Agent Spoofing:** Randomize common browser User-Agents for outgoing `fetch` requests.
- **Graceful Parsing Failures:** If a parser fails due to an HTML structural change on HLTB, the scraper will throw a specific `ParserError`. The API will catch this and return a structured `500 Internal Server Error` indicating the parser needs maintenance, rather than crashing the Node process.
- **CORS:** Global CORS middleware enabled by default to support cross-origin requests from browser extensions, configurable via environment variables.

## Deployment
- **Docker:** A `Dockerfile` will be provided for easy self-hosting on VPS or container platforms.
- **Serverless:** The `src/api/server.ts` file will be exportable as a handler for easy deployment to Vercel or AWS Lambda.