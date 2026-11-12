import { createFileRoute } from "@tanstack/react-router";
import { requestOtp, verifyOtp } from "@/lib/server/accounts.server";
import { body, fail, statusFor } from "@/lib/server/api.server";
import { requireRole } from "@/lib/server/auth.server";
import { getDirectoryDb } from "@/lib/server/directory.server";
import { guard, json } from "@/lib/server/guards.server";
import { str } from "@/lib/server/sanitize.server";

/**
 * Phone verification for the signed-in patient. POST { action: "request" | "verify", code? }.
 * Mode "demo": no SMS is sent; the code is returned so the flow can be shown offline.
 */
export const Route = createFileRoute("/api/auth/otp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const blocked = guard(request, { name: "otp", limit: 12 });
        if (blocked) return blocked;
        const auth = await requireRole(request, ["patient"]);
        if ("response" in auth) return auth.response;
        const parsed = await body(request, 1_000);
        if (!parsed.ok) return parsed.response;
        const db = await getDirectoryDb();
        const patient = auth.session.pid ? await db.table("patients").get(auth.session.pid) : null;
        if (!patient) return fail("not_found", 404);

        if (parsed.b["action"] === "request") {
          if (patient.phoneVerified) return json({ alreadyVerified: true });
          const r = await requestOtp(db, patient.phone);
          if (!r.ok) return fail(r.error, statusFor(r.error));
          return json({
            mode: r.mode,
            demoCode: r.demoCode,
            expiresInSeconds: r.expiresInSeconds,
            sentTo: `******${patient.phone.slice(-4)}`,
          });
        }
        if (parsed.b["action"] === "verify") {
          const r = await verifyOtp(db, patient.id, patient.phone, str(parsed.b["code"], 8));
          return r.ok ? json({ verified: true }) : fail(r.error, 400);
        }
        return fail("invalid_request");
      },
    },
  },
});
