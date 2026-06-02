import { env } from "../src/config/env.js";
import { bootstrapSystemCatalog } from "../src/bootstrap/system-bootstrap.js";
import { hashSecret } from "../src/lib/password.js";
import { prisma } from "../src/lib/prisma.js";

const minimumPasswordLength = 12;

async function main() {
  if (env.NODE_ENV === "production" && process.env.PLATFORM_BOOTSTRAP_ENABLED !== "true") {
    throw new Error("PLATFORM_BOOTSTRAP_ENABLED=true is required to run production bootstrap.");
  }

  const email = requiredEnv("PLATFORM_OWNER_EMAIL").toLowerCase();
  const name = process.env.PLATFORM_OWNER_NAME?.trim() || "Duenio Plataforma";
  const password = requiredEnv("PLATFORM_OWNER_PASSWORD");
  const rotatePassword = process.env.PLATFORM_OWNER_ROTATE_PASSWORD === "true";

  assertStrongPassword(password);

  await bootstrapSystemCatalog(prisma);

  const platformOwnerRole = await prisma.role.findUniqueOrThrow({ where: { code: "platform_owner" } });
  const existing = await prisma.user.findFirst({
    where: {
      organizationId: null,
      email,
    },
  });

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          name,
          ...(rotatePassword ? { passwordHash: await hashSecret(password) } : {}),
          pinHash: null,
          status: "active",
          updatedAt: new Date(),
        },
      })
    : await prisma.user.create({
        data: {
          organizationId: null,
          name,
          email,
          passwordHash: await hashSecret(password),
          pinHash: null,
          status: "active",
        },
      });

  const existingRole = await prisma.userRole.findFirst({
    where: {
      userId: user.id,
      roleId: platformOwnerRole.id,
      organizationId: null,
    },
  });

  if (!existingRole) {
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: platformOwnerRole.id,
        organizationId: null,
      },
    });
  }

  console.log(`Production bootstrap completed for platform_owner ${email}.`);
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function assertStrongPassword(password: string) {
  if (password.length < minimumPasswordLength) {
    throw new Error(`PLATFORM_OWNER_PASSWORD must be at least ${minimumPasswordLength} characters.`);
  }

  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error("PLATFORM_OWNER_PASSWORD must include lowercase, uppercase and numeric characters.");
  }
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
