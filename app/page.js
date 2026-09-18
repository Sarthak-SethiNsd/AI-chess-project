export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="max-w-2xl text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">AI Chess Review</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          AI-powered chess game review tool. Users upload a PGN, get Stockfish-based move analysis, and can request AI explanations for specific moves on demand.
        </p>
      </div>
    </main>
  );
}
