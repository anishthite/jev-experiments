# Jev Poker

**Live:** https://jev-poker.anishthite.workers.dev

A heads-up no-limit Texas Hold’em game against OpenRouter’s `typesafe/jev-router`, backed by the linked Jev latest model, with a public REST API. The deployed Worker stores `OPENROUTER_API_KEY` as an encrypted secret and falls back to a local poker bot if the model is unavailable.

## Run

```bash
npm start
# open http://localhost:3000
```

## Test

```bash
npm test
```

## API

### Create a game

```bash
curl -X POST http://localhost:3000/api/games \
  -H 'content-type: application/json' \
  -d '{"startingStack":1000,"smallBlind":5,"bigBlind":10}'
```

### Read a game

```bash
curl http://localhost:3000/api/games/GAME_ID
```

### Act

```bash
curl -X POST http://localhost:3000/api/games/GAME_ID/actions \
  -H 'content-type: application/json' \
  -d '{"revision":1,"type":"call"}'
```

Actions are `fold`, `check`, `call`, and `raise`. For a raise, include `"amount": 40`; this is the total contribution for the current street. Use the response’s `legalActions` rather than calculating legality client-side. A stale `revision` returns HTTP 409 and illegal actions return 422.

### Deal the next hand

```bash
curl -X POST http://localhost:3000/api/games/GAME_ID/next-hand \
  -H 'content-type: application/json' \
  -d '{"revision":12}'
```

Games are held in server memory and reset when the process restarts.
