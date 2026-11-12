import type { PatientRow } from "./db.server";
import { readJson, json } from "./guards.server";

export type Body = Record<string, unknown>;

/** Reads a bounded JSON object body, or returns a ready 4xx response. */
export async function body(
  request: Request,
  max = 20_000,
): Promise<{ ok: true; b: Body } | { ok: false; response: Response }> {
  const p = await readJson(request, max);
  if (!p.ok) return p;
  return {
    ok: true,
    b: p.data && typeof p.data === "object" && !Array.isArray(p.data) ? (p.data as Body) : {},
  };
}

export const fail = (error: string, status = 400) => json({ error }, status);

export const num = (x: unknown): number | null =>
  typeof x === "number" && Number.isFinite(x) ? x : null;

export const bool = (x: unknown): boolean | undefined => (typeof x === "boolean" ? x : undefined);

/** The patient shape the browser's AuthContext expects. Never includes the password hash. */
export function publicPatient(p: PatientRow) {
  return {
    patientId: p.id,
    fullName: p.fullName,
    dateOfBirth: p.dateOfBirth,
    gender: p.gender,
    mobileNumber: p.phone,
    email: p.email,
    language: p.language,
    consent: p.consentAt !== null,
    createdAt: p.createdAt,
    phoneVerified: p.phoneVerified,
  };
}

const MESSAGES: Record<string, number> = {
  invalid_credentials: 401,
  phone_exists: 409,
  email_exists: 409,
  rate_limited: 429,
  sms_not_configured: 503,
  auth_not_configured: 503,
};
export const statusFor = (error: string) => MESSAGES[error] ?? 400;
