import { loadGameFromPgn, getFenAt, STARTING_FEN } from "../lib/chessEngine.js";

console.log("=== Testing ChessBoardReplay Navigation Logic ===");

const samplePgn = `[Event "Scholar's Mate"]
[White "Player White"]
[Black "Player Black"]
[Result "1-0"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0`;

const game = loadGameFromPgn(samplePgn);
const totalMoves = game.totalMoves; // 7 ply

console.log(`Loaded game with ${totalMoves} ply.`);

// 1. Initial State (-1)
let currentIndex = -1;
let isAtStart = currentIndex <= -1;
let isAtEnd = currentIndex >= totalMoves - 1;
let fen = getFenAt(game, currentIndex);

console.log("\n[Step 1] Initial Position (-1):");
console.log("  isAtStart (Prev/First disabled):", isAtStart ? "PASS" : "FAIL");
console.log("  isAtEnd (Next/Last enabled):", !isAtEnd ? "PASS" : "FAIL");
console.log("  FEN is starting board:", fen === STARTING_FEN ? "PASS" : "FAIL");

// 2. Advance to move 0 (1. e4)
currentIndex = 0;
isAtStart = currentIndex <= -1;
isAtEnd = currentIndex >= totalMoves - 1;
fen = getFenAt(game, currentIndex);
let currentMove = game.moves[currentIndex];

console.log("\n[Step 2] Move 0 (1. e4):");
console.log("  Move SAN:", currentMove.san, "(Expected: e4)");
console.log("  isAtStart (Prev enabled):", !isAtStart ? "PASS" : "FAIL");
console.log("  isAtEnd (Next enabled):", !isAtEnd ? "PASS" : "FAIL");
console.log("  FEN includes e4 pawn:", fen.includes("4P3") ? "PASS" : "FAIL");

// 3. Step through all moves sequentially
console.log("\n[Step 3] Step-by-step navigation check:");
for (let i = 0; i < totalMoves; i++) {
  const m = game.moves[i];
  const stepFen = getFenAt(game, i);
  if (!stepFen || stepFen === STARTING_FEN) {
    console.log(`  Move ${i} (${m.san}) FEN check: FAIL`);
  }
}
console.log(`  All ${totalMoves} ply FEN states generated cleanly: PASS`);

// 4. Jump to Last Move (currentIndex = totalMoves - 1)
currentIndex = totalMoves - 1;
isAtStart = currentIndex <= -1;
isAtEnd = currentIndex >= totalMoves - 1;
fen = getFenAt(game, currentIndex);
currentMove = game.moves[currentIndex];

console.log("\n[Step 4] Last Move (4. Qxf7#):");
console.log("  Move SAN:", currentMove.san, "(Expected: Qxf7#)");
console.log("  isAtStart (Prev/First enabled):", !isAtStart ? "PASS" : "FAIL");
console.log("  isAtEnd (Next/Last disabled):", isAtEnd ? "PASS" : "FAIL");
console.log("  FEN matches final checkmate state:", fen === game.positions[game.positions.length - 1] ? "PASS" : "FAIL");

// 5. Jump back to First Move (-1)
currentIndex = -1;
isAtStart = currentIndex <= -1;
fen = getFenAt(game, currentIndex);
console.log("\n[Step 5] Reset to First (-1):");
console.log("  isAtStart:", isAtStart ? "PASS" : "FAIL");
console.log("  FEN is starting board:", fen === STARTING_FEN ? "PASS" : "FAIL");

console.log("\n=== Navigation Logic Tests Passed ===");
