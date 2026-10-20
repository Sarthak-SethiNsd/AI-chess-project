import {
  COMPARE_ARROW_COLORS,
  toBoardArrows,
  getCompareCaption,
  getCompareLegend,
} from "../lib/compareView.js";

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

console.log("=== Testing Compare View Module (lib/compareView.js) ===\n");

// ================================================================
// Section 1: COMPARE_ARROW_COLORS
// ================================================================
console.log("[Test Suite 1] COMPARE_ARROW_COLORS Constant");
assert(
  typeof COMPARE_ARROW_COLORS.played === "string" &&
    typeof COMPARE_ARROW_COLORS.best === "string" &&
    COMPARE_ARROW_COLORS.played !== COMPARE_ARROW_COLORS.best,
  "COMPARE_ARROW_COLORS defines distinct strings for played and best arrows"
);

// ================================================================
// Section 2: toBoardArrows Unit Tests
// ================================================================
console.log("\n[Test Suite 2] toBoardArrows");

// 1. Two arrows: played (red) first, best (green) second
{
  const mockCompare = {
    arrows: [
      { from: "e7", to: "e5", kind: "played" },
      { from: "c7", to: "c5", kind: "best" },
    ],
  };
  const snapshot = JSON.stringify(mockCompare);
  const arrows = toBoardArrows(mockCompare);

  assert(Array.isArray(arrows) && arrows.length === 2, "toBoardArrows returns 2 arrows");
  assert(
    arrows[0].startSquare === "e7" &&
      arrows[0].endSquare === "e5" &&
      arrows[0].color === COMPARE_ARROW_COLORS.played,
    "First arrow has played move coordinates and red color with v5 field names (startSquare, endSquare, color)"
  );
  assert(
    arrows[1].startSquare === "c7" &&
      arrows[1].endSquare === "c5" &&
      arrows[1].color === COMPARE_ARROW_COLORS.best,
    "Second arrow has best move coordinates and green color with v5 field names (startSquare, endSquare, color)"
  );
  assert(JSON.stringify(mockCompare) === snapshot, "Input mockCompare is not mutated");
}

// 2. One arrow: best only (e.g. sameAsBest)
{
  const mockSameAsBest = {
    arrows: [{ from: "e2", to: "e4", kind: "best" }],
  };
  const arrows = toBoardArrows(mockSameAsBest);
  assert(
    arrows.length === 1 &&
      arrows[0].startSquare === "e2" &&
      arrows[0].endSquare === "e4" &&
      arrows[0].color === COMPARE_ARROW_COLORS.best,
    "Single best arrow produced with green color"
  );
}

// 3. Played only
{
  const mockPlayedOnly = {
    arrows: [{ from: "d7", to: "d5", kind: "played" }],
  };
  const arrows = toBoardArrows(mockPlayedOnly);
  assert(
    arrows.length === 1 &&
      arrows[0].startSquare === "d7" &&
      arrows[0].endSquare === "d5" &&
      arrows[0].color === COMPARE_ARROW_COLORS.played,
    "Single played arrow produced with red color"
  );
}

// 4. Best only (when played move was missing)
{
  const mockBestOnly = {
    arrows: [{ from: "g1", to: "f3", kind: "best" }],
  };
  const arrows = toBoardArrows(mockBestOnly);
  assert(
    arrows.length === 1 &&
      arrows[0].startSquare === "g1" &&
      arrows[0].endSquare === "f3" &&
      arrows[0].color === COMPARE_ARROW_COLORS.best,
    "Single best arrow produced with green color"
  );
}

// 5. Empty arrows
{
  assert(toBoardArrows({ arrows: [] }).length === 0, "Empty arrows array returns []");
}

// 6. Null, undefined, and non-object inputs
{
  assert(toBoardArrows(null).length === 0, "null returns []");
  assert(toBoardArrows(undefined).length === 0, "undefined returns []");
  assert(toBoardArrows("not an object").length === 0, "string returns []");
  assert(toBoardArrows(1234).length === 0, "number returns []");
  assert(toBoardArrows({}).length === 0, "empty object returns []");
  assert(toBoardArrows({ arrows: null }).length === 0, "{ arrows: null } returns []");
}

// ================================================================
// Section 3: getCompareCaption Unit Tests
// ================================================================
console.log("\n[Test Suite 3] getCompareCaption");

// Case 1: Both differ (White move)
{
  const compareWhite = {
    ply: 27,
    moveSan: "Qxb7",
    turn: "w",
    played: { from: "d5", to: "b7", uci: "d5b7" },
    best: { from: "c1", to: "e3", uci: "c1e3", san: "Be3" },
    sameAsBest: false,
  };
  const caption = getCompareCaption(compareWhite);
  assert(
    caption === "Position before 14. Qxb7. Played Qxb7 (red). Engine best: Be3 (green).",
    `Case 1 (White differ): "${caption}" === "Position before 14. Qxb7. Played Qxb7 (red). Engine best: Be3 (green)."`
  );
}

// Case 1b: Both differ (Black move)
{
  const compareBlack = {
    ply: 28,
    moveSan: "Qxb7",
    turn: "b",
    played: { from: "d5", to: "b7", uci: "d5b7" },
    best: { from: "c8", to: "d7", uci: "c8d7", san: "Bd7" },
    sameAsBest: false,
  };
  const caption = getCompareCaption(compareBlack);
  assert(
    caption === "Position before 14... Qxb7. Played Qxb7 (red). Engine best: Bd7 (green).",
    `Case 1b (Black differ): "${caption}" === "Position before 14... Qxb7. Played Qxb7 (red). Engine best: Bd7 (green)."`
  );
}

// Case 2: sameAsBest
{
  const compareSame = {
    ply: 1,
    moveSan: "e4",
    turn: "w",
    sameAsBest: true,
    played: { from: "e2", to: "e4", uci: "e2e4" },
    best: { from: "e2", to: "e4", uci: "e2e4", san: "e4" },
  };
  const caption = getCompareCaption(compareSame);
  assert(
    caption === "Position before 1. e4. You played the engine's best move (green).",
    `Case 2 (sameAsBest): "${caption}" === "Position before 1. e4. You played the engine's best move (green)."`
  );
}

// Case 3: best missing (terminal or unavailable)
{
  const compareMissingBest = {
    ply: 7,
    moveSan: "Qxf7#",
    turn: "w",
    sameAsBest: false,
    played: { from: "h5", to: "f7", uci: "h5f7" },
    best: null,
  };
  const caption = getCompareCaption(compareMissingBest);
  assert(
    caption === "Position before 4. Qxf7#. Played Qxf7# (red). No engine suggestion available.",
    `Case 3 (best missing): "${caption}" === "Position before 4. Qxf7#. Played Qxf7# (red). No engine suggestion available."`
  );
}

// Case 4: null or invalid input
{
  assert(getCompareCaption(null) === "", "null input returns empty string");
  assert(getCompareCaption(undefined) === "", "undefined input returns empty string");
  assert(getCompareCaption("invalid") === "", "string input returns empty string");
  assert(getCompareCaption({}) === "", "empty object returns empty string");
}

// Case 5: missing moveSan (falls back gracefully to Move N)
{
  const compareNoSan = {
    ply: 5,
    moveSan: null,
    turn: "w",
    sameAsBest: false,
    played: { from: "e2", to: "e4", uci: "e2e4" },
    best: { from: "d2", to: "d4", uci: "d2d4", san: "d4" },
  };
  const caption = getCompareCaption(compareNoSan);
  assert(
    caption === "Position before Move 5. Played e2e4 (red). Engine best: d4 (green).",
    `Missing moveSan falls back to 'Move 5': "${caption}"`
  );
}

// ================================================================
// Section 4: Castling & Promotion Hand-made Cases
// ================================================================
console.log("\n[Test Suite 4] Castling and Promotion Compare Data");

// Castling: Arrow squares must span the King's squares (e1 -> g1)
{
  const castlingCompare = {
    moveIndex: 6,
    ply: 7,
    turn: "w",
    moveSan: "O-O",
    category: "Good",
    played: { from: "e1", to: "g1", promotion: null, uci: "e1g1" },
    best: { from: "d2", to: "d4", promotion: null, uci: "d2d4", san: "d4" },
    sameAsBest: false,
    arrows: [
      { from: "e1", to: "g1", kind: "played" },
      { from: "d2", to: "d4", kind: "best" },
    ],
  };

  const boardArrows = toBoardArrows(castlingCompare);
  assert(
    boardArrows.length === 2 &&
      boardArrows[0].startSquare === "e1" &&
      boardArrows[0].endSquare === "g1" &&
      boardArrows[0].color === COMPARE_ARROW_COLORS.played,
    "Castling arrow correctly spans King squares e1 -> g1"
  );

  const caption = getCompareCaption(castlingCompare);
  assert(
    caption === "Position before 4. O-O. Played O-O (red). Engine best: d4 (green).",
    `Castling caption describes O-O properly: "${caption}"`
  );
}

// Promotion: Arrow squares keep squares (e7 -> e8)
{
  const promotionCompare = {
    moveIndex: 40,
    ply: 41,
    turn: "w",
    moveSan: "e8=Q",
    category: "Best",
    played: { from: "e7", to: "e8", promotion: "q", uci: "e7e8q" },
    best: { from: "e7", to: "e8", promotion: "q", uci: "e7e8q", san: "e8=Q" },
    sameAsBest: true,
    arrows: [{ from: "e7", to: "e8", kind: "best" }],
  };

  const boardArrows = toBoardArrows(promotionCompare);
  assert(
    boardArrows.length === 1 &&
      boardArrows[0].startSquare === "e7" &&
      boardArrows[0].endSquare === "e8" &&
      boardArrows[0].color === COMPARE_ARROW_COLORS.best,
    "Promotion arrow correctly spans e7 -> e8"
  );

  const caption = getCompareCaption(promotionCompare);
  assert(
    caption === "Position before 21. e8=Q. You played the engine's best move (green).",
    `Promotion caption describes e8=Q properly: "${caption}"`
  );
}

// ================================================================
// Section 5: getCompareLegend Unit Tests
// ================================================================
console.log("\n[Test Suite 5] getCompareLegend");

// Case 1: both differ
{
  const mockBothDiffer = {
    played: { from: "e7", to: "e5", uci: "e7e5" },
    best: { from: "c7", to: "c5", uci: "c7c5" },
    sameAsBest: false,
  };
  const snapshot = JSON.stringify(mockBothDiffer);
  const legend = getCompareLegend(mockBothDiffer);

  assert(Array.isArray(legend) && legend.length === 2, "both differ returns 2 legend items");
  assert(
    legend[0].kind === "played" &&
      legend[0].label === "Played move" &&
      legend[0].color === COMPARE_ARROW_COLORS.played,
    "First legend item is 'Played move' with red color"
  );
  assert(
    legend[1].kind === "best" &&
      legend[1].label === "Engine best" &&
      legend[1].color === COMPARE_ARROW_COLORS.best,
    "Second legend item is 'Engine best' with green color"
  );
  assert(JSON.stringify(mockBothDiffer) === snapshot, "Input mockBothDiffer is not mutated");
}

// Case 2: sameAsBest
{
  const mockSameAsBest = {
    played: { from: "e2", to: "e4", uci: "e2e4" },
    best: { from: "e2", to: "e4", uci: "e2e4" },
    sameAsBest: true,
  };
  const legend = getCompareLegend(mockSameAsBest);
  assert(Array.isArray(legend) && legend.length === 1, "sameAsBest returns 1 legend item");
  assert(
    legend[0].kind === "best" &&
      legend[0].label === "Played = engine best" &&
      legend[0].color === COMPARE_ARROW_COLORS.best,
    "sameAsBest item is 'Played = engine best' with green color"
  );
}

// Case 3: best missing (e.g. terminal or eval missing)
{
  const mockBestMissing = {
    played: { from: "d7", to: "d5", uci: "d7d5" },
    best: null,
    sameAsBest: false,
  };
  const legend = getCompareLegend(mockBestMissing);
  assert(Array.isArray(legend) && legend.length === 1, "best missing returns 1 legend item");
  assert(
    legend[0].kind === "played" &&
      legend[0].label === "Played move" &&
      legend[0].color === COMPARE_ARROW_COLORS.played,
    "best missing item is 'Played move' with red color"
  );
}

// Case 4: played missing but best exists
{
  const mockPlayedMissing = {
    played: null,
    best: { from: "g1", to: "f3", uci: "g1f3" },
    sameAsBest: false,
  };
  const legend = getCompareLegend(mockPlayedMissing);
  assert(Array.isArray(legend) && legend.length === 1, "played missing returns 1 legend item");
  assert(
    legend[0].kind === "best" &&
      legend[0].label === "Engine best" &&
      legend[0].color === COMPARE_ARROW_COLORS.best,
    "played missing item is 'Engine best' with green color"
  );
}

// Case 5: null, undefined, non-objects, empty objects
{
  assert(Array.isArray(getCompareLegend(null)) && getCompareLegend(null).length === 0, "null returns []");
  assert(Array.isArray(getCompareLegend(undefined)) && getCompareLegend(undefined).length === 0, "undefined returns []");
  assert(Array.isArray(getCompareLegend("invalid")) && getCompareLegend("invalid").length === 0, "string returns []");
  assert(Array.isArray(getCompareLegend(12345)) && getCompareLegend(12345).length === 0, "number returns []");
  assert(Array.isArray(getCompareLegend({})) && getCompareLegend({}).length === 0, "empty object returns []");
  assert(
    Array.isArray(getCompareLegend({ played: null, best: null })) &&
      getCompareLegend({ played: null, best: null }).length === 0,
    "{ played: null, best: null } returns []"
  );
}

console.log("\n========================================================");
console.log(`SUMMARY: ${passedCount} passed, ${failedCount} failed`);
console.log("========================================================");

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

