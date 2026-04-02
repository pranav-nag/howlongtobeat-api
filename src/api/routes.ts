import { Router, Request, Response } from 'express';
import { parseSearchResponse } from '../scraper/parsers/search';
import { parseGameDetails } from '../scraper/parsers/detail';
import { fetchSteamPrice } from '../scraper/price-client';
import { appCache } from '../cache/memory';
import { ParserError } from '../types';
import { fetchHltb, ensureSession, performSearch } from '../scraper/hltb-client';

export const apiRouter = Router();

const CACHE_TTL_SECONDS = parseInt(process.env.CACHE_TTL_SECONDS || '86400', 10);
const FORCE_COOLDOWN_MS = parseInt(process.env.FORCE_COOLDOWN_MS || '5000', 10);
const inFlightRequests = new Map<string, Promise<any>>();
const lastForceRefresh = new Map<string, number>();

async function handleCachedRequest<T>(
  req: Request,
  res: Response,
  cacheKey: string,
  fetchFn: () => Promise<T>,
  errorPrefix: string
): Promise<void> {
  const force = req.query.force === 'true';
  const cachedData = force ? undefined : appCache.get(cacheKey);

  res.setHeader('Cache-Control', `public, max-age=${CACHE_TTL_SECONDS}`);

  if (cachedData) {
    res.json(cachedData);
    return;
  }

  if (force) {
    const now = Date.now();
    const last = lastForceRefresh.get(req.ip || 'unknown') || 0;
    if (now - last < FORCE_COOLDOWN_MS) {
      res.status(429).json({ error: 'Force refresh cooldown active. Please wait.' });
      return;
    }
    lastForceRefresh.set(req.ip || 'unknown', now);
  }

  if (inFlightRequests.has(cacheKey)) {
    try {
      const results = await inFlightRequests.get(cacheKey);
      res.json(results);
      return;
    } catch (error: any) {
      console.warn(`In-flight request failed for ${cacheKey}, retrying:`, error.message);
    }
  }

  const promise = fetchFn();
  inFlightRequests.set(cacheKey, promise);

  try {
    const results = await promise;
    const success = appCache.set(cacheKey, results);
    if (!success) {
      console.warn(`Cache set failed for key: ${cacheKey}`);
    }
    res.json(results);
  } catch (error: any) {
    console.error(`${errorPrefix} error:`, error.message);
    if (error.message.includes('404')) {
      res.status(404).json({ error: errorPrefix.includes('Search') ? 'Not Found' : 'Game Not Found' });
    } else if (error.message.includes('429') || error.message.includes('403')) {
      res.status(429).json({ error: 'Too Many Requests / Blocked by HLTB' });
    } else if (error instanceof ParserError || error.message.includes('HLTB fetch failed')) {
      res.status(502).json({ 
        error: `Failed to fetch or parse ${errorPrefix.toLowerCase()}. HLTB may have updated their security measures.`,
        details: error.message
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}

apiRouter.get('/search', async (req: Request, res: Response): Promise<void> => {
  const query = req.query.q as string;

  if (!query) {
    res.status(400).json({ error: 'Missing search query' });
    return;
  }

  const cacheKey = `search:${query.toLowerCase()}`;
  
  await handleCachedRequest(
    req, 
    res, 
    cacheKey, 
    async () => {
      const rawJson = await performSearch(query);
      return parseSearchResponse(rawJson);
    },
    'Search'
  );
});

apiRouter.get('/game/:id', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const cacheKey = `game:${id}`;

  await handleCachedRequest(
    req,
    res,
    cacheKey,
    async () => {
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
      return details;
    },
    'Details'
  );
});
