import assert from "node:assert/strict";
import test from "node:test";

import { DomainError } from "../src/lib/domain-error.js";
import {
  buildFacturapiInvoicePayload,
  FacturapiAdapter,
  getPacAdapter,
  mapFacturapiError,
  MockPacAdapter,
} from "../src/services/billing-pac-adapter.js";
import { sanitizeBillingProviderJson } from "../src/services/billing-provider-log-service.js";

test("mock PAC adapter stamps individual and global invoices with normalized result", async () => {
  const adapter = new MockPacAdapter();
  const baseInput = {
    operationId: "test-op-1",
    invoiceType: "individual" as const,
    saleIds: ["sale_1"],
    subtotal: "20.69",
    taxTotal: "3.31",
    total: "24.00",
    customerRfc: "XAXX010101000",
  };

  const individual = await adapter.createInvoice(baseInput);
  assert.equal(individual.provider, "tortilla-plus-pac-mock");
  assert.equal(individual.status, "stamped");
  assert.match(individual.cfdiUuid, /^[0-9a-f-]{36}$/);
  assert.equal(individual.rawResponse.provider, "tortilla-plus-pac-mock");

  const global = await adapter.createGlobalInvoice({
    ...baseInput,
    operationId: "test-op-global",
    invoiceType: "global_public",
  });
  assert.equal(global.status, "stamped");
  assert.equal(global.rawResponse.invoiceType, "global_public");
});

test("PAC adapter factory creates Facturapi adapter only with sandbox API key", () => {
  assert.equal(getPacAdapter("mock").provider, "tortilla-plus-pac-mock");
  assert.throws(
    () => getPacAdapter("facturapi"),
    (error) => error instanceof DomainError && error.code === "PROVIDER_NOT_CONFIGURED",
  );
  const adapter = new FacturapiAdapter({ apiKey: "sk_test_demo", env: "sandbox", baseUrl: "https://www.facturapi.io/v2" });
  assert.equal(adapter.provider, "facturapi");
});

test("Facturapi error mapper normalizes provider responses", () => {
  assert.equal(mapFacturapiError(429, {}), "RATE_LIMITED");
  assert.equal(mapFacturapiError(422, { message: "RFC invalido" }), "INVALID_TAX_DATA");
  assert.equal(mapFacturapiError(500, {}), "PROVIDER_UNAVAILABLE");
  assert.equal(mapFacturapiError(403, { message: "CSD requerido" }), "CERTIFICATE_ERROR");
});

test("Facturapi payload builder uses DTO tax data and sale snapshots", () => {
  const payload = buildFacturapiInvoicePayload({
    operationId: "invoice-stamp:test",
    invoiceId: "invoice_1",
    invoiceType: "individual",
    saleIds: ["sale_1"],
    subtotal: "24.00",
    taxTotal: "0.00",
    total: "24.00",
    taxData: {
      rfc: "XAXX010101000",
      legalName: "PUBLICO EN GENERAL",
      taxRegime: "616",
      zipCode: "64000",
      cfdiUse: "S01",
      email: "cliente@example.com",
    },
    items: [{
      description: "Tortilla kg snapshot",
      quantity: "1.000",
      unitPrice: "24.00",
      subtotal: "24.00",
      total: "24.00",
      satProductKey: "50181900",
      satUnitKey: "KGM",
    }],
  });

  assert.equal(payload.customer.tax_id, "XAXX010101000");
  assert.equal(payload.items[0].product.description, "Tortilla kg snapshot");
  assert.equal(payload.use, "S01");
});

test("provider log sanitizer redacts nested secrets", () => {
  const sanitized = sanitizeBillingProviderJson({
    apiKey: "secret",
    nested: { token: "abc", keep: "value" },
  });
  assert.deepEqual(sanitized, {
    apiKey: "[REDACTED]",
    nested: { token: "[REDACTED]", keep: "value" },
  });
});
