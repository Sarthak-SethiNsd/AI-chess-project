import { evaluatePosition, initStockfish, terminateStockfish } from "./stockfishEngine.js";

/**
 * Default analysis depth used when no depth is specified.
 * Depth 12 gives a good quality/speed balance for game review.
 */
export const DEFAULT_ANALYSIS_DEPTH = 12;

/**
 * @typedef {Object} PositionEval
 * @property {number}  moveIndex    - 0-based move index (matches game.moves[i]).
 * @property {number}  ply          - 1-based ply number (moveIndex + 1).
 * @property {string}  moveSan      - SAN of the move played (e.g. "e4", "Qxf7#").
 * @property {string}  moveUci      - UCI of the move played (e.g. "e2e4").
 * @property {'w'|'b'} turn         - Side that played this move.
 * @property {string}  fenBefore    - FEN of position BEFORE this move.
 * @property {string}  fenAfter     - FEN of position AFTER this move.
 * @property {EvalResult} evalBefore - Engine evaluation of fenBefore.
 * @property {EvalResult} evalAfter  - Engine evaluation of fenAfter.
 */

/**
 * @typedef {Object} EvalResult
 * @property {{ type: 'cp'|'mate', value: number, whiteScore: number }} score
 * @property {number}             depth      - Search depth reached.
 * @property {string}             pv         - Principal variation (UCI moves).
 * @property {{ uci: string|null, san: string|null, from: string, to: string, promotion: string|null }} bestMove
 * @property {string}             raw        - Raw "bestmove" UCI line.
 */

/**
 * @typedef {Object} GameAnalysisResult
 * @property {PositionEval[]} evaluations  - Per-move evaluation data (length === game.totalMoves).
 * @property {EvalResult}     finalEval    - Evaluation of the final position after the last move.
 * @property {number}         totalMoves   - Number of half-moves (ply) analysed.
 * @property {number}         elapsedMs    - Wall-clock time in milliseconds for the whole analysis.
 * @property {{ depth?: number, movetime?: number }} options - Options used for analysis.
 */

/**
 * Normalises a depth-or-options argument into a canonical options object.
 * @param {number|{ depth?: number, movetime?: number }} depthOrOptions
 * @returns {{ depth?: number, movetime?: number }}
 */
function resolveOptions(depthOrOptions) {
  if (depthOrOptions == null) {
    return { depth: DEFAULT_ANALYSIS_DEPTH };
  }
  if (typeof depthOrOptions === "number") {
    if (depthOrOptions > 35) {
      return { movetime: Math.max(1, Math.round(depthOrOptions)) };
    }
    return { depth: Math.max(1, Math.round(depthOrOptions)) };
  }
  if (typeof depthOrOptions === "object") {
    const opts = {};
    if (depthOrOptions.depth) opts.depth = Math.max(1, Math.round(depthOrOptions.depth));
    if (depthOrOptions.movetime) opts.movetime = Math.max(1, Math.round(depthOrOptions.movetime));
    if (!opts.depth && !opts.movetime) opts.depth = DEFAULT_ANALYSIS_DEPTH;
    return opts;
  }
  return { depth: DEFAULT_ANALYSIS_DEPTH };
}

/**
 * Analyses every position in a game loaded by `loadGameFromPgn`.
 *
 * For each half-move (ply) the function records:
 *   - `evalBefore`: the engine evaluation of the position BEFORE the move (positions[i]).
 *   - `evalAfter`:  the engine evaluation of the position AFTER the move  (positions[i+1]).
 *
 * These two evaluations are the raw input that the next pipeline step
 * (move categorisation) will use to compute eval-drop and classify quality.
 *
 * Evaluations are submitted to the Stockfish wrapper one at a time and
 * processed through its internal queue — no parallelism, no extra engine
 * instances.  The engine is initialised once and left running so the caller
 * can choose whether to terminate it afterwards (e.g. with `terminateStockfish()`).
 *
 * @param {Object} game
 *   Parsed game object as returned by `loadGameFromPgn`.
 *   Must have `positions` (string[]), `moves` (MoveObject[]), and `totalMoves` (number).
 * @param {number|{ depth?: number, movetime?: number }} [depthOrOptions=12]
 *   Search depth (integer 1-35), or milliseconds if > 35, or an options object.
 * @param {{ onProgress?: (completed: number, total: number) => void }} [callbacks={}]
 *   Optional callback invoked after each position is evaluated.
 *   Useful for building a loading-indicator in a later UI step.
 * @returns {Promise<GameAnalysisResult>}
 */
export async function analyseGame(game, depthOrOptions = DEFAULT_ANALYSIS_DEPTH, callbacks = {}) {
  if (!game || !Array.isArray(game.positions) || !Array.isArray(game.moves)) {
    throw new Error("analyseGame: invalid game object — expected positions[] and moves[] arrays.");
  }

  const totalMoves = game.totalMoves;

  if (totalMoves === 0) {
    return {
      evaluations: [],
      finalEval: null,
      totalMoves: 0,
      elapsedMs: 0,
      options: resolveOptions(depthOrOptions),
    };
  }

  const options = resolveOptions(depthOrOptions);
  const { onProgress } = callbacks;

  // Ensure the engine is warmed up before we start timing.
  await initStockfish();

  const startTime = Date.now();

  // ----------------------------------------------------------------
  // We need one evaluation per unique position.
  // positions[0]            = start (before move 0)
  // positions[1]            = after move 0 / before move 1
  // ...
  // positions[totalMoves]   = after the last move (final position)
  //
  // Total distinct FENs = totalMoves + 1.
  //
  // Strategy: evaluate positions[0] … positions[totalMoves] sequentially,
  // each going through the existing queue in stockfishEngine.js.
  // Then assemble per-move records by pairing consecutive results.
  // ----------------------------------------------------------------

  const positionEvals = []; // length will be totalMoves + 1

  for (let i = 0; i <= totalMoves; i++) {
    const fen = game.positions[i];
    const evalResult = await evaluatePosition(fen, options);
    positionEvals.push(evalResult);

    if (onProgress) {
      try {
        onProgress(i + 1, totalMoves + 1);
      } catch {
        // Never let a callback crash the pipeline.
      }
    }
  }

  // Build the per-move result array.
  const evaluations = game.moves.map((move, i) => ({
    moveIndex: i,
    ply: move.ply,
    moveSan: move.san,
    moveUci: `${move.from}${move.to}${move.promotion || ""}`,
    turn: move.turn,
    fenBefore: game.positions[i],     // positions[i]   = FEN before move i
    fenAfter: game.positions[i + 1],  // positions[i+1] = FEN after  move i
    evalBefore: positionEvals[i],
    evalAfter: positionEvals[i + 1],
  }));

  const elapsedMs = Date.now() - startTime;

  return {
    evaluations,
    finalEval: positionEvals[totalMoves],
    totalMoves,
    elapsedMs,
    options,
  };
}
