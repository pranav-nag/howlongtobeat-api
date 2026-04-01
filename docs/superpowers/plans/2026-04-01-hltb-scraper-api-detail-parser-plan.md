# Detail Parser Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the detail parser to be a pure function, moving network requests to the route handler and fixing the Cheerio extraction selectors.

**Architecture:** Move `fetchHltb` calls from `src/scraper/parsers/detail.ts` into `src/api/routes.ts`. Update `getGameDetails` to `parseGameDetails(id: string, html: string)` returning `GameDetails`. Use the updated HLTB HTML structure (including the `__NEXT_DATA__` JSON block or robust Cheerio selectors) to accurately parse the title, developer, publisher, genres, platforms, and times. Provide mocked HTML in the test file `src/scraper/parsers/detail.test.ts` to test the pure parser function.

**Tech Stack:** TypeScript, Express, Cheerio, Node.js fetch.

---

### Task 1: Update API Route to Handle Network Requests

**Files:**
- Modify: `src/api/routes.ts`
- Modify: `src/scraper/parsers/detail.ts`

- [ ] **Step 1: Remove fetch from parser and change signature**

Modify `src/scraper/parsers/detail.ts`. Remove `fetchHltb` import and network calls. Change the signature. For now, just return a dummy object or the existing broken parsing. We will fix the parsing logic in Task 2.

```typescript
import * as cheerio from 'cheerio';
import { GameDetails, ParserError } from '../../types';

export function parseGameDetails(id: string, html: string): GameDetails {
  try {
    const $ = cheerio.load(html);
    
    // Extract title from the profile header
    const title = $('[class*="_profile_header"]').first().text().trim() ||
                  $('.profile_header').text().trim() || 
                  'Unknown Title';

    const imageUrl = $('[class*="_profile_header_image"] img').attr('src') ||
                     $('img[src*="/games/"]').first().attr('src') || '';
    
    const times = {
      mainStory: 'Unknown',
      mainExtras: 'Unknown',
      completionist: 'Unknown',
      allPlayStyles: 'Unknown'
    };

    // Extract times from the game times list
    // HLTB uses diverse containers but labels are consistently h4 and times in h5
    $('[class*="game_times"] li, [class*="GameStats-module"] li, .game_times li, li:has(h4), .game_times div').each((_, el) => {
      const label = $(el).find('h4').text().trim().toLowerCase();
      const time = $(el).find('h5').text().trim();
      
      if (!label || !time) return;

      if (label.includes('main story')) {
        times.mainStory = time;
      } else if (label.includes('main + extras') || label.includes('main + sides')) {
        times.mainExtras = time;
      } else if (label.includes('completionist')) {
        times.completionist = time;
      } else if (label.includes('all playstyles') || label.includes('howlongtobeat')) {
        times.allPlayStyles = time;
      }
    });

    return {
      id,
      title,
      imageUrl: imageUrl.startsWith('http') ? imageUrl : `https://howlongtobeat.com${imageUrl}`,
      developer: 'Unknown',
      publisher: 'Unknown',
      platforms: [],
      genres: [] as string[],
      times
    };
  } catch (error) {
    throw new ParserError('Failed to parse game details HTML');
  }
}
```

- [ ] **Step 2: Update the route handler to fetch HTML and call the new parser**

Modify `src/api/routes.ts`. Import `parseGameDetails` instead of `getGameDetails`. Import `fetchHltb`. Update the `/game/:id` route handler.

```typescript
import { Router, Request, Response } from 'express';
import { searchGames } from '../scraper/parsers/search';
import { parseGameDetails } from '../scraper/parsers/detail';
import { appCache } from '../cache/memory';
import { ParserError } from '../types';
import { fetchHltb } from '../scraper/hltb-client';

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
    const results = await searchGames(query);
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
    // 1. Visit homepage to ensure session cookies are set
    await fetchHltb('https://howlongtobeat.com/');
    // 2. Fetch the game detail page HTML
    const html = await fetchHltb(`https://howlongtobeat.com/game/${id}`);
    
    // 3. Parse the HTML using the pure parser function
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

Run:
```bash
git add src/scraper/parsers/detail.ts src/api/routes.ts
git commit -m "refactor: extract network requests from detail parser to route handler"
```

---

### Task 2: Fix Cheerio Selectors in Detail Parser

**Files:**
- Modify: `src/scraper/parsers/detail.ts`

- [ ] **Step 1: Implement robust parsing logic**

Modify `src/scraper/parsers/detail.ts` to correctly extract the requested details. HLTB embeds data in a Next.js `__NEXT_DATA__` script tag, which is far more reliable than parsing DOM elements.

```typescript
import * as cheerio from 'cheerio';
import { GameDetails, ParserError } from '../../types';

export function parseGameDetails(id: string, html: string): GameDetails {
  try {
    const $ = cheerio.load(html);
    
    // Try to extract the __NEXT_DATA__ JSON
    const nextDataScript = $('#__NEXT_DATA__').html();
    
    if (nextDataScript) {
      try {
        const nextData = JSON.parse(nextDataScript);
        const gameData = nextData?.props?.pageProps?.game?.data?.game?.[0];
        
        if (gameData) {
          return {
            id,
            title: gameData.game_name || 'Unknown Title',
            imageUrl: gameData.game_image ? `https://howlongtobeat.com/games/${gameData.game_image}` : '',
            developer: gameData.profile_dev || 'Unknown',
            publisher: gameData.profile_pub || 'Unknown',
            platforms: gameData.profile_platform ? gameData.profile_platform.split(', ') : [],
            genres: gameData.profile_genre ? gameData.profile_genre.split(', ') : [],
            times: {
              mainStory: formatTime(gameData.comp_main),
              mainExtras: formatTime(gameData.comp_plus),
              completionist: formatTime(gameData.comp_100),
              allPlayStyles: formatTime(gameData.comp_all)
            }
          };
        }
      } catch (e) {
        console.error("Failed to parse __NEXT_DATA__", e);
      }
    }

    // Fallback to DOM parsing if JSON extraction fails
    const titleNode = $('.GameHeader-module__zQS9VW__profile_header.shadow_text');
    // Remove any children nodes (like comments or spans) from the text extraction
    titleNode.children().remove();
    const title = titleNode.text().trim() || 'Unknown Title';

    const imageUrl = $('img[src*="/games/"]').first().attr('src') || '';
    
    const developer = $('.GameSummary-module__ndH3gG__profile_info:contains("Developer:")').text().replace('Developer:', '').trim() || 'Unknown';
    const publisher = $('.GameSummary-module__ndH3gG__profile_info:contains("Publisher:")').text().replace('Publisher:', '').trim() || 'Unknown';
    const platformsText = $('.GameSummary-module__ndH3gG__profile_info:contains("Platforms:")').text().replace('Platforms:', '').trim();
    const platforms = platformsText ? platformsText.split(', ') : [];
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
      times
    };
  } catch (error) {
    throw new ParserError('Failed to parse game details HTML');
  }
}

// Helper to format seconds to a readable string like "60h" or "60h 30m"
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

- [ ] **Step 2: Commit**

Run:
```bash
git add src/scraper/parsers/detail.ts
git commit -m "fix: improve detail parsing logic using NEXT_DATA JSON and robust selectors"
```

---

### Task 3: Update Tests

**Files:**
- Modify: `src/scraper/parsers/detail.test.ts`

- [ ] **Step 1: Rewrite the test to use network fetch and pure parser**

Modify `src/scraper/parsers/detail.test.ts` to perform the fetch and then pass the result to `parseGameDetails`.

```typescript
import { parseGameDetails } from './detail';
import { fetchHltb } from '../hltb-client';

describe('Detail Scraper', () => {
  it('should fetch and parse details for Elden Ring (68151)', async () => {
    // 1. Setup session cookies
    await fetchHltb('https://howlongtobeat.com/');
    
    // 2. Fetch HTML
    const id = '68151';
    const html = await fetchHltb(`https://howlongtobeat.com/game/${id}`);
    
    // 3. Parse pure HTML
    const details = parseGameDetails(id, html);
    
    expect(details.id).toBe('68151');
    expect(details.title).toBe('Elden Ring');
    expect(details.imageUrl).toContain('68151');
    expect(details.developer).toBe('FromSoftware');
    expect(details.publisher).toBe('Bandai Namco Entertainment');
    expect(details.platforms.length).toBeGreaterThan(0);
    expect(details.genres.length).toBeGreaterThan(0);
    expect(details.times.mainStory).not.toBe('Unknown');
    expect(details.times.completionist).not.toBe('Unknown');
  }, 10000); // increase timeout for network requests
});
```

- [ ] **Step 2: Run test to verify it passes**

Run:
```bash
npm test
```
Expected: PASS

- [ ] **Step 3: Commit**

Run:
```bash
git add src/scraper/parsers/detail.test.ts
git commit -m "test: update detail parser tests for pure function signature"
```