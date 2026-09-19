"use client";

import { useState, useRef } from "react";
import { validatePgn, loadGameFromPgn } from "@/lib/chessEngine";

const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1MB

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
  const [loadedFileName, setLoadedFileName] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    const trimmedPgn = pgn.trim();
    if (!trimmedPgn) {
      setError("Please enter, paste, or upload a PGN file before analyzing.");
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

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Basic file-type guard: must end with .pgn (case-insensitive)
    if (!file.name.toLowerCase().endsWith(".pgn")) {
      setError(`Invalid file type "${file.name}". Please upload a valid .pgn file.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Basic file-size guard: 1MB limit
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setError(`File size (${sizeMb} MB) exceeds the 1MB limit. Please upload a valid chess PGN file under 1MB.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        setPgn(content);
        setLoadedFileName(file.name);
        setError(null);
      }
    };

    reader.onerror = () => {
      setError("Failed to read the selected file. Please try again.");
    };

    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleLoadSample = () => {
    setPgn(SAMPLE_PGN);
    setLoadedFileName(null);
    setError(null);
  };

  const handleClear = () => {
    setPgn("");
    setLoadedFileName(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pgn"
        onChange={handleFileUpload}
        className="hidden"
        id="pgn-file-upload"
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <label
              htmlFor="pgn-input"
              className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100"
            >
              PGN Game Notation
            </label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Paste notation below or upload a <code className="font-mono text-indigo-600 dark:text-indigo-400">.pgn</code> file
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium text-zinc-700 dark:text-zinc-200 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 cursor-pointer transition-colors shadow-xs"
            >
              <svg className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload .pgn file
            </button>

            <span className="text-zinc-300 dark:text-zinc-700">|</span>

            <button
              type="button"
              onClick={handleLoadSample}
              className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium cursor-pointer transition-colors"
            >
              Load Sample
            </button>

            <span className="text-zinc-300 dark:text-zinc-700">|</span>

            <button
              type="button"
              onClick={handleClear}
              className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* File loaded indicator badge */}
        {loadedFileName && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-700 dark:text-indigo-300">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Loaded from file: <strong className="font-mono">{loadedFileName}</strong></span>
          </div>
        )}

        {/* Textarea */}
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

        {/* Error notification */}
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

        {/* Submit */}
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
