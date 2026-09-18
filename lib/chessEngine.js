import { Chess } from "chess.js";

/**
 * Standard chess starting position in Forsyth-Edwards Notation (FEN).
 */
export const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/**
 * Initializes a new chess.js game instance.
 * @param {string} [fen] - Optional FEN string to initialize from custom position.
 * @returns {Chess} New Chess instance.
 */
export function createGame(fen) {
  return fen ? new Chess(fen) : new Chess();
}

/**
 * Validates whether a given PGN string is parseable and valid.
 * @param {string} pgnString - Raw PGN text to validate.
 * @returns {{ isValid: boolean, error?: string, moveCount?: number }}
 */
export function validatePgn(pgnString) {
  if (typeof pgnString !== "string" || !pgnString.trim()) {
    return {
      isValid: false,
      error: "PGN string must be a non-empty string.",
    };
  }

  try {
    const chess = new Chess();
    chess.loadPgn(pgnString);
    const moves = chess.history();
    return {
      isValid: true,
      moveCount: moves.length,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error?.message || "Failed to parse PGN.",
    };
  }
}

/**
 * Extracts the positions array from either a loaded game object or positions array.
 * @private
 */
function resolvePositions(gameOrPositions) {
  if (Array.isArray(gameOrPositions)) {
    return gameOrPositions;
  }
  if (gameOrPositions && Array.isArray(gameOrPositions.positions)) {
    return gameOrPositions.positions;
  }
  return [STARTING_FEN];
}

/**
 * Gets the board FEN at a specific move index.
 * -1 or 'start' returns the starting position before any moves.
 * 0 returns the position immediately after the first move.
 * i returns the position immediately after move i.
 * Clamps safely to board history bounds.
 *
 * @param {Object|Array} gameOrPositions - Loaded game object from loadGameFromPgn or positions array.
 * @param {number|string} moveIndex - Move index (-1 for starting board, 0 for move 1, etc.).
 * @returns {string} FEN string for the position.
 */
export function getFenAt(gameOrPositions, moveIndex) {
  const positions = resolvePositions(gameOrPositions);

  if (moveIndex === "start" || moveIndex === -1 || moveIndex === null || moveIndex === undefined) {
    return positions[0] || STARTING_FEN;
  }

  const numericIndex = Number(moveIndex);
  if (Number.isNaN(numericIndex) || numericIndex < 0) {
    return positions[0] || STARTING_FEN;
  }

  const targetIndex = numericIndex + 1;
  if (targetIndex >= positions.length) {
    return positions[positions.length - 1] || STARTING_FEN;
  }

  return positions[targetIndex];
}

/**
 * Gets the board FEN by position index (0 = starting position, 1 = after move 1, etc.).
 * @param {Object|Array} gameOrPositions - Loaded game object or positions array.
 * @param {number} positionIndex - Position index starting at 0.
 * @returns {string} FEN string for the position.
 */
export function getFenByPositionIndex(gameOrPositions, positionIndex) {
  const positions = resolvePositions(gameOrPositions);
  const idx = Math.max(0, Math.min(positionIndex, positions.length - 1));
  return positions[idx] || STARTING_FEN;
}

/**
 * Loads a game from a PGN string and returns a structured game session object.
 * Precomputes FEN states at each ply for O(1) step-by-step navigation.
 *
 * @param {string} pgnString - Raw PGN string.
 * @returns {Object} Loaded game object containing instance, headers, moves, positions, and helper methods.
 */
export function loadGameFromPgn(pgnString) {
  const validation = validatePgn(pgnString);
  if (!validation.isValid) {
    throw new Error(validation.error || "Invalid PGN string.");
  }

  const chess = new Chess();
  chess.loadPgn(pgnString);

  const rawHeaders = typeof chess.getHeaders === "function"
    ? chess.getHeaders()
    : (typeof chess.header === "function" ? chess.header() : {});

  const headers = { ...rawHeaders };

  const rawMoves = chess.history({ verbose: true });

  const initialFen = headers.FEN || STARTING_FEN;
  const positions = [initialFen];

  const moves = rawMoves.map((m, index) => {
    positions.push(m.after);

    return {
      index,
      ply: index + 1,
      moveNumber: Math.floor(index / 2) + 1,
      turn: m.color,
      san: m.san,
      lan: m.lan,
      from: m.from,
      to: m.to,
      piece: m.piece,
      captured: m.captured || null,
      promotion: m.promotion || null,
      flags: m.flags,
      fenBefore: m.before,
      fenAfter: m.after,
    };
  });

  const result = headers.Result || (
    chess.isCheckmate()
      ? (chess.turn() === "w" ? "0-1" : "1-0")
      : (chess.isDraw() ? "1/2-1/2" : "*")
  );

  return {
    instance: chess,
    headers,
    moves,
    positions,
    totalMoves: moves.length,
    result,
    isGameOver: chess.isGameOver(),
    isCheckmate: chess.isCheckmate(),
    isDraw: chess.isDraw(),
    isStalemate: chess.isStalemate(),
    inCheck: chess.inCheck(),
    getFenAt: (moveIndex) => getFenAt(positions, moveIndex),
    getFenByPositionIndex: (posIndex) => getFenByPositionIndex(positions, posIndex),
  };
}

/**
 * Gets the list of moves for a game, either in SAN format or verbose objects.
 *
 * @param {Object|string} gameOrPgn - Loaded game object or raw PGN string.
 * @param {{ verbose?: boolean }} [options] - Output options. Default verbose is false (returns SAN array).
 * @returns {Array<string|Object>} Array of SAN strings or verbose move objects.
 */
export function getMoveList(gameOrPgn, options = { verbose: false }) {
  let game = gameOrPgn;
  if (typeof gameOrPgn === "string") {
    game = loadGameFromPgn(gameOrPgn);
  }

  if (!game || !Array.isArray(game.moves)) {
    return [];
  }

  if (options.verbose) {
    return game.moves;
  }

  return game.moves.map((m) => m.san);
}
