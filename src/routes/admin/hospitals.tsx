import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BadgeCheck, Loader2, LogOut, MapPin, ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, errorText } from "@/lib/mediex/http";
import { Navigate } from "@/lib/router";

interface AdminHospital {
  id: string;
  name: string;
  kind: "hospital" | "clinic";
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  status: "pending" | "verified" | "rejected";
  doctors: { id: string; fullName: string; verificationStatus: string }[];
}

export const Route = createFileRoute("/admin/hospitals")({
  head: () => ({ meta: [{ title: "Hospital Verification | Mediex Admin" }] }),
  component: AdminHospitals,
});

function AdminHospitals() {
  const { ready, admin, logoutDoctor } = useAuth();
  const [hospitals, setHospitals] = useState<AdminHospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!admin) return;
    let active = true;
    setLoading(true);
    void apiFetch<{ hospitals: AdminHospital[] }>("/api/admin/hospitals").then((result) => {
      if (!active) return;
      if (!result.ok || !result.data) {
        setError(errorText(result.error));
        setHospitals([]);
      } else {
        setError("");
        setHospitals(result.data.hospitals);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [admin, reload]);

  async function review(id: string, decision: "verify" | "reject") {
    setBusyId(id);
    setError("");
    const result = await apiFetch("/api/admin/hospitals", {
      method: "PATCH",
      body: { id, decision },
    });
    setBusyId(null);
    if (!result.ok) {
      setError(errorText(result.error));
      return;
    }
    setReload((value) => value + 1);
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  if (!admin) return <Navigate to="/doctor/login" replace />;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-medical-700">
              Mediex administration
            </p>
            <h1 className="mt-1 text-xl font-bold text-slate-800">Hospital verification</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void logoutDoctor()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-5 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-100">
          <ShieldAlert size={18} className="mt-0.5 shrink-0" />
          <p>
            Verify a clinic only after independently checking its identity and address. Verification
            is an administrator decision; doctor registration does not verify a hospital.
          </p>
        </div>

        {error && (
          <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-white p-10 text-sm text-slate-500">
            <Loader2 size={18} className="animate-spin" />
            Loading clinic submissions…
          </div>
        ) : hospitals.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500">
            No clinic submissions are available for review.
          </div>
        ) : (
          <ul className="space-y-3">
            {hospitals.map((hospital) => (
              <li
                key={hospital.id}
                className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-slate-800">{hospital.name}</h2>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-slate-600">
                        {hospital.status}
                      </span>
                    </div>
                    <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-500">
                      <MapPin size={15} className="mt-0.5 shrink-0" />
                      {hospital.addressLine}, {hospital.city}, {hospital.state} {hospital.pincode}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {hospital.doctors.length
                        ? `Associated doctors: ${hospital.doctors.map((doctor) => doctor.fullName).join(", ")}`
                        : "No associated doctors"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === hospital.id || hospital.status === "verified"}
                      onClick={() => void review(hospital.id, "verify")}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busyId === hospital.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <BadgeCheck size={14} />
                      )}
                      Verify
                    </button>
                    <button
                      type="button"
                      disabled={busyId === hospital.id || hospital.status === "rejected"}
                      onClick={() => void review(hospital.id, "reject")}
                      className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
