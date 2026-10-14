/**
 * Critical Move Finder (pure logic, no React)
 *
 * Identifies high-impact turning points (Mistakes and Blunders) in a chess game
 * and provides navigation helpers (next/prev critical move) for replay review.
 */

/**
 * Move quality categories considered "critical" for game review navigation.
 * Named constant, easy to extend or modify (e.g. adding "Inaccuracy" in future).
 */
export const CRITICAL_CATEGORIES = ["Mistake", "Blunder"];

/**
 * Normalises a side parameter ('w', 'b', 'white', 'black') to standard 'w' | 'b'.
 * If side is missing or unrecognised (e.g., null, undefined, or any value other
 * than 'w', 'b', 'white', 'black'), returns null, which signals that moves for
 * both sides should be retained.
 *
 * @param {string|null|undefined} side
 * @returns {'w'|'b'|null}
 */
function normalizeSide(side) {
  if (typeof side !== "string") {
    return null;
  }
  const s = side.trim().toLowerCase();
  if (s === "w" || s === "white") {
    return "w";
  }
  if (s === "b" || s === "black") {
    return "b";
  }
  // Unrecognised side value -> return null (keeps both sides)
  return null;
}

/**
 * Filters and extracts critical moves from an array of categorized move evaluations.
 *
 * Side filtering:
 * - 'w' or 'white': returns only moves played by White.
 * - 'b' or 'black': returns only moves played by Black.
 * - If `side` is missing or unrecognised (null, undefined, invalid string, etc.),
 *   moves from BOTH sides are returned.
 *
 * Output format:
 * - Returns an array of `{ moveIndex, ply, moveSan, turn, category, evalDrop }`,
 *   sorted by `moveIndex` ascending.
 * - Pure function: does not mutate the input array or its objects.
 * - Robustness: never throws on null, undefined, non-array, empty, entries with
 *   missing fields, or unknown categories.
 *
 * @param {Array<Object>|null|undefined} evaluations - Array of categorized move evaluations.
 * @param {{ side?: string|null }} [options={}] - Optional configuration including side filter.
 * @returns {Array<{ moveIndex: number, ply: number, moveSan: string, turn: string, category: string, evalDrop: number }>}
 */
export function findCriticalMoves(evaluations, { side } = {}) {
  if (!Array.isArray(evaluations) || evaluations.length === 0) {
    return [];
  }

  // If side is missing or unrecognised, targetSide is null and both sides are returned.
  const targetSide = normalizeSide(side);

  const matched = [];

  for (let i = 0; i < evaluations.length; i++) {
    const item = evaluations[i];
    if (!item || typeof item !== "object") {
      continue;
    }

    if (!CRITICAL_CATEGORIES.includes(item.category)) {
      continue;
    }

    if (targetSide !== null && item.turn !== targetSide) {
      continue;
    }

    matched.push({
      moveIndex: item.moveIndex ?? null,
      ply: item.ply ?? null,
      moveSan: item.moveSan ?? null,
      turn: item.turn ?? null,
      category: item.category ?? null,
      evalDrop: item.evalDrop ?? null,
    });
  }

  // Sort a shallow copy ascending by moveIndex (defensive against out-of-order evaluations)
  matched.sort((a, b) => {
    const idxA = typeof a.moveIndex === "number" ? a.moveIndex : 0;
    const idxB = typeof b.moveIndex === "number" ? b.moveIndex : 0;
    return idxA - idxB;
  });

  return matched;
}

/**
 * Replay Move Index Convention:
 * In this codebase (components/ChessBoardReplay.js, lib/evalSeries.js, lib/gameAnalysis.js):
 * - `currentMoveIndex = -1` represents the starting board position before any moves have been played.
 * - `currentMoveIndex = i` (where i >= 0) represents the board position AFTER move `i` (0-based) has been played.
 *
 * `getNextCriticalMove` returns the first critical move whose `moveIndex` is strictly greater
 * than `currentMoveIndex`, or `null` if none exists.
 *
 * When `currentMoveIndex` is already at a critical move, this skips that move and returns the next one.
 *
 * Robustness:
 * - Does not assume `criticalMoves` is sorted (filters and sorts a fresh copy of candidate moves).
 * - Does not mutate the input array.
 * - Returns `null` on invalid input (non-array, empty array, non-integer index, NaN, Infinity).
 *
 * @param {Array<Object>|null|undefined} criticalMoves - Array of critical move objects.
 * @param {number} currentMoveIndex - Current position move index (-1 for start, 0..N-1 for moves).
 * @returns {Object|null} Next critical move object, or null.
 */
export function getNextCriticalMove(criticalMoves, currentMoveIndex) {
  if (!Array.isArray(criticalMoves) || criticalMoves.length === 0) {
    return null;
  }

  if (
    typeof currentMoveIndex !== "number" ||
    Number.isNaN(currentMoveIndex) ||
    !Number.isInteger(currentMoveIndex)
  ) {
    return null;
  }

  const candidates = criticalMoves.filter(
    (m) =>
      m &&
      typeof m.moveIndex === "number" &&
      Number.isInteger(m.moveIndex) &&
      m.moveIndex > currentMoveIndex
  );

  if (candidates.length === 0) {
    return null;
  }

  // Sort candidates ascending by moveIndex so candidates[0] is the nearest subsequent critical move
  candidates.sort((a, b) => a.moveIndex - b.moveIndex);

  return candidates[0];
}

/**
 * Replay Move Index Convention:
 * In this codebase (components/ChessBoardReplay.js, lib/evalSeries.js, lib/gameAnalysis.js):
 * - `currentMoveIndex = -1` represents the starting board position before any moves have been played.
 * - `currentMoveIndex = i` (where i >= 0) represents the board position AFTER move `i` (0-based) has been played.
 *
 * `getPrevCriticalMove` returns the last critical move whose `moveIndex` is strictly less
 * than `currentMoveIndex`, or `null` if none exists.
 *
 * When `currentMoveIndex` is already at a critical move, this skips that move and returns the previous one.
 *
 * Robustness:
 * - Does not assume `criticalMoves` is sorted (filters and sorts a fresh copy of candidate moves).
 * - Does not mutate the input array.
 * - Returns `null` on invalid input (non-array, empty array, non-integer index, NaN, Infinity).
 *
 * @param {Array<Object>|null|undefined} criticalMoves - Array of critical move objects.
 * @param {number} currentMoveIndex - Current position move index (-1 for start, 0..N-1 for moves).
 * @returns {Object|null} Previous critical move object, or null.
 */
export function getPrevCriticalMove(criticalMoves, currentMoveIndex) {
  if (!Array.isArray(criticalMoves) || criticalMoves.length === 0) {
    return null;
  }

  if (
    typeof currentMoveIndex !== "number" ||
    Number.isNaN(currentMoveIndex) ||
    !Number.isInteger(currentMoveIndex)
  ) {
    return null;
  }

  const candidates = criticalMoves.filter(
    (m) =>
      m &&
      typeof m.moveIndex === "number" &&
      Number.isInteger(m.moveIndex) &&
      m.moveIndex < currentMoveIndex
  );

  if (candidates.length === 0) {
    return null;
  }

  // Sort candidates descending by moveIndex so candidates[0] is the nearest preceding critical move
  candidates.sort((a, b) => b.moveIndex - a.moveIndex);

  return candidates[0];
}
