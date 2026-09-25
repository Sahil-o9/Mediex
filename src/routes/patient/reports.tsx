import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { UploadCloud, FileText, Info, Loader2, CheckCircle2, History } from "lucide-react";
import PatientShell from "@/components/PatientShell";
import { RequirePatient } from "@/components/RequirePatient";
import {
  analyzeReport,
  isSupportedReport,
  ACCEPTED_REPORT_TYPES,
  statusStyles,
} from "@/lib/mediex/reportAnalysis";
import { getReports, saveReport } from "@/lib/mediex/storage";
import { useLanguage } from "@/context/LanguageContext";
import type { Patient, ReportAnalysis } from "@/types";

export const Route = createFileRoute("/patient/reports")({
  head: () => ({
    meta: [
      { title: "Medical Report Analysis | Mediex" },
      {
        name: "description",
        content:
          "Upload a lab report and see a sample breakdown of hemoglobin, glucose, blood pressure and cholesterol with clear status labels.",
      },
      { property: "og:title", content: "Medical Report Analysis | Mediex" },
      {
        property: "og:description",
        content: "Demo report breakdown with plain-language status indicators.",
      },
    ],
  }),
  component: () => <RequirePatient>{(patient) => <Reports patient={patient} />}</RequirePatient>,
});

function Reports({ patient }: { patient: Patient }) {
  const { t, format } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReportAnalysis | null>(null);
  const [history, setHistory] = useState<ReportAnalysis[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHistory(getReports(patient.patientId));
  }, [patient.patientId]);

  function pick(selected: File | null | undefined) {
    if (!selected) return;
    if (!isSupportedReport(selected)) {
      setError(format(t.reports.errUnsupported, { types: ACCEPTED_REPORT_TYPES.join(", ") }));
      setFile(null);
      return;
    }
    setError("");
    setResult(null);
    setFile(selected);
  }

  async function runAnalysis() {
    if (!file) {
      setError(t.reports.errChooseFirst);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const analysis = await analyzeReport(file, t);
      setResult(analysis);
      saveReport(patient.patientId, analysis);
      setHistory(getReports(patient.patientId));
    } catch {
      setError(t.reports.errFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PatientShell title={t.reports.title} subtitle={t.reports.subtitle}>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div className="flex items-start gap-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-100">
            <Info size={18} className="mt-0.5 shrink-0" />
            <p>
              {t.reports.disclaimer} {t.reports.demoNote}
            </p>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              pick(e.dataTransfer.files?.[0]);
            }}
            className={`rounded-3xl border-2 border-dashed bg-white p-8 text-center transition-colors ${
              dragging ? "border-medical-500 bg-medical-50" : "border-slate-200"
            }`}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-medical-100 text-medical-700">
              <UploadCloud size={26} />
            </div>
            <p className="mt-4 font-semibold text-slate-700">{t.reports.drag}</p>
            <p className="mt-1 text-sm text-slate-500">
              {format(t.reports.fileTypes, { types: ACCEPTED_REPORT_TYPES.join(", ") })}
            </p>
            <button
              onClick={() => inputRef.current?.click()}
              className="mt-4 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-900"
            >
              {t.reports.browse}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_REPORT_TYPES.join(",")}
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0])}
            />

            {file && (
              <div className="mx-auto mt-5 flex max-w-md items-center gap-3 rounded-2xl bg-slate-50 p-3 text-left ring-1 ring-slate-100">
                <FileText size={20} className="shrink-0 text-medical-600" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-700">{file.name}</p>
                  <p className="text-xs text-slate-400">
                    {format(t.reports.selected, { size: (file.size / 1024).toFixed(0) })}
                  </p>
                </div>
              </div>
            )}

            {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

            <button
              onClick={runAnalysis}
              disabled={loading}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-medical-600 px-6 py-3 font-semibold text-white shadow-lg shadow-medical-500/25 transition-colors hover:bg-medical-700 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {t.reports.analysing}
                </>
              ) : (
                t.reports.analyze
              )}
            </button>
          </div>

          {result && (
            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 md:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-medical-600" />
                  <h2 className="text-lg font-bold text-slate-800">{t.reports.resultTitle}</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                  {t.reports.demoOutput} · {result.fileName}
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {result.metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-slate-700">{metric.label}</p>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[metric.status]}`}
                      >
                        {metric.statusLabel}
                      </span>
                    </div>
                    <p className="mt-2 text-xl font-bold text-slate-800">{metric.value}</p>
                    <p className="text-xs text-slate-400">
                      {format(t.reports.typicalRange, { range: metric.reference })}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">{metric.note}</p>
                  </div>
                ))}
              </div>

              <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-slate-400">
                {t.reports.observations}
              </h3>
              <ul className="mt-3 space-y-2">
                {result.observations.map((observation) => (
                  <li key={observation} className="flex gap-2 text-sm text-slate-600">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-medical-500" />
                    {observation}
                  </li>
                ))}
              </ul>
            </motion.section>
          )}
        </div>

        <aside className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 md:p-6">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
            <History size={16} />
            {t.reports.pastUploads}
          </div>
          {history.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">{t.reports.noReports}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {history.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setResult(item)}
                    className="w-full rounded-2xl bg-slate-50 p-3 text-left ring-1 ring-slate-100 transition-colors hover:bg-medical-50"
                  >
                    <p className="truncate text-sm font-semibold text-slate-700">{item.fileName}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(item.analyzedAt).toLocaleString()}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </PatientShell>
  );
}
