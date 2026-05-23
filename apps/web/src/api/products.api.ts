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

const productTypes = new Set(["tortilla", "masa", "package", "retail", "service"]);
const productUnits = new Set(["kg", "piece", "package", "liter", "service"]);
const saleModes = new Set(["by_kg", "by_amount", "by_package", "by_unit"]);

function normalizeProductType(value: string | undefined): PosProductType {
  return productTypes.has(value ?? "") ? (value as PosProductType) : "retail";
}

function normalizeUnit(value: string | undefined): PosUnit {
  return productUnits.has(value ?? "") ? (value as PosUnit) : "piece";
}

function normalizeSaleMode(value: string | undefined): PosSaleMode {
  return saleModes.has(value ?? "") ? (value as PosSaleMode) : "by_unit";
}

function mapProduct(product: ApiProduct, prices: ApiBranchPrice[]): PosProduct {
  const productPrices: PosProductPrice[] = prices
    .filter((price) => price.productId === product.id && price.status !== "inactive")
    .map((price) => ({
      branchId: price.branchId,
      saleMode: normalizeSaleMode(price.saleMode),
      price: Number(price.price),
      currency: price.currency === "MXN" ? "MXN" : "MXN"
    }));

  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    productType: normalizeProductType(product.productType),
    unit: normalizeUnit(product.unit),
    isSellable: product.isSellable ?? true,
    isStockTracked: product.isStockTracked ?? false,
    requiresProduction: product.requiresProduction ?? false,
    status: product.status === "inactive" || product.status === "deleted" ? product.status : "active",
    prices: productPrices
  };
}

export async function posProductsRequest(branchId: string): Promise<PosProduct[]> {
  if (useMocks) {
    return Promise.resolve(buildDemoPosProducts(branchId));
  }

  const [products, prices] = await Promise.all([
    httpClient<ApiProduct[]>("/products"),
    httpClient<ApiBranchPrice[]>(`/prices/branch/${branchId}`)
  ]);

  return products.map((product) => mapProduct(product, prices)).filter((product) => product.isSellable);
}
