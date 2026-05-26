import { httpClient } from "./http-client";

export type PublicReceipt = {
  receiptId: string;
  token: string;
  status: "active" | "used" | "expired" | "cancelled";
  folio: string;
  businessName: string;
  branchName: string;
  saleDate: string;
  total: number;
  deadline: string;
  canInvoice: boolean;
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
    total: number;
  }>;
  invoiceId: string | null;
  cfdiUuid: string | null;
};

export type PublicInvoiceResult = {
  receiptId: string;
  invoiceId: string;
  status: "stamped";
  cfdiUuid: string | null;
  total: number;
  xmlUrl: string;
  pdfUrl: string;
};

export type PublicInvoicePayload = {
  rfc: string;
  legalName: string;
  taxRegime: string;
  zipCode: string;
  cfdiUse: string;
  email: string;
};

export type PublicBillingCatalogs = {
  taxRegimes: Array<{ code: string; label: string }>;
  cfdiUses: Array<{ code: string; label: string }>;
  defaults: {
    taxRegime: string;
    cfdiUse: string;
  };
};

export function publicBillingCatalogsRequest(): Promise<PublicBillingCatalogs> {
  return httpClient<PublicBillingCatalogs>("/public/billing/catalogs", { skipAuth: true });
}

export function publicReceiptRequest(token: string): Promise<PublicReceipt> {
  return httpClient<PublicReceipt>(`/public/billing/receipts/${token}`, { skipAuth: true });
}

export function submitPublicInvoiceRequest(token: string, payload: PublicInvoicePayload): Promise<PublicInvoiceResult> {
  return httpClient<PublicInvoiceResult>(`/public/billing/receipts/${token}/invoice`, {
    method: "POST",
    body: payload,
    skipAuth: true
  });
}
