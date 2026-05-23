import type { CurrentUser } from "../types/session.types";

const managerRoles = new Set(["manager", "supervisor", "organization_owner"]);

export function getPrimaryDestination(user: CurrentUser): "/app/pos" | "/app/manager" {
  const hasManagerRole = user.roles.some((role) => managerRoles.has(role));
  return hasManagerRole ? "/app/manager" : "/app/pos";
}

export function hasPermission(user: CurrentUser | null, permission: string): boolean {
  return Boolean(user?.permissions.includes(permission));
}
