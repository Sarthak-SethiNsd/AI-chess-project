import { loadGameFromPgn } from "../lib/chessEngine.js";
import { analyseGame } from "../lib/gameAnalysis.js";
import { categorizeGame } from "../lib/moveCategorization.js";
import { terminateStockfish } from "../lib/stockfishEngine.js";
import {
  EVAL_CLAMP_CP,
  buildEvalSeries,
  getPointForMoveIndex,
} from "../lib/evalSeries.js";

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    passedCount++;
    console.log(`  PASS: ${testName}`);
  } else {
    failedCount++;
    console.error(`  FAIL: ${testName}${details ? ` (${details})` : ""}`);
  }
}

console.log("=== Testing Eval Series Module (lib/evalSeries.js) ===\n");

// ----------------------------------------------------------------
// Section 1: Hand-built Fixture Tests
// ----------------------------------------------------------------
console.log("[Section 1] Hand-built Fixtures & Pure Function Guards");

// Fixture 1: Normal CP values
const normalCpMoves = [
  {
    moveIndex: 0,
    ply: 1,
    moveSan: "e4",
    turn: "w",
    category: "Best",
    evalBefore: { score: { type: "cp", value: 20, whiteScore: 20 } },
    evalAfter: { score: { type: "cp", value: 45, whiteScore: 45 } },
  },
  {
    moveIndex: 1,
    ply: 2,
    moveSan: "e5",
    turn: "b",
    category: "Good",
    evalBefore: { score: { type: "cp", value: 45, whiteScore: 45 } },
    evalAfter: { score: { type: "cp", value: 30, whiteScore: -30 } },
  },
];

const normalSeries = buildEvalSeries(normalCpMoves);
assert(normalSeries.length === 3, "Normal CP fixture produces totalMoves + 1 points (3)");
assert(normalSeries[0].index === 0, "Index 0 point has index 0");
assert(normalSeries[0].whiteScore === 20 && normalSeries[0].displayScore === 20, "Index 0 score taken from first evalBefore");
assert(normalSeries[0].moveSan === null, "Index 0 moveSan is null");
assert(normalSeries[0].category === null, "Index 0 category is null");
assert(normalSeries[0].turn === null, "Index 0 turn is null");
assert(normalSeries[0].isMate === false && normalSeries[0].mateIn === null, "Index 0 isMate is false, mateIn is null");

assert(normalSeries[1].index === 1, "Index 1 point has index 1");
assert(normalSeries[1].whiteScore === 45 && normalSeries[1].displayScore === 45, "Index 1 score matches move 0 evalAfter");
assert(normalSeries[1].moveSan === "e4", "Index 1 moveSan matches move 0");
assert(normalSeries[1].category === "Best", "Index 1 category matches move 0");
assert(normalSeries[1].turn === "w", "Index 1 turn matches move 0");

assert(normalSeries[2].index === 2, "Index 2 point has index 2");
assert(normalSeries[2].whiteScore === -30 && normalSeries[2].displayScore === -30, "Index 2 score matches move 1 evalAfter");
assert(normalSeries[2].moveSan === "e5", "Index 2 moveSan matches move 1");
assert(normalSeries[2].category === "Good", "Index 2 category matches move 1");
assert(normalSeries[2].turn === "b", "Index 2 turn matches move 1");

// Fixture 2: Clamping above +1000 and below -1000
const clampedMoves = [
  {
    moveIndex: 0,
    ply: 1,
    moveSan: "Qxf7+",
    turn: "w",
    category: "Brilliant",
    evalBefore: { score: { type: "cp", value: 150, whiteScore: 150 } },
    evalAfter: { score: { type: "cp", value: 1450, whiteScore: 1450 } },
  },
  {
    moveIndex: 1,
    ply: 2,
    moveSan: "Kh8",
    turn: "b",
    category: "Mistake",
    evalBefore: { score: { type: "cp", value: 1450, whiteScore: 1450 } },
    evalAfter: { score: { type: "cp", value: -1600, whiteScore: -1600 } },
  },
];

const clampedSeries = buildEvalSeries(clampedMoves);
assert(clampedSeries[1].whiteScore === 1450, "Value above +1000 preserves whiteScore (+1450)");
assert(clampedSeries[1].displayScore === EVAL_CLAMP_CP, "Value above +1000 clamps displayScore to +EVAL_CLAMP_CP (+1000)");
assert(clampedSeries[2].whiteScore === -1600, "Value below -1000 preserves whiteScore (-1600)");
assert(clampedSeries[2].displayScore === -EVAL_CLAMP_CP, "Value below -1000 clamps displayScore to -EVAL_CLAMP_CP (-1000)");

// Fixture 3: Mate for White
const mateWhiteMoves = [
  {
    moveIndex: 0,
    ply: 1,
    moveSan: "Qh5",
    turn: "w",
    category: "Best",
    evalBefore: { score: { type: "cp", value: 0, whiteScore: 0 } },
    evalAfter: { score: { type: "mate", value: 2, whiteScore: 2 } },
  },
];
const mateWhiteSeries = buildEvalSeries(mateWhiteMoves);
assert(mateWhiteSeries[1].isMate === true, "Mate for White sets isMate = true");
assert(mateWhiteSeries[1].mateIn === 2, "Mate for White preserves mate distance (2)");
assert(mateWhiteSeries[1].displayScore === EVAL_CLAMP_CP, "Mate for White sets displayScore to +EVAL_CLAMP_CP (+1000)");
assert(mateWhiteSeries[1].whiteScore === 2, "Mate for White preserves whiteScore (2)");

// Fixture 4: Mate for Black
const mateBlackMoves = [
  {
    moveIndex: 0,
    ply: 1,
    moveSan: "Qh4#",
    turn: "b",
    category: "Best",
    evalBefore: { score: { type: "cp", value: 0, whiteScore: 0 } },
    evalAfter: { score: { type: "mate", value: -1, whiteScore: -1 } },
  },
];
const mateBlackSeries = buildEvalSeries(mateBlackMoves);
assert(mateBlackSeries[1].isMate === true, "Mate for Black sets isMate = true");
assert(mateBlackSeries[1].mateIn === -1, "Mate for Black preserves mate distance (-1)");
assert(mateBlackSeries[1].displayScore === -EVAL_CLAMP_CP, "Mate for Black sets displayScore to -EVAL_CLAMP_CP (-1000)");
assert(mateBlackSeries[1].whiteScore === -1, "Mate for Black preserves whiteScore (-1)");

// Fixture 5: Delivered checkmate at final position
const deliveredMateWhite = [
  {
    moveIndex: 0,
    ply: 1,
    moveSan: "Qxf7#",
    turn: "w",
    category: "Best",
    evalBefore: { score: { type: "mate", value: 1, whiteScore: 1 } },
    evalAfter: { score: { type: "mate", value: 0, whiteScore: 999 } },
  },
];
const deliveredWhiteSeries = buildEvalSeries(deliveredMateWhite);
assert(deliveredWhiteSeries[1].isMate === true, "Delivered checkmate by White sets isMate = true");
assert(deliveredWhiteSeries[1].mateIn === 0, "Delivered checkmate sets mateIn = 0");
assert(deliveredWhiteSeries[1].displayScore === EVAL_CLAMP_CP, "Delivered checkmate by White maps displayScore to +EVAL_CLAMP_CP (+1000)");
assert(deliveredWhiteSeries[1].whiteScore === 999, "Delivered checkmate by White preserves whiteScore (+999)");

const deliveredMateBlack = [
  {
    moveIndex: 0,
    ply: 1,
    moveSan: "Qh4#",
    turn: "b",
    category: "Best",
    evalBefore: { score: { type: "mate", value: 1, whiteScore: -1 } },
    evalAfter: { score: { type: "mate", value: 0, whiteScore: -999 } },
  },
];
const deliveredBlackSeries = buildEvalSeries(deliveredMateBlack);
assert(deliveredBlackSeries[1].isMate === true, "Delivered checkmate by Black sets isMate = true");
assert(deliveredBlackSeries[1].mateIn === 0, "Delivered checkmate by Black sets mateIn = 0");
assert(deliveredBlackSeries[1].displayScore === -EVAL_CLAMP_CP, "Delivered checkmate by Black maps displayScore to -EVAL_CLAMP_CP (-1000)");
assert(deliveredBlackSeries[1].whiteScore === -999, "Delivered checkmate by Black preserves whiteScore (-999)");

// Fixture 6: Draw / stalemate = 0
const stalemateMoves = [
  {
    moveIndex: 0,
    ply: 1,
    moveSan: "Qe6+",
    turn: "w",
    category: "Mistake",
    evalBefore: { score: { type: "cp", value: 500, whiteScore: 500 } },
    evalAfter: { score: { type: "cp", value: 0, whiteScore: 0 } },
  },
];
const stalemateSeries = buildEvalSeries(stalemateMoves);
assert(stalemateSeries[1].whiteScore === 0, "Stalemate whiteScore is 0");
assert(stalemateSeries[1].displayScore === 0, "Stalemate displayScore is 0");
assert(stalemateSeries[1].isMate === false, "Stalemate isMate is false");
assert(stalemateSeries[1].mateIn === null, "Stalemate mateIn is null");

// Fixture 7: Empty array, null, non-array inputs
assert(Array.isArray(buildEvalSeries([])), "buildEvalSeries([]) returns an array");
assert(buildEvalSeries([]).length === 0, "buildEvalSeries([]) returns empty array");
assert(buildEvalSeries(null).length === 0, "buildEvalSeries(null) returns empty array");
assert(buildEvalSeries(undefined).length === 0, "buildEvalSeries(undefined) returns empty array");
assert(buildEvalSeries("invalid").length === 0, "buildEvalSeries('invalid') returns empty array");
assert(buildEvalSeries(12345).length === 0, "buildEvalSeries(number) returns empty array");
assert(buildEvalSeries({}).length === 0, "buildEvalSeries({}) returns empty array");

// Fixture 8: NaN / missing / malformed scores do not throw
const malformedMoves = [
  {
    moveIndex: 0,
    ply: 1,
    moveSan: "e4",
    turn: "w",
    category: "Inaccuracy",
    evalBefore: null,
    evalAfter: { score: null },
  },
  {
    moveIndex: 1,
    ply: 2,
    moveSan: "e5",
    turn: "b",
    category: "Inaccuracy",
    evalBefore: undefined,
    evalAfter: { score: { type: "cp", value: NaN, whiteScore: NaN } },
  },
  {
    moveIndex: 2,
    ply: 3,
    moveSan: "Nf3",
    turn: "w",
    category: "Best",
    evalBefore: {},
    evalAfter: {},
  },
];

let didThrow = false;
let malformedSeries = [];
try {
  malformedSeries = buildEvalSeries(malformedMoves);
} catch (e) {
  didThrow = true;
}
assert(!didThrow, "buildEvalSeries does not throw on missing/NaN/malformed scores");
assert(malformedSeries.length === 4, "Malformed scores produce correct series length (4)");
assert(malformedSeries[0].displayScore === 0 && malformedSeries[0].whiteScore === 0, "Point 0 with null evalBefore has score 0");
assert(malformedSeries[1].displayScore === 0 && malformedSeries[1].whiteScore === 0, "Point 1 with null score has score 0");
assert(malformedSeries[2].displayScore === 0 && malformedSeries[2].whiteScore === 0, "Point 2 with NaN score has score 0");
assert(malformedSeries[3].displayScore === 0 && malformedSeries[3].whiteScore === 0, "Point 3 with empty evalAfter has score 0");

// Fixture 9: getPointForMoveIndex in-range, out-of-range, and invalid inputs
assert(getPointForMoveIndex(normalSeries, 0) === normalSeries[1], "getPointForMoveIndex(series, 0) returns series[1]");
assert(getPointForMoveIndex(normalSeries, 1) === normalSeries[2], "getPointForMoveIndex(series, 1) returns series[2]");
assert(getPointForMoveIndex(normalSeries, -1) === null, "getPointForMoveIndex(series, -1) returns null");
assert(getPointForMoveIndex(normalSeries, 2) === null, "getPointForMoveIndex(series, 2) out-of-range returns null");
assert(getPointForMoveIndex(normalSeries, 99) === null, "getPointForMoveIndex(series, 99) out-of-range returns null");
assert(getPointForMoveIndex(normalSeries, null) === null, "getPointForMoveIndex with null moveIndex returns null");
assert(getPointForMoveIndex(normalSeries, undefined) === null, "getPointForMoveIndex with undefined moveIndex returns null");
assert(getPointForMoveIndex(normalSeries, "0") === null, "getPointForMoveIndex with string moveIndex returns null");
assert(getPointForMoveIndex(normalSeries, 1.5) === null, "getPointForMoveIndex with float moveIndex returns null");
assert(getPointForMoveIndex(normalSeries, NaN) === null, "getPointForMoveIndex with NaN moveIndex returns null");
assert(getPointForMoveIndex(normalSeries, Infinity) === null, "getPointForMoveIndex with Infinity moveIndex returns null");
assert(getPointForMoveIndex(null, 0) === null, "getPointForMoveIndex with null series returns null");
assert(getPointForMoveIndex([], 0) === null, "getPointForMoveIndex with empty series returns null");
assert(getPointForMoveIndex("not an array", 0) === null, "getPointForMoveIndex with non-array series returns null");

// Fixture 10: Input mutation check
const inputClone = JSON.parse(JSON.stringify(normalCpMoves));
buildEvalSeries(normalCpMoves);
assert(JSON.stringify(normalCpMoves) === JSON.stringify(inputClone), "buildEvalSeries does not mutate input array or objects");

// ----------------------------------------------------------------
// Section 2: Real-Pipeline Run on Scholar's Mate
// ----------------------------------------------------------------
console.log("\n[Section 2] Real Stockfish Analysis & Categorization Pipeline Run");

const SCHOLARS_MATE_PGN = `[Event "Scholar's Mate"]
[White "Scholar"]
[Black "Novice"]
[Result "1-0"]

1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0`;

async function runRealPipelineTest() {
  try {
    const game = loadGameFromPgn(SCHOLARS_MATE_PGN);
    assert(game.totalMoves === 7, "Loaded Scholar's Mate game has 7 plies");

    const QUICK_DEPTH = 8; // Quick depth is 8
    console.log(`  Running analyseGame at Quick depth (${QUICK_DEPTH})...`);
    const analysis = await analyseGame(game, { depth: QUICK_DEPTH });
    assert(analysis.evaluations.length === 7, "Game analysis produced 7 ply evaluations");

    const categorized = categorizeGame(analysis);
    assert(categorized.evaluations.length === 7, "Categorization preserved 7 ply evaluations");

    const series = buildEvalSeries(categorized.evaluations);

    // 1. Assert exactly 8 points (7 plies + 1 starting point)
    assert(series.length === 8, "Scholar's Mate eval series has 8 points (7 plies + 1)");

    // 2. Assert starting point (index 0)
    assert(series[0].index === 0, "Series point 0 has index 0");
    assert(series[0].moveSan === null, "Series point 0 moveSan is null");
    assert(series[0].category === null, "Series point 0 category is null");
    assert(series[0].turn === null, "Series point 0 turn is null");
    assert(series[0].isMate === false, "Series point 0 is not mate");

    // 3. Assert all move categories are carried through
    let categoriesCarried = true;
    for (let i = 0; i < categorized.evaluations.length; i++) {
      const plyEval = categorized.evaluations[i];
      const seriesPoint = series[i + 1];
      if (
        seriesPoint.category !== plyEval.category ||
        seriesPoint.moveSan !== plyEval.moveSan ||
        seriesPoint.turn !== plyEval.turn
      ) {
        categoriesCarried = false;
        break;
      }
    }
    assert(categoriesCarried, "All move categories, moveSan, and turn are carried through from categorization");

    // 4. Assert the final point (index 7, move 4. Qxf7#)
    const finalPoint = series[7];
    assert(finalPoint.index === 7, "Final series point has index 7");
    assert(finalPoint.moveSan === "Qxf7#", "Final move is Qxf7#");
    assert(finalPoint.turn === "w", "Final move played by White (w)");
    assert(finalPoint.isMate === true, "Final position is checkmate (isMate: true)");
    assert(
      finalPoint.displayScore === EVAL_CLAMP_CP,
      `Final position has positive White sign at +EVAL_CLAMP_CP (+${EVAL_CLAMP_CP}) (got ${finalPoint.displayScore})`
    );
    assert(
      finalPoint.whiteScore > 0,
      `Final position whiteScore has positive White perspective score (got ${finalPoint.whiteScore})`
    );
    assert(
      finalPoint.mateIn === 0,
      `Final position mateIn is 0 for delivered checkmate (got ${finalPoint.mateIn})`
    );
    assert(
      finalPoint.category != null && typeof finalPoint.category === "string",
      `Final move has valid category (got "${finalPoint.category}")`
    );

    // 5. Assert getPointForMoveIndex for the winning move (moveIndex 6)
    const pointFromHelper = getPointForMoveIndex(series, 6);
    assert(pointFromHelper === finalPoint, "getPointForMoveIndex(series, 6) returns the final point after Qxf7#");

    console.log("\n=======================================================");
    console.log(`Results: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log("=======================================================\n");

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("\n[TEST PIPELINE ERROR]:", err);
    process.exit(1);
  } finally {
    terminateStockfish();
  }
}

runRealPipelineTest();
