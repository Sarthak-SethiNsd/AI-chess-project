"use client";

import { useState } from "react";
import { validatePgn, loadGameFromPgn } from "@/lib/chessEngine";

const SAMPLE_PGN = `[Event "F/S Return Match"]
[Site "Belgrade, Serbia JUG"]
[Date "1992.11.04"]
[Round "29"]
[White "Fischer, Robert J."]
[Black "Spassky, Boris V."]
[Result "1/2-1/2"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3
O-O 9. h3 Nb8 10. d4 Nbd7 11. c4 c6 12. cxb5 axb5 13. Nc3 Bb7 14. Bg5 b4 15.
Nb1 h6 16. Bh4 c5 17. dxe5 Nxe4 18. Bxe7 Qxe7 19. exd6 Qf6 20. Nbd2 Nxd6 21.
Nc4 Nxc4 22. Bxc4 Nb6 23. Ne5 Rae8 24. Bxf7+ Rxf7 25. Nxf7 Rxe1+ 26. Qxe1 Kxf7
27. Qe3 Qg5 28. Qxg5 hxg5 29. b3 Ke6 30. a3 Kd6 31. axb4 cxb4 32. Ra5 Nd5 33.
f3 Bc8 34. Kf2 Bf5 35. Ra7 g6 36. Ra6+ Kc5 37. Ke1 Nf4 38. g3 Nxh3 39. Kd2 Kb5
40. Rd6 Kc5 41. Ra6 Nf2 42. g4 Bd3 43. Re6 1/2-1/2`;

export default function PgnInput({ onGameLoaded }) {
  const [pgn, setPgn] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    const trimmedPgn = pgn.trim();
    if (!trimmedPgn) {
      setError("Please enter or paste a PGN string before analyzing.");
      return;
    }

    setIsSubmitting(true);
    try {
      const validation = validatePgn(trimmedPgn);
      if (!validation.isValid) {
        setError(`Invalid PGN: ${validation.error || "Please check the format and try again."}`);
        setIsSubmitting(false);
        return;
      }

      const game = loadGameFromPgn(trimmedPgn);
      if (onGameLoaded) {
        onGameLoaded(game);
      }
    } catch (err) {
      setError(err?.message || "An unexpected error occurred while parsing the PGN.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoadSample = () => {
    setPgn(SAMPLE_PGN);
    setError(null);
  };

  const handleClear = () => {
    setPgn("");
    setError(null);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between">
          <label
            htmlFor="pgn-input"
            className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100"
          >
            Paste PGN (Portable Game Notation)
          </label>
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={handleLoadSample}
              className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium cursor-pointer transition-colors"
            >
              Load Sample Game
            </button>
            <span className="text-zinc-400 dark:text-zinc-600">|</span>
            <button
              type="button"
              onClick={handleClear}
              className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="relative">
          <textarea
            id="pgn-input"
            value={pgn}
            onChange={(e) => {
              setPgn(e.target.value);
              if (error) setError(null);
            }}
            placeholder={`[Event "World Championship"]\n[White "Player 1"]\n[Black "Player 2"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6...`}
            rows={9}
            className="w-full p-3 font-mono text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y shadow-sm transition-all"
          />
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm flex items-start gap-2.5">
            <svg
              className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="font-semibold">Validation Error</p>
              <p className="mt-0.5 text-xs text-red-600 dark:text-red-400 break-words">{error}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={!pgn.trim() || isSubmitting}
            className="px-5 py-2.5 rounded-lg font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm hover:shadow transition-all"
          >
            {isSubmitting ? "Validating..." : "Analyze Game"}
          </button>
        </div>
      </form>
    </div>
  );
}
