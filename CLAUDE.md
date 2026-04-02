# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Development server (ts-node, port 3000)
npm run build     # Compile TypeScript to dist/
npm start         # Run compiled output
npm test          # Run all Jest tests
npm run build && npm test  # Required verification before completing any change
```

Run a single test file:
```bash
npx jest src/scraper/parsers/detail.test.ts
```

## Architecture

```
src/
├── api/
│   ├── routes.ts       # Express route definitions & cache logic
│   └── server.ts       # Express app setup (CORS, JSON, middleware)
├── cache/
│   └── memory.ts       # In-memory cache (node-cache, 24h TTL), exported as appCache
├── scraper/
│   ├── hltb-client.ts  # Low-level HTTP client (only file allowed to do network I/O)
│   └── parsers/
│       ├── search.ts   # Parses JSON search results from /api/find
│       └── detail.ts   # Parses game detail HTML (prefers __NEXT_DATA__ JSON)
├── types.ts            # All shared TypeScript interfaces
└── index.ts            # Entry point
```

**Strict layer separation:**
- **Parsers** are pure functions: `(string) => TypedObject`. No network calls ever.
- **hltb-client.ts** is the only network layer. It manages User-Agent rotation, cookie/session persistence, and the HLTB security handshake (`/api/find/init` → `token`, `hpKey`, `hpVal`).
- **routes.ts** owns HTTP status codes and cache logic. No fetch or parse logic belongs here.

## Key Implementation Details

**HLTB Security Handshake (search flow):**
1. `ensureSession()` — GET homepage to acquire session cookies (re-runs every 30 min or when cookies are absent)
2. GET `/api/find/init?t={timestamp}` — returns `{ token, hpKey, hpVal }`
3. POST `/api/find` — payload includes `hpKey`/`hpVal` fields; headers include `x-auth-token`, `x-hp-key`, `x-hp-val`

**Browser mimicry headers** (`hltb-client.ts`): always send `Sec-Ch-Ua`, `Sec-Fetch-Dest/Mode/Site`, `Referer: https://howlongtobeat.com/`, and a randomized modern User-Agent.

**Parsing strategy** (`detail.ts`): primary path is `__NEXT_DATA__` script tag JSON (`nextData.props.pageProps.game.data`); falls back to Cheerio DOM scraping if the JSON is absent or unparseable.

**Caching:** `appCache` (singleton in `cache/memory.ts`). Routes set `Cache-Control: public, max-age=86400`. `?force=true` bypasses the cache for fresh data.

**Error handling:** Throw `ParserError` for HTML/JSON structure failures. Routes map it (and `HLTB fetch failed`) to `502 Bad Gateway` to distinguish scraper failures from server crashes.

**Networking:** Use Node.js native `fetch` only. Do not add Axios or other HTTP libraries.

## Testing Rules

Before fixing any scraper bug, first write or update a test in `src/scraper/parsers/*.test.ts` that reproduces the failure with current site structure (empirical reproduction before fix).

Every change must pass `npm run build && npm test`.
