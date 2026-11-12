import { BadgeCheck, Clock, ShieldAlert, ShieldQuestion } from "lucide-react";
import type { VerificationStatus } from "@/types/directory";

/**
 * Honest verification label. "Verified" is shown only when a MEDIEX admin has checked the
 * registration number against the official register. Nothing is ever labelled "NMC-verified" automatically.
 */
export function VerificationBadge({
  status,
  isDemo,
}: {
  status: VerificationStatus;
  isDemo?: boolean;
}) {
  const map = {
    verified: {
      Icon: BadgeCheck,
      text: "Registration checked by MEDIEX",
      cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },
    pending: {
      Icon: Clock,
      text: "Verification pending",
      cls: "bg-amber-50 text-amber-700 ring-amber-200",
    },
    unverified: {
      Icon: ShieldQuestion,
      text: "Not verified",
      cls: "bg-slate-100 text-slate-600 ring-slate-200",
    },
    rejected: {
      Icon: ShieldAlert,
      text: "Verification failed",
      cls: "bg-rose-50 text-rose-700 ring-rose-200",
    },
  }[status];
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${map.cls}`}
      >
        <map.Icon size={12} />
        {map.text}
      </span>
      {isDemo && (
        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-200">
          Demo profile
        </span>
      )}
    </span>
  );
}
