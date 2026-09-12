import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, MapPin, Star, Phone, Stethoscope, CalendarCheck } from "lucide-react";
import { Link } from "@/lib/router";
import PatientShell from "@/components/PatientShell";
import { RequirePatient } from "@/components/RequirePatient";
import { hospitals, allSpecialties, allCities } from "@/lib/mediex/data";

export const Route = createFileRoute("/patient/hospitals")({
  head: () => ({
    meta: [
      { title: "Find Hospitals & Clinics | Mediex" },
      {
        name: "description",
        content:
          "Search nearby hospitals and clinics by specialty and city, see ratings, opening status and available doctors, then book a slot.",
      },
      { property: "og:title", content: "Find Hospitals & Clinics | Mediex" },
      {
        property: "og:description",
        content: "Search hospitals by specialty and city, then book a consultation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <RequirePatient>{() => <Hospitals />}</RequirePatient>,
});

const statusStyles: Record<string, string> = {
  "Open 24x7": "bg-emerald-50 text-emerald-700 ring-emerald-100",
  "Open now": "bg-medical-50 text-medical-700 ring-medical-100",
  "Closing soon": "bg-amber-50 text-amber-700 ring-amber-100",
};

function Hospitals() {
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("All");
  const [city, setCity] = useState("All");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return hospitals
      .filter((h) => (specialty === "All" ? true : h.specialties.includes(specialty)))
      .filter((h) => (city === "All" ? true : h.city === city))
      .filter((h) =>
        q
          ? h.name.toLowerCase().includes(q) ||
            h.address.toLowerCase().includes(q) ||
            h.specialties.some((s) => s.toLowerCase().includes(q)) ||
            h.doctors.some((d) => d.name.toLowerCase().includes(q))
          : true,
      )
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [query, specialty, city]);

  return (
    <PatientShell
      title="Find Hospitals"
      subtitle="Browse nearby care centres and book with an available doctor"
    >
      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 md:p-5">
        <div className="grid gap-3 md:grid-cols-[1.6fr_1fr_1fr]">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search hospital, area, specialty or doctor"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-medical-400 focus:bg-white"
            />
          </div>
          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-medical-400 focus:bg-white"
          >
            <option value="All">All specialties</option>
            {allSpecialties.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-medical-400 focus:bg-white"
          >
            <option value="All">All cities</option>
            {allCities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {results.length} care centre{results.length === 1 ? "" : "s"} found
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {results.map((h, i) => (
          <motion.article
            key={h.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex flex-col rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-800">{h.name}</h2>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin size={14} className="text-medical-500" />
                  {h.address}, {h.city} · {h.distanceKm} km away
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${statusStyles[h.status]}`}
              >
                {h.status}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {h.specialties.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600"
                >
                  {s}
                </span>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-4 text-xs font-medium text-slate-600">
              <span className="flex items-center gap-1">
                <Star size={14} className="text-amber-500" />
                {h.rating.toFixed(1)}
              </span>
              <a
                href={`tel:${h.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-1 hover:text-medical-700"
              >
                <Phone size={14} className="text-medical-500" />
                {h.phone}
              </a>
            </div>

            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
              {h.doctors.map((d) => (
                <div
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                      <Stethoscope size={14} className="text-medical-600" />
                      {d.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {d.specialty} · {d.experienceYears} yrs · {d.slots.length} slots today
                    </p>
                  </div>
                  <Link
                    to={`/patient/appointments?hospital=${h.id}&doctor=${d.id}`}
                    className="flex items-center gap-1.5 rounded-full bg-medical-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-medical-700"
                  >
                    <CalendarCheck size={14} />
                    Book
                  </Link>
                </div>
              ))}
            </div>
          </motion.article>
        ))}
      </div>

      {results.length === 0 && (
        <div className="mt-6 rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200/70">
          <p className="text-sm font-semibold text-slate-700">No care centres match your filters</p>
          <p className="mt-1 text-xs text-slate-500">
            Try clearing the search box or choosing “All specialties”.
          </p>
        </div>
      )}
    </PatientShell>
  );
}
