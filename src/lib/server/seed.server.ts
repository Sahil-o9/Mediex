/**
 * DEMO DATA ONLY.
 *
 * Every clinic and doctor below is FICTIONAL and flagged `isDemo: true`.
 * Clinic coordinates are approximate area centres (Delhi-NCR), not surveyed
 * addresses. No demo doctor is marked "verified". No phone numbers are invented.
 *
 * This module has no runtime imports so scripts/generate-seed-sql.mjs can load it
 * directly with `node --experimental-strip-types` to produce supabase/seed.sql.
 */
import type {
  AvailabilityRow,
  ClinicRow,
  DoctorConditionRow,
  DoctorRow,
  DoctorSpecializationRow,
  LeaveRow,
} from "./db.server.ts";

const hex = (n: number, w: number) => n.toString(16).padStart(w, "0");
/** Deterministic, valid UUIDs so demo rows have stable IDs across deployments. */
export const demoUuid = (kind: number, n: number) => `${hex(kind, 8)}-0000-4000-8000-${hex(n, 12)}`;

export const DEMO_DOCTOR_LOGIN_ID = "doctor001";
export const DEMO_DOCTOR_PROFILE_ID = demoUuid(2, 1);

interface ClinicSeed {
  n: number;
  name: string;
  kind: "hospital" | "clinic";
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  lat: number;
  lng: number;
}

const CLINICS: ClinicSeed[] = [
  {
    n: 1,
    name: "Sunrise Multispeciality Hospital",
    kind: "hospital",
    addressLine: "12 MG Road, Connaught Place",
    city: "Delhi",
    state: "Delhi",
    pincode: "110001",
    lat: 28.6315,
    lng: 77.2167,
  },
  {
    n: 2,
    name: "Lotus Heart Institute",
    kind: "hospital",
    addressLine: "88 Ring Road, Civil Lines",
    city: "Delhi",
    state: "Delhi",
    pincode: "110054",
    lat: 28.681,
    lng: 77.222,
  },
  {
    n: 3,
    name: "Green Valley Childcare Centre",
    kind: "clinic",
    addressLine: "5 Lake View Street, Sector 18",
    city: "Noida",
    state: "Uttar Pradesh",
    pincode: "201301",
    lat: 28.5707,
    lng: 77.3219,
  },
  {
    n: 4,
    name: "City Orthopaedic & Spine Clinic",
    kind: "clinic",
    addressLine: "44 Station Road, Sector 29",
    city: "Gurugram",
    state: "Haryana",
    pincode: "122001",
    lat: 28.4595,
    lng: 77.0266,
  },
  {
    n: 5,
    name: "Aarogya Skin & Allergy Care",
    kind: "clinic",
    addressLine: "19 Park Street, Sector 62",
    city: "Noida",
    state: "Uttar Pradesh",
    pincode: "201309",
    lat: 28.627,
    lng: 77.365,
  },
  {
    n: 6,
    name: "Nirmal Eye & ENT Hospital",
    kind: "hospital",
    addressLine: "7 Temple Lane, Old City",
    city: "Delhi",
    state: "Delhi",
    pincode: "110006",
    lat: 28.6562,
    lng: 77.241,
  },
  {
    n: 7,
    name: "Shanti Women's Health Hospital",
    kind: "hospital",
    addressLine: "31 Garden Avenue, Saket",
    city: "Delhi",
    state: "Delhi",
    pincode: "110017",
    lat: 28.5245,
    lng: 77.2066,
  },
  {
    n: 8,
    name: "Dadri Community Health Clinic",
    kind: "clinic",
    addressLine: "Main Market Road, Dadri",
    city: "Dadri",
    state: "Uttar Pradesh",
    pincode: "203207",
    lat: 28.5535,
    lng: 77.554,
  },
  {
    n: 9,
    name: "Greater Noida Family Care",
    kind: "clinic",
    addressLine: "Alpha 1 Commercial Belt",
    city: "Greater Noida",
    state: "Uttar Pradesh",
    pincode: "201310",
    lat: 28.4744,
    lng: 77.504,
  },
  {
    n: 10,
    name: "Indirapuram Mind & Wellness Clinic",
    kind: "clinic",
    addressLine: "Shakti Khand 2, Indirapuram",
    city: "Ghaziabad",
    state: "Uttar Pradesh",
    pincode: "201014",
    lat: 28.646,
    lng: 77.3715,
  },
  {
    n: 11,
    name: "Dwarka Urology & Kidney Care",
    kind: "clinic",
    addressLine: "Sector 12, Dwarka",
    city: "Delhi",
    state: "Delhi",
    pincode: "110078",
    lat: 28.5921,
    lng: 77.046,
  },
  {
    n: 12,
    name: "SmileCraft Dental Studio",
    kind: "clinic",
    addressLine: "Sector 50 Market",
    city: "Noida",
    state: "Uttar Pradesh",
    pincode: "201301",
    lat: 28.57,
    lng: 77.36,
  },
  {
    n: 13,
    name: "NeuroCare Centre",
    kind: "hospital",
    addressLine: "Kavi Nagar",
    city: "Ghaziabad",
    state: "Uttar Pradesh",
    pincode: "201002",
    lat: 28.6692,
    lng: 77.4538,
  },
];

type Hours = [number[], string, string][];
const MON_SAT = [1, 2, 3, 4, 5, 6];
const MON_FRI = [1, 2, 3, 4, 5];

const OPD_SPLIT: Hours = [
  [MON_SAT, "10:00", "13:00"],
  [MON_SAT, "17:00", "20:00"],
];
const OPD_DAY: Hours = [[MON_FRI, "09:00", "16:00"]];
const ALT_DAYS: Hours = [[[2, 4, 6], "11:00", "15:00"]];
const EVENING: Hours = [[MON_SAT, "16:00", "21:00"]];
const LONG_DAY: Hours = [
  [MON_SAT, "09:00", "13:00"],
  [MON_SAT, "15:00", "19:00"],
];

interface DoctorSeed {
  n: number;
  name: string;
  quals: string;
  specialties: [string, ...string[]];
  clinic: number;
  years: number;
  langs: string[];
  fee: number;
  conditions: string[];
  hours: Hours;
  slot: number;
  /** Leave window as [startOffsetDays, endOffsetDays] from today (IST). */
  leave?: [number, number];
  bio: string;
}

const DOCTORS: DoctorSeed[] = [
  {
    n: 1,
    name: "Dr. Anita Sharma",
    quals: "MBBS, MD (General Medicine)",
    specialties: ["general_medicine"],
    clinic: 1,
    years: 14,
    langs: ["English", "Hindi"],
    fee: 600,
    conditions: [
      "fever",
      "cold",
      "cough",
      "body ache",
      "weakness",
      "viral infection",
      "health check-up",
    ],
    hours: OPD_SPLIT,
    slot: 20,
    bio: "Demo profile. General physician for adult primary care.",
  },
  {
    n: 2,
    name: "Dr. Rajesh Tomar",
    quals: "MBBS",
    specialties: ["general_medicine"],
    clinic: 8,
    years: 11,
    langs: ["Hindi", "English"],
    fee: 300,
    conditions: ["fever", "cold", "cough", "stomach upset", "weakness", "blood pressure check"],
    hours: EVENING,
    slot: 15,
    bio: "Demo profile. Family physician at a community clinic.",
  },
  {
    n: 3,
    name: "Dr. Rohit Verma",
    quals: "MBBS, MD, DM (Cardiology)",
    specialties: ["cardiology"],
    clinic: 1,
    years: 19,
    langs: ["English", "Hindi"],
    fee: 1000,
    conditions: ["palpitations", "high blood pressure", "cholesterol", "swollen feet"],
    hours: OPD_DAY,
    slot: 30,
    leave: [0, 4],
    bio: "Demo profile. Heart and blood-pressure consultations.",
  },
  {
    n: 4,
    name: "Dr. Meera Iyer",
    quals: "MBBS, MD, DM (Cardiology)",
    specialties: ["cardiology", "general_medicine"],
    clinic: 2,
    years: 22,
    langs: ["English", "Hindi", "Tamil"],
    fee: 1200,
    conditions: ["palpitations", "blood pressure", "cholesterol"],
    hours: ALT_DAYS,
    slot: 30,
    bio: "Demo profile. Cardiology consultations at a heart institute.",
  },
  {
    n: 5,
    name: "Dr. Sameer Khan",
    quals: "MBBS, MD (Pulmonary Medicine)",
    specialties: ["pulmonology", "general_medicine"],
    clinic: 2,
    years: 11,
    langs: ["English", "Hindi", "Urdu"],
    fee: 800,
    conditions: ["cough", "asthma", "wheezing", "breathing problem"],
    hours: LONG_DAY,
    slot: 20,
    bio: "Demo profile. Lung and breathing consultations.",
  },
  {
    n: 6,
    name: "Dr. Kavya Nair",
    quals: "MBBS, MD (Paediatrics)",
    specialties: ["paediatrics"],
    clinic: 3,
    years: 9,
    langs: ["English", "Hindi", "Malayalam"],
    fee: 700,
    conditions: ["child fever", "vaccination", "cough in children", "growth concerns"],
    hours: OPD_SPLIT,
    slot: 20,
    leave: [3, 6],
    bio: "Demo profile. Child health and vaccination.",
  },
  {
    n: 7,
    name: "Dr. Arjun Malhotra",
    quals: "MBBS, MS (Orthopaedics)",
    specialties: ["orthopaedics"],
    clinic: 4,
    years: 16,
    langs: ["English", "Hindi", "Punjabi"],
    fee: 900,
    conditions: ["back pain", "knee pain", "joint pain", "sprain", "fracture follow-up"],
    hours: OPD_SPLIT,
    slot: 20,
    bio: "Demo profile. Bone and joint consultations.",
  },
  {
    n: 8,
    name: "Dr. Neha Bhatia",
    quals: "MBBS, MS (Orthopaedics)",
    specialties: ["orthopaedics"],
    clinic: 9,
    years: 8,
    langs: ["Hindi", "English"],
    fee: 700,
    conditions: ["back pain", "neck pain", "shoulder pain", "knee pain"],
    hours: LONG_DAY,
    slot: 20,
    bio: "Demo profile. Orthopaedics in Greater Noida.",
  },
  {
    n: 9,
    name: "Dr. Nikhil Rao",
    quals: "MBBS, MD (Dermatology)",
    specialties: ["dermatology"],
    clinic: 5,
    years: 12,
    langs: ["English", "Hindi", "Telugu"],
    fee: 800,
    conditions: ["rash", "itching", "acne", "hair fall", "skin allergy", "fungal infection"],
    hours: OPD_SPLIT,
    slot: 15,
    bio: "Demo profile. Skin, hair and nail consultations.",
  },
  {
    n: 10,
    name: "Dr. Farah Siddiqui",
    quals: "MBBS, MS (Ophthalmology)",
    specialties: ["ophthalmology"],
    clinic: 6,
    years: 18,
    langs: ["English", "Hindi", "Urdu"],
    fee: 700,
    conditions: ["blurred vision", "red eye", "eye pain", "watery eyes", "spectacle power"],
    hours: OPD_DAY,
    slot: 15,
    bio: "Demo profile. Eye consultations.",
  },
  {
    n: 11,
    name: "Dr. Vikas Chandra",
    quals: "MBBS, MS (ENT)",
    specialties: ["ent"],
    clinic: 6,
    years: 13,
    langs: ["English", "Hindi"],
    fee: 700,
    conditions: ["ear pain", "sore throat", "blocked nose", "sinus", "hearing difficulty"],
    hours: EVENING,
    slot: 15,
    bio: "Demo profile. Ear, nose and throat consultations.",
  },
  {
    n: 12,
    name: "Dr. Ritu Bansal",
    quals: "MBBS, MS (Obstetrics & Gynaecology)",
    specialties: ["gynaecology"],
    clinic: 7,
    years: 17,
    langs: ["English", "Hindi"],
    fee: 1000,
    conditions: ["irregular periods", "pregnancy care", "PCOS", "menopause"],
    hours: OPD_SPLIT,
    slot: 20,
    bio: "Demo profile. Women's health consultations.",
  },
  {
    n: 13,
    name: "Dr. Seema Rathi",
    quals: "MBBS, DGO",
    specialties: ["gynaecology", "general_medicine"],
    clinic: 9,
    years: 10,
    langs: ["Hindi", "English"],
    fee: 600,
    conditions: ["periods", "pregnancy care", "white discharge"],
    hours: ALT_DAYS,
    slot: 20,
    bio: "Demo profile. Women's health in Greater Noida.",
  },
  {
    n: 14,
    name: "Dr. Sunil Gupta",
    quals: "MBBS, MD, DM (Gastroenterology)",
    specialties: ["gastroenterology"],
    clinic: 1,
    years: 15,
    langs: ["English", "Hindi"],
    fee: 1000,
    conditions: [
      "stomach pain",
      "acidity",
      "constipation",
      "loose motions",
      "jaundice",
      "bloating",
    ],
    hours: OPD_DAY,
    slot: 20,
    bio: "Demo profile. Digestive health consultations.",
  },
  {
    n: 15,
    name: "Dr. Ananya Mishra",
    quals: "MBBS, MD (Psychiatry)",
    specialties: ["psychiatry"],
    clinic: 10,
    years: 9,
    langs: ["English", "Hindi"],
    fee: 900,
    conditions: ["anxiety", "low mood", "sleep problems", "stress"],
    hours: EVENING,
    slot: 40,
    bio: "Demo profile. Mental-health consultations.",
  },
  {
    n: 16,
    name: "Dr. Imran Qureshi",
    quals: "MBBS, MD, DM (Neurology)",
    specialties: ["neurology"],
    clinic: 13,
    years: 14,
    langs: ["English", "Hindi", "Urdu"],
    fee: 1000,
    conditions: ["headache", "migraine", "dizziness", "numbness", "tremors"],
    hours: ALT_DAYS,
    slot: 30,
    bio: "Demo profile. Neurology consultations.",
  },
  {
    n: 17,
    name: "Dr. Deepa Krishnan",
    quals: "MBBS, MD, DM (Endocrinology)",
    specialties: ["endocrinology", "general_medicine"],
    clinic: 1,
    years: 12,
    langs: ["English", "Hindi", "Tamil"],
    fee: 1000,
    conditions: ["diabetes", "thyroid", "weight concerns", "hormone problems"],
    hours: OPD_DAY,
    slot: 20,
    bio: "Demo profile. Diabetes and thyroid care.",
  },
  {
    n: 18,
    name: "Dr. Manoj Kulkarni",
    quals: "MBBS, MS, MCh (Urology)",
    specialties: ["urology"],
    clinic: 11,
    years: 16,
    langs: ["English", "Hindi", "Marathi"],
    fee: 900,
    conditions: ["burning urination", "kidney stone", "frequent urination", "prostate"],
    hours: OPD_SPLIT,
    slot: 20,
    bio: "Demo profile. Urology consultations.",
  },
  {
    n: 19,
    name: "Dr. Shreya Kapoor",
    quals: "BDS, MDS",
    specialties: ["dentistry"],
    clinic: 12,
    years: 7,
    langs: ["English", "Hindi"],
    fee: 500,
    conditions: ["toothache", "gum problems", "cavity", "root canal"],
    hours: LONG_DAY,
    slot: 30,
    bio: "Demo profile. Dental care.",
  },
  {
    n: 20,
    name: "Dr. Pooja Saxena",
    quals: "MBBS, DCH",
    specialties: ["paediatrics", "general_medicine"],
    clinic: 8,
    years: 8,
    langs: ["Hindi", "English"],
    fee: 400,
    conditions: ["child fever", "cough in children", "vaccination"],
    hours: OPD_SPLIT,
    slot: 15,
    bio: "Demo profile. Child health at a community clinic in Dadri.",
  },
];

export interface SeedData {
  clinics: ClinicRow[];
  doctors: DoctorRow[];
  specializations: DoctorSpecializationRow[];
  conditions: DoctorConditionRow[];
  availability: AvailabilityRow[];
  leaves: LeaveRow[];
}

function addDaysIso(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** @param todayIst YYYY-MM-DD in India time; leaves are placed relative to it. */
export function buildSeed(todayIst: string, createdAt: string): SeedData {
  const clinics: ClinicRow[] = CLINICS.map((c) => ({
    id: demoUuid(1, c.n),
    name: c.name,
    kind: c.kind,
    addressLine: c.addressLine,
    city: c.city,
    state: c.state,
    pincode: c.pincode,
    lat: c.lat,
    lng: c.lng,
    phone: "",
    isDemo: true,
    verificationStatus: "pending",
    verifiedAt: null,
  }));

  const doctors: DoctorRow[] = [];
  const specializations: DoctorSpecializationRow[] = [];
  const conditions: DoctorConditionRow[] = [];
  const availability: AvailabilityRow[] = [];
  const leaves: LeaveRow[] = [];
  let sn = 0;
  let cn = 0;
  let an = 0;
  let ln = 0;

  for (const d of DOCTORS) {
    const id = demoUuid(2, d.n);
    doctors.push({
      id,
      handle: `DEMO-${String(d.n).padStart(3, "0")}`,
      fullName: d.name,
      email: "",
      qualifications: d.quals,
      registrationNumber: "",
      registrationCouncil: "",
      verificationStatus: "unverified",
      verificationSource: "",
      verifiedAt: null,
      experienceYears: d.years,
      languages: d.langs,
      consultationFee: d.fee,
      bio: d.bio,
      clinicId: demoUuid(1, d.clinic),
      slotMinutes: d.slot,
      acceptingAppointments: true,
      isDemo: true,
      createdAt,
    });
    d.specialties.forEach((s, i) => {
      specializations.push({
        id: demoUuid(3, ++sn),
        doctorId: id,
        specialtyId: s,
        isPrimary: i === 0,
      });
    });
    for (const c of d.conditions)
      conditions.push({ id: demoUuid(4, ++cn), doctorId: id, condition: c });
    for (const [days, start, end] of d.hours) {
      for (const wd of days) {
        availability.push({
          id: demoUuid(5, ++an),
          doctorId: id,
          weekday: wd,
          startTime: start,
          endTime: end,
        });
      }
    }
    if (d.leave) {
      leaves.push({
        id: demoUuid(6, ++ln),
        doctorId: id,
        startDate: addDaysIso(todayIst, d.leave[0]),
        endDate: addDaysIso(todayIst, d.leave[1]),
        reason: "Demo leave",
      });
    }
  }
  return { clinics, doctors, specializations, conditions, availability, leaves };
}
