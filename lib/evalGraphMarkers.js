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
