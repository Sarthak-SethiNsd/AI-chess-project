"use client";

import { useState } from "react";
import PgnInput from "@/components/PgnInput";

export default function Home() {
  const [loadedGame, setLoadedGame] = useState(null);

  const handleGameLoaded = (game) => {
    setLoadedGame(game);
  };

  const handleReset = () => {
    setLoadedGame(null);
  };

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold tracking-wide uppercase">
            Chess Review Scaffold
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            AI Chess Review
          </h1>
          <p className="max-w-2xl mx-auto text-base text-zinc-600 dark:text-zinc-400">
            AI-powered chess game review tool. Users upload a PGN, get Stockfish-based move analysis, and can request AI explanations for specific moves on demand.
          </p>
        </header>

        {/* Input Section */}
        <section className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8">
          <PgnInput onGameLoaded={handleGameLoaded} />
        </section>

        {/* Game Loaded Confirmation State */}
        {loadedGame && (
          <section className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-emerald-200 dark:border-emerald-900/60 p-6 sm:p-8 space-y-5 transition-all">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                  Game Loaded in State
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  {loadedGame.isCheckmate
                    ? "Checkmate"
                    : loadedGame.isDraw
                    ? "Draw"
                    : loadedGame.result !== "*"
                    ? `Result: ${loadedGame.result}`
                    : "In Progress"}
                </span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 cursor-pointer transition-colors"
                >
                  Clear Loaded Game
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">White Player</p>
                <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {loadedGame.headers.White || "Unknown"}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Black Player</p>
                <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {loadedGame.headers.Black || "Unknown"}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Total Moves</p>
                <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {loadedGame.totalMoves} ply ({Math.ceil(loadedGame.totalMoves / 2)} moves)
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Event / Date</p>
                <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {loadedGame.headers.Event || "Casual"} {loadedGame.headers.Date ? `(${loadedGame.headers.Date})` : ""}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/60 space-y-2">
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                Moves List Preview ({loadedGame.moves.length} moves)
              </p>
              <p className="font-mono text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed break-words max-h-24 overflow-y-auto">
                {loadedGame.moves.map((m) => `${m.turn === "w" ? `${m.moveNumber}. ` : ""}${m.san}`).join(" ")}
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
