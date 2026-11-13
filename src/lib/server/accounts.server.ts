import { hashPassword, verifyPassword, authConfigured } from "./auth.server";
import {
  isUniqueViolation,
  type AccountRow,
  type Db,
  type DoctorRow,
  type PatientRow,
} from "./db.server";
import { demoAccountsAllowed, env, isProduction } from "./env.server";
import { rateLimit } from "./guards.server";

/**
 * Registered-account logic (patients and doctors). Staff/demo accounts are in
 * auth.server.ts. Passwords are PBKDF2-hashed; plain text is never stored or logged.
 */

export type Failure = { ok: false; error: string };
export type Ok<T> = { ok: true } & T;

export function newId(): string {
  return crypto.randomUUID();
}

/** Indian mobile: strips +91 / 0 / spaces / dashes, then requires 10 digits starting 6–9. */
export function normalizePhone(raw: string): string | null {
  let d = raw.replace(/[^\d]/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

export function normalizeEmail(raw: string): string | null {
  const e = raw.trim().toLowerCase();
  return e.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? e : null;
}

/** At least 8 characters with a letter and a digit. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return "password_too_short";
  if (pw.length > 200) return "password_too_long";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "password_weak";
  return null;
}

const DUMMY_HASH =
  "pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

async function findAccount(
  db: Db,
  role: AccountRow["role"],
  identifier: string,
): Promise<AccountRow | null> {
  const byId = (await db.table("accounts").where("identifier", identifier)).find(
    (a) => a.role === role,
  );
  if (byId) return byId;
  const byAlt = (await db.table("accounts").where("altIdentifier", identifier)).find(
    (a) => a.role === role,
  );
  return byAlt ?? null;
}

/* ------------------------------------------------------------------ *
 * Patients
 * ------------------------------------------------------------------ */
export interface PatientInput {
  fullName: string;
  phone: string;
  password: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  language?: string;
  consent: boolean;
}

export async function registerPatient(
  db: Db,
  input: PatientInput,
): Promise<Ok<{ patient: PatientRow; accountId: string }> | Failure> {
  if (input.fullName.trim().length < 2) return { ok: false, error: "invalid_name" };
  const phone = normalizePhone(input.phone);
  if (!phone) return { ok: false, error: "invalid_phone" };
  const email = input.email ? normalizeEmail(input.email) : "";
  if (input.email && !email) return { ok: false, error: "invalid_email" };
  const pw = passwordProblem(input.password);
  if (pw) return { ok: false, error: pw };
  if (!input.consent) return { ok: false, error: "consent_required" };
  if (input.dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(input.dateOfBirth)) {
    return { ok: false, error: "invalid_dob" };
  }
  if (await findAccount(db, "patient", phone)) return { ok: false, error: "phone_exists" };

  const now = new Date().toISOString();
  const patient: PatientRow = {
    id: newId(),
    fullName: input.fullName.trim().slice(0, 100),
    phone,
    phoneVerified: false,
    email: email ?? "",
    dateOfBirth: input.dateOfBirth ?? "",
    gender: (input.gender ?? "").slice(0, 20),
    language: ["en", "hi", "hinglish"].includes(input.language ?? "") ? input.language! : "en",
    consentAt: now,
    createdAt: now,
  };
  const account: AccountRow = {
    id: newId(),
    role: "patient",
    identifier: phone,
    altIdentifier: "",
    passwordHash: await hashPassword(input.password),
    profileId: patient.id,
    createdAt: now,
  };
  try {
    await db.table("patients").insert(patient);
    await db.table("accounts").insert(account);
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "phone_exists" };
    throw e;
  }
  return { ok: true, patient, accountId: account.id };
}

export async function loginPatient(
  db: Db,
  phoneRaw: string,
  password: string,
): Promise<Ok<{ patient: PatientRow; accountId: string }> | Failure> {
  const phone = normalizePhone(phoneRaw);
  const account = phone ? await findAccount(db, "patient", phone) : null;
  // Always run a hash so response time does not reveal whether the number is registered.
  const valid = await verifyPassword(password, account?.passwordHash ?? DUMMY_HASH);
  if (!account || !valid || !account.profileId) return { ok: false, error: "invalid_credentials" };
  const patient = await db.table("patients").get(account.profileId);
  if (!patient) return { ok: false, error: "invalid_credentials" };
  return { ok: true, patient, accountId: account.id };
}

/* ------------------------------------------------------------------ *
 * Doctors
 * ------------------------------------------------------------------ */
export interface DoctorSignupInput {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  qualifications: string;
  registrationNumber: string;
  registrationCouncil: string;
}

export async function registerDoctor(
  db: Db,
  input: DoctorSignupInput,
): Promise<Ok<{ doctor: DoctorRow; accountId: string }> | Failure> {
  if (input.fullName.trim().length < 3) return { ok: false, error: "invalid_name" };
  const phone = normalizePhone(input.phone);
  if (!phone) return { ok: false, error: "invalid_phone" };
  const email = normalizeEmail(input.email);
  if (!email) return { ok: false, error: "invalid_email" };
  const pw = passwordProblem(input.password);
  if (pw) return { ok: false, error: pw };
  if (input.qualifications.trim().length < 2)
    return { ok: false, error: "qualifications_required" };
  if (!/^[A-Za-z0-9\-/ ]{3,40}$/.test(input.registrationNumber.trim())) {
    return { ok: false, error: "invalid_registration_number" };
  }
  if (input.registrationCouncil.trim().length < 3) return { ok: false, error: "council_required" };
  if (await findAccount(db, "doctor", email)) return { ok: false, error: "email_exists" };

  const now = new Date().toISOString();
  const id = newId();
  const handle = `DR-${Math.floor(100000 + Math.random() * 900000)}`;
  const doctor: DoctorRow = {
    id,
    handle,
    fullName: input.fullName.trim().slice(0, 100),
    email,
    phone,
    qualifications: input.qualifications.trim().slice(0, 200),
    registrationNumber: input.registrationNumber.trim(),
    registrationCouncil: input.registrationCouncil.trim().slice(0, 120),
    // Details supplied → waiting for an admin to check them. Never auto-verified.
    verificationStatus: "pending",
    verificationSource: "",
    verifiedAt: null,
    experienceYears: null,
    languages: [],
    consultationFee: null,
    bio: "",
    clinicId: null,
    slotMinutes: 20,
    acceptingAppointments: false, // goes live once profile (specialty + clinic + hours) is complete
    isDemo: false,
    createdAt: now,
  };
  const account: AccountRow = {
    id: newId(),
    role: "doctor",
    identifier: email,
    altIdentifier: handle,
    passwordHash: await hashPassword(input.password),
    profileId: id,
    createdAt: now,
  };
  try {
    await db.table("doctors").insert(doctor);
    await db.table("accounts").insert(account);
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "email_exists" };
    throw e;
  }
  return { ok: true, doctor, accountId: account.id };
}

export async function loginRegisteredDoctor(
  db: Db,
  loginId: string,
  password: string,
): Promise<Ok<{ doctor: DoctorRow; accountId: string }> | Failure> {
  const id = loginId.trim().toLowerCase();
  const account =
    (await findAccount(db, "doctor", id)) ??
    (await findAccount(db, "doctor", loginId.trim().toUpperCase()));
  const valid = await verifyPassword(password, account?.passwordHash ?? DUMMY_HASH);
  if (!account || !valid || !account.profileId) return { ok: false, error: "invalid_credentials" };
  const doctor = await db.table("doctors").get(account.profileId);
  if (!doctor) return { ok: false, error: "invalid_credentials" };
  return { ok: true, doctor, accountId: account.id };
}

/* ------------------------------------------------------------------ *
 * Phone OTP
 *
 * Providers:
 *   demo  – no SMS is sent. The code is returned to the browser and the UI says
 *           so. Allowed outside production, or when ALLOW_DEMO_OTP=true.
 *   (real SMS providers plug in at `deliverOtp`; none is bundled because no
 *    credentials exist in this repo.)
 * With no provider and demo not allowed, requests fail with `sms_not_configured`
 * instead of pretending to send a message.
 * ------------------------------------------------------------------ */
const OTP_TTL_MS = 10 * 60_000;
const OTP_MAX_ATTEMPTS = 5;

export function demoOtpAllowed(): boolean {
  return env("ALLOW_DEMO_OTP") === "true" || (!isProduction() && env("ALLOW_DEMO_OTP") !== "false");
}
/** Also true when demo accounts are allowed, so a hackathon deployment needs one flag. */
export function otpMode(): "demo" | "unconfigured" {
  return demoOtpAllowed() || demoAccountsAllowed() ? "demo" : "unconfigured";
}

async function hashCode(code: string, phone: string): Promise<string> {
  const data = new TextEncoder().encode(`${code}:${phone}:${env("SESSION_SECRET") ?? "dev"}`);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function requestOtp(
  db: Db,
  phone: string,
): Promise<Ok<{ mode: "demo"; demoCode: string; expiresInSeconds: number }> | Failure> {
  if (!authConfigured()) return { ok: false, error: "auth_not_configured" };
  if (otpMode() === "unconfigured") return { ok: false, error: "sms_not_configured" };
  if (!rateLimit(`otp-phone:${phone}`, 3, 10 * 60_000)) return { ok: false, error: "rate_limited" };

  const bytes = crypto.getRandomValues(new Uint32Array(1));
  const code = String(100000 + (bytes[0]! % 900000));
  const now = Date.now();
  await db.table("otp_challenges").insert({
    id: newId(),
    phone,
    codeHash: await hashCode(code, phone),
    expiresAt: new Date(now + OTP_TTL_MS).toISOString(),
    attempts: 0,
    consumedAt: null,
    createdAt: new Date(now).toISOString(),
  });
  // DEMO provider: the code is handed back so the flow can be shown without an SMS gateway.
  return { ok: true, mode: "demo", demoCode: code, expiresInSeconds: OTP_TTL_MS / 1000 };
}

export async function verifyOtp(
  db: Db,
  patientId: string,
  phone: string,
  code: string,
): Promise<Ok<unknown> | Failure> {
  const challenges = (await db.table("otp_challenges").where("phone", phone))
    .filter((c) => !c.consumedAt && new Date(c.expiresAt).getTime() > Date.now())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const ch = challenges[0];
  if (!ch) return { ok: false, error: "otp_expired" };
  if (ch.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, error: "otp_locked" };
  const good = (await hashCode(code.trim(), phone)) === ch.codeHash;
  if (!good) {
    await db.table("otp_challenges").update(ch.id, { attempts: ch.attempts + 1 });
    return { ok: false, error: "otp_wrong" };
  }
  await db.table("otp_challenges").update(ch.id, { consumedAt: new Date().toISOString() });
  await db.table("patients").update(patientId, { phoneVerified: true });
  return { ok: true };
}
