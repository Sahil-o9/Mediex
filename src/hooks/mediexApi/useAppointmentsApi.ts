import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/mediexApi/client";
import type { Appointment } from "@/lib/mediexApi/types";

const KEY = "mediex-appointments";

interface AppointmentFilters {
  patientId?: string;
  status?: Appointment["status"];
  mine?: boolean; // doctor's own appointments
}

export function useAppointments(filters: AppointmentFilters = {}) {
  const params = new URLSearchParams();
  if (filters.patientId) params.set("patient", filters.patientId);
  if (filters.status) params.set("status", filters.status);
  if (filters.mine) params.set("mine", "true");
  const qs = params.toString();

  return useQuery({
    queryKey: [KEY, filters],
    queryFn: () =>
      api
        .get<{ success: true; appointments: Appointment[] }>(`/appointments${qs ? `?${qs}` : ""}`)
        .then((r) => r.appointments),
  });
}

export function useAppointment(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, "one", id],
    queryFn: () =>
      api.get<{ success: true; appointment: Appointment }>(`/appointments/${id}`).then((r) => r.appointment),
    enabled: Boolean(id),
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Appointment> & { patient?: string }) =>
      api.post<{ success: true; appointment: Appointment }>("/appointments", payload).then((r) => r.appointment),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<Appointment> & { id: string }) =>
      api.put<{ success: true; appointment: Appointment }>(`/appointments/${id}`, payload).then((r) => r.appointment),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  });
}

/** Convenience wrapper for cancelling: PUT status="cancelled". */
export function useCancelAppointment() {
  const update = useUpdateAppointment();
  return (id: string) => update.mutateAsync({ id, status: "cancelled" });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ success: true }>(`/appointments/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  });
}
