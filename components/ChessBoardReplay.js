"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Chessboard } from "react-chessboard";
import { getFenAt } from "@/lib/chessEngine";

export default function ChessBoardReplay({ game }) {
  // -1 indicates starting position before any moves
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);

  // Reset to start position if a new game is loaded
  useEffect(() => {
    setCurrentMoveIndex(-1);
  }, [game]);

  const totalMoves = game?.totalMoves || 0;
  const isAtStart = currentMoveIndex <= -1;
  const isAtEnd = currentMoveIndex >= totalMoves - 1;

  // Retrieve FEN using existing getFenAt() from lib/chessEngine.js
  const currentFen = useMemo(() => {
    return getFenAt(game, currentMoveIndex);
  }, [game, currentMoveIndex]);

  // Current move metadata
  const currentMove = currentMoveIndex >= 0 && game?.moves ? game.moves[currentMoveIndex] : null;

  // Navigation handlers
  const handleFirst = useCallback(() => setCurrentMoveIndex(-1), []);
  const handlePrev = useCallback(() => {
    setCurrentMoveIndex((prev) => Math.max(-1, prev - 1));
  }, []);
  const handleNext = useCallback(() => {
    setCurrentMoveIndex((prev) => Math.min(totalMoves - 1, prev + 1));
  }, [totalMoves]);
  const handleLast = useCallback(() => {
    setCurrentMoveIndex(totalMoves - 1);
  }, [totalMoves]);

  // Keyboard navigation (ArrowLeft = previous, ArrowRight = next, Home = first, End = last)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Avoid intercepting keystrokes if the user is typing in an input/textarea
      if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "Home") {
        e.preventDefault();
        handleFirst();
      } else if (e.key === "End") {
        e.preventDefault();
        handleLast();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFirst, handlePrev, handleNext, handleLast]);

  // Group moves into turns for side-by-side moves table (White / Black)
  const movePairs = useMemo(() => {
    if (!game?.moves) return [];
    const pairs = [];
    for (let i = 0; i < game.moves.length; i += 2) {
      pairs.push({
        moveNumber: Math.floor(i / 2) + 1,
        white: game.moves[i],
        whiteIndex: i,
        black: game.moves[i + 1] || null,
        blackIndex: i + 1,
      });
    }
    return pairs;
  }, [game]);

  if (!game) return null;

  return (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <span>Board Replay</span>
            <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
              (Read-only)
            </span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Use replay buttons or keyboard arrow keys (← / →) to navigate
          </p>
        </div>

        {/* Current Move Status Pill */}
        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            {isAtStart ? (
              <span>Starting Position</span>
            ) : (
              <span>
                Move {currentMove?.moveNumber}
                {currentMove?.turn === "w" ? ". " : "... "}
                <strong className="text-indigo-600 dark:text-indigo-400 font-mono text-sm">
                  {currentMove?.san}
                </strong>{" "}
                <span className="text-zinc-400 font-normal">
                  ({currentMoveIndex + 1} of {totalMoves} ply)
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Board & Move List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Board & Controls Container */}
        <div className="lg:col-span-7 flex flex-col items-center space-y-4">
          <div className="w-full max-w-[440px] aspect-square rounded-xl overflow-hidden shadow-md border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950">
            <Chessboard
              options={{
                position: currentFen,
                allowDragging: false,
                canDragPiece: () => false,
                boardOrientation: "white",
                boardStyle: {
                  borderRadius: "12px",
                },
              }}
            />
          </div>

          {/* Replay Controls Toolbar */}
          <div className="w-full max-w-[440px] flex items-center justify-between gap-2 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={handleFirst}
              disabled={isAtStart}
              title="First move (Home)"
              className="flex-1 py-2 px-3 rounded-lg font-medium text-xs sm:text-sm text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-700/80 hover:bg-zinc-100 dark:hover:bg-zinc-600 border border-zinc-200 dark:border-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-1"
            >
              <span>|◀</span>
              <span className="hidden sm:inline">First</span>
            </button>

            <button
              type="button"
              onClick={handlePrev}
              disabled={isAtStart}
              title="Previous move (Left Arrow)"
              className="flex-1 py-2 px-3 rounded-lg font-medium text-xs sm:text-sm text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-700/80 hover:bg-zinc-100 dark:hover:bg-zinc-600 border border-zinc-200 dark:border-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-1"
            >
              <span>◀</span>
              <span className="hidden sm:inline">Prev</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={isAtEnd}
              title="Next move (Right Arrow)"
              className="flex-1 py-2 px-3 rounded-lg font-medium text-xs sm:text-sm text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-700/80 hover:bg-zinc-100 dark:hover:bg-zinc-600 border border-zinc-200 dark:border-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-1"
            >
              <span className="hidden sm:inline">Next</span>
              <span>▶</span>
            </button>

            <button
              type="button"
              onClick={handleLast}
              disabled={isAtEnd}
              title="Last move (End)"
              className="flex-1 py-2 px-3 rounded-lg font-medium text-xs sm:text-sm text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-700/80 hover:bg-zinc-100 dark:hover:bg-zinc-600 border border-zinc-200 dark:border-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-1"
            >
              <span className="hidden sm:inline">Last</span>
              <span>▶|</span>
            </button>
          </div>
        </div>

        {/* Moves Navigation Sidebar */}
        <div className="lg:col-span-5 w-full flex flex-col space-y-2">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Move List ({totalMoves} ply)
            </span>
            <button
              type="button"
              onClick={() => setCurrentMoveIndex(-1)}
              className={`text-xs px-2 py-0.5 rounded font-mono cursor-pointer transition-colors ${
                isAtStart
                  ? "bg-indigo-600 text-white font-semibold"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              Start
            </button>
          </div>

          <div className="h-[380px] lg:h-[440px] overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 divide-y divide-zinc-100 dark:divide-zinc-800/80 text-sm font-mono">
            {movePairs.map((pair) => (
              <div
                key={pair.moveNumber}
                className="flex items-center hover:bg-zinc-100/70 dark:hover:bg-zinc-800/40 transition-colors px-3 py-1.5"
              >
                <span className="w-10 text-zinc-400 dark:text-zinc-500 text-xs select-none">
                  {pair.moveNumber}.
                </span>

                {/* White Move */}
                <button
                  type="button"
                  onClick={() => setCurrentMoveIndex(pair.whiteIndex)}
                  className={`flex-1 text-left px-2 py-1 rounded transition-colors cursor-pointer ${
                    currentMoveIndex === pair.whiteIndex
                      ? "bg-indigo-600 text-white font-bold shadow-xs"
                      : "text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60"
                  }`}
                >
                  {pair.white.san}
                </button>

                {/* Black Move */}
                {pair.black ? (
                  <button
                    type="button"
                    onClick={() => setCurrentMoveIndex(pair.blackIndex)}
                    className={`flex-1 text-left px-2 py-1 rounded transition-colors cursor-pointer ${
                      currentMoveIndex === pair.blackIndex
                        ? "bg-indigo-600 text-white font-bold shadow-xs"
                        : "text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60"
                    }`}
                  >
                    {pair.black.san}
                  </button>
                ) : (
                  <span className="flex-1" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
