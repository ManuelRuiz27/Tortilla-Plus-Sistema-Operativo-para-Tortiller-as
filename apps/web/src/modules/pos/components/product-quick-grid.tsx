import { Search } from "lucide-react";
import { useEffect, useRef } from "react";
import { createId } from "../../../shared/utils/id";
import type { PosCartItem, PosProduct } from "../types/pos.types";
import { formatMoney } from "../utils/money";

type ProductQuickGridProps = {
  products: PosProduct[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onAddItem: (item: PosCartItem) => void;
};

export function ProductQuickGrid({ products, searchTerm, onSearchChange, onAddItem }: ProductQuickGridProps) {
  const lastBarcodeRef = useRef<string | null>(null);
  const filteredProducts = products.filter((product) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return true;
    }

    return [product.name, product.sku, product.barcode].some((value) =>
      value?.toLowerCase().includes(term)
    );
  });

  function addRetailProduct(product: PosProduct) {
    const unitPrice = product.prices.find((price) => price.saleMode === "by_unit")?.price ?? 0;
    if (unitPrice <= 0 || product.isStockTracked && (product.currentStock ?? 0) < 1) {
      return;
    }

    onAddItem({
      localId: createId(),
      productId: product.id,
      productName: product.name,
      productType: product.productType,
      saleMode: "by_unit",
      quantity: 1,
      unit: product.unit,
      unitPrice,
      total: unitPrice,
      currentStock: product.currentStock
    });
  }

  useEffect(() => {
    const term = searchTerm.trim();
    if (!term || term === lastBarcodeRef.current) {
      return;
    }

    const exactMatch = products.find((product) => product.barcode === term);
    if (!exactMatch) {
      return;
    }

    lastBarcodeRef.current = term;
    addRetailProduct(exactMatch);
    onSearchChange("");
    window.setTimeout(() => {
      if (lastBarcodeRef.current === term) {
        lastBarcodeRef.current = null;
      }
    }, 250);
  }, [onSearchChange, products, searchTerm]);

  return (
    <div className="mt-6">
      <label className="text-sm font-semibold" htmlFor="product-search">
        Productos frecuentes
      </label>
      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-tp-muted" aria-hidden="true" />
        <input
          className="h-11 w-full rounded-md border border-tp-border pl-10 pr-3 outline-none focus:border-tp-primary"
          id="product-search"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar producto"
          value={searchTerm}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-3">
        {filteredProducts.map((product) => {
          const price = product.prices.find((item) => item.saleMode === "by_unit")?.price ?? 0;
          const priceBlocked = price <= 0;
          const stockBlocked = product.isStockTracked && (product.currentStock ?? 0) < 1;
          return (
            <button
              className="min-h-20 rounded-md border border-tp-border bg-white p-3 text-left transition hover:border-tp-primary hover:bg-tp-soft disabled:opacity-50"
              disabled={priceBlocked || stockBlocked}
              key={product.id}
              onClick={() => addRetailProduct(product)}
              type="button"
            >
              <span className="block text-sm font-semibold">{product.name}</span>
              <span className="mt-1 block text-xs text-tp-muted">{priceBlocked ? "Sin precio" : formatMoney(price)}</span>
              {priceBlocked ? <span className="mt-1 block text-xs font-semibold text-tp-danger">Configura precio</span> : null}
              {stockBlocked ? <span className="mt-1 block text-xs font-semibold text-tp-danger">Sin stock</span> : null}
            </button>
          );
        })}
      </div>
      {filteredProducts.length === 0 ? (
        <p className="mt-3 rounded-md border border-tp-border bg-white p-4 text-sm text-tp-muted">
          No hay productos activos para esta búsqueda.
        </p>
      ) : null}
    </div>
  );
}
