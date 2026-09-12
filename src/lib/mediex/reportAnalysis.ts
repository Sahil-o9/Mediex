import type { ReportAnalysis, ReportMetric } from "@/types";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { newId } from "./storage";

export const ACCEPTED_REPORT_TYPES = [".pdf", ".jpg", ".jpeg", ".png"];

export function isSupportedReport(file: File) {
  const name = file.name.toLowerCase();
  return ACCEPTED_REPORT_TYPES.some((ext) => name.endsWith(ext));
}

/**
 * Builds the sample metrics and observations in the active UI language.
 * `status` stays as a stable English key internally (used for styling and
 * type-safety); only its display label is localised via `t.reports.status*`.
 */
function buildSampleMetrics(t: Dictionary): ReportMetric[] {
  return [
    {
      label: t.reports.mHemoglobin,
      value: "11.4 g/dL",
      reference: "12.0 - 15.5 g/dL",
      status: "Attention",
      statusLabel: t.reports.statusAttention,
      note: t.reports.mHemoglobinNote,
    },
    {
      label: t.reports.mGlucose,
      value: "104 mg/dL",
      reference: "70 - 99 mg/dL",
      status: "Attention",
      statusLabel: t.reports.statusAttention,
      note: t.reports.mGlucoseNote,
    },
    {
      label: t.reports.mBp,
      value: "138 / 88 mmHg",
      reference: "< 130 / 80 mmHg",
      status: "Consult Doctor",
      statusLabel: t.reports.statusConsult,
      note: t.reports.mBpNote,
    },
    {
      label: t.reports.mCholesterol,
      value: "182 mg/dL",
      reference: "< 200 mg/dL",
      status: "Normal",
      statusLabel: t.reports.statusNormal,
      note: t.reports.mCholesterolNote,
    },
    {
      label: t.reports.mVitaminD,
      value: "26 ng/mL",
      reference: "30 - 100 ng/mL",
      status: "Attention",
      statusLabel: t.reports.statusAttention,
      note: t.reports.mVitaminDNote,
    },
  ];
}

/** Mock analyser. Swap for a real service later; the signature can stay identical. */
export async function analyzeReport(file: File, t: Dictionary): Promise<ReportAnalysis> {
  await new Promise((resolve) => setTimeout(resolve, 1400));
  return {
    id: newId("RPT"),
    fileName: file.name,
    analyzedAt: new Date().toISOString(),
    metrics: buildSampleMetrics(t),
    observations: [t.reports.obs1, t.reports.obs2, t.reports.obs3, t.reports.obs4],
  };
}

export const statusStyles: Record<ReportMetric["status"], string> = {
  Normal: "bg-medical-100 text-medical-700",
  Attention: "bg-amber-100 text-amber-700",
  "Consult Doctor": "bg-rose-100 text-rose-700",
};
