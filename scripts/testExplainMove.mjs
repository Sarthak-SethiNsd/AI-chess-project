/**
 * Standalone verification script for AI Move Explanation layer (Groq GPT-OSS 120B).
 *
 * Tests:
 * 1. Rating tier calibration (<1200, 1200-1800, 1800+).
 * 2. Prompt engineering (English & Hindi instructions, pedagogical calibration).
 * 3. Structured JSON response parsing and markdown fence stripping.
 * 4. High-quality mock/fallback explanation generation across all categories and languages.
 * 5. Mock flag behavior (mocked: true for development/offline testing).
 */

import {
  GROQ_MODEL,
  getRatingTier,
  buildExplanationPrompt,
  parseExplanationResponse,
  getFallbackExplanation,
} from "../lib/moveExplanation.js";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

console.log("=== Testing AI Move Explanation Layer (Groq GPT-OSS 120B) ===\n");

// 1. Verify Model Identifier
console.log("1. Checking Groq model specification...");
assert(GROQ_MODEL === "openai/gpt-oss-120b", `Expected model openai/gpt-oss-120b, got ${GROQ_MODEL}`);
console.log(`   ✓ Model verified: ${GROQ_MODEL}\n`);

// 2. Rating Tier Calibration
console.log("2. Checking rating tier calibration...");
assert(getRatingTier(800) === "beginner", "Rating 800 should be beginner");
assert(getRatingTier(1199) === "beginner", "Rating 1199 should be beginner");
assert(getRatingTier(null) === "beginner", "Null rating should default to beginner");
assert(getRatingTier(1200) === "intermediate", "Rating 1200 should be intermediate");
assert(getRatingTier(1500) === "intermediate", "Rating 1500 should be intermediate");
assert(getRatingTier(1799) === "intermediate", "Rating 1799 should be intermediate");
assert(getRatingTier(1800) === "advanced", "Rating 1800 should be advanced");
assert(getRatingTier(2400) === "advanced", "Rating 2400 should be advanced");
console.log("   ✓ Rating tier mapping accurate (<1200, 1200-1800, 1800+)\n");

// 3. Prompt Construction for English & Hindi
console.log("3. Checking prompt construction and language calibration...");
const englishPrompt = buildExplanationPrompt({
  fenBefore: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 3 3",
  fenAfter: "r1bqkb1r/pppp1ppp/2n4n/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
  moveSan: "Nh6",
  bestMoveSan: "Nf6",
  category: "Blunder",
  evalDrop: 350,
  userRating: 950,
  explanationLanguage: "English",
});

assert(englishPrompt.systemPrompt.includes("undefended"), "Beginner prompt should emphasize undefended pieces");
assert(englishPrompt.systemPrompt.includes("whatHappened"), "System prompt must demand whatHappened key");
assert(englishPrompt.systemPrompt.includes("whatWasBetter"), "System prompt must demand whatWasBetter key");
assert(englishPrompt.systemPrompt.includes("keyTakeaway"), "System prompt must demand keyTakeaway key");
assert(englishPrompt.userPrompt.includes("Nh6"), "User prompt should include played move");
assert(englishPrompt.userPrompt.includes("Nf6"), "User prompt should include best move");

const hindiPrompt = buildExplanationPrompt({
  fenBefore: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 3 3",
  fenAfter: "r1bqkb1r/pppp1ppp/2n4n/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
  moveSan: "Nh6",
  bestMoveSan: "Nf6",
  category: "Blunder",
  evalDrop: 350,
  userRating: 1600,
  explanationLanguage: "Hindi",
});

assert(hindiPrompt.systemPrompt.includes("हिन्दी"), "Hindi prompt must specify Hindi language guidance");
assert(hindiPrompt.systemPrompt.includes("tactical motifs") || hindiPrompt.systemPrompt.includes("outposts"), "Intermediate prompt should emphasize tactical motifs");
console.log("   ✓ Prompt generation calibrated for rating and language\n");

// 4. Response Parsing
console.log("4. Checking response parser...");
const sampleValidJson = JSON.stringify({
  whatHappened: "You moved your knight to h6 without solving the threat on f7.",
  whatWasBetter: "Nf6 was essential to develop actively and shield against the queen's attack.",
  keyTakeaway: "Before moving, always check what your opponent is threatening.",
});

const parsedValid = parseExplanationResponse(sampleValidJson);
assert(parsedValid.whatHappened.includes("knight to h6"), "Parsed whatHappened mismatch");
assert(parsedValid.whatWasBetter.includes("Nf6"), "Parsed whatWasBetter mismatch");
assert(parsedValid.keyTakeaway.includes("threatening"), "Parsed keyTakeaway mismatch");

// Test markdown fenced json
const sampleFenced = "```json\n" + sampleValidJson + "\n```";
const parsedFenced = parseExplanationResponse(sampleFenced);
assert(parsedFenced.whatHappened === parsedValid.whatHappened, "Fenced JSON parsing failed");

// Test delimited section fallback
const sampleDelimited = `
What Happened:
You traded rooks prematurely.

What Was Better:
Rd1 doubled rooks on the open file.

Key Takeaway:
Control open files before trading.
`;
const parsedDelimited = parseExplanationResponse(sampleDelimited);
assert(parsedDelimited.whatHappened.includes("traded rooks"), "Delimited fallback failed whatHappened");
assert(parsedDelimited.whatWasBetter.includes("Rd1"), "Delimited fallback failed whatWasBetter");
assert(parsedDelimited.keyTakeaway.includes("open files"), "Delimited fallback failed keyTakeaway");
console.log("   ✓ Response parser cleanly extracts JSON, markdown fences, and section headers\n");

// 5. High-Quality Mock Fallback Testing
console.log("5. Testing mock fallback responses across categories and languages...");
const categories = ["Brilliant", "Best", "Excellent", "Good", "Inaccuracy", "Mistake", "Blunder"];

for (const cat of categories) {
  const enRes = getFallbackExplanation({
    moveSan: "Qxf7#",
    bestMoveSan: "Qxf7#",
    category: cat,
    evalDrop: cat === "Blunder" ? 300 : 0,
    userRating: 1400,
    explanationLanguage: "English",
  });

  assert(enRes.mocked === true, `Category ${cat} must set mocked: true`);
  assert(typeof enRes.whatHappened === "string" && enRes.whatHappened.length > 10, `${cat} English whatHappened missing`);
  assert(typeof enRes.whatWasBetter === "string" && enRes.whatWasBetter.length > 10, `${cat} English whatWasBetter missing`);
  assert(typeof enRes.keyTakeaway === "string" && enRes.keyTakeaway.length > 10, `${cat} English keyTakeaway missing`);

  const hiRes = getFallbackExplanation({
    moveSan: "Qxf7#",
    bestMoveSan: "Qxf7#",
    category: cat,
    evalDrop: cat === "Blunder" ? 300 : 0,
    userRating: 1400,
    explanationLanguage: "Hindi",
  });

  assert(hiRes.mocked === true, `Category ${cat} Hindi must set mocked: true`);
  assert(typeof hiRes.whatHappened === "string" && hiRes.whatHappened.length > 10, `${cat} Hindi whatHappened missing`);
  assert(typeof hiRes.whatWasBetter === "string" && hiRes.whatWasBetter.length > 10, `${cat} Hindi whatWasBetter missing`);
  assert(typeof hiRes.keyTakeaway === "string" && hiRes.keyTakeaway.length > 10, `${cat} Hindi keyTakeaway missing`);
}

console.log("   ✓ All 7 move categories verified in both English and Hindi with structured output\n");
console.log("🎉 ALL AI MOVE EXPLANATION TESTS PASSED SUCCESSFULLY!");
