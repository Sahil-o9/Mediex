import { createFileRoute } from "@tanstack/react-router";
import { isValidLatLng } from "@/lib/mediex/geo";
import { triage } from "@/lib/mediex/triage";
import { body, fail, num } from "@/lib/server/api.server";
import { getDirectoryDb, searchDoctors } from "@/lib/server/directory.server";
import { guard, json } from "@/lib/server/guards.server";
import { asLang, str } from "@/lib/server/sanitize.server";

/**
 * POST { messages: string[], lang, location?: {lat,lng} }
 * Specialty navigation only — never a diagnosis. Rule-based (no AI key needed).
 * Emergencies short-circuit: no doctor search, no more questions.
 */
export const Route = createFileRoute("/api/triage")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const blocked = guard(request, { name: "triage", limit: 40 });
        if (blocked) return blocked;
        const parsed = await body(request, 20_000);
        if (!parsed.ok) return parsed.response;
        const b = parsed.b;
        const messages = (Array.isArray(b["messages"]) ? b["messages"] : [])
          .filter((m): m is string => typeof m === "string")
          .map((m) => m.trim().slice(0, 1000))
          .filter(Boolean)
          .slice(-8);
        if (messages.length === 0) return fail("invalid_request");
        const lang = asLang(b["lang"]);

        const result = triage(messages, lang);
        if (result.status !== "ready")
          return json({ triage: result, matches: [], directorySize: 0 });

        const loc =
          b["location"] && typeof b["location"] === "object"
            ? (b["location"] as Record<string, unknown>)
            : null;
        const lat = loc ? num(loc["lat"]) : null;
        const lng = loc ? num(loc["lng"]) : null;
        const patient =
          lat !== null && lng !== null && isValidLatLng({ lat, lng }) ? { lat, lng } : null;

        const targets = result.specialties.map((s) => ({ id: s.id, weight: s.weight }));
        // A General Physician is always a sensible first stop; keep as a low-weight fallback.
        if (!targets.some((t) => t.id === "general_medicine"))
          targets.push({ id: "general_medicine", weight: 0.3 });
        try {
          const db = await getDirectoryDb();
          const found = await searchDoctors(db, {
            targets,
            symptomText: str(messages.join(" "), 4000),
            patient,
            limit: 12,
          });
          return json({ triage: result, ...found, locationUsed: patient !== null });
        } catch {
          return json({ triage: result, matches: [], directorySize: 0, searchError: true }, 200);
        }
      },
    },
  },
});
