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
