import * as cheerio from 'cheerio';
import { SearchResult, ParserError } from '../../types';
import { fetchHltb } from '../hltb-client';

export function parseSearchHtml(html: string): SearchResult[] {
  try {
    const $ = cheerio.load(html);
    const results: SearchResult[] = [];

    $('li').each((_, el) => {
      const aTag = $(el).find('a').first();
      const href = aTag.attr('href');
      const idMatch = href?.match(/\/game\/(\d+)/);
      const title = aTag.text().trim();
      
      const imgTag = $(el).find('img').first();
      let imageUrl = imgTag.attr('src') || '';
      if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = `https://howlongtobeat.com${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
      }

      if (idMatch && idMatch[1] && title) {
        results.push({
          id: idMatch[1],
          title,
          imageUrl,
        });
      }
    });

    return results;
  } catch (error) {
    throw new ParserError('Failed to parse search results HTML');
  }
}

export async function searchGames(query: string): Promise<SearchResult[]> {
  // 0. Visit homepage to get session cookies
  await fetchHltb('https://howlongtobeat.com/');

  // 1. Initialize search security to get token and hpKey
  const initResponse = await fetchHltb(`https://howlongtobeat.com/api/find/init?t=${Date.now()}`);
  let security;
  try {
    security = JSON.parse(initResponse);
  } catch (e) {
    throw new ParserError('Failed to initialize search security');
  }

  const { token, hpKey, hpVal } = security;

  // 2. Perform the actual search with the security headers
  const payload: any = { 
    searchType: "games", 
    searchTerms: query.split(' '), 
    searchPage: 1, 
    size: 20,
    searchOptions: {
      games: {
        userId: 0,
        platform: "",
        sortCategory: "popular",
        rangeCategory: "main",
        rangeTime: { min: 0, max: 0 },
        gameplay: { perspective: "", flow: "", genre: "" },
        modifier: ""
      },
      users: { sortCategory: "postcount" },
      filter: "",
      sort: 0,
      randomizer: 0
    },
    useCache: true
  };
  
  if (hpKey) {
    payload[hpKey] = hpVal;
  }
  
  const responseHtml = await fetchHltb('https://howlongtobeat.com/api/find', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'Referer': 'https://howlongtobeat.com/',
      'x-auth-token': token,
      'x-hp-key': hpKey,
      'x-hp-val': hpVal
    },
    body: JSON.stringify(payload)
  });
  
  try {
    const data = JSON.parse(responseHtml);
    return data.data.map((item: any) => ({
      id: String(item.game_id),
      title: item.game_name,
      imageUrl: `https://howlongtobeat.com/games/${item.game_image}`,
      releaseYear: item.profile_release_year
    }));
  } catch(e) {
    throw new ParserError('Failed to parse JSON search results');
  }
}
