import { createFileRoute } from "@tanstack/react-router";
import { isValidLatLng } from "@/lib/mediex/geo";
import { body, bool, fail, num } from "@/lib/server/api.server";
import { normalizePhone } from "@/lib/server/accounts.server";
import { requireDoctor } from "@/lib/server/auth.server";
import {
  getDirectoryDb,
  getDoctorPrivate,
  listDoctorReviews,
  loadProfile,
  profileMissing,
  saveDoctorProfile,
  type ClinicInput,
  type ProfileInput,
} from "@/lib/server/directory.server";
import { guard, json } from "@/lib/server/guards.server";
import { str, strList } from "@/lib/server/sanitize.server";
import { isSpecialtyId } from "@/types/directory";

/** Signed-in doctor's own profile. GET → profile + private registration fields. PUT → partial update. */
export const Route = createFileRoute("/api/doctor/profile")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blocked = guard(request, { name: "doctor-profile", limit: 60 });
        if (blocked) return blocked;
        const auth = await requireDoctor(request);
        if ("response" in auth) return auth.response;
        if (!auth.session.pid) return fail("no_profile", 404);
        const db = await getDirectoryDb();
        const profile = await loadProfile(db, auth.session.pid);
        if (!profile) return fail("no_profile", 404);
        return json({
          profile,
          private: await getDoctorPrivate(db, auth.session.pid),
          missing: profileMissing(profile),
          reviews: await listDoctorReviews(db, auth.session.pid),
          staff: auth.session.staff,
        });
      },

      PUT: async ({ request }) => {
        const blocked = guard(request, { name: "doctor-profile-save", limit: 30 });
        if (blocked) return blocked;
        const auth = await requireDoctor(request);
        if ("response" in auth) return auth.response;
        if (!auth.session.pid) return fail("no_profile", 404);
        const parsed = await body(request, 20_000);
        if (!parsed.ok) return parsed.response;
        const b = parsed.b;

        const input: ProfileInput = {};
        if ("fullName" in b) input.fullName = str(b["fullName"], 100);
        if ("phone" in b) {
          const rawPhone = str(b["phone"], 32);
          if (!normalizePhone(rawPhone)) return fail("invalid_phone");
          input.phone = rawPhone;
        }
        if ("qualifications" in b) input.qualifications = str(b["qualifications"], 200);
        if ("registrationNumber" in b) input.registrationNumber = str(b["registrationNumber"], 40);
        if ("registrationCouncil" in b)
          input.registrationCouncil = str(b["registrationCouncil"], 120);
        if (Array.isArray(b["specialties"]))
          input.specialties = b["specialties"].filter(isSpecialtyId);
        if ("conditions" in b) input.conditions = strList(b["conditions"], 25, 60);
        if ("languages" in b) input.languages = strList(b["languages"], 10, 30);
        if ("bio" in b) input.bio = str(b["bio"], 600);
        if ("experienceYears" in b) {
          const n = num(b["experienceYears"]);
          input.experienceYears = n !== null && n >= 0 && n <= 70 ? Math.floor(n) : null;
        }
        if ("consultationFee" in b) {
          const n = num(b["consultationFee"]);
          input.consultationFee = n !== null && n >= 0 && n <= 100000 ? Math.floor(n) : null;
        }
        if ("slotMinutes" in b) input.slotMinutes = num(b["slotMinutes"]) ?? 0;
        const accepting = bool(b["acceptingAppointments"]);
        if (accepting !== undefined) input.acceptingAppointments = accepting;

        const c = b["clinic"];
        if (c && typeof c === "object") {
          const o = c as Record<string, unknown>;
          const lat = num(o["lat"]);
          const lng = num(o["lng"]);
          const clinic: ClinicInput = {
            name: str(o["name"], 120),
            kind: o["kind"] === "hospital" ? "hospital" : "clinic",
            addressLine: str(o["addressLine"], 200),
            city: str(o["city"], 60),
            state: str(o["state"], 60),
            pincode: str(o["pincode"], 10),
            lat: lat !== null && lng !== null && isValidLatLng({ lat, lng }) ? lat : null,
            lng: lat !== null && lng !== null && isValidLatLng({ lat, lng }) ? lng : null,
            phone: str(o["phone"], 20),
          };
          input.clinic = clinic;
        }

        const db = await getDirectoryDb();
        const r = await saveDoctorProfile(db, auth.session.pid, input);
        if (!r.ok) return fail(r.error, r.status ?? 400);
        return json({ profile: r.profile, missing: profileMissing(r.profile) });
      },
    },
  },
});
