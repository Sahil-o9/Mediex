# Mediex

A healthcare discovery and appointment-booking platform focused on helping patients find the right doctor faster and understand care options more clearly.

Mediex combines guided symptom-based recommendations, doctor discovery, appointment workflows, and multilingual patient/doctor interfaces into a single prototype application.

## Overview

This project is designed as a healthcare discovery experience for patients and doctors. It includes:

- symptom-guided specialty recommendations
- doctor search by specialty, location, and clinic context
- appointment booking and tracking
- doctor portal workflows for appointment review
- multilingual support for English and Hindi
- prototype health guidance and triage content

## Architecture

- Frontend: React + TypeScript + Vite + TanStack Start
- Routing: TanStack Router
- Styling: Tailwind CSS + Radix UI
- Backend: Express + Mongoose
- Database: MongoDB (Atlas-ready)
- Runtime: Node.js

## Tech Stack

- React 19
- TypeScript
- Vite
- TanStack Start
- TanStack Router
- Tailwind CSS
- Radix UI
- MongoDB
- Express.js
- Mongoose
- Vitest

## Repository Structure

```text
.
├── src/                # Frontend application and routes
├── server/             # Express backend and server logic
├── public/             # Static assets
├── scripts/            # Helper scripts and smoke tests
├── .env.example        # Example environment file
├── package.json        # Frontend scripts and dependencies
├── README.md           # Project documentation
└── LICENSE             # License
```

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

The development server will output the local URL (typically `http://localhost:8080`).

## Available Scripts

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

## Demo Accounts

Prototype walkthrough accounts are included for local demos:

- Patient: register with a test phone number and password; OTP is simulated locally
- Doctor: `doctor001` / `Doctor@123`
- Admin: `admin001` / `Admin@123`

Use these only for prototype demonstrations and local testing.

## Environment Configuration

### Local development

<<<<<<< HEAD
1. Push the project to GitHub and import that repository into Vercel. Set the project root to the repository root.
2. Use Node.js 22 or newer. The build command is `npm run build`; Nitro's Vercel preset produces the deployment output.
3. Add these environment variables in **Project Settings → Environment Variables** for Production (and Preview if needed). Add only the listed values; do not import the local `.env` wholesale. In particular, do not set `NODE_ENV=development` in Vercel—Vercel sets the correct production mode for production deployments.
=======
Copy the environment file if present and configure your local settings before running the app.
>>>>>>> 2e8c9658bca21142deb4930ec681057147146067

### Production / Vercel deployment

Set the following environment variables in your deployment platform:

| Variable | Purpose |
| --- | --- |
| `DATA_ADAPTER` | Set to `mongodb` for persistent storage |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `MONGODB_DB` | Database name, e.g. `mediex` |
| `SESSION_SECRET` | Secure secret used for session management |
| `ALLOW_DEMO_ACCOUNTS` | Enables demo accounts for walkthroughs |

Generate a session secret locally:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

## Deployment

This app is structured to deploy as a Vercel application with MongoDB Atlas for persistence. The frontend and API routes can run within the same application deployment, which keeps the setup simple for prototype and demo environments.

## Development Notes

- Seeded doctor and clinic data are sample content for demo use
- MongoDB-backed persistence is enabled when configured; otherwise local development may rely on in-memory sample data
- OTP flows are simulated and do not send real SMS messages
- Health guidance and some hospital/report-analysis flows are informational only and are not clinical diagnosis tools
- Submitted case details and any consented original files are stored in the database for demo/prototype use

## Prototype Boundaries

This project is a prototype and not a certified healthcare system or production medical platform. It is intended for demonstration, exploration, and product validation workflows.

## License

This project is available under the MIT License.

## Contributing

Contributions are welcome. Please keep changes focused, validate them locally, and update docs when adding or modifying configuration or workflows.

---

Made by Sahil and Varun.
