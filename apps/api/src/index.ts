import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { buildServer } from "./server.js";
import { startBillingScheduler } from "./services/billing-scheduler.js";

const server = buildServer();
const stopBillingScheduler = startBillingScheduler();

try {
  await new Promise<void>((resolve) => {
    server.listen(env.PORT, env.HOST, resolve);
  });
  console.log(`API listening on http://${env.HOST}:${env.PORT}`);
} catch (error) {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
}

const shutdown = async () => {
  console.log("shutting down");
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
  stopBillingScheduler();
  await prisma.$disconnect();
};

process.on("SIGINT", () => {
  void shutdown().then(() => process.exit(0));
});

process.on("SIGTERM", () => {
  void shutdown().then(() => process.exit(0));
});
