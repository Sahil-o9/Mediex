import { describe, expect, it } from "vitest";
import { directionsUrl, distanceOrNull, haversineKm, lookupKnownArea } from "@/lib/mediex/geo";
import {
  describeTimings,
  isOpenNow,
  istNow,
  slotsForDate,
  slotTimesForDate,
  upcomingSlots,
} from "@/lib/mediex/scheduling";
import { rankDoctors } from "@/lib/mediex/ranking";
import type { DoctorProfile } from "@/types/directory";

const weekdays = [1, 2, 3, 4, 5, 6];
const win = (weekday: number, startTime: string, endTime: string) => ({
  id: `${weekday}${startTime}`,
  weekday,
  startTime,
  endTime,
});

function doctor(over: Partial<DoctorProfile> & { id: string }): DoctorProfile {
  return {
    fullName: over.id,
    qualifications: "MBBS",
    specialties: ["general_medicine"],
    primarySpecialty: "general_medicine",
    conditions: [],
    experienceYears: 5,
    languages: ["English"],
    consultationFee: null,
    bio: "",
    slotMinutes: 30,
    acceptingAppointments: true,
    verificationStatus: "unverified",
    verificationSource: null,
    isDemo: true,
    clinic: {
      id: `c-${over.id}`,
      name: "Clinic",
      kind: "clinic",
      addressLine: "x",
      city: "Noida",
      state: "UP",
      pincode: "201301",
      lat: 28.5355,
      lng: 77.391,
      phone: null,
      isDemo: true,
    },
    availability: weekdays.map((d) => win(d, "10:00", "13:00")),
    leaves: [],
    ...over,
  };
}

// Wednesday 2026-11-11, 11:00 IST == 05:30 UTC
const NOW = new Date("2026-11-11T05:30:00Z");

describe("geo", () => {
  it("computes plausible great-circle distance (Delhi ↔ Noida ≈ 19–21 km)", () => {
    const km = haversineKm({ lat: 28.6139, lng: 77.209 }, { lat: 28.5355, lng: 77.391 });
    expect(km).toBeGreaterThan(18);
    expect(km).toBeLessThan(21);
  });
  it("returns null instead of inventing a distance", () => {
    expect(distanceOrNull(null, { lat: 1, lng: 1 })).toBeNull();
    expect(distanceOrNull({ lat: 1, lng: 1 }, { lat: null, lng: null })).toBeNull();
    expect(distanceOrNull({ lat: 999, lng: 1 }, { lat: 1, lng: 1 })).toBeNull();
  });
  it("builds a directions link only when coordinates exist", () => {
    expect(directionsUrl({ lat: 28.5, lng: 77.3 })).toContain("destination=28.5,77.3");
    expect(directionsUrl({ lat: null, lng: null })).toBeNull();
  });
  it("prefers the longest known-area match", () => {
    expect(lookupKnownArea("near Greater Noida")?.name).toBe("Greater Noida");
    expect(lookupKnownArea("some unknown village")).toBeNull();
  });
});

describe("scheduling", () => {
  it("converts to IST across the UTC date boundary", () => {
    const n = istNow(new Date("2026-11-11T20:00:00Z"));
    expect(n.date).toBe("2026-11-12");
    expect(n.minutes).toBe(60 + 30);
  });

  it("slices windows into slots and honours leave", () => {
    const d = doctor({ id: "a" });
    expect(slotTimesForDate(d, "2026-11-11")).toEqual([
      "10:00",
      "10:30",
      "11:00",
      "11:30",
      "12:00",
      "12:30",
    ]);
    expect(slotTimesForDate(d, "2026-11-15")).toEqual([]); // Sunday: no window
    const onLeave = doctor({
      id: "b",
      leaves: [{ id: "l", startDate: "2026-11-11", endDate: "2026-11-12", reason: "" }],
    });
    expect(slotTimesForDate(onLeave, "2026-11-11")).toEqual([]);
  });

  it("removes booked slots and past slots (with a 30 min notice)", () => {
    const d = doctor({ id: "a" });
    const booked = new Set(["2026-11-11T12:00"]);
    // now = 11:00 IST, notice 30 min → earliest 11:30
    expect(slotsForDate(d, "2026-11-11", booked, NOW)).toEqual(["11:30", "12:30"]);
    expect(slotsForDate(d, "2026-11-10", new Set(), NOW)).toEqual([]);
  });

  it("finds upcoming slots across days", () => {
    const d = doctor({ id: "a", availability: [win(4, "10:00", "11:00")] }); // Thursdays only
    const slots = upcomingSlots(d, new Set(), NOW, { limit: 2 });
    expect(slots[0]).toEqual({ date: "2026-11-12", time: "10:00" });
  });

  it("knows whether the clinic is open now", () => {
    expect(isOpenNow(doctor({ id: "a" }), NOW)).toBe(true);
    expect(isOpenNow(doctor({ id: "a", availability: [win(3, "14:00", "16:00")] }), NOW)).toBe(
      false,
    );
  });

  it("summarises timings", () => {
    expect(describeTimings(weekdays.map((d) => win(d, "10:00", "13:00")))).toBe(
      "Mon–Sat 10:00–13:00",
    );
    expect(describeTimings([])).toBe("Timings not provided");
  });
});

describe("ranking", () => {
  const patient = { lat: 28.5355, lng: 77.391 }; // Noida
  const empty = new Map<string, ReadonlySet<string>>();
  const noRatings = new Map<string, { average: number | null; count: number }>();

  it("ranks near + available above far + on leave, excludes irrelevant and non-accepting doctors", () => {
    const near = doctor({ id: "near" });
    const far = doctor({
      id: "far",
      clinic: { ...doctor({ id: "x" }).clinic!, lat: 28.4089, lng: 77.3178 + 0.6 },
    });
    const leave = doctor({
      id: "leave",
      leaves: [{ id: "l", startDate: "2026-11-11", endDate: "2026-11-30", reason: "" }],
    });
    const wrongSpecialty = doctor({
      id: "derm",
      specialties: ["dermatology"],
      primarySpecialty: "dermatology",
    });
    const closed = doctor({ id: "closed", acceptingAppointments: false });
    const out = rankDoctors({
      doctors: [far, leave, near, wrongSpecialty, closed],
      targets: [{ id: "general_medicine", weight: 1 }],
      patient,
      booked: empty,
      ratings: noRatings,
      now: NOW,
    });
    expect(out.map((m) => m.doctor.id)).toEqual(["near", "far", "leave"]);
    expect(out[0]!.availabilityState).toBe("available_today");
    expect(out[2]!.availabilityState).toBe("on_leave");
    expect(out[2]!.onLeaveUntil).toBe("2026-11-30");
    expect(out[0]!.distanceKm).toBe(0);
  });

  it("does not penalise anyone for distance when the patient location is unknown", () => {
    const a = doctor({ id: "a" });
    const out = rankDoctors({
      doctors: [a],
      targets: [{ id: "general_medicine", weight: 1 }],
      patient: null,
      booked: empty,
      ratings: noRatings,
      now: NOW,
    });
    expect(out[0]!.distanceKm).toBeNull();
    expect(out[0]!.distanceSource).toBe("unknown");
  });

  it("prefers the primary specialty over a secondary one", () => {
    const primary = doctor({
      id: "primary",
      specialties: ["cardiology"],
      primarySpecialty: "cardiology",
    });
    const secondary = doctor({
      id: "secondary",
      specialties: ["general_medicine", "cardiology"],
      primarySpecialty: "general_medicine",
    });
    const out = rankDoctors({
      doctors: [secondary, primary],
      targets: [{ id: "cardiology", weight: 1 }],
      patient: null,
      booked: empty,
      ratings: noRatings,
      now: NOW,
    });
    expect(out[0]!.doctor.id).toBe("primary");
  });

  it("skips fully booked doctors' slots", () => {
    const d = doctor({ id: "busy", availability: [win(3, "11:30", "12:00")] });
    const booked = new Map([["busy", new Set(["2026-11-11T11:30"])]]);
    const out = rankDoctors({
      doctors: [d],
      targets: [{ id: "general_medicine", weight: 1 }],
      patient: null,
      booked,
      ratings: noRatings,
      now: NOW,
    });
    expect(out[0]!.nextSlots[0]?.date).not.toBe("2026-11-11");
  });
});
