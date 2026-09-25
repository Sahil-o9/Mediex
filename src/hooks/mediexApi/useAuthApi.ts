import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, setToken, getToken } from "@/lib/mediexApi/client";
import type { AuthResponse, LoginPayload, RegisterPayload, ApiUser } from "@/lib/mediexApi/types";

/** Registers a new patient or doctor account against the Express backend. */
export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RegisterPayload) => api.post<AuthResponse>("/auth/register", payload),
    onSuccess: (data) => {
      setToken(data.token);
      queryClient.setQueryData(["mediex-me"], data.user);
    },
  });
}

/** Logs in an existing account and stores the JWT for subsequent requests. */
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LoginPayload) => api.post<AuthResponse>("/auth/login", payload),
    onSuccess: (data) => {
      setToken(data.token);
      queryClient.setQueryData(["mediex-me"], data.user);
    },
  });
}

/** Fetches the current logged-in user; disabled automatically when there's no token. */
export function useMe() {
  return useQuery({
    queryKey: ["mediex-me"],
    queryFn: () => api.get<{ success: true; user: ApiUser }>("/auth/me").then((r) => r.user),
    enabled: Boolean(getToken()),
    retry: false,
  });
}

/** Clears the stored token and any cached user/records. */
export function useLogout() {
  const queryClient = useQueryClient();
  return () => {
    setToken(null);
    queryClient.clear();
  };
}