import { Chess } from "chess.js";

/**
 * Universal Stockfish Engine Wrapper for Browser (Web Worker) and Node.js (Worker Threads).
 *
 * Provides a clean Promise-based API for initializing, evaluating chess positions,
 * and terminating the Stockfish engine.
 */

let engineInstance = null;
let initPromise = null;
let requestQueue = [];
let isProcessing = false;

/**
 * Detects whether the current execution environment is a browser.
 * @returns {boolean}
 */
export function isBrowserEnvironment() {
  return typeof window !== "undefined" && typeof Worker !== "undefined";
}

/**
 * Creates a worker instance in either browser or Node.js environment.
 * @private
 * @returns {Promise<Worker|Object>}
 */
async function createWorker() {
  if (isBrowserEnvironment()) {
    // Check WebAssembly support
    const wasmSupported =
      typeof WebAssembly === "object" &&
      typeof WebAssembly.validate === "function" &&
      WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));

    const scriptPath = wasmSupported
      ? "/stockfish/stockfish.wasm.js"
      : "/stockfish/stockfish.js";

    const worker = new Worker(scriptPath);

    return {
      postMessage: (cmd) => worker.postMessage(cmd),
      onMessage: (handler) => {
        worker.onmessage = (e) => handler(e.data);
      },
      onError: (handler) => {
        worker.onerror = handler;
      },
      terminate: () => worker.terminate(),
    };
  }

  // Node.js environment (for automated test scripts and server-side utilities)
  const { Worker } = await import("node:worker_threads");
  const path = await import("node:path");
  const fs = await import("node:fs");

  let sfPath = path.resolve(process.cwd(), "public/stockfish/stockfish.js");
  if (!fs.existsSync(sfPath)) {
    sfPath = path.resolve(process.cwd(), "node_modules/stockfish.js/stockfish.js");
  }
  const normalizedPath = sfPath.replace(/\\/g, "/");

  const workerCode = `
    const { parentPort } = require('node:worker_threads');
    global.postMessage = function(data) {
      parentPort.postMessage(data);
    };
    require('${normalizedPath}');
    parentPort.on('message', (cmd) => {
      if (global.onmessage) {
        global.onmessage({ data: cmd });
      }
    });
  `;

  const worker = new Worker(workerCode, { eval: true });

  return {
    postMessage: (cmd) => worker.postMessage(cmd),
    onMessage: (handler) => {
      worker.on("message", (msg) => handler(msg));
    },
    onError: (handler) => {
      worker.on("error", (err) => handler(err));
    },
    terminate: () => worker.terminate(),
  };
}

/**
 * Initializes the Stockfish engine singleton.
 * If already initialized, returns the existing instance.
 *
 * @returns {Promise<Object>} The initialized engine wrapper instance.
 */
export async function initStockfish() {
  if (engineInstance) {
    return engineInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const worker = await createWorker();

      let resolveReady = null;
      let isReady = false;
      const messageListeners = new Set();

      worker.onMessage((msg) => {
        if (typeof msg !== "string") return;

        if (msg === "readyok" && resolveReady) {
          isReady = true;
          const fn = resolveReady;
          resolveReady = null;
          fn();
        }

        for (const listener of messageListeners) {
          try {
            listener(msg);
          } catch (err) {
            console.error("Stockfish listener error:", err);
          }
        }
      });

      worker.onError((err) => {
        console.error("Stockfish worker error:", err);
      });

      // Send initial UCI initialization handshake
      worker.postMessage("uci");

      const readyPromise = new Promise((resolve) => {
        resolveReady = resolve;
      });

      worker.postMessage("isready");
      await readyPromise;

      engineInstance = {
        worker,
        postMessage: (cmd) => worker.postMessage(cmd),
        addListener: (fn) => messageListeners.add(fn),
        removeListener: (fn) => messageListeners.delete(fn),
        isReady: () => isReady,
      };

      return engineInstance;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

/**
 * Returns whether the Stockfish engine is currently initialized and ready.
 * @returns {boolean}
 */
export function isEngineReady() {
  return Boolean(engineInstance && engineInstance.isReady());
}

/**
 * Terminates the Stockfish engine worker and resets all internal state.
 */
export function terminateStockfish() {
  if (engineInstance) {
    try {
      engineInstance.postMessage("quit");
      engineInstance.worker.terminate();
    } catch (err) {
      console.warn("Error while terminating Stockfish worker:", err);
    }
    engineInstance = null;
  }

  initPromise = null;

  // Reject any pending requests in the queue
  while (requestQueue.length > 0) {
    const item = requestQueue.shift();
    item.reject(new Error("Stockfish engine was terminated."));
  }

  isProcessing = false;
}

/**
 * Parses UCI "info" lines to extract depth, score, and principal variation (PV).
 * @private
 * @param {string} line - Raw UCI info string.
 * @param {string} turn - Turn from FEN ('w' or 'b').
 * @returns {Object|null}
 */
function parseUciInfo(line, turn = "w") {
  if (!line.startsWith("info ")) {
    return null;
  }

  const result = {};

  // Extract depth
  const depthMatch = line.match(/\bdepth (\d+)\b/);
  if (depthMatch) {
    result.depth = parseInt(depthMatch[1], 10);
  }

  // Extract score (centipawns or mate)
  const scoreCpMatch = line.match(/\bscore cp (-?\d+)\b/);
  const scoreMateMatch = line.match(/\bscore mate (-?\d+)\b/);

  if (scoreCpMatch) {
    const cp = parseInt(scoreCpMatch[1], 10);
    result.score = {
      type: "cp",
      value: cp,
      // Normalize score from White's perspective (+ = White ahead, - = Black ahead)
      whiteScore: turn === "b" ? -cp : cp,
    };
  } else if (scoreMateMatch) {
    const mate = parseInt(scoreMateMatch[1], 10);
    result.score = {
      type: "mate",
      value: mate,
      whiteScore: turn === "b" ? -mate : mate,
    };
  }

  // Extract PV
  const pvIndex = line.indexOf(" pv ");
  if (pvIndex !== -1) {
    result.pv = line.slice(pvIndex + 4).trim();
  }

  return result;
}

/**
 * Converts a UCI move string (e.g. "e2e4", "e7e8q") to SAN using chess.js.
 * @private
 * @param {string} fen - FEN position before the move.
 * @param {string} uciMove - Move string in UCI format.
 * @returns {{ san: string|null, from: string, to: string, promotion: string|null }}
 */
function parseMoveToSan(fen, uciMove) {
  if (!uciMove || uciMove.length < 4) {
    return { san: null, from: "", to: "", promotion: null };
  }

  const from = uciMove.slice(0, 2);
  const to = uciMove.slice(2, 4);
  const promotion = uciMove.length > 4 ? uciMove[4].toLowerCase() : null;

  let san = null;
  try {
    const chess = new Chess(fen);
    const move = chess.move({
      from,
      to,
      promotion: promotion || undefined,
    });
    if (move) {
      san = move.san;
    }
  } catch {
    san = null;
  }

  return { san, from, to, promotion };
}

/**
 * Processes queued evaluation requests sequentially.
 * @private
 */
async function processQueue() {
  if (isProcessing || requestQueue.length === 0) {
    return;
  }

  isProcessing = true;
  const current = requestQueue.shift();

  try {
    const engine = await initStockfish();

    let latestInfo = {
      depth: 0,
      score: { type: "cp", value: 0, whiteScore: 0 },
      pv: "",
    };

    const turn = current.fen.split(" ")[1] || "w";

    const listener = (msg) => {
      if (msg.startsWith("info ")) {
        const parsed = parseUciInfo(msg, turn);
        if (parsed) {
          if (parsed.depth !== undefined) latestInfo.depth = parsed.depth;
          if (parsed.score !== undefined) latestInfo.score = parsed.score;
          if (parsed.pv !== undefined) latestInfo.pv = parsed.pv;
        }
      } else if (msg.startsWith("bestmove")) {
        engine.removeListener(listener);

        const parts = msg.split(/\s+/);
        const bestMoveUci = parts[1] && parts[1] !== "(none)" ? parts[1] : null;
        const ponderUci = parts[2] === "ponder" ? parts[3] : null;

        const moveDetails = parseMoveToSan(current.fen, bestMoveUci);

        current.resolve({
          bestMove: {
            uci: bestMoveUci,
            san: moveDetails.san,
            from: moveDetails.from,
            to: moveDetails.to,
            promotion: moveDetails.promotion,
          },
          ponder: ponderUci,
          score: latestInfo.score,
          depth: latestInfo.depth,
          pv: latestInfo.pv,
          raw: msg,
        });
      }
    };

    engine.addListener(listener);

    // Setup position and trigger search
    engine.postMessage(`position fen ${current.fen}`);

    if (current.options.movetime) {
      engine.postMessage(`go movetime ${current.options.movetime}`);
    } else {
      const depth = current.options.depth || 12;
      engine.postMessage(`go depth ${depth}`);
    }
  } catch (err) {
    current.reject(err);
  } finally {
    isProcessing = false;
    // Process next queued evaluation if available
    if (requestQueue.length > 0) {
      setTimeout(processQueue, 0);
    }
  }
}

/**
 * Evaluates a chess position given a FEN string and search parameters.
 *
 * @param {string} fen - Forsyth-Edwards Notation (FEN) of the position.
 * @param {number|{ depth?: number, movetime?: number }} [depthOrOptions=12] -
 *   If a number <= 35, treated as search depth.
 *   If a number > 35, treated as calculation time in milliseconds.
 *   Alternatively, pass an options object { depth?: number, movetime?: number }.
 * @returns {Promise<{
 *   bestMove: { uci: string|null, san: string|null, from: string, to: string, promotion: string|null },
 *   ponder: string|null,
 *   score: { type: 'cp'|'mate', value: number, whiteScore: number },
 *   depth: number,
 *   pv: string,
 *   raw: string
 * }>} Evaluation result.
 */
export function evaluatePosition(fen, depthOrOptions = 12) {
  if (typeof fen !== "string" || !fen.trim()) {
    return Promise.reject(new Error("FEN must be a non-empty string."));
  }

  // Validate FEN with chess.js
  try {
    new Chess(fen.trim());
  } catch (e) {
    return Promise.reject(new Error(`Invalid FEN: ${e?.message || fen}`));
  }

  let options = { depth: 12 };

  if (typeof depthOrOptions === "number") {
    if (depthOrOptions > 35) {
      options = { movetime: Math.round(depthOrOptions) };
    } else {
      options = { depth: Math.max(1, Math.round(depthOrOptions)) };
    }
  } else if (typeof depthOrOptions === "object" && depthOrOptions !== null) {
    options = {
      depth: depthOrOptions.depth ? Math.max(1, Math.round(depthOrOptions.depth)) : undefined,
      movetime: depthOrOptions.movetime ? Math.max(1, Math.round(depthOrOptions.movetime)) : undefined,
    };
    if (!options.depth && !options.movetime) {
      options.depth = 12;
    }
  }

  return new Promise((resolve, reject) => {
    requestQueue.push({
      fen: fen.trim(),
      options,
      resolve,
      reject,
    });

    processQueue();
  });
}
