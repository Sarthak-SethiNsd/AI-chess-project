import {
  getSeriesIndexFromX,
  formatEvalText,
  formatPointLabel,
} from "../lib/evalGraphInteraction.js";
import { getGraphPoints } from "../lib/evalGraphGeometry.js";

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

console.log("=== Testing Eval Graph Interaction (lib/evalGraphInteraction.js) ===\n");

const LAYOUT = { width: 600, height: 160, padding: 8 };
// innerWidth = 584, so for n points: point i at 8 + (i/(n-1))*584

// ----------------------------------------------------------------
// [Section 1] getSeriesIndexFromX
// ----------------------------------------------------------------
console.log("[Section 1] getSeriesIndexFromX");

// === Basic clamping and edges ===

// Left edge: x = padding → index 0
assert(
  getSeriesIndexFromX(8, { ...LAYOUT, pointCount: 5 }) === 0,
  "Left edge (x=padding) → index 0"
);

// Right edge: x = width - padding → last index
assert(
  getSeriesIndexFromX(592, { ...LAYOUT, pointCount: 5 }) === 4,
  "Right edge (x=width-padding) → index 4"
);

// Middle: 5 points, x at midpoint (index 2 at x = 8 + 2/4 * 584 = 8 + 292 = 300)
assert(
  getSeriesIndexFromX(300, { ...LAYOUT, pointCount: 5 }) === 2,
  "Middle x=300 with 5 points → index 2"
);

// Beyond left: x < padding should clamp to 0
assert(
  getSeriesIndexFromX(-10, { ...LAYOUT, pointCount: 4 }) === 0,
  "x < padding clamps to 0"
);

// Beyond right: x > width - padding should clamp to last index
assert(
  getSeriesIndexFromX(650, { ...LAYOUT, pointCount: 4 }) === 3,
  "x > width-padding clamps to last index (3)"
);

// Padding boundary: x = exactly padding (index 0)
assert(
  getSeriesIndexFromX(8, { ...LAYOUT, pointCount: 8 }) === 0,
  "x exactly at left padding → index 0"
);
assert(
  getSeriesIndexFromX(592, { ...LAYOUT, pointCount: 8 }) === 7,
  "x exactly at right padding → index 7"
);

// Single point always returns 0
assert(
  getSeriesIndexFromX(0, { ...LAYOUT, pointCount: 1 }) === 0,
  "Single point: any x → 0 (left)"
);
assert(
  getSeriesIndexFromX(300, { ...LAYOUT, pointCount: 1 }) === 0,
  "Single point: x=300 → 0 (center)"
);
assert(
  getSeriesIndexFromX(1000, { ...LAYOUT, pointCount: 1 }) === 0,
  "Single point: x=1000 → 0 (right)"
);

// === Invalid inputs ===
assert(getSeriesIndexFromX(NaN, { ...LAYOUT, pointCount: 5 }) === null, "NaN x → null");
assert(getSeriesIndexFromX(Infinity, { ...LAYOUT, pointCount: 5 }) === null, "Infinity x → null");
assert(getSeriesIndexFromX(undefined, { ...LAYOUT, pointCount: 5 }) === null, "undefined x → null");
assert(getSeriesIndexFromX(100, { ...LAYOUT, pointCount: 0 }) === null, "pointCount=0 → null");
assert(getSeriesIndexFromX(100, { ...LAYOUT, pointCount: -1 }) === null, "pointCount=-1 → null");
assert(getSeriesIndexFromX(100, { ...LAYOUT, pointCount: NaN }) === null, "pointCount=NaN → null");
assert(getSeriesIndexFromX(100, {}) === null, "missing pointCount → null");

// === Agreement with getGraphPoints x positions ===
console.log("\n  [Agreement with getGraphPoints x positions]");

const agreementSeries = [
  { index: 0, displayScore: 0 },
  { index: 1, displayScore: 100 },
  { index: 2, displayScore: -200 },
  { index: 3, displayScore: 500 },
  { index: 4, displayScore: -1000 },
];
const graphPoints = getGraphPoints(agreementSeries, LAYOUT);
let allAgreed = true;
for (let i = 0; i < graphPoints.length; i++) {
  const result = getSeriesIndexFromX(graphPoints[i].x, { ...LAYOUT, pointCount: graphPoints.length });
  if (result !== i) {
    allAgreed = false;
    console.error(`    Mismatch at i=${i}: x=${graphPoints[i].x} → got ${result}, expected ${i}`);
  }
}
assert(allAgreed, "Nearest index of each point's own x == that point's index (agreement with getGraphPoints)");

// ----------------------------------------------------------------
// [Section 2] formatEvalText
// ----------------------------------------------------------------
console.log("\n[Section 2] formatEvalText");

// Positive cp
assert(
  formatEvalText({ isMate: false, mateIn: null, whiteScore: 35 }) === "+0.35",
  "Positive cp 35 → '+0.35'"
);

// Negative cp
assert(
  formatEvalText({ isMate: false, mateIn: null, whiteScore: -120 }) === "-1.20",
  "Negative cp -120 → '-1.20'"
);

// Zero / draw
assert(
  formatEvalText({ isMate: false, mateIn: null, whiteScore: 0 }) === "+0.00",
  "Zero cp → '+0.00'"
);

// Clamped value: displayScore = 1000 but whiteScore may be larger (raw)
assert(
  formatEvalText({ isMate: false, mateIn: null, whiteScore: 1450 }) === "+14.50",
  "whiteScore 1450 (clamped in display, raw preserved) → '+14.50'"
);
assert(
  formatEvalText({ isMate: false, mateIn: null, whiteScore: -1600 }) === "-16.00",
  "whiteScore -1600 (clamped in display, raw preserved) → '-16.00'"
);

// Active mate for White (whiteScore > 0, mateIn > 0 in UCI: side-to-move is mating)
assert(
  formatEvalText({ isMate: true, mateIn: 3, whiteScore: 3 }) === "+M3",
  "Active mate for White mateIn=3 → '+M3'"
);

// Active mate for Black (whiteScore < 0, mateIn < 0 in UCI: side-to-move is being mated... actually
// from Black's perspective delivering mate: mateIn could be positive from Black's POV or negative)
// In our convention: mateIn = score.value (UCI, side-to-move perspective)
// For Black delivering mate: if it's Black's turn and they're mating, UCI value > 0,
// but whiteScore = -value (since turn='b'). So mateIn could be negative when White is being mated.
assert(
  formatEvalText({ isMate: true, mateIn: -2, whiteScore: -2 }) === "-M2",
  "Active mate for Black mateIn=-2, abs → '-M2'"
);

// Delivered checkmate by White (mateIn = 0, whiteScore = 999)
assert(
  formatEvalText({ isMate: true, mateIn: 0, whiteScore: 999 }) === "Checkmate",
  "Delivered checkmate (mateIn=0, whiteScore=999) → 'Checkmate'"
);

// Delivered checkmate by Black (mateIn = 0, whiteScore = -999)
assert(
  formatEvalText({ isMate: true, mateIn: 0, whiteScore: -999 }) === "Checkmate",
  "Delivered checkmate (mateIn=0, whiteScore=-999) → 'Checkmate'"
);

// NaN whiteScore
assert(
  formatEvalText({ isMate: false, mateIn: null, whiteScore: NaN }) === "n/a",
  "NaN whiteScore → 'n/a'"
);

// Missing / undefined point
assert(formatEvalText(null) === "n/a", "null point → 'n/a'");
assert(formatEvalText(undefined) === "n/a", "undefined point → 'n/a'");
assert(formatEvalText({}) === "n/a", "empty object (no whiteScore, isMate not true) → 'n/a'");

// Does not throw on weird input
let didThrow = false;
try {
  formatEvalText("not a point");
} catch {
  didThrow = true;
}
assert(!didThrow, "formatEvalText does not throw on string input");

// ----------------------------------------------------------------
// [Section 3] formatPointLabel
// ----------------------------------------------------------------
console.log("\n[Section 3] formatPointLabel");

// Start position (index 0)
assert(
  formatPointLabel({ index: 0, moveSan: null, turn: null }) === "Start position",
  "index=0 → 'Start position'"
);
assert(
  formatPointLabel({ index: 0, moveSan: "e4", turn: "w" }) === "Start position",
  "index=0 with moveSan → 'Start position'"
);

// White move (odd index = ply 1 = move 1)
assert(
  formatPointLabel({ index: 1, moveSan: "e4", turn: "w" }) === "1. e4",
  "index=1, moveSan='e4', turn='w' → '1. e4'"
);

// Black move (even index = ply 2 = move 1)
assert(
  formatPointLabel({ index: 2, moveSan: "e5", turn: "b" }) === "1... e5",
  "index=2, moveSan='e5', turn='b' → '1... e5'"
);

// White's move 10 (index=19, ply 19, move ceil(19/2)=10)
assert(
  formatPointLabel({ index: 19, moveSan: "Nf3", turn: "w" }) === "10. Nf3",
  "index=19, moveSan='Nf3', turn='w' → '10. Nf3'"
);

// Black's move 10 (index=20, ply 20, move ceil(20/2)=10)
assert(
  formatPointLabel({ index: 20, moveSan: "Nc6", turn: "b" }) === "10... Nc6",
  "index=20, moveSan='Nc6', turn='b' → '10... Nc6'"
);

// Missing moveSan falls back to "Move N"
assert(
  formatPointLabel({ index: 5, moveSan: null, turn: "w" }) === "Move 5",
  "index=5, no moveSan → 'Move 5'"
);
assert(
  formatPointLabel({ index: 7, moveSan: undefined, turn: "b" }) === "Move 7",
  "index=7, undefined moveSan → 'Move 7'"
);

// Null / undefined point
assert(formatPointLabel(null) === "n/a", "null → 'n/a'");
assert(formatPointLabel(undefined) === "n/a", "undefined → 'n/a'");

// Does not throw on weird input
let didThrow2 = false;
try {
  formatPointLabel({ index: "bad" });
} catch {
  didThrow2 = true;
}
assert(!didThrow2, "formatPointLabel does not throw on bad index type");

// ----------------------------------------------------------------
// [Section 4] Input mutation check
// ----------------------------------------------------------------
console.log("\n[Section 4] Input not mutated");

const inputPoint = { index: 3, displayScore: 120, whiteScore: 120, isMate: false, mateIn: null, moveSan: "Nf3", turn: "w" };
const inputCopy = JSON.parse(JSON.stringify(inputPoint));
formatEvalText(inputPoint);
formatPointLabel(inputPoint);
assert(
  JSON.stringify(inputPoint) === JSON.stringify(inputCopy),
  "formatEvalText + formatPointLabel do not mutate input"
);

const testOptions = { width: 600, padding: 8, pointCount: 5 };
const testOptionsCopy = JSON.parse(JSON.stringify(testOptions));
getSeriesIndexFromX(300, testOptions);
assert(
  JSON.stringify(testOptions) === JSON.stringify(testOptionsCopy),
  "getSeriesIndexFromX does not mutate options"
);

// ----------------------------------------------------------------
// Summary
// ----------------------------------------------------------------
console.log("\n=======================================================");
console.log(`Results: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log("=======================================================\n");

if (failedCount > 0) {
  process.exit(1);
}
