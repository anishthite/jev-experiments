# Jev Chess

A mobile-friendly browser chess board where you play against [Jev by TypeSafe](https://openrouter.ai/~typesafe/jev-latest), with a JSON API for programmatic games.

## Run

```bash
npm install
export OPENROUTER_API_KEY=your_openrouter_key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). After your move, the server asks `~typesafe/jev-latest` for Jev’s reply through OpenRouter’s structured Decisions API.

### Configuration

| Variable | Required | Default |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | Yes | — |
| `JEV_MODEL` | No | `~typesafe/jev-latest` |
| `OPENROUTER_BASE_URL` | No | `https://openrouter.ai/api/v1` |
| `APP_URL` | No | `http://localhost:3000` |
| `PORT` | No | `3000` |

Model page: **https://openrouter.ai/~typesafe/jev-latest**

## API

```bash
# Create a game
curl -X POST http://localhost:3000/api/games   -H 'Content-Type: application/json'   -d '{"playerColor":"white"}'

# Read the position (includes FEN and legal moves)
curl http://localhost:3000/api/games/GAME_ID

# Play a move
curl -X POST http://localhost:3000/api/games/GAME_ID/moves   -H 'Content-Type: application/json'   -d '{"from":"e2","to":"e4","promotion":"q"}'

# Ask Jev to respond
curl -X POST http://localhost:3000/api/games/GAME_ID/jev-move
```

The OpenRouter key remains server-side. Jev receives the FEN, SAN history, and an allowlist of legal moves; its response is checked against that list before being applied. Game state is held in memory and resets when the server restarts.
