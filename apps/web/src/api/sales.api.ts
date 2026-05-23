import { httpClient } from "./http-client";
import { useMocks } from "./mock-data";
import type { PosCartItem } from "../modules/pos/types/pos.types";
import type { CompletedSale, PosPayment } from "../modules/pos/types/payment.types";

type CreateSalePayload = {
  branchId: string;
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
    body: {
      payments: payload.payments
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
