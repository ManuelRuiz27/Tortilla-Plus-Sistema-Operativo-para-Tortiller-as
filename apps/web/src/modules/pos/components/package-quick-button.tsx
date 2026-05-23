import { PackagePlus } from "lucide-react";
import { Button } from "../../../shared/components/button";
import type { PosCartItem, PosProduct } from "../types/pos.types";
import { formatMoney } from "../utils/money";

type PackageQuickButtonProps = {
  product: PosProduct | null;
  unitPrice: number;
  buttonId?: string;
  onAddItem: (item: PosCartItem) => void;
};

export function PackageQuickButton({ product, unitPrice, buttonId, onAddItem }: PackageQuickButtonProps) {
  function addPackage() {
    if (!product || unitPrice <= 0) {
      return;
    }

    onAddItem({
      localId: crypto.randomUUID(),
      productId: product.id,
      productName: product.name,
      productType: "package",
      saleMode: "by_package",
      quantity: 1,
      unit: "package",
      unitPrice,
      total: unitPrice
    });
  }

  return (
    <Button
      className="min-h-20 justify-start px-5 text-left"
      disabled={!product || unitPrice <= 0}
      id={buttonId}
      onClick={addPackage}
      variant="secondary"
    >
      <PackagePlus className="h-5 w-5" aria-hidden="true" />
      <span>
        Paquete 800g
        <span className="block text-xs font-medium text-tp-muted">{formatMoney(unitPrice)}</span>
      </span>
    </Button>
  );
}
