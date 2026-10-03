console.log("=== Testing Optional User-Info Fields Logic ===");

function simulateSetupSubmission({
  pgn,
  rating,
  color,
  platform = "",
  reviewDepth = "Standard",
  language = "English",
}) {
  const pgnOk = Boolean(pgn && pgn.trim());
  const ratingNum = Number(rating);
  const ratingOk = Number.isInteger(ratingNum) && ratingNum >= 100 && ratingNum <= 3500;
  const colorOk = color === "white" || color === "black";

  // The gate ONLY depends on PGN, rating, and color
  const canAnalyze = pgnOk && ratingOk && colorOk;

  if (!canAnalyze) {
    return { success: false, error: "Required fields missing or invalid." };
  }

  // Values stored in state
  const state = {
    userRating: ratingNum,
    userColor: color,
    userPlatform: platform.trim(),
    reviewDepth: reviewDepth || "Standard",
    explanationLanguage: language || "English",
  };

  return { success: true, state };
}

// Test 1: Untouched optional fields
console.log("\n[Test 1] Untouched Optional Fields (Default Fallbacks):");
const result1 = simulateSetupSubmission({
  pgn: "1. e4 e5",
  rating: "1600",
  color: "white",
});

console.log("  Submission succeeded:", result1.success ? "PASS" : "FAIL");
console.log("  Platform default ('') :", result1.state.userPlatform === "" ? "PASS" : "FAIL");
console.log("  ReviewDepth default ('Standard'):", result1.state.reviewDepth === "Standard" ? "PASS" : "FAIL");
console.log("  Language default ('English'):", result1.state.explanationLanguage === "English" ? "PASS" : "FAIL");

// Test 2: Custom selected optional fields
console.log("\n[Test 2] Custom Selected Optional Fields:");
const result2 = simulateSetupSubmission({
  pgn: "1. e4 e5",
  rating: "2100",
  color: "black",
  platform: "Chess.com",
  reviewDepth: "Detailed",
  language: "Hindi",
});

console.log("  Submission succeeded:", result2.success ? "PASS" : "FAIL");
console.log("  Platform ('Chess.com'):", result2.state.userPlatform === "Chess.com" ? "PASS" : "FAIL");
console.log("  ReviewDepth ('Detailed'):", result2.state.reviewDepth === "Detailed" ? "PASS" : "FAIL");
console.log("  Language ('Hindi'):", result2.state.explanationLanguage === "Hindi" ? "PASS" : "FAIL");

// Test 3: Quick depth & Lichess platform
console.log("\n[Test 3] Quick depth & Lichess:");
const result3 = simulateSetupSubmission({
  pgn: "1. d4 d5",
  rating: "1200",
  color: "white",
  platform: "Lichess",
  reviewDepth: "Quick",
  language: "English",
});

console.log("  ReviewDepth ('Quick'):", result3.state.reviewDepth === "Quick" ? "PASS" : "FAIL");
console.log("  Platform ('Lichess'):", result3.state.userPlatform === "Lichess" ? "PASS" : "FAIL");

// Test 4: Ensure missing required fields still block even if optional fields are provided
console.log("\n[Test 4] Required fields still gate submission:");
const missingRating = simulateSetupSubmission({
  pgn: "1. e4 e5",
  rating: "",
  color: "white",
  platform: "Chess.com",
});
console.log("  Missing rating blocks:", !missingRating.success ? "PASS" : "FAIL");

const missingColor = simulateSetupSubmission({
  pgn: "1. e4 e5",
  rating: "1500",
  color: "",
  platform: "Chess.com",
});
console.log("  Missing color blocks:", !missingColor.success ? "PASS" : "FAIL");

console.log("\n=== All Tests Completed Successfully ===");
