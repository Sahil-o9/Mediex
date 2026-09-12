import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "@/lib/router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Phone,
  Lock,
  Mail,
  User,
  Calendar,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Languages,
  AlertCircle,
} from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";
import Logo from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import type { Patient } from "@/types";

type Tab = "login" | "register";

interface RegisterForm {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  mobileNumber: string;
  email: string;
  abhaId: string;
  password: string;
  language: "hi" | "en";
  consent: boolean;
}

export default function PatientAuthPage() {
  const navigate = useNavigate();
  const { loginPatient, registerPatient } = useAuth();
  const { t, lang } = useLanguage();
  const [tab, setTab] = useState<Tab>("login");

  const registerSteps = [
    t.auth.stepBasic,
    t.auth.stepContact,
    t.auth.stepLanguage,
    t.auth.stepConsent,
  ];
  const genders: { code: string; label: string }[] = [
    { code: "Male", label: t.auth.male },
    { code: "Female", label: t.auth.female },
    { code: "Other", label: t.auth.other },
  ];
  const emptyForm: RegisterForm = {
    fullName: "",
    dateOfBirth: "",
    gender: "",
    mobileNumber: "",
    email: "",
    abhaId: "",
    password: "",
    language: lang === "en" ? "en" : "hi",
    consent: false,
  };

  // Login state
  const [loginMobile, setLoginMobile] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Register state
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<RegisterForm>(emptyForm);
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [successId, setSuccessId] = useState("");

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    if (!loginMobile.trim()) {
      setLoginError(t.auth.errMobile);
      return;
    }
    if (loginMobile.trim().length < 10) {
      setLoginError(t.auth.errMobileValid);
      return;
    }
    if (!loginPassword) {
      setLoginError(t.auth.errPassword);
      return;
    }
    setLoginLoading(true);
    setTimeout(() => {
      const res = loginPatient(loginMobile, loginPassword);
      setLoginLoading(false);
      if (!res.success) {
        setLoginError(
          res.error === "no-account"
            ? t.auth.errNoAccount
            : res.error === "wrong-password"
              ? t.auth.errWrongPassword
              : t.auth.errLoginFailed,
        );
        return;
      }
      navigate("/patient/home");
    }, 400);
  }

  function validateStep(s: number): string | null {
    if (s === 0) {
      if (!form.fullName.trim()) return t.auth.errName;
      if (!form.dateOfBirth) return t.auth.errDob;
      if (!form.gender) return t.auth.errGender;
    }
    if (s === 1) {
      if (!form.mobileNumber.trim()) return t.auth.errMobile;
      if (form.mobileNumber.trim().length < 10) return t.auth.errMobileValid;
      if (!form.password) return t.auth.errPasswordCreate;
      if (form.password.length < 6) return t.auth.errPasswordShort;
    }
    if (s === 3 && !form.consent) return t.auth.errConsent;
    return null;
  }

  function nextStep() {
    const err = validateStep(step);
    if (err) {
      setRegError(err);
      return;
    }
    setRegError("");
    if (step < registerSteps.length - 1) setStep(step + 1);
  }

  function prevStep() {
    setRegError("");
    if (step > 0) setStep(step - 1);
  }

  function handleRegister() {
    const err = validateStep(3);
    if (err) {
      setRegError(err);
      return;
    }
    setRegLoading(true);
    setRegError("");
    setTimeout(() => {
      const data: Omit<Patient, "patientId" | "createdAt"> = {
        fullName: form.fullName.trim(),
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        mobileNumber: form.mobileNumber.trim(),
        email: form.email.trim() || undefined,
        abhaId: form.abhaId.trim() || undefined,
        password: form.password,
        language: form.language,
        consent: form.consent,
      };
      const res = registerPatient(data);
      setRegLoading(false);
      if (!res.success) {
        setRegError(
          res.error === "mobile-exists" ? t.auth.errMobileExists : t.auth.errRegisterFailed,
        );
        return;
      }
      setSuccessId(res.patientId || "");
    }, 600);
  }

  function resetRegister() {
    setForm(emptyForm);
    setStep(0);
    setRegError("");
    setSuccessId("");
  }

  return (
    <AnimatedBackground>
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-5 md:px-12">
          <Link to="/">
            <Logo size="sm" />
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-full bg-white/60 px-4 py-2 text-sm font-medium text-slate-600 backdrop-blur-sm transition-colors hover:bg-white/80"
          >
            <ArrowLeft size={16} />
            {t.common.home}
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center px-6 pb-12">
          <div className="w-full max-w-lg">
            <AnimatePresence mode="wait">
              {successId ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-3xl bg-white p-8 text-center shadow-xl shadow-slate-200/50 ring-1 ring-slate-100 md:p-10"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                    className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-medical-100"
                  >
                    <Check size={40} className="text-medical-600" strokeWidth={3} />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-slate-800 md:text-3xl">
                    {t.auth.successTitle}
                  </h2>
                  <p className="mt-2 text-slate-500">{t.auth.successSubtitle}</p>
                  <div className="my-6 rounded-2xl bg-medical-50 py-4 ring-1 ring-medical-100">
                    <p className="text-sm font-medium text-medical-600">{t.auth.yourPatientId}</p>
                    <p className="text-3xl font-bold tracking-wider text-medical-800">
                      {successId}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/patient/home")}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-medical-600 py-4 text-lg font-semibold text-white shadow-lg shadow-medical-500/30 transition-colors hover:bg-medical-700"
                  >
                    {t.auth.continueHome}
                    <ArrowRight size={20} />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="auth"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/50 ring-1 ring-slate-100 md:p-8"
                >
                  <h1 className="text-center text-2xl font-bold text-slate-800 md:text-3xl">
                    {tab === "login" ? t.auth.loginTitle : t.auth.registerTitle}
                  </h1>
                  <p className="mt-1 text-center text-slate-500">
                    {tab === "login" ? t.auth.loginSubtitle : t.auth.registerSubtitle}
                  </p>

                  {/* Tabs */}
                  <div className="mt-6 flex gap-1 rounded-2xl bg-slate-100 p-1.5">
                    {(["login", "register"] as Tab[]).map((tabKey) => (
                      <button
                        key={tabKey}
                        onClick={() => {
                          setTab(tabKey);
                          setLoginError("");
                          setRegError("");
                        }}
                        className="relative flex-1 rounded-xl py-3 text-base font-semibold transition-colors"
                      >
                        {tab === tabKey && (
                          <motion.div
                            layoutId="authTab"
                            className="absolute inset-0 rounded-xl bg-white shadow-sm"
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          />
                        )}
                        <span
                          className={`relative ${tab === tabKey ? "text-medical-700" : "text-slate-500"}`}
                        >
                          {tabKey === "login" ? t.auth.tabLogin : t.auth.tabRegister}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-6">
                    <AnimatePresence mode="wait">
                      {tab === "login" ? (
                        <motion.form
                          key="login"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          onSubmit={handleLogin}
                          className="space-y-4"
                        >
                          <Field label={t.auth.mobile} icon={<Phone size={20} />}>
                            <input
                              type="tel"
                              inputMode="numeric"
                              placeholder={t.auth.mobilePh}
                              value={loginMobile}
                              onChange={(e) =>
                                setLoginMobile(e.target.value.replace(/[^0-9]/g, ""))
                              }
                              maxLength={10}
                              className="w-full bg-transparent text-lg text-slate-800 outline-none placeholder:text-slate-400"
                            />
                          </Field>
                          <Field label={t.auth.password} icon={<Lock size={20} />}>
                            <input
                              type="password"
                              placeholder={t.auth.passwordPh}
                              value={loginPassword}
                              onChange={(e) => setLoginPassword(e.target.value)}
                              className="w-full bg-transparent text-lg text-slate-800 outline-none placeholder:text-slate-400"
                            />
                          </Field>
                          {loginError && <ErrorBanner message={loginError} />}
                          <button
                            type="submit"
                            disabled={loginLoading}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-medical-600 py-4 text-lg font-semibold text-white shadow-lg shadow-medical-500/30 transition-colors hover:bg-medical-700 disabled:opacity-60"
                          >
                            {loginLoading ? t.auth.signingIn : t.auth.signIn}
                            {!loginLoading && <ArrowRight size={20} />}
                          </button>
                          <p className="text-center text-sm text-slate-500">
                            {t.auth.noAccount}{" "}
                            <button
                              type="button"
                              onClick={() => setTab("register")}
                              className="font-semibold text-medical-600 hover:underline"
                            >
                              {t.auth.registerHere}
                            </button>
                          </p>
                        </motion.form>
                      ) : (
                        <motion.div
                          key="register"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="space-y-5"
                        >
                          {/* Step indicator */}
                          <div className="flex items-center justify-between">
                            {registerSteps.map((label, i) => (
                              <div key={label} className="flex flex-1 items-center">
                                <div className="flex flex-col items-center gap-1.5">
                                  <div
                                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all ${
                                      i < step
                                        ? "bg-medical-600 text-white"
                                        : i === step
                                          ? "bg-medical-100 text-medical-700 ring-2 ring-medical-500"
                                          : "bg-slate-100 text-slate-400"
                                    }`}
                                  >
                                    {i < step ? <Check size={16} /> : i + 1}
                                  </div>
                                  <span
                                    className={`hidden text-xs font-medium sm:block ${i <= step ? "text-slate-700" : "text-slate-400"}`}
                                  >
                                    {label}
                                  </span>
                                </div>
                                {i < registerSteps.length - 1 && (
                                  <div
                                    className={`mx-1 h-0.5 flex-1 rounded-full transition-all ${i < step ? "bg-medical-500" : "bg-slate-200"}`}
                                  />
                                )}
                              </div>
                            ))}
                          </div>

                          <AnimatePresence mode="wait">
                            {/* Step 1 — Basic Info */}
                            {step === 0 && (
                              <motion.div
                                key="s0"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-4"
                              >
                                <Field label={t.auth.fullName} icon={<User size={20} />}>
                                  <input
                                    type="text"
                                    placeholder={t.auth.fullNamePh}
                                    value={form.fullName}
                                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                                    className="w-full bg-transparent text-lg text-slate-800 outline-none placeholder:text-slate-400"
                                  />
                                </Field>
                                <Field label={t.auth.dob} icon={<Calendar size={20} />}>
                                  <input
                                    type="date"
                                    value={form.dateOfBirth}
                                    onChange={(e) =>
                                      setForm({ ...form, dateOfBirth: e.target.value })
                                    }
                                    max={new Date().toISOString().split("T")[0]}
                                    className="w-full bg-transparent text-lg text-slate-800 outline-none placeholder:text-slate-400"
                                  />
                                </Field>
                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-slate-600">
                                    {t.auth.gender}
                                  </label>
                                  <div className="flex gap-3">
                                    {genders.map((g) => (
                                      <button
                                        key={g.code}
                                        type="button"
                                        onClick={() => setForm({ ...form, gender: g.code })}
                                        className={`flex-1 rounded-2xl py-3 text-base font-semibold transition-all ${
                                          form.gender === g.code
                                            ? "bg-medical-600 text-white shadow-lg shadow-medical-500/30"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        }`}
                                      >
                                        {g.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </motion.div>
                            )}

                            {/* Step 2 — Contact */}
                            {step === 1 && (
                              <motion.div
                                key="s1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-4"
                              >
                                <Field label={t.auth.mobile} icon={<Phone size={20} />}>
                                  <input
                                    type="tel"
                                    inputMode="numeric"
                                    placeholder={t.auth.mobilePhShort}
                                    value={form.mobileNumber}
                                    onChange={(e) =>
                                      setForm({
                                        ...form,
                                        mobileNumber: e.target.value.replace(/[^0-9]/g, ""),
                                      })
                                    }
                                    maxLength={10}
                                    className="w-full bg-transparent text-lg text-slate-800 outline-none placeholder:text-slate-400"
                                  />
                                </Field>
                                <Field label={t.auth.email} icon={<Mail size={20} />}>
                                  <input
                                    type="email"
                                    placeholder={t.auth.emailPh}
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className="w-full bg-transparent text-lg text-slate-800 outline-none placeholder:text-slate-400"
                                  />
                                </Field>
                                <Field label={t.auth.abha} icon={<ShieldCheck size={20} />}>
                                  <input
                                    type="text"
                                    placeholder={t.auth.abhaPh}
                                    value={form.abhaId}
                                    onChange={(e) => setForm({ ...form, abhaId: e.target.value })}
                                    className="w-full bg-transparent text-lg text-slate-800 outline-none placeholder:text-slate-400"
                                  />
                                </Field>
                                <Field label={t.auth.password} icon={<Lock size={20} />}>
                                  <input
                                    type="password"
                                    placeholder={t.auth.createPasswordPh}
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    className="w-full bg-transparent text-lg text-slate-800 outline-none placeholder:text-slate-400"
                                  />
                                </Field>
                              </motion.div>
                            )}

                            {/* Step 3 — Language */}
                            {step === 2 && (
                              <motion.div
                                key="s2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-4"
                              >
                                <div className="mb-2 flex items-center gap-2 text-slate-600">
                                  <Languages size={20} className="text-medical-600" />
                                  <span className="font-semibold">{t.auth.chooseLanguage}</span>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  {[
                                    { code: "hi" as const, label: "हिन्दी", sub: "Hindi" },
                                    { code: "en" as const, label: "English", sub: "English" },
                                  ].map((langOpt) => (
                                    <button
                                      key={langOpt.code}
                                      type="button"
                                      onClick={() => setForm({ ...form, language: langOpt.code })}
                                      className={`flex flex-col items-center gap-1 rounded-2xl py-6 transition-all ${
                                        form.language === langOpt.code
                                          ? "bg-medical-600 text-white shadow-lg shadow-medical-500/30"
                                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                      }`}
                                    >
                                      <span className="text-2xl font-bold">{langOpt.label}</span>
                                      <span
                                        className={`text-sm ${form.language === langOpt.code ? "text-medical-100" : "text-slate-400"}`}
                                      >
                                        {langOpt.sub}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}

                            {/* Step 4 — Consent */}
                            {step === 3 && (
                              <motion.div
                                key="s3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-4"
                              >
                                <div className="rounded-2xl bg-medical-50 p-5 ring-1 ring-medical-100">
                                  <div className="mb-3 flex items-center gap-2">
                                    <ShieldCheck size={22} className="text-medical-600" />
                                    <span className="font-semibold text-medical-800">
                                      {t.auth.consentTitle}
                                    </span>
                                  </div>
                                  <p className="text-sm leading-relaxed text-slate-600">
                                    {t.auth.consentBody}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setForm({ ...form, consent: !form.consent })}
                                  className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 transition-all ${
                                    form.consent
                                      ? "border-medical-500 bg-medical-50"
                                      : "border-slate-200 bg-white hover:border-slate-300"
                                  }`}
                                >
                                  <div
                                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all ${
                                      form.consent
                                        ? "bg-medical-600 text-white"
                                        : "bg-slate-200 text-transparent"
                                    }`}
                                  >
                                    <Check size={18} strokeWidth={3} />
                                  </div>
                                  <span className="text-left text-base font-medium text-slate-700">
                                    {t.auth.consentCheck}
                                  </span>
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {regError && <ErrorBanner message={regError} />}

                          {/* Navigation */}
                          <div className="flex gap-3 pt-2">
                            {step > 0 ? (
                              <button
                                type="button"
                                onClick={prevStep}
                                className="flex items-center gap-1.5 rounded-2xl bg-slate-100 px-6 py-4 text-base font-semibold text-slate-600 transition-colors hover:bg-slate-200"
                              >
                                <ChevronLeft size={20} />
                                {t.common.back}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={resetRegister}
                                className="flex items-center gap-1.5 rounded-2xl bg-slate-100 px-6 py-4 text-base font-semibold text-slate-600 transition-colors hover:bg-slate-200"
                              >
                                {t.common.reset}
                              </button>
                            )}
                            {step < registerSteps.length - 1 ? (
                              <button
                                type="button"
                                onClick={nextStep}
                                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-medical-600 py-4 text-base font-semibold text-white shadow-lg shadow-medical-500/30 transition-colors hover:bg-medical-700"
                              >
                                {t.common.next}
                                <ChevronRight size={20} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={handleRegister}
                                disabled={regLoading}
                                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-medical-600 py-4 text-base font-semibold text-white shadow-lg shadow-medical-500/30 transition-colors hover:bg-medical-700 disabled:opacity-60"
                              >
                                {regLoading ? t.auth.creatingAccount : t.auth.completeRegistration}
                                {!regLoading && <Check size={20} />}
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </AnimatedBackground>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-600">{label}</label>
      <div className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3.5 transition-colors focus-within:border-medical-500 focus-within:ring-2 focus-within:ring-medical-100">
        <span className="text-slate-400">{icon}</span>
        {children}
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 ring-1 ring-red-100"
    >
      <AlertCircle size={18} className="shrink-0" />
      {message}
    </motion.div>
  );
}
