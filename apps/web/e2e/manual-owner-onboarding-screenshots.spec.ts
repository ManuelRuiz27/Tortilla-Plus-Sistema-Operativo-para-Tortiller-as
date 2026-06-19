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
    branches: Array<{ branchId: string; branchName: string; role: string; status: string }>;
  };
};

type OnboardingContext = {
  branchId: string;
  outputProductId: string;
  ingredientProductId: string;
};

async function loginApi(api: APIRequestContext, email = "owner.demo@tortillaplus.mx"): Promise<Session> {
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

async function loginPage(page: Page, email = "owner.demo@tortillaplus.mx") {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contrasena").fill("Demo1234!");
  await page.getByRole("button", { name: "Entrar a mi sucursal" }).click();
  await page.waitForURL(/\/app(\/|$)/);
}

async function screenshot(page: Page, name: string) {
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.screenshot({ fullPage: true, path: path.join(screenshotsDir, `${name}.png`) });
}

async function prepareOwnerOnboardingData(api: APIRequestContext, session: Session): Promise<OnboardingContext> {
  const branchId = session.user.branches[0].branchId;
  const auth = authHeaders(session);
  const suffix = Date.now();

  const outputResponse = await api.post(`${apiBaseUrl}/products`, {
    data: {
      name: `Masa arranque ${suffix}`,
      sku: `MASA-ARR-${suffix}`,
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
      name: `Maiz arranque ${suffix}`,
      sku: `MAIZ-ARR-${suffix}`,
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

  const priceResponse = await api.post(`${apiBaseUrl}/prices/branch`, {
    data: { branchId, productId: output.id, saleMode: "by_kg", price: "24.00" },
    headers: auth
  });
  expect(priceResponse.ok(), await priceResponse.text()).toBeTruthy();

  const stockResponse = await api.post(`${apiBaseUrl}/inventory/adjustments`, {
    data: {
      branchId,
      productId: ingredient.id,
      direction: "in",
      quantity: "25.000",
      reason: "Carga inicial onboarding UX-R12"
    },
    headers: auth
  });
  expect(stockResponse.ok(), await stockResponse.text()).toBeTruthy();

  return { branchId, outputProductId: output.id, ingredientProductId: ingredient.id };
}

test("captures owner onboarding screenshots", async ({ page, request }) => {
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const session = await loginApi(request);
  const context = await prepareOwnerOnboardingData(request, session);

  await loginPage(page);

  await page.goto("/app/settings");
  await expect(page.getByRole("heading", { name: "Sucursal, cajas y plan" })).toBeVisible();
  await screenshot(page, "21-settings");

  await page.goto("/app/admin/products");
  await expect(page.getByRole("heading", { name: "Productos de venta" })).toBeVisible();
  await screenshot(page, "22-productos-listado");
  await page.getByPlaceholder("Nombre").fill("Tortilla kg arranque");
  await page.getByPlaceholder("Clave interna").fill("TORTILLA-ARR");
  await page.locator("select").first().selectOption("tortilla");
  await expect(page.getByRole("button", { name: "Crear" })).toBeEnabled();
  await screenshot(page, "23-producto-nuevo");

  await page.goto("/app/admin/prices");
  await expect(page.getByRole("heading", { name: "Precios de venta" })).toBeVisible();
  await page.locator("select").first().selectOption(context.outputProductId);
  await page.getByPlaceholder("Precio").fill("24.00");
  await screenshot(page, "24-precios");

  await page.goto("/app/inventory/inputs");
  await expect(page.getByRole("heading", { name: "Materias primas y empaques" })).toBeVisible();
  await screenshot(page, "25-insumos-listado");
  await page.getByPlaceholder("Nombre").first().fill("Maiz blanco arranque");
  await page.getByPlaceholder("Clave").fill("MAIZ-BLANCO");
  await page.getByPlaceholder("Costal, cubeta").fill("costal");
  await page.getByPlaceholder("25.000").fill("50.000");
  await screenshot(page, "26-insumo-nuevo");

  await page.goto("/app/production/recipes");
  await expect(page.getByRole("heading", { name: "Recetas de produccion" })).toBeVisible();
  await screenshot(page, "27-recetas-listado");
  await page.getByPlaceholder("Nombre").fill("Masa base arranque");
  await page.locator("select").first().selectOption(context.outputProductId);
  await page.locator("select").nth(1).selectOption(context.ingredientProductId);
  await screenshot(page, "28-receta-nueva");

  await page.goto("/app/inventory");
  await expect(page.getByRole("heading", { name: "Inventario, movimientos y trazabilidad" })).toBeVisible();
  await page.locator("article", { hasText: "Ajustes y merma" }).locator("select").first().selectOption(context.ingredientProductId);
  await page.getByLabel("Cantidad").fill("10.000");
  await page.getByLabel("Motivo de ajuste").fill("Carga inicial de inventario");
  await screenshot(page, "29-inventario-ajuste-inicial");

  await page.goto("/app/customers");
  await expect(page.getByRole("heading", { name: "Clientes frecuentes" })).toBeVisible();
  await page.getByPlaceholder("Nombre del cliente").fill("Cliente prueba arranque");
  await page.getByPlaceholder("Telefono").fill("8112345678");
  await screenshot(page, "30-cliente-nuevo");

  await page.route(`**/api/v1/cash-sessions/open?branchId=${context.branchId}`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data: null })
    });
  });
  await page.goto("/app/pos/cash/open");
  await expect(page.getByRole("button", { name: "Abrir caja" })).toBeVisible();
  await page.getByLabel("Efectivo contado").fill("500.00");
  await page.getByLabel("Nota opcional").fill("Apertura de prueba");
  await screenshot(page, "31-apertura-caja");
  await page.unroute(`**/api/v1/cash-sessions/open?branchId=${context.branchId}`);

  const cashSession = await loginApi(request, "manager.demo@tortillaplus.mx");
  const openCash = await request.post(`${apiBaseUrl}/cash-sessions/open`, {
    data: { branchId: context.branchId, openingAmountCounted: "500.00", openingNote: "Venta prueba UX-R12" },
    headers: authHeaders(cashSession)
  });
  expect([200, 201, 409]).toContain(openCash.status());

  await page.goto("/app/pos/sale");
  await page.waitForURL(/\/app\/pos\/sale/);
  await expect(page.getByRole("heading", { name: "Nueva venta" })).toBeVisible();
  await page.getByPlaceholder("Buscar producto").fill("Masa arranque");
  await screenshot(page, "32-venta-prueba-pos");
});
