/**
 * Evaluation Graph Geometry
 *
 * Pure functions for computing SVG layout geometry from an evaluation series.
 * No React, no browser, no Node-only APIs — safe to use anywhere.
 */

import { EVAL_CLAMP_CP } from "./evalSeries.js";

/**
 * Default layout constants used when specific values are not provided.
 */
export const GRAPH_DEFAULTS = {
  width: 600,
  height: 160,
  padding: 8,
};

/**
 * Computes SVG (x, y) coordinates for each point in an evaluation series.
 *
 * Mapping:
 * - x: evenly spread left-to-right across [padding, width - padding] by point index.
 *   - A single point is placed at the horizontal center (no division-by-zero).
 * - y: maps displayScore linearly from +EVAL_CLAMP_CP (top, y = padding) to
 *   -EVAL_CLAMP_CP (bottom, y = height - padding), with 0 at the vertical center.
 *
 * Edge cases — none throw:
 * - Empty, null, or non-array series returns [].
 * - A single point is horizontally centered.
 * - NaN or missing displayScore is treated as 0.
 * - displayScore beyond ±EVAL_CLAMP_CP is clamped defensively before mapping.
 *
 * @param {Array<Object>|null|undefined} series - Output array from buildEvalSeries.
 * @param {{ width?: number, height?: number, padding?: number }} [layout={}]
 * @returns {Array<{ index: number, x: number, y: number }>}
 */
export function getGraphPoints(series, layout = {}) {
  if (!Array.isArray(series) || series.length === 0) {
    return [];
  }

  const width = (typeof layout.width === "number" && isFinite(layout.width) && layout.width > 0)
    ? layout.width : GRAPH_DEFAULTS.width;
  const height = (typeof layout.height === "number" && isFinite(layout.height) && layout.height > 0)
    ? layout.height : GRAPH_DEFAULTS.height;
  const padding = (typeof layout.padding === "number" && isFinite(layout.padding) && layout.padding >= 0)
    ? layout.padding : GRAPH_DEFAULTS.padding;

  const n = series.length;
  const innerWidth = width - 2 * padding;
  const innerHeight = height - 2 * padding;
  const midY = padding + innerHeight / 2;

  return series.map((point, i) => {
    // x: spread evenly; single point → horizontal center
    const x = n === 1
      ? padding + innerWidth / 2
      : padding + (i / (n - 1)) * innerWidth;

    // Defensive clamp of displayScore
    let score = (point && typeof point.displayScore === "number" && isFinite(point.displayScore))
      ? point.displayScore
      : 0;
    score = Math.max(-EVAL_CLAMP_CP, Math.min(EVAL_CLAMP_CP, score));

    // y: +EVAL_CLAMP_CP → top (y = padding), -EVAL_CLAMP_CP → bottom (y = height - padding), 0 → midY
    const y = midY - (score / EVAL_CLAMP_CP) * (innerHeight / 2);

    return {
      index: point?.index ?? i,
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
    };
  });
}

/**
 * Builds an SVG path string from a list of graph points.
 *
 * Format: "M x0 y0 L x1 y1 L x2 y2 ..."
 * Returns "" for fewer than 1 point.
 * Coordinates are rounded to 2 decimal places.
 *
 * @param {Array<{ x: number, y: number }>} points
 * @returns {string}
 */
export function buildLinePath(points) {
  if (!Array.isArray(points) || points.length === 0) {
    return "";
  }

  return points
    .map((p, i) => {
      const x = Math.round((p?.x ?? 0) * 100) / 100;
      const y = Math.round((p?.y ?? 0) * 100) / 100;
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(" ");
}

/**
 * Returns the y-coordinate of the zero-evaluation midline.
 *
 * @param {{ height?: number, padding?: number }} layout
 * @returns {number}
 */
export function getMidlineY(layout = {}) {
  const height = (typeof layout.height === "number" && isFinite(layout.height) && layout.height > 0)
    ? layout.height : GRAPH_DEFAULTS.height;
  const padding = (typeof layout.padding === "number" && isFinite(layout.padding) && layout.padding >= 0)
    ? layout.padding : GRAPH_DEFAULTS.padding;

  return (height - 2 * padding) / 2 + padding;
}
