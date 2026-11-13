/** Same-origin JSON client for the server routes. Cookies carry the session; no tokens in JS. */

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

export async function apiFetch<T = Record<string, unknown>>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method: init.method ?? "GET",
      credentials: "same-origin",
      headers: init.body !== undefined ? { "Content-Type": "application/json" } : {},
      body: init.body !== undefined ? JSON.stringify(init.body) : null,
    });
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      /* empty body */
    }
    const error =
      !res.ok && data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : !res.ok
          ? `http_${res.status}`
          : null;
    return { ok: res.ok, status: res.status, data: res.ok ? (data as T) : null, error };
  } catch {
    return { ok: false, status: 0, data: null, error: "network" };
  }
}

const MESSAGES: Record<string, string> = {
  network: "Could not reach the server. Check your connection and try again.",
  rate_limited: "Too many attempts. Please wait a minute and try again.",
  unauthorized: "Please sign in to continue.",
  forbidden: "You do not have access to this.",
  invalid_credentials: "Incorrect ID or password.",
  phone_exists: "This mobile number is already registered. Try signing in.",
  email_exists: "This e-mail is already registered. Try signing in.",
  invalid_phone: "Enter a valid 10-digit Indian mobile number.",
  invalid_email: "Enter a valid e-mail address.",
  invalid_name: "Enter your full name.",
  qualifications_required: "Enter your medical qualification.",
  invalid_registration_number: "Enter a valid medical registration number.",
  council_required: "Enter your registration council.",
  password_too_short: "Password must be at least 8 characters.",
  password_weak: "Password needs at least one letter and one number.",
  consent_required: "Please accept the consent to continue.",
  slot_unavailable: "That slot was just taken or is no longer available. Please pick another.",
  patient_slot_clash: "You already have an appointment at that time.",
  too_many_active: "You have too many active appointments. Cancel one first.",
  too_far_ahead: "Please choose a date within the next 30 days.",
  doctor_unavailable: "This doctor is not accepting appointments right now.",
  invalid_transition: "That change is not allowed for this appointment.",
  visit_not_yet_happened: "A visit can only be marked complete on or after its date.",
  phone_not_verified: "Verify your mobile number first to post a review.",
  no_verified_visit: "Only patients with a completed visit can review this doctor.",
  already_reviewed: "You already reviewed this visit.",
  review_rate_limited: "You have reached the daily review limit.",
  review_contains_phone: "Please remove phone numbers from your review.",
  review_contains_email: "Please remove e-mail addresses from your review.",
  review_contains_link: "Please remove links from your review.",
  sms_not_configured: "SMS verification is not configured on this server.",
  otp_wrong: "That code is not correct.",
  otp_expired: "That code expired. Request a new one.",
  otp_locked: "Too many wrong attempts. Request a new code later.",
  note_required: "Please write a reason of at least 10 characters.",
  overlapping_windows: "Two time windows on the same day overlap.",
  end_before_start: "End must be after start.",
  specialty_required: "Choose at least one specialization.",
  clinic_address_required: "Clinic name, address and city are required.",
  invalid_coordinates: "Those map coordinates are not valid.",
  location_not_found: "Could not find that place. Try a nearby city or area name.",
  auth_not_configured: "The server is missing SESSION_SECRET. See the setup guide.",
};

export function errorText(code: string | null | undefined): string {
  if (!code) return "Something went wrong. Please try again.";
  if (code.startsWith("profile_incomplete:")) {
    return `Add ${code.slice(19).replace(/,/g, ", ")} before accepting appointments.`;
  }
  return MESSAGES[code] ?? "Something went wrong. Please try again.";
}
