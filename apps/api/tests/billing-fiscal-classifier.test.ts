import assert from "node:assert/strict";
import test from "node:test";

import { classifyFiscalSale } from "../src/services/billing-fiscal-classifier.js";

test("fiscal classifier keeps cash without request invoice eligible for daily global", () => {
  const result = classifyFiscalSale({
    payments: [{ paymentMethod: "cash" }],
    customerRequestedInvoice: false,
  });

  assert.deepEqual(result, {
    fiscalIntent: "no_invoice",
    fiscalStatus: "eligible_for_daily_global",
    requiresReceipt: false,
  });
});

test("fiscal classifier creates customer invoice intent for requested cash transfer and credit", () => {
  for (const paymentMethod of ["cash", "transfer", "credit"] as const) {
    const result = classifyFiscalSale({
      payments: [{ paymentMethod }],
      customerRequestedInvoice: true,
    });

    assert.deepEqual(result, {
      fiscalIntent: "customer_invoice",
      fiscalStatus: "pending_customer_invoice",
      requiresReceipt: true,
    });
  }
});

test("fiscal classifier reserves any card payment for automatic customer invoice", () => {
  const result = classifyFiscalSale({
    payments: [{ paymentMethod: "cash" }, { paymentMethod: "card" }],
    customerRequestedInvoice: false,
  });

  assert.deepEqual(result, {
    fiscalIntent: "auto_customer_invoice",
    fiscalStatus: "pending_customer_invoice",
    requiresReceipt: true,
  });
});
