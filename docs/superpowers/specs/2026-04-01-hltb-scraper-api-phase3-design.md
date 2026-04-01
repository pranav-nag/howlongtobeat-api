# HowLongToBeat API Phase 3: DX, Error Handling & Cache Invalidation

## Objective
To improve the Developer Experience (DX) and production-readiness of the API by documenting the new data structures, implementing granular error handling to differentiate failure modes, and providing a mechanism to bypass the 24-hour cache when fresh data is required.

## Current State & Problems
- **Documentation**: The `README.md` does not reflect the newly added data points (`platforms`, `dlcs`, `rating`, `retirementRate`). Consumers don't know this data exists or what its schema looks like.
- **Error Handling**: The API currently throws a generic `502` and `ParserError` for almost all failures (e.g., 404 Not Found vs. Fastly WAF block vs. outdated Cheerio selectors). This makes it hard for frontend clients to display appropriate UI.
- **Cache Invalidation**: The in-memory cache is hardcoded to 24 hours. If a user needs updated times immediately (e.g., they just submitted a run to HLTB), they have no way to bust the cache.

## Proposed Design

### 1. Documentation Updates (`README.md`)
We will update the `README.md` to include:
- A new `## Response Schemas` section.
- JSON examples of the `/api/search?q=` response.
- JSON examples of the `/api/game/:id` response, highlighting the new fields.

### 2. Granular Error Handling
We will update `src/types.ts` and `src/api/routes.ts` to implement specific error responses.
- **404 Not Found**: If the HTML page indicates a 404 (or the `__NEXT_DATA__` block is completely empty/missing in a way that suggests the game doesn't exist).
- **429 Too Many Requests**: If the `hltb-client.ts` detects a Fastly block or a `403 Forbidden` that implies a rate limit.
- **502 Bad Gateway / Parser Outdated**: If the HTML structure has changed and the parser fails.

### 3. Cache Invalidation
We will update the routes in `src/api/routes.ts`.
- **Query Parameter**: Introduce a `?force=true` query parameter on both `/search` and `/game/:id` endpoints.
- **Logic**: If `req.query.force === 'true'`, the route will skip the `appCache.get` check, fetch fresh data, overwrite the existing cache entry, and return the fresh data.

## Trade-offs
- Allowing `?force=true` could be abused by malicious users to bypass the cache and spam the HLTB servers, leading to a faster IP ban. However, since this is a self-hostable API, it is up to the host to implement rate limiting in front of this application (e.g., via Nginx or Cloudflare) if they expose it publicly.

## Success Criteria
- `README.md` accurately describes the current API surface.
- Sending a request to a non-existent game ID returns a logical error (e.g. `404`) rather than a generic `502`.
- Sending a request with `?force=true` bypasses the cache and updates the stored value.