# AI Chess Review

AI Chess Review is a full-featured web application that provides automated chess game review. It combines client-side Stockfish engine evaluation, centipawn-drop move categorization, game accuracy metrics, an interactive replay board, and on-demand AI move explanations powered by Groq's GPT-OSS 120B model.

---

## Features

- **PGN Parsing & Validation**: Supports standard and custom PGNs with header extraction (players, event, date, result), move sanitization, and handling of draws, checkmates, and edge cases.
- **Player Setup & Preferences**: Configurable player rating, perspective color (White or Black), playing platform, analysis depth (Quick, Standard, Detailed), and coaching explanation language (English or Hindi).
- **Client-Side Stockfish Analysis**: Evaluates every position sequentially in an off-thread Web Worker with real-time percentage progress indicators.
- **Move Quality Categorization**: Classifies every move into standard quality tiers:
  - **Brilliant**: Engine top choice involving a sound piece sacrifice or tactical breakthrough.
  - **Best**: Engine top choice preserving maximum advantage.
  - **Excellent**: Minimal evaluation loss (within 20 centipawns).
  - **Good**: Sound move with minor loss (within 50 centipawns).
  - **Inaccuracy**: Noticeable eval drop (50–120 centipawns).
  - **Mistake**: Significant eval drop (120–250 centipawns).
  - **Blunder**: Critical error (250+ centipawns or throwing away forced checkmate).
- **Game Accuracy & Summary**: Displays overall and color-specific move accuracy percentages, average centipawn loss, and category distribution counts.
- **Interactive Board Replay**:
  - Replay board with White or Black orientation.
  - Step through moves with toolbar buttons or keyboard shortcuts (Left/Right arrows, Home, End).
  - Synchronized move list with color-coded quality badges.
  - Board annotation bar showing played move, category badge, and evaluation loss.
- **On-Demand AI Coaching Explanations**:
  - Powered by Groq's API using the `openai/gpt-oss-120b` model.
  - Rating-calibrated pedagogical depth:
    - **< 1200**: Focuses on undefended pieces, immediate captures, escaping checks, and core opening principles.
    - **1200–1800**: Focuses on tactical motifs (forks, pins, skewers, deflection), piece coordination, and king safety.
    - **1800+**: Focuses on positional trade-offs, dynamic compensation, pawn structure weaknesses, and subtle imbalances.
  - Bilingual support in **English** and **Hindi**.
  - Structured coaching card with three distinct sections: **What Happened**, **What Was Better**, and **Key Takeaway**.
  - In-component caching so revisited moves load instantly without redundant API calls.
- **Production-Hardened API Route (`/api/explain-move`)**:
  - In-memory per-IP rate limiting (20 requests/minute).
  - Strict input validation on FEN strings, SAN format, categories, ratings, and language choices.
  - Request body size limit (8 KB maximum).
  - Request timeout handling (12 seconds) with dedicated error states (429, 502, 503, 504).
  - Development vs. production isolation: missing keys trigger mock fallbacks in development, while returning HTTP 503 in production.
  - Server-side only key access: secret keys are never exposed to the client bundle or logs.

---

## Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Configure your Groq API key in `.env.local`:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```

> **Note on Development vs. Production Behavior:**
> - In **development** (`NODE_ENV !== "production"`), if `GROQ_API_KEY` is not provided or set to a placeholder, the app uses built-in smart mock coaching responses labeled with a `Preview` badge so all features can be tested offline.
> - In **production** (`NODE_ENV === "production"`), `GROQ_API_KEY` is strictly required. If the key is missing or invalid, the API returns HTTP 503 with a user-friendly message and the UI displays an error banner with a retry button.

---

## Running Locally

### Development Server
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build & Run
```bash
npm run build
npm run start
```
The application will be served in optimized production mode on [http://localhost:3000](http://localhost:3000).

---

## Testing

Run standalone automated test suites:

- **API Route Hardening & Validation Test**:
  ```bash
  node scripts/testExplainRoute.mjs
  ```
- **AI Explanation & Prompt Calibration Test**:
  ```bash
  node scripts/testExplainMove.mjs
  ```
- **Move Categorization Pipeline Test**:
  ```bash
  node scripts/testMoveCategorization.mjs
  ```
- **Edge Cases & Engine Stress Test**:
  ```bash
  node scripts/testEdgeCases.mjs
  ```
