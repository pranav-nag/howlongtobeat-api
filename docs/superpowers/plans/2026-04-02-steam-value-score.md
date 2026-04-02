# Steam Value Score Metric Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Steam price data to calculate and expose a "Value Score" (Minutes per Dollar) for games.

**Architecture:** We will fetch Steam price data concurrently with HLTB parsing using a 1.5s timeout. The logic is isolated in a new `price-client.ts` and integrated into the `/api/game/:id` route.

**Tech Stack:** TypeScript, Node.js fetch, Express

---

### Task 1: Update Data Models

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add GamePrice interface and update GameDetails**

```typescript
export interface GamePrice {
  currency: string;
  initial: number;
  final: number;
  discount_percent: number;
  formatted: string;
}

export interface GameDetails {
  // ... existing fields ...
  steamId?: number;
  price?: GamePrice;
  valueScore?: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add GamePrice and update GameDetails for value score"
```

---

### Task 2: Implement Steam Price Client

**Files:**
- Create: `src/scraper/price-client.ts`
- Create: `src/scraper/price-client.test.ts`

- [ ] **Step 1: Create the price client with timeout logic**

```typescript
import { GamePrice } from '../types';

export async function fetchSteamPrice(steamId: number): Promise<GamePrice | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500);

  try {
    const url = `https://store.steampowered.com/api/appdetails?appids=${steamId}&filters=price_overview`;
    const response = await fetch(url, { signal: controller.signal });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const gameData = data[steamId.toString()];
    
    if (!gameData?.success || !gameData.data?.price_overview) {
      return null;
    }

    const price = gameData.data.price_overview;
    return {
      currency: price.currency,
      initial: price.initial,
      final: price.final,
      discount_percent: price.discount_percent,
      formatted: price.final_formatted
    };
  } catch (error) {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

- [ ] **Step 2: Write a test for the price client**

```typescript
import { fetchSteamPrice } from './price-client';

describe('Price Client', () => {
  it('should fetch price for Elden Ring (1245620)', async () => {
    const price = await fetchSteamPrice(1245620);
    expect(price).toBeDefined();
    expect(price?.currency).toBe('USD');
  });

  it('should return null for invalid ID', async () => {
    const price = await fetchSteamPrice(99999999);
    expect(price).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npm test src/scraper/price-client.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/scraper/price-client.ts src/scraper/price-client.test.ts
git commit -m "feat: implement Steam price client with timeout"
```

---

### Task 3: Update Detail Parser to extract Steam ID

**Files:**
- Modify: `src/scraper/parsers/detail.ts`

- [ ] **Step 1: Ensure steamId is extracted from __NEXT_DATA__**

Update `parseGameDetails` to include `steamId: gameData.profile_steam || undefined` in the return object.

- [ ] **Step 2: Commit**

```bash
git add src/scraper/parsers/detail.ts
git commit -m "feat: extract steamId in detail parser"
```

---

### Task 4: Integrate Concurrent Fetch in Routes

**Files:**
- Modify: `src/api/routes.ts`

- [ ] **Step 1: Update /api/game/:id to use concurrent fetch**

```typescript
import { fetchSteamPrice } from '../scraper/price-client';

// Inside apiRouter.get('/game/:id') executeGetDetails function:
  const executeGetDetails = async () => {
    await ensureSession();
    const html = await fetchHltb(`https://howlongtobeat.com/game/${id}`);
    
    // 1. Fast parse for steamId (or just use the existing parser since it is fast)
    const details = parseGameDetails(id, html);
    
    // 2. Concurrent fetch if steamId exists
    if (details.steamId) {
      const pricePromise = fetchSteamPrice(details.steamId);
      
      // Wait for price while we continue or just await it before returning
      const price = await pricePromise;
      if (price) {
        details.price = price;
        const priceInDollars = price.final / 100 || 0.01;
        details.valueScore = Math.round(details.timesInMinutes.mainExtras / priceInDollars);
      }
    }

    appCache.set(cacheKey, details);
    return details;
  };
```

- [ ] **Step 2: Commit**

```bash
git add src/api/routes.ts
git commit -m "feat: integrate concurrent Steam price fetching into routes"
```

---

### Task 5: Final Verification

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 2: Manual Check**

Run: `npm start`
Check: `http://localhost:3000/api/game/68151`
Expected: JSON contains `price` and `valueScore` fields.

- [ ] **Step 3: Update README**

Add `valueScore` and `price` to the example response in `README.md`.
