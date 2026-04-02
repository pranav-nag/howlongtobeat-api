# Design Spec: HLTB API Core Data Enhancements

**Date:** 2026-04-02
**Status:** Draft
**Topic:** Standardizing playtime and exposing advanced metrics

## 1. Objective
To enhance the `howlongtobeat-api` with machine-readable data and advanced popularity metrics, providing a competitive advantage over existing third-party APIs (like RapidAPI's elis-lab) and making the data easier for developers to consume.

## 2. Proposed Changes

### 2.1 Data Model Updates (`src/types.ts`)
We will introduce new fields to the `GameTimes` and `GameDetails` interfaces to store raw minutes and promoted metrics.

#### `GameTimesInMinutes` (New Interface)
```typescript
export interface GameTimesInMinutes {
  mainStory: number;
  mainExtras: number;
  completionist: number;
  allPlayStyles: number;
}
```

#### `GameMetrics` (New Interface)
```typescript
export interface GameMetrics {
  retirementRate: string;
  backlogCount: number;
  rating: number;
}
```

#### `GameDetails` (Updated)
```typescript
export interface GameDetails {
  // ... existing fields ...
  timesInMinutes: GameTimesInMinutes; // NEW
  metrics: GameMetrics;               // NEW
}
```

### 2.2 Parser Logic Updates (`src/scraper/parsers/`)

#### Time Normalization
A new utility function `parseTimeToMinutes(timeStr: string): number` will be implemented to convert HLTB time strings (e.g., "10h 30m", "45m", "100h") into raw integers.

#### Metric Extraction
Update `src/scraper/parsers/detail.ts` to reliably extract the "Retirement Rate" and "Backlog" count from the HLTB game page.

### 2.3 API Endpoint Updates (`src/api/routes.ts`)
The `/game/:id` endpoint will now include the `timesInMinutes` and `metrics` objects in its response. This is a non-breaking change as existing fields remain untouched.

## 3. Implementation Phases (Roadmap)

1.  **Phase 1 (Current):** Core Data Enhancement (Minutes & Metrics).
2.  **Phase 2:** Bulk/Batch Fetch (Process 50+ IDs in one request).
3.  **Phase 3:** Value Score (Hours per Dollar/Price integration).

## 4. Testing & Validation

### 4.1 Unit Tests
*   `parseTimeToMinutes` utility must be tested with various HLTB time formats.
*   Update `src/scraper/parsers/detail.test.ts` with updated HTML samples to verify metric extraction.

### 4.2 Integration Tests
*   Verify that the `/game/:id` endpoint returns the new JSON structure.

## 5. Security & Performance
*   **Caching:** The new data will be cached as part of the existing `appCache` mechanism.
*   **Performance:** Normalizing minutes adds negligible overhead to the parsing phase.
