import { useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, LogOut, Save, Stethoscope } from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";
import LanguageSelector from "@/components/LanguageSelector";
import Logo from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, errorText } from "@/lib/mediex/http";
import type { Clinic, DoctorPrivateFields, DoctorProfile, SpecialtyId } from "@/types/directory";
import { isSpecialtyId, SPECIALTIES } from "@/types/directory";
import { useNavigate } from "@/lib/router";

interface DoctorProfilePayload {
  profile: DoctorProfile;
  private: DoctorPrivateFields & { email: string; handle: string };
  missing: string[];
  staff: boolean;
}

interface ProfileDraft {
  fullName: string;
  phone: string;
  qualifications: string;
  registrationNumber: string;
  registrationCouncil: string;
  specialties: SpecialtyId[];
  conditions: string;
  languages: string;
  experienceYears: string;
  consultationFee: string;
  bio: string;
  clinicKind: Clinic["kind"];
  clinicName: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  clinicPhone: string;
}

const emptyDraft: ProfileDraft = {
  fullName: "",
  phone: "",
  qualifications: "",
  registrationNumber: "",
  registrationCouncil: "",
  specialties: [],
  conditions: "",
  languages: "",
  experienceYears: "",
  consultationFee: "",
  bio: "",
  clinicKind: "clinic",
  clinicName: "",
  addressLine: "",
  city: "",
  state: "",
  pincode: "",
  clinicPhone: "",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-medical-500 focus:ring-2 focus:ring-medical-500/20";

function draftFromProfile(data: DoctorProfilePayload): ProfileDraft {
  const { profile, private: privateFields } = data;
  const clinic = profile.clinic;
  return {
    fullName: profile.fullName,
    phone: privateFields.phone,
    qualifications: profile.qualifications,
    registrationNumber: privateFields.registrationNumber,
    registrationCouncil: privateFields.registrationCouncil,
    specialties: profile.specialties,
    conditions: profile.conditions.join(", "),
    languages: profile.languages.join(", "),
    experienceYears: profile.experienceYears === null ? "" : String(profile.experienceYears),
    consultationFee: profile.consultationFee === null ? "" : String(profile.consultationFee),
    bio: profile.bio,
    clinicKind: clinic?.kind ?? "clinic",
    clinicName: clinic?.name ?? "",
    addressLine: clinic?.addressLine ?? "",
    city: clinic?.city ?? "",
    state: clinic?.state ?? "",
    pincode: clinic?.pincode ?? "",
    clinicPhone: clinic?.phone ?? "",
  };
}

function csvValues(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function DoctorDashboardPage() {
  const navigate = useNavigate();
  const { doctor, logoutDoctor, refresh } = useAuth();
  const [profile, setProfile] = useState<DoctorProfilePayload | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    void apiFetch<DoctorProfilePayload>("/api/doctor/profile").then((result) => {
      if (!active) return;
      if (result.ok && result.data) {
        setProfile(result.data);
        setDraft(draftFromProfile(result.data));
      } else {
        setError(errorText(result.error));
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  function setTextField(
    key: Exclude<keyof ProfileDraft, "specialties" | "clinicKind">,
    value: string,
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  function toggleSpecialty(id: SpecialtyId) {
    setDraft((current) => {
      const selected = current.specialties.includes(id);
      if (!selected && current.specialties.length >= 4) {
        setError("Choose no more than four specializations.");
        return current;
      }
      setError("");
      return {
        ...current,
        specialties: selected
          ? current.specialties.filter((specialty) => specialty !== id)
          : [...current.specialties, id],
      };
    });
    setSaved(false);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);
    if (draft.specialties.length === 0 || !draft.specialties.every(isSpecialtyId)) {
      setError("Choose at least one valid specialization.");
      return;
    }

    setSaving(true);
    const result = await apiFetch<{ profile: DoctorProfile; missing: string[] }>(
      "/api/doctor/profile",
      {
        method: "PUT",
        body: {
          fullName: draft.fullName,
          phone: draft.phone,
          qualifications: draft.qualifications,
          registrationNumber: draft.registrationNumber,
          registrationCouncil: draft.registrationCouncil,
          specialties: draft.specialties,
          conditions: csvValues(draft.conditions),
          languages: csvValues(draft.languages),
          experienceYears: draft.experienceYears ? Number(draft.experienceYears) : null,
          consultationFee: draft.consultationFee ? Number(draft.consultationFee) : null,
          bio: draft.bio,
          clinic: {
            name: draft.clinicName,
            kind: draft.clinicKind,
            addressLine: draft.addressLine,
            city: draft.city,
            state: draft.state,
            pincode: draft.pincode,
            lat: null,
            lng: null,
            phone: draft.clinicPhone,
          },
        },
      },
    );
    setSaving(false);
    if (!result.ok || !result.data) {
      setError(errorText(result.error));
      return;
    }
    const data = result.data;

    setProfile((current) =>
      current
        ? {
            ...current,
            profile: data.profile,
            private: { ...current.private, phone: draft.phone },
            missing: data.missing,
          }
        : current,
    );
    await refresh();
    setSaved(true);
  }

  async function handleLogout() {
    await logoutDoctor();
    navigate("/");
  }

  if (!doctor) return null;

  return (
    <AnimatedBackground>
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-5 md:px-12">
          <Logo size="sm" />
          <div className="flex items-center gap-3">
            <LanguageSelector compact />
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-full bg-white/70 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white"
            >
              <LogOut size={16} /> Log out
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-12 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
          >
            <div>
              <h1 className="text-3xl font-bold text-slate-800 md:text-4xl">Doctor dashboard</h1>
              <p className="mt-2 text-slate-600">
                Welcome, {doctor.name}. Manage your professional profile.
              </p>
            </div>
            <div className="rounded-xl bg-white/80 px-4 py-3 text-sm shadow-sm">
              <span className="text-slate-500">Doctor ID </span>
              <span className="font-mono font-semibold text-medical-700">{doctor.doctorId}</span>
            </div>
          </motion.div>

          {profile && (
            <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <span className="font-medium text-slate-700">Verification status:</span>
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  profile.profile.verificationStatus === "verified"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {profile.profile.verificationStatus}
              </span>
              {profile.profile.verificationStatus !== "verified" && (
                <span className="text-sm text-slate-500">
                  Your registration details require administrator review before your listing is
                  verified.
                </span>
              )}
            </div>
          )}

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 md:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-medical-50 text-medical-700">
                <Stethoscope size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Professional profile</h2>
                <p className="text-sm text-slate-500">
                  Changes to registration credentials return verification to pending review.
                </p>
              </div>
            </div>

            {loading ? (
              <p className="py-8 text-center text-slate-500">Loading your profile...</p>
            ) : !profile ? (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700"
              >
                <AlertCircle size={18} /> {error || "Could not load your doctor profile."}
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-7">
                <section>
                  <h3 className="mb-4 font-semibold text-slate-800">Contact and credentials</h3>
                  <p className="mb-4 text-sm text-slate-500">
                    Account email: {profile.private.email}
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5 text-sm font-medium text-slate-700">
                      Full name
                      <input
                        className={inputClass}
                        required
                        minLength={3}
                        maxLength={100}
                        value={draft.fullName}
                        onChange={(e) => setTextField("fullName", e.target.value)}
                      />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium text-slate-700">
                      Mobile number
                      <input
                        className={inputClass}
                        required
                        type="tel"
                        value={draft.phone}
                        onChange={(e) => setTextField("phone", e.target.value)}
                      />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
                      Qualifications
                      <input
                        className={inputClass}
                        required
                        minLength={2}
                        maxLength={200}
                        value={draft.qualifications}
                        onChange={(e) => setTextField("qualifications", e.target.value)}
                      />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium text-slate-700">
                      Medical registration number
                      <input
                        className={inputClass}
                        required
                        minLength={3}
                        maxLength={40}
                        value={draft.registrationNumber}
                        onChange={(e) => setTextField("registrationNumber", e.target.value)}
                      />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium text-slate-700">
                      Registration council
                      <input
                        className={inputClass}
                        required
                        minLength={3}
                        maxLength={120}
                        value={draft.registrationCouncil}
                        onChange={(e) => setTextField("registrationCouncil", e.target.value)}
                      />
                    </label>
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 font-semibold text-slate-800">
                    Specializations and experience
                  </h3>
                  <p className="mb-3 text-sm text-slate-500">
                    Choose up to four areas of practice.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {SPECIALTIES.map((specialty) => (
                      <label
                        key={specialty.id}
                        className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={draft.specialties.includes(specialty.id)}
                          onChange={() => toggleSpecialty(specialty.id)}
                          className="accent-medical-600"
                        />
                        {specialty.name}
                      </label>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5 text-sm font-medium text-slate-700">
                      Experience (years)
                      <input
                        className={inputClass}
                        type="number"
                        min={0}
                        max={70}
                        value={draft.experienceYears}
                        onChange={(e) => setTextField("experienceYears", e.target.value)}
                      />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium text-slate-700">
                      Consultation fee (INR)
                      <input
                        className={inputClass}
                        type="number"
                        min={0}
                        max={100000}
                        value={draft.consultationFee}
                        onChange={(e) => setTextField("consultationFee", e.target.value)}
                      />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium text-slate-700">
                      Languages (comma separated)
                      <input
                        className={inputClass}
                        value={draft.languages}
                        onChange={(e) => setTextField("languages", e.target.value)}
                      />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium text-slate-700">
                      Skills / conditions treated (comma separated)
                      <input
                        className={inputClass}
                        value={draft.conditions}
                        onChange={(e) => setTextField("conditions", e.target.value)}
                      />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
                      Professional summary
                      <textarea
                        className={`${inputClass} min-h-24`}
                        maxLength={600}
                        value={draft.bio}
                        onChange={(e) => setTextField("bio", e.target.value)}
                      />
                    </label>
                  </div>
                </section>

                <section>
                  <h3 className="mb-4 font-semibold text-slate-800">Practice location</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5 text-sm font-medium text-slate-700">
                      Practice type
                      <select
                        className={inputClass}
                        value={draft.clinicKind}
                        onChange={(e) => {
                          setDraft((current) => ({
                            ...current,
                            clinicKind: e.target.value === "hospital" ? "hospital" : "clinic",
                          }));
                          setSaved(false);
                        }}
                      >
                        <option value="clinic">Clinic</option>
                        <option value="hospital">Hospital</option>
                      </select>
                    </label>
                    <label className="space-y-1.5 text-sm font-medium text-slate-700">
                      {draft.clinicKind === "hospital" ? "Hospital name" : "Clinic name"}
                      <input
                        className={inputClass}
                        required
                        maxLength={120}
                        value={draft.clinicName}
                        onChange={(e) => setTextField("clinicName", e.target.value)}
                      />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
                      Street address
                      <input
                        className={inputClass}
                        required
                        maxLength={200}
                        value={draft.addressLine}
                        onChange={(e) => setTextField("addressLine", e.target.value)}
                      />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium text-slate-700">
                      City
                      <input
                        className={inputClass}
                        required
                        maxLength={60}
                        value={draft.city}
                        onChange={(e) => setTextField("city", e.target.value)}
                      />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium text-slate-700">
                      State
                      <input
                        className={inputClass}
                        maxLength={60}
                        value={draft.state}
                        onChange={(e) => setTextField("state", e.target.value)}
                      />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium text-slate-700">
                      PIN code
                      <input
                        className={inputClass}
                        maxLength={10}
                        value={draft.pincode}
                        onChange={(e) => setTextField("pincode", e.target.value)}
                      />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium text-slate-700">
                      Clinic phone
                      <input
                        className={inputClass}
                        type="tel"
                        value={draft.clinicPhone}
                        onChange={(e) => setTextField("clinicPhone", e.target.value)}
                      />
                    </label>
                  </div>
                </section>

                {profile.missing.length > 0 && (
                  <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                    To accept appointments, also add: {profile.missing.join(", ")}.
                  </p>
                )}
                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700"
                  >
                    <AlertCircle size={18} className="mt-0.5 shrink-0" /> {error}
                  </div>
                )}
                {saved && (
                  <p
                    role="status"
                    className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
                  >
                    <CheckCircle2 size={18} /> Profile saved.
                  </p>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-medical-600 px-5 py-3.5 font-semibold text-white hover:bg-medical-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={18} /> {saving ? "Saving profile..." : "Save profile"}
                </button>
              </form>
            )}
          </section>
        </main>
      </div>
    </AnimatedBackground>
  );
}
