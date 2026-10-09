/**
 * Evaluation Series Helper
 *
 * Transforms per-ply engine evaluation and categorization data into a normalized
 * time-series array suitable for rendering evaluation graphs and charts.
 */

export const EVAL_CLAMP_CP = 1000;

/**
 * Normalizes an engine evaluation result into score metrics.
 *
 * Real shapes in this codebase:
 * - cp score: { type: 'cp', value: number, whiteScore: number }
 * - mate score: { type: 'mate', value: number, whiteScore: number }
 * - stalemate/draw: { type: 'cp', value: 0, whiteScore: 0 }
 *
 * Sign convention for mateIn:
 * In this codebase's engine pipeline (lib/stockfishEngine.js):
 * - `score.value` represents the mate distance:
 *   - An integer indicating moves until mate.
 *   - For a delivered checkmate (terminal game-over position), `score.value === 0` (mate in 0).
 *   - From Stockfish UCI protocol: positive indicates the side to move is delivering mate;
 *     negative indicates the side to move is being mated.
 * - Meanwhile, `score.whiteScore` is normalized to White's perspective (+ for White winning, - for Black winning):
 *   - For an active mate search: positive if White is mating, negative if Black is mating.
 *   - For a delivered checkmate: `+999` if White delivered checkmate, `-999` if Black delivered checkmate.
 * - `mateIn` preserves the mate distance provided by `score.value` (or 0 for terminal mate).
 *
 * @param {Object|null|undefined} evalObj - EvalResult object (evalBefore or evalAfter).
 * @param {Object|null|undefined} [moveContext=null] - Optional move metadata for sign resolution.
 * @param {'w'|'b'|null} [moveContext.turn] - The side that played the move.
 * @returns {{ whiteScore: number, displayScore: number, isMate: boolean, mateIn: number|null }}
 */
function extractScoreData(evalObj, moveContext = null) {
  if (!evalObj || typeof evalObj !== "object" || !evalObj.score || typeof evalObj.score !== "object") {
    return {
      whiteScore: 0,
      displayScore: 0,
      isMate: false,
      mateIn: null,
    };
  }

  const { score } = evalObj;

  // Checkmate / forced mate positions
  if (score.type === "mate") {
    // Mate distance as provided by the engine data
    let mateDistance = null;
    if (typeof score.value === "number" && Number.isFinite(score.value)) {
      mateDistance = score.value;
    } else if (typeof score.mateIn === "number" && Number.isFinite(score.mateIn)) {
      mateDistance = score.mateIn;
    } else if (typeof score.mate === "number" && Number.isFinite(score.mate)) {
      mateDistance = score.mate;
    } else if (typeof score.whiteScore === "number" && Number.isFinite(score.whiteScore)) {
      mateDistance = Math.abs(score.whiteScore) === 999 ? 0 : score.whiteScore;
    }

    // Determine whether White or Black is the side mating.
    // In stockfishEngine.js:
    // 1. For active mate: `score.whiteScore > 0` = White mating, `score.whiteScore < 0` = Black mating.
    // 2. For delivered checkmate: `score.value === 0`, and `score.whiteScore` is +999 (White won) or -999 (Black won).
    // 3. Fallback: if whiteScore is absent or 0, check the player who delivered the move (`moveContext.turn`).
    let isWhiteMating = true;
    if (typeof score.whiteScore === "number" && Number.isFinite(score.whiteScore) && score.whiteScore !== 0) {
      isWhiteMating = score.whiteScore > 0;
    } else if (mateDistance === 0) {
      // Delivered checkmate: the side that just moved delivered the checkmate
      isWhiteMating = moveContext?.turn === "b" ? false : true;
    } else if (typeof score.value === "number" && Number.isFinite(score.value)) {
      isWhiteMating = score.value > 0;
    }

    const displayScore = isWhiteMating ? EVAL_CLAMP_CP : -EVAL_CLAMP_CP;
    const whiteScore =
      typeof score.whiteScore === "number" && Number.isFinite(score.whiteScore)
        ? score.whiteScore
        : displayScore;

    return {
      whiteScore,
      displayScore,
      isMate: true,
      mateIn: mateDistance,
    };
  }

  // Centipawns (cp) or missing type
  let rawWhiteScore = 0;
  if (typeof score.whiteScore === "number" && Number.isFinite(score.whiteScore)) {
    rawWhiteScore = score.whiteScore;
  } else if (typeof score.value === "number" && Number.isFinite(score.value)) {
    rawWhiteScore = score.value;
  }

  const displayScore = Math.max(-EVAL_CLAMP_CP, Math.min(EVAL_CLAMP_CP, rawWhiteScore));

  return {
    whiteScore: rawWhiteScore,
    displayScore,
    isMate: false,
    mateIn: null,
  };
}

/**
 * Builds an evaluation series array for graphing and timeline navigation.
 *
 * Input:
 *   The per-ply array produced by analysis + categorization (entries with evalBefore, evalAfter, moveSan, turn, category).
 *
 * Output:
 *   An array of `totalMoves + 1` points:
 *   - Index 0: starting position before any move, taken from the FIRST move's evalBefore.
 *     moveSan, category, turn are null for this point.
 *   - Index i (i >= 1): evalAfter of the i-th move (evaluations[i - 1]),
 *     with that move's moveSan, category, and turn (the side that moved).
 *
 * Each point:
 *   { index, whiteScore, displayScore, isMate, mateIn, moveSan, category, turn }
 *
 * - whiteScore = White-perspective score from existing data.
 * - displayScore = whiteScore clamped to [-EVAL_CLAMP_CP, +EVAL_CLAMP_CP].
 * - Mate: displayScore = +EVAL_CLAMP_CP if White is mating, -EVAL_CLAMP_CP if Black is.
 * - Draw / stalemate = 0.
 * - Missing, null, undefined, or NaN scores resolve to displayScore 0 without throwing.
 * - Empty array, null, or non-array input returns [].
 * - Pure function: does not mutate the input, uses no browser/Node-only APIs.
 *
 * @param {Array<Object>|null|undefined} evaluations - Array of per-ply move evaluations.
 * @returns {Array<{ index: number, whiteScore: number, displayScore: number, isMate: boolean, mateIn: number|null, moveSan: string|null, category: string|null, turn: string|null }>}
 */
export function buildEvalSeries(evaluations) {
  if (!Array.isArray(evaluations) || evaluations.length === 0) {
    return [];
  }

  const series = [];

  // Point 0: starting position before any moves, taken from the first move's evalBefore
  const firstMove = evaluations[0];
  const startScoreData = extractScoreData(firstMove?.evalBefore);

  series.push({
    index: 0,
    whiteScore: startScoreData.whiteScore,
    displayScore: startScoreData.displayScore,
    isMate: startScoreData.isMate,
    mateIn: startScoreData.mateIn,
    moveSan: null,
    category: null,
    turn: null,
  });

  // Points 1..N: after each move i (0-based moveIndex in evaluations)
  for (let i = 0; i < evaluations.length; i++) {
    const move = evaluations[i];
    const scoreData = extractScoreData(move?.evalAfter, move);

    series.push({
      index: i + 1,
      whiteScore: scoreData.whiteScore,
      displayScore: scoreData.displayScore,
      isMate: scoreData.isMate,
      mateIn: scoreData.mateIn,
      moveSan: move?.moveSan ?? null,
      category: move?.category ?? null,
      turn: move?.turn ?? null,
    });
  }

  return series;
}

/**
 * Returns the series point that shows the position AFTER that move.
 *
 * Move index convention:
 * In this project (lib/gameAnalysis.js and lib/chessEngine.js), `moveIndex` is 0-based:
 * - `moveIndex = 0` corresponds to the 1st move played (ply 1, e.g. 1. e4).
 * - `moveIndex = 1` corresponds to the 2nd move played (ply 2, e.g. 1... e5).
 * - `moveIndex = totalMoves - 1` corresponds to the final move played.
 *
 * Because series[0] represents the starting position before move 0,
 * the position AFTER moveIndex `i` is stored at series[i + 1].
 *
 * @param {Array<Object>|null|undefined} series - Output array from buildEvalSeries.
 * @param {number} moveIndex - 0-based move index.
 * @returns {Object|null} The series point showing the position after that move, or null if invalid/out-of-range.
 */
export function getPointForMoveIndex(series, moveIndex) {
  if (!Array.isArray(series) || series.length < 2) {
    return null;
  }

  if (typeof moveIndex !== "number" || !Number.isInteger(moveIndex)) {
    return null;
  }

  if (moveIndex < 0 || moveIndex + 1 >= series.length) {
    return null;
  }

  return series[moveIndex + 1];
}
