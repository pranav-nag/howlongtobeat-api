import { parseGameDetails } from './detail';
import { fetchHltb } from '../hltb-client';
import { ParserError } from '../../types';

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
    expect(details.platforms[0].polled).toBeGreaterThan(0);
    expect(details.genres.length).toBeGreaterThan(0);
    expect(details.times.mainStory).not.toBe('Unknown');
    expect(details.times.completionist).not.toBe('Unknown');
    expect(details.summary).toContain('Golden Order');
    expect(details.stats.beat).toBeGreaterThan(0);
    expect(details.releaseDates.na).not.toBe('Unknown');
    expect(details.inDepthTimes?.mainStory?.average).not.toBe('Unknown');
    expect(details.rating).not.toBe('Unknown');
    
    // New fields
    expect(details.timesInMinutes.mainStory).toBeGreaterThan(0);
    expect(details.timesInMinutes.completionist).toBeGreaterThan(details.timesInMinutes.mainStory);
    expect(details.metrics.rating).toBeGreaterThan(0);
    expect(details.metrics.backlogCount).toBeGreaterThan(0);
    expect(details.metrics.retirementRate).not.toBe('Unknown');
  }, 10000); // increase timeout for network requests

  describe('Error Paths', () => {
    it('should throw ParserError when __NEXT_DATA__ is missing', () => {
      const html = '<html><body>No data here</body></html>';
      expect(() => parseGameDetails('123', html)).toThrow(ParserError);
    });
  });
});
