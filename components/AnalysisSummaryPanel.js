"use client";

import { MOVE_CATEGORIES } from "@/lib/moveCategorization";
import { getCategoryConfig, REVIEW_DEPTH_CONFIG } from "@/lib/categoryStyles";

export default function AnalysisSummaryPanel({
  summary,
  whitePlayerName = "White",
  blackPlayerName = "Black",
  userColor = "white",
  reviewDepth = "Standard",
}) {
  if (!summary) return null;

  const depthInfo = REVIEW_DEPTH_CONFIG[reviewDepth] || REVIEW_DEPTH_CONFIG.Standard;

  const categoriesList = [
    MOVE_CATEGORIES.BRILLIANT,
    MOVE_CATEGORIES.BEST,
    MOVE_CATEGORIES.EXCELLENT,
    MOVE_CATEGORIES.GOOD,
    MOVE_CATEGORIES.INACCURACY,
    MOVE_CATEGORIES.MISTAKE,
    MOVE_CATEGORIES.BLUNDER,
  ];

  const getAccuracyColor = (acc) => {
    if (acc >= 90) return "text-emerald-600 dark:text-emerald-400";
    if (acc >= 75) return "text-teal-600 dark:text-teal-400";
    if (acc >= 60) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getProgressBarColor = (acc) => {
    if (acc >= 90) return "bg-emerald-500";
    if (acc >= 75) return "bg-teal-500";
    if (acc >= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <section className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
            Performance & Accuracy Review
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-md font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            Stockfish 10 • {depthInfo.badge}
          </span>
          <span className="px-2.5 py-1 rounded-md font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
            {summary.totalMoves} ply reviewed
          </span>
        </div>
      </div>

      {/* Accuracy Cards Side-by-Side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* White Card */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            userColor === "white"
              ? "bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/60 ring-1 ring-indigo-500/20"
              : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">♔</span>
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[150px]">
                {whitePlayerName}
              </span>
            </div>
            {userColor === "white" && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white uppercase tracking-wider">
                You
              </span>
            )}
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Accuracy</p>
              {summary.white.moveCount > 0 ? (
                <p className={`text-2xl font-black font-mono tracking-tight ${getAccuracyColor(summary.white.accuracy)}`}>
                  {summary.white.accuracy}%
                </p>
              ) : (
                <p className="text-2xl font-black font-mono tracking-tight text-zinc-400">
                  —
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Avg. Eval Loss</p>
              <p className="text-sm font-bold font-mono text-zinc-700 dark:text-zinc-300">
                {summary.white.moveCount > 0 ? `${summary.white.averageEvalDrop} cp` : "—"}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${getProgressBarColor(summary.white.accuracy)}`}
              style={{ width: `${summary.white.moveCount > 0 ? Math.min(100, Math.max(0, summary.white.accuracy)) : 0}%` }}
            />
          </div>
        </div>

        {/* Black Card */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            userColor === "black"
              ? "bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/60 ring-1 ring-indigo-500/20"
              : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">♚</span>
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[150px]">
                {blackPlayerName}
              </span>
            </div>
            {userColor === "black" && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white uppercase tracking-wider">
                You
              </span>
            )}
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Accuracy</p>
              {summary.black.moveCount > 0 ? (
                <p className={`text-2xl font-black font-mono tracking-tight ${getAccuracyColor(summary.black.accuracy)}`}>
                  {summary.black.accuracy}%
                </p>
              ) : (
                <p className="text-2xl font-black font-mono tracking-tight text-zinc-400">
                  —
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Avg. Eval Loss</p>
              <p className="text-sm font-bold font-mono text-zinc-700 dark:text-zinc-300">
                {summary.black.moveCount > 0 ? `${summary.black.averageEvalDrop} cp` : "—"}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${getProgressBarColor(summary.black.accuracy)}`}
              style={{ width: `${summary.black.moveCount > 0 ? Math.min(100, Math.max(0, summary.black.accuracy)) : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Move Classification Breakdown Grid */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
          Move Classification Breakdown
        </h3>

        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
          <div className="grid grid-cols-12 bg-zinc-50 dark:bg-zinc-800/60 px-4 py-2 font-semibold text-zinc-500 dark:text-zinc-400">
            <div className="col-span-6 sm:col-span-7">Category</div>
            <div className="col-span-3 sm:col-span-2 text-center flex items-center justify-center gap-1">
              <span>♔</span>
              <span>White</span>
            </div>
            <div className="col-span-3 text-center flex items-center justify-center gap-1">
              <span>♚</span>
              <span>Black</span>
            </div>
          </div>

          {categoriesList.map((catKey) => {
            const config = getCategoryConfig(catKey);
            const whiteCount = summary.white.categories[catKey] || 0;
            const blackCount = summary.black.categories[catKey] || 0;
            const hasMoves = whiteCount > 0 || blackCount > 0;

            return (
              <div
                key={catKey}
                className={`grid grid-cols-12 px-4 py-2.5 items-center transition-colors ${
                  hasMoves
                    ? "hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40"
                    : "opacity-60 bg-zinc-50/30 dark:bg-zinc-900/30"
                }`}
              >
                <div className="col-span-6 sm:col-span-7 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-bold border ${config.badgeClasses}`}
                  >
                    {config.symbol}
                  </span>
                  <div>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{config.label}</span>
                    <span className="hidden md:inline ml-2 text-[11px] text-zinc-400 dark:text-zinc-500 font-normal">
                      {config.description}
                    </span>
                  </div>
                </div>

                <div className="col-span-3 sm:col-span-2 text-center font-mono font-bold text-sm">
                  {whiteCount > 0 ? (
                    <span className="text-zinc-900 dark:text-zinc-100">{whiteCount}</span>
                  ) : (
                    <span className="text-zinc-300 dark:text-zinc-600 font-normal">0</span>
                  )}
                </div>

                <div className="col-span-3 text-center font-mono font-bold text-sm">
                  {blackCount > 0 ? (
                    <span className="text-zinc-900 dark:text-zinc-100">{blackCount}</span>
                  ) : (
                    <span className="text-zinc-300 dark:text-zinc-600 font-normal">0</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
