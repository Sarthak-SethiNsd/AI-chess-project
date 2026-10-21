/**
 * testEngineQueueStress.mjs — Part 4B of the Day 12 audit.
 *
 * Fires ~15 overlapping evaluatePosition calls without awaiting between them.
 * Uses three FENs with deterministic expectations:
 *   A) Mate-in-1 position  → score.type === 'mate'
 *   B) Starting position   → score.type === 'cp', small value
 *   C) Delivered checkmate (terminal) → returned without engine hang
 *
 * Asserts:
 *   1. Every call resolves (no hang) — enforced via a global 120-second timeout.
 *   2. Each result belongs to its OWN fen:
 *        mate-pos results have type 'mate'
 *        start-pos results have type 'cp'
 *        terminal-pos result is returned without a crash
 *   3. terminateStockfish() finishes cleanly.
 */

import { evaluatePosition, terminateStockfish } from "../lib/stockfishEngine.js";

const FENS = {
  // White to play: Qxf7# is mate in 1
  MATE_IN_1:
    "r1bqkb1r/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
  // Standard starting position
  STARTING:
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  // Delivered checkmate — White has just played Qxf7#; this FEN is AFTER the move
  TERMINAL_CHECKMATE:
    "r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4",
};

const DEPTH = 8;
const GLOBAL_TIMEOUT_MS = 120_000; // 2 minutes

// Track pass/fail
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// Global timeout: if we haven't exited within GLOBAL_TIMEOUT_MS, fail.
const globalTimer = setTimeout(() => {
  console.error("FATAL: Global timeout exceeded — engine hung or deadlocked!");
  process.exit(2);
}, GLOBAL_TIMEOUT_MS);

if (globalTimer.unref) globalTimer.unref(); // don't keep process alive just for this

console.log("=== Engine Queue Stress Test (Part 4B) ===\n");
console.log(`Sending 15 overlapping evaluatePosition calls without awaiting...`);
console.log(`FENs: mate-in-1 × 6, starting-position × 6, terminal-checkmate × 3`);
console.log(`Depth: ${DEPTH}, Global timeout: ${GLOBAL_TIMEOUT_MS / 1000}s\n`);

// Label each call so we know which FEN to expect back
const calls = [
  { label: "M1", fen: FENS.MATE_IN_1, expectType: "mate" },
  { label: "S1", fen: FENS.STARTING, expectType: "cp" },
  { label: "M2", fen: FENS.MATE_IN_1, expectType: "mate" },
  { label: "T1", fen: FENS.TERMINAL_CHECKMATE, expectType: "any" }, // terminal: engine may return cp or mate
  { label: "S2", fen: FENS.STARTING, expectType: "cp" },
  { label: "M3", fen: FENS.MATE_IN_1, expectType: "mate" },
  { label: "S3", fen: FENS.STARTING, expectType: "cp" },
  { label: "T2", fen: FENS.TERMINAL_CHECKMATE, expectType: "any" },
  { label: "M4", fen: FENS.MATE_IN_1, expectType: "mate" },
  { label: "S4", fen: FENS.STARTING, expectType: "cp" },
  { label: "M5", fen: FENS.MATE_IN_1, expectType: "mate" },
  { label: "S5", fen: FENS.STARTING, expectType: "cp" },
  { label: "T3", fen: FENS.TERMINAL_CHECKMATE, expectType: "any" },
  { label: "M6", fen: FENS.MATE_IN_1, expectType: "mate" },
  { label: "S6", fen: FENS.STARTING, expectType: "cp" },
];

// Fire all without awaiting — they queue inside stockfishEngine
const promises = calls.map(({ label, fen, expectType }) =>
  evaluatePosition(fen, { depth: DEPTH }).then((result) => ({
    label,
    fen,
    expectType,
    result,
    error: null,
  })).catch((err) => ({
    label,
    fen,
    expectType,
    result: null,
    error: err?.message || String(err),
  }))
);

// Await all — no individual timeouts needed; global timer covers hangs
const results = await Promise.all(promises);

console.log(`\n[Results]\n`);
let resolvedCount = 0;

for (const { label, fen, expectType, result, error } of results) {
  if (error) {
    console.error(`  ✗ FAIL [${label}] Rejected with error: ${error}`);
    failed++;
    continue;
  }

  resolvedCount++;
  const scoreType = result?.score?.type;
  const bestMove = result?.bestMove?.uci;

  if (expectType === "mate") {
    assert(
      scoreType === "mate",
      `[${label}] Mate-in-1 FEN returned score.type='mate' (got '${scoreType}')`
    );
    assert(
      bestMove === "h5f7",
      `[${label}] Mate-in-1 FEN best move is h5f7 (got '${bestMove}')`
    );
  } else if (expectType === "cp") {
    assert(
      scoreType === "cp",
      `[${label}] Starting FEN returned score.type='cp' (got '${scoreType}')`
    );
    assert(
      typeof result?.score?.value === "number" && isFinite(result.score.value),
      `[${label}] Starting FEN score.value is a finite number (got ${result?.score?.value})`
    );
  } else {
    // Terminal position: should not crash; we accept any valid result
    assert(
      result !== null && result !== undefined,
      `[${label}] Terminal checkmate FEN returned a non-null result without hanging`
    );
    console.log(`       (terminal score type: '${scoreType}', best: '${bestMove}')`);
  }
}

console.log(`\n[Summary of resolution]\n`);
assert(
  resolvedCount === calls.length,
  `All ${calls.length} calls resolved (no hang, no unhandled rejection) — resolved: ${resolvedCount}`
);

// Clean up
console.log(`\n[Engine Termination]\n`);
try {
  terminateStockfish();
  assert(true, "terminateStockfish() completed without throwing");
} catch (err) {
  assert(false, `terminateStockfish() threw: ${err?.message}`);
}

clearTimeout(globalTimer);

console.log(`\n=======================================================`);
console.log(`Stress Test Summary: ${passed} passed, ${failed} failed`);
console.log(`=======================================================\n`);

process.exit(failed > 0 ? 1 : 0);
