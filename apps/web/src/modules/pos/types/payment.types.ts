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
    };

export type CompletedSale = {
  id: string;
  saleNumber: string;
  status: "completed";
  total: number;
  paymentSummary: string;
  changeAmount?: number;
};
