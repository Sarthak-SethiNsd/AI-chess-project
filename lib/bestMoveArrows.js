/**
 * Best Move Arrow Data Helper (pure logic, no React, no chess.js)
 *
 * Prepares move comparison and arrow annotation data for the position
 * BEFORE a move was played (fenBefore). This aligns the player's move
 * with the engine's best move, which was computed on that same pre-move board.
 */

const SQUARE_REGEX = /^[a-h][1-8]$/;
const PROMOTION_REGEX = /^[qrbn]$/;

/**
 * Parses a UCI move string (e.g. "e2e4" or "e7e8q") into constituent squares and promotion.
 *
 * Requirements:
 * - Exactly 4 or 5 lowercase characters.
 * - Squares (from and to) must match /^[a-h][1-8]$/.
 * - 5th character (if present) must match /^[qrbn]$/.
 * - Rejects uppercase input (e.g. "E2E4", "e7e8Q") to enforce strict canonical UCI formatting.
 * - Returns null for any invalid input (non-string, wrong length, bad squares, null, undefined).
 * - Never throws.
 *
 * @param {string|null|undefined} uci - UCI move string.
 * @returns {{ from: string, to: string, promotion: string|null } | null}
 */
export function parseUciMove(uci) {
  if (typeof uci !== "string") {
    return null;
  }

  // Must be strictly 4 or 5 characters
  if (uci.length !== 4 && uci.length !== 5) {
    return null;
  }

  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);

  if (!SQUARE_REGEX.test(from) || !SQUARE_REGEX.test(to)) {
    return null;
  }

  if (uci.length === 5) {
    const promotion = uci[4];
    if (!PROMOTION_REGEX.test(promotion)) {
      return null;
    }
    return { from, to, promotion };
  }

  return { from, to, promotion: null };
}

/**
 * Extracts and compares the played move and the engine's best move for a given move index.
 *
 * Design Rule:
 * Both the played move and the engine's best move describe the position BEFORE the move (fenBefore).
 *
 * Return shape:
 * {
 *   moveIndex: number,
 *   ply: number,
 *   turn: 'w'|'b'|null,
 *   moveSan: string|null,
 *   category: string|null,
 *   fenBefore: string|null,
 *   played: { from: string, to: string, promotion: string|null, uci: string } | null,
 *   best: { from: string, to: string, promotion: string|null, uci: string, san: string|null } | null,
 *   sameAsBest: boolean,
 *   arrows: Array<{ from: string, to: string, kind: 'played' | 'best' }>
 * }
 *
 * Returns null if input is invalid (non-array evaluations, invalid/out-of-range moveIndex, missing entry).
 * Never throws on null entries, missing evalBefore, missing bestMove, or missing fields.
 * Does not mutate the input.
 *
 * @param {Array<Object>|null|undefined} evaluations - Categorized or raw move evaluations array.
 * @param {number} moveIndex - 0-based move index.
 * @returns {Object|null} Compare data or null.
 */
export function getCompareData(evaluations, moveIndex) {
  if (!Array.isArray(evaluations)) {
    return null;
  }

  if (
    typeof moveIndex !== "number" ||
    Number.isNaN(moveIndex) ||
    !Number.isInteger(moveIndex) ||
    moveIndex < 0 ||
    moveIndex >= evaluations.length
  ) {
    return null;
  }

  const entry = evaluations[moveIndex];
  if (!entry || typeof entry !== "object") {
    return null;
  }

  // 1. Played move resolution from entry.moveUci
  let played = null;
  if (typeof entry.moveUci === "string") {
    const parsedPlayed = parseUciMove(entry.moveUci);
    if (parsedPlayed) {
      played = {
        from: parsedPlayed.from,
        to: parsedPlayed.to,
        promotion: parsedPlayed.promotion,
        uci: entry.moveUci,
      };
    }
  }

  // 2. Best move resolution from entry.evalBefore?.bestMove
  let best = null;
  const bestMove = entry.evalBefore?.bestMove;
  if (bestMove && typeof bestMove === "object") {
    // Prefer bestMove.uci via parseUciMove
    if (typeof bestMove.uci === "string") {
      const parsedBest = parseUciMove(bestMove.uci);
      if (parsedBest) {
        best = {
          from: parsedBest.from,
          to: parsedBest.to,
          promotion: parsedBest.promotion,
          uci: bestMove.uci,
          san: typeof bestMove.san === "string" ? bestMove.san : null,
        };
      }
    }

    // Fallback: if uci is missing or didn't yield a valid move, check from and to
    if (!best && typeof bestMove.from === "string" && typeof bestMove.to === "string") {
      const from = bestMove.from;
      const to = bestMove.to;
      if (SQUARE_REGEX.test(from) && SQUARE_REGEX.test(to)) {
        let promotion = null;
        let validPromotion = true;
        if (bestMove.promotion != null) {
          if (typeof bestMove.promotion === "string" && PROMOTION_REGEX.test(bestMove.promotion)) {
            promotion = bestMove.promotion;
          } else {
            validPromotion = false;
          }
        }
        if (validPromotion) {
          const uci = `${from}${to}${promotion || ""}`;
          best = {
            from,
            to,
            promotion,
            uci,
            san: typeof bestMove.san === "string" ? bestMove.san : null,
          };
        }
      }
    }
  }

  // 3. sameAsBest evaluation
  const sameAsBest = Boolean(
    played !== null &&
    best !== null &&
    played.from === best.from &&
    played.to === best.to &&
    played.promotion === best.promotion
  );

  // 4. Arrows generation
  // If sameAsBest, ONE arrow { from, to, kind: "best" }.
  // Otherwise played arrow first (if exists), best arrow second (if exists).
  const arrows = [];
  if (sameAsBest) {
    arrows.push({
      from: played.from,
      to: played.to,
      kind: "best",
    });
  } else {
    if (played !== null) {
      arrows.push({
        from: played.from,
        to: played.to,
        kind: "played",
      });
    }
    if (best !== null) {
      arrows.push({
        from: best.from,
        to: best.to,
        kind: "best",
      });
    }
  }

  return {
    moveIndex: typeof entry.moveIndex === "number" ? entry.moveIndex : moveIndex,
    ply: typeof entry.ply === "number" ? entry.ply : moveIndex + 1,
    turn: entry.turn ?? null,
    moveSan: entry.moveSan ?? null,
    category: entry.category ?? null,
    fenBefore: entry.fenBefore ?? null,
    played,
    best,
    sameAsBest,
    arrows,
  };
}
