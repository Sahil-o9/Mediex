import { createFileRoute } from "@tanstack/react-router";
import { body, fail, publicPatient } from "@/lib/server/api.server";
import { normalizeEmail, normalizePhone } from "@/lib/server/accounts.server";
import { requireRole } from "@/lib/server/auth.server";
import { getDirectoryDb } from "@/lib/server/directory.server";
import type { PatientRow } from "@/lib/server/db.server";
import { guard, json } from "@/lib/server/guards.server";
import { str } from "@/lib/server/sanitize.server";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["", "Female", "Male", "Other"];
const LANGUAGES = ["en", "hi", "hinglish"];

function isValidDob(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    date <= new Date(new Date().toISOString().slice(0, 10))
  );
}

export const Route = createFileRoute("/api/patient/profile")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blocked = guard(request, { name: "patient-profile", limit: 60 });
        if (blocked) return blocked;
        const auth = await requireRole(request, ["patient"]);
        if ("response" in auth) return auth.response;
        if (!auth.session.pid) return fail("unauthorized", 401);
        const patient = await (await getDirectoryDb()).table("patients").get(auth.session.pid);
        return patient ? json({ patient: publicPatient(patient) }) : fail("not_found", 404);
      },
      PUT: async ({ request }) => {
        const blocked = guard(request, { name: "patient-profile-save", limit: 30 });
        if (blocked) return blocked;
        const auth = await requireRole(request, ["patient"]);
        if ("response" in auth) return auth.response;
        if (!auth.session.pid) return fail("unauthorized", 401);
        const parsed = await body(request, 4_000);
        if (!parsed.ok) return parsed.response;
        const fields = [
          "fullName",
          "email",
          "dateOfBirth",
          "gender",
          "language",
          "abhaId",
          "bloodGroup",
          "emergencyContact",
        ] as const;
        if (!fields.some((field) => field in parsed.b)) return fail("invalid_request");
        if (fields.some((field) => field in parsed.b && typeof parsed.b[field] !== "string")) {
          return fail("invalid_request");
        }

        const patch: Partial<PatientRow> = {};
        const b = parsed.b;
        if ("fullName" in b) {
          const fullName = str(b["fullName"], 100);
          if (fullName.length < 2) return fail("invalid_name");
          patch.fullName = fullName;
        }
        if ("email" in b) {
          const emailValue = str(b["email"], 120);
          const email = emailValue ? normalizeEmail(emailValue) : "";
          if (emailValue && !email) return fail("invalid_email");
          patch.email = email ?? "";
        }
        if ("dateOfBirth" in b) {
          const dateOfBirth = str(b["dateOfBirth"], 10);
          if (dateOfBirth && !isValidDob(dateOfBirth)) return fail("invalid_dob");
          patch.dateOfBirth = dateOfBirth;
        }
        if ("gender" in b) {
          const gender = str(b["gender"], 20);
          if (!GENDERS.includes(gender)) return fail("invalid_gender");
          patch.gender = gender;
        }
        if ("language" in b) {
          const language = str(b["language"], 10);
          if (!LANGUAGES.includes(language)) return fail("invalid_language");
          patch.language = language;
        }
        if ("abhaId" in b) {
          const abhaId = str(b["abhaId"], 32);
          if (abhaId && !/^[A-Za-z0-9-]{4,32}$/.test(abhaId)) return fail("invalid_abha_id");
          patch.abhaId = abhaId;
        }
        if ("bloodGroup" in b) {
          const bloodGroup = str(b["bloodGroup"], 3);
          if (bloodGroup && !BLOOD_GROUPS.includes(bloodGroup)) return fail("invalid_blood_group");
          patch.bloodGroup = bloodGroup;
        }
        if ("emergencyContact" in b) {
          const rawContact = str(b["emergencyContact"], 32);
          const contact = rawContact ? normalizePhone(rawContact) : "";
          if (rawContact && !contact) return fail("invalid_emergency_contact");
          patch.emergencyContact = contact ?? "";
        }

        const db = await getDirectoryDb();
        const updated = await db.table("patients").update(auth.session.pid, {
          ...patch,
          updatedAt: new Date().toISOString(),
        });
        return updated ? json({ patient: publicPatient(updated) }) : fail("not_found", 404);
      },
    },
  },
});
