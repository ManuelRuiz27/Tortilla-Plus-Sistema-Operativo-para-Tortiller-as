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
