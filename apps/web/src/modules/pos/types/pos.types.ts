export type PosSaleMode = "by_kg" | "by_amount" | "by_package" | "by_unit";

export type PosProductType = "tortilla" | "masa" | "package" | "retail" | "service";

export type PosUnit = "kg" | "piece" | "package" | "liter" | "service";

export type PosProductPrice = {
  branchId: string;
  saleMode: PosSaleMode;
  price: number;
  currency: "MXN";
};

export type PosProduct = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  productType: PosProductType;
  unit: PosUnit;
  isSellable: boolean;
  isStockTracked: boolean;
  requiresProduction: boolean;
  status: "active" | "inactive" | "deleted";
  prices: PosProductPrice[];
};

export type PosCartItem = {
  localId: string;
  productId: string;
  productName: string;
  productType: PosProductType;
  saleMode: PosSaleMode;
  quantity: number;
  unit: PosUnit;
  unitPrice: number;
  total: number;
};
