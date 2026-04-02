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
        console.error(`Fetch failed for URL: ${url}`);
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
