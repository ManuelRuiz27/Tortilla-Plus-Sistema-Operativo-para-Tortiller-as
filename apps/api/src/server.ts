import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";

import { env } from "./config/env.js";
import { DomainError, toErrorResponse } from "./lib/domain-error.js";
import { prisma } from "./lib/prisma.js";
import { assertRateLimit } from "./lib/rate-limit.js";
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
  listCashWithdrawals,
  listPendingWithdrawals,
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
  createUnitConversion,
  createWasteRecord,
  deleteUnitConversion,
  getBranchInventory,
  getBranchPrices,
  listInventoryMovements,
  listProductionBatches,
  listProducts,
  listUnitConversions,
  setBranchPrice,
  updateProduct,
  updateUnitConversion,
} from "./services/inventory-service.js";
import {
  closeProductionRecipeBatch,
  createProductionBatchFromRecipe,
  getProductionRecipeBatch,
  updateProductionRecipeBatchActuals,
} from "./services/production-recipe-service.js";
import {
  addSaleItem,
  addSaleItems,
  cancelDraftSale,
  cancelPaidSale,
  checkoutSale,
  completeSale,
  createSale,
  createSaleReturn,
  getSale,
  listSales,
  quoteSale,
} from "./services/sale-service.js";
import {
  activateRecipeVersion,
  archiveRecipeVersion,
  createRecipe,
  createRecipeVersion,
  getRecipe,
  listRecipes,
  updateRecipe,
} from "./services/recipe-service.js";
import {
  configureCustomerCredit,
  createCustomer,
  getCustomerBalance,
  listCustomerPrices,
  listCustomers,
  recordCustomerPayment,
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
  listDeliveryOrders,
  listDeliveryRoutes,
  listDeliverySettlements,
  loadDeliveryOrder,
  markDeliveryOrderInRoute,
  prepareDeliveryOrder,
  recordDeliveryPayment,
  removeCustomerFromRoute,
  reorderRouteCustomers,
  reviewDeliveryReturn,
} from "./services/delivery-service.js";
import {
  cancelInvoice,
  createGlobalDailyInvoice,
  createIndividualInvoice,
  getBillingSummary,
  getInvoiceDocumentFile,
  getInvoiceDocuments,
  processPacWebhook,
  stampInvoice,
} from "./services/billing-service.js";
import { getPublicBillingCatalogs } from "./services/billing-catalog-service.js";
import {
  expireBillingReceiptsForManager,
  getBillingReceiptBySale,
  getPublicInvoiceDocument,
  getPublicInvoiceStatus,
  getPublicReceipt,
  listBillingReceipts,
  reprintBillingReceipt,
  submitPublicInvoice,
} from "./services/public-autofactura-service.js";
import {
  addReconciliationItem,
  addTerminalReconciliationIncidents,
  createReconciliationBatch,
  listReconciliationBatches,
  reviewReconciliationBatch,
} from "./services/reconciliation-service.js";
import {
  getCashDifferences,
  getCashWithdrawalsByReason,
  getManagerDashboard,
  getReportsSummary,
  getSalesByBranch,
  getSalesByCustomer,
  getSalesByDay,
  getSalesByProduct,
} from "./services/reports-service.js";
import {
  exportGlobalInvoices,
  exportIssuedInvoices,
  exportOperationalReports,
} from "./services/export-service.js";
import {
  createTerminalPayment,
  getTerminalPaymentStatus,
  lookupBarcode,
  readScale,
} from "./services/physical-integration-service.js";
import { getSettingsSummary, listOperationalPosDevices } from "./services/settings-service.js";
import {
  disconnectMercadoPago,
  getMercadoPagoConnection,
  healthCheckMercadoPago,
} from "./services/payment-provider-connection-service.js";
import {
  completeMercadoPagoOAuthCallback,
  startMercadoPagoOAuth,
} from "./services/mercadopago-oauth-service.js";
import {
  bindMercadoPagoTerminalToPos,
  listMercadoPagoTerminalsForManager,
  syncMercadoPagoTerminals,
  unbindMercadoPagoTerminalFromPos,
} from "./services/payment-terminal-service.js";
import {
  activateTerminalPdvMode,
  createOrSyncExternalPosForPosDevice,
  createOrSyncStoreForBranch,
  getMercadoPagoProvisioningSummary,
  validateTerminalReadyForPosDevice,
} from "./services/mercadopago-point-provisioning-service.js";
import {
  cancelTerminalOrder,
  confirmTerminalOrderAndCheckout,
  createTerminalOrder,
  getOpenTerminalOrder,
  getTerminalOrderStatus,
  processMercadoPagoTerminalWebhook,
} from "./services/payment-terminal-order-service.js";
import {
  cancelPlatformOneTimeCharge,
  createPlatformOneTimeCharge,
  generateMonthlyCyclesForActiveSubscriptions,
  generatePlatformBillingCycle,
  getOrganizationCfdiUsage,
  getOrganizationBillingSummary,
  getPlatformCfdiUsage,
  getPlatformBillingSummary,
  listPlatformBillingCycles,
  listPlatformCommercialPlans,
  markPlatformBillingCyclePaid,
  recalculatePlatformBillingCycle,
  updateOverdueBillingStatuses,
  updatePlatformSubscriptionItems,
} from "./services/billing-cycle-service.js";
import {
  createPlatformManualPayment,
  createPlatformOrganization,
  createPlatformOrganizationOwner,
  endPlatformImpersonation,
  exportPlatformAccountsReceivable,
  exportPlatformSaasIncome,
  getPlatformDashboard,
  getPlatformOrganization,
  getPlatformSubscription,
  listPlatformAuditLog,
  listPlatformOrganizationPosDevices,
  listPlatformOrganizations,
  listPlatformPayments,
  listPlatformPosDevices,
  startPlatformImpersonation,
  updatePlatformOrganization,
  updatePlatformOrganizationStatus,
  updatePlatformPosDeviceLicense,
  updatePlatformPosDeviceStatus,
  updatePlatformSubscription,
} from "./services/platform-service.js";
import {
  createOrganizationBranch,
  createOrganizationPosDevice,
  createOrganizationUser,
  getOrganizationSummary,
  listOrganizationBranches,
  listOrganizationPosDevices,
  listOrganizationUsers,
  resetOrganizationUserPassword,
  resetOrganizationUserPin,
  updateOrganization,
  updateOrganizationBranch,
  updateOrganizationBranchStatus,
  updateOrganizationPosDevice,
  updateOrganizationUser,
  updateOrganizationUserStatus,
} from "./services/organization-service.js";

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

  if (method === "GET" && (path === "/health" || path === "/api/v1/health")) {
    await handleHealth(response);
    return;
  }

  if (method === "GET" && (path === "/health/db" || path === "/api/v1/health/db")) {
    await handleDbHealth(response);
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

  if (path.startsWith("/api/v1/platform")) {
    const currentUser = await authenticate(request);
    const platformOrganizationMatch = path.match(/^\/api\/v1\/platform\/organizations\/([^/]+)$/);
    const platformOrganizationOwnerMatch = path.match(/^\/api\/v1\/platform\/organizations\/([^/]+)\/owner$/);
    const platformOrganizationStatusMatch = path.match(/^\/api\/v1\/platform\/organizations\/([^/]+)\/status$/);
    const platformOrganizationSubscriptionMatch = path.match(/^\/api\/v1\/platform\/organizations\/([^/]+)\/subscription$/);
    const platformOrganizationBillingSummaryMatch = path.match(/^\/api\/v1\/platform\/organizations\/([^/]+)\/billing-summary$/);
    const platformOrganizationBillingCyclesMatch = path.match(/^\/api\/v1\/platform\/organizations\/([^/]+)\/billing-cycles$/);
    const platformOrganizationBillingCycleGenerateMatch = path.match(/^\/api\/v1\/platform\/organizations\/([^/]+)\/billing-cycles\/generate$/);
    const platformOrganizationOneTimeChargesMatch = path.match(/^\/api\/v1\/platform\/organizations\/([^/]+)\/one-time-charges$/);
    const platformOrganizationCfdiUsageMatch = path.match(/^\/api\/v1\/platform\/organizations\/([^/]+)\/cfdi-usage$/);
    const platformOrganizationSubscriptionItemsMatch = path.match(/^\/api\/v1\/platform\/organizations\/([^/]+)\/subscription-items$/);
    const platformOneTimeChargeCancelMatch = path.match(/^\/api\/v1\/platform\/one-time-charges\/([^/]+)\/cancel$/);
    const platformBillingCycleRecalculateMatch = path.match(/^\/api\/v1\/platform\/billing-cycles\/([^/]+)\/recalculate$/);
    const platformBillingCycleMarkPaidMatch = path.match(/^\/api\/v1\/platform\/billing-cycles\/([^/]+)\/mark-paid$/);
    const platformOrganizationPosDevicesMatch = path.match(/^\/api\/v1\/platform\/organizations\/([^/]+)\/pos-devices$/);
    const platformPosDeviceStatusMatch = path.match(/^\/api\/v1\/platform\/pos-devices\/([^/]+)\/status$/);
    const platformPosDeviceLicenseMatch = path.match(/^\/api\/v1\/platform\/pos-devices\/([^/]+)\/license$/);

    if (method === "GET" && path === "/api/v1/platform/dashboard") {
      sendJson(response, 200, await getPlatformDashboard(currentUser));
      return;
    }
    if (method === "GET" && path === "/api/v1/platform/commercial-plans") {
      sendJson(response, 200, await listPlatformCommercialPlans(currentUser));
      return;
    }
    if (method === "GET" && path === "/api/v1/platform/organizations") {
      sendJson(response, 200, await listPlatformOrganizations(currentUser));
      return;
    }
    if (method === "POST" && path === "/api/v1/platform/organizations") {
      sendJson(response, 201, await createPlatformOrganization(currentUser, await readJson(request)));
      return;
    }
    if (method === "GET" && platformOrganizationMatch) {
      sendJson(response, 200, await getPlatformOrganization(currentUser, platformOrganizationMatch[1]));
      return;
    }
    if (method === "POST" && platformOrganizationOwnerMatch) {
      sendJson(response, 201, await createPlatformOrganizationOwner(currentUser, platformOrganizationOwnerMatch[1], await readJson(request)));
      return;
    }
    if (method === "PATCH" && platformOrganizationMatch) {
      sendJson(response, 200, await updatePlatformOrganization(currentUser, platformOrganizationMatch[1], await readJson(request)));
      return;
    }
    if (method === "PATCH" && platformOrganizationStatusMatch) {
      sendJson(response, 200, await updatePlatformOrganizationStatus(currentUser, platformOrganizationStatusMatch[1], await readJson(request)));
      return;
    }
    if (method === "GET" && platformOrganizationSubscriptionMatch) {
      sendJson(response, 200, await getPlatformSubscription(currentUser, platformOrganizationSubscriptionMatch[1]));
      return;
    }
    if (method === "PATCH" && platformOrganizationSubscriptionMatch) {
      sendJson(response, 200, await updatePlatformSubscription(currentUser, platformOrganizationSubscriptionMatch[1], await readJson(request)));
      return;
    }
    if (method === "GET" && platformOrganizationBillingSummaryMatch) {
      sendJson(response, 200, await getPlatformBillingSummary(currentUser, platformOrganizationBillingSummaryMatch[1]));
      return;
    }
    if (method === "GET" && platformOrganizationBillingCyclesMatch) {
      sendJson(response, 200, await listPlatformBillingCycles(currentUser, platformOrganizationBillingCyclesMatch[1]));
      return;
    }
    if (method === "POST" && platformOrganizationBillingCycleGenerateMatch) {
      sendJson(response, 201, await generatePlatformBillingCycle(currentUser, platformOrganizationBillingCycleGenerateMatch[1], await readJson(request)));
      return;
    }
    if (method === "POST" && platformOrganizationOneTimeChargesMatch) {
      sendJson(response, 201, await createPlatformOneTimeCharge(currentUser, platformOrganizationOneTimeChargesMatch[1], await readJson(request)));
      return;
    }
    if (method === "GET" && platformOrganizationCfdiUsageMatch) {
      sendJson(response, 200, await getPlatformCfdiUsage(currentUser, platformOrganizationCfdiUsageMatch[1], Object.fromEntries(url.searchParams.entries())));
      return;
    }
    if (method === "PATCH" && platformOrganizationSubscriptionItemsMatch) {
      sendJson(response, 200, await updatePlatformSubscriptionItems(currentUser, platformOrganizationSubscriptionItemsMatch[1], await readJson(request)));
      return;
    }
    if (method === "PATCH" && platformOneTimeChargeCancelMatch) {
      sendJson(response, 200, await cancelPlatformOneTimeCharge(currentUser, platformOneTimeChargeCancelMatch[1]));
      return;
    }
    if (method === "PATCH" && platformBillingCycleRecalculateMatch) {
      sendJson(response, 200, await recalculatePlatformBillingCycle(currentUser, platformBillingCycleRecalculateMatch[1]));
      return;
    }
    if (method === "POST" && platformBillingCycleMarkPaidMatch) {
      sendJson(response, 200, await markPlatformBillingCyclePaid(currentUser, platformBillingCycleMarkPaidMatch[1], await readJson(request)));
      return;
    }
    if (method === "GET" && platformOrganizationPosDevicesMatch) {
      sendJson(response, 200, await listPlatformOrganizationPosDevices(currentUser, platformOrganizationPosDevicesMatch[1]));
      return;
    }
    if (method === "GET" && path === "/api/v1/platform/pos-devices") {
      sendJson(response, 200, await listPlatformPosDevices(currentUser));
      return;
    }
    if (method === "PATCH" && platformPosDeviceStatusMatch) {
      sendJson(response, 200, await updatePlatformPosDeviceStatus(currentUser, platformPosDeviceStatusMatch[1], await readJson(request)));
      return;
    }
    if (method === "PATCH" && platformPosDeviceLicenseMatch) {
      sendJson(response, 200, await updatePlatformPosDeviceLicense(currentUser, platformPosDeviceLicenseMatch[1], await readJson(request)));
      return;
    }
    if (method === "GET" && path === "/api/v1/platform/payments") {
      sendJson(response, 200, await listPlatformPayments(currentUser));
      return;
    }
    if (method === "POST" && path === "/api/v1/platform/payments/manual") {
      sendJson(response, 201, await createPlatformManualPayment(currentUser, await readJson(request)));
      return;
    }
    if (method === "GET" && path === "/api/v1/platform/audit-log") {
      sendJson(response, 200, await listPlatformAuditLog(currentUser, Object.fromEntries(url.searchParams.entries())));
      return;
    }
    if (method === "GET" && path === "/api/v1/platform/reports/saas-income") {
      sendDocument(response, 200, await exportPlatformSaasIncome(currentUser, Object.fromEntries(url.searchParams.entries())));
      return;
    }
    if (method === "GET" && path === "/api/v1/platform/reports/accounts-receivable") {
      sendDocument(response, 200, await exportPlatformAccountsReceivable(currentUser, Object.fromEntries(url.searchParams.entries())));
      return;
    }
    if (method === "POST" && path === "/api/v1/platform/support/impersonation/start") {
      await startPlatformImpersonation(currentUser);
      return;
    }
    if (method === "POST" && path === "/api/v1/platform/support/impersonation/end") {
      await endPlatformImpersonation(currentUser);
      return;
    }
  }

  if (method === "GET" && path === "/api/v1/integrations/mercadopago/oauth/callback") {
    sendJson(response, 200, await completeMercadoPagoOAuthCallback({
      code: url.searchParams.get("code"),
      state: url.searchParams.get("state"),
    }));
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

  if (method === "GET" && path === "/api/v1/settings/summary") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await getSettingsSummary(currentUser, {
      branchId: url.searchParams.get("branchId"),
    }));
    return;
  }

  if (path.startsWith("/api/v1/organization")) {
    const currentUser = await authenticate(request);
    const organizationUserMatch = path.match(/^\/api\/v1\/organization\/users\/([^/]+)$/);
    const organizationUserStatusMatch = path.match(/^\/api\/v1\/organization\/users\/([^/]+)\/status$/);
    const organizationUserResetPasswordMatch = path.match(/^\/api\/v1\/organization\/users\/([^/]+)\/reset-password$/);
    const organizationUserResetPinMatch = path.match(/^\/api\/v1\/organization\/users\/([^/]+)\/reset-pin$/);
    const organizationBranchMatch = path.match(/^\/api\/v1\/organization\/branches\/([^/]+)$/);
    const organizationBranchStatusMatch = path.match(/^\/api\/v1\/organization\/branches\/([^/]+)\/status$/);
    const organizationPosDeviceMatch = path.match(/^\/api\/v1\/organization\/pos-devices\/([^/]+)$/);

    if (method === "GET" && path === "/api/v1/organization/summary") {
      sendJson(response, 200, await getOrganizationSummary(currentUser));
      return;
    }
    if (method === "GET" && (path === "/api/v1/organization/billing-summary" || path === "/api/v1/organization/subscription")) {
      sendJson(response, 200, await getOrganizationBillingSummary(currentUser.organizationId));
      return;
    }
    if (method === "GET" && path === "/api/v1/organization/cfdi-usage") {
      sendJson(response, 200, await getOrganizationCfdiUsage(currentUser.organizationId, Object.fromEntries(url.searchParams.entries())));
      return;
    }
    if (method === "PATCH" && path === "/api/v1/organization") {
      sendJson(response, 200, await updateOrganization(currentUser, await readJson(request)));
      return;
    }
    if (method === "GET" && path === "/api/v1/organization/users") {
      sendJson(response, 200, await listOrganizationUsers(currentUser));
      return;
    }
    if (method === "POST" && path === "/api/v1/organization/users") {
      sendJson(response, 201, await createOrganizationUser(currentUser, await readJson(request)));
      return;
    }
    if (method === "PATCH" && organizationUserMatch) {
      sendJson(response, 200, await updateOrganizationUser(currentUser, organizationUserMatch[1], await readJson(request)));
      return;
    }
    if (method === "PATCH" && organizationUserStatusMatch) {
      sendJson(response, 200, await updateOrganizationUserStatus(currentUser, organizationUserStatusMatch[1], await readJson(request)));
      return;
    }
    if (method === "POST" && organizationUserResetPasswordMatch) {
      sendJson(response, 200, await resetOrganizationUserPassword(currentUser, organizationUserResetPasswordMatch[1], await readJson(request)));
      return;
    }
    if (method === "POST" && organizationUserResetPinMatch) {
      sendJson(response, 200, await resetOrganizationUserPin(currentUser, organizationUserResetPinMatch[1], await readJson(request)));
      return;
    }
    if (method === "GET" && path === "/api/v1/organization/branches") {
      sendJson(response, 200, await listOrganizationBranches(currentUser));
      return;
    }
    if (method === "POST" && path === "/api/v1/organization/branches") {
      sendJson(response, 201, await createOrganizationBranch(currentUser, await readJson(request)));
      return;
    }
    if (method === "PATCH" && organizationBranchMatch) {
      sendJson(response, 200, await updateOrganizationBranch(currentUser, organizationBranchMatch[1], await readJson(request)));
      return;
    }
    if (method === "PATCH" && organizationBranchStatusMatch) {
      sendJson(response, 200, await updateOrganizationBranchStatus(currentUser, organizationBranchStatusMatch[1], await readJson(request)));
      return;
    }
    if (method === "GET" && path === "/api/v1/organization/pos-devices") {
      sendJson(response, 200, await listOrganizationPosDevices(currentUser));
      return;
    }
    if (method === "POST" && path === "/api/v1/organization/pos-devices") {
      sendJson(response, 201, await createOrganizationPosDevice(currentUser, await readJson(request)));
      return;
    }
    if (method === "PATCH" && organizationPosDeviceMatch) {
      sendJson(response, 200, await updateOrganizationPosDevice(currentUser, organizationPosDeviceMatch[1], await readJson(request)));
      return;
    }
  }

  if (path.startsWith("/api/v1/internal/billing")) {
    assertInternalBillingToken(request);
    if (method === "POST" && path === "/api/v1/internal/billing/generate-monthly-cycles") {
      sendJson(response, 200, await generateMonthlyCyclesForActiveSubscriptions());
      return;
    }
    if (method === "POST" && path === "/api/v1/internal/billing/update-overdue-statuses") {
      sendJson(response, 200, await updateOverdueBillingStatuses());
      return;
    }
  }

  if (method === "GET" && path === "/api/v1/pos-devices") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await listOperationalPosDevices(currentUser, {
      branchId: url.searchParams.get("branchId"),
    }));
    return;
  }

  if (method === "GET" && path === "/api/v1/integrations/mercadopago/connection") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await getMercadoPagoConnection(currentUser));
    return;
  }

  if (method === "POST" && path === "/api/v1/integrations/mercadopago/oauth/start") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await startMercadoPagoOAuth(currentUser));
    return;
  }

  if (method === "POST" && path === "/api/v1/integrations/mercadopago/disconnect") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await disconnectMercadoPago(currentUser));
    return;
  }

  if (method === "POST" && path === "/api/v1/integrations/mercadopago/health-check") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await healthCheckMercadoPago(currentUser));
    return;
  }

  if (method === "GET" && path === "/api/v1/integrations/mercadopago/terminals") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await listMercadoPagoTerminalsForManager(currentUser, {
      branchId: url.searchParams.get("branchId"),
    }));
    return;
  }

  if (method === "GET" && path === "/api/v1/integrations/mercadopago/provisioning") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await getMercadoPagoProvisioningSummary(currentUser, {
      branchId: url.searchParams.get("branchId"),
      posDeviceId: url.searchParams.get("posDeviceId"),
    }));
    return;
  }

  if (method === "POST" && path === "/api/v1/integrations/mercadopago/terminals/sync") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await syncMercadoPagoTerminals(currentUser, await readJson(request)));
    return;
  }

  const mpProvisionStoreMatch = path.match(/^\/api\/v1\/integrations\/mercadopago\/branches\/([^/]+)\/provision-store$/);
  if (method === "POST" && mpProvisionStoreMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await createOrSyncStoreForBranch(currentUser, mpProvisionStoreMatch[1]));
    return;
  }

  const mpProvisionPosMatch = path.match(/^\/api\/v1\/integrations\/mercadopago\/pos-devices\/([^/]+)\/provision-pos$/);
  if (method === "POST" && mpProvisionPosMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await createOrSyncExternalPosForPosDevice(currentUser, mpProvisionPosMatch[1]));
    return;
  }

  const mpActivatePdvMatch = path.match(/^\/api\/v1\/integrations\/mercadopago\/terminals\/([^/]+)\/activate-pdv$/);
  if (method === "POST" && mpActivatePdvMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await activateTerminalPdvMode(currentUser, mpActivatePdvMatch[1]));
    return;
  }

  const mpValidateTerminalMatch = path.match(/^\/api\/v1\/integrations\/mercadopago\/terminals\/([^/]+)\/validate-ready$/);
  if (method === "POST" && mpValidateTerminalMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await validateTerminalReadyForPosDevice(currentUser, mpValidateTerminalMatch[1]));
    return;
  }

  const terminalBindingMatch = path.match(/^\/api\/v1\/pos-devices\/([^/]+)\/terminal-bindings$/);
  if (method === "POST" && terminalBindingMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await bindMercadoPagoTerminalToPos(currentUser, terminalBindingMatch[1], await readJson(request)));
    return;
  }

  const terminalBindingDeleteMatch = path.match(/^\/api\/v1\/pos-devices\/([^/]+)\/terminal-bindings\/([^/]+)$/);
  if (method === "DELETE" && terminalBindingDeleteMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await unbindMercadoPagoTerminalFromPos(currentUser, terminalBindingDeleteMatch[1], terminalBindingDeleteMatch[2]));
    return;
  }

  if (method === "POST" && path === "/api/v1/pos/terminal-orders") {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await createTerminalOrder(currentUser, await readJson(request), getIdempotencyKey(request)));
    return;
  }

  if (method === "GET" && path === "/api/v1/pos/terminal-orders/open") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await getOpenTerminalOrder(currentUser, {
      branchId: url.searchParams.get("branchId"),
      posDeviceId: url.searchParams.get("posDeviceId"),
    }));
    return;
  }

  const terminalOrderMatch = path.match(/^\/api\/v1\/pos\/terminal-orders\/([^/]+)$/);
  if (method === "GET" && terminalOrderMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await getTerminalOrderStatus(currentUser, terminalOrderMatch[1]));
    return;
  }

  const terminalOrderCancelMatch = path.match(/^\/api\/v1\/pos\/terminal-orders\/([^/]+)\/cancel$/);
  if (method === "POST" && terminalOrderCancelMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await cancelTerminalOrder(currentUser, terminalOrderCancelMatch[1], getIdempotencyKey(request)));
    return;
  }

  const terminalOrderCheckoutMatch = path.match(/^\/api\/v1\/pos\/terminal-orders\/([^/]+)\/confirm-and-checkout$/);
  if (method === "POST" && terminalOrderCheckoutMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await confirmTerminalOrderAndCheckout(currentUser, terminalOrderCheckoutMatch[1], getIdempotencyKey(request)));
    return;
  }

  if (method === "POST" && (path === "/api/v1/webhooks/mercadopago/terminal" || path === "/api/v1/webhooks/mercadopago/orders")) {
    sendJson(response, 200, await processMercadoPagoTerminalWebhook(await readJson(request)));
    return;
  }

  if (method === "POST" && path === "/api/v1/sales") {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await createSale(currentUser, await readJson(request)));
    return;
  }

  if (method === "POST" && path === "/api/v1/sales/quote") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await quoteSale(currentUser, await readJson(request)));
    return;
  }

  if (method === "POST" && path === "/api/v1/sales/checkout") {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await checkoutSale(currentUser, await readJson(request), getIdempotencyKey(request)));
    return;
  }

  const terminalPaymentMatch = path.match(/^\/api\/v1\/integrations\/terminals\/(mercadopago|clip)\/payments$/);
  if (method === "POST" && terminalPaymentMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await createTerminalPayment(currentUser, terminalPaymentMatch[1] as "mercadopago" | "clip", await readJson(request)));
    return;
  }

  const terminalStatusMatch = path.match(/^\/api\/v1\/integrations\/terminals\/(mercadopago|clip)\/payments\/([^/]+)$/);
  if (method === "GET" && terminalStatusMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await getTerminalPaymentStatus(currentUser, terminalStatusMatch[1] as "mercadopago" | "clip", terminalStatusMatch[2], {
      branchId: url.searchParams.get("branchId"),
      externalReference: url.searchParams.get("externalReference"),
    }));
    return;
  }

  if (method === "POST" && path === "/api/v1/integrations/scale/readings") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await readScale(currentUser, await readJson(request)));
    return;
  }

  const barcodeMatch = path.match(/^\/api\/v1\/integrations\/barcodes\/([^/]+)$/);
  if (method === "GET" && barcodeMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await lookupBarcode(currentUser, decodeURIComponent(barcodeMatch[1]), {
      branchId: url.searchParams.get("branchId"),
    }));
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

  const saleItemsBatchMatch = path.match(/^\/api\/v1\/sales\/([^/]+)\/items\/batch$/);
  if (method === "POST" && saleItemsBatchMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await addSaleItems(currentUser, saleItemsBatchMatch[1], await readJson(request)));
    return;
  }

  const saleCompleteMatch = path.match(/^\/api\/v1\/sales\/([^/]+)\/complete$/);
  if (method === "POST" && saleCompleteMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await completeSale(currentUser, saleCompleteMatch[1], await readJson(request), getIdempotencyKey(request)));
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

  if (method === "GET" && customerPricesMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await listCustomerPrices(currentUser, customerPricesMatch[1]));
    return;
  }

  const customerPaymentMatch = path.match(/^\/api\/v1\/customers\/([^/]+)\/payments$/);
  if (method === "POST" && customerPaymentMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await recordCustomerPayment(currentUser, customerPaymentMatch[1], await readJson(request)));
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
    sendJson(response, 200, await listProducts(currentUser, Object.fromEntries(url.searchParams.entries())));
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

  const productUnitConversionsMatch = path.match(/^\/api\/v1\/products\/([^/]+)\/unit-conversions$/);
  if (method === "GET" && productUnitConversionsMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await listUnitConversions(currentUser, productUnitConversionsMatch[1]));
    return;
  }

  if (method === "POST" && productUnitConversionsMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await createUnitConversion(currentUser, productUnitConversionsMatch[1], await readJson(request)));
    return;
  }

  const unitConversionMatch = path.match(/^\/api\/v1\/unit-conversions\/([^/]+)$/);
  if (method === "PATCH" && unitConversionMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await updateUnitConversion(currentUser, unitConversionMatch[1], await readJson(request)));
    return;
  }

  if (method === "DELETE" && unitConversionMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await deleteUnitConversion(currentUser, unitConversionMatch[1]));
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

  if (method === "GET" && path === "/api/v1/inventory/movements") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await listInventoryMovements(currentUser, Object.fromEntries(url.searchParams.entries())));
    return;
  }

  if (method === "POST" && path === "/api/v1/production/batches") {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await createProductionBatch(currentUser, await readJson(request)));
    return;
  }

  if (method === "GET" && path === "/api/v1/production/batches") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await listProductionBatches(currentUser, Object.fromEntries(url.searchParams.entries())));
    return;
  }

  if (method === "POST" && path === "/api/v1/production/recipe-batches") {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await createProductionBatchFromRecipe(currentUser, await readJson(request)));
    return;
  }

  const getProductionRecipeBatchMatch = path.match(/^\/api\/v1\/production\/recipe-batches\/([^/]+)$/);
  if (method === "GET" && getProductionRecipeBatchMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await getProductionRecipeBatch(currentUser, getProductionRecipeBatchMatch[1]));
    return;
  }

  const updateProductionRecipeBatchActualsMatch = path.match(/^\/api\/v1\/production\/recipe-batches\/([^/]+)\/actuals$/);
  if (method === "PATCH" && updateProductionRecipeBatchActualsMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await updateProductionRecipeBatchActuals(currentUser, updateProductionRecipeBatchActualsMatch[1], await readJson(request)));
    return;
  }

  const closeProductionRecipeBatchMatch = path.match(/^\/api\/v1\/production\/recipe-batches\/([^/]+)\/close$/);
  if (method === "PATCH" && closeProductionRecipeBatchMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await closeProductionRecipeBatch(currentUser, closeProductionRecipeBatchMatch[1], await readJson(request)));
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

  if (method === "GET" && path === "/api/v1/recipes") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await listRecipes(currentUser, Object.fromEntries(url.searchParams.entries())));
    return;
  }

  if (method === "POST" && path === "/api/v1/recipes") {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await createRecipe(currentUser, await readJson(request)));
    return;
  }

  const recipeVersionCreateMatch = path.match(/^\/api\/v1\/recipes\/([^/]+)\/versions$/);
  if (method === "POST" && recipeVersionCreateMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await createRecipeVersion(currentUser, recipeVersionCreateMatch[1], await readJson(request)));
    return;
  }

  const recipeMatch = path.match(/^\/api\/v1\/recipes\/([^/]+)$/);
  if (method === "GET" && recipeMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await getRecipe(currentUser, recipeMatch[1]));
    return;
  }

  if (method === "PATCH" && recipeMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await updateRecipe(currentUser, recipeMatch[1], await readJson(request)));
    return;
  }

  const recipeVersionActivateMatch = path.match(/^\/api\/v1\/recipe-versions\/([^/]+)\/activate$/);
  if (method === "PATCH" && recipeVersionActivateMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await activateRecipeVersion(currentUser, recipeVersionActivateMatch[1]));
    return;
  }

  const recipeVersionArchiveMatch = path.match(/^\/api\/v1\/recipe-versions\/([^/]+)\/archive$/);
  if (method === "PATCH" && recipeVersionArchiveMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await archiveRecipeVersion(currentUser, recipeVersionArchiveMatch[1]));
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

  const deliveryRouteCustomerDeleteMatch = path.match(/^\/api\/v1\/delivery-routes\/([^/]+)\/customers\/([^/]+)$/);
  if (method === "DELETE" && deliveryRouteCustomerDeleteMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await removeCustomerFromRoute(currentUser, deliveryRouteCustomerDeleteMatch[1], deliveryRouteCustomerDeleteMatch[2]));
    return;
  }

  const deliveryRouteCustomerReorderMatch = path.match(/^\/api\/v1\/delivery-routes\/([^/]+)\/customers\/reorder$/);
  if (method === "PATCH" && deliveryRouteCustomerReorderMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await reorderRouteCustomers(currentUser, deliveryRouteCustomerReorderMatch[1], await readJson(request)));
    return;
  }

  if (method === "GET" && path === "/api/v1/delivery-orders") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await listDeliveryOrders(currentUser, {
      branchId: url.searchParams.get("branchId"),
      routeId: url.searchParams.get("routeId"),
      driverId: url.searchParams.get("driverId"),
      customerId: url.searchParams.get("customerId"),
      status: url.searchParams.get("status"),
      date: url.searchParams.get("date"),
    }));
    return;
  }

  if (method === "POST" && path === "/api/v1/delivery-orders") {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await createDeliveryOrder(currentUser, await readJson(request), getIdempotencyKey(request)));
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
    sendJson(response, 201, await recordDeliveryPayment(currentUser, deliveryOrderPaymentsMatch[1], await readJson(request), getIdempotencyKey(request)));
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

  if (method === "GET" && path === "/api/v1/delivery-settlements") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await listDeliverySettlements(currentUser, {
      branchId: url.searchParams.get("branchId"),
      routeId: url.searchParams.get("routeId"),
      driverId: url.searchParams.get("driverId"),
      status: url.searchParams.get("status"),
    }));
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
    sendJson(response, 200, await depositSettlementToCash(currentUser, deliverySettlementDepositMatch[1], getIdempotencyKey(request)));
    return;
  }

  if (method === "GET" && path === "/api/v1/billing/summary") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await getBillingSummary(currentUser, {
      branchId: url.searchParams.get("branchId"),
      date: url.searchParams.get("date"),
    }));
    return;
  }

  if (method === "GET" && path === "/api/v1/reconciliation/batches") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await listReconciliationBatches(currentUser, {
      branchId: url.searchParams.get("branchId"),
    }));
    return;
  }

  if (method === "POST" && path === "/api/v1/reconciliation/batches") {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await createReconciliationBatch(currentUser, await readJson(request)));
    return;
  }

  const reconciliationItemMatch = path.match(/^\/api\/v1\/reconciliation\/batches\/([^/]+)\/items$/);
  if (method === "POST" && reconciliationItemMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await addReconciliationItem(currentUser, reconciliationItemMatch[1], await readJson(request)));
    return;
  }

  const reconciliationReviewMatch = path.match(/^\/api\/v1\/reconciliation\/batches\/([^/]+)\/review$/);
  if (method === "POST" && reconciliationReviewMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await reviewReconciliationBatch(currentUser, reconciliationReviewMatch[1], await readJson(request)));
    return;
  }

  const reconciliationTerminalIncidentsMatch = path.match(/^\/api\/v1\/reconciliation\/batches\/([^/]+)\/terminal-incidents$/);
  if (method === "POST" && reconciliationTerminalIncidentsMatch) {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await addTerminalReconciliationIncidents(currentUser, reconciliationTerminalIncidentsMatch[1]));
    return;
  }

  if (method === "GET" && path === "/api/v1/manager/dashboard") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await getManagerDashboard(currentUser, {
      branchId: url.searchParams.get("branchId"),
    }));
    return;
  }

  if (method === "GET" && path === "/api/v1/reports/summary") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await getReportsSummary(currentUser, reportQuery(url)));
    return;
  }

  if (method === "GET" && path === "/api/v1/reports/sales-by-day") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await getSalesByDay(currentUser, reportQuery(url)));
    return;
  }

  if (method === "GET" && path === "/api/v1/reports/sales-by-branch") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await getSalesByBranch(currentUser, reportQuery(url)));
    return;
  }

  if (method === "GET" && path === "/api/v1/reports/sales-by-product") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await getSalesByProduct(currentUser, reportQuery(url)));
    return;
  }

  if (method === "GET" && path === "/api/v1/reports/sales-by-customer") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await getSalesByCustomer(currentUser, reportQuery(url)));
    return;
  }

  if (method === "GET" && path === "/api/v1/reports/cash-withdrawals-by-reason") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await getCashWithdrawalsByReason(currentUser, reportQuery(url)));
    return;
  }

  if (method === "GET" && path === "/api/v1/reports/cash-differences") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await getCashDifferences(currentUser, reportQuery(url)));
    return;
  }

  if (method === "GET" && path === "/api/v1/exports/billing/invoices") {
    const currentUser = await authenticate(request);
    sendDocument(response, 200, await exportIssuedInvoices(currentUser, exportQuery(url)));
    return;
  }

  if (method === "GET" && path === "/api/v1/exports/billing/global-invoices") {
    const currentUser = await authenticate(request);
    sendDocument(response, 200, await exportGlobalInvoices(currentUser, exportQuery(url)));
    return;
  }

  if (method === "GET" && path === "/api/v1/exports/reports/operational") {
    const currentUser = await authenticate(request);
    sendDocument(response, 200, await exportOperationalReports(currentUser, exportQuery(url)));
    return;
  }

  if (method === "POST" && path === "/api/v1/billing/invoices/individual") {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await createIndividualInvoice(currentUser, await readJson(request)));
    return;
  }

  if (method === "POST" && path === "/api/v1/billing/invoices/global-daily") {
    const currentUser = await authenticate(request);
    sendJson(response, 201, await createGlobalDailyInvoice(currentUser, await readJson(request)));
    return;
  }

  const billingInvoiceDocumentFileMatch = path.match(/^\/api\/v1\/billing\/invoices\/([^/]+)\/(pdf|xml)$/);
  if (billingInvoiceDocumentFileMatch && method === "GET") {
    const currentUser = await authenticate(request);
    const [, invoiceId, documentType] = billingInvoiceDocumentFileMatch;
    sendDocument(response, 200, await getInvoiceDocumentFile(currentUser, invoiceId, documentType as "pdf" | "xml"));
    return;
  }

  const billingInvoiceActionMatch = path.match(/^\/api\/v1\/billing\/invoices\/([^/]+)\/(stamp|cancel|documents)$/);
  if (billingInvoiceActionMatch) {
    const currentUser = await authenticate(request);
    const [, invoiceId, action] = billingInvoiceActionMatch;

    if (method === "POST" && action === "stamp") {
      sendJson(response, 200, await stampInvoice(currentUser, invoiceId));
      return;
    }

    if (method === "POST" && action === "cancel") {
      sendJson(response, 200, await cancelInvoice(currentUser, invoiceId, await readJson(request)));
      return;
    }

    if (method === "GET" && action === "documents") {
      sendJson(response, 200, await getInvoiceDocuments(currentUser, invoiceId));
      return;
    }
  }

  if (method === "POST" && path === "/api/v1/webhooks/pac") {
    sendJson(response, 200, await processPacWebhook(await readJson(request)));
    return;
  }

  if (method === "GET" && path === "/api/v1/public/billing/catalogs") {
    sendJson(response, 200, getPublicBillingCatalogs());
    return;
  }

  const billingReceiptBySaleMatch = path.match(/^\/api\/v1\/billing\/receipts\/by-sale\/([^/]+)$/);
  if (billingReceiptBySaleMatch && method === "GET") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await getBillingReceiptBySale(currentUser, billingReceiptBySaleMatch[1]));
    return;
  }

  if (method === "GET" && path === "/api/v1/billing/receipts") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await listBillingReceipts(currentUser, {
      branchId: url.searchParams.get("branchId"),
      date: url.searchParams.get("date"),
      status: url.searchParams.get("status"),
    }));
    return;
  }

  const billingReceiptReprintMatch = path.match(/^\/api\/v1\/billing\/receipts\/([^/]+)\/reprint$/);
  if (billingReceiptReprintMatch && method === "POST") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await reprintBillingReceipt(currentUser, billingReceiptReprintMatch[1]));
    return;
  }

  if (method === "POST" && path === "/api/v1/billing/receipts/expire") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await expireBillingReceiptsForManager(currentUser));
    return;
  }

  const publicReceiptMatch = path.match(/^\/api\/v1\/public\/billing\/receipts\/([^/]+)$/);
  if (publicReceiptMatch && method === "GET") {
    assertPublicAutofacturaRateLimit(request, "lookup", publicReceiptMatch[1]);
    sendJson(response, 200, await getPublicReceipt(publicReceiptMatch[1]));
    return;
  }

  const publicInvoiceMatch = path.match(/^\/api\/v1\/public\/billing\/receipts\/([^/]+)\/invoice$/);
  if (publicInvoiceMatch && method === "POST") {
    assertPublicAutofacturaRateLimit(request, "submit", publicInvoiceMatch[1]);
    sendJson(response, 201, await submitPublicInvoice(publicInvoiceMatch[1], await readJson(request)));
    return;
  }

  const publicInvoiceStatusMatch = path.match(/^\/api\/v1\/public\/billing\/receipts\/([^/]+)\/invoice-status$/);
  if (publicInvoiceStatusMatch && method === "GET") {
    assertPublicAutofacturaRateLimit(request, "lookup", publicInvoiceStatusMatch[1]);
    sendJson(response, 200, await getPublicInvoiceStatus(publicInvoiceStatusMatch[1]));
    return;
  }

  const publicInvoiceDocumentMatch = path.match(/^\/api\/v1\/public\/billing\/invoices\/([^/]+)\/(pdf|xml)$/);
  if (publicInvoiceDocumentMatch && method === "GET") {
    const [, invoiceId, documentType] = publicInvoiceDocumentMatch;
    const document = await getPublicInvoiceDocument(invoiceId, documentType as "pdf" | "xml");
    sendDocument(response, 200, document);
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

  if (method === "GET" && path === "/api/v1/cash-movements/withdrawals/pending") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await listPendingWithdrawals(currentUser, Object.fromEntries(url.searchParams.entries())));
    return;
  }

  if (method === "GET" && path === "/api/v1/cash-movements/withdrawals") {
    const currentUser = await authenticate(request);
    sendJson(response, 200, await listCashWithdrawals(currentUser, Object.fromEntries(url.searchParams.entries())));
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
  sendJson(response, 200, {
    status: "ok",
    service: "tortilla-plus-api",
    version: "0.1.0",
  });
}

async function handleDbHealth(response: ServerResponse) {
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 1500);

    sendJson(response, 200, {
      status: "ok",
      db: "ok",
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

function reportQuery(url: URL) {
  return {
    branchId: url.searchParams.get("branchId"),
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  };
}

function exportQuery(url: URL) {
  return {
    ...reportQuery(url),
    format: url.searchParams.get("format"),
  };
}

function sendJson(response: ServerResponse, statusCode: number, body: JsonBody) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

function sendDocument(
  response: ServerResponse,
  statusCode: number,
  document: { filename: string; contentType: string; body: string | Buffer },
) {
  response.writeHead(statusCode, {
    "content-type": document.contentType,
    "content-disposition": `attachment; filename="${document.filename}"`,
  });
  response.end(document.body);
}

function applyCorsHeaders(request: IncomingMessage, response: ServerResponse) {
  const origin = request.headers.origin;
  const configuredOrigins = env.CORS_ORIGINS.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowedOrigins = new Set(
    configuredOrigins.length > 0 || env.NODE_ENV === "production"
      ? configuredOrigins
      : ["http://localhost:5173", "http://127.0.0.1:5173"],
  );

  if (origin && allowedOrigins.has(origin)) {
    response.setHeader("access-control-allow-origin", origin);
  }

  response.setHeader("vary", "Origin");
  response.setHeader("access-control-allow-methods", "GET,POST,PATCH,DELETE,OPTIONS");
  response.setHeader(
    "access-control-allow-headers",
    "Content-Type, Authorization, Idempotency-Key",
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

function getIdempotencyKey(request: IncomingMessage): string | null {
  const value = request.headers["idempotency-key"];
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function assertInternalBillingToken(request: IncomingMessage) {
  if (!env.INTERNAL_BILLING_TOKEN) {
    throw new DomainError(501, "INTERNAL_BILLING_DISABLED", "Scheduler interno de billing no configurado.");
  }
  const headerToken = request.headers["internal-billing-token"];
  const authorization = request.headers.authorization;
  const token = Array.isArray(headerToken) ? headerToken[0] : headerToken;
  const bearer = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
  if (token !== env.INTERNAL_BILLING_TOKEN && bearer !== env.INTERNAL_BILLING_TOKEN) {
    throw new DomainError(403, "INTERNAL_BILLING_FORBIDDEN", "Token interno invalido.");
  }
}

function assertPublicAutofacturaRateLimit(
  request: IncomingMessage,
  action: "lookup" | "submit",
  token: string,
) {
  const ip = getClientIp(request);
  const limit = action === "submit" ? 5 : 20;
  assertRateLimit({
    key: `public-autofactura:${action}:${token}:${ip}`,
    limit,
    windowMs: 60 * 60 * 1000,
    message: action === "submit"
      ? "Demasiados intentos de autofactura. Intenta mas tarde."
      : "Demasiadas consultas del ticket. Intenta mas tarde.",
  });
}

function getClientIp(request: IncomingMessage) {
  const forwardedFor = request.headers["x-forwarded-for"];
  const firstForwarded = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  return firstForwarded?.split(",")[0]?.trim() || request.socket.remoteAddress || "unknown";
}
