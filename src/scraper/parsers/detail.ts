import * as cheerio from 'cheerio';
import { 
  GameDetails, ParserError, PlatformTime, GameDLC, 
  PlaystyleDetails, SpeedrunDetails, InDepthTimes, 
  GameStats, ReleaseDates, GameTimesInMinutes, GameMetrics 
} from '../../types';

export function parseGameDetails(id: string, html: string): GameDetails {
  try {
    const $ = cheerio.load(html);
    
    // Always try to extract "Updated" from DOM as it's human readable (e.g., "11 Mins Ago")
    const updatedText = $('.GameSummary-module__ndH3gG__profile_info:contains("Updated:")').text().replace('Updated:', '').trim();

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
            time: formatTime(p.comp_main),
            polled: p.count_comp,
            main: formatTime(p.comp_main),
            mainExtra: formatTime(p.comp_plus),
            completionist: formatTime(p.comp_100),
            fastest: formatTime(p.comp_low),
            slowest: formatTime(p.comp_high)
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

          const inDepthTimes: InDepthTimes = {
            mainStory: getPlaystyleDetails(gameData.comp_main_avg, gameData.comp_main_med, gameData.comp_main_l, gameData.comp_main_h),
            mainExtras: getPlaystyleDetails(gameData.comp_plus_avg, gameData.comp_plus_med, gameData.comp_plus_l, gameData.comp_plus_h),
            completionist: getPlaystyleDetails(gameData.comp_100_avg, gameData.comp_100_med, gameData.comp_100_l, gameData.comp_100_h),
            allPlayStyles: getPlaystyleDetails(gameData.comp_all_avg, gameData.comp_all_med, gameData.comp_all_l, gameData.comp_all_h),
            anyPercentage: getSpeedrunDetails(gameData.comp_speed_avg, gameData.comp_speed_med, gameData.comp_speed_min, gameData.comp_speed_max),
            hundredPercentage: getSpeedrunDetails(gameData.comp_speed100_avg, gameData.comp_speed100_med, gameData.comp_speed100_min, gameData.comp_speed100_max),
            coOp: getPlaystyleDetails(gameData.invested_co_avg, gameData.invested_co_med, gameData.invested_co_l, gameData.invested_co_h),
            competitive: getPlaystyleDetails(gameData.invested_mp_avg, gameData.invested_mp_med, gameData.invested_mp_l, gameData.invested_mp_h)
          };

          const stats: GameStats = {
            playing: gameData.count_playing || 0,
            backlogs: gameData.count_backlog || 0,
            replays: gameData.count_replay || 0,
            retired: gameData.count_retired || 0,
            beat: gameData.count_comp || 0
          };

          const releaseDates: ReleaseDates = {
            na: gameData.release_na ? String(gameData.release_na) : 'Unknown',
            eu: gameData.release_eu ? String(gameData.release_eu) : 'Unknown',
            jp: gameData.release_jp ? String(gameData.release_jp) : 'Unknown'
          };

          const timesInMinutes: GameTimesInMinutes = {
            mainStory: secondsToMinutes(gameData.comp_main),
            mainExtras: secondsToMinutes(gameData.comp_plus),
            completionist: secondsToMinutes(gameData.comp_100),
            allPlayStyles: secondsToMinutes(gameData.comp_all)
          };

          const metrics: GameMetrics = {
            retirementRate: gameData.count_retired && gameData.count_total 
              ? `${((gameData.count_retired / gameData.count_total) * 100).toFixed(1)}%` 
              : 'Unknown',
            backlogCount: gameData.count_backlog || 0,
            rating: gameData.review_score || 0
          };

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
            timesInMinutes,
            metrics,
            inDepthTimes,
            dlcs,
            rating: gameData.review_score ? `${gameData.review_score}%` : 'Unknown',
            retirementRate: metrics.retirementRate,
            summary: gameData.profile_summary || '',
            stats,
            releaseDates,
            alias: gameData.game_alias || '',
            updated: updatedText || (gameData.added_stats ? String(gameData.added_stats) : ''),
            steamId: gameData.profile_steam || undefined
          };
        }
      } catch (e) {
        console.error("Failed to parse __NEXT_DATA__", e);
      }
    }

    // Fallback to DOM parsing
    const titleNode = $('.GameHeader-module__zQS9VW__profile_header.shadow_text');
    if (titleNode.length === 0 && !nextDataScript) {
      throw new ParserError('Could not find game data in __NEXT_DATA__ or DOM');
    }
    
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

    const emptyStats: GameStats = { playing: 0, backlogs: 0, replays: 0, retired: 0, beat: 0 };
    const emptyReleaseDates: ReleaseDates = { na: 'Unknown', eu: 'Unknown', jp: 'Unknown' };

    return {
      id,
      title,
      imageUrl: imageUrl.startsWith('http') ? imageUrl : `https://howlongtobeat.com${imageUrl}`,
      developer,
      publisher,
      platforms,
      genres,
      times,
      timesInMinutes: { mainStory: 0, mainExtras: 0, completionist: 0, allPlayStyles: 0 },
      metrics: { retirementRate: 'Unknown', backlogCount: 0, rating: 0 },
      dlcs: [],
      rating: 'Unknown',
      retirementRate: 'Unknown',
      summary: '',
      stats: emptyStats,
      releaseDates: emptyReleaseDates,
      alias: '',
      updated: updatedText
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

function getPlaystyleDetails(avg?: number, med?: number, l?: number, h?: number): PlaystyleDetails {
  return {
    average: formatTime(avg),
    median: formatTime(med),
    rushed: formatTime(l),
    leisure: formatTime(h)
  };
}

function getSpeedrunDetails(avg?: number, med?: number, min?: number, max?: number): SpeedrunDetails {
  return {
    average: formatTime(avg),
    median: formatTime(med),
    fastest: formatTime(min),
    slowest: formatTime(max)
  };
}

function secondsToMinutes(seconds: number | undefined): number {
  if (!seconds) return 0;
  return Math.round(seconds / 60);
}
