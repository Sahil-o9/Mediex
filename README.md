# Mediex frontend

This is a Vite, React, TypeScript, and Tailwind CSS frontend. The current prototype stores demo registration data only in the browser's local storage; it does not yet include a real backend or secure production authentication.

## Run on Windows

1. Install Node.js 20 LTS from https://nodejs.org/ (or run `winget install OpenJS.NodeJS.LTS` in PowerShell).
2. Open a **new** PowerShell window in this folder, the folder containing `package.json`.
3. Run:

```powershell
node -v
npm.cmd -v
npm.cmd ci
npm.cmd run dev
```

Open the local address shown by Vite, normally http://localhost:5173.

Use `npm.cmd run dev`, not `npm dev`. The `.cmd` form avoids a Windows PowerShell execution-policy restriction without changing your computer's security settings.

## Production check

```powershell
npm.cmd run build
npm.cmd run preview
```

The production files are created in `dist`.

## Deploy to Vercel

Push this folder to a GitHub repository, then import that repository in Vercel. Select the **Vite** framework preset. Vercel should detect the settings automatically; if it asks, use:

| Setting | Value |
| --- | --- |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node.js version | 20.x |

`vercel.json` is included so direct visits to routes such as `/patient/auth` and `/doctor/login` load correctly.
