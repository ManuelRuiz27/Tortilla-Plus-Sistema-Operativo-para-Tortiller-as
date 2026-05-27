import { useState } from "react";
import { Button } from "../../../shared/components/button";
import { createId } from "../../../shared/utils/id";
import { parseMoneyInput } from "../../../shared/utils/decimal-input";
import { POS_OPERATION_LIMITS } from "../config/pos.config";
import type { PosCartItem, PosProduct } from "../types/pos.types";
import { formatMoney, formatQuantity } from "../utils/money";

type AmountSaleInputProps = {
  product: PosProduct | null;
  pricePerKg: number;
  label: string;
  shortcut: string;
  inputId: string;
  onAddItem: (item: PosCartItem) => void;
};

export function AmountSaleInput({ product, pricePerKg, label, shortcut, inputId, onAddItem }: AmountSaleInputProps) {
  const [amount, setAmount] = useState("");
  const parsedAmount = parseMoneyInput(amount, {
    ...POS_OPERATION_LIMITS.saleMoney,
    fieldLabel: "El monto"
  });
  const amountValue = parsedAmount.ok ? parsedAmount.value : 0;
  const quantityKg = pricePerKg > 0 ? amountValue / pricePerKg : 0;
  const canAdd = Boolean(product && parsedAmount.ok && pricePerKg > 0);

  function addItem() {
    if (!product || !canAdd) {
      return;
    }

    onAddItem({
      localId: createId(),
      productId: product.id,
      productName: product.name,
      productType: product.productType,
      saleMode: "by_amount",
      quantity: Number(quantityKg.toFixed(3)),
      unit: "kg",
      unitPrice: pricePerKg,
      total: Number(amountValue.toFixed(2))
    });
    setAmount("");
  }

  return (
    <div className="rounded-md border border-tp-border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{label}</p>
          <p className="mt-1 text-xs text-tp-muted">
            {shortcut} · {formatQuantity(quantityKg)} kg aprox.
          </p>
        </div>
        <p className="text-lg font-semibold">{formatMoney(amountValue || 0)}</p>
      </div>
      <div className="mt-4 flex gap-2">
        <input
          className="h-12 min-w-0 flex-1 rounded-md border border-tp-border px-3 outline-none focus:border-tp-primary"
          id={inputId}
          inputMode="decimal"
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Pesos"
          value={amount}
        />
        <Button disabled={!canAdd} onClick={addItem}>
          Agregar
        </Button>
      </div>
      {amount && !parsedAmount.ok ? <p className="mt-2 text-xs text-tp-danger">{parsedAmount.reason}</p> : null}
    </div>
  );
}
