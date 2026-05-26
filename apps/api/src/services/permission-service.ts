import { prisma } from "../lib/prisma.js";
import { DomainError } from "../lib/domain-error.js";
import type { AuthenticatedUser } from "./auth-service.js";

export async function getPermissionCodes(userId: string): Promise<string[]> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
  });
  const roleIds = userRoles.map((userRole) => userRole.roleId);

  if (roleIds.length === 0) {
    return [];
  }

  const rolePermissions = await prisma.rolePermission.findMany({
    where: { roleId: { in: roleIds } },
    include: { permission: true },
  });

  return [...new Set(rolePermissions.map((rolePermission) => rolePermission.permission.code))];
}

export async function getRoleCodes(userId: string): Promise<string[]> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  });

  return userRoles.map((userRole) => userRole.role.code);
}

export async function getBranchAssignments(userId: string) {
  const assignments = await prisma.userBranchAssignment.findMany({
    where: { userId },
    include: { branch: true },
  });

  return assignments.map((assignment) => ({
    id: assignment.branch.id,
    name: assignment.branch.name,
    isDefault: assignment.isDefault,
  }));
}

export async function assertPermission(userId: string, permissionCode: string) {
  const permissions = await getPermissionCodes(userId);

  if (!permissions.includes(permissionCode)) {
    throw new DomainError(403, "PERMISSION_REQUIRED", "No tienes permiso para realizar esta accion.", {
      permission: permissionCode,
    });
  }
}

export async function assertAnyPermission(userId: string, permissionCodes: string[]) {
  const permissions = await getPermissionCodes(userId);

  if (!permissionCodes.some((permissionCode) => permissions.includes(permissionCode))) {
    throw new DomainError(403, "PERMISSION_REQUIRED", "No tienes permiso para realizar esta accion.", {
      permissions: permissionCodes,
    });
  }
}

export async function assertBranchAccess(currentUser: AuthenticatedUser, branchId: string) {
  const branch = await prisma.branch.findFirst({
    where: {
      id: branchId,
      organizationId: currentUser.organizationId,
      status: "active",
    },
  });

  if (!branch) {
    throw new DomainError(403, "BRANCH_ACCESS_DENIED", "Sucursal invalida para la organizacion.");
  }

  const assignment = await prisma.userBranchAssignment.findFirst({
    where: {
      userId: currentUser.id,
      branchId,
    },
  });

  if (!assignment) {
    throw new DomainError(403, "BRANCH_ACCESS_DENIED", "Usuario sin acceso a la sucursal.");
  }

  return branch;
}
