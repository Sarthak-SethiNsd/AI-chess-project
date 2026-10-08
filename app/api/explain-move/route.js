import { NextResponse } from "next/server";
import {
  GROQ_MODEL,
  GROQ_API_URL,
  buildExplanationPrompt,
  parseExplanationResponse,
  getFallbackExplanation,
} from "@/lib/moveExplanation";

export async function POST(request) {
  try {
    const body = await request.json();
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

    // Validate required fields
    if (!moveSan || !category) {
      return NextResponse.json(
        { error: "Missing required fields: moveSan and category are required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;

    // Detect missing, placeholder or empty API keys
    const isPlaceholderOrMissing =
      !apiKey ||
      apiKey.trim() === "" ||
      apiKey.trim().toLowerCase() === "your_key_here" ||
      apiKey.startsWith("your_");

    if (isPlaceholderOrMissing) {
      // Return high-quality mock response labeled with mocked: true
      const fallback = getFallbackExplanation({
        moveSan,
        bestMoveSan,
        category,
        evalDrop,
        userRating,
        explanationLanguage,
      });

      return NextResponse.json({
        ...fallback,
        category,
        moveSan,
        bestMoveSan: bestMoveSan || moveSan,
        mocked: true,
        model: GROQ_MODEL,
      });
    }

    // Key is present — build rating-calibrated prompt and query Groq API (GPT-OSS 120B)
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
      });

      if (!groqResponse.ok) {
        const errorText = await groqResponse.text();
        console.warn(
          `Groq API returned error status ${groqResponse.status}: ${errorText}. Falling back to smart mock explanation.`
        );

        // Fallback gracefully so user experience doesn't crash on invalid/unfunded dev key
        const fallback = getFallbackExplanation({
          moveSan,
          bestMoveSan,
          category,
          evalDrop,
          userRating,
          explanationLanguage,
        });

        return NextResponse.json({
          ...fallback,
          category,
          moveSan,
          bestMoveSan: bestMoveSan || moveSan,
          mocked: true,
          apiError: `Groq HTTP ${groqResponse.status}`,
          model: GROQ_MODEL,
        });
      }

      const data = await groqResponse.json();
      const rawContent = data.choices?.[0]?.message?.content || "";
      const parsed = parseExplanationResponse(rawContent);

      return NextResponse.json({
        whatHappened: parsed.whatHappened,
        whatWasBetter: parsed.whatWasBetter,
        keyTakeaway: parsed.keyTakeaway,
        category,
        moveSan,
        bestMoveSan: bestMoveSan || moveSan,
        mocked: false,
        model: GROQ_MODEL,
      });
    } catch (fetchError) {
      console.warn("Groq network request failed, falling back to smart mock:", fetchError.message);

      const fallback = getFallbackExplanation({
        moveSan,
        bestMoveSan,
        category,
        evalDrop,
        userRating,
        explanationLanguage,
      });

      return NextResponse.json({
        ...fallback,
        category,
        moveSan,
        bestMoveSan: bestMoveSan || moveSan,
        mocked: true,
        apiError: fetchError.message,
        model: GROQ_MODEL,
      });
    }
  } catch (err) {
    console.error("API /api/explain-move error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to process move explanation request." },
      { status: 500 }
    );
  }
}
