const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
];

const selectedUserAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

let sessionCookies: string[] = [];

export async function fetchHltb(url: string, options?: RequestInit): Promise<string> {
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  
  const headers = new Headers(options?.headers);
  headers.set('User-Agent', selectedUserAgent);
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

  const response = await fetch(url, { ...options, headers });
  
  // Extract and save cookies from Set-Cookie header
  const setCookies = response.headers.getSetCookie();
  if (setCookies.length > 0) {
    sessionCookies = setCookies.map(c => c.split(';')[0]);
  }

  if (!response.ok) {
    throw new Error(`HLTB fetch failed: ${response.status} ${response.statusText}`);
  }
  
  return response.text();
}
