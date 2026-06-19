import { expect, type APIRequestContext, type Page, test } from "@playwright/test";

const apiBaseUrl = "http://127.0.0.1:3199/api/v1";

async function loginApi(api: APIRequestContext) {
  const login = await api.post(`${apiBaseUrl}/auth/login`, {
    data: { email: "owner.demo@tortillaplus.mx", password: "Demo1234!" }
  });
  expect(login.ok(), await login.text()).toBeTruthy();
  const session = await login.json();
  const loginData = session.data ?? session;
  return {
    token: loginData.accessToken as string,
    branchId: loginData.user.branches[0].branchId as string
  };
}

async function loginPage(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill("owner.demo@tortillaplus.mx");
  await page.getByLabel("Contrasena").fill("Demo1234!");
  await page.getByRole("button", { name: "Entrar a mi sucursal" }).click();
  await page.waitForURL(/\/app(\/|$)/);
}

test("manager closes recipe batch from frontend and generated movements are auditable", async ({ page, request }) => {
  const { token, branchId } = await loginApi(request);
  const auth = { Authorization: `Bearer ${token}` };
  const suffix = Date.now();

  const outputResponse = await request.post(`${apiBaseUrl}/products`, {
    data: {
      name: `Masa E2E ${suffix}`,
      sku: `MASA-E2E-${suffix}`,
      productType: "masa",
      unit: "kg",
      isSellable: true,
      isStockTracked: true,
      requiresProduction: true
    },
    headers: auth
  });
  expect(outputResponse.ok(), await outputResponse.text()).toBeTruthy();
  const output = (await outputResponse.json()).data;

  const ingredientResponse = await request.post(`${apiBaseUrl}/products`, {
    data: {
      name: `Maiz E2E ${suffix}`,
      sku: `MAIZ-E2E-${suffix}`,
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
  const ingredient = (await ingredientResponse.json()).data;

  const stockResponse = await request.post(`${apiBaseUrl}/inventory/adjustments`, {
    data: {
      branchId,
      productId: ingredient.id,
      direction: "in",
      quantity: "20.000",
      reason: "Stock inicial receta E2E"
    },
    headers: auth
  });
  expect(stockResponse.ok(), await stockResponse.text()).toBeTruthy();

  const recipeResponse = await request.post(`${apiBaseUrl}/recipes`, {
    data: {
      branchId,
      name: `Receta E2E ${suffix}`,
      outputProductId: output.id,
      expectedOutputQuantity: "10.000",
      outputUnit: "kg",
      ingredients: [
        {
          productId: ingredient.id,
          quantity: "4.000",
          unit: "kg"
        }
      ]
    },
    headers: auth
  });
  expect(recipeResponse.ok(), await recipeResponse.text()).toBeTruthy();
  const recipe = (await recipeResponse.json()).data;

  const batchResponse = await request.post(`${apiBaseUrl}/production/recipe-batches`, {
    data: {
      branchId,
      recipeVersionId: recipe.currentVersionId,
      productionDate: new Date().toISOString().slice(0, 10),
      expectedOutputQuantity: "10.000"
    },
    headers: auth
  });
  expect(batchResponse.ok(), await batchResponse.text()).toBeTruthy();
  const batch = (await batchResponse.json()).data;

  await loginPage(page);
  await page.goto(`/app/manager/production/batches/${batch.id}`);

  await expect(page.getByRole("heading", { name: "Cierre de lote por receta" })).toBeVisible();
  await expect(page.getByText(output.name)).toBeVisible();
  await expect(page.getByText(ingredient.name)).toBeVisible();

  await page.getByLabel("Salida real").fill("10.000");
  await page.locator("tr", { hasText: ingredient.name }).locator("input").fill("4.000");
  await page.getByRole("button", { name: "Cerrar lote" }).click();

  await expect(page.getByText("Cerrado")).toBeVisible();
  await expect(page.getByText("Consumo de insumo")).toBeVisible();
  await expect(page.getByText("Entrada de produccion")).toBeVisible();

  const movementsResponse = await request.get(
    `${apiBaseUrl}/inventory/movements?branchId=${branchId}&referenceType=production_batch&referenceId=${batch.id}`,
    { headers: auth }
  );
  expect(movementsResponse.ok(), await movementsResponse.text()).toBeTruthy();
  const movements = (await movementsResponse.json()).data as Array<{ movementType: string }>;
  expect(movements.some((movement) => movement.movementType === "production_input_out")).toBeTruthy();
  expect(movements.some((movement) => movement.movementType === "production_in")).toBeTruthy();

  await page.goto("/app/manager/reports");
  await expect(page.getByRole("heading", { name: "Como va el negocio" })).toBeVisible();
  await expect(page.getByText("Produccion real")).toBeVisible();
  await expect(page.getByText("Lotes recientes por receta")).toBeVisible();
  await expect(page.getByRole("cell", { name: `${recipe.name} v1` })).toBeVisible();
  await expect(page.locator("article", { hasText: "Consumo de insumos" }).getByText(ingredient.name)).toBeVisible();
});

test("manager records inventory adjustment and waste with traceable movements", async ({ page, request }) => {
  const { token, branchId } = await loginApi(request);
  const auth = { Authorization: `Bearer ${token}` };
  const suffix = Date.now();
  const adjustmentReason = `Ajuste UX-R6 ${suffix}`;

  const productResponse = await request.post(`${apiBaseUrl}/products`, {
    data: {
      name: `Salsa UX-R6 ${suffix}`,
      sku: `SALSA-UXR6-${suffix}`,
      productType: "retail",
      unit: "piece",
      isSellable: true,
      isStockTracked: true,
      requiresProduction: false
    },
    headers: auth
  });
  expect(productResponse.ok(), await productResponse.text()).toBeTruthy();
  const product = (await productResponse.json()).data;

  const stockResponse = await request.post(`${apiBaseUrl}/inventory/adjustments`, {
    data: {
      branchId,
      productId: product.id,
      direction: "in",
      quantity: "12.000",
      reason: "Stock inicial UX-R6"
    },
    headers: auth
  });
  expect(stockResponse.ok(), await stockResponse.text()).toBeTruthy();

  await loginPage(page);
  await page.goto("/app/inventory");

  await expect(page.getByRole("heading", { name: "Inventario, movimientos y trazabilidad" })).toBeVisible();
  await expect(page.getByRole("button", { name: product.name })).toBeVisible();

  const adjustmentPanel = page.locator("article", { hasText: "Ajustes y merma" });
  await adjustmentPanel.locator("select").first().selectOption(product.id);
  await adjustmentPanel.getByLabel("Cantidad").fill("2.000");
  await adjustmentPanel.getByLabel("Motivo de ajuste").fill(adjustmentReason);
  await page.getByRole("button", { name: "Salida" }).click();

  const adjustmentRow = page.locator("tr", { hasText: adjustmentReason });
  await expect(adjustmentRow).toBeVisible();
  await expect(adjustmentRow.getByText("Ajuste salida")).toBeVisible();

  await adjustmentPanel.getByLabel("Cantidad").fill("1.000");
  await adjustmentPanel.getByLabel("Motivo de merma").selectOption("producto_vencido");
  await page.getByRole("button", { name: "Merma" }).click();

  await page.locator("article", { hasText: "Movimientos trazables" }).getByRole("combobox").first().selectOption(product.id);
  const wasteRow = page.locator("tr", { hasText: "Merma" }).filter({ hasText: product.name });
  await expect(wasteRow).toBeVisible();
  await expect(adjustmentRow.getByText("Ajuste manual")).toBeVisible();
  await expect(adjustmentRow.getByText(product.name)).toBeVisible();
});
