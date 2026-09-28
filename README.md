# Jev Games

Play against [Jev by TypeSafe](https://openrouter.ai/~typesafe/jev-latest) across three games. Each app includes a browser interface and a JSON API for programmatic play.

| Game | Source | Live |
| --- | --- | --- |
| ♟️ Chess | [Open chess](./chess/) | Run locally |
| ♠️ Poker | [Open poker](./poker/) | [Play poker](https://jev-poker.anishthite.workers.dev) |
| 🂡 Blackjack | [Open blackjack](./blackjack/) | [Play blackjack](https://blackjack-with-jev.anishthite.workers.dev) |

## Local development

Each game is self-contained. Enter its directory and follow its README:

```bash
cd chess       # or poker / blackjack
npm install
npm start
```

The Jev-powered routes require an OpenRouter API key. Copy the relevant `.env.example` when present or configure `OPENROUTER_API_KEY` in the deployment environment. Never commit API keys.
