import { Prisma } from "@prisma/client";

import { DomainError } from "../lib/domain-error.js";
import { verifySecret } from "../lib/password.js";
import { prisma } from "../lib/prisma.js";
import type { AuthenticatedUser } from "./auth-service.js";
import { runIdempotent } from "./idempotency-service.js";
import { assertOrganizationOperational } from "./operational-access-service.js";
import { assertBranchAccess, assertPermission } from "./permission-service.js";
import { assertFeatureAvailable } from "./subscription-service.js";

const paymentMethods = ["cash", "card", "transfer", "credit"] as const;
const inventoryConditions = ["sellable", "waste", "review_required"] as const;
const deliveryOrderStatuses = ["pending", "prepared", "loaded", "in_route", "delivered", "partially_paid", "paid", "returned", "cancelled"] as const;

export async function listDeliveryDrivers(currentUser: AuthenticatedUser) {
  await assertPermission(currentUser.id, "routes.manage");
  const drivers = await prisma.deliveryDriver.findMany({
    where: { organizationId: currentUser.organizationId },
    orderBy: { name: "asc" },
  });

  return { data: drivers.map(serializeDriver) };
}

export async function createDeliveryDriver(currentUser: AuthenticatedUser, input: unknown) {
  await assertPermission(currentUser.id, "routes.manage");
  const body = asRecord(input);
  const driver = await prisma.deliveryDriver.upsert({
    where: {
      organizationId_name: {
        organizationId: currentUser.organizationId,
        name: asString(body.name, "name"),
      },
    },
    update: {
      phone: optionalString(body.phone),
      notes: optionalString(body.notes),
      status: "active",
      updatedAt: new Date(),
    },
    create: {
      organizationId: currentUser.organizationId,
      name: asString(body.name, "name"),
      phone: optionalString(body.phone),
      notes: optionalString(body.notes),
      status: "active",
    },
  });

  return { data: serializeDriver(driver) };
}

export async function listDeliveryRoutes(currentUser: AuthenticatedUser, branchId: string | null) {
  await assertFeatureAvailable(currentUser, "delivery_routes");
  await assertPermission(currentUser.id, "routes.manage");

  if (branchId) {
    await assertBranchAccess(currentUser, branchId);
  }

  const routes = await prisma.deliveryRoute.findMany({
    where: {
      organizationId: currentUser.organizationId,
      branchId: branchId ?? undefined,
    },
    include: {
      driver: true,
      deliveryRouteCustomerRoute: {
        include: { customer: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: { name: "asc" },
  });

  return { data: routes.map(serializeRoute) };
}

export async function createDeliveryRoute(currentUser: AuthenticatedUser, input: unknown) {
  await assertFeatureAvailable(currentUser, "delivery_routes");
  await assertPermission(currentUser.id, "routes.manage");
  const body = asRecord(input);
  const branchId = asString(body.branchId, "branchId");
  const driverId = optionalString(body.driverId);

  await assertBranchAccess(currentUser, branchId);
  if (driverId) {
    await assertDriver(currentUser.organizationId, driverId);
  }

  const route = await prisma.deliveryRoute.upsert({
    where: {
      branchId_name: {
        branchId,
        name: asString(body.name, "name"),
      },
    },
    update: {
      driverId,
      status: "active",
      updatedAt: new Date(),
    },
    create: {
      organizationId: currentUser.organizationId,
      branchId,
      driverId,
      name: asString(body.name, "name"),
      status: "active",
    },
    include: {
      driver: true,
      deliveryRouteCustomerRoute: {
        include: { customer: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  return { data: serializeRoute(route) };
}

export async function assignCustomerToRoute(
  currentUser: AuthenticatedUser,
  routeId: string,
  input: unknown,
) {
  await assertFeatureAvailable(currentUser, "delivery_routes");
  await assertPermission(currentUser.id, "routes.manage");
  const body = asRecord(input);
  const route = await getRouteOrThrow(currentUser.organizationId, routeId);
  await assertBranchAccess(currentUser, route.branchId);
  await assertCustomer(currentUser.organizationId, asString(body.customerId, "customerId"));

  const assignment = await prisma.deliveryRouteCustomer.upsert({
    where: {
      routeId_customerId: {
        routeId,
        customerId: asString(body.customerId, "customerId"),
      },
    },
    update: {
      sortOrder: optionalNumber(body.sortOrder) ?? 0,
    },
    create: {
      routeId,
      customerId: asString(body.customerId, "customerId"),
      sortOrder: optionalNumber(body.sortOrder) ?? 0,
    },
  });

  return { data: assignment };
}

export async function removeCustomerFromRoute(
  currentUser: AuthenticatedUser,
  routeId: string,
  customerId: string,
) {
  await assertFeatureAvailable(currentUser, "delivery_routes");
  await assertPermission(currentUser.id, "routes.manage");
  const route = await getRouteOrThrow(currentUser.organizationId, routeId);
  await assertBranchAccess(currentUser, route.branchId);

  await prisma.deliveryRouteCustomer.deleteMany({
    where: {
      routeId,
      customerId,
      route: { organizationId: currentUser.organizationId },
    },
  });

  return { data: { routeId, customerId } };
}

export async function reorderRouteCustomers(
  currentUser: AuthenticatedUser,
  routeId: string,
  input: unknown,
) {
  await assertFeatureAvailable(currentUser, "delivery_routes");
  await assertPermission(currentUser.id, "routes.manage");
  const route = await getRouteOrThrow(currentUser.organizationId, routeId);
  await assertBranchAccess(currentUser, route.branchId);
  const assignments = asRouteCustomerOrder(asRecord(input).customers);

  await prisma.$transaction(async (tx) => {
    for (const assignment of assignments) {
      await tx.deliveryRouteCustomer.updateMany({
        where: {
          routeId,
          customerId: assignment.customerId,
        },
        data: { sortOrder: assignment.sortOrder },
      });
    }
  });

  return { data: { routeId, customers: assignments } };
}

export async function listDeliveryOrders(currentUser: AuthenticatedUser, filters: {
  branchId: string | null;
  routeId: string | null;
  driverId: string | null;
  customerId: string | null;
  status: string | null;
  date: string | null;
}) {
  await assertFeatureAvailable(currentUser, "delivery_routes");
  await assertPermission(currentUser.id, "routes.manage");
  const branchId = filters.branchId ? filters.branchId.trim() : "";
  if (!branchId) {
    throw new DomainError(400, "INVALID_REQUEST", "Query requerido: branchId.");
  }
  await assertBranchAccess(currentUser, branchId);

  const createdAt = filters.date
    ? {
        gte: new Date(`${filters.date}T00:00:00.000Z`),
        lt: new Date(`${filters.date}T23:59:59.999Z`),
      }
    : undefined;

  const status = filters.status
    ? asEnum(filters.status, "status", deliveryOrderStatuses)
    : undefined;

  const orders = await prisma.deliveryOrder.findMany({
    where: {
      organizationId: currentUser.organizationId,
      branchId,
      routeId: filters.routeId ?? undefined,
      driverId: filters.driverId ?? undefined,
      customerId: filters.customerId ?? undefined,
      status,
      createdAt,
    },
    include: {
      customer: true,
      deliveryOrderItemDeliveryOrder: { include: { product: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return { data: orders.map(serializeOrder) };
}

export async function createDeliveryOrder(
  currentUser: AuthenticatedUser,
  input: unknown,
  idempotencyKey?: string | null,
) {
  return runIdempotent(
    currentUser.organizationId,
    "delivery_orders.create",
    idempotencyKey,
    input,
    () => createDeliveryOrderOnce(currentUser, input),
  );
}

async function createDeliveryOrderOnce(currentUser: AuthenticatedUser, input: unknown) {
  await assertFeatureAvailable(currentUser, "delivery_routes");
  await assertPermission(currentUser.id, "routes.manage");
  const body = asRecord(input);
  const branchId = asString(body.branchId, "branchId");
  const customerId = asString(body.customerId, "customerId");
  const routeId = optionalString(body.routeId);
  const driverId = optionalString(body.driverId);
  const items = asOrderItems(body.items);

  await assertBranchAccess(currentUser, branchId);
  await assertDeliveryOperationAllowed(currentUser, branchId, "La organizacion no puede operar rutas.");
  await assertCustomer(currentUser.organizationId, customerId);
  if (routeId) {
    const route = await getRouteOrThrow(currentUser.organizationId, routeId);
    if (route.branchId !== branchId) {
      throw new DomainError(400, "INVALID_TENANT_REFERENCE", "Ruta invalida para la sucursal.");
    }
    const assignment = await prisma.deliveryRouteCustomer.findUnique({
      where: {
        routeId_customerId: {
          routeId,
          customerId,
        },
      },
    });
    if (!assignment) {
      throw new DomainError(400, "CUSTOMER_NOT_ASSIGNED_TO_ROUTE", "Cliente no asignado a la ruta.");
    }
  }
  if (driverId) {
    await assertDriver(currentUser.organizationId, driverId);
  }

  return prisma.$transaction(async (tx) => {
    const order = await tx.deliveryOrder.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId,
        routeId,
        driverId,
        customerId,
        createdByUserId: currentUser.id,
        status: "pending",
      },
    });

    let totalCents = 0;
    for (const item of items) {
      const price = await resolveDeliveryPrice(tx, currentUser.organizationId, branchId, customerId, item.productId);
      const itemTotal = multiplyMoney(price.price, item.quantity);
      totalCents += toCents(itemTotal);
      await tx.deliveryOrderItem.create({
        data: {
          deliveryOrderId: order.id,
          productId: item.productId,
          quantityLoaded: item.quantity,
          unitPrice: price.price,
          total: itemTotal,
        },
      });
    }

    const updated = await tx.deliveryOrder.update({
      where: { id: order.id },
      data: {
        total: centsToMoney(totalCents),
        amountPending: centsToMoney(totalCents),
      },
      include: {
        customer: true,
        deliveryOrderItemDeliveryOrder: { include: { product: true } },
      },
    });

    await audit(tx, currentUser, branchId, "delivery_order_created", "delivery_order", order.id, serializeOrder(updated));
    return { data: serializeOrder(updated) };
  });
}

export async function prepareDeliveryOrder(currentUser: AuthenticatedUser, orderId: string) {
  const order = await assertDeliveryOrderAction(currentUser, orderId, "pending");
  return updateOrderStatus(currentUser, order.id, "prepared", {
    preparedByUserId: currentUser.id,
    updatedAt: new Date(),
  });
}

export async function loadDeliveryOrder(currentUser: AuthenticatedUser, orderId: string) {
  const order = await assertDeliveryOrderAction(currentUser, orderId, "prepared");

  return prisma.$transaction(async (tx) => {
    const fullOrder = await tx.deliveryOrder.findFirstOrThrow({
      where: { id: order.id, organizationId: currentUser.organizationId },
      include: { deliveryOrderItemDeliveryOrder: true },
    });
    const movements = [];

    for (const item of fullOrder.deliveryOrderItemDeliveryOrder) {
      const movement = await createDeliveryInventoryOut(tx, currentUser, fullOrder.branchId, item);
      movements.push(movement);
    }

    const loaded = await tx.deliveryOrder.update({
      where: { id: order.id },
      data: { status: "loaded", loadedAt: new Date(), updatedAt: new Date() },
      include: { customer: true, deliveryOrderItemDeliveryOrder: { include: { product: true } } },
    });

    await audit(tx, currentUser, order.branchId, "delivery_order_loaded", "delivery_order", order.id, {
      order: serializeOrder(loaded),
      movements: movements.map(serializeInventoryMovement),
    });

    return { data: serializeOrder(loaded) };
  });
}

export async function markDeliveryOrderInRoute(currentUser: AuthenticatedUser, orderId: string) {
  const order = await assertDeliveryOrderAction(currentUser, orderId, "loaded");
  return updateOrderStatus(currentUser, order.id, "in_route", { updatedAt: new Date() });
}

export async function deliverDeliveryOrder(currentUser: AuthenticatedUser, orderId: string, input: unknown) {
  const order = await assertDeliveryOrderAction(currentUser, orderId, "in_route");
  const body = asRecord(input);
  const deliveredItems = asDeliveredItems(body.items);

  return prisma.$transaction(async (tx) => {
    const fullOrder = await tx.deliveryOrder.findFirstOrThrow({
      where: { id: order.id, organizationId: currentUser.organizationId },
      include: { deliveryOrderItemDeliveryOrder: true },
    });

    for (const item of fullOrder.deliveryOrderItemDeliveryOrder) {
      const delivered = deliveredItems.find((candidate) => candidate.deliveryOrderItemId === item.id);
      const deliveredQuantity = delivered?.quantity ?? normalizeQuantity(item.quantityLoaded);
      const returnedQuantity = subtractQuantity(item.quantityLoaded, deliveredQuantity);

      await tx.deliveryOrderItem.update({
        where: { id: item.id },
        data: {
          quantityDelivered: deliveredQuantity,
          quantityReturned: returnedQuantity,
          updatedAt: new Date(),
        },
      });

      if (Number(returnedQuantity) > 0) {
        const deliveryReturn = await tx.deliveryReturn.create({
          data: {
            organizationId: currentUser.organizationId,
            branchId: fullOrder.branchId,
            deliveryOrderId: fullOrder.id,
            driverId: fullOrder.driverId,
            status: "pending_review",
          },
        });
        await tx.deliveryReturnItem.create({
          data: {
            deliveryReturnId: deliveryReturn.id,
            productId: item.productId,
            quantity: returnedQuantity,
            condition: "review_required",
          },
        });
      }
    }

    const deliveredOrder = await tx.deliveryOrder.update({
      where: { id: fullOrder.id },
      data: { status: "delivered", deliveredAt: new Date(), closedAt: new Date(), updatedAt: new Date() },
      include: { customer: true, deliveryOrderItemDeliveryOrder: { include: { product: true } } },
    });

    await audit(tx, currentUser, order.branchId, "delivery_order_delivered", "delivery_order", order.id, serializeOrder(deliveredOrder));
    return { data: serializeOrder(deliveredOrder) };
  });
}

export async function recordDeliveryPayment(
  currentUser: AuthenticatedUser,
  orderId: string,
  input: unknown,
  idempotencyKey?: string | null,
) {
  return runIdempotent(
    currentUser.organizationId,
    `delivery_orders.payment.${orderId}`,
    idempotencyKey,
    { orderId, input },
    () => recordDeliveryPaymentOnce(currentUser, orderId, input),
  );
}

async function recordDeliveryPaymentOnce(currentUser: AuthenticatedUser, orderId: string, input: unknown) {
  await assertFeatureAvailable(currentUser, "delivery_routes");
  await assertPermission(currentUser.id, "routes.manage");
  const body = asRecord(input);
  const order = await getOrderOrThrow(currentUser.organizationId, orderId);
  await assertBranchAccess(currentUser, order.branchId);
  await assertDeliveryOperationAllowed(currentUser, order.branchId, "La organizacion no puede registrar pagos de ruta.");
  const amount = asMoney(body.amount, "amount");
  const paymentMethod = asEnum(body.paymentMethod ?? "cash", "paymentMethod", paymentMethods);
  const reference = optionalString(body.reference);
  const provider = optionalString(body.provider);

  if ((paymentMethod === "card" || paymentMethod === "transfer") && !reference) {
    throw new DomainError(
      400,
      paymentMethod === "card" ? "CARD_REFERENCE_REQUIRED" : "TRANSFER_REFERENCE_REQUIRED",
      paymentMethod === "card" ? "Pago con tarjeta requiere referencia." : "Pago por transferencia requiere referencia.",
    );
  }

  if (toCents(amount) > toCents(order.amountPending)) {
    throw new DomainError(400, "PAYMENT_EXCEEDS_PENDING", "El pago excede el saldo pendiente.");
  }

  return prisma.$transaction(async (tx) => {
    if (paymentMethod === "credit") {
      await assertDeliveryCreditPayment(tx, currentUser, order, amount, body);
    }

    const payment = await tx.deliveryPayment.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId: order.branchId,
        deliveryOrderId: order.id,
        driverId: order.driverId,
        customerId: order.customerId,
        amount,
        paymentMethod,
        reference,
        provider,
        status: "completed",
        collectedAt: new Date(),
      },
    });

    if (paymentMethod === "credit") {
      await tx.customerBalanceMovement.create({
        data: {
          organizationId: currentUser.organizationId,
          customerId: order.customerId,
          movementType: "charge",
          amount,
          referenceType: "delivery_order",
          referenceId: order.id,
          createdByUserId: currentUser.id,
        },
      });
      await tx.customer.update({
        where: { id: order.customerId },
        data: {
          currentBalance: addMoney((await tx.customer.findUniqueOrThrow({ where: { id: order.customerId } })).currentBalance, amount),
          updatedAt: new Date(),
        },
      });
    }

    const collected = addMoney(order.amountCollected, amount);
    const pending = subtractMoney(order.total, collected);
    const status = toCents(pending) <= 0 ? "paid" : "partially_paid";
    const updated = await tx.deliveryOrder.update({
      where: { id: order.id },
      data: {
        amountCollected: collected,
        amountPending: toCents(pending) < 0 ? "0.00" : pending,
        status,
        updatedAt: new Date(),
      },
      include: { customer: true, deliveryOrderItemDeliveryOrder: { include: { product: true } } },
    });

    await audit(tx, currentUser, order.branchId, "delivery_payment_recorded", "delivery_payment", payment.id, serializeDeliveryPayment(payment));
    return { data: { order: serializeOrder(updated), payment: serializeDeliveryPayment(payment) } };
  });
}

export async function createDeliveryReturn(currentUser: AuthenticatedUser, orderId: string, input: unknown) {
  await assertFeatureAvailable(currentUser, "delivery_routes");
  await assertPermission(currentUser.id, "routes.manage");
  const body = asRecord(input);
  const order = await getOrderOrThrow(currentUser.organizationId, orderId);
  await assertBranchAccess(currentUser, order.branchId);
  await assertDeliveryOperationAllowed(currentUser, order.branchId, "La organizacion no puede procesar devoluciones de ruta.");
  const items = asReturnItems(body.items);

  return prisma.$transaction(async (tx) => {
    const deliveryReturn = await tx.deliveryReturn.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId: order.branchId,
        deliveryOrderId: order.id,
        driverId: order.driverId,
        status: "pending_review",
        deliveryReturnItemDeliveryReturn: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            condition: item.condition,
          })),
        },
      },
      include: { deliveryReturnItemDeliveryReturn: true },
    });

    await tx.deliveryOrder.update({
      where: { id: order.id },
      data: { status: "returned", updatedAt: new Date() },
    });

    await audit(tx, currentUser, order.branchId, "delivery_return_created", "delivery_return", deliveryReturn.id, serializeDeliveryReturn(deliveryReturn));
    return { data: serializeDeliveryReturn(deliveryReturn) };
  });
}

export async function reviewDeliveryReturn(currentUser: AuthenticatedUser, deliveryReturnId: string, input: unknown) {
  await assertFeatureAvailable(currentUser, "delivery_routes");
  await assertPermission(currentUser.id, "routes.manage");
  const body = asRecord(input);
  const action = asEnum(body.action, "action", ["return_to_inventory", "mark_as_waste"] as const);
  const deliveryReturn = await prisma.deliveryReturn.findFirst({
    where: { id: deliveryReturnId, organizationId: currentUser.organizationId },
    include: { deliveryReturnItemDeliveryReturn: true },
  });

  if (!deliveryReturn) {
    throw new DomainError(404, "DELIVERY_RETURN_NOT_FOUND", "Devolucion de ruta no encontrada.");
  }
  await assertBranchAccess(currentUser, deliveryReturn.branchId);
  await assertDeliveryOperationAllowed(currentUser, deliveryReturn.branchId, "La organizacion no puede procesar devoluciones de ruta.");
  if (deliveryReturn.status !== "pending_review") {
    throw new DomainError(409, "RETURN_ALREADY_REVIEWED", "La devolucion ya fue revisada.");
  }

  return prisma.$transaction(async (tx) => {
    const movements = [];
    for (const item of deliveryReturn.deliveryReturnItemDeliveryReturn) {
      const movement = await createDeliveryReturnMovement(tx, currentUser, deliveryReturn.branchId, item, action);
      movements.push(movement);

      await tx.deliveryReturnItem.update({
        where: { id: item.id },
        data: {
          condition: action === "return_to_inventory" ? "sellable" : "waste",
          inventoryMovementId: movement.id,
        },
      });
    }

    const updated = await tx.deliveryReturn.update({
      where: { id: deliveryReturn.id },
      data: {
        status: action === "return_to_inventory" ? "returned_to_inventory" : "marked_as_waste",
        reviewedByUserId: currentUser.id,
        reviewedAt: new Date(),
      },
      include: { deliveryReturnItemDeliveryReturn: true },
    });

    await audit(tx, currentUser, deliveryReturn.branchId, "delivery_return_reviewed", "delivery_return", deliveryReturn.id, {
      deliveryReturn: serializeDeliveryReturn(updated),
      movements: movements.map(serializeInventoryMovement),
    });
    return { data: serializeDeliveryReturn(updated) };
  });
}

export async function createDeliverySettlement(currentUser: AuthenticatedUser, input: unknown) {
  await assertFeatureAvailable(currentUser, "delivery_routes");
  await assertPermission(currentUser.id, "routes.manage");
  const body = asRecord(input);
  const branchId = asString(body.branchId, "branchId");
  const driverId = optionalString(body.driverId);
  const routeId = optionalString(body.routeId);
  await assertBranchAccess(currentUser, branchId);
  await assertDeliveryOperationAllowed(currentUser, branchId, "La organizacion no puede operar liquidaciones de ruta.");
  const expectedCashAmount = await calculateExpectedCash(currentUser.organizationId, branchId, driverId, routeId);

  const settlement = await prisma.deliverySettlement.create({
    data: {
      organizationId: currentUser.organizationId,
      branchId,
      driverId,
      routeId,
      status: "open",
      expectedCashAmount,
    },
  });

  return { data: serializeSettlement(settlement) };
}

export async function listDeliverySettlements(currentUser: AuthenticatedUser, filters: {
  branchId: string | null;
  routeId: string | null;
  driverId: string | null;
  status: string | null;
}) {
  await assertFeatureAvailable(currentUser, "delivery_routes");
  await assertPermission(currentUser.id, "routes.manage");
  const branchId = filters.branchId ? filters.branchId.trim() : "";
  if (!branchId) {
    throw new DomainError(400, "INVALID_REQUEST", "Query requerido: branchId.");
  }

  await assertBranchAccess(currentUser, branchId);
  const status = filters.status
    ? asEnum(filters.status, "status", ["open", "closed", "cancelled"] as const)
    : undefined;
  const settlements = await prisma.deliverySettlement.findMany({
    where: {
      organizationId: currentUser.organizationId,
      branchId,
      routeId: filters.routeId ?? undefined,
      driverId: filters.driverId ?? undefined,
      status,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return { data: settlements.map(serializeSettlement) };
}

export async function closeDeliverySettlement(currentUser: AuthenticatedUser, settlementId: string, input: unknown) {
  await assertFeatureAvailable(currentUser, "delivery_routes");
  await assertPermission(currentUser.id, "routes.manage");
  const body = asRecord(input);
  const deliveredCashAmount = asMoney(body.deliveredCashAmount, "deliveredCashAmount");
  const settlement = await getSettlementOrThrow(currentUser.organizationId, settlementId);
  await assertBranchAccess(currentUser, settlement.branchId);
  await assertDeliveryOperationAllowed(currentUser, settlement.branchId, "La organizacion no puede operar liquidaciones de ruta.");

  if (settlement.status !== "open") {
    throw new DomainError(409, "INVALID_DELIVERY_STATUS", "Liquidacion no abierta.");
  }

  return prisma.$transaction(async (tx) => {
    const payments = await tx.deliveryPayment.findMany({
      where: {
        organizationId: currentUser.organizationId,
        branchId: settlement.branchId,
        driverId: settlement.driverId ?? undefined,
        paymentMethod: "cash",
        status: "completed",
        deliverySettlementId: null,
        deliveryOrder: {
          routeId: settlement.routeId ?? undefined,
        },
      },
    });
    const expectedCashAmount = centsToMoney(payments.reduce((sum, payment) => sum + toCents(payment.amount), 0));

    const closed = await tx.deliverySettlement.update({
      where: { id: settlement.id },
      data: {
        status: "closed",
        expectedCashAmount,
        deliveredCashAmount,
        differenceAmount: subtractMoney(deliveredCashAmount, expectedCashAmount),
        receivedByUserId: currentUser.id,
        closedAt: new Date(),
      },
    });

    await tx.deliveryPayment.updateMany({
      where: {
        id: { in: payments.map((payment) => payment.id) },
        deliverySettlementId: null,
      },
      data: {
        deliverySettlementId: settlement.id,
        settledAt: new Date(),
      },
    });

    return { data: serializeSettlement(closed) };
  });
}

export async function depositSettlementToCash(
  currentUser: AuthenticatedUser,
  settlementId: string,
  idempotencyKey?: string | null,
) {
  return runIdempotent(
    currentUser.organizationId,
    `delivery_settlements.deposit.${settlementId}`,
    idempotencyKey,
    { settlementId },
    () => depositSettlementToCashOnce(currentUser, settlementId),
  );
}

async function depositSettlementToCashOnce(currentUser: AuthenticatedUser, settlementId: string) {
  await assertFeatureAvailable(currentUser, "delivery_routes");
  await assertPermission(currentUser.id, "routes.manage");
  const settlement = await getSettlementOrThrow(currentUser.organizationId, settlementId);
  await assertBranchAccess(currentUser, settlement.branchId);
  await assertDeliveryOperationAllowed(currentUser, settlement.branchId, "La organizacion no puede operar liquidaciones de ruta.");

  if (settlement.status !== "closed") {
    throw new DomainError(409, "INVALID_DELIVERY_STATUS", "Liquidacion debe estar cerrada.");
  }

  if (settlement.cashMovementId) {
    throw new DomainError(409, "SETTLEMENT_ALREADY_DEPOSITED", "Liquidacion ya depositada.");
  }

  return prisma.$transaction(async (tx) => {
    const cashSession = await tx.cashSession.findFirst({
      where: {
        organizationId: currentUser.organizationId,
        branchId: settlement.branchId,
        status: "open",
      },
      orderBy: { openedAt: "desc" },
    });

    if (!cashSession) {
      throw new DomainError(409, "CASH_SESSION_NOT_OPEN", "No hay caja abierta para deposito.");
    }

    const movement = await tx.cashMovement.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId: settlement.branchId,
        cashSessionId: cashSession.id,
        movementType: "route_cash_in",
        amount: settlement.deliveredCashAmount,
        description: "Deposito de liquidacion de ruta",
        status: "recorded",
        requestedByUserId: currentUser.id,
      },
    });

    const updated = await tx.deliverySettlement.update({
      where: { id: settlement.id },
      data: { cashSessionId: cashSession.id, cashMovementId: movement.id },
    });

    await audit(tx, currentUser, settlement.branchId, "delivery_settlement_deposited_to_cash", "delivery_settlement", settlement.id, {
      settlement: serializeSettlement(updated),
      cashMovementId: movement.id,
    });

    return { data: { settlement: serializeSettlement(updated), cashMovementId: movement.id } };
  });
}

export function calculateSettlementDifference(expectedCashAmount: string, deliveredCashAmount: string) {
  return subtractMoney(deliveredCashAmount, expectedCashAmount);
}

async function assertDeliveryOrderAction(
  currentUser: AuthenticatedUser,
  orderId: string,
  expectedStatus: string,
) {
  await assertFeatureAvailable(currentUser, "delivery_routes");
  await assertPermission(currentUser.id, "routes.manage");
  const order = await getOrderOrThrow(currentUser.organizationId, orderId);
  await assertBranchAccess(currentUser, order.branchId);
  await assertDeliveryOperationAllowed(currentUser, order.branchId, "La organizacion no puede operar rutas.");
  if (order.status !== expectedStatus) {
    throw new DomainError(409, "INVALID_DELIVERY_STATUS", "Estado invalido para la accion.");
  }
  return order;
}

async function assertDeliveryOperationAllowed(
  currentUser: AuthenticatedUser,
  _branchId: string,
  deniedMessage: string,
) {
  await assertOrganizationOperational(currentUser.organizationId, deniedMessage);
}

async function assertDeliveryCreditPayment(
  tx: Prisma.TransactionClient,
  currentUser: AuthenticatedUser,
  order: {
    customerId: string;
    organizationId: string;
  },
  amount: string,
  body: Record<string, unknown>,
) {
  await assertFeatureAvailable(currentUser, "customer_credit");
  const customer = await tx.customer.findFirstOrThrow({
    where: {
      id: order.customerId,
      organizationId: order.organizationId,
    },
  });

  if (!customer.creditEnabled) {
    throw new DomainError(400, "CUSTOMER_CREDIT_DISABLED", "Cliente sin credito habilitado.");
  }

  const nextBalance = toCents(customer.currentBalance) + toCents(amount);
  const limit = toCents(customer.creditLimit);

  if (nextBalance > limit) {
    await assertPermission(currentUser.id, "customers.manage");
    const authorizationPin = optionalString(body.authorizationPin);
    if (!authorizationPin) {
      throw new DomainError(403, "CUSTOMER_CREDIT_LIMIT_EXCEEDED", "Credito excede limite.");
    }
    await assertValidPin(currentUser.id, authorizationPin);
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

async function updateOrderStatus(
  currentUser: AuthenticatedUser,
  orderId: string,
  status: "prepared" | "in_route",
  data: Record<string, unknown>,
) {
  const updated = await prisma.deliveryOrder.update({
    where: { id: orderId },
    data: { status, ...data },
    include: { customer: true, deliveryOrderItemDeliveryOrder: { include: { product: true } } },
  });
  return { data: serializeOrder(updated) };
}

async function createDeliveryInventoryOut(
  tx: Prisma.TransactionClient,
  currentUser: AuthenticatedUser,
  branchId: string,
  item: { id: string; productId: string; quantityLoaded: Prisma.Decimal },
) {
  const stockTarget = await resolveStockTarget(tx, currentUser.organizationId, item.productId, normalizeQuantity(item.quantityLoaded));
  const stock = await tx.inventoryStock.findUnique({
    where: { branchId_productId: { branchId, productId: stockTarget.productId } },
  });
  const current = normalizeQuantity(stock?.quantity ?? "0.000");
  const next = subtractQuantity(current, stockTarget.quantity);

  if (Number(next) < 0) {
    throw new DomainError(409, "INSUFFICIENT_STOCK", "Stock insuficiente para cargar ruta.");
  }

  const movement = await tx.inventoryMovement.create({
    data: {
      organizationId: currentUser.organizationId,
      branchId,
      productId: stockTarget.productId,
      movementType: "route_load_out",
      quantity: stockTarget.quantity,
      unit: stockTarget.unit,
      reason: "Carga de ruta",
      referenceType: "delivery_order_item",
      referenceId: item.id,
      createdByUserId: currentUser.id,
    },
  });

  await tx.inventoryStock.update({
    where: { branchId_productId: { branchId, productId: stockTarget.productId } },
    data: { quantity: next, updatedAt: new Date() },
  });

  return movement;
}

async function createDeliveryReturnMovement(
  tx: Prisma.TransactionClient,
  currentUser: AuthenticatedUser,
  branchId: string,
  item: { id: string; productId: string; quantity: Prisma.Decimal },
  action: "return_to_inventory" | "mark_as_waste",
) {
  const stockTarget = await resolveStockTarget(tx, currentUser.organizationId, item.productId, normalizeQuantity(item.quantity));
  const movementType = action === "return_to_inventory" ? "route_return_in" : "return_waste";
  const movement = await tx.inventoryMovement.create({
    data: {
      organizationId: currentUser.organizationId,
      branchId,
      productId: stockTarget.productId,
      movementType,
      quantity: stockTarget.quantity,
      unit: stockTarget.unit,
      reason: "Revision devolucion de ruta",
      referenceType: "delivery_return_item",
      referenceId: item.id,
      createdByUserId: currentUser.id,
    },
  });

  if (action === "return_to_inventory") {
    const stock = await tx.inventoryStock.upsert({
      where: { branchId_productId: { branchId, productId: stockTarget.productId } },
      update: {},
      create: {
        organizationId: currentUser.organizationId,
        branchId,
        productId: stockTarget.productId,
        quantity: "0.000",
        reservedQuantity: "0.000",
        minimumQuantity: "0.000",
      },
    });
    await tx.inventoryStock.update({
      where: { branchId_productId: { branchId, productId: stockTarget.productId } },
      data: { quantity: addQuantity(stock.quantity, stockTarget.quantity), updatedAt: new Date() },
    });
  } else {
    await tx.wasteRecord.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId,
        productId: stockTarget.productId,
        quantity: stockTarget.quantity,
        unit: stockTarget.unit,
        wasteReason: "devolucion_no_revendible",
        inventoryMovementId: movement.id,
        createdByUserId: currentUser.id,
      },
    });
  }

  return movement;
}

async function resolveStockTarget(
  tx: Prisma.TransactionClient,
  organizationId: string,
  productId: string,
  quantity: string,
) {
  const product = await tx.product.findFirstOrThrow({
    where: { id: productId, organizationId },
    include: { productPackageConfigProduct: true },
  });
  if (product.productType === "package") {
    const baseProductId = product.productPackageConfigProduct?.baseProductId;
    if (!baseProductId) {
      throw new DomainError(400, "PRODUCT_NOT_STOCK_TRACKED", "Paquete sin producto base.");
    }
    const base = await tx.product.findFirstOrThrow({ where: { id: baseProductId, organizationId } });
    return {
      productId: baseProductId,
      quantity: ((toMillis(quantity) / 1000) * Number(product.productPackageConfigProduct?.packageWeightGrams ?? 0) / 1000).toFixed(3),
      unit: base.unit,
    };
  }
  return { productId: product.id, quantity, unit: product.unit };
}

async function calculateExpectedCash(
  organizationId: string,
  branchId: string,
  driverId: string | null,
  routeId: string | null,
) {
  const payments = await prisma.deliveryPayment.findMany({
    where: {
      organizationId,
      branchId,
      driverId: driverId ?? undefined,
      paymentMethod: "cash",
      status: "completed",
      deliverySettlementId: null,
      deliveryOrder: {
        routeId: routeId ?? undefined,
      },
    },
  });
  const total = payments.reduce((sum, payment) => sum + toCents(payment.amount), 0);
  return centsToMoney(total);
}

async function resolveDeliveryPrice(
  tx: Prisma.TransactionClient,
  organizationId: string,
  branchId: string,
  customerId: string,
  productId: string,
) {
  const product = await tx.product.findFirstOrThrow({
    where: { id: productId, organizationId },
  });
  const saleMode = product.productType === "package" ? "by_package" : product.unit === "piece" ? "by_unit" : "by_kg";

  const customerPrice = await tx.customerProductPrice.findFirst({
    where: {
      organizationId,
      branchId,
      customerId,
      productId,
      saleMode,
      status: "active",
      activeTo: null,
    },
    orderBy: { activeFrom: "desc" },
  });

  if (customerPrice) {
    return { price: normalizeMoney(customerPrice.price), priceSource: "customer" as const };
  }

  const globalCustomerPrice = await tx.customerProductPrice.findFirst({
    where: {
      organizationId,
      branchId: null,
      customerId,
      productId,
      saleMode,
      status: "active",
      activeTo: null,
    },
    orderBy: { activeFrom: "desc" },
  });

  if (globalCustomerPrice) {
    return { price: normalizeMoney(globalCustomerPrice.price), priceSource: "customer" as const };
  }

  const price = await tx.branchProductPrice.findFirst({
    where: { organizationId, branchId, productId, saleMode, status: "active", activeTo: null },
    orderBy: { activeFrom: "desc" },
  });
  if (!price) {
    throw new DomainError(400, "PRICE_NOT_FOUND", "Precio no configurado.");
  }
  return { price: normalizeMoney(price.price), priceSource: "branch" as const };
}

async function getOrderOrThrow(organizationId: string, orderId: string) {
  const order = await prisma.deliveryOrder.findFirst({
    where: { id: orderId, organizationId },
  });
  if (!order) {
    throw new DomainError(404, "DELIVERY_ORDER_NOT_FOUND", "Pedido de reparto no encontrado.");
  }
  return order;
}

async function getRouteOrThrow(organizationId: string, routeId: string) {
  const route = await prisma.deliveryRoute.findFirst({ where: { id: routeId, organizationId, status: "active" } });
  if (!route) {
    throw new DomainError(404, "DELIVERY_ROUTE_NOT_FOUND", "Ruta no encontrada.");
  }
  return route;
}

async function getSettlementOrThrow(organizationId: string, settlementId: string) {
  const settlement = await prisma.deliverySettlement.findFirst({ where: { id: settlementId, organizationId } });
  if (!settlement) {
    throw new DomainError(404, "DELIVERY_SETTLEMENT_NOT_FOUND", "Liquidacion no encontrada.");
  }
  return settlement;
}

async function assertDriver(organizationId: string, driverId: string) {
  const driver = await prisma.deliveryDriver.findFirst({ where: { id: driverId, organizationId, status: "active" } });
  if (!driver) {
    throw new DomainError(404, "DELIVERY_DRIVER_NOT_FOUND", "Repartidor no encontrado.");
  }
}

async function assertCustomer(organizationId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, organizationId, status: "active" } });
  if (!customer) {
    throw new DomainError(404, "CUSTOMER_NOT_FOUND", "Cliente no encontrado.");
  }
}

async function audit(
  tx: Prisma.TransactionClient,
  currentUser: AuthenticatedUser,
  branchId: string,
  action: string,
  entityType: string,
  entityId: string,
  afterSnapshot: unknown,
) {
  await tx.auditLog.create({
    data: {
      organizationId: currentUser.organizationId,
      branchId,
      userId: currentUser.id,
      action,
      entityType,
      entityId,
      afterSnapshot: afterSnapshot as Prisma.InputJsonValue,
    },
  });
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
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new DomainError(400, "INVALID_REQUEST", "Campo string invalido.");
  return value.trim();
}

function optionalNumber(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  const number = Number(value);
  if (!Number.isInteger(number)) throw new DomainError(400, "INVALID_REQUEST", "Numero invalido.");
  return number;
}

function asEnum<T extends readonly string[]>(value: unknown, field: string, values: T): T[number] {
  if (typeof value !== "string" || !values.includes(value)) {
    throw new DomainError(400, "INVALID_REQUEST", `Valor invalido: ${field}.`);
  }
  return value as T[number];
}

function asMoney(value: unknown, field: string): string {
  if (typeof value !== "number" && typeof value !== "string") {
    throw new DomainError(400, "INVALID_REQUEST", `Campo requerido: ${field}.`);
  }
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw new DomainError(400, "INVALID_REQUEST", `Monto invalido: ${field}.`);
  return amount.toFixed(2);
}

function asQuantity(value: unknown, field: string): string {
  if (typeof value !== "number" && typeof value !== "string") {
    throw new DomainError(400, "INVALID_REQUEST", `Campo requerido: ${field}.`);
  }
  const quantity = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(quantity) || quantity <= 0) throw new DomainError(400, "INVALID_REQUEST", `Cantidad invalida: ${field}.`);
  return quantity.toFixed(3);
}

function asOrderItems(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) throw new DomainError(400, "INVALID_REQUEST", "Items requeridos.");
  return value.map((item) => {
    const body = asRecord(item);
    return { productId: asString(body.productId, "items.productId"), quantity: asQuantity(body.quantity, "items.quantity") };
  });
}

function asRouteCustomerOrder(value: unknown) {
  if (!Array.isArray(value)) {
    throw new DomainError(400, "INVALID_REQUEST", "Clientes requeridos.");
  }

  return value.map((item) => {
    const body = asRecord(item);
    return {
      customerId: asString(body.customerId, "customers.customerId"),
      sortOrder: optionalNumber(body.sortOrder) ?? 0,
    };
  });
}

function asDeliveredItems(value: unknown) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new DomainError(400, "INVALID_REQUEST", "Items invalidos.");
  return value.map((item) => {
    const body = asRecord(item);
    return {
      deliveryOrderItemId: asString(body.deliveryOrderItemId, "items.deliveryOrderItemId"),
      quantity: asQuantity(body.quantity, "items.quantity"),
    };
  });
}

function asReturnItems(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) throw new DomainError(400, "INVALID_REQUEST", "Items requeridos.");
  return value.map((item) => {
    const body = asRecord(item);
    return {
      productId: asString(body.productId, "items.productId"),
      quantity: asQuantity(body.quantity, "items.quantity"),
      condition: asEnum(body.condition ?? "review_required", "items.condition", inventoryConditions),
    };
  });
}

function multiplyMoney(price: string, quantity: string) {
  return ((toCents(price) * toMillis(quantity)) / 1000 / 100).toFixed(2);
}

function addMoney(left: Prisma.Decimal | string | number, right: Prisma.Decimal | string | number) {
  return centsToMoney(toCents(left) + toCents(right));
}

function subtractMoney(left: Prisma.Decimal | string | number, right: Prisma.Decimal | string | number) {
  return centsToMoney(toCents(left) - toCents(right));
}

function addQuantity(left: Prisma.Decimal | string | number, right: Prisma.Decimal | string | number) {
  return ((toMillis(left) + toMillis(right)) / 1000).toFixed(3);
}

function subtractQuantity(left: Prisma.Decimal | string | number, right: Prisma.Decimal | string | number) {
  return ((toMillis(left) - toMillis(right)) / 1000).toFixed(3);
}

function centsToMoney(cents: number) {
  return (cents / 100).toFixed(2);
}

function toCents(value: Prisma.Decimal | string | number) {
  return Math.round(Number(value) * 100);
}

function toMillis(value: Prisma.Decimal | string | number) {
  return Math.round(Number(value) * 1000);
}

function normalizeMoney(value: Prisma.Decimal | string | number) {
  return Number(value).toFixed(2);
}

function normalizeQuantity(value: Prisma.Decimal | string | number) {
  return Number(value).toFixed(3);
}

function serializeDriver(driver: { id: string; organizationId: string; name: string; phone: string | null; status: string; notes: string | null }) {
  return { id: driver.id, organizationId: driver.organizationId, name: driver.name, phone: driver.phone, status: driver.status, notes: driver.notes };
}

function serializeRoute(route: {
  id: string;
  organizationId: string;
  branchId: string;
  driverId: string | null;
  name: string;
  status: string;
  driver?: { id: string; name: string } | null;
  deliveryRouteCustomerRoute?: Array<{
    id?: string;
    customerId: string;
    sortOrder: number;
    customer?: {
      id: string;
      name: string;
      customerType: string;
      phone: string | null;
      creditEnabled: boolean;
      creditLimit: Prisma.Decimal;
      currentBalance: Prisma.Decimal;
      status: string;
    };
  }>;
}) {
  return {
    id: route.id,
    organizationId: route.organizationId,
    branchId: route.branchId,
    driverId: route.driverId,
    driver: route.driver ? { id: route.driver.id, name: route.driver.name } : null,
    name: route.name,
    status: route.status,
    customers: (route.deliveryRouteCustomerRoute ?? []).map((assignment) => ({
      id: assignment.id,
      customerId: assignment.customerId,
      sortOrder: assignment.sortOrder,
      customer: assignment.customer
        ? {
            id: assignment.customer.id,
            name: assignment.customer.name,
            customerType: assignment.customer.customerType,
            phone: assignment.customer.phone,
            creditEnabled: assignment.customer.creditEnabled,
            creditLimit: normalizeMoney(assignment.customer.creditLimit),
            currentBalance: normalizeMoney(assignment.customer.currentBalance),
            status: assignment.customer.status,
          }
        : null,
    })),
  };
}

function serializeOrder(order: {
  id: string;
  organizationId: string;
  branchId: string;
  routeId: string | null;
  driverId: string | null;
  customerId: string;
  status: string;
  total: Prisma.Decimal;
  amountCollected: Prisma.Decimal;
  amountPending: Prisma.Decimal;
  customer?: { id: string; name: string } | null;
  deliveryOrderItemDeliveryOrder?: Array<{
    id: string;
    productId: string;
    quantityLoaded: Prisma.Decimal;
    quantityDelivered: Prisma.Decimal;
    quantityReturned: Prisma.Decimal;
    unitPrice: Prisma.Decimal;
    total: Prisma.Decimal;
    product?: { id: string; name: string; sku: string | null } | null;
  }>;
}) {
  return {
    id: order.id,
    organizationId: order.organizationId,
    branchId: order.branchId,
    routeId: order.routeId,
    driverId: order.driverId,
    customerId: order.customerId,
    customer: order.customer ? { id: order.customer.id, name: order.customer.name } : null,
    status: order.status,
    total: normalizeMoney(order.total),
    amountCollected: normalizeMoney(order.amountCollected),
    amountPending: normalizeMoney(order.amountPending),
    items: order.deliveryOrderItemDeliveryOrder?.map((item) => ({
      id: item.id,
      productId: item.productId,
      product: item.product ? { id: item.product.id, name: item.product.name, sku: item.product.sku } : null,
      quantityLoaded: normalizeQuantity(item.quantityLoaded),
      quantityDelivered: normalizeQuantity(item.quantityDelivered),
      quantityReturned: normalizeQuantity(item.quantityReturned),
      unitPrice: normalizeMoney(item.unitPrice),
      total: normalizeMoney(item.total),
    })) ?? [],
  };
}

function serializeDeliveryPayment(payment: {
  id: string;
  organizationId: string;
  branchId: string;
  deliveryOrderId: string;
  driverId: string | null;
  customerId: string;
  deliverySettlementId?: string | null;
  amount: Prisma.Decimal;
  reference?: string | null;
  provider?: string | null;
  paymentMethod: string;
  status: string;
  settledAt?: Date | null;
}) {
  return {
    id: payment.id,
    organizationId: payment.organizationId,
    branchId: payment.branchId,
    deliveryOrderId: payment.deliveryOrderId,
    driverId: payment.driverId,
    customerId: payment.customerId,
    deliverySettlementId: payment.deliverySettlementId ?? null,
    amount: normalizeMoney(payment.amount),
    reference: payment.reference ?? null,
    provider: payment.provider ?? null,
    paymentMethod: payment.paymentMethod,
    status: payment.status,
    settledAt: payment.settledAt ?? null,
  };
}

function serializeDeliveryReturn(deliveryReturn: {
  id: string;
  organizationId: string;
  branchId: string;
  deliveryOrderId: string;
  driverId: string | null;
  status: string;
  reviewedByUserId: string | null;
  reviewedAt: Date | null;
  deliveryReturnItemDeliveryReturn?: Array<{
    id: string;
    productId: string;
    quantity: Prisma.Decimal;
    condition: string;
    inventoryMovementId: string | null;
  }>;
}) {
  return {
    id: deliveryReturn.id,
    organizationId: deliveryReturn.organizationId,
    branchId: deliveryReturn.branchId,
    deliveryOrderId: deliveryReturn.deliveryOrderId,
    driverId: deliveryReturn.driverId,
    status: deliveryReturn.status,
    reviewedByUserId: deliveryReturn.reviewedByUserId,
    reviewedAt: deliveryReturn.reviewedAt,
    items: deliveryReturn.deliveryReturnItemDeliveryReturn?.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: normalizeQuantity(item.quantity),
      condition: item.condition,
      inventoryMovementId: item.inventoryMovementId,
    })) ?? [],
  };
}

function serializeSettlement(settlement: {
  id: string;
  organizationId: string;
  branchId: string;
  driverId: string | null;
  routeId: string | null;
  status: string;
  expectedCashAmount: Prisma.Decimal;
  deliveredCashAmount: Prisma.Decimal;
  differenceAmount: Prisma.Decimal;
  receivedByUserId: string | null;
  cashSessionId: string | null;
  cashMovementId?: string | null;
}) {
  return {
    id: settlement.id,
    organizationId: settlement.organizationId,
    branchId: settlement.branchId,
    driverId: settlement.driverId,
    routeId: settlement.routeId,
    status: settlement.status,
    expectedCashAmount: normalizeMoney(settlement.expectedCashAmount),
    deliveredCashAmount: normalizeMoney(settlement.deliveredCashAmount),
    differenceAmount: normalizeMoney(settlement.differenceAmount),
    receivedByUserId: settlement.receivedByUserId,
    cashSessionId: settlement.cashSessionId,
    cashMovementId: settlement.cashMovementId ?? null,
  };
}

function serializeInventoryMovement(movement: {
  id: string;
  organizationId: string;
  branchId: string;
  productId: string;
  movementType: string;
  quantity: Prisma.Decimal;
  unit: string;
}) {
  return {
    id: movement.id,
    organizationId: movement.organizationId,
    branchId: movement.branchId,
    productId: movement.productId,
    movementType: movement.movementType,
    quantity: normalizeQuantity(movement.quantity),
    unit: movement.unit,
  };
}
