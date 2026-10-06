import { MOVE_CATEGORIES } from "./moveCategorization";

/**
 * Visual styling and metadata configuration for each move quality category.
 * Provides consistent color palettes, symbols, and badges across the application.
 */
export const CATEGORY_CONFIG = {
  [MOVE_CATEGORIES.BRILLIANT]: {
    label: "Brilliant",
    symbol: "!!",
    icon: "✦",
    textColor: "text-cyan-700 dark:text-cyan-300",
    badgeClasses:
      "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/80 dark:text-cyan-300 dark:border-cyan-800",
    activeClasses: "ring-2 ring-cyan-500 bg-cyan-600 text-white dark:bg-cyan-500 dark:text-black",
    dotColor: "bg-cyan-500",
    description: "The engine's top choice featuring a sound material sacrifice.",
  },
  [MOVE_CATEGORIES.BEST]: {
    label: "Best",
    symbol: "★",
    icon: "★",
    textColor: "text-emerald-700 dark:text-emerald-300",
    badgeClasses:
      "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800",
    activeClasses: "ring-2 ring-emerald-500 bg-emerald-600 text-white",
    dotColor: "bg-emerald-500",
    description: "The best possible move in this position.",
  },
  [MOVE_CATEGORIES.EXCELLENT]: {
    label: "Excellent",
    symbol: "✓",
    icon: "✓",
    textColor: "text-teal-700 dark:text-teal-300",
    badgeClasses:
      "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-800",
    activeClasses: "ring-2 ring-teal-500 bg-teal-600 text-white",
    dotColor: "bg-teal-500",
    description: "Nearly as strong as the top engine recommendation.",
  },
  [MOVE_CATEGORIES.GOOD]: {
    label: "Good",
    symbol: "✓",
    icon: "✓",
    textColor: "text-sky-700 dark:text-sky-300",
    badgeClasses:
      "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-800",
    activeClasses: "ring-2 ring-sky-500 bg-sky-600 text-white",
    dotColor: "bg-sky-500",
    description: "A solid, playable move with a very slight evaluation loss.",
  },
  [MOVE_CATEGORIES.INACCURACY]: {
    label: "Inaccuracy",
    symbol: "?!",
    icon: "?!",
    textColor: "text-amber-700 dark:text-amber-300",
    badgeClasses:
      "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800",
    activeClasses: "ring-2 ring-amber-500 bg-amber-600 text-white",
    dotColor: "bg-amber-500",
    description: "A slight slip that hands over some positional advantage.",
  },
  [MOVE_CATEGORIES.MISTAKE]: {
    label: "Mistake",
    symbol: "?",
    icon: "?",
    textColor: "text-orange-700 dark:text-orange-300",
    badgeClasses:
      "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/80 dark:text-orange-300 dark:border-orange-800",
    activeClasses: "ring-2 ring-orange-500 bg-orange-600 text-white",
    dotColor: "bg-orange-500",
    description: "A bad move that significantly degrades the position.",
  },
  [MOVE_CATEGORIES.BLUNDER]: {
    label: "Blunder",
    symbol: "??",
    icon: "??",
    textColor: "text-red-700 dark:text-red-300",
    badgeClasses:
      "bg-red-100 text-red-800 border-red-300 dark:bg-red-950/80 dark:text-red-300 dark:border-red-800",
    activeClasses: "ring-2 ring-red-500 bg-red-600 text-white",
    dotColor: "bg-red-500",
    description: "A catastrophic move that loses material, a winning position, or checkmate.",
  },
};

/**
 * Returns configuration metadata for a category with safe fallback.
 * @param {string} category
 * @returns {Object}
 */
export function getCategoryConfig(category) {
  return (
    CATEGORY_CONFIG[category] || {
      label: category || "Unknown",
      symbol: "•",
      icon: "•",
      textColor: "text-zinc-600 dark:text-zinc-400",
      badgeClasses:
        "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
      activeClasses: "ring-2 ring-zinc-500 bg-zinc-600 text-white",
      dotColor: "bg-zinc-400",
      description: "",
    }
  );
}

/**
 * Review depth setting configuration mapping labels to Stockfish search depth.
 */
export const REVIEW_DEPTH_CONFIG = {
  Quick: {
    depth: 8,
    label: "Quick",
    badge: "Depth 8",
    description: "Fast evaluation (~1-2 seconds per game)",
  },
  Standard: {
    depth: 12,
    label: "Standard",
    badge: "Depth 12",
    description: "Balanced evaluation for everyday review",
  },
  Detailed: {
    depth: 18,
    label: "Detailed",
    badge: "Depth 18",
    description: "Deep tactical search for tournament analysis",
  },
};
