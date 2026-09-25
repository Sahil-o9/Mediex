import { demoAccountsAllowed, env, isProduction } from "./env.server";

/**
 * Server-side authentication for DOCTORS.
 *
 * - Sessions are stateless signed cookies (HMAC-SHA256, HttpOnly, SameSite=Strict).
 * - Doctor accounts come from the DOCTOR_ACCOUNTS environment variable
 *   (JSON, passwords stored as PBKDF2 hashes — see scripts/hash-password.mjs).
 * - The documented demo doctor works only outside production or when
 *   ALLOW_DEMO_ACCOUNTS=true.
 * - Uses only Web Crypto, so it runs on Node and on Cloudflare Workers.
 *
 * PATIENT accounts are still the prototype's browser-local demo accounts.
 * Patients submit cases without a server login (each submission is an
 * anonymous, rate-limited intake). Replace with real patient auth
 * (e.g. Supabase Auth) before handling real patient data.
 */

const COOKIE = "mediex_session";
const SESSION_SECONDS = 8 * 60 * 60;
const PBKDF2_ITERATIONS = 100_000; // Cloudflare Workers caps PBKDF2 at 100k

const enc = new TextEncoder();

export interface DoctorSession {
  sub: string;
  name: string;
  role: "doctor";
  exp: number;
}

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
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, usage);
}

/* ---------- session tokens ---------- */
export async function signSession(session: DoctorSession): Promise<string> {
  const payload = b64urlEncode(enc.encode(JSON.stringify(session)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(["sign"]), enc.encode(payload));
  return `${payload}.${b64urlEncode(new Uint8Array(sig))}`;
}

export async function verifySessionToken(token: string): Promise<DoctorSession | null> {
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
    const session = JSON.parse(new TextDecoder().decode(b64urlDecode(payload))) as DoctorSession;
    if (session.role !== "doctor" || typeof session.sub !== "string" || session.exp * 1000 < Date.now()) {
      return null;
    }
    return session;
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

export async function getDoctorSession(request: Request): Promise<DoctorSession | null> {
  const token = readCookie(request, COOKIE);
  return token ? verifySessionToken(token) : null;
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

export async function newDoctorSession(doctorId: string, name: string): Promise<string> {
  return signSession({ sub: doctorId, name, role: "doctor", exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS });
}

/* ---------- passwords (PBKDF2) ---------- */
async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
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
  if (!Number.isInteger(iterations) || iterations < 1000 || iterations > PBKDF2_ITERATIONS) return false;
  const actual = await pbkdf2(password, b64urlDecode(saltB64), iterations);
  return constantTimeEqual(actual, b64urlDecode(hashB64));
}

/* ---------- doctor accounts ---------- */
interface DoctorAccount {
  doctorId: string;
  name: string;
  passwordHash: string;
}

const DEMO_DOCTOR = { doctorId: "doctor001", name: "Dr. Anita Sharma", password: "Doctor@123" };

function configuredDoctors(): DoctorAccount[] {
  const raw = env("DOCTOR_ACCOUNTS");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a): a is DoctorAccount =>
        !!a &&
        typeof a === "object" &&
        typeof (a as DoctorAccount).doctorId === "string" &&
        typeof (a as DoctorAccount).name === "string" &&
        typeof (a as DoctorAccount).passwordHash === "string",
    );
  } catch {
    console.error("[auth] DOCTOR_ACCOUNTS is not valid JSON");
    return [];
  }
}

export async function verifyDoctorCredentials(
  doctorId: string,
  password: string,
): Promise<{ doctorId: string; name: string } | null> {
  const id = doctorId.trim();
  const account = configuredDoctors().find((a) => a.doctorId === id);
  if (account) {
    return (await verifyPassword(password, account.passwordHash)) ? { doctorId: account.doctorId, name: account.name } : null;
  }
  if (demoAccountsAllowed() && id === DEMO_DOCTOR.doctorId) {
    const a = await pbkdf2(password, enc.encode("demo"), 1000);
    const b = await pbkdf2(DEMO_DOCTOR.password, enc.encode("demo"), 1000);
    return constantTimeEqual(a, b) ? { doctorId: DEMO_DOCTOR.doctorId, name: DEMO_DOCTOR.name } : null;
  }
  // Burn comparable time so unknown IDs are not distinguishable by latency.
  await pbkdf2(password, enc.encode("unknown"), 1000);
  return null;
}

/** Route helper: returns the doctor session or a ready-made error response. */
export async function requireDoctor(request: Request): Promise<{ session: DoctorSession } | { response: Response }> {
  if (!authConfigured()) {
    return { response: Response.json({ error: "auth_not_configured" }, { status: 503 }) };
  }
  const session = await getDoctorSession(request);
  if (!session) return { response: Response.json({ error: "unauthorized" }, { status: 401 }) };
  return { session };
}
