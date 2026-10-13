/**
 * Evaluation Graph Interaction Helpers
 *
 * Pure functions for hit-testing and tooltip formatting in the evaluation graph.
 * No React, no browser-only APIs, no Node-only APIs — safe to import anywhere.
 */

import { GRAPH_DEFAULTS } from "./evalGraphGeometry.js";
import { EVAL_CLAMP_CP } from "./evalSeries.js";

/**
 * Returns the nearest valid series index for a given x in viewBox coordinates.
 *
 * The x-spacing matches getGraphPoints exactly (reuses the same formula):
 *   - n === 1: single point at padding + innerWidth / 2
 *   - n >= 2:  point i at padding + (i / (n - 1)) * innerWidth
 *
 * @param {number} x          - x coordinate in viewBox space.
 * @param {{ width?: number, padding?: number, pointCount: number }} options
 * @returns {number|null}     - Nearest series index in [0, pointCount-1], or null for invalid input.
 */
export function getSeriesIndexFromX(x, { width, padding, pointCount } = {}) {
  // Validate inputs
  if (typeof x !== "number" || !Number.isFinite(x)) return null;
  if (typeof pointCount !== "number" || !Number.isFinite(pointCount) || pointCount < 1) return null;

  const w = (typeof width === "number" && Number.isFinite(width) && width > 0)
    ? width : GRAPH_DEFAULTS.width;
  const p = (typeof padding === "number" && Number.isFinite(padding) && padding >= 0)
    ? padding : GRAPH_DEFAULTS.padding;

  const n = Math.round(pointCount); // ensure integer

  // Single point is always at horizontal center
  if (n === 1) return 0;

  const innerWidth = w - 2 * p;

  // Convert x → fractional index
  // point i is at: p + (i / (n - 1)) * innerWidth
  // so: i = (x - p) / innerWidth * (n - 1)
  const rawIndex = (x - p) / innerWidth * (n - 1);

  // Clamp to [0, n-1] and round to nearest integer
  const clamped = Math.max(0, Math.min(n - 1, Math.round(rawIndex)));
  return clamped;
}

/**
 * Returns short eval text for a tooltip.
 *
 * Rules:
 * - Delivered checkmate (isMate=true, mateIn=0): "Checkmate"
 * - Active mate (isMate=true, mateIn != 0):
 *   Uses Math.abs(mateIn) for the distance.
 *   mateIn convention (from lib/evalSeries.js):
 *     mateIn is the raw Stockfish score.value from UCI perspective.
 *     Positive = side-to-move is mating; negative = side-to-move is being mated.
 *     However we can use whiteScore sign to determine White vs Black:
 *     whiteScore > 0 means White is mating, whiteScore < 0 means Black is mating.
 *   Display: "M" + Math.abs(mateIn), e.g. "M3", "M1".
 * - Centipawns: use whiteScore (the real untruncated value) if available,
 *   formatted as signed pawns with 2 decimals: "+0.35", "-1.20", "+0.00"
 * - Clamped values (|whiteScore| > EVAL_CLAMP_CP or whiteScore is the raw value):
 *   still display whiteScore / 100.
 * - Zero (draw/stalemate): "+0.00"
 * - Missing / NaN / undefined point: "n/a"
 * - Never throws.
 *
 * @param {Object|null|undefined} point - Series point from buildEvalSeries.
 * @returns {string}
 */
export function formatEvalText(point) {
  try {
    if (!point || typeof point !== "object") return "n/a";

    const { isMate, mateIn, whiteScore } = point;

    if (isMate === true) {
      // Delivered checkmate
      if (mateIn === 0) return "Checkmate";

      // Active forced mate — display distance with White (+) or Black (-) sign
      // Sign convention from lib/evalSeries.js:
      // - displayScore is +EVAL_CLAMP_CP if White is mating, -EVAL_CLAMP_CP if Black is.
      // - whiteScore is positive (> 0) if White is mating, negative (< 0) if Black is.
      // - mateIn is the raw integer distance to mate (positive/negative depending on UCI side to move).
      // We determine the winning color from whiteScore (or displayScore):
      // White mating -> "+M" + abs(mateIn)
      // Black mating -> "-M" + abs(mateIn)
      const isWhiteMating =
        typeof whiteScore === "number" && Number.isFinite(whiteScore) && whiteScore !== 0
          ? whiteScore > 0
          : (point.displayScore ?? 0) >= 0;

      const sign = isWhiteMating ? "+" : "-";

      if (typeof mateIn === "number" && Number.isFinite(mateIn) && mateIn !== 0) {
        return `${sign}M${Math.abs(mateIn)}`;
      }

      // mateIn is null/NaN but isMate is true — fallback with sign
      return `${sign}M`;
    }

    // Centipawns
    if (typeof whiteScore !== "number" || !Number.isFinite(whiteScore)) return "n/a";

    const pawns = whiteScore / 100;
    const sign = pawns >= 0 ? "+" : "";
    return `${sign}${pawns.toFixed(2)}`;
  } catch {
    return "n/a";
  }
}

/**
 * Returns a short move label for the tooltip.
 *
 * Convention:
 * - series index 0 → "Start position" (it represents the position before any moves)
 * - series index i >= 1 represents the position after the i-th move (move index i - 1, 0-based)
 *   - moveNumber = Math.ceil(i / 2) for standard chess (ply i → move ceil(i/2))
 *   - turn derived from index parity (odd index = White moved, even index >= 2 = Black moved)
 *   - White: "1. e4"   Black: "1... e5"
 * - Falls back to "Move N" if moveSan is missing.
 * - Never throws.
 *
 * @param {Object|null|undefined} point - Series point from buildEvalSeries.
 * @returns {string}
 */
export function formatPointLabel(point) {
  try {
    if (!point || typeof point !== "object") return "n/a";

    const { index, moveSan, turn } = point;

    if (typeof index !== "number" || !Number.isFinite(index)) return "n/a";
    if (index === 0) return "Start position";

    // series index i ≥ 1: the i-th ply has been played
    // move number in chess notation: ceil(i / 2)
    const moveNumber = Math.ceil(index / 2);

    // White moved on odd plies (index 1, 3, 5, ...), Black on even (index 2, 4, 6, ...)
    // But we can also use the stored turn field if present: turn is the side that PLAYED the move.
    const isWhiteMove = turn === "w" || (turn == null && index % 2 === 1);

    if (!moveSan || typeof moveSan !== "string") {
      return `Move ${index}`;
    }

    if (isWhiteMove) {
      return `${moveNumber}. ${moveSan}`;
    } else {
      return `${moveNumber}... ${moveSan}`;
    }
  } catch {
    return "n/a";
  }
}
