import { expect, test } from "@playwright/test";

test("manager can enter operational routes with mocks disabled", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Correo").fill("owner.demo@tortillaplus.mx");
  await page.getByLabel("Contrasena").fill("Demo1234!");
  await page.getByRole("button", { name: "Entrar a mi sucursal" }).click();
  await page.waitForURL(/\/app\//);

  await page.goto("/app/manager/routes");

  await expect(page.getByRole("heading", { name: "Reparto" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pedidos de hoy" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Liquidaciones pendientes" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Abrir/ }).first()).toBeVisible();
});
