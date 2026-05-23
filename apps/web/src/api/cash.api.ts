import { httpClient } from "./http-client";
import { buildDemoCashSession, buildDemoCashSummary, useMocks } from "./mock-data";
import { useCashStore } from "../shared/stores/cash.store";
import type { CashSession } from "../shared/types/session.types";
import type { CashMovement, CashSummary } from "../modules/manager/types/manager.types";

export type OpenCashPayload = {
  branchId: string;
  openingAmountCounted: string;
  openingNote?: string;
};

type ApiCashMovement = {
  id: string;
  movementType: string;
  amount: string | number;
  description?: string | null;
  status: string;
  createdAt: string;
};

type ApiCashSummary = {
  id: string;
  branchId: string;
  status: string;
  openingAmount: string | number;
  cashInTotal: string | number;
  cashOutTotal: string | number;
  expectedCashAmount: string | number;
  sales: Record<"cash" | "card" | "transfer" | "credit", string | number>;
  movements: ApiCashMovement[];
};

function mapCashMovement(movement: ApiCashMovement): CashMovement {
  return {
    id: movement.id,
    movementType: movement.movementType,
    amount: Number(movement.amount),
    description: movement.description,
    status: movement.status,
    createdAt: movement.createdAt
  };
}

function mapCashSummary(summary: ApiCashSummary): CashSummary {
  return {
    id: summary.id,
    branchId: summary.branchId,
    status: summary.status,
    openingAmount: Number(summary.openingAmount),
    cashInTotal: Number(summary.cashInTotal),
    cashOutTotal: Number(summary.cashOutTotal),
    expectedCashAmount: Number(summary.expectedCashAmount),
    sales: {
      cash: Number(summary.sales.cash),
      card: Number(summary.sales.card),
      transfer: Number(summary.sales.transfer),
      credit: Number(summary.sales.credit)
    },
    movements: summary.movements.map(mapCashMovement)
  };
}

export function currentCashSessionRequest(branchId: string): Promise<CashSession | null> {
  if (useMocks) {
    const { activeCashSessionId, status } = useCashStore.getState();
    if (activeCashSessionId && status === "open") {
      return Promise.resolve({
        id: activeCashSessionId,
        branchId,
        status: "open"
      });
    }

    return Promise.resolve(null);
  }

  return httpClient<CashSession | null>(`/cash-sessions/open?branchId=${branchId}`);
}

export function openCashSessionRequest(payload: OpenCashPayload): Promise<CashSession> {
  if (useMocks) {
    return Promise.resolve(buildDemoCashSession(payload.branchId));
  }

  return httpClient<CashSession>("/cash-sessions/open", {
    method: "POST",
    body: payload
  });
}

export function cashSessionSummaryRequest(cashSessionId: string, branchId: string): Promise<CashSummary> {
  if (useMocks) {
    return Promise.resolve(buildDemoCashSummary(branchId));
  }

  return httpClient<ApiCashSummary>(`/cash-sessions/${cashSessionId}/summary`).then(mapCashSummary);
}

export function closeCashSessionRequest(payload: {
  cashSessionId: string;
  countedCashAmount: string;
  comment?: string;
}): Promise<void> {
  if (useMocks) {
    return Promise.resolve();
  }

  return httpClient<void>(`/cash-sessions/${payload.cashSessionId}/close`, {
    method: "POST",
    body: {
      countedCashAmount: payload.countedCashAmount,
      comment: payload.comment
    }
  });
}

export function recordCashIncomeRequest(payload: {
  branchId: string;
  cashSessionId?: string;
  amount: string;
  reasonId?: string;
  description?: string;
}): Promise<void> {
  if (useMocks) {
    return Promise.resolve();
  }

  return httpClient<void>("/cash-movements/income", {
    method: "POST",
    body: payload
  });
}

export function requestCashWithdrawalRequest(payload: {
  branchId: string;
  cashSessionId?: string;
  amount: string;
  reasonId?: string;
  description?: string;
}): Promise<void> {
  if (useMocks) {
    return Promise.resolve();
  }

  return httpClient<void>("/cash-movements/withdrawals", {
    method: "POST",
    body: payload
  });
}
