# Design Spec: Steam Value Score Metric (Concurrent Fetch)

**Date:** 2026-04-02
**Status:** Draft
**Topic:** Integrating Steam price data to calculate "Value Score" (Minutes per Dollar)

## 1. Objective
To provide a "Value Score" metric that helps users understand the cost-effectiveness of a game based on its length (Main + Extras) and its current market price on Steam.

## 2. Proposed Changes

### 2.1 Data Model Updates (`src/types.ts`)

#### `GamePrice` (New Interface)
```typescript
export interface GamePrice {
  currency: string;
  initial: number;        // Price in cents before discount (e.g., 5999)
  final: number;          // Current price in cents (e.g., 2999)
  discount_percent: number;
  formatted: string;       // Human-readable string (e.g., "$29.99")
}
```

#### `GameDetails` (Updated)
```typescript
export interface GameDetails {
  // ... existing fields ...
  steamId?: number;        // The extracted Steam App ID
  price?: GamePrice;      // Steam price data (optional)
  valueScore?: number;    // Calculated: (Main + Extras Minutes) / (Final Price / 100)
}
```

### 2.2 New Service: Price Client (`src/scraper/price-client.ts`)
A dedicated client to interact with the Steam Storefront API.

- **Endpoint:** `https://store.steampowered.com/api/appdetails?appids={steamId}&filters=price_overview`
- **Logic:**
    - Perform a `fetch` to the Steam API.
    - Implement a **1.5 second timeout** using `AbortController`.
    - Handle cases where the `price_overview` is missing (e.g., free games, unreleased games, or delisted games).
    - Return `null` if the request fails or times out to ensure HLTB data remains available.

### 2.3 Route Integration (`src/api/routes.ts`)
The `/api/game/:id` route will be updated to handle concurrent fetching.

1.  **HLTB Fetch:** Fetch the HLTB game page.
2.  **Steam ID Extraction:** Quickly extract `profile_steam` from the HLTB `__NEXT_DATA__`.
3.  **Concurrency:** 
    - If `steamId` exists, start `fetchSteamPrice(steamId)` (Promise).
    - Simultaneously parse the HLTB HTML using `parseGameDetails`.
4.  **Wait & Merge:** 
    - Use `await` (with timeout protection from the client) to get the price.
    - If price is found:
        - `finalPriceInDollars = price.final / 100`
        - If `finalPriceInDollars === 0`, set to `0.01` (offset).
        - `valueScore = Math.round((details.timesInMinutes.mainExtras) / finalPriceInDollars)`
    - Attach `price` and `valueScore` to the `details` object.

## 3. Implementation Phases

1.  **Phase 1:** Update `src/types.ts` and create `src/scraper/price-client.ts`.
2.  **Phase 2:** Update `src/api/routes.ts` to implement the concurrent fetch logic.
3.  **Phase 3:** Update `src/scraper/parsers/detail.ts` to ensure `steamId` is consistently extracted.

## 4. Testing & Validation

### 4.1 Unit Tests
*   `price-client.ts`: Mock Steam API responses (Discounted, Full Price, Free, Error/Timeout).
*   `routes.ts`: Verify that the endpoint still returns HLTB data even if the Steam fetch fails.

### 4.2 Integration Tests
*   Live check with a known Steam game (e.g., Elden Ring) to verify the `valueScore` calculation.

## 5. Security & Performance
*   **Caching:** The `valueScore` and `price` will be part of the cached `GameDetails` object in `appCache` (24h TTL). This significantly reduces Steam API traffic.
*   **Timeout:** The 1.5s timeout ensures that a slow Steam response never stalls the HLTB API beyond a reasonable limit.
