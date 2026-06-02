import { DomainError } from "../lib/domain-error.js";
import { prisma } from "../lib/prisma.js";

export async function assertOrganizationOperational(organizationId: string, deniedMessage: string) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { status: true },
  });

  if (!organization || organization.status === "suspended_limited" || organization.status === "cancelled") {
    throw new DomainError(403, "ORGANIZATION_NOT_OPERATIONAL", deniedMessage);
  }
}

export async function assertLicensedPosDevice(input: {
  organizationId: string;
  branchId: string;
  deviceId: string;
  deniedMessage: string;
}) {
  const device = await prisma.posDevice.findFirst({
    where: {
      id: input.deviceId,
      organizationId: input.organizationId,
      branchId: input.branchId,
    },
    select: { status: true, licensed: true },
  });

  if (!device || device.status !== "active" || !device.licensed) {
    throw new DomainError(403, "POS_DEVICE_NOT_LICENSED", input.deniedMessage);
  }
}
