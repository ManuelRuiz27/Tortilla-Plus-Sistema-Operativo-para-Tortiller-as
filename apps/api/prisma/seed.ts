import { PrismaClient } from "@prisma/client";

import { hashSecret } from "../src/lib/password.js";

const prisma = new PrismaClient();

const demoPassword = "Demo1234!";
const demoPin = "1234";

async function main() {
  const freePlan = await prisma.plan.upsert({
    where: { code: "free" },
    update: {
      name: "Gratis",
      description: "Plan gratuito para operacion basica de una tortilleria.",
      status: "active",
    },
    create: {
      code: "free",
      name: "Gratis",
      description: "Plan gratuito para operacion basica de una tortilleria.",
      status: "active",
    },
  });

  const paidPlan = await prisma.plan.upsert({
    where: { code: "paid" },
    update: {
      name: "Pago",
      description: "Plan comercial con facturacion, rutas, multi-sucursal y reportes avanzados.",
      status: "active",
    },
    create: {
      code: "paid",
      name: "Pago",
      description: "Plan comercial con facturacion, rutas, multi-sucursal y reportes avanzados.",
      status: "active",
    },
  });

  const features = [
    ["pos_basic", "POS basico", null],
    ["cash_control", "Control de caja", null],
    ["inventory_basic", "Inventario basico", null],
    ["production_control", "Produccion diaria", null],
    ["customer_credit", "Credito a clientes", null],
    ["billing_cfdi", "Facturacion CFDI", null],
    ["multi_branch", "Multi-sucursal", null],
    ["delivery_routes", "Rutas de reparto", null],
    ["reconciliation", "Conciliacion de pagos", null],
    ["advanced_reports", "Reportes avanzados", null],
    ["max_users", "Maximo de usuarios", 3],
    ["max_branches", "Maximo de sucursales", 1],
    ["max_pos_devices", "Maximo de POS", 1],
  ] as const;

  for (const [code, name, limitValue] of features) {
    const feature = await prisma.feature.upsert({
      where: { code },
      update: { name },
      create: { code, name },
    });

    await prisma.planFeature.upsert({
      where: {
        planId_featureId: {
          planId: freePlan.id,
          featureId: feature.id,
        },
      },
      update: {
        enabled: ["pos_basic", "cash_control", "inventory_basic", "production_control"].includes(code),
        limitValue,
      },
      create: {
        planId: freePlan.id,
        featureId: feature.id,
        enabled: ["pos_basic", "cash_control", "inventory_basic", "production_control"].includes(code),
        limitValue,
      },
    });

    await prisma.planFeature.upsert({
      where: {
        planId_featureId: {
          planId: paidPlan.id,
          featureId: feature.id,
        },
      },
      update: {
        enabled: true,
        limitValue: null,
      },
      create: {
        planId: paidPlan.id,
        featureId: feature.id,
        enabled: true,
        limitValue: null,
      },
    });
  }

  const roles = [
    ["organization_owner", "Duenio de Organizacion", "organization"],
    ["manager", "Gerente", "organization"],
    ["supervisor", "Supervisor", "branch"],
    ["cashier", "Cajero", "branch"],
  ] as const;

  for (const [code, name, scope] of roles) {
    await prisma.role.upsert({
      where: { code },
      update: { name, scope },
      create: { code, name, scope },
    });
  }

  const permissionCodes = [
    ["sales.create", "Crear ventas"],
    ["sales.view", "Ver ventas"],
    ["sales.cancel_before_payment", "Cancelar ticket antes de pago"],
    ["sales.cancel_after_payment", "Cancelar venta cobrada"],
    ["payments.create", "Registrar pagos"],
    ["cash.open", "Abrir caja"],
    ["cash.close", "Cerrar caja"],
    ["cash.movements.view", "Ver movimientos de caja"],
    ["cash.withdraw.request", "Solicitar retiro"],
    ["cash.withdraw.authorize", "Autorizar retiro"],
    ["inventory.view", "Ver inventario"],
    ["inventory.manage", "Gestionar inventario"],
    ["production.manage", "Gestionar produccion"],
    ["products.view", "Ver productos"],
    ["products.manage", "Gestionar productos"],
    ["prices.manage", "Gestionar precios"],
    ["customers.view", "Ver clientes"],
    ["customers.manage", "Gestionar clientes"],
    ["billing.manage", "Gestionar facturacion"],
    ["routes.manage", "Gestionar rutas"],
    ["reports.basic.view", "Ver reportes basicos"],
  ] as const;

  for (const [code, name] of permissionCodes) {
    await prisma.permission.upsert({
      where: { code },
      update: { name },
      create: { code, name },
    });
  }

  const ownerRole = await prisma.role.findUniqueOrThrow({ where: { code: "organization_owner" } });
  const managerRole = await prisma.role.findUniqueOrThrow({ where: { code: "manager" } });
  const supervisorRole = await prisma.role.findUniqueOrThrow({ where: { code: "supervisor" } });
  const cashierRole = await prisma.role.findUniqueOrThrow({ where: { code: "cashier" } });
  const allPermissions = await prisma.permission.findMany();

  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: ownerRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: ownerRole.id,
        permissionId: permission.id,
      },
    });
  }

  await grantPermissions(
    managerRole.id,
    allPermissions.map((permission) => permission.code),
  );
  await grantPermissions(supervisorRole.id, [
    "sales.create",
    "sales.view",
    "sales.cancel_before_payment",
    "payments.create",
    "cash.open",
    "cash.close",
    "cash.movements.view",
    "cash.withdraw.request",
    "cash.withdraw.authorize",
    "inventory.view",
    "inventory.manage",
    "production.manage",
    "products.view",
    "prices.manage",
    "customers.view",
    "reports.basic.view",
  ]);
  await grantPermissions(cashierRole.id, [
    "sales.create",
    "sales.view",
    "sales.cancel_before_payment",
    "payments.create",
    "cash.open",
    "cash.close",
    "cash.movements.view",
    "cash.withdraw.request",
    "inventory.view",
    "products.view",
    "customers.view",
  ]);

  const organization =
    (await prisma.organization.findFirst({
      where: { contactEmail: "demo@tortillaplus.mx" },
    })) ??
    (await prisma.organization.create({
      data: {
        name: "Demo Tortilla Plus",
        legalName: "Demo Tortilla Plus S.A. de C.V.",
        contactEmail: "demo@tortillaplus.mx",
        status: "active",
      },
    }));

  const businessUnit =
    (await prisma.businessUnit.findFirst({
      where: {
        organizationId: organization.id,
        name: "Tortilleria Demo",
      },
    })) ??
    (await prisma.businessUnit.create({
      data: {
        organizationId: organization.id,
        name: "Tortilleria Demo",
        tradeName: "Tortilleria Demo",
        businessType: "tortilleria",
      },
    }));

  const branch =
    (await prisma.branch.findFirst({
      where: {
        organizationId: organization.id,
        name: "Sucursal Principal",
      },
    })) ??
    (await prisma.branch.create({
      data: {
        organizationId: organization.id,
        businessUnitId: businessUnit.id,
        name: "Sucursal Principal",
        timezone: "America/Mexico_City",
      },
    }));

  const cashReasons = [
    ["Retiro operativo", "out_", true],
    ["Compra menor", "out_", true],
    ["Ingreso manual", "in_", false],
    ["Deposito de ruta", "in_", false],
  ] as const;

  for (const [name, movementDirection, requiresAuthorization] of cashReasons) {
    await prisma.cashMovementReason.upsert({
      where: {
        organizationId_name: {
          organizationId: organization.id,
          name,
        },
      },
      update: {
        movementDirection,
        requiresAuthorization,
        status: "active",
      },
      create: {
        organizationId: organization.id,
        name,
        movementDirection,
        requiresAuthorization,
        status: "active",
      },
    });
  }

  const baseCategory = await prisma.productCategory.upsert({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name: "Tortilleria",
      },
    },
    update: {
      status: "active",
    },
    create: {
      organizationId: organization.id,
      name: "Tortilleria",
      status: "active",
    },
  });

  const retailCategory = await prisma.productCategory.upsert({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name: "Retail",
      },
    },
    update: {
      status: "active",
    },
    create: {
      organizationId: organization.id,
      name: "Retail",
      status: "active",
    },
  });

  const tortillaProduct = await prisma.product.upsert({
    where: {
      organizationId_sku: {
        organizationId: organization.id,
        sku: "TORTILLA-KG",
      },
    },
    update: {
      categoryId: baseCategory.id,
      name: "Tortilla por kilo",
      productType: "tortilla",
      unit: "kg",
      isSellable: true,
      requiresProduction: true,
      isStockTracked: true,
      status: "active",
    },
    create: {
      organizationId: organization.id,
      categoryId: baseCategory.id,
      name: "Tortilla por kilo",
      sku: "TORTILLA-KG",
      productType: "tortilla",
      unit: "kg",
      isSellable: true,
      requiresProduction: true,
      isStockTracked: true,
      status: "active",
    },
  });

  const masaProduct = await prisma.product.upsert({
    where: {
      organizationId_sku: {
        organizationId: organization.id,
        sku: "MASA-KG",
      },
    },
    update: {
      categoryId: baseCategory.id,
      name: "Masa por kilo",
      productType: "masa",
      unit: "kg",
      isSellable: true,
      requiresProduction: true,
      isStockTracked: true,
      status: "active",
    },
    create: {
      organizationId: organization.id,
      categoryId: baseCategory.id,
      name: "Masa por kilo",
      sku: "MASA-KG",
      productType: "masa",
      unit: "kg",
      isSellable: true,
      requiresProduction: true,
      isStockTracked: true,
      status: "active",
    },
  });

  const packageProduct = await prisma.product.upsert({
    where: {
      organizationId_sku: {
        organizationId: organization.id,
        sku: "PAQUETE-800G",
      },
    },
    update: {
      categoryId: baseCategory.id,
      name: "Paquete tortilla 800g",
      productType: "package",
      unit: "package",
      isSellable: true,
      requiresProduction: false,
      isStockTracked: false,
      status: "active",
    },
    create: {
      organizationId: organization.id,
      categoryId: baseCategory.id,
      name: "Paquete tortilla 800g",
      sku: "PAQUETE-800G",
      productType: "package",
      unit: "package",
      isSellable: true,
      requiresProduction: false,
      isStockTracked: false,
      status: "active",
    },
  });

  await prisma.productPackageConfig.upsert({
    where: {
      productId: packageProduct.id,
    },
    update: {
      baseProductId: tortillaProduct.id,
      packageWeightGrams: "800.000",
    },
    create: {
      productId: packageProduct.id,
      baseProductId: tortillaProduct.id,
      packageWeightGrams: "800.000",
    },
  });

  const retailProduct = await prisma.product.upsert({
    where: {
      organizationId_sku: {
        organizationId: organization.id,
        sku: "SALSA-250",
      },
    },
    update: {
      categoryId: retailCategory.id,
      name: "Salsa 250ml",
      productType: "retail",
      unit: "piece",
      isSellable: true,
      requiresProduction: false,
      isStockTracked: true,
      status: "active",
    },
    create: {
      organizationId: organization.id,
      categoryId: retailCategory.id,
      name: "Salsa 250ml",
      sku: "SALSA-250",
      productType: "retail",
      unit: "piece",
      isSellable: true,
      requiresProduction: false,
      isStockTracked: true,
      status: "active",
    },
  });

  await upsertBranchPrice({
    organizationId: organization.id,
    branchId: branch.id,
    productId: tortillaProduct.id,
    saleMode: "by_kg",
    price: "24.00",
  });
  await upsertBranchPrice({
    organizationId: organization.id,
    branchId: branch.id,
    productId: masaProduct.id,
    saleMode: "by_kg",
    price: "18.00",
  });
  await upsertBranchPrice({
    organizationId: organization.id,
    branchId: branch.id,
    productId: packageProduct.id,
    saleMode: "by_package",
    price: "20.00",
  });
  await upsertBranchPrice({
    organizationId: organization.id,
    branchId: branch.id,
    productId: retailProduct.id,
    saleMode: "by_unit",
    price: "15.00",
  });

  await ensureInventoryStock(organization.id, branch.id, tortillaProduct.id, "25.000");
  await ensureInventoryStock(organization.id, branch.id, masaProduct.id, "10.000");
  await ensureInventoryStock(organization.id, branch.id, retailProduct.id, "12.000");

  const demoCustomer = await prisma.customer.upsert({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name: "Cliente Demo Credito",
      },
    },
    update: {
      customerType: "cliente_frecuente",
      phone: "5550000000",
      creditEnabled: true,
      creditLimit: "200.00",
      currentBalance: "0.00",
      status: "active",
    },
    create: {
      organizationId: organization.id,
      name: "Cliente Demo Credito",
      customerType: "cliente_frecuente",
      phone: "5550000000",
      creditEnabled: true,
      creditLimit: "200.00",
      currentBalance: "0.00",
      status: "active",
    },
  });

  await upsertCustomerPrice({
    organizationId: organization.id,
    branchId: branch.id,
    customerId: demoCustomer.id,
    productId: tortillaProduct.id,
    saleMode: "by_kg",
    price: "22.00",
  });

  const demoDriver = await prisma.deliveryDriver.upsert({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name: "Repartidor Demo",
      },
    },
    update: {
      phone: "5551112222",
      status: "active",
      notes: "Repartidor para pruebas locales.",
    },
    create: {
      organizationId: organization.id,
      name: "Repartidor Demo",
      phone: "5551112222",
      status: "active",
      notes: "Repartidor para pruebas locales.",
    },
  });

  const demoRoute = await prisma.deliveryRoute.upsert({
    where: {
      branchId_name: {
        branchId: branch.id,
        name: "Ruta Demo",
      },
    },
    update: {
      driverId: demoDriver.id,
      status: "active",
    },
    create: {
      organizationId: organization.id,
      branchId: branch.id,
      driverId: demoDriver.id,
      name: "Ruta Demo",
      status: "active",
    },
  });

  await prisma.deliveryRouteCustomer.upsert({
    where: {
      routeId_customerId: {
        routeId: demoRoute.id,
        customerId: demoCustomer.id,
      },
    },
    update: {
      sortOrder: 1,
    },
    create: {
      routeId: demoRoute.id,
      customerId: demoCustomer.id,
      sortOrder: 1,
    },
  });

  const subscription = await prisma.subscription.findFirst({
    where: {
      organizationId: organization.id,
      status: "active",
    },
  });

  if (subscription) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        planId: paidPlan.id,
        provider: "manual",
      },
    });
  } else {
    await prisma.subscription.create({
      data: {
      organizationId: organization.id,
      planId: paidPlan.id,
      status: "active",
      provider: "manual",
      billingPeriod: "monthly",
      startedAt: new Date(),
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  await upsertDemoUser({
    organizationId: organization.id,
    branchId: branch.id,
    roleId: ownerRole.id,
    email: "owner.demo@tortillaplus.mx",
    name: "Duenio Demo",
  });
  await upsertDemoUser({
    organizationId: organization.id,
    branchId: branch.id,
    roleId: managerRole.id,
    email: "manager.demo@tortillaplus.mx",
    name: "Gerente Demo",
  });
  await upsertDemoUser({
    organizationId: organization.id,
    branchId: branch.id,
    roleId: supervisorRole.id,
    email: "supervisor.demo@tortillaplus.mx",
    name: "Supervisor Demo",
  });
  await upsertDemoUser({
    organizationId: organization.id,
    branchId: branch.id,
    roleId: cashierRole.id,
    email: "cashier.demo@tortillaplus.mx",
    name: "Cajero Demo",
  });
}

async function grantPermissions(roleId: string, permissionCodes: string[]) {
  const permissions = await prisma.permission.findMany({
    where: {
      code: { in: permissionCodes },
    },
  });
  const permissionIds = permissions.map((permission) => permission.id);

  await prisma.rolePermission.deleteMany({
    where: {
      roleId,
      permissionId: {
        notIn: permissionIds,
      },
    },
  });

  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId,
        permissionId: permission.id,
      },
    });
  }
}

async function upsertBranchPrice(input: {
  organizationId: string;
  branchId: string;
  productId: string;
  saleMode: "by_kg" | "by_amount" | "by_package" | "by_unit";
  price: string;
}) {
  const existing = await prisma.branchProductPrice.findFirst({
    where: {
      organizationId: input.organizationId,
      branchId: input.branchId,
      productId: input.productId,
      saleMode: input.saleMode,
      status: "active",
      activeTo: null,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (existing) {
    await prisma.branchProductPrice.update({
      where: {
        id: existing.id,
      },
      data: {
        price: input.price,
        currency: "MXN",
        activeFrom: new Date(),
        status: "active",
      },
    });
    return;
  }

  await prisma.branchProductPrice.create({
    data: {
      organizationId: input.organizationId,
      branchId: input.branchId,
      productId: input.productId,
      saleMode: input.saleMode,
      price: input.price,
      currency: "MXN",
      activeFrom: new Date(),
      status: "active",
    },
  });
}

async function upsertCustomerPrice(input: {
  organizationId: string;
  branchId: string;
  customerId: string;
  productId: string;
  saleMode: "by_kg" | "by_amount" | "by_package" | "by_unit";
  price: string;
}) {
  const existing = await prisma.customerProductPrice.findFirst({
    where: {
      organizationId: input.organizationId,
      branchId: input.branchId,
      customerId: input.customerId,
      productId: input.productId,
      saleMode: input.saleMode,
      status: "active",
      activeTo: null,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (existing) {
    await prisma.customerProductPrice.update({
      where: {
        id: existing.id,
      },
      data: {
        price: input.price,
        activeFrom: new Date(),
        status: "active",
      },
    });
    return;
  }

  await prisma.customerProductPrice.create({
    data: {
      organizationId: input.organizationId,
      branchId: input.branchId,
      customerId: input.customerId,
      productId: input.productId,
      saleMode: input.saleMode,
      price: input.price,
      activeFrom: new Date(),
      status: "active",
    },
  });
}

async function ensureInventoryStock(
  organizationId: string,
  branchId: string,
  productId: string,
  quantity: string,
) {
  await prisma.inventoryStock.upsert({
    where: {
      branchId_productId: {
        branchId,
        productId,
      },
    },
    update: {
      quantity,
      minimumQuantity: "0.000",
      updatedAt: new Date(),
    },
    create: {
      organizationId,
      branchId,
      productId,
      quantity,
      reservedQuantity: "0.000",
      minimumQuantity: "0.000",
    },
  });
}

async function upsertDemoUser(input: {
  organizationId: string;
  branchId: string;
  roleId: string;
  email: string;
  name: string;
}) {
  const user = await prisma.user.upsert({
    where: {
      organizationId_email: {
        organizationId: input.organizationId,
        email: input.email,
      },
    },
    update: {
      name: input.name,
      passwordHash: await hashSecret(demoPassword),
      pinHash: await hashSecret(demoPin),
      status: "active",
    },
    create: {
      organizationId: input.organizationId,
      name: input.name,
      email: input.email,
      passwordHash: await hashSecret(demoPassword),
      pinHash: await hashSecret(demoPin),
      status: "active",
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId_organizationId: {
        userId: user.id,
        roleId: input.roleId,
        organizationId: input.organizationId,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: input.roleId,
      organizationId: input.organizationId,
    },
  });

  await prisma.userBranchAssignment.upsert({
    where: {
      userId_branchId: {
        userId: user.id,
        branchId: input.branchId,
      },
    },
    update: { isDefault: true },
    create: {
      userId: user.id,
      branchId: input.branchId,
      isDefault: true,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
