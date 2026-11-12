import { demoAccountsAllowed, env, isProduction } from "./env.server";

/**
 * Server-side authentication for PATIENTS, DOCTORS and ADMINS.
 *
 * - Sessions are stateless signed cookies (HMAC-SHA256, HttpOnly, SameSite=Strict).
 * - Doctor accounts come from the DOCTOR_ACCOUNTS environment variable
 *   (JSON, passwords stored as PBKDF2 hashes — see scripts/hash-password.mjs).
 * - The documented demo doctor works only outside production or when
 *   ALLOW_DEMO_ACCOUNTS=true.
 * - Uses Web Crypto so it runs on Node and compatible server runtimes.
 *
 * Registered patients and doctors live in the `accounts` table (see
 * accounts.server.ts); this file only signs/verifies sessions and hashes
 * passwords. "Staff" sessions come from DOCTOR_ACCOUNTS / ADMIN_ACCOUNTS (or the
 * demo accounts) and are the only ones allowed to read the legacy anonymous
 * intake cases at /api/cases. A self-registered doctor is NOT staff.
 */

const COOKIE = "mediex_session";
const SESSION_SECONDS = 8 * 60 * 60;
const PBKDF2_ITERATIONS = 100_000;

const enc = new TextEncoder();

export type Role = "patient" | "doctor" | "admin";
const ROLES: Role[] = ["patient", "doctor", "admin"];

export interface Session {
  /** Account id (or the staff login id for env/demo staff accounts). */
  sub: string;
  name: string;
  role: Role;
  /** Profile row id (patients.id / doctors.id), or null. */
  pid: string | null;
  /** True only for env/demo staff accounts. */
  staff: boolean;
  exp: number;
}
export type DoctorSession = Session;

/* ---------- base64url ---------- */
function b64urlEncode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/* ---------- secret ---------- */
const g = globalThis as unknown as { __mediexDevSecret?: string };

function sessionSecret(): string | null {
  const configured = env("SESSION_SECRET");
  if (configured) return configured;
  if (isProduction()) return null;
  // Development only: an ephemeral secret (sessions reset when the server restarts).
  if (!g.__mediexDevSecret) {
    g.__mediexDevSecret = b64urlEncode(crypto.getRandomValues(new Uint8Array(32)));
    console.warn("[auth] SESSION_SECRET not set — using an ephemeral development secret.");
  }
  return g.__mediexDevSecret;
}

export function authConfigured(): boolean {
  return sessionSecret() !== null;
}

async function hmacKey(usage: KeyUsage[]): Promise<CryptoKey> {
  const secret = sessionSecret();
  if (!secret) throw new Error("SESSION_SECRET is not configured");
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usage,
  );
}

/* ---------- session tokens ---------- */
export async function signSession(session: Session): Promise<string> {
  const payload = b64urlEncode(enc.encode(JSON.stringify(session)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(["sign"]), enc.encode(payload));
  return `${payload}.${b64urlEncode(new Uint8Array(sig))}`;
}

export async function verifySessionToken(token: string): Promise<Session | null> {
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !authConfigured()) return null;
  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(["verify"]),
      b64urlDecode(sig) as BufferSource,
      enc.encode(payload),
    );
    if (!ok) return null;
    const session = JSON.parse(new TextDecoder().decode(b64urlDecode(payload))) as Session;
    if (
      !ROLES.includes(session.role) ||
      typeof session.sub !== "string" ||
      session.exp * 1000 < Date.now()
    ) {
      return null;
    }
    return { ...session, pid: session.pid ?? null, staff: session.staff === true };
  } catch {
    return null;
  }
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

export async function getSession(request: Request): Promise<Session | null> {
  const token = readCookie(request, COOKIE);
  return token ? verifySessionToken(token) : null;
}

/** Back-compat: the signed-in session, only if it belongs to a doctor. */
export async function getDoctorSession(request: Request): Promise<Session | null> {
  const s = await getSession(request);
  return s && s.role === "doctor" ? s : null;
}

function isHttps(request: Request): boolean {
  return request.url.startsWith("https:") || request.headers.get("x-forwarded-proto") === "https";
}

export function sessionCookie(token: string, request: Request): string {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${isHttps(request) ? "; Secure" : ""}`;
}
export function clearedCookie(request: Request): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${isHttps(request) ? "; Secure" : ""}`;
}

export async function newSession(s: Omit<Session, "exp">): Promise<string> {
  return signSession({ ...s, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS });
}

/* ---------- passwords (PBKDF2) ---------- */
async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64urlEncode(salt)}$${b64urlEncode(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iter, saltB64, hashB64] = stored.split("$");
  if (scheme !== "pbkdf2" || !iter || !saltB64 || !hashB64) return false;
  const iterations = Number(iter);
  if (!Number.isInteger(iterations) || iterations < 1000 || iterations > PBKDF2_ITERATIONS)
    return false;
  const actual = await pbkdf2(password, b64urlDecode(saltB64), iterations);
  return constantTimeEqual(actual, b64urlDecode(hashB64));
}

/* ---------- staff accounts (env / demo) ---------- */
interface StaffAccount {
  doctorId: string;
  name: string;
  passwordHash: string;
  /** Optional: id of the doctors row this staff login manages. */
  profileId?: string;
}

const DEMO_DOCTOR = {
  doctorId: "doctor001",
  name: "Dr. Anita Sharma",
  password: "Doctor@123",
  profileId: "00000002-0000-4000-8000-000000000001",
};
const DEMO_ADMIN = { doctorId: "admin001", name: "MEDIEX Demo Admin", password: "Admin@123" };

function parseAccounts(name: string): StaffAccount[] {
  const raw = env(name);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a): a is StaffAccount =>
        !!a &&
        typeof a === "object" &&
        typeof (a as StaffAccount).doctorId === "string" &&
        typeof (a as StaffAccount).name === "string" &&
        typeof (a as StaffAccount).passwordHash === "string",
    );
  } catch {
    console.error(`[auth] ${name} is not valid JSON`);
    return [];
  }
}

export interface StaffLogin {
  id: string;
  name: string;
  role: "doctor" | "admin";
  pid: string | null;
}

async function checkDemo(password: string, expected: string): Promise<boolean> {
  const a = await pbkdf2(password, enc.encode("demo"), 1000);
  const b = await pbkdf2(expected, enc.encode("demo"), 1000);
  return constantTimeEqual(a, b);
}

/** Verifies a staff login (env accounts first, then the demo accounts when allowed). */
export async function verifyStaffCredentials(
  loginId: string,
  password: string,
): Promise<StaffLogin | null> {
  const id = loginId.trim();
  const admin = parseAccounts("ADMIN_ACCOUNTS").find((a) => a.doctorId === id);
  if (admin) {
    return (await verifyPassword(password, admin.passwordHash))
      ? { id: admin.doctorId, name: admin.name, role: "admin", pid: null }
      : null;
  }
  const doc = parseAccounts("DOCTOR_ACCOUNTS").find((a) => a.doctorId === id);
  if (doc) {
    return (await verifyPassword(password, doc.passwordHash))
      ? { id: doc.doctorId, name: doc.name, role: "doctor", pid: doc.profileId ?? null }
      : null;
  }
  if (demoAccountsAllowed()) {
    if (id === DEMO_DOCTOR.doctorId) {
      return (await checkDemo(password, DEMO_DOCTOR.password))
        ? {
            id: DEMO_DOCTOR.doctorId,
            name: DEMO_DOCTOR.name,
            role: "doctor",
            pid: DEMO_DOCTOR.profileId,
          }
        : null;
    }
    if (id === DEMO_ADMIN.doctorId) {
      return (await checkDemo(password, DEMO_ADMIN.password))
        ? { id: DEMO_ADMIN.doctorId, name: DEMO_ADMIN.name, role: "admin", pid: null }
        : null;
    }
  }
  // Burn comparable time so unknown IDs are not distinguishable by latency.
  await pbkdf2(password, enc.encode("unknown"), 1000);
  return null;
}

/** Back-compat wrapper used by older callers. */
export async function verifyDoctorCredentials(
  doctorId: string,
  password: string,
): Promise<{ doctorId: string; name: string } | null> {
  const r = await verifyStaffCredentials(doctorId, password);
  return r && r.role === "doctor" ? { doctorId: r.id, name: r.name } : null;
}

function authError(status: number, error: string): { response: Response } {
  return { response: Response.json({ error }, { status }) };
}

/** Route helper: returns a session whose role is one of `roles`, or a ready-made error response. */
export async function requireRole(
  request: Request,
  roles: Role[],
): Promise<{ session: Session } | { response: Response }> {
  if (!authConfigured()) return authError(503, "auth_not_configured");
  const session = await getSession(request);
  if (!session) return authError(401, "unauthorized");
  if (!roles.includes(session.role)) return authError(403, "forbidden");
  return { session };
}

/** Any signed-in doctor (self-registered or staff). */
export function requireDoctor(request: Request) {
  return requireRole(request, ["doctor"]);
}

/**
 * Staff only (env/demo accounts). Guards the legacy anonymous intake cases:
 * those are not assigned to any doctor, so a self-registered doctor must not see them.
 */
export async function requireStaff(
  request: Request,
): Promise<{ session: Session } | { response: Response }> {
  const r = await requireRole(request, ["doctor", "admin"]);
  if ("response" in r) return r;
  if (!r.session.staff) return authError(403, "forbidden");
  return r;
}
