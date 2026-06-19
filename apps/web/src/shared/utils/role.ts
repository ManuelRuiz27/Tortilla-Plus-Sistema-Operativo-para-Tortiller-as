import type { CurrentUser } from "../types/session.types";

const managerRoles = new Set(["manager", "organization_owner"]);

export function getPrimaryDestination(user: CurrentUser): "/app/pos" | "/app" | "/app/supervisor" | "/platform" {
  if (user.roles.includes("platform_owner")) return "/platform";
  if (user.roles.includes("supervisor")) return "/app/supervisor";
  const hasManagerRole = user.roles.some((role) => managerRoles.has(role));
  return hasManagerRole ? "/app" : "/app/pos";
}

export function hasPermission(user: CurrentUser | null, permission: string): boolean {
  return Boolean(user?.permissions.includes(permission));
}
