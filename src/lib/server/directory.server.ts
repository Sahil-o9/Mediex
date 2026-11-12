import { isValidLatLng, type LatLng } from "@/lib/mediex/geo";
import { rankDoctors, type SpecialtyTarget } from "@/lib/mediex/ranking";
import {
  addDays,
  isValidDate,
  isValidTime,
  istNow,
  slotsForDate,
  toMinutes,
} from "@/lib/mediex/scheduling";
import {
  SPECIALTY_BY_ID,
  isSpecialtyId,
  type AppointmentStatus,
  type AvailabilityWindow,
  type Clinic,
  type DoctorAppointmentView,
  type DoctorMatch,
  type DoctorProfile,
  type Leave,
  type PatientAppointmentView,
  type PublicReview,
  type SpecialtyId,
} from "@/types/directory";
import { newId } from "./accounts.server";
import {
  claimMemorySeed,
  getDb,
  isUniqueViolation,
  type AppointmentRow,
  type ClinicRow,
  type Db,
  type DoctorRow,
  type ReviewRow,
} from "./db.server";
import { demoAccountsAllowed, env } from "./env.server";
import { buildSeed } from "./seed.server";

export type Failure = { ok: false; error: string; status?: number };

/* ------------------------------------------------------------------ *
 * Bootstrapping
 * ------------------------------------------------------------------ */
const gg = globalThis as unknown as { __mediexSeed?: Promise<void> | undefined };

async function seedMemory(db: Db): Promise<void> {
  if (!claimMemorySeed()) return;
  const now = new Date();
  const seed = buildSeed(istNow(now).date, now.toISOString());
  for (const r of seed.clinics) await db.table("clinics").insert(r);
  for (const r of seed.doctors) await db.table("doctors").insert(r);
  for (const r of seed.specializations) await db.table("doctor_specializations").insert(r);
  for (const r of seed.conditions) await db.table("doctor_conditions").insert(r);
  for (const r of seed.availability) await db.table("doctor_availability").insert(r);
  for (const r of seed.leaves) await db.table("doctor_leaves").insert(r);
}

/** The database handle every route uses. In memory (demo) mode it loads the labelled demo data once. */
export async function getDirectoryDb(): Promise<Db> {
  const db = getDb();
  if (db.mode === "memory") {
    gg.__mediexSeed ??= seedMemory(db);
    await gg.__mediexSeed;
  }
  return db;
}

export function resetDirectoryForTests(): void {
  gg.__mediexSeed = undefined;
}

/* ------------------------------------------------------------------ *
 * Profile assembly
 * ------------------------------------------------------------------ */
function toClinic(c: ClinicRow): Clinic {
  return {
    id: c.id,
    name: c.name,
    kind: c.kind,
    addressLine: c.addressLine,
    city: c.city,
    state: c.state,
    pincode: c.pincode,
    lat: c.lat,
    lng: c.lng,
    phone: c.phone || null,
    isDemo: c.isDemo,
  };
}

interface Bundle {
  doctors: DoctorRow[];
  clinics: Map<string, ClinicRow>;
  specs: Map<string, { specialtyId: string; isPrimary: boolean }[]>;
  conds: Map<string, string[]>;
  avail: Map<string, AvailabilityWindow[]>;
  leaves: Map<string, Leave[]>;
}

function group<T extends { doctorId: string }>(rows: T[]): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const a = m.get(r.doctorId);
    if (a) a.push(r);
    else m.set(r.doctorId, [r]);
  }
  return m;
}

async function loadBundle(db: Db, onlyDoctorId?: string): Promise<Bundle> {
  const [doctors, clinics, specs, conds, avail, leaves] = await Promise.all([
    onlyDoctorId
      ? db
          .table("doctors")
          .get(onlyDoctorId)
          .then((d) => (d ? [d] : []))
      : db.table("doctors").all(),
    db.table("clinics").all(),
    onlyDoctorId
      ? db.table("doctor_specializations").where("doctorId", onlyDoctorId)
      : db.table("doctor_specializations").all(),
    onlyDoctorId
      ? db.table("doctor_conditions").where("doctorId", onlyDoctorId)
      : db.table("doctor_conditions").all(),
    onlyDoctorId
      ? db.table("doctor_availability").where("doctorId", onlyDoctorId)
      : db.table("doctor_availability").all(),
    onlyDoctorId
      ? db.table("doctor_leaves").where("doctorId", onlyDoctorId)
      : db.table("doctor_leaves").all(),
  ]);
  return {
    doctors,
    clinics: new Map(clinics.map((c) => [c.id, c])),
    specs: group(specs),
    conds: new Map([...group(conds)].map(([k, v]) => [k, v.map((c) => c.condition)])),
    avail: new Map(
      [...group(avail)].map(([k, v]) => [
        k,
        v.map((a) => ({
          id: a.id,
          weekday: a.weekday,
          startTime: a.startTime,
          endTime: a.endTime,
        })),
      ]),
    ),
    leaves: new Map(
      [...group(leaves)].map(([k, v]) => [
        k,
        v.map((l) => ({ id: l.id, startDate: l.startDate, endDate: l.endDate, reason: l.reason })),
      ]),
    ),
  };
}

function assemble(b: Bundle): DoctorProfile[] {
  return b.doctors.map((d) => {
    const specRows = [...(b.specs.get(d.id) ?? [])]
      .filter((s) => isSpecialtyId(s.specialtyId))
      .sort((x, y) => Number(y.isPrimary) - Number(x.isPrimary));
    const specialties = specRows.map((s) => s.specialtyId as SpecialtyId);
    const clinic = d.clinicId ? b.clinics.get(d.clinicId) : undefined;
    return {
      id: d.id,
      fullName: d.fullName,
      qualifications: d.qualifications,
      specialties,
      primarySpecialty: specialties[0] ?? "general_medicine",
      conditions: b.conds.get(d.id) ?? [],
      experienceYears: d.experienceYears,
      languages: d.languages,
      consultationFee: d.consultationFee,
      bio: d.bio,
      slotMinutes: d.slotMinutes,
      acceptingAppointments: d.acceptingAppointments,
      verificationStatus: d.verificationStatus,
      verificationSource: d.verificationStatus === "verified" ? "admin_register_check" : null,
      isDemo: d.isDemo,
      clinic: clinic ? toClinic(clinic) : null,
      availability: b.avail.get(d.id) ?? [],
      leaves: b.leaves.get(d.id) ?? [],
    };
  });
}

export async function loadProfile(db: Db, doctorId: string): Promise<DoctorProfile | null> {
  const b = await loadBundle(db, doctorId);
  return assemble(b)[0] ?? null;
}

export async function getDoctorPrivate(
  db: Db,
  doctorId: string,
): Promise<{
  registrationNumber: string;
  registrationCouncil: string;
  email: string;
  handle: string;
} | null> {
  const d = await db.table("doctors").get(doctorId);
  return d
    ? {
        registrationNumber: d.registrationNumber,
        registrationCouncil: d.registrationCouncil,
        email: d.email,
        handle: d.handle,
      }
    : null;
}

export function profileMissing(p: DoctorProfile): string[] {
  const missing: string[] = [];
  if (p.specialties.length === 0) missing.push("specialization");
  if (!p.clinic || !p.clinic.name || !p.clinic.addressLine || !p.clinic.city)
    missing.push("clinic address");
  if (p.availability.length === 0) missing.push("weekly availability");
  return missing;
}

/* ------------------------------------------------------------------ *
 * Booked slots / ratings
 * ------------------------------------------------------------------ */
const ACTIVE: AppointmentStatus[] = ["requested", "confirmed"];

async function bookedMap(db: Db, fromDate: string): Promise<Map<string, Set<string>>> {
  const m = new Map<string, Set<string>>();
  for (const a of await db.table("appointments").all()) {
    if (!ACTIVE.includes(a.status) || a.appointmentDate < fromDate) continue;
    const set = m.get(a.doctorId) ?? new Set<string>();
    set.add(`${a.appointmentDate}T${a.appointmentTime}`);
    m.set(a.doctorId, set);
  }
  return m;
}

export async function ratingsMap(
  db: Db,
): Promise<Map<string, { average: number | null; count: number }>> {
  const sums = new Map<string, { sum: number; n: number }>();
  for (const r of await db.table("reviews").all()) {
    if (r.status === "removed") continue;
    const s = sums.get(r.doctorId) ?? { sum: 0, n: 0 };
    s.sum += r.rating;
    s.n += 1;
    sums.set(r.doctorId, s);
  }
  return new Map(
    [...sums].map(([k, v]) => [k, { average: Math.round((v.sum / v.n) * 10) / 10, count: v.n }]),
  );
}

/* ------------------------------------------------------------------ *
 * Search
 * ------------------------------------------------------------------ */
export async function searchDoctors(
  db: Db,
  p: {
    targets: SpecialtyTarget[];
    symptomText?: string;
    patient: LatLng | null;
    limit?: number;
    now?: Date;
  },
): Promise<{ matches: DoctorMatch[]; directorySize: number }> {
  const now = p.now ?? new Date();
  const bundle = await loadBundle(db);
  let profiles = assemble(bundle);
  if (env("DIRECTORY_REQUIRE_VERIFIED") === "true") {
    profiles = profiles.filter((d) => d.verificationStatus === "verified");
  }
  const [booked, ratings] = await Promise.all([bookedMap(db, istNow(now).date), ratingsMap(db)]);
  const matches = rankDoctors({
    doctors: profiles,
    targets: p.targets,
    symptomText: p.symptomText ?? "",
    patient: p.patient,
    booked,
    ratings,
    now,
    limit: p.limit ?? 12,
  });
  return { matches, directorySize: profiles.length };
}

export async function slotsFor(
  db: Db,
  doctorId: string,
  date: string,
  now: Date = new Date(),
): Promise<string[] | null> {
  const profile = await loadProfile(db, doctorId);
  if (!profile || !profile.acceptingAppointments) return null;
  const booked = (await bookedMap(db, date)).get(doctorId) ?? new Set<string>();
  return slotsForDate(profile, date, booked, now);
}

/* ------------------------------------------------------------------ *
 * Doctor portal: profile, availability, leave
 * ------------------------------------------------------------------ */
export interface ClinicInput {
  name: string;
  kind: "hospital" | "clinic";
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  lat: number | null;
  lng: number | null;
  phone: string;
}

export interface ProfileInput {
  fullName?: string;
  qualifications?: string;
  registrationNumber?: string;
  registrationCouncil?: string;
  specialties?: SpecialtyId[];
  conditions?: string[];
  experienceYears?: number | null;
  languages?: string[];
  consultationFee?: number | null;
  bio?: string;
  slotMinutes?: number;
  acceptingAppointments?: boolean;
  clinic?: ClinicInput;
}

export async function saveDoctorProfile(
  db: Db,
  doctorId: string,
  input: ProfileInput,
): Promise<{ ok: true; profile: DoctorProfile } | Failure> {
  const doc = await db.table("doctors").get(doctorId);
  if (!doc) return { ok: false, error: "not_found", status: 404 };

  const patch: Partial<DoctorRow> = {};
  if (input.fullName !== undefined) {
    if (input.fullName.trim().length < 3) return { ok: false, error: "invalid_name" };
    patch.fullName = input.fullName.trim();
  }
  if (input.qualifications !== undefined) patch.qualifications = input.qualifications.trim();
  if (input.experienceYears !== undefined) patch.experienceYears = input.experienceYears;
  if (input.languages !== undefined) patch.languages = input.languages;
  if (input.consultationFee !== undefined) patch.consultationFee = input.consultationFee;
  if (input.bio !== undefined) patch.bio = input.bio;
  if (input.slotMinutes !== undefined) {
    if (![10, 15, 20, 30, 40, 45, 60].includes(input.slotMinutes)) {
      return { ok: false, error: "invalid_slot_minutes" };
    }
    patch.slotMinutes = input.slotMinutes;
  }

  // Changing registration details invalidates a previous verification: it must be checked again.
  const newNo = input.registrationNumber?.trim();
  const newCouncil = input.registrationCouncil?.trim();
  if (
    (newNo !== undefined && newNo !== doc.registrationNumber) ||
    (newCouncil !== undefined && newCouncil !== doc.registrationCouncil)
  ) {
    const no = newNo ?? doc.registrationNumber;
    const council = newCouncil ?? doc.registrationCouncil;
    if (no && !/^[A-Za-z0-9\-/ ]{3,40}$/.test(no))
      return { ok: false, error: "invalid_registration_number" };
    patch.registrationNumber = no;
    patch.registrationCouncil = council;
    patch.verificationStatus = no && council ? "pending" : "unverified";
    patch.verificationSource = "";
    patch.verifiedAt = null;
  }

  if (input.specialties !== undefined) {
    const list = [...new Set(input.specialties.filter(isSpecialtyId))].slice(0, 4);
    if (list.length === 0) return { ok: false, error: "specialty_required" };
    for (const r of await db.table("doctor_specializations").where("doctorId", doctorId)) {
      await db.table("doctor_specializations").remove(r.id);
    }
    for (const [i, s] of list.entries()) {
      await db
        .table("doctor_specializations")
        .insert({ id: newId(), doctorId, specialtyId: s, isPrimary: i === 0 });
    }
  }
  if (input.conditions !== undefined) {
    for (const r of await db.table("doctor_conditions").where("doctorId", doctorId)) {
      await db.table("doctor_conditions").remove(r.id);
    }
    for (const c of input.conditions.slice(0, 25)) {
      await db.table("doctor_conditions").insert({ id: newId(), doctorId, condition: c });
    }
  }

  if (input.clinic) {
    const c = input.clinic;
    if (!c.name.trim() || !c.addressLine.trim() || !c.city.trim()) {
      return { ok: false, error: "clinic_address_required" };
    }
    if ((c.lat !== null || c.lng !== null) && !isValidLatLng({ lat: c.lat, lng: c.lng })) {
      return { ok: false, error: "invalid_coordinates" };
    }
    // Demo clinics are shared between several demo doctors; never edit a shared row.
    let owned: ClinicRow | null = null;
    if (doc.clinicId) {
      const existing = await db.table("clinics").get(doc.clinicId);
      const sharedWith = (await db.table("doctors").where("clinicId", doc.clinicId)).length;
      if (existing && !existing.isDemo && sharedWith <= 1) owned = existing;
    }
    const row: ClinicRow = {
      id: owned?.id ?? newId(),
      name: c.name.trim(),
      kind: c.kind,
      addressLine: c.addressLine.trim(),
      city: c.city.trim(),
      state: c.state.trim(),
      pincode: c.pincode.trim(),
      lat: c.lat,
      lng: c.lng,
      phone: c.phone.trim(),
      isDemo: false,
    };
    if (owned) await db.table("clinics").update(owned.id, row);
    else await db.table("clinics").insert(row);
    patch.clinicId = row.id;
  }

  if (Object.keys(patch).length) await db.table("doctors").update(doctorId, patch);

  if (input.acceptingAppointments !== undefined) {
    if (input.acceptingAppointments) {
      const p = await loadProfile(db, doctorId);
      const missing = p ? profileMissing(p) : ["profile"];
      if (missing.length) {
        return { ok: false, error: `profile_incomplete:${missing.join(",")}` };
      }
    }
    await db
      .table("doctors")
      .update(doctorId, { acceptingAppointments: input.acceptingAppointments });
  }

  const profile = await loadProfile(db, doctorId);
  return profile ? { ok: true, profile } : { ok: false, error: "not_found", status: 404 };
}

export async function setAvailability(
  db: Db,
  doctorId: string,
  windows: { weekday: number; startTime: string; endTime: string }[],
): Promise<{ ok: true; availability: AvailabilityWindow[] } | Failure> {
  const perDay = new Map<number, { s: number; e: number }[]>();
  for (const w of windows) {
    if (!Number.isInteger(w.weekday) || w.weekday < 0 || w.weekday > 6)
      return { ok: false, error: "invalid_weekday" };
    if (!isValidTime(w.startTime) || !isValidTime(w.endTime))
      return { ok: false, error: "invalid_time" };
    const s = toMinutes(w.startTime);
    const e = toMinutes(w.endTime);
    if (e <= s) return { ok: false, error: "end_before_start" };
    const list = perDay.get(w.weekday) ?? [];
    if (list.some((x) => s < x.e && x.s < e)) return { ok: false, error: "overlapping_windows" };
    list.push({ s, e });
    if (list.length > 3) return { ok: false, error: "too_many_windows" };
    perDay.set(w.weekday, list);
  }
  for (const r of await db.table("doctor_availability").where("doctorId", doctorId)) {
    await db.table("doctor_availability").remove(r.id);
  }
  const out: AvailabilityWindow[] = [];
  for (const w of windows) {
    const row = {
      id: newId(),
      doctorId,
      weekday: w.weekday,
      startTime: w.startTime,
      endTime: w.endTime,
    };
    await db.table("doctor_availability").insert(row);
    out.push({ id: row.id, weekday: row.weekday, startTime: row.startTime, endTime: row.endTime });
  }
  return { ok: true, availability: out };
}

export async function addLeave(
  db: Db,
  doctorId: string,
  l: { startDate: string; endDate: string; reason: string },
  now: Date = new Date(),
): Promise<{ ok: true; leave: Leave; affectedAppointments: number } | Failure> {
  if (!isValidDate(l.startDate) || !isValidDate(l.endDate))
    return { ok: false, error: "invalid_date" };
  if (l.endDate < l.startDate) return { ok: false, error: "end_before_start" };
  const today = istNow(now).date;
  if (l.endDate < today) return { ok: false, error: "leave_in_past" };
  if (l.startDate > addDays(today, 366)) return { ok: false, error: "too_far_ahead" };
  if (l.endDate > addDays(l.startDate, 90)) return { ok: false, error: "leave_too_long" };
  const row = {
    id: newId(),
    doctorId,
    startDate: l.startDate,
    endDate: l.endDate,
    reason: l.reason,
  };
  await db.table("doctor_leaves").insert(row);
  const affected = (await db.table("appointments").where("doctorId", doctorId)).filter(
    (a) =>
      ACTIVE.includes(a.status) &&
      a.appointmentDate >= l.startDate &&
      a.appointmentDate <= l.endDate,
  ).length;
  return {
    ok: true,
    leave: { id: row.id, startDate: row.startDate, endDate: row.endDate, reason: row.reason },
    affectedAppointments: affected,
  };
}

export async function removeLeave(db: Db, doctorId: string, leaveId: string): Promise<boolean> {
  const l = await db.table("doctor_leaves").get(leaveId);
  if (!l || l.doctorId !== doctorId) return false;
  return db.table("doctor_leaves").remove(leaveId);
}

/* ------------------------------------------------------------------ *
 * Appointments
 * ------------------------------------------------------------------ */
const MAX_ACTIVE_PER_PATIENT = 5;
const MAX_DAYS_AHEAD = 30;

let bookingLock: Promise<unknown> = Promise.resolve();
function withBookingLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = bookingLock.then(fn, fn);
  bookingLock = run.catch(() => undefined);
  return run;
}

export async function bookAppointment(
  db: Db,
  patientId: string,
  input: { doctorId: string; date: string; time: string; reason: string; sharedSummary: string },
  now: Date = new Date(),
): Promise<{ ok: true; appointment: AppointmentRow } | Failure> {
  if (!isValidDate(input.date) || !isValidTime(input.time))
    return { ok: false, error: "invalid_slot" };
  const today = istNow(now).date;
  if (input.date > addDays(today, MAX_DAYS_AHEAD)) return { ok: false, error: "too_far_ahead" };

  return withBookingLock(async () => {
    const profile = await loadProfile(db, input.doctorId);
    if (!profile || !profile.acceptingAppointments)
      return { ok: false as const, error: "doctor_unavailable", status: 404 };

    const mine = (await db.table("appointments").where("patientId", patientId)).filter((a) =>
      ACTIVE.includes(a.status),
    );
    if (mine.length >= MAX_ACTIVE_PER_PATIENT)
      return { ok: false as const, error: "too_many_active", status: 429 };
    if (mine.some((a) => a.appointmentDate === input.date && a.appointmentTime === input.time)) {
      return { ok: false as const, error: "patient_slot_clash", status: 409 };
    }

    const booked = (await bookedMap(db, input.date)).get(input.doctorId) ?? new Set<string>();
    if (!slotsForDate(profile, input.date, booked, now).includes(input.time)) {
      return { ok: false as const, error: "slot_unavailable", status: 409 };
    }

    const ts = now.toISOString();
    const row: AppointmentRow = {
      id: newId(),
      patientId,
      doctorId: input.doctorId,
      appointmentDate: input.date,
      appointmentTime: input.time,
      status: "requested",
      reason: input.reason,
      sharedSummary: input.sharedSummary,
      createdAt: ts,
      updatedAt: ts,
    };
    try {
      await db.table("appointments").insert(row);
    } catch (e) {
      if (isUniqueViolation(e))
        return { ok: false as const, error: "slot_unavailable", status: 409 };
      throw e;
    }
    return { ok: true as const, appointment: row };
  });
}

function ageFromDob(dob: string, now: Date): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const b = new Date(`${dob}T00:00:00Z`);
  if (Number.isNaN(b.getTime())) return null;
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const m = now.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

function baseAppt(a: AppointmentRow) {
  return {
    id: a.id,
    patientId: a.patientId,
    doctorId: a.doctorId,
    date: a.appointmentDate,
    time: a.appointmentTime,
    status: a.status,
    reason: a.reason,
    sharedSummary: a.sharedSummary,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

export async function listPatientAppointments(
  db: Db,
  patientId: string,
): Promise<PatientAppointmentView[]> {
  const appts = (await db.table("appointments").where("patientId", patientId)).sort((a, b) =>
    `${b.appointmentDate}${b.appointmentTime}`.localeCompare(
      `${a.appointmentDate}${a.appointmentTime}`,
    ),
  );
  if (appts.length === 0) return [];
  const bundle = await loadBundle(db);
  const profiles = new Map(assemble(bundle).map((p) => [p.id, p]));
  const reviewed = new Set(
    (await db.table("reviews").where("patientId", patientId)).map((r) => r.appointmentId),
  );
  return appts.map((a) => {
    const p = profiles.get(a.doctorId);
    return {
      ...baseAppt(a),
      doctorName: p?.fullName ?? "Doctor",
      specialty: p ? SPECIALTY_BY_ID[p.primarySpecialty].name : "",
      clinicName: p?.clinic?.name ?? "",
      clinicAddress: p?.clinic ? `${p.clinic.addressLine}, ${p.clinic.city}` : "",
      reviewed: reviewed.has(a.id),
    };
  });
}

export async function listDoctorAppointments(
  db: Db,
  doctorId: string,
  now: Date = new Date(),
): Promise<DoctorAppointmentView[]> {
  const appts = (await db.table("appointments").where("doctorId", doctorId)).sort((a, b) =>
    `${a.appointmentDate}${a.appointmentTime}`.localeCompare(
      `${b.appointmentDate}${b.appointmentTime}`,
    ),
  );
  const patients = new Map((await db.table("patients").all()).map((p) => [p.id, p]));
  return appts.map((a) => {
    const p = patients.get(a.patientId);
    return {
      ...baseAppt(a),
      patientName: p?.fullName ?? "Patient",
      patientAge: p ? ageFromDob(p.dateOfBirth, now) : null,
      patientGender: p?.gender ?? "",
      patientPhoneVerified: p?.phoneVerified ?? false,
    };
  });
}

const DOCTOR_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  requested: ["confirmed", "cancelled"],
  confirmed: ["completed", "no_show", "cancelled"],
  completed: [],
  cancelled: [],
  no_show: [],
};
const PATIENT_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  requested: ["cancelled"],
  confirmed: ["cancelled"],
  completed: [],
  cancelled: [],
  no_show: [],
};

export async function changeAppointmentStatus(
  db: Db,
  actor: { role: "doctor" | "patient"; profileId: string },
  appointmentId: string,
  next: AppointmentStatus,
  now: Date = new Date(),
): Promise<{ ok: true; appointment: AppointmentRow } | Failure> {
  const a = await db.table("appointments").get(appointmentId);
  const owns =
    a &&
    (actor.role === "doctor" ? a.doctorId === actor.profileId : a.patientId === actor.profileId);
  if (!a || !owns) return { ok: false, error: "not_found", status: 404 };
  const allowed = (actor.role === "doctor" ? DOCTOR_TRANSITIONS : PATIENT_TRANSITIONS)[a.status];
  if (!allowed.includes(next)) return { ok: false, error: "invalid_transition", status: 409 };

  if (next === "completed" || next === "no_show") {
    const today = istNow(now).date;
    const early = demoAccountsAllowed() && env("DEMO_EARLY_COMPLETE") === "true";
    if (a.appointmentDate > today && !early)
      return { ok: false, error: "visit_not_yet_happened", status: 409 };
  }

  const updated = await db
    .table("appointments")
    .update(a.id, { status: next, updatedAt: now.toISOString() });
  if (!updated) return { ok: false, error: "not_found", status: 404 };

  if (next === "completed") {
    const existing = await db.table("verified_visits").where("appointmentId", a.id);
    if (existing.length === 0) {
      try {
        await db.table("verified_visits").insert({
          id: newId(),
          appointmentId: a.id,
          patientId: a.patientId,
          doctorId: a.doctorId,
          verifiedAt: now.toISOString(),
        });
      } catch (e) {
        if (!isUniqueViolation(e)) throw e;
      }
    }
  }
  return { ok: true, appointment: updated };
}

/* ------------------------------------------------------------------ *
 * Reviews and moderation
 * ------------------------------------------------------------------ */
const REVIEWS_PER_DAY = 3;
export const FLAG_REASONS = [
  "inappropriate_language",
  "not_a_patient",
  "contains_personal_info",
  "spam",
  "other",
] as const;
export type FlagReason = (typeof FLAG_REASONS)[number];

/** Reject text that would expose private data (phone numbers, e-mails, links). */
export function reviewTextProblem(text: string): string | null {
  if (text.length > 1000) return "review_too_long";
  if (/(?:\+?\d[\s-]?){10,}/.test(text)) return "review_contains_phone";
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(text)) return "review_contains_email";
  if (/https?:\/\/|www\./i.test(text)) return "review_contains_link";
  return null;
}

export async function createReview(
  db: Db,
  patientId: string,
  input: { appointmentId: string; rating: number; text: string },
  now: Date = new Date(),
): Promise<{ ok: true; review: ReviewRow } | Failure> {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5)
    return { ok: false, error: "invalid_rating" };
  const problem = reviewTextProblem(input.text);
  if (problem) return { ok: false, error: problem };

  const patient = await db.table("patients").get(patientId);
  if (!patient) return { ok: false, error: "not_found", status: 404 };
  if (!patient.phoneVerified) return { ok: false, error: "phone_not_verified", status: 403 };

  const visit = (await db.table("verified_visits").where("appointmentId", input.appointmentId))[0];
  if (!visit || visit.patientId !== patientId)
    return { ok: false, error: "no_verified_visit", status: 403 };

  const mine = await db.table("reviews").where("patientId", patientId);
  if (mine.some((r) => r.appointmentId === input.appointmentId))
    return { ok: false, error: "already_reviewed", status: 409 };
  const dayAgo = now.getTime() - 24 * 3600_000;
  if (mine.filter((r) => new Date(r.createdAt).getTime() > dayAgo).length >= REVIEWS_PER_DAY) {
    return { ok: false, error: "review_rate_limited", status: 429 };
  }

  const ts = now.toISOString();
  const row: ReviewRow = {
    id: newId(),
    visitId: visit.id,
    appointmentId: input.appointmentId,
    patientId,
    doctorId: visit.doctorId,
    rating: input.rating,
    body: input.text.trim(),
    status: "published",
    doctorResponse: "",
    moderationNote: "",
    moderatedBy: "",
    createdAt: ts,
    updatedAt: ts,
  };
  try {
    await db.table("reviews").insert(row);
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "already_reviewed", status: 409 };
    throw e;
  }
  return { ok: true, review: row };
}

function toPublicReview(r: ReviewRow): PublicReview {
  const removed = r.status === "removed";
  return {
    id: r.id,
    rating: r.rating,
    // A removed review's text is withheld; the moderation reason stays visible for transparency.
    text: removed ? "" : r.body,
    createdAt: r.createdAt,
    badge: "verified_visit",
    status: r.status,
    doctorResponse: removed ? "" : r.doctorResponse,
    moderationNote: r.moderationNote,
  };
}

export async function listPublicReviews(db: Db, doctorId: string): Promise<PublicReview[]> {
  return (await db.table("reviews").where("doctorId", doctorId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(toPublicReview);
}

export async function flagReview(
  db: Db,
  actor: { role: "patient" | "doctor"; profileId: string },
  reviewId: string,
  reason: FlagReason,
  now: Date = new Date(),
): Promise<{ ok: true } | Failure> {
  const r = await db.table("reviews").get(reviewId);
  if (!r) return { ok: false, error: "not_found", status: 404 };
  const flags = await db.table("review_flags").where("reviewId", reviewId);

  if (actor.role === "doctor" && r.doctorId !== actor.profileId) {
    return { ok: false, error: "not_found", status: 404 };
  }
  // The review's own author may only use their flag to APPEAL a removal, once.
  const isAuthor = actor.role === "patient" && r.patientId === actor.profileId;
  if (isAuthor) {
    if (r.status !== "removed") return { ok: false, error: "cannot_flag_own_review", status: 409 };
    if (flags.some((f) => f.reporterId === actor.profileId && f.reason === "appeal")) {
      return { ok: false, error: "appeal_already_made", status: 409 };
    }
  } else if (r.status === "removed") {
    return { ok: false, error: "already_removed", status: 409 };
  }
  if (flags.some((f) => f.reporterId === actor.profileId && !f.resolved)) {
    return { ok: false, error: "already_flagged", status: 409 };
  }

  await db.table("review_flags").insert({
    id: newId(),
    reviewId,
    reporterRole: actor.role,
    reporterId: actor.profileId,
    reason: isAuthor ? "appeal" : reason,
    createdAt: now.toISOString(),
    resolved: false,
  });
  // A flag never hides a review by itself: it stays visible, labelled "under review", until a moderator decides.
  await db.table("reviews").update(reviewId, { status: "flagged", updatedAt: now.toISOString() });
  return { ok: true };
}

export async function respondToReview(
  db: Db,
  doctorId: string,
  reviewId: string,
  text: string,
): Promise<{ ok: true } | Failure> {
  const r = await db.table("reviews").get(reviewId);
  if (!r || r.doctorId !== doctorId) return { ok: false, error: "not_found", status: 404 };
  const clean = text.trim();
  if (clean.length < 3 || clean.length > 600) return { ok: false, error: "invalid_response" };
  const problem = reviewTextProblem(clean);
  if (problem) return { ok: false, error: problem };
  await db
    .table("reviews")
    .update(reviewId, { doctorResponse: clean, updatedAt: new Date().toISOString() });
  return { ok: true };
}

export async function listDoctorReviews(db: Db, doctorId: string) {
  const reviews = await listPublicReviews(db, doctorId);
  const flags = await db.table("review_flags").all();
  const open = new Map<string, number>();
  for (const f of flags) if (!f.resolved) open.set(f.reviewId, (open.get(f.reviewId) ?? 0) + 1);
  return reviews.map((r) => ({ ...r, openFlags: open.get(r.id) ?? 0 }));
}

/* ----- admin ----- */
export async function adminListDoctors(db: Db) {
  const profiles = assemble(await loadBundle(db));
  const privates = new Map((await db.table("doctors").all()).map((d) => [d.id, d]));
  return profiles
    .filter((p) => !p.isDemo)
    .map((p) => {
      const d = privates.get(p.id)!;
      return {
        id: p.id,
        fullName: p.fullName,
        qualifications: p.qualifications,
        registrationNumber: d.registrationNumber,
        registrationCouncil: d.registrationCouncil,
        email: d.email,
        status: p.verificationStatus,
        specialties: p.specialties,
        clinic: p.clinic ? `${p.clinic.name}, ${p.clinic.city}` : "",
      };
    });
}

export async function adminSetVerification(
  db: Db,
  doctorId: string,
  decision: "verify" | "reject" | "reset",
  now: Date = new Date(),
): Promise<{ ok: true } | Failure> {
  const d = await db.table("doctors").get(doctorId);
  if (!d) return { ok: false, error: "not_found", status: 404 };
  if (d.isDemo) return { ok: false, error: "demo_profile", status: 409 };
  if (decision === "verify" && (!d.registrationNumber || !d.registrationCouncil)) {
    return { ok: false, error: "registration_details_missing", status: 409 };
  }
  await db.table("doctors").update(
    doctorId,
    decision === "verify"
      ? {
          verificationStatus: "verified",
          verificationSource: "admin_register_check",
          verifiedAt: now.toISOString(),
        }
      : decision === "reject"
        ? { verificationStatus: "rejected", verificationSource: "", verifiedAt: null }
        : { verificationStatus: "pending", verificationSource: "", verifiedAt: null },
  );
  return { ok: true };
}

export async function adminFlaggedReviews(db: Db) {
  const [reviews, flags, doctors] = await Promise.all([
    db.table("reviews").all(),
    db.table("review_flags").all(),
    db.table("doctors").all(),
  ]);
  const names = new Map(doctors.map((d) => [d.id, d.fullName]));
  return reviews
    .filter((r) => r.status === "flagged")
    .map((r) => ({
      id: r.id,
      doctorId: r.doctorId,
      doctorName: names.get(r.doctorId) ?? "",
      rating: r.rating,
      text: r.body,
      doctorResponse: r.doctorResponse,
      createdAt: r.createdAt,
      flags: flags
        .filter((f) => f.reviewId === r.id && !f.resolved)
        .map((f) => ({
          id: f.id,
          reporterRole: f.reporterRole,
          reason: f.reason,
          createdAt: f.createdAt,
        })),
    }));
}

export async function adminModerate(
  db: Db,
  adminId: string,
  reviewId: string,
  decision: "keep" | "remove",
  note: string,
  now: Date = new Date(),
): Promise<{ ok: true } | Failure> {
  const r = await db.table("reviews").get(reviewId);
  if (!r || r.status !== "flagged") return { ok: false, error: "not_found", status: 404 };
  const clean = note.trim();
  if (clean.length < 10 || clean.length > 400) return { ok: false, error: "note_required" };
  await db.table("reviews").update(reviewId, {
    status: decision === "keep" ? "published" : "removed",
    moderationNote: clean,
    moderatedBy: adminId,
    updatedAt: now.toISOString(),
  });
  for (const f of await db.table("review_flags").where("reviewId", reviewId)) {
    if (!f.resolved) await db.table("review_flags").update(f.id, { resolved: true });
  }
  return { ok: true };
}

export type { ReviewRow, DoctorRow };
