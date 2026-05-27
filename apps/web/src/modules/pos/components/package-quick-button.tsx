import { PackagePlus } from "lucide-react";
import { Button } from "../../../shared/components/button";
import { createId } from "../../../shared/utils/id";
import type { PosCartItem, PosProduct } from "../types/pos.types";
import { formatMoney } from "../utils/money";

type PackageQuickButtonProps = {
  product: PosProduct | null;
  unitPrice: number;
  buttonId?: string;
  onAddItem: (item: PosCartItem) => void;
};

export function PackageQuickButton({ product, unitPrice, buttonId, onAddItem }: PackageQuickButtonProps) {
  function addPackage(quantity: number) {
    if (!product || unitPrice <= 0) {
      return;
    }

    onAddItem({
      localId: createId(),
      productId: product.id,
      productName: product.name,
      productType: "package",
      saleMode: "by_package",
      quantity,
      unit: "package",
      unitPrice,
      total: Number((unitPrice * quantity).toFixed(2))
    });
  }

  return (
    <div className="rounded-md border border-tp-border bg-white p-3">
      <div className="flex items-center gap-2">
        <PackagePlus className="h-5 w-5 text-tp-primary" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">Paquete 800g</p>
          <p className="text-xs text-tp-muted">{formatMoney(unitPrice)}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[1, 5, 10].map((quantity) => (
          <Button
            className="min-h-10"
            disabled={!product || unitPrice <= 0}
            id={quantity === 1 ? buttonId : undefined}
            key={quantity}
            onClick={() => addPackage(quantity)}
            variant="secondary"
          >
            +{quantity}
          </Button>
        ))}
      </div>
    </div>
  );
}
