import * as cheerio from 'cheerio';
import { GameDetails, ParserError } from '../../types';

export function parseGameDetails(id: string, html: string): GameDetails {
  try {
    const $ = cheerio.load(html);
    
    // Try to extract the __NEXT_DATA__ JSON
    const nextDataScript = $('#__NEXT_DATA__').html();
    
    if (nextDataScript) {
      try {
        const nextData = JSON.parse(nextDataScript);
        const gameData = nextData?.props?.pageProps?.game?.data?.game?.[0];
        
        if (gameData) {
          return {
            id,
            title: gameData.game_name || 'Unknown Title',
            imageUrl: gameData.game_image ? `https://howlongtobeat.com/games/${gameData.game_image}` : '',
            developer: gameData.profile_dev || 'Unknown',
            publisher: gameData.profile_pub || 'Unknown',
            platforms: gameData.profile_platform ? gameData.profile_platform.split(', ') : [],
            genres: gameData.profile_genre ? gameData.profile_genre.split(', ') : [],
            times: {
              mainStory: formatTime(gameData.comp_main),
              mainExtras: formatTime(gameData.comp_plus),
              completionist: formatTime(gameData.comp_100),
              allPlayStyles: formatTime(gameData.comp_all)
            }
          };
        }
      } catch (e) {
        console.error("Failed to parse __NEXT_DATA__", e);
      }
    }

    // Fallback to DOM parsing if JSON extraction fails
    const titleNode = $('.GameHeader-module__zQS9VW__profile_header.shadow_text');
    // Remove any children nodes (like comments or spans) from the text extraction
    titleNode.children().remove();
    const title = titleNode.text().trim() || 'Unknown Title';

    const imageUrl = $('img[src*="/games/"]').first().attr('src') || '';
    
    const developer = $('.GameSummary-module__ndH3gG__profile_info:contains("Developer:")').text().replace('Developer:', '').trim() || 'Unknown';
    const publisher = $('.GameSummary-module__ndH3gG__profile_info:contains("Publisher:")').text().replace('Publisher:', '').trim() || 'Unknown';
    const platformsText = $('.GameSummary-module__ndH3gG__profile_info:contains("Platforms:")').text().replace('Platforms:', '').trim();
    const platforms = platformsText ? platformsText.split(', ') : [];
    const genresText = $('.GameSummary-module__ndH3gG__profile_info:contains("Genres:")').text().replace('Genres:', '').trim();
    const genres = genresText ? genresText.split(', ') : [];

    const times = {
      mainStory: 'Unknown',
      mainExtras: 'Unknown',
      completionist: 'Unknown',
      allPlayStyles: 'Unknown'
    };

    $('.GameStats-module__aP4Tyq__stat, .GameStats-module__aP4Tyq__primary').each((_, el) => {
      const label = $(el).find('h4').text().trim().toLowerCase();
      const time = $(el).find('h5').text().trim();
      
      if (!label || !time) return;

      if (label.includes('main story')) {
        times.mainStory = time;
      } else if (label.includes('main + sides') || label.includes('main + extras')) {
        times.mainExtras = time;
      } else if (label.includes('completionist')) {
        times.completionist = time;
      } else if (label.includes('howlongtobeat') || label.includes('all playstyles')) {
        times.allPlayStyles = time;
      }
    });

    return {
      id,
      title,
      imageUrl: imageUrl.startsWith('http') ? imageUrl : `https://howlongtobeat.com${imageUrl}`,
      developer,
      publisher,
      platforms,
      genres,
      times
    };
  } catch (error) {
    throw new ParserError('Failed to parse game details HTML');
  }
}

// Helper to format seconds to a readable string like "60h" or "60h 30m"
function formatTime(seconds: number | undefined): string {
  if (!seconds) return 'Unknown';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  }
  
  return 'Unknown';
}
