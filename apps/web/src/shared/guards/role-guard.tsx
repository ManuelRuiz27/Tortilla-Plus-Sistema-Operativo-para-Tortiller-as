import type { ReactNode } from "react";
import { BlockedState } from "../components/blocked-state";
import { useAuthStore } from "../stores/auth.store";
import type { UserRole } from "../types/session.types";

type RoleGuardProps = {
  allowedRoles: UserRole[];
  children: ReactNode;
};

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const user = useAuthStore((state) => state.user);
  const allowed = Boolean(user?.roles.some((role) => allowedRoles.includes(role)));

  if (!allowed) {
    return (
      <BlockedState
        title="Modulo sin permiso"
        message="No tienes permiso para entrar a esta seccion."
      />
    );
  }

  return children;
}
