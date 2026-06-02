import { Prisma } from "@prisma/client";

import { DomainError } from "../lib/domain-error.js";
import { verifySecret } from "../lib/password.js";
import { prisma } from "../lib/prisma.js";
import type { AuthenticatedUser } from "./auth-service.js";
import { assertLicensedPosDevice, assertOrganizationOperational } from "./operational-access-service.js";
import { assertBranchAccess, assertPermission } from "./permission-service.js";
import { assertFeatureAvailable } from "./subscription-service.js";

const cashCountedStatuses = ["recorded", "authorized"] as const;

export async function openCashSession(currentUser: AuthenticatedUser, input: unknown) {
  const body = asRecord(input);
  const branchId = asString(body.branchId, "branchId");
  const deviceId = optionalString(body.deviceId);
  const openingAmountCounted = asMoney(body.openingAmountCounted, "openingAmountCounted");
  const openingNote = optionalString(body.openingNote);

  await assertCashAccess(currentUser, branchId, "cash.open");
  await assertOrganizationOperational(currentUser.organizationId, "La organizacion no puede abrir caja.");
  if (deviceId) {
    await assertLicensedPosDevice({
      organizationId: currentUser.organizationId,
      branchId,
      deviceId,
      deniedMessage: "El POS no tiene licencia activa para abrir caja.",
    });
  }

  const expected = await getSuggestedOpeningAmount(currentUser.organizationId, branchId);
  const discrepancy = subtractMoney(openingAmountCounted, expected);

  const existingOpen = await prisma.cashSession.findFirst({
    where: {
      organizationId: currentUser.organizationId,
      branchId,
      status: "open",
    },
  });

  if (existingOpen) {
    throw new DomainError(409, "CASH_SESSION_ALREADY_OPEN", "La sucursal ya tiene caja abierta.");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const session = await tx.cashSession.create({
        data: {
          organizationId: currentUser.organizationId,
          branchId,
          deviceId,
          openedByUserId: currentUser.id,
          openingAmountExpected: expected,
          openingAmountCounted,
          openingDiscrepancy: discrepancy,
          openingNote,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: currentUser.organizationId,
          branchId,
          userId: currentUser.id,
          action: "cash_session_opened",
          entityType: "cash_session",
          entityId: session.id,
          afterSnapshot: {
            openingAmountExpected: expected,
            openingAmountCounted,
            openingDiscrepancy: discrepancy,
          },
        },
      });

      if (discrepancy !== "0.00") {
        await tx.auditLog.create({
          data: {
            organizationId: currentUser.organizationId,
            branchId,
            userId: currentUser.id,
            action: "cash_opening_discrepancy",
            entityType: "cash_session",
            entityId: session.id,
            afterSnapshot: {
              openingAmountExpected: expected,
              openingAmountCounted,
              openingDiscrepancy: discrepancy,
            },
          },
        });
      }

      return { data: serializeCashSession(session) };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new DomainError(409, "CASH_SESSION_ALREADY_OPEN", "La sucursal ya tiene caja abierta.");
    }

    throw error;
  }
}

export async function getOpenCashSession(currentUser: AuthenticatedUser, branchId: string) {
  await assertCashAccess(currentUser, branchId, "cash.movements.view");

  const session = await prisma.cashSession.findFirst({
    where: {
      organizationId: currentUser.organizationId,
      branchId,
      status: "open",
    },
    orderBy: { openedAt: "desc" },
  });

  return { data: session ? serializeCashSession(session) : null };
}

export async function getCashSessionSummary(currentUser: AuthenticatedUser, cashSessionId: string) {
  const session = await getCashSessionOrThrow(currentUser.organizationId, cashSessionId);
  await assertCashAccess(currentUser, session.branchId, "cash.movements.view");

  return {
    data: await buildSummary(prisma, session.id),
  };
}

export async function closeCashSession(currentUser: AuthenticatedUser, cashSessionId: string, input: unknown) {
  const body = asRecord(input);
  const countedCashAmount = asMoney(body.countedCashAmount, "countedCashAmount");
  const comment = optionalString(body.comment);

  const session = await getCashSessionOrThrow(currentUser.organizationId, cashSessionId);
  await assertCashAccess(currentUser, session.branchId, "cash.close");

  if (session.status !== "open") {
    throw new DomainError(409, "CASH_SESSION_NOT_OPEN", "La caja no esta abierta.");
  }

  return prisma.$transaction(async (tx) => {
    const pendingMovements = await tx.cashMovement.count({
      where: {
        cashSessionId,
        status: "pending_authorization",
      },
    });

    if (pendingMovements > 0) {
      throw new DomainError(409, "PENDING_CASH_MOVEMENTS", "Hay retiros pendientes por autorizar.");
    }

    const pendingTerminalOrders = await tx.paymentTerminalOrder.count({
      where: {
        organizationId: currentUser.organizationId,
        branchId: session.branchId,
        status: { in: ["created", "sent_to_terminal", "pending"] },
        createdAt: {
          gte: session.openedAt,
        },
      },
    });

    if (pendingTerminalOrders > 0) {
      throw new DomainError(409, "PENDING_TERMINAL_ORDERS", "Hay cobros de terminal pendientes por resolver.");
    }

    const summary = await buildSummary(tx, cashSessionId);
    const differenceAmount = subtractMoney(countedCashAmount, summary.expectedCashAmount);
    const differenceType = getDifferenceType(differenceAmount);

    const closing = await tx.cashClosing.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId: session.branchId,
        cashSessionId,
        closedByUserId: currentUser.id,
        openingAmount: summary.openingAmount,
        cashSalesTotal: summary.sales.cash,
        cardSalesTotal: summary.sales.card,
        transferSalesTotal: summary.sales.transfer,
        creditSalesTotal: summary.sales.credit,
        cashInTotal: summary.cashInTotal,
        cashOutTotal: summary.cashOutTotal,
        expectedCashAmount: summary.expectedCashAmount,
        countedCashAmount,
        differenceAmount,
        differenceType,
        comment,
      },
    });

    const closedSession = await tx.cashSession.update({
      where: { id: cashSessionId },
      data: {
        status: "closed",
        closedByUserId: currentUser.id,
        closedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId: session.branchId,
        userId: currentUser.id,
        action: "cash_session_closed",
        entityType: "cash_session",
        entityId: cashSessionId,
        afterSnapshot: {
          closingId: closing.id,
          expectedCashAmount: summary.expectedCashAmount,
          countedCashAmount,
          differenceAmount,
          differenceType,
        },
      },
    });

    return {
      data: {
        session: serializeCashSession(closedSession),
        closing: serializeCashClosing(closing),
      },
    };
  });
}

export async function requestWithdrawal(currentUser: AuthenticatedUser, input: unknown) {
  const body = asRecord(input);
  const branchId = asString(body.branchId, "branchId");
  const cashSessionId = optionalString(body.cashSessionId);
  const amount = asMoney(body.amount, "amount");
  const reasonId = optionalString(body.reasonId);
  const description = optionalString(body.description);

  await assertCashAccess(currentUser, branchId, "cash.withdraw.request");
  await assertOrganizationOperational(currentUser.organizationId, "La organizacion no puede operar movimientos de caja.");
  const session = await resolveOpenSession(currentUser.organizationId, branchId, cashSessionId);
  await assertCashReason(currentUser.organizationId, reasonId, "out_");

  return prisma.$transaction(async (tx) => {
    const movement = await tx.cashMovement.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId,
        cashSessionId: session.id,
        movementType: "cash_out",
        amount,
        reasonId,
        description,
        status: "pending_authorization",
        requestedByUserId: currentUser.id,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId,
        userId: currentUser.id,
        action: "cash_withdrawal_requested",
        entityType: "cash_movement",
        entityId: movement.id,
        afterSnapshot: serializeCashMovement(movement),
      },
    });

    return { data: serializeCashMovement(movement) };
  });
}

export async function recordCashIncome(currentUser: AuthenticatedUser, input: unknown) {
  const body = asRecord(input);
  const branchId = asString(body.branchId, "branchId");
  const cashSessionId = optionalString(body.cashSessionId);
  const amount = asMoney(body.amount, "amount");
  const reasonId = optionalString(body.reasonId);
  const description = optionalString(body.description);

  await assertCashAccess(currentUser, branchId, "cash.withdraw.request");
  await assertOrganizationOperational(currentUser.organizationId, "La organizacion no puede operar movimientos de caja.");
  const session = await resolveOpenSession(currentUser.organizationId, branchId, cashSessionId);
  await assertCashReason(currentUser.organizationId, reasonId, "in_");

  return prisma.$transaction(async (tx) => {
    const movement = await tx.cashMovement.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId,
        cashSessionId: session.id,
        movementType: "cash_in",
        amount,
        reasonId,
        description,
        status: "recorded",
        requestedByUserId: currentUser.id,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId,
        userId: currentUser.id,
        action: "cash_income_recorded",
        entityType: "cash_movement",
        entityId: movement.id,
        afterSnapshot: serializeCashMovement(movement),
      },
    });

    return { data: serializeCashMovement(movement) };
  });
}

export async function authorizeCashMovement(
  currentUser: AuthenticatedUser,
  cashMovementId: string,
  input: unknown,
) {
  const body = asRecord(input);
  const pin = asString(body.pin, "pin");
  const movement = await getCashMovementOrThrow(currentUser.organizationId, cashMovementId);

  await assertCashAccess(currentUser, movement.branchId, "cash.withdraw.authorize");
  await assertValidPin(currentUser.id, pin);

  if (movement.status !== "pending_authorization") {
    throw new DomainError(409, "INVALID_CASH_MOVEMENT_STATUS", "El movimiento no esta pendiente.");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.cashMovement.update({
      where: { id: cashMovementId },
      data: {
        status: "authorized",
        authorizedByUserId: currentUser.id,
        authorizedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId: updated.branchId,
        userId: currentUser.id,
        action: "cash_withdrawal_authorized",
        entityType: "cash_movement",
        entityId: updated.id,
        beforeSnapshot: serializeCashMovement(movement),
        afterSnapshot: serializeCashMovement(updated),
      },
    });

    return { data: serializeCashMovement(updated) };
  });
}

export async function rejectCashMovement(
  currentUser: AuthenticatedUser,
  cashMovementId: string,
  input: unknown,
) {
  const body = asRecord(input);
  const rejectionReason = optionalString(body.reason);
  const movement = await getCashMovementOrThrow(currentUser.organizationId, cashMovementId);

  await assertCashAccess(currentUser, movement.branchId, "cash.withdraw.authorize");

  if (movement.status !== "pending_authorization") {
    throw new DomainError(409, "INVALID_CASH_MOVEMENT_STATUS", "El movimiento no esta pendiente.");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.cashMovement.update({
      where: { id: cashMovementId },
      data: {
        status: "rejected",
        rejectedByUserId: currentUser.id,
        rejectedAt: new Date(),
        cancellationReason: rejectionReason,
        updatedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId: updated.branchId,
        userId: currentUser.id,
        action: "cash_withdrawal_rejected",
        entityType: "cash_movement",
        entityId: updated.id,
        beforeSnapshot: serializeCashMovement(movement),
        afterSnapshot: serializeCashMovement(updated),
      },
    });

    return { data: serializeCashMovement(updated) };
  });
}

export async function cancelCashMovement(
  currentUser: AuthenticatedUser,
  cashMovementId: string,
  input: unknown,
) {
  const body = asRecord(input);
  const cancellationReason = asString(body.reason, "reason");
  const movement = await getCashMovementOrThrow(currentUser.organizationId, cashMovementId);

  await assertCashAccess(currentUser, movement.branchId, "cash.withdraw.request");

  if (!["recorded", "pending_authorization"].includes(movement.status)) {
    throw new DomainError(409, "INVALID_CASH_MOVEMENT_STATUS", "El movimiento no se puede cancelar.");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.cashMovement.update({
      where: { id: cashMovementId },
      data: {
        status: "cancelled",
        cancelledByUserId: currentUser.id,
        cancelledAt: new Date(),
        cancellationReason,
        updatedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId: updated.branchId,
        userId: currentUser.id,
        action: "cash_movement_cancelled",
        entityType: "cash_movement",
        entityId: updated.id,
        beforeSnapshot: serializeCashMovement(movement),
        afterSnapshot: serializeCashMovement(updated),
      },
    });

    return { data: serializeCashMovement(updated) };
  });
}

export function calculateCashDifference(expectedCashAmount: string, countedCashAmount: string) {
  const differenceAmount = subtractMoney(countedCashAmount, expectedCashAmount);

  return {
    differenceAmount,
    differenceType: getDifferenceType(differenceAmount),
  };
}

async function assertCashAccess(
  currentUser: AuthenticatedUser,
  branchId: string,
  permissionCode: string,
) {
  await assertFeatureAvailable(currentUser, "cash_control");
  await assertPermission(currentUser.id, permissionCode);
  await assertBranchAccess(currentUser, branchId);
}

async function getSuggestedOpeningAmount(organizationId: string, branchId: string) {
  const lastClosing = await prisma.cashClosing.findFirst({
    where: {
      organizationId,
      branchId,
      status: "active",
    },
    orderBy: {
      closedAt: "desc",
    },
  });

  return normalizeMoney(lastClosing?.countedCashAmount ?? "0");
}

async function getCashSessionOrThrow(organizationId: string, cashSessionId: string) {
  const session = await prisma.cashSession.findFirst({
    where: {
      id: cashSessionId,
      organizationId,
    },
  });

  if (!session) {
    throw new DomainError(404, "CASH_SESSION_NOT_FOUND", "Caja no encontrada.");
  }

  return session;
}

async function getCashMovementOrThrow(organizationId: string, cashMovementId: string) {
  const movement = await prisma.cashMovement.findFirst({
    where: {
      id: cashMovementId,
      organizationId,
    },
  });

  if (!movement) {
    throw new DomainError(404, "CASH_MOVEMENT_NOT_FOUND", "Movimiento de caja no encontrado.");
  }

  return movement;
}

async function resolveOpenSession(
  organizationId: string,
  branchId: string,
  cashSessionId: string | null,
) {
  const session = await prisma.cashSession.findFirst({
    where: {
      id: cashSessionId ?? undefined,
      organizationId,
      branchId,
      status: "open",
    },
    orderBy: {
      openedAt: "desc",
    },
  });

  if (!session) {
    throw new DomainError(409, "NO_OPEN_CASH_SESSION", "No hay caja abierta para la sucursal.");
  }

  return session;
}

async function assertCashReason(
  organizationId: string,
  reasonId: string | null,
  direction: "in_" | "out_",
) {
  if (!reasonId) {
    return;
  }

  const reason = await prisma.cashMovementReason.findFirst({
    where: {
      id: reasonId,
      organizationId,
      movementDirection: direction,
      status: "active",
    },
  });

  if (!reason) {
    throw new DomainError(400, "INVALID_CASH_REASON", "Motivo de caja invalido.");
  }
}

async function assertValidPin(userId: string, pin: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  if (!(await verifySecret(pin, user.pinHash))) {
    throw new DomainError(401, "INVALID_PIN", "PIN invalido.");
  }
}

async function buildSummary(db: typeof prisma | Prisma.TransactionClient, cashSessionId: string) {
  const session = await db.cashSession.findUniqueOrThrow({
    where: { id: cashSessionId },
  });

  const [movements, payments] = await Promise.all([
    db.cashMovement.findMany({
      where: { cashSessionId },
      orderBy: { createdAt: "asc" },
    }),
    db.salePayment.findMany({
      where: {
        sale: {
          cashSessionId,
          status: "completed",
        },
        status: "completed",
      },
    }),
  ]);

  const cashInTotal = movements
    .filter(
      (movement) =>
        ["cash_in", "route_cash_in"].includes(movement.movementType) &&
        cashCountedStatuses.includes(movement.status as (typeof cashCountedStatuses)[number]),
    )
    .reduce((total, movement) => addMoney(total, movement.amount), "0.00");
  const cashOutTotal = movements
    .filter((movement) => movement.movementType === "cash_out" && movement.status === "authorized")
    .reduce((total, movement) => addMoney(total, movement.amount), "0.00");

  const sales = {
    cash: "0.00",
    card: "0.00",
    transfer: "0.00",
    credit: "0.00",
  };

  for (const payment of payments) {
    sales[payment.paymentMethod] = addMoney(sales[payment.paymentMethod], payment.amount);
  }

  const expectedCashAmount = subtractMoney(
    addMoney(addMoney(session.openingAmountCounted, sales.cash), cashInTotal),
    cashOutTotal,
  );

  return {
    id: session.id,
    organizationId: session.organizationId,
    branchId: session.branchId,
    status: session.status,
    openingAmount: normalizeMoney(session.openingAmountCounted),
    cashInTotal,
    cashOutTotal,
    expectedCashAmount,
    sales,
    movements: movements.map(serializeCashMovement),
  };
}

function asRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new DomainError(400, "INVALID_REQUEST", "Body invalido.");
  }

  return input as Record<string, unknown>;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new DomainError(400, "INVALID_REQUEST", `Campo requerido: ${field}.`);
  }

  return value.trim();
}

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new DomainError(400, "INVALID_REQUEST", "Campo string invalido.");
  }

  return value.trim();
}

function asMoney(value: unknown, field: string): string {
  if (typeof value !== "number" && typeof value !== "string") {
    throw new DomainError(400, "INVALID_REQUEST", `Campo requerido: ${field}.`);
  }

  const amount = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new DomainError(400, "INVALID_REQUEST", `Monto invalido: ${field}.`);
  }

  return amount.toFixed(2);
}

function normalizeMoney(value: Prisma.Decimal | string | number) {
  return Number(value).toFixed(2);
}

function addMoney(left: Prisma.Decimal | string | number, right: Prisma.Decimal | string | number) {
  return ((toCents(left) + toCents(right)) / 100).toFixed(2);
}

function subtractMoney(left: Prisma.Decimal | string | number, right: Prisma.Decimal | string | number) {
  return ((toCents(left) - toCents(right)) / 100).toFixed(2);
}

function toCents(value: Prisma.Decimal | string | number) {
  return Math.round(Number(value) * 100);
}

function getDifferenceType(differenceAmount: string) {
  const cents = toCents(differenceAmount);

  if (cents > 0) {
    return "surplus";
  }

  if (cents < 0) {
    return "shortage";
  }

  return "none";
}

function serializeCashSession(session: {
  id: string;
  organizationId: string;
  branchId: string;
  deviceId: string | null;
  openedByUserId: string;
  closedByUserId: string | null;
  openingAmountExpected: Prisma.Decimal;
  openingAmountCounted: Prisma.Decimal;
  openingDiscrepancy: Prisma.Decimal;
  openingNote: string | null;
  status: string;
  openedAt: Date;
  closedAt: Date | null;
}) {
  return {
    id: session.id,
    organizationId: session.organizationId,
    branchId: session.branchId,
    deviceId: session.deviceId,
    openedByUserId: session.openedByUserId,
    closedByUserId: session.closedByUserId,
    openingAmountExpected: normalizeMoney(session.openingAmountExpected),
    openingAmountCounted: normalizeMoney(session.openingAmountCounted),
    openingDiscrepancy: normalizeMoney(session.openingDiscrepancy),
    openingNote: session.openingNote,
    status: session.status,
    openedAt: session.openedAt,
    closedAt: session.closedAt,
  };
}

function serializeCashMovement(movement: {
  id: string;
  organizationId: string;
  branchId: string;
  cashSessionId: string;
  movementType: string;
  amount: Prisma.Decimal;
  reasonId: string | null;
  description: string | null;
  status: string;
  requestedByUserId: string;
  authorizedByUserId: string | null;
  authorizedAt: Date | null;
  rejectedByUserId: string | null;
  rejectedAt: Date | null;
  cancelledByUserId: string | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  createdAt: Date;
}) {
  return {
    id: movement.id,
    organizationId: movement.organizationId,
    branchId: movement.branchId,
    cashSessionId: movement.cashSessionId,
    movementType: movement.movementType,
    amount: normalizeMoney(movement.amount),
    reasonId: movement.reasonId,
    description: movement.description,
    status: movement.status,
    requestedByUserId: movement.requestedByUserId,
    authorizedByUserId: movement.authorizedByUserId,
    authorizedAt: movement.authorizedAt,
    rejectedByUserId: movement.rejectedByUserId,
    rejectedAt: movement.rejectedAt,
    cancelledByUserId: movement.cancelledByUserId,
    cancelledAt: movement.cancelledAt,
    cancellationReason: movement.cancellationReason,
    createdAt: movement.createdAt,
  };
}

function serializeCashClosing(closing: {
  id: string;
  organizationId: string;
  branchId: string;
  cashSessionId: string;
  closedByUserId: string;
  openingAmount: Prisma.Decimal;
  cashSalesTotal: Prisma.Decimal;
  cardSalesTotal: Prisma.Decimal;
  transferSalesTotal: Prisma.Decimal;
  creditSalesTotal: Prisma.Decimal;
  cashInTotal: Prisma.Decimal;
  cashOutTotal: Prisma.Decimal;
  expectedCashAmount: Prisma.Decimal;
  countedCashAmount: Prisma.Decimal;
  differenceAmount: Prisma.Decimal;
  differenceType: string;
  comment: string | null;
  status: string;
  closedAt: Date;
}) {
  return {
    id: closing.id,
    organizationId: closing.organizationId,
    branchId: closing.branchId,
    cashSessionId: closing.cashSessionId,
    closedByUserId: closing.closedByUserId,
    openingAmount: normalizeMoney(closing.openingAmount),
    cashSalesTotal: normalizeMoney(closing.cashSalesTotal),
    cardSalesTotal: normalizeMoney(closing.cardSalesTotal),
    transferSalesTotal: normalizeMoney(closing.transferSalesTotal),
    creditSalesTotal: normalizeMoney(closing.creditSalesTotal),
    cashInTotal: normalizeMoney(closing.cashInTotal),
    cashOutTotal: normalizeMoney(closing.cashOutTotal),
    expectedCashAmount: normalizeMoney(closing.expectedCashAmount),
    countedCashAmount: normalizeMoney(closing.countedCashAmount),
    differenceAmount: normalizeMoney(closing.differenceAmount),
    differenceType: closing.differenceType,
    comment: closing.comment,
    status: closing.status,
    closedAt: closing.closedAt,
  };
}
