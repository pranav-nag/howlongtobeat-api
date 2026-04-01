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

export interface PlatformTime {
  name: string;
  time: string;
}

export interface GameDLC {
  id: string;
  title: string;
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
  dlcs: GameDLC[];
  rating: string;
  retirementRate: string;
}

export class ParserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParserError';
  }
}
