import type { PrismaClient } from "@prisma/client";

import {
  commercialPlanDefinitions,
  featureDefinitions,
  freePlanEnabledFeatures,
  permissionDefinitions,
  planDefinitions,
  roleDefinitions,
  rolePermissionMatrix,
} from "./system-catalog.js";

type Tx = PrismaClient;

export async function bootstrapSystemCatalog(prisma: Tx) {
  const freePlan = await prisma.plan.upsert({
    where: { code: "free" },
    update: {
      name: planDefinitions[0].name,
      description: planDefinitions[0].description,
      status: "active",
    },
    create: {
      code: planDefinitions[0].code,
      name: planDefinitions[0].name,
      description: planDefinitions[0].description,
      status: "active",
    },
  });

  const paidPlan = await prisma.plan.upsert({
    where: { code: "paid" },
    update: {
      name: planDefinitions[1].name,
      description: planDefinitions[1].description,
      status: "active",
    },
    create: {
      code: planDefinitions[1].code,
      name: planDefinitions[1].name,
      description: planDefinitions[1].description,
      status: "active",
    },
  });

  const commercialPlans = [];
  for (const definition of commercialPlanDefinitions) {
    commercialPlans.push(await prisma.plan.upsert({
      where: { code: definition.code },
      update: {
        name: definition.name,
        description: definition.description,
        status: "active",
      },
      create: {
        code: definition.code,
        name: definition.name,
        description: definition.description,
        status: "active",
      },
    }));
  }

  for (const [code, name, limitValue] of featureDefinitions) {
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
        enabled: freePlanEnabledFeatures.includes(code as (typeof freePlanEnabledFeatures)[number]),
        limitValue,
      },
      create: {
        planId: freePlan.id,
        featureId: feature.id,
        enabled: freePlanEnabledFeatures.includes(code as (typeof freePlanEnabledFeatures)[number]),
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

    for (const plan of commercialPlans) {
      const definition = commercialPlanDefinitions.find((item) => item.code === plan.code);
      const enabled = definition
        ? code === "billing_cfdi"
          ? definition.billingCfdiEnabled
          : code === "delivery_routes"
            ? definition.routesEnabled
            : code === "advanced_reports"
              ? definition.advancedReportsEnabled
              : true
        : true;
      const commercialLimit = definition
        ? code === "max_branches"
          ? definition.includedBranches
          : code === "max_pos_devices"
            ? definition.includedPos
            : limitValue
        : limitValue;
      await prisma.planFeature.upsert({
        where: {
          planId_featureId: {
            planId: plan.id,
            featureId: feature.id,
          },
        },
        update: { enabled, limitValue: commercialLimit },
        create: { planId: plan.id, featureId: feature.id, enabled, limitValue: commercialLimit },
      });
    }
  }

  for (const [code, name, scope] of roleDefinitions) {
    await prisma.role.upsert({
      where: { code },
      update: { name, scope },
      create: { code, name, scope },
    });
  }

  for (const [code, name] of permissionDefinitions) {
    await prisma.permission.upsert({
      where: { code },
      update: { name },
      create: { code, name },
    });
  }

  for (const [roleCode, permissionCodes] of Object.entries(rolePermissionMatrix)) {
    const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
    await grantPermissions(prisma, role.id, [...permissionCodes]);
  }

  return { freePlan, paidPlan, commercialPlans };
}

export async function grantPermissions(prisma: Tx, roleId: string, permissionCodes: string[]) {
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
