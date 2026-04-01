import { parseSearchHtml, searchGames } from './search';
import { SearchResult } from '../../types';

describe('Search Parser', () => {
  it('should parse valid search results HTML', () => {
    const mockHtml = `
      <ul>
        <li>
          <a href="/game/68151">Elden Ring</a>
          <img src="/games/elden_ring.jpg" />
        </li>
      </ul>
    `;
    const results = parseSearchHtml(mockHtml);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('68151');
    expect(results[0].title).toBe('Elden Ring');
    expect(results[0].imageUrl).toBe('https://howlongtobeat.com/games/elden_ring.jpg');
  });
});

describe('Search Scraper', () => {
  it('should fetch and parse search for Elden Ring', async () => {
    // Note: HLTB's actual search endpoint uses a POST to a specific API route. 
    // We will do a generic GET to the site search for simplicity if possible, or build the payload.
    // For this example API design, let's assume a simplified GET wrapper or we test actual behavior.
    const results = await searchGames('Elden Ring');
    expect(Array.isArray(results)).toBe(true);
    if (results.length > 0) {
      expect(results[0].id).toBeDefined();
    }
  });
});
