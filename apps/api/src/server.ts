import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";

import { DomainError, toErrorResponse } from "./lib/domain-error.js";
import { prisma } from "./lib/prisma.js";
import {
  authenticate,
  getMe,
  login,
  logout,
  refresh,
  validatePin,
} from "./services/auth-service.js";
import {
  getCurrentSubscription,
  getSubscriptionFeatures,
} from "./services/subscription-service.js";
import {
  authorizeCashMovement,
  cancelCashMovement,
  closeCashSession,
  getCashSessionSummary,
  getOpenCashSession,
  openCashSession,
  recordCashIncome,
  rejectCashMovement,
  requestWithdrawal,
} from "./services/cash-service.js";
import {
  closeProductionBatch,
  createInventoryAdjustment,
  createProduct,
  createProductionBatch,
  createWasteRecord,
  getBranchInventory,
  getBranchPrices,
  listProducts,
  setBranchPrice,
  updateProduct,
} from "./services/inventory-service.js";
import {
  addSaleItem,
  cancelDraftSale,
  cancelPaidSale,
  completeSale,
  createSale,
  createSaleReturn,
  getSale,
  listSales,
} from "./services/sale-service.js";
import {
  configureCustomerCredit,
  createCustomer,
  getCustomerBalance,
  listCustomers,
  setCustomerPrice,
  updateCustomer,
} from "./services/customer-service.js";
import {
  assignCustomerToRoute,
  closeDeliverySettlement,
  createDeliveryDriver,
  createDeliveryOrder,
  createDeliveryReturn,
  createDeliveryRoute,
  createDeliverySettlement,
  deliverDeliveryOrder,
  depositSettlementToCash,
  listDeliveryDrivers,
  listDeliveryRoutes,
  loadDeliveryOrder,
  markDeliveryOrderInRoute,
  prepareDeliveryOrder,
  recordDeliveryPayment,
  reviewDeliveryReturn,
} from "./services/delivery-service.js";

type JsonBody = Record<string, unknown>;

export function buildServer() {
  return createServer(async (request, response) => {
    try {
      applyCorsHeaders(request, response);

      if (request.method === "OPTIONS") {
        response.writeHead(204);
        response.end();
        return;
      }

      await route(request, response);
    } catch (error) {
      const { statusCode, body } = toErrorResponse(error);
      sendJson(response, statusCode, body);
    }
  });
}

async function route(request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url ?? "/", "http://localhost");
  const path = url.pathname;
  const method = request.method ?? "GET";

  if (method === "GET" && path === "/api/v1/health") {
    await handleHealth(response);
    return;
  }

  if (method === "POST" && path === "/api/v1/auth/login") {
    sendJson(response, 200, await login(await readJson(request)));
    return;
  }

  if (method === "POST" && path === "/api/v1/auth/refresh") {
    sendJson(response, 200, await refresh(await readJson(request)));
    return;
  }

  if (method === "POST" && path === "/api/v1/auth/logout") {
    sendJson(response, 200, await logout(await readJson(request)));
    return;
  }

  if (method === "POST" && path === "/api/v1/auth/validate-pin") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await validatePin(currentUser, await readJson(request)));
    return;
  }

  if (method === "GET" && path === "/api/v1/auth/me") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await getMe(currentUser));
    return;
  }

  if (method === "GET" && path === "/api/v1/subscriptions/current") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await getCurrentSubscription(currentUser));
    return;
  }

  if (method === "GET" && path === "/api/v1/subscriptions/features") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await getSubscriptionFeatures(currentUser));
    return;
  }

  if (method === "POST" && path === "/api/v1/sales") {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await createSale(currentUser, await readJson(request)));
    return;
  }

  if (method === "GET" && path === "/api/v1/sales") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await listSales(currentUser, url.searchParams.get("branchId")));
    return;
  }

  const saleGetMatch = path.match(/^\/api\/v1\/sales\/([^/]+)$/);
  if (method === "GET" && saleGetMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await getSale(currentUser, saleGetMatch[1]));
    return;
  }

  const saleItemMatch = path.match(/^\/api\/v1\/sales\/([^/]+)\/items$/);
  if (method === "POST" && saleItemMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await addSaleItem(currentUser, saleItemMatch[1], await readJson(request)));
    return;
  }

  const saleCompleteMatch = path.match(/^\/api\/v1\/sales\/([^/]+)\/complete$/);
  if (method === "POST" && saleCompleteMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await completeSale(currentUser, saleCompleteMatch[1], await readJson(request)));
    return;
  }

  const saleCancelDraftMatch = path.match(/^\/api\/v1\/sales\/([^/]+)\/cancel-draft$/);
  if (method === "POST" && saleCancelDraftMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await cancelDraftSale(currentUser, saleCancelDraftMatch[1], await readJson(request)));
    return;
  }

  const saleCancelPaidMatch = path.match(/^\/api\/v1\/sales\/([^/]+)\/cancel-paid$/);
  if (method === "POST" && saleCancelPaidMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await cancelPaidSale(currentUser, saleCancelPaidMatch[1], await readJson(request)));
    return;
  }

  const saleReturnMatch = path.match(/^\/api\/v1\/sales\/([^/]+)\/returns$/);
  if (method === "POST" && saleReturnMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await createSaleReturn(currentUser, saleReturnMatch[1], await readJson(request)));
    return;
  }

  if (method === "GET" && path === "/api/v1/customers") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await listCustomers(currentUser));
    return;
  }

  if (method === "POST" && path === "/api/v1/customers") {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await createCustomer(currentUser, await readJson(request)));
    return;
  }

  const customerPatchMatch = path.match(/^\/api\/v1\/customers\/([^/]+)$/);
  if (method === "PATCH" && customerPatchMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await updateCustomer(currentUser, customerPatchMatch[1], await readJson(request)));
    return;
  }

  const customerCreditMatch = path.match(/^\/api\/v1\/customers\/([^/]+)\/credit$/);
  if (method === "POST" && customerCreditMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await configureCustomerCredit(currentUser, customerCreditMatch[1], await readJson(request)));
    return;
  }

  const customerPricesMatch = path.match(/^\/api\/v1\/customers\/([^/]+)\/prices$/);
  if (method === "POST" && customerPricesMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await setCustomerPrice(currentUser, customerPricesMatch[1], await readJson(request)));
    return;
  }

  const customerBalanceMatch = path.match(/^\/api\/v1\/customers\/([^/]+)\/balance$/);
  if (method === "GET" && customerBalanceMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await getCustomerBalance(currentUser, customerBalanceMatch[1]));
    return;
  }

  if (method === "GET" && path === "/api/v1/products") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await listProducts(currentUser));
    return;
  }

  if (method === "POST" && path === "/api/v1/products") {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await createProduct(currentUser, await readJson(request)));
    return;
  }

  const productPatchMatch = path.match(/^\/api\/v1\/products\/([^/]+)$/);
  if (method === "PATCH" && productPatchMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await updateProduct(currentUser, productPatchMatch[1], await readJson(request)));
    return;
  }

  const branchPricesMatch = path.match(/^\/api\/v1\/prices\/branch\/([^/]+)$/);
  if (method === "GET" && branchPricesMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await getBranchPrices(currentUser, branchPricesMatch[1]));
    return;
  }

  if (method === "POST" && path === "/api/v1/prices/branch") {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await setBranchPrice(currentUser, await readJson(request)));
    return;
  }

  const branchInventoryMatch = path.match(/^\/api\/v1\/inventory\/branch\/([^/]+)$/);
  if (method === "GET" && branchInventoryMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await getBranchInventory(currentUser, branchInventoryMatch[1]));
    return;
  }

  if (method === "POST" && path === "/api/v1/inventory/adjustments") {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await createInventoryAdjustment(currentUser, await readJson(request)));
    return;
  }

  if (method === "POST" && path === "/api/v1/production/batches") {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await createProductionBatch(currentUser, await readJson(request)));
    return;
  }

  const closeProductionBatchMatch = path.match(/^\/api\/v1\/production\/batches\/([^/]+)\/close$/);
  if (method === "PATCH" && closeProductionBatchMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await closeProductionBatch(currentUser, closeProductionBatchMatch[1]));
    return;
  }

  if (method === "POST" && path === "/api/v1/waste-records") {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await createWasteRecord(currentUser, await readJson(request)));
    return;
  }

  if (method === "GET" && path === "/api/v1/delivery-drivers") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await listDeliveryDrivers(currentUser));
    return;
  }

  if (method === "POST" && path === "/api/v1/delivery-drivers") {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await createDeliveryDriver(currentUser, await readJson(request)));
    return;
  }

  if (method === "GET" && path === "/api/v1/delivery-routes") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await listDeliveryRoutes(currentUser, url.searchParams.get("branchId")));
    return;
  }

  if (method === "POST" && path === "/api/v1/delivery-routes") {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await createDeliveryRoute(currentUser, await readJson(request)));
    return;
  }

  const deliveryRouteCustomerMatch = path.match(/^\/api\/v1\/delivery-routes\/([^/]+)\/customers$/);
  if (method === "POST" && deliveryRouteCustomerMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await assignCustomerToRoute(currentUser, deliveryRouteCustomerMatch[1], await readJson(request)));
    return;
  }

  if (method === "POST" && path === "/api/v1/delivery-orders") {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await createDeliveryOrder(currentUser, await readJson(request)));
    return;
  }

  const deliveryOrderActionMatch = path.match(/^\/api\/v1\/delivery-orders\/([^/]+)\/(prepare|load|in-route|deliver)$/);
  if (method === "POST" && deliveryOrderActionMatch) {
    const currentUser = await authenticate(request);
    const [, deliveryOrderId, action] = deliveryOrderActionMatch;

    if (action === "prepare") {
      sendJson(response, 200, await prepareDeliveryOrder(currentUser, deliveryOrderId));
      return;
    }

    if (action === "load") {
      sendJson(response, 200, await loadDeliveryOrder(currentUser, deliveryOrderId));
      return;
    }

    if (action === "in-route") {
      sendJson(response, 200, await markDeliveryOrderInRoute(currentUser, deliveryOrderId));
      return;
    }

    sendJson(response, 200, await deliverDeliveryOrder(currentUser, deliveryOrderId, await readJson(request)));
    return;
  }

  const deliveryOrderPaymentsMatch = path.match(/^\/api\/v1\/delivery-orders\/([^/]+)\/payments$/);
  if (method === "POST" && deliveryOrderPaymentsMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await recordDeliveryPayment(currentUser, deliveryOrderPaymentsMatch[1], await readJson(request)));
    return;
  }

  const deliveryOrderReturnsMatch = path.match(/^\/api\/v1\/delivery-orders\/([^/]+)\/returns$/);
  if (method === "POST" && deliveryOrderReturnsMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await createDeliveryReturn(currentUser, deliveryOrderReturnsMatch[1], await readJson(request)));
    return;
  }

  const deliveryReturnReviewMatch = path.match(/^\/api\/v1\/delivery-returns\/([^/]+)\/review$/);
  if (method === "POST" && deliveryReturnReviewMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await reviewDeliveryReturn(currentUser, deliveryReturnReviewMatch[1], await readJson(request)));
    return;
  }

  if (method === "POST" && path === "/api/v1/delivery-settlements") {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await createDeliverySettlement(currentUser, await readJson(request)));
    return;
  }

  const deliverySettlementCloseMatch = path.match(/^\/api\/v1\/delivery-settlements\/([^/]+)\/close$/);
  if (method === "POST" && deliverySettlementCloseMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await closeDeliverySettlement(currentUser, deliverySettlementCloseMatch[1], await readJson(request)));
    return;
  }

  const deliverySettlementDepositMatch = path.match(/^\/api\/v1\/delivery-settlements\/([^/]+)\/deposit-to-cash$/);
  if (method === "POST" && deliverySettlementDepositMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await depositSettlementToCash(currentUser, deliverySettlementDepositMatch[1]));
    return;
  }

  if (method === "POST" && path === "/api/v1/cash-sessions/open") {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await openCashSession(currentUser, await readJson(request)));
    return;
  }

  if (method === "GET" && path === "/api/v1/cash-sessions/open") {
    const currentUser = await authenticate(request);
    const branchId = url.searchParams.get("branchId");

    if (!branchId) {
      throw new DomainError(400, "INVALID_REQUEST", "Query requerido: branchId.");
    }

    sendJson(response, 200, await getOpenCashSession(currentUser, branchId));
    return;
  }

  const cashSessionSummaryMatch = path.match(/^\/api\/v1\/cash-sessions\/([^/]+)\/summary$/);
  if (method === "GET" && cashSessionSummaryMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await getCashSessionSummary(currentUser, cashSessionSummaryMatch[1]));
    return;
  }

  const cashSessionCloseMatch = path.match(/^\/api\/v1\/cash-sessions\/([^/]+)\/close$/);
  if (method === "POST" && cashSessionCloseMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await closeCashSession(currentUser, cashSessionCloseMatch[1], await readJson(request)));
    return;
  }

  if (method === "POST" && path === "/api/v1/cash-movements/withdrawals") {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await requestWithdrawal(currentUser, await readJson(request)));
    return;
  }

  if (method === "POST" && path === "/api/v1/cash-movements/income") {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await recordCashIncome(currentUser, await readJson(request)));
    return;
  }

  const cashMovementActionMatch = path.match(/^\/api\/v1\/cash-movements\/([^/]+)\/(authorize|reject|cancel)$/);
  if (method === "POST" && cashMovementActionMatch) {
    const currentUser = await authenticate(request);
    const [, cashMovementId, action] = cashMovementActionMatch;
    const body = await readJson(request);

    if (action === "authorize") {
      sendJson(response, 200, await authorizeCashMovement(currentUser, cashMovementId, body));
      return;
    }

    if (action === "reject") {
      sendJson(response, 200, await rejectCashMovement(currentUser, cashMovementId, body));
      return;
    }

    sendJson(response, 200, await cancelCashMovement(currentUser, cashMovementId, body));
    return;
  }

  sendJson(response, 404, {
    statusCode: 404,
    error: "NOT_FOUND",
    message: "Ruta no encontrada.",
    details: {},
  });
}

async function handleHealth(response: ServerResponse) {
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 1500);

    sendJson(response, 200, {
      status: "ok",
      service: "tortilla-plus-backend",
    });
  } catch {
    sendJson(response, 503, {
      statusCode: 503,
      error: "SERVICE_UNAVAILABLE",
      message: "Una dependencia critica no responde.",
      details: {},
    });
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Healthcheck dependency timeout"));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeout);
        resolve(result);
      })
      .catch((error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

function sendJson(response: ServerResponse, statusCode: number, body: JsonBody) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

function applyCorsHeaders(request: IncomingMessage, response: ServerResponse) {
  const origin = request.headers.origin;
  const allowedOrigins = new Set([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]);

  response.setHeader(
    "access-control-allow-origin",
    origin && allowedOrigins.has(origin) ? origin : "*",
  );
  response.setHeader("vary", "Origin");
  response.setHeader("access-control-allow-methods", "GET,POST,PATCH,OPTIONS");
  response.setHeader(
    "access-control-allow-headers",
    "Content-Type, Authorization",
  );
  response.setHeader("access-control-max-age", "86400");
}

export function getRequestBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function readJson(request: IncomingMessage) {
  const body = await getRequestBody(request);

  if (!body) {
    return {};
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new DomainError(400, "INVALID_REQUEST", "JSON invalido.");
  }
}
