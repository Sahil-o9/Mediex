import { createFileRoute } from "@tanstack/react-router";
import {
  authConfigured,
  clearedCookie,
  getDoctorSession,
  newDoctorSession,
  sessionCookie,
  verifyDoctorCredentials,
} from "@/lib/server/auth.server";
import { clientIp, guard, json, rateLimit, readJson } from "@/lib/server/guards.server";
import { str } from "@/lib/server/sanitize.server";

/** Doctor session endpoints: GET (who am I), POST (login), DELETE (logout). */
export const Route = createFileRoute("/api/auth/doctor")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!authConfigured()) return json({ doctor: null, configured: false });
        const s = await getDoctorSession(request);
        return json({ doctor: s ? { doctorId: s.sub, name: s.name } : null, configured: true });
      },

      POST: async ({ request }) => {
        const blocked = guard(request, { name: "doctor-login", limit: 10 });
        if (blocked) return blocked;
        if (!authConfigured()) return json({ error: "auth_not_configured" }, 503);

        const parsed = await readJson(request, 2_000);
        if (!parsed.ok) return parsed.response;
        const b = (parsed.data && typeof parsed.data === "object" ? parsed.data : {}) as Record<string, unknown>;
        const doctorId = str(b["doctorId"], 60);
        const password = typeof b["password"] === "string" ? b["password"].slice(0, 200) : "";
        if (!doctorId || !password) return json({ error: "invalid_request" }, 400);

        // Stricter per-account throttle against password guessing.
        if (!rateLimit(`doctor-login-id:${doctorId}:${clientIp(request)}`, 5, 5 * 60_000)) {
          return json({ error: "rate_limited" }, 429);
        }

        const doctor = await verifyDoctorCredentials(doctorId, password);
        if (!doctor) return json({ error: "invalid_credentials" }, 401);

        const token = await newDoctorSession(doctor.doctorId, doctor.name);
        return json({ doctor }, 200, { "Set-Cookie": sessionCookie(token, request) });
      },

      DELETE: async ({ request }) => json({ ok: true }, 200, { "Set-Cookie": clearedCookie(request) }),
    },
  },
});
