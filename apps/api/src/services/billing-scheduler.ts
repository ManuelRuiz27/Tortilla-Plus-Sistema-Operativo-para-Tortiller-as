import { env } from "../config/env.js";
import { expireBillingReceipts } from "./public-autofactura-service.js";

export function startBillingScheduler() {
  if (!env.BILLING_RECEIPT_EXPIRATION_ENABLED) {
    return () => undefined;
  }

  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await expireBillingReceipts();
    } catch (error) {
      console.error("[billing-scheduler] receipt expiration failed", error);
    } finally {
      running = false;
    }
  };

  void run();
  const timer = setInterval(() => void run(), env.BILLING_RECEIPT_EXPIRATION_INTERVAL_MS);
  return () => clearInterval(timer);
}
