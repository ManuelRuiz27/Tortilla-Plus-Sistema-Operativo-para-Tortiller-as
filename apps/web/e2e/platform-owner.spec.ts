import { expect, test, type APIRequestContext } from "@playwright/test";

const apiBaseUrl = "http://127.0.0.1:3199/api/v1";

async function loginPlatformOwner(request: APIRequestContext) {
  const response = await request.post(`${apiBaseUrl}/auth/login`, {
    data: { email: "admin@tortillaplus.mx", password: "Demo1234!" }
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return await response.json();
}

async function ensureOrganization(request: APIRequestContext, token: string, suffix: number) {
  const listResponse = await request.get(`${apiBaseUrl}/platform/organizations`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  expect(listResponse.ok(), await listResponse.text()).toBeTruthy();
  const listPayload = await listResponse.json();
  const organizations = (listPayload.data ?? listPayload) as Array<{ id: string }>;
  if (organizations.length > 0) return organizations[0].id;

  const createResponse = await request.post(`${apiBaseUrl}/platform/organizations`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name: `Org E2E ${suffix}`,
      contactEmail: `e2e-${suffix}@tortillaplus.mx`,
      planCode: "free"
    }
  });
  expect(createResponse.ok(), await createResponse.text()).toBeTruthy();
  const createPayload = await createResponse.json();
  return (createPayload.data ?? createPayload).id as string;
}

test("platform owner can enter platform routes and view operational panels", async ({ page, request }) => {
  const session = await loginPlatformOwner(request);
  const loginData = session.data ?? session;
  const suffix = Date.now();
  await ensureOrganization(request, loginData.accessToken as string, suffix);

  await page.addInitScript((payload) => {
    window.localStorage.setItem(
      "tp-auth",
      JSON.stringify({
        state: {
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken,
          user: payload.user,
          isAuthenticated: true
        },
        version: 0
      })
    );
    window.localStorage.setItem(
      "tp-branch",
      JSON.stringify({
        state: {
          activeBranchId: null,
          activeBranchName: null,
          branches: []
        },
        version: 0
      })
    );
  }, loginData);

  await page.goto("/platform");
  await expect(page.getByRole("heading", { name: "Dashboard SaaS" })).toBeVisible();

  await page.goto("/platform/organizations");
  await expect(page.getByRole("heading", { name: "Organizaciones" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Crear organizacion" })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();

  await page.goto("/platform/subscriptions");
  await expect(page.getByRole("heading", { name: "Suscripciones" })).toBeVisible();

  await page.goto("/platform/pos-devices");
  await expect(page.getByRole("heading", { name: "POS / Licencias" })).toBeVisible();

  await page.goto("/platform/payments");
  await expect(page.getByRole("heading", { name: "Pagos SaaS" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Registrar pago manual" })).toBeVisible();

  await page.goto("/platform/audit");
  await expect(page.getByRole("heading", { name: "Auditoria global" })).toBeVisible();
});
