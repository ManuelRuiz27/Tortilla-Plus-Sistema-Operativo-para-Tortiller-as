import { buildDemoPosProducts, useMocks } from "./mock-data";
import { httpClient } from "./http-client";
import type { PosProduct, PosProductPrice, PosProductType, PosSaleMode, PosUnit } from "../modules/pos/types/pos.types";

type ApiProduct = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  productType?: string;
  unit?: string;
  isSellable?: boolean;
  isStockTracked?: boolean;
  requiresProduction?: boolean;
  status?: string;
};

type ApiBranchPrice = {
  branchId: string;
  productId: string;
  saleMode?: string;
  price: string | number;
  currency?: string;
  status?: string;
};

type ApiInventoryStock = {
  productId: string;
  quantity: string | number;
};

const productTypes = new Set<PosProductType>(["tortilla", "masa", "package", "retail", "service"]);
const productUnits = new Set<PosUnit>(["kg", "piece", "package", "liter", "service"]);
const saleModes = new Set<PosSaleMode>(["by_kg", "by_amount", "by_package", "by_unit"]);

function parseProductType(value: string | undefined): PosProductType | null {
  return productTypes.has(value as PosProductType) ? (value as PosProductType) : null;
}

function parseUnit(value: string | undefined): PosUnit | null {
  return productUnits.has(value as PosUnit) ? (value as PosUnit) : null;
}

function parseSaleMode(value: string | undefined): PosSaleMode | null {
  return saleModes.has(value as PosSaleMode) ? (value as PosSaleMode) : null;
}

function mapProduct(product: ApiProduct, prices: ApiBranchPrice[], stocks: ApiInventoryStock[]): PosProduct | null {
  const productType = parseProductType(product.productType);
  const unit = parseUnit(product.unit);
  if (!productType || !unit) {
    return null;
  }

  const productPrices: PosProductPrice[] = prices
    .filter((price) => price.productId === product.id && price.status !== "inactive")
    .flatMap((price) => {
      const saleMode = parseSaleMode(price.saleMode);
      const numericPrice = Number(price.price);
      if (!saleMode || !Number.isFinite(numericPrice) || numericPrice <= 0) {
        return [];
      }

      return [{
        branchId: price.branchId,
        saleMode,
        price: numericPrice,
        currency: "MXN" as const
      }];
    });

  const stock = stocks.find((item) => item.productId === product.id);

  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    productType,
    unit,
    isSellable: product.isSellable ?? true,
    isStockTracked: product.isStockTracked ?? false,
    requiresProduction: product.requiresProduction ?? false,
    currentStock: stock ? Number(stock.quantity) : undefined,
    status: product.status === "inactive" || product.status === "deleted" ? product.status : "active",
    prices: productPrices
  };
}

export async function posProductsRequest(branchId: string): Promise<PosProduct[]> {
  if (useMocks) {
    return Promise.resolve(buildDemoPosProducts(branchId));
  }

  const [products, prices, stocks] = await Promise.all([
    httpClient<ApiProduct[]>("/products"),
    httpClient<ApiBranchPrice[]>(`/prices/branch/${branchId}`),
    httpClient<ApiInventoryStock[]>(`/inventory/branch/${branchId}`)
  ]);

  return products
    .map((product) => mapProduct(product, prices, stocks))
    .filter((product): product is PosProduct => Boolean(product?.isSellable));
}
