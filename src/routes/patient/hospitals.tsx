import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Phone, Search, Stethoscope, BadgeCheck, Loader2 } from "lucide-react";
import PatientShell from "@/components/PatientShell";
import { RequirePatient } from "@/components/RequirePatient";
import { apiFetch, errorText } from "@/lib/mediex/http";
import { SPECIALTIES, SPECIALTY_BY_ID, type HospitalDirectoryEntry } from "@/types/directory";

interface HospitalSearchResult {
  hospitals: HospitalDirectoryEntry[];
  total: number;
  cities: string[];
}

export const Route = createFileRoute("/patient/hospitals")({
  head: () => ({
    meta: [
      { title: "Find Verified Hospitals & Clinics | Mediex" },
      {
        name: "description",
        content: "Search verified hospitals and clinics from the Mediex directory.",
      },
    ],
  }),
  component: () => <RequirePatient>{() => <Hospitals />}</RequirePatient>,
});

function Hospitals() {
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [city, setCity] = useState("");
  const [results, setResults] = useState<HospitalDirectoryEntry[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ page: "1", pageSize: "50" });
      if (query.trim()) params.set("q", query.trim());
      if (city) params.set("city", city);
      if (specialty) params.set("specialty", specialty);
      setLoading(true);
      setError("");
      void apiFetch<HospitalSearchResult>(`/api/hospitals?${params.toString()}`).then((result) => {
        if (!active) return;
        if (!result.ok || !result.data) {
          setError(errorText(result.error));
          setResults([]);
          setTotal(0);
        } else {
          setResults(result.data.hospitals);
          setCities(result.data.cities);
          setTotal(result.data.total);
        }
        setLoading(false);
      });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, specialty, city]);

  return (
    <PatientShell
      title="Find Hospitals"
      subtitle="Browse verified hospitals and clinics with real directory details"
    >
      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 md:p-5">
        <div className="grid gap-3 md:grid-cols-[1.6fr_1fr_1fr]">
          <label className="relative">
            <span className="sr-only">Search hospitals, locations, or doctors</span>
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search hospital, address or doctor"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-medical-400 focus:bg-white"
            />
          </label>
          <select
            aria-label="Filter by specialty"
            value={specialty}
            onChange={(event) => setSpecialty(event.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-medical-400"
          >
            <option value="">All specialties</option>
            {SPECIALTIES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by city"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-medical-400"
          >
            <option value="">All cities</option>
            {cities.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {loading
            ? "Searching verified listings…"
            : `${total} verified listing${total === 1 ? "" : "s"}`}
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      {loading ? (
        <div className="mt-5 flex items-center justify-center gap-2 rounded-3xl bg-white p-10 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200/70">
          <Loader2 size={18} className="animate-spin" />
          Loading verified listings…
        </div>
      ) : results.length > 0 ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {results.map((hospital) => {
            const destination = `${hospital.addressLine}, ${hospital.city}, ${hospital.state}, ${hospital.pincode}`;
            const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
            return (
              <article
                key={hospital.id}
                className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-800">{hospital.name}</h2>
                    <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-500">
                      <MapPin size={14} className="mt-0.5 shrink-0 text-medical-500" />
                      {hospital.addressLine}, {hospital.city}, {hospital.state} {hospital.pincode}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                    <BadgeCheck size={13} />
                    Verified
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {hospital.specialties.map((id) => (
                    <span
                      key={id}
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600"
                    >
                      {SPECIALTY_BY_ID[id].name}
                    </span>
                  ))}
                </div>

                {hospital.phone && (
                  <a
                    href={`tel:${hospital.phone.replace(/[^\d+]/g, "")}`}
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-medical-700"
                  >
                    <Phone size={14} className="text-medical-500" />
                    {hospital.phone}
                  </a>
                )}

                {hospital.doctors.length > 0 && (
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                    {hospital.doctors.map((doctor) => (
                      <div
                        key={doctor.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                            <Stethoscope size={14} className="text-medical-600" />
                            {doctor.fullName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {doctor.specialties.map((id) => SPECIALTY_BY_ID[id].name).join(", ")}
                            {doctor.experienceYears !== null
                              ? ` · ${doctor.experienceYears} years`
                              : ""}
                            {doctor.verificationStatus === "verified" ? " · Verified doctor" : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-medical-50 px-3 py-2 text-xs font-semibold text-medical-700 hover:bg-medical-100"
                  >
                    Get directions
                  </a>
                  <Link
                    to="/patient/find-doctor"
                    className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    Find a doctor
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200/70">
          <p className="text-sm font-semibold text-slate-700">
            {error ? "Verified listings are unavailable" : "No verified listings found"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {error
              ? "Please try again shortly."
              : "Only clinics reviewed by a Mediex administrator appear here. Sample locations are not shown as real hospitals."}
          </p>
        </div>
      )}
    </PatientShell>
  );
}
