"use client";

import {
  getCriticalNavState,
  getCriticalCounter,
  normalizeSide,
} from "@/lib/criticalMoves";
import { formatPointLabel } from "@/lib/evalGraphInteraction";

/**
 * Presentational toolbar providing "Prev mistake" and "Next mistake" buttons,
 * a "My mistakes only" filter toggle, and a counter ("2 of 5" or "5 mistakes").
 *
 * Integrates directly with the replay jump mechanism so that clicking
 * a button jumps the board and graph indicator to the previous or next
 * critical move (Mistake or Blunder).
 *
 * @param {Object} props
 * @param {Array<Object>} [props.criticalMoves=[]] - Array of critical moves from findCriticalMoves().
 * @param {number} [props.currentMoveIndex=-1] - Current replay move index (-1 for start position).
 * @param {(moveIndex: number) => void} props.onJump - Callback dispatching jump request to target moveIndex.
 * @param {string} [props.userColor] - User's chosen color ('white' | 'black').
 * @param {boolean} [props.myMistakesOnly=false] - Whether filtering to user's mistakes only is active.
 * @param {() => void} [props.onToggleMyMistakes] - Callback toggling myMistakesOnly state.
 * @param {number} [props.unfilteredCriticalCount=0] - Total count of critical moves across both sides.
 */
export default function CriticalMovesNav({
  criticalMoves = [],
  currentMoveIndex = -1,
  onJump,
  userColor,
  myMistakesOnly = false,
  onToggleMyMistakes,
  unfilteredCriticalCount = 0,
}) {
  const navState = getCriticalNavState(criticalMoves, currentMoveIndex);
  const { prev, next, hasAny, canPrev, canNext } = navState;

  const counter = getCriticalCounter(criticalMoves, currentMoveIndex);
  const canShowToggle = normalizeSide(userColor) !== null;

  // Empty state handling
  if (!hasAny) {
    const isFilteredEmpty = myMistakesOnly && unfilteredCriticalCount > 0;
    return (
      <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 font-medium text-zinc-500 dark:text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {isFilteredEmpty ? "No mistakes by you" : "No mistakes or blunders found"}
        </span>

        {canShowToggle && isFilteredEmpty && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={myMistakesOnly}
              onClick={() => onToggleMyMistakes?.()}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:focus:ring-offset-zinc-900 ${
                myMistakesOnly ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-700"
              }`}
              title="Toggle my mistakes only"
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  myMistakesOnly ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
            <span
              onClick={() => onToggleMyMistakes?.()}
              className="font-medium text-zinc-600 dark:text-zinc-300 cursor-pointer select-none"
            >
              My mistakes only
            </span>
          </div>
        )}
      </div>
    );
  }

  // Derive counter display string
  let counterText = "";
  if (counter.position !== null) {
    counterText = `${counter.position} of ${counter.total}`;
  } else if (counter.total > 0) {
    counterText = `${counter.total} ${counter.total === 1 ? "mistake" : "mistakes"}`;
  }

  const prevAriaLabel = prev
    ? `Go to ${formatPointLabel({
        index: prev.moveIndex + 1,
        moveSan: prev.moveSan,
        turn: prev.turn,
      })} (${prev.category})`
    : "No previous mistake";

  const nextAriaLabel = next
    ? `Go to ${formatPointLabel({
        index: next.moveIndex + 1,
        moveSan: next.moveSan,
        turn: next.turn,
      })} (${next.category})`
    : "No next mistake";

  return (
    <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
      <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 font-medium">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        <span>Mistake Navigation</span>
        {counterText && (
          <>
            <span className="text-zinc-300 dark:text-zinc-700">·</span>
            <span
              aria-live="polite"
              className="font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-200 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60"
            >
              {counterText}
            </span>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {canShowToggle && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={myMistakesOnly}
              onClick={() => onToggleMyMistakes?.()}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:focus:ring-offset-zinc-900 ${
                myMistakesOnly ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-700"
              }`}
              title="Toggle my mistakes only"
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  myMistakesOnly ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
            <span
              onClick={() => onToggleMyMistakes?.()}
              className="font-medium text-zinc-600 dark:text-zinc-300 cursor-pointer select-none"
            >
              My mistakes only
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (prev && typeof prev.moveIndex === "number") {
                onJump?.(prev.moveIndex);
              }
            }}
            disabled={!canPrev}
            aria-label={prevAriaLabel}
            title={prevAriaLabel}
            className="py-1.5 px-3 min-h-[38px] rounded-lg font-medium text-xs sm:text-sm text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:focus:ring-offset-zinc-900 flex items-center gap-1.5"
          >
            <span aria-hidden="true">◀</span>
            <span>Prev mistake</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (next && typeof next.moveIndex === "number") {
                onJump?.(next.moveIndex);
              }
            }}
            disabled={!canNext}
            aria-label={nextAriaLabel}
            title={nextAriaLabel}
            className="py-1.5 px-3 min-h-[38px] rounded-lg font-medium text-xs sm:text-sm text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:focus:ring-offset-zinc-900 flex items-center gap-1.5"
          >
            <span>Next mistake</span>
            <span aria-hidden="true">▶</span>
          </button>
        </div>
      </div>
    </div>
  );
}
