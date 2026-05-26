export type BillingPaymentMethod = "cash" | "card" | "transfer" | "credit";

export type FiscalClassification = {
  fiscalIntent: "no_invoice" | "customer_invoice" | "auto_customer_invoice";
  fiscalStatus: "eligible_for_daily_global" | "pending_customer_invoice";
  requiresReceipt: boolean;
};

export function classifyFiscalSale(input: {
  payments: Array<{ paymentMethod: BillingPaymentMethod | string }>;
  customerRequestedInvoice: boolean;
}): FiscalClassification {
  const hasCardPayment = input.payments.some((payment) => payment.paymentMethod === "card");

  if (hasCardPayment) {
    return {
      fiscalIntent: "auto_customer_invoice",
      fiscalStatus: "pending_customer_invoice",
      requiresReceipt: true,
    };
  }

  if (input.customerRequestedInvoice) {
    return {
      fiscalIntent: "customer_invoice",
      fiscalStatus: "pending_customer_invoice",
      requiresReceipt: true,
    };
  }

  return {
    fiscalIntent: "no_invoice",
    fiscalStatus: "eligible_for_daily_global",
    requiresReceipt: false,
  };
}

export function invoiceDeadlineEndOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 5, 59, 59, 999));
}
