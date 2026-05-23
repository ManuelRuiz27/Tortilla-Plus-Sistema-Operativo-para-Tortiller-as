import { Prisma } from "@prisma/client";

import { DomainError } from "../lib/domain-error.js";
import { prisma } from "../lib/prisma.js";
import type { AuthenticatedUser } from "./auth-service.js";
import { assertBranchAccess, assertPermission } from "./permission-service.js";
import { assertFeatureAvailable } from "./subscription-service.js";

const customerTypes = [
  "tienda",
  "puesto",
  "comedor",
  "repartidor",
  "cliente_frecuente",
  "empresa",
  "otro",
] as const;
const saleModes = ["by_kg", "by_amount", "by_package", "by_unit"] as const;

export async function listCustomers(currentUser: AuthenticatedUser) {
  await assertPermission(currentUser.id, "customers.view");

  const customers = await prisma.customer.findMany({
    where: {
      organizationId: currentUser.organizationId,
    },
    orderBy: {
      name: "asc",
    },
  });

  return { data: customers.map(serializeCustomer) };
}

export async function createCustomer(currentUser: AuthenticatedUser, input: unknown) {
  await assertPermission(currentUser.id, "customers.manage");
  const body = asRecord(input);
  const name = asString(body.name, "name");
  const customerType = optionalEnum(body.customerType, "customerType", customerTypes) ?? "cliente_frecuente";

  const customer = await prisma.customer.create({
    data: {
      organizationId: currentUser.organizationId,
      name,
      customerType,
      phone: optionalString(body.phone),
      email: optionalString(body.email),
      taxId: optionalString(body.taxId),
      notes: optionalString(body.notes),
      creditEnabled: optionalBoolean(body.creditEnabled) ?? false,
      creditLimit: optionalMoney(body.creditLimit) ?? "0.00",
      currentBalance: "0.00",
      status: "active",
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: currentUser.organizationId,
      userId: currentUser.id,
      action: "customer_created",
      entityType: "customer",
      entityId: customer.id,
      afterSnapshot: serializeCustomer(customer),
    },
  });

  return { data: serializeCustomer(customer) };
}

export async function updateCustomer(currentUser: AuthenticatedUser, customerId: string, input: unknown) {
  await assertPermission(currentUser.id, "customers.manage");
  const body = asRecord(input);
  const existing = await getCustomerOrThrow(currentUser.organizationId, customerId);

  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: {
      name: optionalString(body.name) ?? existing.name,
      customerType: optionalEnum(body.customerType, "customerType", customerTypes) ?? existing.customerType,
      phone: optionalString(body.phone) ?? existing.phone,
      email: optionalString(body.email) ?? existing.email,
      taxId: optionalString(body.taxId) ?? existing.taxId,
      notes: optionalString(body.notes) ?? existing.notes,
      status: optionalEnum(body.status, "status", ["active", "inactive", "deleted"] as const) ?? existing.status,
      updatedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: currentUser.organizationId,
      userId: currentUser.id,
      action: "customer_updated",
      entityType: "customer",
      entityId: customer.id,
      beforeSnapshot: serializeCustomer(existing),
      afterSnapshot: serializeCustomer(customer),
    },
  });

  return { data: serializeCustomer(customer) };
}

export async function configureCustomerCredit(
  currentUser: AuthenticatedUser,
  customerId: string,
  input: unknown,
) {
  await assertFeatureAvailable(currentUser, "customer_credit");
  await assertPermission(currentUser.id, "customers.manage");
  const body = asRecord(input);
  const existing = await getCustomerOrThrow(currentUser.organizationId, customerId);
  const creditEnabled = optionalBoolean(body.creditEnabled) ?? existing.creditEnabled;
  const creditLimit = optionalMoney(body.creditLimit) ?? normalizeMoney(existing.creditLimit);

  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: {
      creditEnabled,
      creditLimit,
      updatedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: currentUser.organizationId,
      userId: currentUser.id,
      action: "customer_credit_changed",
      entityType: "customer",
      entityId: customer.id,
      beforeSnapshot: {
        creditEnabled: existing.creditEnabled,
        creditLimit: normalizeMoney(existing.creditLimit),
      },
      afterSnapshot: {
        creditEnabled: customer.creditEnabled,
        creditLimit: normalizeMoney(customer.creditLimit),
      },
    },
  });

  return { data: serializeCustomer(customer) };
}

export async function setCustomerPrice(currentUser: AuthenticatedUser, customerId: string, input: unknown) {
  await assertPermission(currentUser.id, "customers.manage");
  const body = asRecord(input);
  const productId = asString(body.productId, "productId");
  const branchId = optionalString(body.branchId);
  const saleMode = asEnum(body.saleMode, "saleMode", saleModes);
  const price = asMoney(body.price, "price");

  await getCustomerOrThrow(currentUser.organizationId, customerId);
  await assertProduct(currentUser.organizationId, productId);

  if (branchId) {
    await assertBranchAccess(currentUser, branchId);
  }

  return prisma.$transaction(async (tx) => {
    await tx.customerProductPrice.updateMany({
      where: {
        organizationId: currentUser.organizationId,
        customerId,
        productId,
        branchId,
        saleMode,
        status: "active",
        activeTo: null,
      },
      data: {
        status: "inactive",
        activeTo: new Date(),
        updatedAt: new Date(),
      },
    });

    const customerPrice = await tx.customerProductPrice.create({
      data: {
        organizationId: currentUser.organizationId,
        customerId,
        productId,
        branchId,
        saleMode,
        price,
        activeFrom: new Date(),
        status: "active",
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId,
        userId: currentUser.id,
        action: "customer_price_changed",
        entityType: "customer_product_price",
        entityId: customerPrice.id,
        afterSnapshot: serializeCustomerPrice(customerPrice),
      },
    });

    return { data: serializeCustomerPrice(customerPrice) };
  });
}

export async function getCustomerBalance(currentUser: AuthenticatedUser, customerId: string) {
  await assertPermission(currentUser.id, "customers.view");
  const customer = await getCustomerOrThrow(currentUser.organizationId, customerId);
  const movements = await prisma.customerBalanceMovement.findMany({
    where: {
      organizationId: currentUser.organizationId,
      customerId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  return {
    data: {
      customer: serializeCustomer(customer),
      currentBalance: normalizeMoney(customer.currentBalance),
      movements: movements.map(serializeCustomerBalanceMovement),
    },
  };
}

async function getCustomerOrThrow(organizationId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      organizationId,
    },
  });

  if (!customer) {
    throw new DomainError(404, "CUSTOMER_NOT_FOUND", "Cliente no encontrado.");
  }

  return customer;
}

async function assertProduct(organizationId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      organizationId,
      status: "active",
    },
  });

  if (!product) {
    throw new DomainError(404, "PRODUCT_NOT_FOUND", "Producto no encontrado.");
  }
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

function optionalBoolean(value: unknown): boolean | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "boolean") {
    throw new DomainError(400, "INVALID_REQUEST", "Campo boolean invalido.");
  }

  return value;
}

function asEnum<T extends readonly string[]>(value: unknown, field: string, values: T): T[number] {
  if (typeof value !== "string" || !values.includes(value)) {
    throw new DomainError(400, "INVALID_REQUEST", `Valor invalido: ${field}.`);
  }

  return value as T[number];
}

function optionalEnum<T extends readonly string[]>(
  value: unknown,
  field: string,
  values: T,
): T[number] | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return asEnum(value, field, values);
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

function optionalMoney(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return asMoney(value, "money");
}

function normalizeMoney(value: Prisma.Decimal | string | number) {
  return Number(value).toFixed(2);
}

function serializeCustomer(customer: {
  id: string;
  organizationId: string;
  name: string;
  customerType: string;
  phone: string | null;
  email: string | null;
  taxId: string | null;
  creditEnabled: boolean;
  creditLimit: Prisma.Decimal;
  currentBalance: Prisma.Decimal;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: customer.id,
    organizationId: customer.organizationId,
    name: customer.name,
    customerType: customer.customerType,
    phone: customer.phone,
    email: customer.email,
    taxId: customer.taxId,
    creditEnabled: customer.creditEnabled,
    creditLimit: normalizeMoney(customer.creditLimit),
    currentBalance: normalizeMoney(customer.currentBalance),
    status: customer.status,
    notes: customer.notes,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}

function serializeCustomerPrice(price: {
  id: string;
  organizationId: string;
  customerId: string;
  productId: string;
  branchId: string | null;
  saleMode: string;
  price: Prisma.Decimal;
  activeFrom: Date;
  activeTo: Date | null;
  status: string;
}) {
  return {
    id: price.id,
    organizationId: price.organizationId,
    customerId: price.customerId,
    productId: price.productId,
    branchId: price.branchId,
    saleMode: price.saleMode,
    price: normalizeMoney(price.price),
    activeFrom: price.activeFrom,
    activeTo: price.activeTo,
    status: price.status,
  };
}

function serializeCustomerBalanceMovement(movement: {
  id: string;
  organizationId: string;
  customerId: string;
  movementType: string;
  amount: Prisma.Decimal;
  referenceType: string | null;
  referenceId: string | null;
  createdByUserId: string;
  createdAt: Date;
}) {
  return {
    id: movement.id,
    organizationId: movement.organizationId,
    customerId: movement.customerId,
    movementType: movement.movementType,
    amount: normalizeMoney(movement.amount),
    referenceType: movement.referenceType,
    referenceId: movement.referenceId,
    createdByUserId: movement.createdByUserId,
    createdAt: movement.createdAt,
  };
}
