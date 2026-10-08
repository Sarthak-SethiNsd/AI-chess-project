"use client";

import { useState } from "react";
import { getCategoryConfig } from "@/lib/categoryStyles";

export default function MoveExplanationCard({
  moveIndex,
  moveSan,
  category,
  explanation,
  isLoading,
  error,
  onExplainClick,
  explanationLanguage = "English",
  userRating = null,
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  const categoryConfig = category ? getCategoryConfig(category) : null;
  const isHindi = (explanationLanguage || "").toLowerCase().includes("hindi");

  // If no move is selected (e.g. at starting position), do not render
  if (moveIndex < 0 || !moveSan) {
    return null;
  }

  // Not yet requested: render the "Explain this move" trigger button
  if (!explanation && !isLoading && !error) {
    return (
      <div className="w-full max-w-[440px] p-3 rounded-xl bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-white dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-zinc-900 border border-indigo-200/80 dark:border-indigo-800/80 transition-all shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <div>
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                {isHindi ? "एआई कोच विश्लेषण" : "AI Move Coach"}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {isHindi
                  ? "ग्रॉक GPT-OSS 120B द्वारा चाल की व्याख्या"
                  : "Powered by Groq GPT-OSS 120B"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onExplainClick}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 transition-all cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-98"
          >
            <span>💡</span>
            <span>{isHindi ? "यह चाल समझें" : "Explain this move"}</span>
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full max-w-[440px] p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 transition-all space-y-3 animate-fadeIn">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-600" />
            </span>
            <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
              {isHindi ? "विश्लेषण तैयार किया जा रहा है..." : "Generating AI explanation..."}
            </span>
          </div>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold">
            GPT-OSS 120B
          </span>
        </div>

        {/* Skeleton animation */}
        <div className="space-y-2 pt-1 animate-pulse">
          <div className="h-3 bg-indigo-200/60 dark:bg-indigo-800/40 rounded w-5/6" />
          <div className="h-3 bg-indigo-200/50 dark:bg-indigo-800/30 rounded w-4/6" />
        </div>
      </div>
    );
  }

  // Error state with retry
  if (error && !explanation) {
    return (
      <div className="w-full max-w-[440px] p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-red-800 dark:text-red-300 flex items-center gap-1.5">
            <span>⚠️</span>
            <span>{isHindi ? "व्याख्या लोड करने में समस्या" : "Explanation error"}</span>
          </span>
          <button
            type="button"
            onClick={onExplainClick}
            className="text-[11px] font-semibold text-red-700 dark:text-red-300 underline hover:no-underline cursor-pointer"
          >
            {isHindi ? "पुनः प्रयास करें" : "Try again"}
          </button>
        </div>
        <p className="text-red-700/80 dark:text-red-400 text-[11px]">{error}</p>
      </div>
    );
  }

  // Explanation loaded - full structured coaching card
  return (
    <div className="w-full max-w-[440px] rounded-xl bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-900/60 shadow-sm overflow-hidden transition-all animate-fadeIn">
      {/* Coaching Card Header */}
      <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent dark:from-indigo-500/20 border-b border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🤖</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              {isHindi ? "कोच का सुझाव" : "Coach's Review"}
            </span>
            <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
              {moveSan}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Badge for mock / preview during development */}
          {explanation?.mocked && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
              title="Groq API key not set or in test mode; running smart mock"
            >
              Preview
            </span>
          )}

          {categoryConfig && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${categoryConfig.badgeClasses}`}
            >
              <span>{categoryConfig.symbol}</span>
              <span>{categoryConfig.label}</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 px-1 py-0.5 rounded cursor-pointer transition-colors"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {/* Expandable Body */}
      {isExpanded && (
        <div className="p-4 space-y-3.5 text-xs">
          {/* Section 1: What Happened */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 font-semibold text-[11px] uppercase tracking-wider">
              <span>🔍</span>
              <span>{isHindi ? "क्या हुआ" : "What Happened"}</span>
            </div>
            <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed pl-5 text-[12px]">
              {explanation.whatHappened}
            </p>
          </div>

          {/* Section 2: What Was Better */}
          <div className="space-y-1 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center justify-between gap-1.5 text-zinc-500 dark:text-zinc-400 font-semibold text-[11px] uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <span>🎯</span>
                <span>{isHindi ? "क्या बेहतर था" : "What Was Better"}</span>
              </span>
              {explanation.bestMoveSan && (
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800 lowercase">
                  best: <strong className="uppercase">{explanation.bestMoveSan}</strong>
                </span>
              )}
            </div>
            <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed pl-5 text-[12px]">
              {explanation.whatWasBetter}
            </p>
          </div>

          {/* Section 3: Key Takeaway */}
          <div className="p-2.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 space-y-1">
            <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] uppercase tracking-wide">
              <span>💡</span>
              <span>{isHindi ? "मुख्य सीख" : "Key Takeaway"}</span>
            </div>
            <p className="text-indigo-950 dark:text-indigo-100 font-medium leading-relaxed pl-5 text-[12px]">
              {explanation.keyTakeaway}
            </p>
          </div>

          {/* Footer info: calibrated rating tier & Groq GPT-OSS 120B model */}
          <div className="pt-1 flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500">
            <span>
              {isHindi ? "रेटिंग स्तर" : "Calibrated for"}:{" "}
              <strong className="text-zinc-600 dark:text-zinc-400">
                {userRating ? `${userRating} Elo` : "All Ratings"}
              </strong>
            </span>
            <span className="font-mono">Groq GPT-OSS 120B</span>
          </div>
        </div>
      )}
    </div>
  );
}
