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
    const results = parseSearchResponse(rawJson);
    
    appCache.set(cacheKey, results);
    res.json(results);
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
});
