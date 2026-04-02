export interface SearchResult {
  id: string;
  title: string;
  imageUrl: string;
  releaseYear?: number;
}

export interface GameTimes {
  mainStory: string;
  mainExtras: string;
  completionist: string;
  allPlayStyles: string;
}

export interface PlaystyleDetails {
  average: string;
  median: string;
  rushed: string;
  leisure: string;
}

export interface SpeedrunDetails {
  average: string;
  median: string;
  fastest: string;
  slowest: string;
}

export interface InDepthTimes {
  mainStory?: PlaystyleDetails;
  mainExtras?: PlaystyleDetails;
  completionist?: PlaystyleDetails;
  allPlayStyles?: PlaystyleDetails;
  anyPercentage?: SpeedrunDetails;
  hundredPercentage?: SpeedrunDetails;
  coOp?: PlaystyleDetails;
  competitive?: PlaystyleDetails;
}

export interface GameStats {
  playing: number;
  backlogs: number;
  replays: number;
  retired: number;
  beat: number;
}

export interface ReleaseDates {
  na: string;
  eu: string;
  jp: string;
}

export interface PlatformTime {
  name: string;
  time: string;
  polled?: number;
  main?: string;
  mainExtra?: string;
  completionist?: string;
  fastest?: string;
  slowest?: string;
}

export interface GameDLC {
  id: string;
  title: string;
}

export interface GamePrice {
  currency: string;
  initial: number;
  final: number;
  discount_percent: number;
  formatted: string;
}

export interface GameTimesInMinutes {
  mainStory: number;
  mainExtras: number;
  completionist: number;
  allPlayStyles: number;
}

export interface GameMetrics {
  retirementRate: string;
  backlogCount: number;
  rating: number;
}

export interface GameDetails {
  id: string;
  title: string;
  imageUrl: string;
  developer: string;
  publisher: string;
  platforms: PlatformTime[];
  genres: string[];
  times: GameTimes;
  timesInMinutes: GameTimesInMinutes;
  metrics: GameMetrics;
  inDepthTimes?: InDepthTimes;
  dlcs: GameDLC[];
  rating: string;
  retirementRate: string;
  summary: string;
  stats: GameStats;
  releaseDates: ReleaseDates;
  alias: string;
  updated: string;
  steamId?: number;
  price?: GamePrice;
  valueScore?: number;
}

export class ParserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParserError';
  }
}
