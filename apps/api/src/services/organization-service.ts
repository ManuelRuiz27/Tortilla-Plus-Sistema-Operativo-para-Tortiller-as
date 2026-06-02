import { Prisma } from "@prisma/client";

import { DomainError } from "../lib/domain-error.js";
import { hashSecret } from "../lib/password.js";
import { prisma } from "../lib/prisma.js";
import type { AuthenticatedUser } from "./auth-service.js";
import { assertPermission } from "./permission-service.js";

const manageableRoles = ["manager", "supervisor", "cashier"] as const;
const userStatuses = ["active", "inactive"] as const;
const branchStatuses = ["active", "inactive"] as const;
const deviceStatuses = ["pending_activation", "active", "inactive", "blocked"] as const;
const defaultPassword = "Demo1234!";
const defaultPin = "1234";

export async function getOrganizationSummary(currentUser: AuthenticatedUser) {
  await assertPermission(currentUser.id, "organization.view");
  const organizationId = requireOrganizationId(currentUser);
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      subscriptionOrganization: { include: { plan: true }, orderBy: { createdAt: "desc" }, take: 1 },
      branchOrganization: true,
      userOrganization: {
        include: {
          userRoleUser: { include: { role: true } },
          userBranchAssignmentUser: { include: { branch: true } },
        },
      },
      posDeviceOrganization: { include: { branch: true } },
    },
  });

  if (!organization) throw new DomainError(404, "ORGANIZATION_NOT_FOUND", "Organizacion no encontrada.");

  return {
    data: {
      id: organization.id,
      name: organization.name,
      legalName: organization.legalName,
      taxId: organization.taxId,
      contactEmail: organization.contactEmail,
      contactPhone: organization.contactPhone,
      status: organization.status,
      subscription: serializeSubscription(organization.subscriptionOrganization[0] ?? null),
      branches: organization.branchOrganization.map(serializeBranch),
      users: organization.userOrganization.map(serializeUser),
      posDevices: organization.posDeviceOrganization.map(serializePosDevice),
    },
  };
}

export async function updateOrganization(currentUser: AuthenticatedUser, input: unknown) {
  await assertPermission(currentUser.id, "organization.update");
  const organizationId = requireOrganizationId(currentUser);
  const body = asRecord(input);

  const organization = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      name: optionalString(body.name) ?? undefined,
      legalName: optionalString(body.legalName) ?? undefined,
      taxId: optionalString(body.taxId) ?? undefined,
      contactEmail: optionalString(body.contactEmail) ?? undefined,
      contactPhone: optionalString(body.contactPhone) ?? undefined,
      updatedAt: new Date(),
    },
  });

  await audit(currentUser, "organization_updated", "organization", organization.id, serializeOrganization(organization));
  return { data: serializeOrganization(organization) };
}

export async function listOrganizationUsers(currentUser: AuthenticatedUser) {
  await assertPermission(currentUser.id, "users.view");
  const organizationId = requireOrganizationId(currentUser);
  const users = await prisma.user.findMany({
    where: { organizationId },
    include: {
      userRoleUser: { include: { role: true } },
      userBranchAssignmentUser: { include: { branch: true } },
    },
    orderBy: { name: "asc" },
  });
  return { data: users.map(serializeUser) };
}

export async function createOrganizationUser(currentUser: AuthenticatedUser, input: unknown) {
  await assertPermission(currentUser.id, "users.manage");
  const organizationId = requireOrganizationId(currentUser);
  const body = asRecord(input);
  const roleCode = asManageableRole(body.role);
  const role = await prisma.role.findUnique({ where: { code: roleCode } });
  if (!role) throw new DomainError(400, "INVALID_ROLE", "Rol invalido.");
  const branchId = optionalString(body.branchId);
  if (branchId) await assertOrganizationBranch(organizationId, branchId);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        organizationId,
        name: asString(body.name, "name"),
        email: asString(body.email, "email").toLowerCase(),
        phone: optionalString(body.phone),
        passwordHash: await hashSecret(optionalString(body.password) ?? defaultPassword),
        pinHash: await hashSecret(optionalString(body.pin) ?? defaultPin),
        status: "active",
      },
    });
    await tx.userRole.create({ data: { userId: created.id, roleId: role.id, organizationId } });
    if (branchId) {
      await tx.userBranchAssignment.create({ data: { userId: created.id, branchId, isDefault: true } });
    }
    return created;
  });

  await audit(currentUser, "organization_user_created", "user", user.id, { id: user.id, role: roleCode });
  return { data: await getUserPayload(user.id) };
}

export async function updateOrganizationUser(currentUser: AuthenticatedUser, userId: string, input: unknown) {
  await assertPermission(currentUser.id, "users.manage");
  const organizationId = requireOrganizationId(currentUser);
  const body = asRecord(input);
  const existing = await getOrganizationUserOrThrow(organizationId, userId);
  const roleCode = optionalString(body.role);
  const branchId = optionalString(body.branchId);
  if (roleCode) asManageableRole(roleCode);
  if (branchId) await assertOrganizationBranch(organizationId, branchId);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: existing.id },
      data: {
        name: optionalString(body.name) ?? existing.name,
        phone: optionalString(body.phone) ?? existing.phone,
        updatedAt: new Date(),
      },
    });
    if (roleCode) {
      const role = await tx.role.findUniqueOrThrow({ where: { code: roleCode } });
      await tx.userRole.deleteMany({ where: { userId: existing.id, organizationId } });
      await tx.userRole.create({ data: { userId: existing.id, roleId: role.id, organizationId } });
    }
    if (branchId) {
      await tx.userBranchAssignment.deleteMany({ where: { userId: existing.id } });
      await tx.userBranchAssignment.create({ data: { userId: existing.id, branchId, isDefault: true } });
    }
  });

  await audit(currentUser, "organization_user_updated", "user", existing.id, { id: existing.id });
  return { data: await getUserPayload(existing.id) };
}

export async function updateOrganizationUserStatus(currentUser: AuthenticatedUser, userId: string, input: unknown) {
  await assertPermission(currentUser.id, "users.manage");
  const organizationId = requireOrganizationId(currentUser);
  await getOrganizationUserOrThrow(organizationId, userId);
  const status = enumValue(asRecord(input).status, userStatuses, "status");
  const user = await prisma.user.update({ where: { id: userId }, data: { status, updatedAt: new Date() } });
  await audit(currentUser, "organization_user_status_updated", "user", user.id, { id: user.id, status });
  return { data: await getUserPayload(user.id) };
}

export async function resetOrganizationUserPassword(currentUser: AuthenticatedUser, userId: string, input: unknown) {
  await assertPermission(currentUser.id, "users.manage");
  const organizationId = requireOrganizationId(currentUser);
  await getOrganizationUserOrThrow(organizationId, userId);
  const password = optionalString(asLooseRecord(input).password) ?? defaultPassword;
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashSecret(password), updatedAt: new Date() } });
  await audit(currentUser, "organization_user_password_reset", "user", userId, { id: userId });
  return { data: { id: userId, temporaryPassword: password } };
}

export async function resetOrganizationUserPin(currentUser: AuthenticatedUser, userId: string, input: unknown) {
  await assertPermission(currentUser.id, "users.manage");
  const organizationId = requireOrganizationId(currentUser);
  await getOrganizationUserOrThrow(organizationId, userId);
  const pin = optionalString(asLooseRecord(input).pin) ?? defaultPin;
  await prisma.user.update({ where: { id: userId }, data: { pinHash: await hashSecret(pin), updatedAt: new Date() } });
  await audit(currentUser, "organization_user_pin_reset", "user", userId, { id: userId });
  return { data: { id: userId, temporaryPin: pin } };
}

export async function listOrganizationBranches(currentUser: AuthenticatedUser) {
  await assertPermission(currentUser.id, "branches.view");
  const organizationId = requireOrganizationId(currentUser);
  const branches = await prisma.branch.findMany({ where: { organizationId }, orderBy: { name: "asc" } });
  return { data: branches.map(serializeBranch) };
}

export async function createOrganizationBranch(currentUser: AuthenticatedUser, input: unknown) {
  await assertPermission(currentUser.id, "branches.manage");
  const organizationId = requireOrganizationId(currentUser);
  const body = asRecord(input);
  const businessUnit = await ensureBusinessUnit(organizationId);
  const branch = await prisma.branch.create({
    data: {
      organizationId,
      businessUnitId: businessUnit.id,
      name: asString(body.name, "name"),
      address: optionalString(body.address),
      phone: optionalString(body.phone),
      timezone: optionalString(body.timezone) ?? "America/Mexico_City",
      status: "active",
    },
  });
  await audit(currentUser, "organization_branch_created", "branch", branch.id, serializeBranch(branch));
  return { data: serializeBranch(branch) };
}

export async function updateOrganizationBranch(currentUser: AuthenticatedUser, branchId: string, input: unknown) {
  await assertPermission(currentUser.id, "branches.manage");
  const organizationId = requireOrganizationId(currentUser);
  await assertOrganizationBranch(organizationId, branchId);
  const body = asRecord(input);
  const branch = await prisma.branch.update({
    where: { id: branchId },
    data: {
      name: optionalString(body.name) ?? undefined,
      address: optionalString(body.address) ?? undefined,
      phone: optionalString(body.phone) ?? undefined,
      timezone: optionalString(body.timezone) ?? undefined,
      updatedAt: new Date(),
    },
  });
  await audit(currentUser, "organization_branch_updated", "branch", branch.id, serializeBranch(branch));
  return { data: serializeBranch(branch) };
}

export async function updateOrganizationBranchStatus(currentUser: AuthenticatedUser, branchId: string, input: unknown) {
  await assertPermission(currentUser.id, "branches.manage");
  const organizationId = requireOrganizationId(currentUser);
  await assertOrganizationBranch(organizationId, branchId);
  const status = enumValue(asRecord(input).status, branchStatuses, "status");
  const branch = await prisma.branch.update({ where: { id: branchId }, data: { status, updatedAt: new Date() } });
  await audit(currentUser, "organization_branch_status_updated", "branch", branch.id, { id: branch.id, status });
  return { data: serializeBranch(branch) };
}

export async function listOrganizationPosDevices(currentUser: AuthenticatedUser) {
  await assertPermission(currentUser.id, "branches.view");
  const organizationId = requireOrganizationId(currentUser);
  const devices = await prisma.posDevice.findMany({
    where: { organizationId },
    include: { branch: true },
    orderBy: { deviceName: "asc" },
  });
  return { data: devices.map(serializePosDevice) };
}

export async function createOrganizationPosDevice(currentUser: AuthenticatedUser, input: unknown) {
  await assertPermission(currentUser.id, "branches.manage");
  const organizationId = requireOrganizationId(currentUser);
  const body = asRecord(input);
  const branchId = asString(body.branchId, "branchId");
  await assertOrganizationBranch(organizationId, branchId);
  const deviceName = asString(body.name ?? body.deviceName, "name");
  const device = await prisma.posDevice.create({
    data: {
      organizationId,
      branchId,
      deviceName,
      deviceCode: optionalString(body.deviceCode) ?? `POS-${Date.now()}`,
      deviceType: asDeviceType(optionalString(body.deviceType) ?? "desktop"),
      status: "pending_activation",
      licensed: false,
    },
    include: { branch: true },
  });
  await audit(currentUser, "organization_pos_device_created", "pos_device", device.id, serializePosDevice(device));
  return { data: serializePosDevice(device) };
}

export async function updateOrganizationPosDevice(currentUser: AuthenticatedUser, posDeviceId: string, input: unknown) {
  await assertPermission(currentUser.id, "branches.manage");
  const organizationId = requireOrganizationId(currentUser);
  const body = asRecord(input);
  const existing = await prisma.posDevice.findFirst({ where: { id: posDeviceId, organizationId } });
  if (!existing) throw new DomainError(404, "POS_DEVICE_NOT_FOUND", "POS no encontrado.");
  const branchId = optionalString(body.branchId);
  if (branchId) await assertOrganizationBranch(organizationId, branchId);
  const status = body.status ? enumValue(body.status, deviceStatuses, "status") : undefined;
  const device = await prisma.posDevice.update({
    where: { id: posDeviceId },
    data: {
      branchId: branchId ?? undefined,
      deviceName: optionalString(body.name ?? body.deviceName) ?? undefined,
      status,
      updatedAt: new Date(),
    },
    include: { branch: true },
  });
  await audit(currentUser, "organization_pos_device_updated", "pos_device", device.id, serializePosDevice(device));
  return { data: serializePosDevice(device) };
}

function requireOrganizationId(currentUser: AuthenticatedUser) {
  if (!currentUser.organizationId) {
    throw new DomainError(403, "ORGANIZATION_ACCESS_REQUIRED", "Usuario sin organizacion operativa.");
  }
  return currentUser.organizationId;
}

async function getOrganizationUserOrThrow(organizationId: string, userId: string) {
  const user = await prisma.user.findFirst({ where: { id: userId, organizationId } });
  if (!user) throw new DomainError(404, "USER_NOT_FOUND", "Usuario no encontrado.");
  return user;
}

async function getUserPayload(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      userRoleUser: { include: { role: true } },
      userBranchAssignmentUser: { include: { branch: true } },
    },
  });
  return serializeUser(user);
}

async function assertOrganizationBranch(organizationId: string, branchId: string) {
  const branch = await prisma.branch.findFirst({ where: { id: branchId, organizationId } });
  if (!branch) throw new DomainError(404, "BRANCH_NOT_FOUND", "Sucursal no encontrada.");
  return branch;
}

async function ensureBusinessUnit(organizationId: string) {
  const existing = await prisma.businessUnit.findFirst({ where: { organizationId }, orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  const organization = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
  return prisma.businessUnit.create({
    data: {
      organizationId,
      name: organization.name,
      tradeName: organization.name,
      businessType: "tortilleria",
    },
  });
}

async function audit(
  currentUser: AuthenticatedUser,
  action: string,
  entityType: string,
  entityId: string,
  afterSnapshot: unknown,
) {
  await prisma.auditLog.create({
    data: {
      organizationId: requireOrganizationId(currentUser),
      userId: currentUser.id,
      action,
      entityType,
      entityId,
      afterSnapshot: serialize(afterSnapshot),
    },
  });
}

function serializeOrganization(organization: {
  id: string;
  name: string;
  legalName: string | null;
  taxId: string | null;
  contactEmail: string;
  contactPhone: string | null;
  status: string;
}) {
  return organization;
}

function serializeSubscription(subscription: { id: string; status: string; plan: { code: string; name: string } } | null) {
  if (!subscription) return null;
  return {
    id: subscription.id,
    status: subscription.status,
    planCode: subscription.plan.code,
    planName: subscription.plan.name,
  };
}

function serializeUser(user: Prisma.UserGetPayload<{
  include: {
    userRoleUser: { include: { role: true } };
    userBranchAssignmentUser: { include: { branch: true } };
  };
}>) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    status: user.status,
    roles: user.userRoleUser.map((userRole) => userRole.role.code),
    branches: user.userBranchAssignmentUser.map((assignment) => ({
      branchId: assignment.branchId,
      branchName: assignment.branch.name,
      isDefault: assignment.isDefault,
    })),
  };
}

function serializeBranch(branch: {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  timezone: string;
  status: string;
}) {
  return {
    id: branch.id,
    name: branch.name,
    address: branch.address,
    phone: branch.phone,
    timezone: branch.timezone,
    status: branch.status,
  };
}

function serializePosDevice(device: {
  id: string;
  branchId: string;
  deviceName: string;
  deviceCode: string;
  deviceType: string;
  status: string;
  licensed: boolean;
  lastSeenAt: Date | null;
  branch?: { name: string } | null;
}) {
  return {
    id: device.id,
    branchId: device.branchId,
    branchName: device.branch?.name ?? null,
    name: device.deviceName,
    code: device.deviceCode,
    type: device.deviceType,
    status: device.status,
    licensed: device.licensed,
    lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
  };
}

function asRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new DomainError(400, "INVALID_REQUEST", "Body invalido.");
  }
  return input as Record<string, unknown>;
}

function asLooseRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return input as Record<string, unknown>;
}

function asString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new DomainError(400, "INVALID_REQUEST", `Campo requerido: ${field}.`);
  }
  return value.trim();
}

function optionalString(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return null;
  return value.trim();
}

function asManageableRole(value: unknown): (typeof manageableRoles)[number] {
  if (typeof value !== "string" || !manageableRoles.includes(value as (typeof manageableRoles)[number])) {
    throw new DomainError(400, "INVALID_ROLE", "Solo se pueden asignar roles manager, supervisor o cashier.");
  }
  return value as (typeof manageableRoles)[number];
}

function enumValue<T extends readonly string[]>(value: unknown, allowed: T, field: string): T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new DomainError(400, "INVALID_REQUEST", `Valor invalido: ${field}.`);
  }
  return value;
}

function asDeviceType(value: string): "pwa" | "windows" | "tablet" | "desktop" {
  if (value !== "pwa" && value !== "windows" && value !== "tablet" && value !== "desktop") {
    throw new DomainError(400, "INVALID_REQUEST", "Tipo de POS invalido.");
  }
  return value;
}

function serialize(value: unknown) {
  return JSON.parse(JSON.stringify(value, (_key, current) => {
    if (typeof current?.toString === "function" && current.constructor?.name === "Decimal") return current.toString();
    if (current instanceof Date) return current.toISOString();
    return current;
  })) as Prisma.InputJsonValue;
}
