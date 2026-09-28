const test = require('node:test');
const assert = require('node:assert/strict');
const { handValue, createGameStore } = require('../game');
const { createApp } = require('../server');

const card = (rank, suit = 'spades') => ({ rank, suit });
const storeWith = (ranks) => createGameStore({
  idFactory: () => 'fixed-id',
  deckFactory: () => ranks.map((rank) => card(rank))
});

test('aces are scored as 1 when necessary', () => {
  assert.deepEqual(handValue([card('A'), card('6')]), { total: 17, soft: true });
  assert.deepEqual(handValue([card('A'), card('6'), card('K')]), { total: 17, soft: false });
});

test('creation deals alternately, hides Jev hole card, and deducts wager', () => {
  const game = storeWith(['10', '9', '7', '8']).create({ chips: 50, wager: 5 });
  assert.equal(game.id, 'fixed-id');
  assert.equal(game.chips, 45);
  assert.equal(game.player.value, 17);
  assert.equal(game.dealer.name, 'Jev');
  assert.deepEqual(game.dealer.hand[1], { hidden: true });
  assert.deepEqual(game.availableActions, ['hit', 'stand', 'double']);
});

test('hit busts and loses the committed wager', () => {
  const store = storeWith(['10', '5', '9', '8', 'K']);
  store.create({ chips: 100, wager: 10 });
  const game = store.act('fixed-id', 'hit');
  assert.equal(game.status, 'complete');
  assert.equal(game.result, 'lose');
  assert.equal(game.chips, 90);
  assert.equal(game.player.value, 29);
});

test('stand makes dealer draw and pays a win', () => {
  const store = storeWith(['10', '9', '9', '7', '2']);
  store.create({ chips: 100, wager: 10 });
  const game = store.act('fixed-id', 'stand');
  assert.equal(game.result, 'win');
  assert.equal(game.dealer.value, 18);
  assert.equal(game.chips, 110);
  assert.equal(game.dealer.hand[1].hidden, undefined);
});

test('double doubles wager, draws once, then resolves dealer', () => {
  const store = storeWith(['5', '10', '6', '6', '10', '10']);
  store.create({ chips: 100, wager: 10 });
  const game = store.act('fixed-id', 'double');
  assert.equal(game.wager, 20);
  assert.equal(game.player.value, 21);
  assert.equal(game.result, 'win');
  assert.equal(game.chips, 120);
});

test('natural blackjack pays 3:2 and reveals Jev hand', () => {
  const game = storeWith(['A', '9', 'K', '8']).create({ chips: 100, wager: 10 });
  assert.equal(game.result, 'blackjack');
  assert.equal(game.chips, 115);
  assert.equal(game.dealer.hand[1].hidden, undefined);
});

test('rejects invalid wagers and actions', () => {
  assert.throws(() => storeWith(['2', '3', '4', '5']).create({ chips: 5, wager: 10 }), /wager/);
  const store = storeWith(['10', '9', '7', '8']);
  store.create();
  assert.throws(() => store.act('fixed-id', 'split'), /action/);
  assert.equal(store.get('missing'), null);
});

test('server serves the browser app at root', async () => {
  const server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^text\/html/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
