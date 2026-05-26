import { expect, type APIRequestContext, test } from "@playwright/test";

const apiBaseUrl = "http://127.0.0.1:3199/api/v1";

async function createAutofacturaReceiptToken(api: APIRequestContext) {
  const login = await api.post(`${apiBaseUrl}/auth/login`, {
    data: { email: "owner.demo@tortillaplus.mx", password: "Demo1234!" }
  });
  expect(login.ok(), await login.text()).toBeTruthy();
  const session = await login.json();
  const loginData = session.data ?? session;
  const token = loginData.accessToken as string;
  const branchId = loginData.user.branches[0].branchId as string;
  const auth = { Authorization: `Bearer ${token}` };

  const openCash = await api.post(`${apiBaseUrl}/cash-sessions/open`, {
    data: { branchId, openingAmountCounted: "500.00", openingNote: "Autofactura E2E" },
    headers: auth
  });
  expect([200, 201, 409]).toContain(openCash.status());

  const products = await api.get(`${apiBaseUrl}/products?branchId=${branchId}`, { headers: auth });
  expect(products.ok()).toBeTruthy();
  const productPayload = await products.json();
  const tortilla = productPayload.data.find((product: { sku: string }) => product.sku === "TORTILLA-KG");
  expect(tortilla).toBeTruthy();

  const sale = await api.post(`${apiBaseUrl}/sales`, {
    data: { branchId, clientGeneratedId: `autofactura-e2e-${Date.now()}` },
    headers: auth
  });
  expect(sale.ok()).toBeTruthy();
  const salePayload = await sale.json();
  const saleId = salePayload.data.id as string;

  const item = await api.post(`${apiBaseUrl}/sales/${saleId}/items`, {
    data: { productId: tortilla.id, saleMode: "by_kg", quantity: "1.000" },
    headers: auth
  });
  expect(item.ok()).toBeTruthy();

  const complete = await api.post(`${apiBaseUrl}/sales/${saleId}/complete`, {
    data: { payments: [{ paymentMethod: "card", amount: "24.00", reference: `e2e-${Date.now()}`, provider: "terminal-demo" }] },
    headers: {
      ...auth,
      "Idempotency-Key": `autofactura-e2e-complete-${saleId}`
    }
  });
  expect(complete.ok()).toBeTruthy();

  const receipt = await api.get(`${apiBaseUrl}/billing/receipts/by-sale/${saleId}`, { headers: auth });
  expect(receipt.ok(), await receipt.text()).toBeTruthy();
  const receiptPayload = await receipt.json();
  return receiptPayload.data.token as string;
}

test("manager can enter operational routes with mocks disabled", async ({ page, request }) => {
  await page.goto("/login");

  await page.getByLabel("Correo").fill("owner.demo@tortillaplus.mx");
  await page.getByLabel("Contrasena").fill("Demo1234!");
  await page.getByRole("button", { name: "Entrar a mi sucursal" }).click();
  await page.waitForURL(/\/app\//);

  await page.goto("/app/manager/dashboard");
  await expect(page.getByRole("heading", { name: "Resumen de hoy" })).toBeVisible();
  await expect(page.getByText("Ventas de hoy")).toBeVisible();

  await page.goto("/app/manager/reports");
  await expect(page.getByRole("heading", { name: "Como va el negocio" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ventas por cliente" })).toBeVisible();

  await page.goto("/app/manager/routes");

  await expect(page.getByRole("heading", { name: "Reparto" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pedidos de hoy" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Liquidaciones pendientes" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Abrir/ }).first()).toBeVisible();

  await page.goto("/app/manager/billing");
  await expect(page.getByRole("heading", { name: "Facturas del dia" })).toBeVisible();
  await expect(page.getByText("Pendiente de facturar")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Facturas emitidas" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tickets QR" })).toBeVisible();

  await page.goto("/app/manager/settings");
  await expect(page.getByRole("heading", { name: "Sucursal, cajas y plan" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Auditoria critica reciente" })).toBeVisible();

  const login = await request.post(`${apiBaseUrl}/auth/login`, {
    data: { email: "owner.demo@tortillaplus.mx", password: "Demo1234!" }
  });
  expect(login.ok(), await login.text()).toBeTruthy();
  const session = await login.json();
  const loginData = session.data ?? session;
  const token = loginData.accessToken as string;
  const branchId = loginData.user.branches[0].branchId as string;
  const today = new Date().toISOString().slice(0, 10);
  const exportResponse = await request.get(`${apiBaseUrl}/exports/reports/operational?branchId=${branchId}&from=${today}&to=${today}&format=csv`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  expect(exportResponse.ok(), await exportResponse.text()).toBeTruthy();
  expect(exportResponse.headers()["content-type"]).toContain("text/csv");
  expect(await exportResponse.text()).toContain("reporte,etiqueta,valor");
});

test("public autofactura portal invoices a card receipt token", async ({ page, request }) => {
  const receiptToken = await createAutofacturaReceiptToken(request);

  await page.goto(`/r/${receiptToken}`);

  await expect(page.getByRole("heading", { name: "Demo Tortilla Plus" })).toBeVisible();
  await expect(page.getByText("Disponible")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Datos fiscales" })).toBeVisible();

  await page.getByLabel("RFC").fill("XAXX010101000");
  await page.getByLabel("Razon social").fill("PUBLICO EN GENERAL");
  await page.getByLabel("Regimen fiscal").selectOption("616");
  await page.getByLabel("Codigo postal").fill("64000");
  await page.getByLabel("Uso CFDI").selectOption("S01");
  await page.getByLabel("Correo").fill("cliente.e2e@example.com");
  await page.getByRole("button", { name: "Generar factura" }).click();

  await expect(page.getByRole("heading", { name: "Factura generada" })).toBeVisible();
  await expect(page.getByText("UUID CFDI:")).toBeVisible();
  const pdfLink = page.getByRole("link", { name: "PDF" });
  const xmlLink = page.getByRole("link", { name: "XML" });
  await expect(pdfLink).toBeVisible();
  await expect(xmlLink).toBeVisible();

  const pdf = await request.get(new URL(await pdfLink.getAttribute("href") ?? "", apiBaseUrl).toString());
  expect(pdf.ok(), await pdf.text()).toBeTruthy();
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  expect((await pdf.body()).toString("utf8")).toContain("Tortilla Plus CFDI mock");

  const xml = await request.get(new URL(await xmlLink.getAttribute("href") ?? "", apiBaseUrl).toString());
  expect(xml.ok(), await xml.text()).toBeTruthy();
  expect(xml.headers()["content-type"]).toContain("application/xml");
  expect(await xml.text()).toContain("cfdi:Comprobante");
});
