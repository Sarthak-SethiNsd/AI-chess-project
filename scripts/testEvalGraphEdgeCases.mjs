import { buildEvalSeries } from "../lib/evalSeries.js";
import { getGraphPoints, buildLinePath, getMidlineY, GRAPH_DEFAULTS } from "../lib/evalGraphGeometry.js";
import { getMarkerPoints, MARKER_CATEGORIES } from "../lib/evalGraphMarkers.js";
import { getSeriesIndexFromX, formatEvalText, formatPointLabel } from "../lib/evalGraphInteraction.js";

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

console.log("=== Testing Eval Graph Edge Cases (Part E) ===\n");

// [Edge Case 1] 1-move game (2 points in series: start + after move 1)
console.log("[Edge Case 1] 1-move game (2 points)");
const oneMoveEvals = [
  {
    evalBefore: { score: { type: "cp", value: 20, whiteScore: 20 } },
    evalAfter: { score: { type: "cp", value: 35, whiteScore: 35 } },
    moveSan: "e4",
    turn: "w",
    category: "Best",
  },
];
const oneMoveSeries = buildEvalSeries(oneMoveEvals);
assert(oneMoveSeries.length === 2, "1 move produces 2 points in series (start + move 1)");
const oneMovePoints = getGraphPoints(oneMoveSeries);
assert(oneMovePoints.length === 2, "getGraphPoints produces 2 points");
assert(oneMovePoints[0].x === GRAPH_DEFAULTS.padding, "first point at left padding");
assert(oneMovePoints[1].x === GRAPH_DEFAULTS.width - GRAPH_DEFAULTS.padding, "second point at right padding");
const oneMovePath = buildLinePath(oneMovePoints);
assert(oneMovePath.startsWith("M ") && oneMovePath.includes(" L "), "path connects two points cleanly");
assert(getSeriesIndexFromX(10, { pointCount: 2 }) === 0, "x near left maps to index 0");
assert(getSeriesIndexFromX(580, { pointCount: 2 }) === 1, "x near right maps to index 1");

// [Edge Case 2] 2-move game (3 points)
console.log("\n[Edge Case 2] 2-move game (3 points)");
const twoMoveEvals = [
  {
    evalBefore: { score: { type: "cp", value: 20, whiteScore: 20 } },
    evalAfter: { score: { type: "cp", value: 35, whiteScore: 35 } },
    moveSan: "e4",
    turn: "w",
    category: "Book",
  },
  {
    evalBefore: { score: { type: "cp", value: 35, whiteScore: 35 } },
    evalAfter: { score: { type: "cp", value: -500, whiteScore: -500 } },
    moveSan: "f6",
    turn: "b",
    category: "Blunder",
  },
];
const twoMoveSeries = buildEvalSeries(twoMoveEvals);
assert(twoMoveSeries.length === 3, "2 moves produce 3 points");
const twoMovePoints = getGraphPoints(twoMoveSeries);
assert(twoMovePoints.length === 3, "getGraphPoints produces 3 points");
const twoMoveMarkers = getMarkerPoints(twoMoveSeries, twoMovePoints);
assert(twoMoveMarkers.length === 1, "finds 1 category marker (Blunder)");
assert(twoMoveMarkers[0].category === "Blunder" && twoMoveMarkers[0].index === 2, "Blunder mapped to index 2");

// [Edge Case 3] 0-move case (empty evaluations)
console.log("\n[Edge Case 3] 0-move case");
const zeroMoveSeries = buildEvalSeries([]);
assert(Array.isArray(zeroMoveSeries) && zeroMoveSeries.length === 0, "buildEvalSeries([]) returns []");
const zeroMovePoints = getGraphPoints(zeroMoveSeries);
assert(Array.isArray(zeroMovePoints) && zeroMovePoints.length === 0, "getGraphPoints([]) returns []");
assert(buildLinePath(zeroMovePoints) === "", "buildLinePath([]) returns empty string");
// In page.js, categorizedData?.evaluations?.length > 0 guard prevents rendering when 0 moves.
// In EvalGraph.jsx, isValidSeries = series.length >= 2 renders "No evaluation data" placeholder.

// [Edge Case 4] 300-ply series performance and correct geometry
console.log("\n[Edge Case 4] 300-ply series");
const longEvals = [];
for (let i = 0; i < 300; i++) {
  longEvals.push({
    evalBefore: { score: { type: "cp", value: 0, whiteScore: 0 } },
    evalAfter: { score: { type: "cp", value: (i % 20) * 10 - 100, whiteScore: (i % 20) * 10 - 100 } },
    moveSan: `N${i}`,
    turn: i % 2 === 0 ? "w" : "b",
    category: i === 10 ? "Blunder" : i === 20 ? "Mistake" : i === 30 ? "Brilliant" : "Good",
  });
}
const t0 = Date.now();
const longSeries = buildEvalSeries(longEvals);
const longPoints = getGraphPoints(longSeries);
const longPath = buildLinePath(longPoints);
const longMarkers = getMarkerPoints(longSeries, longPoints);
const t1 = Date.now();
assert(t1 - t0 < 50, `300-ply processing took ${t1 - t0}ms (< 50ms)`);
assert(longSeries.length === 301, "300 moves produce 301 points");
assert(longPoints.length === 301, "301 geometry points generated");
assert(longMarkers.length === 3, "found all 3 special category markers in 300-ply series");
assert(longPath.length > 1000, "dense path string generated");

// [Edge Case 5] All points having the same score (e.g. all 0)
console.log("\n[Edge Case 5] All points having identical score");
const flatEvals = [
  { evalBefore: { score: { type: "cp", value: 0, whiteScore: 0 } }, evalAfter: { score: { type: "cp", value: 0, whiteScore: 0 } }, moveSan: "e4", turn: "w", category: "Book" },
  { evalBefore: { score: { type: "cp", value: 0, whiteScore: 0 } }, evalAfter: { score: { type: "cp", value: 0, whiteScore: 0 } }, moveSan: "e5", turn: "b", category: "Book" },
  { evalBefore: { score: { type: "cp", value: 0, whiteScore: 0 } }, evalAfter: { score: { type: "cp", value: 0, whiteScore: 0 } }, moveSan: "Nf3", turn: "w", category: "Book" },
];
const flatSeries = buildEvalSeries(flatEvals);
const flatPoints = getGraphPoints(flatSeries);
const midY = getMidlineY();
assert(flatPoints.every(p => p.y === midY), "All flat 0-score points sit exactly on midline y");

// [Edge Case 6] All points clamped at +1000 or -1000
console.log("\n[Edge Case 6] All points clamped at +1000 or -1000");
const maxEvals = [
  { evalBefore: { score: { type: "cp", value: 2000, whiteScore: 2000 } }, evalAfter: { score: { type: "cp", value: 2500, whiteScore: 2500 } }, moveSan: "e4", turn: "w", category: "Best" },
  { evalBefore: { score: { type: "cp", value: 2500, whiteScore: 2500 } }, evalAfter: { score: { type: "cp", value: 3000, whiteScore: 3000 } }, moveSan: "e5", turn: "b", category: "Best" },
];
const maxSeries = buildEvalSeries(maxEvals);
const maxPoints = getGraphPoints(maxSeries);
assert(maxPoints.every(p => p.y === GRAPH_DEFAULTS.padding), "All max points sit on top padding y=8");

const minEvals = [
  { evalBefore: { score: { type: "cp", value: -2000, whiteScore: -2000 } }, evalAfter: { score: { type: "cp", value: -2500, whiteScore: -2500 } }, moveSan: "e4", turn: "w", category: "Best" },
  { evalBefore: { score: { type: "cp", value: -2500, whiteScore: -2500 } }, evalAfter: { score: { type: "cp", value: -3000, whiteScore: -3000 } }, moveSan: "e5", turn: "b", category: "Best" },
];
const minSeries = buildEvalSeries(minEvals);
const minPoints = getGraphPoints(minSeries);
assert(minPoints.every(p => p.y === GRAPH_DEFAULTS.height - GRAPH_DEFAULTS.padding), "All min points sit on bottom padding y=152");

// [Edge Case 7] Tooltip formatting for missing category and missing moveSan
console.log("\n[Edge Case 7] Tooltip with missing category or missing moveSan");
const missingDataPoint = {
  index: 3,
  whiteScore: 120,
  displayScore: 120,
  isMate: false,
  mateIn: null,
  moveSan: null,
  category: null,
  turn: "w",
};
assert(formatPointLabel(missingDataPoint) === "Move 3", "missing moveSan falls back to 'Move 3'");
assert(formatEvalText(missingDataPoint) === "+1.20", "formats eval cleanly without errors");

const startPoint = {
  index: 0,
  whiteScore: 0,
  displayScore: 0,
  isMate: false,
  mateIn: null,
  moveSan: null,
  category: null,
  turn: null,
};
assert(formatPointLabel(startPoint) === "Start position", "start point label is 'Start position'");
assert(formatEvalText(startPoint) === "+0.00", "start point eval is '+0.00'");

console.log("\n=======================================================");
console.log(`Results: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log("=======================================================\n");

if (failedCount > 0) {
  process.exit(1);
}
