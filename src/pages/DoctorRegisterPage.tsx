import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "@/lib/router";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Lock, Stethoscope } from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";
import Logo from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, errorText } from "@/lib/mediex/http";
import { SPECIALTIES, isSpecialtyId } from "@/types/directory";

type RegistrationForm = Record<
  | "fullName"
  | "phone"
  | "email"
  | "password"
  | "qualifications"
  | "registrationNumber"
  | "registrationCouncil"
  | "specialty"
  | "experienceYears"
  | "consultationFee"
  | "bio"
  | "clinicKind"
  | "clinicName"
  | "addressLine"
  | "city"
  | "state"
  | "pincode"
  | "clinicPhone",
  string
>;

const initialForm: RegistrationForm = {
  fullName: "",
  phone: "",
  email: "",
  password: "",
  qualifications: "",
  registrationNumber: "",
  registrationCouncil: "",
  specialty: "general_medicine",
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

export default function DoctorRegisterPage() {
  const navigate = useNavigate();
  const { registerDoctor } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ doctorId: string; profileSaved: boolean } | null>(null);
  const [error, setError] = useState("");

  function setField(key: keyof RegistrationForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!isSpecialtyId(form.specialty)) {
      setError("Choose a valid specialization.");
      return;
    }

    setLoading(true);
    const registration = await registerDoctor({
      fullName: form.fullName,
      phone: form.phone,
      email: form.email,
      password: form.password,
      qualifications: form.qualifications,
      registrationNumber: form.registrationNumber,
      registrationCouncil: form.registrationCouncil,
    });
    if (!registration.success) {
      setLoading(false);
      setError(errorText(registration.error));
      return;
    }

    const profile = await apiFetch("/api/doctor/profile", {
      method: "PUT",
      body: {
        fullName: form.fullName,
        phone: form.phone,
        qualifications: form.qualifications,
        registrationNumber: form.registrationNumber,
        registrationCouncil: form.registrationCouncil,
        specialties: [form.specialty],
        experienceYears: form.experienceYears ? Number(form.experienceYears) : null,
        consultationFee: form.consultationFee ? Number(form.consultationFee) : null,
        bio: form.bio,
        clinic: {
          name: form.clinicName,
          kind: form.clinicKind === "hospital" ? "hospital" : "clinic",
          addressLine: form.addressLine,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
          lat: null,
          lng: null,
          phone: form.clinicPhone,
        },
      },
    });
    setLoading(false);
    if (!registration.doctorId) {
      setError(
        "Your account was created, but the server did not return its doctor ID. Continue to your dashboard to review your profile.",
      );
      setCreated({ doctorId: "", profileSaved: profile.ok });
      return;
    }
    setCreated({ doctorId: registration.doctorId, profileSaved: profile.ok });
    if (!profile.ok)
      setError(
        `Your account was created. ${errorText(profile.error)} Finish your profile in the dashboard.`,
      );
  }

  if (created) {
    return (
      <AnimatedBackground>
        <div className="flex min-h-screen flex-col">
          <header className="px-6 py-5 md:px-12">
            <Logo size="sm" />
          </header>
          <main className="flex flex-1 items-center justify-center px-6 pb-12">
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-100 md:p-10"
            >
              <CheckCircle2 className="mb-4 text-emerald-600" size={40} />
              <h1 className="text-2xl font-bold text-slate-800">Doctor account created</h1>
              <p className="mt-2 text-slate-600">
                Keep this doctor ID. Use it with the password you chose to sign in.
              </p>
              <div className="my-5 rounded-xl bg-slate-50 p-4">
                <span className="text-sm text-slate-500">Doctor ID</span>
                <p className="font-mono text-xl font-bold text-medical-700">
                  {created.doctorId || "Available in your doctor dashboard"}
                </p>
              </div>
              {created.profileSaved ? (
                <p className="mb-5 text-sm text-amber-700">
                  Your profile and clinic are saved and awaiting admin verification.
                </p>
              ) : (
                <div className="mb-5 flex gap-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <span>{error || "Your profile still needs to be completed."}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => navigate("/doctor/dashboard")}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-medical-600 px-5 py-3 font-semibold text-white hover:bg-medical-700"
              >
                Continue to doctor dashboard <ArrowRight size={18} />
              </button>
            </motion.section>
          </main>
        </div>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground>
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-5 md:px-12">
          <Link to="/">
            <Logo size="sm" />
          </Link>
          <Link
            to="/doctor/login"
            className="flex items-center gap-1.5 rounded-full bg-white/70 px-4 py-2 text-sm font-medium text-slate-600"
          >
            <ArrowLeft size={16} /> Doctor sign in
          </Link>
        </header>

        <main className="flex flex-1 justify-center px-4 pb-12">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-100 md:p-10"
          >
            <div className="mb-8">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-medical-50 text-medical-700">
                <Stethoscope size={28} />
              </div>
              <h1 className="text-3xl font-bold text-slate-800">Create a doctor account</h1>
              <p className="mt-2 text-slate-500">
                Add your professional details and clinic or hospital. New profiles remain pending
                until reviewed by an administrator.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <section>
                <h2 className="mb-4 text-lg font-semibold text-slate-800">Account details</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    Full name
                    <input
                      className={inputClass}
                      required
                      minLength={3}
                      maxLength={100}
                      autoComplete="name"
                      value={form.fullName}
                      onChange={(e) => setField("fullName", e.target.value)}
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    Mobile number
                    <input
                      className={inputClass}
                      required
                      type="tel"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(e) => setField("phone", e.target.value)}
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
                    Email
                    <input
                      className={inputClass}
                      required
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => setField("email", e.target.value)}
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
                    Password
                    <div className="relative">
                      <Lock
                        size={17}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        className={`${inputClass} pl-10`}
                        required
                        type="password"
                        minLength={8}
                        autoComplete="new-password"
                        value={form.password}
                        onChange={(e) => setField("password", e.target.value)}
                      />
                    </div>
                    <span className="block font-normal text-slate-500">
                      At least 8 characters, including a letter and a number.
                    </span>
                  </label>
                </div>
              </section>

              <section>
                <h2 className="mb-4 text-lg font-semibold text-slate-800">Professional details</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
                    Qualifications
                    <input
                      className={inputClass}
                      required
                      minLength={2}
                      maxLength={200}
                      placeholder="e.g. MBBS, MD"
                      value={form.qualifications}
                      onChange={(e) => setField("qualifications", e.target.value)}
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    Medical registration number
                    <input
                      className={inputClass}
                      required
                      minLength={3}
                      maxLength={40}
                      value={form.registrationNumber}
                      onChange={(e) => setField("registrationNumber", e.target.value)}
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    Registration council
                    <input
                      className={inputClass}
                      required
                      minLength={3}
                      maxLength={120}
                      placeholder="e.g. State Medical Council"
                      value={form.registrationCouncil}
                      onChange={(e) => setField("registrationCouncil", e.target.value)}
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    Specialization
                    <select
                      className={inputClass}
                      value={form.specialty}
                      onChange={(e) => setField("specialty", e.target.value)}
                    >
                      {SPECIALTIES.map((specialty) => (
                        <option key={specialty.id} value={specialty.id}>
                          {specialty.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    Experience (years)
                    <input
                      className={inputClass}
                      type="number"
                      min={0}
                      max={70}
                      value={form.experienceYears}
                      onChange={(e) => setField("experienceYears", e.target.value)}
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    Consultation fee (INR)
                    <input
                      className={inputClass}
                      type="number"
                      min={0}
                      max={100000}
                      value={form.consultationFee}
                      onChange={(e) => setField("consultationFee", e.target.value)}
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
                    Professional summary
                    <textarea
                      className={`${inputClass} min-h-24`}
                      maxLength={600}
                      value={form.bio}
                      onChange={(e) => setField("bio", e.target.value)}
                    />
                  </label>
                </div>
              </section>

              <section>
                <h2 className="mb-4 text-lg font-semibold text-slate-800">Clinic or hospital</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    Practice type
                    <select
                      className={inputClass}
                      value={form.clinicKind}
                      onChange={(e) => setField("clinicKind", e.target.value)}
                    >
                      <option value="clinic">Clinic</option>
                      <option value="hospital">Hospital</option>
                    </select>
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    {form.clinicKind === "hospital" ? "Hospital name" : "Clinic name"}
                    <input
                      className={inputClass}
                      required
                      maxLength={120}
                      value={form.clinicName}
                      onChange={(e) => setField("clinicName", e.target.value)}
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
                    Street address
                    <input
                      className={inputClass}
                      required
                      maxLength={200}
                      autoComplete="street-address"
                      value={form.addressLine}
                      onChange={(e) => setField("addressLine", e.target.value)}
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    City
                    <input
                      className={inputClass}
                      required
                      maxLength={60}
                      autoComplete="address-level2"
                      value={form.city}
                      onChange={(e) => setField("city", e.target.value)}
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    State
                    <input
                      className={inputClass}
                      maxLength={60}
                      autoComplete="address-level1"
                      value={form.state}
                      onChange={(e) => setField("state", e.target.value)}
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    PIN code
                    <input
                      className={inputClass}
                      maxLength={10}
                      autoComplete="postal-code"
                      value={form.pincode}
                      onChange={(e) => setField("pincode", e.target.value)}
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    Clinic phone (optional)
                    <input
                      className={inputClass}
                      type="tel"
                      value={form.clinicPhone}
                      onChange={(e) => setField("clinicPhone", e.target.value)}
                    />
                  </label>
                </div>
              </section>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700"
                >
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-medical-600 px-5 py-3.5 font-semibold text-white hover:bg-medical-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating account..." : "Create doctor account"}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>
          </motion.section>
        </main>
      </div>
    </AnimatedBackground>
  );
}
