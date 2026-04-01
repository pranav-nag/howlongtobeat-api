import { fetchHltb } from './hltb-client';

describe('HLTB Client', () => {
  it('should fetch the homepage successfully', async () => {
    const html = await fetchHltb('https://howlongtobeat.com/');
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain('HowLongToBeat');
  });
});
