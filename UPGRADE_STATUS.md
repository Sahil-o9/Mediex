# AyuCase AI upgrade — STATUS (work in progress snapshot)

## Done (backend + shared logic, type-checked, 26 unit tests passing)
- src/lib/mediex/: safety.ts (multilingual emergency pre-screen with negation), language.ts (reply-language check),
  findings.ts (range flags computed in code + verification against source text), caseState.ts, documents.ts
- src/lib/server/*.server.ts: ai, auth (signed-cookie doctor sessions, PBKDF2), guards (CSRF/rate-limit/body size),
  store (memory + Supabase adapters), documents (PDF text via unpdf, image via vision, never invents values),
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
- .env.example, supabase/schema.sql, scripts/hash-password.mjs, docs
- Supabase adapter is untested against a live project; AI calls untested against the real gateway

## Env vars used so far
LOVABLE_API_KEY, AI_GATEWAY_URL (optional), AI_MODEL (optional), SESSION_SECRET, DOCTOR_ACCOUNTS,
ALLOW_DEMO_ACCOUNTS, DATA_ADAPTER (memory|supabase), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DOCS_BUCKET

## Setup
package-lock.json in the original upload was out of sync with package.json; run `npm install` (not `npm ci`).
