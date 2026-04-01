# HowLongToBeat API Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the search parser to be a pure function, optimize network overhead with lazy session initialization, and enrich game details data using the `__NEXT_DATA__` block.

**Architecture:** We will introduce a service layer in `hltb-client.ts` to handle search orchestration and lazy session loading. The `search.ts` parser will be refactored into a pure function `parseSearchResponse`. We will expand the `GameDetails` interface to include granular data (platforms with times, DLCs, rating, retirement rate) and update the `detail.ts` parser to extract them.

**Tech Stack:** TypeScript, Express, Node.js fetch, Cheerio

---

### Task 1: Implement Network Service Layer and Lazy Sessions

**Files:**
- Modify: `src/scraper/hltb-client.ts`
- Modify: `src/api/routes.ts`

- [ ] **Step 1: Write the updated HltbClient logic**

Modify `src/scraper/hltb-client.ts` to implement `ensureSession()`, `performSearch(query: string)`, and add retry logic for transient errors.

```typescript
import { ParserError } from '../types';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
];

let sessionCookies: string[] = [];
let lastWarmup = 0;

export async function fetchHltb(url: string, options?: RequestInit): Promise<string> {
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  
  const headers = new Headers(options?.headers);
  headers.set('User-Agent', userAgent);
  headers.set('Accept', 'application/json, text/plain, */*');
  headers.set('Accept-Language', 'en-US,en;q=0.9');
  headers.set('Origin', 'https://howlongtobeat.com');
  headers.set('Referer', 'https://howlongtobeat.com/');
  headers.set('Sec-Ch-Ua', '"Chromium";v="123", "Not:A-Brand";v="8"');
  headers.set('Sec-Ch-Ua-Mobile', '?0');
  headers.set('Sec-Ch-Ua-Platform', '"Windows"');
  headers.set('Sec-Fetch-Dest', 'empty');
  headers.set('Sec-Fetch-Mode', 'cors');
  headers.set('Sec-Fetch-Site', 'same-origin');

  if (sessionCookies.length > 0) {
    headers.set('Cookie', sessionCookies.join('; '));
  }

  let attempt = 0;
  while (attempt < 2) {
    try {
      const response = await fetch(url, { ...options, headers });
      
      const setCookies = response.headers.getSetCookie();
      if (setCookies.length > 0) {
        sessionCookies = setCookies.map(c => c.split(';')[0]);
      }

      if (!response.ok) {
        throw new Error(`HLTB fetch failed: ${response.status} ${response.statusText}`);
      }
      
      return await response.text();
    } catch (e: any) {
      if (attempt === 1 || e.message.includes('404')) throw e;
      attempt++;
      await new Promise(res => setTimeout(res, 1000));
    }
  }
  throw new Error('HLTB fetch failed after retries');
}

export async function ensureSession(): Promise<void> {
  // Only warm up if no cookies exist or if 30 minutes have passed
  if (sessionCookies.length === 0 || Date.now() - lastWarmup > 30 * 60 * 1000) {
    await fetchHltb('https://howlongtobeat.com/');
    lastWarmup = Date.now();
  }
}

export async function performSearch(query: string): Promise<string> {
  await ensureSession();

  const initResponse = await fetchHltb(`https://howlongtobeat.com/api/find/init?t=${Date.now()}`);
  let security;
  try {
    security = JSON.parse(initResponse);
  } catch (e) {
    throw new ParserError('Failed to initialize search security');
  }

  const { token, hpKey, hpVal } = security;

  const payload: any = { 
    searchType: "games", 
    searchTerms: [query],
    searchPage: 1, 
    size: 20,
    searchOptions: {
      games: {
        userId: 0,
        platform: "",
        sortCategory: "popular",
        rangeCategory: "main",
        rangeTime: { min: null, max: null },
        gameplay: { perspective: "", flow: "", genre: "", difficulty: "" },
        rangeYear: { min: "", max: "" },
        modifier: ""
      },
      users: { sortCategory: "postcount" },
      lists: { sortCategory: "follows" },
      filter: "",
      sort: 0,
      randomizer: 0
    },
    useCache: true
  };
  
  if (hpKey) {
    payload[hpKey] = hpVal;
  }
  
  return fetchHltb('https://howlongtobeat.com/api/find', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-auth-token': token,
      'x-hp-key': hpKey,
      'x-hp-val': hpVal
    },
    body: JSON.stringify(payload)
  });
}
```

- [ ] **Step 2: Update API Routes to use lazy session and new search method**

Modify `src/api/routes.ts` to use `performSearch` and `ensureSession`. Note that `searchGames` is not modified yet, so the API route will just pass the JSON directly to a temporary parser fix if we have to, but we will actually refactor `search.ts` in Task 2. For now, let's just make the route use `performSearch` and assume `search.ts` will provide `parseSearchResponse`.

```typescript
import { Router, Request, Response } from 'express';
import { parseSearchResponse } from '../scraper/parsers/search';
import { parseGameDetails } from '../scraper/parsers/detail';
import { appCache } from '../cache/memory';
import { ParserError } from '../types';
import { fetchHltb, ensureSession, performSearch } from '../scraper/hltb-client';

export const apiRouter = Router();

const CACHE_MAX_AGE = 86400; // 24 hours

apiRouter.get('/search', async (req: Request, res: Response): Promise<void> => {
  const query = req.query.q as string;
  if (!query) {
    res.status(400).json({ error: 'Missing search query' });
    return;
  }

  const cacheKey = `search:${query.toLowerCase()}`;
  const cachedData = appCache.get(cacheKey);

  res.setHeader('Cache-Control', `public, max-age=${CACHE_MAX_AGE}`);

  if (cachedData) {
    res.json(cachedData);
    return;
  }

  try {
    const rawJson = await performSearch(query);
    const results = parseSearchResponse(rawJson);
    appCache.set(cacheKey, results);
    res.json(results);
  } catch (error: any) {
    console.error('Search error:', error.message);
    if (error instanceof ParserError || error.message.includes('HLTB fetch failed')) {
      res.status(502).json({ 
        error: 'Failed to fetch or parse HowLongToBeat response. HLTB may have updated their security measures.',
        details: error.message
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

apiRouter.get('/game/:id', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const cacheKey = `game:${id}`;
  const cachedData = appCache.get(cacheKey);

  res.setHeader('Cache-Control', `public, max-age=${CACHE_MAX_AGE}`);

  if (cachedData) {
    res.json(cachedData);
    return;
  }

  try {
    await ensureSession();
    const html = await fetchHltb(`https://howlongtobeat.com/game/${id}`);
    
    const details = parseGameDetails(id, html);
    
    appCache.set(cacheKey, details);
    res.json(details);
  } catch (error: any) {
    console.error('Details error:', error.message);
    if (error instanceof ParserError || error.message.includes('HLTB fetch failed')) {
      res.status(502).json({ 
        error: 'Failed to fetch or parse game details. HLTB may have updated their security measures.',
        details: error.message
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add src/scraper/hltb-client.ts src/api/routes.ts
git commit -m "feat: implement lazy sessions and extract search network logic"
```

---

### Task 2: Refactor Search Parser to be Pure

**Files:**
- Modify: `src/scraper/parsers/search.ts`
- Modify: `src/scraper/parsers/search.test.ts`

- [ ] **Step 1: Make search.ts a pure function**

Modify `src/scraper/parsers/search.ts` to export `parseSearchResponse` and remove `searchGames` and `fetchHltb` imports.

```typescript
import { SearchResult, ParserError } from '../../types';

export function parseSearchResponse(jsonString: string): SearchResult[] {
  try {
    const data = JSON.parse(jsonString);
    if (!data.data) return [];
    
    return data.data.map((item: any) => ({
      id: String(item.game_id),
      title: item.game_name,
      imageUrl: item.game_image ? `https://howlongtobeat.com/games/${item.game_image}` : '',
      releaseYear: item.profile_release_year
    }));
  } catch(e) {
    throw new ParserError('Failed to parse JSON search results');
  }
}
```

- [ ] **Step 2: Update search.test.ts**

Modify `src/scraper/parsers/search.test.ts` to fetch using the client and test the pure parser.

```typescript
import { parseSearchResponse } from './search';
import { performSearch } from '../hltb-client';

describe('Search Scraper', () => {
  it('should fetch and parse search results for Elden Ring', async () => {
    const rawJson = await performSearch('Elden Ring');
    const results = parseSearchResponse(rawJson);
    
    expect(results.length).toBeGreaterThan(0);
    const eldenRing = results.find(r => r.id === '68151');
    expect(eldenRing).toBeDefined();
    expect(eldenRing?.title).toBe('Elden Ring');
  }, 10000);
});
```

- [ ] **Step 3: Verify tests pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/scraper/parsers/search.ts src/scraper/parsers/search.test.ts
git commit -m "refactor: make search parser a pure function"
```

---

### Task 3: Enrich Game Details Schema and Parser

**Files:**
- Modify: `src/types.ts`
- Modify: `src/scraper/parsers/detail.ts`

- [ ] **Step 1: Update GameDetails Interface**

Modify `src/types.ts`:

```typescript
export interface SearchResult {
  id: string;
  title: string;
  imageUrl: string;
  releaseYear?: number;
}

export interface GameTimes {
  mainStory: string;
  mainExtras: string;
  completionist: string;
  allPlayStyles: string;
}

export interface PlatformTime {
  name: string;
  time: string;
}

export interface GameDLC {
  id: string;
  title: string;
}

export interface GameDetails {
  id: string;
  title: string;
  imageUrl: string;
  developer: string;
  publisher: string;
  platforms: PlatformTime[];
  genres: string[];
  times: GameTimes;
  dlcs: GameDLC[];
  rating: string;
  retirementRate: string;
}

export class ParserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParserError';
  }
}
```

- [ ] **Step 2: Update `parseGameDetails`**

Modify `src/scraper/parsers/detail.ts` to extract the new data.

```typescript
import * as cheerio from 'cheerio';
import { GameDetails, ParserError, PlatformTime, GameDLC } from '../../types';

export function parseGameDetails(id: string, html: string): GameDetails {
  try {
    const $ = cheerio.load(html);
    
    // Try to extract the __NEXT_DATA__ JSON
    const nextDataScript = $('#__NEXT_DATA__').html();
    
    if (nextDataScript) {
      try {
        const nextData = JSON.parse(nextDataScript);
        const gameData = nextData?.props?.pageProps?.game?.data?.game?.[0];
        const platformData = nextData?.props?.pageProps?.game?.data?.platformData || [];
        const relationships = nextData?.props?.pageProps?.game?.data?.relationships || [];
        
        if (gameData) {
          const platforms: PlatformTime[] = platformData.map((p: any) => ({
            name: p.platform,
            time: formatTime(p.comp_main)
          }));

          const dlcs: GameDLC[] = relationships
            .filter((r: any) => r.game_type === 'dlc')
            .map((r: any) => ({
              id: String(r.game_id),
              title: r.game_name
            }));

          // Fallback simple parsing if platformData is missing
          if (platforms.length === 0 && gameData.profile_platform) {
            gameData.profile_platform.split(', ').forEach((p: string) => {
              platforms.push({ name: p, time: 'Unknown' });
            });
          }

          return {
            id,
            title: gameData.game_name || 'Unknown Title',
            imageUrl: gameData.game_image ? `https://howlongtobeat.com/games/${gameData.game_image}` : '',
            developer: gameData.profile_dev || 'Unknown',
            publisher: gameData.profile_pub || 'Unknown',
            platforms,
            genres: gameData.profile_genre ? gameData.profile_genre.split(', ') : [],
            times: {
              mainStory: formatTime(gameData.comp_main),
              mainExtras: formatTime(gameData.comp_plus),
              completionist: formatTime(gameData.comp_100),
              allPlayStyles: formatTime(gameData.comp_all)
            },
            dlcs,
            rating: gameData.review_score ? `${gameData.review_score}%` : 'Unknown',
            retirementRate: gameData.count_retired && gameData.count_total 
              ? `${((gameData.count_retired / gameData.count_total) * 100).toFixed(1)}%` 
              : 'Unknown'
          };
        }
      } catch (e) {
        console.error("Failed to parse __NEXT_DATA__", e);
      }
    }

    // Fallback to DOM parsing
    const titleNode = $('.GameHeader-module__zQS9VW__profile_header.shadow_text');
    titleNode.children().remove();
    const title = titleNode.text().trim() || 'Unknown Title';

    const imageUrl = $('img[src*="/games/"]').first().attr('src') || '';
    
    const developer = $('.GameSummary-module__ndH3gG__profile_info:contains("Developer:")').text().replace('Developer:', '').trim() || 'Unknown';
    const publisher = $('.GameSummary-module__ndH3gG__profile_info:contains("Publisher:")').text().replace('Publisher:', '').trim() || 'Unknown';
    const platformsText = $('.GameSummary-module__ndH3gG__profile_info:contains("Platforms:")').text().replace('Platforms:', '').trim();
    const platforms = platformsText ? platformsText.split(', ').map(p => ({ name: p, time: 'Unknown' })) : [];
    const genresText = $('.GameSummary-module__ndH3gG__profile_info:contains("Genres:")').text().replace('Genres:', '').trim();
    const genres = genresText ? genresText.split(', ') : [];

    const times = {
      mainStory: 'Unknown',
      mainExtras: 'Unknown',
      completionist: 'Unknown',
      allPlayStyles: 'Unknown'
    };

    $('.GameStats-module__aP4Tyq__stat, .GameStats-module__aP4Tyq__primary').each((_, el) => {
      const label = $(el).find('h4').text().trim().toLowerCase();
      const time = $(el).find('h5').text().trim();
      
      if (!label || !time) return;

      if (label.includes('main story')) {
        times.mainStory = time;
      } else if (label.includes('main + sides') || label.includes('main + extras')) {
        times.mainExtras = time;
      } else if (label.includes('completionist')) {
        times.completionist = time;
      } else if (label.includes('howlongtobeat') || label.includes('all playstyles')) {
        times.allPlayStyles = time;
      }
    });

    return {
      id,
      title,
      imageUrl: imageUrl.startsWith('http') ? imageUrl : `https://howlongtobeat.com${imageUrl}`,
      developer,
      publisher,
      platforms,
      genres,
      times,
      dlcs: [],
      rating: 'Unknown',
      retirementRate: 'Unknown'
    };
  } catch (error) {
    throw new ParserError('Failed to parse game details HTML');
  }
}

function formatTime(seconds: number | undefined): string {
  if (!seconds) return 'Unknown';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  }
  
  return 'Unknown';
}
```

- [ ] **Step 3: Verify tests pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/types.ts src/scraper/parsers/detail.ts
git commit -m "feat: enrich game details with platform times, dlcs, rating, and retirement rate"
```