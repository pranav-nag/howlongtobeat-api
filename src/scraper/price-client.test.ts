import { fetchSteamPrice } from './price-client';

describe('Price Client', () => {
  it('should fetch price for Elden Ring (1245620)', async () => {
    const price = await fetchSteamPrice(1245620);
    expect(price).toBeDefined();
    // Steam API returns USD for US IP or can vary. 
    // Given we are running in a CI/local environment, let's at least check it returns a currency code.
    expect(price?.currency).toMatch(/^[A-Z]{3}$/);
  });

  it('should return null for invalid ID', async () => {
    const price = await fetchSteamPrice(99999999);
    expect(price).toBeNull();
  });
});
