import { useQuery } from "@tanstack/react-query";
import { posProductsRequest } from "../../../api/products.api";
import type { PosProduct, PosSaleMode } from "../types/pos.types";

function byType(products: PosProduct[], type: PosProduct["productType"]): PosProduct | null {
  return products.find((product) => product.productType === type) ?? null;
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
    tortillaProduct: byType(activeProducts, "tortilla"),
    masaProduct: byType(activeProducts, "masa"),
    package800gProduct: byType(activeProducts, "package"),
    retailProducts: activeProducts.filter((product) => product.productType === "retail")
  };
}
