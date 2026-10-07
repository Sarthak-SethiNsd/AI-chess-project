import { Chess } from "chess.js";
import { validatePgn, loadGameFromPgn } from "../lib/chessEngine.js";
import { analyseGame } from "../lib/gameAnalysis.js";
import { categorizeGame, MOVE_CATEGORIES } from "../lib/moveCategorization.js";
import {
  initStockfish,
  evaluatePosition,
  terminateStockfish,
  isEngineReady,
} from "../lib/stockfishEngine.js";

console.log("=== Running Edge-Case & Error-Handling Hardening Test Suite ===\n");

async function runEdgeCaseTests() {
  let passedCount = 0;
  let totalCount = 0;

  function assert(description, condition, details = "") {
    totalCount++;
    if (condition) {
      passedCount++;
      console.log(`  [PASS] ${description}`);
    } else {
      console.error(`  [FAIL] ${description} ${details ? `(${details})` : ""}`);
      throw new Error(`Assertion failed: ${description}`);
    }
  }

  try {
    // ============================================================
    // Edge Case 1: PGN with no moves (headers only, aborted game)
    // ============================================================
    console.log("[Test 1] PGN with no moves (headers only / aborted game):");
    const headersOnlyPgn = `[Event "Aborted Casual Match"]
[Site "Online"]
[Date "2026.10.06"]
[White "PlayerOne"]
[Black "PlayerTwo"]
[Result "*"]`;

    const val1 = validatePgn(headersOnlyPgn);
    assert("validatePgn flags headers-only as valid PGN syntax", val1.isValid === true);
    assert("validatePgn reports moveCount === 0", val1.moveCount === 0);

    const game1 = loadGameFromPgn(headersOnlyPgn);
    assert("loadGameFromPgn handles 0 moves without throwing", game1.totalMoves === 0);
    assert("moves array is empty", Array.isArray(game1.moves) && game1.moves.length === 0);
    assert("positions has only starting FEN", game1.positions.length === 1);
    assert("result is default '*'", game1.result === "*");

    const analysis1 = await analyseGame(game1, 6);
    assert("analyseGame returns empty evaluations for 0 moves", analysis1.evaluations.length === 0);
    assert("analyseGame elapsedMs is 0", analysis1.elapsedMs === 0);

    const categorized1 = categorizeGame(analysis1);
    assert("categorizeGame returns empty evaluations", categorized1.evaluations.length === 0);
    assert("categorizeGame summary totalMoves is 0", categorized1.summary.totalMoves === 0);
    assert("categorizeGame White moveCount is 0", categorized1.summary.white.moveCount === 0);
    assert("categorizeGame Black moveCount is 0", categorized1.summary.black.moveCount === 0);

    // ============================================================
    // Edge Case 2: PGN with non-standard / unusual or missing headers
    // ============================================================
    console.log("\n[Test 2] PGN with non-standard / missing headers:");
    // Case 2A: Bare move list with zero headers
    const barePgn = "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5";
    const val2A = validatePgn(barePgn);
    assert("validatePgn parses bare move list with no headers", val2A.isValid && val2A.moveCount === 6);
    const game2A = loadGameFromPgn(barePgn);
    assert("loadGameFromPgn parses bare moves without crash", game2A.totalMoves === 6);
    assert("headers object exists even if empty", typeof game2A.headers === "object");
    assert("result is inferred as '*'", game2A.result === "*");

    // Case 2B: Lowercase header tags
    const lowercaseHeadersPgn = `[white "Grandmaster A"]
[black "Grandmaster B"]
[result "1-0"]
[event "Local Championship"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0`;
    const game2B = loadGameFromPgn(lowercaseHeadersPgn);
    assert("Case-normalized White header resolves", game2B.headers.White === "Grandmaster A");
    assert("Case-normalized Black header resolves", game2B.headers.Black === "Grandmaster B");
    assert("Case-normalized Result header resolves", game2B.headers.Result === "1-0");
    assert("Case-normalized Event header resolves", game2B.headers.Event === "Local Championship");

    // ============================================================
    // Edge Case 3: Very short games (1-2 moves)
    // ============================================================
    console.log("\n[Test 3] Very short game (1 single ply: 1. e4 1-0):");
    const singleMovePgn = `[Event "Fast Resignation"]
[White "Resignee"]
[Black "Winner"]
[Result "1-0"]

1. e4 1-0`;
    const val3 = validatePgn(singleMovePgn);
    assert("validatePgn parses 1-ply game", val3.isValid && val3.moveCount === 1);
    const game3 = loadGameFromPgn(singleMovePgn);
    assert("loadGameFromPgn handles 1-ply game", game3.totalMoves === 1);
    assert("moves[0].san is 'e4'", game3.moves[0].san === "e4");

    const analysis3 = await analyseGame(game3, 6);
    assert("analyseGame evaluates 1 move", analysis3.evaluations.length === 1);
    const categorized3 = categorizeGame(analysis3);
    assert("categorizeGame handles 1-ply game", categorized3.evaluations.length === 1);
    assert("White moveCount is 1", categorized3.summary.white.moveCount === 1);
    assert("Black moveCount is 0", categorized3.summary.black.moveCount === 0);
    assert("Category sum equals 1", Object.values(categorized3.summary.categories).reduce((a, b) => a + b, 0) === 1);

    // ============================================================
    // Edge Case 4: Games ending in draw / stalemate
    // ============================================================
    console.log("\n[Test 4] Drawn game (Sam Loyd's 10-move Stalemate):");
    // Sam Loyd's famous 10-move fastest stalemate:
    // 1. e3 a5 2. Qh5 Ra6 3. Qxa5 h5 4. Qxc7 Rah6 5. h4 f6 6. Qxd7+ Kf7 7. Qxb7 Qd3 8. Qxb8 Qh7 9. Qxc8 Kg6 10. Qe6 1/2-1/2
    const stalematePgn = `[Event "Fastest Stalemate"]
[White "White"]
[Black "Black"]
[Result "1/2-1/2"]

1. e3 a5 2. Qh5 Ra6 3. Qxa5 h5 4. Qxc7 Rah6 5. h4 f6 6. Qxd7+ Kf7 7. Qxb7 Qd3 8. Qxb8 Qh7 9. Qxc8 Kg6 10. Qe6 1/2-1/2`;

    const game4 = loadGameFromPgn(stalematePgn);
    assert("Stalemate game parsed (19 ply)", game4.totalMoves === 19);
    assert("chess.isStalemate() is true", game4.isStalemate === true);
    assert("chess.isDraw() is true", game4.isDraw === true);
    assert("chess.isGameOver() is true", game4.isGameOver === true);
    assert("result is 1/2-1/2", game4.result === "1/2-1/2");

    const analysis4 = await analyseGame(game4, 6);
    assert("analyseGame completes without hanging on stalemate", analysis4.evaluations.length === 19);

    // Terminal position evaluation check
    const finalEval = analysis4.finalEval;
    assert("final position score type is 'cp' (not mate)", finalEval.score.type === "cp");
    assert("final position score value is 0", finalEval.score.value === 0);
    assert("final position whiteScore is 0", finalEval.score.whiteScore === 0);

    const categorized4 = categorizeGame(analysis4);
    assert("categorizeGame categorized all 19 moves", categorized4.evaluations.length === 19);
    // The final move 10. Qe6 blundered a massive winning advantage into stalemate:
    const lastMove = categorized4.evaluations[18];
    assert("Move 10. Qe6 (stalemating opponent from winning position) is flagged as Blunder",
      lastMove.category === MOVE_CATEGORIES.BLUNDER,
      `got ${lastMove.category}`
    );

    // ============================================================
    // Edge Case 5: Extremely long game (80 moves / 160 ply)
    // ============================================================
    console.log("\n[Test 5] Extremely long game (80 moves / 160 ply synthetic):");
    // Construct a valid repeating knight tour / shuffle game to reach 80 moves
    const longMoves = [
      "e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6", "d3", "d6",
      "Bb3", "a6", "Nbd2", "Ba7", "h3", "O-O", "Nf1", "Ne7", "Ng3", "Ng6",
    ];
    // Add knight shuffle moves to reach 160 ply
    const chessLong = new Chess();
    for (const m of longMoves) chessLong.move(m);
    // Shuffle knights back and forth
    for (let i = 0; i < 70; i++) {
      chessLong.move(i % 2 === 0 ? "Nh2" : "Nf3");
      chessLong.move(i % 2 === 0 ? "Ne7" : "Ng6");
    }
    const longPgnString = chessLong.pgn();
    const game5 = loadGameFromPgn(longPgnString);
    assert(`Long game loaded with ${game5.totalMoves} ply (>= 160)`, game5.totalMoves >= 160);

    let progressCalls = 0;
    const analysis5 = await analyseGame(game5, 4, {
      onProgress: (done, total) => {
        progressCalls++;
      },
    });
    assert("Long game analysis completed without crash", analysis5.evaluations.length === game5.totalMoves);
    assert("onProgress fired for every position", progressCalls === game5.totalMoves + 1);

    // Verify FEN alignment at beginning, middle, and end
    assert("First move FEN aligned", analysis5.evaluations[0].fenBefore === game5.positions[0]);
    const midIdx = Math.floor(game5.totalMoves / 2);
    assert("Middle move FEN aligned", analysis5.evaluations[midIdx].fenBefore === game5.positions[midIdx]);
    const lastIdx = game5.totalMoves - 1;
    assert("Last move FEN aligned", analysis5.evaluations[lastIdx].fenAfter === game5.positions[game5.totalMoves]);

    const categorized5 = categorizeGame(analysis5);
    const sum5 = Object.values(categorized5.summary.categories).reduce((a, b) => a + b, 0);
    assert("Category sum matches total moves in 160-ply game", sum5 === game5.totalMoves);

    // ============================================================
    // Edge Case 6: Malformed / corrupted PGN text
    // ============================================================
    console.log("\n[Test 6] Malformed / corrupted PGN text validation:");

    // 6A: Empty or whitespace
    assert("Empty string rejected", validatePgn("").isValid === false);
    assert("Whitespace string rejected", validatePgn("   \n\t  ").isValid === false);

    // 6B: Non-string types
    assert("null input rejected", validatePgn(null).isValid === false);
    assert("undefined input rejected", validatePgn(undefined).isValid === false);
    assert("number input rejected", validatePgn(12345).isValid === false);

    // 6C: Illegal chess moves (e.g. King jumps board)
    const illegalMovePgn = "1. e4 e5 2. Ke2 Ke7 3. Ke8#";
    const illegalVal = validatePgn(illegalMovePgn);
    assert("Illegal move rejected by validatePgn", illegalVal.isValid === false);
    assert("Error message is descriptive", typeof illegalVal.error === "string" && illegalVal.error.length > 0);

    // 6D: Corrupted syntax
    const corruptedPgn = "1. e4 e5 2. ???? z9# [Event";
    assert("Corrupted notation rejected", validatePgn(corruptedPgn).isValid === false);

    // 6E: HTML / Script injection attempt
    const xssPgn = "<script>alert('xss')</script> 1. e4 e5";
    assert("Script tag rejected", validatePgn(xssPgn).isValid === false);

    // ============================================================
    // Edge Case 7: Rapid cancellation & re-entrancy resilience
    // ============================================================
    console.log("\n[Test 7] Engine queue cancellation & re-entrancy resilience:");

    // Initialize engine
    await initStockfish();
    assert("Stockfish initialized", isEngineReady() === true);

    // Launch evaluation and immediately terminate to simulate rapid cancel/reset
    let evalPromiseRejected = false;
    const hangingPromise = evaluatePosition(game5.positions[0], 10).catch((err) => {
      evalPromiseRejected = true;
    });

    // Immediate termination
    terminateStockfish();
    assert("Engine terminated immediately", isEngineReady() === false);

    await hangingPromise;
    assert("In-flight promise rejected on termination", evalPromiseRejected === true);

    // Re-initialize and verify clean operation after termination
    const cleanEval = await evaluatePosition("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1", 6);
    assert("Engine recovers cleanly after termination", cleanEval?.bestMove?.uci !== null);

    console.log(`\n=== All Edge-Case Hardening Tests Passed! (${passedCount}/${totalCount} assertions) ===\n`);
  } catch (err) {
    console.error("\n[EDGE-CASE TEST FAILED]:", err);
    process.exit(1);
  } finally {
    terminateStockfish();
  }
}

runEdgeCaseTests();
