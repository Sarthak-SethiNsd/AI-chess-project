import {
  STARTING_FEN,
  createGame,
  validatePgn,
  loadGameFromPgn,
  getFenAt,
  getFenByPositionIndex,
  getMoveList,
} from "../lib/chessEngine.js";

console.log("=== Testing chessEngine.js ===");

// 1. Test Starting Position and createGame
const newGame = createGame();
console.log("\n[Test 1] createGame():");
console.log("Starting FEN matches:", newGame.fen() === STARTING_FEN ? "PASS" : "FAIL");

// 2. Test Validation
console.log("\n[Test 2] validatePgn():");
const validPgn = `[Event "Scholar's Mate"]
[White "Scholar"]
[Black "Novice"]
[Result "1-0"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0`;

const invalidPgn = "1. e4 e5 2. invalid_move 3. z9#";

const validRes = validatePgn(validPgn);
console.log("Valid PGN parse result:", validRes.isValid ? "PASS" : "FAIL", `(Moves: ${validRes.moveCount})`);

const invalidRes = validatePgn(invalidPgn);
console.log("Invalid PGN rejection:", !invalidRes.isValid ? "PASS" : "FAIL", `(Error: "${invalidRes.error}")`);

// 3. Test loadGameFromPgn
console.log("\n[Test 3] loadGameFromPgn():");
const game = loadGameFromPgn(validPgn);
console.log("Headers parsed:", game.headers.White === "Scholar" && game.headers.Result === "1-0" ? "PASS" : "FAIL");
console.log("Total moves count (7 ply):", game.totalMoves === 7 ? "PASS" : "FAIL");
console.log("Game over flag:", game.isGameOver ? "PASS" : "FAIL");
console.log("Checkmate flag:", game.isCheckmate ? "PASS" : "FAIL");
console.log("Outcome result:", game.result === "1-0" ? "PASS" : "FAIL");

// 4. Test FEN generation at various move indices
console.log("\n[Test 4] FEN generation at move indices:");
const fenStart = getFenAt(game, -1);
console.log("Start FEN (-1):", fenStart === STARTING_FEN ? "PASS" : "FAIL");

const fenMove1 = getFenAt(game, 0); // After 1. e4
console.log("After move 0 (1. e4):", fenMove1.includes("4P3") ? "PASS" : "FAIL");
console.log("  FEN:", fenMove1);

const fenFinal = getFenAt(game, 6); // After 4. Qxf7#
console.log("Final checkmate position (move index 6):", fenFinal === game.positions[7] ? "PASS" : "FAIL");
console.log("  FEN:", fenFinal);

// Test bounds clamping
const fenClamped = getFenAt(game, 999);
console.log("Out of bounds index clamps to final:", fenClamped === fenFinal ? "PASS" : "FAIL");

// 5. Test getMoveList
console.log("\n[Test 5] getMoveList():");
const sanMoves = getMoveList(game);
console.log("SAN moves length:", sanMoves.length === 7 ? "PASS" : "FAIL");
console.log("SAN moves list:", sanMoves.join(" "));

const verboseMoves = getMoveList(game, { verbose: true });
console.log("Verbose move 0 from/to:", verboseMoves[0].from === "e2" && verboseMoves[0].to === "e4" ? "PASS" : "FAIL");
console.log("Final move checkmate SAN:", verboseMoves[6].san === "Qxf7#" ? "PASS" : "FAIL");

console.log("\n=== All Tests Completed Successfully ===");
