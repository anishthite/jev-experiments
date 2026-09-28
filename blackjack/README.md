# Blackjack with Jev

A browser blackjack table and JSON API for playing against Jev, the TypeSafe AI dealer.

## Run

```bash
npm install
npm start
# open http://localhost:3000
```

Run tests with `npm test`.

## API

Create a hand:

```bash
curl -X POST http://localhost:3000/api/games \
  -H 'content-type: application/json' \
  -d '{"chips":1000,"wager":25}'
```

The response includes the game `id`, public dealer hand, player hand, chip balance, result, and `availableActions`. The dealer hole card remains hidden while the hand is active.

Play an action:

```bash
curl -X POST http://localhost:3000/api/games/GAME_ID/actions \
  -H 'content-type: application/json' \
  -d '{"action":"hit"}'
```

Valid actions are `hit`, `stand`, and `double`. Fetch current state with:

```bash
curl http://localhost:3000/api/games/GAME_ID
```

Games are held in memory and reset when the process restarts. Dealer stands on all 17s; natural blackjack pays 3:2.
