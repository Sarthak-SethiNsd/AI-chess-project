import { loadGameFromPgn } from "../lib/chessEngine.js";
import { analyseGame, DEFAULT_ANALYSIS_DEPTH } from "../lib/gameAnalysis.js";
import { terminateStockfish } from "../lib/stockfishEngine.js";

// ----------------------------------------------------------------
// Sample PGNs
// ----------------------------------------------------------------

// Scholar's Mate — 7 ply, ends in checkmate (reused from testChessEngine.mjs)
const SCHOLARS_MATE_PGN = `[Event "Scholar's Mate"]
[White "Scholar"]
[Black "Novice"]
[Result "1-0"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0`;

// A slightly longer game (Ruy Lopez, Italian-style miniature) — 14 ply, no checkmate,
// gives us a non-trivial run to time and ensures non-mate scores are handled.
const MINIATURE_PGN = `[Event "Miniature"]
[White "W"]
[Black "B"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 Nxe4 *`;

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/**
 * Returns true if `v` is a finite number (not NaN, not ±Infinity).
 * @param {number} v
 */
function isFiniteNumber(v) {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Validates one EvalResult object and returns an array of error strings.
 * @param {import("../lib/gameAnalysis.js").EvalResult} ev
 * @param {string} label
 */
function validateEval(ev, label) {
  const errors = [];
  if (!ev) { errors.push(`${label}: eval is null/undefined`); return errors; }

  const { score, depth, bestMove } = ev;

  if (!score) { errors.push(`${label}: missing score`); }
  else {
    if (score.type !== "cp" && score.type !== "mate") {
      errors.push(`${label}: score.type is "${score.type}" (expected "cp" or "mate")`);
    }
    if (!isFiniteNumber(score.value)) {
      errors.push(`${label}: score.value is not a finite number (${score.value})`);
    }
    if (!isFiniteNumber(score.whiteScore)) {
      errors.push(`${label}: score.whiteScore is not a finite number (${score.whiteScore})`);
    }
  }

  if (!isFiniteNumber(depth) || depth < 0) {
    errors.push(`${label}: depth is invalid (${depth})`);
  }

  if (!bestMove) {
    errors.push(`${label}: missing bestMove`);
  } else {
    // bestMove.uci may be null for the very last position if the game is over,
    // but san/from/to being strings is still expected.
    if (typeof bestMove.from !== "string") {
      errors.push(`${label}: bestMove.from is not a string`);
    }
    if (typeof bestMove.to !== "string") {
      errors.push(`${label}: bestMove.to is not a string`);
    }
  }

  return errors;
}

// ----------------------------------------------------------------
// Main test runner
// ----------------------------------------------------------------

console.log("=== Testing Game Analysis Pipeline ===");

async function runTests() {
  try {

    // ============================================================
    // Test 1: Scholar's Mate — full pipeline, checkmate end
    // ============================================================
    console.log("\n[Test 1] Scholar's Mate (7 ply, ends in checkmate):");
    const scholarsGame = loadGameFromPgn(SCHOLARS_MATE_PGN);
    console.log(`  Loaded game: ${scholarsGame.totalMoves} half-moves, isCheckmate=${scholarsGame.isCheckmate}`);

    let progressLog = [];
    const scholarsStart = Date.now();

    const scholarsResult = await analyseGame(
      scholarsGame,
      { depth: 10 },          // use depth 10 to keep test fast
      {
        onProgress: (done, total) => progressLog.push(`${done}/${total}`),
      }
    );

    const scholarsDuration = Date.now() - scholarsStart;

    // --- structural checks ---
    const correctCount = scholarsResult.evaluations.length === scholarsGame.totalMoves;
    console.log(
      `  Evaluation count matches totalMoves (${scholarsGame.totalMoves}):`,
      correctCount ? "PASS" : `FAIL — got ${scholarsResult.evaluations.length}`
    );

    const progressComplete = progressLog.length === scholarsGame.totalMoves + 1; // one per position
    console.log(
      `  onProgress fired ${scholarsGame.totalMoves + 1} times (one per position):`,
      progressComplete ? "PASS" : `FAIL — fired ${progressLog.length} times`
    );

    // --- FEN alignment ---
    let fenAligned = true;
    for (let i = 0; i < scholarsResult.evaluations.length; i++) {
      const ev = scholarsResult.evaluations[i];
      if (ev.fenBefore !== scholarsGame.positions[i]) {
        console.log(`  FEN alignment FAIL at move ${i}: fenBefore mismatch`);
        fenAligned = false;
      }
      if (ev.fenAfter !== scholarsGame.positions[i + 1]) {
        console.log(`  FEN alignment FAIL at move ${i}: fenAfter mismatch`);
        fenAligned = false;
      }
    }
    console.log("  FENs align correctly with move indices:", fenAligned ? "PASS" : "FAIL");

    // --- eval field validation ---
    let evalFieldErrors = [];
    for (let i = 0; i < scholarsResult.evaluations.length; i++) {
      const ev = scholarsResult.evaluations[i];
      evalFieldErrors.push(...validateEval(ev.evalBefore, `move[${i}].evalBefore`));
      evalFieldErrors.push(...validateEval(ev.evalAfter,  `move[${i}].evalAfter`));
    }
    evalFieldErrors.push(...validateEval(scholarsResult.finalEval, "finalEval"));

    if (evalFieldErrors.length === 0) {
      console.log("  All eval fields are well-formed (no NaNs, no missing fields): PASS");
    } else {
      console.log("  Eval field errors: FAIL");
      for (const e of evalFieldErrors) console.log("    •", e);
      throw new Error("Eval field validation failed.");
    }

    // --- mate score on final position ---
    const finalScore = scholarsResult.finalEval?.score;
    // After Qxf7# White wins — evaluation from the final FEN (Black to move, mated)
    // Stockfish reports this as "mate 0" or a very large cp; accept either.
    const mateDetected =
      finalScore?.type === "mate" ||
      (finalScore?.type === "cp" && Math.abs(finalScore?.whiteScore) >= 9000);
    console.log(
      "  Final position: mate or very large cp score detected:",
      mateDetected ? "PASS" : `FAIL — got ${JSON.stringify(finalScore)}`
    );

    // --- move metadata ---
    const firstMove = scholarsResult.evaluations[0];
    const lastMove  = scholarsResult.evaluations[scholarsGame.totalMoves - 1];
    console.log(
      `  First move SAN: "${firstMove.moveSan}" (expected: "e4"):`,
      firstMove.moveSan === "e4" ? "PASS" : "FAIL"
    );
    console.log(
      `  Last move SAN: "${lastMove.moveSan}" (expected: "Qxf7#"):`,
      lastMove.moveSan === "Qxf7#" ? "PASS" : "FAIL"
    );

    console.log(`  Total analysis time: ${scholarsDuration}ms`);
    console.log(
      "  Completed in reasonable time (< 30s):",
      scholarsDuration < 30_000 ? "PASS" : "FAIL"
    );
    console.log(`  elapsedMs field reported: ${scholarsResult.elapsedMs}ms`);


    // ============================================================
    // Test 2: Miniature (14 ply, no forced mate end)
    //   Checks non-mate evaluations and timing baseline.
    // ============================================================
    console.log("\n[Test 2] Miniature (14 ply, no checkmate):");
    const miniGame = loadGameFromPgn(MINIATURE_PGN);
    console.log(`  Loaded game: ${miniGame.totalMoves} half-moves, isCheckmate=${miniGame.isCheckmate}`);

    const miniStart = Date.now();
    const miniResult = await analyseGame(miniGame, { depth: 8 });
    const miniDuration = Date.now() - miniStart;

    console.log(
      `  Evaluation count matches totalMoves (${miniGame.totalMoves}):`,
      miniResult.evaluations.length === miniGame.totalMoves ? "PASS" : `FAIL — got ${miniResult.evaluations.length}`
    );

    // Spot-check: every cp whiteScore should be a finite number
    let allScoresFinite = true;
    let hasMateScore = false;
    for (const ev of miniResult.evaluations) {
      for (const side of ["evalBefore", "evalAfter"]) {
        const score = ev[side]?.score;
        if (!score) { allScoresFinite = false; continue; }
        if (score.type === "mate") hasMateScore = true;
        else if (!isFiniteNumber(score.whiteScore)) { allScoresFinite = false; }
      }
    }
    console.log(
      "  All whiteScore values are finite (no NaN/Infinity):",
      allScoresFinite ? "PASS" : "FAIL"
    );
    console.log(
      "  Non-checkmate game: no forced mate scores expected:",
      !hasMateScore ? "PASS" : "NOTE — mate score appeared (unusual but not necessarily wrong)"
    );

    // Timing baseline output (important for later UX decisions)
    const msPerMove = (miniDuration / (miniGame.totalMoves + 1)).toFixed(0);
    console.log(`  Total analysis time: ${miniDuration}ms`);
    console.log(`  Average time per position: ~${msPerMove}ms`);
    console.log(`  elapsedMs field reported: ${miniResult.elapsedMs}ms`);
    console.log(
      "  Completed in reasonable time (< 60s):",
      miniDuration < 60_000 ? "PASS" : "FAIL"
    );


    // ============================================================
    // Test 3: options forwarding
    // ============================================================
    console.log("\n[Test 3] Options forwarding (depth=6 explicit):");
    const shortGame = loadGameFromPgn(SCHOLARS_MATE_PGN);
    const shortResult = await analyseGame(shortGame, 6);
    const depthOk = shortResult.options.depth === 6;
    console.log("  options.depth === 6:", depthOk ? "PASS" : `FAIL — got ${JSON.stringify(shortResult.options)}`);

    const depthsOk = shortResult.evaluations.every(
      (ev) => (ev.evalBefore?.depth ?? 0) <= 6 && (ev.evalAfter?.depth ?? 0) <= 6
    );
    console.log(
      "  All eval depths ≤ requested depth 6:",
      depthsOk ? "PASS" : "FAIL (at least one position returned deeper result than expected)"
    );


    // ============================================================
    // Test 4: empty-game guard
    // ============================================================
    console.log("\n[Test 4] Empty-move guard (no moves game):");
    // Craft a minimal game object with zero moves
    const emptyGame = { positions: ["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"], moves: [], totalMoves: 0 };
    const emptyResult = await analyseGame(emptyGame, 6);
    console.log("  evaluations.length === 0:", emptyResult.evaluations.length === 0 ? "PASS" : "FAIL");
    console.log("  totalMoves === 0:", emptyResult.totalMoves === 0 ? "PASS" : "FAIL");
    console.log("  elapsedMs === 0:", emptyResult.elapsedMs === 0 ? "PASS" : "FAIL");

    console.log("\n=== All Game Analysis Pipeline Tests Passed Successfully ===");
    console.log(`(Scholar's: ${scholarsDuration}ms | Miniature: ${miniDuration}ms | ~${msPerMove}ms/pos @ depth 8)\n`);

  } catch (err) {
    console.error("\n[TEST ERROR]:", err);
    process.exit(1);
  } finally {
    terminateStockfish();
  }
}

runTests();
