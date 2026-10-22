/**
 * Evaluation Graph Category Markers
 *
 * Pure functions for selecting and positioning category marker points on the evaluation graph.
 * No React, no browser-only APIs, no Node-only APIs — safe to import anywhere.
 */

/**
 * The move categories that receive distinct visual markers on the graph.
 * Exported as a named constant for clarity and easy modification.
 */
export const MARKER_CATEGORIES = ["Brilliant", "Mistake", "Blunder"];

/**
 * Returns the points from the evaluation series and geometry layout whose category
 * belongs to MARKER_CATEGORIES.
 *
 * @param {Array<Object>|null|undefined} series - Output array from buildEvalSeries().
 * @param {Array<{ x: number, y: number, index?: number }>|null|undefined} graphPoints - Output from getGraphPoints().
 * @returns {Array<{ index: number, x: number, y: number, category: string }>}
 *
 * Invariant rules:
 * - Never throws on null, undefined, empty, or mismatched array lengths.
 * - Unknown or excluded categories are ignored.
 * - Does not mutate the input arrays or objects.
 */
export function getMarkerPoints(series, graphPoints) {
  if (!Array.isArray(series) || !Array.isArray(graphPoints)) {
    return [];
  }

  // Length match check: we can only pair up to min(series.length, graphPoints.length)
  const count = Math.min(series.length, graphPoints.length);
  if (count === 0) {
    return [];
  }

  const categorySet = new Set(MARKER_CATEGORIES);
  const result = [];

  for (let i = 0; i < count; i++) {
    const point = series[i];
    const geo = graphPoints[i];

    if (!point || typeof point !== "object" || !geo || typeof geo !== "object") {
      continue;
    }

    const { category } = point;
    if (typeof category === "string" && categorySet.has(category)) {
      result.push({
        index: point.index ?? geo.index ?? i,
        x: geo.x,
        y: geo.y,
        category,
      });
    }
  }

  return result;
}

/**
 * Returns a screen-reader description for the evaluation graph with proper English grammar
 * for singular (1), plural (>1), and zero (0) key moments.
 *
 * @param {Object} counts - Object with counts, e.g. { Blunder: number, Mistake: number, Brilliant: number }
 * @returns {string} Formatted aria-label description
 */
export function formatGraphAriaDescription(counts) {
  const blunderCount = typeof counts?.Blunder === "number" && counts.Blunder > 0 ? counts.Blunder : 0;
  const mistakeCount = typeof counts?.Mistake === "number" && counts.Mistake > 0 ? counts.Mistake : 0;
  const brilliantCount = typeof counts?.Brilliant === "number" && counts.Brilliant > 0 ? counts.Brilliant : 0;

  const total = blunderCount + mistakeCount + brilliantCount;
  const prefix = "Evaluation graph: White advantage shown above center, Black advantage below.";

  if (total === 0) {
    return `${prefix} No key moments marked.`;
  }

  const parts = [];
  if (blunderCount > 0) {
    parts.push(`${blunderCount === 1 ? "one" : blunderCount} ${blunderCount === 1 ? "blunder" : "blunders"}`);
  }
  if (mistakeCount > 0) {
    parts.push(`${mistakeCount === 1 ? "one" : mistakeCount} ${mistakeCount === 1 ? "mistake" : "mistakes"}`);
  }
  if (brilliantCount > 0) {
    parts.push(`${brilliantCount === 1 ? "one" : brilliantCount} ${brilliantCount === 1 ? "brilliant move" : "brilliant moves"}`);
  }

  return `${prefix} Key moments marked: ${parts.join(", ")}.`;
}

