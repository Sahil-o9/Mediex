import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Bot,
  Info,
  Loader2,
  Phone,
  RotateCcw,
  Send,
  Siren,
  Stethoscope,
  User,
  Hospital,
} from "lucide-react";
import PatientShell from "@/components/PatientShell";
import { RequirePatient } from "@/components/RequirePatient";
import { DoctorCard } from "@/components/discovery/DoctorCard";
import { LocationPicker, type PatientLocation } from "@/components/discovery/LocationPicker";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { DISCOVERY } from "@/lib/i18n/discovery";
import { apiFetch, errorText } from "@/lib/mediex/http";
import { specialtyDisplayName, type TriageResult } from "@/lib/mediex/triage";
import type { DoctorMatch } from "@/types/directory";

export const Route = createFileRoute("/patient/find-doctor")({
  head: () => ({
    meta: [
      { title: "Find the Right Specialist | Mediex" },
      {
        name: "description",
        content:
          "Describe your symptoms, get a suggested type of specialist (not a diagnosis), and see nearby available doctors you can book.",
      },
    ],
  }),
  component: () => <RequirePatient>{() => <FindDoctor />}</RequirePatient>,
});

interface Msg {
  id: number;
  role: "user" | "assistant";
  text: string;
  tone?: "emergency";
}

interface TriageResponse {
  triage: TriageResult;
  matches: DoctorMatch[];
  directorySize: number;
  locationUsed?: boolean;
  searchError?: boolean;
}

function FindDoctor() {
  const { lang } = useLanguage();
  const { config } = useAuth();
  const t = DISCOVERY[lang];
  const [messages, setMessages] = useState<Msg[]>([{ id: 0, role: "assistant", text: t.intro }]);
  const [userTexts, setUserTexts] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [location, setLocation] = useState<PatientLocation | null>(null);
  const [result, setResult] = useState<TriageResponse | null>(null);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  const emergency = result?.triage.status === "emergency";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy, result]);

  // Keep the greeting in the selected language until the conversation starts.
  useEffect(() => {
    setMessages((m) => (m.length === 1 ? [{ id: 0, role: "assistant", text: t.intro }] : m));
  }, [t.intro]);

  async function run(texts: string[], loc: PatientLocation | null, silent = false) {
    if (!silent) setBusy(true);
    setError("");
    const r = await apiFetch<TriageResponse>("/api/triage", {
      method: "POST",
      body: { messages: texts, lang, ...(loc ? { location: { lat: loc.lat, lng: loc.lng } } : {}) },
    });
    if (!silent) setBusy(false);
    if (!r.ok || !r.data) {
      setError(errorText(r.error));
      return;
    }
    const data = r.data;
    setResult(data);
    if (!silent) {
      setMessages((m) => [
        ...m,
        {
          id: nextId.current++,
          role: "assistant",
          text: data.triage.reply,
          ...(data.triage.status === "emergency" ? { tone: "emergency" as const } : {}),
        },
      ]);
    }
  }

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || busy || emergency) return;
    setInput("");
    const texts = [...userTexts, text];
    setUserTexts(texts);
    setMessages((m) => [...m, { id: nextId.current++, role: "user", text }]);
    await run(texts, location);
  }

  // Re-rank silently when the location changes after results are showing.
  const lastLoc = useRef<PatientLocation | null>(null);
  useEffect(() => {
    if (lastLoc.current === location) return;
    lastLoc.current = location;
    if (result?.triage.status === "ready" && userTexts.length) void run(userTexts, location, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  function reset() {
    setMessages([{ id: nextId.current++, role: "assistant", text: t.intro }]);
    setUserTexts([]);
    setResult(null);
    setError("");
    setInput("");
  }

  const tri = result?.triage;
  const ready = tri?.status === "ready";
  const summaryText =
    ready && userTexts.length
      ? `Patient-reported: “${userTexts.join(" · ").slice(0, 600)}”. Suggested specialty (not a diagnosis): ${tri.specialties
          .map((s) => specialtyDisplayName(s.id, "en"))
          .join(", ")}.`
      : "";

  return (
    <PatientShell title={t.title} subtitle={t.subtitle}>
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-5">
        <section className="flex flex-col gap-3 lg:col-span-2">
          <div className="flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-amber-200/60">
            <Info size={16} className="mt-0.5 shrink-0" />
            <p>{t.disclaimer}</p>
          </div>

          <LocationPicker value={location} onChange={setLocation} t={t} />

          <div
            className="flex h-[26rem] flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80 lg:h-[30rem]"
            aria-label="Conversation"
          >
            <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-start gap-2 ${m.role === "user" ? "justify-end" : ""}`}
                >
                  {m.role === "assistant" && (
                    <div
                      className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        m.tone === "emergency"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-medical-100 text-medical-700"
                      }`}
                    >
                      {m.tone === "emergency" ? <Siren size={14} /> : <Bot size={14} />}
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "rounded-tr-none bg-medical-600 text-white"
                        : m.tone === "emergency"
                          ? "rounded-tl-none bg-rose-50 font-medium text-rose-800 ring-1 ring-rose-200"
                          : "rounded-tl-none bg-slate-100 text-slate-800"
                    }`}
                  >
                    {m.text}
                  </div>
                  {m.role === "user" && (
                    <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                      <User size={14} />
                    </div>
                  )}
                </motion.div>
              ))}
              {busy && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 size={14} className="animate-spin" /> {t.thinking}
                </div>
              )}
              {tri?.status === "follow_up" && tri.quickReplies.length > 0 && !busy && (
                <div className="flex flex-wrap gap-2 pl-9">
                  {tri.quickReplies.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => send(q)}
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-medical-700 ring-1 ring-medical-200 transition-colors hover:bg-medical-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="border-t border-slate-100 p-3">
              {error && (
                <p role="alert" className="mb-2 text-xs text-rose-600">
                  {error}
                </p>
              )}
              {emergency ? (
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <RotateCcw size={14} /> {t.newChat}
                </button>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send(input);
                  }}
                  className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2"
                >
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    maxLength={1000}
                    placeholder={t.placeholder}
                    aria-label={t.placeholder}
                    className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                  />
                  {userTexts.length > 0 && (
                    <button
                      type="button"
                      onClick={reset}
                      aria-label={t.newChat}
                      title={t.newChat}
                      className="rounded-lg p-2 text-slate-500 hover:bg-white"
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={busy || !input.trim()}
                    aria-label={t.send}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-medical-600 text-white transition-colors hover:bg-medical-700 disabled:opacity-40"
                  >
                    <Send size={16} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4 lg:col-span-3" aria-live="polite">
          <AnimatePresence mode="wait">
            {emergency && tri && (
              <motion.div
                key="emergency"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-3xl bg-rose-50 p-5 ring-2 ring-rose-300"
                role="alert"
              >
                <div className="flex items-center gap-2 text-lg font-bold text-rose-800">
                  <AlertTriangle /> {t.emergencyTitle}
                </div>
                <p className="mt-2 text-sm text-rose-800">{tri.reply}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {tri.emergencyKind === "mental_health" ? (
                    <>
                      <a
                        href="tel:14416"
                        className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700"
                      >
                        <Phone size={16} /> {t.call14416}
                      </a>
                      <a
                        href="tel:112"
                        className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-800"
                      >
                        <Phone size={16} /> {t.call112}
                      </a>
                    </>
                  ) : (
                    <>
                      <a
                        href="tel:112"
                        className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700"
                      >
                        <Phone size={16} /> {t.call112}
                      </a>
                      <a
                        href="tel:108"
                        className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-800"
                      >
                        <Phone size={16} /> {t.call108}
                      </a>
                      <a
                        href={
                          location
                            ? `https://www.google.com/maps/search/?api=1&query=hospital+emergency+near+${location.lat},${location.lng}`
                            : "https://www.google.com/maps/search/?api=1&query=nearest+hospital+emergency"
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-100"
                      >
                        <Hospital size={16} /> {t.findHospital}
                      </a>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {ready && tri && (
              <motion.div
                key="specialists"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-3xl bg-white p-4 ring-1 ring-slate-200/80"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t.suggested}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {tri.specialties.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-medical-50 px-3 py-1.5 text-sm font-semibold text-medical-800 ring-1 ring-medical-200"
                    >
                      <Stethoscope size={14} /> {specialtyDisplayName(s.id, lang)}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">{tri.disclaimer}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {ready && (
            <>
              {config?.storage === "memory" && (
                <p className="rounded-2xl bg-violet-50 p-3 text-xs text-violet-800 ring-1 ring-violet-200">
                  {t.demoBanner}
                </p>
              )}
              <h2 className="text-lg font-bold text-slate-800">{t.doctorsTitle}</h2>
              {result?.searchError ? (
                <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">
                  Could not load doctors right now. Please try again.
                </p>
              ) : result && result.matches.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
                  {t.noDoctors}
                </p>
              ) : (
                <div className="space-y-4">
                  {result?.matches.map((m, i) => (
                    <DoctorCard
                      key={m.doctor.id}
                      match={m}
                      t={t}
                      summaryText={summaryText}
                      index={i}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {!result && !busy && (
            <div className="flex h-full min-h-48 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white/60 p-8 text-center text-slate-500">
              <Stethoscope size={32} className="mb-3 text-medical-500" />
              <p className="max-w-sm text-sm">{t.subtitle}</p>
            </div>
          )}
        </section>
      </div>
    </PatientShell>
  );
}
