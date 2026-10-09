/**
 * Production environment verification script:
 * 1. Checks that Stockfish static assets load correctly via HTTP from /public/stockfish.
 * 2. Checks that production API returns HTTP 503 when GROQ_API_KEY is not configured.
 * 3. Verifies Stockfish engine analysis works.
 */

import fs from "node:fs";
import path from "node:path";
import { evaluatePosition, terminateStockfish } from "../lib/stockfishEngine.js";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

async function runProductionAssetTests() {
  console.log("=== Verifying Production Server & Stockfish Assets ===\n");

  const baseUrl = "http://localhost:3000";

  // 1. Verify Homepage
  console.log("1. Checking production homepage...");
  const homeRes = await fetch(`${baseUrl}/`);
  assert(homeRes.status === 200, `Homepage returned HTTP ${homeRes.status}`);
  console.log("   ✓ Homepage loaded successfully (HTTP 200)\n");

  // 2. Verify Stockfish Static Assets
  console.log("2. Checking Stockfish static assets...");
  const assets = [
    { urlPath: "/stockfish/stockfish.wasm.js", localFile: "public/stockfish/stockfish.wasm.js" },
    { urlPath: "/stockfish/stockfish.wasm", localFile: "public/stockfish/stockfish.wasm" },
    { urlPath: "/stockfish/stockfish.js", localFile: "public/stockfish/stockfish.js" },
  ];

  for (const asset of assets) {
    const res = await fetch(`${baseUrl}${asset.urlPath}`);
    assert(res.status === 200, `Asset ${asset.urlPath} failed with HTTP ${res.status}`);
    const buffer = await res.arrayBuffer();
    const localSize = fs.statSync(path.resolve(process.cwd(), asset.localFile)).size;
    assert(
      buffer.byteLength === localSize,
      `Asset size mismatch for ${asset.urlPath}: received ${buffer.byteLength}, expected ${localSize}`
    );
    console.log(`   ✓ ${asset.urlPath} loaded (${buffer.byteLength.toLocaleString()} bytes, HTTP 200)`);
  }
  console.log("");

  // 3. Verify Production API route behavior (HTTP 503 without key)
  console.log("3. Checking production /api/explain-move behavior without key...");
  const apiRes = await fetch(`${baseUrl}/api/explain-move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fenBefore: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 3 3",
      fenAfter: "r1bqkb1r/pppp1ppp/2n4n/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
      moveSan: "Nh6",
      bestMoveSan: "Nf6",
      category: "Blunder",
      evalDrop: 350,
      userRating: 1200,
      explanationLanguage: "English",
    }),
  });
  assert(apiRes.status === 503, `Expected HTTP 503 in production without key, got ${apiRes.status}`);
  const apiData = await apiRes.json();
  assert(apiData.error && !apiData.mocked, "Production API must return friendly error without mock data");
  console.log(`   ✓ Production route returned HTTP 503: "${apiData.error}"\n`);

  // 4. Verify Stockfish Engine Analysis
  console.log("4. Verifying Stockfish engine analysis execution...");
  const startFen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
  const evalResult = await evaluatePosition(startFen, { depth: 8 });
  assert(evalResult && evalResult.bestMove, "Engine analysis failed to produce bestMove");
  assert(evalResult.score, "Engine analysis failed to produce score");
  console.log(`   ✓ Stockfish evaluated position at depth ${evalResult.depth}: best move = ${evalResult.bestMove.san || evalResult.bestMove.uci}, score = ${evalResult.score.type} ${evalResult.score.value}`);

  terminateStockfish();
  console.log("\n🎉 ALL PRODUCTION ASSET & ANALYSIS TESTS PASSED SUCCESSFULLY!");
}

runProductionAssetTests().catch((err) => {
  console.error("Test failed:", err);
  terminateStockfish();
  process.exit(1);
});
