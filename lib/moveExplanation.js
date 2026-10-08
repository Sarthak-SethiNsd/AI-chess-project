/**
 * AI Move Explanation logic for "AI Chess Review".
 * Supports rating-calibrated prompt generation, Groq API (GPT-OSS 120B) integration,
 * multi-language support (English/Hindi), response parsing, and high-quality mock fallbacks.
 */

export const GROQ_MODEL = "openai/gpt-oss-120b";
export const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Categorizes a numerical or string user rating into one of three coach tiers:
 * - beginner (<1200): immediate piece safety, undefended pieces, captures, checks.
 * - intermediate (1200-1800): tactical motifs, piece coordination, king safety, open files.
 * - advanced (1800+): positional trade-offs, dynamic compensation, subtle nuances.
 *
 * @param {number|string|null} rating
 * @returns {'beginner'|'intermediate'|'advanced'}
 */
export function getRatingTier(rating) {
  const numeric = typeof rating === "number" ? rating : parseInt(rating, 10);
  if (isNaN(numeric) || numeric < 1200) {
    return "beginner";
  }
  if (numeric < 1800) {
    return "intermediate";
  }
  return "advanced";
}

/**
 * Builds rating-calibrated system & user prompts for the Groq GPT-OSS 120B model.
 *
 * @param {Object} params
 * @param {string} params.fenBefore - FEN before the move
 * @param {string} params.fenAfter - FEN after the move
 * @param {string} params.moveSan - SAN of move played (e.g. "Nf3")
 * @param {string} [params.bestMoveSan] - Engine's recommended move (e.g. "d4")
 * @param {string} params.category - Move category (Brilliant, Best, Excellent, Good, Inaccuracy, Mistake, Blunder)
 * @param {number} [params.evalDrop=0] - Centipawns lost
 * @param {number|string|null} [params.userRating] - Rating of player
 * @param {'English'|'Hindi'} [params.explanationLanguage='English'] - Target language
 * @returns {{ systemPrompt: string, userPrompt: string }}
 */
export function buildExplanationPrompt({
  fenBefore,
  fenAfter,
  moveSan,
  bestMoveSan,
  category,
  evalDrop = 0,
  userRating = null,
  explanationLanguage = "English",
}) {
  const tier = getRatingTier(userRating);
  const isHindi = (explanationLanguage || "").toLowerCase().includes("hindi");

  let pedagogicalGuidance = "";
  if (tier === "beginner") {
    pedagogicalGuidance = `
- The player is a beginner (rating under 1200).
- Keep explanations simple, encouraging, and concrete.
- Focus strictly on undefended (hanging) pieces, immediate captures, giving/escaping checks, and basic principles (controlling the center, developing pieces).
- Avoid long variation trees, obscure notation, or abstract positional jargon.
`;
  } else if (tier === "intermediate") {
    pedagogicalGuidance = `
- The player is intermediate (rating 1200–1800).
- Focus on tactical motifs (pins, forks, skewers, discovered attacks, deflection), piece coordination, outposts, and king safety.
- Highlight why the engine's move is tactically superior or how the played move compromises piece harmony.
`;
  } else {
    pedagogicalGuidance = `
- The player is advanced (rating 1800+).
- Focus on positional trade-offs, dynamic compensation, pawn structure weaknesses, prophylactic ideas, tempo dynamics, and subtle imbalances.
- Provide deep, concise, and nuanced strategic insight.
`;
  }

  const languageGuidance = isHindi
    ? `
- LANGUAGE: Hindi (हिन्दी).
- Write all three sections in natural, conversational, grammatically sound Hindi.
- Standard chess terms can be used in Hindi or common transliteration (e.g., चाल, प्यादा/पॉन, वज़ीर/क्वीन, घोड़ा/नाइट, ऊँट/बिशप, हाथी/रूख, राजा/किंग, चेक, चेकमेट, रणनीति, टैक्टिक्स).
`
    : `
- LANGUAGE: English.
- Clear, punchy, conversational, and direct coaching tone.
`;

  const systemPrompt = `You are a world-class grandmaster chess coach providing post-game move analysis to a student.
Your goal is to explain why a specific move was played, how it compares to the engine's best move, and what lesson the student should take away.

Pedagogical instructions for this student:
${pedagogicalGuidance}
${languageGuidance}

OUTPUT FORMAT REQUIREMENTS:
You MUST respond with a valid JSON object only, with exactly these three keys:
{
  "whatHappened": "Clear explanation of what the played move accomplished or where it went wrong.",
  "whatWasBetter": "Clear explanation of what the engine's recommended move was and why it is better (or if the played move was the best move, why it was the top choice).",
  "keyTakeaway": "One concise, memorable lesson or rule of thumb tailored to the student's rating."
}
Do not include any introductory markdown or commentary outside the JSON object. Return valid JSON.`;

  const userPrompt = `Student Rating: ${userRating ? userRating : "Casual / Unrated"} (Tier: ${tier})
Language: ${isHindi ? "Hindi" : "English"}
Position FEN before move: ${fenBefore || "N/A"}
Position FEN after move: ${fenAfter || "N/A"}
Played Move: ${moveSan}
Quality Category: ${category}
Evaluation Drop: ${Math.round(evalDrop)} centipawns
Engine Recommended Move: ${bestMoveSan || moveSan}

Explain this move now following the required JSON format.`;

  return { systemPrompt, userPrompt };
}

/**
 * Safely parses LLM response text into structured explanation object.
 *
 * @param {string} text - Raw text from Groq completion
 * @param {Object} fallback - Fallback object if parsing fails
 * @returns {{ whatHappened: string, whatWasBetter: string, keyTakeaway: string }}
 */
export function parseExplanationResponse(text, fallback = null) {
  if (!text || typeof text !== "string") {
    return fallback || {
      whatHappened: "No explanation details provided.",
      whatWasBetter: "Refer to the top engine move.",
      keyTakeaway: "Review piece activity and threats before moving.",
    };
  }

  // Strip possible markdown code blocks ```json ... ```
  let cleanText = text.trim();
  if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }

  try {
    const parsed = JSON.parse(cleanText);
    if (parsed.whatHappened && parsed.whatWasBetter && parsed.keyTakeaway) {
      return {
        whatHappened: String(parsed.whatHappened).trim(),
        whatWasBetter: String(parsed.whatWasBetter).trim(),
        keyTakeaway: String(parsed.keyTakeaway).trim(),
      };
    }
  } catch {
    // Continue to heuristic section extraction
  }

  // Fallback heuristic: Try to match section titles if model outputted markdown sections
  const whatHappenedMatch = cleanText.match(/(?:what\s*happened|क्या हुआ)[^\n:]*[:\n]+([\s\S]*?)(?=(?:what\s*was\s*better|क्या बेहतर था|key\s*takeaway|मुख्य सीख)|$)/i);
  const whatWasBetterMatch = cleanText.match(/(?:what\s*was\s*better|क्या बेहतर था)[^\n:]*[:\n]+([\s\S]*?)(?=(?:key\s*takeaway|मुख्य सीख)|$)/i);
  const keyTakeawayMatch = cleanText.match(/(?:key\s*takeaway|मुख्य सीख)[^\n:]*[:\n]+([\s\S]*?)$/i);

  if (whatHappenedMatch || whatWasBetterMatch || keyTakeawayMatch) {
    return {
      whatHappened: whatHappenedMatch?.[1]?.trim() || cleanText.slice(0, 200),
      whatWasBetter: whatWasBetterMatch?.[1]?.trim() || (fallback?.whatWasBetter || "Check alternative lines."),
      keyTakeaway: keyTakeawayMatch?.[1]?.trim() || (fallback?.keyTakeaway || "Calculate forcing moves."),
    };
  }

  // Graceful degradation: return raw text split or in whatHappened
  return {
    whatHappened: cleanText,
    whatWasBetter: fallback?.whatWasBetter || "Compare this move with the engine's suggested line.",
    keyTakeaway: fallback?.keyTakeaway || "Always check opponent threats and your piece safety before moving.",
  };
}

/**
 * High-quality fallback/mock explanation generator used when GROQ_API_KEY is not configured
 * or during offline/mock development and testing.
 *
 * @param {Object} params
 * @returns {{ whatHappened: string, whatWasBetter: string, keyTakeaway: string, mocked: boolean }}
 */
export function getFallbackExplanation({
  moveSan,
  bestMoveSan,
  category = "Good",
  evalDrop = 0,
  userRating = null,
  explanationLanguage = "English",
}) {
  const isHindi = (explanationLanguage || "").toLowerCase().includes("hindi");
  const tier = getRatingTier(userRating);
  const best = bestMoveSan && bestMoveSan !== moveSan ? bestMoveSan : moveSan;
  const isTopMove = category === "Brilliant" || category === "Best";

  if (isHindi) {
    switch (category) {
      case "Brilliant":
        return {
          whatHappened: `शानदार चाल! आपने ${moveSan} खेलकर स्थिति में गहरा सामरिक फायदा उठाया और विरोधी पर ज़बरदस्त दबाव बनाया।`,
          whatWasBetter: `${moveSan} ही इंजन की सबसे बेहतरीन चाल है। किसी भी अन्य चाल से यह अवसर हाथ से निकल जाता।`,
          keyTakeaway: tier === "beginner"
            ? "जब आपके मोहरे सक्रिय हों, तो साहसिक आक्रमण करने से न डरें।"
            : "गतिशील सामंजस्य और दबाव से रक्षात्मक कमजोरियों को तोड़ा जा सकता है।",
          mocked: true,
        };

      case "Best":
        return {
          whatHappened: `सटीक चाल! ${moveSan} बोर्ड पर सबसे मजबूत विकल्प था, जिसने आपकी स्थिति को और मजबूत किया।`,
          whatWasBetter: `${moveSan} इंजन की शीर्ष पसंद है। यह चाल स्थिति के बुनियादी नियमों और सामंजस्य के बिल्कुल अनुकूल है।`,
          keyTakeaway: tier === "beginner"
            ? "केंद्र पर नियंत्रण और मोहरों का सही विकास सबसे सुरक्षित रणनीति है।"
            : "लगातार सटीक चालें चलने से विरोधी पर दबाव स्वतः बढ़ जाता है।",
          mocked: true,
        };

      case "Excellent":
      case "Good":
        return {
          whatHappened: `${moveSan} एक मजबूत और व्यावहारिक चाल थी, जिससे खेल में संतुलन और योजना बनी रही।`,
          whatWasBetter: best !== moveSan
            ? `इंजन के अनुसार ${best} थोड़ा अधिक सक्रिय था, जिससे स्थिति पर अधिक सीधा नियंत्रण मिलता।`
            : `${moveSan} स्थिति के अनुसार बहुत अच्छी और प्रभावी चाल थी।`,
          keyTakeaway: tier === "beginner"
            ? "हर चाल के साथ अपने मोहरों को और अधिक सक्रिय खानों पर पहुँचाने का प्रयास करें।"
            : "छोटे-छोटे स्थितिजन्य सुधार आगे चलकर बड़ा फायदा देते हैं।",
          mocked: true,
        };

      case "Inaccuracy":
        return {
          whatHappened: `${moveSan} थोड़ी ढीली चाल साबित हुई, जिससे आपकी स्थिति का फायदा थोड़ा कम हो गया (लगभग ${(evalDrop / 100).toFixed(1)} पॉन)।`,
          whatWasBetter: `${best} खेलना अधिक सटीक रहता, जिससे बोर्ड पर आपकी पकड़ और मोहरों का प्रभाव मजबूत बना रहता।`,
          keyTakeaway: tier === "beginner"
            ? "बिना स्पष्ट उद्देश्य के मोहरों को पीछे या निष्क्रिय खानों पर न ले जाएँ।"
            : "सक्रिय खेल और विरोधी के पलटवार को रोकने वाली चालों को प्राथमिकता दें।",
          mocked: true,
        };

      case "Mistake":
        return {
          whatHappened: `${moveSan} एक स्थितिजन्य या सामरिक चूक (Mistake) थी, जिससे विरोधी को खेल में बढ़त बनाने का मौका मिल गया।`,
          whatWasBetter: `यहाँ ${best} खेलना आवश्यक था, ताकि रक्षा मजबूत रहती और विरोधी की योजना निष्फल हो जाती।`,
          keyTakeaway: tier === "beginner"
            ? "चाल चलने से पहले हमेशा देखें कि विरोधी की अगली सबसे खतरनाक चाल क्या हो सकती है।"
            : "सामरिक रक्षा और राजा की सुरक्षा को नज़रअंदाज़ न करें।",
          mocked: true,
        };

      case "Blunder":
      default:
        return {
          whatHappened: `${moveSan} एक गंभीर भूल (Blunder) साबित हुई। इस चाल से मूल्यांकन में लगभग ${(evalDrop / 100).toFixed(1)} पॉन का नुकसान हुआ।`,
          whatWasBetter: `यहाँ ${best} खेलना बहुत जरूरी था, जिससे महत्वपूर्ण मोहरा सुरक्षित रहता और विरोधी का हमला रुकता।`,
          keyTakeaway: tier === "beginner"
            ? "हमेशा चाल चलने से पहले चेक करें: क्या कोई मोहरा असुरक्षित तो नहीं छूट रहा?"
            : "हर चाल से पहले सभी चेक्स (Checks), कैप्चर्स (Captures) और थ्रेट्स (Threats) की जांच करें।",
          mocked: true,
        };
    }
  }

  // English explanations
  switch (category) {
    case "Brilliant":
      return {
        whatHappened: `A brilliant move! ${moveSan} sacrifices or dynamically redistributes material to seize decisive board control.`,
        whatWasBetter: `${moveSan} is the engine's absolute top choice. It calculated through the complications and found the sharpest continuation.`,
        keyTakeaway: tier === "beginner"
          ? "When your pieces are active and coordinated, decisive tactics become possible."
          : "Dynamic piece activity often trumps static material balance.",
        mocked: true,
      };

    case "Best":
      return {
        whatHappened: `Spot-on play! ${moveSan} is the strongest move on the board, maintaining optimal harmony and pressure.`,
        whatWasBetter: `${moveSan} matched the top engine choice, optimizing square control and king safety.`,
        keyTakeaway: tier === "beginner"
          ? "Consistently developing pieces and controlling central squares wins games."
          : "Playing the most active, principled move keeps your opponent in a reactive posture.",
        mocked: true,
      };

    case "Excellent":
    case "Good":
      return {
        whatHappened: `${moveSan} is a solid and reasonable move that keeps the position comfortable.`,
        whatWasBetter: best !== moveSan
          ? `${best} was slightly crisper according to the engine, exerting direct pressure on key squares.`
          : `${moveSan} maintains a solid position with clear plans.`,
        keyTakeaway: tier === "beginner"
          ? "Always ask: does my move improve my worst-placed piece?"
          : "Look for moves that solve immediate challenges while creating forward threats.",
        mocked: true,
      };

    case "Inaccuracy":
      return {
        whatHappened: `${moveSan} is slightly inaccurate, conceding a modest evaluation drop (-${(evalDrop / 100).toFixed(1)} pawns) and relaxing pressure.`,
        whatWasBetter: `${best} was more precise, locking down critical squares and limiting the opponent's counterplay.`,
        keyTakeaway: tier === "beginner"
          ? "Avoid passive defensive moves when active piece placement is available."
          : "Pay attention to opponent pawn breaks before initiating piece maneuvers.",
        mocked: true,
      };

    case "Mistake":
      return {
        whatHappened: `${moveSan} is a noticeable mistake that shifts the momentum towards your opponent.`,
        whatWasBetter: `${best} was required here to preserve piece coordination and neutralize incoming threats.`,
        keyTakeaway: tier === "beginner"
          ? "Before moving, always ask: what is my opponent threatening to do next?"
          : "Tactical defense must be calculated accurately; never leave vulnerable targets undefended.",
        mocked: true,
      };

    case "Blunder":
    default:
      return {
        whatHappened: `${moveSan} is a critical blunder, resulting in a steep evaluation drop (-${(evalDrop / 100).toFixed(1)} pawns) that hands a major advantage to the opponent.`,
        whatWasBetter: `${best} was essential here to protect against the opponent's tactical strike or keep your king safe.`,
        keyTakeaway: tier === "beginner"
          ? "Always check for undefended pieces before letting go of your piece."
          : "Run a mental blunder check: examine all checks, captures, and threats before finalizing your move.",
        mocked: true,
      };
  }
}
