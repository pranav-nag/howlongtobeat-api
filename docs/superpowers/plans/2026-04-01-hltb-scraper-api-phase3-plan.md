# HowLongToBeat API Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve Developer Experience by documenting the API schemas, differentiate error responses for clients, and provide a cache bypass mechanism.

**Architecture:** We will modify the Express routes to handle `?force=true` by conditionally bypassing `appCache.get()`. We will also add explicit Error classes or modify the catch block to return `404` or `429` based on error messages/HTML output. Finally, the README will be updated with JSON snippets.

**Tech Stack:** TypeScript, Express, Markdown

---

### Task 1: Update README.md Documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README with Response Schemas**

Append response schemas to `README.md` under the API Endpoints section.

```markdown
## API Endpoints

### 1. `GET /api/search?q={game_title}`
Returns a list of games matching the query.

**Example Response:**
```json
[
  {
    "id": "68151",
    "title": "Elden Ring",
    "imageUrl": "https://howlongtobeat.com/games/68151_Elden_Ring.jpg",
    "releaseYear": 2022
  }
]
```

### 2. `GET /api/game/{game_id}`
Returns the comprehensive details for a specific game ID.

**Example Response:**
```json
{
  "id": "68151",
  "title": "Elden Ring",
  "imageUrl": "https://howlongtobeat.com/games/68151_Elden_Ring.jpg",
  "developer": "FromSoftware",
  "publisher": "Bandai Namco Entertainment",
  "platforms": [
    { "name": "PC", "time": "58h 47m" },
    { "name": "PlayStation 5", "time": "60h 38m" }
  ],
  "genres": ["Action", "Open World", "Role-Playing"],
  "times": {
    "mainStory": "60h",
    "mainExtras": "104h 22m",
    "completionist": "141h 41m",
    "allPlayStyles": "110h 47m"
  },
  "dlcs": [
    { "id": "139385", "title": "Shadow of the Erdtree" }
  ],
  "rating": "93%",
  "retirementRate": "3.7%"
}
```
```

- [ ] **Step 2: Commit**

Run:
```bash
git add README.md
git commit -m "docs: document API response schemas with new enriched data fields"
```

---

### Task 2: Implement Cache Invalidation (`?force=true`)

**Files:**
- Modify: `src/api/routes.ts`

- [ ] **Step 1: Update routes to check for `force` query parameter**

Modify both `/search` and `/game/:id` in `src/api/routes.ts`.

```typescript
import { Router, Request, Response } from 'express';
import { parseSearchResponse, searchGames } from '../scraper/parsers/search';
import { parseGameDetails } from '../scraper/parsers/detail';
import { appCache } from '../cache/memory';
import { ParserError } from '../types';
import { fetchHltb, ensureSession, performSearch } from '../scraper/hltb-client';

export const apiRouter = Router();

const CACHE_MAX_AGE = 86400; // 24 hours

apiRouter.get('/search', async (req: Request, res: Response): Promise<void> => {
  const query = req.query.q as string;
  const force = req.query.force === 'true';

  if (!query) {
    res.status(400).json({ error: 'Missing search query' });
    return;
  }

  const cacheKey = `search:${query.toLowerCase()}`;
  const cachedData = force ? undefined : appCache.get(cacheKey);

  res.setHeader('Cache-Control', `public, max-age=${CACHE_MAX_AGE}`);

  if (cachedData) {
    res.json(cachedData);
    return;
  }

  try {
    const rawJson = await performSearch(query);
    
    let results;
    if (typeof parseSearchResponse === 'function') {
        results = parseSearchResponse(rawJson);
    } else {
        results = await searchGames(query); 
    }
    
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
  const force = req.query.force === 'true';

  const cacheKey = `game:${id}`;
  const cachedData = force ? undefined : appCache.get(cacheKey);

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

- [ ] **Step 2: Commit**

Run:
```bash
git add src/api/routes.ts
git commit -m "feat: allow cache bypass using ?force=true query parameter"
```

---

### Task 3: Implement Granular Error Handling

**Files:**
- Modify: `src/api/routes.ts`
- Modify: `src/scraper/parsers/detail.ts`

- [ ] **Step 1: Throw 404 in Detail Parser**

Modify `src/scraper/parsers/detail.ts` to detect a 404 condition (e.g. title is "Unknown Title" and no data exists). We'll throw a specific error for the route to catch.

```typescript
// Add inside the parseGameDetails try block, after the fallback parsing:
    // Fallback to DOM parsing
    const titleNode = $('.GameHeader-module__zQS9VW__profile_header.shadow_text');
    titleNode.children().remove();
    const title = titleNode.text().trim() || 'Unknown Title';

    if (title === 'Unknown Title' && $('body').text().toLowerCase().includes('not found')) {
      throw new Error('GAME_NOT_FOUND');
    }
```
*Wait, a better way is to throw it inside the route if `fetchHltb` fails with 404.*

Instead, update `fetchHltb` to preserve the HTTP status in the error, but since we just want the route to handle it, we'll parse the error message. `hltb-client.ts` throws `Error('HLTB fetch failed: 404 Not Found')`.

- [ ] **Step 2: Update Route Error Catch Blocks**

Modify `src/api/routes.ts` `catch (error: any)` blocks to check for specific error messages.

```typescript
// Inside apiRouter.get('/search') catch block:
  } catch (error: any) {
    console.error('Search error:', error.message);
    if (error.message.includes('404')) {
      res.status(404).json({ error: 'Not Found' });
    } else if (error.message.includes('429') || error.message.includes('403')) {
      res.status(429).json({ error: 'Too Many Requests / Blocked by HLTB' });
    } else if (error instanceof ParserError || error.message.includes('HLTB fetch failed')) {
      res.status(502).json({ 
        error: 'Failed to fetch or parse HowLongToBeat response. HLTB may have updated their security measures.',
        details: error.message
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

// Inside apiRouter.get('/game/:id') catch block:
  } catch (error: any) {
    console.error('Details error:', error.message);
    if (error.message.includes('404')) {
      res.status(404).json({ error: 'Game Not Found' });
    } else if (error.message.includes('429') || error.message.includes('403')) {
      res.status(429).json({ error: 'Too Many Requests / Blocked by HLTB' });
    } else if (error instanceof ParserError || error.message.includes('HLTB fetch failed')) {
      res.status(502).json({ 
        error: 'Failed to fetch or parse game details. HLTB may have updated their security measures.',
        details: error.message
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/api/routes.ts
git commit -m "feat: implement granular HTTP status codes for 404 and 429/403 errors"
```