import { expect, type APIRequestContext, type Page, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiBaseUrl = process.env.E2E_API_BASE_URL ?? "http://127.0.0.1:3199/api/v1";
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.resolve(currentDir, "../../../docs/manuals/screenshots");

type Session = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    branches: Array<{ branchId: string; branchName: string; role: string; status: string }>;
  };
};

type ManualContext = {
  branchId: string;
  customerId: string;
  routeBranchId: string;
  routeId: string | null;
  batchId: string;
};

async function loginApi(api: APIRequestContext, email = "manager.demo@tortillaplus.mx"): Promise<Session> {
  const response = await api.post(`${apiBaseUrl}/auth/login`, {
    data: { email, password: "Demo1234!" }
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const payload = await response.json();
  return (payload.data ?? payload) as Session;
}

function authHeaders(session: Session) {
  return { Authorization: `Bearer ${session.accessToken}` };
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

async function expectedCashAmount(page: Page) {
  const amount = await page.getByText("Efectivo esperado", { exact: true }).locator("xpath=following-sibling::p[1]").innerText();
  expect(amount, "cash summary must show expected cash amount").toMatch(/^\$[\d,]+\.\d{2}$/);
  return amount.replace(/[$,]/g, "");
}

async function setSession(page: Page, session: Session, branchId: string | null) {
  const branches = session.user.branches;
  const activeBranch = branches.find((branch) => branch.branchId === branchId) ?? branches[0] ?? null;
  await page.addInitScript(
    ({ sessionPayload, branchesPayload, activeBranchPayload }) => {
      window.localStorage.setItem(
        "tp-auth",
        JSON.stringify({
          state: {
            accessToken: sessionPayload.accessToken,
            refreshToken: sessionPayload.refreshToken,
            user: sessionPayload.user,
            isAuthenticated: true
          },
          version: 0
        })
      );
      window.localStorage.setItem(
        "tp-branch",
        JSON.stringify({
          state: {
            activeBranchId: activeBranchPayload?.branchId ?? null,
            activeBranchName: activeBranchPayload?.branchName ?? null,
            branches: branchesPayload
          },
          version: 0
        })
      );
      window.localStorage.setItem(
        "tp-subscription",
        JSON.stringify({
          state: {
            planCode: "premium",
            status: "active",
            features: ["pos_basic", "cash_control", "inventory_basic", "delivery_routes", "billing_cfdi", "advanced_reports"]
          },
          version: 0
        })
      );
    },
    { sessionPayload: session, branchesPayload: branches, activeBranchPayload: activeBranch }
  );
}

async function screenshot(page: Page, name: string) {
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.screenshot({ fullPage: true, path: path.join(screenshotsDir, `${name}.png`) });
}

async function mockRouteScreenshotsData(page: Page, branchId: string, routeId: string) {
  const customerId = "manual-route-customer";
  const productId = "manual-route-product";
  const orderId = "manual-route-order";

  await page.route("**/api/v1/delivery-routes?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: [
          {
            id: routeId,
            branchId,
            name: "Ruta manual piloto",
            driverId: "manual-driver",
            driver: { id: "manual-driver", name: "Chofer demo" },
            customers: [
              {
                customerId,
                sortOrder: 1,
                customer: {
                  id: customerId,
                  name: "Tienda La Esquina",
                  customerType: "tienda",
                  creditEnabled: true,
                  creditLimit: "1000.00",
                  currentBalance: "120.00",
                  status: "active"
                }
              }
            ],
            status: "active"
          }
        ]
      })
    });
  });
  await page.route("**/api/v1/delivery-drivers", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data: [{ id: "manual-driver", name: "Chofer demo", phone: "8112345678", status: "active" }] })
    });
  });
  await page.route("**/api/v1/delivery-orders?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: [
          {
            id: orderId,
            branchId,
            routeId,
            driverId: "manual-driver",
            customerId,
            customer: { id: customerId, name: "Tienda La Esquina" },
            status: "prepared",
            total: "48.00",
            amountCollected: "0.00",
            amountPending: "48.00",
            items: [
              {
                id: "manual-route-order-item",
                productId,
                product: { name: "Tortilla kg" },
                quantityLoaded: "2.000",
                quantityDelivered: "0.000",
                quantityReturned: "0.000",
                unitPrice: "24.00",
                total: "48.00"
              }
            ]
          }
        ]
      })
    });
  });
  await page.route("**/api/v1/delivery-settlements?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: [
          {
            id: "manual-route-settlement",
            branchId,
            routeId,
            driverId: "manual-driver",
            status: "open",
            expectedCashAmount: "48.00",
            deliveredCashAmount: "0.00",
            differenceAmount: "0.00",
            cashSessionId: null
          }
        ]
      })
    });
  });
  await page.route("**/api/v1/customers", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: [
          {
            id: customerId,
            name: "Tienda La Esquina",
            customerType: "tienda",
            creditEnabled: true,
            creditLimit: "1000.00",
            currentBalance: "120.00",
            status: "active"
          }
        ]
      })
    });
  });
  await page.route("**/api/v1/products", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: [
          {
            id: productId,
            name: "Tortilla kg",
            sku: "TORTILLA-KG",
            productType: "tortilla",
            unit: "kg",
            isSellable: true,
            isStockTracked: true,
            requiresProduction: true,
            status: "active"
          }
        ]
      })
    });
  });
}

async function getTortillaProduct(api: APIRequestContext, session: Session) {
  const response = await api.get(`${apiBaseUrl}/products`, { headers: authHeaders(session) });
  expect(response.ok(), await response.text()).toBeTruthy();
  const products = (await response.json()).data as Array<{ id: string; sku?: string; name: string }>;
  const tortilla = products.find((product) => product.sku === "TORTILLA-KG") ?? products.find((product) => /tortilla/i.test(product.name));
  expect(tortilla).toBeTruthy();
  return tortilla;
}

async function prepareManualData(api: APIRequestContext, session: Session): Promise<ManualContext> {
  const branchId = session.user.branches[0].branchId;
  const auth = authHeaders(session);
  const suffix = Date.now();

  const openCash = await api.post(`${apiBaseUrl}/cash-sessions/open`, {
    data: { branchId, openingAmountCounted: "500.00", openingNote: "Screenshots manual UX-R11" },
    headers: auth
  });
  expect([200, 201, 409]).toContain(openCash.status());

  const tortilla = await getTortillaProduct(api, session);

  const customerResponse = await api.post(`${apiBaseUrl}/customers`, {
    data: {
      name: `Cliente manual ${suffix}`,
      phone: `81${String(suffix).slice(-8)}`,
      customerType: "cliente_frecuente",
      creditEnabled: true,
      creditLimit: "1000.00"
    },
    headers: auth
  });
  expect(customerResponse.ok(), await customerResponse.text()).toBeTruthy();
  const customer = (await customerResponse.json()).data as { id: string };

  const routeSession = await loginApi(api, "owner.demo@tortillaplus.mx");
  const routeAuth = authHeaders(routeSession);
  const routeBranchId = routeSession.user.branches[0].branchId;
  const routeTortilla = await getTortillaProduct(api, routeSession);
  const routeCustomerResponse = await api.post(`${apiBaseUrl}/customers`, {
    data: {
      name: `Cliente ruta manual ${suffix}`,
      phone: `82${String(suffix).slice(-8)}`,
      customerType: "tienda",
      creditEnabled: false
    },
    headers: routeAuth
  });
  expect(routeCustomerResponse.ok(), await routeCustomerResponse.text()).toBeTruthy();
  const routeCustomer = (await routeCustomerResponse.json()).data as { id: string };
  let routeId: string | null = null;
  const routeResponse = await api.post(`${apiBaseUrl}/delivery-routes`, {
    data: { branchId: routeBranchId, name: `Ruta manual ${suffix}` },
    headers: routeAuth
  });
  if (routeResponse.ok()) {
    const route = (await routeResponse.json()).data as { id: string };
    routeId = route.id;
    const assignResponse = await api.post(`${apiBaseUrl}/delivery-routes/${route.id}/customers`, {
      data: { customerId: routeCustomer.id, sortOrder: 1 },
      headers: routeAuth
    });
    expect(assignResponse.ok(), await assignResponse.text()).toBeTruthy();

    await api.post(`${apiBaseUrl}/inventory/adjustments`, {
      data: { branchId: routeBranchId, productId: routeTortilla.id, direction: "in", quantity: "5.000", reason: "Stock ruta manual UX-R11" },
      headers: routeAuth
    });
    await api.post(`${apiBaseUrl}/delivery-orders`, {
      data: {
        branchId: routeBranchId,
        customerId: routeCustomer.id,
        routeId: route.id,
        items: [{ productId: routeTortilla.id, quantity: "1.000" }]
      },
      headers: { ...routeAuth, "Idempotency-Key": `manual-route-${suffix}` }
    });
  }

  const outputResponse = await api.post(`${apiBaseUrl}/products`, {
    data: {
      name: `Masa manual ${suffix}`,
      sku: `MASA-MAN-${suffix}`,
      productType: "masa",
      unit: "kg",
      isSellable: true,
      isStockTracked: true,
      requiresProduction: true
    },
    headers: auth
  });
  expect(outputResponse.ok(), await outputResponse.text()).toBeTruthy();
  const output = (await outputResponse.json()).data as { id: string };

  const ingredientResponse = await api.post(`${apiBaseUrl}/products`, {
    data: {
      name: `Maiz manual ${suffix}`,
      sku: `MAIZ-MAN-${suffix}`,
      productType: "raw_material",
      unit: "kg",
      isSellable: false,
      isStockTracked: true,
      requiresProduction: false,
      isRecipeIngredient: true
    },
    headers: auth
  });
  expect(ingredientResponse.ok(), await ingredientResponse.text()).toBeTruthy();
  const ingredient = (await ingredientResponse.json()).data as { id: string };

  const stockResponse = await api.post(`${apiBaseUrl}/inventory/adjustments`, {
    data: { branchId, productId: ingredient.id, direction: "in", quantity: "30.000", reason: "Stock receta manual UX-R11" },
    headers: auth
  });
  expect(stockResponse.ok(), await stockResponse.text()).toBeTruthy();

  const recipeResponse = await api.post(`${apiBaseUrl}/recipes`, {
    data: {
      branchId,
      name: `Receta manual ${suffix}`,
      outputProductId: output.id,
      expectedOutputQuantity: "10.000",
      outputUnit: "kg",
      ingredients: [{ productId: ingredient.id, quantity: "4.000", unit: "kg" }]
    },
    headers: auth
  });
  expect(recipeResponse.ok(), await recipeResponse.text()).toBeTruthy();
  const recipe = (await recipeResponse.json()).data as { currentVersionId: string };

  const batchResponse = await api.post(`${apiBaseUrl}/production/recipe-batches`, {
    data: {
      branchId,
      recipeVersionId: recipe.currentVersionId,
      productionDate: new Date().toISOString().slice(0, 10),
      expectedOutputQuantity: "10.000"
    },
    headers: auth
  });
  expect(batchResponse.ok(), await batchResponse.text()).toBeTruthy();
  const batch = (await batchResponse.json()).data as { id: string };

  return { branchId, customerId: customer.id, routeBranchId, routeId, batchId: batch.id };
}

test("captures end-user manual screenshots", async ({ page, request }) => {
  fs.mkdirSync(screenshotsDir, { recursive: true });

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Iniciar sesion" })).toBeVisible();
  await screenshot(page, "01-login");

  const session = await loginApi(request);
  const context = await prepareManualData(request, session);

  const branchPage = await page.context().newPage();
  await setSession(branchPage, session, null);
  await branchPage.goto("/app/select-branch");
  await expect(branchPage.getByRole("heading", { name: "Elige donde vas a trabajar" })).toBeVisible();
  await screenshot(branchPage, "02-seleccion-sucursal");
  await branchPage.close();

  await loginPage(page);

  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Resumen de hoy" })).toBeVisible();
  await screenshot(page, "03-panel-del-dia");

  await page.goto("/app/alerts");
  await expect(page.getByRole("heading", { name: "Centro de alertas" })).toBeVisible();
  await screenshot(page, "04-centro-alertas");

  await page.goto("/app/pos/sale");
  await page.waitForURL(/\/app\/pos\/sale/);
  await expect(page.getByText("F9 Cobrar")).toBeVisible();
  await selectPrimaryPosDevice(page);
  await screenshot(page, "05-pos-nueva-venta");

  await page.getByRole("button", { name: /Tortilla/ }).first().click();
  await page.getByLabel("Cantidad").fill("1");
  await page.getByRole("button", { name: "Agregar" }).click();
  await expect(page.getByRole("button", { name: /Cobrar/ })).toBeEnabled();
  await screenshot(page, "06-pos-ticket-con-productos");

  await page.getByRole("button", { name: /Cobrar/ }).click();
  await expect(page.getByRole("button", { name: "Completar venta" })).toBeVisible();
  await screenshot(page, "07-modal-cobro");
  await page.keyboard.press("Escape");

  await page.goto("/app/cash");
  await expect(page.getByRole("heading", { name: "Caja actual" })).toBeVisible();
  await screenshot(page, "08-caja");
  await page.getByLabel("Efectivo contado").fill(await expectedCashAmount(page));
  await expect(page.getByText("Paso 3 de 3")).toBeVisible();
  await screenshot(page, "09-cierre-caja");

  await page.goto("/app/production");
  await expect(page.getByRole("heading", { name: "Produccion de hoy" })).toBeVisible();
  await screenshot(page, "10-produccion");

  await page.goto("/app/production/batches/new");
  await expect(page.getByRole("heading", { name: "Nuevo lote por receta" })).toBeVisible();
  await screenshot(page, "11-nuevo-lote-receta");

  await page.goto(`/app/production/batches/${context.batchId}`);
  await expect(page.getByRole("heading", { name: "Cierre de lote por receta" })).toBeVisible();
  await page.getByLabel("Salida real").fill("10.000");
  await screenshot(page, "12-cierre-lote-receta");

  await page.goto("/app/inventory");
  await expect(page.getByRole("heading", { name: "Inventario, movimientos y trazabilidad" })).toBeVisible();
  await screenshot(page, "13-inventario");
  await expect(page.getByText("Movimientos trazables")).toBeVisible();
  await screenshot(page, "14-movimientos-inventario");

  await page.goto("/app/customers");
  await expect(page.getByRole("heading", { name: "Clientes frecuentes" })).toBeVisible();
  await screenshot(page, "15-clientes");

  await page.goto(`/app/customers/${context.customerId}`);
  await expect(page.getByText("Saldo", { exact: true }).first()).toBeVisible();
  await screenshot(page, "16-detalle-cliente");

  const routePage = await page.context().newPage();
  const ownerSession = await loginApi(request, "owner.demo@tortillaplus.mx");
  const screenshotRouteId = context.routeId ?? "manual-route-screenshot";
  await mockRouteScreenshotsData(routePage, context.routeBranchId, screenshotRouteId);
  await setSession(routePage, ownerSession, context.routeBranchId);
  await routePage.goto("/app/routes");
  const routesBlocked = routePage.getByRole("heading", { name: "Rutas de reparto no esta disponible en tu plan" });
  if (await routesBlocked.isVisible()) {
    throw new Error("Route screenshots require delivery_routes enabled for owner.demo@tortillaplus.mx.");
  }
  await expect(routePage.getByRole("heading", { name: "Reparto" })).toBeVisible();
  await screenshot(routePage, "17-rutas");
  await routePage.goto(`/app/routes/${screenshotRouteId}`);
  await expect(routePage.getByText("Siguiente cliente")).toBeVisible();
  await screenshot(routePage, "18-detalle-ruta");
  await routePage.close();

  await page.evaluate(() => window.localStorage.clear());
  await loginPage(page, "owner.demo@tortillaplus.mx");

  await page.goto("/app/fiscal/invoices");
  await expect(page.getByRole("heading", { name: "Facturas del dia" })).toBeVisible();
  await screenshot(page, "19-facturacion");

  await page.goto("/app/reports");
  await expect(page.getByRole("heading", { name: "Como va el negocio" })).toBeVisible();
  await screenshot(page, "20-reportes");
});
