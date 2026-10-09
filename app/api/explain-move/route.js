import {
  GROQ_MODEL,
  GROQ_API_URL,
  buildExplanationPrompt,
  parseExplanationResponse,
  getFallbackExplanation,
} from "../../../lib/moveExplanation.js";

// Allowed move categories
const VALID_CATEGORIES = new Set([
  "Brilliant",
  "Best",
  "Excellent",
  "Good",
  "Inaccuracy",
  "Mistake",
  "Blunder",
]);

// Allowed languages
const VALID_LANGUAGES = new Set(["English", "Hindi"]);

// Maximum payload size (8 KB)
const MAX_PAYLOAD_BYTES = 8192;

// In-memory per-IP rate limiting: 20 requests per minute
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;
const ipRateLimitMap = new Map();

/**
 * Checks in-memory sliding rate limit per IP.
 * @param {string} ip
 * @returns {{ allowed: boolean, retryAfter?: number }}
 */
function checkRateLimit(ip) {
  const now = Date.now();
  const record = ipRateLimitMap.get(ip);

  if (!record || now - record.startTime > RATE_LIMIT_WINDOW_MS) {
    ipRateLimitMap.set(ip, { count: 1, startTime: now });
    return { allowed: true };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfterSeconds = Math.ceil((record.startTime + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfter: Math.max(1, retryAfterSeconds) };
  }

  record.count += 1;
  return { allowed: true };
}

// Clean up stale IP records every 2 minutes without blocking process exit
if (typeof setInterval !== "undefined") {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipRateLimitMap.entries()) {
      if (now - record.startTime > RATE_LIMIT_WINDOW_MS * 2) {
        ipRateLimitMap.delete(ip);
      }
    }
  }, 120 * 1000);
  if (cleanupTimer.unref) cleanupTimer.unref();
}

/**
 * Extracts client IP from request headers.
 * @param {Request} request
 * @returns {string}
 */
function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "127.0.0.1";
}

export async function POST(request) {
  const isProd = process.env.NODE_ENV === "production";

  try {
    // 1. Per-IP Rate Limiting
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return Response.json(
        {
          error: "Too many explanation requests. Please wait a moment before trying again.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfter || 60),
          },
        }
      );
    }

    // 2. Reject oversized payloads via Content-Length header if present
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
      return Response.json(
        { error: "Payload too large. Request body must be under 8KB." },
        { status: 413 }
      );
    }

    // 3. Read and parse body safely
    let body;
    try {
      const rawText = await request.text();
      if (rawText.length > MAX_PAYLOAD_BYTES) {
        return Response.json(
          { error: "Payload too large. Request body must be under 8KB." },
          { status: 413 }
        );
      }
      body = JSON.parse(rawText);
    } catch {
      return Response.json(
        { error: "Invalid JSON in request body." },
        { status: 400 }
      );
    }

    const {
      fenBefore,
      fenAfter,
      moveSan,
      bestMoveSan,
      category,
      evalDrop = 0,
      userRating = null,
      explanationLanguage = "English",
    } = body;

    // 4. Input Hardening & Type Validation
    // moveSan (required, 1-10 chars string)
    if (typeof moveSan !== "string" || moveSan.trim().length === 0 || moveSan.length > 10) {
      return Response.json(
        { error: "Invalid moveSan: must be a non-empty string under 10 characters." },
        { status: 400 }
      );
    }

    // category (required, must be one of standard categories)
    if (typeof category !== "string" || !VALID_CATEGORIES.has(category)) {
      return Response.json(
        {
          error: `Invalid category: must be one of ${Array.from(VALID_CATEGORIES).join(", ")}.`,
        },
        { status: 400 }
      );
    }

    // bestMoveSan (optional, string under 10 chars)
    if (bestMoveSan !== undefined && bestMoveSan !== null) {
      if (typeof bestMoveSan !== "string" || bestMoveSan.length > 10) {
        return Response.json(
          { error: "Invalid bestMoveSan: must be a string under 10 characters." },
          { status: 400 }
        );
      }
    }

    // fenBefore / fenAfter (optional, string under 128 chars)
    if (fenBefore !== undefined && fenBefore !== null) {
      if (typeof fenBefore !== "string" || fenBefore.length > 128) {
        return Response.json(
          { error: "Invalid fenBefore: must be a string under 128 characters." },
          { status: 400 }
        );
      }
    }
    if (fenAfter !== undefined && fenAfter !== null) {
      if (typeof fenAfter !== "string" || fenAfter.length > 128) {
        return Response.json(
          { error: "Invalid fenAfter: must be a string under 128 characters." },
          { status: 400 }
        );
      }
    }

    // evalDrop (optional, number between 0 and 50000)
    if (evalDrop !== undefined && evalDrop !== null) {
      if (typeof evalDrop !== "number" || isNaN(evalDrop) || evalDrop < 0 || evalDrop > 50000) {
        return Response.json(
          { error: "Invalid evalDrop: must be a non-negative number under 50000." },
          { status: 400 }
        );
      }
    }

    // userRating (optional, integer between 100 and 4000)
    if (userRating !== undefined && userRating !== null) {
      const numRating = Number(userRating);
      if (isNaN(numRating) || !Number.isInteger(numRating) || numRating < 100 || numRating > 4000) {
        return Response.json(
          { error: "Invalid userRating: must be an integer between 100 and 4000." },
          { status: 400 }
        );
      }
    }

    // explanationLanguage (optional, English or Hindi)
    if (explanationLanguage !== undefined && explanationLanguage !== null) {
      if (typeof explanationLanguage !== "string" || !VALID_LANGUAGES.has(explanationLanguage)) {
        return Response.json(
          { error: "Invalid explanationLanguage: must be 'English' or 'Hindi'." },
          { status: 400 }
        );
      }
    }

    // 5. Environment & API Key Check (Server-Side Only, Never Logged)
    const apiKey = process.env.GROQ_API_KEY;
    const isPlaceholderOrMissing =
      !apiKey ||
      apiKey.trim() === "" ||
      apiKey.trim().toLowerCase() === "your_key_here" ||
      apiKey.startsWith("your_");

    if (isPlaceholderOrMissing) {
      if (isProd) {
        return Response.json(
          { error: "AI explanation service is currently unavailable. Please try again later." },
          { status: 503 }
        );
      }

      // Development fallback mode: return mock explanation
      const fallback = getFallbackExplanation({
        moveSan,
        bestMoveSan,
        category,
        evalDrop,
        userRating,
        explanationLanguage,
      });

      return Response.json({
        ...fallback,
        category,
        moveSan,
        bestMoveSan: bestMoveSan || moveSan,
        mocked: true,
        model: GROQ_MODEL,
      });
    }

    // 6. Production/Live Key Present: Build prompt & call Groq API with timeout
    const { systemPrompt, userPrompt } = buildExplanationPrompt({
      fenBefore,
      fenAfter,
      moveSan,
      bestMoveSan,
      category,
      evalDrop,
      userRating,
      explanationLanguage,
    });

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 12000); // 12-second timeout

    try {
      const groqResponse = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.4,
          response_format: { type: "json_object" },
        }),
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (!groqResponse.ok) {
        const status = groqResponse.status;

        // Handle Auth error (401 / 403)
        if (status === 401 || status === 403) {
          if (isProd) {
            return Response.json(
              { error: "AI explanation service is currently unavailable. Please try again later." },
              { status: 503 }
            );
          }
          // In development, fall back to smart mock
          const fallback = getFallbackExplanation({
            moveSan,
            bestMoveSan,
            category,
            evalDrop,
            userRating,
            explanationLanguage,
          });
          return Response.json({
            ...fallback,
            category,
            moveSan,
            bestMoveSan: bestMoveSan || moveSan,
            mocked: true,
            apiError: "Groq authentication error (401/403)",
            model: GROQ_MODEL,
          });
        }

        // Handle Groq rate limit (429)
        if (status === 429) {
          return Response.json(
            {
              error:
                "The AI explanation service is currently experiencing high demand. Please try again shortly.",
            },
            { status: 429 }
          );
        }

        // Handle upstream server errors (5xx) or other client errors
        if (isProd) {
          return Response.json(
            { error: "AI service encountered an upstream error. Please try again later." },
            { status: 502 }
          );
        }

        // In dev, gracefully fall back to mock
        const fallback = getFallbackExplanation({
          moveSan,
          bestMoveSan,
          category,
          evalDrop,
          userRating,
          explanationLanguage,
        });
        return Response.json({
          ...fallback,
          category,
          moveSan,
          bestMoveSan: bestMoveSan || moveSan,
          mocked: true,
          apiError: `Groq HTTP ${status}`,
          model: GROQ_MODEL,
        });
      }

      const data = await groqResponse.json();
      const rawContent = data.choices?.[0]?.message?.content || "";
      const parsed = parseExplanationResponse(rawContent);

      return Response.json({
        whatHappened: parsed.whatHappened,
        whatWasBetter: parsed.whatWasBetter,
        keyTakeaway: parsed.keyTakeaway,
        category,
        moveSan,
        bestMoveSan: bestMoveSan || moveSan,
        mocked: false,
        model: GROQ_MODEL,
      });
    } catch (networkOrTimeoutError) {
      clearTimeout(timeoutId);

      if (
        networkOrTimeoutError.name === "AbortError" ||
        networkOrTimeoutError.name === "TimeoutError"
      ) {
        return Response.json(
          { error: "AI explanation request timed out. Please try again." },
          { status: 504 }
        );
      }

      if (isProd) {
        return Response.json(
          {
            error:
              "Unable to connect to the AI explanation service. Please check your network and try again.",
          },
          { status: 503 }
        );
      }

      // Development fallback
      const fallback = getFallbackExplanation({
        moveSan,
        bestMoveSan,
        category,
        evalDrop,
        userRating,
        explanationLanguage,
      });
      return Response.json({
        ...fallback,
        category,
        moveSan,
        bestMoveSan: bestMoveSan || moveSan,
        mocked: true,
        apiError: networkOrTimeoutError.message,
        model: GROQ_MODEL,
      });
    }
  } catch (err) {
    return Response.json(
      { error: err?.message || "Failed to process move explanation request." },
      { status: 500 }
    );
  }
}
