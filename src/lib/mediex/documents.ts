/**
 * Shared (browser + server) document rules. The server re-validates
 * everything — client checks are for fast, friendly feedback only.
 */

export const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB
export const MAX_FILES = 5;
export const ACCEPTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"] as const;
export const ACCEPTED_MIME = ["application/pdf", "image/jpeg", "image/png"] as const;

export type FileErrorCode = "unsupported" | "too_large" | "empty";

export function validateFile(file: { name: string; size: number; type: string }):
  | { ok: true }
  | { ok: false; code: FileErrorCode } {
  const name = file.name.toLowerCase();
  const extOk = ACCEPTED_EXTENSIONS.some((e) => name.endsWith(e));
  const mimeOk = file.type === "" || (ACCEPTED_MIME as readonly string[]).includes(file.type);
  if (!extOk || !mimeOk) return { ok: false, code: "unsupported" };
  if (file.size === 0) return { ok: false, code: "empty" };
  if (file.size > MAX_FILE_BYTES) return { ok: false, code: "too_large" };
  return { ok: true };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileKindLabel(file: { name: string; type: string }): "PDF" | "JPG" | "PNG" | "FILE" {
  const n = file.name.toLowerCase();
  if (file.type === "application/pdf" || n.endsWith(".pdf")) return "PDF";
  if (file.type === "image/png" || n.endsWith(".png")) return "PNG";
  if (file.type === "image/jpeg" || n.endsWith(".jpg") || n.endsWith(".jpeg")) return "JPG";
  return "FILE";
}
