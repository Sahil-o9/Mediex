import type { AvailabilityWindow, Leave, Slot } from "@/types/directory";
import { WEEKDAY_NAMES } from "@/types/directory";

/**
 * Scheduling in clinic-local time. India has a single time zone (IST, UTC+05:30,
 * no daylight saving), so a fixed offset is exact and keeps server and browser
 * results identical.
 */
const IST_OFFSET_MIN = 330;

export interface IstNow {
  date: string; // YYYY-MM-DD
  minutes: number; // minutes since midnight
  weekday: number; // 0 = Sunday
}

export function istNow(now: Date = new Date()): IstNow {
  const shifted = new Date(now.getTime() + IST_OFFSET_MIN * 60_000);
  return {
    date: shifted.toISOString().slice(0, 10),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
  };
}

export function toMinutes(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm);
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function isValidTime(s: string): boolean {
  const m = /^(\d{2}):(\d{2})$/.exec(s);
  return !!m && Number(m[1]) < 24 && Number(m[2]) < 60;
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function leaveCovering(leaves: Leave[], date: string): Leave | null {
  return leaves.find((l) => l.startDate <= date && date <= l.endDate) ?? null;
}

export interface SchedulableDoctor {
  slotMinutes: number;
  availability: AvailabilityWindow[];
  leaves: Leave[];
}

/** All bookable slot times for one calendar day (before removing already-booked ones). */
export function slotTimesForDate(doc: SchedulableDoctor, date: string): string[] {
  if (leaveCovering(doc.leaves, date)) return [];
  const wd = weekdayOf(date);
  const step = Math.max(10, doc.slotMinutes || 20);
  const times = new Set<string>();
  for (const w of doc.availability) {
    if (w.weekday !== wd) continue;
    const start = toMinutes(w.startTime);
    const end = toMinutes(w.endTime);
    if (Number.isNaN(start) || Number.isNaN(end)) continue;
    for (let t = start; t + step <= end; t += step) times.add(fromMinutes(t));
  }
  return [...times].sort();
}

/** Minimum notice so the patient can actually reach the clinic. */
export const BOOKING_NOTICE_MIN = 30;

export function slotsForDate(
  doc: SchedulableDoctor,
  date: string,
  booked: ReadonlySet<string>,
  now: Date = new Date(),
): string[] {
  const n = istNow(now);
  if (date < n.date) return [];
  return slotTimesForDate(doc, date).filter((t) => {
    if (booked.has(`${date}T${t}`)) return false;
    if (date === n.date && toMinutes(t) < n.minutes + BOOKING_NOTICE_MIN) return false;
    return true;
  });
}

export function upcomingSlots(
  doc: SchedulableDoctor,
  booked: ReadonlySet<string>,
  now: Date = new Date(),
  opts: { days?: number; limit?: number } = {},
): Slot[] {
  const days = opts.days ?? 14;
  const limit = opts.limit ?? 4;
  const start = istNow(now).date;
  const out: Slot[] = [];
  for (let i = 0; i < days && out.length < limit; i++) {
    const date = addDays(start, i);
    for (const time of slotsForDate(doc, date, booked, now)) {
      out.push({ date, time });
      if (out.length >= limit) break;
    }
  }
  return out;
}

export function isOpenNow(doc: SchedulableDoctor, now: Date = new Date()): boolean {
  const n = istNow(now);
  if (leaveCovering(doc.leaves, n.date)) return false;
  return doc.availability.some(
    (w) =>
      w.weekday === n.weekday &&
      toMinutes(w.startTime) <= n.minutes &&
      n.minutes < toMinutes(w.endTime),
  );
}

/** "Mon–Sat 10:00–14:00, 17:00–20:00" style text, grouped by identical hours. */
export function describeTimings(availability: AvailabilityWindow[]): string {
  if (availability.length === 0) return "Timings not provided";
  const order = [1, 2, 3, 4, 5, 6, 0];
  const perDay = new Map<number, string>();
  for (const wd of order) {
    const ranges = availability
      .filter((w) => w.weekday === wd)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map((w) => `${w.startTime}–${w.endTime}`);
    if (ranges.length) perDay.set(wd, ranges.join(", "));
  }
  const groups: { days: number[]; text: string }[] = [];
  for (const wd of order) {
    const text = perDay.get(wd);
    if (!text) continue;
    const last = groups[groups.length - 1];
    const prevDay = last?.days[last.days.length - 1];
    const idx = (d: number) => order.indexOf(d);
    if (last && last.text === text && prevDay !== undefined && idx(prevDay) === idx(wd) - 1) {
      last.days.push(wd);
    } else {
      groups.push({ days: [wd], text });
    }
  }
  return groups
    .map((g) => {
      const first = g.days[0] as number;
      const lastDay = g.days[g.days.length - 1] as number;
      const label =
        g.days.length === 1
          ? WEEKDAY_NAMES[first]
          : g.days.length === 2
            ? `${WEEKDAY_NAMES[first]}, ${WEEKDAY_NAMES[lastDay]}`
            : `${WEEKDAY_NAMES[first]}–${WEEKDAY_NAMES[lastDay]}`;
      return `${label} ${g.text}`;
    })
    .join(" · ");
}
