// End-to-end API smoke test. Usage: BASE=http://localhost:8080 node scripts/api-smoke.mjs
// Requires the server to run in demo mode with DEMO_EARLY_COMPLETE=true (so a visit can be completed the same day).
const BASE = process.env.BASE ?? "http://localhost:8080";
let pass = 0,
  failN = 0;
const jars = {};
async function call(who, method, path, data) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...(jars[who] ? { cookie: jars[who] } : {}) },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const sc = res.headers.get("set-cookie");
  if (sc) jars[who] = sc.split(";")[0];
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}
function check(name, cond, extra = "") {
  if (cond) {
    pass++;
    console.log("  ✓", name);
  } else {
    failN++;
    console.log("  ✗", name, extra);
  }
}
const phone = () => "9" + String(Math.floor(100000000 + Math.random() * 899999999));

console.log("session / config");
let r = await call("anon", "GET", "/api/auth/session");
check("anonymous session", r.status === 200 && r.json.role === null, JSON.stringify(r.json));
check("reports memory storage honestly", r.json.storage === "memory");

console.log("triage");
r = await call("anon", "POST", "/api/triage", {
  messages: ["mujhe seene mein dard hai"],
  lang: "hinglish",
});
check(
  "emergency → no doctors, 112/108 message",
  r.json.triage.status === "emergency" &&
    r.json.matches.length === 0 &&
    /112/.test(r.json.triage.reply),
);
r = await call("anon", "POST", "/api/triage", {
  messages: ["severe headache and dizziness for 3 days"],
  lang: "en",
  location: { lat: 28.5535, lng: 77.554 },
});
check(
  "headache → ready, neurology first",
  r.json.triage.status === "ready" && r.json.triage.specialties[0].id === "neurology",
);
check(
  "returns ranked doctors with distance",
  r.json.matches.length > 0 && typeof r.json.matches[0].distanceKm === "number",
);
check(
  "neurologist ranked first",
  r.json.matches[0].doctor.primarySpecialty === "neurology",
  r.json.matches[0]?.doctor.fullName,
);
check("no registration number leaked", !JSON.stringify(r.json).includes("registrationNumber"));
check(
  "demo doctors never labelled verified",
  r.json.matches.every((m) => m.doctor.verificationStatus !== "verified"),
);
r = await call("anon", "POST", "/api/triage", { messages: ["pet dard"], lang: "hinglish" });
check(
  "vague complaint → follow-up question",
  r.json.triage.status === "follow_up" || r.json.triage.status === "ready",
);
r = await call("anon", "GET", "/api/doctors?specialty=cardiology");
check("browse by specialty", r.status === 200 && r.json.matches.length >= 2);
const onLeave = r.json.matches.find((m) => m.doctor.fullName.includes("Rohit"));
check(
  "doctor on leave flagged",
  onLeave && onLeave.onLeaveUntil !== null,
  JSON.stringify(onLeave?.availabilityState),
);

console.log("access control (anonymous)");
for (const [m, p] of [
  ["GET", "/api/appointments"],
  ["GET", "/api/doctor/profile"],
  ["GET", "/api/admin/doctors"],
  ["GET", "/api/cases"],
]) {
  r = await call("anon", m, p);
  check(`${m} ${p} → 401`, r.status === 401, String(r.status));
}

console.log("patient auth");
const P1 = phone();
r = await call("p1", "POST", "/api/auth/patient", {
  action: "register",
  fullName: "Test Patient",
  phone: P1,
  password: "short",
  consent: true,
});
check("weak password rejected", r.status === 400 && r.json.error === "password_too_short");
r = await call("p1", "POST", "/api/auth/patient", {
  action: "register",
  fullName: "Test Patient",
  phone: P1,
  password: "Passw0rdOK",
  consent: false,
});
check("consent required", r.json.error === "consent_required");
r = await call("p1", "POST", "/api/auth/patient", {
  action: "register",
  fullName: "Test Patient",
  phone: P1,
  password: "Passw0rdOK",
  dateOfBirth: "1990-05-01",
  gender: "Female",
  consent: true,
});
check(
  "register ok + no password in response",
  r.status === 201 && !JSON.stringify(r.json).toLowerCase().includes("password"),
);
r = await call("p1x", "POST", "/api/auth/patient", {
  action: "register",
  fullName: "Dup",
  phone: P1,
  password: "Passw0rdOK",
  consent: true,
});
check("duplicate phone → 409", r.status === 409);
r = await call("p1y", "POST", "/api/auth/patient", {
  action: "login",
  phone: P1,
  password: "wrongpass1",
});
check("wrong password → 401", r.status === 401);
r = await call("p1y", "POST", "/api/auth/patient", {
  action: "login",
  phone: P1,
  password: "Passw0rdOK",
});
check("login ok", r.status === 200);
r = await call("p1", "GET", "/api/doctor/profile");
check("patient cannot read doctor portal → 403", r.status === 403);

console.log("booking");
const search = await call(
  "p1",
  "GET",
  "/api/doctors?specialty=general_medicine&lat=28.5535&lng=77.554",
);
// doctor001 (demo staff login) manages Dr. Anita Sharma, so book her.
const gp = search.json.matches.find(
  (m) => m.doctor.fullName === "Dr. Anita Sharma" && m.nextSlots.length > 0,
);
check("found GP with slots", !!gp);
const slot = gp.nextSlots[0];
r = await call("p1", "POST", "/api/appointments", {
  doctorId: gp.doctor.id,
  date: slot.date,
  time: slot.time,
  reason: "fever",
  shareSummary: "Patient reports fever for 2 days (not a diagnosis).",
});
check("book slot", r.status === 201, JSON.stringify(r.json));
const apptId = r.json.appointment?.id;
const P2 = phone();
await call("p2", "POST", "/api/auth/patient", {
  action: "register",
  fullName: "Second Patient",
  phone: P2,
  password: "Passw0rdOK",
  consent: true,
});
r = await call("p2", "POST", "/api/appointments", {
  doctorId: gp.doctor.id,
  date: slot.date,
  time: slot.time,
  reason: "x",
});
check("double booking blocked → 409", r.status === 409 && r.json.error === "slot_unavailable");
r = await call("p2", "POST", "/api/appointments", {
  doctorId: gp.doctor.id,
  date: "2020-01-01",
  time: "10:00",
  reason: "x",
});
check("past date rejected", r.status === 409);
r = await call("p2", "GET", "/api/appointments");
check("patient 2 cannot see patient 1's appointment", r.json.appointments.length === 0);

console.log("phone OTP");
r = await call("p1", "POST", "/api/auth/otp", { action: "request" });
check(
  "demo OTP flagged as demo",
  r.status === 200 && r.json.mode === "demo" && /^\d{6}$/.test(r.json.demoCode),
);
const code = r.json.demoCode;
r = await call("p1", "POST", "/api/auth/otp", { action: "verify", code: "000000" });
check("wrong OTP rejected", r.status === 400);
r = await call("p1", "POST", "/api/auth/otp", { action: "verify", code });
check("correct OTP verifies phone", r.json.verified === true);

console.log("doctor portal (demo staff doctor)");
r = await call("d", "POST", "/api/auth/doctor", { doctorId: "doctor001", password: "wrong" });
check("bad doctor password → 401", r.status === 401);
r = await call("d", "POST", "/api/auth/doctor", { doctorId: "doctor001", password: "Doctor@123" });
check("doctor login", r.status === 200);
r = await call("d", "GET", "/api/appointments");
const mine = r.json.appointments?.find((a) => a.id === apptId);
check(
  "doctor sees appointment + shared summary + name",
  mine && mine.sharedSummary.includes("fever") && mine.patientName === "Test Patient",
  JSON.stringify(r.json).slice(0, 200),
);
r = await call("d", "PATCH", "/api/appointments", { id: apptId, status: "completed" });
check("cannot complete before confirming → 409", r.status === 409);
r = await call("d", "PATCH", "/api/appointments", { id: apptId, status: "confirmed" });
check("confirm", r.status === 200);
r = await call("d", "PATCH", "/api/appointments", { id: apptId, status: "completed" });
check("complete → verified visit", r.status === 200, JSON.stringify(r.json));
r = await call("d", "GET", "/api/cases");
check("staff doctor can list legacy cases", r.status === 200);

console.log("reviews");
r = await call("p2", "POST", "/api/reviews", { appointmentId: apptId, rating: 5, text: "great" });
check("other patient cannot review someone else's visit", r.status === 403);
r = await call("p1", "POST", "/api/reviews", {
  appointmentId: apptId,
  rating: 5,
  text: "Call me on 9876543210",
});
check("phone number in review rejected", r.json.error === "review_contains_phone");
r = await call("p1", "POST", "/api/reviews", {
  appointmentId: apptId,
  rating: 4,
  text: "Listened patiently and explained clearly.",
});
check("verified patient can review", r.status === 201, JSON.stringify(r.json));
r = await call("p1", "POST", "/api/reviews", {
  appointmentId: apptId,
  rating: 4,
  text: "Second try should fail.",
});
check("one review per visit → 409", r.status === 409);
r = await call("anon", "GET", `/api/doctors/${gp.doctor.id}`);
const rev = r.json.reviews[0];
check(
  "public review shows badge, no identity",
  rev &&
    rev.badge === "verified_visit" &&
    !JSON.stringify(rev).includes("patientId") &&
    !JSON.stringify(rev).includes("Test Patient"),
);
check("rating aggregated", r.json.rating.count === 1 && r.json.rating.average === 4);
r = await call("d", "PATCH", "/api/reviews", {
  id: rev.id,
  action: "respond",
  text: "Thank you for the feedback.",
});
check("doctor public reply", r.status === 200);
r = await call("d", "PATCH", "/api/reviews", { id: rev.id, action: "flag", reason: "other" });
check("doctor can dispute (flag)", r.status === 200);
r = await call("anon", "GET", `/api/doctors/${gp.doctor.id}`);
check(
  "flag does not hide review",
  r.json.reviews[0].status === "flagged" && r.json.reviews[0].text.length > 0,
);
r = await call("d", "GET", "/api/admin/reviews");
check("doctor cannot open moderation queue → 403", r.status === 403);
r = await call("a", "POST", "/api/auth/doctor", { doctorId: "admin001", password: "Admin@123" });
check("admin login", r.status === 200);
r = await call("a", "GET", "/api/admin/reviews");
check(
  "moderation queue shows flagged review without patient identity",
  r.json.reviews.length === 1 && !JSON.stringify(r.json).includes("Test Patient"),
);
r = await call("a", "PATCH", "/api/admin/reviews", { id: rev.id, decision: "keep", note: "short" });
check("moderator must give a written reason", r.json.error === "note_required");
r = await call("a", "PATCH", "/api/admin/reviews", {
  id: rev.id,
  decision: "keep",
  note: "Reviewed: factual, no policy breach.",
});
check("moderator keeps review with public reason", r.status === 200);
r = await call("anon", "GET", `/api/doctors/${gp.doctor.id}`);
check(
  "review published again with moderation note",
  r.json.reviews[0].status === "published" && r.json.reviews[0].moderationNote.includes("factual"),
);

console.log("doctor registration + verification");
const email = `newdoc${Date.now()}@example.com`;
r = await call("nd", "POST", "/api/auth/doctor", {
  action: "register",
  fullName: "Dr. New Doctor",
  email,
  password: "Passw0rdOK",
  qualifications: "MBBS",
  registrationNumber: "DMC-12345",
  registrationCouncil: "Delhi Medical Council",
});
check(
  "doctor registers as PENDING, not verified",
  r.status === 201 && r.json.verificationStatus === "pending",
  JSON.stringify(r.json),
);
r = await call("nd", "GET", "/api/cases");
check("self-registered doctor cannot read legacy cases → 403", r.status === 403);
r = await call("nd", "PUT", "/api/doctor/profile", { acceptingAppointments: true });
check(
  "cannot go live with incomplete profile",
  r.status === 400 && String(r.json.error).startsWith("profile_incomplete"),
);
r = await call("nd", "PUT", "/api/doctor/profile", {
  specialties: ["ent", "general_medicine"],
  conditions: ["ear pain", "sore throat"],
  languages: ["English", "Hindi"],
  clinic: {
    name: "New ENT Clinic",
    kind: "clinic",
    addressLine: "1 Test Road",
    city: "Noida",
    state: "Uttar Pradesh",
    pincode: "201301",
    lat: 28.57,
    lng: 77.32,
    phone: "",
  },
});
check("save profile + clinic", r.status === 200 && r.json.profile.clinic.name === "New ENT Clinic");
r = await call("nd", "PUT", "/api/doctor/schedule", {
  availability: [
    { weekday: 1, startTime: "10:00", endTime: "12:00" },
    { weekday: 1, startTime: "11:00", endTime: "13:00" },
  ],
});
check("overlapping windows rejected", r.json.error === "overlapping_windows");
r = await call("nd", "PUT", "/api/doctor/schedule", {
  availability: [1, 2, 3, 4, 5, 6, 0].map((d) => ({
    weekday: d,
    startTime: "00:00",
    endTime: "23:50",
  })),
});
check("set weekly availability", r.status === 200 && r.json.availability.length === 7);
r = await call("nd", "PUT", "/api/doctor/profile", { acceptingAppointments: true });
check("goes live once complete", r.status === 200);
const today = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
r = await call("nd", "POST", "/api/doctor/schedule", {
  startDate: today,
  endDate: today,
  reason: "holiday",
});
check("mark holiday", r.status === 201);
r = await call("anon", "GET", "/api/doctors?specialty=ent&lat=28.57&lng=77.32");
const nd = r.json.matches.find((m) => m.doctor.fullName === "Dr. New Doctor");
check(
  "new doctor appears in search, UNVERIFIED/pending, on leave today",
  nd &&
    nd.doctor.verificationStatus === "pending" &&
    nd.onLeaveUntil === today &&
    nd.distanceKm === 0,
  JSON.stringify(nd?.availabilityState),
);
r = await call("a", "GET", "/api/admin/doctors");
const ndRow = r.json.doctors.find((d) => d.email === email);
check("admin sees registration details", ndRow && ndRow.registrationNumber === "DMC-12345");
r = await call("a", "PATCH", "/api/admin/doctors", { id: ndRow.id, decision: "verify" });
check("admin verifies", r.status === 200);
r = await call("anon", "GET", `/api/doctors/${ndRow.id}`);
check(
  "badge becomes verified (admin register check)",
  r.json.doctor.verificationStatus === "verified" &&
    r.json.doctor.verificationSource === "admin_register_check",
);
r = await call("nd", "PUT", "/api/doctor/profile", { registrationNumber: "DMC-99999" });
r = await call("anon", "GET", `/api/doctors/${ndRow.id}`);
check(
  "changing registration number resets to pending",
  r.json.doctor.verificationStatus === "pending",
);

console.log("geocode fallback");
r = await call("anon", "GET", "/api/geocode?q=Greater%20Noida");
check(
  "geocode returns a labelled source",
  r.status === 200 && typeof r.json.source === "string",
  JSON.stringify(r.json),
);

console.log(`\n${pass} passed, ${failN} failed`);
process.exit(failN ? 1 : 0);
