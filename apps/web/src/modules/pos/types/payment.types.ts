export type PosPayment =
  | {
      paymentMethod: "cash";
      amount: string;
    }
  | {
      paymentMethod: "card";
      amount: string;
      reference: string;
      provider?: string;
      terminalOrderId?: string;
    }
  | {
      paymentMethod: "transfer";
      amount: string;
      reference: string;
      provider?: string;
    }
  | {
      paymentMethod: "credit";
      amount: string;
    };

export type CompletedSale = {
  id: string;
  saleNumber: string;
  status: "completed";
  total: number;
  paymentSummary: string;
  changeAmount?: number;
};

export type TerminalOrder = {
  id: string;
  provider: "mercadopago";
  externalOrderId: string | null;
  externalPaymentId: string | null;
  externalReference: string;
  amount: string;
  currency: "MXN";
  status: "created" | "sent_to_terminal" | "pending" | "approved" | "rejected" | "expired" | "canceled" | "failed" | "refunded";
  statusDetail: string | null;
  paymentTerminalId: string;
  expiresAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
