import { Chess } from "chess.js";

/**
 * Standard move quality categories.
 */
export const MOVE_CATEGORIES = {
  BRILLIANT: "Brilliant",
  BEST: "Best",
  EXCELLENT: "Excellent",
  GOOD: "Good",
  INACCURACY: "Inaccuracy",
  MISTAKE: "Mistake",
  BLUNDER: "Blunder",
};

/**
 * Piece material values for tactical/sacrifice heuristics.
 */
const PIECE_VALUES = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

/**
 * Converts a Stockfish score object into effective centipawns from the perspective
 * of the player who made the move.
 *
 * Positive values = favorable for the player.
 * Negative values = unfavorable for the player.
 *
 * @param {Object} score - { type: 'cp'|'mate', value: number, whiteScore: number }
 * @param {'w'|'b'} turn - Player turn ('w' or 'b')
 * @returns {number} Effective score in centipawns.
 */
export function scoreToEffectiveCp(score, turn) {
  if (!score) return 0;

  // whiteScore is normalized from White's perspective (+ = White, - = Black)
  const isWhite = turn === "w";
  const playerWhiteScore = isWhite ? score.whiteScore : -score.whiteScore;

  if (score.type === "mate") {
    const mateDistance = Math.max(1, Math.abs(score.value === 0 ? 1 : score.value));
    // Winning mate: high positive score (+10000 minus distance penalty)
    if (playerWhiteScore > 0) {
      return 10000 - Math.min(mateDistance, 50) * 10;
    }
    // Losing mate: high negative score (-10000 plus distance penalty)
    return -10000 + Math.min(mateDistance, 50) * 10;
  }

  return playerWhiteScore;
}

/**
 * Checks if a score represents a forced winning mate for the player.
 * @param {Object} score
 * @param {'w'|'b'} turn
 * @returns {boolean}
 */
function isWinningMate(score, turn) {
  if (!score || score.type !== "mate") return false;
  return turn === "w" ? score.whiteScore > 0 : score.whiteScore < 0;
}

/**
 * Checks if a score represents a forced losing mate for the player.
 * @param {Object} score
 * @param {'w'|'b'} turn
 * @returns {boolean}
 */
function isLosingMate(score, turn) {
  if (!score || score.type !== "mate") return false;
  return turn === "w" ? score.whiteScore < 0 : score.whiteScore > 0;
}

/**
 * Evaluates whether a move qualifies as a "Brilliant" sacrifice.
 *
 * Conservative heuristic:
 * 1. Must be the engine's best move.
 * 2. Position was not already a trivial blowout (player was not +700 or -300 before).
 * 3. Position remains winning/sound after the move (playerScoreAfter >= -50).
 * 4. Involves a sacrifice: a minor or major piece (Knight, Bishop, Rook, Queen) is placed
 *    on a square where it can be captured by the opponent, without having captured an
 *    equal or higher-value piece on this turn.
 *
 * @private
 * @param {Object} moveEval - Single move evaluation object.
 * @param {boolean} isEngineBest - Whether move matched engine's top choice.
 * @param {number} playerScoreBefore - Player's score before move.
 * @param {number} playerScoreAfter - Player's score after move.
 * @returns {boolean}
 */
function isBrilliantSacrifice(moveEval, isEngineBest, playerScoreBefore, playerScoreAfter) {
  if (!isEngineBest) return false;
  if (playerScoreBefore < -300 || playerScoreBefore > 700) return false;
  if (playerScoreAfter < -50) return false;

  const { fenBefore, fenAfter, moveUci, moveSan } = moveEval;
  if (!fenBefore || !fenAfter || !moveUci || moveUci.length < 4) return false;

  try {
    const chessBefore = new Chess(fenBefore);
    const fromSquare = moveUci.slice(0, 2);
    const toSquare = moveUci.slice(2, 4);

    const pieceBefore = chessBefore.get(fromSquare);
    if (!pieceBefore) return false;

    const movedPieceType = pieceBefore.type.toLowerCase();
    const isMajorOrMinor = ["n", "b", "r", "q"].includes(movedPieceType);
    const movedValue = PIECE_VALUES[movedPieceType] || 0;
    const targetPiece = chessBefore.get(toSquare);
    const capturedValue = targetPiece ? (PIECE_VALUES[targetPiece.type.toLowerCase()] || 0) : 0;

    // Now inspect the position after the move (opponent's turn to move)
    const chessAfter = new Chess(fenAfter);
    const oppCaptures = chessAfter.moves({ verbose: true }).filter((m) => m.captured);

    let isSacrifice = false;

    // Check 1: The moved piece was put on a square where opponent can capture it with material deficit
    if (isMajorOrMinor && capturedValue < movedValue) {
      if (oppCaptures.some((m) => m.to === toSquare)) {
        isSacrifice = true;
      }
    }

    // Check 2: The move uncovered/left a higher-value piece en prise to a lower-value piece
    // (e.g., knight move leaves Queen en prise to bishop or pawn)
    if (!isSacrifice) {
      for (const oppMove of oppCaptures) {
        const victimValue = PIECE_VALUES[oppMove.captured?.toLowerCase()] || 0;
        const attackerPiece = chessAfter.get(oppMove.from);
        const attackerValue = attackerPiece ? (PIECE_VALUES[attackerPiece.type.toLowerCase()] || 0) : 0;
        // If opponent can capture a minor/major piece with a lower-value piece (e.g., bishop takes queen)
        if (victimValue >= 3 && victimValue > attackerValue) {
          isSacrifice = true;
          break;
        }
      }
    }

    return isSacrifice;
  } catch {
    return false;
  }
}

/**
 * Categorizes a single move based on its evaluation before and after.
 *
 * Thresholds:
 * - Brilliant: Top engine move + sound material sacrifice
 * - Best: Top engine move OR evalDrop <= 10 cp
 * - Excellent: 10 < evalDrop <= 25 cp
 * - Good: 25 < evalDrop <= 50 cp
 * - Inaccuracy: 50 < evalDrop <= 100 cp
 * - Mistake: 100 < evalDrop <= 200 cp
 * - Blunder: evalDrop > 200 cp (or critical mate swing)
 *
 * @param {Object} moveEval - Entry from analyseGame().evaluations
 * @returns {{
 *   category: string,
 *   evalDrop: number,
 *   playerScoreBefore: number,
 *   playerScoreAfter: number,
 *   isEngineBestMove: boolean
 * }}
 */
export function categorizeMove(moveEval) {
  const { evalBefore, evalAfter, turn, moveUci, moveSan } = moveEval;

  const playerScoreBefore = scoreToEffectiveCp(evalBefore?.score, turn);
  const playerScoreAfter = scoreToEffectiveCp(evalAfter?.score, turn);

  // Eval drop: positive means the player's position got worse
  let evalDrop = playerScoreBefore - playerScoreAfter;

  // Check if player played the engine's top choice
  const playedUci = (moveUci || "").toLowerCase();
  const playedSan = moveSan || "";
  const bestUci = (evalBefore?.bestMove?.uci || "").toLowerCase();
  const bestSan = evalBefore?.bestMove?.san || "";

  const isEngineBestMove = Boolean(
    (bestUci && playedUci && playedUci === bestUci) ||
    (bestSan && playedSan && playedSan === bestSan)
  );

  // If the player played the exact engine best move, eval drop is effectively 0
  // (guards against minor search horizon fluctuations between positions)
  if (isEngineBestMove && evalDrop > 0) {
    evalDrop = 0;
  }

  // Round eval drop to 1 decimal place
  evalDrop = Math.round(evalDrop * 10) / 10;

  // Check mate edge cases
  const hadWinningMate = isWinningMate(evalBefore?.score, turn);
  const hasWinningMate = isWinningMate(evalAfter?.score, turn);
  const hadLosingMate = isLosingMate(evalBefore?.score, turn);
  const hasLosingMate = isLosingMate(evalAfter?.score, turn);

  // Mate Override 1: Blowing a forced win
  // If player had a forced mate and threw it away to equal or losing position
  const threwAwayWinningMate = hadWinningMate && !hasWinningMate && playerScoreAfter <= 100;

  // Mate Override 2: Hanging a forced mate
  // If player was not being mated, but now opponent has a forced mate
  const allowedForcedMate = !hadLosingMate && hasLosingMate;

  let category;

  if (threwAwayWinningMate || allowedForcedMate || evalDrop > 200) {
    category = MOVE_CATEGORIES.BLUNDER;
  } else if (isBrilliantSacrifice(moveEval, isEngineBestMove, playerScoreBefore, playerScoreAfter)) {
    category = MOVE_CATEGORIES.BRILLIANT;
  } else if (isEngineBestMove || evalDrop <= 10) {
    category = MOVE_CATEGORIES.BEST;
  } else if (evalDrop <= 25) {
    category = MOVE_CATEGORIES.EXCELLENT;
  } else if (evalDrop <= 50) {
    category = MOVE_CATEGORIES.GOOD;
  } else if (evalDrop <= 100) {
    category = MOVE_CATEGORIES.INACCURACY;
  } else if (evalDrop <= 200) {
    category = MOVE_CATEGORIES.MISTAKE;
  } else {
    category = MOVE_CATEGORIES.BLUNDER;
  }

  return {
    category,
    evalDrop,
    playerScoreBefore,
    playerScoreAfter,
    isEngineBestMove,
  };
}

/**
 * Calculates a move's accuracy score (0% to 100%) from its eval drop.
 * @param {number} evalDrop - Centipawn loss (>= 0)
 * @returns {number} Accuracy between 0 and 100.
 */
function calculateMoveAccuracy(evalDrop) {
  if (evalDrop <= 0) return 100;
  // Exponential decay model: drop of 50cp ~ 84%, drop of 100cp ~ 70%, drop of 200cp ~ 50%
  const accuracy = 100 * Math.exp(-0.0035 * evalDrop);
  return Math.max(0, Math.min(100, accuracy));
}

/**
 * Categorizes an entire game analysis result.
 *
 * Enriches each move with:
 * - `evalDrop`: Centipawns lost from player's perspective.
 * - `category`: Brilliant, Best, Excellent, Good, Inaccuracy, Mistake, or Blunder.
 * - `isEngineBestMove`: Boolean flag.
 *
 * Produces a game-level summary containing:
 * - Category counts per color (White, Black) and overall.
 * - Player accuracy percentages (0 - 100%).
 * - Average centipawn loss (eval drop).
 *
 * @param {Object} analysisResult - Output from analyseGame()
 * @returns {{
 *   evaluations: Array<Object>,
 *   summary: {
 *     totalMoves: number,
 *     white: { categories: Object, accuracy: number, averageEvalDrop: number, moveCount: number },
 *     black: { categories: Object, accuracy: number, averageEvalDrop: number, moveCount: number },
 *     categories: Object,
 *     accuracy: number
 *   }
 * }}
 */
export function categorizeGame(analysisResult) {
  if (!analysisResult || !Array.isArray(analysisResult.evaluations)) {
    throw new Error("categorizeGame: invalid analysisResult object — expected evaluations array.");
  }

  const rawEvals = analysisResult.evaluations;

  const createCategoryCounts = () => ({
    [MOVE_CATEGORIES.BRILLIANT]: 0,
    [MOVE_CATEGORIES.BEST]: 0,
    [MOVE_CATEGORIES.EXCELLENT]: 0,
    [MOVE_CATEGORIES.GOOD]: 0,
    [MOVE_CATEGORIES.INACCURACY]: 0,
    [MOVE_CATEGORIES.MISTAKE]: 0,
    [MOVE_CATEGORIES.BLUNDER]: 0,
  });

  const whiteCounts = createCategoryCounts();
  const blackCounts = createCategoryCounts();
  const totalCounts = createCategoryCounts();

  let whiteTotalDrop = 0;
  let blackTotalDrop = 0;
  let whiteAccuracySum = 0;
  let blackAccuracySum = 0;
  let whiteMoveCount = 0;
  let blackMoveCount = 0;

  const categorizedEvaluations = rawEvals.map((moveEval) => {
    const classification = categorizeMove(moveEval);
    const { category, evalDrop } = classification;

    totalCounts[category] = (totalCounts[category] || 0) + 1;
    const moveAccuracy = calculateMoveAccuracy(Math.max(0, evalDrop));

    if (moveEval.turn === "w") {
      whiteCounts[category] = (whiteCounts[category] || 0) + 1;
      whiteTotalDrop += Math.max(0, evalDrop);
      whiteAccuracySum += moveAccuracy;
      whiteMoveCount++;
    } else {
      blackCounts[category] = (blackCounts[category] || 0) + 1;
      blackTotalDrop += Math.max(0, evalDrop);
      blackAccuracySum += moveAccuracy;
      blackMoveCount++;
    }

    return {
      ...moveEval,
      category,
      evalDrop,
      playerScoreBefore: classification.playerScoreBefore,
      playerScoreAfter: classification.playerScoreAfter,
      isEngineBestMove: classification.isEngineBestMove,
      accuracy: Math.round(moveAccuracy * 10) / 10,
    };
  });

  const whiteAvgDrop = whiteMoveCount > 0 ? Math.round((whiteTotalDrop / whiteMoveCount) * 10) / 10 : 0;
  const blackAvgDrop = blackMoveCount > 0 ? Math.round((blackTotalDrop / blackMoveCount) * 10) / 10 : 0;

  const whiteAccuracy = whiteMoveCount > 0 ? Math.round((whiteAccuracySum / whiteMoveCount) * 10) / 10 : 100;
  const blackAccuracy = blackMoveCount > 0 ? Math.round((blackAccuracySum / blackMoveCount) * 10) / 10 : 100;

  const totalMoves = categorizedEvaluations.length;
  const overallAccuracy = totalMoves > 0
    ? Math.round(((whiteAccuracySum + blackAccuracySum) / totalMoves) * 10) / 10
    : 100;

  return {
    evaluations: categorizedEvaluations,
    summary: {
      totalMoves,
      white: {
        categories: whiteCounts,
        accuracy: whiteAccuracy,
        averageEvalDrop: whiteAvgDrop,
        moveCount: whiteMoveCount,
      },
      black: {
        categories: blackCounts,
        accuracy: blackAccuracy,
        averageEvalDrop: blackAvgDrop,
        moveCount: blackMoveCount,
      },
      categories: totalCounts,
      accuracy: overallAccuracy,
    },
  };
}
