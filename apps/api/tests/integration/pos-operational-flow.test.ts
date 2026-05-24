import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../../src/lib/prisma.js";
import type { AuthenticatedUser } from "../../src/services/auth-service.js";
import { login } from "../../src/services/auth-service.js";
import { getCashSessionSummary, getOpenCashSession, openCashSession } from "../../src/services/cash-service.js";
import { configureCustomerCredit, createCustomer, setCustomerPrice } from "../../src/services/customer-service.js";
import {
  assignCustomerToRoute,
  closeDeliverySettlement,
  createDeliveryDriver,
  createDeliveryOrder,
  createDeliveryRoute,
  depositSettlementToCash,
  deliverDeliveryOrder,
  loadDeliveryOrder,
  markDeliveryOrderInRoute,
  prepareDeliveryOrder,
  recordDeliveryPayment,
  createDeliverySettlement,
} from "../../src/services/delivery-service.js";
import { addSaleItem, completeSale, createSale, quoteSale } from "../../src/services/sale-service.js";
import { DomainError } from "../../src/lib/domain-error.js";

type LoginResult = Awaited<ReturnType<typeof login>>;

function asAuthenticatedUser(session: LoginResult): AuthenticatedUser {
  assert.ok(session.user.organizationId, "demo user must have an organization");
  return {
    id: session.user.id,
    organizationId: session.user.organizationId,
    email: session.user.email,
  };
}

function firstBranchId(session: LoginResult): string {
  const branchId = session.user.branches[0]?.branchId;
  assert.ok(branchId, "demo user must have a branch assignment");
  return branchId;
}

function moneyDelta(after: string | number, before: string | number) {
  return Number((Number(after) - Number(before)).toFixed(2));
}

function quantityDelta(after: unknown, before: unknown) {
  return Number((Number(after) - Number(before)).toFixed(3));
}

test("POS completes customer sale with special price, mixed cash/credit, cash summary and inventory", async () => {
  const managerSession = await login({ email: "manager.demo@tortillaplus.mx", password: "Demo1234!" });
  const cashierSession = await login({ email: "cashier.demo@tortillaplus.mx", password: "Demo1234!" });
  const manager = asAuthenticatedUser(managerSession);
  const cashier = asAuthenticatedUser(cashierSession);
  const branchId = firstBranchId(cashierSession);

  let cashSession = (await getOpenCashSession(cashier, branchId)).data;
  if (!cashSession) {
    cashSession = (await openCashSession(cashier, {
      branchId,
      openingAmountCounted: "500.00",
      openingNote: "Integration POS smoke test",
    })).data;
  }

  const beforeSummary = (await getCashSessionSummary(cashier, cashSession.id)).data;
  const tortilla = await prisma.product.findFirstOrThrow({
    where: { organizationId: cashier.organizationId, sku: "TORTILLA-KG" },
  });
  const package800 = await prisma.product.findFirstOrThrow({
    where: { organizationId: cashier.organizationId, sku: "PAQUETE-800G" },
  });
  const beforeTortillaStock = await prisma.inventoryStock.findUniqueOrThrow({
    where: { branchId_productId: { branchId, productId: tortilla.id } },
  });

  const customer = (await createCustomer(manager, {
    name: `Cliente Integracion POS ${Date.now()}`,
    customerType: "cliente_frecuente",
    creditEnabled: true,
    creditLimit: "100.00",
  })).data;
  await configureCustomerCredit(manager, customer.id, {
    creditEnabled: true,
    creditLimit: "100.00",
  });
  await setCustomerPrice(manager, customer.id, {
    branchId,
    productId: tortilla.id,
    saleMode: "by_kg",
    price: "20.00",
  });

  const quote = (await quoteSale(cashier, {
    branchId,
    customerId: customer.id,
    items: [
      { productId: tortilla.id, saleMode: "by_kg", quantity: "1.000" },
      { productId: package800.id, saleMode: "by_package", quantity: "1.000" },
    ],
  })).data;

  assert.equal(quote.total, "40.00");
  assert.equal(quote.items[0]?.priceSource, "customer");

  const sale = (await createSale(cashier, {
    branchId,
    customerId: customer.id,
    clientGeneratedId: `integration-pos-${Date.now()}`,
  })).data;
  const saleWithTortilla = (await addSaleItem(cashier, sale.id, {
    productId: tortilla.id,
    saleMode: "by_kg",
    quantity: "1.000",
  })).data;
  const saleWithPackage = (await addSaleItem(cashier, sale.id, {
    productId: package800.id,
    saleMode: "by_package",
    quantity: "1.000",
  })).data;

  assert.equal(saleWithTortilla.items[0]?.unitPrice, "20.00");
  assert.equal(saleWithPackage.total, "40.00");

  const completed = (await completeSale(cashier, sale.id, {
    payments: [
      { paymentMethod: "cash", amount: "25.00" },
      { paymentMethod: "credit", amount: "15.00" },
    ],
  }, `integration-pos-complete-${sale.id}`)).data;

  assert.equal(completed.status, "completed");
  assert.equal(completed.payments.length, 2);
  assert.equal(completed.payments.some((payment) => payment.paymentMethod === "cash" && payment.amount === "25.00"), true);
  assert.equal(completed.payments.some((payment) => payment.paymentMethod === "credit" && payment.amount === "15.00"), true);

  const afterSummary = (await getCashSessionSummary(cashier, cashSession.id)).data;
  assert.equal(moneyDelta(afterSummary.sales.cash, beforeSummary.sales.cash), 25);
  assert.equal(moneyDelta(afterSummary.sales.credit, beforeSummary.sales.credit), 15);
  assert.equal(moneyDelta(afterSummary.expectedCashAmount, beforeSummary.expectedCashAmount), 25);

  const afterCustomer = await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } });
  assert.equal(Number(afterCustomer.currentBalance).toFixed(2), "15.00");

  const afterTortillaStock = await prisma.inventoryStock.findUniqueOrThrow({
    where: { branchId_productId: { branchId, productId: tortilla.id } },
  });
  assert.equal(quantityDelta(afterTortillaStock.quantity, beforeTortillaStock.quantity), -1.8);

});

test("POS inventory rules allow tortilla and masa negative stock but block retail negative stock", async () => {
  const managerSession = await login({ email: "manager.demo@tortillaplus.mx", password: "Demo1234!" });
  const cashierSession = await login({ email: "cashier.demo@tortillaplus.mx", password: "Demo1234!" });
  const manager = asAuthenticatedUser(managerSession);
  const cashier = asAuthenticatedUser(cashierSession);
  const branchId = firstBranchId(cashierSession);
  let cashSession = (await getOpenCashSession(cashier, branchId)).data;
  if (!cashSession) {
    cashSession = (await openCashSession(cashier, {
      branchId,
      openingAmountCounted: "500.00",
      openingNote: "Integration inventory smoke test",
    })).data;
  }

  const tortilla = await prisma.product.findFirstOrThrow({ where: { organizationId: cashier.organizationId, sku: "TORTILLA-KG" } });
  const masa = await prisma.product.findFirstOrThrow({ where: { organizationId: cashier.organizationId, sku: "MASA-KG" } });
  const retail = await prisma.product.findFirstOrThrow({ where: { organizationId: cashier.organizationId, sku: "SALSA-250" } });
  const products = [tortilla, masa, retail];
  const originalStocks = new Map<string, string>();

  for (const product of products) {
    const existingStock = await prisma.inventoryStock.findUnique({
      where: { branchId_productId: { branchId, productId: product.id } },
    });
    originalStocks.set(product.id, existingStock ? Number(existingStock.quantity).toFixed(3) : "0.000");

    await prisma.inventoryStock.upsert({
      where: { branchId_productId: { branchId, productId: product.id } },
      update: { quantity: "0.000" },
      create: {
        organizationId: cashier.organizationId,
        branchId,
        productId: product.id,
        quantity: "0.000",
        reservedQuantity: "0.000",
        minimumQuantity: "0.000",
      },
    });
  }

  try {
    const tortillaSale = (await createSale(cashier, { branchId, clientGeneratedId: `integration-neg-tortilla-${Date.now()}` })).data;
    await addSaleItem(cashier, tortillaSale.id, { productId: tortilla.id, saleMode: "by_kg", quantity: "1.000" });
    await completeSale(cashier, tortillaSale.id, {
      payments: [{ paymentMethod: "cash", amount: "24.00" }],
    }, `integration-neg-tortilla-complete-${tortillaSale.id}`);

    const masaSale = (await createSale(cashier, { branchId, clientGeneratedId: `integration-neg-masa-${Date.now()}` })).data;
    await addSaleItem(cashier, masaSale.id, { productId: masa.id, saleMode: "by_kg", quantity: "1.000" });
    await completeSale(cashier, masaSale.id, {
      payments: [{ paymentMethod: "cash", amount: "18.00" }],
    }, `integration-neg-masa-complete-${masaSale.id}`);

    const tortillaStock = await prisma.inventoryStock.findUniqueOrThrow({ where: { branchId_productId: { branchId, productId: tortilla.id } } });
    const masaStock = await prisma.inventoryStock.findUniqueOrThrow({ where: { branchId_productId: { branchId, productId: masa.id } } });
    assert.equal(Number(tortillaStock.quantity).toFixed(3), "-1.000");
    assert.equal(Number(masaStock.quantity).toFixed(3), "-1.000");

    const negativeAudits = await prisma.auditLog.count({
      where: {
        organizationId: cashier.organizationId,
        branchId,
        action: "negative_stock_sale_allowed",
        OR: [
          { afterSnapshot: { path: ["productId"], equals: tortilla.id } },
          { afterSnapshot: { path: ["productId"], equals: masa.id } },
        ],
      },
    });
    assert.equal(negativeAudits >= 2, true);

    const retailSale = (await createSale(cashier, { branchId, clientGeneratedId: `integration-neg-retail-${Date.now()}` })).data;
    await addSaleItem(cashier, retailSale.id, { productId: retail.id, saleMode: "by_unit", quantity: "1.000" });
    await assert.rejects(
      () => completeSale(cashier, retailSale.id, {
        payments: [{ paymentMethod: "cash", amount: "15.00" }],
      }, `integration-neg-retail-complete-${retailSale.id}`),
      (error) => error instanceof DomainError && error.code === "NEGATIVE_STOCK_NOT_ALLOWED",
    );
  } finally {
    for (const product of products) {
      await prisma.inventoryStock.update({
        where: { branchId_productId: { branchId, productId: product.id } },
        data: { quantity: originalStocks.get(product.id) ?? "0.000" },
      });
    }
  }
});

test("delivery route completes order, partial return, cash payment, settlement deposit and duplicate block", async () => {
  const managerSession = await login({ email: "manager.demo@tortillaplus.mx", password: "Demo1234!" });
  const manager = asAuthenticatedUser(managerSession);
  const branchId = firstBranchId(managerSession);
  let cashSession = (await getOpenCashSession(manager, branchId)).data;
  if (!cashSession) {
    cashSession = (await openCashSession(manager, {
      branchId,
      openingAmountCounted: "500.00",
      openingNote: "Integration route smoke test",
    })).data;
  }

  const tortilla = await prisma.product.findFirstOrThrow({ where: { organizationId: manager.organizationId, sku: "TORTILLA-KG" } });
  const beforeStock = await prisma.inventoryStock.upsert({
    where: { branchId_productId: { branchId, productId: tortilla.id } },
    update: { quantity: "100.000" },
    create: {
      organizationId: manager.organizationId,
      branchId,
      productId: tortilla.id,
      quantity: "100.000",
      reservedQuantity: "0.000",
      minimumQuantity: "0.000",
    },
  });
  const beforeSummary = (await getCashSessionSummary(manager, cashSession.id)).data;
  const suffix = Date.now();
  const driver = (await createDeliveryDriver(manager, {
    name: `Repartidor Integracion ${suffix}`,
    phone: "5551234567",
  })).data;
  const route = (await createDeliveryRoute(manager, {
    branchId,
    driverId: driver.id,
    name: `Ruta Integracion ${suffix}`,
  })).data;
  const customer = (await createCustomer(manager, {
    name: `Cliente Ruta Integracion ${suffix}`,
    customerType: "tienda",
    creditEnabled: true,
    creditLimit: "500.00",
  })).data;

  await assignCustomerToRoute(manager, route.id, { customerId: customer.id, sortOrder: 1 });

  const order = (await createDeliveryOrder(manager, {
    branchId,
    routeId: route.id,
    driverId: driver.id,
    customerId: customer.id,
    items: [{ productId: tortilla.id, quantity: "2.000" }],
  }, `integration-route-order-${suffix}`)).data;
  assert.equal(order.total, "48.00");

  const prepared = (await prepareDeliveryOrder(manager, order.id)).data;
  assert.equal(prepared.status, "prepared");
  const loaded = (await loadDeliveryOrder(manager, order.id)).data;
  assert.equal(loaded.status, "loaded");

  const afterLoadStock = await prisma.inventoryStock.findUniqueOrThrow({ where: { branchId_productId: { branchId, productId: tortilla.id } } });
  assert.equal(quantityDelta(afterLoadStock.quantity, beforeStock.quantity), -2);

  const inRoute = (await markDeliveryOrderInRoute(manager, order.id)).data;
  assert.equal(inRoute.status, "in_route");
  const delivered = (await deliverDeliveryOrder(manager, order.id, {
    items: [{ deliveryOrderItemId: order.items[0]?.id, quantity: "1.500" }],
  })).data;
  assert.equal(delivered.status, "delivered");
  assert.equal(delivered.items[0]?.quantityReturned, "0.500");

  const pendingReturn = await prisma.deliveryReturn.findFirst({
    where: { organizationId: manager.organizationId, deliveryOrderId: order.id, status: "pending_review" },
    include: { deliveryReturnItemDeliveryReturn: true },
  });
  assert.ok(pendingReturn);
  assert.equal(Number(pendingReturn.deliveryReturnItemDeliveryReturn[0]?.quantity).toFixed(3), "0.500");

  const paid = (await recordDeliveryPayment(manager, order.id, {
    amount: "48.00",
    paymentMethod: "cash",
  }, `integration-route-payment-${order.id}`)).data;
  assert.equal(paid.order.status, "paid");

  const settlement = (await createDeliverySettlement(manager, {
    branchId,
    routeId: route.id,
    driverId: driver.id,
  })).data;
  const closed = (await closeDeliverySettlement(manager, settlement.id, { deliveredCashAmount: "48.00" })).data;
  assert.equal(closed.status, "closed");
  assert.equal(closed.expectedCashAmount, "48.00");
  assert.equal(closed.differenceAmount, "0.00");

  const deposited = (await depositSettlementToCash(manager, closed.id, `integration-route-deposit-${closed.id}`)).data;
  assert.ok(deposited.cashMovementId);
  const afterSummary = (await getCashSessionSummary(manager, cashSession.id)).data;
  assert.equal(moneyDelta(afterSummary.cashInTotal, beforeSummary.cashInTotal), 48);
  assert.equal(moneyDelta(afterSummary.expectedCashAmount, beforeSummary.expectedCashAmount), 48);

  await assert.rejects(
    () => depositSettlementToCash(manager, closed.id, `integration-route-deposit-duplicate-${closed.id}`),
    (error) => error instanceof DomainError && error.code === "SETTLEMENT_ALREADY_DEPOSITED",
  );
});
