import {
  getGraphPoints,
  buildLinePath,
  getMidlineY,
  GRAPH_DEFAULTS,
} from "../lib/evalGraphGeometry.js";
import { EVAL_CLAMP_CP } from "../lib/evalSeries.js";

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

function approxEq(a, b, tol = 0.01) {
  return Math.abs(a - b) <= tol;
}

console.log("=== Testing Eval Graph Geometry (lib/evalGraphGeometry.js) ===\n");

const LAYOUT = { width: 600, height: 160, padding: 8 };
const INNER_H = LAYOUT.height - 2 * LAYOUT.padding; // 144
const INNER_W = LAYOUT.width - 2 * LAYOUT.padding;  // 584
const MID_Y = LAYOUT.padding + INNER_H / 2;          // 8 + 72 = 80

// ----------------------------------------------------------------
// [Test 1] Empty, null, non-array inputs
// ----------------------------------------------------------------
console.log("[Test 1] Empty / null / non-array inputs");

assert(Array.isArray(getGraphPoints([])), "getGraphPoints([]) returns array");
assert(getGraphPoints([]).length === 0, "getGraphPoints([]) returns empty array");
assert(getGraphPoints(null).length === 0, "getGraphPoints(null) returns empty array");
assert(getGraphPoints(undefined).length === 0, "getGraphPoints(undefined) returns empty array");
assert(getGraphPoints("string").length === 0, "getGraphPoints('string') returns empty array");
assert(getGraphPoints(42).length === 0, "getGraphPoints(42) returns empty array");
assert(getGraphPoints({}).length === 0, "getGraphPoints({}) returns empty array");

// ----------------------------------------------------------------
// [Test 2] Single point (no division-by-zero, horizontally centered)
// ----------------------------------------------------------------
console.log("\n[Test 2] Single point — horizontal centering, no division-by-zero");

const singlePoint = [{ index: 0, displayScore: 0 }];
let didThrow = false;
let singleResult = [];
try {
  singleResult = getGraphPoints(singlePoint, LAYOUT);
} catch (e) {
  didThrow = true;
}
assert(!didThrow, "getGraphPoints with 1 point does not throw");
assert(singleResult.length === 1, "Single point produces exactly 1 result");

const expectedSingleX = LAYOUT.padding + INNER_W / 2; // horizontal center
assert(
  approxEq(singleResult[0].x, expectedSingleX),
  `Single point x is at horizontal center (${expectedSingleX})`,
  `got ${singleResult[0].x}`
);
assert(
  approxEq(singleResult[0].y, MID_Y),
  `Single point with score 0 maps to midline y=${MID_Y}`,
  `got ${singleResult[0].y}`
);

// Single point with extreme positive score
const singleHigh = getGraphPoints([{ index: 0, displayScore: EVAL_CLAMP_CP }], LAYOUT);
assert(
  approxEq(singleHigh[0].y, LAYOUT.padding),
  `Single point +EVAL_CLAMP_CP maps to top y=${LAYOUT.padding}`,
  `got ${singleHigh[0].y}`
);

// ----------------------------------------------------------------
// [Test 3] Two points — x strictly increases left to right
// ----------------------------------------------------------------
console.log("\n[Test 3] Two points — x coordinates strictly increase");

const twoPoints = [
  { index: 0, displayScore: 100 },
  { index: 1, displayScore: -100 },
];
const twoResult = getGraphPoints(twoPoints, LAYOUT);
assert(twoResult.length === 2, "Two points produces 2 results");
assert(
  approxEq(twoResult[0].x, LAYOUT.padding),
  `First of two points starts at left padding (${LAYOUT.padding})`,
  `got ${twoResult[0].x}`
);
assert(
  approxEq(twoResult[1].x, LAYOUT.width - LAYOUT.padding),
  `Last of two points ends at right padding (${LAYOUT.width - LAYOUT.padding})`,
  `got ${twoResult[1].x}`
);
assert(twoResult[0].x < twoResult[1].x, "Two points: x[0] < x[1] (strictly increasing)");
assert(twoResult[0].y < MID_Y, "First point (positive score) is above midline");
assert(twoResult[1].y > MID_Y, "Second point (negative score) is below midline");

// ----------------------------------------------------------------
// [Test 4] Many points — x is strictly increasing across all
// ----------------------------------------------------------------
console.log("\n[Test 4] Many points — x strictly increasing");

const manyPoints = [0, 100, -200, 500, -1000, 0, 1000].map((s, i) => ({
  index: i,
  displayScore: s,
}));
const manyResult = getGraphPoints(manyPoints, LAYOUT);
assert(manyResult.length === 7, "Many points produces 7 results");
let xStrictlyIncreasing = true;
for (let i = 1; i < manyResult.length; i++) {
  if (manyResult[i].x <= manyResult[i - 1].x) {
    xStrictlyIncreasing = false;
    break;
  }
}
assert(xStrictlyIncreasing, "Many points: x values are strictly increasing left to right");
assert(
  approxEq(manyResult[0].x, LAYOUT.padding),
  "Many points: first x at left padding"
);
assert(
  approxEq(manyResult[manyResult.length - 1].x, LAYOUT.width - LAYOUT.padding),
  "Many points: last x at right padding"
);

// ----------------------------------------------------------------
// [Test 5] Score ↔ y mapping extremes and center
// ----------------------------------------------------------------
console.log("\n[Test 5] Score-to-y mapping: +1000 → top, -1000 → bottom, 0 → center");

const extremePoints = [
  { index: 0, displayScore: EVAL_CLAMP_CP },   // +1000 → y = padding (top)
  { index: 1, displayScore: 0 },               // 0 → y = midY (center)
  { index: 2, displayScore: -EVAL_CLAMP_CP },  // -1000 → y = height - padding (bottom)
];
const extremeResult = getGraphPoints(extremePoints, LAYOUT);

assert(
  approxEq(extremeResult[0].y, LAYOUT.padding),
  `+EVAL_CLAMP_CP maps to top y=${LAYOUT.padding}`,
  `got ${extremeResult[0].y}`
);
assert(
  approxEq(extremeResult[1].y, MID_Y),
  `Score 0 maps to midline y=${MID_Y}`,
  `got ${extremeResult[1].y}`
);
assert(
  approxEq(extremeResult[2].y, LAYOUT.height - LAYOUT.padding),
  `-EVAL_CLAMP_CP maps to bottom y=${LAYOUT.height - LAYOUT.padding}`,
  `got ${extremeResult[2].y}`
);

// ----------------------------------------------------------------
// [Test 6] NaN and missing displayScore handled as 0
// ----------------------------------------------------------------
console.log("\n[Test 6] NaN / missing displayScore → treated as 0");

const nanPoints = [
  { index: 0, displayScore: NaN },
  { index: 1 },                         // missing displayScore
  { index: 2, displayScore: null },
  { index: 3, displayScore: undefined },
];
let nanDidThrow = false;
let nanResult = [];
try {
  nanResult = getGraphPoints(nanPoints, LAYOUT);
} catch (e) {
  nanDidThrow = true;
}
assert(!nanDidThrow, "getGraphPoints with NaN/missing scores does not throw");
assert(nanResult.length === 4, "NaN/missing inputs produce 4 result points");
for (let i = 0; i < nanResult.length; i++) {
  assert(
    approxEq(nanResult[i].y, MID_Y),
    `NaN/missing score at index ${i} maps to midline y=${MID_Y}`,
    `got y=${nanResult[i].y}`
  );
}

// ----------------------------------------------------------------
// [Test 7] Clamping beyond ±EVAL_CLAMP_CP
// ----------------------------------------------------------------
console.log("\n[Test 7] Scores beyond ±EVAL_CLAMP_CP are clamped defensively");

const overClampPoints = [
  { index: 0, displayScore: 1500 },   // beyond +1000
  { index: 1, displayScore: -2000 },  // beyond -1000
];
const overClampResult = getGraphPoints(overClampPoints, LAYOUT);
assert(
  approxEq(overClampResult[0].y, LAYOUT.padding),
  "Score 1500 clamped to top (same as +1000)",
  `got y=${overClampResult[0].y}`
);
assert(
  approxEq(overClampResult[1].y, LAYOUT.height - LAYOUT.padding),
  "Score -2000 clamped to bottom (same as -1000)",
  `got y=${overClampResult[1].y}`
);

// ----------------------------------------------------------------
// [Test 8] Coordinates rounded to 2 decimal places
// ----------------------------------------------------------------
console.log("\n[Test 8] Coordinates rounded to 2 decimal places");

const rounding3Points = [
  { index: 0, displayScore: 333 },
  { index: 1, displayScore: 666 },
  { index: 2, displayScore: 999 },
];
const roundResult = getGraphPoints(rounding3Points, LAYOUT);
for (const pt of roundResult) {
  const xDecimalLen = (String(pt.x).split(".")[1] || "").length;
  const yDecimalLen = (String(pt.y).split(".")[1] || "").length;
  assert(xDecimalLen <= 2, `x=${pt.x} has at most 2 decimal places`);
  assert(yDecimalLen <= 2, `y=${pt.y} has at most 2 decimal places`);
}

// ----------------------------------------------------------------
// [Test 9] buildLinePath — format verification
// ----------------------------------------------------------------
console.log("\n[Test 9] buildLinePath path string format");

assert(buildLinePath([]) === "", "buildLinePath([]) returns empty string");
assert(buildLinePath(null) === "", "buildLinePath(null) returns empty string");
assert(buildLinePath(undefined) === "", "buildLinePath(undefined) returns empty string");
assert(buildLinePath("nope") === "", "buildLinePath('nope') returns empty string");

const onePt = [{ x: 10, y: 20 }];
const onePtPath = buildLinePath(onePt);
assert(onePtPath === "M 10 20", `Single point path is "M 10 20" (got "${onePtPath}")`);

const twoPtPath = buildLinePath([{ x: 10, y: 20 }, { x: 30.5, y: 80.75 }]);
assert(
  twoPtPath === "M 10 20 L 30.5 80.75",
  `Two-point path format correct (got "${twoPtPath}")`
);

const threePts = [{ x: 0, y: 80 }, { x: 292, y: 40 }, { x: 584, y: 120 }];
const threePath = buildLinePath(threePts);
assert(threePath.startsWith("M "), "Three-point path starts with 'M '");
assert(threePath.includes(" L "), "Three-point path includes ' L '");
const segments = threePath.split(" L ");
assert(segments.length === 3, "Three-point path has 3 segments (M + 2 L)");

// Verify rounding in path
const fracPt = [{ x: 10.1234, y: 20.5678 }];
const fracPath = buildLinePath(fracPt);
assert(fracPath === "M 10.12 20.57", `buildLinePath rounds to 2 decimals (got "${fracPath}")`);

// ----------------------------------------------------------------
// [Test 10] getMidlineY
// ----------------------------------------------------------------
console.log("\n[Test 10] getMidlineY");

assert(getMidlineY(LAYOUT) === MID_Y, `getMidlineY matches expected (${MID_Y})`);
assert(getMidlineY({ height: 200, padding: 10 }) === 100, "getMidlineY({ height: 200, padding: 10 }) = 100");
assert(getMidlineY({}) === GRAPH_DEFAULTS.height / 2, "getMidlineY({}) uses defaults");
assert(typeof getMidlineY() === "number", "getMidlineY() without args returns a number");
assert(isFinite(getMidlineY()), "getMidlineY() returns a finite number");

// ----------------------------------------------------------------
// [Test 11] Input not mutated
// ----------------------------------------------------------------
console.log("\n[Test 11] Input not mutated");

const original = [
  { index: 0, displayScore: 200 },
  { index: 1, displayScore: -400 },
];
const originalCopy = JSON.parse(JSON.stringify(original));
getGraphPoints(original, LAYOUT);
assert(
  JSON.stringify(original) === JSON.stringify(originalCopy),
  "getGraphPoints does not mutate input array or its elements"
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
