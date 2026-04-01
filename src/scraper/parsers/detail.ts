import * as cheerio from 'cheerio';
import { GameDetails, ParserError, PlatformTime, GameDLC } from '../../types';

export function parseGameDetails(id: string, html: string): GameDetails {
  try {
    const $ = cheerio.load(html);
    
    // Try to extract the __NEXT_DATA__ JSON
    const nextDataScript = $('#__NEXT_DATA__').html();
    
    if (nextDataScript) {
      try {
        const nextData = JSON.parse(nextDataScript);
        const gameData = nextData?.props?.pageProps?.game?.data?.game?.[0];
        const platformData = nextData?.props?.pageProps?.game?.data?.platformData || [];
        const relationships = nextData?.props?.pageProps?.game?.data?.relationships || [];
        
        if (gameData) {
          const platforms: PlatformTime[] = platformData.map((p: any) => ({
            name: p.platform,
            time: formatTime(p.comp_main)
          }));

          const dlcs: GameDLC[] = relationships
            .filter((r: any) => r.game_type === 'dlc')
            .map((r: any) => ({
              id: String(r.game_id),
              title: r.game_name
            }));

          // Fallback simple parsing if platformData is missing
          if (platforms.length === 0 && gameData.profile_platform) {
            gameData.profile_platform.split(', ').forEach((p: string) => {
              platforms.push({ name: p, time: 'Unknown' });
            });
          }

          return {
            id,
            title: gameData.game_name || 'Unknown Title',
            imageUrl: gameData.game_image ? `https://howlongtobeat.com/games/${gameData.game_image}` : '',
            developer: gameData.profile_dev || 'Unknown',
            publisher: gameData.profile_pub || 'Unknown',
            platforms,
            genres: gameData.profile_genre ? gameData.profile_genre.split(', ') : [],
            times: {
              mainStory: formatTime(gameData.comp_main),
              mainExtras: formatTime(gameData.comp_plus),
              completionist: formatTime(gameData.comp_100),
              allPlayStyles: formatTime(gameData.comp_all)
            },
            dlcs,
            rating: gameData.review_score ? `${gameData.review_score}%` : 'Unknown',
            retirementRate: gameData.count_retired && gameData.count_total 
              ? `${((gameData.count_retired / gameData.count_total) * 100).toFixed(1)}%` 
              : 'Unknown'
          };
        }
      } catch (e) {
        console.error("Failed to parse __NEXT_DATA__", e);
      }
    }

    // Fallback to DOM parsing
    const titleNode = $('.GameHeader-module__zQS9VW__profile_header.shadow_text');
    titleNode.children().remove();
    const title = titleNode.text().trim() || 'Unknown Title';

    const imageUrl = $('img[src*="/games/"]').first().attr('src') || '';
    
    const developer = $('.GameSummary-module__ndH3gG__profile_info:contains("Developer:")').text().replace('Developer:', '').trim() || 'Unknown';
    const publisher = $('.GameSummary-module__ndH3gG__profile_info:contains("Publisher:")').text().replace('Publisher:', '').trim() || 'Unknown';
    const platformsText = $('.GameSummary-module__ndH3gG__profile_info:contains("Platforms:")').text().replace('Platforms:', '').trim();
    const platforms = platformsText ? platformsText.split(', ').map(p => ({ name: p, time: 'Unknown' })) : [];
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
      times,
      dlcs: [],
      rating: 'Unknown',
      retirementRate: 'Unknown'
    };
  } catch (error) {
    throw new ParserError('Failed to parse game details HTML');
  }
}

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
