import type { ReactNode } from "react";
import { BlockedState } from "../components/blocked-state";
import { useAuthStore } from "../stores/auth.store";

type PlatformGuardProps = {
  children: ReactNode;
};

export function PlatformGuard({ children }: PlatformGuardProps) {
  const user = useAuthStore((state) => state.user);
  const allowed = Boolean(
    user?.roles.includes("platform_owner") &&
      user.organizationId === null &&
      user.branches.length === 0
  );

  if (!allowed) {
    return (
      <BlockedState
        title="Acceso exclusivo de plataforma"
        message="Este modulo solo esta disponible para usuarios de plataforma sin organizacion ni sucursal asignada."
      />
    );
  }

  return children;
}
