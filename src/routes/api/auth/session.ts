import { createFileRoute } from "@tanstack/react-router";
import { authConfigured, clearedCookie, getSession } from "@/lib/server/auth.server";
import { publicPatient } from "@/lib/server/api.server";
import { getDirectoryDb, getDoctorPrivate, loadProfile } from "@/lib/server/directory.server";
import { guard, json } from "@/lib/server/guards.server";
import { otpMode } from "@/lib/server/accounts.server";
import { demoAccountsAllowed } from "@/lib/server/env.server";
import { getDb } from "@/lib/server/db.server";

/** GET → who is signed in (role + safe profile summary). DELETE → sign out. */
export const Route = createFileRoute("/api/auth/session")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blocked = guard(request, { name: "session", limit: 120 });
        if (blocked) return blocked;
        const config = {
          configured: authConfigured(),
          storage: getDb().mode,
          otpMode: otpMode(),
          demoAccounts: demoAccountsAllowed(),
        };
        const s = authConfigured() ? await getSession(request) : null;
        if (!s) return json({ role: null, ...config });
        const db = await getDirectoryDb();
        if (s.role === "patient" && s.pid) {
          const p = await db.table("patients").get(s.pid);
          if (!p)
            return json({ role: null, ...config }, 200, { "Set-Cookie": clearedCookie(request) });
          return json({ role: "patient", patient: publicPatient(p), ...config });
        }
        if (s.role === "doctor") {
          const profile = s.pid ? await loadProfile(db, s.pid) : null;
          const privateProfile = s.pid ? await getDoctorPrivate(db, s.pid) : null;
          return json({
            role: "doctor",
            doctor: {
              doctorId: privateProfile?.handle ?? s.sub,
              name: profile?.fullName ?? s.name,
              profileId: s.pid,
              staff: s.staff,
            },
            verificationStatus: profile?.verificationStatus ?? "unverified",
            ...config,
          });
        }
        return json({ role: s.role, admin: { id: s.sub, name: s.name }, ...config });
      },
      DELETE: async ({ request }) =>
        json({ ok: true }, 200, { "Set-Cookie": clearedCookie(request) }),
    },
  },
});
