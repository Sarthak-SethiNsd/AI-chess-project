import { loadGameFromPgn } from "../lib/chessEngine.js";
import { analyseGame } from "../lib/gameAnalysis.js";
import { categorizeGame, MOVE_CATEGORIES } from "../lib/moveCategorization.js";
import { terminateStockfish } from "../lib/stockfishEngine.js";

// ----------------------------------------------------------------
// Sample PGNs
// ----------------------------------------------------------------

// Game 1: Scholar's Mate — 7 ply, checkmate
const SCHOLARS_MATE_PGN = `[Event "Scholar's Mate"]
[White "Scholar"]
[Black "Novice"]
[Result "1-0"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0`;

// Game 2: Queen/Rook Blunder — 7 ply
// Black plays 2... g6?? hanging e5 with check and the h8 rook!
const BLUNDER_PGN = `[Event "Queen Blunder"]
[White "White"]
[Black "Black"]
[Result "1-0"]

1. e4 e5 2. Qh5 g6 3. Qxe5+ Be7 4. Qxh8 1-0`;

console.log("=== Testing Move Categorization Pipeline ===\n");

function printMoveTable(evaluations) {
  console.log("---------------------------------------------------------------------------------------------------");
  console.log("| Ply | Move   | By | Best Engine Move | Eval Before | Eval After  | Eval Drop | Category   | Acc % |");
  console.log("---------------------------------------------------------------------------------------------------");
  for (const m of evaluations) {
    const plyStr = String(m.ply).padEnd(3);
    const moveStr = String(m.moveSan).padEnd(6);
    const byStr = (m.turn === "w" ? "W" : "B").padEnd(2);
    const bestMoveStr = String(m.evalBefore?.bestMove?.san || "-").padEnd(16);
    const beforeStr = String(m.playerScoreBefore).padEnd(11);
    const afterStr = String(m.playerScoreAfter).padEnd(11);
    const dropStr = (m.evalDrop > 0 ? `+${m.evalDrop}` : `${m.evalDrop}`).padEnd(9);
    const catStr = String(m.category).padEnd(10);
    const accStr = `${m.accuracy}%`.padEnd(5);
    console.log(`| ${plyStr} | ${moveStr} | ${byStr} | ${bestMoveStr} | ${beforeStr} | ${afterStr} | ${dropStr} | ${catStr} | ${accStr} |`);
  }
  console.log("---------------------------------------------------------------------------------------------------\n");
}

async function runTests() {
  try {
    // ============================================================
    // Test 1: Scholar's Mate
    // ============================================================
    console.log("[Test 1] Analyzing & Categorizing Scholar's Mate (7 ply):");
    const game1 = loadGameFromPgn(SCHOLARS_MATE_PGN);
    const analysis1 = await analyseGame(game1, { depth: 10 });
    const categorized1 = categorizeGame(analysis1);

    printMoveTable(categorized1.evaluations);

    // Assertions for Game 1
    const { evaluations: evals1, summary: sum1 } = categorized1;

    // 1. Move count check
    console.log(`  Evaluations count matches totalMoves (${game1.totalMoves}):`,
      evals1.length === game1.totalMoves ? "PASS" : "FAIL"
    );

    // 2. Category count sum matches totalMoves
    const categorySum1 = Object.values(sum1.categories).reduce((a, b) => a + b, 0);
    console.log(`  Summary categories count matches totalMoves (${categorySum1}/${game1.totalMoves}):`,
      categorySum1 === game1.totalMoves ? "PASS" : "FAIL"
    );

    const whiteSum1 = Object.values(sum1.white.categories).reduce((a, b) => a + b, 0);
    const blackSum1 = Object.values(sum1.black.categories).reduce((a, b) => a + b, 0);
    console.log(`  White moves (${whiteSum1}) + Black moves (${blackSum1}) === totalMoves (${game1.totalMoves}):`,
      whiteSum1 + blackSum1 === game1.totalMoves ? "PASS" : "FAIL"
    );

    // 3. Move 3... Nf6?? (index 5) is Blunder (allows Qxf7#)
    const moveNf6 = evals1[5];
    console.log(`  Move 3... Nf6 correctly flagged as Blunder (got "${moveNf6.category}"):`,
      moveNf6.category === MOVE_CATEGORIES.BLUNDER ? "PASS" : "FAIL"
    );

    // 4. Move 4. Qxf7# (index 6) is Best
    const moveQxf7 = evals1[6];
    console.log(`  Move 4. Qxf7# correctly flagged as Best (got "${moveQxf7.category}"):`,
      moveQxf7.category === MOVE_CATEGORIES.BEST ? "PASS" : "FAIL"
    );

    // 5. Accuracy is valid percentage (0 - 100)
    console.log(`  White accuracy (${sum1.white.accuracy}%) is between 0 and 100:`,
      sum1.white.accuracy >= 0 && sum1.white.accuracy <= 100 ? "PASS" : "FAIL"
    );
    console.log(`  Black accuracy (${sum1.black.accuracy}%) is between 0 and 100:`,
      sum1.black.accuracy >= 0 && sum1.black.accuracy <= 100 ? "PASS" : "FAIL"
    );

    if (
      evals1.length !== game1.totalMoves ||
      categorySum1 !== game1.totalMoves ||
      moveNf6.category !== MOVE_CATEGORIES.BLUNDER ||
      moveQxf7.category !== MOVE_CATEGORIES.BEST
    ) {
      throw new Error("Scholar's Mate categorization assertions failed.");
    }

    // ============================================================
    // Test 2: Queen Blunder Game
    // ============================================================
    console.log("\n[Test 2] Analyzing & Categorizing Queen/Rook Blunder Game (7 ply):");
    const game2 = loadGameFromPgn(BLUNDER_PGN);
    const analysis2 = await analyseGame(game2, { depth: 10 });
    const categorized2 = categorizeGame(analysis2);

    printMoveTable(categorized2.evaluations);

    const { evaluations: evals2, summary: sum2 } = categorized2;

    // 1. Category sum check
    const categorySum2 = Object.values(sum2.categories).reduce((a, b) => a + b, 0);
    console.log(`  Summary categories count matches totalMoves (${categorySum2}/${game2.totalMoves}):`,
      categorySum2 === game2.totalMoves ? "PASS" : "FAIL"
    );

    // 2. Move 2... g6?? (index 3) is Blunder (hangs e5 pawn with check + rook h8)
    const moveG6 = evals2[3];
    console.log(`  Move 2... g6?? correctly flagged as Blunder (got "${moveG6.category}", eval drop +${moveG6.evalDrop}cp):`,
      moveG6.category === MOVE_CATEGORIES.BLUNDER ? "PASS" : "FAIL"
    );

    // 3. Move 3. Qxe5+ (index 4) is Best
    const moveQxe5 = evals2[4];
    console.log(`  Move 3. Qxe5+ correctly flagged as Best (got "${moveQxe5.category}"):`,
      moveQxe5.category === MOVE_CATEGORIES.BEST ? "PASS" : "FAIL"
    );

    // 4. Move 4. Qxh8 (index 6) is Best
    const moveQxh8 = evals2[6];
    console.log(`  Move 4. Qxh8 correctly flagged as Best (got "${moveQxh8.category}"):`,
      moveQxh8.category === MOVE_CATEGORIES.BEST ? "PASS" : "FAIL"
    );

    // 5. Blunder count in summary
    console.log(`  Summary tracks at least 1 Blunder (found ${sum2.categories[MOVE_CATEGORIES.BLUNDER]}):`,
      sum2.categories[MOVE_CATEGORIES.BLUNDER] >= 1 ? "PASS" : "FAIL"
    );
    console.log(`  Summary tracks Best moves (found ${sum2.categories[MOVE_CATEGORIES.BEST]}):`,
      sum2.categories[MOVE_CATEGORIES.BEST] >= 1 ? "PASS" : "FAIL"
    );

    if (
      categorySum2 !== game2.totalMoves ||
      moveG6.category !== MOVE_CATEGORIES.BLUNDER ||
      moveQxe5.category !== MOVE_CATEGORIES.BEST
    ) {
      throw new Error("Queen Blunder categorization assertions failed.");
    }

    console.log("\n=== All Move Categorization Tests Passed Successfully! ===\n");
  } catch (err) {
    console.error("\n[TEST ERROR]:", err);
    process.exit(1);
  } finally {
    terminateStockfish();
  }
}

runTests();
