import type { Hospital } from "@/types";

/** Sample hospital + doctor directory. Swap for an API call when a backend exists. */
export const hospitals: Hospital[] = [
  {
    id: "h1",
    name: "Sunrise Multispeciality Hospital",
    specialties: ["General Medicine", "Cardiology", "Orthopaedics"],
    address: "12 MG Road, Sector 4",
    city: "Delhi",
    distanceKm: 1.8,
    status: "Open 24x7",
    rating: 4.7,
    phone: "011 4000 1200",
    doctors: [
      {
        id: "d1",
        name: "Dr. Anita Sharma",
        specialty: "General Medicine",
        experienceYears: 14,
        slots: ["09:30", "11:00", "16:00", "18:30"],
      },
      {
        id: "d2",
        name: "Dr. Rohit Verma",
        specialty: "Cardiology",
        experienceYears: 19,
        slots: ["10:00", "12:30", "17:15"],
      },
    ],
  },
  {
    id: "h2",
    name: "Lotus Heart Institute",
    specialties: ["Cardiology", "Pulmonology"],
    address: "88 Ring Road, Civil Lines",
    city: "Delhi",
    distanceKm: 3.4,
    status: "Open now",
    rating: 4.6,
    phone: "011 4522 8890",
    doctors: [
      {
        id: "d3",
        name: "Dr. Meera Iyer",
        specialty: "Cardiology",
        experienceYears: 22,
        slots: ["09:00", "13:00", "15:45"],
      },
      {
        id: "d4",
        name: "Dr. Sameer Khan",
        specialty: "Pulmonology",
        experienceYears: 11,
        slots: ["10:30", "14:15", "19:00"],
      },
    ],
  },
  {
    id: "h3",
    name: "Green Valley Childcare Centre",
    specialties: ["Paediatrics", "Vaccination"],
    address: "5 Lake View Street",
    city: "Noida",
    distanceKm: 5.1,
    status: "Closing soon",
    rating: 4.8,
    phone: "0120 662 3311",
    doctors: [
      {
        id: "d5",
        name: "Dr. Kavya Nair",
        specialty: "Paediatrics",
        experienceYears: 9,
        slots: ["09:15", "11:45", "16:30"],
      },
    ],
  },
  {
    id: "h4",
    name: "City Orthopaedic & Spine Clinic",
    specialties: ["Orthopaedics", "Physiotherapy"],
    address: "44 Station Road",
    city: "Gurugram",
    distanceKm: 7.6,
    status: "Open now",
    rating: 4.4,
    phone: "0124 771 5540",
    doctors: [
      {
        id: "d6",
        name: "Dr. Arjun Malhotra",
        specialty: "Orthopaedics",
        experienceYears: 16,
        slots: ["08:45", "12:00", "17:30"],
      },
      {
        id: "d7",
        name: "Dr. Priya Deshmukh",
        specialty: "Physiotherapy",
        experienceYears: 7,
        slots: ["10:15", "13:30", "18:00"],
      },
    ],
  },
  {
    id: "h5",
    name: "Aarogya Skin & Allergy Care",
    specialties: ["Dermatology", "Allergy"],
    address: "19 Park Street",
    city: "Noida",
    distanceKm: 4.2,
    status: "Open now",
    rating: 4.3,
    phone: "0120 559 7742",
    doctors: [
      {
        id: "d8",
        name: "Dr. Nikhil Rao",
        specialty: "Dermatology",
        experienceYears: 12,
        slots: ["09:45", "12:15", "16:45"],
      },
    ],
  },
  {
    id: "h6",
    name: "Nirmal Eye & ENT Hospital",
    specialties: ["Ophthalmology", "ENT"],
    address: "7 Temple Lane, Old Town",
    city: "Delhi",
    distanceKm: 2.9,
    status: "Open now",
    rating: 4.5,
    phone: "011 2367 4410",
    doctors: [
      {
        id: "d9",
        name: "Dr. Farah Siddiqui",
        specialty: "Ophthalmology",
        experienceYears: 18,
        slots: ["09:00", "11:30", "15:00"],
      },
      {
        id: "d10",
        name: "Dr. Vikas Chandra",
        specialty: "ENT",
        experienceYears: 13,
        slots: ["10:45", "14:00", "18:15"],
      },
    ],
  },
  {
    id: "h7",
    name: "Metro Emergency & Trauma Centre",
    specialties: ["Emergency", "General Surgery"],
    address: "2 Highway Junction",
    city: "Gurugram",
    distanceKm: 6.3,
    status: "Open 24x7",
    rating: 4.2,
    phone: "0124 900 1188",
    doctors: [
      {
        id: "d11",
        name: "Dr. Suresh Pillai",
        specialty: "General Surgery",
        experienceYears: 21,
        slots: ["08:30", "13:45", "19:30"],
      },
    ],
  },
  {
    id: "h8",
    name: "Shanti Women's Health Hospital",
    specialties: ["Gynaecology", "Obstetrics"],
    address: "31 Garden Avenue",
    city: "Delhi",
    distanceKm: 3.9,
    status: "Open now",
    rating: 4.9,
    phone: "011 4188 2200",
    doctors: [
      {
        id: "d12",
        name: "Dr. Ritu Bansal",
        specialty: "Gynaecology",
        experienceYears: 17,
        slots: ["09:30", "12:45", "17:00"],
      },
    ],
  },
];

export const allSpecialties = Array.from(new Set(hospitals.flatMap((h) => h.specialties))).sort();

export const allCities = Array.from(new Set(hospitals.map((h) => h.city))).sort();

export const emergencyContacts = [
  { label: "National Emergency Number", value: "112" },
  { label: "Ambulance", value: "108" },
  { label: "Medical Helpline", value: "104" },
  { label: "Mental Health Helpline (Tele-MANAS)", value: "14416" },
];
