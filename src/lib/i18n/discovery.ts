import type { Lang } from "@/lib/i18n/dictionary";

/**
 * Strings for the specialist-discovery screens. English + Hinglish (+ Hindi for the
 * essentials). To add a regional language: add a block here and a pattern list in
 * src/lib/mediex/triage.ts — screens fall back to English for any missing key.
 */
export interface DiscoveryStrings {
  title: string;
  subtitle: string;
  disclaimer: string;
  placeholder: string;
  send: string;
  intro: string;
  newChat: string;
  thinking: string;
  locationTitle: string;
  useMyLocation: string;
  locating: string;
  enterArea: string;
  setArea: string;
  locationNotSet: string;
  locationDenied: string;
  locationLive: string;
  locationEntered: string;
  locationApprox: string;
  clearLocation: string;
  emergencyTitle: string;
  call112: string;
  call108: string;
  call14416: string;
  findHospital: string;
  suggested: string;
  doctorsTitle: string;
  noDoctors: string;
  book: string;
  directions: string;
  reviews: string;
  noReviews: string;
  distanceUnknown: string;
  straightLine: string;
  availToday: string;
  availNext: string;
  onLeave: string;
  noSlots: string;
  openNow: string;
  timings: string;
  demoBanner: string;
  fee: string;
}

const en: DiscoveryStrings = {
  title: "Find the right specialist",
  subtitle:
    "Describe your symptoms. I will suggest which kind of doctor to see and find nearby options.",
  disclaimer:
    "This assistant only helps you choose a specialist. It does not diagnose, prescribe, or replace a doctor. In an emergency call 112 or 108 immediately.",
  placeholder: "e.g. I have had a headache and dizziness for 3 days",
  send: "Send",
  intro:
    "Hello! Tell me what you are feeling in your own words (English or Hinglish). I will suggest the type of specialist and show matching doctors.",
  newChat: "Start over",
  thinking: "Understanding your symptoms…",
  locationTitle: "Your location",
  useMyLocation: "Use my location",
  locating: "Finding you…",
  enterArea: "Or type your area / city",
  setArea: "Set",
  locationNotSet:
    "Location not set — distances are hidden. Doctors are ranked by relevance and availability only.",
  locationDenied: "Location permission was denied. You can type your area instead.",
  locationLive: "Live location (this device)",
  locationEntered: "Entered location",
  locationApprox: "Approximate area centre — not an exact address",
  clearLocation: "Clear",
  emergencyTitle: "This may be an emergency",
  call112: "Call 112",
  call108: "Call ambulance 108",
  call14416: "Tele-MANAS 14416",
  findHospital: "Nearest hospital on Maps",
  suggested: "Suggested specialists",
  doctorsTitle: "Doctors matching your needs",
  noDoctors:
    "No matching doctors are listed yet. Try a General Physician or check back later — the directory grows as doctors register.",
  book: "Book appointment",
  directions: "Directions",
  reviews: "Reviews",
  noReviews: "No reviews yet.",
  distanceUnknown: "Distance unavailable",
  straightLine: "straight-line",
  availToday: "Available today",
  availNext: "Next slot",
  onLeave: "On leave until",
  noSlots: "No upcoming slots",
  openNow: "Open now",
  timings: "Timings",
  demoBanner:
    "Demo data: doctors and clinics shown here are fictional sample profiles for demonstration. Real doctors appear once they register.",
  fee: "Fee",
};

const hinglish: DiscoveryStrings = {
  ...en,
  title: "Sahi specialist dhundhiye",
  subtitle:
    "Apne lakshan batayiye. Main bataunga kis type ke doctor se milna chahiye aur paas ke options dikhaunga.",
  disclaimer:
    "Yeh assistant sirf specialist chunne mein madad karta hai. Yeh diagnosis ya dawai nahi batata aur doctor ka replacement nahi hai. Emergency mein turant 112 ya 108 par call karein.",
  placeholder: "jaise: 3 din se sir dard aur chakkar aa rahe hain",
  send: "Bhejein",
  intro:
    "Namaste! Aap jo mehsoos kar rahe hain apne shabdon mein batayiye (English ya Hinglish). Main specialist ka type bataunga aur doctors dikhaunga.",
  newChat: "Dobara shuru karein",
  thinking: "Aapke lakshan samajh raha hoon…",
  locationTitle: "Aapki location",
  useMyLocation: "Meri location use karein",
  locating: "Location dhundh raha hoon…",
  enterArea: "Ya apna area / sheher likhein",
  setArea: "Set karein",
  locationNotSet:
    "Location set nahi hai — distance nahi dikhega. Doctors sirf relevance aur availability se rank honge.",
  locationDenied: "Location ki permission nahi mili. Aap apna area type kar sakte hain.",
  locationLive: "Live location (is device ki)",
  locationEntered: "Aapki likhi hui location",
  locationApprox: "Area ka lagbhag centre — exact pata nahi",
  clearLocation: "Hatayein",
  emergencyTitle: "Yeh emergency ho sakti hai",
  call108: "Ambulance 108 call karein",
  findHospital: "Maps par nazdeeki hospital",
  suggested: "Suggested specialists",
  doctorsTitle: "Aapke liye doctors",
  noDoctors:
    "Abhi koi matching doctor listed nahi hai. General Physician try karein ya baad mein dekhein.",
  book: "Appointment book karein",
  directions: "Raasta (Directions)",
  reviews: "Reviews",
  noReviews: "Abhi koi review nahi.",
  distanceUnknown: "Distance maloom nahi",
  straightLine: "seedhi doori",
  availToday: "Aaj available",
  availNext: "Agla slot",
  onLeave: "Chhutti par, wapsi",
  noSlots: "Agle slots nahi",
  openNow: "Abhi khula hai",
  timings: "Timings",
  demoBanner:
    "Demo data: yahan dikhaye gaye doctors aur clinics kalpanik sample profiles hain. Asli doctors register hone par dikhenge.",
  fee: "Fees",
};

const hi: DiscoveryStrings = {
  ...en,
  title: "सही विशेषज्ञ खोजें",
  subtitle:
    "अपने लक्षण बताइए। मैं बताऊँगा कि किस प्रकार के डॉक्टर से मिलना चाहिए और पास के विकल्प दिखाऊँगा।",
  disclaimer:
    "यह सहायक केवल विशेषज्ञ चुनने में मदद करता है। यह निदान या दवा नहीं बताता और डॉक्टर का विकल्प नहीं है। आपातकाल में तुरंत 112 या 108 पर कॉल करें।",
  placeholder: "जैसे: 3 दिन से सिर दर्द और चक्कर आ रहे हैं",
  send: "भेजें",
  intro:
    "नमस्ते! आप जो महसूस कर रहे हैं अपने शब्दों में बताइए। मैं विशेषज्ञ का प्रकार बताऊँगा और डॉक्टर दिखाऊँगा।",
  newChat: "फिर से शुरू करें",
  locationTitle: "आपकी लोकेशन",
  useMyLocation: "मेरी लोकेशन इस्तेमाल करें",
  enterArea: "या अपना इलाका / शहर लिखें",
  setArea: "सेट करें",
  emergencyTitle: "यह आपातकाल हो सकता है",
  call108: "एम्बुलेंस 108 कॉल करें",
  book: "अपॉइंटमेंट बुक करें",
  directions: "रास्ता",
  doctorsTitle: "आपके लिए डॉक्टर",
};

export const DISCOVERY: Record<Lang, DiscoveryStrings> = { en, hinglish, hi };
