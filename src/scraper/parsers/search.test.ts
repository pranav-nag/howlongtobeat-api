import { parseSearchResponse } from './search';
import { performSearch } from '../hltb-client';
import { ParserError } from '../../types';

describe('Search Scraper', () => {
  it('should fetch and parse search results for Elden Ring', async () => {
    const rawJson = await performSearch('Elden Ring');
    const results = parseSearchResponse(rawJson);
    
    expect(results.length).toBeGreaterThan(0);
    const eldenRing = results.find(r => r.id === '68151');
    expect(eldenRing).toBeDefined();
    expect(eldenRing?.title).toBe('Elden Ring');
  }, 10000);

  describe('Error Paths', () => {
    it('should throw ParserError for malformed JSON', () => {
      expect(() => parseSearchResponse('invalid json')).toThrow(ParserError);
    });

    it('should handle missing data field by returning empty array', () => {
      const results = parseSearchResponse('{}');
      expect(results).toEqual([]);
    });
  });
});
