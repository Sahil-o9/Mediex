import { env } from "./env.server";
import { getMongoDb } from "./mongo.server";
import type { Filter } from "mongodb";

/**
 * Minimal table-store used by every domain service.
 *
 * Two adapters sit behind the same interface:
 *   - memory   (default) — a process-local DEMO store, pre-loaded with clearly
 *                          labelled demo data. Nothing is persisted: a restart
 *                          wipes accounts, appointments and reviews, and it is
 *                          not shared between serverless instances.
 *   - mongodb            — MongoDB Atlas through the native server-side driver.
 *                          Select with DATA_ADAPTER=mongodb. MONGODB_URI stays
 *                          server-side.
 *   - supabase           — PostgreSQL through Supabase's REST API (PostgREST),
 *                          using the SERVICE-ROLE key on the server only.
 *                          Select with DATA_ADAPTER=supabase.
 *
 * Rows are stored in collections; the public `id` maps to MongoDB's `_id`.
 */

export type Row = { id: string } & Record<string, unknown>;

export interface Table<T extends Row> {
  all(): Promise<T[]>;
  get(id: string): Promise<T | null>;
  where<K extends keyof T & string>(field: K, value: T[K]): Promise<T[]>;
  insert(row: T): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T | null>;
  remove(id: string): Promise<boolean>;
}

/* ------------------------------------------------------------------ *
 * Row types (one per persistent table or collection)
 * ------------------------------------------------------------------ */

export type AccountRole = "patient" | "doctor" | "admin";

export interface AccountRow extends Row {
  role: AccountRole;
  /** Normalised login identifier: 10-digit phone (patient) or lower-case email / doctor handle. */
  identifier: string;
  /** Second identifier that also logs in (doctor handle like DR-123456), or "". */
  altIdentifier: string;
  passwordHash: string;
  profileId: string | null;
  createdAt: string;
}

export interface PatientRow extends Row {
  fullName: string;
  phone: string;
  phoneVerified: boolean;
  email: string;
  dateOfBirth: string;
  gender: string;
  language: string;
  abhaId?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  consentAt: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface ClinicRow extends Row {
  name: string;
  kind: "hospital" | "clinic";
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  lat: number | null;
  lng: number | null;
  phone: string;
  isDemo: boolean;
  verificationStatus?: "pending" | "verified" | "rejected";
  verifiedAt?: string | null;
}

export interface DoctorRow extends Row {
  handle: string;
  fullName: string;
  email: string;
  qualifications: string;
  registrationNumber: string;
  registrationCouncil: string;
  verificationStatus: "unverified" | "pending" | "verified" | "rejected";
  verificationSource: string;
  verifiedAt: string | null;
  experienceYears: number | null;
  languages: string[];
  consultationFee: number | null;
  bio: string;
  clinicId: string | null;
  slotMinutes: number;
  acceptingAppointments: boolean;
  isDemo: boolean;
  createdAt: string;
}

export interface DoctorSpecializationRow extends Row {
  doctorId: string;
  specialtyId: string;
  isPrimary: boolean;
}

export interface DoctorConditionRow extends Row {
  doctorId: string;
  condition: string;
}

export interface AvailabilityRow extends Row {
  doctorId: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface LeaveRow extends Row {
  doctorId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface AppointmentRow extends Row {
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
  activeSlotKey?: string;
  status: "requested" | "confirmed" | "completed" | "cancelled" | "no_show";
  reason: string;
  sharedSummary: string;
  createdAt: string;
  updatedAt: string;
}

export interface VerifiedVisitRow extends Row {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  verifiedAt: string;
}

export interface ReviewRow extends Row {
  visitId: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  rating: number;
  body: string;
  status: "published" | "flagged" | "removed";
  doctorResponse: string;
  moderationNote: string;
  moderatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewFlagRow extends Row {
  reviewId: string;
  reporterRole: "patient" | "doctor";
  reporterId: string;
  reason: string;
  createdAt: string;
  resolved: boolean;
}

export interface OtpRow extends Row {
  phone: string;
  codeHash: string;
  expiresAt: string;
  attempts: number;
  consumedAt: string | null;
  createdAt: string;
}

export interface TableMap {
  accounts: AccountRow;
  patients: PatientRow;
  clinics: ClinicRow;
  doctors: DoctorRow;
  doctor_specializations: DoctorSpecializationRow;
  doctor_conditions: DoctorConditionRow;
  doctor_availability: AvailabilityRow;
  doctor_leaves: LeaveRow;
  appointments: AppointmentRow;
  verified_visits: VerifiedVisitRow;
  reviews: ReviewRow;
  review_flags: ReviewFlagRow;
  otp_challenges: OtpRow;
}

export type TableName = keyof TableMap;

export interface Db {
  mode: "memory" | "mongodb" | "supabase";
  table<N extends TableName>(name: N): Table<TableMap[N]>;
}

export class DbConfigError extends Error {}

/* ------------------------------------------------------------------ *
 * Memory adapter
 * ------------------------------------------------------------------ */
interface MemoryStore {
  tables: Map<string, Map<string, Row>>;
  seeded: boolean;
}
const g = globalThis as unknown as { __mediexDb?: MemoryStore };

function memoryDb(): Db {
  const store = (g.__mediexDb ??= { tables: new Map(), seeded: false });
  const tbl = (name: string) => {
    let t = store.tables.get(name);
    if (!t) store.tables.set(name, (t = new Map()));
    return t;
  };
  return {
    mode: "memory",
    table<N extends TableName>(name: N): Table<TableMap[N]> {
      type T = TableMap[N];
      const t = tbl(name) as Map<string, T>;
      return {
        async all() {
          return [...t.values()].map((r) => structuredClone(r));
        },
        async get(id) {
          const r = t.get(id);
          return r ? structuredClone(r) : null;
        },
        async where(field, value) {
          return [...t.values()].filter((r) => r[field] === value).map((r) => structuredClone(r));
        },
        async insert(row) {
          if (t.has(row.id)) throw new Error("duplicate_id");
          t.set(row.id, structuredClone(row));
          return structuredClone(row);
        },
        async update(id, patch) {
          const cur = t.get(id);
          if (!cur) return null;
          const next = { ...cur, ...patch, id } as T;
          t.set(id, next);
          return structuredClone(next);
        },
        async remove(id) {
          return t.delete(id);
        },
      };
    },
  };
}

/** Marks the memory store as seeded exactly once. Returns true if the caller should seed. */
export function claimMemorySeed(): boolean {
  const store = (g.__mediexDb ??= { tables: new Map(), seeded: false });
  if (store.seeded) return false;
  store.seeded = true;
  return true;
}

/** Test helper: wipe the in-memory store. */
export function resetMemoryDb(): void {
  g.__mediexDb = { tables: new Map(), seeded: false };
}

/* ------------------------------------------------------------------ *
 * Supabase adapter (PostgREST, service-role key — server side only)
 * ------------------------------------------------------------------ */
const snake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const camel = (s: string) => s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
const FIELD_RE = /^[A-Za-z][A-Za-z0-9]*$/;

function mapKeys(obj: Record<string, unknown>, fn: (k: string) => string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[fn(k)] = v;
  return out;
}

function supabaseDb(url: string, serviceKey: string): Db {
  const base = url.replace(/\/$/, "");
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  async function rest(path: string, init: RequestInit = {}): Promise<Response> {
    const res = await fetch(`${base}/rest/v1/${path}`, {
      ...init,
      headers: { ...headers, "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    if (!res.ok) {
      // Status only — response bodies can echo row data.
      const err = new Error(`supabase ${res.status}`) as Error & { status?: number; code?: string };
      err.status = res.status;
      try {
        const body = (await res.json()) as { code?: string };
        if (body.code) err.code = body.code;
      } catch {
        /* ignore */
      }
      throw err;
    }
    return res;
  }

  return {
    mode: "supabase",
    table<N extends TableName>(name: N): Table<TableMap[N]> {
      type T = TableMap[N];
      const fromDb = (r: Record<string, unknown>) => mapKeys(r, camel) as unknown as T;
      const toDb = (r: Record<string, unknown>) => mapKeys(r, snake);
      return {
        async all() {
          const res = await rest(`${name}?select=*&limit=5000`);
          return ((await res.json()) as Record<string, unknown>[]).map(fromDb);
        },
        async get(id) {
          const res = await rest(`${name}?id=eq.${encodeURIComponent(id)}&select=*&limit=1`);
          const rows = (await res.json()) as Record<string, unknown>[];
          return rows[0] ? fromDb(rows[0]) : null;
        },
        async where(field, value) {
          if (!FIELD_RE.test(field)) throw new Error("bad_field");
          const v = value === null ? "is.null" : `eq.${encodeURIComponent(String(value))}`;
          const res = await rest(`${name}?${snake(field)}=${v}&select=*&limit=5000`);
          return ((await res.json()) as Record<string, unknown>[]).map(fromDb);
        },
        async insert(row) {
          const res = await rest(name, {
            method: "POST",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify(toDb(row)),
          });
          const rows = (await res.json()) as Record<string, unknown>[];
          return fromDb(rows[0] ?? (row as Record<string, unknown>));
        },
        async update(id, patch) {
          const res = await rest(`${name}?id=eq.${encodeURIComponent(id)}`, {
            method: "PATCH",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify(toDb(patch as Record<string, unknown>)),
          });
          const rows = (await res.json()) as Record<string, unknown>[];
          return rows[0] ? fromDb(rows[0]) : null;
        },
        async remove(id) {
          const res = await rest(`${name}?id=eq.${encodeURIComponent(id)}`, {
            method: "DELETE",
            headers: { Prefer: "return=representation" },
          });
          return ((await res.json()) as unknown[]).length > 0;
        },
      };
    },
  };
}

function mongoDb(): Db {
  return {
    mode: "mongodb",
    table<N extends TableName>(name: N): Table<TableMap[N]> {
      type T = TableMap[N];
      type Stored = Row & { _id?: string };

      return {
        async all() {
          const db = await getMongoDb();
          const rows = await db.collection<Stored>(name).find({}).toArray();
          return rows.map(({ _id, ...row }) => row as T);
        },
        async get(id) {
          const db = await getMongoDb();
          const row = await db.collection<Stored>(name).findOne({ _id: id });
          if (!row) return null;
          const { _id, ...result } = row;
          return result as T;
        },
        async where(field, value) {
          if (!FIELD_RE.test(field)) throw new Error("bad_field");
          const db = await getMongoDb();
          const rows = await db
            .collection<Stored>(name)
            .find({ [field]: value } as Filter<Stored>)
            .toArray();
          return rows.map(({ _id, ...row }) => row as T);
        },
        async insert(row) {
          const db = await getMongoDb();
          await db.collection<Stored>(name).insertOne({ ...row, _id: row.id });
          return row;
        },
        async update(id, patch) {
          const db = await getMongoDb();
          const { id: _rowId, ...changes } = patch;
          const collection = db.collection<Stored>(name);
          const result = await collection.updateOne({ _id: id }, { $set: changes });
          if (!result.matchedCount) return null;
          const row = await collection.findOne({ _id: id });
          if (!row) return null;
          const { _id, ...updated } = row;
          return updated as T;
        },
        async remove(id) {
          const db = await getMongoDb();
          const result = await db.collection<Stored>(name).deleteOne({ _id: id });
          return result.deletedCount > 0;
        },
      };
    },
  };
}

/** True when a write failed because a unique constraint rejected it. */
export function isUniqueViolation(e: unknown): boolean {
  return (
    !!e &&
    typeof e === "object" &&
    ((e as { code?: string | number }).code === "23505" ||
      (e as { code?: number }).code === 11000 ||
      (e as Error).message === "duplicate_id")
  );
}

export function getDb(): Db {
  const adapter = env("DATA_ADAPTER") ?? (env("MONGODB_URI") ? "mongodb" : "memory");
  if (adapter === "mongodb") return mongoDb();
  if (adapter === "supabase") {
    const url = env("SUPABASE_URL");
    const key = env("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) {
      throw new DbConfigError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
    }
    return supabaseDb(url, key);
  }
  if (adapter !== "memory") throw new DbConfigError(`Unsupported DATA_ADAPTER: ${adapter}`);
  return memoryDb();
}
