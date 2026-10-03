import {
  initStockfish,
  evaluatePosition,
  isEngineReady,
  terminateStockfish,
} from "../lib/stockfishEngine.js";

console.log("=== Testing Stockfish Engine Integration ===");

async function runTests() {
  const overallStart = Date.now();

  try {
    // ----------------------------------------------------
    // Test 1: Engine Initialization
    // ----------------------------------------------------
    console.log("\n[Test 1] Initializing Stockfish Engine:");
    const initStart = Date.now();
    await initStockfish();
    const initDuration = Date.now() - initStart;

    const ready = isEngineReady();
    console.log(`Engine ready: ${ready ? "PASS" : "FAIL"} (Handshake completed in ${initDuration}ms)`);
    if (!ready) {
      throw new Error("Engine failed to reach ready state.");
    }

    // ----------------------------------------------------
    // Test 2: Mate-in-1 Position (Scholar's Mate Threat)
    // ----------------------------------------------------
    console.log("\n[Test 2] Evaluating Known Mate-in-1 Position:");
    // Position: 1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6?? -> Qxf7# is mate in 1
    const mateInOneFen = "r1bqkb1r/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4";
    console.log("FEN:", mateInOneFen);

    const mateStart = Date.now();
    const mateResult = await evaluatePosition(mateInOneFen, { depth: 10 });
    const mateDuration = Date.now() - mateStart;

    console.log("Evaluation Result:");
    console.log("  Best move (UCI):", mateResult.bestMove.uci);
    console.log("  Best move (SAN):", mateResult.bestMove.san);
    console.log("  Score:", mateResult.score);
    console.log("  Depth reached:", mateResult.depth);
    console.log("  Time taken:", `${mateDuration}ms`);

    const isUciCorrect = mateResult.bestMove.uci === "h5f7";
    const isSanCorrect = mateResult.bestMove.san === "Qxf7#";
    const isScoreMate = mateResult.score.type === "mate" && mateResult.score.value === 1;

    console.log("Best move UCI matches 'h5f7':", isUciCorrect ? "PASS" : "FAIL");
    console.log("Best move SAN matches 'Qxf7#':", isSanCorrect ? "PASS" : "FAIL");
    console.log("Score identified as mate in 1:", isScoreMate ? "PASS" : "FAIL");
    console.log("Reasonable calculation time (< 3000ms):", mateDuration < 3000 ? "PASS" : "FAIL");

    if (!isUciCorrect || !isSanCorrect || !isScoreMate) {
      throw new Error("Mate in 1 evaluation failed assertion checks.");
    }

    // ----------------------------------------------------
    // Test 3: Starting Position Evaluation
    // ----------------------------------------------------
    console.log("\n[Test 3] Evaluating Standard Starting Position:");
    const startingFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    console.log("FEN:", startingFen);

    const startposStart = Date.now();
    const startposResult = await evaluatePosition(startingFen, 10);
    const startposDuration = Date.now() - startposStart;

    console.log("Evaluation Result:");
    console.log("  Best move (UCI):", startposResult.bestMove.uci);
    console.log("  Best move (SAN):", startposResult.bestMove.san);
    console.log("  Score:", startposResult.score);
    console.log("  Depth reached:", startposResult.depth);
    console.log("  Time taken:", `${startposDuration}ms`);

    const validFirstMoves = ["e2e4", "d2d4", "g1f3", "c2c4"];
    const isMoveReasonable = validFirstMoves.includes(startposResult.bestMove.uci);
    const isCpScore = startposResult.score.type === "cp";
    const isScorePlausible = startposResult.score.value >= -50 && startposResult.score.value <= 150;

    console.log("Opening move is standard (e4/d4/Nf3/c4):", isMoveReasonable ? "PASS" : "FAIL");
    console.log("Score is centipawns:", isCpScore ? "PASS" : "FAIL");
    console.log("Score is balanced (-50 to +150 cp):", isScorePlausible ? "PASS" : "FAIL");
    console.log("Target depth 10 reached:", startposResult.depth >= 10 ? "PASS" : "FAIL");
    console.log("Reasonable calculation time (< 4000ms):", startposDuration < 4000 ? "PASS" : "FAIL");

    if (!isMoveReasonable || !isCpScore || !isScorePlausible || startposResult.depth < 10) {
      throw new Error("Starting position evaluation failed assertion checks.");
    }

    // ----------------------------------------------------
    // Test 4: Concurrency / Request Queuing
    // ----------------------------------------------------
    console.log("\n[Test 4] Request Queuing (Concurrent evaluation calls):");
    const fenA = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2"; // 1. e4 e5
    const fenB = "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2"; // 1. e4 c5

    const [resA, resB] = await Promise.all([
      evaluatePosition(fenA, { depth: 8 }),
      evaluatePosition(fenB, { depth: 8 }),
    ]);

    console.log("Queued call A returned valid move:", Boolean(resA?.bestMove?.uci) ? "PASS" : "FAIL", `(${resA?.bestMove?.san})`);
    console.log("Queued call B returned valid move:", Boolean(resB?.bestMove?.uci) ? "PASS" : "FAIL", `(${resB?.bestMove?.san})`);

    // ----------------------------------------------------
    // Test 5: Engine Lifecycle Cleanup
    // ----------------------------------------------------
    console.log("\n[Test 5] Engine Termination and Cleanup:");
    terminateStockfish();
    const readyAfterTerm = isEngineReady();
    console.log("Engine terminated successfully:", !readyAfterTerm ? "PASS" : "FAIL");

    const totalDuration = Date.now() - overallStart;
    console.log(`\n=== All Stockfish Engine Tests Passed Successfully (${totalDuration}ms) ===\n`);
  } catch (err) {
    console.error("\n[TEST ERROR]:", err);
    terminateStockfish();
    process.exit(1);
  }
}

runTests();
