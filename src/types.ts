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

export interface GameDetails {
  id: string;
  title: string;
  imageUrl: string;
  developer: string;
  publisher: string;
  platforms: string[];
  genres: string[];
  times: GameTimes;
}

export class ParserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParserError';
  }
}
