import { getMarkerPoints, MARKER_CATEGORIES } from "../lib/evalGraphMarkers.js";

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

console.log("=== Testing Eval Graph Markers (lib/evalGraphMarkers.js) ===\n");

// [Test 1] MARKER_CATEGORIES constant check
console.log("[Test 1] MARKER_CATEGORIES named constant");
assert(Array.isArray(MARKER_CATEGORIES), "MARKER_CATEGORIES is an array");
assert(MARKER_CATEGORIES.includes("Brilliant"), "MARKER_CATEGORIES includes Brilliant");
assert(MARKER_CATEGORIES.includes("Mistake"), "MARKER_CATEGORIES includes Mistake");
assert(MARKER_CATEGORIES.includes("Blunder"), "MARKER_CATEGORIES includes Blunder");

// [Test 2] Empty / null / non-array inputs
console.log("\n[Test 2] Edge inputs (empty, null, undefined, invalid)");
assert(Array.isArray(getMarkerPoints([], [])), "empty arrays return array");
assert(getMarkerPoints([], []).length === 0, "empty arrays return empty array");
assert(getMarkerPoints(null, []).length === 0, "null series returns []");
assert(getMarkerPoints([], null).length === 0, "null graphPoints returns []");
assert(getMarkerPoints(null, null).length === 0, "null/null returns []");
assert(getMarkerPoints(undefined, undefined).length === 0, "undefined returns []");
assert(getMarkerPoints("bad", [1, 2]).length === 0, "non-array series returns []");
assert(getMarkerPoints([{ category: "Blunder" }], "bad").length === 0, "non-array graphPoints returns []");

// [Test 3] Mismatched lengths
console.log("\n[Test 3] Mismatched lengths");
const sShort = [{ index: 0, category: "Blunder" }];
const gLong = [{ index: 0, x: 10, y: 20 }, { index: 1, x: 30, y: 40 }];
const markersShort = getMarkerPoints(sShort, gLong);
assert(markersShort.length === 1, "handles series shorter than graphPoints");
assert(markersShort[0].x === 10 && markersShort[0].y === 20, "correct coordinate mapped");

const sLong = [
  { index: 0, category: "Blunder" },
  { index: 1, category: "Mistake" },
  { index: 2, category: "Brilliant" }
];
const gShort = [{ index: 0, x: 10, y: 20 }];
const markersLong = getMarkerPoints(sLong, gShort);
assert(markersLong.length === 1, "handles series longer than graphPoints");
assert(markersLong[0].category === "Blunder", "only pairs up to available length");

// [Test 4] Each included category and excluded categories
console.log("\n[Test 4] Included vs excluded categories");
const testSeries = [
  { index: 0, category: null }, // start position
  { index: 1, category: "Book" }, // excluded
  { index: 2, category: "Best" }, // excluded
  { index: 3, category: "Excellent" }, // excluded
  { index: 4, category: "Good" }, // excluded
  { index: 5, category: "Inaccuracy" }, // excluded
  { index: 6, category: "Brilliant" }, // INCLUDED
  { index: 7, category: "Mistake" }, // INCLUDED
  { index: 8, category: "Blunder" }, // INCLUDED
  { index: 9, category: "UnknownCategory" }, // excluded unknown
];
const testGeo = testSeries.map((s, i) => ({ index: i, x: i * 50, y: 80 }));

const filtered = getMarkerPoints(testSeries, testGeo);
assert(filtered.length === 3, "Exactly 3 points matched");
assert(filtered[0].category === "Brilliant" && filtered[0].index === 6, "Brilliant captured at index 6");
assert(filtered[0].x === 300 && filtered[0].y === 80, "Brilliant has correct x, y");
assert(filtered[1].category === "Mistake" && filtered[1].index === 7, "Mistake captured at index 7");
assert(filtered[2].category === "Blunder" && filtered[2].index === 8, "Blunder captured at index 8");

// [Test 5] 300-ply input performance and correctness
console.log("\n[Test 5] 300-ply series performance and correctness");
const longSeries = [];
const longGeo = [];
for (let i = 0; i <= 300; i++) {
  let cat = null;
  if (i % 30 === 1) cat = "Brilliant";
  else if (i % 30 === 10) cat = "Mistake";
  else if (i % 30 === 20) cat = "Blunder";
  else if (i % 2 === 0) cat = "Best";
  else cat = "Inaccuracy";

  longSeries.push({ index: i, category: cat, displayScore: 0 });
  longGeo.push({ index: i, x: i * 2, y: 80 });
}

const t0 = Date.now();
const longMarkers = getMarkerPoints(longSeries, longGeo);
const t1 = Date.now();
assert(t1 - t0 < 50, `300-ply series took ${t1 - t0}ms (< 50ms)`);
assert(longMarkers.length === 30, `Found 30 markers in 300-ply game (got ${longMarkers.length})`);
assert(longMarkers.every(m => MARKER_CATEGORIES.includes(m.category)), "All extracted markers are in MARKER_CATEGORIES");

// [Test 6] Immutability / No mutation
console.log("\n[Test 6] No mutation");
const seriesCopy = JSON.parse(JSON.stringify(testSeries));
const geoCopy = JSON.parse(JSON.stringify(testGeo));
getMarkerPoints(testSeries, testGeo);
assert(JSON.stringify(testSeries) === JSON.stringify(seriesCopy), "testSeries not mutated");
assert(JSON.stringify(testGeo) === JSON.stringify(geoCopy), "testGeo not mutated");

console.log("\n=======================================================");
console.log(`Results: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log("=======================================================\n");

if (failedCount > 0) {
  process.exit(1);
}
