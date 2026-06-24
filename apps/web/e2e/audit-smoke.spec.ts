import { expect, type APIRequestContext, type Page, test } from "@playwright/test";

const apiBaseUrl = "http://127.0.0.1:3199/api/v1";

async function createAutofacturaReceiptToken(api: APIRequestContext) {
  const login = await api.post(`${apiBaseUrl}/auth/login`, {
    data: { email: "manager.demo@tortillaplus.mx", password: "Demo1234!" }
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
  const posDevices = await api.get(`${apiBaseUrl}/pos-devices?branchId=${branchId}`, { headers: auth });
  expect(posDevices.ok(), await posDevices.text()).toBeTruthy();
  const posDevicePayload = await posDevices.json();
  const posDevice = posDevicePayload.data[0];
  expect(posDevice).toBeTruthy();

  const sale = await api.post(`${apiBaseUrl}/sales`, {
    data: { branchId, deviceId: posDevice.id, clientGeneratedId: `autofactura-e2e-${Date.now()}` },
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

  const ownerLogin = await api.post(`${apiBaseUrl}/auth/login`, {
    data: { email: "owner.demo@tortillaplus.mx", password: "Demo1234!" }
  });
  expect(ownerLogin.ok(), await ownerLogin.text()).toBeTruthy();
  const ownerSession = await ownerLogin.json();
  const ownerData = ownerSession.data ?? ownerSession;
  const receipt = await api.get(`${apiBaseUrl}/billing/receipts/by-sale/${saleId}`, {
    headers: { Authorization: `Bearer ${ownerData.accessToken as string}` }
  });
  expect(receipt.ok(), await receipt.text()).toBeTruthy();
  const receiptPayload = await receipt.json();
  return receiptPayload.data.token as string;
}

async function loginApi(api: APIRequestContext, email = "manager.demo@tortillaplus.mx") {
  const login = await api.post(`${apiBaseUrl}/auth/login`, {
    data: { email, password: "Demo1234!" }
  });
  expect(login.ok(), await login.text()).toBeTruthy();
  const session = await login.json();
  const loginData = session.data ?? session;
  return {
    token: loginData.accessToken as string,
    branchId: loginData.user.branches[0].branchId as string
  };
}

async function loginPage(page: Page, email = "manager.demo@tortillaplus.mx") {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contrasena").fill("Demo1234!");
  await page.getByRole("button", { name: "Entrar a mi sucursal" }).click();
  await page.waitForURL(/\/app(\/|$)/);
}

async function selectPrimaryPosDevice(page: Page) {
  await page.getByLabel("Caja/POS").selectOption({ label: "Caja principal" });
}

test("manager can enter operational routes with mocks disabled", async ({ page, request }) => {
  await loginPage(page, "owner.demo@tortillaplus.mx");
  const login = await request.post(`${apiBaseUrl}/auth/login`, {
    data: { email: "owner.demo@tortillaplus.mx", password: "Demo1234!" }
  });
  expect(login.ok(), await login.text()).toBeTruthy();
  const session = await login.json();
  const loginData = session.data ?? session;
  const token = loginData.accessToken as string;
  const branchId = loginData.user.branches[0].branchId as string;
  const auth = { Authorization: `Bearer ${token}` };

  await page.goto("/app/manager/dashboard");
  await expect(page.getByRole("heading", { name: "Resumen de hoy" })).toBeVisible();
  await expect(page.getByText("Ventas hoy")).toBeVisible();

  const managerLogin = await request.post(`${apiBaseUrl}/auth/login`, {
    data: { email: "manager.demo@tortillaplus.mx", password: "Demo1234!" }
  });
  expect(managerLogin.ok(), await managerLogin.text()).toBeTruthy();
  const managerSession = await managerLogin.json();
  const managerData = managerSession.data ?? managerSession;
  const openCash = await request.post(`${apiBaseUrl}/cash-sessions/open`, {
    data: { branchId, openingAmountCounted: "500.00", openingNote: "UX-R7 E2E" },
    headers: { Authorization: `Bearer ${managerData.accessToken as string}` }
  });
  expect([200, 201, 409]).toContain(openCash.status());

  await page.goto("/app/cash");
  await expect(page.getByRole("heading", { name: "Caja actual" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cierre guiado" })).toBeVisible();
  await expect(page.getByText("Paso 1 de 3")).toBeVisible();
  await page.getByLabel("Efectivo contado").fill("500.00");
  await expect(page.getByText("Diferencia", { exact: true })).toBeVisible();

  await page.goto("/app/manager/reports");
  await expect(page.getByRole("heading", { name: "Como va el negocio" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ventas por cliente" })).toBeVisible();

  await page.goto("/app/manager/routes");

  const routesBlocked = page.getByRole("heading", { name: "Rutas de reparto no esta disponible en tu plan" });
  if (await routesBlocked.isVisible()) {
    await expect(routesBlocked).toBeVisible();
  } else {
    await expect(page.getByRole("heading", { name: "Reparto" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pedidos de hoy" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Liquidaciones pendientes" })).toBeVisible();
    const firstRoute = page.getByRole("link", { name: /Abrir/ }).first();
    await expect(firstRoute).toBeVisible();
    await firstRoute.click();
    await expect(page.getByText("Siguiente cliente")).toBeVisible();
    await expect(page.getByText("Por liquidar")).toBeVisible();
  }

  const suffix = Date.now();
  const customerResponse = await request.post(`${apiBaseUrl}/customers`, {
    data: {
      name: `Cliente UX-R7 ${suffix}`,
      customerType: "cliente_frecuente",
      creditEnabled: true,
      creditLimit: "1000.00"
    },
    headers: auth
  });
  expect(customerResponse.ok(), await customerResponse.text()).toBeTruthy();
  const customer = (await customerResponse.json()).data;

  await page.goto(`/app/customers/${customer.id}`);
  await expect(page.getByRole("heading", { name: customer.name })).toBeVisible();
  await expect(page.getByText("Saldo", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Limite", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Disponible", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Ruta", { exact: true }).first()).toBeVisible();

  await page.goto("/app/manager/billing");
  await expect(page.getByRole("heading", { name: "Facturas del dia" })).toBeVisible();
  await expect(page.getByText("Pendiente de facturar")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Facturas emitidas" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tickets QR", exact: true })).toBeVisible();

  await page.goto("/app/manager/settings");
  await expect(page.getByRole("heading", { name: "Sucursal, cajas y plan" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Auditoria critica reciente" })).toBeVisible();

  const today = new Date().toISOString().slice(0, 10);
  const exportResponse = await request.get(`${apiBaseUrl}/exports/reports/operational?branchId=${branchId}&from=${today}&to=${today}&format=csv`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  expect(exportResponse.ok(), await exportResponse.text()).toBeTruthy();
  expect(exportResponse.headers()["content-type"]).toContain("text/csv");
  expect(await exportResponse.text()).toContain("reporte,etiqueta,valor");
});

test("POS blocks sale without cash session and rejects destructive numeric input", async ({ page, request }) => {
  const { token, branchId } = await loginApi(request);

  await loginPage(page);

  await page.route(`**/api/v1/cash-sessions/open?branchId=${branchId}`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data: null })
    });
  });
  await page.goto("/app/pos/sale");
  await expect(page).toHaveURL(/\/app\/pos\/cash\/open/);
  await expect(page.getByLabel("Efectivo contado")).toBeVisible();

  await page.getByLabel("Efectivo contado").fill("1e3");
  await page.getByRole("button", { name: "Abrir caja" }).click();
  await expect(page.getByText("El efectivo contado debe tener formato decimal valido.")).toBeVisible();

  await page.unroute(`**/api/v1/cash-sessions/open?branchId=${branchId}`);
  const openCash = await request.post(`${apiBaseUrl}/cash-sessions/open`, {
    data: { branchId, openingAmountCounted: "500.00", openingNote: "POS numeric E2E" },
    headers: { Authorization: `Bearer ${token}` }
  });
  expect([200, 201, 409]).toContain(openCash.status());

  await page.goto("/app/pos/sale");
  await page.waitForURL(/\/app\/pos\/sale/);

  await page.getByRole("button", { name: /Tortilla/ }).click();
  await page.getByLabel("Cantidad").fill("1e3");
  await expect(page.getByText("La cantidad debe tener formato decimal valido.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Agregar" })).toBeDisabled();
});

test("POS exposes keyboard-first shortcuts and checkout flow", async ({ page, request }) => {
  const { token, branchId } = await loginApi(request);

  const openCash = await request.post(`${apiBaseUrl}/cash-sessions/open`, {
    data: { branchId, openingAmountCounted: "500.00", openingNote: "POS keyboard E2E" },
    headers: { Authorization: `Bearer ${token}` }
  });
  expect([200, 201, 409]).toContain(openCash.status());

  await loginPage(page);
  await page.goto("/app/pos/sale");
  await page.waitForURL(/\/app\/pos\/sale/);

  await expect(page.getByText("F6 Buscar").first()).toBeVisible();
  await expect(page.getByText("F9 Cobrar")).toBeVisible();
  await expect(page.getByText("Esc Cancelar")).toBeVisible();

  await page.keyboard.press("F1");
  await page.getByLabel("Cantidad").fill("1");
  await page.getByRole("button", { name: "Agregar" }).click();
  await expect(page.getByRole("button", { name: "Cobrar (F9)" })).toBeEnabled();

  await page.getByRole("button", { name: "Cobrar (F9)" }).click();
  await expect(page.getByRole("button", { name: "Completar venta" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Completar venta" })).toBeHidden();
});

test("manager creates customer special price and POS completes sale with that price", async ({ page, request }) => {
  const { token, branchId } = await loginApi(request);
  const auth = { Authorization: `Bearer ${token}` };
  const suffix = Date.now();

  const openCash = await request.post(`${apiBaseUrl}/cash-sessions/open`, {
    data: { branchId, openingAmountCounted: "500.00", openingNote: "Customer special price E2E" },
    headers: auth
  });
  expect([200, 201, 409]).toContain(openCash.status());

  const products = await request.get(`${apiBaseUrl}/products`, { headers: auth });
  expect(products.ok(), await products.text()).toBeTruthy();
  const productsPayload = await products.json();
  const tortilla = productsPayload.data.find((product: { sku: string }) => product.sku === "TORTILLA-KG");
  expect(tortilla).toBeTruthy();

  const customerName = `Cliente E2E ${suffix}`;
  const customerResponse = await request.post(`${apiBaseUrl}/customers`, {
    data: {
      name: customerName,
      phone: `81${String(suffix).slice(-8)}`,
      customerType: "cliente_frecuente",
      creditEnabled: true,
      creditLimit: "500.00"
    },
    headers: auth
  });
  expect(customerResponse.ok(), await customerResponse.text()).toBeTruthy();
  const customerPayload = await customerResponse.json();
  const customerId = customerPayload.data.id as string;

  const customerPrice = await request.post(`${apiBaseUrl}/customers/${customerId}/prices`, {
    data: { branchId, productId: tortilla.id, saleMode: "by_kg", price: "19.00" },
    headers: auth
  });
  expect(customerPrice.ok(), await customerPrice.text()).toBeTruthy();

  await loginPage(page);
  await page.goto(`/app/pos/sale?customerId=${customerId}`);
  await expect(page.getByText(customerName)).toBeVisible();
  await selectPrimaryPosDevice(page);

  await page.getByRole("button", { name: /Tortilla/ }).click();
  await page.getByLabel("Cantidad").fill("1");
  await page.getByRole("button", { name: "Agregar" }).click();

  await expect(page.getByText("Precio cliente")).toBeVisible();
  await expect(page.getByRole("complementary").getByText("$19.00").last()).toBeVisible();

  await page.getByRole("button", { name: "Cobrar" }).click();
  await expect(page.getByRole("heading", { name: "$19.00" })).toBeVisible();
  await page.getByRole("button", { name: "Completar venta" }).click();

  await expect(page.getByRole("heading", { name: "Venta completada" })).toBeVisible();
});

test("new retail product can receive initial stock and be sold in POS", async ({ page, request }) => {
  const { token, branchId } = await loginApi(request);
  const auth = { Authorization: `Bearer ${token}` };
  const suffix = Date.now();
  const productName = `Salsa E2E ${suffix}`;

  const openCash = await request.post(`${apiBaseUrl}/cash-sessions/open`, {
    data: { branchId, openingAmountCounted: "500.00", openingNote: "Retail product E2E" },
    headers: auth
  });
  expect([200, 201, 409]).toContain(openCash.status());

  const productResponse = await request.post(`${apiBaseUrl}/products`, {
    data: {
      name: productName,
      sku: `SAL-E2E-${suffix}`,
      productType: "retail",
      unit: "piece",
      isSellable: true,
      isStockTracked: true,
      requiresProduction: false
    },
    headers: auth
  });
  expect(productResponse.ok(), await productResponse.text()).toBeTruthy();
  const productPayload = await productResponse.json();
  const productId = productPayload.data.id as string;

  const priceResponse = await request.post(`${apiBaseUrl}/prices/branch`, {
    data: { branchId, productId, saleMode: "by_unit", price: "18.00" },
    headers: auth
  });
  expect(priceResponse.ok(), await priceResponse.text()).toBeTruthy();

  const inventoryBefore = await request.get(`${apiBaseUrl}/inventory/branch/${branchId}`, { headers: auth });
  expect(inventoryBefore.ok(), await inventoryBefore.text()).toBeTruthy();
  const inventoryBeforePayload = await inventoryBefore.json();
  expect(inventoryBeforePayload.data.find((item: { productId: string; quantity: string }) => item.productId === productId)?.quantity).toBe("0.000");

  const stockResponse = await request.post(`${apiBaseUrl}/inventory/adjustments`, {
    data: { branchId, productId, direction: "in", quantity: "2.000", reason: "Inventario inicial E2E" },
    headers: auth
  });
  expect(stockResponse.ok(), await stockResponse.text()).toBeTruthy();

  await loginPage(page);
  await page.goto("/app/pos/sale");
  await selectPrimaryPosDevice(page);
  await page.getByPlaceholder("Buscar producto").fill(productName);

  const productButton = page.getByRole("button", { name: new RegExp(productName) });
  await expect(productButton).toBeVisible();
  await expect(productButton).toBeEnabled();
  await productButton.click();

  await expect(page.getByText(productName).last()).toBeVisible();
  await expect(page.getByRole("complementary").getByText("$18.00").last()).toBeVisible();

  await page.getByRole("button", { name: "Cobrar" }).click();
  await expect(page.getByRole("heading", { name: "$18.00" })).toBeVisible();
  await page.getByRole("button", { name: "Completar venta" }).click();

  await expect(page.getByRole("heading", { name: "Venta completada" })).toBeVisible();
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
