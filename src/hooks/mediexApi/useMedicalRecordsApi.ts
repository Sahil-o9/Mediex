import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/mediexApi/client";
import type { MedicalRecord } from "@/lib/mediexApi/types";

const KEY = "mediex-records";

/** Lists medical records — patients get their own; pass patientId when logged in as a doctor. */
export function useMedicalRecords(patientId?: string) {
  return useQuery({
    queryKey: [KEY, patientId ?? "self"],
    queryFn: () =>
      api
        .get<{ success: true; records: MedicalRecord[] }>(
          patientId ? `/records?patient=${patientId}` : "/records",
        )
        .then((r) => r.records),
  });
}

export function useMedicalRecord(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, "one", id],
    queryFn: () => api.get<{ success: true; record: MedicalRecord }>(`/records/${id}`).then((r) => r.record),
    enabled: Boolean(id),
  });
}

export function useCreateMedicalRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<MedicalRecord> & { patient?: string }) =>
      api.post<{ success: true; record: MedicalRecord }>("/records", payload).then((r) => r.record),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateMedicalRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<MedicalRecord> & { id: string }) =>
      api.put<{ success: true; record: MedicalRecord }>(`/records/${id}`, payload).then((r) => r.record),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteMedicalRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ success: true }>(`/records/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  });
}
