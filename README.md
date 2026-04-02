# howlongtobeat-api

A high-performance, self-hostable REST API for HowLongToBeat.com. Features in-memory caching, TypeScript support, and resilient scraping logic to bypass security headers.

## Features

- **Search Games**: Search for games by title and get basic info (ID, title, image, release year).
- **Comprehensive Game Details**: Get enriched data including detailed playstyle breakdowns (average, median, rushed, leisure), platform-specific stats, community engagement metrics, and more.
- **High-Precision Parsing**: Prioritizes HLTB's internal `__NEXT_DATA__` JSON for more accurate time extraction than simple HTML scraping.
- **Resilient Scraper**: Implements advanced browser-mimicking headers and session-based security (tokens, hpKey) to bypass common protections.
- **In-Memory Caching**: Built-in 24-hour cache using `node-cache` to improve performance, with a `?force=true` bypass for fresh data.
- **CORS Ready**: Configured for cross-origin requests, perfect for browser extensions or frontend applications.
- **TypeScript**: Fully typed for a better developer experience.

## Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **HTML Parsing**: Cheerio
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js v18 or higher
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/[your-username]/hltb-scrapper.git
   cd hltb-scrapper
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

### Running the API

Start the server in development mode:
```bash
npm run dev
```

Start the production server:
```bash
npm start
```

The server will be running on `http://localhost:3000`.

## Testing the API

For a quick start, you can import the provided [Postman Collection](docs/postman_collection.json) found in the `docs/` directory.

The collection includes pre-configured requests for:
- Searching for games.
- Fetching full game details by ID.
- Using the `?force=true` parameter to bypass cache (subject to the 5s cooldown).

## API Endpoints

### 1. `GET /api/search?q={game_title}`
Returns a list of games matching the query. Supports `?force=true` to bypass cache.

**Example Response:**
```json
[
  {
    "id": "68151",
    "title": "Elden Ring",
    "imageUrl": "https://howlongtobeat.com/games/68151_Elden_Ring.jpg",
    "releaseYear": 2022
  }
]
```

### 2. `GET /api/game/{game_id}`
Returns the comprehensive details for a specific game ID. Supports `?force=true` to bypass cache.

**Example Response:**
```json
{
  "id": "68151",
  "title": "Elden Ring",
  "imageUrl": "https://howlongtobeat.com/games/68151_Elden_Ring.jpg",
  "developer": "FromSoftware",
  "publisher": "Bandai Namco Entertainment",
  "platforms": [
    {
      "name": "PC",
      "time": "58h 47m",
      "polled": 6333,
      "main": "58h 47m",
      "mainExtra": "101h 57m",
      "completionist": "142h 29m",
      "fastest": "12h 57m",
      "slowest": "508h 15m"
    }
  ],
  "genres": ["Action", "Open World", "Role-Playing"],
  "times": {
    "mainStory": "60h",
    "mainExtras": "101h 11m",
    "completionist": "135h 34m",
    "allPlayStyles": "105h 23m"
  },
  "timesInMinutes": {
    "mainStory": 3601,
    "mainExtras": 6071,
    "completionist": 8135,
    "allPlayStyles": 6324
  },
  "metrics": {
    "retirementRate": "2.9%",
    "backlogCount": 14010,
    "rating": 93
  },
  "inDepthTimes": {
    "mainStory": {
      "average": "60h 1m",
      "median": "60h",
      "rushed": "36h 29m",
      "leisure": "87h"
    }
  },
  "dlcs": [
    { "id": "139385", "title": "Shadow of the Erdtree" }
  ],
  "rating": "93%",
  "retirementRate": "2.9%",
  "summary": "The Golden Order has been broken...",
  "stats": {
    "playing": 494,
    "backlogs": 14011,
    "replays": 1267,
    "retired": 1328,
    "beat": 20245
  },
  "releaseDates": {
    "na": "2022-02-25",
    "eu": "2022-02-25",
    "jp": "2022-02-25"
  },
  "alias": "Elden Ring Tarnished Edition",
  "updated": "24 Mins Ago"
}
```

## Resilience Notice

HowLongToBeat® frequently updates their website's HTML structure and security measures. This scraper is designed to be as resilient as possible by mimicking browser behavior and handling dynamic security tokens. If an endpoint stops working, it is likely that HLTB has changed their internal API or security headers, and the parser may need an update.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This project is not affiliated with, authorized, maintained, sponsored or endorsed by HowLongToBeat.com or IGN Entertainment, Inc. This is an independent and unofficial API. HowLongToBeat® is a registered trademark of IGN Entertainment, Inc.
