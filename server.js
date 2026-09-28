import express from "express";
import { Chess } from "chess.js";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const games = new Map();
const port = Number(process.env.PORT) || 3000;
const here = path.dirname(fileURLToPath(import.meta.url));
const openRouterUrl = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const jevModel = process.env.JEV_MODEL || "~typesafe/jev-latest";

app.use(express.json());
app.use(express.static(path.join(here, "public")));

function snapshot(game) {
  const chess = game.chess;
  let result = null;
  if (chess.isCheckmate()) result = chess.turn() === "w" ? "black" : "white";
  else if (chess.isDraw()) result = "draw";
  return {
    id: game.id,
    fen: chess.fen(),
    turn: chess.turn() === "w" ? "white" : "black",
    playerColor: game.playerColor,
    status: chess.isGameOver() ? "finished" : "playing",
    result,
    check: chess.inCheck(),
    jevConfigured: Boolean(process.env.OPENROUTER_API_KEY),
    lastMove: game.lastMove,
    history: chess.history({ verbose: true }).map(({ from, to, san, color, piece, captured, promotion }) => ({ from, to, san, color, piece, captured, promotion })),
    legalMoves: chess.moves({ verbose: true }).map(({ from, to, san, promotion }) => ({ from, to, san, promotion })),
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
  };
}

function findGame(req, res) {
  const game = games.get(req.params.id);
  if (!game) res.status(404).json({ error: "Game not found" });
  return game;
}

function play(game, input) {
  if (game.chess.isGameOver()) throw new Error("Game is already over");
  const move = game.chess.move({ from: input.from, to: input.to, promotion: input.promotion || "q" });
  if (!move) throw new Error("Illegal move");
  game.lastMove = { from: move.from, to: move.to, san: move.san };
  game.updatedAt = new Date().toISOString();
  return move;
}


async function chooseJevMove(game) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error("Set OPENROUTER_API_KEY to play against Jev");
  const legalMoves = game.chess.moves({ verbose: true }).map(({ from, to, san, promotion }) => ({ from, to, san, promotion }));
  const moveIds = new Map(legalMoves.map((move) => [`${move.from}-${move.to}${move.promotion ? `-${move.promotion}` : ""}`, move]));
  const decisionsUrl = `${openRouterUrl.replace(/\/v1\/?$/, "")}/alpha/decisions`;
  const response = await fetch(decisionsUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.APP_URL || `http://localhost:${port}`,
      "X-Title": "Jev Chess",
    },
    body: JSON.stringify({
      model: jevModel,
      state: { fen: game.chess.fen(), history: game.chess.history() },
      questions: {
        move: {
          type: "choice",
          instructions: "Choose the strongest legal chess move for the side to move. Prefer checkmate, material gain, king safety, development, and positional strength in that order.",
          criteria: Object.fromEntries([...moveIds].map(([id, move]) => [id, move.san])),
        },
      },
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || `OpenRouter returned ${response.status}`);
  const selected = moveIds.get(payload.answers?.move?.choice);
  if (!selected) throw new Error("Jev returned a move that is not legal in this position");
  return selected;
}

app.post("/api/games", (req, res) => {
  const playerColor = req.body?.playerColor || "white";
  if (!["white", "black"].includes(playerColor)) return res.status(400).json({ error: "playerColor must be white or black" });
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const game = { id, playerColor, chess: new Chess(), lastMove: null, createdAt: now, updatedAt: now };
  games.set(id, game);
  res.status(201).json(snapshot(game));
});

app.get("/api/games/:id", (req, res) => {
  const game = findGame(req, res);
  if (game) res.json(snapshot(game));
});

app.post("/api/games/:id/moves", (req, res) => {
  const game = findGame(req, res);
  if (!game) return;
  const { from, to, promotion } = req.body || {};
  if (typeof from !== "string" || typeof to !== "string") return res.status(400).json({ error: "from and to are required squares, e.g. e2 and e4" });
  try {
    const move = play(game, { from, to, promotion });
    res.status(201).json({ move: { from: move.from, to: move.to, san: move.san }, game: snapshot(game) });
  } catch (error) {
    res.status(422).json({ error: error.message, legalMoves: game.chess.moves() });
  }
});

app.post("/api/games/:id/jev-move", async (req, res) => {
  const game = findGame(req, res);
  if (!game) return;
  if (game.chess.isGameOver()) return res.status(409).json({ error: "Game is already over" });
  const jevColor = game.playerColor === "white" ? "black" : "white";
  const turn = game.chess.turn() === "w" ? "white" : "black";
  if (turn !== jevColor) return res.status(409).json({ error: "It is not Jev’s turn" });
  if (game.jevRequest) return res.status(409).json({ error: "Jev is already thinking" });
  game.jevRequest = true;
  try {
    const positionBeforeRequest = game.chess.fen();
    const selected = await chooseJevMove(game);
    if (game.chess.fen() !== positionBeforeRequest) throw new Error("Position changed while Jev was thinking");
    const move = play(game, selected);
    res.status(201).json({ move: { from: move.from, to: move.to, san: move.san }, game: snapshot(game) });
  } catch (error) {
    const status = error.message.startsWith("Set OPENROUTER") ? 503 : 502;
    res.status(status).json({ error: error.message });
  } finally {
    game.jevRequest = false;
  }
});

app.get("/api", (_req, res) => res.json({ name: "Jev Chess API", endpoints: { create: "POST /api/games", game: "GET /api/games/:id", move: "POST /api/games/:id/moves", jevMove: "POST /api/games/:id/jev-move" } }));

app.listen(port, () => console.log(`Jev Chess running at http://localhost:${port}`));
