# HowLongToBeat API Phase 2: Architecture & Data Enrichment

## Objective
Align the `search.ts` parser with architectural mandates (pure functions, no network calls), optimize network overhead via lazy session initialization, and enrich the game details payload using the newly discovered `__NEXT_DATA__` JSON block.

## Current State & Problems
- **Architectural Violation**: `src/scraper/parsers/search.ts` still performs network requests directly (fetching init tokens and the search payload).
- **Network Inefficiency**: Every request to the API visits the HLTB homepage to "warm up" the session, even if cookies are still valid.
- **Incomplete Data**: The `__NEXT_DATA__` block in game details contains rich data (DLC relationships, platform-specific completion times, community rating, retirement rate) that is currently ignored.
- **Error Handling**: `502` errors are thrown for general failures, but we do not distinguish or retry transient Fastly (WAF) blocks.

## Proposed Design

### 1. Network Orchestration (`src/scraper/hltb-client.ts`)
We will move all network logic into an `HltbClient` class or set of exported functions, acting as a dedicated service layer.

- **Lazy Sessions**: Introduce `let lastWarmup = 0`. The `ensureSession()` function will only fetch the homepage if `Date.now() - lastWarmup > 30 * 60 * 1000` (30 mins) or if `sessionCookies` is empty.
- **Search Flow**: Move the `fetchHltb('/api/find/init')` and `fetchHltb('/api/find')` logic from `search.ts` into a new `performSearch(query)` function in `hltb-client.ts`. This function handles the headers, tokens, and returns the raw JSON string.

### 2. Pure Search Parser (`src/scraper/parsers/search.ts`)
- Refactor `searchGames` to `parseSearchResponse(jsonString: string): SearchResult[]`.
- It will accept the raw JSON string returned by the client, parse it, and map it to the `SearchResult` interface.
- It will no longer import `fetchHltb`.

### 3. Data Enrichment (`src/scraper/parsers/detail.ts` & `src/types.ts`)
Update `GameDetails` in `types.ts` to include:
- `platforms: { name: string, time: string }[]` (Detailed platform times instead of just an array of names)
- `dlcs: { id: string, title: string }[]` (Related content)
- `rating: string` (Community score, e.g., "93%")
- `retirementRate: string` (e.g., "3.7%")

Update `parseGameDetails` to extract these fields from the `__NEXT_DATA__` JSON structure.

### 4. Error Handling & Retries
- Update `hltb-client.ts` to retry requests automatically (up to 2 times) if a 503 or transient network error occurs.

## Trade-offs
- Changing the `GameDetails.platforms` signature from `string[]` to `{name: string, time: string}[]` is a breaking API change for consumers. However, given the project is in early development, correcting the schema now provides significantly more value.

## Success Criteria
- `src/scraper/parsers/search.ts` contains no network requests.
- `npm test` passes, including updated tests for search parsing and enriched detail parsing.
- The API routes (`/search` and `/game/:id`) correctly utilize the new `HltbClient` and pure parsers.
- Network logs (if added temporarily) show the homepage is only visited once per 30 minutes, rather than on every request.