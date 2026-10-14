import { loadGameFromPgn } from "../lib/chessEngine.js";
import { analyseGame } from "../lib/gameAnalysis.js";
import { categorizeGame, MOVE_CATEGORIES } from "../lib/moveCategorization.js";
import { terminateStockfish } from "../lib/stockfishEngine.js";
import {
  CRITICAL_CATEGORIES,
  findCriticalMoves,
  getNextCriticalMove,
  getPrevCriticalMove,
} from "../lib/criticalMoves.js";

// ----------------------------------------------------------------
// Test Runner Harness
// ----------------------------------------------------------------
let passedCount = 0;
let failedCount = 0;

function assert(condition, testName) {
  if (condition) {
    passedCount++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedCount++;
    console.error(`  ✗ FAIL: ${testName}`);
  }
}

console.log("=== Testing Critical Moves Module (lib/criticalMoves.js) ===\n");

// ----------------------------------------------------------------
// Section 1: Constant Definition
// ----------------------------------------------------------------
console.log("[Test Suite 1] CRITICAL_CATEGORIES Constant");
assert(
  Array.isArray(CRITICAL_CATEGORIES) &&
    CRITICAL_CATEGORIES.length === 2 &&
    CRITICAL_CATEGORIES.includes("Mistake") &&
    CRITICAL_CATEGORIES.includes("Blunder"),
  "CRITICAL_CATEGORIES is an array containing exactly ['Mistake', 'Blunder']"
);

// ----------------------------------------------------------------
// Section 2: Hand-built Fixtures & findCriticalMoves
// ----------------------------------------------------------------
console.log("\n[Test Suite 2] Hand-built Fixtures & findCriticalMoves");

const mixedFixtures = [
  { moveIndex: 4, ply: 5, moveSan: "Bc4", turn: "w", category: "Good", evalDrop: 30 },
  { moveIndex: 1, ply: 2, moveSan: "e5", turn: "b", category: "Mistake", evalDrop: 120 },
  { moveIndex: 0, ply: 1, moveSan: "e4", turn: "w", category: "Best", evalDrop: 0 },
  { moveIndex: 3, ply: 4, moveSan: "g6", turn: "b", category: "Blunder", evalDrop: 450 },
  { moveIndex: 2, ply: 3, moveSan: "Qh5", turn: "w", category: "Inaccuracy", evalDrop: 60 },
  { moveIndex: 6, ply: 7, moveSan: "Qxh8", turn: "w", category: "Best", evalDrop: 0 },
  { moveIndex: 5, ply: 6, moveSan: "Be7", turn: "b", category: "Mistake", evalDrop: 150 },
  { moveIndex: 7, ply: 8, moveSan: "Nf6", turn: "b", category: "Brilliant", evalDrop: 0 },
  { moveIndex: 8, ply: 9, moveSan: "d4", turn: "w", category: "Blunder", evalDrop: 320 },
  { moveIndex: 9, ply: 10, moveSan: "d5", turn: "b", category: "UnknownNovelty", evalDrop: 10 },
];

// Snapshot of input to verify immutability
const originalSnapshot = JSON.stringify(mixedFixtures);

// 1. Only Mistake and Blunder returned
const bothSidesResult = findCriticalMoves(mixedFixtures);
assert(
  bothSidesResult.length === 4,
  `Returns only moves matching CRITICAL_CATEGORIES (got ${bothSidesResult.length}, expected 4)`
);
assert(
  bothSidesResult.every((m) => CRITICAL_CATEGORIES.includes(m.category)),
  "All returned moves have category 'Mistake' or 'Blunder'"
);

// 2. Sorted by moveIndex ascending even for unsorted input
const moveIndices = bothSidesResult.map((m) => m.moveIndex);
const isSorted = moveIndices.every((val, i, arr) => i === 0 || arr[i - 1] <= val);
assert(
  isSorted && JSON.stringify(moveIndices) === JSON.stringify([1, 3, 5, 8]),
  `Results are sorted by moveIndex ascending: [${moveIndices.join(", ")}] === [1, 3, 5, 8]`
);

// 3. Expected fields present on output objects
const firstCritical = bothSidesResult[0];
assert(
  firstCritical &&
    firstCritical.moveIndex === 1 &&
    firstCritical.ply === 2 &&
    firstCritical.moveSan === "e5" &&
    firstCritical.turn === "b" &&
    firstCritical.category === "Mistake" &&
    firstCritical.evalDrop === 120 &&
    Object.keys(firstCritical).length === 6,
  "Returned critical move objects carry exact fields: { moveIndex, ply, moveSan, turn, category, evalDrop }"
);

// 4. Side filter 'w' and 'white'
const whiteW = findCriticalMoves(mixedFixtures, { side: "w" });
const whiteFull = findCriticalMoves(mixedFixtures, { side: "white" });
assert(
  whiteW.length === 1 && whiteW[0].moveIndex === 8 && whiteW[0].turn === "w",
  "Side filter 'w' correctly keeps only White critical moves"
);
assert(
  JSON.stringify(whiteW) === JSON.stringify(whiteFull),
  "Side filter 'white' produces identical results to 'w'"
);

// 5. Side filter 'b' and 'black'
const blackB = findCriticalMoves(mixedFixtures, { side: "b" });
const blackFull = findCriticalMoves(mixedFixtures, { side: "black" });
assert(
  blackB.length === 3 && blackB.every((m) => m.turn === "b"),
  "Side filter 'b' correctly keeps only Black critical moves (moves 1, 3, 5)"
);
assert(
  JSON.stringify(blackB) === JSON.stringify(blackFull),
  "Side filter 'black' produces identical results to 'b'"
);

// 6. Missing or unrecognised side returns both sides
const missingSideNoOpts = findCriticalMoves(mixedFixtures);
const missingSideEmptyObj = findCriticalMoves(mixedFixtures, {});
const missingSideNull = findCriticalMoves(mixedFixtures, { side: null });
const missingSideUndefined = findCriticalMoves(mixedFixtures, { side: undefined });
const invalidSideString = findCriticalMoves(mixedFixtures, { side: "invalid" });
const invalidSideNumber = findCriticalMoves(mixedFixtures, { side: 42 });

assert(
  missingSideEmptyObj.length === 4 &&
    JSON.stringify(missingSideEmptyObj) === JSON.stringify(missingSideNoOpts),
  "Missing side in options returns moves for both sides"
);
assert(
  missingSideNull.length === 4 &&
    missingSideUndefined.length === 4 &&
    invalidSideString.length === 4 &&
    invalidSideNumber.length === 4,
  "Null, undefined, and unrecognised side values safely fallback to returning both sides"
);

// 7. Input immutability check
assert(
  JSON.stringify(mixedFixtures) === originalSnapshot,
  "findCriticalMoves does not mutate input array or its objects"
);

// 8. Robustness: null, undefined, empty, non-array, missing fields
assert(JSON.stringify(findCriticalMoves([])) === "[]", "Empty array input returns []");
assert(JSON.stringify(findCriticalMoves(null)) === "[]", "null input returns []");
assert(JSON.stringify(findCriticalMoves(undefined)) === "[]", "undefined input returns []");
assert(JSON.stringify(findCriticalMoves("not an array")) === "[]", "String input returns []");
assert(JSON.stringify(findCriticalMoves(12345)) === "[]", "Number input returns []");
assert(JSON.stringify(findCriticalMoves({})) === "[]", "Object input returns []");

// 9. Entries with missing fields or corrupt items inside array
const corruptFixtures = [
  null,
  undefined,
  "not an object",
  { category: "Blunder" }, // missing moveIndex, ply, moveSan, turn, evalDrop
  { category: "Mistake", moveIndex: 4 }, // partial fields
  { category: "Best" },
];
const corruptResult = findCriticalMoves(corruptFixtures);
assert(
  corruptResult.length === 2,
  "Safely handles null items, non-objects, and missing fields without throwing"
);
assert(
  corruptResult[0].category === "Blunder" &&
    corruptResult[0].moveIndex === null &&
    corruptResult[1].category === "Mistake" &&
    corruptResult[1].moveIndex === 4,
  "Preserves null for missing fields without runtime exceptions"
);

// ----------------------------------------------------------------
// Section 3: Navigation Helpers (getNextCriticalMove & getPrevCriticalMove)
// ----------------------------------------------------------------
console.log("\n[Test Suite 3] Navigation Helpers (getNextCriticalMove & getPrevCriticalMove)");

// Fixture with critical moves at indices 2, 5, 8 (unsorted in source array to verify no assumption of sorting)
const sampleCriticalMoves = [
  { moveIndex: 5, ply: 6, moveSan: "Be7", turn: "b", category: "Mistake", evalDrop: 150 },
  { moveIndex: 2, ply: 3, moveSan: "Qh5", turn: "w", category: "Blunder", evalDrop: 300 },
  { moveIndex: 8, ply: 9, moveSan: "d4", turn: "w", category: "Blunder", evalDrop: 280 },
];
const sampleSnapshot = JSON.stringify(sampleCriticalMoves);

// 1. From -1 (start of game before any move)
const nextFromStart = getNextCriticalMove(sampleCriticalMoves, -1);
const prevFromStart = getPrevCriticalMove(sampleCriticalMoves, -1);
assert(
  nextFromStart !== null && nextFromStart.moveIndex === 2,
  "getNextCriticalMove from -1 (start) returns first critical move (moveIndex 2)"
);
assert(
  prevFromStart === null,
  "getPrevCriticalMove from -1 (start) returns null (no moves before start)"
);

// 2. From a critical move itself (must skip current move)
const nextFrom2 = getNextCriticalMove(sampleCriticalMoves, 2);
const prevFrom2 = getPrevCriticalMove(sampleCriticalMoves, 2);
assert(
  nextFrom2 !== null && nextFrom2.moveIndex === 5,
  "getNextCriticalMove from critical move 2 skips 2 and returns 5"
);
assert(
  prevFrom2 === null,
  "getPrevCriticalMove from first critical move 2 returns null"
);

const nextFrom5 = getNextCriticalMove(sampleCriticalMoves, 5);
const prevFrom5 = getPrevCriticalMove(sampleCriticalMoves, 5);
assert(
  nextFrom5 !== null && nextFrom5.moveIndex === 8,
  "getNextCriticalMove from critical move 5 skips 5 and returns 8"
);
assert(
  prevFrom5 !== null && prevFrom5.moveIndex === 2,
  "getPrevCriticalMove from critical move 5 skips 5 and returns 2"
);

// 3. Between two critical moves
const nextFrom3 = getNextCriticalMove(sampleCriticalMoves, 3);
const prevFrom3 = getPrevCriticalMove(sampleCriticalMoves, 3);
assert(
  nextFrom3 !== null && nextFrom3.moveIndex === 5,
  "getNextCriticalMove between critical moves (at index 3) returns move 5"
);
assert(
  prevFrom3 !== null && prevFrom3.moveIndex === 2,
  "getPrevCriticalMove between critical moves (at index 3) returns move 2"
);

// 4. At the last critical move
const nextFrom8 = getNextCriticalMove(sampleCriticalMoves, 8);
const prevFrom8 = getPrevCriticalMove(sampleCriticalMoves, 8);
assert(
  nextFrom8 === null,
  "getNextCriticalMove at the last critical move (8) returns null"
);
assert(
  prevFrom8 !== null && prevFrom8.moveIndex === 5,
  "getPrevCriticalMove at the last critical move (8) returns previous move 5"
);

// 5. Before the first critical move (e.g. index 0 or 1)
const prevFrom0 = getPrevCriticalMove(sampleCriticalMoves, 0);
const nextFrom0 = getNextCriticalMove(sampleCriticalMoves, 0);
assert(
  prevFrom0 === null,
  "getPrevCriticalMove before the first critical move (at index 0) returns null"
);
assert(
  nextFrom0 !== null && nextFrom0.moveIndex === 2,
  "getNextCriticalMove before the first critical move (at index 0) returns move 2"
);

// 6. Out-of-range index
const nextFromFarNegative = getNextCriticalMove(sampleCriticalMoves, -100);
const prevFromFarNegative = getPrevCriticalMove(sampleCriticalMoves, -100);
assert(
  nextFromFarNegative !== null && nextFromFarNegative.moveIndex === 2,
  "getNextCriticalMove from out-of-range index -100 returns earliest critical move (2)"
);
assert(
  prevFromFarNegative === null,
  "getPrevCriticalMove from out-of-range index -100 returns null"
);

const nextFromFarPositive = getNextCriticalMove(sampleCriticalMoves, 999);
const prevFromFarPositive = getPrevCriticalMove(sampleCriticalMoves, 999);
assert(
  nextFromFarPositive === null,
  "getNextCriticalMove from out-of-range index 999 returns null"
);
assert(
  prevFromFarPositive !== null && prevFromFarPositive.moveIndex === 8,
  "getPrevCriticalMove from out-of-range index 999 returns latest critical move (8)"
);

// 7. Empty list
assert(
  getNextCriticalMove([], 0) === null && getPrevCriticalMove([], 0) === null,
  "getNextCriticalMove and getPrevCriticalMove on empty array return null"
);

// 8. Invalid criticalMoves input (null, non-array, undefined)
assert(
  getNextCriticalMove(null, 0) === null && getPrevCriticalMove(null, 0) === null,
  "Returns null when criticalMoves is null"
);
assert(
  getNextCriticalMove(undefined, 0) === null && getPrevCriticalMove(undefined, 0) === null,
  "Returns null when criticalMoves is undefined"
);
assert(
  getNextCriticalMove("not array", 0) === null && getPrevCriticalMove("not array", 0) === null,
  "Returns null when criticalMoves is not an array"
);

// 9. Invalid currentMoveIndex input (non-integer, NaN, null, string, float)
assert(
  getNextCriticalMove(sampleCriticalMoves, NaN) === null &&
    getPrevCriticalMove(sampleCriticalMoves, NaN) === null,
  "Returns null when currentMoveIndex is NaN"
);
assert(
  getNextCriticalMove(sampleCriticalMoves, null) === null &&
    getPrevCriticalMove(sampleCriticalMoves, null) === null,
  "Returns null when currentMoveIndex is null"
);
assert(
  getNextCriticalMove(sampleCriticalMoves, undefined) === null &&
    getPrevCriticalMove(sampleCriticalMoves, undefined) === null,
  "Returns null when currentMoveIndex is undefined"
);
assert(
  getNextCriticalMove(sampleCriticalMoves, "2") === null &&
    getPrevCriticalMove(sampleCriticalMoves, "2") === null,
  "Returns null when currentMoveIndex is a string"
);
assert(
  getNextCriticalMove(sampleCriticalMoves, 2.5) === null &&
    getPrevCriticalMove(sampleCriticalMoves, 2.5) === null,
  "Returns null when currentMoveIndex is a non-integer float"
);
assert(
  getNextCriticalMove(sampleCriticalMoves, Infinity) === null &&
    getPrevCriticalMove(sampleCriticalMoves, Infinity) === null,
  "Returns null when currentMoveIndex is Infinity"
);

// 10. Immutability check for navigation helpers
assert(
  JSON.stringify(sampleCriticalMoves) === sampleSnapshot,
  "getNextCriticalMove and getPrevCriticalMove do not mutate the input array"
);

// ----------------------------------------------------------------
// Section 4: Real Engine Pipeline Integration Test
// ----------------------------------------------------------------
console.log("\n[Test Suite 4] Real Engine Pipeline Integration");

// Queen Blunder Game (7 ply) from scripts/testMoveCategorization.mjs
const BLUNDER_PGN = `[Event "Queen Blunder"]
[White "White"]
[Black "Black"]
[Result "1-0"]

1. e4 e5 2. Qh5 g6 3. Qxe5+ Be7 4. Qxh8 1-0`;

async function testRealPipeline() {
  try {
    const game = loadGameFromPgn(BLUNDER_PGN);
    // Quick depth (depth 8 per REVIEW_DEPTH_CONFIG.Quick)
    const analysis = await analyseGame(game, { depth: 8 });
    const categorized = categorizeGame(analysis);

    console.log(`  Analyzed ${categorized.evaluations.length} half-moves with Quick depth (depth 8).`);

    const criticalMoves = findCriticalMoves(categorized.evaluations);
    console.log(`  Found ${criticalMoves.length} critical move(s):`, criticalMoves.map(m => `${m.ply}. ${m.moveSan} (${m.category})`).join(", "));

    // 1. Assert that at least one Blunder is found
    const blunders = criticalMoves.filter((m) => m.category === "Blunder");
    assert(
      blunders.length >= 1,
      `Real pipeline identifies at least one Blunder (found ${blunders.length})`
    );

    // 2. Assert that its moveIndex is a valid index into the evaluations
    const firstBlunder = blunders[0];
    const isValidIndex =
      typeof firstBlunder.moveIndex === "number" &&
      Number.isInteger(firstBlunder.moveIndex) &&
      firstBlunder.moveIndex >= 0 &&
      firstBlunder.moveIndex < categorized.evaluations.length &&
      categorized.evaluations[firstBlunder.moveIndex] !== undefined;

    assert(
      isValidIndex,
      `Blunder moveIndex (${firstBlunder.moveIndex}) is a valid index into evaluations array (length ${categorized.evaluations.length})`
    );

    // Verify moveIndex corresponds to the same move in categorized evaluations
    const correspondingEval = categorized.evaluations[firstBlunder.moveIndex];
    assert(
      correspondingEval.moveSan === firstBlunder.moveSan &&
        correspondingEval.turn === firstBlunder.turn &&
        correspondingEval.category === firstBlunder.category,
      `Critical move matches evaluation record at moveIndex ${firstBlunder.moveIndex} (${firstBlunder.moveSan})`
    );

    // Verify next/prev navigation on real game critical moves
    const nextFromStartReal = getNextCriticalMove(criticalMoves, -1);
    assert(
      nextFromStartReal !== null && nextFromStartReal.moveIndex === criticalMoves[0].moveIndex,
      `getNextCriticalMove on real game critical moves correctly navigates from start (-1) to first critical move (${nextFromStartReal.moveSan})`
    );

  } catch (err) {
    failedCount++;
    console.error("  ✗ FAIL: Real pipeline encountered an error:", err);
  } finally {
    terminateStockfish();
  }
}

async function main() {
  await testRealPipeline();

  console.log("\n========================================================");
  console.log(`SUMMARY: ${passedCount} passed, ${failedCount} failed`);
  console.log("========================================================");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main();
