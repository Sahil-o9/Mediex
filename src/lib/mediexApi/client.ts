/**
 * Thin fetch client for the separate Express + Mongoose backend (server/).
 * Uses plain fetch (no extra dependency); swap for axios if you prefer —
 * the call shape below stays the same either way.
 */

const API_BASE_URL = import.meta.env["VITE_API_URL"] || "http://localhost:5000/api";

const TOKEN_KEY = "mediex_api_token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // localStorage unavailable (SSR) — ignore
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "message" in body) {
    const msg = (body as { message?: unknown }).message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  }
  return fallback;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    throw new ApiError(extractErrorMessage(body, res.statusText || "Request failed"), res.status);
  }

  return body as T;
}

function withBody(method: string, data: unknown): RequestInit {
  return data !== undefined ? { method, body: JSON.stringify(data) } : { method };
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown) => request<T>(path, withBody("POST", data)),
  put: <T>(path: string, data?: unknown) => request<T>(path, withBody("PUT", data)),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
