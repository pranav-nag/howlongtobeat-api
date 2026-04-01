import * as cheerio from 'cheerio';
import { GameDetails, ParserError } from '../../types';
import { fetchHltb } from '../hltb-client';

export async function getGameDetails(id: string): Promise<GameDetails> {
  const html = await fetchHltb(`https://howlongtobeat.com/game/${id}`);
  
  try {
    const $ = cheerio.load(html);
    
    // Extract title from the profile header
    const title = $('.ProfileHeader_profile_header__3_OOK').text().trim() || 
                  $('.profile_header').text().trim() || 
                  'Unknown Title';

    const imageUrl = $('.ProfileHeader_profile_header_game__1_OOK img').attr('src') || 
                     $('.profile_header_game img').attr('src') || '';
    
    const times = {
      mainStory: 'Unknown',
      mainExtras: 'Unknown',
      completionist: 'Unknown',
      allPlayStyles: 'Unknown'
    };

    // Extract times from the game times list
    // HLTB uses different classes, often randomized or updated
    $('.GameTimeTable_game_times__3_OOK li, .game_times li').each((_, el) => {
      const label = $(el).find('h4').text().trim().toLowerCase();
      const time = $(el).find('h5').text().trim();
      
      if (label.includes('main story')) times.mainStory = time;
      if (label.includes('main + extras')) times.mainExtras = time;
      if (label.includes('completionist')) times.completionist = time;
      if (label.includes('all playstyles')) times.allPlayStyles = time;
    });

    return {
      id,
      title,
      imageUrl: imageUrl.startsWith('http') ? imageUrl : `https://howlongtobeat.com${imageUrl}`,
      developer: 'Unknown',
      publisher: 'Unknown',
      platforms: [],
      genres: [],
      times
    };
  } catch (error) {
    throw new ParserError('Failed to parse game details HTML');
  }
}
