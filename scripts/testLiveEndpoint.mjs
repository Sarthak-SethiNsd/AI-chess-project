async function testLive() {
  const payload = {
    fenBefore: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 3 3",
    fenAfter: "r1bqkb1r/pppp1ppp/2n4n/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
    moveSan: "Nh6",
    bestMoveSan: "Nf6",
    category: "Blunder",
    evalDrop: 450,
    userRating: 1100,
    explanationLanguage: "English"
  };

  const res = await fetch("http://localhost:3000/api/explain-move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log("English Status:", res.status);
  console.log("English Data:\n", JSON.stringify(data, null, 2));

  if (!data.whatHappened || !data.whatWasBetter || !data.keyTakeaway || !data.mocked) {
    throw new Error("Live endpoint response missing required fields!");
  }

  // Also test Hindi
  const resHi = await fetch("http://localhost:3000/api/explain-move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, explanationLanguage: "Hindi" })
  });
  const dataHi = await resHi.json();
  console.log("Hindi Status:", resHi.status);
  console.log("Hindi Data:\n", JSON.stringify(dataHi, null, 2));

  if (!dataHi.whatHappened || !dataHi.whatWasBetter || !dataHi.keyTakeaway || !dataHi.mocked) {
    throw new Error("Live endpoint Hindi response missing required fields!");
  }

  console.log("\n✅ LIVE ENDPOINT VERIFIED SUCCESSFULLY!");
}

testLive().catch((err) => {
  console.error(err);
  process.exit(1);
});
