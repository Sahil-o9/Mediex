import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { UserRound, Save, CheckCircle2, Languages, ShieldCheck, LogOut } from "lucide-react";
import PatientShell from "@/components/PatientShell";
import { RequirePatient } from "@/components/RequirePatient";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "@/lib/router";
import type { Patient } from "@/types";

export const Route = createFileRoute("/patient/profile")({
  head: () => ({
    meta: [
      { title: "My Health Profile | Mediex" },
      {
        name: "description",
        content:
          "Keep your Mediex profile current: contact details, blood group, emergency contact, ABHA ID and preferred language for care.",
      },
      { property: "og:title", content: "My Health Profile | Mediex" },
      {
        property: "og:description",
        content: "Update your contact, blood group and emergency details.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <RequirePatient>{(patient) => <Profile patient={patient} />}</RequirePatient>,
});

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function Profile({ patient }: { patient: Patient }) {
  const { updatePatient, logoutPatient } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: patient.fullName,
    dateOfBirth: patient.dateOfBirth,
    gender: patient.gender,
    mobileNumber: patient.mobileNumber,
    email: patient.email ?? "",
    abhaId: patient.abhaId ?? "",
    bloodGroup: patient.bloodGroup ?? "",
    emergencyContact: patient.emergencyContact ?? "",
    language: patient.language,
  });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const set = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    setError("");
    if (form.fullName.trim().length < 3) return setError("Please enter your full name.");
    if (!/^\d{10}$/.test(form.mobileNumber.trim()))
      return setError("Mobile number must be exactly 10 digits.");
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim()))
      return setError("Please enter a valid email address or leave it blank.");
    if (form.emergencyContact && !/^\d{10}$/.test(form.emergencyContact.trim()))
      return setError("Emergency contact must be a 10-digit mobile number.");

    updatePatient({
      fullName: form.fullName.trim(),
      dateOfBirth: form.dateOfBirth,
      gender: form.gender,
      mobileNumber: form.mobileNumber.trim(),
      email: form.email.trim() || undefined,
      abhaId: form.abhaId.trim() || undefined,
      bloodGroup: form.bloodGroup || undefined,
      emergencyContact: form.emergencyContact.trim() || undefined,
      language: form.language as "hi" | "en",
    });
    setSaved(true);
  };

  const field =
    "mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-medical-400 focus:bg-white";
  const label = "text-xs font-semibold uppercase tracking-wide text-slate-500";

  return (
    <PatientShell title="Profile" subtitle="Your identity and care preferences on Mediex">
      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-gradient-to-br from-medical-600 to-medical-500 p-6 text-white shadow-lg shadow-medical-500/25"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
            <UserRound size={30} />
          </div>
          <h2 className="mt-4 text-xl font-bold">{patient.fullName}</h2>
          <p className="text-sm text-medical-50">Mediex ID {patient.patientId}</p>
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between gap-3 border-b border-white/15 pb-2">
              <dt className="text-medical-100">Mobile</dt>
              <dd className="font-semibold">{patient.mobileNumber}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-white/15 pb-2">
              <dt className="text-medical-100">Blood group</dt>
              <dd className="font-semibold">{patient.bloodGroup || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-white/15 pb-2">
              <dt className="text-medical-100">ABHA ID</dt>
              <dd className="font-semibold">{patient.abhaId || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-medical-100">Member since</dt>
              <dd className="font-semibold">{new Date(patient.createdAt).toLocaleDateString()}</dd>
            </div>
          </dl>
          <p className="mt-5 flex items-start gap-2 rounded-2xl bg-white/15 px-3 py-2.5 text-xs text-medical-50">
            <ShieldCheck size={15} className="mt-0.5 shrink-0" />
            Your details stay on this device in this demo build and are never shared.
          </p>
          <button
            onClick={() => {
              logoutPatient();
              navigate("/");
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white/15 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
          >
            <LogOut size={16} />
            Log out
          </button>
        </motion.section>

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 md:p-6">
          <h3 className="text-base font-bold text-slate-800">Edit your details</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className={label}>Full name</span>
              <input
                value={form.fullName}
                onChange={(e) => set("fullName", e.target.value)}
                className={field}
              />
            </label>
            <label className="block">
              <span className={label}>Date of birth</span>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => set("dateOfBirth", e.target.value)}
                className={field}
              />
            </label>
            <label className="block">
              <span className={label}>Gender</span>
              <select
                value={form.gender}
                onChange={(e) => set("gender", e.target.value)}
                className={field}
              >
                <option value="">Prefer not to say</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label className="block">
              <span className={label}>Mobile number</span>
              <input
                inputMode="numeric"
                maxLength={10}
                value={form.mobileNumber}
                onChange={(e) => set("mobileNumber", e.target.value.replace(/\D/g, ""))}
                className={field}
              />
            </label>
            <label className="block">
              <span className={label}>Email (optional)</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={field}
              />
            </label>
            <label className="block">
              <span className={label}>Blood group</span>
              <select
                value={form.bloodGroup}
                onChange={(e) => set("bloodGroup", e.target.value)}
                className={field}
              >
                <option value="">Not added</option>
                {bloodGroups.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={label}>Emergency contact</span>
              <input
                inputMode="numeric"
                maxLength={10}
                value={form.emergencyContact}
                onChange={(e) => set("emergencyContact", e.target.value.replace(/\D/g, ""))}
                className={field}
              />
            </label>
            <label className="block">
              <span className={label}>ABHA ID (optional)</span>
              <input
                value={form.abhaId}
                onChange={(e) => set("abhaId", e.target.value)}
                className={field}
              />
            </label>
            <label className="block">
              <span className={label}>
                <span className="inline-flex items-center gap-1.5">
                  <Languages size={13} />
                  Preferred language
                </span>
              </span>
              <select
                value={form.language}
                onChange={(e) => set("language", e.target.value)}
                className={field}
              >
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
              </select>
            </label>
          </div>

          {error && (
            <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-rose-100">
              {error}
            </p>
          )}
          {saved && (
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
              <CheckCircle2 size={14} />
              Profile updated successfully.
            </p>
          )}

          <button
            onClick={handleSave}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-medical-600 py-3 text-sm font-semibold text-white shadow-sm shadow-medical-500/30 transition hover:bg-medical-700"
          >
            <Save size={16} />
            Save changes
          </button>
        </section>
      </div>
    </PatientShell>
  );
}
