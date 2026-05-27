import { useQuery } from "@tanstack/react-query";
import { posProductsRequest } from "../../../api/products.api";
import { POS_PRODUCT_SKUS } from "../config/pos.config";
import type { PosProduct, PosSaleMode } from "../types/pos.types";

function bySku(products: PosProduct[], sku: string): PosProduct | null {
  return products.find((product) => product.sku === sku) ?? null;
}

export function getProductPrice(product: PosProduct, saleMode: PosSaleMode): number {
  return product.prices.find((price) => price.saleMode === saleMode)?.price ?? 0;
}

export function usePosProducts(branchId: string | null) {
  const query = useQuery({
    enabled: Boolean(branchId),
    queryFn: () => posProductsRequest(branchId ?? ""),
    queryKey: ["pos-products", branchId]
  });

  const products = query.data ?? [];
  const activeProducts = products.filter((product) => product.status === "active" && product.isSellable);

  return {
    ...query,
    products: activeProducts,
    tortillaProduct: bySku(activeProducts, POS_PRODUCT_SKUS.tortillaKg),
    masaProduct: bySku(activeProducts, POS_PRODUCT_SKUS.masaKg),
    package800gProduct: bySku(activeProducts, POS_PRODUCT_SKUS.package800g),
    retailProducts: activeProducts.filter((product) => product.productType === "retail")
  };
}
