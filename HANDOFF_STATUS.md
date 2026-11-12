# MEDIEX – work-in-progress handoff

## Done and tested
- Baseline fixed: lint formatting, regex lint error. `tsc` clean, `vitest` 63 tests pass, production build passes.
- **Triage engine** (`src/lib/mediex/triage.ts`): English/Hinglish/Hindi symptom -> specialty, emergency short-circuit
  (112/108, Tele-MANAS 14416 for self-harm), follow-up questions (max 2), never diagnoses. Unit-tested.
- **Geo / scheduling / ranking** (`geo.ts`, `scheduling.ts`, `ranking.ts`): haversine, IST slots, leaves, ranking. Unit-tested.
- **Server** (TanStack server routes): patient + doctor + admin sessions (signed HttpOnly cookie), PBKDF2,
  patient/doctor registration, demo phone OTP (labelled demo), doctor profile/availability/leave, search,
  booking with double-booking protection, appointment status flow, verified visits, reviews
  (one per visit, flag/appeal/respond, admin moderation with written reasons), admin doctor verification,
  geocoding (Google / Nominatim / offline approx fallback).
- **Security fix**: legacy `/api/cases` now staff-only (a self-registered doctor can't read every patient's case).
- `scripts/api-smoke.mjs`: 66 end-to-end API checks, all passed on a live dev server.
  Run: start with `DEMO_EARLY_COMPLETE=true ALLOW_DEMO_ACCOUNTS=true npm run dev`, then
  `BASE=http://127.0.0.1:8080 node scripts/api-smoke.mjs` (run once per server start; rate limits apply).
- UI done: server-backed AuthContext, patient login/register, doctor login, **/patient/find-doctor**
  (chat + location + ranked doctor cards + booking dialog + reviews), Toaster mounted.

## NOT done yet
- Patient appointments page still old/localStorage; needs server data + review dialog + OTP verify UI.
- Doctor portal UI (profile, availability, leave, appointments, reviews) – APIs exist, screens don't.
  `DoctorDashboardPage` still shows fake hardcoded stats. `/doctor/register` page (login page links to it) missing.
- Admin UI (`/admin`) – APIs exist, screen missing.
- `supabase/schema.sql` + RLS + storage policies + seed SQL, env docs, README – not written.
  The Supabase adapter (`db.server.ts`) is written but UNTESTED against a real project.
- `reportAnalysis.ts` still returns fake sample lab values; `/patient/hospitals` still uses fake hospital data.
- Express/Mongo `server/` untouched (CORS is permissive in non-production).
- UI not yet visually tested in a browser.

## SECURITY – act now
`server/.env` was inside the zip you shared (Mongo URI + JWT secret). Rotate those credentials. It is NOT included in this zip.
Demo logins (only when ALLOW_DEMO_ACCOUNTS=true or non-production): doctor001/Doctor@123, admin001/Admin@123.
