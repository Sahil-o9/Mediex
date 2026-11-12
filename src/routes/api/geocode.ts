import { createFileRoute } from "@tanstack/react-router";
import { lookupKnownArea } from "@/lib/mediex/geo";
import { fail } from "@/lib/server/api.server";
import { env } from "@/lib/server/env.server";
import { guard, json } from "@/lib/server/guards.server";

/**
 * GET /api/geocode?q=Sector 18 Noida → { lat, lng, label, source }.
 * source: "google" (GOOGLE_MAPS_API_KEY set) | "nominatim" (OpenStreetMap, free) | "known_area_approx"
 * (offline fallback: approximate centre of a major city/area — labelled as such, never as an address).
 */
export const Route = createFileRoute("/api/geocode")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blocked = guard(request, { name: "geocode", limit: 20 });
        if (blocked) return blocked;
        const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 150);
        if (q.length < 3) return fail("query_too_short");

        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 5000);
        try {
          const key = env("GOOGLE_MAPS_API_KEY");
          if (key) {
            const r = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?region=in&address=${encodeURIComponent(q)}&key=${key}`,
              { signal: ctl.signal },
            );
            const d = (await r.json()) as {
              results?: {
                formatted_address: string;
                geometry: { location: { lat: number; lng: number } };
              }[];
            };
            const hit = d.results?.[0];
            if (hit)
              return json({
                lat: hit.geometry.location.lat,
                lng: hit.geometry.location.lng,
                label: hit.formatted_address,
                source: "google",
              });
          } else {
            const r = await fetch(
              `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(q)}`,
              {
                signal: ctl.signal,
                headers: {
                  "User-Agent": "MEDIEX-hackathon/1.0 (specialist discovery)",
                  Accept: "application/json",
                },
              },
            );
            if (r.ok) {
              const d = (await r.json()) as { lat: string; lon: string; display_name: string }[];
              const hit = d[0];
              if (hit)
                return json({
                  lat: Number(hit.lat),
                  lng: Number(hit.lon),
                  label: hit.display_name.slice(0, 160),
                  source: "nominatim",
                });
            }
          }
        } catch {
          /* fall through to the offline list */
        } finally {
          clearTimeout(timer);
        }
        const known = lookupKnownArea(q);
        if (known)
          return json({
            lat: known.lat,
            lng: known.lng,
            label: `${known.name} (approximate area centre)`,
            source: "known_area_approx",
          });
        return fail("location_not_found", 404);
      },
    },
  },
});
