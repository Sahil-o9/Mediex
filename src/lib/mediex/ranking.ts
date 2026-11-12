import type { AvailabilityState, DoctorMatch, DoctorProfile, SpecialtyId } from "@/types/directory";
import { SPECIALTY_BY_ID } from "@/types/directory";
import { directionsUrl, distanceOrNull, type LatLng } from "./geo";
import {
  addDays,
  describeTimings,
  isOpenNow,
  istNow,
  leaveCovering,
  upcomingSlots,
} from "./scheduling";

export interface SpecialtyTarget {
  id: SpecialtyId;
  /** 0..1 — how strongly the symptoms point at this specialty. */
  weight: number;
}

export interface RankInput {
  doctors: DoctorProfile[];
  targets: SpecialtyTarget[];
  /** Free text of what the patient said; used to credit doctors who list that condition. */
  symptomText?: string;
  patient: LatLng | null;
  /** doctorId -> set of "YYYY-MM-DDTHH:MM" already taken. */
  booked: ReadonlyMap<string, ReadonlySet<string>>;
  ratings: ReadonlyMap<string, { average: number | null; count: number }>;
  now?: Date;
  limit?: number;
}

const EMPTY: ReadonlySet<string> = new Set();

export const WEIGHTS = { relevance: 0.4, distance: 0.3, availability: 0.3 } as const;

export function distanceScore(km: number | null): number {
  if (km === null) return 0.3;
  return 1 / (1 + km / 8);
}

export function availabilityScore(state: AvailabilityState, openNow: boolean): number {
  switch (state) {
    case "available_today":
      return openNow ? 1 : 0.95;
    case "available_soon":
      return 0.8;
    case "available_later":
      return 0.5;
    case "on_leave":
      return 0.1;
    default:
      return 0;
  }
}

function relevanceFor(
  doc: DoctorProfile,
  targets: SpecialtyTarget[],
  symptomText: string,
): { value: number; reason: string } {
  let best = 0;
  let reason = "";
  for (const t of targets) {
    if (!doc.specialties.includes(t.id)) continue;
    const isPrimary = doc.primarySpecialty === t.id;
    const v = t.weight * (isPrimary ? 1 : 0.75);
    if (v > best) {
      best = v;
      const name = SPECIALTY_BY_ID[t.id].name;
      reason = isPrimary ? `Primary specialty: ${name}` : `Also practises: ${name}`;
    }
  }
  if (best === 0) return { value: 0, reason: "" };
  const text = symptomText.toLowerCase();
  const hit = doc.conditions.find((c) => c.length > 2 && text.includes(c.toLowerCase()));
  if (hit) {
    best = Math.min(1, best + 0.1);
    reason += ` · lists “${hit}”`;
  }
  return { value: best, reason };
}

export function rankDoctors(input: RankInput): DoctorMatch[] {
  const now = input.now ?? new Date();
  const today = istNow(now).date;
  const hasPatient = input.patient !== null;
  const w = hasPatient ? WEIGHTS : { relevance: 0.55, distance: 0, availability: 0.45 }; // distance unknown: don't penalise anyone

  const matches: DoctorMatch[] = [];
  for (const doctor of input.doctors) {
    if (!doctor.acceptingAppointments) continue;
    const rel = relevanceFor(doctor, input.targets, input.symptomText ?? "");
    if (rel.value <= 0) continue;

    const km = doctor.clinic ? distanceOrNull(input.patient, doctor.clinic) : null;
    const booked = input.booked.get(doctor.id) ?? EMPTY;
    const nextSlots = upcomingSlots(doctor, booked, now, { days: 14, limit: 4 });
    const leaveToday = leaveCovering(doctor.leaves, today);
    const openNow = isOpenNow(doctor, now);

    let state: AvailabilityState;
    const first = nextSlots[0];
    if (!first) {
      state = leaveToday ? "on_leave" : "no_availability";
    } else if (first.date === today) {
      state = "available_today";
    } else if (first.date <= addDays(today, 2)) {
      state = "available_soon";
    } else {
      state = "available_later";
    }

    const score =
      w.relevance * rel.value +
      w.distance * distanceScore(km) +
      w.availability * availabilityScore(state, openNow);

    const rating = input.ratings.get(doctor.id) ?? { average: null, count: 0 };
    matches.push({
      doctor,
      distanceKm: km,
      distanceSource: km === null ? "unknown" : "patient_location",
      relevance: Math.round(rel.value * 100) / 100,
      matchReason: rel.reason,
      availabilityState: state,
      openNow,
      timingsText: describeTimings(doctor.availability),
      nextSlots,
      onLeaveUntil: leaveToday ? leaveToday.endDate : null,
      score: Math.round(score * 1000) / 1000,
      rating,
      directionsUrl: doctor.clinic ? directionsUrl(doctor.clinic) : null,
    });
  }

  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
    const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    return a.doctor.fullName.localeCompare(b.doctor.fullName);
  });
  return matches.slice(0, input.limit ?? 12);
}
