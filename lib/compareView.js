/**
 * Compare View Helpers (pure logic, no React, no chess.js)
 *
 * Prepares arrow visual annotations and screen-reader captions
 * for comparing the player's move with the engine's best move
 * on the pre-move position (fenBefore).
 */

import { formatPointLabel } from "./evalGraphInteraction.js";

/**
 * Named constant arrow colors for compare mode.
 * Note: Day 11 owns refining and theme-polishing these values.
 */
export const COMPARE_ARROW_COLORS = {
  played: "#dc2626", // Red for the move played in the game
  best: "#16a34a",   // Green for the engine's recommended best move
};

/**
 * Converts compareData.arrows into react-chessboard v5.12.1 arrow objects:
 * { startSquare: string, endSquare: string, color: string }
 *
 * Requirements:
 * - Colors each arrow by its `kind` ('played' -> red, 'best' -> green).
 * - Preserves order of arrows from compareData.
 * - Returns [] for null, undefined, or invalid input.
 * - Does not mutate the input object or its arrays.
 * - Never throws.
 *
 * @param {Object|null|undefined} compareData - Output from getCompareData().
 * @returns {Array<{ startSquare: string, endSquare: string, color: string }>}
 */
export function toBoardArrows(compareData) {
  if (!compareData || typeof compareData !== "object" || !Array.isArray(compareData.arrows)) {
    return [];
  }

  const result = [];
  for (let i = 0; i < compareData.arrows.length; i++) {
    const arrow = compareData.arrows[i];
    if (!arrow || typeof arrow !== "object") continue;

    const { from, to, kind } = arrow;
    if (typeof from !== "string" || typeof to !== "string") continue;

    const color = COMPARE_ARROW_COLORS[kind] || COMPARE_ARROW_COLORS.played;
    result.push({
      startSquare: from,
      endSquare: to,
      color,
    });
  }

  return result;
}

/**
 * Returns a short plain-text caption that describes the comparison in WORDS,
 * ensuring accessibility and meaning without relying solely on color.
 *
 * Cases:
 * 1. both differ:
 *    "Position before <label>. Played <san> (red). Engine best: <san> (green)."
 * 2. sameAsBest:
 *    "Position before <label>. You played the engine's best move (green)."
 * 3. best missing:
 *    "Position before <label>. Played <san> (red). No engine suggestion available."
 * 4. null / invalid input:
 *    ""
 *
 * <label> is formatted like "14. Qxb7" (White) or "14... Qxb7" (Black),
 * reusing formatPointLabel from lib/evalGraphInteraction.js.
 *
 * @param {Object|null|undefined} compareData - Output from getCompareData().
 * @returns {string} Plain-text accessible caption.
 */
export function getCompareCaption(compareData) {
  if (
    !compareData ||
    typeof compareData !== "object" ||
    (!compareData.played && !compareData.best && !compareData.moveSan)
  ) {
    return "";
  }

  // Derive label using formatPointLabel({ index: ply, moveSan, turn })
  const label = formatPointLabel({
    index: typeof compareData.ply === "number" ? compareData.ply : (compareData.moveIndex ?? 0) + 1,
    moveSan: compareData.moveSan,
    turn: compareData.turn,
  });

  const playedSan = compareData.moveSan || compareData.played?.uci || "played move";
  const bestSan = compareData.best?.san || compareData.best?.uci || "best move";

  if (compareData.sameAsBest) {
    return `Position before ${label}. You played the engine's best move (green).`;
  }

  if (!compareData.best) {
    return `Position before ${label}. Played ${playedSan} (red). No engine suggestion available.`;
  }

  return `Position before ${label}. Played ${playedSan} (red). Engine best: ${bestSan} (green).`;
}

/**
 * Returns an array of { kind, label, color } entries in display order,
 * using COMPARE_ARROW_COLORS for rendering visual legend chips/swatches.
 *
 * Cases:
 * 1. both differ (played !== null && best !== null && !sameAsBest):
 *    [
 *      { kind: 'played', label: 'Played move', color: COMPARE_ARROW_COLORS.played },
 *      { kind: 'best', label: 'Engine best', color: COMPARE_ARROW_COLORS.best },
 *    ]
 * 2. sameAsBest:
 *    [
 *      { kind: 'best', label: 'Played = engine best', color: COMPARE_ARROW_COLORS.best },
 *    ]
 * 3. best missing (played !== null && best === null):
 *    [
 *      { kind: 'played', label: 'Played move', color: COMPARE_ARROW_COLORS.played },
 *    ]
 * 4. played missing but best exists:
 *    [
 *      { kind: 'best', label: 'Engine best', color: COMPARE_ARROW_COLORS.best },
 *    ]
 * 5. null / invalid input:
 *    []
 *
 * Requirements:
 * - Pure function, never throws.
 * - Colors match COMPARE_ARROW_COLORS exactly.
 * - Does not mutate input.
 *
 * @param {Object|null|undefined} compareData - Output from getCompareData().
 * @returns {Array<{ kind: 'played'|'best', label: string, color: string }>}
 */
export function getCompareLegend(compareData) {
  if (!compareData || typeof compareData !== "object") {
    return [];
  }

  const hasPlayed = Boolean(compareData.played);
  const hasBest = Boolean(compareData.best);
  const sameAsBest = Boolean(compareData.sameAsBest);

  if (sameAsBest) {
    return [
      {
        kind: "best",
        label: "Played = engine best",
        color: COMPARE_ARROW_COLORS.best,
      },
    ];
  }

  if (hasPlayed && hasBest) {
    return [
      {
        kind: "played",
        label: "Played move",
        color: COMPARE_ARROW_COLORS.played,
      },
      {
        kind: "best",
        label: "Engine best",
        color: COMPARE_ARROW_COLORS.best,
      },
    ];
  }

  if (hasPlayed && !hasBest) {
    return [
      {
        kind: "played",
        label: "Played move",
        color: COMPARE_ARROW_COLORS.played,
      },
    ];
  }

  if (!hasPlayed && hasBest) {
    return [
      {
        kind: "best",
        label: "Engine best",
        color: COMPARE_ARROW_COLORS.best,
      },
    ];
  }

  return [];
}

