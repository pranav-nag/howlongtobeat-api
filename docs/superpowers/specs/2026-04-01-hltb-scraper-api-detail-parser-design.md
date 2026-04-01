# HowLongToBeat Detail Parser Refactor Design

## Objective
Refactor the `getGameDetails` function in `src/scraper/parsers/detail.ts` to strictly comply with the architectural mandates defined in `GEMINI.md`. Specifically, the parser must become a pure function that takes HTML as input and returns a `GameDetails` object, and must never perform network requests directly. All network requests for game details must be moved to `src/api/routes.ts`. Additionally, fix the Cheerio selectors so that the parser extracts accurate data (title, developer, publisher, genres, platforms, times) from the current HLTB game detail page HTML, resolving the issue where data like times are returned as "Unknown" and title is combined with profile stats.

## Current State
- `src/scraper/parsers/detail.ts` exports `getGameDetails(id: string)` which:
  1. Calls `fetchHltb('https://howlongtobeat.com/')` (network request).
  2. Calls `fetchHltb('https://howlongtobeat.com/game/${id}')` (network request).
  3. Uses Cheerio to parse the HTML, but selectors for title and times are outdated or inaccurate, resulting in merged text for the title and "Unknown" for times.

- `src/api/routes.ts` calls `getGameDetails(id)` directly inside the `/game/:id` route handler.

## Proposed Changes

### 1. Extract Network Requests to `src/api/routes.ts`
- Remove all imports and calls to `fetchHltb` from `src/scraper/parsers/detail.ts`.
- Update the `/game/:id` route in `src/api/routes.ts` to perform the necessary network requests:
  1. `await fetchHltb('https://howlongtobeat.com/')` (to ensure session cookies).
  2. `const html = await fetchHltb('https://howlongtobeat.com/game/${id}')`.
  3. Call the newly refactored `parseGameDetails(id, html)` function.

### 2. Refactor `detail.ts` to a Pure Function
- Rename `getGameDetails(id: string)` to `parseGameDetails(id: string, html: string): GameDetails`.
- The function will solely be responsible for loading the provided `html` into Cheerio and extracting the required fields.

### 3. Fix Cheerio Selectors
- Update the selectors to correctly target the title, developer, publisher, genres, platforms, and times based on the current HLTB HTML structure.
- **Title**: Needs a cleaner selector to avoid grabbing profile stats text (e.g., "Playing", "Backlogs"). Looking for a specific `h1` or similar dedicated title container.
- **Developer/Publisher/Genres/Platforms**: Extract these details from the profile info block (often labeled with "Developer:", "Publisher:", etc.).
- **Times**: Fix the extraction logic. The current logic uses `.find('h4')` and `.find('h5')` which might have changed. Will likely need to target `table` rows or specific `div` structures containing the time data.

### 4. Update Tests
- Update `src/scraper/parsers/detail.test.ts` to reflect the new signature of `parseGameDetails`.
- Since it's now a pure function, the test will need to either fetch real HTML or use a mocked HTML string. Given the project prefers empirical testing with live structure, the test can perform the `fetchHltb` calls itself and then pass the HTML to `parseGameDetails`.

## Trade-offs
- The `/game/:id` route becomes slightly fatter, handling the network orchestration, but this perfectly aligns with the `GEMINI.md` mandate that routes handle "how to fetch" and parsers handle "how to parse".
- Tests for `detail.ts` will need to manage their own HTML fetching if they want to test against live data, which is actually a better separation of concerns (testing the parser purely vs testing the network fetch).

## Success Criteria
- `src/scraper/parsers/detail.ts` contains no network requests.
- `npm test` passes, specifically the `Detail Scraper` suite.
- The `/api/game/:id` endpoint returns correct JSON data for a game (e.g., Elden Ring) with accurate title, times, and other details.