import { httpClient } from "./http-client";
import { ApiErrorException } from "./api-error";
import { useMocks } from "./mock-data";
import type { PosCartItem, SaleQuote } from "../modules/pos/types/pos.types";
import type { CompletedSale, PosPayment, TerminalOrder } from "../modules/pos/types/payment.types";

type CreateSalePayload = {
  branchId: string;
  customerId?: string;
};

type AddSaleItemPayload = {
  saleId: string;
  item: PosCartItem;
};

type CompleteSalePayload = {
  saleId: string;
  total: number;
  payments: PosPayment[];
  changeAmount?: number;
  authorizationPin?: string;
  idempotencyKey: string;
};

type CheckoutSalePayload = {
  branchId: string;
  customerId?: string;
  items: PosCartItem[];
  payments: PosPayment[];
  authorizationPin?: string;
  requestInvoice?: boolean;
  clientGeneratedId?: string;
};

type QuoteSalePayload = {
  branchId: string;
  customerId?: string;
  items: PosCartItem[];
};

export function createSaleRequest(payload: CreateSalePayload): Promise<{ id: string }> {
  if (useMocks) {
    return Promise.resolve({ id: `sale-${payload.branchId}-${Date.now()}` });
  }

  return httpClient<{ id: string }>("/sales", {
    method: "POST",
    body: payload
  });
}

export function addSaleItemRequest(payload: AddSaleItemPayload): Promise<void> {
  if (useMocks) {
    return Promise.resolve();
  }

  const body =
    payload.item.saleMode === "by_amount"
      ? {
          productId: payload.item.productId,
          saleMode: payload.item.saleMode,
          amount: payload.item.total.toFixed(2)
        }
      : {
          productId: payload.item.productId,
          saleMode: payload.item.saleMode,
          quantity: payload.item.quantity.toFixed(3)
        };

  return httpClient<void>(`/sales/${payload.saleId}/items`, {
    method: "POST",
    body
  });
}

export async function addSaleItemsRequest(payload: { saleId: string; items: PosCartItem[] }): Promise<void> {
  if (useMocks) {
    return Promise.resolve();
  }

  try {
    await httpClient<void>(`/sales/${payload.saleId}/items/batch`, {
      method: "POST",
      body: {
        items: payload.items.map((item) =>
          item.saleMode === "by_amount"
            ? {
                productId: item.productId,
                saleMode: item.saleMode,
                amount: item.total.toFixed(2)
              }
            : {
                productId: item.productId,
                saleMode: item.saleMode,
                quantity: item.quantity.toFixed(3)
              }
        )
      }
    });
    return;
  } catch (error) {
    if (!(error instanceof ApiErrorException) || error.apiError.statusCode !== 404) {
      throw error;
    }
  }

  for (const item of payload.items) {
    await addSaleItemRequest({ saleId: payload.saleId, item });
  }
}

export function completeSaleRequest(payload: CompleteSalePayload): Promise<CompletedSale> {
  if (useMocks) {
    return Promise.resolve({
      id: payload.saleId,
      saleNumber: `SUC-${String(Date.now()).slice(-6)}`,
      status: "completed",
      total: payload.total,
      paymentSummary: payload.payments.map((payment) => payment.paymentMethod).join(" + "),
      changeAmount: payload.changeAmount
    });
  }

  return httpClient<CompletedSale>(`/sales/${payload.saleId}/complete`, {
    method: "POST",
    headers: {
      "Idempotency-Key": payload.idempotencyKey
    },
    body: {
      payments: payload.payments,
      authorizationPin: payload.authorizationPin
    }
  });
}

function isMissingCheckoutEndpoint(error: unknown): boolean {
  if (!(error instanceof ApiErrorException)) {
    return false;
  }

  return (
    error.apiError.statusCode === 404 &&
    !["PRODUCT_NOT_FOUND", "SALE_NOT_FOUND"].includes(error.apiError.error)
  );
}

function calculateCheckoutTotal(items: PosCartItem[]): number {
  return Number(items.reduce((sum, item) => sum + item.total, 0).toFixed(2));
}

async function legacyCheckoutWithRollback(payload: CheckoutSalePayload, idempotencyKey: string): Promise<CompletedSale> {
  const draft = await createSaleRequest({
    branchId: payload.branchId,
    customerId: payload.customerId
  });

  try {
    await addSaleItemsRequest({ saleId: draft.id, items: payload.items });
    return await completeSaleRequest({
      saleId: draft.id,
      total: calculateCheckoutTotal(payload.items),
      payments: payload.payments,
      authorizationPin: payload.authorizationPin,
      idempotencyKey
    });
  } catch (error) {
    try {
      await cancelDraftSaleRequest(draft.id);
    } catch {
      // Backend remains the source of truth; preserve the original checkout error for the cashier.
    }
    throw error;
  }
}

export async function checkoutSaleRequest(payload: CheckoutSalePayload, idempotencyKey: string): Promise<CompletedSale> {
  if (useMocks) {
    return Promise.resolve({
      id: payload.clientGeneratedId ?? `sale-${payload.branchId}-${Date.now()}`,
      saleNumber: `SUC-${String(Date.now()).slice(-6)}`,
      status: "completed",
      total: calculateCheckoutTotal(payload.items),
      paymentSummary: payload.payments.map((payment) => payment.paymentMethod).join(" + ")
    });
  }

  try {
    return await httpClient<CompletedSale>("/sales/checkout", {
      method: "POST",
      headers: {
        "Idempotency-Key": idempotencyKey
      },
      body: {
        branchId: payload.branchId,
        customerId: payload.customerId,
        clientGeneratedId: payload.clientGeneratedId,
        requestInvoice: payload.requestInvoice,
        authorizationPin: payload.authorizationPin,
        payments: payload.payments,
        items: payload.items.map((item) =>
          item.saleMode === "by_amount"
            ? {
                productId: item.productId,
                saleMode: item.saleMode,
                amount: item.total.toFixed(2)
              }
            : {
                productId: item.productId,
                saleMode: item.saleMode,
                quantity: item.quantity.toFixed(3)
              }
        )
      }
    });
  } catch (error) {
    if (isMissingCheckoutEndpoint(error)) {
      return legacyCheckoutWithRollback(payload, idempotencyKey);
    }

    throw error;
  }
}

export function quoteSaleRequest(payload: QuoteSalePayload): Promise<SaleQuote> {
  if (useMocks) {
    const items = payload.items.map((item) => ({
      ...item,
      priceSource: "branch" as const
    }));
    const total = items.reduce((sum, item) => sum + item.total, 0).toFixed(2);
    return Promise.resolve({
      branchId: payload.branchId,
      customerId: payload.customerId,
      items,
      subtotal: total,
      total
    });
  }

  return httpClient<SaleQuote>("/sales/quote", {
    method: "POST",
    body: {
      branchId: payload.branchId,
      customerId: payload.customerId,
      items: payload.items.map((item) =>
        item.saleMode === "by_amount"
          ? {
              productId: item.productId,
              saleMode: item.saleMode,
              amount: item.total.toFixed(2)
            }
          : {
              productId: item.productId,
              saleMode: item.saleMode,
              quantity: item.quantity.toFixed(3)
            }
      )
    }
  });
}

export function cancelDraftSaleRequest(saleId: string): Promise<void> {
  if (useMocks) {
    return Promise.resolve();
  }

  return httpClient<void>(`/sales/${saleId}/cancel-draft`, {
    method: "POST"
  });
}

export function createTerminalOrderRequest(payload: {
  branchId: string;
  posDeviceId?: string;
  amount: string;
  saleDraft: {
    customerId?: string | null;
    clientGeneratedId?: string;
    items: PosCartItem[];
  };
  payments?: PosPayment[];
  authorizationPin?: string;
}, idempotencyKey: string): Promise<TerminalOrder> {
  if (useMocks) {
    return Promise.resolve({
      id: `terminal-order-${Date.now()}`,
      provider: "mercadopago",
      externalOrderId: `mock-order-${Date.now()}`,
      externalPaymentId: null,
      externalReference: `TP_${Date.now()}`,
      amount: payload.amount,
      currency: "MXN",
      status: "sent_to_terminal",
      statusDetail: "mock-awaiting-terminal",
      paymentTerminalId: "mp-terminal-demo",
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      approvedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  return httpClient<TerminalOrder>("/pos/terminal-orders", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: {
      branchId: payload.branchId,
      posDeviceId: payload.posDeviceId,
      amount: payload.amount,
      saleDraft: {
        ...payload.saleDraft,
        items: payload.saleDraft.items.map((item) =>
          item.saleMode === "by_amount"
            ? { productId: item.productId, saleMode: item.saleMode, amount: item.total.toFixed(2) }
            : { productId: item.productId, saleMode: item.saleMode, quantity: item.quantity.toFixed(3) }
        )
      },
      payments: payload.payments,
      authorizationPin: payload.authorizationPin
    }
  });
}

export function terminalOrderStatusRequest(orderId: string): Promise<TerminalOrder> {
  if (useMocks) {
    return Promise.resolve({
      id: orderId,
      provider: "mercadopago",
      externalOrderId: `mock-order-${orderId}`,
      externalPaymentId: `mock-payment-${orderId}`,
      externalReference: `TP_${orderId}`,
      amount: "0.00",
      currency: "MXN",
      status: "approved",
      statusDetail: "mock-approved",
      paymentTerminalId: "mp-terminal-demo",
      expiresAt: null,
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  return httpClient<TerminalOrder>(`/pos/terminal-orders/${orderId}`);
}

export function openTerminalOrderRequest(payload: { branchId: string; posDeviceId: string }): Promise<TerminalOrder | null> {
  if (useMocks) {
    return Promise.resolve(null);
  }

  const params = new URLSearchParams();
  params.set("branchId", payload.branchId);
  params.set("posDeviceId", payload.posDeviceId);
  return httpClient<TerminalOrder | null>(`/pos/terminal-orders/open?${params.toString()}`);
}

export function cancelTerminalOrderRequest(orderId: string, idempotencyKey: string): Promise<TerminalOrder> {
  if (useMocks) {
    return terminalOrderStatusRequest(orderId).then((order) => ({ ...order, status: "canceled", statusDetail: "mock-canceled" }));
  }

  return httpClient<TerminalOrder>(`/pos/terminal-orders/${orderId}/cancel`, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: {}
  });
}

export function confirmTerminalOrderCheckoutRequest(orderId: string, idempotencyKey: string): Promise<CompletedSale> {
  if (useMocks) {
    return Promise.resolve({
      id: `sale-${orderId}`,
      saleNumber: `SUC-${String(Date.now()).slice(-6)}`,
      status: "completed",
      total: 0,
      paymentSummary: "card"
    });
  }

  return httpClient<CompletedSale>(`/pos/terminal-orders/${orderId}/confirm-and-checkout`, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: {}
  });
}
