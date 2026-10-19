import { Chess } from "chess.js";
import { parseUciMove, getCompareData } from "../lib/bestMoveArrows.js";
import { loadGameFromPgn } from "../lib/chessEngine.js";
import { analyseGame } from "../lib/gameAnalysis.js";
import { categorizeGame } from "../lib/moveCategorization.js";
import { terminateStockfish } from "../lib/stockfishEngine.js";

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

console.log("=== Testing Best Move Arrows Module (lib/bestMoveArrows.js) ===\n");

// ================================================================
// Section 1: parseUciMove
// ================================================================
console.log("[Test Suite 1] parseUciMove Unit Tests");

// 1. Valid plain move
{
  const res = parseUciMove("e2e4");
  assert(
    res !== null && res.from === "e2" && res.to === "e4" && res.promotion === null,
    "Valid plain move 'e2e4' parsed to { from: 'e2', to: 'e4', promotion: null }"
  );
}

// 2. Valid promotion moves (q, r, b, n)
{
  const resQ = parseUciMove("e7e8q");
  const resR = parseUciMove("a7a8r");
  const resB = parseUciMove("b2b1b");
  const resN = parseUciMove("c2c1n");
  assert(
    resQ !== null && resQ.from === "e7" && resQ.to === "e8" && resQ.promotion === "q" &&
    resR !== null && resR.from === "a7" && resR.to === "a8" && resR.promotion === "r" &&
    resB !== null && resB.from === "b2" && resB.to === "b1" && resB.promotion === "b" &&
    resN !== null && resN.from === "c2" && resN.to === "c1" && resN.promotion === "n",
    "Valid promotions for q, r, b, n parse correctly with promotion letter preserved"
  );
}

// 3. Uppercase input (documented decision: reject uppercase input to enforce canonical UCI)
{
  assert(parseUciMove("E2E4") === null, "Uppercase 'E2E4' is rejected (returns null)");
  assert(parseUciMove("e2E4") === null, "Mixed case 'e2E4' is rejected (returns null)");
  assert(parseUciMove("e7e8Q") === null, "Uppercase promotion 'e7e8Q' is rejected (returns null)");
  assert(parseUciMove("E7E8Q") === null, "Fully uppercase 'E7E8Q' is rejected (returns null)");
}

// 4. Too short
{
  assert(parseUciMove("") === null, "Empty string returns null");
  assert(parseUciMove("e") === null, "Single char returns null");
  assert(parseUciMove("e2") === null, "2 chars returns null");
  assert(parseUciMove("e2e") === null, "3 chars returns null");
}

// 5. Too long
{
  assert(parseUciMove("e2e4qq") === null, "6 chars 'e2e4qq' returns null");
  assert(parseUciMove("e2e4extra") === null, "Long string returns null");
}

// 6. Bad file or rank
{
  assert(parseUciMove("i2e4") === null, "Invalid file 'i' ('i2e4') returns null");
  assert(parseUciMove("e0e4") === null, "Invalid rank '0' ('e0e4') returns null");
  assert(parseUciMove("e9e4") === null, "Invalid rank '9' ('e9e4') returns null");
  assert(parseUciMove("e2z4") === null, "Invalid destination file 'z' ('e2z4') returns null");
  assert(parseUciMove("a0a1") === null, "Invalid square 'a0' returns null");
  assert(parseUciMove("h9h8") === null, "Invalid square 'h9' returns null");
}

// 7. Bad promotion letter
{
  assert(parseUciMove("e7e8k") === null, "King promotion 'e7e8k' returns null");
  assert(parseUciMove("e7e8p") === null, "Pawn promotion 'e7e8p' returns null");
  assert(parseUciMove("e7e8x") === null, "Invalid promotion 'e7e8x' returns null");
  assert(parseUciMove("e7e81") === null, "Digit promotion 'e7e81' returns null");
}

// 8. Non-string, null, undefined, numbers, booleans, objects
{
  assert(parseUciMove(null) === null, "null returns null");
  assert(parseUciMove(undefined) === null, "undefined returns null");
  assert(parseUciMove(1234) === null, "number returns null");
  assert(parseUciMove(true) === null, "boolean returns null");
  assert(parseUciMove({}) === null, "object returns null");
  assert(parseUciMove([]) === null, "array returns null");
}

// ================================================================
// Section 2: getCompareData with Hand-built Fixtures
// ================================================================
console.log("\n[Test Suite 2] getCompareData Hand-built Fixtures & Edge Cases");

const handBuiltFixtures = [
  // 0: played differs from best (Blunder)
  {
    moveIndex: 0,
    ply: 1,
    moveSan: "e5",
    moveUci: "e7e5",
    turn: "b",
    category: "Blunder",
    fenBefore: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
    evalBefore: {
      bestMove: { uci: "c7c5", san: "c5", from: "c7", to: "c5", promotion: null },
    },
  },
  // 1: played equals best (Best)
  {
    moveIndex: 1,
    ply: 2,
    moveSan: "Nf3",
    moveUci: "g1f3",
    turn: "w",
    category: "Best",
    fenBefore: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2",
    evalBefore: {
      bestMove: { uci: "g1f3", san: "Nf3", from: "g1", to: "f3", promotion: null },
    },
  },
  // 2: same squares but different promotion
  {
    moveIndex: 2,
    ply: 3,
    moveSan: "e8=Q",
    moveUci: "e7e8q",
    turn: "w",
    category: "Inaccuracy",
    fenBefore: "4k3/4P3/8/8/8/8/8/4K3 w - - 0 1",
    evalBefore: {
      bestMove: { uci: "e7e8r", san: "e8=R", from: "e7", to: "e8", promotion: "r" },
    },
  },
  // 3: missing bestMove (terminal or uncomputed)
  {
    moveIndex: 3,
    ply: 4,
    moveSan: "Qxf7#",
    moveUci: "h5f7",
    turn: "w",
    category: "Best",
    fenBefore: "r1bqkb1r/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 4",
    evalBefore: {
      bestMove: null,
    },
  },
  // 4: missing moveUci
  {
    moveIndex: 4,
    ply: 5,
    moveSan: "d4",
    moveUci: null,
    turn: "w",
    category: "Good",
    fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    evalBefore: {
      bestMove: { uci: "d2d4", san: "d4", from: "d2", to: "d4", promotion: null },
    },
  },
  // 5: both missing
  {
    moveIndex: 5,
    ply: 6,
    moveSan: null,
    moveUci: null,
    turn: "b",
    category: null,
    fenBefore: null,
    evalBefore: null,
  },
  // 6: best given as from/to without uci
  {
    moveIndex: 6,
    ply: 7,
    moveSan: "e4",
    moveUci: "e2e4",
    turn: "w",
    category: "Best",
    fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    evalBefore: {
      bestMove: { from: "d2", to: "d4", promotion: null, san: "d4" }, // no uci property!
    },
  },
  // 7: corrupt null entry in array
  null,
];

const fixturesSnapshot = JSON.stringify(handBuiltFixtures);

// 1. Played differs from best: 2 arrows, played first, best second
{
  const res = getCompareData(handBuiltFixtures, 0);
  assert(res !== null, "getCompareData returns non-null for valid moveIndex 0");
  assert(res.sameAsBest === false, "sameAsBest is false when played differs from best");
  assert(
    res.played !== null && res.played.from === "e7" && res.played.to === "e5" && res.played.uci === "e7e5",
    "played move object populated accurately"
  );
  assert(
    res.best !== null && res.best.from === "c7" && res.best.to === "c5" && res.best.uci === "c7c5" && res.best.san === "c5",
    "best move object populated accurately"
  );
  assert(
    Array.isArray(res.arrows) && res.arrows.length === 2 &&
    res.arrows[0].from === "e7" && res.arrows[0].to === "e5" && res.arrows[0].kind === "played" &&
    res.arrows[1].from === "c7" && res.arrows[1].to === "c5" && res.arrows[1].kind === "best",
    "arrows contains 2 arrows in order: played first, best second"
  );
}

// 2. Played equals best: sameAsBest is true, exactly 1 arrow of kind "best"
{
  const res = getCompareData(handBuiltFixtures, 1);
  assert(res !== null && res.sameAsBest === true, "sameAsBest is true when played matches best");
  assert(
    Array.isArray(res.arrows) && res.arrows.length === 1 &&
    res.arrows[0].from === "g1" && res.arrows[0].to === "f3" && res.arrows[0].kind === "best",
    "arrows contains exactly 1 arrow with kind: 'best' when sameAsBest is true"
  );
}

// 3. Same squares but different promotion: not sameAsBest, 2 arrows
{
  const res = getCompareData(handBuiltFixtures, 2);
  assert(res.sameAsBest === false, "sameAsBest is false when promotion letters differ ('q' vs 'r')");
  assert(
    res.arrows.length === 2 &&
    res.arrows[0].kind === "played" && res.arrows[1].kind === "best",
    "Different promotions produce 2 arrows (played first, best second)"
  );
}

// 4. Missing bestMove: best is null, sameAsBest is false, only played arrow
{
  const res = getCompareData(handBuiltFixtures, 3);
  assert(res.best === null, "best is null when evalBefore.bestMove is null");
  assert(res.sameAsBest === false, "sameAsBest is false when best is null");
  assert(
    res.arrows.length === 1 && res.arrows[0].kind === "played" && res.arrows[0].from === "h5",
    "Only played arrow included when best is missing"
  );
}

// 5. Missing moveUci: played is null, sameAsBest is false, only best arrow
{
  const res = getCompareData(handBuiltFixtures, 4);
  assert(res.played === null, "played is null when moveUci is missing");
  assert(res.sameAsBest === false, "sameAsBest is false when played is null");
  assert(
    res.arrows.length === 1 && res.arrows[0].kind === "best" && res.arrows[0].from === "d2",
    "Only best arrow included when played is missing"
  );
}

// 6. Both missing: arrows is []
{
  const res = getCompareData(handBuiltFixtures, 5);
  assert(
    res.played === null && res.best === null && res.sameAsBest === false && res.arrows.length === 0,
    "When both played and best are missing, arrows is [] and sameAsBest is false"
  );
}

// 7. Best given as from/to without uci
{
  const res = getCompareData(handBuiltFixtures, 6);
  assert(
    res.best !== null && res.best.from === "d2" && res.best.to === "d4" && res.best.uci === "d2d4",
    "Fallback successfully constructs best move from from/to when uci is omitted"
  );
}

// 8. moveIndex boundary & invalid index checks
{
  assert(getCompareData(handBuiltFixtures, -1) === null, "moveIndex -1 returns null");
  assert(getCompareData(handBuiltFixtures, 100) === null, "moveIndex past the end returns null");
  assert(getCompareData(handBuiltFixtures, 1.5) === null, "Float moveIndex returns null");
  assert(getCompareData(handBuiltFixtures, NaN) === null, "NaN moveIndex returns null");
  assert(getCompareData(handBuiltFixtures, null) === null, "null moveIndex returns null");
  assert(getCompareData(handBuiltFixtures, undefined) === null, "undefined moveIndex returns null");
  assert(getCompareData(handBuiltFixtures, "0") === null, "String moveIndex returns null");
}

// 9. Evaluations array invalid checks
{
  assert(getCompareData(null, 0) === null, "null evaluations returns null");
  assert(getCompareData(undefined, 0) === null, "undefined evaluations returns null");
  assert(getCompareData("not-array", 0) === null, "string evaluations returns null");
  assert(getCompareData({}, 0) === null, "object evaluations returns null");
  assert(getCompareData([], 0) === null, "empty evaluations returns null");
}

// 10. Null entry in evaluations array
{
  assert(getCompareData(handBuiltFixtures, 7) === null, "Null entry in evaluations returns null safely");
}

// 11. Immutability check
{
  assert(
    JSON.stringify(handBuiltFixtures) === fixturesSnapshot,
    "getCompareData does not mutate input array or its objects"
  );
}

const BLUNDER_PGN = `[Event "Queen Blunder"]
[White "White"]
[Black "Black"]
[Result "1-0"]

1. e4 e5 2. Qh5 g6 3. Qxe5+ Be7 4. Qxh8 1-0`;

async function testQueenBlunder() {
  console.log("\n[Test Suite 3] Real Pipeline Integration: Queen Blunder Game");
  const game = loadGameFromPgn(BLUNDER_PGN);
  const analysis = await analyseGame(game, { depth: 8 });
  const categorized = categorizeGame(analysis);

  let bestMoveCount = 0;

  for (let i = 0; i < categorized.evaluations.length; i++) {
    const ev = categorized.evaluations[i];
    const compare = getCompareData(categorized.evaluations, i);

    assert(compare !== null, `Move ${i} (${ev.moveSan}) returned non-null compareData`);
    assert(compare.moveIndex === i, `Move ${i} moveIndex matches`);
    assert(compare.fenBefore === ev.fenBefore, `Move ${i} fenBefore matches`);

    // Verify move legality in fenBefore using chess.js
    const chess = new Chess(compare.fenBefore);
    const legalMoves = chess.moves({ verbose: true });

    // 1. Played move must be legal in fenBefore
    if (compare.played) {
      const isPlayedLegal = legalMoves.some(
        (m) =>
          m.from === compare.played.from &&
          m.to === compare.played.to &&
          (m.promotion || null) === compare.played.promotion
      );
      assert(
        isPlayedLegal,
        `Move ${i} played move (${compare.played.uci}) is strictly legal in fenBefore`
      );
    }

    // 2. Best move must be legal in that SAME position (fenBefore)
    if (compare.best) {
      bestMoveCount++;
      const isBestLegal = legalMoves.some(
        (m) =>
          m.from === compare.best.from &&
          m.to === compare.best.to &&
          (m.promotion || null) === compare.best.promotion
      );
      assert(
        isBestLegal,
        `Move ${i} engine best move (${compare.best.uci}) is strictly legal in fenBefore`
      );
    }

    // 3. Arrow checks
    if (compare.sameAsBest) {
      assert(
        compare.arrows.length === 1 && compare.arrows[0].kind === "best",
        `Move ${i} sameAsBest has exactly 1 'best' arrow`
      );
    } else {
      const expectedArrowCount = (compare.played ? 1 : 0) + (compare.best ? 1 : 0);
      assert(
        compare.arrows.length === expectedArrowCount,
        `Move ${i} arrows length matches expected count (${expectedArrowCount})`
      );
      if (compare.played && compare.best) {
        assert(
          compare.arrows[0].kind === "played" && compare.arrows[1].kind === "best",
          `Move ${i} arrows ordered played first, best second`
        );
      }
    }
  }

  console.log(`  Report: ${bestMoveCount} of ${categorized.evaluations.length} moves had an engine best move.`);
  assert(
    bestMoveCount === categorized.evaluations.length,
    "All moves in Queen Blunder game had a valid engine best move"
  );
}

const SCHOLARS_MATE_PGN = `[Event "Scholar's Mate"]
[White "Scholar"]
[Black "Novice"]
[Result "1-0"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0`;

async function testScholarsMate() {
  console.log("\n[Test Suite 4] Real Pipeline Integration: Scholar's Mate Game");
  const game = loadGameFromPgn(SCHOLARS_MATE_PGN);
  const analysis = await analyseGame(game, { depth: 8 });
  const categorized = categorizeGame(analysis);

  let bestMoveCount = 0;

  for (let i = 0; i < categorized.evaluations.length; i++) {
    const ev = categorized.evaluations[i];
    const compare = getCompareData(categorized.evaluations, i);

    assert(compare !== null, `Scholar's Move ${i} (${ev.moveSan}) returned non-null compareData`);

    const chess = new Chess(compare.fenBefore);
    const legalMoves = chess.moves({ verbose: true });

    if (compare.played) {
      const isPlayedLegal = legalMoves.some(
        (m) =>
          m.from === compare.played.from &&
          m.to === compare.played.to &&
          (m.promotion || null) === compare.played.promotion
      );
      assert(
        isPlayedLegal,
        `Scholar's Move ${i} played move (${compare.played.uci}) is strictly legal in fenBefore`
      );
    }

    if (compare.best) {
      bestMoveCount++;
      const isBestLegal = legalMoves.some(
        (m) =>
          m.from === compare.best.from &&
          m.to === compare.best.to &&
          (m.promotion || null) === compare.best.promotion
      );
      assert(
        isBestLegal,
        `Scholar's Move ${i} engine best move (${compare.best.uci}) is strictly legal in fenBefore`
      );
    }
  }

  console.log(`  Report: ${bestMoveCount} of ${categorized.evaluations.length} moves had an engine best move.`);
  assert(
    bestMoveCount === categorized.evaluations.length,
    "All moves in Scholar's Mate had a valid engine best move"
  );
}

/**
 * Convention Check Documentation:
 * In this codebase (components/ChessBoardReplay, lib/chessEngine.js, lib/gameAnalysis.js, and stockfishEngine.js):
 * Castling is represented by the King's starting square and destination square:
 * - White Kingside: "e1g1" (from: "e1", to: "g1")
 * - White Queenside: "e1c1" (from: "e1", to: "c1")
 * - Black Kingside: "e8g8" (from: "e8", to: "g8")
 * - Black Queenside: "e8c8" (from: "e8", to: "c8")
 * Both chess.js history UCI output and Stockfish standard UCI protocol output use this identical convention.
 */
async function testCastling() {
  console.log("\n[Test Suite 5] Castling Convention & Arrow Coordinates");
  const CASTLING_PGN = `[Event "Castling Test"]
[White "W"]
[Black "B"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6 *`;

  const game = loadGameFromPgn(CASTLING_PGN);
  // Move 6 (0-based) is White's 4. O-O
  const castleMove = game.moves[6];
  assert(castleMove.san === "O-O", "Identified White castling move 4. O-O");

  const analysis = await analyseGame(game, { depth: 8 });
  const categorized = categorizeGame(analysis);

  const castleCompare = getCompareData(categorized.evaluations, 6);
  assert(castleCompare !== null, "getCompareData for castling move returns non-null");

  // Assert parseUciMove accepts the played move UCI
  const parsedCastle = parseUciMove(castleMove.from + castleMove.to);
  assert(
    parsedCastle !== null && parsedCastle.from === "e1" && parsedCastle.to === "g1",
    "parseUciMove('e1g1') accepts kingside castling with king coordinates e1 -> g1"
  );

  // Assert arrow squares are the king's squares
  const playedArrow = castleCompare.arrows.find((a) => a.kind === "played") ||
    (castleCompare.sameAsBest ? castleCompare.arrows[0] : null);

  assert(
    playedArrow !== null && playedArrow.from === "e1" && playedArrow.to === "g1",
    `Castling arrow spans king's squares e1 -> g1 (arrow: ${playedArrow?.from} -> ${playedArrow?.to})`
  );

  // Verify legality in fenBefore
  const chess = new Chess(castleCompare.fenBefore);
  const castleLegal = chess.moves({ verbose: true }).some(
    (m) => m.from === "e1" && m.to === "g1"
  );
  assert(castleLegal, "White O-O (e1g1) is confirmed legal in fenBefore");
}

// ================================================================
// Section 6: Real Pipeline on Fischer-Spassky Game (85 ply)
// ================================================================
const FISCHER_SPASSKY_PGN = `[Event "F/S Return Match"]
[Site "Belgrade, Serbia JUG"]
[Date "1992.11.04"]
[Round "29"]
[White "Fischer, Robert J."]
[Black "Spassky, Boris V."]
[Result "1/2-1/2"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3
O-O 9. h3 Nb8 10. d4 Nbd7 11. c4 c6 12. cxb5 axb5 13. Nc3 Bb7 14. Bg5 b4 15.
Nb1 h6 16. Bh4 c5 17. dxe5 Nxe4 18. Bxe7 Qxe7 19. exd6 Qf6 20. Nbd2 Nxd6 21.
Nc4 Nxc4 22. Bxc4 Nb6 23. Ne5 Rae8 24. Bxf7+ Rxf7 25. Nxf7 Rxe1+ 26. Qxe1 Kxf7
27. Qe3 Qg5 28. Qxg5 hxg5 29. b3 Ke6 30. a3 Kd6 31. axb4 cxb4 32. Ra5 Nd5 33.
f3 Bc8 34. Kf2 Bf5 35. Ra7 g6 36. Ra6+ Kc5 37. Ke1 Nf4 38. g3 Nxh3 39. Kd2 Kb5
40. Rd6 Kc5 41. Ra6 Nf2 42. g4 Bd3 43. Re6 1/2-1/2`;

async function testFischerSpassky() {
  console.log("\n[Test Suite 6] Real Pipeline Integration: Fischer-Spassky Game (85 ply)");
  const game = loadGameFromPgn(FISCHER_SPASSKY_PGN);
  const analysis = await analyseGame(game, { depth: 8 });
  const categorized = categorizeGame(analysis);

  let bestMoveCount = 0;
  let allMovesLegal = true;
  let allCompareNonNull = true;

  for (let i = 0; i < categorized.evaluations.length; i++) {
    const compare = getCompareData(categorized.evaluations, i);

    if (!compare) {
      allCompareNonNull = false;
      continue;
    }

    const chess = new Chess(compare.fenBefore);
    const legalMoves = chess.moves({ verbose: true });

    if (compare.played) {
      const isPlayedLegal = legalMoves.some(
        (m) =>
          m.from === compare.played.from &&
          m.to === compare.played.to &&
          (m.promotion || null) === compare.played.promotion
      );
      if (!isPlayedLegal) {
        allMovesLegal = false;
      }
    }

    if (compare.best) {
      bestMoveCount++;
      const isBestLegal = legalMoves.some(
        (m) =>
          m.from === compare.best.from &&
          m.to === compare.best.to &&
          (m.promotion || null) === compare.best.promotion
      );
      if (!isBestLegal) {
        allMovesLegal = false;
      }
    }
  }

  assert(allCompareNonNull, "Every move in Fischer-Spassky returned non-null compareData");
  assert(allMovesLegal, `All 85 moves (played & best) are strictly legal in fenBefore`);
  assert(
    categorized.evaluations.length === 85,
    `Fischer-Spassky analyzed exactly 85 plies (got ${categorized.evaluations.length})`
  );
  console.log(`  Report: ${bestMoveCount} of ${categorized.evaluations.length} moves had an engine best move.`);
  assert(
    bestMoveCount === categorized.evaluations.length,
    `All 85 moves in Fischer-Spassky had an engine best move`
  );
}

// ----------------------------------------------------------------
// Runner
// ----------------------------------------------------------------
async function main() {
  try {
    await testQueenBlunder();
    await testScholarsMate();
    await testCastling();
    await testFischerSpassky();
  } catch (err) {
    failedCount++;
    console.error("  ✗ FAIL: Pipeline test threw an unexpected error:", err);
  } finally {
    terminateStockfish();
  }

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
