import { createFileRoute } from "@tanstack/react-router";
import { loginPatient, normalizePhone, registerPatient } from "@/lib/server/accounts.server";
import { body, fail, publicPatient, statusFor } from "@/lib/server/api.server";
import { authConfigured, newSession, sessionCookie } from "@/lib/server/auth.server";
import { getDirectoryDb } from "@/lib/server/directory.server";
import { clientIp, guard, json, rateLimit } from "@/lib/server/guards.server";
import { str } from "@/lib/server/sanitize.server";

/** POST { action: "register" | "login", ... } — patient accounts, phone number as the login. */
export const Route = createFileRoute("/api/auth/patient")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const blocked = guard(request, { name: "patient-auth", limit: 20 });
        if (blocked) return blocked;
        if (!authConfigured()) return fail("auth_not_configured", 503);
        const parsed = await body(request, 4_000);
        if (!parsed.ok) return parsed.response;
        const b = parsed.b;
        const password = typeof b["password"] === "string" ? b["password"].slice(0, 200) : "";
        const phone = str(b["phone"], 20);
        const db = await getDirectoryDb();

        if (b["action"] === "login") {
          const key = `patient-login:${normalizePhone(phone) ?? phone}:${clientIp(request)}`;
          if (!rateLimit(key, 5, 5 * 60_000)) return fail("rate_limited", 429);
          const r = await loginPatient(db, phone, password);
          if (!r.ok) return fail(r.error, statusFor(r.error));
          const token = await newSession({
            sub: r.accountId,
            name: r.patient.fullName,
            role: "patient",
            pid: r.patient.id,
            staff: false,
          });
          return json({ patient: publicPatient(r.patient) }, 200, {
            "Set-Cookie": sessionCookie(token, request),
          });
        }

        if (b["action"] === "register") {
          const r = await registerPatient(db, {
            fullName: str(b["fullName"], 100),
            phone,
            password,
            email: str(b["email"], 120),
            dateOfBirth: str(b["dateOfBirth"], 10),
            gender: str(b["gender"], 20),
            language: str(b["language"], 10),
            consent: b["consent"] === true,
          });
          if (!r.ok) return fail(r.error, statusFor(r.error));
          const token = await newSession({
            sub: r.accountId,
            name: r.patient.fullName,
            role: "patient",
            pid: r.patient.id,
            staff: false,
          });
          return json({ patient: publicPatient(r.patient) }, 201, {
            "Set-Cookie": sessionCookie(token, request),
          });
        }
        return fail("invalid_request");
      },
    },
  },
});
