import test from "node:test";import assert from "node:assert/strict";import {card,evaluate,createGame,publicState,act,runJev} from "../src/game.js";
const cards=s=>s.split(" ").map(card);
test("evaluator recognizes wheel straight",()=>assert.equal(evaluate(cards("As 2d 3c 4h 5s 9d Tc")).name,"Straight"));
test("evaluator ranks full house",()=>assert.deepEqual(evaluate(cards("As Ad Ac Kh Ks 2d 3c")).rank.slice(0,3),[6,14,13]));
test("private Jev cards stay hidden",()=>{const g=createGame();assert.equal(publicState(g).players.jev.hole,null);assert.equal(publicState(g).players.human.hole.length,2)});
test("human can complete a hand",()=>{const g=createGame();let guard=0;while(g.hand.street!=="complete"&&guard++<30){if(g.hand.toAct==="human"){const l=publicState(g).legalActions;act(g,"human",l.check?"check":l.call?"call":"fold")}runJev(g)}assert.equal(g.hand.street,"complete");assert.equal(g.players.human.stack+g.players.jev.stack,2000)});
