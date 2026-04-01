import { SearchResult, ParserError } from '../../types';

export function parseSearchResponse(jsonString: string): SearchResult[] {
  try {
    const data = JSON.parse(jsonString);
    if (!data.data) return [];
    
    return data.data.map((item: any) => ({
      id: String(item.game_id),
      title: item.game_name,
      imageUrl: item.game_image ? `https://howlongtobeat.com/games/${item.game_image}` : '',
      releaseYear: item.profile_release_year
    }));
  } catch(e) {
    throw new ParserError('Failed to parse JSON search results');
  }
}
