# howlongtobeat-api

A high-performance, self-hostable REST API for HowLongToBeat.com. Features in-memory caching, TypeScript support, and resilient scraping logic to bypass security headers.

## Features

- **Search Games**: Search for games by title and get basic info (ID, title, image, release year).
- **Game Details**: Get comprehensive details for a specific game ID, including completion times for various playstyles.
- **Resilient Scraper**: Implements advanced browser-mimicking headers and session-based security (tokens, hpKey) to bypass common protections.
- **In-Memory Caching**: Built-in 24-hour cache using `node-cache` to improve performance and reduce load on HLTB.
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

## API Endpoints

### 1. `GET /api/search?q={game_title}`
Returns a list of games matching the query.

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
Returns the comprehensive details for a specific game ID.

**Example Response:**
```json
{
  "id": "68151",
  "title": "Elden Ring",
  "imageUrl": "https://howlongtobeat.com/games/68151_Elden_Ring.jpg",
  "developer": "FromSoftware",
  "publisher": "Bandai Namco Entertainment",
  "platforms": [
    { "name": "PC", "time": "58h 47m" },
    { "name": "PlayStation 5", "time": "60h 38m" }
  ],
  "genres": ["Action", "Open World", "Role-Playing"],
  "times": {
    "mainStory": "60h",
    "mainExtras": "104h 22m",
    "completionist": "141h 41m",
    "allPlayStyles": "110h 47m"
  },
  "dlcs": [
    { "id": "139385", "title": "Shadow of the Erdtree" }
  ],
  "rating": "93%",
  "retirementRate": "3.7%"
}
```

## Resilience Notice

HowLongToBeat® frequently updates their website's HTML structure and security measures. This scraper is designed to be as resilient as possible by mimicking browser behavior and handling dynamic security tokens. If an endpoint stops working, it is likely that HLTB has changed their internal API or security headers, and the parser may need an update.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This project is not affiliated with, authorized, maintained, sponsored or endorsed by HowLongToBeat.com or IGN Entertainment, Inc. This is an independent and unofficial API. HowLongToBeat® is a registered trademark of IGN Entertainment, Inc.
