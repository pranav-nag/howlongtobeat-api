# GEMINI.md - howlongtobeat-api Mandates

This document provides foundational instructions and architectural mandates for any AI agent working on the `howlongtobeat-api` project. These instructions take precedence over general workflows.

## Project Context
The `howlongtobeat-api` is a resilient REST API designed to scrape game completion data from HowLongToBeat.com (HLTB). Due to HLTB's frequent security and layout updates, maintenance must prioritize modularity and empirical validation.

## Architectural Mandates

### 1. Strict Isolation of Concerns
- **Parsers (`src/scraper/parsers/`)**: Must remain pure and focused only on extracting data from HTML or JSON strings. They should not perform network requests.
- **Client (`src/scraper/hltb-client.ts`)**: Responsible for all HLTB communication, session/cookie management, and mimicking browser headers.
- **Routes (`src/api/routes.ts`)**: Handles HTTP requests, response mapping, and caching. Business logic or parsing logic must never leak into this layer.

### 2. Scraping & Resilience Standards
- **Browser Mimicry**: Always use modern, randomized User-Agents and complete header sets (`Sec-Ch-Ua`, `Sec-Fetch-*`, etc.) to minimize 403 Forbidden errors.
- **Security Tokens**: HLTB often uses dynamic tokens (`api/find/init`). Implementations must follow the current handshake protocol (Initialization -> Token Extraction -> Authorized Request).
- **Session Persistence**: Maintain session cookies across requests within a single scraper operation to avoid fingerprinting mismatches.

## Testing & Validation Requirements

### 1. Empirical Failure Reproduction
- Before fixing a scraper or parser bug, you **MUST** create a failing test case that reproduces the issue using either a live fetch (if the site has changed) or a saved HTML/JSON sample of the new structure.

### 2. Parser Coverage
- Every parser in `src/scraper/parsers/` must have a corresponding `.test.ts` file that tests it against various HTML/JSON edge cases (e.g., missing data, changed selectors, error messages).

### 3. Verification Suite
- Before completing any feature or fix, run the full verification suite:
  ```bash
  npm run build && npm test
  ```

## Development Workflow
- **Language**: Strictly TypeScript. Avoid using `any` unless absolutely necessary for dynamic payload keys.
- **Dependencies**: Native `fetch` is preferred over Axios to keep the bundle lean.
- **Caching**: Ensure that all new endpoints are integrated with the `appCache` in `src/cache/memory.ts`.
- **License**: All new files must adhere to the MIT License.

## Error Handling
- Use the `ParserError` class for any failures related to HLTB structure changes.
- API responses should return `502 Bad Gateway` for scraping/parsing failures to indicate the upstream source (HLTB) is the issue, rather than a generic `500`.
