import { GamePrice } from '../types';

export async function fetchSteamPrice(steamId: number): Promise<GamePrice | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500);

  try {
    const url = `https://store.steampowered.com/api/appdetails?appids=${steamId}&filters=price_overview`;
    const response = await fetch(url, { signal: controller.signal });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const gameData = data[steamId.toString()];
    
    if (!gameData?.success || !gameData.data?.price_overview) {
      return null;
    }

    const price = gameData.data.price_overview;
    return {
      currency: price.currency,
      initial: price.initial,
      final: price.final,
      discount_percent: price.discount_percent,
      formatted: price.final_formatted
    };
  } catch (error) {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
