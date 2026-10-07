"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Chessboard } from "react-chessboard";
import { getFenAt } from "@/lib/chessEngine";
import { getCategoryConfig } from "@/lib/categoryStyles";

export default function ChessBoardReplay({
  game,
  orientation = "white",
  categorizedEvaluations = [],
}) {
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

  // Current move metadata from loaded game
  const currentMove = currentMoveIndex >= 0 && game?.moves ? game.moves[currentMoveIndex] : null;

  // Current move evaluation and categorization (if available)
  const currentMoveEval =
    currentMoveIndex >= 0 && categorizedEvaluations?.length > currentMoveIndex
      ? categorizedEvaluations[currentMoveIndex]
      : null;

  const currentCategoryConfig = currentMoveEval?.category
    ? getCategoryConfig(currentMoveEval.category)
    : null;

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
              (Interactive)
            </span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Use replay buttons or keyboard arrow keys (← / →) to navigate moves
          </p>
        </div>

        {/* Current Move Status Pill & Orientation */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 capitalize flex items-center gap-1.5">
            <span>{orientation === "black" ? "♚" : "♔"}</span>
            <span>{orientation} Perspective</span>
          </span>
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
                boardOrientation: orientation === "black" ? "black" : "white",
                boardStyle: {
                  borderRadius: "12px",
                },
              }}
            />
          </div>

          {/* Board Move Annotation Bar */}
          <div className="w-full max-w-[440px] p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 transition-all">
            {isAtStart ? (
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-zinc-400" />
                  Starting Position
                </span>
                <span>Use controls below to step through</span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
                    {currentMove?.moveNumber}
                    {currentMove?.turn === "w" ? ". " : "... "}
                    {currentMove?.san}
                  </span>

                  {currentCategoryConfig ? (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold border shadow-xs ${currentCategoryConfig.badgeClasses}`}
                    >
                      <span>{currentCategoryConfig.symbol}</span>
                      <span>{currentCategoryConfig.label}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400 font-medium">Played move</span>
                  )}
                </div>

                {/* Move Quality Details */}
                <div className="text-right text-xs">
                  {currentMoveIndex === totalMoves - 1 && game.isCheckmate ? (
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      Delivers Checkmate!
                    </span>
                  ) : currentMoveIndex === totalMoves - 1 && game.isStalemate ? (
                    <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                      Results in Stalemate (Draw)
                    </span>
                  ) : currentMoveIndex === totalMoves - 1 && game.isDraw ? (
                    <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                      Results in Draw
                    </span>
                  ) : currentMoveEval ? (
                    currentMoveEval.category === "Best" || currentMoveEval.category === "Brilliant" ? (
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        {currentMoveEval.category === "Brilliant"
                          ? "Piece Sacrifice!"
                          : "Top Engine Move"}
                      </span>
                    ) : currentMoveEval.evalDrop > 0 ? (
                      <span className="text-zinc-600 dark:text-zinc-300">
                        Loss:{" "}
                        <strong className="text-red-600 dark:text-red-400 font-mono">
                          -{(currentMoveEval.evalDrop / 100).toFixed(1)}
                        </strong>{" "}
                        pawns
                        {currentMoveEval.evalBefore?.bestMove?.san &&
                          currentMoveEval.evalBefore.bestMove.san !== currentMove?.san && (
                            <span className="block text-[11px] text-zinc-400">
                              Best: {currentMoveEval.evalBefore.bestMove.san}
                            </span>
                          )}
                      </span>
                    ) : (
                      <span className="text-zinc-400">Neutral</span>
                    )
                  ) : (
                    <span className="text-zinc-400">Analyzing...</span>
                  )}
                </div>
              </div>
            )}
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

          <div className="h-[380px] lg:h-[490px] overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 divide-y divide-zinc-100 dark:divide-zinc-800/80 text-sm font-mono">
            {movePairs.map((pair) => {
              const whiteEval = categorizedEvaluations?.[pair.whiteIndex];
              const whiteConfig = whiteEval?.category ? getCategoryConfig(whiteEval.category) : null;

              const blackEval = pair.black ? categorizedEvaluations?.[pair.blackIndex] : null;
              const blackConfig = blackEval?.category ? getCategoryConfig(blackEval.category) : null;

              const isWhiteSelected = currentMoveIndex === pair.whiteIndex;
              const isBlackSelected = currentMoveIndex === pair.blackIndex;

              return (
                <div
                  key={pair.moveNumber}
                  className="flex items-center hover:bg-zinc-100/70 dark:hover:bg-zinc-800/40 transition-colors px-2.5 py-1.5 gap-1.5"
                >
                  <span className="w-8 text-zinc-400 dark:text-zinc-500 text-xs select-none">
                    {pair.moveNumber}.
                  </span>

                  {/* White Move */}
                  <button
                    type="button"
                    onClick={() => setCurrentMoveIndex(pair.whiteIndex)}
                    className={`flex-1 flex items-center justify-between gap-1.5 px-2 py-1 rounded transition-all cursor-pointer ${
                      isWhiteSelected
                        ? "bg-indigo-600 text-white font-bold shadow-xs"
                        : "text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <span className="truncate">{pair.white.san}</span>
                    {whiteConfig && (
                      <span
                        className={`inline-flex items-center justify-center px-1.5 py-0.2 rounded text-[10px] font-bold border transition-colors ${
                          isWhiteSelected
                            ? "bg-white/20 text-white border-white/30"
                            : whiteConfig.badgeClasses
                        }`}
                        title={`${whiteConfig.label} (${whiteConfig.symbol})`}
                      >
                        <span>{whiteConfig.symbol}</span>
                      </span>
                    )}
                  </button>

                  {/* Black Move */}
                  {pair.black ? (
                    <button
                      type="button"
                      onClick={() => setCurrentMoveIndex(pair.blackIndex)}
                      className={`flex-1 flex items-center justify-between gap-1.5 px-2 py-1 rounded transition-all cursor-pointer ${
                        isBlackSelected
                          ? "bg-indigo-600 text-white font-bold shadow-xs"
                          : "text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <span className="truncate">{pair.black.san}</span>
                      {blackConfig && (
                        <span
                          className={`inline-flex items-center justify-center px-1.5 py-0.2 rounded text-[10px] font-bold border transition-colors ${
                            isBlackSelected
                              ? "bg-white/20 text-white border-white/30"
                              : blackConfig.badgeClasses
                          }`}
                          title={`${blackConfig.label} (${blackConfig.symbol})`}
                        >
                          <span>{blackConfig.symbol}</span>
                        </span>
                      )}
                    </button>
                  ) : (
                    <span className="flex-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
