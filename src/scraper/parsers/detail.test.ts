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
