import { Router, Request, Response } from 'express';
import { parseSearchResponse } from '../scraper/parsers/search';
import { parseGameDetails } from '../scraper/parsers/detail';
import { fetchSteamPrice } from '../scraper/price-client';
import { appCache } from '../cache/memory';
import { ParserError } from '../types';
import { fetchHltb, ensureSession, performSearch } from '../scraper/hltb-client';

export const apiRouter = Router();

const CACHE_MAX_AGE = 86400; // 24 hours
const inFlightRequests = new Map<string, Promise<any>>();
const lastForceRefresh = new Map<string, number>();
const FORCE_COOLDOWN = 5000; // 5 seconds

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

  if (force) {
    const now = Date.now();
    const last = lastForceRefresh.get(req.ip || 'unknown') || 0;
    if (now - last < FORCE_COOLDOWN) {
      res.status(429).json({ error: 'Force refresh cooldown active. Please wait.' });
      return;
    }
    lastForceRefresh.set(req.ip || 'unknown', now);
  }

  const executeSearch = async () => {
    const rawJson = await performSearch(query);
    const results = parseSearchResponse(rawJson);
    const success = appCache.set(cacheKey, results);
    if (!success) {
      console.warn(`Cache set failed for key: ${cacheKey}`);
    }
    return results;
  };

  if (inFlightRequests.has(cacheKey)) {
    try {
      const results = await inFlightRequests.get(cacheKey);
      res.json(results);
      return;
    } catch (error) {
      // If previous failed, we'll try again
    }
  }

  const searchPromise = executeSearch();
  inFlightRequests.set(cacheKey, searchPromise);

  try {
    const results = await searchPromise;
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
  } finally {
    inFlightRequests.delete(cacheKey);
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

  if (force) {
    const now = Date.now();
    const last = lastForceRefresh.get(req.ip || 'unknown') || 0;
    if (now - last < FORCE_COOLDOWN) {
      res.status(429).json({ error: 'Force refresh cooldown active. Please wait.' });
      return;
    }
    lastForceRefresh.set(req.ip || 'unknown', now);
  }

  const executeGetDetails = async () => {
    await ensureSession();
    const html = await fetchHltb(`https://howlongtobeat.com/game/${id}`);
    const details = parseGameDetails(id, html);

    // Concurrent fetch if steamId exists
    if (details.steamId) {
      const price = await fetchSteamPrice(details.steamId);
      if (price) {
        details.price = price;
        const priceInDollars = price.final / 100 || 0.01;
        details.valueScore = Math.round(details.timesInMinutes.mainExtras / priceInDollars);
      }
    }

    const success = appCache.set(cacheKey, details);
    if (!success) {
      console.warn(`Cache set failed for key: ${cacheKey}`);
    }
    return details;
  };

  if (inFlightRequests.has(cacheKey)) {
    try {
      const details = await inFlightRequests.get(cacheKey);
      res.json(details);
      return;
    } catch (error) {}
  }

  const detailsPromise = executeGetDetails();
  inFlightRequests.set(cacheKey, detailsPromise);

  try {
    const details = await detailsPromise;
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
  } finally {
    inFlightRequests.delete(cacheKey);
  }
});
