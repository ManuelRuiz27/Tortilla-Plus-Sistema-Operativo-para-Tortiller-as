import { useState } from "react";
import { Button } from "../../../shared/components/button";
import { createId } from "../../../shared/utils/id";
import { parseKgInput } from "../../../shared/utils/decimal-input";
import { POS_OPERATION_LIMITS } from "../config/pos.config";
import type { PosCartItem, PosProduct } from "../types/pos.types";
import { formatMoney } from "../utils/money";

type WeightSaleInputProps = {
  product: PosProduct | null;
  pricePerKg: number;
  label: string;
  shortcut: string;
  inputId: string;
  onAddItem: (item: PosCartItem) => void;
};

export function WeightSaleInput({ product, pricePerKg, label, shortcut, inputId, onAddItem }: WeightSaleInputProps) {
  const [quantity, setQuantity] = useState("");
  const parsedQuantity = parseKgInput(quantity, {
    ...POS_OPERATION_LIMITS.itemKg,
    fieldLabel: "La cantidad"
  });
  const quantityKg = parsedQuantity.ok ? parsedQuantity.value : 0;
  const total = Number.isFinite(quantityKg) ? quantityKg * pricePerKg : 0;
  const canAdd = Boolean(product && parsedQuantity.ok && pricePerKg > 0);

  function addItem() {
    if (!product || !canAdd) {
      return;
    }

    onAddItem({
      localId: createId(),
      productId: product.id,
      productName: product.name,
      productType: product.productType,
      saleMode: "by_kg",
      quantity: quantityKg,
      unit: "kg",
      unitPrice: pricePerKg,
      total: Number(total.toFixed(2))
    });
    setQuantity("");
  }

  return (
    <div className="rounded-md border border-tp-border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{label}</p>
          <p className="mt-1 text-xs text-tp-muted">{shortcut} · {formatMoney(pricePerKg)}/kg</p>
        </div>
        <p className="text-lg font-semibold">{formatMoney(total)}</p>
      </div>
      <div className="mt-4 flex gap-2">
        <input
          className="h-12 min-w-0 flex-1 rounded-md border border-tp-border px-3 outline-none focus:border-tp-primary"
          id={inputId}
          inputMode="decimal"
          onChange={(event) => setQuantity(event.target.value)}
          placeholder="Kg"
          value={quantity}
        />
        <Button disabled={!canAdd} onClick={addItem}>
          Agregar
        </Button>
      </div>
      {quantity && !parsedQuantity.ok ? <p className="mt-2 text-xs text-tp-danger">{parsedQuantity.reason}</p> : null}
    </div>
  );
}
