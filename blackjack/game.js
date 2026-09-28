const { randomUUID } = require('node:crypto');

const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function createDeck(rng = Math.random) {
  const deck = SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit })));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function handValue(hand) {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    if (card.rank === 'A') { total += 11; aces++; }
    else if (['J', 'Q', 'K'].includes(card.rank)) total += 10;
    else total += Number(card.rank);
  }
  while (total > 21 && aces) { total -= 10; aces--; }
  return { total, soft: aces > 0 };
}

function publicCard(card) {
  return { ...card, value: card.rank === 'A' ? 11 : Math.min(Number(card.rank) || 10, 10) };
}

function createGameStore(options = {}) {
  const games = new Map();
  const deckFactory = options.deckFactory || (() => createDeck(options.rng));
  const idFactory = options.idFactory || randomUUID;

  function settle(game, result) {
    game.status = 'complete';
    game.result = result;
    if (result === 'blackjack') game.chips += game.wager * 2.5;
    else if (result === 'win') game.chips += game.wager * 2;
    else if (result === 'push') game.chips += game.wager;
  }

  function compare(game) {
    const player = handValue(game.playerHand).total;
    const dealer = handValue(game.dealerHand).total;
    if (dealer > 21 || player > dealer) settle(game, 'win');
    else if (player < dealer) settle(game, 'lose');
    else settle(game, 'push');
  }

  function dealerPlay(game) {
    while (handValue(game.dealerHand).total < 17) game.dealerHand.push(game.deck.shift());
    compare(game);
  }

  function view(game) {
    const active = game.status === 'player_turn';
    const dealerHand = active
      ? [publicCard(game.dealerHand[0]), { hidden: true }]
      : game.dealerHand.map(publicCard);
    return {
      id: game.id,
      dealer: { name: 'Jev', hand: dealerHand, value: active ? handValue([game.dealerHand[0]]).total : handValue(game.dealerHand).total },
      player: { hand: game.playerHand.map(publicCard), value: handValue(game.playerHand).total },
      chips: game.chips,
      wager: game.wager,
      status: game.status,
      result: game.result,
      availableActions: active ? ['hit', 'stand', ...(game.playerHand.length === 2 && game.chips >= game.wager ? ['double'] : [])] : []
    };
  }

  function create({ chips = 100, wager = 10 } = {}) {
    if (!Number.isFinite(chips) || chips <= 0) throw new Error('chips must be a positive number');
    if (!Number.isFinite(wager) || wager <= 0 || wager > chips) throw new Error('wager must be positive and no greater than chips');
    const deck = deckFactory();
    if (!Array.isArray(deck) || deck.length < 4) throw new Error('deck must contain at least four cards');
    const game = { id: idFactory(), deck: deck.slice(), chips: chips - wager, wager, playerHand: [], dealerHand: [], status: 'player_turn', result: null };
    game.playerHand.push(game.deck.shift());
    game.dealerHand.push(game.deck.shift());
    game.playerHand.push(game.deck.shift());
    game.dealerHand.push(game.deck.shift());
    games.set(game.id, game);
    const playerBlackjack = handValue(game.playerHand).total === 21;
    const dealerBlackjack = handValue(game.dealerHand).total === 21;
    if (playerBlackjack || dealerBlackjack) settle(game, playerBlackjack && dealerBlackjack ? 'push' : playerBlackjack ? 'blackjack' : 'lose');
    return view(game);
  }

  function get(id) {
    const game = games.get(id);
    return game ? view(game) : null;
  }

  function act(id, action) {
    const game = games.get(id);
    if (!game) return null;
    if (game.status !== 'player_turn') throw new Error('game is already complete');
    if (!['hit', 'stand', 'double'].includes(action)) throw new Error('action must be hit, stand, or double');
    if (action === 'double') {
      if (game.playerHand.length !== 2) throw new Error('double is only allowed on the first two cards');
      if (game.chips < game.wager) throw new Error('not enough chips to double');
      game.chips -= game.wager;
      game.wager *= 2;
      game.playerHand.push(game.deck.shift());
      if (handValue(game.playerHand).total > 21) settle(game, 'lose');
      else dealerPlay(game);
    } else if (action === 'hit') {
      game.playerHand.push(game.deck.shift());
      if (handValue(game.playerHand).total > 21) settle(game, 'lose');
      else if (handValue(game.playerHand).total === 21) dealerPlay(game);
    } else dealerPlay(game);
    return view(game);
  }

  return { create, get, act };
}

module.exports = { createDeck, handValue, createGameStore };
