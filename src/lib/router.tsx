/**
 * Thin compatibility layer so pages ported from react-router-dom keep working
 * on TanStack Router without rewriting every call site.
 */
import {
  Link as TanStackLink,
  Navigate as TanStackNavigate,
  useNavigate as useTanStackNavigate,
} from "@tanstack/react-router";
import type { ComponentType, ReactNode } from "react";

type LinkProps = {
  to: string;
  className?: string;
  children?: ReactNode;
  onClick?: () => void;
};

export const Link = TanStackLink as unknown as ComponentType<LinkProps>;
export const Navigate = TanStackNavigate as unknown as ComponentType<{
  to: string;
  replace?: boolean;
}>;

export function useNavigate() {
  const navigate = useTanStackNavigate();
  return (to: string, options?: { replace?: boolean }) =>
    navigate({ to, replace: options?.replace } as never);
}
