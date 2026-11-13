import { createFileRoute } from "@tanstack/react-router";
import { loginRegisteredDoctor, registerDoctor } from "@/lib/server/accounts.server";
import { body, fail, statusFor } from "@/lib/server/api.server";
import {
  authConfigured,
  clearedCookie,
  getSession,
  newSession,
  sessionCookie,
  verifyStaffCredentials,
} from "@/lib/server/auth.server";
import { getDirectoryDb } from "@/lib/server/directory.server";
import { clientIp, guard, json, rateLimit } from "@/lib/server/guards.server";
import { str } from "@/lib/server/sanitize.server";

/**
 * Doctor / admin sessions.
 * GET → who am I. POST { action: "login" | "register" }. DELETE → sign out.
 * Login order: staff accounts (env / demo, also admins) → registered doctors.
 */
export const Route = createFileRoute("/api/auth/doctor")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!authConfigured()) return json({ doctor: null, configured: false });
        const s = await getSession(request);
        const ok = s && (s.role === "doctor" || s.role === "admin");
        return json({
          doctor: ok ? { doctorId: s.sub, name: s.name, role: s.role } : null,
          configured: true,
        });
      },

      POST: async ({ request }) => {
        const blocked = guard(request, { name: "doctor-auth", limit: 15 });
        if (blocked) return blocked;
        if (!authConfigured()) return fail("auth_not_configured", 503);
        const parsed = await body(request, 6_000);
        if (!parsed.ok) return parsed.response;
        const b = parsed.b;
        const password = typeof b["password"] === "string" ? b["password"].slice(0, 200) : "";
        const db = await getDirectoryDb();

        if (b["action"] === "register") {
          const r = await registerDoctor(db, {
            fullName: str(b["fullName"], 100),
            phone: str(b["phone"], 32),
            email: str(b["email"], 120),
            password,
            qualifications: str(b["qualifications"], 200),
            registrationNumber: str(b["registrationNumber"], 40),
            registrationCouncil: str(b["registrationCouncil"], 120),
          });
          if (!r.ok) return fail(r.error, statusFor(r.error));
          const token = await newSession({
            sub: r.accountId,
            name: r.doctor.fullName,
            role: "doctor",
            pid: r.doctor.id,
            staff: false,
          });
          return json(
            {
              doctor: { doctorId: r.doctor.handle, name: r.doctor.fullName, role: "doctor" },
              verificationStatus: r.doctor.verificationStatus,
            },
            201,
            { "Set-Cookie": sessionCookie(token, request) },
          );
        }

        const loginId = str(b["doctorId"], 120);
        if (!loginId || !password) return fail("invalid_request");
        if (
          !rateLimit(`doctor-login-id:${loginId.toLowerCase()}:${clientIp(request)}`, 5, 5 * 60_000)
        ) {
          return fail("rate_limited", 429);
        }
        const staff = await verifyStaffCredentials(loginId, password);
        if (staff) {
          const token = await newSession({
            sub: staff.id,
            name: staff.name,
            role: staff.role,
            pid: staff.pid,
            staff: true,
          });
          return json({ doctor: { doctorId: staff.id, name: staff.name, role: staff.role } }, 200, {
            "Set-Cookie": sessionCookie(token, request),
          });
        }
        const r = await loginRegisteredDoctor(db, loginId, password);
        if (!r.ok) return fail("invalid_credentials", 401);
        const token = await newSession({
          sub: r.accountId,
          name: r.doctor.fullName,
          role: "doctor",
          pid: r.doctor.id,
          staff: false,
        });
        return json(
          { doctor: { doctorId: r.doctor.handle, name: r.doctor.fullName, role: "doctor" } },
          200,
          {
            "Set-Cookie": sessionCookie(token, request),
          },
        );
      },

      DELETE: async ({ request }) =>
        json({ ok: true }, 200, { "Set-Cookie": clearedCookie(request) }),
    },
  },
});
