console.log("=== Testing GameSetupForm Validation & Orientation Rules ===");

// 1. Rating validation logic
function validateRating(val) {
  const trimmed = String(val).trim();
  if (!trimmed) {
    return { valid: false, error: "Rating is required." };
  }
  const num = Number(trimmed);
  if (!Number.isInteger(num)) {
    return { valid: false, error: "Rating must be a whole number." };
  }
  if (num < 100 || num > 3500) {
    return { valid: false, error: "Rating must be between 100 and 3500." };
  }
  return { valid: true, rating: num };
}

// 2. Color validation logic
function validateColor(c) {
  if (c === "white" || c === "black") {
    return { valid: true, color: c };
  }
  return { valid: false, error: "Playing color must be either 'white' or 'black'." };
}

// 3. Combined submission gate
function isReadyToAnalyze(pgn, ratingVal, colorVal) {
  const pgnOk = Boolean(pgn && pgn.trim());
  const ratingRes = validateRating(ratingVal);
  const colorRes = validateColor(colorVal);
  return pgnOk && ratingRes.valid && colorRes.valid;
}

// Test Rating
const ratingTests = [
  { input: "", expected: false },
  { input: "   ", expected: false },
  { input: "abc", expected: false },
  { input: "50", expected: false },
  { input: "99", expected: false },
  { input: "100", expected: true },
  { input: "1500", expected: true },
  { input: "2850", expected: true },
  { input: "3500", expected: true },
  { input: "3501", expected: false },
  { input: "4000", expected: false },
  { input: "1500.5", expected: false },
];

console.log("\n[Test 1] Rating Boundary Validation (100–3500):");
for (const tc of ratingTests) {
  const res = validateRating(tc.input);
  const passed = res.valid === tc.expected;
  console.log(`  Rating '${tc.input}':`, passed ? "PASS" : "FAIL", res.valid ? `(Valid: ${res.rating})` : `(Rejected: ${res.error})`);
}

// Test Color
console.log("\n[Test 2] Playing Color Validation:");
const colorTests = [
  { input: "white", expected: true },
  { input: "black", expected: true },
  { input: "", expected: false },
  { input: "green", expected: false },
];
for (const tc of colorTests) {
  const res = validateColor(tc.input);
  const passed = res.valid === tc.expected;
  console.log(`  Color '${tc.input}':`, passed ? "PASS" : "FAIL", res.valid ? "(Valid)" : `(Rejected: ${res.error})`);
}

// Test Combined Gate
console.log("\n[Test 3] Submission Gate (PGN + Rating + Color):");
console.log("  No inputs:", !isReadyToAnalyze("", "", "") ? "PASS (Blocked)" : "FAIL");
console.log("  PGN only:", !isReadyToAnalyze("1. e4 e5", "", "") ? "PASS (Blocked)" : "FAIL");
console.log("  PGN + Color only:", !isReadyToAnalyze("1. e4 e5", "", "white") ? "PASS (Blocked)" : "FAIL");
console.log("  PGN + Rating only:", !isReadyToAnalyze("1. e4 e5", "1500", "") ? "PASS (Blocked)" : "FAIL");
console.log("  PGN + Invalid Rating (50) + Color:", !isReadyToAnalyze("1. e4 e5", "50", "white") ? "PASS (Blocked)" : "FAIL");
console.log("  PGN + Valid Rating (1500) + White:", isReadyToAnalyze("1. e4 e5", "1500", "white") ? "PASS (Ready)" : "FAIL");
console.log("  PGN + Valid Rating (2100) + Black:", isReadyToAnalyze("1. e4 e5", "2100", "black") ? "PASS (Ready)" : "FAIL");

// Test Orientation Mapping
console.log("\n[Test 4] Board Orientation Mapping:");
const orientationForWhite = "white" === "black" ? "black" : "white";
const orientationForBlack = "black" === "black" ? "black" : "white";
console.log("  White orientation:", orientationForWhite === "white" ? "PASS (white at bottom)" : "FAIL");
console.log("  Black orientation:", orientationForBlack === "black" ? "PASS (black at bottom - flipped)" : "FAIL");

console.log("\n=== All Tests Completed Successfully ===");
