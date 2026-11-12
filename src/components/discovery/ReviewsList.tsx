import { useEffect, useState } from "react";
import { BadgeCheck, Loader2, MessageSquareQuote } from "lucide-react";
import { apiFetch } from "@/lib/mediex/http";
import { dateLabel } from "@/lib/mediex/format";
import type { PublicReview } from "@/types/directory";
import { Stars } from "./Stars";

/** Public reviews. Patient identity is never shown; moderation decisions are shown with their reasons. */
export function ReviewsList({ doctorId, empty }: { doctorId: string; empty: string }) {
  const [reviews, setReviews] = useState<PublicReview[] | null>(null);

  useEffect(() => {
    let off = false;
    void apiFetch<{ reviews: PublicReview[] }>(`/api/doctors/${doctorId}`).then((r) => {
      if (!off) setReviews(r.data?.reviews ?? []);
    });
    return () => {
      off = true;
    };
  }, [doctorId]);

  if (reviews === null) {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 size={14} className="animate-spin" /> Loading reviews…
      </p>
    );
  }
  if (reviews.length === 0) return <p className="text-sm text-slate-500">{empty}</p>;

  return (
    <ul className="space-y-3">
      {reviews.map((r) => (
        <li key={r.id} className="rounded-xl bg-slate-50 p-3 text-sm ring-1 ring-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <Stars value={r.rating} />
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <BadgeCheck size={12} /> Verified visit
            </span>
            <span className="text-xs text-slate-400">{dateLabel(r.createdAt.slice(0, 10))}</span>
            {r.status === "flagged" && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                Under review
              </span>
            )}
          </div>
          {r.status === "removed" ? (
            <p className="mt-2 italic text-slate-500">
              This review was removed by a moderator. Reason: {r.moderationNote}
            </p>
          ) : (
            <>
              {r.text && <p className="mt-2 text-slate-700">{r.text}</p>}
              {r.moderationNote && (
                <p className="mt-1 text-xs text-slate-500">Moderator note: {r.moderationNote}</p>
              )}
            </>
          )}
          {r.doctorResponse && (
            <p className="mt-2 flex gap-1.5 rounded-lg bg-white p-2 text-xs text-slate-600 ring-1 ring-slate-200">
              <MessageSquareQuote size={14} className="mt-0.5 shrink-0 text-medical-600" />
              <span>
                <b>Doctor’s response:</b> {r.doctorResponse}
              </span>
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
