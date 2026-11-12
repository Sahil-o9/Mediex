/** Human-friendly display of a patient UUID, e.g. MK-3F9A1C. Display only; the full id is the key. */
export function shortPatientId(id: string): string {
  return `MK-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}
