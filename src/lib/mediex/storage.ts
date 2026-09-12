import {
  EMPTY_CASE_STATE,
  type Appointment,
  type CaseState,
  type ChatMessage,
  type ReportAnalysis,
} from "@/types";

const KEYS = {
  appointments: "mediex_appointments",
  chat: "mediex_chat_messages",
  reports: "mediex_reports",
  caseState: "mediex_case_state",
} as const;

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or privacy mode */
  }
}

export function getAppointments(patientId?: string): Appointment[] {
  const all = read<Appointment>(KEYS.appointments);
  const list = patientId ? all.filter((a) => a.patientId === patientId) : all;
  return list.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
}

export function saveAppointment(appointment: Appointment) {
  write(KEYS.appointments, [...read<Appointment>(KEYS.appointments), appointment]);
}

export function cancelAppointment(id: string) {
  write(
    KEYS.appointments,
    read<Appointment>(KEYS.appointments).filter((a) => a.id !== id),
  );
}

export function getChatMessages(patientId: string): ChatMessage[] {
  return read<ChatMessage & { patientId: string }>(`${KEYS.chat}_${patientId}`);
}

export function saveChatMessages(patientId: string, messages: ChatMessage[]) {
  write(`${KEYS.chat}_${patientId}`, messages);
}

export function getReports(patientId: string): ReportAnalysis[] {
  return read<ReportAnalysis>(`${KEYS.reports}_${patientId}`);
}

export function saveReport(patientId: string, report: ReportAnalysis) {
  write(`${KEYS.reports}_${patientId}`, [report, ...getReports(patientId)].slice(0, 10));
}

/** Running case-intake state for the guided assistant, kept per patient. */
export function getCaseState(patientId: string): CaseState {
  if (typeof window === "undefined") return { ...EMPTY_CASE_STATE };
  try {
    const raw = localStorage.getItem(`${KEYS.caseState}_${patientId}`);
    return raw
      ? { ...EMPTY_CASE_STATE, ...(JSON.parse(raw) as Partial<CaseState>) }
      : { ...EMPTY_CASE_STATE };
  } catch {
    return { ...EMPTY_CASE_STATE };
  }
}

export function saveCaseState(patientId: string, state: CaseState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${KEYS.caseState}_${patientId}`, JSON.stringify(state));
  } catch {
    /* quota or privacy mode */
  }
}

export function clearCaseState(patientId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`${KEYS.caseState}_${patientId}`);
  } catch {
    /* ignore */
  }
}

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.floor(
    Math.random() * 900 + 100,
  )}`;
}
