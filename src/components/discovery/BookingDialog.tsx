import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dateLabel, timeLabel } from "@/lib/mediex/format";
import { apiFetch, errorText } from "@/lib/mediex/http";
import { addDays, istNow } from "@/lib/mediex/scheduling";
import type { DoctorProfile } from "@/types/directory";

export function BookingDialog({
  doctor,
  firstSlotDate,
  summaryText,
  open,
  onOpenChange,
  onBooked,
}: {
  doctor: DoctorProfile;
  firstSlotDate: string | null;
  /** Patient-written symptom summary the patient may choose to share. Empty hides the option. */
  summaryText: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onBooked: () => void;
}) {
  const dates = useMemo(() => {
    const start = istNow().date;
    return Array.from({ length: 14 }, (_, i) => addDays(start, i));
  }, []);
  const [date, setDate] = useState<string>(firstSlotDate ?? dates[0]!);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [share, setShare] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setSlots(null);
    setTime("");
    void apiFetch<{ slots: string[] }>(`/api/doctors/${doctor.id}?date=${date}`).then((r) => {
      if (!cancelled) setSlots(r.data?.slots ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [open, date, doctor.id]);

  async function submit() {
    if (!time) return;
    setBusy(true);
    const r = await apiFetch("/api/appointments", {
      method: "POST",
      body: {
        doctorId: doctor.id,
        date,
        time,
        reason,
        ...(share && summaryText ? { shareSummary: summaryText } : {}),
      },
    });
    setBusy(false);
    if (!r.ok) {
      toast.error(errorText(r.error));
      if (r.error === "slot_unavailable") {
        // refresh the list so the taken slot disappears
        setTime("");
        const again = await apiFetch<{ slots: string[] }>(`/api/doctors/${doctor.id}?date=${date}`);
        setSlots(again.data?.slots ?? []);
      }
      return;
    }
    toast.success(`Appointment requested for ${dateLabel(date)}, ${timeLabel(time)}.`, {
      description: "The doctor will confirm it. Track it under Appointments.",
    });
    onBooked();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck size={18} className="text-medical-600" />
            Book with {doctor.fullName}
          </DialogTitle>
          <DialogDescription>
            {doctor.clinic ? `${doctor.clinic.name}, ${doctor.clinic.city}` : ""} · Times are India
            Standard Time.
          </DialogDescription>
        </DialogHeader>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Date</p>
          <div
            className="flex gap-2 overflow-x-auto pb-2"
            role="listbox"
            aria-label="Choose a date"
          >
            {dates.map((d) => (
              <button
                key={d}
                type="button"
                role="option"
                aria-selected={d === date}
                onClick={() => setDate(d)}
                className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold ring-1 transition-colors ${
                  d === date
                    ? "bg-medical-600 text-white ring-medical-600"
                    : "bg-white text-slate-600 ring-slate-200 hover:bg-medical-50"
                }`}
              >
                {dateLabel(d)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Time</p>
          {slots === null ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" /> Loading slots…
            </div>
          ) : slots.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
              No free slots on this day (closed, on leave, or fully booked). Try another date.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTime(s)}
                  aria-pressed={s === time}
                  className={`rounded-xl px-2 py-2 text-sm font-semibold ring-1 transition-colors ${
                    s === time
                      ? "bg-medical-600 text-white ring-medical-600"
                      : "bg-white text-slate-700 ring-slate-200 hover:bg-medical-50"
                  }`}
                >
                  {timeLabel(s)}
                </button>
              ))}
            </div>
          )}
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Reason (optional)
          </span>
          <input
            value={reason}
            maxLength={300}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. headache for 3 days"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-medical-500 focus:ring-2 focus:ring-medical-500/20"
          />
        </label>

        {summaryText && (
          <label className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={share}
              onChange={(e) => setShare(e.target.checked)}
              className="mt-1"
            />
            <span>
              Share my symptom summary with this doctor.
              <span className="mt-1 block rounded-lg bg-white p-2 text-xs text-slate-500 ring-1 ring-slate-200">
                {summaryText}
              </span>
            </span>
          </label>
        )}

        <p className="flex items-start gap-1.5 text-xs text-slate-500">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-medical-600" />
          Booking shares your name, age, gender and phone number with this clinic so they can reach
          you. Nothing else is shared unless you tick the box above.
        </p>

        <button
          type="button"
          disabled={!time || busy}
          onClick={submit}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-medical-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-medical-700 disabled:opacity-50"
        >
          {busy && <Loader2 size={16} className="animate-spin" />}
          {time ? `Request ${dateLabel(date)}, ${timeLabel(time)}` : "Choose a time"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
