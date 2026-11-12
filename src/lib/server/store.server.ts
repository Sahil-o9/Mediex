import type {
  CaseListItem,
  CaseReviewStatus,
  ClinicalNote,
  StorageMode,
  StoredCase,
} from "@/types/consult";
import { env } from "./env.server";
import { Binary } from "mongodb";
import { getMongoDb } from "./mongo.server";

/**
 * Persistence for submitted cases and (optionally) the patient's original files.
 *
 * `CaseRepository` is the seam between the app and any database. Two adapters:
 *   - memory   (default)  — process memory. For local development and demos ONLY:
 *                           data is lost on restart and is NOT shared between
 *                           serverless instances. The doctor dashboard shows a
 *                           warning banner in this mode.
 *   - mongodb             — MongoDB Atlas stores cases and original files in
 *                           separate collections. Select with DATA_ADAPTER=mongodb.
 *   - supabase            — Postgres (table `cases`) + a PRIVATE Storage bucket.
 */

export interface StoredFile {
  bytes: Uint8Array;
  mime: string;
  name: string;
}

export interface CaseRepository {
  mode: StorageMode;
  create(c: StoredCase, files: Map<string, StoredFile>): Promise<void>;
  list(): Promise<CaseListItem[]>;
  get(id: string): Promise<StoredCase | null>;
  setStatus(id: string, status: CaseReviewStatus): Promise<StoredCase | null>;
  addNote(id: string, note: ClinicalNote): Promise<StoredCase | null>;
  getFile(caseId: string, docId: string): Promise<StoredFile | null>;
}

export const ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

export function toListItem(c: StoredCase): CaseListItem {
  return {
    id: c.id,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    status: c.status,
    urgent: c.urgent,
    language: c.language,
    patientName: c.patient.name,
    patientId: c.patient.patientId,
    age: c.patient.age,
    sex: c.patient.sex,
    chiefComplaint: c.caseState.chiefComplaint,
    documentCount: c.documents.length,
    noteCount: c.notes.length,
  };
}

/* ------------------------------------------------------------------ *
 * Memory adapter
 * ------------------------------------------------------------------ */
const MAX_MEMORY_CASES = 300;

interface MemoryState {
  cases: Map<string, StoredCase>;
  files: Map<string, StoredFile>;
}
const g = globalThis as unknown as { __mediexMemoryStore?: MemoryState };

function memory(): CaseRepository {
  const state = (g.__mediexMemoryStore ??= { cases: new Map(), files: new Map() });
  const touch = (c: StoredCase) => {
    c.updatedAt = new Date().toISOString();
    return c;
  };
  return {
    mode: "memory",
    async create(c, files) {
      state.cases.set(c.id, c);
      for (const [docId, f] of files) state.files.set(`${c.id}/${docId}`, f);
      while (state.cases.size > MAX_MEMORY_CASES) {
        const oldest = state.cases.keys().next().value;
        if (oldest === undefined) break;
        state.cases.delete(oldest);
        for (const k of [...state.files.keys()])
          if (k.startsWith(`${oldest}/`)) state.files.delete(k);
      }
    },
    async list() {
      return [...state.cases.values()]
        .map(toListItem)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async get(id) {
      return state.cases.get(id) ?? null;
    },
    async setStatus(id, status) {
      const c = state.cases.get(id);
      if (!c) return null;
      c.status = status;
      return touch(c);
    },
    async addNote(id, note) {
      const c = state.cases.get(id);
      if (!c) return null;
      c.notes.push(note);
      return touch(c);
    },
    async getFile(caseId, docId) {
      return state.files.get(`${caseId}/${docId}`) ?? null;
    },
  };
}

/* ------------------------------------------------------------------ *
 * Supabase adapter (REST, service-role key — server side only)
 * NOTE: written against the documented PostgREST / Storage REST APIs but
 * not exercised against a live Supabase project in this repo's tests.
 * ------------------------------------------------------------------ */
function supabase(url: string, serviceKey: string, bucket: string): CaseRepository {
  const base = url.replace(/\/$/, "");
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  async function rest(path: string, init: RequestInit = {}): Promise<Response> {
    const res = await fetch(`${base}/rest/v1/${path}`, {
      ...init,
      headers: { ...headers, "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    if (!res.ok) throw new Error(`supabase ${res.status}`);
    return res;
  }

  async function load(id: string): Promise<StoredCase | null> {
    if (!ID_PATTERN.test(id)) return null;
    const res = await rest(`cases?id=eq.${id}&select=data&limit=1`);
    const rows = (await res.json()) as { data: StoredCase }[];
    return rows[0]?.data ?? null;
  }

  async function save(c: StoredCase): Promise<StoredCase> {
    c.updatedAt = new Date().toISOString();
    await rest(`cases?id=eq.${c.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        status: c.status,
        urgent: c.urgent,
        updated_at: c.updatedAt,
        data: c,
      }),
    });
    return c;
  }

  return {
    mode: "supabase",
    async create(c, files) {
      await rest("cases", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          id: c.id,
          status: c.status,
          urgent: c.urgent,
          created_at: c.createdAt,
          updated_at: c.updatedAt,
          data: c,
        }),
      });
      for (const [docId, f] of files) {
        const res = await fetch(`${base}/storage/v1/object/${bucket}/${c.id}/${docId}`, {
          method: "POST",
          headers: { ...headers, "Content-Type": f.mime, "x-upsert": "false" },
          body: f.bytes as BodyInit,
        });
        if (!res.ok) throw new Error(`supabase storage ${res.status}`);
      }
    },
    async list() {
      const res = await rest("cases?select=data&order=created_at.desc&limit=200");
      const rows = (await res.json()) as { data: StoredCase }[];
      return rows.map((r) => toListItem(r.data));
    },
    get: load,
    async setStatus(id, status) {
      const c = await load(id);
      if (!c) return null;
      c.status = status;
      return save(c);
    },
    async addNote(id, note) {
      const c = await load(id);
      if (!c) return null;
      c.notes.push(note);
      return save(c);
    },
    async getFile(caseId, docId) {
      const c = await load(caseId);
      const meta = c?.documents.find((d) => d.id === docId && d.hasOriginal);
      if (!meta || !ID_PATTERN.test(docId)) return null;
      const res = await fetch(`${base}/storage/v1/object/${bucket}/${caseId}/${docId}`, {
        headers,
      });
      if (!res.ok) return null;
      return {
        bytes: new Uint8Array(await res.arrayBuffer()),
        mime: meta.mime,
        name: meta.fileName,
      };
    },
  };
}

interface MongoFile {
  _id?: string;
  caseId: string;
  bytes: Binary;
  mime: string;
  name: string;
}

function mongoStore(): CaseRepository {
  async function load(id: string): Promise<StoredCase | null> {
    if (!ID_PATTERN.test(id)) return null;
    const db = await getMongoDb();
    const document = await db.collection<StoredCase & { _id: string }>("cases").findOne({
      _id: id,
    });
    if (!document) return null;
    const { _id, ...storedCase } = document;
    return storedCase;
  }

  async function save(c: StoredCase): Promise<StoredCase> {
    c.updatedAt = new Date().toISOString();
    const db = await getMongoDb();
    await db.collection<StoredCase & { _id: string }>("cases").replaceOne({ _id: c.id }, c);
    return c;
  }

  return {
    mode: "mongodb",
    async create(c, files) {
      const db = await getMongoDb();
      const cases = db.collection<StoredCase & { _id: string }>("cases");
      const storedFiles = db.collection<MongoFile>("case_files");
      await cases.insertOne({ ...c, _id: c.id });
      try {
        if (files.size) {
          await storedFiles.insertMany(
            [...files].map(([docId, file]) => ({
              _id: `${c.id}/${docId}`,
              caseId: c.id,
              bytes: new Binary(file.bytes),
              mime: file.mime,
              name: file.name,
            })),
          );
        }
      } catch (error) {
        try {
          await storedFiles.deleteMany({ caseId: c.id });
          await cases.deleteOne({ _id: c.id });
        } catch (cleanupError) {
          throw new AggregateError(
            [error, cleanupError],
            "Case storage failed and partial data cleanup also failed",
          );
        }
        throw error;
      }
    },
    async list() {
      const db = await getMongoDb();
      const cases = await db
        .collection<StoredCase & { _id: string }>("cases")
        .find({})
        .sort({ createdAt: -1 })
        .limit(200)
        .toArray();
      return cases.map(({ _id, ...c }) => toListItem(c));
    },
    get: load,
    async setStatus(id, status) {
      const c = await load(id);
      if (!c) return null;
      c.status = status;
      return save(c);
    },
    async addNote(id, note) {
      const c = await load(id);
      if (!c) return null;
      c.notes.push(note);
      return save(c);
    },
    async getFile(caseId, docId) {
      if (!ID_PATTERN.test(caseId) || !ID_PATTERN.test(docId)) return null;
      const c = await load(caseId);
      const meta = c?.documents.find((d) => d.id === docId && d.hasOriginal);
      if (!meta) return null;
      const db = await getMongoDb();
      const file = await db.collection<MongoFile>("case_files").findOne({
        _id: `${caseId}/${docId}`,
      });
      if (!file) return null;
      return {
        bytes: new Uint8Array(file.bytes.value()),
        mime: meta.mime,
        name: meta.fileName,
      };
    },
  };
}

export class StoreConfigError extends Error {}

export function getStore(): CaseRepository {
  const adapter = env("DATA_ADAPTER") ?? (env("MONGODB_URI") ? "mongodb" : "memory");
  if (adapter === "mongodb") {
    return mongoStore();
  }
  if (adapter === "supabase") {
    const url = env("SUPABASE_URL");
    const key = env("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key)
      throw new StoreConfigError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
    return supabase(url, key, env("SUPABASE_DOCS_BUCKET") ?? "case-documents");
  }
  if (adapter !== "memory") throw new StoreConfigError(`Unsupported DATA_ADAPTER: ${adapter}`);
  return memory();
}
