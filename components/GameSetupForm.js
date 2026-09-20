"use client";

export default function GameSetupForm({
  rating,
  onRatingChange,
  color,
  onColorChange,
  ratingError,
}) {
  return (
    <div className="p-4 sm:p-5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <span>Game Review Setup</span>
          <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
            (Required before analysis)
          </span>
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Provide your playing color and approximate rating to personalize move analysis and board perspective.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
        {/* Playing Color Selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Playing Color <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onColorChange("white")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold border cursor-pointer transition-all ${
                color === "white"
                  ? "bg-white text-zinc-900 border-indigo-600 ring-2 ring-indigo-500/20 dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                  : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
              }`}
            >
              <span className="text-base leading-none">♔</span>
              <span>White</span>
            </button>

            <button
              type="button"
              onClick={() => onColorChange("black")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold border cursor-pointer transition-all ${
                color === "black"
                  ? "bg-zinc-900 text-white border-indigo-500 ring-2 ring-indigo-500/20 dark:bg-zinc-950 dark:text-white shadow-sm"
                  : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
              }`}
            >
              <span className="text-base leading-none">♚</span>
              <span>Black</span>
            </button>
          </div>
          {!color && (
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
              Select which side you played
            </p>
          )}
        </div>

        {/* User Rating Input */}
        <div className="space-y-1.5">
          <label
            htmlFor="user-rating"
            className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
          >
            Your Rating (100–3500) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="user-rating"
              type="number"
              min="100"
              max="3500"
              step="1"
              value={rating}
              onChange={(e) => onRatingChange(e.target.value)}
              placeholder="e.g. 1500"
              className={`w-full py-2 px-3 text-sm rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none transition-all ${
                ratingError
                  ? "border-red-400 focus:ring-2 focus:ring-red-500/30 dark:border-red-700"
                  : "border-zinc-300 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              }`}
            />
          </div>
          {ratingError ? (
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">
              {ratingError}
            </p>
          ) : (
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
              Chess.com, Lichess, or FIDE rating
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
