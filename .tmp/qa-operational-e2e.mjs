import { spawn } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const apiBase = "http://localhost:3000/api/v1";
const webBase = "http://localhost:5173";
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const chromePort = 9222;
const qaStamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const qaName = `QA Tienda E2E ${qaStamp}`;
const qaRouteName = `QA Ruta E2E ${qaStamp}`;
const qaDriverName = `QA Repartidor E2E ${qaStamp}`;

let accessToken = "";

function log(step, details = {}) {
  console.log(JSON.stringify({ step, ...details }));
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(options.headers ?? {})
  };
  const response = await fetch(`${apiBase}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = payload?.message ?? response.statusText;
    const error = new Error(`${response.status} ${payload?.error ?? "ERROR"}: ${message}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload?.data ?? payload;
}

async function apiMaybe(path, options = {}) {
  try {
    return await api(path, options);
  } catch (error) {
    return { error };
  }
}

async function waitFor(description, fn, timeoutMs = 20000) {
  const start = Date.now();
  let lastError;
  while (Date.now() - start < timeoutMs) {
    try {
      const result = await fn();
      if (result) {
        return result;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 300));
  }
  throw new Error(`Timeout esperando ${description}${lastError ? `: ${lastError.message}` : ""}`);
}

async function setupData() {
  const login = await api("/auth/login", {
    method: "POST",
    body: { email: "owner.demo@tortillaplus.mx", password: "Demo1234!" }
  });
  accessToken = login.accessToken;
  const me = await api("/auth/me");
  const branch = me.branches.find((item) => item.status === "active") ?? me.branches[0];
  if (!branch) throw new Error("No hay sucursal activa para QA.");
  const branchId = branch.branchId;

  const openCash = await apiMaybe(`/cash-sessions/open?branchId=${encodeURIComponent(branchId)}`);
  if (openCash.error) {
    await api("/cash-sessions/open", {
      method: "POST",
      body: { branchId, openingAmountCounted: "500.00" }
    });
  }

  const products = await api("/products");
  const tortilla = products.find((item) => item.productType === "tortilla" && item.isSellable);
  const masa = products.find((item) => item.productType === "masa" && item.isSellable);
  const packageProduct = products.find((item) => item.productType === "package" && item.isSellable);
  if (!tortilla || !masa || !packageProduct) {
    throw new Error("Faltan productos reales sellables: tortilla, masa o paquete.");
  }

  for (const [product, modes, price] of [
    [tortilla, ["by_kg", "by_amount"], "28.00"],
    [masa, ["by_kg", "by_amount"], "18.00"],
    [packageProduct, ["by_package"], "24.00"]
  ]) {
    for (const saleMode of modes) {
      await api("/prices/branch", {
        method: "POST",
        body: { branchId, productId: product.id, saleMode, price }
      });
    }
    await apiMaybe("/inventory/adjustments", {
      method: "POST",
      body: { branchId, productId: product.id, direction: "in", quantity: "250.000", reason: "qa_e2e_stock" }
    });
  }

  const customer = await api("/customers", {
    method: "POST",
    body: {
      name: qaName,
      customerType: "tienda",
      phone: "555-0100",
      email: `qa-${qaStamp}@tortillaplus.local`,
      creditEnabled: true,
      creditLimit: "120.00"
    }
  });
  await api(`/customers/${customer.id}/credit`, {
    method: "POST",
    body: { creditEnabled: true, creditLimit: "120.00" }
  });
  await api(`/customers/${customer.id}/prices`, {
    method: "POST",
    body: { branchId, productId: tortilla.id, saleMode: "by_kg", price: "22.00" }
  });

  const quote = await api("/sales/quote", {
    method: "POST",
    body: {
      branchId,
      customerId: customer.id,
      items: [{ productId: tortilla.id, saleMode: "by_kg", quantity: "3.000" }]
    }
  });
  if (quote.items[0]?.priceSource !== "customer" || Number(quote.total) !== 66) {
    throw new Error(`Cotizacion especial incorrecta: ${JSON.stringify(quote)}`);
  }

  const driver = await api("/delivery-drivers", {
    method: "POST",
    body: { name: qaDriverName, phone: "555-0200" }
  });
  const route = await api("/delivery-routes", {
    method: "POST",
    body: { branchId, name: qaRouteName, driverId: driver.id }
  });
  await api(`/delivery-routes/${route.id}/customers`, {
    method: "POST",
    body: { customerId: customer.id, sortOrder: 1 }
  });

  return { branch, branchId, customer, driver, route, tortilla, masa, packageProduct };
}

class Cdp {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.nextId = 1;
    this.pending = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolveConnect, rejectConnect) => {
      this.ws.addEventListener("open", resolveConnect, { once: true });
      this.ws.addEventListener("error", rejectConnect, { once: true });
    });
    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) {
        pending.reject(new Error(`${message.error.message}: ${message.error.data ?? ""}`));
      } else {
        pending.resolve(message.result);
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolveSend, rejectSend) => {
      this.pending.set(id, { resolve: resolveSend, reject: rejectSend });
    });
  }

  async eval(fn, ...args) {
    const expression = `(${fn.toString()})(...${JSON.stringify(args)})`;
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (result.exceptionDetails) {
      throw new Error(
        result.exceptionDetails.exception?.description ??
        result.exceptionDetails.text ??
        "Runtime.evaluate fallo"
      );
    }
    return result.result.value;
  }
}

async function launchChrome() {
  const userDataDir = resolve(".tmp", "chrome-qa");
  if (existsSync(userDataDir)) rmSync(userDataDir, { recursive: true, force: true });
  mkdirSync(userDataDir, { recursive: true });

  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${chromePort}`,
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--disable-translate",
    "about:blank"
  ], { detached: true, stdio: "ignore" });
  chrome.unref();

  const version = await waitFor("Chrome CDP", async () => {
    const response = await fetch(`http://localhost:${chromePort}/json/version`);
    return response.ok ? response.json() : null;
  }, 15000);
  const pageInfo = await fetch(`http://localhost:${chromePort}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" }).then((response) => response.json());
  const cdp = new Cdp(pageInfo.webSocketDebuggerUrl ?? version.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");
  await cdp.send("Network.enable");
  return cdp;
}

async function navigate(cdp, url) {
  await cdp.send("Page.navigate", { url });
  await waitFor(`navegacion ${url}`, () => cdp.eval((expectedUrl) => location.href.startsWith(expectedUrl), url), 20000);
  await waitFor(`carga ${url}`, () => cdp.eval(() => document.readyState === "complete"), 20000);
}

async function browserLogin(cdp, branchId) {
  await navigate(cdp, `${webBase}/login`);
  await cdp.eval(() => {
    function setValue(selector, value) {
      const input = document.querySelector(selector);
      if (!input) throw new Error(`No existe ${selector}`);
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    localStorage.clear();
    setValue("#email", "owner.demo@tortillaplus.mx");
    setValue("#password", "Demo1234!");
    document.querySelector("form button[type=submit]").click();
  });
  await waitFor("login en app", () => cdp.eval(() => location.pathname.startsWith("/app")), 20000);
  const path = await cdp.eval(() => location.pathname);
  if (path.includes("select-branch")) {
    await cdp.eval((targetBranchId) => {
      const cards = [...document.querySelectorAll("article")];
      const card = cards.find((item) => item.textContent.includes(targetBranchId)) ?? cards[0];
      const button = card?.querySelector("button");
      if (!button) throw new Error("No hay boton Entrar de sucursal.");
      button.click();
    }, branchId);
    await waitFor("sucursal activa", () => cdp.eval(() => !location.pathname.includes("select-branch")), 10000);
  }
}

async function clickByText(cdp, text, scopeText = "") {
  await cdp.eval((buttonText, containerText) => {
    const root = containerText
      ? [...document.querySelectorAll("article,section,div")].find((item) => item.textContent.includes(containerText))
      : document;
    const button = [...(root ?? document).querySelectorAll("button,a")]
      .find((item) => item.textContent.trim().includes(buttonText) && !item.disabled);
    if (!button) throw new Error(`No hay boton/enlace habilitado: ${buttonText}`);
    button.click();
  }, text, scopeText);
}

async function runPosSale(cdp, context, sale) {
  await navigate(cdp, `${webBase}/app/pos/sale?customerId=${encodeURIComponent(context.customer.id)}`);
  await waitFor("POS con cliente seleccionado", () => cdp.eval((name) => document.body.textContent.includes("Venta en mostrador") && document.body.textContent.includes(name), context.customer.name), 20000);
  await cdp.eval(() => {
    const body = document.body.textContent;
    if (body.includes("Venta actual") && !body.includes("Agrega productos para comenzar.")) {
      const button = [...document.querySelectorAll("button")].find((item) => item.textContent.trim() === "Vaciar");
      button?.click();
    }
  });

  if (sale.kind === "package") {
    await cdp.eval(() => document.querySelector("#package-800-button")?.click());
  } else {
    await cdp.eval((inputId, value) => {
      const input = document.querySelector(`#${inputId}`);
      if (!input) throw new Error(`No existe #${inputId}`);
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      const button = input.parentElement?.querySelector("button");
      if (!button) throw new Error(`No encontre boton Agregar para #${inputId}`);
      button.click();
    }, sale.inputId, sale.value);
  }

  await waitFor("item cotizado en carrito", () => cdp.eval((requiresCustomerPrice) => {
    const text = document.body.textContent;
    return text.includes("Subtotal") && (!requiresCustomerPrice || text.includes("Precio cliente"));
  }, sale.requiresCustomerPrice ?? false), 15000);

  await clickByText(cdp, "Cobrar");
  await waitFor("modal de cobro", () => cdp.eval(() =>
    [...document.querySelectorAll("button")].some((button) => button.textContent.trim() === "Fiado")
  ), 10000);
  if (sale.mode === "cash") {
    await clickByText(cdp, "Efectivo");
  }
  if (sale.mode === "card") {
    await clickByText(cdp, "Tarjeta");
    await cdp.eval((reference) => {
      const input = document.querySelector("#card-reference");
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(input, reference);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }, sale.reference);
  }
  if (sale.mode === "transfer") {
    await clickByText(cdp, "Transfer.");
    await cdp.eval((reference) => {
      const input = document.querySelector("#transfer-reference");
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(input, reference);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }, sale.reference);
  }
  if (sale.mode === "credit") {
    await clickByText(cdp, "Fiado");
    if (sale.pin) {
      await waitFor("PIN de credito excedido", () => cdp.eval(() => Boolean(document.querySelector("input[placeholder='PIN de autorizacion']"))), 10000);
      await cdp.eval((pin) => {
        const input = document.querySelector("input[placeholder='PIN de autorizacion']");
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
        setter.call(input, pin);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }, sale.pin);
    }
  }
  await clickByText(cdp, "Completar venta");
  await waitFor("venta completada", () => cdp.eval(() => document.body.textContent.includes("Venta completada")), 20000);
  const successText = await cdp.eval(() => document.body.textContent);
  await clickByText(cdp, "Nueva venta");
  log("pos_sale_ok", { mode: sale.mode, kind: sale.kind, success: successText.includes("Venta completada") });
}

async function runRouteFlow(cdp, context) {
  await navigate(cdp, `${webBase}/app/manager/routes/${encodeURIComponent(context.route.id)}`);
  await waitFor("detalle de ruta real", () => cdp.eval((routeName, customerName) => document.body.textContent.includes(routeName) && document.body.textContent.includes(customerName), context.route.name, context.customer.name), 20000);

  await cdp.eval((customerId, tortillaId) => {
    const article = [...document.querySelectorAll("article")].find((item) => item.textContent.includes("Nuevo pedido"));
    if (!article) throw new Error("No existe panel Nuevo pedido.");
    const [customerSelect, productSelect] = article.querySelectorAll("select");
    const quantityInput = article.querySelector("input");
    function setSelect(select, value) {
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
      setter.call(select, value);
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    function setInput(input, value) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    setSelect(customerSelect, customerId);
    setSelect(productSelect, tortillaId);
    setInput(quantityInput, "2.000");
    [...article.querySelectorAll("button")].find((button) => button.textContent.includes("Agregar"))?.click();
  }, context.customer.id, context.tortilla.id);
  await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  await cdp.eval((packageProductId) => {
    const article = [...document.querySelectorAll("article")].find((item) => item.textContent.includes("Nuevo pedido"));
    const productSelect = article.querySelectorAll("select")[1];
    const quantityInput = article.querySelector("input");
    const selectSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
    const inputSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    selectSetter.call(productSelect, packageProductId);
    productSelect.dispatchEvent(new Event("change", { bubbles: true }));
    inputSetter.call(quantityInput, "1.000");
    quantityInput.dispatchEvent(new Event("input", { bubbles: true }));
    [...article.querySelectorAll("button")].find((button) => button.textContent.includes("Agregar"))?.click();
  }, context.packageProduct.id);
  await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  await clickByText(cdp, "Crear", "Nuevo pedido");

  const order = await waitFor("pedido real creado", async () => {
    const orders = await api(`/delivery-orders?branchId=${encodeURIComponent(context.branchId)}&routeId=${encodeURIComponent(context.route.id)}`);
    return orders.find((item) => item.customerId === context.customer.id);
  }, 20000);
  log("delivery_order_created", { orderId: order.id, total: order.total, items: order.items.length });

  for (const [buttonText, expectedStatus] of [["Preparar", "prepared"], ["Cargar", "loaded"], ["En ruta", "in_route"]]) {
    await waitFor(`boton ${buttonText}`, () => cdp.eval((text) => [...document.querySelectorAll("button")].some((button) => button.textContent.includes(text) && !button.disabled), buttonText), 10000);
    await clickByText(cdp, buttonText);
    await waitFor(`pedido ${expectedStatus}`, async () => {
      const orders = await api(`/delivery-orders?branchId=${encodeURIComponent(context.branchId)}&routeId=${encodeURIComponent(context.route.id)}`);
      return orders.find((item) => item.id === order.id && item.status === expectedStatus);
    }, 15000);
  }

  await waitFor("boton entregar", () => cdp.eval(() => [...document.querySelectorAll("button")].some((button) => button.textContent.includes("Entregar") && !button.disabled)), 10000);
  await clickByText(cdp, "Entregar");
  const deliveredOrder = await waitFor("pedido entregado", async () => {
    const orders = await api(`/delivery-orders?branchId=${encodeURIComponent(context.branchId)}&routeId=${encodeURIComponent(context.route.id)}`);
    return orders.find((item) => item.id === order.id && item.status === "delivered");
  }, 15000);

  await cdp.eval((orderId, amount) => {
    const article = [...document.querySelectorAll("article")].find((item) => item.textContent.includes("Cobro en ruta"));
    const select = article.querySelector("select");
    const amountInput = article.querySelector("input[placeholder='Monto']");
    const selectSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
    const inputSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    selectSetter.call(select, orderId);
    select.dispatchEvent(new Event("change", { bubbles: true }));
    inputSetter.call(amountInput, String(amount));
    amountInput.dispatchEvent(new Event("input", { bubbles: true }));
    [...article.querySelectorAll("button")].find((button) => button.textContent.includes("Cobrar"))?.click();
  }, order.id, deliveredOrder.amountPending);

  const paidOrder = await waitFor("pedido cobrado", async () => {
    const orders = await api(`/delivery-orders?branchId=${encodeURIComponent(context.branchId)}&routeId=${encodeURIComponent(context.route.id)}`);
    return orders.find((item) => item.id === order.id && item.status === "paid");
  }, 15000);
  log("delivery_payment_ok", { orderId: paidOrder.id, paid: paidOrder.amountCollected });

  await clickByText(cdp, "Crear", "Cierre de ruta");
  const settlement = await waitFor("liquidacion creada con efectivo esperado", async () => {
    const settlements = await api(`/delivery-settlements?branchId=${encodeURIComponent(context.branchId)}&routeId=${encodeURIComponent(context.route.id)}`);
    return settlements.find((item) => item.status === "open" && Number(item.expectedCashAmount) === Number(paidOrder.amountCollected));
  }, 15000);

  await cdp.eval((settlementId, amount) => {
    const article = [...document.querySelectorAll("article")].find((item) => item.textContent.includes("Cierre de ruta"));
    const select = article.querySelector("select");
    const input = article.querySelector("input[placeholder='Efectivo']");
    const selectSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
    const inputSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    selectSetter.call(select, settlementId);
    select.dispatchEvent(new Event("change", { bubbles: true }));
    inputSetter.call(input, String(amount));
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, settlement.id, settlement.expectedCashAmount);
  await clickByText(cdp, "Cerrar", "Cierre de ruta");
  const closed = await waitFor("liquidacion cerrada", async () => {
    const settlements = await api(`/delivery-settlements?branchId=${encodeURIComponent(context.branchId)}&routeId=${encodeURIComponent(context.route.id)}`);
    return settlements.find((item) => item.id === settlement.id && item.status === "closed");
  }, 15000);

  await clickByText(cdp, "Depositar", "Cierre de ruta");
  const deposited = await waitFor("liquidacion depositada", async () => {
    const settlements = await api(`/delivery-settlements?branchId=${encodeURIComponent(context.branchId)}&routeId=${encodeURIComponent(context.route.id)}`);
    return settlements.find((item) => item.id === settlement.id && item.cashSessionId);
  }, 15000);

  const duplicateDeposit = await apiMaybe(`/delivery-settlements/${settlement.id}/deposit-to-cash`, {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: {}
  });
  if (!duplicateDeposit.error || duplicateDeposit.error.payload?.error !== "SETTLEMENT_ALREADY_DEPOSITED") {
    throw new Error(`Deposito duplicado no fue bloqueado: ${JSON.stringify(duplicateDeposit)}`);
  }

  const secondSettlement = await api("/delivery-settlements", {
    method: "POST",
    body: { branchId: context.branchId, routeId: context.route.id, driverId: context.driver.id }
  });
  if (Number(secondSettlement.expectedCashAmount) !== 0) {
    throw new Error(`Doble liquidacion no bloqueada; esperado ${secondSettlement.expectedCashAmount}`);
  }

  log("settlement_ok", {
    settlementId: closed.id,
    expectedCashAmount: closed.expectedCashAmount,
    cashSessionId: deposited.cashSessionId,
    duplicateDepositBlocked: true,
    secondSettlementExpectedCash: secondSettlement.expectedCashAmount
  });
}

async function capture(cdp) {
  mkdirSync(".tmp", { recursive: true });
  const screenshot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  const file = resolve(".tmp", `qa-operational-e2e-${qaStamp}.png`);
  writeFileSync(file, Buffer.from(screenshot.data, "base64"));
  return file;
}

async function main() {
  const health = await fetch(`${apiBase}/health`).then((response) => response.json());
  log("health", health);
  const context = await setupData();
  log("setup_ok", {
    branchId: context.branchId,
    customerId: context.customer.id,
    routeId: context.route.id,
    products: [context.tortilla.name, context.masa.name, context.packageProduct.name]
  });

  const cdp = await launchChrome();
  await browserLogin(cdp, context.branchId);
  log("browser_login_ok");

  await runPosSale(cdp, context, { mode: "credit", kind: "weight", inputId: "tortilla-kg-input", value: "3", requiresCustomerPrice: true });
  const balanceAfterInsideCredit = await api(`/customers/${context.customer.id}/balance`);
  if (Number(balanceAfterInsideCredit.currentBalance) !== 66) {
    throw new Error(`Saldo esperado 66 despues de credito dentro de limite; recibido ${balanceAfterInsideCredit.currentBalance}`);
  }
  await runPosSale(cdp, context, { mode: "credit", kind: "weight", inputId: "tortilla-kg-input", value: "5", requiresCustomerPrice: true, pin: "1234" });
  await runPosSale(cdp, context, { mode: "cash", kind: "weight", inputId: "masa-kg-input", value: "1" });
  await runPosSale(cdp, context, { mode: "card", kind: "weight", inputId: "tortilla-kg-input", value: "1", requiresCustomerPrice: true, reference: `CARD-${qaStamp}` });
  await runPosSale(cdp, context, { mode: "transfer", kind: "package", reference: `TR-${qaStamp}` });

  const balanceAfterCredit = await api(`/customers/${context.customer.id}/balance`);
  if (Number(balanceAfterCredit.currentBalance) !== 176) {
    throw new Error(`Saldo esperado 176 despues de creditos POS; recibido ${balanceAfterCredit.currentBalance}`);
  }
  log("pos_credit_balance_ok", { currentBalance: balanceAfterCredit.currentBalance });

  await runRouteFlow(cdp, context);
  const routeOrders = await api(`/delivery-orders?branchId=${encodeURIComponent(context.branchId)}&routeId=${encodeURIComponent(context.route.id)}`);
  const finalOrder = routeOrders.find((item) => item.customerId === context.customer.id);
  const screenshotFile = await capture(cdp);

  log("qa_completed", {
    customer: context.customer.name,
    customerId: context.customer.id,
    currentBalance: balanceAfterCredit.currentBalance,
    deliveryOrderId: finalOrder?.id,
    deliveryOrderStatus: finalOrder?.status,
    screenshotFile
  });
}

main().catch((error) => {
  console.error(JSON.stringify({ step: "qa_failed", message: error.message, payload: error.payload ?? null, stack: error.stack }));
  process.exitCode = 1;
});
