# howlongtobeat-api ![Version](https://img.shields.edge/badge/version-1.0.0-black?style=flat-square)

> A resilient, developer-first bridge to HowLongToBeat® data. Built for precision, engineered for uptime.

## Engineered for Uptime

Most scrapers break when the target site updates its security. This API uses a **browser-accurate handshake**—including persistent session cookies, randomized but consistent User-Agents, and matching platform headers—to bypass `403 Forbidden` blocks and ensure your dashboards stay live.

[ ★ STAR ON GITHUB ](https://github.com/pranav-nag/howlongtobeat-api)


- **In-Memory Caching**: Built-in configurable cache using `node-cache` with request deduplication to prevent redundant fetches.
- **CORS Ready**: Configured for cross-origin requests, perfect for browser extensions or frontend applications.
- **Steam Integration**: Automatically fetches current Steam prices and calculates a "Value Score" (Playtime per Dollar).
- **TypeScript**: Fully typed for a better developer experience.

## Configuration

The API can be configured using environment variables. Create a `.env` file based on `.env.example`:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | The port the server will listen on. | `3000` |
| `CACHE_TTL_SECONDS` | Time-to-live for cached results in seconds. | `86400` (24h) |
| `FORCE_COOLDOWN_MS` | Cooldown period between forced refreshes per IP. | `5000` (5s) |

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
   git clone https://github.com/pranav-nag/howlongtobeat-api.git
   cd howlongtobeat-api
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file:
   ```bash
   cp .env.example .env
   ```

4. Build the project:
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
- Using the `?force=true` parameter to bypass cache (subject to the cooldown).

## API Endpoints

### 1. `GET /api/search?q={game_title}`
Returns a list of games matching the query. Supports `?force=true` to bypass cache.

### 2. `GET /api/game/{game_id}`
Returns the comprehensive details for a specific game ID. Supports `?force=true` to bypass cache.

## Resilience Notice

HowLongToBeat® frequently updates their website's HTML structure and security measures. This scraper is designed to be as resilient as possible by mimicking browser behavior and handling dynamic security tokens. If an endpoint stops working, it is likely that HLTB has changed their internal API or security headers, and the parser may need an update.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This project is not affiliated with, authorized, maintained, sponsored or endorsed by HowLongToBeat.com or IGN Entertainment, Inc. This is an independent and unofficial API. HowLongToBeat® is a registered trademark of IGN Entertainment, Inc.
