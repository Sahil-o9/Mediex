# Mediex

Mediex is a healthcare discovery and appointment-booking prototype designed to help patients find the right doctor faster and make care decisions with more clarity.

The platform combines symptom-guided specialty suggestions, doctor discovery, appointment booking, and patient/doctor workflow tools in a single experience.

## Why Mediex

Patients often struggle to navigate specialty care, appointment availability, and trust signals. Mediex addresses this by making discovery more guided and transparent:

- Patients can describe their concern and receive specialty suggestions
- They can search doctors by specialty, location, and clinic details
- Appointment slots can be reviewed and booked from a simple flow
- Doctors receive a portal view for managing appointment activity
- The experience supports both English and Hindi language switching

## Key Features

- Patient onboarding and profile management
- Symptom-based specialty recommendations
- Doctor discovery with location-aware search
- Demo appointment booking and status tracking
- Doctor portal for review and management of appointment activity
- Feedback collection after completed visits
- Health guidance and safety-oriented triage information
- Multilingual UI support for English and Hindi

## Tech Stack

- React 19
- TypeScript
- Vite
- TanStack Start
- TanStack Router
- Tailwind CSS
- Radix UI
- MongoDB integration for persistent data
- Express + Mongoose backend

## Project Structure

- `src/` — frontend application and routes
- `server/` — Express backend services
- `public/` — static assets
- `scripts/` — helper scripts and smoke tests
- `README.md` — project documentation

## Getting Started

### Prerequisites

- Node.js 22.12 or newer
- npm

### Install dependencies

```bash
npm ci
```

### Run the app locally

```bash
npm run dev
```

Open the local URL shown in the terminal (typically `http://localhost:8080`).

## Demo Accounts

The app includes prototype demo credentials for walkthroughs:

- Patient: register with a test phone number and password; OTP is simulated locally
- Doctor: `doctor001` / `Doctor@123`
- Admin: `admin001` / `Admin@123`

Use these accounts only for prototype demonstrations and local testing.

## Scripts

```bash
npm run dev
npm run build
npm run test
npm run typecheck
npm run lint
npm run test:api
```

### API smoke test

To run the API smoke test with early completion enabled:

```powershell
$env:DEMO_EARLY_COMPLETE = "true"
npm run dev
```

Then in another terminal:

```bash
npm run test:api
```

## Environment Configuration

For local development, configure your environment as needed for the app and database layer.

### MongoDB Atlas deployment

For production or preview deployments, set the following environment variables in your hosting platform:

| Variable | Description |
| --- | --- |
| `DATA_ADAPTER` | Set to `mongodb` for persistent storage |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `MONGODB_DB` | Database name, e.g. `mediex` |
| `SESSION_SECRET` | Secure random secret for session management |
| `ALLOW_DEMO_ACCOUNTS` | Enables demo walkthrough accounts |

Generate a session secret locally if needed:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

## Deployment

This application is designed to deploy as a Vercel app with MongoDB Atlas for persistence. The app uses same-origin API routes, so a separate backend server is not required for the deployed web app.

## Prototype Notes

- The seeded doctor directory contains example records for demo use
- Data persistence depends on MongoDB when configured; otherwise local development may use in-memory sample data
- OTP flows are simulated and do not send real SMS messages
- Some health guidance and hospital/report analysis flows are informational and not clinical diagnosis tools
- Submitted case details and any consented original files are stored in the MongoDB database for prototype use

These boundaries are important: the project is a prototype and not a certified healthcare system or production medical platform.

## License

This project is available under the MIT License.

## Contributing

Contributions are welcome. If you are improving the app, please keep changes focused, test locally, and document any new configuration or workflow updates.

---

Made by Sahil and Varun.
