# Mediex

**Doctors can find patients. Patients deserve an easier way to find the right doctor.**

Mediex is a healthcare discovery and appointment-booking prototype. It brings symptom-guided specialty suggestions, doctor search, location-aware results, and appointment booking into one patient flow, alongside a doctor portal.

## What you can explore

- **Patient access:** create an account, sign in, and manage a basic profile.
- **Doctor discovery:** describe a concern, get a specialty suggestion, and explore doctors by specialty and location.
- **Appointments:** view available demo slots, book a visit, and follow its status.
- **Doctor portal:** sign in to review and manage demo appointment activity.
- **Reviews:** submit feedback after a completed demo visit.
- **Health guidance:** explore general informational guidance and safety-oriented triage.
- **English and Hindi:** switch the interface language from the landing page.

## Built with

TanStack Start, React, TypeScript, TanStack Router, Vite, Tailwind CSS, and Radix UI.

## Run locally

### Requirements

- Node.js 22.12 or newer
- npm

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:8080`).

### Demo accounts

- **Patient:** register with a test phone number and password; OTP is simulated locally.
- **Doctor:** `doctor001` / `Doctor@123`
- **Admin:** `admin001` / `Admin@123`

The doctor and admin credentials are shared demo accounts. Use them only for prototype walkthroughs.

### Checks

```bash
npm test
npm run typecheck
npm run lint
```

For the API smoke test, start the development server with early appointment completion enabled:

```powershell
$env:DEMO_EARLY_COMPLETE = "true"
npm run dev
```

Then, in another terminal:

```bash
npm run test:api
```

The smoke test creates temporary accounts; run it once per server start.

## Deploy a Cloudflare demo

The root TanStack Start app builds for Cloudflare Workers. The separate `server/` folder contains an Express backend and is not the deployment target for this app.

1. Authenticate Wrangler with your Cloudflare account:

   ```bash
   npx wrangler login
   ```

2. Install and deploy the demo configuration:

   ```bash
   npm ci
   npm run deploy:worker:demo
   ```

3. Add a unique session secret to the deployed Worker. Generate a value locally, then paste it when Wrangler prompts:

   ```bash
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   npx wrangler secret put SESSION_SECRET --config .output/server/wrangler.json
   ```

The deployment command prints the public URL. Use test accounts to verify patient sign-in, doctor discovery, booking, and the doctor portal.

For a local Worker preview, copy `.dev.vars.example` to `.dev.vars`, set a unique `SESSION_SECRET`, and run `npm run preview:worker`. `.dev.vars` is git-ignored.

## Prototype implementation notes

- The directory is seeded with example doctors and clinic details; treat those listings as sample content.
- The default data adapter is in-memory, so accounts and appointments can reset when the server restarts and are not shared reliably between serverless instances.
- Phone OTP is simulated; no SMS is sent.
- Hospital and report-analysis areas include sample/incomplete flows. Health guidance is informational and is not a diagnosis.
- Supabase adapter configuration exists but its schema and live deployment still need implementation and testing before it can provide persistent storage.

These are current prototype boundaries, not claims about a production healthcare service.

## License

This project is available under the MIT License.
