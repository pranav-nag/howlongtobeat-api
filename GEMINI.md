# GEMINI.md - howlongtobeat-api Mandates

This document provides foundational instructions, architectural mandates, and technical context for any AI agent working on the `howlongtobeat-api` project. These instructions take precedence over general workflows.

## Project Context
The `howlongtobeat-api` is a resilient REST API designed to scrape game completion data from HowLongToBeat.com (HLTB). Due to HLTB's frequent security and layout updates, maintenance must prioritize modularity, browser-accurate mimicry, and empirical validation.

## Project Structure
```text
src/
├── api/
│   ├── routes.ts       # Express route definitions & cache logic
│   └── server.ts       # Express app setup (CORS, JSON, Middleware)
├── cache/
│   └── memory.ts       # In-memory cache using node-cache
├── scraper/
│   ├── hltb-client.ts  # Low-level HTTP client (headers, cookies, sessions)
│   ├── parsers/
│   │   ├── search.ts   # Search result extraction logic
│   │   └── detail.ts   # Game detail extraction logic
├── types.ts            # Shared TypeScript interfaces
└── index.ts            # Entry point
```

## Architectural Mandates

### 1. Strict Isolation of Concerns
- **Parsers (`src/scraper/parsers/`)**: Must remain **pure**. They take a string (HTML/JSON) and return a typed object. They must NEVER perform network requests.
- **Client (`src/scraper/hltb-client.ts`)**: The ONLY file allowed to interact with the network. It handles User-Agent rotation, cookie persistence, and the HLTB "Initialization -> Search" handshake.
- **Routes (`src/api/routes.ts`)**: Handles HTTP status codes and caching. Logic for "how" to parse or "how" to fetch must not exist here.

### 2. Scraping & Resilience Standards
- **Browser Mimicry**: HLTB uses Fastly and strict fingerprinting. Always include:
    - Randomized modern User-Agents.
    - `Sec-Ch-Ua`, `Sec-Fetch-Dest`, `Sec-Fetch-Mode`, `Sec-Fetch-Site` headers.
    - Correct `Referer` (`https://howlongtobeat.com/`).
- **Dynamic Security**: HLTB uses `/api/find/init` to provide `token`, `hpKey`, and `hpVal`. These MUST be used in headers (`x-auth-token`, etc.) and the search payload for every search operation.
- **Session Persistence**: The `hltb-client` must capture `Set-Cookie` headers and re-send them in subsequent requests within the same process to maintain session validity.
- **JSON-First Parsing**: HLTB provides detailed metrics in the `__NEXT_DATA__` script tag. Parsers should prioritize this JSON over DOM scraping to ensure high precision for playtimes and community stats.

## Technical Patterns & Dependencies

- **HTML Parsing**: Use `cheerio` for DOM selection. Prefer robust selectors (e.g., searching by text content or multiple classes) as HLTB often uses randomized-looking class suffixes (e.g., `_3_OOK`).
- **Networking**: Use Node.js native `fetch`. Do not add Axios or other heavy networking libraries.
- **Caching**: 
    - Use the `appCache` instance in `src/cache/memory.ts`.
    - Default TTL: 24 hours.
    - Include `Cache-Control: public, max-age=86400` in API responses for edge/browser caching.
    - Bypassing: Routes must support a `force=true` query parameter to refresh stale or structural-breaking cache entries.
- **TypeScript**:
    - Strictly use interfaces defined in `src/types.ts`.
    - Enriched Schema: `GameDetails` includes comprehensive `inDepthTimes` (avg/med/rushed/leisure) and detailed `stats`. Always ensure new parsers populate these.

## Testing & Validation Requirements

### 1. Empirical Failure Reproduction
- Before fixing a scraper bug, you **MUST** create or update a test in `src/scraper/parsers/*.test.ts` that reproduces the failure using the current site structure.

### 2. Verification Suite
- Every change must pass:
  ```bash
  npm run build && npm test
  ```

## Error Handling
- Use `ParserError` for HTML/JSON structure changes.
- API status `502 Bad Gateway` should be returned when HLTB is inaccessible or the parser is broken. This distinguishes "The Scraper is broken/blocked" from "The API server crashed".

## Deployment Context
The project is designed to be deployable to Vercel, Docker, or traditional VPS environments. Keep the implementation stateless and side-effect free outside of the in-memory cache.
