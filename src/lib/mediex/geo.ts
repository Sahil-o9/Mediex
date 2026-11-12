/**
 * Geography helpers. Nothing here invents a location: when a coordinate is
 * missing the functions return null and the UI says "distance unavailable".
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export function isValidLatLng(p: { lat: unknown; lng: unknown } | null | undefined): p is LatLng {
  return (
    !!p &&
    typeof p.lat === "number" &&
    typeof p.lng === "number" &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    p.lat >= -90 &&
    p.lat <= 90 &&
    p.lng >= -180 &&
    p.lng <= 180
  );
}

const EARTH_RADIUS_KM = 6371.0088;
const toRad = (d: number) => (d * Math.PI) / 180;

/** Great-circle ("as the crow flies") distance. Road distance is longer — the UI says so. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function distanceOrNull(
  from: LatLng | null | undefined,
  to: { lat: number | null; lng: number | null } | null | undefined,
): number | null {
  if (!from || !to || to.lat === null || to.lng === null) return null;
  if (!isValidLatLng(from) || !isValidLatLng({ lat: to.lat, lng: to.lng })) return null;
  return Math.round(haversineKm(from, { lat: to.lat, lng: to.lng }) * 10) / 10;
}

/** Google Maps "directions" deep link. Needs no API key; opens the Maps app/site. */
export function directionsUrl(dest: { lat: number | null; lng: number | null }): string | null {
  if (dest.lat === null || dest.lng === null) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}`;
}

/**
 * Approximate city / area centres used ONLY as an offline fallback when no
 * geocoder is reachable. They are not street addresses; the UI labels the
 * result "approximate area centre".
 */
export const KNOWN_AREAS: { name: string; lat: number; lng: number }[] = [
  { name: "Delhi", lat: 28.6139, lng: 77.209 },
  { name: "New Delhi", lat: 28.6139, lng: 77.209 },
  { name: "Connaught Place", lat: 28.6315, lng: 77.2167 },
  { name: "Saket", lat: 28.5245, lng: 77.2066 },
  { name: "Dwarka", lat: 28.5921, lng: 77.046 },
  { name: "Noida", lat: 28.5355, lng: 77.391 },
  { name: "Greater Noida", lat: 28.4744, lng: 77.504 },
  { name: "Dadri", lat: 28.5535, lng: 77.554 },
  { name: "Ghaziabad", lat: 28.6692, lng: 77.4538 },
  { name: "Indirapuram", lat: 28.646, lng: 77.3715 },
  { name: "Gurugram", lat: 28.4595, lng: 77.0266 },
  { name: "Gurgaon", lat: 28.4595, lng: 77.0266 },
  { name: "Faridabad", lat: 28.4089, lng: 77.3178 },
  { name: "Mumbai", lat: 19.076, lng: 72.8777 },
  { name: "Pune", lat: 18.5204, lng: 73.8567 },
  { name: "Bengaluru", lat: 12.9716, lng: 77.5946 },
  { name: "Bangalore", lat: 12.9716, lng: 77.5946 },
  { name: "Hyderabad", lat: 17.385, lng: 78.4867 },
  { name: "Chennai", lat: 13.0827, lng: 80.2707 },
  { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
  { name: "Ahmedabad", lat: 23.0225, lng: 72.5714 },
  { name: "Jaipur", lat: 26.9124, lng: 75.7873 },
  { name: "Lucknow", lat: 26.8467, lng: 80.9462 },
  { name: "Chandigarh", lat: 30.7333, lng: 76.7794 },
  { name: "Meerut", lat: 28.9845, lng: 77.7064 },
];

export function lookupKnownArea(query: string): { name: string; lat: number; lng: number } | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  // Longest name first so "Greater Noida" wins over "Noida".
  const sorted = [...KNOWN_AREAS].sort((a, b) => b.name.length - a.name.length);
  return sorted.find((a) => q.includes(a.name.toLowerCase())) ?? null;
}
