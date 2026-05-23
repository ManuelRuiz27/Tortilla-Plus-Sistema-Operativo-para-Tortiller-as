import type { ReactNode } from "react";
import { BlockedState } from "../components/blocked-state";
import { useAuthStore } from "../stores/auth.store";

type PermissionGuardProps = {
  permission: string;
  children: ReactNode;
};

export function PermissionGuard({ permission, children }: PermissionGuardProps) {
  const user = useAuthStore((state) => state.user);
  const allowed = Boolean(user?.permissions.includes(permission));

  if (!allowed) {
    return (
      <BlockedState
        title="Accion sin permiso"
        message="No tienes permiso para realizar esta accion."
      />
    );
  }

  return children;
}
