# AyuCase AI upgrade — STATUS (work in progress snapshot)

## Done (backend + shared logic, type-checked, 26 unit tests passing)
- src/lib/mediex/: safety.ts (multilingual emergency pre-screen with negation), language.ts (reply-language check),
  findings.ts (range flags computed in code + verification against source text), caseState.ts, documents.ts
- src/lib/server/*.server.ts: ai, auth (signed-cookie doctor sessions, PBKDF2), guards (CSRF/rate-limit/body size),
  store (memory + MongoDB adapters), documents (PDF text via unpdf, image via vision, never invents values),
  prompts, sanitize
- API routes: /api/assistant (rewritten), /api/documents/analyze, /api/case-summary, /api/auth/doctor,
  /api/cases, /api/cases/$caseId, /api/cases/$caseId/documents/$docId
- tests/e2e/mock-gateway.mjs: TEST-ONLY mock AI gateway (not used by the app)

## NOT done yet
- New UI: language cards, patient details, document uploader/review, chat with progress + language-change confirm,
  case summary, doctor dashboard (cases/notes/status)
- i18n strings for the new screens (src/lib/i18n)
- Wiring doctor login to /api/auth/doctor (client still uses the old local demo login)
- src/lib/mediex/reportAnalysis.ts still returns FAKE sample lab values — to be removed
- End-to-end API test run against the mock gateway (script not written yet)
- Vercel deployment and MongoDB Atlas setup are documented in README.md
- MongoDB adapter is type/build-tested but still needs a live Atlas connection test; AI calls are untested against the real gateway

## Env vars used so far
LOVABLE_API_KEY, AI_GATEWAY_URL (optional), AI_MODEL (optional), SESSION_SECRET, DOCTOR_ACCOUNTS,
ALLOW_DEMO_ACCOUNTS, DATA_ADAPTER (memory|mongodb|supabase), MONGODB_URI, MONGODB_DB

## Setup
Use Node.js 22.12 or newer and `npm ci`. For current Vercel deployment and local MongoDB setup, follow README.md.
