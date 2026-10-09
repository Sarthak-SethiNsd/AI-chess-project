/**
 * Standalone test for app/api/explain-move/route.js:
 * 1. Input validation rejects (HTTP 400, HTTP 413)
 * 2. Production mode without key behavior (HTTP 503, no mock content)
 * 3. Development mode without key behavior (HTTP 200, mocked: true)
 * 4. In-memory per-IP rate limiting (HTTP 429)
 */

import { POST } from "../app/api/explain-move/route.js";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ TEST FAILED: ${message}`);
    process.exit(1);
  }
}

async function runTests() {
  console.log("=== Testing explain-move API Route & Hardening ===\n");

  const validPayload = {
    fenBefore: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 3 3",
    fenAfter: "r1bqkb1r/pppp1ppp/2n4n/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
    moveSan: "Nh6",
    bestMoveSan: "Nf6",
    category: "Blunder",
    evalDrop: 350,
    userRating: 1200,
    explanationLanguage: "English",
  };

  // ---------------------------------------------------------
  // 1. Validation Rejections (HTTP 400 / 413)
  // ---------------------------------------------------------
  console.log("1. Testing input validation rejections...");

  // Missing moveSan
  {
    const req = new Request("http://localhost:3000/api/explain-move", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.1" },
      body: JSON.stringify({ ...validPayload, moveSan: "" }),
    });
    const res = await POST(req);
    const data = await res.json();
    assert(res.status === 400, `Expected 400 for empty moveSan, got ${res.status}`);
    assert(data.error.includes("moveSan"), "Error should mention moveSan");
    console.log("   ✓ Empty moveSan rejected (400)");
  }

  // Oversized moveSan (> 10 chars)
  {
    const req = new Request("http://localhost:3000/api/explain-move", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.2" },
      body: JSON.stringify({ ...validPayload, moveSan: "superlongmovesan" }),
    });
    const res = await POST(req);
    assert(res.status === 400, `Expected 400 for oversized moveSan, got ${res.status}`);
    console.log("   ✓ Oversized moveSan rejected (400)");
  }

  // Invalid category
  {
    const req = new Request("http://localhost:3000/api/explain-move", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.3" },
      body: JSON.stringify({ ...validPayload, category: "AwesomeMove" }),
    });
    const res = await POST(req);
    const data = await res.json();
    assert(res.status === 400, `Expected 400 for invalid category, got ${res.status}`);
    assert(data.error.includes("category"), "Error should mention category");
    console.log("   ✓ Invalid category rejected (400)");
  }

  // Negative evalDrop
  {
    const req = new Request("http://localhost:3000/api/explain-move", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.4" },
      body: JSON.stringify({ ...validPayload, evalDrop: -100 }),
    });
    const res = await POST(req);
    assert(res.status === 400, `Expected 400 for negative evalDrop, got ${res.status}`);
    console.log("   ✓ Negative evalDrop rejected (400)");
  }

  // Out of range userRating
  {
    const req = new Request("http://localhost:3000/api/explain-move", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.5" },
      body: JSON.stringify({ ...validPayload, userRating: 9999 }),
    });
    const res = await POST(req);
    assert(res.status === 400, `Expected 400 for invalid userRating, got ${res.status}`);
    console.log("   ✓ Out of range userRating rejected (400)");
  }

  // Invalid language
  {
    const req = new Request("http://localhost:3000/api/explain-move", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.6" },
      body: JSON.stringify({ ...validPayload, explanationLanguage: "French" }),
    });
    const res = await POST(req);
    assert(res.status === 400, `Expected 400 for invalid language, got ${res.status}`);
    console.log("   ✓ Invalid language rejected (400)");
  }

  // Oversized payload (> 8KB)
  {
    const hugeFen = "x".repeat(9000);
    const req = new Request("http://localhost:3000/api/explain-move", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": "9500",
        "x-forwarded-for": "10.0.0.7",
      },
      body: JSON.stringify({ ...validPayload, fenBefore: hugeFen }),
    });
    const res = await POST(req);
    assert(res.status === 413, `Expected 413 for oversized payload, got ${res.status}`);
    console.log("   ✓ Oversized payload rejected (413)\n");
  }

  // ---------------------------------------------------------
  // 2. Production Mode Without Key (HTTP 503)
  // ---------------------------------------------------------
  console.log("2. Testing production mode without key (must return 503, never mock)...");
  {
    const prevEnv = process.env.NODE_ENV;
    const prevKey = process.env.GROQ_API_KEY;

    process.env.NODE_ENV = "production";
    delete process.env.GROQ_API_KEY;

    const req = new Request("http://localhost:3000/api/explain-move", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.1.1" },
      body: JSON.stringify(validPayload),
    });

    const res = await POST(req);
    const data = await res.json();

    assert(
      res.status === 503,
      `Expected HTTP 503 in production without key, got ${res.status}`
    );
    assert(
      !data.mocked && !data.whatHappened,
      "Production without key MUST NOT return mock explanation content"
    );
    assert(
      typeof data.error === "string" && data.error.length > 0,
      "Expected friendly error message"
    );

    // Restore env
    process.env.NODE_ENV = prevEnv;
    process.env.GROQ_API_KEY = prevKey;

    console.log("   ✓ Production mode without key correctly returned HTTP 503 with friendly message\n");
  }

  // ---------------------------------------------------------
  // 3. Development Mode Without Key (HTTP 200 with mocked: true)
  // ---------------------------------------------------------
  console.log("3. Testing development mode without key (must return mock with mocked: true)...");
  {
    const prevEnv = process.env.NODE_ENV;
    const prevKey = process.env.GROQ_API_KEY;

    process.env.NODE_ENV = "development";
    delete process.env.GROQ_API_KEY;

    const req = new Request("http://localhost:3000/api/explain-move", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.2.1" },
      body: JSON.stringify(validPayload),
    });

    const res = await POST(req);
    const data = await res.json();

    assert(res.status === 200, `Expected HTTP 200 in development, got ${res.status}`);
    assert(data.mocked === true, "Development response must have mocked: true");
    assert(typeof data.whatHappened === "string", "Missing whatHappened in dev response");
    assert(typeof data.whatWasBetter === "string", "Missing whatWasBetter in dev response");
    assert(typeof data.keyTakeaway === "string", "Missing keyTakeaway in dev response");

    // Restore env
    process.env.NODE_ENV = prevEnv;
    process.env.GROQ_API_KEY = prevKey;

    console.log("   ✓ Development mode without key returned mock content with mocked: true\n");
  }

  // ---------------------------------------------------------
  // 4. Per-IP Rate Limiting (HTTP 429)
  // ---------------------------------------------------------
  console.log("4. Testing per-IP rate limiting (limit = 20 req/min)...");
  {
    const testIp = "192.0.2.42";
    let hitRateLimit = false;

    for (let i = 1; i <= 22; i++) {
      const req = new Request("http://localhost:3000/api/explain-move", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": testIp },
        body: JSON.stringify(validPayload),
      });

      const res = await POST(req);
      if (res.status === 429) {
        hitRateLimit = true;
        const retryAfter = res.headers.get("Retry-After");
        assert(retryAfter !== null, "Rate limit response must include Retry-After header");
        const data = await res.json();
        assert(data.error.includes("Too many"), "Rate limit response must have descriptive error");
        console.log(`   ✓ Request #${i} triggered HTTP 429 rate limit as expected (Retry-After: ${retryAfter}s)`);
        break;
      }
    }

    assert(hitRateLimit, "Expected to hit rate limit after 20 requests from same IP");
    console.log("   ✓ Rate limiting verified\n");
  }

  console.log("🎉 ALL ROUTE TESTS PASSED SUCCESSFULLY!");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
