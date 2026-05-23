import type { ComponentProps } from "react";
import { Button } from "./button";
import { useAuthStore } from "../stores/auth.store";

type PermissionButtonProps = ComponentProps<typeof Button> & {
  permission: string;
};

export function PermissionButton({ disabled, permission, title, ...props }: PermissionButtonProps) {
  const user = useAuthStore((state) => state.user);
  const allowed = Boolean(user?.permissions.includes(permission));

  return (
    <Button
      disabled={disabled || !allowed}
      title={allowed ? title : "No tienes permiso para esta accion"}
      {...props}
    />
  );
}
