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
  await page.waitForURL(/\/app\//);
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
});
