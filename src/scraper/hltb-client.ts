const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
];

export async function fetchHltb(url: string, options?: RequestInit): Promise<string> {
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  
  const headers = new Headers(options?.headers);
  headers.set('User-Agent', userAgent);
  headers.set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8');
  headers.set('Accept-Language', 'en-US,en;q=0.5');

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    throw new Error(`HLTB fetch failed: ${response.status} ${response.statusText}`);
  }
  
  return response.text();
}
