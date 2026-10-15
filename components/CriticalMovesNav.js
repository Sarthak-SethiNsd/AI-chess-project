"use client";

import { getCriticalNavState } from "@/lib/criticalMoves";
import { formatPointLabel } from "@/lib/evalGraphInteraction";

/**
 * Presentational toolbar providing "Prev mistake" and "Next mistake" buttons.
 *
 * Integrates directly with the replay jump mechanism so that clicking
 * a button jumps the board and graph indicator to the previous or next
 * critical move (Mistake or Blunder).
 *
 * @param {Object} props
 * @param {Array<Object>} [props.criticalMoves=[]] - Array of critical moves from findCriticalMoves().
 * @param {number} [props.currentMoveIndex=-1] - Current replay move index (-1 for start position).
 * @param {(moveIndex: number) => void} props.onJump - Callback dispatching jump request to target moveIndex.
 */
export default function CriticalMovesNav({
  criticalMoves = [],
  currentMoveIndex = -1,
  onJump,
}) {
  const navState = getCriticalNavState(criticalMoves, currentMoveIndex);
  const { prev, next, hasAny, canPrev, canNext } = navState;

  if (!hasAny) {
    return (
      <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          No mistakes or blunders found
        </span>
      </div>
    );
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
      <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 font-medium">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        <span>Mistake Navigation</span>
      </div>

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
  );
}
