import { useState } from "react";
import { LocateFixed, MapPin, Search, X } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, errorText } from "@/lib/mediex/http";
import type { DiscoveryStrings } from "@/lib/i18n/discovery";

export interface PatientLocation {
  lat: number;
  lng: number;
  label: string;
  source: "gps" | "google" | "nominatim" | "known_area_approx";
}

/** Browser geolocation (only after the person taps the button) or a typed area. Never guesses a location. */
export function LocationPicker({
  value,
  onChange,
  t,
}: {
  value: PatientLocation | null;
  onChange: (l: PatientLocation | null) => void;
  t: DiscoveryStrings;
}) {
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");

  function useGps() {
    if (!("geolocation" in navigator)) {
      toast.error("This browser does not support location. Type your area instead.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        onChange({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "Current location",
          source: "gps",
        });
      },
      (err) => {
        setBusy(false);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? t.locationDenied
            : "Could not get your location. Type your area instead.",
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < 3) return;
    setBusy(true);
    const r = await apiFetch<{
      lat: number;
      lng: number;
      label: string;
      source: PatientLocation["source"];
    }>(`/api/geocode?q=${encodeURIComponent(text.trim())}`);
    setBusy(false);
    if (!r.ok || !r.data) {
      toast.error(errorText(r.error));
      return;
    }
    onChange({ lat: r.data.lat, lng: r.data.lng, label: r.data.label, source: r.data.source });
    setText("");
  }

  const sourceNote =
    value?.source === "gps"
      ? t.locationLive
      : value?.source === "known_area_approx"
        ? t.locationApprox
        : t.locationEntered;

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/80">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <MapPin size={16} className="text-medical-600" />
        {t.locationTitle}
      </div>
      {value ? (
        <div className="flex items-start justify-between gap-3 rounded-xl bg-medical-50 p-3 text-sm ring-1 ring-medical-100">
          <div className="min-w-0">
            <p className="truncate font-medium text-medical-800">{value.label}</p>
            <p className="text-xs text-medical-700">{sourceNote}</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={t.clearLocation}
            className="rounded-lg p-1 text-medical-700 hover:bg-medical-100"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">{t.locationNotSet}</p>
      )}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={useGps}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-medical-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-medical-700 disabled:opacity-60"
        >
          <LocateFixed size={16} />
          {busy ? t.locating : t.useMyLocation}
        </button>
        <form onSubmit={lookup} className="flex min-w-0 flex-1 gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.enterArea}
            aria-label={t.enterArea}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-medical-500 focus:ring-2 focus:ring-medical-500/20"
          />
          <button
            type="submit"
            disabled={busy || text.trim().length < 3}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Search size={14} />
            {t.setArea}
          </button>
        </form>
      </div>
    </div>
  );
}
