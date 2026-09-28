const path = require('node:path');
const express = require('express');
const { createGameStore } = require('./game');

function createApp(store = createGameStore()) {
  const app = express();
  app.use(express.json());

  app.post('/api/games', (req, res) => {
    try { res.status(201).json(store.create(req.body)); }
    catch (error) { res.status(400).json({ error: error.message }); }
  });

  app.get('/api/games/:id', (req, res) => {
    const game = store.get(req.params.id);
    if (!game) return res.status(404).json({ error: 'game not found' });
    res.json(game);
  });

  app.post('/api/games/:id/actions', (req, res) => {
    try {
      const game = store.act(req.params.id, req.body && req.body.action);
      if (!game) return res.status(404).json({ error: 'game not found' });
      res.json(game);
    } catch (error) { res.status(400).json({ error: error.message }); }
  });

  app.use(express.static(path.join(__dirname, 'public')));

  app.use((error, _req, res, _next) => {
    res.status(400).json({ error: error instanceof SyntaxError ? 'invalid JSON' : 'bad request' });
  });
  return app;
}

if (require.main === module) {
  const port = process.env.PORT || 3000;
  createApp().listen(port, () => console.log(`Jev is dealing on port ${port}`));
}

module.exports = { createApp };
