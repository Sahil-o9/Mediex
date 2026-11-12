import { useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarClock,
  CalendarCheck,
  Clock,
  Languages,
  MapPin,
  Navigation,
  Star,
  Stethoscope,
} from "lucide-react";
import { dateLabel, initials, timeLabel } from "@/lib/mediex/format";
import type { DiscoveryStrings } from "@/lib/i18n/discovery";
import { SPECIALTY_BY_ID, type DoctorMatch } from "@/types/directory";
import { BookingDialog } from "./BookingDialog";
import { ReviewsList } from "./ReviewsList";
import { Stars } from "./Stars";
import { VerificationBadge } from "./VerificationBadge";

export function DoctorCard({
  match,
  t,
  summaryText,
  index = 0,
}: {
  match: DoctorMatch;
  t: DiscoveryStrings;
  summaryText: string;
  index?: number;
}) {
  const d = match.doctor;
  const [booking, setBooking] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const first = match.nextSlots[0];

  const availability =
    match.availabilityState === "available_today" && first ? (
      <span className="font-semibold text-emerald-700">
        {t.availToday} · {timeLabel(first.time)}
      </span>
    ) : first ? (
      <span className="font-semibold text-medical-700">
        {t.availNext}: {dateLabel(first.date)}, {timeLabel(first.time)}
      </span>
    ) : match.availabilityState === "on_leave" && match.onLeaveUntil ? (
      <span className="font-semibold text-amber-700">
        {t.onLeave} {dateLabel(match.onLeaveUntil)}
      </span>
    ) : (
      <span className="font-semibold text-slate-500">{t.noSlots}</span>
    );

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 6) * 0.05 }}
      className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 md:p-5"
    >
      <div className="flex gap-3 md:gap-4">
        <div
          aria-hidden
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-medical-500 to-medical-700 text-sm font-bold text-white md:h-14 md:w-14"
        >
          {initials(d.fullName)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-slate-800 md:text-lg">{d.fullName}</h3>
          <p className="text-sm text-slate-500">{d.qualifications}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {d.specialties.slice(0, 3).map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 rounded-full bg-medical-50 px-2 py-0.5 text-[11px] font-semibold text-medical-700 ring-1 ring-medical-100"
              >
                <Stethoscope size={11} />
                {SPECIALTY_BY_ID[s].name}
              </span>
            ))}
          </div>
          <div className="mt-1.5">
            <VerificationBadge status={d.verificationStatus} isDemo={d.isDemo} />
          </div>
        </div>
        <div className="hidden shrink-0 text-right sm:block">
          {match.rating.average !== null ? (
            <>
              <Stars value={match.rating.average} />
              <p className="text-xs text-slate-500">
                {match.rating.average} · {match.rating.count} verified
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-400">No reviews yet</p>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">{match.matchReason}</p>

      <dl className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
        <div className="flex items-start gap-2">
          <MapPin size={16} className="mt-0.5 shrink-0 text-medical-600" />
          <div>
            <dt className="sr-only">Clinic</dt>
            <dd>
              <b className="text-slate-700">{d.clinic?.name ?? "Clinic not set"}</b>
              {d.clinic && (
                <span className="block text-xs text-slate-500">
                  {d.clinic.addressLine}, {d.clinic.city} {d.clinic.pincode}
                </span>
              )}
              <span className="block text-xs text-slate-500">
                {match.distanceKm !== null
                  ? `≈ ${match.distanceKm} km ${t.straightLine}`
                  : t.distanceUnknown}
              </span>
            </dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <CalendarClock size={16} className="mt-0.5 shrink-0 text-medical-600" />
          <div>
            <dt className="sr-only">Availability</dt>
            <dd>
              {availability}
              <span className="block text-xs text-slate-500">
                <Clock size={11} className="mr-1 inline" />
                {t.timings}: {match.timingsText}
              </span>
              {match.openNow && (
                <span className="text-xs font-semibold text-emerald-700">{t.openNow}</span>
              )}
            </dd>
          </div>
        </div>
      </dl>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        {d.languages.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <Languages size={12} /> {d.languages.join(", ")}
          </span>
        )}
        {d.consultationFee !== null && (
          <span>
            {t.fee}: ₹{d.consultationFee}
          </span>
        )}
        {d.experienceYears !== null && <span>{d.experienceYears} yrs experience</span>}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setBooking(true)}
          disabled={match.nextSlots.length === 0}
          className="inline-flex items-center gap-1.5 rounded-xl bg-medical-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-medical-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CalendarCheck size={16} />
          {t.book}
        </button>
        {match.directionsUrl ? (
          <a
            href={match.directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Navigation size={16} />
            {t.directions}
          </a>
        ) : (
          <span className="inline-flex items-center rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-400">
            Map location not provided
          </span>
        )}
        <button
          type="button"
          onClick={() => setShowReviews((v) => !v)}
          aria-expanded={showReviews}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
        >
          <Star size={16} />
          {t.reviews} ({match.rating.count})
        </button>
      </div>

      {showReviews && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <ReviewsList doctorId={d.id} empty={t.noReviews} />
        </div>
      )}

      {booking && (
        <BookingDialog
          doctor={d}
          firstSlotDate={first?.date ?? null}
          summaryText={summaryText}
          open={booking}
          onOpenChange={setBooking}
          onBooked={() => undefined}
        />
      )}
    </motion.article>
  );
}
