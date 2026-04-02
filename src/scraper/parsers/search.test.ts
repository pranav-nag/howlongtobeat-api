import { parseSearchResponse } from './search';
import { ParserError } from '../../types';

const MOCK_SEARCH_RESPONSE = JSON.stringify({
  data: [
    {
      game_id: 68151,
      game_name: "Elden Ring",
      game_image: "68151_Elden_Ring.jpg",
      profile_release_year: 2022
    }
  ]
});

describe('Search Scraper', () => {
  it('should parse search results correctly from JSON', () => {
    const results = parseSearchResponse(MOCK_SEARCH_RESPONSE);
    
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('68151');
    expect(results[0].title).toBe('Elden Ring');
    expect(results[0].releaseYear).toBe(2022);
    expect(results[0].imageUrl).toContain('68151_Elden_Ring.jpg');
  });

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
