import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Send, Info, Bot, User, Siren, RotateCcw, ClipboardList, WifiOff } from "lucide-react";
import PatientShell from "@/components/PatientShell";
import { RequirePatient } from "@/components/RequirePatient";
import { sendCaseMessage, type AssistantTurn } from "@/lib/mediex/assistant";
import {
  getChatMessages,
  saveChatMessages,
  getCaseState,
  saveCaseState,
  clearCaseState,
  newId,
} from "@/lib/mediex/storage";
import { useLanguage } from "@/context/LanguageContext";
import { Link } from "@/lib/router";
import {
  EMPTY_CASE_STATE,
  type CaseState,
  type CaseStatus,
  type ChatMessage,
  type Patient,
} from "@/types";

export const Route = createFileRoute("/patient/assistant")({
  head: () => ({
    meta: [
      { title: "AI Health Assistant | Mediex" },
      {
        name: "description",
        content:
          "A guided, one-question-at-a-time case-taking assistant that prepares your case for the doctor.",
      },
    ],
  }),
  component: () => <RequirePatient>{(patient) => <Assistant patient={patient} />}</RequirePatient>,
});

export function Assistant({ patient }: { patient: Patient }) {
  const { t, lang } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [caseState, setCaseState] = useState<CaseState>(EMPTY_CASE_STATE);
  const [status, setStatus] = useState<CaseStatus>("ongoing");
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState("");
  const [offlineNotice, setOfflineNotice] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  function freshOpening(): ChatMessage {
    return {
      id: newId("MSG"),
      role: "assistant",
      text: t.assistant.openingQuestion,
      createdAt: new Date().toISOString(),
    };
  }

  useEffect(() => {
    const stored = getChatMessages(patient.patientId);
    const storedCase = getCaseState(patient.patientId);
    setCaseState(storedCase);
    if (stored && stored.length > 0) {
      setMessages(stored);
      const last = stored[stored.length - 1];
      setStatus(last?.status ?? "ongoing");
    } else {
      const opening = freshOpening();
      setMessages([opening]);
      saveChatMessages(patient.patientId, [opening]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.patientId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  function startNewCase() {
    clearCaseState(patient.patientId);
    const opening = freshOpening();
    setMessages([opening]);
    setCaseState(EMPTY_CASE_STATE);
    setStatus("ongoing");
    setError("");
    setOfflineNotice(false);
    saveChatMessages(patient.patientId, [opening]);
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || typing || status !== "ongoing") return;
    setError("");
    setOfflineNotice(false);

    const userMessage: ChatMessage = {
      id: newId("MSG"),
      role: "user",
      text: trimmed,
      createdAt: new Date().toISOString(),
    };
    const withUser = [...messages, userMessage];
    setMessages(withUser);
    setInput("");
    setTyping(true);

    const history: AssistantTurn[] = withUser
      .slice(0, -1)
      .map((m) => ({ role: m.role, text: m.text }));

    try {
      const result = await sendCaseMessage(trimmed, lang, history, caseState);

      const botMessage: ChatMessage = {
        id: newId("MSG"),
        role: "assistant",
        text: result.reply,
        createdAt: new Date().toISOString(),
        status: result.status,
      };
      const next = [...withUser, botMessage];
      setMessages(next);
      setCaseState(result.caseState);
      setStatus(result.status);
      saveChatMessages(patient.patientId, next);
      saveCaseState(patient.patientId, result.caseState);

      if (result.offline) {
        setOfflineNotice(true);
        if (result.errorCode === "rate_limit") setError(t.assistant.errorRateLimit);
        else if (result.errorCode === "credits") setError(t.assistant.errorCredits);
        else if (result.errorCode === "blocked") setError(t.assistant.errorBlocked);
      }
    } catch {
      setError(t.assistant.errorGeneric);
    } finally {
      setTyping(false);
    }
  }

  const summaryRows: { label: string; value: string }[] = [
    { label: t.assistant.summaryChief, value: caseState.chiefComplaint },
    { label: t.assistant.summaryDuration, value: caseState.duration },
    { label: t.assistant.summarySeverity, value: caseState.severity },
    { label: t.assistant.summaryLocation, value: caseState.location },
    { label: t.assistant.summaryAssociated, value: caseState.associatedSymptoms.join(", ") },
    { label: t.assistant.summaryHistory, value: caseState.history },
    { label: t.assistant.summaryMedicines, value: caseState.medicines },
    { label: t.assistant.summaryAllergies, value: caseState.allergies },
    { label: t.assistant.summaryLifestyle, value: caseState.lifestyle },
    { label: t.assistant.summaryAyurvedic, value: caseState.ayurvedic },
  ].filter((row) => row.value);

  return (
    <PatientShell title={t.assistant.title} subtitle={t.assistant.subtitle}>
      <div className="mx-auto flex h-[calc(100vh-11rem)] max-w-4xl flex-col gap-3">
        {/* Medical Disclaimer Banner */}
        <div className="flex shrink-0 items-start gap-2 rounded-2xl bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-amber-200/60">
          <Info size={16} className="mt-0.5 shrink-0" />
          <p>{t.assistant.disclaimer}</p>
        </div>

        {/* Chat Box Shell */}
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {/* Scrollable Message History */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
            {messages.map((message) => {
              const isEmergency = message.role === "assistant" && message.status === "emergency";
              const isComplete = message.role === "assistant" && message.status === "complete";
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-start gap-2 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div
                      className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        isEmergency
                          ? "bg-rose-100 text-rose-700"
                          : "bg-medical-100 text-medical-700"
                      }`}
                    >
                      {isEmergency ? <Siren size={16} /> : <Bot size={16} />}
                    </div>
                  )}

                  <div className="flex max-w-[85%] flex-col gap-2">
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        message.role === "user"
                          ? "rounded-tr-none bg-medical-600 text-white"
                          : isEmergency
                            ? "rounded-tl-none bg-rose-50 text-rose-800 ring-1 ring-rose-200 font-medium"
                            : isComplete
                              ? "rounded-tl-none bg-medical-50 text-medical-800 ring-1 ring-medical-100 font-medium"
                              : "rounded-tl-none bg-slate-100 text-slate-800"
                      }`}
                    >
                      {message.text}
                    </div>

                    {isEmergency && (
                      <Link
                        to="/patient/emergency"
                        className="inline-flex w-fit items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-700"
                      >
                        <Siren size={14} />
                        {t.assistant.emergencyCareCta}
                      </Link>
                    )}

                    {isComplete && summaryRows.length > 0 && (
                      <div className="mt-1 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          <ClipboardList size={14} />
                          {t.assistant.caseSummaryTitle}
                        </div>
                        <dl className="space-y-1.5">
                          {summaryRows.map((row) => (
                            <div key={row.label} className="flex flex-col sm:flex-row sm:gap-2">
                              <dt className="shrink-0 text-xs font-semibold text-slate-500 sm:w-40">
                                {row.label}
                              </dt>
                              <dd className="break-words text-sm text-slate-700">{row.value}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    )}

                    {(isEmergency || isComplete) && (
                      <button
                        onClick={startNewCase}
                        className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <RotateCcw size={14} />
                        {t.assistant.startNewCase}
                      </button>
                    )}
                  </div>

                  {message.role === "user" && (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                      <User size={16} />
                    </div>
                  )}
                </motion.div>
              );
            })}

            {/* Typing / understanding indicator */}
            {typing && (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-medical-100 text-medical-700">
                  <Bot size={16} />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-none bg-slate-100 px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
                        style={{ animationDelay: `${i * 120}ms` }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    {t.assistant.understanding}
                  </span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Footer Input */}
          <div className="shrink-0 border-t border-slate-100 p-3 md:p-4">
            {offlineNotice && (
              <div className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
                <WifiOff size={14} />
                {t.assistant.offlineNote}
              </div>
            )}
            {error && <p className="mb-2 text-xs text-rose-600">{error}</p>}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.assistant.placeholder}
                aria-label={t.assistant.placeholder}
                disabled={status !== "ongoing"}
                className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={typing || !input.trim() || status !== "ongoing"}
                aria-label={t.assistant.send}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-medical-600 text-white transition-colors hover:bg-medical-700 disabled:opacity-40"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </PatientShell>
  );
}
