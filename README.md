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

## Deploy on Vercel with MongoDB Atlas

The TanStack Start app, including its `/api/*` routes, deploys as one Vercel application. MongoDB Atlas stores accounts, appointments, doctor directory data, cases, and consented original case files. The separate `server/` Express app is a legacy backend and is not used by the current frontend.

### Prepare MongoDB Atlas

1. Create an Atlas project and cluster.
2. Create a database user with a strong password. URL-encode special characters in the password when building the connection string.
3. Configure the cluster network access list. Vercel serverless functions do not have a single fixed outbound IP on all plans; for a hackathon demo, Atlas may need `0.0.0.0/0`. Use a strong database password and restrict access further if your Vercel plan supports static egress.
4. Copy the cluster connection string. Keep it private; it is a server-side credential.

### Configure Vercel

1. Push the project to GitHub and import that repository into Vercel. Set the project root to the repository root.
2. Use Node.js 22 or newer. The build command is `npm run build`; Nitro's Vercel preset produces the deployment output.
3. Add these environment variables in **Project Settings → Environment Variables** for Production (and Preview if needed). Add only the listed values; do not import the local `.env` wholesale. In particular, do not set `NODE_ENV=development` in Vercel—Vercel sets the correct production mode for production deployments.

   | Variable | Value |
   | --- | --- |
   | `DATA_ADAPTER` | `mongodb` |
   | `MONGODB_URI` | Atlas connection string |
   | `MONGODB_DB` | `mediex` |
   | `SESSION_SECRET` | A unique random secret |
   | `ALLOW_DEMO_ACCOUNTS` | `true` for the hackathon walkthrough; set to `false` afterward |

4. Generate `SESSION_SECRET` locally and paste it into Vercel. Do not commit it or share it:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

5. Redeploy after adding the variables. Open the Vercel deployment URL and test patient registration/sign-in, doctor discovery, appointment booking, and the doctor portal.

Vercel handles the app's same-origin API routes, so a separate Render service is not required for this setup.

### Run locally with Atlas

Copy `.env.example` to `.env`, add your Atlas URI and a private local session secret, then run:

```powershell
npm ci
npm run dev
```

`.env` is ignored by Git. MongoDB collections and the demo doctor directory are created/seeded automatically on first use.

## Prototype implementation notes

- The directory is seeded with example doctors and clinic details; treat those listings as sample content.
- With `DATA_ADAPTER=mongodb`, accounts and appointments persist in MongoDB Atlas and are shared between Vercel function instances. Without a MongoDB URI, local development uses in-memory sample storage.
- Phone OTP is simulated; no SMS is sent.
- Hospital and report-analysis areas include sample/incomplete flows. Health guidance is informational and is not a diagnosis.
- The MongoDB database stores submitted case details and any original files the patient explicitly consents to share. Use demo data for presentations; this prototype is not a certified healthcare data system.

These are current prototype boundaries, not claims about a production healthcare service.

## License

This project is available under the MIT License.
