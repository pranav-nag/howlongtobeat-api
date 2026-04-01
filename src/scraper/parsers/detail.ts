import * as cheerio from 'cheerio';
import { GameDetails, ParserError } from '../../types';

export function parseGameDetails(id: string, html: string): GameDetails {
  try {
    const $ = cheerio.load(html);
    
    // Extract title from the profile header
    const title = $('[class*="_profile_header"]').first().text().trim() ||
                  $('.profile_header').text().trim() || 
                  'Unknown Title';

    const imageUrl = $('[class*="_profile_header_image"] img').attr('src') ||
                     $('img[src*="/games/"]').first().attr('src') || '';
    
    const times = {
      mainStory: 'Unknown',
      mainExtras: 'Unknown',
      completionist: 'Unknown',
      allPlayStyles: 'Unknown'
    };

    // Extract times from the game times list
    // HLTB uses diverse containers but labels are consistently h4 and times in h5
    $('[class*="game_times"] li, [class*="GameStats-module"] li, .game_times li, li:has(h4), .game_times div').each((_, el) => {
      const label = $(el).find('h4').text().trim().toLowerCase();
      const time = $(el).find('h5').text().trim();
      
      if (!label || !time) return;

      if (label.includes('main story')) {
        times.mainStory = time;
      } else if (label.includes('main + extras') || label.includes('main + sides')) {
        times.mainExtras = time;
      } else if (label.includes('completionist')) {
        times.completionist = time;
      } else if (label.includes('all playstyles') || label.includes('howlongtobeat')) {
        times.allPlayStyles = time;
      }
    });

    return {
      id,
      title,
      imageUrl: imageUrl.startsWith('http') ? imageUrl : `https://howlongtobeat.com${imageUrl}`,
      developer: 'Unknown',
      publisher: 'Unknown',
      platforms: [],
      genres: [] as string[],
      times
    };
  } catch (error) {
    throw new ParserError('Failed to parse game details HTML');
  }
}
