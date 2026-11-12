# Mediex — Express + Mongoose backend setup

This adds a standalone **Node.js + Express + Mongoose** API in `server/`, plus
React Query hooks in `src/hooks/mediexApi/` that call it from your existing
Vite/TypeScript frontend. It runs alongside your current TanStack Start app
without touching its existing routes — nothing here was auto-wired except the
patient **login** form (`src/pages/PatientAuthPage.tsx`), which now calls the
real `/api/auth/login` endpoint.

⚠️ **Security note:** the `.env` file that was inside your uploaded ZIP
contained a real MongoDB Atlas password and JWT secret in plain text. It has
**not** been included anywhere in this delivery — only a redacted
`server/.env.example`. Since that password already sat in a zip that was
uploaded, rotate the `sahilku1346_db_user` password in Atlas (Database
Access → Edit → Edit Password) before going further, then put the new
password only in your local `server/.env`, which is git-ignored.

## 1. Backend setup

```bash
cd server
npm install
cp .env.example .env
```

Edit `server/.env`:

```env
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
MONGO_URI=mongodb+srv://sahilku1346_db_user:<your-new-password>@mediex.4cxykmz.mongodb.net/mediex_db?retryWrites=true&w=majority
JWT_SECRET=<a long random string>
JWT_EXPIRES_IN=7d
```

Generate a strong `JWT_SECRET` quickly with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Start the API:

```bash
npm run dev      # nodemon, auto-restarts on change
# or
npm start        # plain node
```

You should see:

```
[db] MongoDB connected: mediex-shard-00-xx.mongodb.net/mediex_db
[server] mediex-server running on http://localhost:5000
```

Verify it's up: `curl http://localhost:5000/api/health`

## 2. API reference

All routes are prefixed `/api`. Protected routes require
`Authorization: Bearer <token>` (the token returned by register/login).

| Method | Route                    | Access                  | Purpose                        |
|--------|---------------------------|--------------------------|---------------------------------|
| POST   | `/auth/register`          | Public                   | Create a patient or doctor account |
| POST   | `/auth/login`              | Public                   | Log in, returns `{ user, token }` |
| GET    | `/auth/me`                 | Private                  | Current logged-in user          |
| POST   | `/records`                 | Private                  | Create a medical record         |
| GET    | `/records`                 | Private                  | List (patients: own; doctors: `?patient=<id>`) |
| GET    | `/records/:id`              | Private                  | One record                      |
| PUT    | `/records/:id`              | Private (owner)          | Update                          |
| DELETE | `/records/:id`              | Private (owner)          | Delete                          |
| POST   | `/appointments`             | Private                  | Book an appointment             |
| GET    | `/appointments`             | Private                  | List (patients: own; doctors: `?patient=` or `?mine=true`) |
| GET/PUT/DELETE | `/appointments/:id` | Private (owner)          | Read / update / cancel          |
| POST   | `/prescriptions`            | Private (doctor only)    | Issue a prescription            |
| GET    | `/prescriptions`            | Private                  | List (patients: own; doctors: issued by them) |
| GET/PUT/DELETE | `/prescriptions/:id` | Private (issuing doctor for write; patient/doctor for read) | Manage a prescription |

`register` body: `{ name, email, password, role: "patient" | "doctor", ...optional fields }`
`login` body: `{ email, password }`

## 3. Frontend setup

```bash
cp .env.example .env   # at the project root — sets VITE_API_URL
npm run dev             # your existing Vite dev server
```

New files added under `src/`:

- `src/lib/mediexApi/client.ts` — fetch wrapper, attaches the JWT automatically
- `src/lib/mediexApi/types.ts` — TypeScript types matching the API responses
- `src/hooks/mediexApi/useAuthApi.ts` — `useRegister`, `useLogin`, `useMe`, `useLogout`
- `src/hooks/mediexApi/useMedicalRecordsApi.ts` — CRUD hooks for records
- `src/hooks/mediexApi/useAppointmentsApi.ts` — CRUD hooks for appointments
- `src/hooks/mediexApi/usePrescriptionsApi.ts` — CRUD hooks for prescriptions

Example usage anywhere inside the existing `QueryClientProvider`
(already set up in `src/routes/__root.tsx`):

```tsx
import { useMedicalRecords, useCreateMedicalRecord } from "@/hooks/mediexApi/useMedicalRecordsApi";

function Records() {
  const { data: records, isLoading } = useMedicalRecords();
  const createRecord = useCreateMedicalRecord();

  if (isLoading) return <p>Loading…</p>;

  return (
    <div>
      {records?.map((r) => <div key={r._id}>{r.title}</div>)}
      <button
        onClick={() =>
          createRecord.mutate({ title: "Follow-up", recordType: "consultation" })
        }
      >
        Add record
      </button>
    </div>
  );
}
```

The patient **login** tab in `src/pages/PatientAuthPage.tsx` is already wired
to `useLogin()` and now authenticates by **email** (the new backend uses
email/password, not the old mobile-number mock). The register tab still uses
the original local mock — point it at `useRegister()` the same way once you're
ready to migrate signup too.

## 4. Run both together

```bash
# terminal 1
cd server && npm run dev

# terminal 2
npm run dev
```

Frontend on `http://localhost:5173`, API on `http://localhost:5000`.

## 5. Deploying

- Backend: any Node host (Render, Railway, Fly.io, an EC2/VPS). Set the same
  env vars there; update `CLIENT_ORIGIN` to your deployed frontend's URL.
- Frontend: set `VITE_API_URL` to your deployed backend's URL at build time.
