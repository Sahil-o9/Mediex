import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/mediexApi/client";
import type { Prescription } from "@/lib/mediexApi/types";

const KEY = "mediex-prescriptions";

/** Lists prescriptions — patients get their own; pass patientId when logged in as a doctor. */
export function usePrescriptions(patientId?: string) {
  return useQuery({
    queryKey: [KEY, patientId ?? "self"],
    queryFn: () =>
      api
        .get<{ success: true; prescriptions: Prescription[] }>(
          patientId ? `/prescriptions?patient=${patientId}` : "/prescriptions",
        )
        .then((r) => r.prescriptions),
  });
}

export function usePrescription(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, "one", id],
    queryFn: () =>
      api.get<{ success: true; prescription: Prescription }>(`/prescriptions/${id}`).then((r) => r.prescription),
    enabled: Boolean(id),
  });
}

/** Doctor-only: issue a new prescription. */
export function useCreatePrescription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Prescription> & { patient: string }) =>
      api
        .post<{ success: true; prescription: Prescription }>("/prescriptions", payload)
        .then((r) => r.prescription),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  });
}

/** Doctor-only: update a prescription they issued. */
export function useUpdatePrescription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<Prescription> & { id: string }) =>
      api
        .put<{ success: true; prescription: Prescription }>(`/prescriptions/${id}`, payload)
        .then((r) => r.prescription),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  });
}

/** Doctor-only: delete a prescription they issued. */
export function useDeletePrescription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ success: true }>(`/prescriptions/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  });
}
