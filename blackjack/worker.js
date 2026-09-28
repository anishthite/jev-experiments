const games = new Map();
const SUITS = ["clubs", "diamonds", "hearts", "spades"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

function deck() {
  const cards = SUITS.flatMap(suit => RANKS.map(rank => ({ rank, suit })));
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}
function value(hand) {
  let total = 0, aces = 0;
  for (const card of hand) {
    if (card.rank === "A") { total += 11; aces++; }
    else total += ["J", "Q", "K"].includes(card.rank) ? 10 : Number(card.rank);
  }
  while (total > 21 && aces) { total -= 10; aces--; }
  return total;
}
function card(card) { return { ...card, value: card.rank === "A" ? 11 : Math.min(Number(card.rank) || 10, 10) }; }
function settle(game, result) {
  game.status = "complete"; game.result = result;
  if (result === "blackjack") game.chips += game.wager * 2.5;
  else if (result === "win") game.chips += game.wager * 2;
  else if (result === "push") game.chips += game.wager;
}
function compare(game) {
  const player = value(game.playerHand), dealer = value(game.dealerHand);
  settle(game, dealer > 21 || player > dealer ? "win" : player < dealer ? "lose" : "push");
}
function dealerPlay(game) { while (value(game.dealerHand) < 17) game.dealerHand.push(game.deck.shift()); compare(game); }
function view(game) {
  const active = game.status === "player_turn";
  return { id: game.id, dealer: { name: "Jev", hand: active ? [card(game.dealerHand[0]), { hidden: true }] : game.dealerHand.map(card), value: active ? value([game.dealerHand[0]]) : value(game.dealerHand) }, player: { hand: game.playerHand.map(card), value: value(game.playerHand) }, chips: game.chips, wager: game.wager, status: game.status, result: game.result, availableActions: active ? ["hit", "stand", ...(game.playerHand.length === 2 && game.chips >= game.wager ? ["double"] : [])] : [] };
}
function create(body) {
  const chips = body.chips ?? 100, wager = body.wager ?? 10;
  if (!Number.isFinite(chips) || chips <= 0) throw new Error("chips must be a positive number");
  if (!Number.isFinite(wager) || wager <= 0 || wager > chips) throw new Error("wager must be positive and no greater than chips");
  const cards = deck(), game = { id: crypto.randomUUID(), deck: cards, chips: chips - wager, wager, playerHand: [], dealerHand: [], status: "player_turn", result: null };
  game.playerHand.push(cards.shift()); game.dealerHand.push(cards.shift()); game.playerHand.push(cards.shift()); game.dealerHand.push(cards.shift()); games.set(game.id, game);
  const playerBJ = value(game.playerHand) === 21, dealerBJ = value(game.dealerHand) === 21;
  if (playerBJ || dealerBJ) settle(game, playerBJ && dealerBJ ? "push" : playerBJ ? "blackjack" : "lose");
  return view(game);
}
function act(game, action) {
  if (game.status !== "player_turn") throw new Error("game is already complete");
  if (!["hit", "stand", "double"].includes(action)) throw new Error("action must be hit, stand, or double");
  if (action === "double") {
    if (game.playerHand.length !== 2) throw new Error("double is only allowed on the first two cards");
    if (game.chips < game.wager) throw new Error("not enough chips to double");
    game.chips -= game.wager; game.wager *= 2; game.playerHand.push(game.deck.shift());
    value(game.playerHand) > 21 ? settle(game, "lose") : dealerPlay(game);
  } else if (action === "hit") {
    game.playerHand.push(game.deck.shift());
    if (value(game.playerHand) > 21) settle(game, "lose"); else if (value(game.playerHand) === 21) dealerPlay(game);
  } else dealerPlay(game);
  return view(game);
}
const json = (data, status = 200) => Response.json(data, { status });
export default { async fetch(request, env) {
  const url = new URL(request.url), match = url.pathname.match(/^\/api\/games(?:\/([^/]+))?(?:\/actions)?$/);
  if (!match) return env.ASSETS.fetch(request);
  try {
    if (request.method === "POST" && url.pathname === "/api/games") return json(create(await request.json()), 201);
    const game = games.get(match[1]);
    if (!game) return json({ error: "game not found" }, 404);
    if (request.method === "GET" && !url.pathname.endsWith("/actions")) return json(view(game));
    if (request.method === "POST" && url.pathname.endsWith("/actions")) return json(act(game, (await request.json()).action));
    return json({ error: "method not allowed" }, 405);
  } catch (error) { return json({ error: error.message || "bad request" }, 400); }
} };
