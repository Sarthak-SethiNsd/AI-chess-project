"use client";

import { useState } from "react";
import PgnInput from "@/components/PgnInput";
import ChessBoardReplay from "@/components/ChessBoardReplay";
import AnalysisSummaryPanel from "@/components/AnalysisSummaryPanel";
import { analyseGame } from "@/lib/gameAnalysis";
import { categorizeGame } from "@/lib/moveCategorization";
import { REVIEW_DEPTH_CONFIG } from "@/lib/categoryStyles";

export default function Home() {
  const [loadedGame, setLoadedGame] = useState(null);
  const [userRating, setUserRating] = useState(null);
  const [userColor, setUserColor] = useState("white");
  const [userPlatform, setUserPlatform] = useState("");
  const [reviewDepth, setReviewDepth] = useState("Standard");
  const [explanationLanguage, setExplanationLanguage] = useState("English");

  // Analysis pipeline states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(null); // { done: number, total: number }
  const [analysisError, setAnalysisError] = useState(null);
  const [categorizedData, setCategorizedData] = useState(null); // { evaluations: Array, summary: Object }

  /**
   * Executes the full Stockfish game evaluation and move categorization pipeline.
   *
   * Depth mapping:
   * - "Quick"    -> depth 8  (~1-2s evaluation)
   * - "Standard" -> depth 12 (~2-4s balanced review)
   * - "Detailed" -> depth 18 (tactical depth)
   */
  const runGameAnalysis = async (game, depthSetting) => {
    if (!game) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setCategorizedData(null);
    setAnalysisProgress({ done: 0, total: game.totalMoves + 1 });

    try {
      const depthConfig = REVIEW_DEPTH_CONFIG[depthSetting] || REVIEW_DEPTH_CONFIG.Standard;

      const analysisResult = await analyseGame(
        game,
        { depth: depthConfig.depth },
        {
          onProgress: (done, total) => {
            setAnalysisProgress({ done, total });
          },
        }
      );

      const categorized = categorizeGame(analysisResult);
      setCategorizedData(categorized);
    } catch (err) {
      console.error("Game analysis error:", err);
      setAnalysisError(err?.message || "An unexpected error occurred during engine analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGameLoaded = ({
    game,
    rating,
    color,
    platform,
    reviewDepth: depth,
    language,
  }) => {
    setLoadedGame(game);
    setUserRating(rating);
    setUserColor(color);
    setUserPlatform(platform || "");
    const selectedDepth = depth || "Standard";
    setReviewDepth(selectedDepth);
    setExplanationLanguage(language || "English");

    // Automatically trigger full game analysis when loaded
    runGameAnalysis(game, selectedDepth);
  };

  const handleReset = () => {
    setLoadedGame(null);
    setUserRating(null);
    setUserColor("white");
    setUserPlatform("");
    setReviewDepth("Standard");
    setExplanationLanguage("English");
    setIsAnalyzing(false);
    setAnalysisProgress(null);
    setAnalysisError(null);
    setCategorizedData(null);
  };

  const progressPercent =
    analysisProgress && analysisProgress.total > 0
      ? Math.round((analysisProgress.done / analysisProgress.total) * 100)
      : 0;

  const currentDepthInfo = REVIEW_DEPTH_CONFIG[reviewDepth] || REVIEW_DEPTH_CONFIG.Standard;

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold tracking-wide uppercase">
            Stockfish Review & Accuracy
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            AI Chess Review
          </h1>
          <p className="max-w-2xl mx-auto text-base text-zinc-600 dark:text-zinc-400">
            Upload your PGN to get automated Stockfish move quality categorization, accuracy metrics, and step-by-step board replay.
          </p>
        </header>

        {/* Input Section */}
        <section className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8">
          <PgnInput onGameLoaded={handleGameLoaded} />
        </section>

        {/* Analysis Progress Loading State */}
        {isAnalyzing && (
          <section className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-indigo-200 dark:border-indigo-900/60 p-6 sm:p-8 space-y-4 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-indigo-600" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    Stockfish Engine Review in Progress
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Evaluating moves at {currentDepthInfo.label} ({currentDepthInfo.badge})
                  </p>
                </div>
              </div>
              <span className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400">
                {progressPercent}%
              </span>
            </div>

            {/* Animated Progress Bar */}
            <div className="w-full h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden border border-zinc-200 dark:border-zinc-700">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>
                Analyzing position{" "}
                <strong className="text-zinc-800 dark:text-zinc-200 font-mono">
                  {analysisProgress?.done || 0}
                </strong>{" "}
                of{" "}
                <strong className="text-zinc-800 dark:text-zinc-200 font-mono">
                  {analysisProgress?.total || 0}
                </strong>
              </span>
              <span>Off-thread Web Worker</span>
            </div>
          </section>
        )}

        {/* Analysis Error Alert */}
        {analysisError && !isAnalyzing && (
          <section className="bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-200 dark:border-red-900 p-6 space-y-3 animate-fadeIn">
            <div className="flex items-center gap-2.5 text-red-800 dark:text-red-300 font-semibold text-sm">
              <span className="text-lg">⚠️</span>
              <h3>Engine Analysis Error</h3>
            </div>
            <p className="text-xs text-red-700 dark:text-red-400">{analysisError}</p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => runGameAnalysis(loadedGame, reviewDepth)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white cursor-pointer transition-colors shadow-xs"
              >
                Retry Analysis
              </button>
            </div>
          </section>
        )}

        {/* Loaded Game Review Section */}
        {loadedGame && (
          <div className="space-y-8 animate-fadeIn">
            {/* Game Summary Card */}
            <section className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-emerald-200 dark:border-emerald-900/60 p-6 sm:p-8 space-y-5 transition-all">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                    Game Overview
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
                    Clear Game
                  </button>
                </div>
              </div>

              {/* Game Metadata & User Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">White</p>
                  <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {loadedGame.headers.White || "Unknown"}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Black</p>
                  <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {loadedGame.headers.Black || "Unknown"}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">You Played</p>
                  <p className="mt-0.5 text-sm font-bold text-indigo-950 dark:text-indigo-200 capitalize flex items-center gap-1">
                    <span>{userColor === "black" ? "♚ Black" : "♔ White"}</span>
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Your Rating</p>
                  <p className="mt-0.5 text-sm font-bold text-indigo-950 dark:text-indigo-200 font-mono">
                    {userRating || "—"}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Total Moves</p>
                  <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {loadedGame.totalMoves} ply
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Event / Date</p>
                  <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {loadedGame.headers.Event || "Casual"}
                  </p>
                </div>
              </div>

              {/* Preferences Summary Badges */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-zinc-400 dark:text-zinc-500 font-medium">Settings:</span>
                  <span className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium border border-zinc-200 dark:border-zinc-700">
                    Depth: <strong>{reviewDepth}</strong> ({currentDepthInfo.badge})
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium border border-zinc-200 dark:border-zinc-700">
                    Language: <strong>{explanationLanguage}</strong>
                  </span>
                  {userPlatform && (
                    <span className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium border border-zinc-200 dark:border-zinc-700">
                      Platform: <strong>{userPlatform}</strong>
                    </span>
                  )}
                </div>

                {categorizedData && !isAnalyzing && (
                  <button
                    type="button"
                    onClick={() => runGameAnalysis(loadedGame, reviewDepth)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium cursor-pointer"
                  >
                    ↺ Re-analyze Game
                  </button>
                )}
              </div>
            </section>

            {/* Game-Level Accuracy & Category Summary Panel */}
            {categorizedData?.summary && (
              <AnalysisSummaryPanel
                summary={categorizedData.summary}
                whitePlayerName={loadedGame.headers.White || "White"}
                blackPlayerName={loadedGame.headers.Black || "Black"}
                userColor={userColor}
                reviewDepth={reviewDepth}
              />
            )}

            {/* Interactive Chessboard Replay with User Orientation and Move Quality Badges */}
            <section>
              <ChessBoardReplay
                game={loadedGame}
                orientation={userColor}
                categorizedEvaluations={categorizedData?.evaluations || []}
              />
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
