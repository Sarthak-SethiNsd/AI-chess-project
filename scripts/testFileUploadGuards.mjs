console.log("=== Testing PGN File Upload Guards ===");

const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1MB

function validateFile(file) {
  if (!file) return { valid: false, error: "No file selected." };

  if (!file.name.toLowerCase().endsWith(".pgn")) {
    return {
      valid: false,
      error: `Invalid file type "${file.name}". Please upload a valid .pgn file.`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds the 1MB limit. Please upload a valid chess PGN file under 1MB.`,
    };
  }

  return { valid: true };
}

// Test 1: Extension Checks
const extensionTestCases = [
  { name: "fischer_spassky.pgn", size: 2048, expectedValid: true },
  { name: "GAME_UPPERCASE.PGN", size: 4096, expectedValid: true },
  { name: "mixedCase.Pgn", size: 1024, expectedValid: true },
  { name: "notes.txt", size: 500, expectedValid: false },
  { name: "moves.json", size: 1200, expectedValid: false },
  { name: "malicious.exe", size: 8000, expectedValid: false },
  { name: "pgn_without_dot", size: 1000, expectedValid: false },
];

console.log("\n[Test 1] File Extension Guard:");
for (const tc of extensionTestCases) {
  const res = validateFile(tc);
  const pass = res.valid === tc.expectedValid;
  console.log(`  File "${tc.name}":`, pass ? "PASS" : "FAIL", res.valid ? "(Accepted)" : `(Rejected: ${res.error})`);
}

// Test 2: Size Limit Checks
console.log("\n[Test 2] File Size Guard (<= 1MB):");
const sizeTestCases = [
  { name: "small.pgn", size: 1024, expectedValid: true },
  { name: "exact_1mb.pgn", size: 1024 * 1024, expectedValid: true },
  { name: "exceeds_1mb.pgn", size: 1024 * 1024 + 1, expectedValid: false },
  { name: "large_5mb.pgn", size: 5 * 1024 * 1024, expectedValid: false },
];

for (const tc of sizeTestCases) {
  const res = validateFile(tc);
  const pass = res.valid === tc.expectedValid;
  console.log(`  Size ${tc.size} bytes:`, pass ? "PASS" : "FAIL", res.valid ? "(Accepted)" : `(Rejected: ${res.error})`);
}

console.log("\n=== File Guard Tests Complete ===");
